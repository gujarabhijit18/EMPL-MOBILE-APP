/**
 * Enhanced WFH Validation Logic
 * Implements comprehensive business rules for WFH requests:
 * 1. Check for existing WFH requests for same date range
 * 2. Enforce 24-hour advance notice (IST)
 * 3. Enforce 4-day monthly limit per user
 * 4. Prevent edit/delete for approved/rejected requests
 * 5. Prevent duplicate requests for same day
 */

import { formatIST, getCurrentISTTime } from './dateTime';
import { WfhRequest } from './attendanceWfhLogic';

// ============ VALIDATION RESULT TYPES ============

export interface WfhValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: 'DUPLICATE_REQUEST' | 'INSUFFICIENT_ADVANCE' | 'SAME_DAY' | 'MONTHLY_LIMIT_EXCEEDED' | 'PAST_DATE' | 'INVALID_DATES';
  hoursRemaining?: number;
  daysUsedThisMonth?: number;
  monthlyLimit?: number;
}

// ============ DUPLICATE REQUEST CHECK ============

/**
 * Check if a WFH request already exists for the same date range
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param existingRequests - List of existing WFH requests
 * @returns Validation result
 */
export const checkDuplicateWfhRequest = (
  startDate: string,
  endDate: string,
  existingRequests: WfhRequest[]
): WfhValidationResult => {
  if (!existingRequests || existingRequests.length === 0) {
    return { isValid: true };
  }

  // Check for overlapping requests (any status except rejected)
  const overlappingRequest = existingRequests.find(req => {
    const status = req.status?.toLowerCase();
    // Skip rejected requests - they don't block new requests
    if (status === 'rejected') return false;

    const reqStart = req.start_date?.split('T')[0];
    const reqEnd = req.end_date?.split('T')[0];

    // Check for any overlap
    return !(endDate < reqStart || startDate > reqEnd);
  });

  if (overlappingRequest) {
    const status = overlappingRequest.status?.toLowerCase();
    return {
      isValid: false,
      error: 'WFH request already submitted for this date.',
      errorCode: 'DUPLICATE_REQUEST'
    };
  }

  return { isValid: true };
};

// ============ 24-HOUR ADVANCE NOTICE CHECK ============

/**
 * Validate 24-hour advance notice requirement (IST)
 * @param startDate - Start date in YYYY-MM-DD format
 * @returns Validation result
 */
export const validateAdvanceNotice = (startDate: string): WfhValidationResult => {
  const now = getCurrentISTTime();
  const today = formatIST(now, 'yyyy-MM-dd');

  // Check if start date is in the past
  if (startDate < today) {
    return {
      isValid: false,
      error: 'Start date cannot be in the past. Please select a future date.',
      errorCode: 'PAST_DATE'
    };
  }

  // Check if start date is today (same-day requests not allowed)
  if (startDate === today) {
    return {
      isValid: false,
      error: 'WFH must be requested at least 24 hours in advance.',
      errorCode: 'SAME_DAY'
    };
  }

  // Calculate hours remaining until start date
  const startDateObj = new Date(startDate + 'T00:00:00');
  const timeDiff = startDateObj.getTime() - now.getTime();
  const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));

  // Check 24-hour rule
  if (hoursRemaining < 24) {
    return {
      isValid: false,
      error: 'WFH must be requested at least 24 hours in advance.',
      errorCode: 'INSUFFICIENT_ADVANCE',
      hoursRemaining
    };
  }

  return { isValid: true };
};

// ============ MONTHLY LIMIT CHECK ============

/**
 * Count approved WFH days in current calendar month
 * @param existingRequests - List of existing WFH requests
 * @returns Number of approved WFH days used this month
 */
export const countApprovedWfhDaysThisMonth = (existingRequests: WfhRequest[]): number => {
  if (!existingRequests || existingRequests.length === 0) {
    return 0;
  }

  const now = getCurrentISTTime();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const approvedRequests = existingRequests.filter(req => {
    const status = req.status?.toLowerCase();
    if (status !== 'approved') return false;

    // Check if request falls within current month
    const startDate = new Date(req.start_date + 'T00:00:00');
    const endDate = new Date(req.end_date + 'T23:59:59');

    return (
      (startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear) ||
      (endDate.getMonth() === currentMonth && endDate.getFullYear() === currentYear) ||
      (startDate < new Date(currentYear, currentMonth, 1) && endDate > new Date(currentYear, currentMonth + 1, 0))
    );
  });

  // Count total days across all approved requests in this month
  let totalDays = 0;
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);

  approvedRequests.forEach(req => {
    const reqStart = new Date(req.start_date + 'T00:00:00');
    const reqEnd = new Date(req.end_date + 'T23:59:59');

    // Calculate overlap with current month
    const overlapStart = reqStart > monthStart ? reqStart : monthStart;
    const overlapEnd = reqEnd < monthEnd ? reqEnd : monthEnd;

    if (overlapStart <= overlapEnd) {
      const daysDiff = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      totalDays += daysDiff;
    }
  });

  return totalDays;
};

/**
 * Validate monthly WFH limit (4 days per calendar month)
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param existingRequests - List of existing WFH requests
 * @param monthlyLimit - Maximum WFH days per month (default: 4)
 * @returns Validation result
 */
