'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface ResultCourse {
  courseId: number;
  courseTitle: string;
  instructor: string;
  creditHours: number;
  grade: string;
  marks: number | null;
  finalMarks: number | null;
  midMarks: number | null;
  quizMarks: number | null;
  assignmentMarks: number | null;
  gradePoints: number;
}

interface ResultCard {
  courses: ResultCourse[];
  totalCredits: number;
  gpa: number;
}

const gradeColor = (gp: number) => {
  if (gp >= 3.7) return 'text-green-600 dark:text-green-400';
  if (gp >= 3.0) return 'text-blue-600 dark:text-blue-400';
  if (gp >= 2.0) return 'text-amber-600 dark:text-amber-400';
  if (gp >= 1.0) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

export default function ResultCardPage() {
  const { user } = useAuth();
  const [result, setResult] = useState<ResultCard | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch('/enrollments/result-card')
      .then(setResult)
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  if (!result || result.courses.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <h1 className="text-3xl font-bold gradient-text mb-4">Result Card</h1>
        <div className="bg-card-bg border border-card-border rounded-2xl p-12">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-zinc-300 dark:text-zinc-600 mb-4"><rect x="2" y="3" width="20" height="18" rx="2" ry="2" /><line x1="8" y1="21" x2="8" y2="3" /><line x1="2" y1="9" x2="22" y2="9" /><line x1="2" y1="15" x2="22" y2="15" /></svg>
          <p className="text-zinc-500 dark:text-zinc-400">No results declared yet.</p>
          <p className="text-sm text-zinc-400 mt-1">Results will appear here once your courses are graded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Result Card</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Your academic transcript for completed courses</p>
        </div>
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-medium hover:shadow-lg transition-all cursor-pointer print:hidden"
        >
          Print / Save PDF
        </button>
      </div>

      <div ref={printRef} className="bg-card-bg border border-card-border rounded-2xl p-8 print:border-none print:shadow-none">
        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b border-card-border">
          <h2 className="text-2xl font-bold text-accent">TGI University</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Official Result Card</p>
          <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
            <p><strong>Student:</strong> {user?.name}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            {user?.department && <p><strong>Department:</strong> {user.department}</p>}
          </div>
        </div>

        {/* Results table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-card-border">
                <th className="text-left py-3 px-3 font-semibold">#</th>
                <th className="text-left py-3 px-3 font-semibold">Course</th>
                <th className="text-left py-3 px-3 font-semibold">Instructor</th>
                <th className="text-center py-3 px-3 font-semibold">Credits</th>
                <th className="text-center py-3 px-3 font-semibold">Finals<br/><span className="text-xs font-normal">(50%)</span></th>
                <th className="text-center py-3 px-3 font-semibold">Mids<br/><span className="text-xs font-normal">(25%)</span></th>
                <th className="text-center py-3 px-3 font-semibold">Quizzes<br/><span className="text-xs font-normal">(15%)</span></th>
                <th className="text-center py-3 px-3 font-semibold">Assignments<br/><span className="text-xs font-normal">(10%)</span></th>
                <th className="text-center py-3 px-3 font-semibold">Total</th>
                <th className="text-center py-3 px-3 font-semibold">Grade</th>
                <th className="text-center py-3 px-3 font-semibold">Points</th>
              </tr>
            </thead>
            <tbody>
              {result.courses.map((c, i) => (
                <tr key={c.courseId} className="border-b border-card-border/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="py-3 px-3 text-zinc-400">{i + 1}</td>
                  <td className="py-3 px-3 font-medium">{c.courseTitle}</td>
                  <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400">{c.instructor}</td>
                  <td className="py-3 px-3 text-center">{c.creditHours}</td>
                  <td className="py-3 px-3 text-center">{c.finalMarks !== null ? c.finalMarks : '—'}</td>
                  <td className="py-3 px-3 text-center">{c.midMarks !== null ? c.midMarks : '—'}</td>
                  <td className="py-3 px-3 text-center">{c.quizMarks !== null ? c.quizMarks : '—'}</td>
                  <td className="py-3 px-3 text-center">{c.assignmentMarks !== null ? c.assignmentMarks : '—'}</td>
                  <td className="py-3 px-3 text-center font-semibold">{c.marks !== null ? c.marks : '—'}</td>
                  <td className={`py-3 px-3 text-center font-bold ${gradeColor(c.gradePoints)}`}>{c.grade}</td>
                  <td className="py-3 px-3 text-center">{c.gradePoints.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-8 pt-6 border-t-2 border-card-border">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-sm text-zinc-500">Total Courses: <span className="font-semibold text-foreground">{result.courses.length}</span></p>
              <p className="text-sm text-zinc-500">Total Credits: <span className="font-semibold text-foreground">{result.totalCredits}</span></p>
            </div>
            <div className="text-center">
              <p className="text-sm text-zinc-500 mb-1">Cumulative GPA</p>
              <p className={`text-4xl font-bold ${gradeColor(result.gpa)}`}>{result.gpa.toFixed(2)}</p>
              <p className="text-xs text-zinc-400 mt-1">out of 4.00</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
