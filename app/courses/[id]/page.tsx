'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Course {
  id: number;
  title: string;
  description: string;
  instructor: string;
  price: number;
  creditHours: number;
  schedule: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function CourseDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

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
          if (enrollData) setEnrolled(enrollData.enrolled);
        })
        .catch(() => router.replace('/courses'))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, courseId, router]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await apiFetch(`/enrollments/courses/${courseId}`, { method: 'POST' });
      setEnrolled(true);
      toast.success('Successfully enrolled in course');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    const ok = await confirmDialog({
      title: 'Drop Course',
      message: 'Are you sure you want to drop this course?',
      confirmLabel: 'Drop',
    });
    if (!ok) return;
    setEnrolling(true);
    try {
      await apiFetch(`/enrollments/courses/${courseId}`, { method: 'DELETE' });
      setEnrolled(false);
      toast.success('Successfully dropped the course');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to unenroll');
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
          {course.schedule && (
            <span className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-600 dark:text-zinc-400">
              {course.schedule}
            </span>
          )}
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
          <div className="flex items-center gap-4">
            <span className="px-4 py-2.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
              ✓ Enrolled
            </span>
            <button
              onClick={handleUnenroll}
              disabled={enrolling}
              className="px-4 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {enrolling ? 'Processing...' : 'Drop Course'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleEnroll}
            disabled={enrolling || !course.isActive}
            className="px-6 py-2.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {enrolling ? 'Enrolling...' : 'Enroll in Course'}
          </button>
        )}
        </>
        )}
      </div>
    </div>
  );
}
