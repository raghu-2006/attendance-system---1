import React, { useState } from 'react';
import {
  GraduationCap,
  Shield,
  Lock,
  User,
  ArrowRight,
  Info,
  Sparkles,
} from 'lucide-react';
import type { Student, AdminUser } from '../types.js';

interface LoginViewProps {
  students: Student[];
  onStudentLogin: (id: string, password: string) => Promise<void>;
  onAdminLogin: (username: string, password: string) => Promise<void>;
  error: string | null;
  loading: boolean;
  clearError: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  students,
  onStudentLogin,
  onAdminLogin,
  error,
  loading,
  clearError,
}) => {
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');

  // Student form state
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Admin form state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleTabChange = (tab: 'student' | 'admin') => {
    setActiveTab(tab);
    clearError();
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !studentPassword.trim()) return;
    await onStudentLogin(studentId.trim(), studentPassword.trim());
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword.trim()) return;
    await onAdminLogin(adminUsername.trim(), adminPassword.trim());
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-3xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl shadow-indigo-950/40 overflow-hidden backdrop-blur-xl">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-indigo-900/80 via-slate-900 to-emerald-950/80 p-6 sm:p-8 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 font-black text-2xl">
                JT
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Jyothi Technologies batch 1 (Seniors)
                </h2>
                <p className="text-sm text-slate-300">
                  Jyothy Institute of Technology • Smart Attendance Portal
                </p>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex p-1 bg-slate-950/80 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleTabChange('student')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'student'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Student Login</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin Login</span>
              </button>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'student' ? (
            <div className="max-w-xl mx-auto space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-400" />
                  Student Attendance Portal
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your registered full name and password to access your attendance console and day end report.
                </p>
              </div>

              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Student Name (Login ID)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="Enter your registered name (e.g. PUNYA SHREE S)"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
                    />
                  </div>
                  <div className="mt-2 p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-900/50 flex items-start gap-2 text-indigo-300 text-xs">
                    <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Password Rule:</strong> First 4 letters of your name +{' '}
                      <code className="text-white font-mono bg-indigo-900/50 px-1 py-0.5 rounded">
                        @123
                      </code>{' '}
                      (e.g., VARSHA M → <span className="text-white font-mono">vars@123</span>).
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In as Student'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Schedule preview card */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400 space-y-1.5">
                <div className="font-semibold text-slate-200">Daily Timing Policy:</div>
                <div className="flex justify-between">
                  <span>Day In:</span>
                  <span className="text-emerald-400 font-mono">After 8:55 AM</span>
                </div>
                <div className="flex justify-between">
                  <span>Short Break:</span>
                  <span className="text-amber-400 font-mono">11:20 AM - 11:35 AM</span>
                </div>
                <div className="flex justify-between">
                  <span>Lunch Break:</span>
                  <span className="text-indigo-400 font-mono">1:00 PM - 2:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Day Out:</span>
                  <span className="text-rose-400 font-mono">After 4:00 PM</span>
                </div>
              </div>
            </div>
          ) : (
            /* Admin Login View */
            <div className="max-w-xl mx-auto space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  Administrator Control Portal
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Access live student database, track daily timestamps, view reports, and manage records.
                </p>
              </div>

              {/* Pre-configured admin shortcuts */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Quick Admin Credentials (Click to fill):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminUsername('admin');
                      setAdminPassword('admin@123');
                      clearError();
                    }}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500/50 text-left transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-bold text-white">admin</div>
                    <div className="text-[10px] text-slate-400 font-mono">admin@123</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminUsername('damodar');
                      setAdminPassword('damo@123');
                      clearError();
                    }}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500/50 text-left transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-bold text-white">damodar</div>
                    <div className="text-[10px] text-slate-400 font-mono">damo@123</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminUsername('karan kumar');
                      setAdminPassword('karan@123');
                      clearError();
                    }}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500/50 text-left transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-bold text-white">karan kumar</div>
                    <div className="text-[10px] text-slate-400 font-mono">karan@123</div>
                  </button>
                </div>
              </div>

              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Admin Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="admin / damodar / karan kumar"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Admin Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In as Administrator'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
