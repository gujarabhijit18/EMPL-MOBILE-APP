/**
 * Centralized Attendance + WFH Business Logic
 * All date/time operations use IST (Asia/Kolkata)
 * 
 * CORE BUSINESS RULES:
 * 1. Role-Based Behavior
 * 2. WFH Date-Driven Auto Attendance
 * 3. Midnight Refresh & Date Change Handling
 * 4. Unified Attendance Flow
 */

import { formatIST, getCurrentISTTime, parseIST } from './dateTime';

// ============ TYPES ============
export interface WfhRequest {
  id?: number;
  wfh_id?: number;
  user_id: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  status: 'pending' | 'approved' | 'rejected' | 'Pending' | 'Approved' | 'Rejected';
  reason?: string;
  wfh_type?: 'Full Day' | 'Half Day' | 'First Half' | 'Second Half';
  department?: string;
  name?: string;
  employee_id?: string;
  rejection_reason?: string | null;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string;
  checkOutTime?: string;
  status?: string;
  workLocation?: 'Work From Home' | 'Work From Office';
  selfie?: string | null;
  checkInSelfie?: string | null;
  checkOutSelfie?: string | null;
  workSummary?: string;
}

export type UserRole = 'admin' | 'hr' | 'manager' | 'teamlead' | 'team lead' | 'employee';

// ============ ROLE CHECKS ============

/**
 * Check if user role is Admin (read-only, no check-in/out)
 */
export const isAdminRole = (role?: string): boolean => {
  return role?.toLowerCase() === 'admin';
};

/**
 * Check if user role is HR or Manager (same UI as Employee + team view)
 */
export const isHrOrManager = (role?: string): boolean => {
  const r = role?.toLowerCase();
  return r === 'hr' || r === 'manager';
};

/**
 * Check if user can perform check-in/check-out actions
 * Admin cannot check-in/out
 */
export const canPerformAttendanceActions = (role?: string): boolean => {
  return !isAdminRole(role);
};


/**
 * Check if user can view WFH requests (Admin, HR, Manager only)
 */
export const canViewWfhRequests = (role?: string): boolean => {
  const r = role?.toLowerCase();
  return r === 'admin' || r === 'hr' || r === 'manager';
};

/**
 * Check if user can approve/reject WFH requests
 * Admin can view but NOT approve/reject
 * HR and Manager can approve/reject for their department
 */
export const canApproveWfhRequests = (role?: string): boolean => {
  const r = role?.toLowerCase();
  return r === 'hr' || r === 'manager';
};

// ============ WFH DATE LOGIC ============

/**
 * Get today's date in IST as YYYY-MM-DD string
 */
export const getTodayIST = (): string => {
  return formatIST(getCurrentISTTime(), 'yyyy-MM-dd');
};

/**
 * Check if a date string (YYYY-MM-DD) is today in IST
 */
export const isToday = (dateStr: string): boolean => {
  return dateStr === getTodayIST();
};

/**
 * Check if today falls within a WFH request's date range
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 */
export const isTodayInWfhRange = (startDate?: string, endDate?: string): boolean => {
  if (!startDate || !endDate) return false;
  
  const today = getTodayIST();
  // Normalize dates to YYYY-MM-DD (handle potential ISO timestamps)
  const start = startDate.split('T')[0];
  const end = endDate.split('T')[0];
  
  // String comparison works for ISO date format
  return today >= start && today <= end;
};

/**
 * Check if a specific date falls within a WFH request's date range
 */
export const isDateInWfhRange = (
  checkDate: string,
  startDate?: string,
  endDate?: string
): boolean => {
  if (!startDate || !endDate) return false;
  
  const date = checkDate.split('T')[0];
  const start = startDate.split('T')[0];
  const end = endDate.split('T')[0];
  
  return date >= start && date <= end;
};

/**
 * Find active WFH request for today from a list of requests
 * Returns the approved request that covers today's date
 */
