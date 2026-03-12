'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface QuizAttempt {
  id: number;
  submitted: boolean;
  score: number;
  totalMarks: number;
  flaggedCheating: boolean;
  tabSwitchCount: number;
  startedAt?: string | null;
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  courseId: number;
  course: { id: number; title: string };
  duration: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  attempts: QuizAttempt[];
}

export default function StudentQuizzesPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'student') {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    const socket: Socket = io(`${API_URL}/quiz`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('quizCatalogUpdated', () => {
      apiFetch('/quizzes/student').then(setQuizzes).catch(() => {});
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.replace('/dashboard');
      return;
    }
    if (user) {
      apiFetch('/quizzes/student')
        .then(setQuizzes)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const startQuiz = async (quizId: number) => {
    try {
      const attempt = await apiFetch(`/quizzes/student/${quizId}/start`, {
        method: 'POST',
      });
      router.push(`/quizzes/${quizId}/take?attempt=${attempt.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start quiz');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  if (!user || user.role !== 'student') return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">
        Quizzes
      </h1>

      {quizzes.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-500 dark:text-zinc-400">
          No quizzes available right now.
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => {
            const now = new Date();
            const attempt = quiz.attempts?.[0];
            const hasSubmitted = attempt?.submitted;
            const hasOngoingAttempt = Boolean(attempt && !attempt.submitted);
            const isOpenForNewAttempts = new Date(quiz.endTime) >= now;

            return (
              <div
                key={quiz.id}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-zinc-900 dark:text-white">
                        {quiz.title}
                      </h3>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full ${
                          hasSubmitted
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : hasOngoingAttempt
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : isOpenForNewAttempts
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {hasSubmitted
                          ? 'Completed'
                          : hasOngoingAttempt
                          ? 'In Progress'
                          : isOpenForNewAttempts
                          ? 'Live Now'
                          : 'Ended'}
                      </span>
                      {attempt?.flaggedCheating && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          Flagged
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                      {quiz.course?.title}
                      {quiz.description && ` — ${quiz.description}`}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                      <span>{quiz.duration} min</span>
                      <span>
                        Available from: {new Date(quiz.startTime).toLocaleString()}
                      </span>
                      <span>
                        Ends: {new Date(quiz.endTime).toLocaleString()}
                      </span>
                      {hasSubmitted && (
                        <span className="font-medium text-green-600 dark:text-green-400">
                          Score: {attempt.score}/{attempt.totalMarks}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 shrink-0">
                    {hasSubmitted ? (
                      <span className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                        Submitted
                      </span>
                    ) : hasOngoingAttempt ? (
                      <button
                        onClick={() => startQuiz(quiz.id)}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Resume Quiz
                      </button>
                    ) : isOpenForNewAttempts ? (
                      <button
                        onClick={() => startQuiz(quiz.id)}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Start Quiz
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
