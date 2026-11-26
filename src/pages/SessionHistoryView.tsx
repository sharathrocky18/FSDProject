import React, { useState, useEffect } from 'react';
import { History, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { StudySession } from '../types';
import { formatStudyDuration } from '../utils/studyMetrics';

export const SessionHistoryView: React.FC = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'pomodoro' | 'timer'>('all');

  const fetchSessions = async () => {
    try {
      const data = await api.getSessionHistory();
      setSessions(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (filterMode === 'all') return true;
    return s.mode === filterMode;
  });

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Study Session Logs</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete historical record of every focus sprint and pomodoro interval.
          </p>
        </div>

        <div className="flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
          {(['all', 'pomodoro', 'timer'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                filterMode === mode
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {mode === 'all' ? 'All Sessions' : mode}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Logged Sessions ({loading ? '...' : filteredSessions.length})
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredSessions.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No session logs recorded in this filter.
            </div>
          ) : (
            filteredSessions.map((sess) => (
              <div
                key={sess.id}
                className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: sess.subjectColor || '#6366f1' }}
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{sess.subjectName}</p>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                        {sess.mode}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {sess.notes || 'Focused study interval completed.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5 shrink-0 text-right">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 tabular-nums">
                      {formatStudyDuration(sess.durationMinutes)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      {new Date(sess.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDelete(sess.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
