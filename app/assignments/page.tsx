'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch, apiUpload } from '@/lib/api';
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
  grade?: string;
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  courseId: number;
  deadline: string;
  createdAt: string;
  submissions?: { id: number; studentId: number }[];
}

interface Submission {
  id: number;
  assignmentId: number;
  fileName: string;
  fileUrl: string;
  submittedAt: string;
  assignment: { id: number; title: string; course: { title: string } };
}

export default function StudentAssignmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      apiFetch('/enrollments/my-courses'),
      apiFetch('/submissions/my'),
    ]).then(([enrollData, subData]) => {
      setEnrollments(enrollData);
      setSubmissions(subData);
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

  const isSubmitted = (assignmentId: number) => {
    return submissions.some((s) => s.assignmentId === assignmentId);
  };

  const isPastDeadline = (deadline: string) => {
    return new Date() > new Date(deadline);
  };

  const handleSubmit = async (assignmentId: number) => {
    const file = fileInputRefs.current[assignmentId]?.files?.[0];
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    setSubmittingId(assignmentId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiUpload(`/submissions/${assignmentId}`, formData);
      toast.success('Assignment submitted successfully!');
      const updated = await apiFetch('/submissions/my');
      setSubmissions(updated);
      if (fileInputRefs.current[assignmentId]) {
        fileInputRefs.current[assignmentId]!.value = '';
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingId(null);
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
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">View and submit your course assignments</p>
      </div>

      <CourseSelector
        courses={enrollments.filter((e) => e.status !== 'completed').map((e) => e.course)}
        selectedCourse={selectedCourse}
        onSelect={(id) => setSelectedCourse(id)}
        label="Your Courses"
        subtitle="Select a course to view and submit assignments"
      />

      {selectedCourse && (
        <div className="space-y-4">
          {assignments.filter((a) => !isPastDeadline(a.deadline) || isSubmitted(a.id)).length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 text-center py-12">No assignments for this course yet.</p>
          ) : (
            assignments.filter((a) => !isPastDeadline(a.deadline) || isSubmitted(a.id)).map((a) => {
              const submitted = isSubmitted(a.id);
              const pastDeadline = isPastDeadline(a.deadline);
              const submission = submissions.find((s) => s.assignmentId === a.id);

              return (
                <div key={a.id} className="bg-card-bg border border-card-border rounded-xl p-5 card-interactive">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{a.title}</h3>
                        {submitted && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Submitted
                          </span>
                        )}
                        {!submitted && pastDeadline && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Past Due
                          </span>
                        )}
                        {!submitted && !pastDeadline && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{a.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-400 mb-4">
                    <span>Deadline: {new Date(a.deadline).toLocaleString()}</span>
                    {submission && <span>Submitted: {new Date(submission.submittedAt).toLocaleString()}</span>}
                  </div>

                  {/* Submission area */}
                  {submitted ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">Submitted: {submission?.fileName}</p>
                        <p className="text-xs text-green-600 dark:text-green-500">Submissions cannot be undone.</p>
                      </div>
                    </div>
                  ) : pastDeadline ? (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-600 dark:text-red-400">The deadline has passed. Submission is no longer available.</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <input
                        ref={(el) => { fileInputRefs.current[a.id] = el; }}
                        type="file"
                        className="flex-1 text-sm file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-accent file:text-white file:text-sm file:cursor-pointer"
                      />
                      <button
                        onClick={() => handleSubmit(a.id)}
                        disabled={submittingId === a.id}
                        className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {submittingId === a.id ? 'Submitting...' : 'Submit'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
