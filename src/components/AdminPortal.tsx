import React, { useState, useMemo } from 'react';
import {
  Users,
  Clock,
  FileText,
  UserPlus,
  Trash2,
  Edit,
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Utensils,
  RefreshCw,
  Eye,
  Shield,
  Building,
  GraduationCap,
  Sparkles,
  LogOut,
} from 'lucide-react';
import type { Student, AdminUser, AttendanceRecord, DayEndReport } from '../types.js';
import { formatDateKey, formatFriendlyDate, getDeviceTime } from '../utils/time.js';

interface AdminPortalProps {
  admin: AdminUser;
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  reports: DayEndReport[];
  onRefreshData: () => Promise<void>;
  onLogout: () => void;
  onAddStudent: (student: {
    name: string;
    collegeName?: string;
    branch?: string;
    rollNo?: string;
    phone?: string;
    email?: string;
    password?: string;
  }) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  onUpdateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  admin,
  students,
  attendanceRecords,
  reports,
  onRefreshData,
  onLogout,
  onAddStudent,
  onDeleteStudent,
  onUpdateStudent,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'students' | 'reports' | 'export'>('attendance');
  const [selectedDate, setSelectedDate] = useState<string>(formatDateKey());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'BREAK' | 'DAY_OUT' | 'NOT_STARTED'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [newStudentCollege, setNewStudentCollege] = useState('Jyothy Institute of Technology');
  const [newStudentBranch, setNewStudentBranch] = useState('Computer Science & Engineering');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPass, setNewStudentPass] = useState('');

  // Delete Confirmation Modal State
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // View Report Modal State
  const [selectedReport, setSelectedReport] = useState<DayEndReport | null>(null);

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editCollege, setEditCollege] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editRoll, setEditRoll] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshData();
    setIsRefreshing(false);
  };

  // Records for selected date
  const recordsForDate = useMemo(() => {
    return attendanceRecords.filter((r) => r.date === selectedDate);
  }, [attendanceRecords, selectedDate]);

  // Combined student view with attendance status
  const studentsWithStatus = useMemo(() => {
    return students.map((s) => {
      const rec = recordsForDate.find((r) => r.studentId.toLowerCase() === s.id.toLowerCase());
      const report = reports.find(
        (rp) => rp.studentId.toLowerCase() === s.id.toLowerCase() && rp.date === selectedDate
      );
      return {
        student: s,
        record: rec,
        report,
        status: rec?.status || 'NOT_STARTED',
      };
    });
  }, [students, recordsForDate, reports, selectedDate]);

  // Filtered student list
  const filteredList = useMemo(() => {
    return studentsWithStatus.filter((item) => {
      const matchesSearch =
        item.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.student.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.student.branch.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'PRESENT') return item.status === 'PRESENT';
      if (statusFilter === 'BREAK') return item.status === 'SHORT_BREAK' || item.status === 'LUNCH_BREAK';
      if (statusFilter === 'DAY_OUT') return item.status === 'DAY_OUT';
      if (statusFilter === 'NOT_STARTED') return item.status === 'NOT_STARTED';

      return true;
    });
  }, [studentsWithStatus, searchTerm, statusFilter]);

  // Quick Stats
  const totalCount = students.length;
  const presentCount = studentsWithStatus.filter(
    (s) => s.status === 'PRESENT' || s.status === 'DAY_OUT' || s.status === 'SHORT_BREAK' || s.status === 'LUNCH_BREAK'
  ).length;
  const onBreakCount = studentsWithStatus.filter(
    (s) => s.status === 'SHORT_BREAK' || s.status === 'LUNCH_BREAK'
  ).length;
  const dayOutCount = studentsWithStatus.filter((s) => s.status === 'DAY_OUT').length;
  const absentCount = studentsWithStatus.filter((s) => s.status === 'NOT_STARTED').length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Handle Add Student
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    await onAddStudent({
      name: newStudentName.trim(),
      rollNo: newStudentRoll.trim() || undefined,
      collegeName: newStudentCollege.trim(),
      branch: newStudentBranch.trim(),
      phone: newStudentPhone.trim(),
      email: newStudentEmail.trim(),
      password: newStudentPass.trim() || undefined,
    });

    setNewStudentName('');
    setNewStudentRoll('');
    setNewStudentPhone('');
    setNewStudentEmail('');
    setNewStudentPass('');
    setShowAddModal(false);
  };

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!studentToDelete) return;
    await onDeleteStudent(studentToDelete.id);
    setStudentToDelete(null);
  };

  // Open Edit Modal
  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setEditCollege(student.collegeName);
    setEditBranch(student.branch);
    setEditRoll(student.rollNo);
    setEditPhone(student.phone || '');
    setEditEmail(student.email || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    await onUpdateStudent(editingStudent.id, {
      collegeName: editCollege.trim(),
      branch: editBranch.trim(),
      rollNo: editRoll.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
    });
    setEditingStudent(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Student Name',
      'Roll Number',
      'Branch',
      'College',
      'Date',
      'Status',
      'Day In Time',
      'Short Break Start',
      'Short Break End',
      'Lunch Break Start',
      'Lunch Break End',
      'Day Out Time',
      'Report Submitted',
      'Report Word Count',
    ];

    const rows = studentsWithStatus.map((item) => [
      `"${item.student.name}"`,
      `"${item.student.rollNo}"`,
      `"${item.student.branch}"`,
      `"${item.student.collegeName}"`,
      `"${selectedDate}"`,
      `"${item.status}"`,
      `"${item.record?.dayInTime || ''}"`,
      `"${item.record?.shortBreakStart || ''}"`,
      `"${item.record?.shortBreakEnd || ''}"`,
      `"${item.record?.lunchBreakStart || ''}"`,
      `"${item.record?.lunchBreakEnd || ''}"`,
      `"${item.record?.dayOutTime || ''}"`,
      `"${item.report ? 'YES' : 'NO'}"`,
      `"${item.report?.wordCount || 0}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Jyothi_Tech_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Admin Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/60 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl font-black ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-600/30">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Administrator Command Center
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {admin.name} ({admin.id})
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Centralized SQL Database • Jyothi Technologies batch 1 (Seniors)
              </p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Jyothy Institute of Technology
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Sync Database'}</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Student</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-rose-950/40"
              title="Log out from administrator portal"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Live Timestamps & Roster</span>
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'students'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manage Students ({students.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Day End Reports ({reports.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-900'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export & Records</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Live Timestamps & Attendance Ledger */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Metrics summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Total Enrolled</div>
              <div className="text-2xl font-black text-white font-mono mt-1">{totalCount}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
              <div className="text-[10px] text-emerald-400 uppercase font-bold">Present Today</div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{presentCount}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
              <div className="text-[10px] text-amber-400 uppercase font-bold">On Break</div>
              <div className="text-2xl font-black text-amber-400 font-mono mt-1">{onBreakCount}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
              <div className="text-[10px] text-teal-400 uppercase font-bold">Day Out Done</div>
              <div className="text-2xl font-black text-teal-400 font-mono mt-1">{dayOutCount}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Not Logged</div>
              <div className="text-2xl font-black text-slate-400 font-mono mt-1">{absentCount}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
              <div className="text-[10px] text-indigo-400 uppercase font-bold">Attendance %</div>
              <div className="text-2xl font-black text-indigo-400 font-mono mt-1">{attendanceRate}%</div>
            </div>
          </div>

          {/* Search, Date, and Filter Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Date Selector */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs text-white">
                <CalendarIcon className="w-4 h-4 text-emerald-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-white font-mono text-xs focus:outline-none"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                {(['ALL', 'PRESENT', 'BREAK', 'DAY_OUT', 'NOT_STARTED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'ALL' && 'All'}
                    {st === 'PRESENT' && 'Present'}
                    {st === 'BREAK' && 'On Break'}
                    {st === 'DAY_OUT' && 'Day Out'}
                    {st === 'NOT_STARTED' && 'Not Logged'}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, roll no, branch..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Database Attendance Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Centralized Attendance Timestamps ({filteredList.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Permanent SQLite database records for {formatFriendlyDate(selectedDate)}
                </p>
              </div>

              <div className="text-xs text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-900/50 px-2.5 py-1 rounded-lg">
                Auto-syncing active
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Student & Roll No</th>
                    <th className="py-3.5 px-4">College & Branch</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Day In Time</th>
                    <th className="py-3.5 px-4">Short Break (11:20-11:35)</th>
                    <th className="py-3.5 px-4">Lunch Break (1:00-2:00)</th>
                    <th className="py-3.5 px-4">Day Out Time</th>
                    <th className="py-3.5 px-4">Day End Report</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-900/40 font-mono">
                  {filteredList.map(({ student, record, report, status }) => (
                    <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-white text-xs">{student.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{student.rollNo}</div>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <div className="text-xs text-slate-300 font-medium">{student.branch}</div>
                        <div className="text-[10px] text-slate-500">{student.collegeName}</div>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            status === 'PRESENT'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : status === 'SHORT_BREAK'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : status === 'LUNCH_BREAK'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : status === 'DAY_OUT'
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {status === 'NOT_STARTED' && 'NOT LOGGED'}
                          {status === 'PRESENT' && 'DAY IN'}
                          {status === 'SHORT_BREAK' && 'SHORT BREAK'}
                          {status === 'LUNCH_BREAK' && 'LUNCH BREAK'}
                          {status === 'DAY_OUT' && 'DAY OUT'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold">
                        {record?.dayInTime || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-amber-400">
                        {record?.shortBreakStart
                          ? `${record.shortBreakStart} - ${record.shortBreakEnd || 'Active'}`
                          : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-indigo-400">
                        {record?.lunchBreakStart
                          ? `${record.lunchBreakStart} - ${record.lunchBreakEnd || 'Active'}`
                          : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-rose-400 font-bold">
                        {record?.dayOutTime || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        {report ? (
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 text-[11px] font-semibold cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Read ({report.wordCount}w)</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[11px]">Pending</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <button
                          onClick={() => openEditModal(student)}
                          title="Edit Student Profile"
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors mr-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setStudentToDelete(student)}
                          title="Remove Student from Database"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 font-sans text-xs">
                        No students found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Student Database & Management */}
      {activeTab === 'students' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Student Database Management
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Admins have full authority to add and remove students from the database and website.
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Student</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Student Name (Login ID)</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">College</th>
                  <th className="py-3 px-4">Password</th>
                  <th className="py-3 px-4">Quick Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                {students.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-sans font-bold text-white">
                      {st.name}
                    </td>
                    <td className="py-3 px-4 text-indigo-400">{st.rollNo}</td>
                    <td className="py-3 px-4 font-sans text-slate-300">{st.branch}</td>
                    <td className="py-3 px-4 font-sans text-slate-400">{st.collegeName}</td>
                    <td className="py-3 px-4 text-emerald-400">
                      <code>{st.password}</code>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          st.quickLoginEnabled !== false
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {st.quickLoginEnabled !== false ? 'Enabled' : 'Hidden'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => openEditModal(st)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold mr-2 cursor-pointer transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setStudentToDelete(st)}
                        className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Day End Reports */}
      {activeTab === 'reports' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
          <div className="pb-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Student Daily Learning Reports
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Inspect what students learned each day (up to 3000 words per student).
              </p>
            </div>

            <div className="text-xs font-mono text-emerald-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              Total Reports: {reports.length}
            </div>
          </div>

          <div className="space-y-4">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="font-extrabold text-white text-sm">
                      {rep.studentName}
                    </span>
                    <span className="text-slate-400 ml-2">
                      Topic: <strong className="text-emerald-400">{rep.topic || 'Daily Summary'}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                    <span>{formatFriendlyDate(rep.date)}</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300">
                      {rep.wordCount} words
                    </span>
                    <button
                      onClick={() => setSelectedReport(rep)}
                      className="text-xs text-emerald-400 hover:underline font-sans cursor-pointer font-bold"
                    >
                      View Full
                    </button>
                  </div>
                </div>

                <p className="text-slate-300 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                  {rep.content}
                </p>
              </div>
            ))}

            {reports.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No day end reports submitted yet by students.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Export to CSV */}
      {activeTab === 'export' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
          <div className="pb-6 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-400" />
              Export Attendance & Database Records
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Generate CSV spreadsheets of attendance timestamps, reports, and student logs for college administrative records.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 max-w-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Daily Attendance Ledger (CSV)</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Exports Day In, Short Break, Lunch Break, Day Out, and report status for {formatFriendlyDate(selectedDate)}
                </div>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Add Student */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              Add Student to Database
            </h3>
            <p className="text-xs text-slate-400">
              New student will be permanently registered in the SQL database.
            </p>

            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="e.g. ADITYA SHETTY"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Roll Number</label>
                <input
                  type="text"
                  value={newStudentRoll}
                  onChange={(e) => setNewStudentRoll(e.target.value)}
                  placeholder="e.g. 1JT22CS016 (Auto if blank)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">College Name</label>
                <input
                  type="text"
                  value={newStudentCollege}
                  onChange={(e) => setNewStudentCollege(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Branch</label>
                <input
                  type="text"
                  value={newStudentBranch}
                  onChange={(e) => setNewStudentBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Custom Password (Optional)</label>
                <input
                  type="text"
                  value={newStudentPass}
                  onChange={(e) => setNewStudentPass(e.target.value)}
                  placeholder="Defaults to first4letters@123"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  Save to SQL DB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Delete Student Confirmation */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" />
              Remove Student
            </h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently remove{' '}
              <strong className="text-white">{studentToDelete.name}</strong> ({studentToDelete.rollNo}) from
              the database and website? This will permanently delete their profile and records.
            </p>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer text-xs"
              >
                Yes, Permanently Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Student */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit className="w-5 h-5 text-emerald-400" />
              Edit Student Details
            </h3>
            <p className="text-xs text-slate-400">
              Editing: <strong className="text-white">{editingStudent.name}</strong>
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Roll Number</label>
                <input
                  type="text"
                  required
                  value={editRoll}
                  onChange={(e) => setEditRoll(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Branch</label>
                <input
                  type="text"
                  required
                  value={editBranch}
                  onChange={(e) => setEditBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">College</label>
                <input
                  type="text"
                  required
                  value={editCollege}
                  onChange={(e) => setEditCollege(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Full Day End Report Viewer */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  {selectedReport.topic || 'Daily Learning Summary'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  By <strong className="text-white">{selectedReport.studentName}</strong> •{' '}
                  {formatFriendlyDate(selectedReport.date)} ({selectedReport.wordCount} words)
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto pr-2 text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed flex-1 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {selectedReport.content}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
