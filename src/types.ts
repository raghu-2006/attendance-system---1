export type AttendanceStatus =
  | 'NOT_STARTED'
  | 'PRESENT'
  | 'SHORT_BREAK'
  | 'LUNCH_BREAK'
  | 'DAY_OUT';

export interface Student {
  id: string; // Login ID (e.g. "PUNYA SHREE S")
  name: string;
  password: string; // e.g. "puny@123"
  collegeName: string; // e.g. "Jyothy Institute of Technology"
  branch: string; // e.g. "Computer Science & Engineering"
  rollNo: string; // e.g. "1JT22CS001"
  phone?: string;
  email?: string;
  quickLoginEnabled: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: string; // e.g. "admin", "damodar", "karan kumar"
  name: string;
  password: string;
  role: 'superadmin' | 'admin';
}

export interface AttendanceRecord {
  id: string; // `${studentId}_${date}`
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  dayInTime?: string | null; // e.g. "09:02:14 AM"
  shortBreakStart?: string | null; // e.g. "11:21:05 AM"
  shortBreakEnd?: string | null; // e.g. "11:32:10 AM"
  lunchBreakStart?: string | null; // e.g. "01:05:40 PM"
  lunchBreakEnd?: string | null; // e.g. "01:42:15 PM"
  dayOutTime?: string | null; // e.g. "04:15:30 PM"
  status: AttendanceStatus;
  location?: string | null;
  lastUpdated: string;
}

export interface DayEndReport {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  topic?: string;
  content: string; // up to 3000 words
  wordCount: number;
  submittedAt: string;
}

export interface ScheduleWindows {
  dayInStart: string; // "08:55"
  shortBreakStart: string; // "11:20"
  shortBreakEnd: string; // "11:35"
  lunchBreakStart: string; // "13:00"
  lunchBreakEnd: string; // "14:00"
  dayOutStart: string; // "16:00"
}

export interface LocationConfig {
  latitude: number;
  longitude: number;
  name: string;
  standardRadiusMeters: number;
  lunchRadiusMeters: number;
}
