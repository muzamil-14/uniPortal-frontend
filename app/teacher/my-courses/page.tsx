'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Course {
  id: number;
  title: string;
  description: string;
  instructor: string;
  creditHours: number;
  schedule: string | null;
  isActive: boolean;
}

export default function TeacherMyCoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'teacher')) {
      router.replace('/dashboard');
      return;
    }
    if (user) {
      apiFetch('/courses/teacher/my-courses')
        .then(setCourses)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
          My Courses
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          {courses.length} course{courses.length !== 1 ? 's' : ''} assigned to you
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            No courses have been assigned to you yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {course.title}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${course.isActive
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>{course.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {course.creditHours} credits{course.schedule && ` · ${course.schedule}`}
                </p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-2">
                  {course.description}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/teacher/grades?course=${course.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 transition-all shadow-sm">
                  Grades
                </Link>
                <Link href={`/teacher/attendance?course=${course.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all">
                  Attendance
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
