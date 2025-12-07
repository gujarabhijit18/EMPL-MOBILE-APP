/**
 * Date and Time Utilities for Expo App
 * Handles timezone conversions and formatting for India Standard Time (IST)
 * 
 * STANDARD FORMATS:
 * - Date: DD-MM-YYYY (e.g., 05-12-2025)
 * - Time: hh:mm A (e.g., 09:30 AM)
 * - DateTime: DD-MM-YYYY hh:mm A (e.g., 05-12-2025 09:30 AM)
 * 
 * NOTE: All formatting uses timeZone: 'Asia/Kolkata' for IST regardless of device timezone.
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Convert any date input to a Date object
 */
const toDate = (date: Date | string | null | undefined): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  
  // Handle ISO strings and other formats
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
};

/**
 * Get current date and time
 * @returns Current Date object
 */
export const getCurrentISTTime = (): Date => {
  return new Date();
};

/**
 * Convert UTC date to IST
 * @param utcDate - Date in UTC
 * @returns Date object (use with formatters that specify Asia/Kolkata timezone)
 */
export const convertUTCToIST = (utcDate: Date | string): Date => {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return date;
};

/**
 * Convert IST date to UTC
 * @param istDate - Date in IST
 * @returns Date object in UTC
 */
export const convertISTToUTC = (istDate: Date): Date => {
  return istDate;
};

/**
 * Format date to DD-MM-YYYY in IST
 * @param date - Date to format
 * @returns Formatted date string (e.g., "05-12-2025")
 */
export const formatDateIST = (date: Date | string | null | undefined): string => {
  const d = toDate(date);
  if (!d) return '-';
  
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: IST_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    };
    
    // Get parts and rearrange to DD-MM-YYYY
    const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(d);
    const day = parts.find(p => p.type === 'day')?.value || '00';
    const month = parts.find(p => p.type === 'month')?.value || '00';
    const year = parts.find(p => p.type === 'year')?.value || '0000';
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * Format time to hh:mm A in IST
 * @param date - Date to format
 * @returns Formatted time string (e.g., "09:30 AM")
 */
