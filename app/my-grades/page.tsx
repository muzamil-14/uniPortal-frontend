'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface GradeEntry {
  id: number;
  grade: string | null;
  marks: number | null;
  finalMarks: number | null;
  midMarks: number | null;
  quizMarks: number | null;
  assignmentMarks: number | null;
  status: string;
  enrolledAt: string;
  course: {
    id: number;
    title: string;
    instructor: string;
    creditHours: number;
  };
}

const gradePoints: Record<string, number> = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'F': 0.0,
};

function getGradeColor(grade: string | null): string {
  if (!grade) return 'text-zinc-400 dark:text-zinc-500';
  const gp = gradePoints[grade];
  if (gp === undefined) return 'text-zinc-600 dark:text-zinc-400';
  if (gp >= 3.7) return 'text-green-600 dark:text-green-400';
  if (gp >= 3.0) return 'text-blue-600 dark:text-blue-400';
  if (gp >= 2.0) return 'text-yellow-600 dark:text-yellow-400';
  if (gp >= 1.0) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

export default function MyGradesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!authLoading && user && user.role === 'admin') {
      router.replace('/dashboard');
      return;
    }
    if (user) {
      apiFetch('/enrollments/my-grades')
        .then(setGrades)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  if (!user) return null;

  const gradedEntries = grades.filter((g) => g.grade);
  const totalCredits = gradedEntries.reduce(
    (sum, g) => sum + (g.course.creditHours || 0),
    0,
  );
  const totalGradePoints = gradedEntries.reduce((sum, g) => {
    const gp = gradePoints[g.grade!] ?? 0;
    return sum + gp * (g.course.creditHours || 0);
  }, 0);
  const gpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '—';

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
          My Grades
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Your academic performance overview
        </p>
      </div>

      {/* GPA Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
            Cumulative GPA
          </p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">
            {gpa}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">out of 4.0</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
            Total Courses
          </p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">
            {grades.length}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
            Credit Hours
          </p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">
            {grades.reduce((sum, g) => sum + (g.course.creditHours || 0), 0)}
          </p>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">Course</th>
                <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">Instructor</th>
                <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Credits</th>
                <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Finals<br/><span className="text-xs font-normal">(50%)</span></th>
                <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Mids<br/><span className="text-xs font-normal">(25%)</span></th>
                <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Quizzes<br/><span className="text-xs font-normal">(15%)</span></th>
                <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Assignments<br/><span className="text-xs font-normal">(10%)</span></th>
                <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Total</th>
                <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Grade</th>
                <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {grades.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                >
                  <td className="p-4 font-medium text-zinc-900 dark:text-white">
                    {entry.course.title}
                  </td>
                  <td className="p-4 text-zinc-500 dark:text-zinc-400">
                    {entry.course.instructor}
                  </td>
                  <td className="p-4 text-center text-zinc-500 dark:text-zinc-400">
                    {entry.course.creditHours}
                  </td>
                  <td className="p-4 text-center text-zinc-600 dark:text-zinc-300">
                    {entry.finalMarks !== null ? entry.finalMarks : '—'}
                  </td>
                  <td className="p-4 text-center text-zinc-600 dark:text-zinc-300">
                    {entry.midMarks !== null ? entry.midMarks : '—'}
                  </td>
                  <td className="p-4 text-center text-zinc-600 dark:text-zinc-300">
                    {entry.quizMarks !== null ? entry.quizMarks : '—'}
                  </td>
                  <td className="p-4 text-center text-zinc-600 dark:text-zinc-300">
                    {entry.assignmentMarks !== null ? entry.assignmentMarks : '—'}
                  </td>
                  <td className="p-4 text-center font-semibold text-zinc-700 dark:text-zinc-200">
                    {entry.marks !== null ? entry.marks : '—'}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`font-bold text-base ${getGradeColor(entry.grade)}`}
                    >
                      {entry.grade || '—'}
                    </span>
                  </td>
                  <td className="p-4 text-center text-zinc-600 dark:text-zinc-300">
                    {entry.grade && gradePoints[entry.grade] !== undefined
                      ? gradePoints[entry.grade].toFixed(1)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {grades.length === 0 && (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            No courses enrolled yet.
          </div>
        )}
      </div>
    </div>
  );
}
