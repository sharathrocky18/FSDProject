import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Clock,
  Sparkles,
  BookOpen,
  Zap,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { Subject } from '../types';
import { formatStudyDuration } from '../utils/studyMetrics';

export const TimerView: React.FC = () => {
  const [mode, setMode] = useState<'timer' | 'pomodoro'>('pomodoro');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [productivityScore, setProductivityScore] = useState<number>(5);

  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);

  const [pomodoroType, setPomodoroType] = useState<'work' | 'short_break' | 'long_break'>('work');
  const [pomodoroDurationMins, setPomodoroDurationMins] = useState(25);
  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = useState(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [intervalsCompleted, setIntervalsCompleted] = useState(0);

  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getSubjects().then((res) => {
      setSubjects(res);
      if (res.length > 0) setSelectedSubjectId(res[0].id);
    });
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPomodoroRunning) {
      interval = setInterval(() => {
        setPomodoroSecondsLeft((prev) => {
          if (prev <= 1) {
            handlePomodoroComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPomodoroRunning, pomodoroType, intervalsCompleted]);

  const handlePomodoroComplete = async () => {
    setIsPomodoroRunning(false);
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

    if (pomodoroType === 'work') {
      const nextInterval = intervalsCompleted + 1;
      setIntervalsCompleted(nextInterval);

      try {
        await api.logSession({
          subjectId: selectedSubjectId,
          durationMinutes: pomodoroDurationMins,
          mode: 'pomodoro',
          notes: sessionNotes || 'Pomodoro focus interval completed',
          productivityScore,
        });
        setSavedSuccess(`Great focus! ${pomodoroDurationMins}m session recorded.`);
      } catch (err) {
        console.error('Failed to log pomodoro:', err);
      }

      if (nextInterval % 4 === 0) {
        setPomodoroType('long_break');
        setPomodoroSecondsLeft(15 * 60);
      } else {
        setPomodoroType('short_break');
        setPomodoroSecondsLeft(5 * 60);
      }
    } else {
      setPomodoroType('work');
      setPomodoroSecondsLeft(pomodoroDurationMins * 60);
    }
  };

  const handleStopwatchSave = async () => {
    setErrorMsg(null);
    if (stopwatchSeconds < 30) {
      setErrorMsg('Please study for at least 30 seconds to record a session.');
      return;
    }

    const durationMins = Math.max(1, Math.round(stopwatchSeconds / 60));
    try {
      await api.logSession({
        subjectId: selectedSubjectId,
        durationMinutes: durationMins,
        mode: 'timer',
        notes: sessionNotes,
        productivityScore,
      });

      confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 } });
      setSavedSuccess(`Successfully logged ${formatStudyDuration(durationMins)} focus session!`);
      setStopwatchSeconds(0);
      setIsStopwatchRunning(false);
      setSessionNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving session.');
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Focus Timer & Session Tracker</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Scientifically proven focus methods to master your study hours.</p>
        </div>

        <div className="flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setMode('pomodoro')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              mode === 'pomodoro'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pomodoro Technique</span>
          </button>
          <button
            onClick={() => setMode('timer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              mode === 'timer'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Open Stopwatch</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="hover:underline">Dismiss</button>
        </div>
      )}

      {savedSuccess && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{savedSuccess}</span>
          </div>
          <button onClick={() => setSavedSuccess(null)} className="hover:underline">Dismiss</button>
        </div>
      )}

      {/* Main Timer Display Card */}
      <div className="flex flex-col items-center justify-center p-8 md:p-12 rounded-3xl bg-gradient-to-b from-white via-indigo-50/40 to-slate-50 dark:from-slate-900/80 dark:via-slate-900/50 dark:to-[#070b13] border border-slate-200 dark:border-slate-800 shadow-lg dark:shadow-2xl relative overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none -top-20" />

        {mode === 'pomodoro' && (
          <div className="flex items-center gap-2 mb-6">
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                pomodoroType === 'work'
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                  : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
              }`}
            >
              {pomodoroType === 'work' ? 'Deep Work Interval' : 'Rest & Recharge Break'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              · Cycle {(intervalsCompleted % 4) + 1}/4
            </span>
          </div>
        )}

        <div className="relative z-10 font-mono font-bold tracking-tight text-slate-900 dark:text-white text-6xl md:text-8xl tabular-nums select-none">
          {mode === 'pomodoro' ? formatTime(pomodoroSecondsLeft) : formatTime(stopwatchSeconds)}
        </div>

        <div className="flex items-center gap-4 mt-8 relative z-10">
          {mode === 'pomodoro' ? (
            <>
              <button
                onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all transform active:scale-95"
              >
                {isPomodoroRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                <span>{isPomodoroRunning ? 'Pause Focus' : 'Start Focus'}</span>
              </button>
              <button
                onClick={() => {
                  setIsPomodoroRunning(false);
                  setPomodoroSecondsLeft(pomodoroDurationMins * 60);
                  setPomodoroType('work');
                }}
                className="p-3.5 rounded-2xl bg-slate-200 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Reset Pomodoro"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all transform active:scale-95"
              >
                {isStopwatchRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                <span>{isStopwatchRunning ? 'Pause Stopwatch' : 'Start Stopwatch'}</span>
              </button>
              {stopwatchSeconds > 0 && (
                <button
                  onClick={handleStopwatchSave}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Log & Save Session</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Session Metadata Configuration Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Target Subject</span>
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Productivity Rating</span>
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setProductivityScore(star)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  productivityScore >= star
                    ? 'bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/50'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800'
                }`}
              >
                ★ {star}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Focus Duration Setting (Pomodoro)
          </label>
          <div className="flex gap-2">
            {[25, 45, 50].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  setPomodoroDurationMins(mins);
                  setPomodoroSecondsLeft(mins * 60);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  pomodoroDurationMins === mins
                    ? 'bg-cyan-100 dark:bg-cyan-600/30 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/50'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Session Study Notes & Key Takeaways
          </label>
          <textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            rows={2}
            placeholder="E.g., Finished Problem Set 3, questions 4 to 8."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>
      </div>
    </div>
  );
};
