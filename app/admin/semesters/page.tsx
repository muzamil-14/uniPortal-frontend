'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import RouteGuard from '@/components/route-guard';

interface StudentRow {
  userId: number;
  name: string;
  email: string;
  department: string;
  currentSemester: number;
  cgpa: number | null;
  totalCreditHoursEnrolled: number;
  currentSemesterCreditHours: number;
  maxCreditHours: number;
  minCreditHours: number;
}

interface SemesterConfig {
  id: number;
  semesterNumber: number;
  name: string;
  minCreditHours: number;
  maxCreditHours: number;
}

interface CourseEntry {
  courseId: number;
  courseTitle: string;
  creditHours: number;
  grade: string | null;
  gradePoints: number | null;
  status: string;
}

interface SemesterSummaryItem {
  semesterNumber: number;
  name: string;
  status: string;
  gpa: number | null;
  enrolledCreditHours: number;
  minCreditHours: number;
  maxCreditHours: number;
  isCurrentSemester: boolean;
  courses: CourseEntry[];
}

interface StudentDetail {
  userId: number;
  studentName: string;
  currentSemester: number;
  maxSemesters: number;
  normalSemesters: number;
  cgpa: number | null;
  currentSemesterCreditHours: number;
  currentSemesterMinCH: number;
  currentSemesterMaxCH: number;
  totalCreditHoursEnrolled: number;
  semesters: SemesterSummaryItem[];
}

function gpaColor(gpa: number | null) {
  if (gpa === null) return 'text-zinc-400';
  if (gpa >= 3.5) return 'text-emerald-500';
  if (gpa >= 3.0) return 'text-blue-500';
  if (gpa >= 2.5) return 'text-yellow-500';
  return 'text-red-500';
}

function gradeColor(grade: string | null) {
  if (!grade) return 'text-zinc-400';
  if (['A+', 'A', 'A-'].includes(grade)) return 'text-emerald-500';
  if (['B+', 'B', 'B-'].includes(grade)) return 'text-blue-500';
  if (['C+', 'C', 'C-'].includes(grade)) return 'text-yellow-500';
  if (['D+', 'D', 'D-'].includes(grade)) return 'text-orange-500';
  return 'text-red-500';
}