export const validateMonthlyLimit = (
  startDate: string,
  endDate: string,
  existingRequests: WfhRequest[],
  monthlyLimit: number = 4
): WfhValidationResult => {
  // Count days in the new request
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');
  const requestedDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Count already approved days this month
  const approvedDaysUsed = countApprovedWfhDaysThisMonth(existingRequests);

  // Check if adding this request would exceed the limit
  const totalDaysAfterRequest = approvedDaysUsed + requestedDays;

  if (totalDaysAfterRequest > monthlyLimit) {
    return {
      isValid: false,
      error: `Monthly WFH limit (${monthlyLimit} days) reached.`,
      errorCode: 'MONTHLY_LIMIT_EXCEEDED',
      daysUsedThisMonth: approvedDaysUsed,
      monthlyLimit
    };
  }

  return { isValid: true, daysUsedThisMonth: approvedDaysUsed, monthlyLimit };
};

// ============ COMPREHENSIVE VALIDATION ============

/**
 * Perform all WFH request validations
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param existingRequests - List of existing WFH requests
 * @param monthlyLimit - Maximum WFH days per month (default: 4)
 * @returns Validation result with first error encountered
 */
export const validateWfhRequest = (
  startDate: string,
  endDate: string,
  existingRequests: WfhRequest[],
  monthlyLimit: number = 4
): WfhValidationResult => {
  // 1. Validate date format and order
  if (!startDate || !endDate) {
    return {
      isValid: false,
      error: 'Start and end dates are required.',
      errorCode: 'INVALID_DATES'
    };
  }

  if (endDate < startDate) {
    return {
      isValid: false,
      error: 'End date must be on or after the start date.',
      errorCode: 'INVALID_DATES'
    };
  }

  // 2. Check for duplicate/overlapping requests
  const duplicateCheck = checkDuplicateWfhRequest(startDate, endDate, existingRequests);
  if (!duplicateCheck.isValid) {
    return duplicateCheck;
  }

  // 3. Validate advance notice (24-hour rule)
  const advanceNoticeCheck = validateAdvanceNotice(startDate);
  if (!advanceNoticeCheck.isValid) {
    return advanceNoticeCheck;
  }

  // 4. Validate monthly limit
  const monthlyLimitCheck = validateMonthlyLimit(startDate, endDate, existingRequests, monthlyLimit);
  if (!monthlyLimitCheck.isValid) {
    return monthlyLimitCheck;
  }

  return { isValid: true };
};

// ============ REQUEST STATE HELPERS ============

/**
 * Check if a WFH request can be edited
 * Approved and rejected requests cannot be edited
 */
export const canEditWfhRequest = (request: WfhRequest): boolean => {
  const status = request.status?.toLowerCase();
  return status !== 'approved' && status !== 'rejected';
};

/**
 * Check if a WFH request can be deleted
 * Approved and rejected requests cannot be deleted
 */
export const canDeleteWfhRequest = (request: WfhRequest): boolean => {
  const status = request.status?.toLowerCase();
  return status !== 'approved' && status !== 'rejected';
};

/**
 * Check if user can submit another WFH request for the same day
 * If a request for that day is approved or rejected, no new request allowed
 */
export const canSubmitWfhForDay = (
  targetDate: string,
  existingRequests: WfhRequest[]
): boolean => {
  const existingForDay = existingRequests.find(req => {
    const status = req.status?.toLowerCase();
    // Block if approved or rejected
    if (status === 'approved' || status === 'rejected') {
      const reqStart = req.start_date?.split('T')[0];
      const reqEnd = req.end_date?.split('T')[0];
      return targetDate >= reqStart && targetDate <= reqEnd;
    }
    return false;
  });

  return !existingForDay;
};

// ============ USER-FRIENDLY MESSAGES ============

/**
 * Get user-friendly error message for validation result
 */
export const getWfhErrorMessage = (result: WfhValidationResult): string => {
  if (result.isValid) return '';

  switch (result.errorCode) {
    case 'DUPLICATE_REQUEST':
      return 'WFH request already submitted for this date.';
    case 'SAME_DAY':
      return 'WFH must be requested at least 24 hours in advance.';
    case 'INSUFFICIENT_ADVANCE':
      return 'WFH must be requested at least 24 hours in advance.';
    case 'MONTHLY_LIMIT_EXCEEDED':
      return `Monthly WFH limit (${result.monthlyLimit} days) reached.`;
    case 'PAST_DATE':
      return 'Start date cannot be in the past. Please select a future date.';
    case 'INVALID_DATES':
      return 'Please check your dates and try again.';
    default:
      return result.error || 'Invalid WFH request.';
  }
};

/**
 * Get detailed validation message for display
 */
export const getWfhValidationDetails = (result: WfhValidationResult): string => {
  if (result.isValid) return '';

  let message = getWfhErrorMessage(result);

  if (result.hoursRemaining !== undefined && result.hoursRemaining >= 0) {
    message += ` (${result.hoursRemaining} hours remaining)`;
  }

  if (result.daysUsedThisMonth !== undefined && result.monthlyLimit !== undefined) {
    message += ` (${result.daysUsedThisMonth}/${result.monthlyLimit} days used this month)`;
  }

  return message;
};
