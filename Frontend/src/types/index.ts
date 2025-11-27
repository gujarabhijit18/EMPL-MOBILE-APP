// 📂 src/types.ts
// -----------------------------------------------------------------------------
// ✅ UNIVERSAL APP TYPES (Expo Ready)
// These types are designed for offline or local-storage based state management.
// No backend or API dependencies.
// -----------------------------------------------------------------------------

// -----------------------------
// ✅ User and Role Types
// -----------------------------
export type UserRole =
  | "admin"
  | "hr"
  | "manager"
  | "team_lead"
  | "employee";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  designation: string;
  joiningDate?: string;
  profilePhoto?: string;
  phone?: string;
  address?: string;
  managerId?: string;
  teamLeadId?: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
}

// -----------------------------
// ✅ Authentication (Offline Safe)
// -----------------------------
export interface LoginCredentials {
  email: string;
  otp?: string;
}

export interface LoginResponse {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  designation?: string;
  joiningDate?: string;
  // No access token — Expo app runs locally or via context storage
}

// -----------------------------
// ✅ Attendance System Types
// -----------------------------
export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  checkInLocation: GeoLocation;
  checkOutLocation?: GeoLocation;
  checkInSelfie?: string;
  checkOutSelfie?: string;
  workHours?: number;
  status:
    | "present"
    | "absent"
    | "late"
    | "half-day"
    | "holiday"
    | "weekend";
  overtime?: number;
  remarks?: string;
}

// -----------------------------
// ✅ Leave Management
// -----------------------------
export type LeaveType =
  | "sick"
  | "casual"
  | "earned"
  | "maternity"
  | "paternity"
  | "unpaid";

export type LeaveStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedDate?: string;
  rejectionReason?: string;
  documents?: string[]; // stored as file URIs in Expo FileSystem
  createdAt?: string;
  updatedAt?: string;
}

// -----------------------------
// ✅ Task Management
// -----------------------------
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus =
  | "todo"
  | "in-progress"
  | "review"
  | "completed"
  | "cancelled";

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  comment: string;
  createdAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string[]; // user IDs
  assignedBy: string; // user ID
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  startDate: string;
  completedDate?: string;
  projectId?: string;
  tags?: string[];
  attachments?: string[]; // file URIs
  comments?: TaskComment[];
  progress: number; // 0–100
  estimatedHours?: number;
  actualHours?: number;
  createdAt?: string;
  updatedAt?: string;
}

// -----------------------------
// ✅ Department
// -----------------------------
export interface Department {
  id: string;
  name: string;
  code: string;
  managerId: string;
  description?: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
}

// -----------------------------
// ✅ Notifications (Local Expo Storage)
// -----------------------------
export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt?: string;
  actionUrl?: string;
}

// -----------------------------
// ✅ Dashboard Analytics (Offline/Mocked)
// -----------------------------
export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  pendingTasks: number;
  completedTasks: number;
  pendingLeaveRequests: number;
  upcomingHolidays: number;
  totalDepartments: number;
}
