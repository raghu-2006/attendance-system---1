import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getStudents,
  getStudentById,
  addStudent,
  updateStudentProfile,
  deleteStudent,
  getAttendanceByDate,
  getAttendanceForStudent,
  getAllAttendance,
  markAttendance,
  getReports,
  saveReport,
  getAdmins,
} from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS / headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // --- API Routes ---

  // Health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Jyothi Technologies batch 1 (Seniors) - Smart Attendance Backend',
      timestamp: new Date().toISOString(),
    });
  });

  // 1. Students list
  app.get('/api/students', async (req, res) => {
    try {
      const students = await getStudents();
      res.json(students);
    } catch (err: any) {
      console.error('Error fetching students:', err);
      res.status(500).json({ error: 'Failed to fetch students' });
    }
  });

  // 2. Add student
  app.post('/api/students', async (req, res) => {
    try {
      const { name, collegeName, branch, rollNo, phone, email, password } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Student name is required' });
      }
      const newStudent = await addStudent({
        name,
        collegeName,
        branch,
        rollNo,
        phone,
        email,
        password,
      });
      res.status(201).json(newStudent);
    } catch (err: any) {
      console.error('Error adding student:', err);
      res.status(500).json({ error: 'Failed to add student' });
    }
  });

  // 3. Update student profile
  app.put('/api/students/:id/profile', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updated = await updateStudentProfile(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Student not found' });
      }
      res.json(updated);
    } catch (err: any) {
      console.error('Error updating student profile:', err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // 4. Delete student
  app.delete('/api/students/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await deleteStudent(id);
      res.json({ success: true, message: `Student ${id} removed` });
    } catch (err: any) {
      console.error('Error deleting student:', err);
      res.status(500).json({ error: 'Failed to delete student' });
    }
  });

  // 5. Student Login verification
  app.post('/api/auth/student', async (req, res) => {
    try {
      const { id, password } = req.body;
      if (!id || !password) {
        return res.status(400).json({ error: 'Student ID and password are required' });
      }
      const student = await getStudentById(id);
      if (!student) {
        return res.status(401).json({ error: 'Student ID not found in database' });
      }

      // Case-insensitive password check support or exact check
      const normalizedProvided = password.trim().toLowerCase();
      const normalizedStored = student.password.trim().toLowerCase();

      if (password.trim() === student.password || normalizedProvided === normalizedStored) {
        return res.json({ success: true, student });
      }

      return res.status(401).json({ error: 'Incorrect password. Format is first 4 letters of name@123' });
    } catch (err: any) {
      console.error('Error in student auth:', err);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // 6. Admin Login verification
  app.post('/api/auth/admin', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const admins = await getAdmins();
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();

      const matchedAdmin = admins.find(
        (a) =>
          (a.id.toLowerCase() === cleanUser || a.name.toLowerCase() === cleanUser) &&
          a.password === cleanPass
      );

      if (matchedAdmin) {
        return res.json({
          success: true,
          admin: {
            id: matchedAdmin.id,
            name: matchedAdmin.name,
            role: matchedAdmin.role,
          },
        });
      }

      return res.status(401).json({ error: 'Invalid admin credentials' });
    } catch (err: any) {
      console.error('Error in admin auth:', err);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // 7. Get attendance records
  app.get('/api/attendance', async (req, res) => {
    try {
      const { date, studentId } = req.query as { date?: string; studentId?: string };
      if (studentId) {
        const records = await getAttendanceForStudent(studentId);
        return res.json(records);
      }
      if (date) {
        const records = await getAttendanceByDate(date);
        return res.json(records);
      }
      const all = await getAllAttendance();
      return res.json(all);
    } catch (err: any) {
      console.error('Error getting attendance:', err);
      res.status(500).json({ error: 'Failed to get attendance records' });
    }
  });

  // 8. Mark attendance
  app.post('/api/attendance/mark', async (req, res) => {
    try {
      const { studentId, studentName, date, action, timestamp, location } = req.body;
      if (!studentId || !studentName || !date || !action || !timestamp) {
        return res.status(400).json({ error: 'Missing required attendance parameters' });
      }

      const record = await markAttendance({
        studentId,
        studentName,
        date,
        action,
        timestamp,
        location,
      });

      res.json({ success: true, record });
    } catch (err: any) {
      console.error('Error marking attendance:', err);
      res.status(500).json({ error: 'Failed to record attendance' });
    }
  });

  // 9. Day End Reports
  app.get('/api/reports', async (req, res) => {
    try {
      const { date, studentId } = req.query as { date?: string; studentId?: string };
      const reports = await getReports({ date, studentId });
      res.json(reports);
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  });

  app.post('/api/reports', async (req, res) => {
    try {
      const { studentId, studentName, date, topic, content } = req.body;
      if (!studentId || !studentName || !date || !content) {
        return res.status(400).json({ error: 'Missing required report fields' });
      }

      const words = content.trim().split(/\s+/).filter(Boolean);
      if (words.length > 3000) {
        return res.status(400).json({ error: `Report exceeds maximum 3000 words (currently ${words.length} words)` });
      }

      const saved = await saveReport({
        studentId,
        studentName,
        date,
        topic,
        content,
      });

      res.status(201).json({ success: true, report: saved });
    } catch (err: any) {
      console.error('Error saving report:', err);
      res.status(500).json({ error: 'Failed to submit report' });
    }
  });

  // In development, mount Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve dist folder
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Jyothi Technologies batch 1 (Seniors) running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER] Fatal startup error:', err);
  process.exit(1);
});
