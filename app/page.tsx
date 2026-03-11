'use client';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background shapes */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-200/40 dark:bg-indigo-900/20 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-200/40 dark:bg-violet-900/20 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/3 left-1/2 w-64 h-64 rounded-full bg-pink-200/30 dark:bg-pink-900/15 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="text-center max-w-2xl animate-slide-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-6 border border-indigo-100 dark:border-indigo-900/50">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          Welcome to TGI
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold mb-4 gradient-text leading-tight">
          University Portal
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-4">
          Your gateway to academic excellence
        </p>
        <p className="text-zinc-500 dark:text-zinc-500 mb-10 max-w-md mx-auto">
          Browse courses, manage enrollments, and track your academic journey — all in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-200 text-base"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium hover:from-indigo-600 hover:to-violet-600 transition-all duration-200 text-base shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
