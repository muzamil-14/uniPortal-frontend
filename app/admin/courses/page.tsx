'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Course {
  id: number;
  title: string;
  description: string;
  instructor: string;
  price: number;
  creditHours: number;
  schedule: string | null;
  isActive: boolean;
}

export default function AdminCoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructor, setInstructor] = useState('');
  const [price, setPrice] = useState('0');
  const [creditHours, setCreditHours] = useState('3');
  const [schedule, setSchedule] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
      return;
    }
    if (user) {
      apiFetch('/courses')
        .then(setCourses)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setInstructor('');
    setPrice('0');
    setCreditHours('3');
    setSchedule('');
    setIsActive(true);
    setEditingId(null);
  };

  const startEdit = (course: Course) => {
    setEditingId(course.id);
    setTitle(course.title);
    setDescription(course.description);
    setInstructor(course.instructor);
    setPrice(String(course.price));
    setCreditHours(String(course.creditHours));
    setSchedule(course.schedule || '');
    setIsActive(course.isActive);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const body = {
      title,
      description,
      instructor,
      price: parseFloat(price),
      creditHours: parseInt(creditHours),
      schedule: schedule || undefined,
      isActive,
    };

    try {
      if (editingId) {
        const updated = await apiFetch(`/courses/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        setCourses((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
        toast.success('Course updated successfully');
      } else {
        const created = await apiFetch('/courses', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setCourses((prev) => [created, ...prev]);
        toast.success('Course created successfully');
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
      title: 'Delete Course',
      message: 'Are you sure you want to delete this course? This action cannot be undone.',
    });
    if (!ok) return;
    try {
      await apiFetch(`/courses/${id}`, { method: 'DELETE' });
      setCourses((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) resetForm();
      toast.success('Course deleted successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete course');
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
        Manage Courses
      </h1>

      {/* Course Form */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          {editingId ? 'Edit Course' : 'Add New Course'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Title <span className="text-red-500">*</span></label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Instructor <span className="text-red-500">*</span></label>
            <input type="text" required value={instructor} onChange={(e) => setInstructor(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description <span className="text-red-500">*</span></label>
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Price <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Credit Hours <span className="text-red-500">*</span></label>
            <input type="number" required value={creditHours} onChange={(e) => setCreditHours(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Schedule</label>
            <input type="text" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="MWF 9:00-10:00"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white" />
          </div>
          {editingId && (
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Active</span>
              </label>
            </div>
          )}
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" disabled={submitting}
              className="px-5 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors cursor-pointer">
              {submitting ? 'Saving...' : editingId ? 'Update Course' : 'Add Course'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}
                className="px-5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Course List */}
      <div className="space-y-3">
        {courses.map((course) => (
          <div key={course.id}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{course.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${course.isActive
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>{course.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {course.instructor} · {course.creditHours} credits · ${Number(course.price).toFixed(2)}
                {course.schedule && ` · ${course.schedule}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(course)}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                Edit
              </button>
              <button onClick={() => handleDelete(course.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        ))}
        {courses.length === 0 && (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">No courses yet.</div>
        )}
      </div>
    </div>
  );
}
