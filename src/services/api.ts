import type { Student, AttendanceRecord, DayEndReport, AdminUser } from '../types.js';

const STORAGE_KEYS = {
  STUDENTS: 'jit_students_cache',
  ATTENDANCE: 'jit_attendance_cache',
  REPORTS: 'jit_reports_cache',
  ACTIVE_SESSION: 'jit_active_session',
  CONFIG: 'jit_app_config',
};

// Safe JSON parser
function safeParse<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage set failed:', e);
  }
}

export const api = {
  // Students
  async getStudents(): Promise<Student[]> {
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        const data = await res.json();
        safeSet(STORAGE_KEYS.STUDENTS, data);
        return data;
      }
    } catch (e) {
      console.warn('Network fetch failed, fallback to local storage', e);
    }
    return safeParse<Student[]>(STORAGE_KEYS.STUDENTS, []);
  },

  async addStudent(payload: {
    name: string;
    collegeName?: string;
    branch?: string;
    rollNo?: string;
    phone?: string;
    email?: string;
    password?: string;
  }): Promise<Student> {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add student');
    }
    const student = await res.json();
    // Update local cache
    const existing = safeParse<Student[]>(STORAGE_KEYS.STUDENTS, []);
    safeSet(STORAGE_KEYS.STUDENTS, [...existing, student]);
    return student;
  },

  async updateStudentProfile(
    id: string,
    updates: {
      collegeName?: string;
      branch?: string;
      rollNo?: string;
      phone?: string;
      email?: string;
      quickLoginEnabled?: boolean;
      password?: string;
    }
  ): Promise<Student> {
    const res = await fetch(`/api/students/${encodeURIComponent(id)}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update student profile');
    }
    const updated = await res.json();
    // Synchronize local cache immediately
    const existing = safeParse<Student[]>(STORAGE_KEYS.STUDENTS, []);
    const updatedList = existing.map((s) => (s.id.toLowerCase() === id.toLowerCase() ? updated : s));
    safeSet(STORAGE_KEYS.STUDENTS, updatedList);
    return updated;
  },

  async deleteStudent(id: string): Promise<boolean> {
    const res = await fetch(`/api/students/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete student');
    }
    const existing = safeParse<Student[]>(STORAGE_KEYS.STUDENTS, []);
    safeSet(
      STORAGE_KEYS.STUDENTS,
      existing.filter((s) => s.id.toLowerCase() !== id.toLowerCase())
    );
    return true;
  },

  // Auth
  async loginStudent(id: string, password: string): Promise<Student> {
    const res = await fetch('/api/auth/student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Invalid student credentials');
    }
    return data.student;
  },

  async loginAdmin(username: string, password: string): Promise<AdminUser> {
    const res = await fetch('/api/auth/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Invalid admin credentials');
    }
    return data.admin;
  },

  // Attendance
  async getAttendance(date?: string, studentId?: string): Promise<AttendanceRecord[]> {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (studentId) params.append('studentId', studentId);

      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (res.ok) {
        const records = await res.json();
        if (!date && !studentId) {
          safeSet(STORAGE_KEYS.ATTENDANCE, records);
        }
        return records;
      }
    } catch (e) {
      console.warn('Attendance fetch failed, using local backup', e);
    }
    const cached = safeParse<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    if (studentId) {
      return cached.filter((r) => r.studentId.toLowerCase() === studentId.toLowerCase());
    }
    if (date) {
      return cached.filter((r) => r.date === date);
    }
    return cached;
  },

  async markAttendance(payload: {
    studentId: string;
    studentName: string;
    date: string;
    action: 'DAY_IN' | 'SHORT_BREAK_START' | 'SHORT_BREAK_END' | 'LUNCH_BREAK_START' | 'LUNCH_BREAK_END' | 'DAY_OUT';
    timestamp: string;
    location?: string;
  }): Promise<AttendanceRecord> {
    const res = await fetch('/api/attendance/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record attendance');
    }
    const { record } = await res.json();

    // Update local cache
    const all = safeParse<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    const idx = all.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      all[idx] = record;
    } else {
      all.push(record);
    }
    safeSet(STORAGE_KEYS.ATTENDANCE, all);

    return record;
  },

  // Reports
  async getReports(date?: string, studentId?: string): Promise<DayEndReport[]> {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (studentId) params.append('studentId', studentId);

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        safeSet(STORAGE_KEYS.REPORTS, data);
        return data;
      }
    } catch (e) {
      console.warn('Reports fetch failed, using local backup', e);
    }
    return safeParse<DayEndReport[]>(STORAGE_KEYS.REPORTS, []);
  },

  async submitReport(payload: {
    studentId: string;
    studentName: string;
    date: string;
    topic?: string;
    content: string;
  }): Promise<DayEndReport> {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit day end report');
    }
    const { report } = await res.json();
    const reports = safeParse<DayEndReport[]>(STORAGE_KEYS.REPORTS, []);
    const filtered = reports.filter((r) => r.id !== report.id);
    safeSet(STORAGE_KEYS.REPORTS, [report, ...filtered]);
    return report;
  },
};
