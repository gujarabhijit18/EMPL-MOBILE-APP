// 📂 src/services/ApiService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../config/api";

// Use the configuration for API base URL
const API_BASE_URL = API_CONFIG.getApiBaseUrl();

// ======================
// 🔹 Interfaces
// ======================
export interface EmployeeData {
  name: string;
  email: string;
  employee_id: string;
  password?: string;
  department?: string;
  designation?: string;
  phone?: string;
  address?: string;
  role?: string;
  gender?: string;
  resignation_date?: string;
  pan_card?: string;
  aadhar_card?: string;
  shift_type?: string;
  employee_type?: string;
  profile_photo?: { uri: string; name: string; type: string } | string;
  is_verified?: boolean;
  created_at?: string;
  user_id?: number;
}

export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  department?: string;
  designation?: string;
  role?: string;
  phone?: string;
  address?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  profile_photo?: string;
  resignation_date?: string;
  gender?: string;
  employee_type?: string;
  pan_card?: string;
  aadhar_card?: string;
  shift_type?: string;
  user_id?: number;
  is_verified?: boolean;  // Active/Inactive status (backend uses is_active)
  is_active?: boolean;    // Alternative field name used by backend
}

export interface LeaveRequestData {
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status?: string;
  days?: number;
  comments?: string;
}

export interface LeaveRequestResponse {
  leave_id: number;
  employee_id: string;
  leave_type?: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
  updated_at?: string;
  user_id?: number;
  days?: number;
  approved_by?: number;
  approved_at?: string | null;
  rejection_reason?: string | null;
  comments?: string;
  name?: string;
  department?: string;
  role?: string;
  profile_photo?: string;
  email?: string;
  user?: {
    user_id: number;
    employee_id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    profile_photo?: string;
  };
  approver?: {
    user_id: number;
    employee_id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    profile_photo?: string;
  };
}

export interface LeaveSummary {
  total_leaves: number;
  pending_leaves: number;
  approved_leaves: number;
  rejected_leaves: number;
  cancelled_leaves: number;
  total_days_taken: number;
  total_days_pending: number;
  total_days_approved: number;
  leave_by_type: {
    [key: string]: {
      taken: number;
      remaining: number;
    };
  };
}

export interface TeamLeavesResponse {
  leaves: LeaveRequestResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface LeaveNotification {
  notification_id: number;
  notification_type: string;
  title: string;
  message: string;
  user_id: number;
  leave_id: number;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: LeaveNotification[];
  total: number;
  unread_count: number;
}

// ======================
// 🔹 API Service Class
// ======================
class ApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // � Get current base URL for debugging
  getBaseUrl(): string {
    return this.baseURL;
  }

