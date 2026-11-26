import React, { useState, useEffect } from 'react';
import {
  Settings,
  Bell,
  Clock,
  CheckCircle2,
  Sun,
  Moon,
  User as UserIcon,
  LogOut,
  AlertCircle,
  Palette,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { NavTab } from '../components/Sidebar';

interface SettingsViewProps {
  onNavigate?: (tab: NavTab) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile info states
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [collegeName, setCollegeName] = useState(user?.collegeName || '');
  const [course, setCourse] = useState(user?.course || '');
  const [semester, setSemester] = useState(user?.semester || 'Semester 1');
  const [dailyGoalHours, setDailyGoalHours] = useState(user?.dailyGoalHours || 3.0);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setCollegeName(user.collegeName || '');
      setCourse(user.course || '');
      setSemester(user.semester || 'Semester 1');
      setDailyGoalHours(user.dailyGoalHours || 3.0);
    }
  }, [user]);

  // Preferences
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem('studysync_prefs') || '{}');
      return p.soundEnabled ?? true;
    } catch {
      return true;
    }
  });
  const [dailyReminders, setDailyReminders] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem('studysync_prefs') || '{}');
      return p.dailyReminders ?? true;
    } catch {
      return true;
    }
  });
  const [autoBreak, setAutoBreak] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem('studysync_prefs') || '{}');
      return p.autoBreak ?? true;
    } catch {
      return true;
    }
  });
  const [prefsSaved, setPrefsSaved] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSaving(true);
    try {
      const updated = await api.updateProfile({
        fullName,
        collegeName,
        course,
        semester,
        dailyGoalHours,
      });
      updateUser(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err: any) {
      setProfileError(err.message || 'Could not update profile information.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSavePrefs = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(
      'studysync_prefs',
      JSON.stringify({ soundEnabled, dailyReminders, autoBreak })
    );
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2000);
  };

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500';

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Settings, Profile & Appearance</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Switch between Dark and White (Light) theme, update your profile info, or sign out.
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold transition-colors shrink-0 self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Appearance / Theme Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Theme Appearance</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose between Dark Mode and Light (White) Mode at any time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
              theme === 'light'
                ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 text-slate-900'
                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Light (White) Theme</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Clean bright white surfaces for daytime reading</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
              theme === 'dark'
                ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500 text-white'
                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Dark Theme</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Deep midnight workspace for low-glare focus</p>
            </div>
          </button>
        </div>
      </div>

      {/* Profile Info Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <img
              src={user?.avatarUrl || '/src/assets/images/avatar_student_default_1794506134307.jpg'}
              alt="Profile"
              className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-500/40"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {user?.fullName || 'Student'}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 uppercase">
                  {user?.role || 'student'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                {user?.collegeName} · {user?.course} ({user?.semester})
              </p>
            </div>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline self-start sm:self-center"
            >
              Open Full Profile →
            </button>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Profile Info</span>
            </h4>
            {profileSaved && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Profile updated!
              </span>
            )}
          </div>

          {profileError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">College / University</label>
              <input
                type="text"
                required
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Course / Branch</label>
              <input
                type="text"
                required
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className={inputCls}
              >
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
                <option value="Semester 4">Semester 4</option>
                <option value="Semester 5">Semester 5</option>
                <option value="Semester 6">Semester 6</option>
                <option value="Semester 7">Semester 7</option>
                <option value="Semester 8">Semester 8</option>
                <option value="Graduate">Graduate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Daily Goal (Hours)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="14"
                value={dailyGoalHours}
                onChange={(e) => setDailyGoalHours(Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileSaving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
            >
              {profileSaving ? 'Saving Profile...' : 'Save Profile Info'}
            </button>
          </div>
        </form>
      </div>

      {/* Study & Notification Preferences */}
      <form onSubmit={handleSavePrefs} className="space-y-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Study & Pomodoro Timing</span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Session Completion Sound Chimes</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Play pleasant chime audio when intervals conclude.</p>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Automatic Break Transition</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Instantly switch between work and break intervals.</p>
              </div>
              <input
                type="checkbox"
                checked={autoBreak}
                onChange={(e) => setAutoBreak(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600"
              />
            </label>
          </div>

          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pt-2">
            <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Reminder & Alerts</span>
          </h3>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 cursor-pointer">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Daily Study Streak Notifications</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Alert me in evening if my daily goal is incomplete.</p>
            </div>
            <input
              type="checkbox"
              checked={dailyReminders}
              onChange={(e) => setDailyReminders(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600"
            />
          </label>

          <div className="flex items-center justify-between pt-2">
            {prefsSaved ? (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Preferences saved!
              </span>
            ) : (
              <span />
            )}

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </form>

      {/* Account Session & Logout Card */}
      <div className="p-6 rounded-2xl bg-rose-50/60 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Account Session</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Signed in as <strong className="text-slate-900 dark:text-white">{user?.email}</strong>. Logging out returns you to the sign-in screen.
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of StudySync</span>
        </button>
      </div>
    </div>
  );
};
