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
  joining_date?: string;
  pan_card?: string;
  aadhar_card?: string;
  shift_type?: string;
  employee_type?: string;
  profile_photo?: { uri: string; name: string; type: string } | string;
  is_verified?: boolean;
  created_at?: string;
  user_id?: number;
  reporting_manager?: string;
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
  joining_date?: string;
  resignation_date?: string;
  gender?: string;
  employee_type?: string;
  pan_card?: string;
  aadhar_card?: string;
  shift_type?: string;
  user_id?: number;
  is_verified?: boolean;    // Active/Inactive status (backend uses is_active)
  is_active?: boolean;      // Alternative field name used by backend
  reporting_manager?: string;
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

// WeekOff Rule interfaces - MUST MATCH BACKEND DeptWeekOffRuleCreate/DeptWeekOffRuleOut
export interface WeekOffRuleCreateRequest {
  department: string;     // required
  days: string[];         // required, array of weekday names e.g. ["Saturday", "Sunday"]
}

export interface WeekOffRule {
  id: number;
  department: string;
  days: string[];         // Array of day names like ["Saturday", "Sunday"]
  is_active: boolean;
  created_at: string;     // ISO datetime
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
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
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

// Holiday interfaces - MUST MATCH BACKEND CompanyHolidayCreate/CompanyHolidayOut
export interface HolidayCreateRequest {
  date: string;           // YYYY-MM-DD format (required)
  name: string;           // required, minLength: 1
  description?: string;   // optional
  is_recurring?: boolean; // optional, defaults to false
}

export interface Holiday {
  id: number;
  date: string;           // YYYY-MM-DD format
  name: string;
  description: string | null;
  is_recurring: boolean;
  created_at: string;     // ISO datetime
}

// Legacy alias for backward compatibility
export type HolidayResponse = Holiday;
export type HolidayData = HolidayCreateRequest;

export interface LeaveAllocation {
  annual: number;
  sick: number;
  casual: number;
  other: number;
}

export interface DepartmentWeekOff {
  department: string;
  week_off_days: string[];
}

export interface WfhRequestResponse {
  wfh_id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  wfh_type: "Full Day" | "First Half" | "Second Half";
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Admin/HR enrichment fields
  employee_id?: string;
  name?: string;
  user_name?: string; // Support both name and user_name
  department?: string;
  role?: string;
  approver_name?: string | null;
  // Legacy support
  id?: number;
  date?: string;
}

// Attendance Status interfaces
export interface OnlineStatusResponse {
  id?: number;
  user_id: number;
  attendance_id: number | null;
  is_online: boolean;
  last_seen?: string | null;
  offline_reason?: string | null;
  created_at?: string;
  updated_at?: string | null;
  total_online_minutes?: number;
  total_offline_minutes?: number;
  current_session_minutes?: number;
}

export interface ToggleStatusResponse {
  success?: boolean;
  message: string;
  is_online: boolean;
  offline_reason?: string | null;
  updated_at?: string;
  total_online_minutes?: number;
  total_offline_minutes?: number;
  effective_work_hours?: number;
}

export interface OnlineStatusSummary {
  user_id: number;
  attendance_id: number;
  is_online: boolean;
  total_online_minutes: number;
  total_offline_minutes: number;
  effective_work_hours: number;
  offline_count?: number;
  session_start?: string;
  session_end?: string | null;
  current_status?: 'online' | 'offline';
  logs?: OnlineStatusLog[];
}

export interface OnlineStatusLog {
  id: number;
  attendance_id?: number;
  user_id?: number;
  status: string;
  offline_reason?: string | null;
  started_at?: string;
  ended_at?: string | null;
  duration_minutes?: number;
  timestamp?: string;
  reason?: string | null;
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
  topPerformer: {
    name: string;
    score: number;
  };
  avgPerformance: number;
  tasksCompleted: number;
  tasksTrend: number;
  bestDepartment: {
    name: string;
    score: number;
  };
  keyFindings: string[];
  recommendations: string[];
  actionItems: string[];
}

export interface ReportsData {
  employees: EmployeePerformance[];
  departments: DepartmentPerformance[];
  executive: ExecutiveSummary;
}

// Chat interfaces
export interface ChatUser {
  user_id: number;
  name: string;
  email: string;
  role: string;
  department?: string;
  profile_photo?: string;
  is_online?: boolean;
}

export interface ChatMember {
  user_id: number;
  role: string;
  joined_at: string;
}

export interface ChatSession {
  chat_id: string;
  chat_type: 'private' | 'group';
  name: string | null;
  created_by_id: number;
  created_at: string;
  member_count: number;
  last_message_at: string | null;
  members: ChatMember[];
}

export interface ChatMessage {
  id: string;
  sender_id: number;
  content: string;
  timestamp: number;
  read_by: number[];
}

export interface ChatDetail extends ChatSession {
  messages: ChatMessage[];
}

export interface UserSettings {
  id: number;
  user_id: number;
  theme_mode: string;
  color_theme: string;
  language: string;
  email_notifications: boolean;
  push_notifications: boolean;
  two_factor_enabled: boolean;
  leave_allocation?: LeaveAllocation;
  department_week_off?: DepartmentWeekOff;
  created_at?: string;
  updated_at?: string;
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

