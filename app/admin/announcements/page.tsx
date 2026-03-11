'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Announcement {
  id: number;
  title: string;
  content: string;
  isImportant: boolean;
  createdAt: string;
  author: { id: number; name: string } | null;
}

export default function AdminAnnouncementsPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
      return;
    }
    if (user) {
      apiFetch('/announcements')
        .then(setAnnouncements)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setIsImportant(false);
    setEditingId(null);
  };

  const startEdit = (a: Announcement) => {
    setEditingId(a.id);
    setTitle(a.title);
    setContent(a.content);
    setIsImportant(a.isImportant);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const body = { title, content, isImportant };

    try {
      if (editingId) {
        const updated = await apiFetch(`/announcements/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === editingId ? updated : a)),
        );
        toast.success('Announcement updated');
      } else {
        const created = await apiFetch('/announcements', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setAnnouncements((prev) => [created, ...prev]);
        toast.success('Announcement published');
      }
      resetForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Delete Announcement',
      message: 'Are you sure you want to delete this announcement?',
    });
    if (!ok) return;
    try {
      await apiFetch(`/announcements/${id}`, { method: 'DELETE' });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      if (editingId === id) resetForm();
      toast.success('Announcement deleted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">
        Manage Announcements
      </h1>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          {editingId ? 'Edit Announcement' : 'New Announcement'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none"
              placeholder="Announcement title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none"
              placeholder="Write your announcement..."
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Mark as important
              </span>
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              {submitting
                ? 'Saving...'
                : editingId
                  ? 'Update'
                  : 'Publish Announcement'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-3">
        {announcements.map((a) => (
          <div
            key={a.id}
            className={`bg-white dark:bg-zinc-900 rounded-xl border p-5 flex flex-col sm:flex-row gap-4 ${
              a.isImportant
                ? 'border-amber-300 dark:border-amber-700'
                : 'border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {a.title}
                </h3>
                {a.isImportant && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    Important
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-1">
                {a.content}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {new Date(a.createdAt).toLocaleDateString()}
                {a.author && ` · ${a.author.name}`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => startEdit(a)}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
            No announcements yet.
          </div>
        )}
      </div>
    </div>
  );
}
