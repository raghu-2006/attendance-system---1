import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Student, AdminUser, AttendanceRecord, DayEndReport } from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'attendance.sqlite');
const BACKUP_JSON = path.join(DATA_DIR, 'attendance_backup.json');

// Initial 15 students required by user
const INITIAL_STUDENT_NAMES = [
  'PUNYA SHREE S',
  'VARSHA M',
  'PREETHI S',
  'TANU SHREE K',
  'JAYASHREE N',
  'SURAKSHA R',
  'BHUMIKA BR',
  'SHAINAJABI NADAF',
  'SANJANA R',
  'NANDAN H',
  'RIKITHA CH',
  'LAKSHMI BHOOTALI',
  'DHANUSHREE R',
  'DEEPIKA CH',
  'SHASHIDHARA N R',
];

export function generateDefaultPassword(name: string): string {
  const lettersOnly = name.replace(/[^a-zA-Z]/g, '').toLowerCase();
  const first4 = lettersOnly.slice(0, 4) || 'user';
  return `${first4}@123`;
}

let dbInstance: Database | null = null;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
      console.log('[DB] Loaded existing SQLite database from disk.');
    } catch (err) {
      console.error('[DB] Error reading SQLite file, recreating:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
    console.log('[DB] Initialized fresh SQLite in-memory instance.');
  }

  // Create tables if not exists
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      collegeName TEXT NOT NULL DEFAULT 'Jyothy Institute of Technology',
      branch TEXT NOT NULL DEFAULT 'Computer Science & Engineering',
      rollNo TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      quickLoginEnabled INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin'
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      studentName TEXT NOT NULL,
      date TEXT NOT NULL,
      dayInTime TEXT,
      shortBreakStart TEXT,
      shortBreakEnd TEXT,
      lunchBreakStart TEXT,
      lunchBreakEnd TEXT,
      dayOutTime TEXT,
      status TEXT NOT NULL,
      location TEXT,
      lastUpdated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      studentName TEXT NOT NULL,
      date TEXT NOT NULL,
      topic TEXT,
      content TEXT NOT NULL,
      wordCount INTEGER NOT NULL,
      submittedAt TEXT NOT NULL
    );
  `);

  // Seed default admins if empty
  const adminCountRes = dbInstance.exec('SELECT count(*) as count FROM admins');
  const adminCount = adminCountRes[0]?.values[0]?.[0] as number;
  if (!adminCount || adminCount === 0) {
    console.log('[DB] Seeding default administrators (admin, damodar, karan kumar)...');
    const adminStmt = dbInstance.prepare('INSERT OR REPLACE INTO admins (id, name, password, role) VALUES (?, ?, ?, ?)');
    
    adminStmt.run(['admin', 'Admin', 'admin@123', 'superadmin']);
    adminStmt.run(['damodar', 'Damodar', 'damo@123', 'admin']);
    adminStmt.run(['karan kumar', 'Karan Kumar', 'karan@123', 'admin']);
    adminStmt.run(['karan', 'Karan Kumar', 'karan@123', 'admin']); // alias for convenience
    adminStmt.free();
  }

  // Seed initial students if empty
  const studentCountRes = dbInstance.exec('SELECT count(*) as count FROM students');
  const studentCount = studentCountRes[0]?.values[0]?.[0] as number;
  if (!studentCount || studentCount === 0) {
    console.log('[DB] Seeding initial 15 students for Jyothi Technologies batch 1 (Seniors)...');
    const studentStmt = dbInstance.prepare(`
      INSERT OR REPLACE INTO students 
      (id, name, password, collegeName, branch, rollNo, phone, email, quickLoginEnabled, createdAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    INITIAL_STUDENT_NAMES.forEach((name, idx) => {
      const rollSeq = String(idx + 1).padStart(3, '0');
      const rollNo = `1JT22CS${rollSeq}`;
      const password = generateDefaultPassword(name);
      studentStmt.run([
        name,
        name,
        password,
        'Jyothy Institute of Technology',
        'Computer Science & Engineering',
        rollNo,
        '',
        '',
        1,
        new Date().toISOString(),
      ]);
    });
    studentStmt.free();
  }

  // Ensure "rahul sharma" is removed if ever present
  dbInstance.run("DELETE FROM students WHERE LOWER(id) LIKE '%rahul sharma%' OR LOWER(name) LIKE '%rahul sharma%'");

  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);

    // Save JSON mirror backup for maximum durability
    const students = getAllStudentsInternal();
    const admins = getAllAdminsInternal();
    const attendance = getAllAttendanceInternal();
    const reports = getAllReportsInternal();

    fs.writeFileSync(
      BACKUP_JSON,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          students,
          admins,
          attendance,
          reports,
        },
        null,
        2
      )
    );
  } catch (err) {
    console.error('[DB] Error saving database to disk:', err);
  }
}

