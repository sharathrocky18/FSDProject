import React, { useState, useEffect } from 'react';
import {
  Clock,
  Zap,
  CheckCircle2,
  Calendar,
  ArrowRight,
  TrendingUp,
  Award,
  Play,
  FileText,
  Bot,
} from 'lucide-react';
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
import { NavTab } from '../components/Sidebar';
import { useTheme } from '../context/ThemeContext';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await api.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-200 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalStudyHours: 0,
    todayMinutes: 0,
    streakDays: 0,
    pendingTasksCount: 0,
    completedTasksCount: 0,
    upcomingExamsCount: 0,
  };

  const weeklyData = data?.weeklyProductivity || [];
  const subjectDistribution = data?.subjectDistribution || [];
  const recentSessions = data?.recentSessions || [];
  const upcomingDeadlines = data?.upcomingDeadlines || [];

  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#334155' : '#e2e8f0',
    borderRadius: '8px',
    fontSize: '12px',
    color: isDark ? '#f8fafc' : '#0f172a',
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 dark:from-slate-950 dark:via-[#0d1424] dark:to-indigo-950/40 p-6 md:p-8 shadow-sm dark:shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>{data?.user?.collegeName || 'University Campus'}</span>
              <span>·</span>
              <span>{data?.user?.course || 'Computer Science'}</span>
              <span>·</span>
              <span>{data?.user?.semester || 'Semester 1'}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome back, {data?.user?.fullName || 'Student'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              You are on a <span className="font-semibold text-amber-600 dark:text-amber-400">{metrics.streakDays}-day streak</span>!
              You have completed <span className="font-semibold text-cyan-700 dark:text-cyan-400">{formatStudyDuration(metrics.todayMinutes)}</span> of your {data?.user?.dailyGoalHours || 3.0}h daily focus target today.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => onNavigate('timer')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start Study Session</span>
              </button>
              <button
                onClick={() => onNavigate('chatbot')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-medium shadow-sm transition-all"
              >
                <Bot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Ask Gemini Chatbot</span>
              </button>
              <button
                onClick={() => onNavigate('pdf')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-medium shadow-sm transition-all"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Upload PDF Notes</span>
              </button>
            </div>
          </div>

          <div className="hidden lg:block w-72 h-40 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/60 shadow-lg shrink-0">
            <img
              src="/src/assets/images/hero_studysync_1794506134027.jpg"
              alt="Study Space"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Total Study Hours</span>
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {metrics.totalStudyHours}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">hours logged</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> All sessions recorded
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Today's Study Time</span>
            <Award className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {formatStudyDuration(metrics.todayMinutes)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">today</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Target: {data?.user?.dailyGoalHours || 3}h daily
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Study Streak</span>
            <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {metrics.streakDays}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">consecutive days</span>
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-300 mt-2">Keep your momentum alive!</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Academic Tasks</span>
            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {metrics.pendingTasksCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">pending assignments</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {metrics.upcomingExamsCount} upcoming exams scheduled
          </p>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">7-Day Study Productivity</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Daily focus hours logged vs daily goal</p>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
                <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} unit="h" />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value} hrs`, 'Study Time']} />
                <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Subject Breakdown</h3>
            <button
              onClick={() => onNavigate('subjects')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Manage
            </button>
          </div>

          {subjectDistribution.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No subject study hours logged yet.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-44 w-full flex items-center justify-center">
                {subjectDistribution.some((s: any) => s.minutes > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={subjectDistribution}
                        dataKey="minutes"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
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
                ) : (
                  <div className="w-32 h-32 rounded-full border-[10px] border-slate-100 dark:border-slate-800/90 flex flex-col items-center justify-center text-center px-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">0h</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">No time yet</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {subjectDistribution.slice(0, 4).map((sub: any) => (
                  <div key={sub.subjectId} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                      <span className="text-slate-700 dark:text-slate-300 truncate">{sub.name}</span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums font-medium">
                      {sub.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Study Sessions</h3>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              View All History
            </button>
          </div>

          <div className="space-y-3">
            {recentSessions.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No study sessions recorded yet.</p>
            ) : (
              recentSessions.map((sess: any) => (
                <div
                  key={sess.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sess.subjectColor }} />
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">{sess.subjectName}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        {sess.notes || (sess.mode === 'pomodoro' ? 'Pomodoro Focus Session' : 'Standard Stopwatch Study')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300 tabular-nums">
                      {formatStudyDuration(sess.durationMinutes)}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(sess.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Urgent Assignments & Tasks</h3>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Manage Tasks
            </button>
          </div>

          <div className="space-y-3">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No upcoming pending tasks. Great job!</p>
            ) : (
              upcomingDeadlines.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">{task.title}</p>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Due: {task.dueDate} · {task.type}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      task.priority === 'high'
                        ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                        : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                    }`}
                  >
                    {task.priority.toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
