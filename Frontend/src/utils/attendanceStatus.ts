/**
 * Attendance Status Calculation Utility
 * Determines check-in/check-out status based on office hours and grace periods
 */

import { getCurrentISTTime, formatIST } from "./dateTime";

export interface OfficeHours {
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  check_in_grace_minutes: number;
  check_out_grace_minutes: number;
}

export interface AttendanceStatus {
  checkInStatus: "on-time" | "early" | "late";
  checkOutStatus: "on-time" | "early" | "late";
  minutesEarly?: number;
  minutesLate?: number;
  message: string;
}

/**
 * Parse time string in HH:MM format to minutes since midnight
 */
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Get current time in minutes since midnight (IST)
 */
const getCurrentTimeInMinutes = (): number => {
  const now = getCurrentISTTime();
  // Get time string in HH:mm using IST formatter
  const timeStr = formatIST(now, "HH:mm");
  return timeToMinutes(timeStr);
};

/**
 * Calculate check-in status based on office hours and grace period
 * @param officeHours - Office hours configuration
 * @returns Check-in status and details
 */
export const calculateCheckInStatus = (officeHours: OfficeHours): AttendanceStatus => {
  const startTimeMinutes = timeToMinutes(officeHours.start_time);
  const graceMinutes = officeHours.check_in_grace_minutes;
  const currentTimeMinutes = getCurrentTimeInMinutes();

  // Latest allowed check-in time = start time + grace period
  const latestCheckInMinutes = startTimeMinutes + graceMinutes;

  if (currentTimeMinutes <= startTimeMinutes) {
    // Checked in before office hours start
    const minutesEarly = startTimeMinutes - currentTimeMinutes;
    return {
      checkInStatus: "early",
      checkOutStatus: "on-time",
      minutesEarly,
      message: "✅ Early",
    };
  } else if (currentTimeMinutes <= latestCheckInMinutes) {
    // Checked in within grace period
    const minutesLate = currentTimeMinutes - startTimeMinutes;
    if (minutesLate === 0) {
      return {
        checkInStatus: "on-time",
        checkOutStatus: "on-time",
        message: "✅ On Time",
      };
    }
    return {
      checkInStatus: "on-time",
      checkOutStatus: "on-time",
      minutesLate,
      message: "✅ On Time",
    };
  } else {
    // Checked in after grace period
    const totalMinutesLate = currentTimeMinutes - startTimeMinutes;
    return {
      checkInStatus: "late",
      checkOutStatus: "on-time",
      minutesLate: totalMinutesLate,
      message: "⚠️ Late",
    };
  }
};

/**
 * Calculate check-out status based on office hours and grace period
 * @param officeHours - Office hours configuration
 * @returns Check-out status and details
 */
export const calculateCheckOutStatus = (officeHours: OfficeHours): AttendanceStatus => {
  const endTimeMinutes = timeToMinutes(officeHours.end_time);
  const graceMinutes = officeHours.check_out_grace_minutes;
  const currentTimeMinutes = getCurrentTimeInMinutes();

  // Earliest allowed check-out time = end time - grace period
  const earliestCheckOutMinutes = endTimeMinutes - graceMinutes;

  if (currentTimeMinutes < earliestCheckOutMinutes) {
    // Checked out before end time - grace period
    const minutesEarly = earliestCheckOutMinutes - currentTimeMinutes;
    return {
      checkInStatus: "on-time",
      checkOutStatus: "early",
      minutesEarly,
      message: "⚠️ Early",
    };
  } else if (currentTimeMinutes <= endTimeMinutes) {
    // Checked out within allowed window (end time - grace to end time)
    const minutesEarly = endTimeMinutes - currentTimeMinutes;
    if (minutesEarly === 0) {
      return {
        checkInStatus: "on-time",
        checkOutStatus: "on-time",
        message: "✅ On Time",
      };
    }
    return {
      checkInStatus: "on-time",
      checkOutStatus: "on-time",
      minutesEarly,
      message: "✅ On Time",
    };
  } else {
    // Checked out after end time (overtime)
    const minutesLate = currentTimeMinutes - endTimeMinutes;
    return {
      checkInStatus: "on-time",
      checkOutStatus: "late",
      minutesLate,
      message: "✅ Overtime",
    };
  }
};

/**
 * Get status color for UI display
 */
export const getStatusColor = (status: "on-time" | "early" | "late") => {
  switch (status) {
    case "on-time":
      return { bg: "#dcfce7", text: "#16a34a", label: "On Time" };
    case "early":
      return { bg: "#dbeafe", text: "#3b82f6", label: "Early" };
    case "late":
      return { bg: "#fee2e2", text: "#dc2626", label: "Late" };
    default:
      return { bg: "#f3f4f6", text: "#6b7280", label: "Unknown" };
  }
};

/**
 * Format status message for display
 */
export const formatStatusMessage = (status: AttendanceStatus): string => {
  return status.message;
};
