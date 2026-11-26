import React, { useState, useEffect } from 'react';
import {
  Bell,
  Zap,
  Clock,
  LogOut,
  User as UserIcon,
  Settings,
  Menu,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NavTab } from './Sidebar';
import { api } from '../services/api';
import { NotificationItem } from '../types';

interface TopNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onToggleSidebar: () => void;
  onOpenAuthModal: () => void;
}

const tabTitles: Record<NavTab, { title: string; category: string }> = {
  dashboard: { title: 'Academic Performance Dashboard', category: 'Overview' },
  timer: { title: 'Study Stopwatch & Pomodoro Timer', category: 'Focus Mode' },
  subjects: { title: 'Enrolled Subjects & Goals', category: 'Academic Management' },
  history: { title: 'Study Session History', category: 'Logs' },
  chatbot: { title: 'Gemini Chatbot · Google Search Grounding', category: 'AI Learning Lab' },
  pdf: { title: 'Intelligent PDF Notes & RAG Assistant', category: 'Document Intelligence' },
  quiz: { title: 'AI Quiz Generator & Examination Test', category: 'Active Recall' },
  flashcards: { title: 'Spaced Repetition Flashcards', category: 'Memory Mastery' },
  planner: { title: 'Personalized AI Weekly Study Planner', category: 'Scheduling' },
  tasks: { title: 'Task & Assignment Manager', category: 'Productivity' },
  calendar: { title: 'Campus Academic Calendar', category: 'Timetable' },
  analytics: { title: 'Study Habits & Productivity Analytics', category: 'Deep Insights' },
  streaks: { title: 'Study Streaks, Milestones & Badges', category: 'Motivation' },
  settings: { title: 'Settings, Profile & Appearance', category: 'Settings' },
  profile: { title: 'Student Profile & University Records', category: 'Account' },
};

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  onSelectTab,
  onToggleSidebar,
  onOpenAuthModal,
}) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const meta = tabTitles[currentTab] || { title: 'StudySync', category: 'App' };

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch {
      // ignore if empty
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-md transition-colors">
      {/* Zone 1: Contextual Breadcrumbs & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-1.5 text-slate-500 dark:text-slate-400 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{meta.category}</span>
            <span aria-hidden="true">/</span>
            <span className="text-slate-900 dark:text-slate-200 font-medium truncate">{meta.title}</span>
          </div>
        </div>
      </div>

      {/* Zone 2: Streak Indicator & Focus Button */}
      <div className="hidden md:flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
          <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
          <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{user?.streakCount || 1}</span>
          <span className="text-slate-500 dark:text-slate-400">Day Streak</span>
        </div>

        <button
          onClick={() => onSelectTab('timer')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 transition-colors"
        >
          <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Launch Study Timer</span>
        </button>
      </div>

      {/* Zone 3: Notification Bell, Theme Switch Icon & Profile Menu */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            className="relative p-2 text-slate-500 dark:text-slate-400 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">Notifications</p>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">No notifications yet.</p>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-lg text-xs transition-colors ${
                        item.read
                          ? 'bg-slate-50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400'
                          : 'bg-indigo-50/70 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <p className="font-semibold text-slate-900 dark:text-slate-200">{item.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Black <-> White Theme Switch Icon directly beside Profile */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to White (Light) Theme' : 'Switch to Black (Dark) Theme'}
          title={isDark ? 'Switch Black to White Theme' : 'Switch White to Black Theme'}
          className="flex items-center justify-center w-9 h-9 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-amber-400 hover:ring-2 hover:ring-indigo-500/40 shadow-sm transition-all"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-900" />}
        </button>

        {/* Profile Avatar / Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User account menu"
            className="flex items-center gap-2 p-1 rounded-full ring-1 ring-slate-300 dark:ring-slate-700 hover:ring-indigo-500 transition-all"
          >
            <img
              src={user?.avatarUrl || '/src/assets/images/avatar_student_default_1794506134307.jpg'}
              alt={user?.fullName || 'User'}
              className="w-7 h-7 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user?.fullName || 'Student'}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    onSelectTab('profile');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Student Profile</span>
                </button>

                <button
                  onClick={() => {
                    onSelectTab('settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Settings & Theme</span>
                </button>

                <button
                  onClick={() => {
                    onOpenAuthModal();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
                >
                  <span>Switch Account / Register</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
