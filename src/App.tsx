import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar.js';
import { LoginView } from './components/LoginView.js';
import { StudentPortal } from './components/StudentPortal.js';
import { AdminPortal } from './components/AdminPortal.js';
import { api } from './services/api.js';
import type { Student, AdminUser, AttendanceRecord, DayEndReport } from './types.js';
import { formatDateKey } from './utils/time.js';

const SESSION_KEY = 'jit_attendance_session';

type SessionUser =
  | { type: 'student'; student: Student }
  | { type: 'admin'; admin: AdminUser }
  | null;

export default function App() {
  // Start on clean login page so no user is stuck in a previously cached profile
  const [currentUser, setCurrentUser] = useState<SessionUser>(null);
  const currentUserRef = useRef<SessionUser>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [reports, setReports] = useState<DayEndReport[]>([]);
  const [bypassTimeWindows, setBypassTimeWindows] = useState<boolean>(true); // Default enabled for flexible testing

  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync ref with current user
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Clean any old stale session keys on startup
  useEffect(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('jit_attendance_session');
      localStorage.removeItem('jit_active_session');
    } catch {}
  }, []);

  // Load initial data from SQLite backend
  const loadData = useCallback(async () => {
    try {
      const [fetchedStudents, fetchedAttendance, fetchedReports] = await Promise.all([
        api.getStudents(),
        api.getAttendance(),
        api.getReports(),
      ]);

      setStudents(fetchedStudents);
      setAttendanceRecords(fetchedAttendance);
      setReports(fetchedReports);

      // Only update user if actively logged in
      const active = currentUserRef.current;
      if (active && active.type === 'student') {
        const found = fetchedStudents.find(
          (s) => s.id.toLowerCase() === active.student.id.toLowerCase()
        );
        if (found && currentUserRef.current) {
          setCurrentUser({ type: 'student', student: found });
        }
      }
    } catch (err) {
      console.error('Error fetching system data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Auto sync with database every 12 seconds
    const interval = setInterval(() => {
      loadData();
    }, 12000);

    return () => clearInterval(interval);
  }, [loadData]);

  // Auth: Student Login
  const handleStudentLogin = async (id: string, password: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      const student = await api.loginStudent(id, password);
      currentUserRef.current = { type: 'student', student };
      setCurrentUser({ type: 'student', student });
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Check your student name and password.');
    } finally {
      setLoading(false);
    }
  };

  // Auth: Admin Login
  const handleAdminLogin = async (username: string, password: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      const admin = await api.loginAdmin(username, password);
      currentUserRef.current = { type: 'admin', admin };
      setCurrentUser({ type: 'admin', admin });
    } catch (err: any) {
      setAuthError(err.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  // Auth: Logout
  const handleLogout = () => {
    currentUserRef.current = null;
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('jit_attendance_session');
      localStorage.removeItem('jit_active_session');
      sessionStorage.clear();
    } catch (err) {
      console.warn('Storage cleanup error:', err);
    }
    setCurrentUser(null);
    setAuthError(null);
  };

  // Attendance Marking
  const handleMarkAttendance = async (
    action: 'DAY_IN' | 'SHORT_BREAK_START' | 'SHORT_BREAK_END' | 'LUNCH_BREAK_START' | 'LUNCH_BREAK_END' | 'DAY_OUT',
    timestamp: string
  ) => {
    if (!currentUser || currentUser.type !== 'student') return;

    const today = formatDateKey();
    const updatedRecord = await api.markAttendance({
      studentId: currentUser.student.id,
      studentName: currentUser.student.name,
      date: today,
      action,
      timestamp,
      location: 'JIT Campus Verified',
    });

    setAttendanceRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === updatedRecord.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedRecord;
        return next;
      }
      return [updatedRecord, ...prev];
    });
  };

  // Day End Report Submission
  const handleSubmitReport = async (topic: string, content: string) => {
    if (!currentUser || currentUser.type !== 'student') return;

    const today = formatDateKey();
    const report = await api.submitReport({
      studentId: currentUser.student.id,
      studentName: currentUser.student.name,
      date: today,
      topic,
      content,
    });

    setReports((prev) => {
      const filtered = prev.filter((r) => r.id !== report.id);
      return [report, ...filtered];
    });
  };

  // Student Profile Update
  const handleUpdateProfile = async (updates: {
    collegeName: string;
    branch: string;
    rollNo: string;
    phone: string;
    email: string;
    quickLoginEnabled: boolean;
    password?: string;
  }) => {
    if (!currentUser || currentUser.type !== 'student') return;

    const updated = await api.updateStudentProfile(currentUser.student.id, updates);
    setCurrentUser({ type: 'student', student: updated });

    setStudents((prev) =>
      prev.map((s) => (s.id.toLowerCase() === updated.id.toLowerCase() ? updated : s))
    );
  };

  // Admin: Add Student
  const handleAddStudent = async (newStudent: {
    name: string;
    collegeName?: string;
    branch?: string;
    rollNo?: string;
    phone?: string;
    email?: string;
    password?: string;
  }) => {
    const created = await api.addStudent(newStudent);
    setStudents((prev) => [...prev, created]);
  };

  // Admin: Delete Student
  const handleDeleteStudent = async (id: string) => {
    await api.deleteStudent(id);
    setStudents((prev) => prev.filter((s) => s.id.toLowerCase() !== id.toLowerCase()));
    setAttendanceRecords((prev) =>
      prev.filter((r) => r.studentId.toLowerCase() !== id.toLowerCase())
    );
    setReports((prev) =>
      prev.filter((rp) => rp.studentId.toLowerCase() !== id.toLowerCase())
    );
  };

  // Admin: Update Student
  const handleUpdateStudent = async (id: string, updates: Partial<Student>) => {
    const updated = await api.updateStudentProfile(id, updates as any);
    setStudents((prev) =>
      prev.map((s) => (s.id.toLowerCase() === id.toLowerCase() ? updated : s))
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        bypassTimeWindows={bypassTimeWindows}
        onToggleBypass={() => setBypassTimeWindows((prev) => !prev)}
      />

      {/* Main Content Body */}
      <main className="flex-1">
        {!currentUser && (
          <LoginView
            students={students}
            onStudentLogin={handleStudentLogin}
            onAdminLogin={handleAdminLogin}
            error={authError}
            loading={loading}
            clearError={() => setAuthError(null)}
          />
        )}

        {currentUser?.type === 'student' && (
          <StudentPortal
            student={currentUser.student}
            records={attendanceRecords}
            reports={reports}
            bypassTimeWindows={bypassTimeWindows}
            onLogout={handleLogout}
            onMarkAttendance={handleMarkAttendance}
            onSubmitReport={handleSubmitReport}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {currentUser?.type === 'admin' && (
          <AdminPortal
            admin={currentUser.admin}
            students={students}
            attendanceRecords={attendanceRecords}
            reports={reports}
            onRefreshData={loadData}
            onLogout={handleLogout}
            onAddStudent={handleAddStudent}
            onDeleteStudent={handleDeleteStudent}
            onUpdateStudent={handleUpdateStudent}
          />
        )}
      </main>

      {/* Collegiate Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Jyothi Technologies batch 1 (Seniors) • Jyothy Institute of Technology
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-600">
            <span>SQLite Centralized DB</span>
            <span>•</span>
            <span>12°50'32.4"N 77°30'45.0"E</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
