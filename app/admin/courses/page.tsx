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
  instructorId: number | null;
  price: number;
  creditHours: number;
  departments: string[];
  isActive: boolean;
}

interface Teacher {
  id: number;
  name: string;
  email: string;
}

interface Department {
  id: number;
  name: string;
}

export default function AdminCoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructorId, setInstructorId] = useState<string>('');
  const [price, setPrice] = useState('0');
  const [creditHours, setCreditHours] = useState('3');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
      return;
    }
    if (user) {
      Promise.all([
        apiFetch('/courses'),
        apiFetch('/auth/users'),
        apiFetch('/departments'),
      ])
        .then(([coursesData, usersData, deptsData]) => {
          setCourses(coursesData);
          setTeachers(usersData.filter((u: any) => u.role === 'teacher'));
          setDepartments(deptsData);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setInstructorId('');
    setPrice('0');
    setCreditHours('3');
    setSelectedDepts([]);
    setIsActive(true);
    setEditingId(null);
  };

  const startEdit = (course: Course) => {
    setEditingId(course.id);
    setTitle(course.title);
    setDescription(course.description);
    setInstructorId(course.instructorId ? String(course.instructorId) : '');
    setPrice(String(course.price));
    setCreditHours(String(course.creditHours));
    setSelectedDepts(course.departments || []);
    setIsActive(course.isActive);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const body: any = {
      title,
      description,
      instructorId: parseInt(instructorId),
      price: parseFloat(price),
      creditHours: parseInt(creditHours),
      departments: selectedDepts,
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
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Teacher <span className="text-red-500">*</span></label>
            <select required value={instructorId} onChange={(e) => setInstructorId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none cursor-pointer">
              <option value="">Select a teacher...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description <span className="text-red-500">*</span></label>
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Price <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Credit Hours <span className="text-red-500">*</span></label>
            <input type="number" required value={creditHours} onChange={(e) => setCreditHours(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Departments <span className="text-red-500">*</span></label>
            <div className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 max-h-36 overflow-y-auto">
              {departments.map((d) => (
                <label key={d.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDepts.includes(d.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDepts((prev) => [...prev, d.name]);
                      } else {
                        setSelectedDepts((prev) => prev.filter((n) => n !== d.name));
                      }
                    }}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700"
                  />
                  <span className="text-sm text-zinc-900 dark:text-white">{d.name}</span>
                </label>
              ))}
              {departments.length === 0 && (
                <p className="text-sm text-zinc-400 dark:text-zinc-500">No departments available</p>
              )}
            </div>
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
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 cursor-pointer">
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
                {course.instructor} · {course.creditHours} credits · ${Number(course.price).toFixed(2)}{course.departments?.length ? ` · ${course.departments.join(', ')}` : ''}
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