function getAllStudentsInternal(): Student[] {
  if (!dbInstance) return [];
  const res = dbInstance.exec('SELECT * FROM students ORDER BY name ASC');
  if (!res.length) return [];
  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    obj.quickLoginEnabled = obj.quickLoginEnabled === 1;
    return obj as Student;
  });
}

function getAllAdminsInternal(): AdminUser[] {
  if (!dbInstance) return [];
  const res = dbInstance.exec('SELECT * FROM admins');
  if (!res.length) return [];
  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as AdminUser;
  });
}

function getAllAttendanceInternal(): AttendanceRecord[] {
  if (!dbInstance) return [];
  const res = dbInstance.exec('SELECT * FROM attendance ORDER BY date DESC, lastUpdated DESC');
  if (!res.length) return [];
  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as AttendanceRecord;
  });
}

function getAllReportsInternal(): DayEndReport[] {
  if (!dbInstance) return [];
  const res = dbInstance.exec('SELECT * FROM reports ORDER BY submittedAt DESC');
  if (!res.length) return [];
  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as DayEndReport;
  });
}

// Public DB API methods
export async function getStudents(): Promise<Student[]> {
  await getDb();
  return getAllStudentsInternal();
}

export async function getStudentById(id: string): Promise<Student | null> {
  await getDb();
  const db = dbInstance!;
  const stmt = db.prepare('SELECT * FROM students WHERE LOWER(id) = LOWER(?) OR LOWER(name) = LOWER(?)');
  stmt.bind([id, id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return {
      ...(row as any),
      quickLoginEnabled: row.quickLoginEnabled === 1,
    } as Student;
  }
  stmt.free();
  return null;
}

export async function addStudent(student: {
  name: string;
  collegeName?: string;
  branch?: string;
  rollNo?: string;
  phone?: string;
  email?: string;
  password?: string;
}): Promise<Student> {
  const db = await getDb();
  const cleanName = student.name.trim();
  const id = cleanName;
  const password = student.password?.trim() || generateDefaultPassword(cleanName);
  const collegeName = student.collegeName?.trim() || 'Jyothy Institute of Technology';
  const branch = student.branch?.trim() || 'Computer Science & Engineering';
  const rollNo = student.rollNo?.trim() || `1JT22CS${Math.floor(100 + Math.random() * 900)}`;
  const phone = student.phone?.trim() || '';
  const email = student.email?.trim() || '';
  const quickLoginEnabled = 1;
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO students 
    (id, name, password, collegeName, branch, rollNo, phone, email, quickLoginEnabled, createdAt) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run([id, cleanName, password, collegeName, branch, rollNo, phone, email, quickLoginEnabled, createdAt]);
  stmt.free();

  saveDb();

  return {
    id,
    name: cleanName,
    password,
    collegeName,
    branch,
    rollNo,
    phone,
    email,
    quickLoginEnabled: true,
    createdAt,
  };
}

export async function updateStudentProfile(
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
): Promise<Student | null> {
  const db = await getDb();
  const existing = await getStudentById(id);
  if (!existing) return null;

  const newCollegeName = updates.collegeName !== undefined ? updates.collegeName : existing.collegeName;
  const newBranch = updates.branch !== undefined ? updates.branch : existing.branch;
  const newRollNo = updates.rollNo !== undefined ? updates.rollNo : existing.rollNo;
  const newPhone = updates.phone !== undefined ? updates.phone : (existing.phone || '');
  const newEmail = updates.email !== undefined ? updates.email : (existing.email || '');
  const newQuick = updates.quickLoginEnabled !== undefined ? (updates.quickLoginEnabled ? 1 : 0) : (existing.quickLoginEnabled ? 1 : 0);
  const newPass = updates.password !== undefined && updates.password.trim() !== '' ? updates.password.trim() : existing.password;

  const stmt = db.prepare(`
    UPDATE students 
    SET collegeName = ?, branch = ?, rollNo = ?, phone = ?, email = ?, quickLoginEnabled = ?, password = ?
    WHERE LOWER(id) = LOWER(?) OR LOWER(name) = LOWER(?)
  `);
  stmt.run([newCollegeName, newBranch, newRollNo, newPhone, newEmail, newQuick, newPass, id, id]);
  stmt.free();

  saveDb();
  return getStudentById(id);
}

export async function deleteStudent(id: string): Promise<boolean> {
  const db = await getDb();
  const stmt = db.prepare('DELETE FROM students WHERE LOWER(id) = LOWER(?) OR LOWER(name) = LOWER(?)');
  stmt.run([id, id]);
  stmt.free();

  // Also clean related records
  const attStmt = db.prepare('DELETE FROM attendance WHERE LOWER(studentId) = LOWER(?)');
  attStmt.run([id]);
  attStmt.free();

  const repStmt = db.prepare('DELETE FROM reports WHERE LOWER(studentId) = LOWER(?)');
  repStmt.run([id]);
  repStmt.free();

  saveDb();
  return true;
}

export async function getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
  await getDb();
  const db = dbInstance!;
  const stmt = db.prepare('SELECT * FROM attendance WHERE date = ?');
  stmt.bind([date]);
  const records: AttendanceRecord[] = [];
  while (stmt.step()) {
    records.push(stmt.getAsObject() as unknown as AttendanceRecord);
  }
  stmt.free();
  return records;
}

