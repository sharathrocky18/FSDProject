import React, { useState } from 'react';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  AtSign,
  School,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  Bot,
  BarChart3,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import loginBg from '../assets/images/login_study_bg_1794767216746.jpg';

interface AuthPageProps {
  onSuccess?: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, defaultMode = 'login' }) => {
  const { login, register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(defaultMode);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState('Semester 5');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(identifier, password);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid username or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
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
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed. That username or email may already be in use.');
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
      setSuccessMsg(res.message);
    } catch (err: any) {
      setError(err.message || 'Password reset request failed.');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    'w-full py-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm';

  return (
    <div className="min-h-screen w-screen flex font-sans selection:bg-indigo-500/30 transition-colors relative overflow-hidden bg-slate-100 dark:bg-[#070b13] text-slate-900 dark:text-slate-100">
      {/* Full-Screen StudySync Project Background Image + Crisp Adaptive Scrim */}
      <img
        src={loginBg}
        alt="StudySync workspace background"
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-all duration-300 ${
          isDark ? 'brightness-95 contrast-105' : 'brightness-110 contrast-105 saturate-110'
        }`}
      />
      <div
        className={`absolute inset-0 pointer-events-none transition-colors duration-300 ${
          isDark
            ? 'bg-gradient-to-br from-[#060911]/55 via-[#090d16]/30 to-[#0b1222]/45'
            : 'bg-gradient-to-br from-slate-950/30 via-slate-900/10 to-slate-950/25'
        }`}
      />

      {/* Top-Right Theme Toggle on Auth Screen */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to White Theme' : 'Switch to Black Theme'}
        title={isDark ? 'Switch Black to White Theme' : 'Switch White to Black Theme'}
        className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/90 dark:bg-slate-900/85 backdrop-blur-md border border-white/80 dark:border-white/15 text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold shadow-lg transition-colors"
      >
        {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
        <span>{isDark ? 'White Theme' : 'Dark Theme'}</span>
      </button>

      {/* Left Column: Visual Brand Storytelling (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-between p-10 xl:p-12">
        {/* Brand Lockup */}
        <div className="inline-flex items-center gap-3 self-start px-4 py-2.5 rounded-2xl bg-white/85 dark:bg-slate-950/55 backdrop-blur-md border border-white/80 dark:border-white/15 shadow-lg">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              StudySync
              <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-100/90 dark:bg-cyan-950/90 border border-cyan-200 dark:border-cyan-800 px-1.5 py-0.5 rounded">
                COLLEGE SUITE
              </span>
            </h1>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">Where is my study time going?</p>
          </div>
        </div>

        {/* Center Presentation Pitch */}
        <div className="max-w-lg space-y-4 my-auto">
          <div className="space-y-3 p-6 rounded-2xl bg-white/80 dark:bg-slate-950/55 backdrop-blur-md border border-white/80 dark:border-white/15 shadow-xl">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Student Productivity Architecture
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Learn Better. Focus Smarter. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400">
                Achieve Academic Mastery.
              </span>
            </h2>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
              Sign in with your username and password—or register a new student account in seconds—to unlock your personalized study timer, analytics dashboard, AI quiz generator, and context-aware Gemini chatbot with Google Search.
            </p>
          </div>

          {/* Key Value Highlights */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/82 dark:bg-slate-950/55 backdrop-blur-md border border-white/80 dark:border-white/15 shadow-lg">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-600/25 text-indigo-600 dark:text-indigo-300">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Stopwatch & Pomodoro Engine</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">Log focused intervals directly into your personal study log.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/82 dark:bg-slate-950/55 backdrop-blur-md border border-white/80 dark:border-white/15 shadow-lg">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-600/25 text-purple-600 dark:text-purple-300">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Gemini Chatbot & Google Search</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">Ask any question with live real-time Search Grounding.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/82 dark:bg-slate-950/55 backdrop-blur-md border border-white/80 dark:border-white/15 shadow-lg">
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-600/25 text-cyan-700 dark:text-cyan-300">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Visual Productivity Analytics</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">7-day trends, study streaks, and subject distribution.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="inline-block self-start px-3 py-1 rounded-lg bg-white/80 dark:bg-slate-950/55 backdrop-blur-md border border-white/70 dark:border-white/10 text-[11px] text-slate-700 dark:text-slate-300 shadow-sm">
          StudySync · Built for focused university learning
        </p>
      </div>

      {/* Right Column: Authentication Form Container */}
      <div className="flex-1 relative z-10 flex flex-col justify-center items-center p-6 md:p-10 overflow-y-auto">
        <div className="w-full max-w-md space-y-5 p-6 md:p-8 rounded-2xl bg-white/90 dark:bg-[#0b101d]/82 backdrop-blur-xl border border-white/80 dark:border-white/15 shadow-2xl">
          {/* Mobile Top Brand */}
          <div className="flex lg:hidden items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900 dark:text-white">StudySync</span>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {mode === 'login' && 'Sign In to StudySync'}
              {mode === 'register' && 'Create Your Account'}
              {mode === 'forgot' && 'Reset Account Password'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {mode === 'login' && 'Enter your username, email, or full name and password to open your dashboard.'}
              {mode === 'register' && 'First time here? Choose a username and set up your student profile.'}
              {mode === 'forgot' && 'Enter your registered email to receive recovery instructions.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          {mode !== 'forgot' && (
            <div className="flex p-1 rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setPassword('');
                  setConfirmPassword('');
                  setShowPassword(false);
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setPassword('');
                  setConfirmPassword('');
                  setShowPassword(false);
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Register (New User)
              </button>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ---------------- LOGIN FORM ---------------- */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Username, Email, or Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    name="identifier"
                    autoComplete="username"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter username or email"
                    className={`${inputClasses} pl-10 pr-4`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputClasses} pl-10 pr-10`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <span>{loading ? 'Signing In...' : 'Sign In to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ---------------- REGISTER FORM ---------------- */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="E.g., Maya Lin"
                      className={`${inputClasses} pl-9 pr-3 py-2`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Username</label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      name="username"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g., maya_lin"
                      className={`${inputClasses} pl-9 pr-3 py-2`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  University / College Name
                </label>
                <div className="relative">
                  <School className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="E.g., Stanford University"
                    className={`${inputClasses} pl-10 pr-3 py-2`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Major / Course
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      required
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      placeholder="Computer Science"
                      className={`${inputClasses} pl-9 pr-3 py-2`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className={`${inputClasses} px-3 py-2`}
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email / Gmail Address <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className={`${inputClasses} pl-10 pr-3 py-2`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="new-password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputClasses} pl-3 pr-9 py-2`}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirm-password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputClasses} px-3 py-2`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 mt-3"
              >
                <span>{loading ? 'Creating Account...' : 'Register & Go to Dashboard'}</span>
                <Check className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ---------------- FORGOT PASSWORD ---------------- */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className={`${inputClasses} pl-10 pr-4`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all"
              >
                {loading ? 'Sending link...' : 'Send Recovery Instructions'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white pt-2"
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
