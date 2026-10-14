import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar as CalendarIcon,
  FileText,
  User,
  CheckCircle,
  AlertTriangle,
  Play,
  Square,
  Coffee,
  Utensils,
  LogOut,
  Send,
  Save,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Volume2,
  Sparkles,
  Award,
} from 'lucide-react';
import type { Student, AttendanceRecord, DayEndReport } from '../types.js';
import {
  formatDateKey,
  formatTime12h,
  validateAttendanceWindow,
  formatFriendlyDate,
  getDeviceTime,
} from '../utils/time.js';
import { triggerDeviceVibration, playAlertChime } from '../utils/alert.js';

interface StudentPortalProps {
  student: Student;
  records: AttendanceRecord[];
  reports: DayEndReport[];
  bypassTimeWindows: boolean;
  onLogout: () => void;
  onMarkAttendance: (
    action: 'DAY_IN' | 'SHORT_BREAK_START' | 'SHORT_BREAK_END' | 'LUNCH_BREAK_START' | 'LUNCH_BREAK_END' | 'DAY_OUT',
    timestamp: string
  ) => Promise<void>;
  onSubmitReport: (topic: string, content: string) => Promise<void>;
  onUpdateProfile: (updates: {
    collegeName: string;
    branch: string;
    rollNo: string;
    phone: string;
    email: string;
    quickLoginEnabled: boolean;
    password?: string;
  }) => Promise<void>;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  student,
  records,
  reports,
  bypassTimeWindows,
  onLogout,
  onMarkAttendance,
  onSubmitReport,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'calendar' | 'report' | 'profile' | 'logout'>('attendance');
  const [deviceTime, setDeviceTime] = useState<string>(formatTime12h());
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Day End Report state
  const [reportTopic, setReportTopic] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Profile Edit state
  const [collegeName, setCollegeName] = useState(student.collegeName);
  const [branch, setBranch] = useState(student.branch);
  const [rollNo, setRollNo] = useState(student.rollNo);
  const [phone, setPhone] = useState(student.phone || '');
  const [email, setEmail] = useState(student.email || '');
  const [quickLoginEnabled, setQuickLoginEnabled] = useState(student.quickLoginEnabled ?? true);
  const [newPassword, setNewPassword] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Keep profile state synced if student prop updates
  useEffect(() => {
    setCollegeName(student.collegeName);
    setBranch(student.branch);
    setRollNo(student.rollNo);
    setPhone(student.phone || '');
    setEmail(student.email || '');
    setQuickLoginEnabled(student.quickLoginEnabled ?? true);
  }, [student]);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setDeviceTime(formatTime12h(getDeviceTime()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayKey = formatDateKey();

  // Find today's record for this student
  const todayRecord = useMemo(() => {
    return records.find(
      (r) =>
        r.studentId.toLowerCase() === student.id.toLowerCase() &&
        r.date === todayKey
    );
  }, [records, student.id, todayKey]);

  // Current status
  const currentStatus = todayRecord?.status || 'NOT_STARTED';

  // Handle Attendance Action with window validation
  const handleActionClick = async (
    action: 'DAY_IN' | 'SHORT_BREAK_START' | 'SHORT_BREAK_END' | 'LUNCH_BREAK_START' | 'LUNCH_BREAK_END' | 'DAY_OUT'
  ) => {
    setActionError(null);
    const validation = validateAttendanceWindow(action, bypassTimeWindows);
    if (!validation.allowed) {
      setActionError(validation.reason || 'Action not permitted at this time.');
      return;
    }

    try {
      setIsSubmitting(true);
      const nowTimeStr = formatTime12h(getDeviceTime());
      await onMarkAttendance(action, nowTimeStr);
      // Play confirmation chime
      playAlertChime();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record timestamp');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Report word count calculation
  const reportWordCount = useMemo(() => {
    return reportContent.trim().split(/\s+/).filter(Boolean).length;
  }, [reportContent]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportContent.trim()) return;
    if (reportWordCount > 3000) {
      setActionError(`Maximum word limit is 3000 words. Current count: ${reportWordCount}`);
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError(null);
      await onSubmitReport(
        reportTopic.trim() || 'Daily Learning Summary',
        reportContent.trim()
      );
      setReportSuccess(true);
      setReportTopic('');
      setReportContent('');
      setTimeout(() => setReportSuccess(false), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setActionError(null);
      await onUpdateProfile({
        collegeName: collegeName.trim(),
        branch: branch.trim(),
        rollNo: rollNo.trim(),
        phone: phone.trim(),
        email: email.trim(),
        quickLoginEnabled,
        password: newPassword.trim() || undefined,
      });
      setProfileSuccess(true);
      setNewPassword('');
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calendar calculations
  const studentRecords = useMemo(() => {
    return records.filter(
      (r) => r.studentId.toLowerCase() === student.id.toLowerCase()
    );
  }, [records, student.id]);

  const presentDaysCount = studentRecords.filter(
    (r) => r.status === 'PRESENT' || r.status === 'DAY_OUT' || r.dayInTime
  ).length;

  const attendancePercentage = studentRecords.length > 0
    ? Math.round((presentDaysCount / studentRecords.length) * 100)
    : 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Student Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black ring-4 ring-indigo-500/20 shadow-lg shadow-indigo-600/30">
              {student.name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {student.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {student.rollNo}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {student.branch} • {student.collegeName}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Jyothi Technologies batch 1 (Seniors)
              </p>
            </div>
          </div>

          {/* Quick Metrics & Logout Action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
              <div className="px-3 py-1.5 text-center border-r border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Today Status</div>
                <div
                  className={`text-xs font-extrabold ${
                    currentStatus === 'PRESENT'
                      ? 'text-emerald-400'
                      : currentStatus === 'SHORT_BREAK'
                      ? 'text-amber-400'
                      : currentStatus === 'LUNCH_BREAK'
                      ? 'text-indigo-400'
                      : currentStatus === 'DAY_OUT'
                      ? 'text-teal-400'
                      : 'text-slate-400'
                  }`}
                >
                  {currentStatus === 'NOT_STARTED' && 'Not Logged'}
                  {currentStatus === 'PRESENT' && 'Day In (Active)'}
                  {currentStatus === 'SHORT_BREAK' && 'Short Break'}
                  {currentStatus === 'LUNCH_BREAK' && 'Lunch Break'}
                  {currentStatus === 'DAY_OUT' && 'Day Out Done'}
                </div>
              </div>
              <div className="px-3 py-1.5 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Attendance</div>
                <div className="text-xs font-extrabold text-emerald-400 font-mono">
                  {attendancePercentage}%
                </div>
              </div>
            </div>

            {/* Direct Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-white transition-all text-xs font-bold cursor-pointer shadow-lg shadow-rose-950/40"
              title="Log out of student account"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Attendance Clock</span>
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-900'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Attendance Calendar ({attendancePercentage}%)</span>
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'report'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Day End Report (3000 Words)</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('logout')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'logout'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-rose-300 hover:text-white bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40'
            }`}
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Error or Notice Banner */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs text-rose-400 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: Attendance Clock */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Action Console */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  Daily Attendance Tracker
                </h3>
                <p className="text-xs text-slate-400">
                  Date: <span className="text-white font-semibold">{formatFriendlyDate(todayKey)}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 font-mono text-emerald-400 text-sm font-bold">
                  {deviceTime}
                </div>
              </div>
            </div>

            {/* Current Status Callout */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full ${
                    currentStatus === 'PRESENT'
                      ? 'bg-emerald-500 animate-pulse'
                      : currentStatus === 'SHORT_BREAK'
                      ? 'bg-amber-500 animate-ping'
                      : currentStatus === 'LUNCH_BREAK'
                      ? 'bg-indigo-500 animate-ping'
                      : currentStatus === 'DAY_OUT'
                      ? 'bg-teal-500'
                      : 'bg-slate-600'
                  }`}
                />
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Current State</div>
                  <div className="text-base font-extrabold text-white">
                    {currentStatus === 'NOT_STARTED' && 'Ready for Day In'}
                    {currentStatus === 'PRESENT' && 'Day In Active (Logged In For The Day)'}
                    {currentStatus === 'SHORT_BREAK' && 'Currently on Short Break'}
                    {currentStatus === 'LUNCH_BREAK' && 'Currently on Lunch Break'}
                    {currentStatus === 'DAY_OUT' && 'Day Out Logged (Attendance Complete)'}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                {currentStatus === 'PRESENT' ? 'Persists until you click Day Out' : 'Device Time Synchronized'}
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Day In Button */}
              <button
                type="button"
                disabled={currentStatus !== 'NOT_STARTED' || isSubmitting}
                onClick={() => handleActionClick('DAY_IN')}
                className={`p-5 rounded-2xl border flex flex-col items-start justify-between gap-3 text-left transition-all ${
                  currentStatus === 'NOT_STARTED'
                    ? 'bg-emerald-600/20 border-emerald-500/50 hover:bg-emerald-600/30 text-white cursor-pointer hover:border-emerald-400 shadow-lg shadow-emerald-950/50'
                    : 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Mark Day In</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Permitted after 8:55 AM
                  </div>
                </div>
                {todayRecord?.dayInTime && (
                  <div className="text-xs font-mono text-emerald-400 font-bold">
                    Recorded at: {todayRecord.dayInTime}
                  </div>
                )}
              </button>

              {/* Short Break Button */}
              {currentStatus === 'SHORT_BREAK' ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleActionClick('SHORT_BREAK_END')}
                  className="p-5 rounded-2xl border bg-amber-600 hover:bg-amber-500 text-white flex flex-col items-start justify-between gap-3 text-left transition-all cursor-pointer shadow-lg shadow-amber-950/50"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">End Short Break</div>
                    <div className="text-xs text-amber-100 mt-0.5">
                      Resume active session
                    </div>
                  </div>
                  <div className="text-xs font-mono text-white font-bold">
                    Started at: {todayRecord?.shortBreakStart}
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={currentStatus !== 'PRESENT' || isSubmitting}
                  onClick={() => handleActionClick('SHORT_BREAK_START')}
                  className={`p-5 rounded-2xl border flex flex-col items-start justify-between gap-3 text-left transition-all ${
                    currentStatus === 'PRESENT'
                      ? 'bg-amber-500/20 border-amber-500/50 hover:bg-amber-500/30 text-white cursor-pointer hover:border-amber-400 shadow-lg shadow-amber-950/50'
                      : 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Take Short Break</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Window: 11:20 AM - 11:35 AM
                    </div>
                  </div>
                  {todayRecord?.shortBreakEnd && (
                    <div className="text-xs font-mono text-amber-400 font-bold">
                      Completed: {todayRecord.shortBreakStart} - {todayRecord.shortBreakEnd}
                    </div>
                  )}
                </button>
              )}

              {/* Lunch Break Button */}
              {currentStatus === 'LUNCH_BREAK' ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleActionClick('LUNCH_BREAK_END')}
                  className="p-5 rounded-2xl border bg-indigo-600 hover:bg-indigo-500 text-white flex flex-col items-start justify-between gap-3 text-left transition-all cursor-pointer shadow-lg shadow-indigo-950/50"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">End Lunch Break</div>
                    <div className="text-xs text-indigo-100 mt-0.5">
                      Resume active session
                    </div>
                  </div>
                  <div className="text-xs font-mono text-white font-bold">
                    Started at: {todayRecord?.lunchBreakStart}
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={currentStatus !== 'PRESENT' || isSubmitting}
                  onClick={() => handleActionClick('LUNCH_BREAK_START')}
                  className={`p-5 rounded-2xl border flex flex-col items-start justify-between gap-3 text-left transition-all ${
                    currentStatus === 'PRESENT'
                      ? 'bg-indigo-500/20 border-indigo-500/50 hover:bg-indigo-500/30 text-white cursor-pointer hover:border-indigo-400 shadow-lg shadow-indigo-950/50'
                      : 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Take Lunch Break</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Window: 1:00 PM - 2:00 PM (13:00 - 14:00)
                    </div>
                  </div>
                  {todayRecord?.lunchBreakEnd && (
                    <div className="text-xs font-mono text-indigo-400 font-bold">
                      Completed: {todayRecord.lunchBreakStart} - {todayRecord.lunchBreakEnd}
                    </div>
                  )}
                </button>
              )}

              {/* Day Out Button */}
              <button
                type="button"
                disabled={currentStatus !== 'PRESENT' || isSubmitting}
                onClick={() => handleActionClick('DAY_OUT')}
                className={`p-5 rounded-2xl border flex flex-col items-start justify-between gap-3 text-left transition-all ${
                  currentStatus === 'PRESENT'
                    ? 'bg-rose-500/20 border-rose-500/50 hover:bg-rose-500/30 text-white cursor-pointer hover:border-rose-400 shadow-lg shadow-rose-950/50'
                    : 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold">
                  <Square className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Mark Day Out</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Permitted after 4:00 PM (16:00)
                  </div>
                </div>
                {todayRecord?.dayOutTime && (
                  <div className="text-xs font-mono text-rose-400 font-bold">
                    Recorded at: {todayRecord.dayOutTime}
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Today's Ledger & Schedule Window Info */}
          <div className="lg:col-span-4 space-y-6">
            {/* Today's Timestamps Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Permanent SQL Record
              </h4>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Day In:</span>
                  <span className={todayRecord?.dayInTime ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                    {todayRecord?.dayInTime || 'Not Logged'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Short Break:</span>
                  <span className={todayRecord?.shortBreakStart ? 'text-amber-400 font-bold' : 'text-slate-600'}>
                    {todayRecord?.shortBreakStart
                      ? `${todayRecord.shortBreakStart} - ${todayRecord.shortBreakEnd || 'Active'}`
                      : 'None'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Lunch Break:</span>
                  <span className={todayRecord?.lunchBreakStart ? 'text-indigo-400 font-bold' : 'text-slate-600'}>
                    {todayRecord?.lunchBreakStart
                      ? `${todayRecord.lunchBreakStart} - ${todayRecord.lunchBreakEnd || 'Active'}`
                      : 'None'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Day Out:</span>
                  <span className={todayRecord?.dayOutTime ? 'text-rose-400 font-bold' : 'text-slate-600'}>
                    {todayRecord?.dayOutTime || 'Not Logged'}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-[11px] text-emerald-300">
                All attendance timestamps are securely synced to the centralized database and permanently preserved.
              </div>
            </div>

            {/* Timings Legend */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Official College Timing Rules
              </h4>
              <ul className="text-xs text-slate-400 space-y-2">
                <li className="flex items-center justify-between">
                  <span>Day In Window:</span>
                  <span className="text-emerald-400 font-mono font-semibold">&gt;= 8:55 AM</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Short Break Window:</span>
                  <span className="text-amber-400 font-mono font-semibold">11:20 AM - 11:35 AM</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Lunch Break Window:</span>
                  <span className="text-indigo-400 font-mono font-semibold">1:00 PM - 2:00 PM</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Day Out Window:</span>
                  <span className="text-rose-400 font-mono font-semibold">&gt;= 4:00 PM</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Attendance Calendar & % */}
      {activeTab === 'calendar' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-400" />
                Attendance Calendar & Rate
              </h3>
              <p className="text-xs text-slate-400">
                Monthly attendance history and compliance score for Jyothi Technologies batch 1 (Seniors).
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Attendance Rate</div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {attendancePercentage}%
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Award className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Calendar Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Total Enrolled Days</div>
              <div className="text-xl font-bold text-white mt-1 font-mono">
                {studentRecords.length || 1}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Present (Day In)</div>
              <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                {presentDaysCount}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Breaks Recorded</div>
              <div className="text-xl font-bold text-amber-400 mt-1 font-mono">
                {studentRecords.filter((r) => r.shortBreakStart || r.lunchBreakStart).length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Compliance Status</div>
              <div className="text-sm font-bold text-teal-400 mt-1">
                {attendancePercentage >= 75 ? 'Optimal (>=75%)' : 'Needs Review'}
              </div>
            </div>
          </div>

          {/* Records Ledger Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Recorded Attendance Days Log
            </h4>
            {studentRecords.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/50 rounded-2xl border border-slate-800 text-slate-400 text-sm">
                No attendance logs found yet. Mark Day In from the Attendance tab to start recording!
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Day In</th>
                      <th className="py-3 px-4">Short Break</th>
                      <th className="py-3 px-4">Lunch Break</th>
                      <th className="py-3 px-4">Day Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                    {studentRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-white font-sans font-semibold">
                          {formatFriendlyDate(rec.date)}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.status === 'DAY_OUT'
                                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                : rec.status === 'PRESENT'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-emerald-400">{rec.dayInTime || '—'}</td>
                        <td className="py-3 px-4 text-amber-400">
                          {rec.shortBreakStart
                            ? `${rec.shortBreakStart} - ${rec.shortBreakEnd || 'Active'}`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-indigo-400">
                          {rec.lunchBreakStart
                            ? `${rec.lunchBreakStart} - ${rec.lunchBreakEnd || 'Active'}`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-rose-400">{rec.dayOutTime || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Day End Report (Max 3000 Words) */}
      {activeTab === 'report' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="pb-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Day End Learning Report
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Type what you learned today. Once submitted, it is immediately synchronized with the administrator dashboard.
              </p>
            </div>

            {/* Word Counter Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">Word Count:</span>
              <span
                className={`font-bold ${
                  reportWordCount > 3000 ? 'text-rose-400 font-extrabold' : 'text-emerald-400'
                }`}
              >
                {reportWordCount} / 3000
              </span>
            </div>
          </div>

          {reportSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Day end report submitted successfully and stored in the database!</span>
            </div>
          )}

          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Topic / Subject of the Day
              </label>
              <input
                type="text"
                value={reportTopic}
                onChange={(e) => setReportTopic(e.target.value)}
                placeholder="e.g. Data Structures, React State Management, System Architecture"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Detailed Learning Report (Maximum 3000 words)
                </label>
                <span className="text-[11px] text-slate-500">
                  {3000 - reportWordCount} words remaining
                </span>
              </div>
              <textarea
                required
                rows={10}
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                placeholder="Write what you have learned, hands-on tasks executed, technical doubts, experiments, key takeaways..."
                className="w-full p-4 bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !reportContent.trim() || reportWordCount > 3000}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting Report...' : 'Submit Report to Admin'}</span>
            </button>
          </form>

          {/* Past Submitted Reports */}
          <div className="pt-6 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Your Previously Submitted Reports ({reports.filter((r) => r.studentId.toLowerCase() === student.id.toLowerCase()).length})
            </h4>

            <div className="space-y-3">
              {reports
                .filter((r) => r.studentId.toLowerCase() === student.id.toLowerCase())
                .map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        {rep.topic || 'Daily Learning Summary'}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {formatFriendlyDate(rep.date)} • {rep.wordCount} words
                      </span>
                    </div>
                    <p className="text-slate-300 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                      {rep.content}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Edit Profile */}
      {activeTab === 'profile' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="pb-6 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              Edit Student Profile
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Update your college name, branch, roll number, and credentials. Changes are permanently stored in the centralized SQL database and instantly appear on the admin dashboard.
            </p>
          </div>

          {profileSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Profile updated successfully! All changes are synchronized with the administrator database.</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Student Name (Login ID)
                </label>
                <input
                  type="text"
                  disabled
                  value={student.name}
                  className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-sm cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Official name registered in batch roster
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  University Roll Number
                </label>
                <input
                  type="text"
                  required
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="e.g. 1JT22CS001"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  College Name
                </label>
                <input
                  type="text"
                  required
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. Jyothy Institute of Technology"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Engineering Branch / Department
                </label>
                <input
                  type="text"
                  required
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  College Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@jit.ac.in"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Quick Login toggle setting */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-white">Quick Login Presence</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Disable this option to remove your name from the login quick-selector on the sign-in page.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={quickLoginEnabled}
                  onChange={(e) => setQuickLoginEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Optional Password Change */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Update Password (Optional)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Current default is first 4 letters of your name + @123
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Log Out of Profile</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: Dedicated Logout Page */}
      {activeTab === 'logout' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
            <LogOut className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">Log Out from Attendance System</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Are you sure you want to log out of your session as{' '}
              <strong className="text-white font-semibold">{student.name}</strong>?
              <br />
              All your recorded timestamps and reports are permanently saved in the centralized SQL database.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('attendance')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all"
            >
              Cancel & Stay In
            </button>
            <button
              onClick={onLogout}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer transition-all shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Confirm Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
