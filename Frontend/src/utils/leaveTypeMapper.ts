/**
 * Helper functions to convert leave types between display format and API format
 */

export type LeaveTypeDisplay =
    | "Annual Leave"
    | "Sick Leave"
    | "Casual Leave"
    | "Maternity Leave"
    | "Paternity Leave"
    | "Unpaid Leave";

export type LeaveTypeAPI =
    | "annual"
    | "sick"
    | "casual"
    | "maternity"
    | "paternity"
    | "unpaid";

/**
 * Converts display leave type names to API format
 * @param displayType - User-friendly display name (e.g., "Casual Leave")
 * @returns API format (e.g., "casual")
 */
export const mapLeaveTypeToAPI = (displayType: string): LeaveTypeAPI => {
    const mapping: Record<string, LeaveTypeAPI> = {
        "Annual Leave": "annual",
        "Sick Leave": "sick",
        "Casual Leave": "casual",
        "Maternity Leave": "maternity",
        "Paternity Leave": "paternity",
        "Unpaid Leave": "unpaid",
    };
    return mapping[displayType] || "casual";
};

/**
 * Converts API leave type format to display format
 * @param apiType - API format (e.g., "casual")
 * @returns User-friendly display name (e.g., "Casual Leave")
 */
export const mapLeaveTypeToDisplay = (apiType: string): LeaveTypeDisplay => {
    const mapping: Record<string, LeaveTypeDisplay> = {
        "annual": "Annual Leave",
        "sick": "Sick Leave",
        "casual": "Casual Leave",
        "maternity": "Maternity Leave",
        "paternity": "Paternity Leave",
        "unpaid": "Unpaid Leave",
    };
    return mapping[apiType.toLowerCase()] || "Casual Leave";
};

/**
 * Normalizes leave type to display format
 * Handles both API format and display format inputs
 * @param leaveType - Leave type in any format
 * @returns User-friendly display name
 */
export const normalizeLeaveType = (leaveType: string): LeaveTypeDisplay => {
    if (!leaveType) return "Casual Leave";

    // If it's already in display format (contains space), return it
    if (leaveType.includes(" ")) {
        return leaveType as LeaveTypeDisplay;
    }

    // Otherwise, convert from API format to display format
    return mapLeaveTypeToDisplay(leaveType);
};