export default function AdminSemestersPage() {
  const [activeTab, setActiveTab] = useState<'students' | 'config'>('students');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [configs, setConfigs] = useState<SemesterConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<SemesterConfig> | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadStudents = useCallback(async () => {
    try {
      const data = await apiFetch('/semesters/students');
      setStudents(data);
    } catch {
      setError('Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfigs = useCallback(async () => {
    setConfigLoading(true);
    try {
      const data = await apiFetch('/semesters/configs');
      setConfigs(data);
    } catch {
      setError('Failed to load semester configurations.');
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    if (activeTab === 'config' && configs.length === 0) {
      loadConfigs();
    }
  }, [activeTab, configs.length, loadConfigs]);


  const openStudentDetail = async (userId: number) => {
    setDetailLoading(true);
    setSelectedStudent(null);
    try {
      const data = await apiFetch(`/semesters/students/${userId}`);
      setSelectedStudent(data);
    } catch {
      setError('Failed to load student details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!editingConfig?.semesterNumber) return;
    setSavingConfig(true);
    setMessage('');
    setError('');
    try {
      await apiFetch(`/semesters/configs/${editingConfig.semesterNumber}`, {
        method: 'POST',
        body: JSON.stringify({
          name: editingConfig.name,
          minCreditHours: editingConfig.minCreditHours,
          maxCreditHours: editingConfig.maxCreditHours,
        }),
      });
      setMessage('Semester configuration saved.');
      setEditingConfig(null);
      await loadConfigs();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Failed to save configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.department ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <RouteGuard>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
            Semester Management
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Monitor student academic progress. Semesters advance automatically once all enrolled course results are announced.
          </p>
        </div>

        {message && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-sm flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12" /></svg>
            {message}
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
          {(['students', 'config'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setMessage(''); setError(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {tab === 'students' ? 'Students' : 'Semester Config'}
            </button>
          ))}
        </div>

        {/* ── Students Tab ── */}
        {activeTab === 'students' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: student list */}
            <div className="lg:col-span-2 space-y-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  ))}
                </div>
              ) : filteredStudents.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">No students found.</p>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                  {filteredStudents.map((s) => (
                    <button
                      key={s.userId}
                      onClick={() => openStudentDetail(s.userId)}
                      className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm ${
                        selectedStudent?.userId === s.userId
                          ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20'
                          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 truncate">
                            {s.name}
                          </p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{s.email}</p>
                          {s.department && (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{s.department}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-zinc-400">Sem</p>
                          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 leading-tight">
                            {s.currentSemester}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs font-semibold ${gpaColor(s.cgpa)}`}>
                          CGPA: {s.cgpa !== null ? s.cgpa.toFixed(2) : '—'}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                          {s.currentSemesterCreditHours}/{s.maxCreditHours} CH this sem
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: student detail */}
            <div className="lg:col-span-3">
              {detailLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  ))}
                </div>
              ) : selectedStudent ? (
                <div className="space-y-4">
                  {/* Student header card */}
                  <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
                          {selectedStudent.studentName}
                        </h2>
                        <div className="flex gap-4 mt-2 flex-wrap text-sm">
                          <span className="text-zinc-500 dark:text-zinc-400">
                            Semester:{' '}
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {selectedStudent.currentSemester}
                            </span>{' '}
                            / {selectedStudent.maxSemesters}
                          </span>
                          <span className="text-zinc-500 dark:text-zinc-400">
                            CGPA:{' '}
                            <span className={`font-bold ${gpaColor(selectedStudent.cgpa)}`}>
                              {selectedStudent.cgpa !== null
                                ? selectedStudent.cgpa.toFixed(2)
                                : '—'}
                            </span>
                          </span>
                          <span className="text-zinc-500 dark:text-zinc-400">
                            Total CH:{' '}
                            <span className="font-bold text-violet-600 dark:text-violet-400">
                              {selectedStudent.totalCreditHoursEnrolled}
                            </span>
                          </span>
                        </div>
                      </div>

                      {selectedStudent.currentSemester >= selectedStudent.maxSemesters && (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                          Max semester reached
                        </span>
                      )}
                    </div>

                    {/* Semester progress mini-track */}
                    <div className="flex items-center gap-1 mt-4 flex-wrap">
                      {Array.from({ length: selectedStudent.maxSemesters }, (_, i) => i + 1).map((n) => {
                        const isCompleted = n < selectedStudent.currentSemester;
                        const isCurrent = n === selectedStudent.currentSemester;
                        return (
                          <div
                            key={n}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                              isCurrent
                                ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white'
                                : isCompleted
                                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                  : n > selectedStudent.normalSemesters
                                    ? 'bg-amber-50 dark:bg-amber-950/10 text-amber-400 border border-dashed border-amber-300 dark:border-amber-700'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {isCompleted ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            ) : n}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Semester cards */}
                  <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
                    {selectedStudent.semesters.length === 0 ? (
                      <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-6 text-center text-sm text-zinc-400">
                        No enrollments found for this student.
                      </div>
                    ) : (
                      selectedStudent.semesters.map((sem) => (
                        <div
                          key={sem.semesterNumber}
                          className={`rounded-xl border p-4 ${
                            sem.isCurrentSemester
                              ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/10'
                              : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-100">
                                {sem.name}
                              </span>
                              {sem.isCurrentSemester && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-zinc-400">{sem.enrolledCreditHours} CH</span>
                              {sem.gpa !== null && (
                                <span className={`text-sm font-bold ${gpaColor(sem.gpa)}`}>
                                  GPA {sem.gpa.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>

                          {sem.courses.length > 0 && (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                                  <th className="text-left pb-1.5 text-zinc-400 font-medium">Course</th>
                                  <th className="text-center pb-1.5 text-zinc-400 font-medium">CH</th>
                                  <th className="text-center pb-1.5 text-zinc-400 font-medium">Grade</th>
                                  <th className="text-center pb-1.5 text-zinc-400 font-medium">GP</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sem.courses.map((c) => (
                                  <tr key={c.courseId} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                                    <td className="py-1.5 text-zinc-600 dark:text-zinc-300">{c.courseTitle}</td>
                                    <td className="py-1.5 text-center text-zinc-400">{c.creditHours}</td>
                                    <td className={`py-1.5 text-center font-bold ${gradeColor(c.grade)}`}>
                                      {c.grade ?? '—'}
                                    </td>
                                    <td className="py-1.5 text-center text-zinc-400">
                                      {c.gradePoints !== null ? c.gradePoints.toFixed(1) : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-700 p-12 flex flex-col items-center justify-center text-center gap-3">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 dark:text-zinc-600">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <p className="text-sm text-zinc-400 dark:text-zinc-500">
                    Select a student to view their academic details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Config Tab ── */}
        {activeTab === 'config' && (
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-100">
                Credit Hour Limits Per Semester
              </h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                Set min/max allowed credit hours for each semester. Students cannot exceed the max when enrolling.
              </p>
            </div>

            {configLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="text-left px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Semester</th>
                      <th className="text-left px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Name</th>
                      <th className="text-center px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Min CH</th>
                      <th className="text-center px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Max CH</th>
                      <th className="text-center px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configs.map((cfg) => (
                      <tr
                        key={cfg.semesterNumber}
                        className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                              cfg.semesterNumber <= 8
                                ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                                : 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                            }`}>
                              {cfg.semesterNumber}
                            </div>
                            {cfg.semesterNumber > 8 && (
                              <span className="text-xs text-amber-500">Extended</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {editingConfig?.semesterNumber === cfg.semesterNumber ? (
                            <input
                              type="text"
                              value={editingConfig.name ?? ''}
                              onChange={(e) =>
                                setEditingConfig({ ...editingConfig, name: e.target.value })
                              }
                              className="w-36 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            />
                          ) : (
                            <span className="text-zinc-700 dark:text-zinc-300">{cfg.name}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {editingConfig?.semesterNumber === cfg.semesterNumber ? (
                            <input
                              type="number"
                              min={0}
                              max={30}
                              value={editingConfig.minCreditHours ?? ''}
                              onChange={(e) =>
                                setEditingConfig({
                                  ...editingConfig,
                                  minCreditHours: Number(e.target.value),
                                })
                              }
                              className="w-16 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            />
                          ) : (
                            <span className="text-zinc-600 dark:text-zinc-300">{cfg.minCreditHours}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {editingConfig?.semesterNumber === cfg.semesterNumber ? (
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={editingConfig.maxCreditHours ?? ''}
                              onChange={(e) =>
                                setEditingConfig({
                                  ...editingConfig,
                                  maxCreditHours: Number(e.target.value),
                                })
                              }
                              className="w-16 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            />
                          ) : (
                            <span className="text-zinc-600 dark:text-zinc-300">{cfg.maxCreditHours}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {editingConfig?.semesterNumber === cfg.semesterNumber ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={saveConfig}
                                disabled={savingConfig}
                                className="px-3 py-1 rounded-lg bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600 transition-colors disabled:opacity-60"
                              >
                                {savingConfig ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingConfig(null)}
                                className="px-3 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                setEditingConfig({
                                  semesterNumber: cfg.semesterNumber,
                                  name: cfg.name,
                                  minCreditHours: cfg.minCreditHours,
                                  maxCreditHours: cfg.maxCreditHours,
                                })
                              }
                              className="px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </RouteGuard>
  );
}
