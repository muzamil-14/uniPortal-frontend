'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Course {
  id: number;
  title: string;
  description: string;
  instructor: string;
  price: number;
  creditHours: number;
  departments: string[];
  isActive: boolean;
  createdAt: string;
}

interface Material {
  id: number;
  title: string;
  description: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}

interface EnrollmentCheckResponse {
  enrolled: boolean;
  canDrop: boolean;
  status: string | null;
  semesterNumber: number | null;
  passedPreviously: boolean;
  message: string | null;
}

export default function CourseDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [enrollmentStatus, setEnrollmentStatus] =
    useState<EnrollmentCheckResponse | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user && courseId) {
      const promises: Promise<any>[] = [apiFetch(`/courses/${courseId}`)];
      if (user.role === 'student') {
        promises.push(apiFetch(`/enrollments/courses/${courseId}/check`));
      }
      Promise.all(promises)
        .then(([courseData, enrollData]) => {
          setCourse(courseData);
          if (enrollData) {
            const status = enrollData as EnrollmentCheckResponse;
            setEnrollmentStatus(status);
            setEnrolled(status.enrolled);
            if (status.enrolled && !status.passedPreviously) {
              apiFetch(`/course-materials/course/${courseId}`).then(setMaterials);
            }
          }
        })
        .catch(() => router.replace('/courses'))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, courseId, router]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await apiFetch(`/enrollments/courses/${courseId}`, { method: 'POST' });
      const status = (await apiFetch(
        `/enrollments/courses/${courseId}/check`,
      )) as EnrollmentCheckResponse;
      setEnrollmentStatus(status);
      setEnrolled(status.enrolled);
      toast.success('Successfully enrolled in course');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <button
        onClick={() => router.back()}
        className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-6 cursor-pointer"
      >
        ← Back
      </button>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
              {course.title}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">by {course.instructor}</p>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            ${Number(course.price).toFixed(2)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <span className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-600 dark:text-zinc-400">
            {course.creditHours} Credit Hours
          </span>
          {course.departments?.length > 0 && course.departments.map((dept) => (
            <span key={dept} className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-600 dark:text-zinc-400">
              {dept}
            </span>
          ))}
          <span className={`px-3 py-1.5 rounded-lg text-sm ${
            course.isActive
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            {course.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">
            Description
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
            {course.description}
          </p>
        </div>

        {user?.role === 'student' && (
        <>
        {enrolled ? (
          <div className="space-y-3">
            <span className="inline-flex px-4 py-2.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
              ✓ Enrolled
            </span>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {enrollmentStatus?.message || 'This course is already selected in your semester plan.'}
            </p>
          </div>
        ) : enrollmentStatus?.passedPreviously ? (
          <div className="space-y-3">
            <span className="inline-flex px-4 py-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
              ✓ Passed Previously
            </span>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {enrollmentStatus.message || 'You have already cleared this course in a previous semester.'}
            </p>
          </div>
        ) : (
          <button
            onClick={handleEnroll}
            disabled={enrolling || !course.isActive || enrollmentStatus?.passedPreviously}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            {enrolling ? 'Enrolling...' : 'Enroll in Course'}
          </button>
        )}
        </>
        )}
      </div>

      {/* Course Materials (visible to enrolled students) */}
      {user?.role === 'student' && enrolled && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mt-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Course Materials ({materials.length})
          </h2>
          {materials.length === 0 ? (
            <p className="text-zinc-500 text-center py-4">No materials uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {materials.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{m.title}</p>
                      <p className="text-xs text-zinc-400">{m.fileName} · {new Date(m.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL}${m.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-sm bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors shrink-0"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
