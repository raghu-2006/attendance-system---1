export interface TimeCheckResult {
  allowed: boolean;
  reason?: string;
  windowInfo: string;
}

// College schedule configuration
export const SCHEDULE_CONFIG = {
  dayInStart: { hour: 8, minute: 55 }, // 8:55 AM
  shortBreakStart: { hour: 11, minute: 20 }, // 11:20 AM
  shortBreakEnd: { hour: 11, minute: 35 }, // 11:35 AM
  lunchBreakStart: { hour: 13, minute: 0 }, // 1:00 PM
  lunchBreakEnd: { hour: 14, minute: 0 }, // 2:00 PM
  dayOutStart: { hour: 16, minute: 0 }, // 4:00 PM
  // 2 minutes prior notifications
  shortBreakPreAlert: { hour: 11, minute: 18 },
  lunchBreakPreAlert: { hour: 12, minute: 58 },
};

export function getDeviceTime(): Date {
  return new Date();
}

export function formatDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTime12h(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatFriendlyDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function timeToMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function getCurrentMinutes(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Validates if an attendance action is allowed right now based on device time.
 * If bypassWindows is true (for testing/demo), all actions are allowed.
 */
export function validateAttendanceWindow(
  action: 'DAY_IN' | 'SHORT_BREAK_START' | 'SHORT_BREAK_END' | 'LUNCH_BREAK_START' | 'LUNCH_BREAK_END' | 'DAY_OUT',
  bypassWindows: boolean = false,
  customDate?: Date
): TimeCheckResult {
  if (bypassWindows) {
    return {
      allowed: true,
      windowInfo: 'Testing mode active: Time restrictions bypassed.',
    };
  }

  const now = customDate || getDeviceTime();
  const currentMinutes = getCurrentMinutes(now);

  const dayInMin = timeToMinutes(SCHEDULE_CONFIG.dayInStart.hour, SCHEDULE_CONFIG.dayInStart.minute); // 535 (8:55 AM)
  const shortBreakStartMin = timeToMinutes(SCHEDULE_CONFIG.shortBreakStart.hour, SCHEDULE_CONFIG.shortBreakStart.minute); // 680 (11:20 AM)
  const shortBreakEndMin = timeToMinutes(SCHEDULE_CONFIG.shortBreakEnd.hour, SCHEDULE_CONFIG.shortBreakEnd.minute); // 695 (11:35 AM)
  const lunchBreakStartMin = timeToMinutes(SCHEDULE_CONFIG.lunchBreakStart.hour, SCHEDULE_CONFIG.lunchBreakStart.minute); // 780 (1:00 PM)
  const lunchBreakEndMin = timeToMinutes(SCHEDULE_CONFIG.lunchBreakEnd.hour, SCHEDULE_CONFIG.lunchBreakEnd.minute); // 840 (2:00 PM)
  const dayOutMin = timeToMinutes(SCHEDULE_CONFIG.dayOutStart.hour, SCHEDULE_CONFIG.dayOutStart.minute); // 960 (4:00 PM)

  switch (action) {
    case 'DAY_IN': {
      if (currentMinutes < dayInMin) {
        return {
          allowed: false,
          reason: 'Day In is only permitted after 8:55 AM.',
          windowInfo: 'Window: After 8:55 AM',
        };
      }
      return {
        allowed: true,
        windowInfo: 'Window: After 8:55 AM (Valid)',
      };
    }

    case 'SHORT_BREAK_START':
    case 'SHORT_BREAK_END': {
      if (currentMinutes < shortBreakStartMin || currentMinutes > shortBreakEndMin) {
        return {
          allowed: false,
          reason: 'Short Break is strictly between 11:20 AM and 11:35 AM.',
          windowInfo: 'Window: 11:20 AM - 11:35 AM',
        };
      }
      return {
        allowed: true,
        windowInfo: 'Window: 11:20 AM - 11:35 AM (Valid)',
      };
    }

    case 'LUNCH_BREAK_START':
    case 'LUNCH_BREAK_END': {
      if (currentMinutes < lunchBreakStartMin || currentMinutes > lunchBreakEndMin) {
        return {
          allowed: false,
          reason: 'Lunch Break is strictly between 1:00 PM and 2:00 PM.',
          windowInfo: 'Window: 1:00 PM - 2:00 PM (13:00 - 14:00)',
        };
      }
      return {
        allowed: true,
        windowInfo: 'Window: 1:00 PM - 2:00 PM (Valid)',
      };
    }

    case 'DAY_OUT': {
      if (currentMinutes < dayOutMin) {
        return {
          allowed: false,
          reason: 'Day Out is only allowed after 4:00 PM.',
          windowInfo: 'Window: After 4:00 PM (16:00)',
        };
      }
      return {
        allowed: true,
        windowInfo: 'Window: After 4:00 PM (Valid)',
      };
    }
  }
}

/**
 * Checks if current time is within 2 minutes of an upcoming break
 */
export function checkUpcomingBreakAlert(date: Date = new Date()): {
  isAlert: boolean;
  breakName: string;
  startsInMinutes: number;
} | null {
  const curH = date.getHours();
  const curM = date.getMinutes();
  const curSec = date.getSeconds();

  // Short break at 11:20 -> Pre-alert at 11:18 AM
  if (curH === 11 && (curM === 18 || curM === 19)) {
    return {
      isAlert: true,
      breakName: 'Short Break (11:20 AM - 11:35 AM)',
      startsInMinutes: 20 - curM,
    };
  }

  // Lunch break at 13:00 -> Pre-alert at 12:58 PM
  if (curH === 12 && (curM === 58 || curM === 59)) {
    return {
      isAlert: true,
      breakName: 'Lunch Break (1:00 PM - 2:00 PM)',
      startsInMinutes: 60 - curM,
    };
  }

  return null;
}
