'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Announcement {
  id: number;
  title: string;
  content: string;
  isImportant: boolean;
  createdAt: string;
  author: { name: string } | null;
}

interface SemesterSummaryCourse {
  courseId: number;
  courseTitle: string;
  creditHours: number;
  status: string;
  grade: string | null;
}

interface AcademicSummary {
  currentSemester: number;
  currentSemesterActivated: boolean;
  currentSemesterCreditHours: number;
  currentSemesterMinCH: number;
  currentSemesterMaxCH: number;
  semesters: Array<{
    isCurrentSemester: boolean;
    courses: SemesterSummaryCourse[];
  }>;
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

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  activeCourses: number;
  totalEnrollments: number;
  totalDepartments: number;
}

interface TeacherStats {
  totalCourses: number;
  totalStudents: number;
  gradedStudents: number;
  pendingGrades: number;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  const [academicSummary, setAcademicSummary] = useState<AcademicSummary | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummaryItem[]>([]);
  const [registeringSemester, setRegisteringSemester] = useState(false);
  const [droppingCourseId, setDroppingCourseId] = useState<number | null>(null);
  const [studentActionError, setStudentActionError] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  const loadStudentDashboardData = async () => {
    const [sem, att, ann] = await Promise.all([
      apiFetch('/semesters/my'),
      apiFetch('/attendance/my/summary'),
      apiFetch('/announcements/recent'),
    ]);
    setAcademicSummary(sem);
    setAttendanceSummary(att || []);
    setAnnouncements(ann);
  };

