import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import { formatStudyDuration } from '../utils/studyMetrics';
import { useTheme } from '../context/ThemeContext';

export const AnalyticsView: React.FC = () => {
  const { isDark } = useTheme();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAnalytics()
      .then((res) => setAnalytics(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading analytics engine...</div>;
  }

  const dailyTrend = analytics?.dailyTrend || [];
  const subjectDistribution = analytics?.subjectDistribution || [];
  const modeDistribution = analytics?.modeDistribution || [];

  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#334155' : '#e2e8f0',
    borderRadius: '8px',
    fontSize: '12px',
    color: isDark ? '#f8fafc' : '#0f172a',
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Productivity & Study Analytics</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Detailed metrics answering the question: Where is your college study time really going?
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total Lifetime Hours</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{analytics?.totalHours}h</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">From database records</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400">Current Study Streak</span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {analytics?.streak} Days
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Consistent daily momentum</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total Study Sessions</span>
          <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1 tabular-nums">
            {analytics?.totalSessionsCount}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Completed intervals</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400">Avg. Session Duration</span>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
            {analytics?.totalSessionsCount > 0
              ? formatStudyDuration(
                  Math.round((analytics.totalHours * 60) / analytics.totalSessionsCount)
                )
              : '0m'}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">High focus density</span>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">14-Day Focus Hours Trend</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Continuous study record across the last two weeks</p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
              <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} unit="h" />
              <Tooltip contentStyle={tooltipStyle} formatter={(val: any) => [`${val} hours`, 'Focus Time']} />
              <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Subject-Wise Time Allocation</h3>

          {subjectDistribution.length === 0 ? (
            <p className="text-xs text-slate-500 py-12 text-center">No subject time recorded yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectDistribution}
                      dataKey="minutes"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {subjectDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(val: any) => [formatStudyDuration(Number(val)), 'Time']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {subjectDistribution.map((sub: any) => (
                  <div key={sub.subjectId} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                      <span className="text-slate-700 dark:text-slate-300">{sub.name}</span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                      {formatStudyDuration(sub.minutes)} ({sub.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Focus Mode Technique Comparison</h3>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modeDistribution}
                  dataKey="hours"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {modeDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-m-${index}`} fill={entry.color || '#8b5cf6'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(val: any) => [`${val} hours`, 'Total Time']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2">
            {modeDistribution.map((m: any) => (
              <div key={m.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-slate-700 dark:text-slate-300">{m.name}</span>
                </div>
                <span className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">{m.hours} hrs</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
