'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Department {
  id: number;
  name: string;
}

export default function AdminDepartmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
      return;
    }
    if (user) {
      apiFetch('/departments')
        .then(setDepartments)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const resetForm = () => {
    setName('');
    setEditingId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        const updated = await apiFetch(`/departments/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ name }),
        });
        setDepartments((prev) => prev.map((d) => (d.id === editingId ? updated : d)));
        toast.success('Department updated successfully');
      } else {
        const created = await apiFetch('/departments', {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
        setDepartments((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Department created successfully');
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
      title: 'Delete Department',
      message: 'Are you sure you want to delete this department? This action cannot be undone.',
    });
    if (!ok) return;
    try {
      await apiFetch(`/departments/${id}`, { method: 'DELETE' });
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      if (editingId === id) resetForm();
      toast.success('Department deleted successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete department');
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
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">
        Manage Departments
      </h1>

      {/* Form */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          {editingId ? 'Edit Department' : 'Add New Department'}
        </h2>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Department name"
            className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none"
          />
          <button type="submit" disabled={submitting}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 cursor-pointer">
            {submitting ? 'Saving...' : editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}
              className="px-5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
              Cancel
            </button>
          )}
        </form>
      </div>

      {/* Department List */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
        {departments.map((dept) => (
          <div key={dept.id} className="flex items-center justify-between p-4">
            <span className="font-medium text-zinc-900 dark:text-white">{dept.name}</span>
            <div className="flex gap-2">
              <button onClick={() => { setEditingId(dept.id); setName(dept.name); }}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                Edit
              </button>
              <button onClick={() => handleDelete(dept.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        ))}
        {departments.length === 0 && (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">No departments yet.</div>
        )}
      </div>
    </div>
  );
}
