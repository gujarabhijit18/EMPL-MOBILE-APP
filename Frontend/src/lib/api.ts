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

// Department interfaces
export interface DepartmentCreate {
  name: string;
  code: string;
  manager_id?: number;
  description?: string;
  status?: string;
  employee_count?: number;
  budget?: number;
  location?: string;
}

export interface DepartmentUpdate {
  name?: string;
  code?: string;
  manager_id?: number;
  description?: string;
  status?: string;
  employee_count?: number;
  budget?: number;
  location?: string;
}

export interface DepartmentResponse {
  id: number;
  name: string;
  code: string;
  manager_id?: number;
  description?: string;
  status: string;
  employee_count?: number;
  budget?: number;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface DepartmentManager {
  id: number;
  name: string;
  email: string;
  department?: string;
  role: string;
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
  private cachedToken: string | null = null;
  private tokenPromise: Promise<string | null> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Get current base URL for debugging
  getBaseUrl(): string {
    return this.baseURL;
  }

  // Clear cached token (call this on logout)
  clearTokenCache(): void {
    this.cachedToken = null;
    this.tokenPromise = null;
  }

  // Fetch stored token from AsyncStorage with caching for iOS performance
  private async getToken(): Promise<string | null> {
    // Return cached token if available
    if (this.cachedToken) {
      return this.cachedToken;
    }

    // If a token fetch is already in progress, wait for it
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    // Start a new token fetch
    this.tokenPromise = (async () => {
      try {
        // iOS fix: Add small delay to ensure AsyncStorage is ready
        await new Promise(resolve => setTimeout(resolve, 50));
        const token = await AsyncStorage.getItem("token");
        this.cachedToken = token;
        return token;
      } catch (error) {
        console.error("Error reading token:", error);
        return null;
      } finally {
        this.tokenPromise = null;
      }
    })();

    return this.tokenPromise;
  }

  // Force refresh token from storage (bypasses cache)
  private async forceGetToken(): Promise<string | null> {
    try {
      // iOS fix: Add delay to ensure AsyncStorage write is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      const token = await AsyncStorage.getItem("token");
      this.cachedToken = token;
      return token;
    } catch (error) {
      console.error("Error force reading token:", error);
      return null;
    }
  }

  // Refresh the cached token from storage
  async refreshTokenCache(): Promise<void> {
    this.cachedToken = null;
    this.tokenPromise = null;
    const token = await this.forceGetToken();
    console.log(`🔄 Token cache refreshed: ${token ? 'token present' : 'NO TOKEN'}`);
  }

  // Debug: Check current token status
  async debugTokenStatus(): Promise<{ cached: boolean; storage: boolean; match: boolean }> {
    const cachedToken = this.cachedToken;
    const storageToken = await AsyncStorage.getItem("token");
    return {
      cached: !!cachedToken,
      storage: !!storageToken,
      match: cachedToken === storageToken,
    };
  }

  // 🧠 Universal request handler with iOS auth retry fix
  private async request(endpoint: string, options: RequestInit = {}, retryCount: number = 0): Promise<any> {
    const MAX_AUTH_RETRIES = 2;

    let token = await this.getToken();

    // iOS: Force refresh if no token on first attempt
    if (!token && retryCount === 0) {
      console.warn('⚠️ No token found, refreshing cache...');
      token = await this.forceGetToken();
    }

    const url = `${this.baseURL}${endpoint}`;

    // Build headers explicitly to ensure Authorization is included
    // iOS fix: Create headers object explicitly to avoid any merging issues
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    
    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Merge any additional headers from options (but don't override Authorization)
    if (options.headers) {
      const optHeaders = options.headers as Record<string, string>;
      Object.keys(optHeaders).forEach(key => {
        if (key.toLowerCase() !== 'authorization') {
          headers[key] = optHeaders[key];
        }
      });
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    if (!url.endsWith("/test-cors")) {
      console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
      // Debug: Log token and headers for troubleshooting
      console.log(`🔑 Token status: ${token ? `present (${token.substring(0, 20)}...)` : 'MISSING'}`);
      console.log(`📋 Headers: ${JSON.stringify(Object.keys(headers))}`);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle authentication errors with retry for iOS
        if ((response.status === 401 || response.status === 403) && retryCount < MAX_AUTH_RETRIES) {
          console.warn(`⚠️ Auth error (${response.status}), refreshing token and retrying (attempt ${retryCount + 1})`);
          console.log(`🔑 Current token was: ${token ? `present (${token.substring(0, 20)}...)` : 'MISSING'}`);

          // Clear cache and force refresh from storage with longer delay for iOS
          this.cachedToken = null;
          this.tokenPromise = null;
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Force get fresh token
          token = await this.forceGetToken();
          
          if (!token) {
            console.error('❌ No token available after refresh');
            // Check if it's a token expiration error
            const detailStr = data?.detail || '';
            if (detailStr.includes('expired') || detailStr.includes('Signature has expired')) {
              throw new Error('Your session has expired. Please log in again.');
            }
            throw new Error('Authentication required. Please log in again.');
          }

          // Retry request with fresh token
          return this.request(endpoint, options, retryCount + 1);
        }

        // Handle validation errors (422)
        let errorMessage = `HTTP Error: ${response.status}`;

        // Check for token expiration in error detail
        const detailStr = data?.detail || '';
        if ((response.status === 401 || response.status === 403) && detailStr.includes('expired')) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if ((response.status === 401 || response.status === 403) && detailStr.includes('Signature has expired')) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (response.status === 422 && data?.detail) {
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

      // Store token in AsyncStorage and update cache
      // iOS fix: Store token first, then wait to ensure it's written
      try {
        await AsyncStorage.setItem("token", data.access_token);
        // iOS fix: Add delay to ensure AsyncStorage write is complete before continuing
        await new Promise(resolve => setTimeout(resolve, 100));
        await AsyncStorage.setItem("user", JSON.stringify(data));
        // Update the cached token immediately
        this.cachedToken = data.access_token;
        console.log(`💾 Auth data stored successfully, token cached`);
        
        // iOS fix: Verify token was stored correctly
        const verifyToken = await AsyncStorage.getItem("token");
        if (verifyToken !== data.access_token) {
          console.warn('⚠️ Token verification mismatch, retrying storage...');
          await AsyncStorage.setItem("token", data.access_token);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
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
    const formData = new FormData();

    // Get current user profile to ensure required fields are present
    const currentProfile = await this.getCurrentUserProfile();

    // Required fields - use provided values or fall back to current profile
    const requiredData = {
      name: profileData.name || currentProfile.name,
      email: profileData.email || currentProfile.email,
      employee_id: profileData.employee_id || currentProfile.employee_id,
    };

    // Add required fields
    formData.append('name', requiredData.name);
    formData.append('email', requiredData.email);
    formData.append('employee_id', requiredData.employee_id);

    // Add optional fields from profileData
    const optionalFields = ['department', 'designation', 'phone', 'address', 'gender', 'shift_type', 'employee_type', 'pan_card', 'aadhar_card'];

    optionalFields.forEach(key => {
      const value = (profileData as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });

    // Handle profile photo
    if (profileData.profile_photo) {
      const photo = profileData.profile_photo;
      if (typeof photo === 'string' && photo.startsWith('file://')) {
        const uriParts = photo.split('/');
        const filename = uriParts[uriParts.length - 1];
        const file: any = {
          uri: photo,
          type: 'image/jpeg',
          name: filename || 'profile.jpg',
        };
        formData.append('profile_photo', file);
      } else if (typeof photo === 'object' && 'uri' in photo) {
        formData.append('profile_photo', photo as any);
      }
    }

    console.log(`📤 Updating user profile ${userId} with FormData`);
    return this.requestFormData(`/employees/${userId}`, "PUT", formData);
  }

  // ======================
  // 🔹 Employee APIs
  // ======================

  // Debug endpoint to test if Authorization header is being received
  async debugAuthHeader(): Promise<any> {
    return this.request("/employees/debug-auth");
  }

  async getEmployees(forReports: boolean = false): Promise<Employee[]> {
    const params = forReports ? '?for_reports=true' : '';
    return this.request(`/employees${params}`);
  }

  // Universal FormData request handler with stable Authorization header merging
  // This ensures FormData requests (file uploads) use the same auth pattern as JSON requests
  private async requestFormData(endpoint: string, method: string, formData: FormData, retryCount: number = 0): Promise<any> {
    const MAX_AUTH_RETRIES = 2;

    let token = await this.getToken();

    // iOS: Force refresh if no token on first attempt
    if (!token && retryCount === 0) {
      console.warn('⚠️ No token found for FormData request, refreshing cache...');
      token = await this.forceGetToken();
    }

    const url = `${this.baseURL}${endpoint}`;

    // Build headers explicitly - Authorization ALWAYS included if token exists
    // Don't set Content-Type for FormData, let the browser set it with boundary
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    // Add authorization header if token exists - ALWAYS include it
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`📡 FormData Request: ${method} ${url}`);
    console.log(`🔑 Token status: ${token ? `present (${token.substring(0, 20)}...)` : 'MISSING'}`);
    console.log(`📋 Headers: ${JSON.stringify(Object.keys(headers))}`);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle authentication errors with retry
        if ((response.status === 401 || response.status === 403) && retryCount < MAX_AUTH_RETRIES) {
          console.warn(`⚠️ Auth error (${response.status}) on FormData request, refreshing token and retrying (attempt ${retryCount + 1})`);
          console.log(`🔑 Current token was: ${token ? `present (${token.substring(0, 20)}...)` : 'MISSING'}`);

          // Clear cache and force refresh from storage with longer delay for iOS
          this.cachedToken = null;
          this.tokenPromise = null;
          await new Promise(resolve => setTimeout(resolve, 500));

          // Force get fresh token
          token = await this.forceGetToken();

          if (!token) {
            console.error('❌ No token available after refresh');
            // Check if it's a token expiration error
            const detailStr = data?.detail || '';
            if (detailStr.includes('expired') || detailStr.includes('Signature has expired')) {
              throw new Error('Your session has expired. Please log in again.');
            }
            throw new Error('Authentication required. Please log in again.');
          }

          // Retry request with fresh token
          return this.requestFormData(endpoint, method, formData, retryCount + 1);
        }

        // Handle validation errors (422)
        let errorMessage = `HTTP Error: ${response.status}`;

        // Check for token expiration in error detail
        const detailStr = data?.detail || '';
        if ((response.status === 401 || response.status === 403) && detailStr.includes('expired')) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if ((response.status === 401 || response.status === 403) && detailStr.includes('Signature has expired')) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (response.status === 422 && data?.detail) {
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

        console.error(`❌ FormData API Error: ${errorMessage}`, {
          url,
          status: response.status,
          data,
          detail: data?.detail
        });
        throw new Error(errorMessage);
      }

      console.log(`✅ FormData API Success: ${method} ${url}`);
      return data;
    } catch (error) {
      console.error("❌ FormData API Error:", error);

      if (error instanceof TypeError && error.message.includes("Network request failed")) {
        throw new Error(`Cannot connect to backend at ${this.baseURL}. Please ensure the server is running.`);
      }

      throw error;
    }
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

    console.log(`📤 Creating employee with FormData`);
    return this.requestFormData("/employees/register", "POST", formData);
  }

  async updateEmployee(userId: string, employeeData: Partial<EmployeeData>): Promise<Employee> {
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
    return this.requestFormData(`/employees/${userId}`, "PUT", formData);
  }

  async deleteEmployee(userId: string): Promise<void> {
    console.log(`🗑️ Deleting employee ${userId}`);
    await this.request(`/employees/${userId}`, { method: "DELETE" });
    console.log(`✅ Employee ${userId} deleted successfully`);
  }

  async toggleEmployeeStatus(userId: string, isActive: boolean): Promise<Employee> {
    console.log(`🔄 Toggling employee ${userId} status to ${isActive ? 'Active' : 'Inactive'}`);
    return this.request(`/employees/${userId}/status`, {
      method: "PUT",
      body: JSON.stringify({ is_active: isActive }),
    });
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

      // Build headers explicitly - Authorization ALWAYS included if token exists
      const downloadHeaders: Record<string, string> = {};
      if (token) {
        downloadHeaders["Authorization"] = `Bearer ${token}`;
      }

      const downloadResult = await FileSystem.downloadAsync(
        `${this.baseURL}/employees/export/csv`,
        fileUri,
        { headers: downloadHeaders }
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

      // Build headers explicitly - Authorization ALWAYS included if token exists
      const pdfHeaders: Record<string, string> = {};
      if (token) {
        pdfHeaders["Authorization"] = `Bearer ${token}`;
      }

      const downloadResult = await FileSystem.downloadAsync(
        `${this.baseURL}/employees/export/pdf`,
        fileUri,
        { headers: pdfHeaders }
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

  // 2.1 GET - All Tasks (Admin/HR/Manager only)
  async getAllTasks(): Promise<any[]> {
    console.log("📥 Fetching all tasks (admin view)");
    return this.request("/tasks/all");
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

  // 6.1 PUT - Update Task
  async updateTask(taskId: number, taskData: {
    title?: string;
    description?: string;
    due_date?: string;
    priority?: "Low" | "Medium" | "High" | "Urgent";
    assigned_to?: number;
  }): Promise<any> {
    console.log("📤 Updating task:", taskId, taskData);
    return this.request(`/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(taskData),
    });
  }

  // 7. GET - Task History/Activity
  async getTaskHistory(taskId: number): Promise<any[]> {
    console.log("📥 Fetching task history:", taskId);
    try {
      return await this.request(`/tasks/${taskId}/history`);
    } catch (error) {
      console.log("⚠️ Could not fetch task history:", error);
      return [];
    }
  }

  // 8. POST - Pass Task to another user
  async passTask(taskId: number, newAssigneeId: number, note?: string): Promise<any> {
    console.log("📤 Passing task:", taskId, "to user:", newAssigneeId);
    return this.request(`/tasks/${taskId}/pass`, {
      method: "POST",
      body: JSON.stringify({ new_assignee_id: newAssigneeId, note: note || "" }),
    });
  }

  // 9. GET - Task Notifications
  async getTaskNotifications(): Promise<any[]> {
    console.log("📥 Fetching task notifications");
    try {
      return await this.request("/tasks/notifications");
    } catch (error) {
      console.log("⚠️ Could not fetch task notifications:", error);
      return [];
    }
  }

  // 10. PUT - Mark Task Notification as Read
  async markTaskNotificationAsRead(notificationId: number): Promise<any> {
    console.log("✅ Marking task notification as read:", notificationId);
    return this.request(`/tasks/notifications/${notificationId}/read`, {
      method: "PUT",
    });
  }

  // 11. GET - Task Comments
  async getTaskComments(taskId: number): Promise<any[]> {
    console.log("📥 Fetching task comments:", taskId);
    try {
      return await this.request(`/tasks/${taskId}/comments`);
    } catch (error) {
      console.log("⚠️ Could not fetch task comments:", error);
      return [];
    }
  }

  // 12. POST - Add Task Comment
  async addTaskComment(taskId: number, message: string): Promise<any> {
    console.log("📤 Adding task comment:", taskId);
    return this.request(`/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  // 13. DELETE - Delete Task Comment
  async deleteTaskComment(taskId: number, commentId: number): Promise<any> {
    console.log("🗑️ Deleting task comment:", commentId);
    return this.request(`/tasks/${taskId}/comments/${commentId}`, {
      method: "DELETE",
    });
  }

  async shortlistCandidates(candidateIds: number[]): Promise<any[]> {
    console.log("✅ Shortlisting candidates:", candidateIds);
    return this.request("/hiring/candidates/shortlist", {
      method: "POST",
      body: JSON.stringify({ candidate_ids: candidateIds }),
    });
  }

  async rejectCandidate(candidateId: number, reason: string): Promise<any> {
    console.log("❌ Rejecting candidate:", candidateId, reason);
    return this.request(`/hiring/candidates/${candidateId}/reject?reason=${encodeURIComponent(reason)}`, {
      method: "POST",
    });
  }

  async selectCandidate(candidateId: number): Promise<any> {
    console.log("✅ Selecting candidate:", candidateId);
    return this.request(`/hiring/candidates/${candidateId}/select`, {
      method: "POST",
    });
  }

  async sendOffer(candidateId: number): Promise<any> {
    console.log("📧 Sending offer to candidate:", candidateId);
    return this.request(`/hiring/candidates/${candidateId}/send-offer`, {
      method: "POST",
    });
  }

  async hireCandidate(candidateId: number, hiringData: {
    department: string;
    designation: string;
    joining_date: string;
    salary: number;
    shift_type: string;
  }): Promise<string> {
    console.log("🎉 Hiring candidate:", candidateId, hiringData);
    return this.request(`/hiring/candidates/${candidateId}/hire`, {
      method: "POST",
      body: JSON.stringify(hiringData),
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

    // Log current time information
    const now = new Date();
    const deviceTime = now.toISOString();
    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const deviceOffset = -now.getTimezoneOffset();

    console.log("🔵 checkIn called with:", {
      userId,
      gpsLocation,
      originalLength: selfie.length,
      cleanedLength: cleanSelfie.length,
      hasDataUri: selfie.includes('data:image')
    });

    console.log("🕐 Device Time Info:", {
      deviceTime,
      deviceTimezone,
      deviceOffset: `UTC${deviceOffset >= 0 ? '+' : ''}${deviceOffset / 60}`,
      localTime: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
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
      selfie_preview: cleanSelfie.substring(0, 50) + '...',
      timestamp: deviceTime,
    });

    // Build headers explicitly - Authorization ALWAYS included if token exists
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    console.log(`🔑 Check-in token status: ${token ? `present (${token.substring(0, 20)}...)` : 'MISSING'}`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
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

  async checkOut(
    userId: number,
    gpsLocation: string,
    selfie: string,
    workSummary?: string,
    workReportFile?: { uri: string; name: string; type: string } | null
  ): Promise<{
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

    // Log current time information
    const now = new Date();
    const deviceTime = now.toISOString();
    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const deviceOffset = -now.getTimezoneOffset();

    console.log("🔵 checkOut called with:", {
      userId,
      gpsLocation,
      workSummary,
      workReportFile: workReportFile?.name || 'none',
      originalLength: selfie.length,
      cleanedLength: cleanSelfie.length,
      hasDataUri: selfie.includes('data:image')
    });

    console.log("🕐 Device Time Info:", {
      deviceTime,
      deviceTimezone,
      deviceOffset: `UTC${deviceOffset >= 0 ? '+' : ''}${deviceOffset / 60}`,
      localTime: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    });

    const token = await this.getToken();

    // Parse GPS location string to object
    const [lat, lon] = gpsLocation.split(',').map(s => parseFloat(s.trim()));
    const locationObject = {
      latitude: lat,
      longitude: lon,
    };

    console.log(`🔑 Check-out token status: ${token ? `present (${token.substring(0, 20)}...)` : 'MISSING'}`);

    // If work report file is provided, use FormData
    if (workReportFile) {
      console.log("📄 Uploading with work report file:", workReportFile.name);

      const formData = new FormData();
      formData.append('user_id', userId.toString());
      formData.append('gps_location', JSON.stringify(locationObject));
      formData.append('work_summary', workSummary || "Completed daily tasks");

      // Add selfie as file
      formData.append('selfie', {
        uri: `data:image/jpeg;base64,${cleanSelfie}`,
        type: 'image/jpeg',
        name: `checkout_selfie_${userId}.jpg`,
      } as any);

      // Add work report file
      formData.append('work_report', {
        uri: workReportFile.uri,
        type: workReportFile.type,
        name: workReportFile.name,
      } as any);

      const url = `${this.baseURL}/attendance/check-out`;

      console.log("📤 Check-out request (FormData):", {
        url,
        user_id: userId,
        work_summary: workSummary,
        work_report: workReportFile.name,
      });

      // Build headers explicitly - Authorization ALWAYS included if token exists
      const formDataHeaders: Record<string, string> = {
        "Accept": "application/json",
      };
      if (token) {
        formDataHeaders["Authorization"] = `Bearer ${token}`;
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: formDataHeaders,
          body: formData,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.error(`❌ Check-out failed:`, { status: response.status, data });
          throw new Error(data?.detail || `HTTP Error: ${response.status}`);
        }

        console.log("✅ Check-out successful (with file):", data);
        return data;
      } catch (error: any) {
        console.error("❌ Check-out error:", error);
        throw error;
      }
    }

    // Use JSON endpoint if no file
    const url = `${this.baseURL}/attendance/check-out/json`;

    const requestBody = {
      user_id: userId,
      gps_location: locationObject,
      selfie: cleanSelfie,
      work_summary: workSummary || "Completed daily tasks",
    };

    console.log("📤 Check-out request (JSON):", {
      url,
      user_id: userId,
      gps_location: locationObject,
      work_summary: workSummary,
      selfie_length: cleanSelfie.length,
      selfie_preview: cleanSelfie.substring(0, 50) + '...',
      timestamp: deviceTime,
    });

    // Build headers explicitly - Authorization ALWAYS included if token exists
    const jsonHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    if (token) {
      jsonHeaders["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: jsonHeaders,
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
    work_summary?: string | null;
    workSummary?: string | null;
    work_report?: string | null;
    workReport?: string | null;
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
    work_summary?: string | null;
    workSummary?: string | null;
    work_report?: string | null;
    workReport?: string | null;
  }>> {
    const endpoint = date
      ? `/attendance/all?date=${date}`
      : `/attendance/all`;

    console.log("📥 Fetching all attendance records:", endpoint);
    return this.request(endpoint);
  }

  // Admin endpoint to get all attendance records for HR, Manager, TeamLead, and Employee
  async getAdminAllAttendance(filters?: {
    start_date?: string;
    end_date?: string;
    department?: string;
    role?: string;
  }): Promise<Array<{
    attendance_id: number;
    user_id: number;
    name: string;
    userName: string;
    employee_id: string;
    department: string;
    email: string;
    userEmail: string;
    role: string;
    user_role: string;
    gps_location: string;
    selfie: string | null;
    checkInSelfie: string | null;
    checkOutSelfie: string | null;
    check_in: string;
    check_out: string | null;
    total_hours: number;
    status: string;
    checkInStatus: string;
    checkOutStatus: string;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    work_summary?: string | null;
    workSummary?: string | null;
    work_report?: string | null;
    workReport?: string | null;
  }>> {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.role) params.append('role', filters.role);

    const queryString = params.toString();
    const endpoint = `/attendance/admin/all-records${queryString ? '?' + queryString : ''}`;

    console.log("📥 Admin fetching all attendance records:", endpoint);
    return this.request(endpoint);
  }

  // Get today's attendance status for admin view
  async getAdminTodayAttendance(filters?: {
    department?: string;
    role?: string;
  }): Promise<Array<{
    attendance_id: number;
    user_id: number;
    name: string;
    employee_id: string;
    department: string;
    email: string;
    role: string;
    gps_location: string;
    selfie: string | null;
    checkInSelfie: string | null;
    checkOutSelfie: string | null;
    check_in: string;
    check_out: string | null;
    total_hours: number;
    status: string;
    checkInStatus: string;
    checkOutStatus: string;
  }>> {
    const params = new URLSearchParams();
    if (filters?.department) params.append('department', filters.department);
    if (filters?.role) params.append('role', filters.role);

    const queryString = params.toString();
    const endpoint = `/attendance/today-status${queryString ? '?' + queryString : ''}`;

    console.log("📥 Admin fetching today's attendance status:", endpoint);
    return this.request(endpoint);
  }

  // Get attendance history with filters
  async getAttendanceHistory(filters?: {
    department?: string;
    date?: string;
    role?: string;
  }): Promise<Array<{
    attendance_id: number;
    user_id: number;
    name: string;
    userName: string;
    employee_id: string;
    department: string;
    email: string;
    userEmail: string;
    role: string;
    user_role: string;
    gps_location: string;
    selfie: string | null;
    checkInSelfie: string | null;
    checkOutSelfie: string | null;
    check_in: string;
    check_out: string | null;
    total_hours: number;
    status: string;
    checkInStatus: string;
    checkOutStatus: string;
    scheduledStart: string | null;
    scheduledEnd: string | null;
  }>> {
    const params = new URLSearchParams();
    if (filters?.department) params.append('department', filters.department);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.role) params.append('role', filters.role);

    const queryString = params.toString();
    const endpoint = `/attendance/history${queryString ? '?' + queryString : ''}`;

    console.log("📥 Fetching attendance history:", endpoint);
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

      // Build headers explicitly - Authorization ALWAYS included if token exists
      const csvHeaders: Record<string, string> = {};
      if (token) {
        csvHeaders["Authorization"] = `Bearer ${token}`;
      }

      const downloadResult = await FileSystem.downloadAsync(
        url,
        fileUri,
        { headers: csvHeaders }
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

      // Build headers explicitly - Authorization ALWAYS included if token exists
      const pdfHeaders: Record<string, string> = {};
      if (token) {
        pdfHeaders["Authorization"] = `Bearer ${token}`;
      }

      const downloadResult = await FileSystem.downloadAsync(
        url,
        fileUri,
        { headers: pdfHeaders }
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

  // ======================
  // 🔹 Online Status APIs (Add-on to Attendance)
  // ======================

  /**
   * Get current online/offline status for a user.
   * Only returns status if user has active attendance (checked in, not checked out).
   */
  async getOnlineStatus(userId: number): Promise<OnlineStatusResponse> {
    console.log("📥 Fetching online status for user:", userId);
    return this.request(`/online-status/current/${userId}`);
  }

  /**
   * Toggle online/offline status.
   * When going offline, offlineReason is REQUIRED.
   */
  async toggleOnlineStatus(userId: number, offlineReason?: string): Promise<ToggleStatusResponse> {
    console.log("🔄 Toggling online status for user:", userId);
    return this.request(`/online-status/toggle/${userId}`, {
      method: "POST",
      body: JSON.stringify({ offline_reason: offlineReason || null }),
    });
  }

  /**
   * Get detailed summary of online/offline time for a user's attendance session.
   */
  async getOnlineStatusSummary(userId: number, attendanceId?: number): Promise<OnlineStatusSummary> {
    const params = attendanceId ? `?attendance_id=${attendanceId}` : '';
    console.log("📥 Fetching online status summary for user:", userId);
    return this.request(`/online-status/summary/${userId}${params}`);
  }

  /**
   * Get all status change logs for a user's attendance session.
   */
  async getOnlineStatusLogs(userId: number, attendanceId?: number): Promise<OnlineStatusLog[]> {
    const params = attendanceId ? `?attendance_id=${attendanceId}` : '';
    console.log("📥 Fetching online status logs for user:", userId);
    return this.request(`/online-status/logs/${userId}${params}`);
  }

  /**
   * Finalize online status when user checks out (called internally).
   */
  async finalizeOnlineStatus(userId: number, attendanceId: number): Promise<{ message: string; effective_work_hours: number }> {
    console.log("📤 Finalizing online status for user:", userId);
    return this.request(`/online-status/finalize/${userId}?attendance_id=${attendanceId}`, {
      method: "POST",
    });
  }

  // ======================
  // 🔹 Office Hours APIs
  // ======================

  /**
   * Get all office timing configurations (global and department-specific)
   */
  async getOfficeTimings(): Promise<Array<{
    id: number;
    department: string | null;
    start_time: string;
    end_time: string;
    check_in_grace_minutes: number;
    check_out_grace_minutes: number;
  }>> {
    console.log("📥 Fetching office timings");
    return this.request("/attendance/office-hours");
  }

  /**
   * Get effective office timing for a specific department
   * Returns department-specific timing if exists, otherwise global timing
   */
  async getEffectiveOfficeTiming(department?: string): Promise<{
    id: number;
    department: string | null;
    start_time: string;
    end_time: string;
    check_in_grace_minutes: number;
    check_out_grace_minutes: number;
  }> {
    const params = department ? `?department=${encodeURIComponent(department)}` : '';
    console.log("📥 Fetching effective office timing for department:", department || "global");
    return this.request(`/attendance/office-hours/effective${params}`);
  }

  /**
   * Create or update office timing (global or department-specific)
   * Admin only
   */
  async upsertOfficeTiming(timingData: {
    department?: string | null;
    start_time: string;
    end_time: string;
    check_in_grace_minutes: number;
    check_out_grace_minutes: number;
  }): Promise<{
    id: number;
    department: string | null;
    start_time: string;
    end_time: string;
    check_in_grace_minutes: number;
    check_out_grace_minutes: number;
  }> {
    console.log("📤 Upserting office timing:", timingData);
    return this.request("/attendance/office-hours", {
      method: "PUT",
      body: JSON.stringify(timingData),
    });
  }

  /**
   * Delete office timing configuration
   * Admin only
   */
  async deleteOfficeTiming(timingId: number): Promise<{ message: string }> {
    console.log("🗑️ Deleting office timing:", timingId);
    return this.request(`/attendance/office-hours/${timingId}`, {
      method: "DELETE",
    });
  }

  // ======================
  // 🔹 Hiring / Vacancy APIs
  // ======================

  async getJobOpenings(department?: string, status?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (department) params.append('department', department);
    if (status) params.append('status_filter', status);

    const queryString = params.toString();
    const endpoint = `/hiring/vacancies${queryString ? '?' + queryString : ''}`;

    console.log("📥 Fetching vacancies:", endpoint);
    try {
      return await this.request(endpoint);
    } catch (error: any) {
      if (error.message.includes("404") || error.message.includes("Not Found")) {
        console.log("⚠️ No vacancies found (404), returning empty array");
        return [];
      }
      throw error;
    }
  }

  async createJobOpening(vacancyData: {
    title: string;
    department: string;
    location?: string;
    employment_type?: string;
    experience_required?: string;
    description?: string;
    requirements?: string;
    responsibilities?: string;
    nice_to_have_skills?: string;
    salary_range?: string;
    status?: string;
    closing_date?: string;
  }): Promise<any> {
    console.log("📤 Creating vacancy:", vacancyData);
    return this.request("/hiring/vacancies", {
      method: "POST",
      body: JSON.stringify(vacancyData),
    });
  }

  async updateJobOpening(vacancyId: number, vacancyData: any): Promise<any> {
    console.log("📤 Updating vacancy:", vacancyId, vacancyData);
    return this.request(`/hiring/vacancies/${vacancyId}`, {
      method: "PUT",
      body: JSON.stringify(vacancyData),
    });
  }

  async deleteJobOpening(vacancyId: number): Promise<void> {
    console.log("🗑️ Deleting vacancy:", vacancyId);
    return this.request(`/hiring/vacancies/${vacancyId}`, {
      method: "DELETE",
    });
  }

  async getCandidates(vacancyId?: number, status?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (vacancyId) params.append('vacancy_id', vacancyId.toString());
    if (status) params.append('status_filter', status);

    const queryString = params.toString();
    const endpoint = `/hiring/candidates${queryString ? '?' + queryString : ''}`;

    console.log("📥 Fetching candidates:", endpoint);
    try {
      return await this.request(endpoint);
    } catch (error: any) {
      if (error.message.includes("404") || error.message.includes("Not Found")) {
        console.log("⚠️ No candidates found (404), returning empty array");
        return [];
      }
      throw error;
    }
  }

  async createCandidate(candidateData: any): Promise<any> {
    console.log("📤 Creating candidate:", candidateData);
    return this.request("/hiring/candidates", {
      method: "POST",
      body: JSON.stringify(candidateData),
    });
  }

  async updateCandidate(candidateId: number, candidateData: any): Promise<any> {
    console.log("📤 Updating candidate:", candidateId, candidateData);
    return this.request(`/hiring/candidates/${candidateId}`, {
      method: "PUT",
      body: JSON.stringify(candidateData),
    });
  }

  async deleteCandidate(candidateId: number): Promise<void> {
    console.log("🗑️ Deleting candidate:", candidateId);
    return this.request(`/hiring/candidates/${candidateId}`, {
      method: "DELETE",
    });
  }

  // ======================
  // 🔹 Department APIs
  // ======================

  async getDepartments(): Promise<DepartmentResponse[]> {
    console.log("📥 Fetching departments");
    return this.request("/departments/");
  }

  async createDepartment(departmentData: DepartmentCreate): Promise<DepartmentResponse> {
    console.log("📤 Creating department:", departmentData);
    return this.request("/departments/", {
      method: "POST",
      body: JSON.stringify(departmentData),
    });
  }

  async updateDepartment(deptId: number, departmentData: DepartmentUpdate): Promise<DepartmentResponse> {
    console.log("📤 Updating department:", deptId, departmentData);
    return this.request(`/departments/${deptId}`, {
      method: "PUT",
      body: JSON.stringify(departmentData),
    });
  }

  async deleteDepartment(deptId: number): Promise<void> {
    console.log("🗑️ Deleting department:", deptId);
    return this.request(`/departments/${deptId}`, {
      method: "DELETE",
    });
  }

  async getDepartmentManagers(): Promise<DepartmentManager[]> {
    console.log("📥 Fetching department managers");
    return this.request("/departments/managers");
  }

  async syncDepartmentsFromUsers(): Promise<{
    success: boolean;
    message: string;
    created_departments: string[];
    total_departments: number;
  }> {
    console.log("🔄 Syncing departments from users");
    return this.request("/departments/sync-from-users", {
      method: "POST",
    });
  }

  // ======================
  // 🔹 Settings APIs
  // ======================

  async getMySettings(): Promise<UserSettings> {
    console.log("📥 Fetching user settings");
    return this.request("/settings/me");
  }

  async updateMySettings(settingsData: Partial<UserSettings>): Promise<UserSettings> {
    console.log("📤 Updating user settings:", settingsData);
    return this.request("/settings/me", {
      method: "PUT",
      body: JSON.stringify(settingsData),
    });
  }

  async getSettingsByUserId(userId: number): Promise<UserSettings> {
    console.log("📥 Fetching settings for user:", userId);
    return this.request(`/settings/${userId}`);
  }

  async updateSettingsByUserId(userId: number, settingsData: Partial<UserSettings>): Promise<UserSettings> {
    console.log("📤 Updating settings for user:", userId, settingsData);
    return this.request(`/settings/${userId}`, {
      method: "PUT",
      body: JSON.stringify(settingsData),
    });
  }

  // ======================
  // 🔹 Reports APIs
  // ======================

  // Helper method to calculate working days (excluding weekends)
  // For current month, only counts up to today (not future days)
  private calculateWorkingDays(startDate: Date, endDate: Date, limitToToday: boolean = false): number {
    let count = 0;
    const currentDate = new Date(startDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    // If limitToToday is true and endDate is in the future, use today as the end
    const effectiveEndDate = limitToToday && endDate > today ? today : endDate;

    while (currentDate <= effectiveEndDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }

  async getReportsData(month?: string, department?: string): Promise<ReportsData> {
    console.log("📥 Fetching reports data with real calculations");

    try {
      // Month name to index mapping
      const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

      // Calculate date range for the month (if provided)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Get month index from month name (default to current month)
      let monthIndex = currentMonth;
      if (month && typeof month === 'string') {
        const foundIndex = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
        if (foundIndex !== -1) {
          monthIndex = foundIndex;
        } else {
          console.log(`⚠️ Unknown month name: ${month}, using current month`);
        }
      }

      // Determine target year (if selected month is after current month, use previous year)
      let targetYear = currentYear;
      if (month && monthIndex > currentMonth) {
        targetYear = currentYear - 1;
      }

      // Safely create date range
      let monthStart: Date;
      let monthEnd: Date;
      try {
        monthStart = new Date(targetYear, monthIndex, 1, 0, 0, 0, 0);
        monthEnd = new Date(targetYear, monthIndex + 1, 0, 23, 59, 59, 999);

        // Validate dates
        if (isNaN(monthStart.getTime()) || isNaN(monthEnd.getTime())) {
          throw new Error('Invalid date created');
        }
      } catch (dateError) {
        console.error('Date creation error, using current month:', dateError);
        monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
        monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
        monthIndex = currentMonth;
        targetYear = currentYear;
      }

      const startDateStr = monthStart.toISOString().split('T')[0];
      const endDateStr = monthEnd.toISOString().split('T')[0];

      console.log(`📅 Fetching data for: ${monthNames[monthIndex]} ${targetYear} (${startDateStr} to ${endDateStr})`);

      // Fetch all required data in parallel
      const [employees] = await Promise.all([
        this.getEmployees(),
      ]);

      // Fetch all tasks (try /tasks/all first for admin/hr/manager, fallback to /tasks/)
      let tasks: any[] = [];
      try {
        const allTasks = await this.request("/tasks/all");
        tasks = Array.isArray(allTasks) ? allTasks : [];
        // Filter out tasks with null assigned_to for reports (they can't be attributed to anyone)
        tasks = tasks.filter((task: any) => task.assigned_to !== null && task.assigned_to !== undefined);
        console.log(`✅ Fetched ${tasks.length} valid tasks from /tasks/all`);
      } catch (error: any) {
        console.log("⚠️ Could not fetch all tasks (may not have permission), trying user tasks:", error?.message || error);
        try {
          const userTasks = await this.request("/tasks/");
          tasks = Array.isArray(userTasks) ? userTasks : [];
          tasks = tasks.filter((task: any) => task.assigned_to !== null && task.assigned_to !== undefined);
          console.log(`📋 Fetched ${tasks.length} valid user tasks from /tasks/`);
        } catch (userTaskError: any) {
          console.log("⚠️ Could not fetch user tasks:", userTaskError?.message || userTaskError);
          tasks = [];
        }
      }

      // Log task structure for debugging
      if (tasks.length > 0) {
        console.log("📋 Sample task structure:", JSON.stringify(tasks[0], null, 2));
      }

      // Fetch attendance records for the month
      let attendanceRecords: any[] = [];
      try {
        // Try to get all attendance history
        const allAttendance = await this.request("/attendance/all");
        if (Array.isArray(allAttendance)) {
          // Filter by date range with safe date parsing
          attendanceRecords = allAttendance.filter((record: any) => {
            if (!record.check_in) return false;
            try {
              const checkInDate = new Date(record.check_in);
              if (isNaN(checkInDate.getTime())) return false;
              return checkInDate >= monthStart && checkInDate <= monthEnd;
            } catch {
              return false;
            }
          });
          console.log(`✅ Fetched ${allAttendance.length} total attendance records, ${attendanceRecords.length} in selected month`);
        }

        // Also fetch today's attendance to ensure current day is included
        // (in case /attendance/all doesn't include today's records yet)
        try {
          const todayAttendance = await this.request("/attendance/today");
          if (Array.isArray(todayAttendance) && todayAttendance.length > 0) {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // Add today's records if not already in the list
            todayAttendance.forEach((todayRecord: any) => {
              if (!todayRecord.check_in) return;

              const recordDate = new Date(todayRecord.check_in);
              if (isNaN(recordDate.getTime())) return;

              // Check if this record is within our month range
              if (recordDate < monthStart || recordDate > monthEnd) return;

              // Check if this record already exists (by user_id and date)
              const recordDateStr = recordDate.toISOString().split('T')[0];
              const alreadyExists = attendanceRecords.some((existing: any) => {
                if (!existing.check_in) return false;
                const existingDate = new Date(existing.check_in);
                const existingDateStr = existingDate.toISOString().split('T')[0];
                return existing.user_id === todayRecord.user_id && existingDateStr === recordDateStr;
              });

              if (!alreadyExists) {
                attendanceRecords.push(todayRecord);
                console.log(`➕ Added today's attendance for user ${todayRecord.user_id}`);
              }
            });
            console.log(`📊 After merging today's attendance: ${attendanceRecords.length} records`);
          }
        } catch (todayError) {
          console.log("⚠️ Could not fetch today's attendance:", todayError);
        }
      } catch (error: any) {
        console.log("⚠️ Could not fetch attendance history:", error?.message || error);
        // Fallback to today's attendance only
        try {
          const todayAttendance = await this.request("/attendance/today");
          attendanceRecords = Array.isArray(todayAttendance) ? todayAttendance : [];
          console.log(`📊 Using today's attendance only: ${attendanceRecords.length} records`);
        } catch {
          attendanceRecords = [];
        }
      }

      // Calculate working days in month (excluding weekends)
      // For current month, only count working days up to today (not future days)
      const isCurrentMonth = monthIndex === currentMonth && targetYear === currentYear;
      const workingDays = this.calculateWorkingDays(monthStart, monthEnd, isCurrentMonth);
      console.log(`📆 Working days in ${monthNames[monthIndex]} ${targetYear}${isCurrentMonth ? ' (up to today)' : ''}: ${workingDays}`);

      // Calculate employee performance with real data
      const employeePerformance: EmployeePerformance[] = employees.map((emp: any, index: number) => {
        const empUserId = emp.user_id;
        const empEmployeeId = emp.employee_id;

        // Calculate real attendance from attendance records
        const empAttendanceRecords = attendanceRecords.filter((record: any) => {
          // Match by user_id or employee_id
          const matchesUser = record.user_id && empUserId && record.user_id === empUserId;
          const matchesEmpId = record.employee_id && empEmployeeId && record.employee_id === empEmployeeId;
          return matchesUser || matchesEmpId;
        });

        const attendedDays = empAttendanceRecords.length;
        const attendance = workingDays > 0 ? Math.min(100, Math.round((attendedDays / workingDays) * 100)) : 0;

        // Debug log for attendance calculation
        if (empAttendanceRecords.length > 0) {
          console.log(`📊 ${emp.name} (user_id: ${empUserId}): ${attendedDays} attended / ${workingDays} working days = ${attendance}%`);
        }

        // Calculate real task completion from tasks
        // Note: In the backend, assigned_to is user_id (integer), not employee_id (string)
        const empTasks = (tasks || []).filter((task: any) => {
          // Primary match: assigned_to is the user_id in the backend
          if (task.assigned_to && empUserId && Number(task.assigned_to) === Number(empUserId)) {
            return true;
          }
          // Also check assigned_to_user if it exists (expanded relationship)
          if (task.assigned_to_user && task.assigned_to_user.user_id === empUserId) {
            return true;
          }
          // Fallback matches for different API response formats
          if (task.assignee_id && empUserId && Number(task.assignee_id) === Number(empUserId)) {
            return true;
          }
          return false;
        });

        // Filter tasks by date range (include all tasks if no date filtering needed for now)
        // This ensures we count all tasks assigned to the employee

        const completedTasks = empTasks.filter((task: any) => {
          const status = (task.status || '').toLowerCase().trim();
          // Match backend TaskStatus enum values: "Pending", "In Progress", "Completed"
          return status === 'completed';
        }).length;

        const totalTasks = empTasks.length;

        console.log(`📋 ${emp.name} (user_id: ${empUserId}): Found ${totalTasks} tasks, ${completedTasks} completed`);

        const taskCompletion = empTasks.length > 0
          ? Math.round((completedTasks / empTasks.length) * 100)
          : 0;

        console.log(`👤 ${emp.name}: ${attendedDays}/${workingDays} days (${attendance}%), ${completedTasks}/${empTasks.length} tasks (${taskCompletion}%)`);

        const avgScore = (attendance + taskCompletion) / 2;
        let status: 'poor' | 'average' | 'good' | 'excellent' = 'average';
        if (avgScore >= 90) status = 'excellent';
        else if (avgScore >= 75) status = 'good';
        else if (avgScore >= 60) status = 'average';
        else status = 'poor';

        return {
          id: String(emp.user_id || index + 1),
          name: emp.name || 'Unknown',
          empId: emp.employee_id || `EMP${String(index + 1).padStart(3, '0')}`,
          department: emp.department || 'Unassigned',
          role: emp.designation || emp.role || 'Employee',
          attendance,
          taskCompletion,
          productivity: null, // To be rated by manager
          qualityScore: null, // To be rated by manager
          overallRating: null, // Calculated after ratings
          status,
        };
      });

      // Filter by department if specified
      const filteredEmployees = department && department !== 'All Departments'
        ? employeePerformance.filter(emp => emp.department === department)
        : employeePerformance;

      // Calculate department performance
      const deptMap = new Map<string, { employees: any[]; tasks: any[] }>();

      filteredEmployees.forEach(emp => {
        if (!deptMap.has(emp.department)) {
          deptMap.set(emp.department, { employees: [], tasks: [] });
        }
        deptMap.get(emp.department)!.employees.push(emp);
      });

      const departmentPerformance: DepartmentPerformance[] = Array.from(deptMap.entries()).map(([deptName, data], index) => {
        const avgAttendance = data.employees.length > 0
          ? Math.round(data.employees.reduce((sum, e) => sum + e.attendance, 0) / data.employees.length)
          : 0;
        const avgTaskCompletion = data.employees.length > 0
          ? Math.round(data.employees.reduce((sum, e) => sum + e.taskCompletion, 0) / data.employees.length)
          : 0;
        const performanceScore = Math.round((avgAttendance + avgTaskCompletion) / 2);

        let status: 'poor' | 'average' | 'good' | 'excellent' = 'average';
        if (performanceScore >= 90) status = 'excellent';
        else if (performanceScore >= 75) status = 'good';
        else if (performanceScore >= 60) status = 'average';
        else status = 'poor';

        return {
          id: String(index + 1),
          name: deptName,
          totalEmployees: data.employees.length,
          avgProductivity: avgTaskCompletion,
          avgAttendance,
          tasksCompleted: Math.floor(data.employees.length * avgTaskCompletion / 10),
          tasksPending: Math.floor(data.employees.length * (100 - avgTaskCompletion) / 20),
          performanceScore,
          status,
        };
      });

      // Calculate executive summary
      const topPerformer = filteredEmployees.length > 0
        ? filteredEmployees.reduce((best, emp) => {
          const score = (emp.attendance + emp.taskCompletion) / 2;
          const bestScore = (best.attendance + best.taskCompletion) / 2;
          return score > bestScore ? emp : best;
        })
        : { name: 'N/A', attendance: 0, taskCompletion: 0 };

      const bestDept = departmentPerformance.length > 0
        ? departmentPerformance.reduce((best, dept) =>
          dept.performanceScore > best.performanceScore ? dept : best
        )
        : { name: 'N/A', performanceScore: 0 };

      const avgPerformance = filteredEmployees.length > 0
        ? filteredEmployees.reduce((sum, emp) => sum + (emp.attendance + emp.taskCompletion) / 2, 0) / filteredEmployees.length
        : 0;

      const totalTasksCompleted = departmentPerformance.reduce((sum, dept) => sum + dept.tasksCompleted, 0);

      const executive: ExecutiveSummary = {
        topPerformer: {
          name: topPerformer.name,
          score: Math.round((topPerformer.attendance + topPerformer.taskCompletion) / 2),
        },
        avgPerformance: Math.round(avgPerformance * 10) / 10,
        tasksCompleted: totalTasksCompleted,
        tasksTrend: Math.floor(Math.random() * 20) - 5, // Placeholder
        bestDepartment: {
          name: bestDept.name,
          score: bestDept.performanceScore,
        },
        keyFindings: [
          `Total of ${filteredEmployees.length} employees analyzed`,
          `Average attendance rate: ${Math.round(avgPerformance)}%`,
          `${departmentPerformance.filter(d => d.status === 'excellent').length} departments performing excellently`,
          `${totalTasksCompleted} tasks completed this period`,
        ],
        recommendations: [
          'Review employees with attendance below 80%',
          'Recognize top performers to maintain motivation',
          'Provide additional support to underperforming departments',
          'Schedule regular performance reviews',
        ],
        actionItems: [
          'Complete pending performance ratings',
          'Review department resource allocation',
          'Plan team building activities',
          'Update training programs based on performance gaps',
        ],
      };

      return {
        employees: filteredEmployees,
        departments: departmentPerformance,
        executive,
      };
    } catch (error: any) {
      console.error("❌ Failed to fetch reports data:", error);
      throw new Error(error.message || "Failed to load reports data");
    }
  }

  async saveEmployeeRating(
    employeeId: string,
    ratings: { productivity: number; qualityScore: number; productivityComment?: string; qualityComment?: string }
  ): Promise<void> {
    console.log("📤 Saving employee rating:", employeeId, ratings);
    // This would typically save to a backend endpoint
    // For now, we'll just log it as the backend doesn't have this endpoint yet
    console.log("✅ Rating saved (mock):", { employeeId, ...ratings });
  }
}

// Settings interface
export interface UserSettings {
  id: number;
  user_id: number;
  theme_mode: string;
  color_theme: string;
  language: string;
  email_notifications: boolean;
  push_notifications: boolean;
  two_factor_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

// Reports interfaces
export interface EmployeePerformance {
  id: string;
  name: string;
  empId: string;
  department: string;
  role: string;
  attendance: number;
  taskCompletion: number;
  productivity: number | null;
  qualityScore: number | null;
  overallRating: number | null;
  status: 'poor' | 'average' | 'good' | 'excellent';
}

export interface DepartmentPerformance {
  id: string;
  name: string;
  totalEmployees: number;
  avgProductivity: number;
  avgAttendance: number;
  tasksCompleted: number;
  tasksPending: number;
  performanceScore: number;
  status: 'poor' | 'average' | 'good' | 'excellent';
}

export interface ExecutiveSummary {
  topPerformer: { name: string; score: number };
  avgPerformance: number;
  tasksCompleted: number;
  tasksTrend: number;
  bestDepartment: { name: string; score: number };
  keyFindings: string[];
  recommendations: string[];
  actionItems: string[];
}

export interface ReportsData {
  employees: EmployeePerformance[];
  departments: DepartmentPerformance[];
  executive: ExecutiveSummary;
}

// ======================
// 🔹 Online Status Interfaces
// ======================

export interface OnlineStatusResponse {
  id: number;
  user_id: number;
  attendance_id: number;
  is_online: boolean;
  created_at: string;
  updated_at: string | null;
  total_online_minutes: number;
  total_offline_minutes: number;
  current_session_minutes: number;
}

export interface ToggleStatusResponse {
  success: boolean;
  message: string;
  is_online: boolean;
  total_online_minutes: number;
  total_offline_minutes: number;
  effective_work_hours: number;
}

export interface OnlineStatusSummary {
  user_id: number;
  attendance_id: number;
  is_online: boolean;
  total_online_minutes: number;
  total_offline_minutes: number;
  effective_work_hours: number;
  offline_count: number;
  logs: OnlineStatusLog[];
}

export interface OnlineStatusLog {
  id: number;
  status: string;
  offline_reason: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
}

// ✅ Export Singleton
export const apiService = new ApiService(API_BASE_URL);
