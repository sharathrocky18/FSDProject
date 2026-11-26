import React, { useState } from 'react';
import {
  Zap,
  Target,
  Award,
  CheckCircle2,
  Lock,
  Trophy,
  Flame,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const StreaksView: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [dailyGoal, setDailyGoal] = useState(user?.dailyGoalHours || 3.0);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const streak = user?.streakCount || 1;

  const milestones = [
    { id: 'm1', name: '3-Day Starter', req: 3, desc: 'Complete 3 consecutive days of study sessions', icon: Flame, unlocked: streak >= 3 },
    { id: 'm2', name: '5-Day Consistent Focus', req: 5, desc: 'Maintain study habit through 5 consecutive days', icon: Zap, unlocked: streak >= 5 },
    { id: 'm3', name: '7-Day Scholar', req: 7, desc: 'One full week of uninterrupted daily learning', icon: Award, unlocked: streak >= 7 },
    { id: 'm4', name: '14-Day Academic Titan', req: 14, desc: 'Two solid weeks of daily focus discipline', icon: Trophy, unlocked: streak >= 14 },
    { id: 'm5', name: '30-Day Campus Legend', req: 30, desc: 'One month of relentless academic mastery', icon: Target, unlocked: streak >= 30 },
  ];

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      await api.updateProfile({ dailyGoalHours: dailyGoal });
      updateUser({ dailyGoalHours: dailyGoal });
      setSavedSuccess(true);
      confetti({ particleCount: 30, spread: 45 });
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating goal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          <span>Study Streaks & Learning Milestones</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Building consistency is the single greatest predictor of university success.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between p-8 rounded-3xl bg-gradient-to-r from-amber-50 via-white to-indigo-50 dark:from-amber-950/40 dark:via-slate-900 dark:to-indigo-950/40 border border-amber-200 dark:border-amber-500/30 shadow-lg dark:shadow-2xl relative overflow-hidden">
        <div className="space-y-2 text-center sm:text-left">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Active Momentum
          </span>
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <span className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {streak}
            </span>
            <span className="text-xl text-slate-700 dark:text-slate-300 font-bold">Consecutive Days</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md">
            Log at least one focus session today to protect your streak from breaking.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 mt-6 sm:mt-0 shadow-md">
          <Flame className="w-16 h-16 fill-amber-500 animate-pulse" />
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Customize Daily Focus Goal</span>
          </h3>
          {savedSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Goal updated!
            </span>
          )}
        </div>

        <form onSubmit={handleSaveGoal} className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Target study hours per day: <strong className="text-slate-900 dark:text-white tabular-nums">{dailyGoal}h</strong>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors shrink-0"
          >
            {saving ? 'Saving...' : 'Update Daily Target'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <span>Academic Milestones & Badges</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {milestones.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className={`p-5 rounded-2xl border transition-all shadow-sm ${
                  m.unlocked
                    ? 'bg-white dark:bg-slate-900/90 border-amber-300 dark:border-amber-500/40 text-slate-800 dark:text-slate-200 ring-1 ring-amber-400/20'
                    : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/70 text-slate-500 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      m.unlocked
                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-200 dark:bg-slate-900 text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {m.unlocked ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                      UNLOCKED
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold flex items-center gap-1 text-slate-500">
                      <Lock className="w-3 h-3" /> {m.req} Days Req
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{m.name}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