  // �� Fetch stored token from AsyncStorage
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem("token");
    } catch (error) {
      console.error("Error reading token:", error);
      return null;
    }
  }

  // 🧠 Universal request handler with better error handling
  private async request(endpoint: string, options: RequestInit = {}) {
    const token = await this.getToken();
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    };

    if (!url.endsWith("/test-cors")) {
      console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle validation errors (422) specially
        let errorMessage = `HTTP Error: ${response.status}`;
        
        if (response.status === 422 && data?.detail) {
          // FastAPI validation errors come as an array
          if (Array.isArray(data.detail)) {
            const validationErrors = data.detail.map((err: any) => {
              const field = err.loc ? err.loc.join('.') : 'unknown';
              return `${field}: ${err.msg}`;
            }).join(', ');
            errorMessage = `Validation Error: ${validationErrors}`;
          } else if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else {
            errorMessage = JSON.stringify(data.detail);
          }
        } else {
          errorMessage = data?.detail || data?.message || errorMessage;
        }
        
        console.error(`❌ API Error: ${errorMessage}`, { 
          url, 
          status: response.status, 
          data,
          detail: data?.detail 
        });
        throw new Error(errorMessage);
      }

      console.log(`✅ API Success: ${options.method || 'GET'} ${url}`);
      return data;
    } catch (error) {
      console.error("❌ API Error:", error);
      
      if (error instanceof TypeError && error.message.includes("Network request failed")) {
        throw new Error(`Cannot connect to backend at ${this.baseURL}. Please ensure the server is running.`);
      }
      
      throw error;
    }
  }

  // ======================
  // 🔹 Connection Test
  // ======================

  async testConnection(): Promise<{ status: string; message: string }> {
    try {
      const response = await this.request("/test-cors");
      return response;
    } catch (error: any) {
      throw new Error(`Backend connection failed: ${error.message}`);
    }
  }

  // ======================
  // 🔹 Authentication APIs
  // ======================

  async sendOTP(email: string): Promise<{ message: string; environment: string; otp_method: string; expires_in_minutes: number; otp?: number }> {
    try {
      console.log(`📤 Sending OTP to: ${email}`);
      console.log(`📡 Backend URL: ${this.baseURL}/auth/send-otp`);
      
      const token = await this.getToken();
      
      const response = await fetch(`${this.baseURL}/auth/send-otp`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `email=${encodeURIComponent(email)}`,
      });

      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error(`❌ OTP Send Failed: ${data.detail || response.statusText}`);
        throw new Error(data.detail || `Failed to send OTP: ${response.status}`);
      }
      
      console.log(`✅ OTP Sent Successfully:`, data);
      
      // In development/testing, log the OTP for easy access
      if (data.environment !== 'production' && data.otp) {
        console.log(`🔑 DEV OTP: ${data.otp}`);
      }
      
      return data;
    } catch (error: any) {
      console.error("❌ Send OTP Error:", error);
      if (error.message.includes("Network request failed")) {
        throw new Error(`Cannot connect to backend at ${this.baseURL}. Please check:\n• Backend server is running\n• IP address is correct: ${this.baseURL}\n• No firewall blocking connection`);
      }
      throw error;
    }
  }

  async verifyOTP(email: string, otp: string): Promise<{
    access_token: string;
    token_type: string;
    role: string;
    user_id: number;
    email: string;
    name: string;
    department?: string;
    designation?: string;
    joining_date?: string;
    environment: string;
  }> {
    try {
      console.log(`🔐 Verifying OTP for: ${email}`);
      console.log(`📡 Backend URL: ${this.baseURL}/auth/verify-otp`);
      console.log(`🔑 OTP: ${otp}`);
      
      const token = await this.getToken();
      
      const response = await fetch(`${this.baseURL}/auth/verify-otp`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`,
      });

      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error(`❌ OTP Verification Failed: ${data.detail || response.statusText}`);
        throw new Error(data.detail || `Invalid OTP: ${response.status}`);
      }
      
      console.log(`✅ OTP Verified Successfully`);
      
      // Store token in AsyncStorage
      try {
        await AsyncStorage.setItem("token", data.access_token);
        await AsyncStorage.setItem("user", JSON.stringify(data));
        console.log(`💾 Auth data stored successfully`);
      } catch (error) {
        console.error("❌ Error storing auth data:", error);
      }
      
      return data;
    } catch (error: any) {
      console.error("❌ Verify OTP Error:", error);
      if (error.message.includes("Network request failed")) {
        throw new Error(`Cannot connect to backend at ${this.baseURL}`);
      }
      throw error;
    }
  }

  // ======================
  // 🔹 User Profile APIs
  // ======================

  async getCurrentUserProfile(): Promise<Employee> {
    return this.request("/employees/me");
  }

  async updateUserProfile(userId: string, profileData: Partial<EmployeeData>): Promise<Employee> {
    return this.request(`/employees/${userId}`, {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  // ======================
  // 🔹 Employee APIs
  // ======================

  async getEmployees(): Promise<Employee[]> {
    return this.request("/employees");
  }

  async createEmployee(employeeData: EmployeeData): Promise<Employee> {
    const formData = new FormData();

    // Add a default password if not provided
    const dataWithPassword: any = {
      ...employeeData,
      password: (employeeData as any).password || "DefaultPass@123",
    };

    Object.entries(dataWithPassword).forEach(([key, value]) => {
      // Skip profile_photo if it's not a file URI
      if (key === "profile_photo") {
        if (typeof value === "string" && value.startsWith("file://")) {
          // Extract filename from URI
          const uriParts = value.split('/');
          const filename = uriParts[uriParts.length - 1];
          
          // Create a proper file object for React Native
          const file: any = {
            uri: value,
            type: 'image/jpeg', // Default to jpeg, could be detected from extension
            name: filename || 'profile.jpg',
          };
          
          formData.append("profile_photo", file);
        } else if (typeof value === "object" && value && "uri" in value) {
          formData.append("profile_photo", value as any);
        }
        // Skip if it's empty or just a URL string (existing photo)
        return;
      }
      
      // Add other fields if they have values
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, String(value));
      }
    });

    const token = await this.getToken();

    console.log(`📤 Creating employee with FormData`);

    const response = await fetch(`${this.baseURL}/employees/register`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Don't set Content-Type, let the browser set it with boundary for multipart/form-data
      },
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      console.error(`❌ Create Employee Failed:`, data);
      const errorMessage = data.detail || data.message || `HTTP ${response.status}`;
      throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }

    console.log(`✅ Employee Created:`, data);
    return data;
  }

  async updateEmployee(userId: string, employeeData: Partial<EmployeeData>): Promise<Employee> {
    const token = await this.getToken();
    const formData = new FormData();

    // Add all fields to FormData
    Object.entries(employeeData).forEach(([key, value]) => {
      // Skip profile_photo if it's not a file URI or if it's empty
      if (key === "profile_photo") {
        if (typeof value === "string" && value.startsWith("file://")) {
          // Extract filename from URI
          const uriParts = value.split('/');
          const filename = uriParts[uriParts.length - 1];
          
          // Create a proper file object for React Native
          const file: any = {
            uri: value,
            type: 'image/jpeg', // Default to jpeg, could be detected from extension
            name: filename || 'profile.jpg',
          };
          
          formData.append("profile_photo", file);
        } else if (typeof value === "object" && value && "uri" in value) {
          formData.append("profile_photo", value as any);
        }
        // Skip if it's an existing URL (don't re-upload)
        return;
      }
      
      // Skip password in updates
      if (key === "password") {
        return;
      }
      
      // Add other fields if they have values
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, String(value));
      }
    });

    console.log(`📤 Updating employee ${userId} with FormData`);

    const response = await fetch(`${this.baseURL}/employees/${userId}`, {
      method: "PUT",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Don't set Content-Type, let the browser set it with boundary for multipart/form-data
      },
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      console.error(`❌ Update Employee Failed:`, data);
      const errorMessage = data.detail || data.message || `HTTP ${response.status}`;
      throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }

    console.log(`✅ Employee Updated:`, data);
    return data;
  }

  async deleteEmployee(userId: string): Promise<void> {
    const token = await this.getToken();

    console.log(`🗑️ Deleting employee ${userId}`);

    const response = await fetch(`${this.baseURL}/employees/${userId}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const errorMessage = data.detail || data.message || `Failed to delete employee ${userId}`;
      console.error(`❌ Delete Employee Failed:`, data);
      throw new Error(errorMessage);
    }

    console.log(`✅ Employee ${userId} deleted successfully`);
  }

  async toggleEmployeeStatus(userId: string, isActive: boolean): Promise<Employee> {
    const token = await this.getToken();

    console.log(`🔄 Toggling employee ${userId} status to ${isActive ? 'Active' : 'Inactive'}`);

    const response = await fetch(`${this.baseURL}/employees/${userId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ is_active: isActive }),
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      console.error(`❌ Toggle Status Failed:`, data);
      const errorMessage = data.detail || data.message || `Failed to update employee status`;
      throw new Error(errorMessage);
    }

    console.log(`✅ Employee status updated successfully`);
    return data;
  }

  // ======================
  // 🔹 Leave APIs
  // ======================

  // 1. GET - View My Leaves
  async getMyLeaves(status?: string, page?: number, pageSize?: number): Promise<LeaveRequestResponse[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (page) params.append('page', page.toString());
    if (pageSize) params.append('page_size', pageSize.toString());
    
    const queryString = params.toString();
    const endpoint = `/leave/${queryString ? '?' + queryString : ''}`;
    
    console.log("📥 Fetching my leaves:", endpoint);
    return this.request(endpoint);
  }

  // 2. POST - Request Leave (Submit new leave request)
  async submitLeaveRequest(leaveData: LeaveRequestData): Promise<LeaveRequestResponse> {
    console.log("📤 Submitting leave request:", leaveData);
    return this.request("/leave/", {
      method: "POST",
      body: JSON.stringify(leaveData),
    });
  }

  // 3. PUT - Approve Leave Request (Old endpoint)
  async approveLeaveRequestOld(leaveId: number): Promise<LeaveRequestResponse> {
    console.log("✅ Approving leave request (old):", leaveId);
    return this.request(`/leave/${leaveId}/approve`, {
      method: "PUT",
    });
  }

  // 4. GET - Get My Leave Summary (calculated from /leave/ list)
  async getMyLeaveSummary(): Promise<LeaveSummary> {
    console.log("📥 Fetching leave summary");
    try {
      const leaves = await this.request("/leave/");
      const summary: LeaveSummary = {
        total_leaves: leaves.length,
        pending_leaves: leaves.filter((l: any) => l.status === "Pending").length,
        approved_leaves: leaves.filter((l: any) => l.status === "Approved").length,
        rejected_leaves: leaves.filter((l: any) => l.status === "Rejected").length,
        cancelled_leaves: leaves.filter((l: any) => l.status === "Cancelled").length,
        total_days_taken: 0,
        total_days_pending: 0,
        total_days_approved: 0,
        leave_by_type: {}
      };
      leaves.forEach((leave: any) => {
        const days = leave.days || 1;
        if (leave.status === "Approved") {
          summary.total_days_approved += days;
          summary.total_days_taken += days;
        } else if (leave.status === "Pending") {
          summary.total_days_pending += days;
        }
        const leaveType = leave.leave_type || "Other";
        if (!summary.leave_by_type[leaveType]) {
          summary.leave_by_type[leaveType] = { taken: 0, remaining: 10 };
        }
        if (leave.status === "Approved") {
          summary.leave_by_type[leaveType].taken += days;
        }
      });
      return summary;
    } catch (error: any) {
      console.log("⚠️ Leave summary calculation failed, using defaults");
      return {
        total_leaves: 0,
        pending_leaves: 0,
        approved_leaves: 0,
        rejected_leaves: 0,
        cancelled_leaves: 0,
        total_days_taken: 0,
        total_days_pending: 0,
        total_days_approved: 0,
        leave_by_type: {}
      };
    }
  }

  // 5. GET - Get Leave Details by ID
  async getLeaveDetails(leaveId: number): Promise<LeaveRequestResponse> {
    console.log("📥 Fetching leave details:", leaveId);
    try {
      return await this.request(`/leaves/${leaveId}`);
    } catch (error: any) {
      // Fallback to singular path if plural is not available
      if (String(error.message).includes("Not Found")) {
        return this.request(`/leave/${leaveId}`);
      }
      throw error;
    }
  }

  // 6. PUT - Update Leave Request
  async updateLeaveRequest(leaveId: number, leaveData: Partial<LeaveRequestData>): Promise<LeaveRequestResponse> {
    console.log("📤 Updating leave request:", leaveId, leaveData);
    return this.request(`/leave/${leaveId}`, {
      method: "PUT",
      body: JSON.stringify(leaveData),
    });
  }

  // 7. DELETE - Delete Leave Request
  async deleteLeaveRequest(leaveId: number): Promise<{ message: string }> {
    console.log("🗑️ Deleting leave request:", leaveId);
    return this.request(`/leave/${leaveId}`, {
      method: "DELETE",
    });
  }

  // 8. GET - Get Team Leaves (Role-based with strict department isolation)
  async getTeamLeaves(page?: number, pageSize?: number, status?: string): Promise<TeamLeavesResponse> {
    console.log("📥 Fetching team leaves based on role");
    
    try {
      // Get current user to determine which endpoint to call
      const currentUser = await this.getCurrentUserProfile();
      const userRole = currentUser.role?.toLowerCase() || 'employee';
      
      console.log(`👤 User role: ${userRole}, Department: ${currentUser.department}`);
      
      let leaves: any[] = [];
      
      // Call appropriate endpoint based on role
      if (userRole === 'admin') {
        // Admin: Get ALL leaves from all departments
        console.log("📥 Admin: Fetching ALL leaves...");
        leaves = await this.request("/leave/all");
        console.log(`✅ Admin fetched ${leaves.length} total leaves`);
      } else if (userRole === 'hr' || userRole === 'manager') {
        // HR/Manager: Get only their department's Employee/TeamLead leaves
        console.log(`📥 ${userRole}: Fetching department leaves...`);
        leaves = await this.request("/leave/department");
        console.log(`✅ ${userRole} fetched ${leaves.length} department leaves`);
      } else {
        // TeamLead/Employee: Get only own leaves
        console.log(`📥 ${userRole}: Fetching own leaves...`);
        leaves = await this.request("/leave/my");
        console.log(`✅ ${userRole} fetched ${leaves.length} own leaves`);
      }
      
      // Filter by status if provided
      const filteredLeaves = status ? leaves.filter((l: any) => l.status === status) : leaves;
      console.log(`📊 After status filter: ${filteredLeaves.length} leaves`);
      
      return {
        leaves: filteredLeaves,
        total: filteredLeaves.length,
        page: page || 1,
        page_size: pageSize || filteredLeaves.length,
        total_pages: 1
      };
    } catch (error: any) {
      console.error("❌ Failed to fetch team leaves:", error);
      return { leaves: [], total: 0, page: 1, page_size: 0, total_pages: 0 };
    }
  }

  // 9. POST - Approve Leave Request (New endpoint with comments)
  async approveLeaveRequest(leaveId: number, comments?: string): Promise<LeaveRequestResponse> {
    console.log("✅ Approving leave request:", leaveId);
    // Try POST first, fallback to PUT
    try {
      return await this.request(`/leave/${leaveId}/approve`, {
        method: "POST",
        body: JSON.stringify({ comments: comments || "Approved" }),
      });
    } catch (error) {
      // Fallback to PUT method (old endpoint)
      return this.request(`/leave/${leaveId}/approve`, {
        method: "PUT",
      });
    }
  }

  // 10. POST - Reject Leave Request
  async rejectLeaveRequest(leaveId: number, rejectionReason: string): Promise<LeaveRequestResponse> {
    console.log("❌ Rejecting leave request:", leaveId);
    try {
      return await this.request(`/leave/${leaveId}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });
    } catch (error) {
      // Fallback - update status directly
      return this.request(`/leave/${leaveId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "Rejected", rejection_reason: rejectionReason }),
      });
    }
  }

  // 11. GET - Get My Notifications
  async getMyNotifications(): Promise<NotificationsResponse> {
    console.log("📥 Fetching notifications");
    try {
      return await this.request("/leave/notifications/my");
    } catch (error) {
      return { notifications: [], total: 0, unread_count: 0 };
    }
  }

  // 12. PUT - Mark Notification As Read
  async markNotificationAsRead(notificationId: number): Promise<LeaveNotification> {
    console.log("✅ Marking notification as read:", notificationId);
    return this.request(`/leave/notifications/${notificationId}/read`, {
      method: "PUT",
    });
  }

  // 13. PUT - Mark All Notifications As Read
  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    console.log("✅ Marking all notifications as read");
    return this.request("/leave/notifications/read-all", {
      method: "PUT",
    });
  }

  // 14. GET - Export Leaves Excel (Client-side CSV generation as backend endpoint doesn't exist)
  async exportLeavesExcel(startDate?: string, endDate?: string): Promise<void> {
    console.log("📥 Exporting leaves to CSV");
    console.log("📅 Date range:", { startDate, endDate });
    
    try {
      // Get current user to check role
      const currentUser = await this.getCurrentUserProfile();
      const userRole = currentUser.role?.toLowerCase() || 'employee';
      
      console.log("👤 Current user role:", userRole);
      
      let leaves: any = [];
      
      // For Admin/HR/Manager - try to get ALL team leaves first
      if (['admin', 'hr', 'manager'].includes(userRole)) {
        console.log("📥 Fetching ALL team leaves (admin/hr/manager view)...");
        try {
          // Get both pending approvals and history
          const approvalsData = await this.request("/leave/approvals");
          const historyData = await this.request("/leave/approvals/history");
          
          console.log("📊 Approvals:", approvalsData?.length || 0);
          console.log("📊 History:", historyData?.length || 0);
          
          // Combine both arrays
          leaves = [...(Array.isArray(approvalsData) ? approvalsData : []), 
                    ...(Array.isArray(historyData) ? historyData : [])];
          
          console.log("📊 Total team leaves:", leaves.length);
        } catch (error) {
          console.warn("⚠️ Failed to fetch team leaves:", error);
        }
      }
      
      // If no team leaves or regular employee, fetch user's own leaves
      if (leaves.length === 0) {
        console.log("📥 Fetching user's own leaves (last 1 year)...");
        try {
          leaves = await this.request("/leave/?period=last_1_year");
        } catch (error) {
          console.warn("⚠️ Failed to fetch user leaves:", error);
          leaves = [];
        }
      }
      
      console.log("📦 Raw API response:", leaves);
      console.log("📦 Response type:", typeof leaves);
      console.log("📦 Is array:", Array.isArray(leaves));
      
      // Ensure leaves is an array
      let leaveArray: any[] = [];
      if (Array.isArray(leaves)) {
        leaveArray = leaves;
      } else if (leaves && typeof leaves === 'object') {
        // Check if it's wrapped in a data property
        if (Array.isArray(leaves.data)) {
          leaveArray = leaves.data;
        } else if (Array.isArray(leaves.leaves)) {
          leaveArray = leaves.leaves;
        } else {
          console.warn("⚠️ Unexpected response format:", Object.keys(leaves));
        }
      }
      
      console.log(`📊 Extracted ${leaveArray.length} leave records`);
      
      // Log first record for debugging
      if (leaveArray.length > 0) {
        console.log("📝 Sample record:", JSON.stringify(leaveArray[0], null, 2));
      }
      
      // Filter by date range if provided
      let filteredLeaves = leaveArray;
      if (startDate || endDate) {
        filteredLeaves = leaveArray.filter((leave: any) => {
          const leaveStartDate = new Date(leave.start_date);
          if (startDate && leaveStartDate < new Date(startDate)) return false;
          if (endDate && leaveStartDate > new Date(endDate)) return false;
          return true;
        });
        console.log(`📊 Filtered to ${filteredLeaves.length} records for date range`);
      }
      
      // Generate CSV content
      const headers = ['Leave ID', 'Employee ID', 'Name', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason', 'Applied On'];
      const csvRows = [headers.join(',')];
      
      if (filteredLeaves.length === 0) {
        // Add a note row if no data
        csvRows.push('"No leave records found for the selected period"');
        console.log("⚠️ No leave records to export");
      } else {
        console.log(`✅ Adding ${filteredLeaves.length} records to CSV`);
        filteredLeaves.forEach((leave: any, index: number) => {
          // Calculate days if not provided
          let days = leave.days;
          if (!days && leave.start_date && leave.end_date) {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          }
          
          const row = [
            leave.leave_id || '',
            leave.employee_id || leave.user?.employee_id || '',
            leave.name || leave.user?.name || '',
            leave.leave_type || leave.type || '',
            leave.start_date || '',
            leave.end_date || '',
            days || '',
            leave.status || '',
            `"${(leave.reason || '').replace(/"/g, '""')}"`, // Escape quotes in reason
            leave.created_at ? new Date(leave.created_at).toLocaleDateString() : '',
          ];
          csvRows.push(row.join(','));
          
          if (index === 0) {
            console.log("📝 First CSV row:", row.join(','));
          }
        });
      }
      
      const csvContent = csvRows.join('\n');
      console.log(`📄 CSV content length: ${csvContent.length} characters`);
      console.log(`📄 CSV rows: ${csvRows.length}`);
      
      // Save and share the CSV file
      const FileSystem = await import('expo-file-system/legacy');
      const Sharing = await import('expo-sharing');
      
      const fileName = `Leaves_Export_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      console.log("📁 Saving CSV to:", fileUri);
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      console.log("✅ CSV created successfully with", filteredLeaves.length, "records");
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Save Leaves Export',
          UTI: 'public.comma-separated-values-text',
        });
        console.log("✅ CSV shared successfully");
      } else {
        console.log("✅ CSV saved to:", fileUri);
      }
    } catch (error: any) {
      console.error("❌ Leave Export Failed:", error);
      throw new Error(error.message || "Failed to export leave data");
    }
  }

  // Legacy method for backward compatibility
  async getLeaveRequests(): Promise<LeaveRequestResponse[]> {
    return this.getMyLeaves();
  }

  // ======================
  // 🔹 Dashboard APIs
  // ======================

  async getDashboardByRole(role: string) {
    switch (role) {
      case "admin":
        return this.request("/dashboard/admin");
      case "hr":
        return this.request("/dashboard/hr");
      case "manager":
        return this.request("/dashboard/manager");
      case "team_lead":
        return this.request("/dashboard/team-lead");
      case "employee":
        return this.request("/dashboard/employee");
      default:
        throw new Error("Invalid role");
    }
  }

  // ======================
  // 🔹 Export APIs
  // ======================

  async exportEmployeesCSV(): Promise<void> {
    const token = await this.getToken();
    
    console.log("📥 Downloading CSV from:", `${this.baseURL}/employees/export/csv`);
    
    try {
      // Use legacy API from expo-file-system
      const FileSystem = await import('expo-file-system/legacy');
      const Sharing = await import('expo-sharing');
      
      const fileName = `employees_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      console.log("📁 Downloading to:", fileUri);
      
      const downloadResult = await FileSystem.downloadAsync(
        `${this.baseURL}/employees/export/csv`,
        fileUri,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      
      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download CSV: ${downloadResult.status}`);
      }
      
      console.log("✅ CSV downloaded to:", downloadResult.uri);
      
      // Share the file
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Save Employee CSV',
          UTI: 'public.comma-separated-values-text',
        });
        console.log("✅ CSV shared successfully");
      } else {
        console.log("✅ CSV saved to:", downloadResult.uri);
      }
    } catch (error: any) {
      console.error("❌ CSV Export Failed:", error);
      throw new Error(error.message || "Failed to export CSV");
    }
  }

  async exportEmployeesPDF(): Promise<void> {
    const token = await this.getToken();
    
    console.log("📥 Downloading PDF from:", `${this.baseURL}/employees/export/pdf`);
    
    try {
      // Use legacy API from expo-file-system
      const FileSystem = await import('expo-file-system/legacy');
      const Sharing = await import('expo-sharing');
      
      const fileName = `employees_report_${new Date().toISOString().split('T')[0]}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      console.log("📁 Downloading to:", fileUri);
      
      const downloadResult = await FileSystem.downloadAsync(
        `${this.baseURL}/employees/export/pdf`,
        fileUri,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      
      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download PDF: ${downloadResult.status}`);
      }
      
      console.log("✅ PDF downloaded to:", downloadResult.uri);
      
      // Share the file
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Employee Report PDF',
          UTI: 'com.adobe.pdf',
        });
        console.log("✅ PDF shared successfully");
      } else {
        console.log("✅ PDF saved to:", downloadResult.uri);
      }
    } catch (error: any) {
      console.error("❌ PDF Export Failed:", error);
      throw new Error(error.message || "Failed to export PDF");
    }
  }

  async bulkUploadEmployees(file: any): Promise<{
    success: boolean;
    created: number;
    errors: number;
    error_details?: string[];
    message: string;
  }> {
    try {
      const token = await this.getToken();
      
      if (!token) {
        throw new Error("Authentication required. Please log in again.");
      }

      console.log("📤 Uploading file for bulk import:", file.name);
      console.log("📄 File details:", {
        name: file.name,
        type: file.type,
        uri: file.uri,
        size: file.size
      });

      // Test connection first
      try {
        const testResponse = await fetch(`${this.baseURL}/test-cors`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!testResponse.ok) {
          throw new Error(`Backend not responding (status: ${testResponse.status})`);
        }
        console.log("✅ Backend connection test passed");
      } catch (testError: any) {
        console.error("❌ Backend connection test failed:", testError);
        throw new Error(
          `Cannot connect to backend at ${this.baseURL}.\n\n` +
          `Please check:\n` +
          `• Backend server is running on port 8000\n` +
          `• IP address is correct: ${this.baseURL}\n` +
          `• No firewall blocking the connection\n` +
          `• You are on the same WiFi network\n\n` +
          `Error: ${testError.message}`
        );
      }

      // Create FormData with proper React Native structure
      const formData = new FormData();
      
      // Handle both web File objects and React Native file objects
      if (file.uri) {
        // React Native file object - use the exact structure RN expects
        const fileToUpload: any = {
          uri: file.uri,
          type: file.type || 'application/octet-stream',
          name: file.name || 'upload.pdf',
        };
        
        // @ts-ignore - React Native FormData accepts this structure
        formData.append('file', fileToUpload);
        console.log("📱 Uploading React Native file:", fileToUpload);
      } else {
        // Web File object
        formData.append('file', file);
        console.log("🌐 Uploading Web file:", file.name);
      }

      console.log("🔗 Upload URL:", `${this.baseURL}/employees/bulk-upload`);
      console.log("🔑 Auth token present:", !!token);

      // Use XMLHttpRequest for React Native file uploads (more reliable than fetch)
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.onload = () => {
          console.log("📊 Response status:", xhr.status);
          
          try {
            const data = JSON.parse(xhr.responseText);
            
            if (xhr.status >= 200 && xhr.status < 300) {
              console.log("✅ Bulk upload completed:", data);
              resolve(data);
            } else {
              console.error("❌ Bulk Upload Failed:", {
                status: xhr.status,
                statusText: xhr.statusText,
                data
              });
              const errorMessage = data.detail || data.message || `Upload failed with status ${xhr.status}`;
              reject(new Error(errorMessage));
            }
          } catch (parseError) {
            console.error("❌ Failed to parse response:", parseError);
            reject(new Error(`Server response error: ${xhr.responseText}`));
          }
        };
        
        xhr.onerror = () => {
          console.error("❌ Network error during upload");
          reject(new Error(
            `Network error during upload.\n\n` +
            `Please check:\n` +
            `• Backend server is running\n` +
            `• IP address is correct: ${this.baseURL}\n` +
            `• No firewall blocking the connection\n` +
            `• You are on the same network`
          ));
        };
        
        xhr.ontimeout = () => {
          console.error("❌ Upload timeout");
          reject(new Error("Upload timeout. The file may be too large or the connection is slow."));
        };
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            console.log(`📤 Upload progress: ${percentComplete.toFixed(0)}%`);
          }
        };
        
        xhr.open('POST', `${this.baseURL}/employees/bulk-upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 60000; // 60 second timeout
        
        console.log("🚀 Starting upload...");
        xhr.send(formData);
      });
      
    } catch (error: any) {
      console.error("❌ Bulk upload error:", error);
      throw error;
    }
  }

  // ======================
  // 🔹 Task Management APIs
  // ======================

  // 1. POST - Create My Task
  async createTask(taskData: {
    title: string;
    description: string;
    due_date: string;
    priority: "Low" | "Medium" | "High" | "Urgent";
    assigned_to: number;
    assigned_by: number;
  }): Promise<any> {
    console.log("📤 Creating task:", taskData);
    return this.request("/tasks/", {
      method: "POST",
      body: JSON.stringify(taskData),
    });
  }

  // 2. GET - My Tasks
  async getMyTasks(): Promise<any[]> {
    console.log("📥 Fetching my tasks");
    return this.request("/tasks/");
  }

  // 3. PUT - Update Task Status
  async updateTaskStatus(taskId: number, statusUpdate: {
    status: "Pending" | "In Progress" | "Completed" | "Cancelled";
    resume_reason?: string;
  }): Promise<any> {
    console.log("📤 Updating task status:", taskId, statusUpdate);
    
    // Build query parameters
    const params = new URLSearchParams();
    params.append('status', statusUpdate.status);
    if (statusUpdate.resume_reason) {
      params.append('resume_reason', statusUpdate.resume_reason);
    }
    
    return this.request(`/tasks/${taskId}/status?${params.toString()}`, {
      method: "PUT",
    });
  }

  // 4. GET - My Tasks Hierarchy
  async getMyTasksHierarchy(): Promise<{ hierarchy: any }> {
    console.log("📥 Fetching tasks hierarchy");
    return this.request("/tasks/hierarchy");
  }

  // 5. POST - My Task Report
  async getMyTaskReport(filter: {
    period?: "daily" | "weekly" | "monthly" | "custom";
    start_date?: string;
    end_date?: string;
    date_field?: "created_at" | "updated_at" | "due_date";
  }): Promise<any> {
    console.log("📥 Fetching my task report:", filter);
    return this.request("/tasks/reports/me", {
      method: "POST",
      body: JSON.stringify(filter),
    });
  }

  // 6. DELETE - Delete Task
  async deleteTask(taskId: number): Promise<{ message: string }> {
    console.log("🗑️ Deleting task:", taskId);
    return this.request(`/tasks/${taskId}`, {
      method: "DELETE",
    });
  }

  // ======================
  // 🔹 Attendance APIs
  // ======================

  async checkIn(userId: number, gpsLocation: string, selfie: string): Promise<{
    gps_location: string;
    selfie: string;
    attendance_id: number;
    user_id: number;
    check_in: string;
    check_out: string | null;
    total_hours: number;
  }> {
    // Clean the base64 string - remove any data URI prefix if present
    let cleanSelfie = selfie;
    if (selfie.includes('data:image')) {
      cleanSelfie = selfie.split(',')[1];
    }
    // Remove any whitespace or newlines
    cleanSelfie = cleanSelfie.replace(/\s/g, '');
    
    console.log("🔵 checkIn called with:", { 
      userId, 
      gpsLocation, 
      originalLength: selfie.length,
      cleanedLength: cleanSelfie.length,
      hasDataUri: selfie.includes('data:image')
    });
    
    const token = await this.getToken();
    const url = `${this.baseURL}/attendance/check-in/json`;  // Use JSON endpoint
    
    // Parse GPS location string to object
    const [lat, lon] = gpsLocation.split(',').map(s => parseFloat(s.trim()));
    const locationObject = {
      latitude: lat,
      longitude: lon,
    };
    
    const requestBody = {
      user_id: userId,
      gps_location: locationObject,
      selfie: cleanSelfie,
    };
    
    console.log("📤 Check-in request:", {
      url,
      user_id: userId,
      gps_location: locationObject,
      selfie_length: cleanSelfie.length,
      selfie_preview: cleanSelfie.substring(0, 50) + '...'
    });
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error(`❌ Check-in failed:`, {
          status: response.status,
          data,
          requestBody: {
            user_id: userId,
            gps_location: locationObject,
            selfie_length: cleanSelfie.length
          }
        });
        
        let errorMessage = `HTTP Error: ${response.status}`;
        if (response.status === 422 && data?.detail) {
          if (Array.isArray(data.detail)) {
            const validationErrors = data.detail.map((err: any) => {
              const field = err.loc ? err.loc.join('.') : 'unknown';
              return `${field}: ${err.msg}`;
            }).join(', ');
            errorMessage = `Validation Error: ${validationErrors}`;
          } else {
            errorMessage = data.detail;
          }
        } else {
          errorMessage = data?.detail || data?.message || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      console.log("✅ Check-in successful:", data);
      return data;
    } catch (error: any) {
      console.error("❌ Check-in error:", error);
      throw error;
    }
  }

  async checkOut(userId: number, gpsLocation: string, selfie: string, workSummary?: string): Promise<{
    gps_location: string;
    selfie: string;
    attendance_id: number;
    user_id: number;
    check_in: string;
    check_out: string;
    total_hours: number;
  }> {
    // Clean the base64 string - remove any data URI prefix if present
    let cleanSelfie = selfie;
    if (selfie.includes('data:image')) {
      cleanSelfie = selfie.split(',')[1];
    }
    // Remove any whitespace or newlines
    cleanSelfie = cleanSelfie.replace(/\s/g, '');
    
    console.log("🔵 checkOut called with:", { 
      userId, 
      gpsLocation, 
      workSummary,
      originalLength: selfie.length,
      cleanedLength: cleanSelfie.length,
      hasDataUri: selfie.includes('data:image')
    });
    
    const token = await this.getToken();
    const url = `${this.baseURL}/attendance/check-out/json`;  // Use JSON endpoint
    
    // Parse GPS location string to object
    const [lat, lon] = gpsLocation.split(',').map(s => parseFloat(s.trim()));
    const locationObject = {
      latitude: lat,
      longitude: lon,
    };
    
    const requestBody = {
      user_id: userId,
      gps_location: locationObject,
      selfie: cleanSelfie,
      work_summary: workSummary || "Completed daily tasks",  // Required by backend
    };
    
    console.log("📤 Check-out request:", {
      url,
      user_id: userId,
      gps_location: locationObject,
      work_summary: workSummary,
      selfie_length: cleanSelfie.length,
      selfie_preview: cleanSelfie.substring(0, 50) + '...'
    });
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error(`❌ Check-out failed:`, {
          status: response.status,
          data,
          requestBody: {
            user_id: userId,
            gps_location: locationObject,
            selfie_length: cleanSelfie.length
          }
        });
        
        let errorMessage = `HTTP Error: ${response.status}`;
        if (response.status === 422 && data?.detail) {
          if (Array.isArray(data.detail)) {
            const validationErrors = data.detail.map((err: any) => {
              const field = err.loc ? err.loc.join('.') : 'unknown';
              return `${field}: ${err.msg}`;
            }).join(', ');
            errorMessage = `Validation Error: ${validationErrors}`;
          } else {
            errorMessage = data.detail;
          }
        } else {
          errorMessage = data?.detail || data?.message || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      console.log("✅ Check-out successful:", data);
      return data;
    } catch (error: any) {
      console.error("❌ Check-out error:", error);
      throw error;
    }
  }

  async getSelfAttendance(userId: number): Promise<Array<{
    attendance_id: number;
    user_id: number;
    gps_location: string;
    selfie: string | null;
    checkInSelfie: string | null;
    checkOutSelfie: string | null;
    check_in: string;
    check_out: string | null;
    total_hours: number;
  }>> {
    return this.request(`/attendance/my-attendance/${userId}`);
  }

  async getAllAttendance(date?: string): Promise<Array<{
    attendance_id: number;
    user_id: number;
    user_name: string;
    employee_id: string;
    department: string;
    email: string;
    gps_location: string;
    selfie: string | null;
    checkInSelfie: string | null;
    checkOutSelfie: string | null;
    check_in: string;
    check_out: string | null;
    total_hours: number;
    status: string;
  }>> {
    const endpoint = date 
      ? `/attendance/all?date=${date}`
      : `/attendance/all`;
    
    console.log("📥 Fetching all attendance records:", endpoint);
    return this.request(endpoint);
  }

  async downloadAttendanceCSV(
    userId?: number,
    startDate?: string,
    endDate?: string,
    departmentFilter?: string,
    employeeIdFilter?: string
  ): Promise<void> {
    const token = await this.getToken();
    
    // Build query parameters
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (departmentFilter) params.append('department', departmentFilter);
    if (employeeIdFilter) params.append('employee_id', employeeIdFilter);
    
    const queryString = params.toString();
    const url = `${this.baseURL}/attendance/export/csv${queryString ? '?' + queryString : ''}`;
    
    console.log("📥 Downloading Attendance CSV from:", url);
    
    try {
      const FileSystem = await import('expo-file-system/legacy');
      const Sharing = await import('expo-sharing');
      
      const fileName = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      console.log("📁 Downloading to:", fileUri);
      
      const downloadResult = await FileSystem.downloadAsync(
        url,
        fileUri,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      
      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download CSV: ${downloadResult.status}`);
      }
      
      console.log("✅ CSV downloaded to:", downloadResult.uri);
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Save Attendance CSV',
          UTI: 'public.comma-separated-values-text',
        });
        console.log("✅ CSV shared successfully");
      } else {
        console.log("✅ CSV saved to:", downloadResult.uri);
      }
    } catch (error: any) {
      console.error("❌ CSV Export Failed:", error);
      throw new Error(error.message || "Failed to export CSV");
    }
  }

  async downloadAttendancePDF(
    userId?: number,
    startDate?: string,
    endDate?: string,
    departmentFilter?: string,
    employeeIdFilter?: string
  ): Promise<void> {
    const token = await this.getToken();
    
    // Build query parameters
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (departmentFilter) params.append('department', departmentFilter);
    if (employeeIdFilter) params.append('employee_id', employeeIdFilter);
    
    const queryString = params.toString();
    const url = `${this.baseURL}/attendance/export/pdf${queryString ? '?' + queryString : ''}`;
    
    console.log("📥 Downloading Attendance PDF from:", url);
    
    try {
      const FileSystem = await import('expo-file-system/legacy');
      const Sharing = await import('expo-sharing');
      
      const fileName = `attendance_report_${new Date().toISOString().split('T')[0]}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      console.log("📁 Downloading to:", fileUri);
      
      const downloadResult = await FileSystem.downloadAsync(
        url,
        fileUri,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      
      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download PDF: ${downloadResult.status}`);
      }
      
      console.log("✅ PDF downloaded to:", downloadResult.uri);
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Attendance Report PDF',
          UTI: 'com.adobe.pdf',
        });
        console.log("✅ PDF shared successfully");
      } else {
        console.log("✅ PDF saved to:", downloadResult.uri);
      }
    } catch (error: any) {
      console.error("❌ PDF Export Failed:", error);
      throw new Error(error.message || "Failed to export PDF");
    }
  }
}

// ✅ Export Singleton
export const apiService = new ApiService(API_BASE_URL);
