'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AttendanceSummary {
  courseId: number;
  courseName: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
  course: { id: number; title: string };
}

export default function AttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<AttendanceSummary[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'summary' | 'detail'>('summary');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!authLoading && user && user.role === 'admin') {
      router.replace('/admin/attendance');
      return;
    }
    if (user) {
      Promise.all([
        apiFetch('/attendance/my/summary'),
        apiFetch('/attendance/my'),
      ])
        .then(([sum, recs]) => {
          setSummary(sum);
          setRecords(recs);
        })
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

  const overallTotal = summary.reduce((s, r) => s + r.total, 0);
  const overallPresent = summary.reduce(
    (s, r) => s + r.present + r.late,
    0,
  );
  const overallPct =
    overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
          Attendance
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Track your class attendance
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
            Overall Attendance
          </p>
          <p
            className={`text-3xl font-bold ${
              overallPct >= 75
                ? 'text-green-600 dark:text-green-400'
                : overallPct >= 50
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
            }`}
          >
            {overallPct}%
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
            Classes Attended
          </p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">
            {overallPresent}/{overallTotal}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
            Courses Tracked
          </p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">
            {summary.length}
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView('summary')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
            view === 'summary'
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400'
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setView('detail')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
            view === 'detail'
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400'
          }`}
        >
          Detailed Records
        </button>
      </div>

      {view === 'summary' ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">
                    Course
                  </th>
                  <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">
                    Present
                  </th>
                  <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">
                    Late
                  </th>
                  <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">
                    Absent
                  </th>
                  <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">
                    Total
                  </th>
                  <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {summary.map((s) => (
                  <tr
                    key={s.courseId}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                  >
                    <td className="p-4 font-medium text-zinc-900 dark:text-white">
                      {s.courseName}
                    </td>
                    <td className="p-4 text-center text-green-600 dark:text-green-400">
                      {s.present}
                    </td>
                    <td className="p-4 text-center text-yellow-600 dark:text-yellow-400">
                      {s.late}
                    </td>
                    <td className="p-4 text-center text-red-600 dark:text-red-400">
                      {s.absent}
                    </td>
                    <td className="p-4 text-center text-zinc-600 dark:text-zinc-300">
                      {s.total}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`font-bold ${
                          s.percentage >= 75
                            ? 'text-green-600 dark:text-green-400'
                            : s.percentage >= 50
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {s.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {summary.length === 0 && (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              No attendance records yet.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">
                    Date
                  </th>
                  <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">
                    Course
                  </th>
                  <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                  >
                    <td className="p-4 text-zinc-900 dark:text-white">
                      {new Date(r.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-300">
                      {r.course.title}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          r.status === 'present'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : r.status === 'late'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {records.length === 0 && (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              No attendance records yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
