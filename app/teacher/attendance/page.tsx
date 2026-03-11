'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Course {
  id: number;
  title: string;
  instructor: string;
}

interface EnrolledStudent {
  id: number;
  userId: number;
  user: { id: number; name: string; email: string };
}

interface AttendanceRecord {
  userId: number;
  status: string;
}

export default function TeacherAttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'teacher')) {
      router.replace('/dashboard');
      return;
    }
    if (user) {
      apiFetch('/courses/teacher/my-courses')
        .then((data) => {
          setCourses(data);
          const courseParam = searchParams.get('course');
          if (courseParam) {
            const courseId = Number(courseParam);
            if (data.some((c: Course) => c.id === courseId)) {
              loadStudents(courseId);
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router]);

  const loadStudents = async (courseId: number) => {
    setSelectedCourse(courseId);
    setLoadingStudents(true);
    try {
      const enrolled = await apiFetch(
        `/enrollments/courses/${courseId}/students`,
      );
      setStudents(enrolled);

      const existing: AttendanceRecord[] = await apiFetch(
        `/attendance/course/${courseId}?date=${date}`,
      );
      const map: Record<number, string> = {};
      enrolled.forEach((s: EnrolledStudent) => {
        const record = existing.find(
          (a: AttendanceRecord) => a.userId === s.userId,
        );
        map[s.userId] = record ? record.status : 'present';
      });
      setAttendance(map);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (selectedCourse) {
      setTimeout(() => loadStudents(selectedCourse), 0);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCourse) return;
    setSubmitting(true);
    try {
      const records = Object.entries(attendance).map(([userId, status]) => ({
        userId: Number(userId),
        status,
      }));
      await apiFetch('/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({
          courseId: selectedCourse,
          date,
          records,
        }),
      });
      toast.success('Attendance saved successfully');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save attendance',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const setAllStatus = (status: string) => {
    const updated: Record<number, string> = {};
    students.forEach((s) => {
      updated[s.userId] = status;
    });
    setAttendance(updated);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  if (!user || user.role !== 'teacher') return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">
        Mark Attendance
      </h1>

      {/* Course & Date Selection */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Course
            </label>
            <select
              value={selectedCourse || ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val) loadStudents(val);
              }}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none cursor-pointer"
            >
              <option value="">Choose a course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      {selectedCourse && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {loadingStudents ? (
            <div className="flex items-center justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              No students enrolled in this course.
            </div>
          ) : (
            <>
              {/* Quick Actions */}
              <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Mark all:
                </span>
                <button
                  onClick={() => setAllStatus('present')}
                  className="text-xs px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                >
                  Present
                </button>
                <button
                  onClick={() => setAllStatus('absent')}
                  className="text-xs px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                >
                  Absent
                </button>
                <button
                  onClick={() => setAllStatus('late')}
                  className="text-xs px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                >
                  Late
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                      <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">
                        Student
                      </th>
                      <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">
                        Email
                      </th>
                      <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {students.map((s) => (
                      <tr
                        key={s.userId}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                      >
                        <td className="p-4 font-medium text-zinc-900 dark:text-white">
                          {s.user.name}
                        </td>
                        <td className="p-4 text-zinc-500 dark:text-zinc-400">
                          {s.user.email}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            {['present', 'absent', 'late'].map((status) => (
                              <button
                                key={status}
                                onClick={() =>
                                  setAttendance((prev) => ({
                                    ...prev,
                                    [s.userId]: status,
                                  }))
                                }
                                className={`text-xs px-3 py-1 rounded-full transition-colors cursor-pointer ${
                                  attendance[s.userId] === status
                                    ? status === 'present'
                                      ? 'bg-green-600 text-white'
                                      : status === 'absent'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-amber-600 text-white'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                }`}
                              >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
