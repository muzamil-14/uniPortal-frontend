'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch, apiUpload } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';

interface Course {
  id: number;
  title: string;
}

interface Material {
  id: number;
  title: string;
  description: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}

export default function TeacherMaterialsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      apiFetch(`/course-materials/course/${selectedCourse}`).then(setMaterials);
    } else {
      setMaterials([]);
    }
  }, [selectedCourse]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !file || !title.trim()) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('courseId', String(selectedCourse));
      await apiUpload('/course-materials', formData);
      toast.success('Material uploaded successfully');
      setTitle('');
      setDescription('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      const updated = await apiFetch(`/course-materials/course/${selectedCourse}`);
      setMaterials(updated);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({ title: 'Delete Material', message: 'Are you sure you want to delete this material?' });
    if (!ok) return;
    try {
      await apiFetch(`/course-materials/${id}`, { method: 'DELETE' });
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      toast.success('Material deleted');
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
        <h1 className="text-3xl font-bold gradient-text">Course Materials</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Upload and manage course materials</p>
      </div>

      {/* Course selector */}
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
        <>
          {/* Upload form */}
          <form onSubmit={handleUpload} className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Upload New Material</h2>
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
                <label className="block text-sm font-medium mb-1">File *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 rounded-xl bg-background border border-card-border file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-accent file:text-white file:text-sm file:cursor-pointer"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-card-border focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <button
              type="submit"
              disabled={uploading || !file || !title.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {uploading ? 'Uploading...' : 'Upload Material'}
            </button>
          </form>

          {/* Materials list */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Uploaded Materials ({materials.length})</h2>
            {materials.length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">No materials uploaded yet.</p>
            ) : (
              materials.map((m) => (
                <div key={m.id} className="bg-card-bg border border-card-border rounded-xl p-4 flex items-center justify-between card-interactive">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{m.title}</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{m.fileName}</p>
                      {m.description && <p className="text-xs text-zinc-400 mt-0.5">{m.description}</p>}
                      <p className="text-xs text-zinc-400 mt-1">{new Date(m.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL}${m.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-sm bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
                    >
                      Download
                    </a>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
