'use client';

import { apiFetch, apiUpload } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import type * as CocoSsd from '@tensorflow-models/coco-ssd';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Question {
  id: number;
  questionText: string;
  options: string[];
  marks: number;
}

interface QuizData {
  id: number;
  title: string;
  description: string;
  duration: number;
  startTime: string;
  endTime: string;
  courseName: string;
  attemptStartedAt: string | null;
  questions: Question[];
}

export default function TakeQuizPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const quizId = Number(params.id);
  const attemptId = Number(searchParams.get('attempt'));

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    totalMarks: number;
    flaggedCheating: boolean;
    tabSwitchCount: number;
  } | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [cheatingWarning, setCheatingWarning] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phoneReportedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingActiveRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [modelLoading, setModelLoading] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);

  // Connect WebSocket
  useEffect(() => {
    if (!user || !attemptId) return;

    const token = localStorage.getItem('token');
    const socket = io(`${API_URL}/quiz`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('answerSaved', (data: { questionId: number; optionIndex: number }) => {
      // confirmed saved
    });

    socket.on('tabSwitchRecorded', (data: { count: number; flagged: boolean }) => {
      setTabSwitchCount(data.count);
    });

    socket.on('cheatingDetected', (data: { message: string; count: number }) => {
      setCheatingWarning(data.message);
    });

    socket.on('quizSubmitted', (data) => {
      submittedRef.current = true;
      setSubmitted(true);
      setResult(data);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on('quizError', (data: { message: string }) => {
      toast.error(data.message);
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, attemptId]);

  // Load quiz data
  useEffect(() => {
    if (!user || !quizId || !attemptId) return;

    apiFetch(`/quizzes/student/${quizId}`)
      .then((data: QuizData) => {
        setQuiz(data);
      })
      .catch((err: any) => {
        toast.error(err.message || 'Failed to load quiz');
        router.replace('/quizzes');
      })
      .finally(() => setLoading(false));

    // Load existing attempt answers
    apiFetch(`/quizzes/attempts/${attemptId}`)
      .then((attempt) => {
        if (attempt.submitted) {
          submittedRef.current = true;
          setSubmitted(true);
          setResult({
            score: attempt.score,
            totalMarks: attempt.totalMarks,
            flaggedCheating: attempt.flaggedCheating,
            tabSwitchCount: attempt.tabSwitchCount,
          });
        } else if (attempt.answers) {
          setAnswers(attempt.answers);
          setTabSwitchCount(attempt.tabSwitchCount || 0);
        }

        const startedAt = attempt.startedAt || new Date().toISOString();
        const expiresAt =
          new Date(startedAt).getTime() + attempt.quiz.duration * 60 * 1000;
        const remaining = Math.max(
          0,
          Math.floor((expiresAt - Date.now()) / 1000),
        );
        setTimeLeft(remaining);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, quizId, attemptId]);

  // Timer countdown
  useEffect(() => {
    if (submitted || !quiz || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, submitted]);

  // Tab visibility detection (cheating detection)
  useEffect(() => {
    if (submitted || !attemptId) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !submittedRef.current) {
        socketRef.current?.emit('tabSwitch', { attemptId });
      }
    };

    const handleBlur = () => {
      if (!submittedRef.current) {
        socketRef.current?.emit('tabSwitch', { attemptId });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [attemptId, submitted]);

  // Prevent navigation with beforeunload
  useEffect(() => {
    if (submitted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [submitted]);

  // Camera-based phone detection
  useEffect(() => {
    if (submitted || !quiz || !attemptId) return;

    let stream: MediaStream | null = null;
    let cancelled = false;
    let nextFrameTimer: ReturnType<typeof setTimeout> | null = null;

    const drawBoxes = (
      predictions: CocoSsd.DetectedObject[],
      video: HTMLVideoElement,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas || video.videoWidth === 0) return;
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (predictions.length === 0) return;
      const sx = canvas.width / video.videoWidth;
      const sy = canvas.height / video.videoHeight;
      for (const p of predictions) {
        const [bx, by, bw, bh] = p.bbox;
        const isPhone = p.class === 'cell phone' && p.score > 0.5;
        const color = isPhone ? '#ef4444' : 'rgba(34,197,94,0.85)';
        ctx.strokeStyle = color;
        ctx.lineWidth = isPhone ? 2.5 : 1.5;
        ctx.strokeRect(bx * sx, by * sy, bw * sx, bh * sy);
        const label = `${p.class} ${Math.round(p.score * 100)}%`;
        ctx.font = 'bold 9px sans-serif';
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = color;
        ctx.fillRect(bx * sx, by * sy - 14, tw + 4, 14);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, bx * sx + 2, by * sy - 3);
      }
    };

    const setup = async () => {
      // Request camera — ask for slightly higher res so model has better input
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        streamRef.current = stream;
        setCameraActive(true);
      } catch {
        setCameraError('Camera access denied. Proceeding without camera monitoring.');
        return;
      }

      // Load model — prefer WebGL backend for GPU acceleration
      setModelLoading(true);
      let model: CocoSsd.ObjectDetection | null = null;
      try {
        const tf = await import('@tensorflow/tfjs');
        // Try WebGL first (GPU), fall back gracefully
        try { await tf.setBackend('webgl'); } catch { /* CPU fallback */ }
        await tf.ready();
        const cocossd = await import('@tensorflow-models/coco-ssd');
        if (cancelled) return;
        // Full mobilenet_v2 model (more accurate, ~300ms/frame with GPU)
        model = await cocossd.load({ base: 'mobilenet_v2' });
        if (cancelled) return;
        setModelLoading(false);
      } catch {
        setModelLoading(false);
        setCameraError('Detection model failed to load. Proceeding without camera monitoring.');
        return;
      }

      // Capture a mirrored JPEG frame from the camera video
      const captureScreenshot = (): string | null => {
        const video = videoRef.current;
        if (!video || video.videoWidth === 0) return null;
        const c = document.createElement('canvas');
        c.width = video.videoWidth;
        c.height = video.videoHeight;
        const ctx = c.getContext('2d');
        if (!ctx) return null;
        ctx.translate(c.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        return c.toDataURL('image/jpeg', 0.82);
      };

      // Start recording camera feed when suspicious activity detected
      const startCameraRecording = () => {
        if (recordingActiveRef.current || !stream) return;
        recordedChunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';
        try {
          const recorder = new MediaRecorder(stream, { mimeType });
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
          };
          recorder.start(1000);
          mediaRecorderRef.current = recorder;
          recordingActiveRef.current = true;
          setRecordingActive(true);
        } catch { /* recording not supported on this browser */ }
      };

      // Self-scheduling detection loop — no overlap between frames
      const runDetection = async () => {
        if (cancelled || submittedRef.current || !model || !videoRef.current) return;
        try {
          const predictions = await model.detect(videoRef.current);
          if (cancelled) return;
          drawBoxes(predictions, videoRef.current);

          // Start recording when any non-person object appears
          const hasSuspicious = predictions.some(
            (p) => p.class !== 'person' && p.score > 0.65,
          );
          if (hasSuspicious && !recordingActiveRef.current) {
            startCameraRecording();
          }

          // Cheating flag only on phone detection (strict threshold for accuracy)
          if (!phoneReportedRef.current) {
            const phoneFound = predictions.some(
              (p) => p.class === 'cell phone' && p.score > 0.75,
            );
            if (phoneFound) {
              phoneReportedRef.current = true;
              // Capture and send screenshot evidence
              const screenshot = captureScreenshot();
              if (screenshot) {
                apiFetch(`/quizzes/attempts/${attemptId}/screenshot`, {
                  method: 'POST',
                  body: JSON.stringify({ imageData: screenshot }),
                }).catch(() => {});
              }
              socketRef.current?.emit('phoneDetected', { attemptId });
              setCheatingWarning(
                'A mobile phone was detected by your camera. Your attempt has been flagged for suspicious activity.',
              );
            }
          }
        } catch { /* skip frame errors */ }
        if (!cancelled && !submittedRef.current) {
          nextFrameTimer = setTimeout(runDetection, 300);
        }
      };

      runDetection();
    };

    setup();

    return () => {
      cancelled = true;
      if (nextFrameTimer) clearTimeout(nextFrameTimer);
      if (mediaRecorderRef.current?.state !== 'inactive') {
        try { mediaRecorderRef.current?.stop(); } catch { }
      }
      recordingActiveRef.current = false;
      streamRef.current = null;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      const canvas = canvasRef.current;
      if (canvas) { const ctx = canvas.getContext('2d'); ctx?.clearRect(0, 0, canvas.width, canvas.height); }
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraActive(false);
      setModelLoading(false);
      setRecordingActive(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, submitted, attemptId]);

  const selectAnswer = useCallback(
    (questionId: number, optionIndex: number) => {
      setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
      socketRef.current?.emit('saveAnswer', {
        attemptId,
        questionId,
        optionIndex,
      });
    },
    [attemptId],
  );

  const handleSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    // Stop camera recording and upload it in the background
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = async () => {
        const chunks = recordedChunksRef.current;
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const formData = new FormData();
          formData.append('recording', blob, `attempt_${attemptId}.webm`);
          apiUpload(`/quizzes/attempts/${attemptId}/recording`, formData).catch(() => {});
        }
      };
      try { recorder.stop(); } catch { }
      recordingActiveRef.current = false;
      setRecordingActive(false);
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('submitQuiz', { attemptId, answers });
    } else {
      // Fallback to REST
      try {
        const result = await apiFetch(`/quizzes/attempts/${attemptId}/submit`, {
          method: 'POST',
          body: JSON.stringify({ answers }),
        });
        setSubmitted(true);
        setResult({
          score: result.score,
          totalMarks: result.totalMarks,
          flaggedCheating: result.flaggedCheating,
          tabSwitchCount: result.tabSwitchCount,
        });
      } catch (err: any) {
        submittedRef.current = false;
        toast.error(err.message || 'Failed to submit quiz');
      }
    }
    if (timerRef.current) clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, answers]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  if (!user || !quiz) return null;

  // Result screen
  if (submitted && result) {
    const pct = Math.round((result.score / result.totalMarks) * 100);
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <div
            className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-3xl font-bold ${
              pct >= 50
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            }`}
          >
            {pct}%
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            Quiz Submitted!
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">{quiz.title}</p>
          <div className="text-4xl font-bold text-zinc-900 dark:text-white mb-6">
            {result.score}{' '}
            <span className="text-lg text-zinc-400">/ {result.totalMarks}</span>
          </div>

          {result.flaggedCheating && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                ⚠ Your attempt was flagged for suspicious activity ({result.tabSwitchCount} tab switches detected)
              </p>
            </div>
          )}

          {result.tabSwitchCount > 0 && !result.flaggedCheating && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
              Tab switches detected: {result.tabSwitchCount}
            </p>
          )}

          <button
            onClick={() => router.push('/quizzes')}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  // Quiz taking UI
  const question = quiz.questions[currentQ];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(answers).length;
  const isUrgent = timeLeft <= 60;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Cheating warning overlay */}
      {cheatingWarning && (
        <div className="fixed inset-0 bg-red-900/90 z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </div>
            <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
              Cheating Detected
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              {cheatingWarning}
            </p>
            <button
              onClick={() => setCheatingWarning('')}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
            >
              I Understand, Continue Quiz
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-zinc-900 dark:text-white text-sm">
              {quiz.title}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {quiz.courseName}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Quiz access closes at {new Date(quiz.endTime).toLocaleString()}, but your attempt continues until your timer expires.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  socketConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-xs text-zinc-400">
                {socketConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  cameraActive
                    ? recordingActive
                      ? 'bg-red-500 animate-pulse'
                      : modelLoading
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-blue-500'
                    : 'bg-zinc-400'
                }`}
              />
              <span className="text-xs text-zinc-400">
                {cameraActive
                  ? recordingActive
                    ? 'Recording'
                    : modelLoading
                    ? 'Loading AI...'
                    : 'Monitoring'
                  : cameraError
                  ? 'No Camera'
                  : 'Camera...'}
              </span>
            </div>
            {tabSwitchCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                ⚠ {tabSwitchCount} tab switch{tabSwitchCount > 1 ? 'es' : ''}
              </span>
            )}
            <div
              className={`text-lg font-mono font-bold px-3 py-1 rounded-lg ${
                isUrgent
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
              }`}
            >
              {formatTime(timeLeft)}
            </div>
            <button
              onClick={handleSubmit}
              className="px-4 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90 transition-opacity cursor-pointer"
            >
              Submit
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 flex gap-6">
        {/* Question navigator sidebar */}
        <div className="hidden md:block w-48 shrink-0">
          <div className="sticky top-20 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            {/* Camera feed */}
            <div className="mb-4">
              <div
                className="relative w-full rounded-lg overflow-hidden bg-zinc-900"
                style={{ aspectRatio: '4/3' }}
              >
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                  muted
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-zinc-500">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                    <span className="text-[10px]">
                      {cameraError ? 'No Camera' : 'Starting...'}
                    </span>
                  </div>
                )}
                {cameraActive && modelLoading && (
                  <div className="absolute bottom-1 left-0 right-0 flex justify-center">
                    <span className="text-[9px] bg-amber-500/80 text-white px-1.5 py-0.5 rounded">
                      Loading AI...
                    </span>
                  </div>
                )}
                {cameraActive && !modelLoading && (
                  <div className="absolute bottom-1 left-0 right-0 flex justify-center">
                    <span className={`text-[9px] ${recordingActive ? 'bg-red-500/80 animate-pulse' : 'bg-blue-500/80'} text-white px-1.5 py-0.5 rounded`}>
                      {recordingActive ? '● REC' : 'Monitoring'}
                    </span>
                  </div>
                )}
              </div>
              {cameraError && (
                <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 leading-tight">
                  {cameraError}
                </p>
              )}
            </div>

            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3">
              Questions ({answeredCount}/{totalQuestions})
            </p>
            <div className="grid grid-cols-4 gap-2">
              {quiz.questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQ(i)}
                  className={`w-9 h-9 rounded-lg text-xs font-medium flex items-center justify-center cursor-pointer transition-all ${
                    i === currentQ
                      ? 'bg-indigo-500 text-white shadow-md'
                      : answers[q.id] !== undefined
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-1 text-[10px] text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800" />
                Answered
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700" />
                Unanswered
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-500" />
                Current
              </div>
            </div>
          </div>
        </div>

        {/* Question area */}
        <div className="flex-1">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Question {currentQ + 1} of {totalQuestions}
              </span>
              <span className="text-xs text-zinc-400">
                {question.marks} mark{question.marks > 1 ? 's' : ''}
              </span>
            </div>

            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
              {question.questionText}
            </h2>

            <div className="space-y-3">
              {question.options.map((option, oIdx) => (
                <button
                  key={oIdx}
                  onClick={() => selectAnswer(question.id, oIdx)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                    answers[question.id] === oIdx
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-zinc-900 dark:text-white'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-medium shrink-0 ${
                        answers[question.id] === oIdx
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <span className="text-sm">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
              disabled={currentQ === 0}
              className="px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
            >
              ← Previous
            </button>
            {currentQ < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentQ((p) => Math.min(totalQuestions - 1, p + 1))}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors cursor-pointer"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                Submit Quiz
              </button>
            )}
          </div>

          {/* Mobile question navigator */}
          <div className="md:hidden mt-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3">
              Questions ({answeredCount}/{totalQuestions})
            </p>
            <div className="flex flex-wrap gap-2">
              {quiz.questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQ(i)}
                  className={`w-9 h-9 rounded-lg text-xs font-medium flex items-center justify-center cursor-pointer transition-all ${
                    i === currentQ
                      ? 'bg-indigo-500 text-white shadow-md'
                      : answers[q.id] !== undefined
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
