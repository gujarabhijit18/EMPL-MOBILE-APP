/**
 * WFH Approval Logic - Role-Based Access Control
 * 
 * Implements strict role hierarchy for WFH request approvals:
 * Admin → HR → Manager → Team Lead/Employee
 * 
 * Rules:
 * - Admin: Can approve/reject ALL requests across organization
 * - HR: Can approve/reject Manager, Team Lead, Employee requests (NOT Admin)
 * - Manager: Can approve/reject Team Lead, Employee requests in their department only
 * - Team Lead/Employee: Can only submit and view their own requests
 */

import { UserRole } from "../contexts/AuthContext";

// Role hierarchy levels (higher number = higher authority)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 5,
  hr: 4,
  manager: 3,
  team_lead: 2,
  employee: 1,
};

// Roles that can approve requests
export const APPROVER_ROLES: UserRole[] = ["admin", "hr", "manager"];

// Roles that can only submit/view their own requests
export const SUBMITTER_ONLY_ROLES: UserRole[] = ["team_lead", "employee"];

export interface WfhApprovalContext {
  approverRole: UserRole;
  approverDepartment?: string;
  approverId: string | number;
}

export interface WfhRequestContext {
  requesterId: string | number;
  requesterRole: UserRole;
  requesterDepartment?: string;
  status: "Pending" | "Approved" | "Rejected";
}

export interface ApprovalAction {
  approverRole: UserRole;
  approverId: string | number;
  action: "approved" | "rejected";
  actionDateTime: string;
  remarks?: string;
}

/**
 * Check if a user can approve/reject a specific WFH request
 */
export function canApproveWfhRequest(
  approver: WfhApprovalContext,
  request: WfhRequestContext
): { canApprove: boolean; reason?: string } {
  const { approverRole, approverDepartment, approverId } = approver;
  const { requesterId, requesterRole, requesterDepartment, status } = request;

  // Rule: Cannot approve already processed requests (unless Admin override)
  if (status !== "Pending") {
    if (approverRole === "admin") {
      return { canApprove: true }; // Admin can override
    }
    return { 
      canApprove: false, 
      reason: "This request has already been processed." 
    };
  }

  // Rule: Cannot approve own request
  if (String(approverId) === String(requesterId)) {
    return { 
      canApprove: false, 
      reason: "You cannot approve your own request." 
    };
  }

  // Rule: Team Lead and Employee cannot approve any requests
  if (SUBMITTER_ONLY_ROLES.includes(approverRole)) {
    return { 
      canApprove: false, 
      reason: "Your role does not have approval permissions." 
    };
  }

  // Admin can approve ALL requests
  if (approverRole === "admin") {
    return { canApprove: true };
  }

  // HR can approve Manager, Team Lead, and Employee requests (NOT Admin)
  if (approverRole === "hr") {
    if (requesterRole === "admin") {
      return { 
        canApprove: false, 
        reason: "HR cannot approve Admin requests." 
      };
    }
    // HR can approve across all departments
    return { canApprove: true };
  }

  // Manager can approve Team Lead and Employee requests in their department
  if (approverRole === "manager") {
    // Cannot approve Admin, HR, or other Manager requests
    if (["admin", "hr", "manager"].includes(requesterRole)) {
      return { 
        canApprove: false, 
        reason: `Managers cannot approve ${requesterRole.replace("_", " ")} requests.` 
      };
    }

    // Must be in the same department
    if (approverDepartment && requesterDepartment && 
        approverDepartment.toLowerCase() !== requesterDepartment.toLowerCase()) {
      return { 
        canApprove: false, 
        reason: "You can only approve requests from your department." 
      };
    }

    return { canApprove: true };
  }

  return { 
    canApprove: false, 
    reason: "You do not have permission to approve this request." 
  };
}

/**
 * Check if a user can view a specific WFH request
 */
