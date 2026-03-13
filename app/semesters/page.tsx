'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import RouteGuard from '@/components/route-guard';
import Link from 'next/link';

interface CourseEntry {
  courseId: number;
  courseTitle: string;
  creditHours: number;
  grade: string | null;
  gradePoints: number | null;
  status: string;
}

interface SemesterSummary {
  semesterNumber: number;
  name: string;
  status: 'active' | 'completed' | 'upcoming';
  gpa: number | null;
  enrolledCreditHours: number;
  minCreditHours: number;
  maxCreditHours: number;
  isCurrentSemester: boolean;
  startedAt: string | null;
  completedAt: string | null;
  courses: CourseEntry[];
}

interface AcademicSummary {
  userId: number;
  studentName: string;
  currentSemester: number;
  maxSemesters: number;
  normalSemesters: number;
  cgpa: number | null;
  currentSemesterCreditHours: number;
  currentSemesterActivated: boolean;
  currentSemesterMinCH: number;
  currentSemesterMaxCH: number;
  totalCreditHoursEnrolled: number;
  semesters: SemesterSummary[];
}

interface AttendanceSummaryItem {
  courseId: number;
  courseName: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

function gpaColor(gpa: number | null): string {
  if (gpa === null) return 'text-zinc-400';
  if (gpa >= 3.5) return 'text-emerald-500';
  if (gpa >= 3.0) return 'text-blue-500';
  if (gpa >= 2.5) return 'text-yellow-500';
  return 'text-red-500';
}

function gradeColor(grade: string | null): string {
  if (!grade) return 'text-zinc-400';
  if (['A+', 'A', 'A-'].includes(grade)) return 'text-emerald-500';
  if (['B+', 'B', 'B-'].includes(grade)) return 'text-blue-500';
  if (['C+', 'C', 'C-'].includes(grade)) return 'text-yellow-500';
  if (['D+', 'D', 'D-'].includes(grade)) return 'text-orange-500';
  return 'text-red-500';
}

function SemesterCard({ sem }: { sem: SemesterSummary }) {
  const [expanded, setExpanded] = useState(sem.isCurrentSemester);

  const statusBadge =
    sem.status === 'completed'
      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
      : sem.status === 'active'
        ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500';

  const chPercent = Math.min(
    100,
    Math.round((sem.enrolledCreditHours / sem.maxCreditHours) * 100),
  );

  return (
    <div
      className={`rounded-2xl border transition-all ${
        sem.isCurrentSemester
          ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md shadow-indigo-500/10'
          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                sem.isCurrentSemester
                  ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white'
                  : sem.status === 'completed'
                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}
            >
              {sem.semesterNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                  {sem.name}
                </span>
                {sem.isCurrentSemester && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                    Current
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {sem.courses.length} course{sem.courses.length !== 1 ? 's' : ''}{' '}
                · {sem.enrolledCreditHours} credit hours
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadge}`}
          >
            {sem.status.charAt(0).toUpperCase() + sem.status.slice(1)}
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          {sem.gpa !== null && (
            <div className="text-right">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">GPA</p>
              <p className={`text-lg font-bold ${gpaColor(sem.gpa)}`}>
                {sem.gpa.toFixed(2)}
              </p>
            </div>
          )}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-zinc-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
          {/* Credit Hours Progress */}
          <div>
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
              <span>Credit Hours</span>
              <span>
                {sem.enrolledCreditHours} / {sem.maxCreditHours} (min:{' '}
                {sem.minCreditHours})
              </span>
            </div>
            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  chPercent < 43
                    ? 'bg-red-400'
                    : chPercent < 71
                      ? 'bg-yellow-400'
                      : 'bg-emerald-400'
                }`}
                style={{ width: `${chPercent}%` }}
              />
            </div>
          </div>

          {/* Course Table */}
          {sem.courses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="text-left pb-2 text-zinc-400 dark:text-zinc-500 font-medium">
                      Course
                    </th>
                    <th className="text-center pb-2 text-zinc-400 dark:text-zinc-500 font-medium">
                      CH
                    </th>
                    <th className="text-center pb-2 text-zinc-400 dark:text-zinc-500 font-medium">
                      Grade
                    </th>
                    <th className="text-center pb-2 text-zinc-400 dark:text-zinc-500 font-medium">
                      Points
                    </th>
                    <th className="text-center pb-2 text-zinc-400 dark:text-zinc-500 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sem.courses.map((c) => (
                    <tr
                      key={c.courseId}
                      className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0"
                    >
                      <td className="py-2.5 text-zinc-700 dark:text-zinc-300">
                        {c.courseTitle}
                      </td>
                      <td className="py-2.5 text-center text-zinc-500 dark:text-zinc-400">
                        {c.creditHours}
                      </td>
                      <td
                        className={`py-2.5 text-center font-bold ${gradeColor(c.grade)}`}
                      >
                        {c.grade ?? '—'}
                      </td>
                      <td className="py-2.5 text-center text-zinc-500 dark:text-zinc-400">
                        {c.gradePoints !== null
                          ? c.gradePoints.toFixed(1)
                          : '—'}
                      </td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.status === 'completed'
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                              : 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-3">
              No courses enrolled in this semester yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SemestersPage() {
  const [summary, setSummary] = useState<AcademicSummary | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummaryItem[]>([]);
  const [trackerVisible, setTrackerVisible] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAttendanceSummary = async () => {
    setTrackerLoading(true);
    try {
      const data = await apiFetch('/attendance/my/summary');
      setAttendanceSummary(data || []);
    } catch {
      setAttendanceSummary([]);
    } finally {
      setTrackerLoading(false);
    }
  };

  const getVisibleSemesters = (academic: AcademicSummary): SemesterSummary[] => {
    if (academic.currentSemesterActivated) {
      return academic.semesters;
    }
    return academic.semesters.filter(
      (sem) => !sem.isCurrentSemester || sem.courses.length > 0,
    );
  };

  useEffect(() => {
    apiFetch('/semesters/my')
      .then((data) => {
        setSummary(data);
        if (data?.currentSemesterActivated) {
          setTrackerVisible(true);
          loadAttendanceSummary();
        }
      })
      .catch(() => setError('Failed to load academic summary.'))
      .finally(() => setLoading(false));
  }, []);

  const handleRegisterSemester = async () => {
    setRegistering(true);
    setError('');
    try {
      await apiFetch('/semesters/my/register', { method: 'POST' });
      const refreshed = await apiFetch('/semesters/my');
      setSummary(refreshed);
      setTrackerVisible(true);
      await loadAttendanceSummary();
    } catch {
      setError('Failed to register semester. Please verify your credit hours and try again.');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <RouteGuard>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"
            />
          ))}
        </div>
      </RouteGuard>
    );
  }

  const headerCanRegisterNow =
    !!summary &&
    !summary.currentSemesterActivated &&
    summary.currentSemesterCreditHours > 0 &&
    summary.currentSemesterCreditHours >= summary.currentSemesterMinCH &&
    summary.currentSemesterCreditHours <= summary.currentSemesterMaxCH;

  return (
    <RouteGuard>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
              Academic Progress
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Track your semester history, GPA, and CGPA
            </p>
          </div>
          {!summary?.currentSemesterActivated && (
            <div className="flex items-center gap-2">
              <Link
                href="/courses"
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Add Courses
              </Link>
              <button
                onClick={handleRegisterSemester}
                disabled={!headerCanRegisterNow || registering}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium hover:shadow-md hover:shadow-indigo-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {registering ? 'Registering...' : 'Register Semester'}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {summary && (
          <>
            {(() => {
              const neededToReachMin = Math.max(
                0,
                summary.currentSemesterMinCH - summary.currentSemesterCreditHours,
              );
              const remainingUntilMax = Math.max(
                0,
                summary.currentSemesterMaxCH - summary.currentSemesterCreditHours,
              );
              const canRegisterNow =
                summary.currentSemesterCreditHours > 0 &&
                summary.currentSemesterCreditHours >= summary.currentSemesterMinCH &&
                summary.currentSemesterCreditHours <= summary.currentSemesterMaxCH;
              const currentSemester =
                summary.semesters.find((sem) => sem.isCurrentSemester) || null;
              const attendanceByCourseId = new Map(
                attendanceSummary.map((item) => [item.courseId, item]),
              );

              return (
                <>
            {/* Stats Bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 text-center">
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">
                  Current Semester
                </p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {summary.currentSemester}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  of {summary.maxSemesters}
                </p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 text-center">
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">
                  CGPA
                </p>
                <p
                  className={`text-3xl font-bold ${gpaColor(summary.cgpa)}`}
                >
                  {summary.cgpa !== null ? summary.cgpa.toFixed(2) : '—'}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">cumulative</p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 text-center">
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">
                  This Semester CH
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {summary.currentSemesterCreditHours}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  max {summary.currentSemesterMaxCH}
                </p>
              </div>

              <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 text-center">
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">
                  Total CH
                </p>
                <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                  {summary.totalCreditHoursEnrolled}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">all time</p>
              </div>
            </div>

            {/* Semester Progress Track */}
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-5">
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 mb-4">
                Semester Progress
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                {Array.from({ length: summary.maxSemesters }, (_, i) => i + 1).map(
                  (n) => {
                    const isCompleted = n < summary.currentSemester;
                    const isCurrent = n === summary.currentSemester;
                    const isNormal = n <= summary.normalSemesters;
                    return (
                      <div
                        key={n}
                        title={`Semester ${n}${!isNormal ? ' (extended)' : ''}`}
                        className={`flex items-center justify-center text-xs font-bold w-9 h-9 rounded-xl transition-colors ${
                          isCurrent
                            ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20'
                            : isCompleted
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : isNormal
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                                : 'bg-amber-50 dark:bg-amber-950/20 text-amber-400 border border-dashed border-amber-300 dark:border-amber-700'
                        }`}
                      >
                        {isCompleted ? (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          n
                        )}
                      </div>
                    );
                  },
                )}
                <div className="ml-3 text-xs text-zinc-400 dark:text-zinc-500">
                  <span className="text-emerald-500">■</span> Completed &nbsp;
                  <span className="text-indigo-500">■</span> Current &nbsp;
                  <span className="text-amber-400">■</span> Extended (9–12)
                </div>
              </div>
            </div>

            {/* Current Semester Status / Registration */}
            {!summary.currentSemesterActivated && (
              <div className="rounded-2xl border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20 p-6">
                <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-indigo-500 dark:text-indigo-400 font-semibold">
                      Semester Not Activated
                    </p>
                    <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mt-1">
                      Semester {summary.currentSemester} registration is pending
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1.5">
                      Select courses to activate your semester. Once registered,
                      your semester challan will be generated.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs">
                      <div className="rounded-lg bg-white/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
                        <p className="text-zinc-500 dark:text-zinc-400">Current CH</p>
                        <p className="font-bold text-zinc-800 dark:text-zinc-100 text-sm">
                          {summary.currentSemesterCreditHours}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
                        <p className="text-zinc-500 dark:text-zinc-400">Needed For Min</p>
                        <p className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                          {neededToReachMin}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
                        <p className="text-zinc-500 dark:text-zinc-400">Remaining To Max</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {remainingUntilMax}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href="/courses"
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium hover:shadow-md hover:shadow-indigo-500/20 transition-all"
                    >
                      Add Courses
                    </Link>
                    <button
                      onClick={handleRegisterSemester}
                      disabled={!canRegisterNow || registering}
                      className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {registering ? 'Registering...' : 'Register Semester'}
                    </button>
                  </div>
                </div>
                {!canRegisterNow && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
                    Registration unlocks when current credit hours are within range {summary.currentSemesterMinCH} to {summary.currentSemesterMaxCH}.
                  </p>
                )}
              </div>
            )}

            {summary.currentSemesterActivated && trackerVisible && (
              <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-indigo-500 dark:text-indigo-400 font-semibold">
                      Active Semester Tracker
                    </p>
                    <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mt-0.5">
                      Semester {summary.currentSemester} live progress
                    </h3>
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    CH: {summary.currentSemesterCreditHours} / {summary.currentSemesterMaxCH}
                  </div>
                </div>

                {trackerLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                    ))}
                  </div>
                ) : !currentSemester || currentSemester.courses.length === 0 ? (
                  <div className="p-5 text-sm text-zinc-500 dark:text-zinc-400">
                    No current semester courses found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                        <tr>
                          <th className="text-left px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Course</th>
                          <th className="text-center px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium">CH</th>
                          <th className="text-center px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Status</th>
                          <th className="text-left px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentSemester.courses.map((course) => {
                          const attendance = attendanceByCourseId.get(course.courseId);
                          const attendancePercent = attendance?.percentage ?? 0;
                          return (
                            <tr key={course.courseId} className="border-t border-zinc-100 dark:border-zinc-800">
                              <td className="px-5 py-3 text-zinc-700 dark:text-zinc-300">
                                {course.courseTitle}
                              </td>
                              <td className="px-5 py-3 text-center text-zinc-600 dark:text-zinc-300">
                                {course.creditHours}
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  course.status === 'completed'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                                }`}>
                                  {course.status}
                                </span>
                              </td>
                              <td className="px-5 py-3 min-w-56">
                                <div className="flex items-center gap-3">
                                  <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        attendancePercent >= 80
                                          ? 'bg-emerald-500'
                                          : attendancePercent >= 70
                                            ? 'bg-yellow-500'
                                            : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(0, attendancePercent))}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 w-12 text-right">
                                    {attendancePercent}%
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                                  {attendance
                                    ? `${attendance.present + attendance.late}/${attendance.total} classes`
                                    : 'No attendance yet'}
                                </p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Semester Cards */}
            <div className="space-y-3">
              {getVisibleSemesters(summary).length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-8 text-center">
                  <p className="text-zinc-400 dark:text-zinc-500">
                    You have not enrolled in any courses yet. Enroll in courses
                    to get started.
                  </p>
                </div>
              ) : (
                getVisibleSemesters(summary).map((sem) => (
                  <SemesterCard key={sem.semesterNumber} sem={sem} />
                ))
              )}
            </div>

            {/* CGPA Notice */}
            {summary.currentSemester > summary.normalSemesters && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-4 flex gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-amber-500 shrink-0 mt-0.5"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    Extended Study Period
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                    You are in Semester {summary.currentSemester}. The standard
                    program is {summary.normalSemesters} semesters. Maximum
                    allowed is {summary.maxSemesters} semesters.
                  </p>
                </div>
              </div>
            )}
                </>
              );
            })()}
          </>
        )}
      </div>
    </RouteGuard>
  );
}