  const handleRegisterSemester = async () => {
    setRegisteringSemester(true);
    setStudentActionError('');
    try {
      await apiFetch('/semesters/my/register', { method: 'POST' });
      await loadStudentDashboardData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message || '')
          : '';
      setStudentActionError(msg || 'Failed to register semester.');
    } finally {
      setRegisteringSemester(false);
    }
  };

  const handleDropCourse = async (courseId: number) => {
    const ok = window.confirm('Are you sure you want to drop this course?');
    if (!ok) return;
    setDroppingCourseId(courseId);
    setStudentActionError('');
    try {
      await apiFetch(`/enrollments/courses/${courseId}`, { method: 'DELETE' });
      await loadStudentDashboardData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message || '')
          : '';
      setStudentActionError(msg || 'Failed to drop course.');
    } finally {
      setDroppingCourseId(null);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
    if (user && user.role === 'student') {
      loadStudentDashboardData()
        .catch(() => {})
        .finally(() => setLoadingData(false));
    } else if (user && user.role === 'admin') {
      Promise.all([
        apiFetch('/dashboard/stats'),
        apiFetch('/announcements/recent'),
      ])
        .then(([st, ann]) => {
          setStats(st);
          setAnnouncements(ann);
        })
        .catch(() => {})
        .finally(() => setLoadingData(false));
    } else if (user && user.role === 'teacher') {
      Promise.all([
        apiFetch('/dashboard/teacher-stats'),
        apiFetch('/announcements/recent'),
      ])
        .then(([ts, ann]) => {
          setTeacherStats(ts);
          setAnnouncements(ann);
        })
        .catch(() => {})
        .finally(() => setLoadingData(false));
    }
  }, [user, loading, router]);

  if (loading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  if (!user) return null;

  const currentSemesterCreditHours = academicSummary?.currentSemesterCreditHours ?? 0;
  const dashboardCanRegisterNow =
    !!academicSummary &&
    !academicSummary.currentSemesterActivated &&
    academicSummary.currentSemesterCreditHours > 0 &&
    academicSummary.currentSemesterCreditHours >=
      academicSummary.currentSemesterMinCH &&
    academicSummary.currentSemesterCreditHours <=
      academicSummary.currentSemesterMaxCH;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8 animate-slide-up">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
          Welcome back, <span className="gradient-text">{user.name}</span>
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Here&apos;s your {user.role === 'admin' ? 'admin overview' : user.role === 'teacher' ? 'teaching overview' : 'academic overview'}
        </p>
      </div>

      {/* Student Stats */}
      {user.role === 'student' && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 card-interactive animate-slide-up stagger-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-violet-500 rounded-r" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Current Semester</p>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {academicSummary?.currentSemester ?? '—'}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            {academicSummary?.currentSemesterActivated ? 'Registered' : 'Pending Registration'}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 card-interactive animate-slide-up stagger-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-500 rounded-r" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Current Semester CH</p>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{currentSemesterCreditHours}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 card-interactive animate-slide-up stagger-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 to-orange-500 rounded-r" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Department</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {user.department || 'Not set'}
          </p>
        </div>
      </div>
      )}

      {/* Admin Stats */}
      {user.role === 'admin' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Students', value: stats.totalStudents, color: 'from-indigo-500 to-blue-500', text: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Teachers', value: stats.totalTeachers, color: 'from-violet-500 to-purple-500', text: 'text-violet-600 dark:text-violet-400' },
            { label: 'Courses', value: stats.totalCourses, color: 'from-emerald-500 to-teal-500', text: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Active', value: stats.activeCourses, color: 'from-cyan-500 to-sky-500', text: 'text-cyan-600 dark:text-cyan-400' },
            { label: 'Enrollments', value: stats.totalEnrollments, color: 'from-amber-500 to-orange-500', text: 'text-amber-600 dark:text-amber-400' },
            { label: 'Departments', value: stats.totalDepartments, color: 'from-rose-500 to-pink-500', text: 'text-rose-600 dark:text-rose-400' },
          ].map((stat, i) => (
            <div key={stat.label} className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 card-interactive animate-slide-up stagger-${i + 1} relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${stat.color}`} />
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.text}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Admin Quick Links */}
      {user.role === 'admin' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { href: '/admin/courses', label: 'Courses', icon: '📚' },
            { href: '/admin/departments', label: 'Departments', icon: '🏛️' },
            { href: '/admin/students', label: 'Students', icon: '👥' },
            { href: '/admin/announcements', label: 'Announcements', icon: '📢' },

          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 card-interactive hover:border-indigo-200 dark:hover:border-indigo-800 text-center group"
            >
              <span className="text-2xl mb-2 block transition-transform duration-200 group-hover:scale-110">{link.icon}</span>
              <p className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{link.label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Teacher Stats */}
      {user.role === 'teacher' && teacherStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 card-interactive animate-slide-up stagger-1 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-blue-500" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Courses</p>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{teacherStats.totalCourses}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 card-interactive animate-slide-up stagger-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-500 to-purple-500" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Total Students</p>
            <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">{teacherStats.totalStudents}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 card-interactive animate-slide-up stagger-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Graded</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{teacherStats.gradedStudents}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 card-interactive animate-slide-up stagger-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 to-orange-500" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Pending Grades</p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{teacherStats.pendingGrades}</p>
          </div>
        </div>
      )}

      {/* Teacher Quick Links */}
      {user.role === 'teacher' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[
            { href: '/courses', label: 'Courses', icon: '📚' },
            { href: '/teacher/grades', label: 'Grades', icon: '📊' },
            { href: '/teacher/attendance', label: 'Attendance', icon: '✅' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 card-interactive hover:border-indigo-200 dark:hover:border-indigo-800 text-center group"
            >
              <span className="text-2xl mb-2 block transition-transform duration-200 group-hover:scale-110">{link.icon}</span>
              <p className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{link.label}</p>
            </Link>
          ))}
        </div>
      )}

      <div>
        {/* Recent Announcements */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 card-interactive animate-slide-up">
          <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Recent Announcements
            </h2>
            <Link
              href="/announcements"
              className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors font-medium"
            >
              View all →
            </Link>
          </div>
          {announcements.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 dark:text-zinc-400 text-sm">
              No announcements yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {announcements.slice(0, 4).map((a) => (
                <div key={a.id} className="p-4 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    {a.isImportant && <span className="text-amber-500 text-sm">★</span>}
                    <p className="font-medium text-zinc-900 dark:text-white text-sm">
                      {a.title}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {a.content}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Student: Semester Summary */}
      {user.role === 'student' && (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 mt-6 card-interactive animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Semester Summary
          </h2>
        </div>
        {!academicSummary ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            Semester summary is not available right now.
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {(() => {
              const neededToReachMin = Math.max(
                0,
                academicSummary.currentSemesterMinCH - academicSummary.currentSemesterCreditHours,
              );
              const remainingUntilMax = Math.max(
                0,
                academicSummary.currentSemesterMaxCH - academicSummary.currentSemesterCreditHours,
              );
              const currentSemester =
                academicSummary.semesters.find((sem) => sem.isCurrentSemester) || null;
              const attendanceByCourseId = new Map(
                attendanceSummary.map((item) => [item.courseId, item]),
              );
              const canRegisterNow =
                academicSummary.currentSemesterCreditHours > 0 &&
                academicSummary.currentSemesterCreditHours >=
                  academicSummary.currentSemesterMinCH &&
                academicSummary.currentSemesterCreditHours <=
                  academicSummary.currentSemesterMaxCH;

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-zinc-50/80 dark:bg-zinc-800/50">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Current Semester</p>
                      <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                        {academicSummary.currentSemester}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-zinc-50/80 dark:bg-zinc-800/50">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Current CH</p>
                      <p className="text-base font-bold text-zinc-800 dark:text-zinc-100">
                        {academicSummary.currentSemesterCreditHours}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-zinc-50/80 dark:bg-zinc-800/50">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Needed For Min</p>
                      <p className="text-base font-bold text-amber-600 dark:text-amber-400">
                        {neededToReachMin}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-zinc-50/80 dark:bg-zinc-800/50">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Remaining To Max</p>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {remainingUntilMax}
                      </p>
                    </div>
                  </div>

                  {!academicSummary.currentSemesterActivated ? (
                    <div className="rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">
                          Add courses, adjust your selection if needed, then register this semester when your credit hours are within the allowed range.
                        </p>
                        <div className="flex items-center gap-2">
                          <Link
                            href="/courses"
                            className="text-sm px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            Add Courses
                          </Link>
                          <button
                            onClick={handleRegisterSemester}
                            disabled={!canRegisterNow || registeringSemester}
                            className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {registeringSemester ? 'Registering...' : 'Register Semester'}
                          </button>
                        </div>
                      </div>
                      {!canRegisterNow && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Registration is enabled only when current credit hours are between {academicSummary.currentSemesterMinCH} and {academicSummary.currentSemesterMaxCH}.
                        </p>
                      )}
                      {studentActionError && (
                        <p className="text-xs text-red-500 dark:text-red-400">{studentActionError}</p>
                      )}

                      {currentSemester && currentSemester.courses.length > 0 && (
                        <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-800 rounded-lg bg-white/70 dark:bg-zinc-900/40">
                          <table className="w-full text-sm">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                              <tr>
                                <th className="text-left px-4 py-2 text-zinc-500 dark:text-zinc-400 font-medium">Selected Course</th>
                                <th className="text-center px-4 py-2 text-zinc-500 dark:text-zinc-400 font-medium">CH</th>
                                <th className="text-right px-4 py-2 text-zinc-500 dark:text-zinc-400 font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentSemester.courses.map((course) => (
                                <tr key={course.courseId} className="border-t border-zinc-100 dark:border-zinc-800">
                                  <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{course.courseTitle}</td>
                                  <td className="px-4 py-2.5 text-center text-zinc-600 dark:text-zinc-300">{course.creditHours}</td>
                                  <td className="px-4 py-2.5 text-right">
                                    <button
                                      onClick={() => handleDropCourse(course.courseId)}
                                      disabled={droppingCourseId === course.courseId}
                                      className="text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {droppingCourseId === course.courseId ? 'Dropping...' : 'Drop'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {currentSemester && currentSemester.courses.length > 0 && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Course changes stay available only before semester registration. After registration, this selection becomes locked.
                        </p>
                      )}
                    </div>
                  ) : !currentSemester || currentSemester.courses.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No active semester courses found.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-800 rounded-lg">
                
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                          <tr>
                            <th className="text-left px-4 py-2 text-zinc-500 dark:text-zinc-400 font-medium">Course</th>
                            <th className="text-center px-4 py-2 text-zinc-500 dark:text-zinc-400 font-medium">CH</th>
                            <th className="text-center px-4 py-2 text-zinc-500 dark:text-zinc-400 font-medium">Status</th>
                            <th className="text-left px-4 py-2 text-zinc-500 dark:text-zinc-400 font-medium">Attendance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentSemester.courses.map((course) => {
                            const attendance = attendanceByCourseId.get(course.courseId);
                            const attendancePercent = attendance?.percentage ?? 0;
                            return (
                              <tr key={course.courseId} className="border-t border-zinc-100 dark:border-zinc-800">
                                <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{course.courseTitle}</td>
                                <td className="px-4 py-2.5 text-center text-zinc-600 dark:text-zinc-300">{course.creditHours}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    course.status === 'completed'
                                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                                  }`}>
                                    {course.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 min-w-56">
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
                </>
              );
            })()}
          </div>
        )}
      </div>
      )}

    </div>
  );
}
