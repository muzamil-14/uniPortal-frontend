'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import CourseSelector from '@/components/course-selector';

interface Course {
  id: number;
  title: string;
}

interface Analytics {
  courseTitle: string;
  totalStudents: number;
  gradeAnalytics: {
    gradedCount: number;
    ungradedCount: number;
    averageMarks: number;
    distribution: Record<string, number>;
  };
  attendanceAnalytics: {
    totalDays: number;
    overallPresent: number;
    overallAbsent: number;
    overallLate: number;
    averageAttendanceRate: number;
    perStudent: {
      userId: number;
      name: string;
      present: number;
      absent: number;
      late: number;
      total: number;
      percentage: number;
    }[];
  };
}

export default function TeacherAnalyticsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    apiFetch('/courses/teacher/my-courses').then((data) => {
      setCourses(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      setLoadingAnalytics(true);
      apiFetch(`/analytics/course/${selectedCourse}`)
        .then(setAnalytics)
        .finally(() => setLoadingAnalytics(false));
    } else {
      setAnalytics(null);
    }
  }, [selectedCourse]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Course Analytics</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">View attendance and grade analytics per course</p>
      </div>

      <CourseSelector
        courses={courses}
        selectedCourse={selectedCourse}
        onSelect={(id) => setSelectedCourse(id)}
        label="Your Courses"
        subtitle="Select a course to view analytics"
      />

      {loadingAnalytics && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
        </div>
      )}

      {analytics && !loadingAnalytics && (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-accent">{analytics.totalStudents}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Students</p>
            </div>
            <div className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.gradeAnalytics.gradedCount}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Graded</p>
            </div>
            <div className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{analytics.gradeAnalytics.averageMarks}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Avg. Marks</p>
            </div>
            <div className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analytics.attendanceAnalytics.averageAttendanceRate}%</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Avg. Attendance</p>
            </div>
          </div>

          {/* Grade Distribution */}
          <div className="bg-card-bg border border-card-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Grade Distribution</h2>
            {Object.keys(analytics.gradeAnalytics.distribution).length === 0 ? (
              <p className="text-zinc-500 text-center py-4">No grades assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {gradeOrder
                  .filter((g) => analytics.gradeAnalytics.distribution[g])
                  .map((grade) => {
                    const count = analytics.gradeAnalytics.distribution[grade];
                    const pct = Math.round((count / analytics.gradeAnalytics.gradedCount) * 100);
                    return (
                      <div key={grade} className="flex items-center gap-3">
                        <span className="w-8 text-sm font-medium">{grade}</span>
                        <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                            style={{ width: `${Math.max(pct, 8)}%` }}
                          >
                            <span className="text-xs text-white font-medium">{count}</span>
                          </div>
                        </div>
                        <span className="text-sm text-zinc-400 w-12 text-right">{pct}%</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Attendance Summary */}
          <div className="bg-card-bg border border-card-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Attendance Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <p className="text-xl font-bold">{analytics.attendanceAnalytics.totalDays}</p>
                <p className="text-xs text-zinc-400">Total Days</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{analytics.attendanceAnalytics.overallPresent}</p>
                <p className="text-xs text-zinc-400">Present</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{analytics.attendanceAnalytics.overallAbsent}</p>
                <p className="text-xs text-zinc-400">Absent</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{analytics.attendanceAnalytics.overallLate}</p>
                <p className="text-xs text-zinc-400">Late</p>
              </div>
            </div>

            {/* Per student */}
            <h3 className="font-medium mb-2">Per Student Attendance</h3>
            {analytics.attendanceAnalytics.perStudent.length === 0 ? (
              <p className="text-zinc-500 text-center py-4">No attendance records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border">
                      <th className="text-left py-2 px-3 font-medium">Student</th>
                      <th className="text-center py-2 px-3 font-medium">Present</th>
                      <th className="text-center py-2 px-3 font-medium">Absent</th>
                      <th className="text-center py-2 px-3 font-medium">Late</th>
                      <th className="text-center py-2 px-3 font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.attendanceAnalytics.perStudent.map((s) => (
                      <tr key={s.userId} className="border-b border-card-border/50">
                        <td className="py-2 px-3">{s.name}</td>
                        <td className="text-center py-2 px-3 text-green-600 dark:text-green-400">{s.present}</td>
                        <td className="text-center py-2 px-3 text-red-600 dark:text-red-400">{s.absent}</td>
                        <td className="text-center py-2 px-3 text-amber-600 dark:text-amber-400">{s.late}</td>
                        <td className="text-center py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            s.percentage >= 75 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : s.percentage >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {s.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
