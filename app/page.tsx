'use client';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
          Welcome to CourseApp
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          Discover and manage courses with ease.
        </p>
        {user ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            You&apos;re signed in as <span className="font-semibold text-zinc-900 dark:text-white">{user.name}</span>
          </p>
        ) : (
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-lg text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