export const findActiveWfhForToday = (
  requests: WfhRequest[]
): WfhRequest | null => {
  if (!requests || !Array.isArray(requests)) return null;
  
  const today = getTodayIST();
  
  return requests.find(req => {
    if (!req.start_date || !req.end_date) return false;
    
    const status = req.status?.toLowerCase();
    if (status !== 'approved') return false;
    
    const start = req.start_date.split('T')[0];
    const end = req.end_date.split('T')[0];
    
    return today >= start && today <= end;
  }) || null;
};

/**
 * Find any WFH request (any status) for today
 */
export const findAnyWfhForToday = (
  requests: WfhRequest[]
): WfhRequest | null => {
  if (!requests || !Array.isArray(requests)) return null;
  
  const today = getTodayIST();
  
  return requests.find(req => {
    if (!req.start_date || !req.end_date) return false;
    
    const start = req.start_date.split('T')[0];
    const end = req.end_date.split('T')[0];
    
    return today >= start && today <= end;
  }) || null;
};


// ============ ATTENDANCE VALIDATION ============

/**
 * Validate if user can check-in for WFH
 * Returns { canCheckIn: boolean, reason?: string }
 */
export const validateWfhCheckIn = (
  wfhRequest: WfhRequest | null,
  currentAttendance: AttendanceRecord | null
): { canCheckIn: boolean; reason?: string } => {
  // No approved WFH request
  if (!wfhRequest) {
    return { 
      canCheckIn: false, 
      reason: 'No approved WFH request found. Please submit a WFH request and wait for approval.' 
    };
  }
  
  // Check if status is approved
  const status = wfhRequest.status?.toLowerCase();
  if (status !== 'approved') {
    return { 
      canCheckIn: false, 
      reason: `WFH request is ${status}. Please wait for approval to check in.` 
    };
  }
  
  // Check if today is within the approved date range
  if (!isTodayInWfhRange(wfhRequest.start_date, wfhRequest.end_date)) {
    return { 
      canCheckIn: false, 
      reason: 'Today is not within your approved WFH date range.' 
    };
  }
  
  // Already checked in today
  if (currentAttendance?.checkInTime) {
    return { 
      canCheckIn: false, 
      reason: 'You have already checked in today.' 
    };
  }
  
  return { canCheckIn: true };
};

/**
 * Validate if user can check-out for WFH
 */
export const validateWfhCheckOut = (
  wfhRequest: WfhRequest | null,
  currentAttendance: AttendanceRecord | null
): { canCheckOut: boolean; reason?: string } => {
  // Must have checked in first
  if (!currentAttendance?.checkInTime) {
    return { 
      canCheckOut: false, 
      reason: 'You must check in before checking out.' 
    };
  }
  
  // Already checked out
  if (currentAttendance?.checkOutTime) {
    return { 
      canCheckOut: false, 
      reason: 'You have already checked out today.' 
    };
  }
  
  return { canCheckOut: true };
};

/**
 * Validate office attendance check-in
 */
export const validateOfficeCheckIn = (
  currentAttendance: AttendanceRecord | null
): { canCheckIn: boolean; reason?: string } => {
  if (currentAttendance?.checkInTime) {
    return { 
      canCheckIn: false, 
      reason: 'You have already checked in today.' 
    };
  }
  
  return { canCheckIn: true };
};

/**
 * Validate office attendance check-out
 */
export const validateOfficeCheckOut = (
  currentAttendance: AttendanceRecord | null
): { canCheckOut: boolean; reason?: string } => {
  if (!currentAttendance?.checkInTime) {
    return { 
      canCheckOut: false, 
      reason: 'You must check in before checking out.' 
    };
  }
  
  if (currentAttendance?.checkOutTime) {
    return { 
      canCheckOut: false, 
      reason: 'You have already checked out today.' 
    };
  }
  
  return { canCheckOut: true };
};

// ============ MIDNIGHT REFRESH LOGIC ============

/**
 * Check if date has changed since last check
 * Used for midnight refresh handling
 */
export const hasDateChanged = (lastCheckedDate: string): boolean => {
  return lastCheckedDate !== getTodayIST();
};

