'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import CourseSelector from '@/components/course-selector';

interface Course {
  id: number;
  title: string;
}

interface Enrollment {
  courseId: number;
  course: Course;
  status: string;
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

export default function StudentMaterialsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const toast = useToast();

  useEffect(() => {
    apiFetch('/enrollments/my-courses')
      .then(setEnrollments)
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      setLoadingMaterials(true);
      apiFetch(`/course-materials/course/${selectedCourse}`)
        .then(setMaterials)
        .catch(() => {
          toast.error('Failed to load materials');
          setMaterials([]);
        })
        .finally(() => setLoadingMaterials(false));
    } else {
      setMaterials([]);
    }
  }, [selectedCourse]);

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${fileUrl}`);
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

  const getFileIcon = (fileType: string) => {
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('image')) return '🖼️';
    if (fileType?.includes('video')) return '🎬';
    if (fileType?.includes('presentation') || fileType?.includes('ppt')) return '📊';
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
    if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) return '📈';
    return '📎';
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
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Download study materials for your courses</p>
      </div>

      <CourseSelector
        courses={enrollments.filter((e) => e.status !== 'completed').map((e) => e.course)}
        selectedCourse={selectedCourse}
        onSelect={(id) => setSelectedCourse(id)}
        label="Your Courses"
        subtitle="Select a course to browse materials"
      />

      {selectedCourse && (
        <div className="space-y-4">
          {loadingMaterials ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
            </div>
          ) : materials.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 text-center py-12">No materials uploaded for this course yet.</p>
          ) : (
            materials.map((m) => (
              <div key={m.id} className="bg-card-bg border border-card-border rounded-xl p-5 card-interactive">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-lg shrink-0">
                      {getFileIcon(m.fileType)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{m.title}</h3>
                      {m.description && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{m.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                        <span>{m.fileName}</span>
                        <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadFile(m.fileUrl, m.fileName)}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-medium hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ml-4"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