  private getGpsObject(gpsLocation: string): { latitude: number; longitude: number } | null {
    if (!gpsLocation || typeof gpsLocation !== 'string') return null;
    try {
      const parts = gpsLocation.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lon)) {
          return { latitude: lat, longitude: lon };
        }
      }
      // Try parsing as JSON if it's already a JSON string
      if (gpsLocation.startsWith('{')) {
        return JSON.parse(gpsLocation);
      }
    } catch (e) {
      console.warn("Failed to parse GPS location:", gpsLocation);
    }
    return null;
  }

  // Helper to get auth user from storage safely
  private async getAuthUser(): Promise<any> {
    try {
      const userStr = await AsyncStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      console.error("❌ Error reading auth user from storage:", e);
      return null;
    }
  }

  // Helper to handle list responses that might be wrapped in { data: [] } or { [key]: [] }
  private handleListResponse(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      // Look for any property that is an array
      const key = Object.keys(data).find(k => Array.isArray(data[k]));
      if (key) return data[key];
      // Check if it's a pagination object like { items: [] }
      if (Array.isArray(data.items)) return data.items;
      if (Array.isArray(data.results)) return data.results;
    }
    return [];
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
  private async request(endpoint: string, options: RequestInit = {}, retryCount: number = 0, suppressNotFoundError: boolean = false): Promise<any> {
    const MAX_AUTH_RETRIES = 2;

    let token = await this.getToken();

    // iOS: Force refresh if no token on first attempt
    if (!token && retryCount === 0) {
      // Check storage once to be sure (token might be missing if logged out)
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
          return this.request(endpoint, options, retryCount + 1, suppressNotFoundError);
        }

        // Handle validation errors (422)
        let errorMessage = `HTTP Error: ${response.status}`;

        // Check for token expiration in error detail
        const detail = data?.detail;
        const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail || '');

        if ((response.status === 401 || response.status === 403) && detailStr.includes('expired')) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if ((response.status === 401 || response.status === 403) && detailStr.includes('Signature has expired')) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (response.status === 422 && detail) {
          if (Array.isArray(detail)) {
            const validationErrors = detail.map((err: any) => {
              const field = err.loc ? err.loc.join('.') : 'unknown';
              return `${field}: ${err.msg}`;
            }).join(', ');
            errorMessage = `Validation Error: ${validationErrors}`;
          } else if (typeof detail === 'string') {
            errorMessage = detail;
          } else {
            errorMessage = JSON.stringify(detail);
          }
        } else {
          errorMessage = data?.error || (typeof detail === 'string' ? detail : (data?.message || errorMessage));
          // If detail is an object and we didn't match anything else, stringify it
          if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
            errorMessage = detail.message || JSON.stringify(detail);
          }
        }

        // Suppress error logging for 404 errors if flag is set (e.g., for optional endpoints like online-status)
        if (!(suppressNotFoundError && response.status === 404)) {
          console.error(`❌ API Error: ${errorMessage}`, {
            url,
            status: response.status,
            data,
            detail: data?.detail
          });
        }
        throw new Error(errorMessage);
      }

      console.log(`✅ API Success: ${options.method || 'GET'} ${url}`);
      return data;
    } catch (error: any) {
      // Suppress error logging for 404 errors if flag is set (e.g., for optional endpoints like online-status)
      const is404Error = error.message?.includes("404") ||
        error.message?.includes("No active attendance") ||
        error.message?.includes("not checked in today");
      if (!(suppressNotFoundError && is404Error)) {
        console.error("❌ API Error:", error);
      }

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

      const response = await fetch(`${this.baseURL}/auth/send-otp?email=${encodeURIComponent(email)}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Accept": "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Deeply inspect the error response from the server
        const errorDetail = data.detail || data;
        const errorMessage = typeof errorDetail === 'string'
          ? errorDetail
          : JSON.stringify(errorDetail, null, 2); // Pretty print the object

        console.error(`❌ OTP Send Failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      console.log(`✅ OTP Sent Successfully:`, data);

      // Ensure expires_in_minutes has a default value if not provided by backend
      if (data.expires_in_minutes === undefined || data.expires_in_minutes === null) {
        data.expires_in_minutes = 2;
      }

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

      const response = await fetch(`${this.baseURL}/auth/verify-otp?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Accept": "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorDetail = data.detail || data;
        const errorMessage = typeof errorDetail === 'string'
          ? errorDetail
          : JSON.stringify(errorDetail, null, 2);

        console.error(`❌ OTP Verification Failed: ${errorMessage}`);
        throw new Error(errorMessage);
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
    const user = await this.getAuthUser();
    const userId = user?.user_id || user?.id;

    if (!userId || isNaN(userId)) {
      console.warn("⚠️ No user ID found for /employees/me, attempting fallback");
      return this.request("/employees/me"); // Some backends might support it
    }

    return this.request(`/employees/${userId}`);
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

  async removeProfilePhoto(): Promise<Employee> {
    const currentProfile = await this.getCurrentUserProfile();
    const formData = new FormData();

    // Add required fields
    formData.append('name', currentProfile.name);
    formData.append('email', currentProfile.email);
    formData.append('employee_id', currentProfile.employee_id);

    // Add flag to remove photo
    formData.append('remove_photo', 'true');

    console.log(`📤 Removing profile photo for user ${currentProfile.id}`);
    return this.requestFormData(`/employees/${currentProfile.id}`, "PUT", formData);
  }

  // ======================
  // 🔹 Employee APIs
  // ======================



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
      // Check storage once to be sure
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
          errorMessage = data?.error || data?.detail || data?.message || errorMessage;
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
  // 1. GET - View My Leaves
  async getMyLeaves(status?: string, page?: number, pageSize?: number): Promise<LeaveRequestResponse[]> {
    // openapi: /leave/ accepts 'period' (current_month, last_3_months, last_6_months, last_1_year)
    // We request 'last_1_year' to ensure we get enough history for the UI to filter locally.
    const endpoint = `/leave/?period=last_1_year`;

    console.log("📥 Fetching my leaves:", endpoint);
    try {
      return await this.request(endpoint);
    } catch (error) {
      console.warn("⚠️ Fetch my leaves failed:", error);
      return [];
    }
  }

  // 2. POST - Request Leave (Submit new leave request)
  // 2. POST - Request Leave (Submit new leave request)
  async submitLeaveRequest(leaveData: LeaveRequestData): Promise<LeaveRequestResponse> {
    console.log("📤 Submitting leave request:", leaveData);
    // openapi: POST /leave/
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
  // API: Calculated client-side from leave list as dedicated endpoint may not exist
  async getMyLeaveSummary(): Promise<LeaveSummary> {
    console.log("📥 Fetching leave summary (calculating locally)");
    try {
      // Revert to client-side calculation using the verified list endpoint
      const leaves = await this.getMyLeaves(); // Uses /leave/?period=last_1_year

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

      // Calculate days and leave_by_type breakdown
      leaves.forEach((l: any) => {
        const days = l.days || 1;
        const leaveType = l.leave_type || "Annual Leave";
        
        // Initialize leave type if not exists
        if (!summary.leave_by_type[leaveType]) {
          summary.leave_by_type[leaveType] = { taken: 0, remaining: 0 };
        }
        
        if (l.status === 'Approved') {
          summary.total_days_approved += days;
          summary.total_days_taken += days;
          summary.leave_by_type[leaveType].taken += days;
        }
        if (l.status === 'Pending') {
          summary.total_days_pending += days;
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
  // 5. GET - Get Leave Details by ID
  async getLeaveDetails(leaveId: number): Promise<LeaveRequestResponse> {
    console.log("📥 Fetching leave details:", leaveId);
    // openapi: GET /leave/{id} does not explicitly exist, but might be hidden. 
    // Fallback: We proceed with /leave/{id} hoping it works, or we accept 404.
    const endpoint = `/leave/${leaveId}`;
    return this.request(endpoint);
  }

  // 6. PUT - Update Leave Request
  // API: PUT /leave/{leave_id} - Updates leave with proper fields per OpenAPI spec
  async updateLeaveRequest(leaveId: number, leaveData: Partial<LeaveRequestData>): Promise<LeaveRequestResponse> {
    console.log("📤 Updating leave request:", leaveId, leaveData);
    // openapi: PUT /leave/{leave_id}
    // Required fields: leave_type, start_date, end_date, days, reason, comments
    const endpoint = `/leave/${leaveId}`;
    
    // Calculate days if not provided
    let days = leaveData.days;
    if (!days && leaveData.start_date && leaveData.end_date) {
      const start = new Date(leaveData.start_date);
      const end = new Date(leaveData.end_date);
      days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    const updatePayload = {
      leave_type: leaveData.leave_type,
      start_date: leaveData.start_date,
      end_date: leaveData.end_date,
      days: days || 1,
      reason: leaveData.reason || "",
      comments: leaveData.comments || "",
    };
    
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(updatePayload),
    });
  }

  // 7. DELETE - Delete Leave Request
  // 7. DELETE - Delete Leave Request
  async deleteLeaveRequest(leaveId: number): Promise<{ message: string }> {
    console.log("🗑️ Deleting leave request:", leaveId);
    // openapi: DELETE /leave/{leave_id}
    const endpoint = `/leave/${leaveId}`;
    return this.request(endpoint, {
      method: "DELETE",
    });
  }

  // 8. GET - Get Team Leaves (Role-based with strict department isolation)
  // 8. GET - Get Team Leaves (Role-based with strict department isolation)
  async getTeamLeaves(page?: number, pageSize?: number, status?: string): Promise<TeamLeavesResponse> {
    console.log("📥 Fetching team leaves based on role");

    try {
      // Get current user to determine which endpoint to call
      const currentUser = await this.getCurrentUserProfile();
      const userRole = currentUser.role?.toLowerCase() || 'employee';

      console.log(`👤 User role: ${userRole}, Department: ${currentUser.department}`);

      let leaves: any[] = [];
      let total = 0;

      // Call appropriate endpoint based on role
      if (['admin', 'hr', 'manager'].includes(userRole)) {
        console.log(`📥 ${userRole}: Fetching team leaves...`);
        try {
          // openapi: GET /leave/approvals (Approvals Inbox)
          const response = await this.request("/leave/approvals");
          if (response) {
            // Response is array of LeaveHistoryOut
            leaves = Array.isArray(response) ? response : (response.leaves || []);
            total = leaves.length;
          }
        } catch (err: any) {
          console.warn("⚠️ Team leaves fetch failed:", err);
          return { leaves: [], total: 0, page: 1, page_size: 0, total_pages: 0 };
        }
      } else {
        // TeamLead/Employee: Get only own leaves
        console.log(`📥 ${userRole}: Fetching own leaves...`);
        // Fallback to getMyLeaves as no specific team endpoint for employee
        leaves = await this.getMyLeaves();
        total = leaves.length;
      }

      // Filter by status if provided (and if backend didn't already filter)
      const filteredLeaves = status ? leaves.filter((l: any) => l.status === status) : leaves;

      return {
        leaves: filteredLeaves,
        total: total,
        page: page || 1,
        page_size: pageSize || filteredLeaves.length,
        total_pages: 1
      };
    } catch (error: any) {
      console.error("❌ Failed to fetch team leaves:", error);
      return { leaves: [], total: 0, page: 1, page_size: 0, total_pages: 0 };
    }
  }

  // 9. PUT - Approve Leave Request
  // API: PUT /leave/{leave_id}/approve - No request body required per OpenAPI spec
  async approveLeaveRequest(leaveId: number, comments?: string): Promise<LeaveRequestResponse> {
    console.log("✅ Approving leave request:", leaveId);
    // openapi: PUT /leave/{leave_id}/approve - accepts optional comments in body
    const endpoint = `/leave/${leaveId}/approve`;
    // Send comments only if provided, otherwise send empty body
    const body = comments ? { comments } : {};
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  // 10. PUT - Reject Leave Request
  // API: PUT /leave/{leave_id}/reject - Uses dedicated reject endpoint
  async rejectLeaveRequest(leaveId: number, rejectionReason: string): Promise<LeaveRequestResponse> {
    console.log("❌ Rejecting leave request:", leaveId);
    // openapi: PUT /leave/{leave_id}/reject with rejection_reason in body
    const endpoint = `/leave/${leaveId}/reject`;
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify({ rejection_reason: rejectionReason || "No reason provided" }),
    });
  }

  // 11. GET - Get My Notifications
  // 11. GET - Get My Notifications
  async getMyNotifications(): Promise<NotificationsResponse> {
    console.log("📥 Fetching notifications");
    // openapi: GET /leave/notifications
    return this.request("/leave/notifications");
  }

  // 12. PUT - Mark Notification As Read
  // 12. PUT - Mark Notification As Read
  async markNotificationAsRead(notificationId: number): Promise<LeaveNotification> {
    console.log("✅ Marking notification as read:", notificationId);
    // openapi: PUT /leave/notifications/{id}/read
    const endpoint = `/leave/notifications/${notificationId}/read`;
    return this.request(endpoint, {
      method: "PUT",
    });
  }

  // 13. PUT - Mark All Notifications As Read
  // 13. PUT - Mark All Notifications As Read
  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    console.log("✅ Marking all notifications as read (simulated)");
    // openapi: Endpoint missing. Return success to avoid error.
    return { message: "All marked as read" };
  }

  // 14. GET - Export Leaves Excel (API based on Row 14)
  async exportLeavesExcel(startDate?: string, endDate?: string): Promise<void> {
    console.log("📥 Exporting leaves excel via API");
    // Row 14: /leaves/export_excel
    // ID: leaves_export_excel_get
    try {
      // Need to download the file. The request method handles JSON parsing usually.
      // We might need a raw download here or just use downloadAsync from FileSystem.
      const token = await this.getToken();
      const FileSystem = await import('expo-file-system/legacy');
      const Sharing = await import('expo-sharing');

      const fileName = `Leaves_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      const fileUri = FileSystem.documentDirectory + fileName;

      const downloadRes = await FileSystem.downloadAsync(
        `${this.baseURL}/reports/leave?format=csv`,
        fileUri,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (downloadRes.status !== 200) {
        throw new Error(`Export failed with status ${downloadRes.status}`);
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error: any) {
      console.error("❌ Export failed:", error);
      throw error;
    }
  }

  // Legacy method for backward compatibility
  async getLeaveRequests(): Promise<LeaveRequestResponse[]> {
    return this.getMyLeaves();
  }

  // ======================
  // 🔹 Holiday APIs
  // ======================

  /**
   * Get all holidays with optional date range filtering
   * @param startDate - Optional start date filter (YYYY-MM-DD)
   * @param endDate - Optional end date filter (YYYY-MM-DD)
   * @returns Array of Holiday objects, empty array on failure
   */
  async getHolidays(startDate?: string, endDate?: string): Promise<Holiday[]> {
    // Build query params - only attach if provided
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const queryString = params.toString();
    const endpoint = `/calendar/holidays${queryString ? `?${queryString}` : ''}`;

    console.log("📥 Fetching holidays:", endpoint);
    try {
      const response = await this.request(endpoint, { method: 'GET' }, 0, true);
      // Handle response - expect array, return empty array if not
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.log("⚠️ Holiday fetch failed, returning empty list");
      return [];
    }
  }

  /**
   * Create a new holiday
   * @param holidayData - Holiday creation data (date, name required; description, is_recurring optional)
   * @returns Created Holiday object
   */
  async createHoliday(holidayData: HolidayCreateRequest): Promise<Holiday> {
    console.log("📤 Creating holiday:", holidayData);
    
    // Validate required fields before sending
    if (!holidayData.date || !holidayData.name) {
      throw new Error("Holiday date and name are required");
    }
    
    // Build request body - only include defined values, no null/undefined
    const requestBody: Record<string, any> = {
      date: holidayData.date,
      name: holidayData.name,
    };
    
    // Add optional fields only if they have values
    if (holidayData.description !== undefined && holidayData.description !== null) {
      requestBody.description = holidayData.description;
    }
    if (holidayData.is_recurring !== undefined && holidayData.is_recurring !== null) {
      requestBody.is_recurring = Boolean(holidayData.is_recurring);
    }
    
    return this.request("/calendar/holidays", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Delete a holiday by ID
   * @param holidayId - The holiday ID (must be a number)
   * @returns Success message response
   */
  async deleteHoliday(holidayId: number): Promise<{ message?: string }> {
    // Validate holidayId is a number
    if (typeof holidayId !== 'number' || isNaN(holidayId)) {
      throw new Error("Holiday ID must be a valid number");
    }
    
    console.log("🗑️ Deleting holiday:", holidayId);
    return this.request(`/calendar/holidays/${holidayId}`, {
      method: "DELETE",
    });
  }

  // Legacy method - kept for backward compatibility
  async getHolidayById(holidayId: number): Promise<Holiday> {
    console.log("📥 Fetching holiday by ID:", holidayId);
    // Note: This endpoint may not exist in the backend per OpenAPI spec
    // Fallback: fetch all and filter
    const holidays = await this.getHolidays();
    const holiday = holidays.find(h => h.id === holidayId);
    if (!holiday) {
      throw new Error(`Holiday with ID ${holidayId} not found`);
    }
    return holiday;
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

  /**
   * Download CSV template for bulk employee upload
   * This generates a CSV file with only the header columns (no data rows)
   * to help users understand which fields are required for bulk upload
   */
  async downloadEmployeeTemplate(): Promise<void> {
    console.log("📥 Generating employee template CSV");

    try {
      // Use legacy API from expo-file-system
      const FileSystem = await import('expo-file-system/legacy');
      const Sharing = await import('expo-sharing');

      // Define the CSV headers - these are the required/recommended fields for bulk upload
      const headers = [
        'employee_id',      // Required
        'name',             // Required
        'email',            // Required
        'department',       // Required
        'designation',      // Optional
        'role',             // Required (e.g., Admin, HR, Manager, Team Lead, Employee)
        'phone',            // Optional
        'gender',           // Optional (Male, Female, Other)
        'shift_type',       // Optional (Day Shift, Night Shift, Rotational)
        'employee_type',    // Optional (Full-time, Part-time, Contract, Intern)
        'pan_card',         // Required
        'aadhar_card',      // Required
        'address',          // Optional
        'resignation_date'  // Optional (format: DD/MM/YYYY)
      ];

      // Sample row to help users understand the format
      const sampleRow = [
        'EMP001',                    // employee_id
        'John Doe',                  // name
        'john.doe@company.com',      // email
        'Engineering',               // department
        'Senior Developer',          // designation
        'Employee',                  // role (Admin, HR, Manager, Team Lead, Employee)
        '9876543210',                // phone
        'Male',                      // gender (Male, Female, Other)
        'Day Shift',                 // shift_type (Day Shift, Night Shift, Rotational)
        'Full-time Employee Type',   // employee_type (Full-time, Part-time, Contract, Intern)
        'ABCDE1234F',                // pan_card (Format: 5 letters + 4 digits + 1 letter)
        '123456789012',              // aadhar_card (12 digits)
        '123 Main St, City, State',  // address
        ''                           // resignation_date (DD/MM/YYYY format, leave empty if not applicable)
      ];

      // Create CSV content with headers and sample row
      const csvContent = headers.join(',') + '\n' + sampleRow.map(value => `"${value}"`).join(',') + '\n';

      // Create filename with timestamp
      const fileName = `employee_template_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      console.log("📁 Creating template at:", fileUri);

      // Write the CSV content to file
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      console.log("✅ Template created at:", fileUri);

      // Share the file
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Save Employee Template',
          UTI: 'public.comma-separated-values-text',
        });
        console.log("✅ Template shared successfully");
      } else {
        console.log("✅ Template saved to:", fileUri);
      }
    } catch (error: any) {
      console.error("❌ Template Download Failed:", error);
      throw new Error(error.message || "Failed to download template");
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
          `• You are on the same WiFi network\n` +
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
    const response = await this.request("/tasks/");
    return this.handleListResponse(response);
  }

  // 2.1 GET - All Tasks (Admin/HR/Manager only)
  async getAllTasks(): Promise<any[]> {
    console.log("📥 Fetching all tasks (admin view)");
    try {
      const response = await this.request("/tasks/all");
      return this.handleListResponse(response);
    } catch (error: any) {
      if (error.status === 405 || error.status === 404) {
        console.warn(`⚠️ /tasks/all not supported (${error.status}), falling back to /tasks/`);
        const fallback = await this.request("/tasks/");
        return this.handleListResponse(fallback);
      }
      throw error;
    }
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
    const user = await this.getAuthUser();
    const userId = user?.user_id || user?.id;

    if (!userId || isNaN(userId)) {
      return this.request("/tasks/reports/me", {
        method: "POST",
        body: JSON.stringify(filter),
      });
    }

    return this.request(`/tasks/reports/${userId}`, {
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

  // Combined method for reactivation (reassign)
  async reassignTask(taskId: number, data: { description: string; due_date: string; status: "Pending" | "In Progress" | "Completed" | "Cancelled" }): Promise<any> {
    console.log("📤 Reactivating task:", taskId, data);

    // 1. Update status to Pending
    await this.updateTaskStatus(taskId, { status: data.status });

    // 2. Update description and due_date
    return this.updateTask(taskId, {
      description: data.description,
      due_date: data.due_date
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

  // 14. POST - Add Task Comment with Attachment
  async addTaskCommentWithAttachment(
    taskId: number,
    message: string,
    attachment?: {
      uri: string;
      name: string;
      type: 'image' | 'pdf' | 'file';
      size?: number;
      mimeType?: string;
    }
  ): Promise<any> {
    console.log("📤 Adding task comment with attachment:", taskId);

    if (!attachment) {
      // No attachment, use regular comment endpoint
      return this.addTaskComment(taskId, message);
    }

    try {
      // Use FormData for file upload
      const formData = new FormData();

      // Add message
      if (message && message.trim()) {
        formData.append('message', message);
        console.log("📝 Added message to FormData");
      }

      // Convert URI to blob for FormData
      // In React Native, we can pass the URI directly with type and name
      const mimeType = attachment.mimeType || 'application/octet-stream';

      // For React Native, FormData handles file:// URIs directly
      const fileObject = {
        uri: attachment.uri,
        type: mimeType,
        name: attachment.name,
      };

      console.log("📎 File object:", fileObject);
      formData.append('attachment', fileObject as any);
      console.log("📎 Added attachment to FormData");

      console.log(`📤 Uploading attachment: ${attachment.name} (${attachment.type}) - ${attachment.size} bytes - MIME: ${mimeType}`);

      // Use FormData request handler for file upload
      const response = await this.requestFormData(`/tasks/${taskId}/comments`, "POST", formData);
      console.log("✅ Attachment uploaded successfully:", response);
      return response;
    } catch (error: any) {
      console.error("❌ Error preparing attachment:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to prepare attachment: ${error.message}`);
    }
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

  async checkIn(userId: number, gpsLocation: string, selfie: string, workMode: "office" | "wfh" = "office", locationData: any = null): Promise<{
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
    // API: POST /attendance/check-in/json
    // Spec: AttendanceJSONPayload { user_id, gps_location, selfie, location_data, work_location }
    const url = `${this.baseURL}/attendance/check-in/json`;

    // Map workMode to backend enum 'office' | 'work_from_home'
    const work_location = workMode === "wfh" ? "work_from_home" : "office";

    const gpsLocationObj = this.getGpsObject(gpsLocation);

    const requestBody = {
      user_id: userId,
      gps_location: gpsLocationObj,
      selfie: cleanSelfie,
      location_data: locationData,
      work_location: work_location,
    };

    console.log("📤 Check-in request (JSON):", {
      url,
      user_id: userId,
      gps_location: gpsLocationObj,
      work_location: work_location,
      selfie_length: cleanSelfie.length,
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
            gps_location: gpsLocation,
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
    workSummary: string,
    workReportFile?: { uri: string; name: string; type: string } | null,
    locationData: any = null
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

    console.log(`🔑 Check-out token status: ${token ? `present (${token.substring(0, 20)}...)` : 'MISSING'}`);

    // If work report file is provided, use FormData
    if (workReportFile) {
      console.log("📄 Uploading with work report file:", workReportFile.name);

      const gpsLocationObj = this.getGpsObject(gpsLocation);
      const formData = new FormData();
      formData.append('user_id', userId.toString());
      formData.append('gps_location', gpsLocationObj ? JSON.stringify(gpsLocationObj) : gpsLocation);
      formData.append('work_summary', workSummary || "Completed daily tasks");
      if (locationData) {
        formData.append('location_data', typeof locationData === 'object' ? JSON.stringify(locationData) : locationData);
      }

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
    // API: POST /attendance/check-out/json
    const url = `${this.baseURL}/attendance/check-out/json`;

    const gpsLocationObj = this.getGpsObject(gpsLocation);

    const requestBody = {
      user_id: userId,
      gps_location: gpsLocationObj,
      selfie: cleanSelfie,
      work_summary: workSummary || "Completed daily tasks",
      location_data: locationData,
    };

    console.log("📤 Check-out request (JSON):", {
      url,
      user_id: userId,
      gps_location: gpsLocationObj,
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
            gps_location: gpsLocation,
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



  // WFH APIs
  async submitWfhRequest(reason: string, startDate: string, endDate: string, wfhType: string = "Full Day"): Promise<WfhRequestResponse> {
    const body = {
      start_date: startDate,
      end_date: endDate,
      wfh_type: wfhType,
      reason: reason
    };

    console.log("📤 Submitting WFH request:", body);

    return this.request("/wfh/request", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async getMyWfhRequests(): Promise<WfhRequestResponse[]> {
    return this.handleListResponse(await this.request("/wfh/my-requests"));
  }

  // Helper to find a request for a specific date from the list
  async getMyWfhRequest(targetDate?: string): Promise<WfhRequestResponse | null> {
    try {
      const requests = await this.getMyWfhRequests();
      if (!targetDate) return requests[0] || null;

      // Find request that covers the target date
      // Note: This matches string dates YYYY-MM-DD
      return requests.find(r =>
        r.start_date <= targetDate && r.end_date >= targetDate
      ) || null;
    } catch (error) {
      console.warn("Failed to fetch my WFH requests:", error);
      return null;
    }
  }

  async getMyWfhRequestDetail(wfhId: number): Promise<WfhRequestResponse> {
    return this.request(`/wfh/my-requests/${wfhId}`);
  }

  async updateMyWfhRequest(wfhId: number, data: { start_date: string; end_date: string; wfh_type: string; reason: string }): Promise<WfhRequestResponse> {
    return this.request(`/wfh/my-requests/${wfhId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteMyWfhRequest(wfhId: number): Promise<void> {
    return this.request(`/wfh/my-requests/${wfhId}`, {
      method: "DELETE",
    });
  }

  // Admin/HR/Manager APIs
  async listAllWfhRequests(filters: { status_filter?: string; department?: string } = {}): Promise<{ total: number; pending_count: number; requests: WfhRequestResponse[] }> {
    let queryParams = "";
    const params = new URLSearchParams();
    if (filters.status_filter) params.append("status_filter", filters.status_filter);
    if (filters.department) params.append("department", filters.department);

    if (params.toString()) {
      queryParams = `?${params.toString()}`;
    }

    const url = `/wfh/requests${queryParams}`;
    console.log(`📡 Fetching WFH requests: ${url}`);

    const response = await this.request(url);

    // Handle different response formats (Array vs Object)
    if (Array.isArray(response)) {
      return {
        total: response.length,
        pending_count: response.filter((r: any) => r.status?.toLowerCase() === "pending").length,
        requests: response
      };
    } else if (response && Array.isArray(response.requests)) {
      return response;
    }

    return {
      total: 0,
      pending_count: 0,
      requests: []
    };
  }

  // Admin/HR/Manager API to list WFH requests
  async listWfhRequests(status?: string, department?: string): Promise<WfhRequestResponse[]> {
    try {
      const filters: any = {};
      // Handle "all" or null by not sending filter
      if (status && status !== 'all') {
        filters.status_filter = status;
      }
      if (department && department !== 'all') {
        filters.department = department;
      }

      const data = await this.listAllWfhRequests(filters);
      return data.requests;
    } catch (e) {
      console.warn("❌ Failed to fetch WFH requests:", e);
      return [];
    }
  }

  async getWfhRequestDetailAdmin(wfhId: number): Promise<WfhRequestResponse> {
    return this.request(`/wfh/requests/${wfhId}`);
  }

  async approveRejectWfhRequest(wfhId: number, approved: boolean, rejectionReason: string | null = null): Promise<WfhRequestResponse> {
    const endpoint = `/wfh/requests/${wfhId}/approve`;
    const body = {
      approved: approved,
      rejection_reason: rejectionReason
    };

    console.log(`📤 Updating WFH request ${wfhId}:`, body);

    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  // Legacy alias for compatibility
  async updateWfhRequestStatus(id: number, statusValue: "approved" | "rejected"): Promise<WfhRequestResponse> {
    return this.approveRejectWfhRequest(id, statusValue === "approved");
  }

  async getPendingWfhCount(): Promise<{ pending_count: number }> {
    return this.request("/wfh/pending-count");
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
    user_id?: number;
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
    if (filters?.user_id) params.append('user_id', filters.user_id.toString());

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

    // Build query parameters - API: GET /attendance/download/csv?user_id=1
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (departmentFilter) params.append('department', departmentFilter);
    if (employeeIdFilter) params.append('employee_id', employeeIdFilter);

    const queryString = params.toString();
    const url = `${this.baseURL}/attendance/download/csv${queryString ? '?' + queryString : ''}`;

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

    // Build query parameters - API: GET /attendance/download/pdf?user_id=1
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (departmentFilter) params.append('department', departmentFilter);
    if (employeeIdFilter) params.append('employee_id', employeeIdFilter);

    const queryString = params.toString();
    const url = `${this.baseURL}/attendance/download/pdf${queryString ? '?' + queryString : ''}`;

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

  async downloadMonthlyGridCSV(params: {
    month: string;
    year: string;
    department?: string;
    userId?: number;
    employeeId?: string;
  }): Promise<void> {
    const token = await this.getToken();

    // Build query parameters - API: GET /attendance/report/monthly-grid/download/csv
    const queryParams = new URLSearchParams();
    queryParams.append('month', params.month);
    queryParams.append('year', params.year);
    if (params.department) queryParams.append('department', params.department);
    if (params.userId) queryParams.append('user_id', params.userId.toString());
    if (params.employeeId) queryParams.append('employee_id', params.employeeId);

    const queryString = queryParams.toString();
    const url = `${this.baseURL}/attendance/report/monthly-grid/download/csv?${queryString}`;

    console.log("📥 Downloading Grid CSV from:", url);

    try {
      const FileSystem = await import('expo-file-system/legacy');
      const Sharing = await import('expo-sharing');

      const fileName = `Attendance_Grid_CSV_${params.month}_${params.year}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      console.log("📁 Downloading to:", fileUri);

      // Build headers explicitly - Authorization ALWAYS included if token exists
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const downloadResult = await FileSystem.downloadAsync(
        url,
        fileUri,
        { headers }
      );

      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download Grid CSV: ${downloadResult.status}`);
      }

      console.log("✅ Grid CSV downloaded to:", downloadResult.uri);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Save Grid Attendance CSV',
          UTI: 'public.comma-separated-values-text',
        });
        console.log("✅ Grid CSV shared successfully");
      } else {
        console.log("✅ Grid CSV saved to:", downloadResult.uri);
      }
    } catch (error: any) {
      console.error("❌ Grid CSV Export Failed:", error);
      throw new Error(error.message || "Failed to export Grid CSV");
    }
  }

  async downloadMonthlyGridPDF(params: {
    month: string;
    year: string;
    department?: string;
    userId?: number;
    employeeId?: string;
  }): Promise<void> {
    const token = await this.getToken();

    // Build query parameters - API: GET /attendance/report/monthly-grid/download/pdf
    const queryParams = new URLSearchParams();
    queryParams.append('month', params.month);
    queryParams.append('year', params.year);
    if (params.department) queryParams.append('department', params.department);
    if (params.userId) queryParams.append('user_id', params.userId.toString());
    if (params.employeeId) queryParams.append('employee_id', params.employeeId);

    const queryString = queryParams.toString();
    const url = `${this.baseURL}/attendance/report/monthly-grid/download/pdf?${queryString}`;

    console.log("📥 Downloading Grid PDF from:", url);

    try {
      const FileSystem = await import('expo-file-system/legacy');
      const Sharing = await import('expo-sharing');

      const fileName = `Attendance_Grid_PDF_${params.month}_${params.year}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;

      console.log("📁 Downloading to:", fileUri);

      // Build headers explicitly - Authorization ALWAYS included if token exists
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const downloadResult = await FileSystem.downloadAsync(
        url,
        fileUri,
        { headers }
      );

      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download Grid PDF: ${downloadResult.status}`);
      }

      console.log("✅ Grid PDF downloaded to:", downloadResult.uri);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Grid Attendance PDF',
          UTI: 'com.adobe.pdf',
        });
        console.log("✅ Grid PDF shared successfully");
      } else {
        console.log("✅ Grid PDF saved to:", downloadResult.uri);
      }
    } catch (error: any) {
      console.error("❌ Grid PDF Export Failed:", error);
      throw new Error(error.message || "Failed to export Grid PDF");
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
    return this.request(`/attendance/user-online-status/${userId}`, {}, 0, true);
  }

  /**
   * Toggle online/offline status.
   * When going offline, offlineReason is REQUIRED.
   */
  async toggleOnlineStatus(attendanceId: number | null, userId: number, isOnline: boolean, offlineReason?: string): Promise<ToggleStatusResponse> {
    if (!attendanceId) {
      console.warn("⚠️ Skipping online status update: No attendanceId provided.");
      return { success: false, message: "No attendance active", is_online: false, total_online_minutes: 0, total_offline_minutes: 0, effective_work_hours: 0 };
    }

    console.log(`🔄 Updating online status: attendance=${attendanceId}, user=${userId}, isOnline=${isOnline}`);

    return this.request(`/attendance/online-status`, {
      method: "POST",
      body: JSON.stringify({
        attendance_id: attendanceId,
        user_id: userId,
        is_online: isOnline,
        offline_reason: offlineReason || null,
        reason: offlineReason || null // Backend likely expects 'reason' for validation
      }),
    });
  }

  /**
   * Get detailed summary of online/offline time for a user's attendance session.
   */
  async getOnlineStatusSummary(userId: number, attendanceId: number): Promise<OnlineStatusSummary> {
    console.log("📥 Fetching online status summary for attendance:", attendanceId);
    return this.request(`/attendance/online-status/${attendanceId}`);
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

  async getMySettings(): Promise<any> {
    const user = await this.getAuthUser();
    const userId = user?.user_id || user?.id;

    if (!userId || isNaN(userId)) {
      console.log("📥 Fetching user settings (me)");
      return this.request("/settings/me");
    }

    console.log("📥 Fetching user settings for:", userId);
    return this.request(`/settings/${userId}`);
  }

  async updateMySettings(settingsData: any): Promise<any> {
    const user = await this.getAuthUser();
    const userId = user?.user_id || user?.id;

    if (!userId || isNaN(userId)) {
      console.log("📤 Updating user settings (me):", settingsData);
      return this.request("/settings/me", {
        method: "PUT",
        body: JSON.stringify(settingsData),
      });
    }

    console.log("📤 Updating user settings for:", userId, settingsData);
    return this.request(`/settings/${userId}`, {
      method: "PUT",
      body: JSON.stringify(settingsData),
    });
  }

  async getSettingsByUserId(userId: number): Promise<any> {
    console.log("📥 Fetching settings for user:", userId);
    return this.request(`/settings/${userId}`);
  }

  async updateSettingsByUserId(userId: number, settingsData: any): Promise<any> {
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

  async getReportsData(month?: string, department?: string, user?: any): Promise<ReportsData> {
    console.log("📥 Fetching reports data with real calculations");

    // Check if user is admin
    const isAdmin = user?.role === 'admin';
    const currentUserId = user?.id;

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

      // Filter employees based on user role
      // 1. Always exclude admin users from reports (admins are not analyzed)
      // 2. Only include: HR, Manager, Team Lead, Employee roles
      // 3. Non-admin users only see their own data
      // 4. HR/Manager/Team Lead can see all non-admin employees

      let employeesToProcess = employees;

      // First, always exclude admin users from reports
      // Check both 'role' and 'designation' fields for admin
      const nonAdminEmployees = employees.filter((emp: any) => {
        const empRole = (emp.role || emp.designation || '').toLowerCase();
        return empRole !== 'admin';
      });
      console.log(`🔍 Filtered out admins: ${employees.length} total → ${nonAdminEmployees.length} non-admin employees`);

      if (!isAdmin && currentUserId) {
        // Non-admin user: only see their own data
        console.log(`🔒 Non-admin user (ID: ${currentUserId}) - filtering to show only their data`);
        employeesToProcess = nonAdminEmployees.filter((emp: any) => emp.user_id === currentUserId);
        console.log(`📊 Filtered employees: ${employeesToProcess.length} (from ${nonAdminEmployees.length} non-admin total)`);
      } else if (isAdmin) {
        // Admin user: show all non-admin employees (exclude other admins)
        console.log(`👑 Admin user - showing all non-admin employees data (excluding other admins)`);
        employeesToProcess = nonAdminEmployees;
      } else {
        // Fallback: use non-admin employees
        employeesToProcess = nonAdminEmployees;
      }

      // Calculate employee performance with real data
      const employeePerformance: EmployeePerformance[] = employeesToProcess.map((emp: any, index: number) => {
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
        ? employeePerformance.filter(emp => {
          const empDepts = (emp.department || '').split(',').map(d => d.trim());
          return empDepts.includes(department);
        })
        : employeePerformance;

      // Calculate department performance
      const deptMap = new Map<string, { employees: any[]; tasks: any[] }>();

      filteredEmployees.forEach(emp => {
        const depts = (emp.department || '').split(',').map(d => d.trim()).filter(Boolean);
        depts.forEach(dept => {
          if (!deptMap.has(dept)) {
            deptMap.set(dept, { employees: [], tasks: [] });
          }
          deptMap.get(dept)!.employees.push(emp);
        });
      });

      // First, calculate actual task counts per department from the tasks array
      const deptTaskCounts = new Map<string, { completed: number; pending: number; total: number }>();

      // Get employee user IDs by department for task matching
      const empUserIdsByDept = new Map<string, Set<number>>();
      filteredEmployees.forEach(emp => {
        const depts = (emp.department || '').split(',').map(d => d.trim()).filter(Boolean);
        depts.forEach(dept => {
          if (!empUserIdsByDept.has(dept)) {
            empUserIdsByDept.set(dept, new Set());
          }
          // emp.id is the user_id as string
          const userId = parseInt(emp.id, 10);
          if (!isNaN(userId)) {
            empUserIdsByDept.get(dept)!.add(userId);
          }
        });
      });

      // Count tasks per department
      empUserIdsByDept.forEach((userIds, deptName) => {
        let completed = 0;
        let pending = 0;

        tasks.forEach((task: any) => {
          const assignedTo = Number(task.assigned_to);
          if (userIds.has(assignedTo)) {
            const status = (task.status || '').toLowerCase().trim();
            if (status === 'completed') {
              completed++;
            } else {
              // Pending includes "pending" and "in progress"
              pending++;
            }
          }
        });

        deptTaskCounts.set(deptName, { completed, pending, total: completed + pending });
        console.log(`📊 Department "${deptName}": ${completed} completed, ${pending} pending, ${completed + pending} total tasks`);
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

        // Get actual task counts for this department
        const taskCounts = deptTaskCounts.get(deptName) || { completed: 0, pending: 0, total: 0 };

        return {
          id: String(index + 1),
          name: deptName,
          totalEmployees: data.employees.length,
          avgProductivity: avgTaskCompletion,
          avgAttendance,
          tasksCompleted: taskCounts.completed,
          tasksPending: taskCounts.pending,
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
      const totalTasksPending = departmentPerformance.reduce((sum, dept) => sum + dept.tasksPending, 0);
      const totalTasks = totalTasksCompleted + totalTasksPending;

      // Calculate task trend (compare with previous period if possible, otherwise show completion rate)
      const taskCompletionRate = totalTasks > 0 ? Math.round((totalTasksCompleted / totalTasks) * 100) : 0;

      const executive: ExecutiveSummary = {
        topPerformer: {
          name: topPerformer.name,
          score: Math.round((topPerformer.attendance + topPerformer.taskCompletion) / 2),
        },
        avgPerformance: Math.round(avgPerformance * 10) / 10,
        tasksCompleted: totalTasksCompleted,
        tasksTrend: taskCompletionRate > 50 ? Math.min(taskCompletionRate - 50, 25) : -(50 - taskCompletionRate), // Based on completion rate
        bestDepartment: {
          name: bestDept.name,
          score: bestDept.performanceScore,
        },
        keyFindings: [
          `Total of ${filteredEmployees.length} employees analyzed`,
          `Average performance score: ${Math.round(avgPerformance)}%`,
          `${departmentPerformance.filter(d => d.status === 'excellent').length} departments performing excellently`,
          `${totalTasksCompleted} of ${totalTasks} tasks completed (${taskCompletionRate}%)`,
        ],
        recommendations: [
          totalTasksPending > 0 ? `Address ${totalTasksPending} pending tasks across departments` : 'All tasks completed - great work!',
          'Review employees with attendance below 80%',
          'Recognize top performers to maintain motivation',
          'Provide additional support to underperforming departments',
        ],
        actionItems: [
          'Complete pending performance ratings',
          totalTasksPending > 5 ? `Prioritize ${totalTasksPending} pending tasks` : 'Review task distribution',
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
    employeeId: string | number,
    ratings: { productivity: number; qualityScore: number; productivityComment?: string; qualityComment?: string }
  ): Promise<any> {
    console.log("📤 Saving employee rating:", employeeId, ratings);

    // Use FormData for the request to match the backend endpoint
    const formData = new FormData();
    formData.append('productivity', ratings.productivity.toString());
    formData.append('quality_score', ratings.qualityScore.toString());
    formData.append('productivity_comment', ratings.productivityComment || "");
    formData.append('quality_comment', ratings.qualityComment || "");

    try {
      const response = await this.requestFormData(`/employees/${employeeId}/rating`, "PUT", formData);
      console.log("✅ Rating saved successfully:", response);
      return response;
    } catch (error: any) {
      console.error("❌ Failed to save rating:", error);
      throw error;
    }
  }

  // ======================
  // 🔹 Leave Allocation APIs (Global Configuration)
  // ======================

  /**
   * Get current leave allocation configuration
   * @returns Current leave allocation values
   */
  async getGlobalLeaveAllocation(): Promise<any> {
    console.log("📥 Fetching global leave allocation");
    // GET /leave/config/allocation/current - returns current allocation values
    return this.request("/leave/config/allocation/current");
  }

  /**
   * Get leave allocation config with ID (for updates)
   * @returns Leave allocation config including ID
   */
  async getLeaveAllocationConfig(): Promise<any> {
    console.log("📥 Fetching leave allocation config");
    // GET /leave/config/allocation - returns config with ID
    return this.request("/leave/config/allocation");
  }

  /**
   * Update global leave allocation
   * Uses PUT /calendar/allocation endpoint which doesn't require config_id
   * @param allocationData - Leave allocation data to update
   */
  async updateGlobalLeaveAllocation(allocationData: {
    total_annual_leave: number;
    sick_leave_allocation: number;
    casual_leave_allocation: number;
    other_leave_allocation: number;
  }): Promise<any> {
    console.log("📤 Updating global leave allocation:", allocationData);
    
    // Use PUT /calendar/allocation which doesn't require config_id
    return this.request("/calendar/allocation", {
      method: "PUT",
      body: JSON.stringify(allocationData),
    });
  }

  /**
   * Update leave allocation by config ID
   * @param configId - The config ID to update
   * @param allocationData - Leave allocation data to update
   */
  async updateLeaveAllocationById(
    configId: number,
    allocationData: {
      total_annual_leave?: number;
      sick_leave_allocation?: number;
      casual_leave_allocation?: number;
      other_leave_allocation?: number;
    }
  ): Promise<any> {
    console.log("📤 Updating leave allocation config:", configId, allocationData);
    return this.request(`/leave/config/allocation/${configId}`, {
      method: "PUT",
      body: JSON.stringify(allocationData),
    });
  }

  /**
   * Create new leave allocation configuration
   * @param allocationData - Leave allocation data to create
   */
  async createLeaveAllocationConfig(allocationData: {
    total_annual_leave: number;
    sick_leave_allocation: number;
    casual_leave_allocation: number;
    other_leave_allocation: number;
  }): Promise<any> {
    console.log("📤 Creating leave allocation config:", allocationData);
    return this.request("/leave/config/allocation", {
      method: "POST",
      body: JSON.stringify(allocationData),
    });
  }

  async getDepartmentLeaveAllocation(departmentId: number): Promise<any> {
    console.log("📥 Fetching department leave allocation:", departmentId);
    return this.request(`/leave/department/${departmentId}`);
  }

  async updateDepartmentLeaveAllocation(
    departmentId: number,
    allocationData: {
      annual_leave?: number;
      sick_leave?: number;
      casual_leave?: number;
      other_leave?: number;
    }
  ): Promise<any> {
    console.log("📤 Updating department leave allocation:", departmentId, allocationData);
    return this.request(`/leave/department/${departmentId}`, {
      method: "PUT",
      body: JSON.stringify(allocationData),
    });
  }

  // ======================
  // 🔹 Department Week-Off APIs
  // ======================

  /**
   * Get all department week-off rules with optional department filtering
   * @param department - Optional department name to filter by
   * @returns Array of WeekOffRule objects, empty array on failure
   */
  async getWeekOffRules(department?: string): Promise<WeekOffRule[]> {
    // Build query params - only attach if provided
    const params = new URLSearchParams();
    if (department) params.append('department', department);
    
    const queryString = params.toString();
    const endpoint = `/calendar/weekoffs${queryString ? `?${queryString}` : ''}`;

    console.log("📥 Fetching week-off rules:", endpoint);
    try {
      const response = await this.request(endpoint, { method: 'GET' }, 0, true);
      // Handle response - expect array, return empty array if not
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.log("⚠️ Week-off rules fetch failed, returning empty list");
      return [];
    }
  }

  /**
   * Set/Create a department week-off rule
   * @param weekOffData - Week-off rule data (department and days required)
   * @returns Created WeekOffRule object
   */
  async setWeekOffRule(weekOffData: WeekOffRuleCreateRequest): Promise<WeekOffRule> {
    console.log("📤 Setting week-off rule:", weekOffData);
    
    // Validate required fields
    if (!weekOffData.department || typeof weekOffData.department !== 'string') {
      throw new Error("Department name is required");
    }
    if (!Array.isArray(weekOffData.days) || weekOffData.days.length === 0) {
      throw new Error("Days must be a non-empty array of weekday names");
    }
    
    // Validate weekday names
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const invalidDays = weekOffData.days.filter(day => !validDays.includes(day));
    if (invalidDays.length > 0) {
      throw new Error(`Invalid weekday names: ${invalidDays.join(', ')}. Valid values: ${validDays.join(', ')}`);
    }
    
    // Remove duplicate days
    const uniqueDays = [...new Set(weekOffData.days)];
    
    const requestBody: WeekOffRuleCreateRequest = {
      department: weekOffData.department,
      days: uniqueDays,
    };
    
    return this.request("/calendar/weekoffs", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Delete a week-off rule by ID
   * @param ruleId - The week-off rule ID (must be a number)
   * @returns Success message response
   */
  async deleteWeekOffRule(ruleId: number): Promise<{ message?: string }> {
    // Validate ruleId is a number
    if (typeof ruleId !== 'number' || isNaN(ruleId)) {
      throw new Error("Rule ID must be a valid number");
    }
    
    console.log("🗑️ Deleting week-off rule:", ruleId);
    return this.request(`/calendar/weekoffs/${ruleId}`, {
      method: "DELETE",
    });
  }

  // Legacy methods - kept for backward compatibility
  async getDepartmentWeekOff(departmentId: number): Promise<WeekOffRule[]> {
    console.log("📥 Fetching department week-off (legacy):", departmentId);
    // This legacy method used departmentId, but new API uses department name
    // Return all rules and let caller filter if needed
    return this.getWeekOffRules();
  }

  async updateDepartmentWeekOff(
    departmentId: number,
    weekOffData: { week_off_days: string[] }
  ): Promise<any> {
    console.log("📤 Updating department week-off (legacy):", departmentId, weekOffData);
    // Legacy endpoint - may not exist in new API
    // Try the old endpoint for backward compatibility
    try {
      return await this.request(`/leave/config/week-off/${departmentId}`, {
        method: "PUT",
        body: JSON.stringify(weekOffData),
      });
    } catch (error) {
      console.warn("⚠️ Legacy week-off update failed, endpoint may not exist");
      throw error;
    }
  }

  async getAllDepartmentWeekOffs(): Promise<WeekOffRule[]> {
    console.log("📥 Fetching all department week-offs");
    // Use the new API endpoint
    return this.getWeekOffRules();
  }

  async getGlobalLeaveConfig(): Promise<any> {
    console.log("📥 Fetching global leave configuration");
    return this.request("/leave/config/global");
  }

  // ======================
  // 🔹 Chat APIs
  // ======================

  // ======================
  // 🔹 Chat APIs
  // ======================

  async getChatEligibleUsers(): Promise<ChatUser[]> {
    console.log("📥 Fetching chat eligible users");
    const response = await this.request("/chats/users");
    return this.handleListResponse(response);
  }

  async getOrCreatePrivateChat(userId: number): Promise<{ chat_id: string }> {
    console.log("📤 Creating or getting private conversion for user:", userId);
    return this.request(`/chats/private/${userId}`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async createGroupChat(name: string, memberIds: number[]): Promise<{ group_id: string }> {
    console.log("📤 Creating group chat:", name);
    return this.request("/chats/group", {
      method: "POST",
      body: JSON.stringify({
        name,
        member_ids: memberIds,
      }),
    });
  }

  async addGroupMember(groupId: string, userId: number): Promise<{ members: number[] }> {
    console.log("📤 Adding member to group:", groupId, userId);
    return this.request(`/chats/group/${groupId}/members/add`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async removeGroupMember(groupId: string, userId: number): Promise<{ members: number[] }> {
    console.log("📤 Removing member from group:", groupId, userId);
    return this.request(`/chats/group/${groupId}/members/remove`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async sendChatMessage(chatType: string, chatId: string, content: string): Promise<ChatMessage> {
    console.log("📤 Sending message:", { chatType, chatId, content });
    return this.request(`/chats/${chatType}/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        chat_type: chatType,
        chat_id: chatId,
        content: content,
      }),
    });
  }

  async getChatMessages(
    chatType: string,
    chatId: string,
    limit: number = 20
  ): Promise<ChatMessage[]> {
    console.log("📥 Fetching messages:", { chatType, chatId, limit });
    const response = await this.request(`/chats/${chatType}/${chatId}/messages?limit=${limit}`);
    return this.handleListResponse(response);
  }

  async markChatMessageAsRead(chatType: string, chatId: string, msgId: string): Promise<{ read_by: number[] }> {
    console.log("📤 Marking message as read:", { chatId, msgId });
    return this.request(`/chats/${chatType}/${chatId}/messages/${msgId}/read`, {
      method: "POST",
    });
  }

  async sendTypingIndicator(chatType: string, chatId: string, isTyping: boolean): Promise<{ ok: boolean }> {
    // console.log("📤 Sending typing indicator:", { chatId, isTyping });
    return this.request(`/chats/${chatType}/${chatId}/typing`, {
      method: "POST",
      body: JSON.stringify({
        chat_type: chatType,
        chat_id: chatId,
        is_typing: isTyping,
      }),
    });
  }

  async getChatSessions(): Promise<ChatSession[]> {
    console.log("📥 Fetching chat sessions");
    const response = await this.request("/chats/sessions");
    return this.handleListResponse(response);
  }

  // Legacy support or generic clear (check if backend supports it)
  async clearChat(chatType: string, chatId: string): Promise<any> {
    console.log("📤 Clearing chat:", chatId);
    return this.request(`/chats/${chatType}/${chatId}/clear`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }
}

// ✅ Export Singleton
export const apiService = new ApiService(API_BASE_URL);

