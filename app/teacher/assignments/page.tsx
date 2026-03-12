'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import CourseSelector from '@/components/course-selector';

interface Course {
  id: number;
  title: string;
}

interface Submission {
  id: number;
  studentId: number;
  fileName: string;
  fileUrl: string;
  submittedAt: string;
  student?: { id: number; name: string; email: string };
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
  const [viewingSubmissions, setViewingSubmissions] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
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
      if (viewingSubmissions === id) setViewingSubmissions(null);
      toast.success('Assignment deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleSubmissions = async (assignmentId: number) => {
    if (viewingSubmissions === assignmentId) {
      setViewingSubmissions(null);
      setSubmissions([]);
      return;
    }
    setViewingSubmissions(assignmentId);
    setLoadingSubmissions(true);
    try {
      const data = await apiFetch(`/submissions/assignment/${assignmentId}`);
      setSubmissions(data);
    } catch (err: any) {
      toast.error(err.message);
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${fileUrl}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download file');
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

      <CourseSelector
        courses={courses}
        selectedCourse={selectedCourse}
        onSelect={(id) => { setSelectedCourse(id); resetForm(); }}
        label="Your Courses"
        subtitle="Select a course to manage assignments"
      />

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
                  min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
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
                        <button onClick={() => toggleSubmissions(a.id)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${viewingSubmissions === a.id ? 'bg-accent/10 text-accent' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                          {viewingSubmissions === a.id ? 'Hide' : 'View'} Submissions
                        </button>
                        <button onClick={() => handleEdit(a)} className="px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors cursor-pointer">Edit</button>
                        <button onClick={() => handleDelete(a.id)} className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer">Delete</button>
                      </div>
                    </div>

                    {viewingSubmissions === a.id && (
                      <div className="mt-4 pt-4 border-t border-card-border">
                        <h4 className="text-sm font-semibold mb-3">Submissions ({loadingSubmissions ? '...' : submissions.length})</h4>
                        {loadingSubmissions ? (
                          <div className="flex justify-center py-4">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
                          </div>
                        ) : submissions.length === 0 ? (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-2">No submissions yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {submissions.map((s) => (
                              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-card-border">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium">
                                    {s.student?.name ?? `Student #${s.studentId}`}
                                  </p>
                                  <p className="text-xs text-zinc-400">{s.student?.email}</p>
                                  <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400">
                                    <span>{s.fileName}</span>
                                    <span>{new Date(s.submittedAt).toLocaleString()}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => downloadFile(s.fileUrl, s.fileName)}
                                  className="px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                  Download
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
