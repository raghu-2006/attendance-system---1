import React, { useState, useEffect } from 'react';
import {
  Clock,
  Shield,
  User,
  LogOut,
  MapPin,
  Bell,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Volume2,
} from 'lucide-react';
import { formatTime12h, checkUpcomingBreakAlert, getDeviceTime } from '../utils/time.js';
import { notifyBreakIncoming, triggerDeviceVibration, playAlertChime } from '../utils/alert.js';
import type { Student, AdminUser } from '../types.js';

interface NavbarProps {
  currentUser: { type: 'student'; student: Student } | { type: 'admin'; admin: AdminUser } | null;
  onLogout: () => void;
  bypassTimeWindows: boolean;
  onToggleBypass: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  bypassTimeWindows,
  onToggleBypass,
}) => {
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(formatTime12h());
  const [breakAlert, setBreakAlert] = useState<{ breakName: string; minutesLeft: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = getDeviceTime();
      setCurrentTimeStr(formatTime12h(now));

      const alert = checkUpcomingBreakAlert(now);
      if (alert) {
        setBreakAlert({ breakName: alert.breakName, minutesLeft: alert.startsInMinutes });
        // Trigger vibration and chime at start of minute
        if (now.getSeconds() === 0) {
          notifyBreakIncoming(alert.breakName, alert.startsInMinutes);
        }
      } else {
        setBreakAlert(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleTestVibration = () => {
    triggerDeviceVibration([300, 150, 300, 150, 500]);
    playAlertChime();
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-lg">
      {/* 2-Minute Pre-Break Notification Banner */}
      {breakAlert && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 font-semibold text-sm flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-950" />
            <span>
              Upcoming Break Alert: <strong>{breakAlert.breakName}</strong> starts in {breakAlert.minutesLeft} minute(s)!
            </span>
          </div>
          <button
            onClick={handleTestVibration}
            className="text-xs bg-slate-950 text-amber-400 px-2.5 py-1 rounded font-bold hover:bg-slate-900 cursor-pointer"
          >
            Vibrate Phone
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & College Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-extrabold text-lg sm:text-xl tracking-wider">
              JT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  Jyothi Technologies batch 1 (Seniors)
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  JIT Campus
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>Jyothy Institute of Technology</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline-flex items-center text-slate-400 gap-1 text-[11px]">
                  <MapPin className="w-3 h-3 text-emerald-400" /> 12°50'32.4"N 77°30'45.0"E
                </span>
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Live Clock Based on Device */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-mono text-emerald-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentTimeStr}</span>
            </div>

            {/* Testing Window Bypass Toggle */}
            <button
              onClick={onToggleBypass}
              title="Toggle testing bypass to test attendance actions at any hour"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                bypassTimeWindows
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
              }`}
            >
              {bypassTimeWindows ? (
                <ToggleRight className="w-4 h-4 text-amber-400" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-slate-400" />
              )}
              <span className="hidden sm:inline">
                {bypassTimeWindows ? 'Bypass Windows (On)' : 'Time Window Lock'}
              </span>
            </button>

            {/* Test Alarm / Vibrate Button */}
            <button
              onClick={handleTestVibration}
              title="Test Phone Vibration & Sound Alert"
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-medium cursor-pointer transition-all"
            >
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Test Alert</span>
            </button>

            {/* Current User & Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-white">
                    {currentUser.type === 'student'
                      ? currentUser.student.name
                      : `${currentUser.admin.name} (Admin)`}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentUser.type === 'student'
                      ? currentUser.student.rollNo || 'Student'
                      : 'Administrator'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-indigo-500/30">
                  {currentUser.type === 'student' ? (
                    currentUser.student.name.charAt(0)
                  ) : (
                    <Shield className="w-4 h-4 text-white" />
                  )}
                </div>
                <button
                  onClick={onLogout}
                  title="Log out of system"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white transition-all text-xs font-bold cursor-pointer shadow-sm shadow-rose-950/40"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
