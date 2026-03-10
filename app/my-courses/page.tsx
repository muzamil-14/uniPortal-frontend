'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Enrollment {
  id: number;
  status: string;
  enrolledAt: string;
  course: {
    id: number;
    title: string;
    description: string;
    instructor: string;
    creditHours: number;
    price: number;
    schedule: string | null;
  };
}

export default function MyCoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!authLoading && user && user.role === 'admin') {
      router.replace('/dashboard');
      return;
    }
    if (user) {
      apiFetch('/enrollments/my-courses')
        .then(setEnrollments)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const handleDrop = async (courseId: number) => {
    const ok = await confirmDialog({
      title: 'Drop Course',
      message: 'Are you sure you want to drop this course?',
      confirmLabel: 'Drop',
    });
    if (!ok) return;
    try {
      await apiFetch(`/enrollments/courses/${courseId}`, { method: 'DELETE' });
      setEnrollments((prev) => prev.filter((e) => e.course.id !== courseId));
      toast.success('Course dropped successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to drop course');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  if (!user) return null;

  const totalCredits = enrollments.reduce(
    (sum, e) => sum + (e.course.creditHours || 0),
    0,
  );
  const totalCost = enrollments.reduce(
    (sum, e) => sum + Number(e.course.price || 0),
    0,
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
          My Courses
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          {enrollments.length} enrolled · {totalCredits} credit hours · ${totalCost.toFixed(2)} total
        </p>
      </div>

      {enrollments.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">
            You haven&apos;t enrolled in any courses yet.
          </p>
          <Link
            href="/courses"
            className="text-sm px-5 py-2.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {enrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1">
                <Link
                  href={`/courses/${enrollment.course.id}`}
                  className="text-lg font-semibold text-zinc-900 dark:text-white hover:underline"
                >
                  {enrollment.course.title}
                </Link>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {enrollment.course.instructor} · {enrollment.course.creditHours} credits
                  {enrollment.course.schedule && ` · ${enrollment.course.schedule}`}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  Enrolled on {new Date(enrollment.enrolledAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  {enrollment.status}
                </span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  ${Number(enrollment.course.price).toFixed(2)}
                </span>
                <button
                  onClick={() => handleDrop(enrollment.course.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                >
                  Drop
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