export function canViewWfhRequest(
  viewer: WfhApprovalContext,
  request: WfhRequestContext
): boolean {
  const { approverRole, approverDepartment, approverId } = viewer;
  const { requesterId, requesterDepartment } = request;

  // Users can always view their own requests
  if (String(approverId) === String(requesterId)) {
    return true;
  }

  // Admin can view all requests
  if (approverRole === "admin") {
    return true;
  }

  // HR can view all requests across departments
  if (approverRole === "hr") {
    return true;
  }

  // Manager can view requests in their department
  if (approverRole === "manager") {
    if (!approverDepartment || !requesterDepartment) {
      return false;
    }
    return approverDepartment.toLowerCase() === requesterDepartment.toLowerCase();
  }

  // Team Lead and Employee can only view their own requests
  return false;
}

/**
 * Filter WFH requests based on user's view permissions
 */
export function filterViewableRequests<T extends WfhRequestContext>(
  requests: T[],
  viewer: WfhApprovalContext
): T[] {
  return requests.filter(request => canViewWfhRequest(viewer, request));
}

/**
 * Get requests that the user can approve
 */
export function getApprovableRequests<T extends WfhRequestContext>(
  requests: T[],
  approver: WfhApprovalContext
): T[] {
  return requests.filter(request => {
    const { canApprove } = canApproveWfhRequest(approver, request);
    return canApprove;
  });
}

/**
 * Check if a user has any approval permissions
 */
export function hasApprovalPermissions(role: UserRole): boolean {
  return APPROVER_ROLES.includes(role);
}

/**
 * Get the display name for a role
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    admin: "Admin",
    hr: "HR",
    manager: "Manager",
    team_lead: "Team Lead",
    employee: "Employee",
  };
  return displayNames[role] || role;
}

/**
 * Normalize role string to UserRole type
 */
export function normalizeRole(role?: string): UserRole {
  if (!role) return "employee";
  
  const normalized = role.toLowerCase().replace(/\s+/g, "_");
  
  const roleMap: Record<string, UserRole> = {
    admin: "admin",
    hr: "hr",
    manager: "manager",
    team_lead: "team_lead",
    teamlead: "team_lead",
    "team lead": "team_lead",
    employee: "employee",
  };
  
  return roleMap[normalized] || "employee";
}

/**
 * Create approval action record
 */
export function createApprovalAction(
  approverRole: UserRole,
  approverId: string | number,
  action: "approved" | "rejected",
  remarks?: string
): ApprovalAction {
  return {
    approverRole,
    approverId,
    action,
    actionDateTime: new Date().toISOString(),
    remarks,
  };
}

/**
 * Check if request is locked (approved/rejected and not overridable)
 */
export function isRequestLocked(
  status: "Pending" | "Approved" | "Rejected",
  viewerRole: UserRole
): boolean {
  if (status === "Pending") return false;
  // Only Admin can override locked requests
  return viewerRole !== "admin";
}

/**
 * Get approval status message based on role and request
 */
export function getApprovalStatusMessage(
  approver: WfhApprovalContext,
  request: WfhRequestContext
): string {
  const { canApprove, reason } = canApproveWfhRequest(approver, request);
  
  if (canApprove) {
    return "You can approve or reject this request.";
  }
  
  return reason || "You cannot take action on this request.";
}

/**
 * Get requests grouped by approval status for a user
 */
export function groupRequestsByApprovalStatus<T extends WfhRequestContext>(
  requests: T[],
  approver: WfhApprovalContext
): {
  canApprove: T[];
  cannotApprove: T[];
  ownRequests: T[];
} {
  const canApprove: T[] = [];
  const cannotApprove: T[] = [];
  const ownRequests: T[] = [];

  requests.forEach(request => {
    if (String(approver.approverId) === String(request.requesterId)) {
      ownRequests.push(request);
    } else {
      const { canApprove: canAct } = canApproveWfhRequest(approver, request);
      if (canAct) {
        canApprove.push(request);
      } else {
        cannotApprove.push(request);
      }
    }
  });

  return { canApprove, cannotApprove, ownRequests };
}
