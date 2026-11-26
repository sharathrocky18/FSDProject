import React, { useState } from 'react';
import {
  User as UserIcon,
  LogOut,
  CheckCircle2,
  Edit2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const ProfileView: React.FC = () => {
  const { user, updateUser, logout } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [collegeName, setCollegeName] = useState(user?.collegeName || '');
  const [course, setCourse] = useState(user?.course || '');
  const [semester, setSemester] = useState(user?.semester || 'Semester 5');
  const [dailyGoalHours, setDailyGoalHours] = useState(user?.dailyGoalHours || 3.0);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const updated = await api.updateProfile({
        fullName,
        collegeName,
        course,
        semester,
        dailyGoalHours,
      });

      updateUser(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500';

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Student University Profile</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your verified academic credentials and daily focus preferences.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
        <img
          src={user?.avatarUrl || '/src/assets/images/avatar_student_default_1794506134307.jpg'}
          alt="Avatar"
          className="w-20 h-20 rounded-full object-cover ring-2 ring-indigo-500/50"
        />

        <div className="min-w-0 flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{user?.fullName || 'Student'}</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 uppercase">
              {user?.role || 'STUDENT'}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300">{user?.email}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {user?.course} · {user?.semester}
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{user?.collegeName}</p>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Update Academic Information</span>
          </h3>
          {success && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Changes saved!
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                College / University
              </label>
              <input type="text" required value={collegeName} onChange={(e) => setCollegeName(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Course / Branch
              </label>
              <input type="text" required value={course} onChange={(e) => setCourse(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)} className={inputCls}>
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
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Daily Focus Goal (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="12"
                value={dailyGoalHours}
                onChange={(e) => setDailyGoalHours(Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              {saving ? 'Updating...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