/**
 * Get attendance state for a new day
 * Handles the transition from yesterday to today
 */
export const getNewDayAttendanceState = (
  wfhRequests: WfhRequest[],
  yesterdayAttendance: AttendanceRecord | null
): {
  isWfhDay: boolean;
  activeWfhRequest: WfhRequest | null;
  yesterdayWasWfh: boolean;
  continuingWfh: boolean;
} => {
  const activeWfh = findActiveWfhForToday(wfhRequests);
  const isWfhDay = activeWfh !== null;
  
  const yesterdayWasWfh = yesterdayAttendance?.workLocation === 'Work From Home';
  
  // Check if WFH continues from yesterday
  const continuingWfh = yesterdayWasWfh && isWfhDay;
  
  return {
    isWfhDay,
    activeWfhRequest: activeWfh,
    yesterdayWasWfh,
    continuingWfh
  };
};


// ============ UI STATE HELPERS ============

/**
 * Determine what UI state to show for WFH tab
 */
export type WfhUiState = 
  | 'request_form'      // No request - show form
  | 'pending'           // Request pending approval
  | 'rejected'          // Request rejected
  | 'approved_checkin'  // Approved, can check-in
  | 'checked_in'        // Checked in, can check-out
  | 'completed';        // Day complete

export const getWfhUiState = (
  wfhRequest: WfhRequest | null,
  currentAttendance: AttendanceRecord | null
): WfhUiState => {
  if (!wfhRequest) {
    return 'request_form';
  }
  
  const status = wfhRequest.status?.toLowerCase();
  
  if (status === 'pending') {
    return 'pending';
  }
  
  if (status === 'rejected') {
    return 'rejected';
  }
  
  if (status === 'approved') {
    // Check if today is in the approved range
    if (!isTodayInWfhRange(wfhRequest.start_date, wfhRequest.end_date)) {
      return 'request_form'; // Outside approved range
    }
    
    // Check attendance state
    if (!currentAttendance?.checkInTime) {
      return 'approved_checkin';
    }
    
    if (!currentAttendance?.checkOutTime) {
      return 'checked_in';
    }
    
    return 'completed';
  }
  
  return 'request_form';
};

/**
 * Determine what UI state to show for Office tab
 */
export type OfficeUiState = 
  | 'can_checkin'   // Can check-in
  | 'checked_in'    // Checked in, can check-out
  | 'completed'     // Day complete
  | 'wfh_enforced'; // WFH is enforced for today

export const getOfficeUiState = (
  wfhRequest: WfhRequest | null,
  currentAttendance: AttendanceRecord | null
): OfficeUiState => {
  // Check if WFH is enforced for today
  if (wfhRequest) {
    const status = wfhRequest.status?.toLowerCase();
    if (status === 'approved' && isTodayInWfhRange(wfhRequest.start_date, wfhRequest.end_date)) {
      return 'wfh_enforced';
    }
  }
  
  if (!currentAttendance?.checkInTime) {
    return 'can_checkin';
  }
  
  if (!currentAttendance?.checkOutTime) {
    return 'checked_in';
  }
  
  return 'completed';
};

/**
 * Get work mode based on WFH approval status
 * If WFH is approved for today, force WFH mode
 */
export const getEnforcedWorkMode = (
  wfhRequest: WfhRequest | null,
  currentWorkMode: 'office' | 'wfh'
): 'office' | 'wfh' => {
  if (wfhRequest) {
    const status = wfhRequest.status?.toLowerCase();
    if (status === 'approved' && isTodayInWfhRange(wfhRequest.start_date, wfhRequest.end_date)) {
      return 'wfh'; // Force WFH mode
    }
  }
  return currentWorkMode;
};

/**
 * Check if office mode should be disabled (WFH enforced)
 */
export const isOfficeModeDisabled = (wfhRequest: WfhRequest | null): boolean => {
  if (!wfhRequest) return false;
  
  const status = wfhRequest.status?.toLowerCase();
  return status === 'approved' && isTodayInWfhRange(wfhRequest.start_date, wfhRequest.end_date);
};

