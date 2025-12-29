/**
 * Leave Application Validation Rules
 * Implements strict validation logic for leave requests
 */

export interface LeaveValidationResult {
  isValid: boolean;
  error?: string;
}

export interface LeaveValidationInput {
  leaveType: string;
  startDate: Date;
  endDate: Date;
  joiningDate?: Date;
  currentTime?: Date;
}

/**
 * Calculate the number of days between two dates (inclusive)
 */
export const calculateLeaveDuration = (startDate: Date, endDate: Date): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

/**
 * Calculate hours between two dates
 */
export const calculateHoursDifference = (fromDate: Date, toDate: Date): number => {
  const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
  const diffHours = diffTime / (1000 * 60 * 60);
  return diffHours;
};

/**
 * Validate Sick Leave minimum duration (3 days or more)
 */
const validateSickLeaveDuration = (duration: number): LeaveValidationResult => {
  if (duration < 3) {
    return {
      isValid: false,
      error: "Sick Leave can only be applied for 3 or more days. Please use Casual Leave for 1–2 days.",
    };
  }
  return { isValid: true };
};

/**
 * Validate Sick Leave advance time requirement (2 hours minimum)
 */
const validateSickLeaveAdvanceTime = (
  startDate: Date,
  currentTime: Date
): LeaveValidationResult => {
  const hoursDifference = calculateHoursDifference(currentTime, startDate);

  if (hoursDifference < 2) {
    return {
      isValid: false,
      error: "Sick Leave must be applied at least 2 hours in advance.",
    };
  }
  return { isValid: true };
};

/**
 * Validate other leave types advance time requirement (24 hours minimum)
 */
const validateOtherLeaveAdvanceTime = (
  startDate: Date,
  currentTime: Date
): LeaveValidationResult => {
  const hoursDifference = calculateHoursDifference(currentTime, startDate);

  if (hoursDifference < 24) {
    return {
      isValid: false,
      error: "This leave type must be applied at least 24 hours in advance.",
    };
  }
  return { isValid: true };
};

/**
 * Main validation function for leave applications
 * Applies all validation rules before allowing submission
 */
export const validateLeaveApplication = (
  input: LeaveValidationInput
): LeaveValidationResult => {
  const currentTime = input.currentTime || new Date();
  const leaveType = input.leaveType.toLowerCase();

  // Check against Joining Date
  if (input.joiningDate) {
    const joinDate = new Date(input.joiningDate);
    joinDate.setHours(0, 0, 0, 0);
    const startDate = new Date(input.startDate);
    startDate.setHours(0, 0, 0, 0);

    if (startDate < joinDate) {
      return {
        isValid: false,
        error: "Leave cannot be applied before your Joining Date.",
      };
    }
  }

  // Calculate leave duration
  const duration = calculateLeaveDuration(input.startDate, input.endDate);

  // Sick Leave validations
  if (leaveType.includes("sick")) {
    // Check minimum duration (3 days)
    const durationCheck = validateSickLeaveDuration(duration);
    if (!durationCheck.isValid) {
      return durationCheck;
    }

    // Check advance time requirement (2 hours)
    const advanceTimeCheck = validateSickLeaveAdvanceTime(input.startDate, currentTime);
    if (!advanceTimeCheck.isValid) {
      return advanceTimeCheck;
    }
  }
  // Other leave types (Annual, Casual, Maternity, Paternity, Unpaid)
  else {
    // Check advance time requirement (24 hours)
    const advanceTimeCheck = validateOtherLeaveAdvanceTime(input.startDate, currentTime);
    if (!advanceTimeCheck.isValid) {
      return advanceTimeCheck;
    }
  }

  return { isValid: true };
};

/**
 * Get informational message about leave balance impact
 */
export const getLeaveBalanceImpactMessage = (leaveType: string): string => {
  const type = leaveType.toLowerCase();

  if (type.includes("unpaid")) {
    return "Unpaid Leave does not deduct from your Annual Leave balance.";
  }

  if (
    type.includes("annual") ||
    type.includes("sick") ||
    type.includes("casual") ||
    type.includes("maternity") ||
    type.includes("paternity")
  ) {
    return "This leave will deduct from your Annual Leave balance after approval.";
  }

  return "This leave will be deducted from your leave balance after approval.";
};

/**
 * Check if two date ranges overlap
 */
const datesOverlap = (
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean => {
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);

  s1.setHours(0, 0, 0, 0);
  e1.setHours(0, 0, 0, 0);
  s2.setHours(0, 0, 0, 0);
  e2.setHours(0, 0, 0, 0);

  // Check if ranges overlap
  return s1 <= e2 && s2 <= e1;
};

/**
 * Validate leave overlap with existing leaves
 * Checks against approved and pending leaves
 */
export interface LeaveOverlapInput {
  startDate: Date;
  endDate: Date;
  existingLeaves: Array<{
    start_date: string;
    end_date: string;
    status: string;
  }>;
}

export const validateLeaveOverlap = (
  input: LeaveOverlapInput
): LeaveValidationResult => {
  const { startDate, endDate, existingLeaves } = input;

  // Filter for approved and pending leaves only
  const activeLeaves = existingLeaves.filter(
    (leave) => leave.status === "Approved" || leave.status === "Pending"
  );

  if (activeLeaves.length === 0) {
    return { isValid: true };
  }

  // Check for overlaps
  for (const existingLeave of activeLeaves) {
    const existingStart = new Date(existingLeave.start_date);
    const existingEnd = new Date(existingLeave.end_date);

    if (datesOverlap(startDate, endDate, existingStart, existingEnd)) {
      const existingStartStr = existingStart.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const existingEndStr = existingEnd.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      return {
        isValid: false,
        error: `Leave overlap detected! You already have a ${existingLeave.status.toLowerCase()} leave from ${existingStartStr} to ${existingEndStr}. Please select different dates.`,
      };
    }
  }

  return { isValid: true };
};
