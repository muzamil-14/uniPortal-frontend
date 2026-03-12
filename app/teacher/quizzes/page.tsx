'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/confirm-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CourseSelector from '@/components/course-selector';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Course {
  id: number;
  title: string;
  description?: string;
  creditHours?: number;
  instructor?: string;
}

interface QuizQuestion {
  id?: number;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
}

interface QuizAttempt {
  id: number;
  studentId: number;
  student: { id: number; name: string; email: string };
  score: number;
  totalMarks: number;
  submitted: boolean;
  tabSwitchCount: number;
  flaggedCheating: boolean;
  submittedAt: string | null;
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  courseId: number;
  course: Course;
  duration: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  questions: QuizQuestion[];
  attempts?: QuizAttempt[];
}

export default function TeacherQuizzesPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingQuiz, setViewingQuiz] = useState<Quiz | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [endTime, setEndTime] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    { questionText: '', options: ['', ''], correctOptionIndex: 0, marks: 1 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const minEndTime = new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16);

  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    const socket: Socket = io(`${API_URL}/quiz`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('quizCatalogUpdated', () => {
      apiFetch('/quizzes/teacher').then(setQuizzes).catch(() => {});
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'teacher')) {
      router.replace('/dashboard');
      return;
    }
    if (user) {
      Promise.all([
        apiFetch('/courses/teacher/my-courses'),
        apiFetch('/quizzes/teacher'),
      ])
        .then(([c, q]) => {
          setCourses(c);
          setQuizzes(q);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDuration(30);
    setEndTime('');
    setQuestions([
      { questionText: '', options: ['', ''], correctOptionIndex: 0, marks: 1 },
    ]);
    setShowForm(false);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { questionText: '', options: ['', ''], correctOptionIndex: 0, marks: 1 },
    ]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: string | number) => {
    setQuestions(
      questions.map((q, i) => (i === idx ? { ...q, [field]: value } : q)),
    );
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(
      questions.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) }
          : q,
      ),
    );
  };

  const addOption = (qIdx: number) => {
    setQuestions(
      questions.map((q, i) =>
        i === qIdx ? { ...q, options: [...q.options, ''] } : q,
      ),
    );
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions(
      questions.map((q, i) => {
        if (i !== qIdx || q.options.length <= 2) return q;
        const newOptions = q.options.filter((_, j) => j !== oIdx);
        return {
          ...q,
          options: newOptions,
          correctOptionIndex:
            q.correctOptionIndex >= newOptions.length
              ? newOptions.length - 1
              : q.correctOptionIndex,
        };
      }),
    );
  };

  const handleSubmit = async () => {
    if (!selectedCourse) {
      toast.error('Please select a course first');
      return;
    }
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!endTime) {
      toast.error('End time is required');
      return;
    }
    if (new Date(endTime).getTime() <= Date.now()) {
      toast.error('End time must be later than the current time');
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        toast.error(`Question ${i + 1} text is required`);
        return;
      }
      if (q.options.some((o) => !o.trim())) {
        toast.error(`All options in question ${i + 1} must be filled`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const quiz = await apiFetch('/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          courseId: selectedCourse,
          duration,
          endTime,
          questions: questions.map((q) => ({
            questionText: q.questionText.trim(),
            options: q.options.map((o) => o.trim()),
            correctOptionIndex: q.correctOptionIndex,
            marks: q.marks,
          })),
        }),
      });
      setQuizzes([quiz, ...quizzes]);
      resetForm();
      toast.success('Quiz created successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (quizId: number) => {
    const ok = await confirmDialog({
      title: 'Delete Quiz',
      message: 'Are you sure you want to delete this quiz? All student attempts will be lost.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await apiFetch(`/quizzes/teacher/${quizId}`, { method: 'DELETE' });
      setQuizzes(quizzes.filter((q) => q.id !== quizId));
      if (viewingQuiz?.id === quizId) setViewingQuiz(null);
      toast.success('Quiz deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const viewAttempts = async (quizId: number) => {
    try {
      const quiz = await apiFetch(`/quizzes/teacher/${quizId}`);
      setViewingQuiz(quiz);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredQuizzes = selectedCourse
    ? quizzes.filter((q) => q.courseId === Number(selectedCourse))
    : quizzes;

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  if (!user || user.role !== 'teacher') return null;

  if (viewingQuiz) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <button
          onClick={() => setViewingQuiz(null)}
          className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-accent transition-colors cursor-pointer group mb-6"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6" /></svg>
          <span>Back to quizzes</span>
        </button>

        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
          {viewingQuiz.title}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">
          {viewingQuiz.course?.title} &middot; {viewingQuiz.questions?.length} questions &middot; {viewingQuiz.duration} min
        </p>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-white">
              Student Attempts ({viewingQuiz.attempts?.length || 0})
            </h2>
          </div>

          {(!viewingQuiz.attempts || viewingQuiz.attempts.length === 0) ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              No attempts yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">Student</th>
                    <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">Email</th>
                    <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Score</th>
                    <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                    <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Tab Switches</th>
                    <th className="text-center p-4 font-medium text-zinc-500 dark:text-zinc-400">Cheating</th>
                    <th className="text-left p-4 font-medium text-zinc-500 dark:text-zinc-400">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {viewingQuiz.attempts.map((a) => (
                    <tr key={a.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="p-4 font-medium text-zinc-900 dark:text-white">{a.student?.name}</td>
                      <td className="p-4 text-zinc-500 dark:text-zinc-400">{a.student?.email}</td>
                      <td className="p-4 text-center font-medium">{a.score}/{a.totalMarks}</td>
                      <td className="p-4 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full ${
                          a.submitted
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        }`}>
                          {a.submitted ? 'Submitted' : 'In Progress'}
                        </span>
                      </td>
                      <td className="p-4 text-center">{a.tabSwitchCount}</td>
                      <td className="p-4 text-center">
                        {a.flaggedCheating ? (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                            Flagged
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="p-4 text-zinc-500 dark:text-zinc-400">
                        {a.submittedAt
                          ? new Date(a.submittedAt).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Quizzes
        </h1>
        {selectedCourse && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            + Create Quiz
          </button>
        )}
      </div>

      {/* Course Selection */}
      <div className="mb-8">
        <CourseSelector
          courses={courses}
          selectedCourse={selectedCourse}
          onSelect={(id) => {
            setSelectedCourse(id);
            if (!id) setShowForm(false);
          }}
          label={selectedCourse ? undefined : 'Select Course'}
          subtitle={selectedCourse ? undefined : 'Choose a course to manage quizzes'}
        />
      </div>

      {/* Create Quiz Form */}
      {showForm && selectedCourse && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Create New Quiz
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none"
                  placeholder="Quiz title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none resize-none"
                rows={2}
                placeholder="Quiz description..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min={minEndTime}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  The quiz becomes available immediately after creation and closes for new attempts at this time.
                </p>
              </div>
            </div>

            {/* Questions */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-zinc-900 dark:text-white">
                  Questions ({questions.length})
                </h3>
                <button
                  onClick={addQuestion}
                  className="text-sm text-accent hover:underline cursor-pointer"
                >
                  + Add Question
                </button>
              </div>

              <div className="space-y-6">
                {questions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Question {qIdx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-zinc-500">Marks:</label>
                          <input
                            type="number"
                            min="1"
                            value={q.marks}
                            onChange={(e) => updateQuestion(qIdx, 'marks', Number(e.target.value))}
                            className="w-14 px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white outline-none"
                          />
                        </div>
                        {questions.length > 1 && (
                          <button
                            onClick={() => removeQuestion(qIdx)}
                            className="text-red-500 hover:text-red-700 text-xs cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={q.questionText}
                      onChange={(e) =>
                        updateQuestion(qIdx, 'questionText', e.target.value)
                      }
                      className="w-full px-3 py-2 mb-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white outline-none"
                      placeholder="Enter question..."
                    />

                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuestion(qIdx, 'correctOptionIndex', oIdx)
                            }
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                              q.correctOptionIndex === oIdx
                                ? 'border-green-500 bg-green-500 text-white'
                                : 'border-zinc-300 dark:border-zinc-600 hover:border-green-400'
                            }`}
                          >
                            {q.correctOptionIndex === oIdx && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            )}
                          </button>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) =>
                              updateOption(qIdx, oIdx, e.target.value)
                            }
                            className="flex-1 px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-sm outline-none"
                            placeholder={`Option ${oIdx + 1}`}
                          />
                          {q.options.length > 2 && (
                            <button
                              onClick={() => removeOption(qIdx, oIdx)}
                              className="text-zinc-400 hover:text-red-500 cursor-pointer"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addOption(qIdx)}
                        className="text-xs text-accent hover:underline cursor-pointer mt-1"
                      >
                        + Add option
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Quiz'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz List */}
      {selectedCourse && (
        <div className="space-y-4">
          {filteredQuizzes.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-500 dark:text-zinc-400">
              No quizzes found for this course.
            </div>
          ) : (
            filteredQuizzes.map((quiz) => {
              const now = new Date();
              const isActive = new Date(quiz.endTime) >= now;

              return (
                <div
                  key={quiz.id}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-zinc-900 dark:text-white">
                          {quiz.title}
                        </h3>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {isActive ? 'Live' : 'Ended'}
                        </span>
                      </div>
                      {quiz.description && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                          {quiz.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                        <span>{quiz.questions?.length || 0} questions</span>
                        <span>{quiz.duration} min</span>
                        <span>
                          Available from: {new Date(quiz.startTime).toLocaleString()}
                        </span>
                        <span>
                          Ends: {new Date(quiz.endTime).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => viewAttempts(quiz.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
                      >
                        View Attempts
                      </button>
                      <button
                        onClick={() => handleDelete(quiz.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