// ============ DATE FORMATTING HELPERS ============

/**
 * Format date range for display
 */
export const formatDateRange = (startDate?: string, endDate?: string): string => {
  if (!startDate || !endDate) return '';
  
  const start = startDate.split('T')[0];
  const end = endDate.split('T')[0];
  
  if (start === end) {
    return formatIST(new Date(start), 'dd MMM yyyy');
  }
  
  return `${formatIST(new Date(start), 'dd MMM')} - ${formatIST(new Date(end), 'dd MMM yyyy')}`;
};

/**
 * Get all dates in a range as YYYY-MM-DD strings
 */
export const getDatesInRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const start = new Date(startDate.split('T')[0]);
  const end = new Date(endDate.split('T')[0]);
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(formatIST(current, 'yyyy-MM-dd'));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

// ============ STORAGE KEYS ============
export const STORAGE_KEYS = {
  LAST_CHECKED_DATE: 'attendance_last_checked_date',
  CACHED_WFH_REQUESTS: 'attendance_cached_wfh_requests',
  CACHED_TODAY_ATTENDANCE: 'attendance_cached_today',
};


// ============ ATTENDANCE SUMMARY HELPERS ============

/**
 * Calculate working duration from check-in and check-out times
 * @param checkInTime - Check-in time string (HH:MM AM/PM format)
 * @param checkOutTime - Check-out time string (HH:MM AM/PM format)
 * @returns Duration string (e.g., "8h 30m")
 */
export const calculateWorkingDuration = (
  checkInTime?: string,
  checkOutTime?: string
): string => {
  if (!checkInTime || !checkOutTime) return '-';
  
  try {
    // Parse time strings (assuming format like "09:30 AM")
    const parseTime = (timeStr: string): number => {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return 0;
      
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return hours * 60 + minutes;
    };
    
    const checkInMinutes = parseTime(checkInTime);
    const checkOutMinutes = parseTime(checkOutTime);
    
    let durationMinutes = checkOutMinutes - checkInMinutes;
    if (durationMinutes < 0) durationMinutes += 24 * 60; // Handle overnight
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  } catch {
    return '-';
  }
};

/**
 * Get attendance summary for display
 */
export interface AttendanceSummary {
  mode: 'Work From Home' | 'Work From Office';
  date: string;
  checkInTime: string;
  checkOutTime: string;
  duration: string;
  status: 'completed' | 'in_progress' | 'not_started';
}

export const getAttendanceSummary = (
  attendance: AttendanceRecord | null,
  wfhRequest: WfhRequest | null
): AttendanceSummary | null => {
  if (!attendance) return null;
  
  const isWfh = attendance.workLocation === 'Work From Home' || 
    (wfhRequest && isTodayInWfhRange(wfhRequest.start_date, wfhRequest.end_date));
  
  return {
    mode: isWfh ? 'Work From Home' : 'Work From Office',
    date: attendance.date,
    checkInTime: attendance.checkInTime || '-',
    checkOutTime: attendance.checkOutTime || '-',
    duration: calculateWorkingDuration(attendance.checkInTime, attendance.checkOutTime),
    status: !attendance.checkInTime ? 'not_started' : 
            !attendance.checkOutTime ? 'in_progress' : 'completed'
  };
};

// ============ WFH ADVANCE NOTICE VALIDATION (24-HOUR RULE) ============

/**
 * Calculate time remaining until WFH start date (in IST)
 * @param startDate - Start date in YYYY-MM-DD format
 * @returns Object with hours remaining and whether 24-hour rule is met
 */
