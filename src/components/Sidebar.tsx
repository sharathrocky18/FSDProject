import React from 'react';
import {
  LayoutDashboard,
  Timer,
  BookOpen,
  History,
  Bot,
  FileText,
  Award,
  Layers,
  Compass,
  CheckSquare,
  Calendar,
  BarChart3,
  Zap,
  Settings,
  ChevronRight,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export type NavTab =
  | 'dashboard'
  | 'timer'
  | 'subjects'
  | 'history'
  | 'chatbot'
  | 'pdf'
  | 'quiz'
  | 'flashcards'
  | 'planner'
  | 'tasks'
  | 'calendar'
  | 'analytics'
  | 'streaks'
  | 'settings'
  | 'profile';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isAi?: boolean;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
}) => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const navSections: NavSection[] = [
    {
      title: 'ACADEMIC CORE',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'timer', label: 'Study & Pomodoro', icon: Timer, badge: 'Live' },
        { id: 'subjects', label: 'Subjects', icon: BookOpen },
        { id: 'history', label: 'Session History', icon: History },
      ],
    },
    {
      title: 'AI LEARNING LAB',
      items: [
        { id: 'chatbot', label: 'Gemini Chatbot', icon: Bot, isAi: true },
        { id: 'pdf', label: 'PDF Notes Assistant', icon: FileText, isAi: true },
        { id: 'quiz', label: 'AI Quiz Generator', icon: Award, isAi: true },
        { id: 'flashcards', label: 'Smart Flashcards', icon: Layers, isAi: true },
        { id: 'planner', label: 'AI Study Planner', icon: Compass, isAi: true },
      ],
    },
    {
      title: 'PRODUCTIVITY',
      items: [
        { id: 'tasks', label: 'Tasks & Deadlines', icon: CheckSquare },
        { id: 'calendar', label: 'Academic Calendar', icon: Calendar },
        { id: 'analytics', label: 'Study Analytics', icon: BarChart3 },
        { id: 'streaks', label: 'Streaks & Goals', icon: Zap },
      ],
    },
    {
      title: 'SYSTEM & ACCOUNT',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={`relative z-20 flex flex-col h-screen border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090d16] transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      } shrink-0 select-none`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 shadow-md shadow-indigo-500/20 shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white truncate flex items-center gap-1.5">
              StudySync
              <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-800/60 px-1.5 py-0.2 rounded">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Where is my time going?</p>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-white'
                          : item.isAi
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    />
                    {!collapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          isActive
                            ? 'bg-white/20 text-white border-white/30'
                            : 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Footer Profile + Theme Icon */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#070b13] flex items-center gap-1.5">
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex-1 min-w-0 flex items-center gap-3 p-2 rounded-xl text-left transition-colors hover:bg-slate-200/60 dark:hover:bg-slate-800/60 ${
            currentTab === 'profile' ? 'bg-slate-200/80 dark:bg-slate-800/80 ring-1 ring-indigo-500/50' : ''
          }`}
        >
          <img
            src={user?.avatarUrl || '/src/assets/images/avatar_student_default_1794506134307.jpg'}
            alt="Profile Avatar"
            className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-700 shrink-0"
            referrerPolicy="no-referrer"
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">
                {user?.fullName || 'Student'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {user?.course || 'Academic'} · {user?.semester || 'Sem 1'}
              </p>
            </div>
          )}
          {!collapsed && <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />}
        </button>

        {!collapsed && (
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to White Theme' : 'Switch to Black Theme'}
            title={isDark ? 'Switch Black to White Theme' : 'Switch White to Black Theme'}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-colors shrink-0"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-900" />}
          </button>
        )}
      </div>
    </aside>
  );
};
