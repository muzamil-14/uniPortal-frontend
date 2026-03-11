'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';

interface Course {
  id: number;
  title: string;
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  courseId: number;
  deadline: string;
  createdAt: string;
  submissions?: { id: number }[];
  course?: Course;
}

export default function TeacherAssignmentsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const toast = useToast();
  const confirmDialog = useConfirm();

  useEffect(() => {
    apiFetch('/courses/teacher/my-courses').then((data) => {
      setCourses(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      apiFetch(`/assignments/course/${selectedCourse}`).then(setAssignments);
    } else {
      setAssignments([]);
    }
  }, [selectedCourse]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDeadline('');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !title.trim() || !description.trim() || !deadline) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await apiFetch(`/assignments/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ title: title.trim(), description: description.trim(), deadline }),
        });
        toast.success('Assignment updated');
      } else {
        await apiFetch('/assignments', {
          method: 'POST',
          body: JSON.stringify({ title: title.trim(), description: description.trim(), courseId: selectedCourse, deadline }),
        });
        toast.success('Assignment created');
      }
      resetForm();
      const updated = await apiFetch(`/assignments/course/${selectedCourse}`);
      setAssignments(updated);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (a: Assignment) => {
    setTitle(a.title);
    setDescription(a.description);
    setDeadline(a.deadline.slice(0, 16));
    setEditingId(a.id);
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({ title: 'Delete Assignment', message: 'Are you sure? All submissions will be deleted.' });
    if (!ok) return;
    try {
      await apiFetch(`/assignments/${id}`, { method: 'DELETE' });
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      toast.success('Assignment deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Assignments</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Create and manage course assignments</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Select Course</label>
        <select
          value={selectedCourse}
          onChange={(e) => { setSelectedCourse(e.target.value ? Number(e.target.value) : ''); resetForm(); }}
          className="w-full max-w-md px-4 py-2.5 rounded-xl bg-card-bg border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <option value="">Choose a course...</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {selectedCourse && (
        <>
          <form onSubmit={handleSubmit} className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit Assignment' : 'Create Assignment'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deadline *</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Saving...' : editingId ? 'Update' : 'Create Assignment'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="px-6 py-2.5 border border-card-border rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Assignments ({assignments.length})</h2>
            {assignments.length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">No assignments created yet.</p>
            ) : (
              assignments.map((a) => {
                const isPast = new Date(a.deadline) < new Date();
                return (
                  <div key={a.id} className="bg-card-bg border border-card-border rounded-xl p-4 card-interactive">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{a.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isPast ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                            {isPast ? 'Past Due' : 'Active'}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{a.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                          <span>Deadline: {new Date(a.deadline).toLocaleString()}</span>
                          <span>Submissions: {a.submissions?.length || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <button onClick={() => handleEdit(a)} className="px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors cursor-pointer">Edit</button>
                        <button onClick={() => handleDelete(a.id)} className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer">Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