export const calculateTimeUntilWfhStart = (startDate: string): {
  hoursRemaining: number;
  minutesRemaining: number;
  meetsAdvanceNotice: boolean;
  message: string;
} => {
  const now = getCurrentISTTime();
  const startDateObj = new Date(startDate + 'T00:00:00'); // Start of day in IST
  
  // Calculate time difference in milliseconds
  const timeDiff = startDateObj.getTime() - now.getTime();
  const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  // 24-hour rule: must apply at least 24 hours before start date
  const meetsAdvanceNotice = hoursRemaining >= 24;
  
  let message = '';
  if (hoursRemaining < 0) {
    message = 'Start date is in the past. Please select a future date.';
  } else if (hoursRemaining === 0 && minutesRemaining === 0) {
    message = 'WFH start date must be at least 24 hours from now.';
  } else if (hoursRemaining < 24) {
    message = `WFH must be requested at least 24 hours in advance. You have ${hoursRemaining}h ${minutesRemaining}m remaining.`;
  }
  
  return {
    hoursRemaining,
    minutesRemaining,
    meetsAdvanceNotice,
    message
  };
};

/**
 * Validate WFH request dates against 24-hour advance notice rule
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Validation result with error message if invalid
 */
export const validateWfhAdvanceNotice = (
  startDate?: string,
  endDate?: string
): {
  isValid: boolean;
  error?: string;
  hoursRemaining?: number;
} => {
  if (!startDate || !endDate) {
    return { isValid: false, error: 'Start and end dates are required.' };
  }
  
  const today = getTodayIST();
  
  // Check if start date is in the past
  if (startDate < today) {
    return { 
      isValid: false, 
      error: 'Start date cannot be in the past. Please select a future date.' 
    };
  }
  
  // Check if start date is today (same-day requests not allowed)
  if (startDate === today) {
    return { 
      isValid: false, 
      error: 'WFH is not applicable for the same day it is applied. Please request from tomorrow or later.' 
    };
  }
  
  // Check 24-hour advance notice rule
  const timeCheck = calculateTimeUntilWfhStart(startDate);
  if (!timeCheck.meetsAdvanceNotice) {
    return { 
      isValid: false, 
      error: timeCheck.message,
      hoursRemaining: timeCheck.hoursRemaining
    };
  }
  
  // Check if end date is after start date
  if (endDate < startDate) {
    return { 
      isValid: false, 
      error: 'End date must be on or after the start date.' 
    };
  }
  
  return { isValid: true };
};

/**
 * Get user-friendly message about advance notice requirement
 */
export const getAdvanceNoticeMessage = (): string => {
  const now = getCurrentISTTime();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatIST(tomorrow, 'dd MMM yyyy');
  
  return `WFH requests must be submitted at least 24 hours in advance (IST). Earliest available date: ${tomorrowStr}`;
};

/**
 * Get minimum allowed WFH start date (tomorrow at 00:00 IST)
 */
export const getMinimumWfhStartDate = (): string => {
  const now = getCurrentISTTime();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatIST(tomorrow, 'yyyy-MM-dd');
};

// ============ VALIDATION MESSAGES ============

export const VALIDATION_MESSAGES = {
  NO_WFH_APPROVAL: 'No approved WFH request found. Please submit a WFH request and wait for approval.',
  WFH_PENDING: 'Your WFH request is pending approval. Please wait for HR/Manager approval.',
  WFH_REJECTED: 'Your WFH request was rejected. You can submit a new request or use Office mode.',
  OUTSIDE_WFH_RANGE: 'Today is not within your approved WFH date range.',
  ALREADY_CHECKED_IN: 'You have already checked in today.',
  ALREADY_CHECKED_OUT: 'You have already checked out today.',
  MUST_CHECK_IN_FIRST: 'You must check in before checking out.',
  ADMIN_READ_ONLY: 'Admin users can view attendance but cannot check in/out.',
  NO_FUTURE_ATTENDANCE: 'Cannot mark attendance for future dates.',
  ADVANCE_NOTICE_REQUIRED: 'WFH requests must be submitted at least 24 hours in advance (IST).',
  SAME_DAY_NOT_ALLOWED: 'WFH is not applicable for the same day it is applied. Please request from tomorrow or later.',
  PAST_DATE_NOT_ALLOWED: 'WFH start date cannot be in the past.',
};