export const formatTimeIST = (date: Date | string | null | undefined): string => {
  const d = toDate(date);
  if (!d) return '-';
  
  try {
    return d.toLocaleTimeString('en-US', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return '-';
  }
};

/**
 * Format date and time to DD-MM-YYYY hh:mm A in IST
 * @param date - Date to format
 * @returns Formatted datetime string (e.g., "05-12-2025 09:30 AM")
 */
export const formatDateTimeIST = (date: Date | string | null | undefined): string => {
  const d = toDate(date);
  if (!d) return '-';
  
  const dateStr = formatDateIST(d);
  const timeStr = formatTimeIST(d);
  
  if (dateStr === '-' || timeStr === '-') return '-';
  return `${dateStr} ${timeStr}`;
};

/**
 * Format date for display with day name (e.g., "Friday, 05-12-2025")
 * @param date - Date to format
 * @returns Formatted string with day name
 */
export const formatDateWithDayIST = (date: Date | string | null | undefined): string => {
  const d = toDate(date);
  if (!d) return '-';
  
  try {
    const dayName = d.toLocaleDateString('en-US', {
      timeZone: IST_TIMEZONE,
      weekday: 'long',
    });
    const dateStr = formatDateIST(d);
    return `${dayName}, ${dateStr}`;
  } catch (error) {
    console.error('Error formatting date with day:', error);
    return '-';
  }
};

/**
 * Format date in short format (e.g., "05 Dec 2025")
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatDateShortIST = (date: Date | string | null | undefined): string => {
  const d = toDate(date);
  if (!d) return '-';
  
  try {
    return d.toLocaleDateString('en-GB', {
      timeZone: IST_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting short date:', error);
    return '-';
  }
};

/**
 * Format date for display in IST (legacy support)
 * @param date - Date to format
 * @param format - Format type ('date', 'time', 'datetime', 'full')
 * @returns Formatted string
 */
export const formatISTDate = (
  date: Date | string,
  format: 'date' | 'time' | 'datetime' | 'full' = 'datetime'
): string => {
  const d = toDate(date);
  if (!d) return '-';
  
  switch (format) {
    case 'date':
      return formatDateIST(d);
    case 'time':
      return formatTimeIST(d);
    case 'datetime':
      return formatDateTimeIST(d);
    case 'full':
      return formatDateWithDayIST(d) + ' ' + formatTimeIST(d);
    default:
      return formatDateTimeIST(d);
  }
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
export const formatAttendanceTime = (date: Date | string | null | undefined): string => {
  return formatTimeIST(date);
};

/**
 * Format date for attendance display (e.g., "05-12-2025")
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatAttendanceDate = (date: Date | string | null | undefined): string => {
  return formatDateIST(date);
};

/**
 * Get day of week for a date
 * @param date - Date to check
 * @returns Day name (e.g., "Monday")
 */
export const getDayOfWeek = (date: Date | string | null | undefined): string => {
  const d = toDate(date);
  if (!d) return '-';
  
  try {
    return d.toLocaleDateString('en-US', {
      timeZone: IST_TIMEZONE,
      weekday: 'long',
    });
  } catch (error) {
    console.error('Error getting day of week:', error);
    return '-';
  }
};

/**
 * Get short day of week (e.g., "Mon")
 * @param date - Date to check
 * @returns Short day name
 */
export const getDayOfWeekShort = (date: Date | string | null | undefined): string => {
  const d = toDate(date);
  if (!d) return '-';
  
  try {
    return d.toLocaleDateString('en-US', {
      timeZone: IST_TIMEZONE,
      weekday: 'short',
    });
  } catch (error) {
    console.error('Error getting short day of week:', error);
    return '-';
  }
};

/**
 * Check if a date is today (in IST)
 * @param date - Date to check
 * @returns true if date is today
 */
export const isToday = (date: Date | string | null | undefined): boolean => {
  const d = toDate(date);
  if (!d) return false;
  
  const today = getCurrentISTTime();
  const todayStr = formatDateIST(today);
  const dateStr = formatDateIST(d);
  
  return todayStr === dateStr;
};

/**
 * Get start of day in IST
 * @param date - Optional date (defaults to today)
 * @returns Date object at 00:00:00 IST
 */
export const getStartOfDayIST = (date?: Date): Date => {
  const istDate = date ? new Date(date) : getCurrentISTTime();
  istDate.setHours(0, 0, 0, 0);
  return istDate;
};

/**
 * Get end of day in IST
 * @param date - Optional date (defaults to today)
 * @returns Date object at 23:59:59 IST
 */
export const getEndOfDayIST = (date?: Date): Date => {
  const istDate = date ? new Date(date) : getCurrentISTTime();
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
  const start = toDate(startDate);
  const end = toDate(endDate);
  
  if (!start || !end) return 0;
  
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return Math.round(diffHours * 100) / 100;
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
export const getRelativeTime = (date: Date | string | null | undefined): string => {
  const d = toDate(date);
  if (!d) return '-';
  
  const now = getCurrentISTTime();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 0) {
    // Future date
    const absDiffDays = Math.abs(diffDays);
    const absDiffHours = Math.abs(diffHours);
    const absDiffMinutes = Math.abs(diffMinutes);
    
    if (absDiffDays > 0) return `in ${absDiffDays} day${absDiffDays !== 1 ? 's' : ''}`;
    if (absDiffHours > 0) return `in ${absDiffHours} hour${absDiffHours !== 1 ? 's' : ''}`;
    if (absDiffMinutes > 0) return `in ${absDiffMinutes} minute${absDiffMinutes !== 1 ? 's' : ''}`;
    return 'just now';
  }
  
  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return formatDateIST(d);
  }
};

/**
 * Format date range (e.g., "05-12-2025 to 10-12-2025")
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range string
 */
export const formatDateRangeIST = (
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): string => {
  const start = formatDateIST(startDate);
  const end = formatDateIST(endDate);
  
  if (start === '-' && end === '-') return '-';
  if (start === end) return start;
  
  return `${start} to ${end}`;
};

/**
 * Get month and year string (e.g., "December 2025")
 * @param date - Date to format
 * @returns Month and year string
 */
export const getMonthYearIST = (date: Date | string | null | undefined): string => {
  const d = toDate(date);
  if (!d) return '-';
  
  try {
    return d.toLocaleDateString('en-US', {
      timeZone: IST_TIMEZONE,
      month: 'long',
      year: 'numeric',
    });
  } catch (error) {
    console.error('Error getting month year:', error);
    return '-';
  }
};

/**
 * Get day and month (e.g., "05 Dec")
 * @param date - Date to format
 * @returns Day and month string
 */
export const getDayMonthIST = (date: Date | string | null | undefined): string => {
  const d = toDate(date);
  if (!d) return '-';
  
  try {
    return d.toLocaleDateString('en-GB', {
      timeZone: IST_TIMEZONE,
      day: '2-digit',
      month: 'short',
    });
  } catch (error) {
    console.error('Error getting day month:', error);
    return '-';
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
  console.log('  IST Date:', formatDateIST(istTime));
  console.log('  IST Time:', formatTimeIST(istTime));
  console.log('  IST DateTime:', formatDateTimeIST(istTime));
  console.log('  UTC Timestamp:', getCurrentUTCTimestamp());
};

// Export all functions
export default {
  getCurrentISTTime,
  convertUTCToIST,
  convertISTToUTC,
  formatDateIST,
  formatTimeIST,
  formatDateTimeIST,
  formatDateWithDayIST,
  formatDateShortIST,
  formatISTDate,
  getCurrentUTCTimestamp,
  getCurrentISTTimestamp,
  formatAttendanceTime,
  formatAttendanceDate,
  getDayOfWeek,
  getDayOfWeekShort,
  isToday,
  getStartOfDayIST,
  getEndOfDayIST,
  calculateHours,
  formatHours,
  getRelativeTime,
  formatDateRangeIST,
  getMonthYearIST,
  getDayMonthIST,
  logTimeInfo,
};