export async function getAttendanceForStudent(studentId: string): Promise<AttendanceRecord[]> {
  await getDb();
  const db = dbInstance!;
  const stmt = db.prepare('SELECT * FROM attendance WHERE LOWER(studentId) = LOWER(?) ORDER BY date DESC');
  stmt.bind([studentId]);
  const records: AttendanceRecord[] = [];
  while (stmt.step()) {
    records.push(stmt.getAsObject() as unknown as AttendanceRecord);
  }
  stmt.free();
  return records;
}

export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  await getDb();
  return getAllAttendanceInternal();
}

export async function markAttendance(payload: {
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  action: 'DAY_IN' | 'SHORT_BREAK_START' | 'SHORT_BREAK_END' | 'LUNCH_BREAK_START' | 'LUNCH_BREAK_END' | 'DAY_OUT';
  timestamp: string; // formatted e.g. "09:05:12 AM"
  location?: string;
}): Promise<AttendanceRecord> {
  const db = await getDb();
  const recordId = `${payload.studentId}_${payload.date}`;

  // Find existing record for this student and date
  const stmt = db.prepare('SELECT * FROM attendance WHERE id = ?');
  stmt.bind([recordId]);
  let existing: any = null;
  if (stmt.step()) {
    existing = stmt.getAsObject();
  }
  stmt.free();

  const nowIso = new Date().toISOString();
  let dayInTime = existing?.dayInTime || null;
  let shortBreakStart = existing?.shortBreakStart || null;
  let shortBreakEnd = existing?.shortBreakEnd || null;
  let lunchBreakStart = existing?.lunchBreakStart || null;
  let lunchBreakEnd = existing?.lunchBreakEnd || null;
  let dayOutTime = existing?.dayOutTime || null;
  let status = existing?.status || 'NOT_STARTED';

  switch (payload.action) {
    case 'DAY_IN':
      dayInTime = payload.timestamp;
      status = 'PRESENT';
      break;
    case 'SHORT_BREAK_START':
      shortBreakStart = payload.timestamp;
      status = 'SHORT_BREAK';
      break;
    case 'SHORT_BREAK_END':
      shortBreakEnd = payload.timestamp;
      status = 'PRESENT';
      break;
    case 'LUNCH_BREAK_START':
      lunchBreakStart = payload.timestamp;
      status = 'LUNCH_BREAK';
      break;
    case 'LUNCH_BREAK_END':
      lunchBreakEnd = payload.timestamp;
      status = 'PRESENT';
      break;
    case 'DAY_OUT':
      dayOutTime = payload.timestamp;
      status = 'DAY_OUT';
      break;
  }

  const upsertStmt = db.prepare(`
    INSERT OR REPLACE INTO attendance 
    (id, studentId, studentName, date, dayInTime, shortBreakStart, shortBreakEnd, lunchBreakStart, lunchBreakEnd, dayOutTime, status, location, lastUpdated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  upsertStmt.run([
    recordId,
    payload.studentId,
    payload.studentName,
    payload.date,
    dayInTime,
    shortBreakStart,
    shortBreakEnd,
    lunchBreakStart,
    lunchBreakEnd,
    dayOutTime,
    status,
    payload.location || existing?.location || 'Verified (Device)',
    nowIso,
  ]);
  upsertStmt.free();

  saveDb();

  return {
    id: recordId,
    studentId: payload.studentId,
    studentName: payload.studentName,
    date: payload.date,
    dayInTime,
    shortBreakStart,
    shortBreakEnd,
    lunchBreakStart,
    lunchBreakEnd,
    dayOutTime,
    status: status as any,
    location: payload.location || existing?.location || 'Verified (Device)',
    lastUpdated: nowIso,
  };
}

export async function getReports(filters?: { date?: string; studentId?: string }): Promise<DayEndReport[]> {
  await getDb();
  const db = dbInstance!;
  let query = 'SELECT * FROM reports WHERE 1=1';
  const params: string[] = [];

  if (filters?.date) {
    query += ' AND date = ?';
    params.push(filters.date);
  }
  if (filters?.studentId) {
    query += ' AND LOWER(studentId) = LOWER(?)';
    params.push(filters.studentId);
  }
  query += ' ORDER BY submittedAt DESC';

  const stmt = db.prepare(query);
  if (params.length > 0) stmt.bind(params);

  const reports: DayEndReport[] = [];
  while (stmt.step()) {
    reports.push(stmt.getAsObject() as unknown as DayEndReport);
  }
  stmt.free();
  return reports;
}

export async function saveReport(report: {
  studentId: string;
  studentName: string;
  date: string;
  topic?: string;
  content: string;
}): Promise<DayEndReport> {
  const db = await getDb();
  const id = `${report.studentId}_${report.date}`;
  const words = report.content.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const submittedAt = new Date().toISOString();
  const topic = report.topic?.trim() || 'Daily Learning Summary';

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO reports 
    (id, studentId, studentName, date, topic, content, wordCount, submittedAt) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run([id, report.studentId, report.studentName, report.date, topic, report.content, wordCount, submittedAt]);
  stmt.free();

  saveDb();

  return {
    id,
    studentId: report.studentId,
    studentName: report.studentName,
    date: report.date,
    topic,
    content: report.content,
    wordCount,
    submittedAt,
  };
}

export async function getAdmins(): Promise<AdminUser[]> {
  await getDb();
  return getAllAdminsInternal();
}
