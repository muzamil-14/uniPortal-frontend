'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CourseSelector from '@/components/course-selector';

interface Course {
  id: number;
  title: string;
  instructor: string;
}

interface EnrolledStudent {
  id: number;
  grade: string | null;
  marks: number | null;
  finalMarks: number | null;
  midMarks: number | null;
  quizMarks: number | null;
  assignmentMarks: number | null;
  status: string;
  userId: number;
  courseId: number;
  user: { id: number; name: string; email: string };
  course: { id: number; title: string };
}

const gradeOptions = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];

export default function TeacherGradesPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

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
      const data = await apiFetch(`/enrollments/courses/${courseId}/grades`);
      setStudents(data);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleGradeChange = async (
    userId: number,
    courseId: number,
    grade: string,
    finalMarks?: number,
    midMarks?: number,
    quizMarks?: number,
    assignmentMarks?: number,
  ) => {
    try {
      const updated = await apiFetch(
        `/enrollments/courses/${courseId}/users/${userId}/grade`,
        {
          method: 'PATCH',
          body: JSON.stringify({ grade, finalMarks, midMarks, quizMarks, assignmentMarks }),
        },
      );
      setStudents((prev) =>
        prev.map((s) =>
          s.id === updated.id
            ? {
                ...s,
                grade: updated.grade,
                marks: updated.marks,
                finalMarks: updated.finalMarks,
                midMarks: updated.midMarks,
                quizMarks: updated.quizMarks,
                assignmentMarks: updated.assignmentMarks,
                status: updated.status,
              }
            : s,
        ),
      );
      toast.success('Grade updated — course marked as completed for this student');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update grade');
    }
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
        Grade Management
      </h1>

      {/* Course Selection */}
      <div className="mb-8">
        <CourseSelector
          courses={courses}
          selectedCourse={selectedCourse || ''}
          onSelect={(id) => {
            if (id) loadStudents(id as number);
            else {
              setSelectedCourse(null);
              setStudents([]);
            }
          }}
          label={selectedCourse ? undefined : 'Select Course'}
          subtitle={selectedCourse ? undefined : 'Choose a course to manage grades'}
        />
      </div>

      {/* Students Grade Table */}
      {selectedCourse && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {loadingStudents ? (
            <div className="flex items-center justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                      <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">Student</th>
                      <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">Email</th>
                      <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                      <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Finals<br/><span className="text-xs font-normal">(50%)</span></th>
                      <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Mids<br/><span className="text-xs font-normal">(25%)</span></th>
                      <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Quizzes<br/><span className="text-xs font-normal">(15%)</span></th>
                      <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Assignments<br/><span className="text-xs font-normal">(10%)</span></th>
                      <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Total</th>
                      <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Grade</th>
                      <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {students.map((s) => (
                      <StudentGradeRow
                        key={s.id}
                        student={s}
                        onSave={handleGradeChange}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {students.length === 0 && (
                <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                  No students enrolled in this course.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StudentGradeRow({
  student,
  onSave,
}: {
  student: EnrolledStudent;
  onSave: (
    userId: number,
    courseId: number,
    grade: string,
    finalMarks?: number,
    midMarks?: number,
    quizMarks?: number,
    assignmentMarks?: number,
  ) => void;
}) {
  const [grade, setGrade] = useState(student.grade || '');
  const [finalMarks, setFinalMarks] = useState(
    student.finalMarks !== null ? String(student.finalMarks) : '',
  );
  const [midMarks, setMidMarks] = useState(
    student.midMarks !== null ? String(student.midMarks) : '',
  );
  const [quizMarks, setQuizMarks] = useState(
    student.quizMarks !== null ? String(student.quizMarks) : '',
  );
  const [assignmentMarks, setAssignmentMarks] = useState(
    student.assignmentMarks !== null ? String(student.assignmentMarks) : '',
  );

  const fm = finalMarks ? parseFloat(finalMarks) : 0;
  const mm = midMarks ? parseFloat(midMarks) : 0;
  const qm = quizMarks ? parseFloat(quizMarks) : 0;
  const am = assignmentMarks ? parseFloat(assignmentMarks) : 0;
  const hasAny = finalMarks || midMarks || quizMarks || assignmentMarks;
  const total = hasAny
    ? Math.round((0.5 * fm + 0.25 * mm + 0.15 * qm + 0.1 * am) * 100) / 100
    : null;

  const markInput = (value: string, onChange: (v: string) => void, max: number) => (
    <input
      type="number"
      step="0.01"
      min="0"
      max={max}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-16 mx-auto block px-1 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm text-center outline-none"
      placeholder="—"
    />
  );

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
      <td className="p-4 font-medium text-zinc-900 dark:text-white">
        {student.user.name}
      </td>
      <td className="p-4 text-zinc-500 dark:text-zinc-400">
        {student.user.email}
      </td>
      <td className="p-4 text-center">
        <span className={`text-xs px-2.5 py-1 rounded-full ${
          student.status === 'completed'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
        }`}>
          {student.status}
        </span>
      </td>
      <td className="p-4">{markInput(finalMarks, setFinalMarks, 100)}</td>
      <td className="p-4">{markInput(midMarks, setMidMarks, 100)}</td>
      <td className="p-4">{markInput(quizMarks, setQuizMarks, 100)}</td>
      <td className="p-4">{markInput(assignmentMarks, setAssignmentMarks, 100)}</td>
      <td className="p-4 text-center font-semibold text-zinc-700 dark:text-zinc-200">
        {total !== null ? total : student.marks !== null ? student.marks : '—'}
      </td>
      <td className="p-4">
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="mx-auto block px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm outline-none cursor-pointer"
        >
          <option value="">—</option>
          {gradeOptions.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </td>
      <td className="p-4 text-center">
        <button
          onClick={() => {
            if (!grade) return;
            onSave(
              student.user.id,
              student.courseId,
              grade,
              finalMarks ? parseFloat(finalMarks) : undefined,
              midMarks ? parseFloat(midMarks) : undefined,
              quizMarks ? parseFloat(quizMarks) : undefined,
              assignmentMarks ? parseFloat(assignmentMarks) : undefined,
            );
          }}
          disabled={!grade}
          className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 disabled:opacity-30 transition-all cursor-pointer"
        >
          Save
        </button>
      </td>
    </tr>
  );
}
