/**
 * Date and Time Utilities for Expo App
 * Handles timezone conversions and formatting for India Standard Time (IST)
 */

// India Standard Time offset: UTC+5:30
const IST_OFFSET_HOURS = 5;
const IST_OFFSET_MINUTES = 30;
const IST_OFFSET_MS = (IST_OFFSET_HOURS * 60 + IST_OFFSET_MINUTES) * 60 * 1000;

/**
 * Get current date and time in India Standard Time (IST)
 * @returns Date object adjusted to IST
 */
export const getCurrentISTTime = (): Date => {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utcTime + IST_OFFSET_MS);
  return istTime;
};

/**
 * Convert UTC date to IST
 * @param utcDate - Date in UTC
 * @returns Date object in IST
 */
export const convertUTCToIST = (utcDate: Date | string): Date => {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const utcTime = date.getTime();
  const istTime = new Date(utcTime + IST_OFFSET_MS);
  return istTime;
};

/**
 * Convert IST date to UTC
 * @param istDate - Date in IST
 * @returns Date object in UTC
 */
export const convertISTToUTC = (istDate: Date): Date => {
  const istTime = istDate.getTime();
  const utcTime = new Date(istTime - IST_OFFSET_MS);
  return utcTime;
};

/**
 * Format date for display in IST
 * @param date - Date to format
 * @param format - Format type ('date', 'time', 'datetime', 'full')
 * @returns Formatted string
 */
export const formatISTDate = (
  date: Date | string,
  format: 'date' | 'time' | 'datetime' | 'full' = 'datetime'
): string => {
  const istDate = typeof date === 'string' ? convertUTCToIST(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
  };
  
  switch (format) {
    case 'date':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = true;
      break;
    case 'datetime':
      options.year = 'numeric';
      options.month = 'short';
      options.day = 'numeric';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = true;
      break;
    case 'full':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      options.weekday = 'long';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = true;
      break;
  }
  
  return istDate.toLocaleString('en-IN', options);
};

/**
 * Get current timestamp in ISO format (UTC)
 * @returns ISO string in UTC
 */
export const getCurrentUTCTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Get current timestamp in IST ISO format
 * @returns ISO string in IST
 */
export const getCurrentISTTimestamp = (): string => {
  const istDate = getCurrentISTTime();
  return istDate.toISOString();
};

/**
 * Format time for attendance display (e.g., "09:30 AM")
 * @param date - Date to format
 * @returns Formatted time string
 */
export const formatAttendanceTime = (date: Date | string): string => {
  const istDate = typeof date === 'string' ? convertUTCToIST(date) : date;
  
  return istDate.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format date for attendance display (e.g., "27 Nov 2025")
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatAttendanceDate = (date: Date | string): string => {
  const istDate = typeof date === 'string' ? convertUTCToIST(date) : date;
  
  return istDate.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Get day of week for a date
 * @param date - Date to check
 * @returns Day name (e.g., "Monday")
 */
export const getDayOfWeek = (date: Date | string): string => {
  const istDate = typeof date === 'string' ? convertUTCToIST(date) : date;
  
  return istDate.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  });
};

/**
 * Check if a date is today (in IST)
 * @param date - Date to check
 * @returns true if date is today
 */
export const isToday = (date: Date | string): boolean => {
  const istDate = typeof date === 'string' ? convertUTCToIST(date) : date;
  const today = getCurrentISTTime();
  
  return (
    istDate.getDate() === today.getDate() &&
    istDate.getMonth() === today.getMonth() &&
    istDate.getFullYear() === today.getFullYear()
  );
};

/**
 * Get start of day in IST
 * @param date - Optional date (defaults to today)
 * @returns Date object at 00:00:00 IST
 */
export const getStartOfDayIST = (date?: Date): Date => {
  const istDate = date ? date : getCurrentISTTime();
  istDate.setHours(0, 0, 0, 0);
  return istDate;
};

/**
 * Get end of day in IST
 * @param date - Optional date (defaults to today)
 * @returns Date object at 23:59:59 IST
 */
export const getEndOfDayIST = (date?: Date): Date => {
  const istDate = date ? date : getCurrentISTTime();
  istDate.setHours(23, 59, 59, 999);
  return istDate;
};

/**
 * Calculate hours between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Hours as decimal number
 */
export const calculateHours = (startDate: Date | string, endDate: Date | string): number => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
};

/**
 * Format hours for display (e.g., "8.5 hrs" or "8h 30m")
 * @param hours - Hours as decimal
 * @param format - Format type ('decimal' or 'hm')
 * @returns Formatted string
 */
export const formatHours = (hours: number, format: 'decimal' | 'hm' = 'decimal'): string => {
  if (format === 'decimal') {
    return `${hours.toFixed(2)} hrs`;
  } else {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }
};

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * @param date - Date to compare
 * @returns Relative time string
 */
export const getRelativeTime = (date: Date | string): string => {
  const istDate = typeof date === 'string' ? convertUTCToIST(date) : date;
  const now = getCurrentISTTime();
  
  const diffMs = now.getTime() - istDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return formatAttendanceDate(istDate);
  }
};

/**
 * Log current time information for debugging
 */
export const logTimeInfo = () => {
  const now = new Date();
  const istTime = getCurrentISTTime();
  
  console.log('🕐 Time Information:');
  console.log('  Device Time:', now.toISOString());
  console.log('  Device Timezone Offset:', now.getTimezoneOffset(), 'minutes');
  console.log('  IST Time:', istTime.toISOString());
  console.log('  IST Formatted:', formatISTDate(istTime, 'full'));
  console.log('  UTC Timestamp:', getCurrentUTCTimestamp());
  console.log('  IST Timestamp:', getCurrentISTTimestamp());
};

// Export all functions
export default {
  getCurrentISTTime,
  convertUTCToIST,
  convertISTToUTC,
  formatISTDate,
  getCurrentUTCTimestamp,
  getCurrentISTTimestamp,
  formatAttendanceTime,
  formatAttendanceDate,
  getDayOfWeek,
  isToday,
  getStartOfDayIST,
  getEndOfDayIST,
  calculateHours,
  formatHours,
  getRelativeTime,
  logTimeInfo,
};
