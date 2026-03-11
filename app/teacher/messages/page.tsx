'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/lib/toast-context';

interface Course {
  id: number;
  title: string;
}

interface Student {
  userId: number;
  user: { id: number; name: string; email: string };
}

export default function TeacherMessagesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    apiFetch('/courses/teacher/my-courses').then((data) => {
      setCourses(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      apiFetch(`/enrollments/courses/${selectedCourse}/students`).then((data) => {
        setStudents(data);
        setSelectedStudents([]);
      });
    } else {
      setStudents([]);
      setSelectedStudents([]);
    }
  }, [selectedCourse]);

  const toggleStudent = (id: number) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.user.id));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !title.trim() || !message.trim() || selectedStudents.length === 0) return;
    setSending(true);
    try {
      await apiFetch('/notifications/send-message', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          courseId: selectedCourse,
          studentIds: selectedStudents,
        }),
      });
      toast.success(`Message sent to ${selectedStudents.length} student(s)`);
      setTitle('');
      setMessage('');
      setSelectedStudents([]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
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
        <h1 className="text-3xl font-bold gradient-text">Send Messages</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Send notifications to your students</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Select Course</label>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value ? Number(e.target.value) : '')}
          className="w-full max-w-md px-4 py-2.5 rounded-xl bg-card-bg border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <option value="">Choose a course...</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {selectedCourse && (
        <form onSubmit={handleSend} className="space-y-6">
          {/* Student selection */}
          <div className="bg-card-bg border border-card-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Select Recipients ({selectedStudents.length}/{students.length})</h2>
              <button
                type="button"
                onClick={selectAll}
                className="text-sm text-accent hover:underline cursor-pointer"
              >
                {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            {students.length === 0 ? (
              <p className="text-zinc-500 text-center py-4">No students enrolled in this course.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {students.map((s) => (
                  <label
                    key={s.user.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selectedStudents.includes(s.user.id)
                        ? 'bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s.user.id)}
                      onChange={() => toggleStudent(s.user.id)}
                      className="rounded"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.user.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{s.user.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Message form */}
          <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Compose Message</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Subject *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Message subject..."
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Type your message..."
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40"
                required
              />
            </div>
            <button
              type="submit"
              disabled={sending || selectedStudents.length === 0 || !title.trim() || !message.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {sending ? 'Sending...' : `Send to ${selectedStudents.length} Student(s)`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
