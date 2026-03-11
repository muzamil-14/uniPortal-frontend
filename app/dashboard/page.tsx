'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Enrollment {
  id: number;
  status: string;
  enrolledAt: string;
  course: {
    id: number;
    title: string;
    instructor: string;
    creditHours: number;
    schedule: string | null;
  };
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  isImportant: boolean;
  createdAt: string;
  author: { name: string } | null;
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
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  const [teacherCourses, setTeacherCourses] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
    if (user && user.role === 'student') {
      Promise.all([
        apiFetch('/enrollments/my-courses'),
        apiFetch('/announcements/recent'),
      ])
        .then(([enr, ann]) => {
          setEnrollments(enr);
          setAnnouncements(ann);
        })
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
        apiFetch('/courses/teacher/my-courses'),
        apiFetch('/announcements/recent'),
      ])
        .then(([ts, tc, ann]) => {
          setTeacherStats(ts);
          setTeacherCourses(tc);
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

  const totalCredits = enrollments.reduce(
    (sum, e) => sum + (e.course.creditHours || 0),
    0,
  );

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
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Enrolled Courses</p>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{enrollments.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 card-interactive animate-slide-up stagger-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-500 rounded-r" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Total Credit Hours</p>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{totalCredits}</p>
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
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">My Courses</p>
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
            { href: '/teacher/my-courses', label: 'My Courses', icon: '📚' },
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

      {/* Student: My Courses */}
      {user.role === 'student' && (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 mt-6 card-interactive animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            My Courses
          </h2>
          <Link
            href="/courses"
            className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors font-medium"
          >
            Browse more →
          </Link>
        </div>
        {enrollments.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            <p className="mb-3">You haven&apos;t enrolled in any courses yet.</p>
            <Link
              href="/courses"
              className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 transition-all shadow-md shadow-indigo-500/20"
            >
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {enrollments.slice(0, 5).map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/courses/${enrollment.course.id}`}
                className="flex items-center justify-between p-4 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors group"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {enrollment.course.title}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {enrollment.course.instructor} · {enrollment.course.creditHours} credits
                    {enrollment.course.schedule && ` · ${enrollment.course.schedule}`}
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  {enrollment.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Teacher: My Courses */}
      {user.role === 'teacher' && (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 mt-6 card-interactive animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            My Courses
          </h2>
          <Link
            href="/teacher/my-courses"
            className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors font-medium"
          >
            View all →
          </Link>
        </div>
        {teacherCourses.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            No courses assigned yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {teacherCourses.slice(0, 5).map((course: any) => (
              <div
                key={course.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {course.title}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {course.creditHours} credits
                    {course.schedule && ` · ${course.schedule}`}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${course.isActive
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {course.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
