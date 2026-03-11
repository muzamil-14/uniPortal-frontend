'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Announcement {
  id: number;
  title: string;
  content: string;
  isImportant: boolean;
  createdAt: string;
  author: { id: number; name: string } | null;
}

export default function AnnouncementsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
      apiFetch('/announcements')
        .then(setAnnouncements)
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

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
          Announcements
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Stay updated with the latest university news
        </p>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`bg-white dark:bg-zinc-900 rounded-xl border p-6 ${
                a.isImportant
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {a.isImportant && (
                  <span className="mt-0.5 text-amber-500 text-lg">★</span>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {a.title}
                    </h2>
                    {a.isImportant && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        Important
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap mb-3">
                    {a.content}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                    {a.author && <span>By {a.author.name}</span>}
                    <span>
                      {new Date(a.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
