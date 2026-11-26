import React, { useState } from 'react';
import { X, Lock, Mail, User, AtSign, School, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState('Semester 5');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(identifier, password);
      setSuccess('Logged in successfully!');
      setTimeout(() => {
        onClose();
        resetForm();
      }, 450);
    } catch (err: any) {
      setError(err.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName,
        username,
        email: email.trim() || undefined,
        password,
        confirmPassword,
        collegeName,
        course,
        semester,
      });
      setSuccess('Account created successfully! Welcome to StudySync.');
      setTimeout(() => {
        onClose();
        resetForm();
      }, 450);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.forgotPassword({ email });
      setSuccess(res.message);
    } catch (err: any) {
      setError(err.message || 'Password reset request failed.');
    } finally {
      setLoading(false);
    }
  };

  const fieldCls =
    'w-full py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {mode === 'login' && 'Switch Account'}
            {mode === 'register' && 'Create Student Account'}
            {mode === 'forgot' && 'Reset Your Password'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'login' && 'Enter your username, email, or full name and password to switch accounts.'}
            {mode === 'register' && 'Create a new student account and jump straight in.'}
            {mode === 'forgot' && 'Enter your email to receive recovery instructions.'}
          </p>
        </div>

        {mode !== 'forgot' && (
          <div className="flex p-1 mb-5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium">
            <button
              onClick={() => {
                setMode('login');
                resetForm();
              }}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => {
                setMode('register');
                resetForm();
              }}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Username, Email, or Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  name="identifier"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter username or email"
                  className={`${fieldCls} pl-9 pr-3`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    resetForm();
                  }}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${fieldCls} pl-9 pr-3`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Rivera"
                    className={`${fieldCls} pl-9 pr-3`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="alex_rivera"
                    className={`${fieldCls} pl-9 pr-3`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">University / College Name</label>
              <div className="relative">
                <School className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="State University"
                  className={`${fieldCls} pl-9 pr-3`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Course / Major</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="Computer Science"
                    className={`${fieldCls} pl-9 pr-3`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className={`${fieldCls} px-3`}
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
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email Address <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className={`${fieldCls} pl-9 pr-3`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${fieldCls} pl-9 pr-3`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${fieldCls} pl-9 pr-3`}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Registered Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className={`${fieldCls} pl-9 pr-3`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending link...' : 'Send Recovery Instructions'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                resetForm();
              }}
              className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
