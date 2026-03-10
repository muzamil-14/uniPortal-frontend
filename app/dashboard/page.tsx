'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
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
    instructor: string;
    creditHours: number;
    schedule: string | null;
  };
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
    if (user && user.role === 'student') {
      apiFetch('/enrollments/my-courses')
        .then(setEnrollments)
        .catch(() => {})
        .finally(() => setLoadingData(false));
    } else if (user) {
      setLoadingData(false);
    }
  }, [user, loading, router]);

  if (loading || loadingData) {
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

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
          Welcome back, {user.name}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Here&apos;s your {user.role === 'admin' ? 'admin panel' : 'academic overview'}
        </p>
      </div>

      {/* Stats cards */}
      {user.role === 'student' && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Enrolled Courses</p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">{enrollments.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Total Credit Hours</p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">{totalCredits}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Department</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-white">
            {user.department || 'Not set'}
          </p>
        </div>
      </div>
      )}

      {user.role === 'admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link href="/admin/courses" className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:shadow-md transition-shadow">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Manage</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-white">Courses</p>
          </Link>
          <Link href="/admin/departments" className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:shadow-md transition-shadow">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Manage</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-white">Departments</p>
          </Link>
          <Link href="/admin/students" className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:shadow-md transition-shadow">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Manage</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-white">Students</p>
          </Link>
        </div>
      )}

      {/* Recent enrollments */}
      {user.role === 'student' && (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            My Courses
          </h2>
          <Link
            href="/courses"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            Browse more →
          </Link>
        </div>
        {enrollments.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            <p className="mb-3">You haven&apos;t enrolled in any courses yet.</p>
            <Link
              href="/courses"
              className="text-sm px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
            >
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {enrollments.slice(0, 5).map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/courses/${enrollment.course.id}`}
                className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {enrollment.course.title}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {enrollment.course.instructor} · {enrollment.course.creditHours} credits
                    {enrollment.course.schedule && ` · ${enrollment.course.schedule}`}
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  {enrollment.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
