import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { format } from "date-fns";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar, setStatusBarBackgroundColor, setStatusBarStyle } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Select } from "../../components/ui/select";
import { DatePicker } from "../../components/ui/date-picker";
import OfficeHoursScreen from "../../components/ui/OfficeHoursScreen";
import OnlineStatusToggle from "../../components/OnlineStatusToggle";
import AttendanceRecordCard from "../../components/AttendanceRecordCard";
import { GeoLocation } from "../../types";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import { API_CONFIG } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { apiService, WfhRequestResponse } from "../../lib/api";
import {
  formatDateIST,
  formatDateWithDayIST,
  getDayMonthIST,
  getDayOfWeek,
  getMonthYearIST,
  getCurrentISTTime,
  formatTimeIST,
  formatIST,
  toISTISOString,
  getCurrentISTISOString,
  parseIST,
  getStartOfDayIST,
  getEndOfDayIST
} from "../../utils/dateTime";
import {
  isAdminRole,
  isHrOrManager,
  canPerformAttendanceActions,
  canViewWfhRequests,
  canApproveWfhRequests,
  findActiveWfhForToday,
  findAnyWfhForToday,
  isTodayInWfhRange,
  getTodayIST,
  validateWfhCheckIn,
  validateWfhCheckOut,
  getWfhUiState,
  getOfficeUiState,
  isOfficeModeDisabled,
  getEnforcedWorkMode,
  formatDateRange,
  validateWfhAdvanceNotice,
  getMinimumWfhStartDate,
  getAdvanceNoticeMessage,
  WfhRequest as WfhRequestType,
} from "../../utils/attendanceWfhLogic";

// Use the interface from API Service
type WfhRequest = WfhRequestResponse;

const { width } = Dimensions.get("window");

// Helpers removed - using src/utils/dateTime.ts instead

// Helper to format minutes to "Xh Ym" format
const formatMinutesToDuration = (minutes: number | undefined): string => {
  if (minutes === undefined || minutes === null || minutes <= 0) return "0m";
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

// Helper to validate image URI for cross-platform compatibility
const isValidImageUri = (uri: string | null | undefined): boolean => {
  if (!uri || typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return false;
  // Must start with http, https, file, data, or /
  return trimmed.startsWith('http') || trimmed.startsWith('file') || trimmed.startsWith('data:') || trimmed.startsWith('/');
};

type SelfAttendanceRecord = {
  id: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status?: string;
  checkInLocation?: GeoLocation | string;
  checkOutLocation?: GeoLocation | string;
  selfie?: string | null;
  checkOutSelfie?: string | null;
  workLocation?: "Work From Home" | "Work From Office";
  totalOnlineMinutes?: number;
  totalOfflineMinutes?: number;
  effectiveWorkHours?: number;
  isOnline?: boolean;
};

const AttendanceManager: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Role-based access control
  const isAdmin = isAdminRole(user?.role);
  const isHrManager = isHrOrManager(user?.role);
  const canPerformActions = canPerformAttendanceActions(user?.role);
  const canViewWfh = canViewWfhRequests(user?.role);
  const canApproveWfh = canApproveWfhRequests(user?.role);

  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All Roles");
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getCurrentISTTime());
  const [roleSheetVisible, setRoleSheetVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  // Admin always starts in employee view, HR/Manager can toggle
  const [viewMode, setViewMode] = useState<"self" | "employee">(
    isAdmin ? "employee" : (isHrManager ? "employee" : "self")
  );
  const [adminTab, setAdminTab] = useState<"records" | "wfh" | "officeHours">("records");

  // NEW: Last checked date for midnight refresh
  const [lastCheckedDate, setLastCheckedDate] = useState<string>(getTodayIST());
  // NEW: All WFH requests for the current user (for self view)
  const [allMyWfhRequests, setAllMyWfhRequests] = useState<WfhRequestType[]>([]);
  // NEW: Active WFH for today
  const [activeWfhToday, setActiveWfhToday] = useState<WfhRequestType | null>(null);

  // Summary stats for attendance overview
  const [summary, setSummary] = useState<{
    total_employees: number;
    present_today: number;
    late_arrivals: number;
    early_departures: number;
    absent_today: number;
  }>({
    total_employees: 0,
    present_today: 0,
    late_arrivals: 0,
    early_departures: 0,
    absent_today: 0,
  });
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(true);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationDetails, setLocationDetails] = useState<Location.LocationGeocodedAddress | null>(null);
  const [currentAttendance, setCurrentAttendance] = useState<SelfAttendanceRecord | null>(null);
  const [selfAttendanceHistory, setSelfAttendanceHistory] = useState<SelfAttendanceRecord[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [todaysWork, setTodaysWork] = useState("");
  const [workReportFile, setWorkReportFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [myWfhToday, setMyWfhToday] = useState<any | null>(null);
  const [permission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // Export Modal States
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [exportViewMode, setExportViewMode] = useState<"basic" | "grid">("basic");
  const quickFilterOptions = ["This Month", "Last 3 Months", "Last 6 Months", "Custom Date Range"];
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>("This Month");
  const [exportStartDate, setExportStartDate] = useState<Date | null>(null);
  const [exportEndDate, setExportEndDate] = useState<Date>(getCurrentISTTime());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [iosDatePickerVisible, setIosDatePickerVisible] = useState(false);
  const [iosDatePickerField, setIosDatePickerField] = useState<"start" | "end">("start");
  const [tempExportDate, setTempExportDate] = useState(getCurrentISTTime());
  const [employeeFilter, setEmployeeFilter] = useState<"all" | "department" | "specific">("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  // Export employees fetched from backend for date range
  const [exportEmployees, setExportEmployees] = useState<any[]>([]);
  const [exportDepartments, setExportDepartments] = useState<string[]>([]);
  // All export records fetched from backend (for local filtering)
  const [allExportRecords, setAllExportRecords] = useState<any[]>([]);

  // WFH Requests State
  const [wfhRequests, setWfhRequests] = useState<WfhRequest[]>([]);
  const [wfhFilter, setWfhFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [wfhDeptFilter, setWfhDeptFilter] = useState<string>("all");

  const [wfhLoading, setWfhLoading] = useState(false);
  const [workMode, setWorkMode] = useState<"office" | "wfh">("office");
  const [wfhReason, setWfhReason] = useState("");
  const [wfhType, setWfhType] = useState<"Full Day" | "Half Day">("Full Day");
  const [wfhNotes, setWfhNotes] = useState("");
  const [wfhError, setWfhError] = useState<string | null>(null);

  // WFH Rejection Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();

  // Set status bar to match header color
  useEffect(() => {
    if (Platform.OS === "android") {
      setStatusBarBackgroundColor("#f8fafc", false);
    }
    setStatusBarStyle("dark");
  }, []);

  // Auto-refresh logic: Handle AppState changes (Background -> Foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        console.log("📱 App returned to foreground - Refreshing Attendance Data");
        // Force refresh with fresh date derivation
        if (viewMode === "self") {
          loadSelfAttendanceData();
        } else if (viewMode === "employee" && adminTab === "wfh" && (user?.role === "admin" || user?.role === "hr" || user?.role === "manager")) {
          // Refresh WFH requests list if on that tab
          loadWfhRequests();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [viewMode]);

  // Auto-refresh logic: Handle Screen Focus
  useFocusEffect(
    useCallback(() => {
      console.log("👀 Screen focused - Refreshing Attendance Data");
      if (viewMode === "self") {
        loadSelfAttendanceData();
      } else if (viewMode === "employee" && adminTab === "wfh" && (user?.role === "admin" || user?.role === "hr" || user?.role === "manager")) {
        loadWfhRequests();
      }
      // Return cleanup function if needed
      return () => { };
    }, [viewMode])
  );

  useEffect(() => {
    if (viewMode === "self") {
      loadSelfAttendanceData();
      requestPermissions();
    } else {
      loadEmployeeAttendanceData();
      fetchSummary(); // Fetch summary stats for admin/hr/manager view
    }
    // Load WFH requests for Admin, HR, and Manager
    if (user?.role === "admin" || user?.role === "hr" || user?.role === "manager") {
      loadWfhRequests();
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "employee") loadEmployeeAttendanceData();
  }, [selectedDate]);

  useEffect(() => {
    if ((user?.role === "admin" || user?.role === "hr" || user?.role === "manager") && viewMode === "employee" && adminTab === "wfh") {
      loadWfhRequests();
    }
  }, [wfhFilter, wfhDeptFilter, adminTab, viewMode]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const requestPermissions = async () => {
    if (!permission?.granted) await requestCameraPermission();
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === "granted";
    setHasLocationPermission(granted);
    if (granted) await fetchAndSetLocation();
  };

  const loadSelfAttendanceData = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const data = await apiService.getSelfAttendance(parseInt(user.id));
      const today = formatIST(getCurrentISTTime(), "yyyy-MM-dd");

      const transformedData: SelfAttendanceRecord[] = data.map((record: any) => {
        // Parse selfie data - handle JSON format with check_in and check_out
        let selfieUri = record.checkInSelfie || record.check_in_selfie || null;
        let checkOutSelfie = record.checkOutSelfie || record.check_out_selfie || null;

        if (record.selfie) {
          if (typeof record.selfie === "string") {
            try {
              if (record.selfie.trim().startsWith("{")) {
                const selfieData = JSON.parse(record.selfie);
                if (!selfieUri) selfieUri = selfieData.check_in || selfieData.check_in_selfie || null;
                if (!checkOutSelfie) checkOutSelfie = selfieData.check_out || selfieData.check_out_selfie || null;
              } else if (!selfieUri) {
                selfieUri = record.selfie;
              }
            } catch {
              if (!selfieUri) selfieUri = record.selfie;
            }
          } else if (typeof record.selfie === "object") {
            if (!selfieUri) selfieUri = record.selfie.check_in || record.selfie.check_in_selfie || null;
            if (!checkOutSelfie) checkOutSelfie = record.selfie.check_out || record.selfie.check_out_selfie || null;
          }
        }

        const baseUrl = API_CONFIG.getApiBaseUrl();
        // Build full URL for selfies if they're relative paths
        if (selfieUri && typeof selfieUri === "string" && !selfieUri.startsWith("http") && !selfieUri.startsWith("data:") && !selfieUri.startsWith("/") && !selfieUri.startsWith("file:")) {
          selfieUri = `${baseUrl}${selfieUri.startsWith("/") ? "" : "/"}${selfieUri.replace(/\\/g, "/")}`;
        }
        if (checkOutSelfie && typeof checkOutSelfie === "string" && !checkOutSelfie.startsWith("http") && !checkOutSelfie.startsWith("data:") && !checkOutSelfie.startsWith("/") && !checkOutSelfie.startsWith("file:")) {
          checkOutSelfie = `${baseUrl}${checkOutSelfie.startsWith("/") ? "" : "/"}${checkOutSelfie.replace(/\\/g, "/")}`;
        }

        let onlineMins = record.total_online_minutes ?? record.totalOnlineMinutes ?? record.effective_work_hours ?? record.effectiveWorkHours ?? 0;
        const offlineMins = record.total_offline_minutes ?? record.totalOfflineMinutes ?? 0;

        // Fallback for duration calculation if online minutes is 0
        if (onlineMins === 0 && record.check_in && record.check_out) {
          try {
            const start = new Date(record.check_in).getTime();
            const end = new Date(record.check_out).getTime();
            if (!isNaN(start) && !isNaN(end)) {
              const diffMins = Math.floor((end - start) / (1000 * 60));
              onlineMins = Math.max(0, diffMins - offlineMins);
            } else if (record.total_hours) {
              onlineMins = Math.floor(record.total_hours * 60);
            }
          } catch (e) { }
        } else if (onlineMins === 0 && record.total_hours) {
          onlineMins = Math.floor(record.total_hours * 60);
        }

        return {
          id: record.attendance_id.toString(),
          date: record.check_in ? formatIST(record.check_in, "yyyy-MM-dd") : today,
          checkInTime: formatTimeIST(record.check_in),
          checkOutTime: record.check_out ? formatTimeIST(record.check_out) : undefined,
          status: record.checkInStatus || record.status || "present",
          checkInLocation: record.gps_location,
          checkOutLocation: record.check_out ? record.gps_location : undefined,
          selfie: selfieUri,
          checkOutSelfie: checkOutSelfie,
          workLocation: (record.work_location || record.workLocation) === "Work From Home" ? "Work From Home" : "Work From Office",
          isOnline: record.is_online ?? record.isOnline ?? false,
          totalOnlineMinutes: onlineMins,
          totalOfflineMinutes: offlineMins,
          effectiveWorkHours: record.effective_work_hours ?? record.effectiveWorkHours ?? 0,
        };
      });

      setSelfAttendanceHistory(transformedData);
      setCurrentAttendance(transformedData.find((r) => r.date === today) || null);

      // NEW: Use centralized WFH logic
      const allWfhRequests = await apiService.getMyWfhRequests();
      setAllMyWfhRequests(allWfhRequests);

      // Find active approved WFH for today using centralized logic
      const activeWfh = findActiveWfhForToday(allWfhRequests);
      setActiveWfhToday(activeWfh);

      // Find any WFH request for today (any status) for UI display
      const anyWfhToday = findAnyWfhForToday(allWfhRequests);

      if (anyWfhToday) {
        console.log(`✅ Found WFH request for today (${today}):`, anyWfhToday.id, "Status:", anyWfhToday.status);
        setMyWfhToday({
          ...anyWfhToday,
          date: anyWfhToday.start_date || (anyWfhToday as any).date,
          status: anyWfhToday.status ? anyWfhToday.status.toLowerCase() : "pending"
        } as any);

        // Auto-switch to WFH mode if approved
        if (activeWfh) {
          setWorkMode("wfh");
        }
      } else {
        console.log(`ℹ️ No WFH request found for today (${today}). Clearing WFH state.`);
        setMyWfhToday(null);
      }
    } catch (error: any) {
      console.log("Error loading self attendance:", error);
      Alert.alert("Error", "Failed to load attendance data.");
    } finally {
      setIsLoading(false);
    }
  };


  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_CONFIG.getApiBaseUrl()}/attendance/summary`);
      if (!res.ok) throw new Error(`Failed to load summary: ${res.status}`);
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error('fetchSummary error', err);
    }
  };

  const loadEmployeeAttendanceData = async () => {
    try {
      setIsLoading(true);
      const dateStr = formatIST(selectedDate, "yyyy-MM-dd");
      const data = await apiService.getAllAttendance(dateStr);
      const baseUrl = API_CONFIG.getApiBaseUrl();

      console.log("📊 Raw attendance data:", JSON.stringify(data, null, 2));

      const transformedData = data.map((record: any) => {
        // Process selfie URLs - parse JSON if needed
        let checkInSelfie = record.checkInSelfie || record.check_in_selfie || null;
        let checkOutSelfie = record.checkOutSelfie || record.check_out_selfie || null;

        // Also check 'selfie' field which may contain JSON with both paths
        if (record.selfie && typeof record.selfie === "string") {
          try {
            if (record.selfie.trim().startsWith("{")) {
              const selfieData = JSON.parse(record.selfie);
              // Only set if not already set from direct fields
              if (!checkInSelfie) checkInSelfie = selfieData.check_in || selfieData.check_in_selfie;
              if (!checkOutSelfie) checkOutSelfie = selfieData.check_out || selfieData.check_out_selfie;
            } else if (!checkInSelfie) {
              // Legacy format - single path for check-in
              checkInSelfie = record.selfie;
            }
          } catch {
            // If parsing fails and no checkInSelfie yet, treat as legacy format
            if (!checkInSelfie) checkInSelfie = record.selfie;
          }
        }

        // Build full URL for selfies if they're relative paths
        if (checkInSelfie && typeof checkInSelfie === "string" && !checkInSelfie.startsWith("http") && !checkInSelfie.startsWith("data:")) {
          checkInSelfie = `${baseUrl}${checkInSelfie.startsWith("/") ? "" : "/"}${checkInSelfie.replace(/\\/g, "/")}`;
        }
        if (checkOutSelfie && typeof checkOutSelfie === "string" && !checkOutSelfie.startsWith("http") && !checkOutSelfie.startsWith("data:")) {
          checkOutSelfie = `${baseUrl}${checkOutSelfie.startsWith("/") ? "" : "/"}${checkOutSelfie.replace(/\\/g, "/")}`;
        }

        // Process location - try multiple fields
        let locationText = "";
        const locationSource = record.locationLabel || record.checkInLocationLabel || record.gps_location;
        if (locationSource && locationSource !== "null" && locationSource !== "undefined") {
          try {
            if (typeof locationSource === "string") {
              if (locationSource.trim().startsWith("{")) {
                try {
                  const locData = JSON.parse(locationSource);
                  if (locData.address) {
                    locationText = locData.address;
                  } else if (locData.latitude && locData.longitude) {
                    locationText = `${locData.latitude.toFixed(4)}, ${locData.longitude.toFixed(4)}`;
                  }
                } catch {
                  locationText = locationSource.trim();
                }
              } else {
                locationText = locationSource.trim();
              }
            } else if (typeof locationSource === "object" && locationSource !== null) {
              if (locationSource.address) {
                locationText = locationSource.address;
              } else if (locationSource.latitude && locationSource.longitude) {
                locationText = `${locationSource.latitude.toFixed(4)}, ${locationSource.longitude.toFixed(4)}`;
              }
            }
          } catch {
            locationText = String(locationSource);
          }
        }
        if (!locationText) locationText = "Location not available";

        // Process role - normalize to display format
        let userRole = record.role || record.user_role || "";
        if (userRole) {
          const roleLower = String(userRole).toLowerCase();
          if (roleLower === "hr") userRole = "HR";
          else if (roleLower === "manager") userRole = "Manager";
          else if (roleLower === "admin") userRole = "Admin";
          else if (roleLower.includes("team") || roleLower === "teamlead") userRole = "Team Lead";
          else userRole = "Employee";
        } else {
          userRole = "Employee";
        }

        // Process name - use available fields
        const userName = record.name || record.userName || "";
        const displayName = userName || `Employee ${record.user_id || record.attendance_id}`;

        // Process employee ID
        const empId = record.employee_id || "";
        const displayEmpId = empId || `EMP${record.user_id || record.attendance_id}`;

        // Process department
        const dept = record.department || "";
        const displayDept = dept || "Not Assigned";

        // Process email
        const email = record.email || record.userEmail || "";
        const displayEmail = email || "";

        // Process hours
        let hoursWorked = "0.00";
        if (record.total_hours !== null && record.total_hours !== undefined) {
          const hours = typeof record.total_hours === "number" ? record.total_hours : parseFloat(record.total_hours);
          if (!isNaN(hours)) {
            hoursWorked = hours.toFixed(2);
          }
        }

        // Process status
        const status = record.status || record.checkInStatus || "present";

        let onlineMins = record.total_online_minutes ?? record.totalOnlineMinutes ?? 0;
        const offlineMins = record.total_offline_minutes ?? record.totalOfflineMinutes ?? 0;

        // Fallback for duration calculation if online minutes is 0
        if (onlineMins === 0 && record.check_in && record.check_out) {
          try {
            const start = new Date(record.check_in).getTime();
            const end = new Date(record.check_out).getTime();
            if (!isNaN(start) && !isNaN(end)) {
              const diffMins = Math.floor((end - start) / (1000 * 60));
              onlineMins = Math.max(0, diffMins - offlineMins);
            }
          } catch (e) { }
        }

        const transformedRecord = {
          id: record.attendance_id || record.id,
          user_id: record.user_id,
          name: displayName,
          employeeId: displayEmpId,
          department: displayDept,
          email: displayEmail,
          check_in: formatTimeIST(record.check_in),
          check_out: record.check_out ? formatTimeIST(record.check_out) : "",
          location: locationText,
          selfie: checkInSelfie,
          checkOutSelfie: checkOutSelfie,
          status: status,
          hours: hoursWorked,
          total_hours: record.total_hours ?? 0,
          role: userRole,
          date: record.check_in ? formatDateIST(record.check_in) : formatDateIST(selectedDate),
          designation: record.designation || "",
          profile_photo: record.profile_photo || null,
          workSummary: record.work_summary || record.workSummary || "",
          workReport: record.work_report || record.workReport || null,
          workLocation: (record.work_location || record.workLocation) === "Work From Home" ? "Work From Home" : "Work From Office",
          // Online status data from backend
          isOnline: record.is_online ?? record.isOnline ?? false,
          totalOnlineMinutes: onlineMins,
          totalOfflineMinutes: offlineMins,
          effectiveWorkHours: record.effective_work_hours ?? record.effectiveWorkHours ?? 0,
          currentSessionMinutes: record.current_session_minutes ?? record.currentSessionMinutes ?? 0,
        };

        console.log("📋 Transformed record:", transformedRecord.name, "selfie:", checkInSelfie, "checkOutSelfie:", checkOutSelfie);
        return transformedRecord;
      });

      const currentUserRole = user?.role?.toLowerCase();
      const currentUserDepartment = user?.department;
      const currentUserId = user?.id ? parseInt(user.id) : null;
      let filteredByRole: any[];

      const formattedSelectedDate = formatDateIST(selectedDate);
      console.log(`📅 Enforcing date filter: ${formattedSelectedDate}`);

      // Strict frontend filter to ensure we ONLY show the selected date
      const dateFilteredData = transformedData.filter((r) => r.date === formattedSelectedDate);

      if (currentUserRole === "admin") {
        // Admin can see all attendance records (HR, Manager, Team Lead, Employee) across all departments
        filteredByRole = dateFilteredData.filter((r: any) =>
          r.role === "HR" || r.role === "Manager" || r.role === "Team Lead" || r.role === "Employee"
        );
      } else if (currentUserRole === "hr" || currentUserRole === "manager") {
        // HR/Manager can see their own attendance + Team Lead and Employee records in their department
        filteredByRole = dateFilteredData.filter((r: any) => {
          const isSelf = r.user_id === currentUserId;
          const isTeamOrEmployee = r.role === "Team Lead" || r.role === "Employee";
          const isSameDepartment = !currentUserDepartment || r.department === currentUserDepartment;

          // Include self attendance OR team/employee records in same department
          return isSelf || (isTeamOrEmployee && isSameDepartment);
        });
      } else {
        filteredByRole = [];
      }

      setAttendanceRecords(filteredByRole);
      setFilteredRecords(filteredByRole);

      // Load WFH requests for Admin, HR, and Manager - Call asynchronously and catch errors separately
      if (currentUserRole === "admin" || currentUserRole === "hr" || currentUserRole === "manager") {
        loadWfhRequests().catch(err => console.warn("Background WFH load failed:", err));
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to load employee attendance.");
      setAttendanceRecords([]);
      setFilteredRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAndSetLocation = async () => {
    try {
      setIsFetchingLocation(true);
      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude };

      let formattedAddress = "";
      let resolvedPlace: Location.LocationGeocodedAddress | null = null;
      try {
        const [place] = await Location.reverseGeocodeAsync(coords);
        if (place) {
          resolvedPlace = place;
          formattedAddress = [place.name, place.street, place.city, place.region].filter(Boolean).join(", ");
        }
      } catch { }

      const finalAddress = formattedAddress || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
      setLocation({ latitude: coords.latitude, longitude: coords.longitude, address: finalAddress });
      setLocationAddress(finalAddress);
      setLocationDetails(resolvedPlace);
      return { coords, formattedAddress: finalAddress, details: resolvedPlace, geoLocation: { ...coords, address: finalAddress } };
    } catch {
      return null;
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const refreshLocation = async () => {
    if (isFetchingLocation) return;
    if (!hasLocationPermission) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location Required", "Please enable location access.");
        return;
      }
      setHasLocationPermission(true);
    }
    const result = await fetchAndSetLocation();
    if (!result) Alert.alert("Location Unavailable", "Unable to fetch your location.");
  };

  const openCamera = (checkIn: boolean) => {
    if (!permission?.granted) {
      Alert.alert("Permission Required", "Please grant camera access.");
      return;
    }
    setIsCheckingIn(checkIn);
    setCameraVisible(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      setCameraVisible(false);
      await handleSubmitAttendance(photo.uri);
    }
  };


  const handleSubmitAttendance = async (photoUri: string) => {
    if (!user?.id) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }
    setIsLoading(true);
    try {
      // Run location fetch, base64 conversion, and office hours fetch in parallel for speed
      const [locationResult, base64Image, officeHours] = await Promise.all([
        hasLocationPermission ? fetchAndSetLocation() : Promise.resolve(null),
        FileSystem.readAsStringAsync(photoUri, { encoding: FileSystem.EncodingType.Base64 }),
        apiService.getEffectiveOfficeTiming(user?.department),
      ]);

      const latestGeo = locationResult?.geoLocation || location;
      const gpsLocationString = latestGeo ? `${latestGeo.latitude},${latestGeo.longitude}` : "0,0";

      // PRE-CHECK: Prevent attendance before joining date
      if (user?.joiningDate) {
        const joinDate = new Date(user.joiningDate);
        joinDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (today < joinDate) {
          Alert.alert(
            "Access Restricted",
            `Your joining date is ${joinDate.toLocaleDateString()}. You cannot mark attendance before this date.`
          );
          setIsLoading(false);
          return;
        }
      }

      // Import status calculation functions (static import would be better but keeping dynamic for now)
      const { calculateCheckInStatus, calculateCheckOutStatus } = await import("../../utils/attendanceStatus");

      if (isCheckingIn) {
        // Determine work mode based on WFH approval
        const workMode = myWfhToday?.status === "approved" ? "wfh" : "office";

        // Pass detected workMode and locationDetails to checkIn
        const response = await apiService.checkIn(
          parseInt(user.id),
          gpsLocationString,
          base64Image,
          workMode,
          locationResult?.details || locationDetails
        );
        const istNow = getCurrentISTTime();

        // Calculate check-in status
        const statusInfo = calculateCheckInStatus(officeHours);

        const record: SelfAttendanceRecord = {
          id: response.attendance_id.toString(),
          date: formatDateIST(istNow),
          checkInTime: formatTimeIST(istNow),
          checkInLocation: latestGeo || gpsLocationString,
          selfie: photoUri,
          status: statusInfo.checkInStatus,
          isOnline: true,
        };
        setCurrentAttendance(record);
        setSelfAttendanceHistory((prev) => [record, ...prev]);

        // Show status-specific message immediately
        const statusEmoji = statusInfo.checkInStatus === "late" ? "⚠️" : statusInfo.checkInStatus === "early" ? "🕐" : "✅";

        // Auto-set chat status to online after check-in
        try {
          await apiService.toggleOnlineStatus(response.attendance_id, parseInt(user.id), true);
          console.log("✅ Chat status set to Online after check-in");
        } catch (chatErr) {
          console.warn("⚠️ Failed to set chat status to Online:", chatErr);
        }

        Alert.alert(
          `${statusEmoji} ${statusInfo.checkInStatus.toUpperCase()}`,
          statusInfo.message
        );

        // Refresh data in background (don't wait)
        loadSelfAttendanceData().catch(() => { });
      } else if (currentAttendance) {
        // 3. Toggle status to Offline and get final tracked hours BEFORE checkout
        // This avoids "Cannot change status after checkout" error
        const statusResponse = await apiService.toggleOnlineStatus(parseInt(currentAttendance.id), parseInt(user.id), false, "Shift completed / Checked out").catch(err => {
          console.warn("⚠️ Failed to set chat status to Offline:", err);
          return null;
        });

        // 4. API Call for Checkout
        await apiService.checkOut(
          parseInt(user.id),
          gpsLocationString,
          base64Image,
          todaysWork || "Completed daily tasks",
          workReportFile,
          locationResult?.details || locationDetails
        );

        const istNow = getCurrentISTTime();

        // Calculate check-out status
        const statusInfo = calculateCheckOutStatus(officeHours);

        const updated: SelfAttendanceRecord = {
          ...currentAttendance,
          checkOutTime: formatTimeIST(istNow),
          checkOutLocation: latestGeo || gpsLocationString,
          checkOutSelfie: photoUri,
          status: statusInfo.checkOutStatus,
          totalOnlineMinutes: statusResponse?.total_online_minutes ?? 0,
          totalOfflineMinutes: statusResponse?.total_offline_minutes ?? 0,
          effectiveWorkHours: statusResponse?.effective_work_hours ?? 0,
          isOnline: false,
        };
        setCurrentAttendance(updated);
        setSelfAttendanceHistory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setTodaysWork("");
        setWorkReportFile(null);

        // Show status-specific message immediately
        const statusEmoji = statusInfo.checkOutStatus === "late" ? "⏰" : statusInfo.checkOutStatus === "early" ? "⚠️" : "✅";

        Alert.alert(
          `${statusEmoji} ${statusInfo.checkOutStatus.toUpperCase()}`,
          statusInfo.message
        );

        // Refresh data in background (don't wait)
        loadSelfAttendanceData().catch(() => { });
      }
    } catch (error: any) {
      Alert.alert("Attendance Error", error.message || "Unable to submit attendance.");
      console.error("Attendance submission error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const pickWorkReportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/*",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain",
          "application/zip",
          "*/*"
        ],
        copyToCacheDirectory: true
      });
      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        setWorkReportFile({ uri: file.uri, name: file.name, type: file.mimeType || "application/octet-stream" });
      }
    } catch {
      Alert.alert("Error", "Failed to pick document.");
    }
  };

  const confirmCheckOut = () => {
    if (!todaysWork.trim()) {
      Alert.alert("Required", "Please provide today's work summary.");
      return;
    }
    setShowCheckoutModal(false);
    openCamera(false);
  };

  useEffect(() => {
    const results = attendanceRecords.filter((r) => {
      const matchesSearch = searchTerm.trim() === "" || [r.name, r.email, r.employeeId, r.department].some((f: string) => f?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = filterStatus === "All Roles" || r.role === filterStatus;
      return matchesSearch && matchesRole;
    });
    setFilteredRecords(results);
  }, [searchTerm, attendanceRecords, filterStatus]);

  const getStatusColor = (status?: string, hasCheckout?: boolean) => {
    if (!hasCheckout) return { bg: "#dbeafe", text: "#3b82f6", label: "Active" };
    if (status === "late") return { bg: "#fee2e2", text: "#dc2626", label: "Late" };
    return { bg: "#dcfce7", text: "#16a34a", label: "On Time" };
  };

  // State for export records count (fetched from backend)
  const [exportRecordsCount, setExportRecordsCount] = useState<number>(0);
  const [isLoadingExportCount, setIsLoadingExportCount] = useState<boolean>(false);

  // Helper function to get all dates between start and end
  const getDatesBetween = (start: Date, end: Date): string[] => {
    const dates: string[] = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      dates.push(formatIST(current, "yyyy-MM-dd"));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Fetch export records and employees from backend when export filters change
  const fetchExportData = async () => {
    if (!exportStartDate || !exportEndDate) return;

    try {
      setIsLoadingExportCount(true);

      // Get all dates in the range
      const dates = getDatesBetween(exportStartDate, exportEndDate);

      // Limit to fetching max 31 days to avoid too many API calls
      const datesToFetch = dates.slice(0, 31);

      // Fetch attendance for each date in parallel (batch of 5 at a time)
      const allRecords: any[] = [];
      const batchSize = 5;

      for (let i = 0; i < datesToFetch.length; i += batchSize) {
        const batch = datesToFetch.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(date => apiService.getAllAttendance(date).catch(() => []))
        );
        batchResults.forEach(records => {
          if (Array.isArray(records)) {
            allRecords.push(...records);
          }
        });
      }

      // Extract unique employees and departments from the data
      const employeeMap = new Map<string, any>();
      const deptSet = new Set<string>();

      if (Array.isArray(allRecords)) {
        allRecords.forEach((record: any) => {
          const empKey = record.user_id?.toString() || record.employee_id;
          if (empKey && !employeeMap.has(empKey)) {
            employeeMap.set(empKey, {
              id: record.attendance_id || record.id,
              user_id: record.user_id,
              name: record.name || record.userName || record.user_name || `Employee ${record.user_id}`,
              employeeId: record.employee_id || `EMP${record.user_id}`,
              department: record.department || "Not Assigned",
              email: record.email || record.userEmail || "",
              role: record.role || record.user_role || "Employee",
            });
          }
          if (record.department) {
            deptSet.add(record.department);
          }
        });
      }

      setExportEmployees(Array.from(employeeMap.values()));
      setExportDepartments(Array.from(deptSet).sort());
      setAllExportRecords(allRecords);

      console.log(`📊 Export data fetched: ${allRecords.length} total records, ${employeeMap.size} unique employees, ${deptSet.size} departments`);

      // Apply filters for count
      let filteredRecords = [...allRecords];

      if (employeeFilter === "specific") {
        if (selectedDepartment) {
          filteredRecords = filteredRecords.filter((r: any) => r.department === selectedDepartment);
        }
        if (selectedEmployeeId) {
          const selectedEmp = Array.from(employeeMap.values()).find(
            (r) => r.id?.toString() === selectedEmployeeId || r.employeeId === selectedEmployeeId || r.user_id?.toString() === selectedEmployeeId
          );
          if (selectedEmp?.user_id) {
            filteredRecords = filteredRecords.filter((r: any) => r.user_id === selectedEmp.user_id);
          }
        }
      }

      console.log(`📊 Filtered count: ${filteredRecords.length} records`);
      setExportRecordsCount(filteredRecords.length);
    } catch (error) {
      console.warn("Failed to fetch export data:", error);
      setExportRecordsCount(0);
      setExportEmployees([]);
      setExportDepartments([]);
      setAllExportRecords([]);
    } finally {
      setIsLoadingExportCount(false);
    }
  };

  // Update export count locally when employee filter changes (without re-fetching)
  const updateExportCount = () => {
    let filteredRecords = [...allExportRecords];

    // Only apply filters when "specific" employee filter is selected
    if (employeeFilter === "specific") {
      if (selectedDepartment) {
        filteredRecords = filteredRecords.filter((r: any) => r.department === selectedDepartment);
      }
      if (selectedEmployeeId) {
        const selectedEmp = exportEmployees.find(
          (r) => r.id?.toString() === selectedEmployeeId || r.employeeId === selectedEmployeeId || r.user_id?.toString() === selectedEmployeeId
        );
        if (selectedEmp?.user_id) {
          filteredRecords = filteredRecords.filter((r: any) => r.user_id === selectedEmp.user_id);
        }
      }
    }
    // When "all" is selected, show all records count

    console.log(`📊 Export count updated: ${filteredRecords.length} records (filter: ${employeeFilter}, dept: ${selectedDepartment}, emp: ${selectedEmployeeId})`);
    setExportRecordsCount(filteredRecords.length);
  };

  // Update export data when modal opens or date range changes
  useEffect(() => {
    if (exportModalVisible && exportStartDate && exportEndDate) {
      fetchExportData();
    }
  }, [exportModalVisible, exportStartDate, exportEndDate]);

  // Update count locally when employee filter changes (no API call needed)
  useEffect(() => {
    if (exportModalVisible && allExportRecords.length >= 0) {
      updateExportCount();
    }
  }, [employeeFilter, selectedDepartment, selectedEmployeeId, allExportRecords]);

  const filterExportRecords = () => {
    // For local filtering (used for employee list display), we need comparable values
    const start = exportStartDate ? getStartOfDayIST(exportStartDate) : null;
    const end = exportEndDate ? getEndOfDayIST(exportEndDate) : null;

    return attendanceRecords.filter((r) => {
      // r.date is "DD-MM-YYYY"
      const rDate = parseIST(r.date, "dd-MM-yyyy");

      const inRange = (!start || rDate >= start) && (!end || rDate <= end);

      // Department filter - apply if "department" or "specific" mode
      const deptOk =
        (employeeFilter === "department" || employeeFilter === "specific") && selectedDepartment
          ? r.department === selectedDepartment
          : true;

      // Employee filter - strictly match employee ID only in "specific" mode
      const empOk =
        employeeFilter === "specific" && selectedEmployeeId
          ? r.id === selectedEmployeeId || r.employeeId === selectedEmployeeId || r.user_id?.toString() === selectedEmployeeId
          : true;

      return inRange && deptOk && empOk;
    });
  };

  // Get selected employee details for export (from exportEmployees fetched for date range)
  const getSelectedEmployeeDetails = () => {
    if (employeeFilter !== "specific" || !selectedEmployeeId) return null;
    // First try to find in exportEmployees (fetched for date range)
    const fromExport = exportEmployees.find(
      (r) => r.id?.toString() === selectedEmployeeId || r.employeeId === selectedEmployeeId || r.user_id?.toString() === selectedEmployeeId
    );
    if (fromExport) return fromExport;
    // Fallback to attendanceRecords (today's data)
    return attendanceRecords.find(
      (r) => r.id === selectedEmployeeId || r.employeeId === selectedEmployeeId || r.user_id?.toString() === selectedEmployeeId
    );
  };

  // CSV Export with Basic and Grid Mode Support
  const onExportCsv = async () => {
    try {
      setIsLoading(true);

      const selectedEmployee = getSelectedEmployeeDetails();

      // Get user_id for specific employee export (moved to top scope)
      const userIdForExport = employeeFilter === "specific" && selectedEmployeeId
        ? (selectedEmployee?.user_id || undefined)
        : undefined;

      const employeeIdForExport = employeeFilter === "specific" && selectedEmployeeId
        ? (selectedEmployee?.employeeId || selectedEmployeeId)
        : undefined;

      if (exportViewMode === "basic") {
        // ========== BASIC MODE: Simple CSV Export ==========

        // Validation for Basic mode
        if (employeeFilter === "specific" && selectedEmployeeId && exportRecordsCount === 0) {
          const employeeName = selectedEmployee?.name || "Selected Employee";
          const employeeIdDisplay = selectedEmployee?.employeeId || selectedEmployeeId;
          const dateRange = exportStartDate && exportEndDate
            ? `${formatIST(exportStartDate, "dd-MM-yyyy")} to ${formatIST(exportEndDate, "dd-MM-yyyy")}`
            : "selected date range";

          Alert.alert(
            "No Records Found",
            `No attendance records found for ${employeeName} (ID: ${employeeIdDisplay}) in the ${dateRange}.\n\nPlease select a different date range or employee.`,
            [{ text: "OK" }]
          );
          return;
        }

        if (exportRecordsCount === 0) {
          Alert.alert("No Data", "No attendance records found for the selected criteria.");
          return;
        }

        // Call Basic CSV Download API
        await apiService.downloadAttendanceCSV(
          userIdForExport,
          exportStartDate ? formatIST(exportStartDate, "yyyy-MM-dd") : undefined,
          exportEndDate ? formatIST(exportEndDate, "yyyy-MM-dd") : undefined,
          (employeeFilter === "department" || employeeFilter === "specific") ? selectedDepartment || undefined : undefined,
          employeeFilter === "specific" ? (selectedEmployee?.employeeId || selectedEmployeeId) : undefined
        );

        const exportMessage = employeeFilter === "specific" && selectedEmployee
          ? `Basic CSV exported for ${selectedEmployee.name} (${selectedEmployee.employeeId})!`
          : `Basic CSV exported successfully!`;

        Alert.alert("Success", exportMessage);

      } else if (exportViewMode === "grid") {
        // ========== GRID MODE: Monthly Grid CSV Export ==========

        // Determine month and year from date range
        const month = exportStartDate ? exportStartDate.getMonth() + 1 : new Date().getMonth() + 1;
        const year = exportStartDate ? exportStartDate.getFullYear() : new Date().getFullYear();

        if (!month || !year) {
          Alert.alert("Validation Error", "Please select a date range for Grid export.");
          return;
        }

        // Call Grid CSV Download API
        await apiService.downloadMonthlyGridCSV({
          month: month.toString(),
          year: year.toString(),
          department: (employeeFilter === "department" || employeeFilter === "specific") && selectedDepartment ? selectedDepartment : undefined,
          userId: userIdForExport,
          employeeId: employeeIdForExport
        });

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        Alert.alert("Success", `Grid CSV exported for ${monthNames[month - 1]} ${year}!`);
      }

    } catch (error: any) {
      console.error("Export CSV Error:", error);
      Alert.alert("Export Failed", error.message || "Unable to download attendance report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // PDF Export with Basic and Grid Mode Support
  const onExportPdf = async () => {
    try {
      setIsLoading(true);

      const selectedEmployee = getSelectedEmployeeDetails();

      // Get user_id for specific employee export (moved to top scope)
      const userIdForExport = employeeFilter === "specific" && selectedEmployeeId
        ? (selectedEmployee?.user_id || undefined)
        : undefined;

      const employeeIdForExport = employeeFilter === "specific" && selectedEmployeeId
        ? (selectedEmployee?.employeeId || selectedEmployeeId)
        : undefined;

      if (exportViewMode === "basic") {
        // ========== BASIC MODE: Simple PDF Export ==========

        // Validation for Basic mode
        if (employeeFilter === "specific" && selectedEmployeeId && exportRecordsCount === 0) {
          const employeeName = selectedEmployee?.name || "Selected Employee";
          const employeeIdDisplay = selectedEmployee?.employeeId || selectedEmployeeId;
          const dateRange = exportStartDate && exportEndDate
            ? `${formatIST(exportStartDate, "dd-MM-yyyy")} to ${formatIST(exportEndDate, "dd-MM-yyyy")}`
            : "selected date range";

          Alert.alert(
            "No Records Found",
            `No attendance records found for ${employeeName} (ID: ${employeeIdDisplay}) in the ${dateRange}.\n\nPlease select a different date range or employee.`,
            [{ text: "OK" }]
          );
          return;
        }

        if (exportRecordsCount === 0) {
          Alert.alert("No Data", "No attendance records found for the selected criteria.");
          return;
        }

        // Call Basic PDF Download API
        await apiService.downloadAttendancePDF(
          userIdForExport,
          exportStartDate ? formatIST(exportStartDate, "yyyy-MM-dd") : undefined,
          exportEndDate ? formatIST(exportEndDate, "yyyy-MM-dd") : undefined,
          (employeeFilter === "department" || employeeFilter === "specific") ? selectedDepartment || undefined : undefined,
          employeeFilter === "specific" ? (selectedEmployee?.employeeId || selectedEmployeeId) : undefined
        );

        const exportMessage = employeeFilter === "specific" && selectedEmployee
          ? `Basic PDF exported for ${selectedEmployee.name} (${selectedEmployee.employeeId})!`
          : `Basic PDF exported successfully!`;

        Alert.alert("Success", exportMessage);

      } else if (exportViewMode === "grid") {
        // ========== GRID MODE: Monthly Grid PDF Export ==========

        // Determine month and year from date range
        const month = exportStartDate ? exportStartDate.getMonth() + 1 : new Date().getMonth() + 1;
        const year = exportStartDate ? exportStartDate.getFullYear() : new Date().getFullYear();

        if (!month || !year) {
          Alert.alert("Validation Error", "Please select a date range for Grid export.");
          return;
        }

        // Call Grid PDF Download API
        await apiService.downloadMonthlyGridPDF({
          month: month.toString(),
          year: year.toString(),
          department: (employeeFilter === "department" || employeeFilter === "specific") && selectedDepartment ? selectedDepartment : undefined,
          userId: userIdForExport,
          employeeId: employeeIdForExport
        });

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        Alert.alert("Success", `Grid PDF exported for ${monthNames[month - 1]} ${year}!`);
      }

    } catch (error: any) {
      console.error("Export PDF Error:", error);
      Alert.alert("Export Failed", error.message || "Unable to download attendance report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // State to store all unique departments (persists when filtering)
  const [allWfhDepartments, setAllWfhDepartments] = useState<string[]>([]);

  const filteredWfhRequests = () => {
    if (!user) return [];
    const role = user.role?.toLowerCase();

    // Role-based visibility rules:
    // - Admin: Can view all WFH requests across all departments
    // - HR/Manager: Can view only their department's requests (Team Leads and Employees)
    // - Team Lead/Employee: Cannot view any WFH requests

    let filtered = wfhRequests;

    // Secondary safety filter - though the API should handle this
    if (role === "admin") {
      if (wfhDeptFilter !== "all") {
        filtered = filtered.filter((r) => r.department === wfhDeptFilter);
      }
    } else if (role === "hr" || role === "manager") {
      filtered = wfhRequests.filter((r) => !user.department || r.department === user.department);
    } else {
      filtered = [];
    }

    // Secondary status filter
    if (wfhFilter !== "all") {
      const filterStatus = wfhFilter.charAt(0).toUpperCase() + wfhFilter.slice(1).toLowerCase();
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

    return filtered;
  };

  const loadWfhRequests = async () => {
    if (wfhLoading) return; // Prevent duplicate calls

    const role = user?.role?.toLowerCase();
    // Only Admin, HR, and Manager can load WFH requests
    if (role !== "hr" && role !== "manager" && role !== "admin") {
      setWfhRequests([]);
      return;
    }

    try {
      setWfhLoading(true);
      setWfhError(null); // Clear previous errors
      // Determine department filter based on role and selection
      let deptToFetch = wfhDeptFilter;
      if (role === "hr" || role === "manager") {
        deptToFetch = user?.department || "all";
      }

      console.log(`📡 Loading WFH requests for role: ${role}, dept: ${deptToFetch}, filter: ${wfhFilter}`);
      const requests = await apiService.listWfhRequests(wfhFilter, deptToFetch);

      // Log the response for debugging
      console.log(`✅ Loaded ${requests.length} WFH requests`);
      if (requests.length > 0) {
        console.log(`📋 Sample request:`, JSON.stringify(requests[0], null, 2));
      }

      setWfhRequests(requests);

      // Update the persistable department list only when fetching "all" 
      // or if we don't have any departments yet
      if (deptToFetch === "all" || allWfhDepartments.length === 0) {
        const depts = new Set<string>();
        requests.forEach((r) => {
          if (r.department) depts.add(r.department);
        });
        const sortedDepts = Array.from(depts).sort();
        if (sortedDepts.length > 0) {
          setAllWfhDepartments(sortedDepts);
        }
      }
    } catch (error: any) {
      const errorMessage = "Unable to fetch Work From Home requests. Please try again later.";
      console.warn("❌ Failed to load WFH requests:", error?.message);
      setWfhError(errorMessage);
      setWfhRequests([]);
    } finally {
      setWfhLoading(false);
    }
  };

  // Calculate pending count based on role-based visibility
  const pendingCount = filteredWfhRequests().filter(r => r.status === "Pending").length;

  const handleWfhDecision = async (id: number, status: "approved" | "rejected") => {
    // Check if user can approve/reject WFH requests
    if (!canApproveWfh) {
      Alert.alert(
        "Permission Denied",
        "You do not have permission to approve or reject WFH requests. Only Admin, HR, and Managers can approve requests."
      );
      return;
    }

    if (status === "rejected") {
      // Open rejection modal to get reason
      setRejectingRequestId(id);
      setRejectionReason("");
      setRejectModalVisible(true);
    } else {
      // For approvals, show confirmation
      Alert.alert(
        "Approve WFH Request",
        "Are you sure you want to approve this Work From Home request?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Approve",
            onPress: () => processWfhDecision(id, status, null)
          }
        ]
      );
    }
  };

  const confirmRejectWfh = () => {
    if (!rejectionReason.trim()) {
      Alert.alert("Required", "Please provide a reason for rejection.");
      return;
    }
    if (rejectionReason.trim().length < 5) {
      Alert.alert("Invalid", "Rejection reason must be at least 5 characters.");
      return;
    }
    if (rejectingRequestId) {
      setRejectModalVisible(false);
      processWfhDecision(rejectingRequestId, "rejected", rejectionReason.trim());
    }
  };

  const processWfhDecision = async (id: number, status: "approved" | "rejected", reason: string | null) => {
    try {
      setWfhLoading(true);

      // Optimistic update - update local state immediately
      // Use both wfh_id and id for matching since API may return either
      const capitalizedStatus = (status.charAt(0).toUpperCase() + status.slice(1)) as "Approved" | "Rejected";
      setWfhRequests(prev =>
        prev.map(req =>
          (req.wfh_id === id || req.id === id) ? { ...req, status: capitalizedStatus, rejection_reason: reason } : req
        )
      );

      // Make API call using approveRejectWfhRequest with rejection reason
      await apiService.approveRejectWfhRequest(id, status === "approved", reason);

      // Reload requests to ensure data is in sync
      await loadWfhRequests();

      // Show success message
      Alert.alert(
        "Success",
        `WFH request has been ${status === "approved" ? "approved" : "rejected"} successfully.`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("WFH decision error:", error);

      // Revert optimistic update on error
      await loadWfhRequests();

      Alert.alert(
        "Update Failed",
        error?.message || `Could not ${status === "approved" ? "approve" : "reject"} WFH request. Please try again.`,
        [{ text: "OK" }]
      );
    } finally {
      setWfhLoading(false);
      setRejectingRequestId(null);
      setRejectionReason("");
    }
  };

  const submitWfhRequest = async () => {
    if (!wfhReason.trim()) {
      Alert.alert("Required", "Please add a brief reason for WFH.");
      return;
    }
    if (!user?.id) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }
    const istNow = getCurrentISTTime();
    const today = formatIST(istNow, "yyyy-MM-dd");
    try {
      // New API expects start_date, end_date, wfh_type
      const saved = await apiService.submitWfhRequest(wfhReason, today, today, wfhType);
      // Mapped response might not fully match local state expectation immediately, but we reload or set basic info
      setMyWfhToday({
        ...saved,
        date: saved.start_date, // Map start_date to date for UI
        status: saved.status?.toLowerCase() // Normalize status for UI if needed
      } as any);
      setWfhReason("");
      setWfhType("Full Day");
      setWfhNotes("");
      Alert.alert("WFH Request Sent", "Waiting for approval from Admin/Manager.");
    } catch (error: any) {
      const errorMessage = error?.message || error?.detail || "Unable to submit WFH request. Please try again.";
      Alert.alert("WFH Request Failed", errorMessage);
    }
  };

  // Camera UI
  if (cameraVisible) {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar style="light" />
        <CameraView ref={cameraRef} facing="front" style={styles.camera}>
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={styles.cameraGradient}>
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraFrame}>
                <View style={[styles.cornerBorder, styles.topLeft]} />
                <View style={[styles.cornerBorder, styles.topRight]} />
                <View style={[styles.cornerBorder, styles.bottomLeft]} />
                <View style={[styles.cornerBorder, styles.bottomRight]} />
              </View>
              <Text style={styles.cameraHint}>Position your face within the frame</Text>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture} activeOpacity={0.8}>
                <LinearGradient colors={["#3b82f6", "#1e40af"]} style={styles.captureGradient}>
                  <Ionicons name="camera" size={32} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelCameraBtn} onPress={() => setCameraVisible(false)}>
                <Text style={styles.cancelCameraText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#f8fafc" }]} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#f8fafc" translucent={false} />

      {/* Header */}
      <LinearGradient colors={["#f8fafc", "#f1f5f9"]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.headerTitleSection}>
            <View style={styles.headerIconBadge}>
              <Ionicons name="finger-print" size={20} color="#3b82f6" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Attendance</Text>
              <Text style={styles.headerSubtitle}>
                {viewMode === "self" ? "Track your attendance" : user?.role === "admin" ? "View all employee records" : "Monitor team attendance"}
              </Text>
            </View>
          </View>
        </View>

        {/* Toggle for HR/Manager */}
        {(user?.role === "hr" || user?.role === "manager") && (
          <View style={styles.toggleContainer}>
            <TouchableOpacity style={[styles.toggleBtn, viewMode === "self" && styles.toggleBtnActive]} onPress={() => setViewMode("self")}>
              <Ionicons name="person-outline" size={16} color={viewMode === "self" ? "#fff" : "#6b7280"} />
              <Text style={[styles.toggleText, viewMode === "self" && styles.toggleTextActive]}>My Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, viewMode === "employee" && styles.toggleBtnActive]} onPress={() => setViewMode("employee")}>
              <Ionicons name="people-outline" size={16} color={viewMode === "employee" ? "#fff" : "#6b7280"} />
              <Text style={[styles.toggleText, viewMode === "employee" && styles.toggleTextActive]}>Team View</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Date Badge for Self View */}
        {viewMode === "self" && (
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={14} color="#3b82f6" />
            <Text style={styles.dateBadgeText}>{formatDateWithDayIST(new Date())}</Text>
          </View>
        )}

        {/* Export Button for Admin, HR, and Manager */}
        {viewMode === "employee" && (user?.role === "admin" || user?.role === "hr" || user?.role === "manager") && adminTab === "records" && (
          <TouchableOpacity style={styles.exportHeaderBtn} onPress={() => {
            // Initialize with "This Month" dates when opening modal
            const d = new Date();
            setExportStartDate(new Date(d.getFullYear(), d.getMonth(), 1));
            setExportEndDate(d);
            setSelectedQuickFilter("This Month");
            // Reset employee filter states
            setEmployeeFilter("all");
            setSelectedDepartment("");
            setSelectedEmployeeId("");
            setEmployeeSearch("");
            setExportEmployees([]);
            setExportDepartments([]);
            setAllExportRecords([]);
            setExportRecordsCount(0);
            setExportModalVisible(true);
          }}>
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={styles.exportHeaderBtnText}>Export</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>



      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={scrollEventThrottle}>
        {/* Admin Tab Toggle - Enhanced Layout */}
        {viewMode === "employee" && user?.role === "admin" && (
          <View style={styles.adminTabContainerEnhanced}>
            <TouchableOpacity
              style={[styles.adminTabEnhanced, adminTab === "records" && styles.adminTabEnhancedActive]}
              onPress={() => setAdminTab("records")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={adminTab === "records" ? ["#3b82f6", "#2563eb"] : ["#f3f4f6", "#f3f4f6"]}
                style={styles.adminTabGradient}
              >
                <Ionicons name="list-outline" size={20} color={adminTab === "records" ? "#fff" : "#3b82f6"} />
                <View style={styles.adminTabLabelContainer}>
                  <Text style={[styles.adminTabEnhancedText, adminTab === "records" && styles.adminTabEnhancedTextActive]}>Records</Text>
                  <Text style={[styles.adminTabEnhancedSubtext, adminTab === "records" && styles.adminTabEnhancedSubtextActive]}>View attendance</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.adminTabEnhanced, adminTab === "officeHours" && styles.adminTabEnhancedActive]}
              onPress={() => setAdminTab("officeHours")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={adminTab === "officeHours" ? ["#8b5cf6", "#7c3aed"] : ["#f3f4f6", "#f3f4f6"]}
                style={styles.adminTabGradient}
              >
                <Ionicons name="time-outline" size={20} color={adminTab === "officeHours" ? "#fff" : "#8b5cf6"} />
                <View style={styles.adminTabLabelContainer}>
                  <Text style={[styles.adminTabEnhancedText, adminTab === "officeHours" && styles.adminTabEnhancedTextActive]}>Office Hours</Text>
                  <Text style={[styles.adminTabEnhancedSubtext, adminTab === "officeHours" && styles.adminTabEnhancedSubtextActive]}>Manage timings</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.adminTabEnhanced, adminTab === "wfh" && styles.adminTabEnhancedActive]}
              onPress={() => setAdminTab("wfh")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={adminTab === "wfh" ? ["#10b981", "#059669"] : ["#f3f4f6", "#f3f4f6"]}
                style={styles.adminTabGradient}
              >
                <Ionicons name="home-outline" size={20} color={adminTab === "wfh" ? "#fff" : "#10b981"} />
                <View style={styles.adminTabLabelContainer}>
                  <Text style={[styles.adminTabEnhancedText, adminTab === "wfh" && styles.adminTabEnhancedTextActive]}>WFH Requests</Text>
                  <Text style={[styles.adminTabEnhancedSubtext, adminTab === "wfh" && styles.adminTabEnhancedSubtextActive]}>
                    {pendingCount > 0 ? `${pendingCount} pending` : "All requests"}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* HR/Manager WFH Tab Toggle */}
        {viewMode === "employee" && (user?.role === "hr" || user?.role === "manager") && (
          <View style={styles.adminTabContainer}>
            <TouchableOpacity style={[styles.adminTab, adminTab === "records" && styles.adminTabActive]} onPress={() => setAdminTab("records")}>
              <Ionicons name="list-outline" size={18} color={adminTab === "records" ? "#fff" : "#3b82f6"} />
              <Text style={[styles.adminTabText, adminTab === "records" && styles.adminTabTextActive]}>Team Records</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.adminTab, adminTab === "wfh" && styles.adminTabActive]} onPress={() => setAdminTab("wfh")}>
              <Ionicons name="home-outline" size={18} color={adminTab === "wfh" ? "#fff" : "#3b82f6"} />
              <Text style={[styles.adminTabText, adminTab === "wfh" && styles.adminTabTextActive]}>WFH Requests</Text>
            </TouchableOpacity>
          </View>
        )}

        {(user?.role === "hr" || user?.role === "manager" || user?.role === "admin") && viewMode === "employee" && adminTab === "wfh" ? (
          /* WFH Requests Management View - Enhanced */
          <View style={styles.wfhContainerEnhanced}>
            {/* Header Section */}
            <View style={styles.wfhHeaderEnhanced}>
              <LinearGradient colors={["#10b981", "#059669"]} style={styles.wfhHeaderGradient}>
                <View style={styles.wfhHeaderContent}>
                  <View style={styles.wfhHeaderIcon}>
                    <Ionicons name="home-outline" size={28} color="#fff" />
                  </View>
                  <View style={styles.wfhHeaderText}>
                    <Text style={styles.wfhHeaderTitle}>Work From Home Requests</Text>
                    <Text style={styles.wfhHeaderSubtitle}>
                      {user?.role?.toLowerCase() === "admin"
                        ? (wfhDeptFilter === "all" ? "All Departments" : `Department: ${wfhDeptFilter}`)
                        : (user?.department ? `Department: ${user?.department}` : "All Departments")
                      }
                    </Text>
                  </View>
                  {pendingCount > 0 && (
                    <View style={styles.wfhPendingBadge}>
                      <Text style={styles.wfhPendingBadgeText}>{pendingCount}</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </View>

            {/* Actions Section */}
            <View style={{ flex: 1 }}>
              {/* Department Filter for Admin */}
              {user?.role?.toLowerCase() === "admin" && allWfhDepartments.length > 0 && (
                <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
                  <Select
                    value={wfhDeptFilter}
                    onValueChange={(val) => setWfhDeptFilter(val)}
                    items={[{ label: "All Departments", value: "all" }, ...allWfhDepartments.map((d: string) => ({ label: d, value: d }))]}
                    placeholder="Select Department"
                    leftIcon={
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="business" size={18} color="#6b7280" />
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#6b7280" }}>Dept:</Text>
                      </View>
                    }
                    activeColor="#10b981"
                    chevronColor="#10b981"
                    style={{ height: 50, borderRadius: 12 }}
                  />
                </View>
              )}

              {/* Status Filter Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginTop: 12, marginBottom: 8 }}>
                {["all", "pending", "approved", "rejected"].map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.wfhFilterPill,
                      wfhFilter === filter && styles.wfhFilterPillActive,
                      { marginRight: 8 }
                    ]}
                    onPress={() => setWfhFilter(filter as any)}
                  >
                    <Text style={[styles.wfhFilterText, wfhFilter === filter && styles.wfhFilterTextActive]}>
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Requests List */}
              {wfhLoading ? (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={{ marginTop: 12, color: "#9ca3af" }}>Loading requests...</Text>
                </View>
              ) : wfhError ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                  <Text style={{ marginTop: 8, color: "#6b7280", textAlign: "center" }}>{wfhError}</Text>
                  <TouchableOpacity style={{ marginTop: 16 }} onPress={loadWfhRequests}>
                    <Text style={{ color: "#3b82f6", fontWeight: "600" }}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : filteredWfhRequests().length === 0 ? (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <Ionicons name="document-text-outline" size={48} color="#e5e7eb" />
                  <Text style={{ marginTop: 12, color: "#9ca3af", textAlign: "center" }}>
                    No {wfhFilter !== 'all' ? wfhFilter : ''} WFH requests found
                  </Text>
                </View>
              ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                  {filteredWfhRequests().map((request) => {
                    // Get the correct ID (wfh_id is primary, fallback to id)
                    const requestId = request.wfh_id || request.id;
                    // Get the display name (try multiple fields)
                    const displayName = request.name || request.user_name || "Unknown User";
                    // Get first letter for avatar
                    const avatarLetter = displayName.charAt(0).toUpperCase();
                    // Get employee ID for display
                    const employeeIdDisplay = request.employee_id || `ID: ${request.user_id}`;

                    return (
                      <View key={requestId} style={styles.wfhRequestCard}>
                        <View style={styles.wfhRequestHeader}>
                          <View style={styles.wfhUserAvatar}>
                            <Text style={styles.wfhUserAvatarText}>
                              {avatarLetter}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.wfhUserName}>{displayName}</Text>
                            <Text style={styles.wfhUserDept}>
                              {employeeIdDisplay} • {request.role || "Employee"} • {request.department || "N/A"}
                            </Text>
                          </View>
                          <View style={[
                            styles.wfhStatusBadge,
                            request.status?.toLowerCase() === 'approved' ? { backgroundColor: '#dcfce7' } :
                              request.status?.toLowerCase() === 'rejected' ? { backgroundColor: '#fee2e2' } :
                                { backgroundColor: '#fef3c7' }
                          ]}>
                            <Text style={[
                              styles.wfhStatusText,
                              request.status?.toLowerCase() === 'approved' ? { color: '#16a34a' } :
                                request.status?.toLowerCase() === 'rejected' ? { color: '#dc2626' } :
                                  { color: '#d97706' }
                            ]}>{request.status}</Text>
                          </View>
                        </View>

                        <View style={styles.wfhRequestDetails}>
                          <View style={styles.wfhDetailRow}>
                            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                            <Text style={styles.wfhDetailText}>
                              {formatDateIST(request.start_date)}
                              {request.start_date !== request.end_date ? ` - ${formatDateIST(request.end_date)}` : ''}
                            </Text>
                          </View>
                          <View style={styles.wfhDetailRow}>
                            <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                            <Text style={styles.wfhDetailText} numberOfLines={2}>
                              {request.reason}
                            </Text>
                          </View>
                        </View>

                        {/* Action Buttons for Pending Requests */}
                        {request.status?.toLowerCase() === 'pending' && requestId && (
                          <View style={styles.wfhActionButtons}>
                            <TouchableOpacity
                              style={[
                                styles.wfhBtn,
                                styles.wfhBtnReject,
                                wfhLoading && { opacity: 0.5 }
                              ]}
                              onPress={() => handleWfhDecision(requestId, "rejected")}
                              disabled={wfhLoading}
                            >
                              {wfhLoading ? (
                                <ActivityIndicator size="small" color="#dc2626" />
                              ) : (
                                <Ionicons name="close" size={18} color="#dc2626" />
                              )}
                              <Text style={styles.wfhBtnTextReject}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.wfhBtn,
                                styles.wfhBtnApprove,
                                wfhLoading && { opacity: 0.5 }
                              ]}
                              onPress={() => handleWfhDecision(requestId, "approved")}
                              disabled={wfhLoading}
                            >
                              {wfhLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Ionicons name="checkmark" size={18} color="#fff" />
                              )}
                              <Text style={styles.wfhBtnTextApprove}>Approve</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        ) : user?.role === "admin" && adminTab === "officeHours" ? (
          <OfficeHoursScreen />
        ) : viewMode === "self" ? (
          /* Self Attendance View (HR / Manager) */
          <>
            {/* Work Mode Switcher */}
            <View style={styles.workModeSwitcher}>
              <TouchableOpacity
                style={[
                  styles.workModeBtn,
                  workMode === "office" && styles.workModeBtnActive,
                ]}
                onPress={() => setWorkMode("office")}
                activeOpacity={0.85}
              >
                <Ionicons name="business-outline" size={16} color={workMode === "office" ? "#1e3a8a" : "#64748b"} />
                <Text style={[styles.workModeText, workMode === "office" && styles.workModeTextActive]}>Office</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.workModeBtn, workMode === "wfh" && styles.workModeBtnActive]}
                onPress={() => setWorkMode("wfh")}
                activeOpacity={0.85}
              >
                <Ionicons name="home-outline" size={16} color={workMode === "wfh" ? "#1e3a8a" : "#64748b"} />
                <Text style={[styles.workModeText, workMode === "wfh" && styles.workModeTextActive]}>WFH</Text>
              </TouchableOpacity>
            </View>

            {/* WFH View */}
            {workMode === "wfh" && (
              <>
                {/* Show Request Form if not requested or pending/rejected needs a way to view status clearly */}
                {(!myWfhToday || myWfhToday.status === "not_requested") ? (
                  /* WFH Dashboard (Status + Checkin) */
                  <>
                    <View style={styles.wfhCard}>
                      <View style={styles.wfhHeaderLeft}>
                        <View style={styles.wfhIconWrap}>
                          <Ionicons name="home-outline" size={24} color="#1e3a8a" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.wfhTitle}>Work From Home</Text>
                          <Text style={styles.wfhSubtitle}>Apply for WFH or view your history.</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <TouchableOpacity
                          style={[styles.wfhActionBtn, { backgroundColor: "#2563eb", flex: 1 }]}
                          onPress={() => navigation.navigate("WfhApply")}
                        >
                          <Ionicons name="add-circle-outline" size={18} color="#fff" />
                          <Text style={styles.wfhActionText}>Apply New</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.wfhActionBtn, { backgroundColor: "#f1f5f9", flex: 1 }]}
                          onPress={() => navigation.navigate("WfhHistory")}
                        >
                          <Ionicons name="document-text-outline" size={18} color="#475569" />
                          <Text style={[styles.wfhActionText, { color: "#475569" }]}>View WFH Request History</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                ) : (
                  /* WFH Dashboard (Status + Checkin) */
                  <>
                    {/* Status Banner */}
                    <View style={styles.wfhStatusBanner}>
                      <LinearGradient
                        colors={
                          myWfhToday.status === 'approved' ? ["#7c3aed", "#6d28d9"] :
                            myWfhToday.status === 'rejected' ? ["#ef4444", "#dc2626"] :
                              ["#d97706", "#b45309"]
                        }
                        style={styles.wfhStatusContent}
                      >
                        <View style={styles.wfhTopRow}>
                          <View style={styles.wfhIconBadge}>
                            <Ionicons name={myWfhToday.status === 'approved' ? "home" : myWfhToday.status === 'rejected' ? "close-circle" : "time"} size={24} color="#fff" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.wfhBannerTitle}>
                              {myWfhToday.status === 'approved' ? "Work From Home" : myWfhToday.status === 'rejected' ? "Request Rejected" : "Request Pending"}
                            </Text>
                            <Text style={styles.wfhBannerDate}>{formatDateIST(myWfhToday?.date)}</Text>
                          </View>
                          <View style={styles.wfhStatusTag}>
                            <Text style={styles.wfhStatusTagText}>{myWfhToday?.status.toUpperCase()}</Text>
                          </View>
                        </View>
                        <Text style={styles.wfhBannerReason} numberOfLines={2}>
                          {myWfhToday?.reason || "Remote work request"}
                        </Text>
                      </LinearGradient>
                    </View>

                    {myWfhToday.status === 'approved' && (
                      <>
                        {/* Location Card */}
                        <TouchableOpacity style={styles.locationCard} onPress={refreshLocation} activeOpacity={0.8} disabled={isFetchingLocation}>
                          <LinearGradient colors={["#f5f3ff", "#ede9fe"]} style={styles.locationGradient}>
                            <View style={styles.locationHeader}>
                              <View style={[styles.locationIconBg, { backgroundColor: "#ddd6fe" }]}>
                                <Ionicons name="location" size={20} color="#7c3aed" />
                              </View>
                              <Text style={styles.locationTitle}>Remote Location</Text>
                              {isFetchingLocation && <ActivityIndicator size="small" color="#7c3aed" />}
                            </View>
                            <Text style={styles.locationAddress}>{locationAddress || "Tap to detect location..."}</Text>
                          </LinearGradient>
                        </TouchableOpacity>

                        {/* Check-In/Out Actions for WFH */}
                        <View style={styles.actionContainer}>
                          {!currentAttendance?.checkInTime ? (
                            <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
                              <TouchableOpacity onPress={() => openCamera(true)} activeOpacity={0.9} style={{ width: '100%' }}>
                                <LinearGradient
                                  colors={["#8b5cf6", "#7c3aed"]}
                                  style={[styles.actionBtn, { width: '100%', borderRadius: 16 }]}
                                >
                                  <Ionicons name="home" size={26} color="#fff" />
                                  <Text style={styles.actionBtnText}>Check In (WFH)</Text>
                                </LinearGradient>
                              </TouchableOpacity>
                            </Animated.View>
                          ) : !currentAttendance?.checkOutTime ? (
                            <TouchableOpacity onPress={() => setShowCheckoutModal(true)} activeOpacity={0.9} style={{ width: '100%' }}>
                              <LinearGradient colors={["#ef4444", "#dc2626"]} style={[styles.actionBtn, { width: '100%', borderRadius: 16 }]}>
                                <Ionicons name="home-outline" size={26} color="#fff" />
                                <Text style={styles.actionBtnText}>Check Out (WFH)</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          ) : (
                            <View style={[styles.completedBadge, { backgroundColor: '#f3e8ff', width: '100%' }]}>
                              <Ionicons name="checkmark-circle" size={22} color="#7c3aed" />
                              <Text style={[styles.completedText, { color: '#7c3aed' }]}>WFH Attendance Completed</Text>
                            </View>
                          )}
                        </View>

                        {/* Photos Display (WFH Self) */}
                        {(currentAttendance?.selfie || currentAttendance?.checkOutSelfie) && (
                          <View style={{ marginTop: 16, backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Today's Photos</Text>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                              <View style={{ flex: 1, height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' }}>
                                {isValidImageUri(currentAttendance?.selfie) ? (
                                  <>
                                    <Image source={{ uri: currentAttendance!.selfie! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(22, 163, 74, 0.8)', paddingVertical: 2, alignItems: 'center' }}>
                                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>IN</Text>
                                    </View>
                                  </>
                                ) : (
                                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="camera-outline" size={20} color="#cbd5e1" />
                                    <Text style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>Check-in</Text>
                                  </View>
                                )}
                              </View>
                              <View style={{ flex: 1, height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' }}>
                                {isValidImageUri(currentAttendance?.checkOutSelfie) ? (
                                  <>
                                    <Image source={{ uri: currentAttendance!.checkOutSelfie! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(220, 38, 38, 0.8)', paddingVertical: 2, alignItems: 'center' }}>
                                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>OUT</Text>
                                    </View>
                                  </>
                                ) : (
                                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="camera-outline" size={20} color="#cbd5e1" />
                                    <Text style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>Check-out</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        )}
                      </>
                    )}

                    {/* WFH Request History */}
                    <TouchableOpacity
                      style={styles.sectionHeader}
                      onPress={() => navigation.navigate("WfhHistory")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.sectionTitle}>WFH Request History</Text>
                      <Ionicons name="chevron-forward" size={20} color="#1e293b" />
                    </TouchableOpacity>
                    {selfAttendanceHistory.filter(r => r.workLocation === "Work From Home").slice(0, 5).map((item) => (
                      <View key={item.id} style={styles.historyCard}>
                        <View style={[styles.historyDateBadge, { backgroundColor: '#f5f3ff' }]}>
                          <Text style={[styles.historyDay, { color: '#7c3aed' }]}>{formatDateIST(item.date).split('-')[0]}</Text>
                          <Text style={[styles.historyMonth, { color: '#8b5cf6' }]}>{getDayMonthIST(item.date).split(' ')[1]}</Text>
                        </View>
                        <View style={styles.historyInfo}>
                          <Text style={styles.historyDayName}>{getDayOfWeek(item.date)}</Text>
                          <View style={styles.historyTimeRow}>
                            <Text style={styles.historyTimeText}>{item.checkInTime || "-"}</Text>
                            <Text style={styles.historyTimeText}> - </Text>
                            <Text style={styles.historyTimeText}>{item.checkOutTime || "-"}</Text>
                            {(item.totalOnlineMinutes !== undefined && item.totalOnlineMinutes > 0) && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10, backgroundColor: '#f5f3ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Ionicons name="time-outline" size={10} color="#7c3aed" />
                                <Text style={{ fontSize: 10, color: '#7c3aed', fontWeight: '700', marginLeft: 2 }}>{formatMinutesToDuration(item.totalOnlineMinutes)}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}

            {/* Office View */}
            {workMode === "office" && (
              <>
                {/* 1. Online/Offline Status Toggle (Only for WFO) */}
                {user?.id && (
                  <View style={{ marginBottom: 20 }}>
                    <OnlineStatusToggle
                      userId={parseInt(user.id)}
                      attendanceId={currentAttendance?.id ? parseInt(currentAttendance.id) : null}
                      isCheckedIn={!!currentAttendance?.checkInTime}
                      isCheckedOut={!!currentAttendance?.checkOutTime}
                      onStatusChange={(isOnline, summary) => {
                        console.log(`Status changed to ${isOnline ? 'Online' : 'Offline'}`, summary);
                        if (summary && currentAttendance) {
                          setCurrentAttendance(prev => prev ? ({
                            ...prev,
                            totalOnlineMinutes: summary.total_online_minutes ?? (prev as any).totalOnlineMinutes,
                            effectiveWorkHours: summary.effective_work_hours ?? (prev as any).effectiveWorkHours,
                          }) : null);
                        }
                      }}
                    />
                  </View>
                )}

                {/* 2. Today's Status Card (WFO - Premium) */}
                <View style={[styles.statusCard, { elevation: 4, shadowColor: "#3b82f6", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937' }}>Today's Status</Text>
                  </View>

                  <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: "#f0fdf4", alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 6 }}>
                      <Ionicons name="business" size={14} color="#15803d" />
                      <Text style={{ color: "#15803d", fontWeight: "700", fontSize: 12 }}>{currentAttendance?.workLocation || "Work From Office"}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', padding: 16, paddingTop: 10, gap: 12 }}>
                    {/* Check In Block */}
                    <View style={{ flex: 1, backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dcfce7' }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                        <Ionicons name="log-in" size={20} color="#16a34a" />
                      </View>
                      <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 4 }}>Check-in</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#1f2937' }}>
                        {currentAttendance?.checkInTime || "--:--"}
                      </Text>
                    </View>

                    {/* Check Out Block */}
                    <View style={{ flex: 1, backgroundColor: '#fef2f2', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fee2e2' }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                        <Ionicons name="log-out" size={20} color="#dc2626" />
                      </View>
                      <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 4 }}>Check-out</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: currentAttendance?.checkOutTime ? '#1f2937' : '#9ca3af', fontStyle: currentAttendance?.checkOutTime ? 'normal' : 'italic' }}>
                        {currentAttendance?.checkOutTime || "Pending"}
                      </Text>
                    </View>

                    {/* Total Work Time Block */}
                    <View style={{ flex: 1.2, backgroundColor: '#eff6ff', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe' }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                        <Ionicons name="time" size={20} color="#2563eb" />
                      </View>
                      <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 4 }}>Work Time</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#1e40af' }}>
                        {formatMinutesToDuration(currentAttendance?.totalOnlineMinutes)}
                      </Text>
                    </View>
                  </View>

                  {/* 3. Photos Display (Self) */}
                  {(currentAttendance?.selfie || currentAttendance?.checkOutSelfie) && (
                    <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Today's Photos</Text>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        {/* Check-in Photo */}
                        <View style={{ flex: 1, height: 120, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' }}>
                          {isValidImageUri(currentAttendance?.selfie) ? (
                            <>
                              <Image source={{ uri: currentAttendance!.selfie! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(22, 163, 74, 0.8)', paddingVertical: 2, alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>IN</Text>
                              </View>
                            </>
                          ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name="camera-outline" size={24} color="#cbd5e1" />
                              <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Check-in</Text>
                            </View>
                          )}
                        </View>

                        {/* Check-out Photo */}
                        <View style={{ flex: 1, height: 120, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' }}>
                          {isValidImageUri(currentAttendance?.checkOutSelfie) ? (
                            <>
                              <Image source={{ uri: currentAttendance!.checkOutSelfie! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(220, 38, 38, 0.8)', paddingVertical: 2, alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>OUT</Text>
                              </View>
                            </>
                          ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name="camera-outline" size={24} color="#cbd5e1" />
                              <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Check-out</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* 3. Action Button (WFO) */}
                <View style={styles.actionContainer}>
                  {!currentAttendance?.checkInTime ? (
                    <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
                      <TouchableOpacity onPress={() => openCamera(true)} activeOpacity={0.9} style={{ width: '100%' }}>
                        <LinearGradient
                          colors={["#3b82f6", "#2563eb"]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={[styles.actionBtn, { width: '100%', height: 60, borderRadius: 20, elevation: 6, shadowColor: "#2563eb", shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }]}
                        >
                          <Ionicons name="finger-print" size={28} color="#fff" />
                          <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>Check In</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>
                  ) : !currentAttendance?.checkOutTime ? (
                    <TouchableOpacity onPress={() => setShowCheckoutModal(true)} activeOpacity={0.9} style={{ width: '100%' }}>
                      <LinearGradient
                        colors={["#ef4444", "#dc2626"]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={[styles.actionBtn, { width: '100%', height: 60, borderRadius: 20, elevation: 6, shadowColor: "#dc2626", shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }]}
                      >
                        <Ionicons name="exit-outline" size={28} color="#fff" />
                        <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>Check Out</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.completedBadge, { backgroundColor: "#f0fdf4", paddingVertical: 16, width: '100%', justifyContent: 'center' }]}>
                      <Ionicons name="checkmark-circle" size={26} color="#16a34a" />
                      <Text style={[styles.completedText, { fontSize: 16 }]}>Attendance Completed</Text>
                    </View>
                  )}
                </View>

                {/* 5. Recent History (WFO Filtered) */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Attendance History</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    {selfAttendanceHistory.filter(r => r.workLocation !== "Work From Home").length} records
                  </Text>
                </View>

                {selfAttendanceHistory.filter(r => r.workLocation !== "Work From Home").length > 0 ? (
                  selfAttendanceHistory.filter(r => r.workLocation !== "Work From Home").slice(0, 7).map((item, index) => (
                    <View key={`${item.id || index}-${index}`} style={styles.historyCard}>
                      <View style={[styles.historyDateBadge, { backgroundColor: '#f3f4f6' }]}>
                        <Text style={[styles.historyDay, { color: '#1f2937' }]}>{formatDateIST(item.date).split('-')[0]}</Text>
                        <Text style={[styles.historyMonth, { color: '#6b7280' }]}>{getDayMonthIST(item.date).split(' ')[1]}</Text>
                      </View>
                      <View style={styles.historyInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                            {item.checkInTime || "--:--"}
                          </Text>
                          <View style={{ width: 12, height: 1, backgroundColor: '#d1d5db' }} />
                          <Text style={{ fontSize: 14, color: '#6b7280' }}>
                            {item.checkOutTime || "Pending"}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="location-outline" size={12} color="#9ca3af" style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 11, color: '#6b7280' }}>{item.workLocation || "Work From Office"}</Text>
                          </View>
                          {(item.totalOnlineMinutes !== undefined && item.totalOnlineMinutes > 0) && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="time-outline" size={12} color="#3b82f6" style={{ marginRight: 4 }} />
                              <Text style={{ fontSize: 11, color: '#3b82f6', fontWeight: '600' }}>{formatMinutesToDuration(item.totalOnlineMinutes)}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.status === "late" ? "#ef4444" : "#f59e0b" }} />
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyText}>No office attendance records yet</Text>
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          /* Employee View */
          <>
            {/* Search & Filters */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#3b82f6" />
                <TextInput placeholder="Search employees..." placeholderTextColor="#9ca3af" value={searchTerm} onChangeText={setSearchTerm} style={styles.searchInput} />
                {searchTerm.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchTerm("")}>
                    <Ionicons name="close-circle" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.filterRow}>
                <TouchableOpacity style={styles.filterPill} onPress={() => setRoleSheetVisible(true)}>
                  <Ionicons name="funnel-outline" size={14} color="#3b82f6" />
                  <Text style={styles.filterPillText}>{filterStatus}</Text>
                  <Ionicons name="chevron-down" size={14} color="#3b82f6" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.filterPill} onPress={() => setDatePickerVisible(true)}>
                  <Ionicons name="calendar-outline" size={14} color="#3b82f6" />
                  <Text style={styles.filterPillText}>{getDayMonthIST(selectedDate)}</Text>
                </TouchableOpacity>

                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{filteredRecords.length} records</Text>
                </View>
              </View>
            </View>

            {/* Employee Cards */}
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record, index) => {
                return (
                  <AttendanceRecordCard
                    key={`${record.id || index}-${index}`}
                    record={record}
                    onPhotoPress={(rec) => {
                      setSelectedRecord(rec);
                      setShowSelfieModal(true);
                    }}
                    onCardPress={(rec) => {
                      console.log("Card pressed:", rec);
                    }}
                  />
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No attendance records for {formatDateIST(selectedDate)}</Text>
              </View>
            )}

          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>


      {/* Date Picker */}
      {datePickerVisible && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event: any, date?: Date) => {
            setDatePickerVisible(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* Role Filter Modal */}
      <Modal visible={roleSheetVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.roleModal}>
            <Text style={styles.roleModalTitle}>Select Role</Text>
            {(user?.role?.toLowerCase() === "admin" ? ["All Roles", "HR", "Manager"] : ["All Roles", "Team Lead", "Employee"]).map((r) => (
              <TouchableOpacity key={r} style={[styles.roleOption, filterStatus === r && styles.roleOptionActive]} onPress={() => { setFilterStatus(r); setRoleSheetVisible(false); }}>
                <Text style={[styles.roleOptionText, filterStatus === r && styles.roleOptionTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.roleCloseBtn} onPress={() => setRoleSheetVisible(false)}>
              <Text style={styles.roleCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Checkout Modal */}
      <Modal visible={showCheckoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.checkoutModal}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { setShowCheckoutModal(false); setWorkReportFile(null); }}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>

            <View style={styles.checkoutHeader}>
              <View style={styles.checkoutIconBg}>
                <Ionicons name="exit-outline" size={32} color="#ef4444" />
              </View>
              <Text style={styles.checkoutTitle}>Ready to Check Out?</Text>
              <Text style={styles.checkoutSubtitle}>Add a quick summary of your work today</Text>
            </View>

            <TextInput placeholder="What did you accomplish today?" value={todaysWork} onChangeText={setTodaysWork} style={styles.checkoutInput} multiline numberOfLines={4} placeholderTextColor="#9ca3af" />

            <TouchableOpacity style={styles.filePickerBtn} onPress={pickWorkReportFile}>
              <Ionicons name="attach-outline" size={20} color="#3b82f6" />
              <Text style={styles.filePickerText}>{workReportFile ? workReportFile.name : "Attach file (PDF, Image, Doc...)"}</Text>
            </TouchableOpacity>

            {workReportFile && (
              <View style={styles.selectedFile}>
                <Ionicons
                  name={
                    workReportFile.type?.includes("image") ? "image" :
                      workReportFile.type?.includes("pdf") ? "document" :
                        "attach"
                  }
                  size={18}
                  color="#16a34a"
                />
                <Text style={styles.selectedFileName} numberOfLines={1}>{workReportFile.name}</Text>
                <TouchableOpacity onPress={() => setWorkReportFile(null)}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.checkoutActions}>
              <TouchableOpacity style={styles.checkoutCancelBtn} onPress={() => { setShowCheckoutModal(false); setWorkReportFile(null); }}>
                <Text style={styles.checkoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.checkoutConfirmBtn, !todaysWork.trim() && styles.checkoutConfirmDisabled]} onPress={confirmCheckOut} disabled={!todaysWork.trim()}>
                <LinearGradient colors={todaysWork.trim() ? ["#ef4444", "#dc2626"] : ["#fca5a5", "#fca5a5"]} style={styles.checkoutConfirmGradient}>
                  <Text style={styles.checkoutConfirmText}>Check Out</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* WFH Rejection Reason Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModal}>
            <View style={styles.rejectModalHeader}>
              <View style={styles.rejectModalIconBg}>
                <Ionicons name="close-circle" size={32} color="#ef4444" />
              </View>
              <Text style={styles.rejectModalTitle}>Reject WFH Request</Text>
              <Text style={styles.rejectModalSubtitle}>Please provide a reason for rejection</Text>
            </View>

            <TextInput
              style={styles.rejectModalInput}
              placeholder="Enter rejection reason (required)..."
              placeholderTextColor="#9ca3af"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.rejectModalCharCount}>
              {rejectionReason.length} characters (min 5 required)
            </Text>

            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={styles.rejectModalCancelBtn}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectingRequestId(null);
                  setRejectionReason("");
                }}
              >
                <Text style={styles.rejectModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.rejectModalConfirmBtn,
                  rejectionReason.trim().length < 5 && styles.rejectModalConfirmDisabled
                ]}
                onPress={confirmRejectWfh}
                disabled={rejectionReason.trim().length < 5 || wfhLoading}
              >
                {wfhLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="close" size={18} color="#fff" />
                    <Text style={styles.rejectModalConfirmText}>Reject Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Selfie Modal */}
      <Modal visible={showSelfieModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.selfieModal}>
            <TouchableOpacity style={styles.selfieCloseBtn} onPress={() => setShowSelfieModal(false)}>
              <Ionicons name="close-circle" size={32} color="#fff" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.selfieHeader}>
                <View style={styles.selfieHeaderIcon}>
                  <Ionicons name="camera" size={24} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.selfieTitle}>{selectedRecord?.name}'s Photos</Text>
                  <Text style={styles.selfieDate}>{selectedRecord?.date ? formatDateIST(selectedRecord.date) : ""}</Text>
                </View>
              </View>

              <View style={styles.selfieInfoCard}>
                <View style={styles.selfieInfoRow}>
                  <Ionicons name="id-card-outline" size={16} color="#3b82f6" />
                  <Text style={styles.selfieInfoText}>{selectedRecord?.employeeId}</Text>
                </View>
                <View style={styles.selfieInfoRow}>
                  <Ionicons name="briefcase-outline" size={16} color="#8b5cf6" />
                  <Text style={styles.selfieInfoText}>{selectedRecord?.department}</Text>
                </View>
                <View style={styles.selfieInfoRow}>
                  <Ionicons name="person-outline" size={16} color="#10b981" />
                  <Text style={styles.selfieInfoText}>{selectedRecord?.role}</Text>
                </View>
                <View style={styles.selfieInfoRow}>
                  <Ionicons name="time-outline" size={16} color="#6b7280" />
                  <Text style={styles.selfieInfoText}>{selectedRecord?.check_in} - {selectedRecord?.check_out || "In Progress"}</Text>
                </View>
                <View style={styles.selfieInfoRow}>
                  <Ionicons name="hourglass-outline" size={16} color="#f59e0b" />
                  <Text style={styles.selfieInfoText}>{selectedRecord?.hours}h worked</Text>
                </View>
                {selectedRecord?.location && selectedRecord.location !== "N/A" && selectedRecord.location !== "Location not available" && (
                  <View style={styles.selfieInfoRow}>
                    <Ionicons name="location-outline" size={16} color="#ef4444" />
                    <Text style={styles.selfieInfoText} numberOfLines={2}>{selectedRecord?.location}</Text>
                  </View>
                )}
                {selectedRecord?.workSummary && (
                  <View style={styles.selfieInfoRow}>
                    <Ionicons name="document-text-outline" size={16} color="#3b82f6" />
                    <Text style={styles.selfieInfoText} numberOfLines={3}>{selectedRecord?.workSummary}</Text>
                  </View>
                )}
              </View>

              <View style={styles.selfieSection}>
                <View style={styles.selfieSectionHeader}>
                  <Ionicons name="log-in" size={20} color="#16a34a" />
                  <Text style={styles.selfieSectionTitle}>Check-in Photo</Text>
                  <Text style={styles.selfieSectionTime}>{selectedRecord?.check_in}</Text>
                </View>
                {isValidImageUri(selectedRecord?.selfie) ? (
                  <Image source={{ uri: selectedRecord!.selfie }} style={styles.selfieImage} resizeMode="contain" onError={() => { }} />
                ) : (
                  <View style={styles.selfieEmpty}>
                    <Ionicons name="camera-outline" size={48} color="#9ca3af" />
                    <Text style={styles.selfieEmptyText}>No Check-in Photo</Text>
                  </View>
                )}
              </View>

              <View style={styles.selfieSection}>
                <View style={styles.selfieSectionHeader}>
                  <Ionicons name="log-out" size={20} color="#ef4444" />
                  <Text style={styles.selfieSectionTitle}>Check-out Photo</Text>
                  <Text style={styles.selfieSectionTime}>{selectedRecord?.check_out || "Not yet"}</Text>
                </View>
                {isValidImageUri(selectedRecord?.checkOutSelfie) ? (
                  <Image source={{ uri: selectedRecord!.checkOutSelfie! }} style={styles.selfieImage} resizeMode="contain" onError={() => { }} />
                ) : (
                  <View style={styles.selfieEmpty}>
                    <Ionicons name="camera-outline" size={48} color="#9ca3af" />
                    <Text style={styles.selfieEmptyText}>{selectedRecord?.check_out ? "No Check-out Photo" : "Not checked out yet"}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Export Modal - Enhanced Premium Design */}
      <Modal visible={exportModalVisible} transparent animationType="slide">
        <View style={styles.exportModalOverlay}>
          <View style={styles.exportModal}>
            {/* Compact Gradient Header */}
            <View style={styles.exportModalHeaderContainer}>
              <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.exportModalHeaderGradient}>
                <View style={styles.exportModalHeaderContent}>
                  <Text style={styles.exportModalTitle}>Export Attendance Report</Text>
                  <TouchableOpacity
                    style={styles.exportModalCloseBtn}
                    onPress={() => setExportModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            <ScrollView
              style={styles.exportModalContent}
              contentContainerStyle={styles.exportModalContentContainer}
              showsVerticalScrollIndicator={false}
            >

              {/* View Mode Toggle */}
              <View style={styles.viewModeContainer}>
                <TouchableOpacity
                  style={[styles.viewModeBtn, exportViewMode === "basic" && styles.viewModeBtnActive]}
                  onPress={() => setExportViewMode("basic")}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="list"
                    size={18}
                    color={exportViewMode === "basic" ? "#fff" : "#6b7280"}
                  />
                  <Text style={[styles.viewModeBtnText, exportViewMode === "basic" && styles.viewModeBtnTextActive]}>
                    Basic
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewModeBtn, exportViewMode === "grid" && styles.viewModeBtnActive]}
                  onPress={() => setExportViewMode("grid")}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="grid"
                    size={18}
                    color={exportViewMode === "grid" ? "#fff" : "#6b7280"}
                  />
                  <Text style={[styles.viewModeBtnText, exportViewMode === "grid" && styles.viewModeBtnTextActive]}>
                    Grid
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Format Selection - Enhanced Card Style */}
              <View style={styles.exportSection}>
                <View style={styles.exportSectionHeader}>
                  <Ionicons name="document" size={18} color="#3b82f6" />
                  <Text style={styles.exportSectionTitle}>Export Format</Text>
                </View>
                <View style={styles.formatSelectionRow}>
                  <TouchableOpacity
                    style={[styles.formatOption, exportFormat === "csv" && styles.formatOptionActive]}
                    onPress={() => setExportFormat("csv")}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.formatIconContainer, exportFormat === "csv" && styles.formatIconContainerActive]}>
                      <Ionicons name="document-outline" size={32} color={exportFormat === "csv" ? "#3b82f6" : "#6b7280"} />
                    </View>
                    <Text style={[styles.formatOptionTitle, exportFormat === "csv" && styles.formatOptionTitleActive]}>CSV</Text>
                    <Text style={styles.formatOptionSubtitle}>Excel compatible</Text>
                    {exportFormat === "csv" && (
                      <View style={styles.formatSelectedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.formatOption, exportFormat === "pdf" && styles.formatOptionActive]}
                    onPress={() => setExportFormat("pdf")}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.formatIconContainer, exportFormat === "pdf" && styles.formatIconContainerActive]}>
                      <Ionicons name="document-text-outline" size={32} color={exportFormat === "pdf" ? "#3b82f6" : "#6b7280"} />
                    </View>
                    <Text style={[styles.formatOptionTitle, exportFormat === "pdf" && styles.formatOptionTitleActive]}>PDF</Text>
                    <Text style={styles.formatOptionSubtitle}>Print ready</Text>
                    {exportFormat === "pdf" && (
                      <View style={styles.formatSelectedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date Range Selection */}
              <View style={styles.exportSection}>
                <View style={styles.exportSectionHeader}>
                  <Ionicons name="calendar" size={18} color="#8b5cf6" />
                  <Text style={styles.exportSectionTitle}>Date Range</Text>
                </View>

                {/* Quick Filter Select */}
                <Select
                  placeholder="Select range"
                  items={quickFilterOptions.map(opt => ({ label: opt, value: opt }))}
                  value={selectedQuickFilter}
                  onValueChange={(val) => {
                    setSelectedQuickFilter(val);
                    const d = new Date();
                    if (val === "This Month") {
                      setExportStartDate(new Date(d.getFullYear(), d.getMonth(), 1));
                      setExportEndDate(d);
                    }
                    else if (val === "Last 3 Months") {
                      const start = new Date(d.getFullYear(), d.getMonth() - 2, 1);
                      setExportStartDate(start);
                      setExportEndDate(d);
                    }
                    else if (val === "Last 6 Months") {
                      const start = new Date(d.getFullYear(), d.getMonth() - 5, 1);
                      setExportStartDate(start);
                      setExportEndDate(d);
                    }
                    else if (val === "Custom Date Range") {
                      if (!exportStartDate) setExportStartDate(null);
                      if (!exportEndDate) setExportEndDate(d);
                    }
                  }}
                  label="Quick Filter"
                  containerStyle={{ marginBottom: 16 }}
                />

                {/* Date Input Fields */}
                {selectedQuickFilter === "Custom Date Range" && (
                  <View style={styles.dateRangeRowEnhanced}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exportLabelEnhanced}>Start Date</Text>
                      <DatePicker
                        date={exportStartDate || undefined}
                        onDateChange={(date) => date && setExportStartDate(date)}
                        placeholder="Start Date"
                      />
                    </View>
                    <View style={styles.dateArrowContainer}>
                      <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exportLabelEnhanced}>End Date</Text>
                      <DatePicker
                        date={exportEndDate || undefined}
                        onDateChange={(date) => date && setExportEndDate(date)}
                        placeholder="End Date"
                      />
                    </View>
                  </View>
                )}

                {/* Date Range Summary */}
                {exportStartDate && exportEndDate && (
                  <View style={styles.dateRangeSummaryBoxEnhanced}>
                    <LinearGradient colors={["#eff6ff", "#dbeafe"]} style={styles.dateRangeSummaryGradient}>
                      <Ionicons name="calendar" size={18} color="#2563eb" />
                      <Text style={styles.dateRangeSummaryTextEnhanced}>
                        {formatDateIST(exportStartDate)} - {formatDateIST(exportEndDate)}
                      </Text>
                    </LinearGradient>
                  </View>
                )}
              </View>

              {/* Employee Filter */}
              <View style={styles.exportSection}>
                <View style={styles.exportSectionHeader}>
                  <Ionicons name="people" size={18} color="#10b981" />
                  <Text style={styles.exportSectionTitle}>Employee Filter</Text>
                </View>

                {/* Filter Type Select */}
                <Select
                  label="Filter By"
                  items={[
                    { label: "All Employees", value: "all" },
                    { label: "By Department", value: "department" },
                    { label: "Specific Employee", value: "specific" },
                  ]}
                  value={employeeFilter}
                  onValueChange={(value) => {
                    setEmployeeFilter(value as any);
                    if (value === "all") {
                      setSelectedEmployeeId("");
                      setSelectedDepartment("");
                      setEmployeeSearch("");
                    } else if (value === "department") {
                      setSelectedEmployeeId("");
                    }
                  }}
                  placeholder="Select filter type"
                  containerStyle={{ marginBottom: 16 }}
                  activeColor="#10b981"
                  chevronColor="#10b981"
                />

                {(employeeFilter === "specific" || employeeFilter === "department") && (
                  <View style={styles.specificEmployeeContainer}>
                    {/* Department Select */}
                    <Select
                      label="Department"
                      items={[
                        { label: "Select Department", value: "" },
                        ...exportDepartments.map(dept => ({ label: dept, value: dept }))
                      ]}
                      value={selectedDepartment}
                      onValueChange={(value) => {
                        setSelectedDepartment(value);
                        if (employeeFilter === "specific") {
                          setSelectedEmployeeId("");
                          setEmployeeSearch("");
                        }
                      }}
                      placeholder="Select Department"
                      containerStyle={{ marginBottom: 16 }}
                      activeColor="#8b5cf6"
                      chevronColor="#8b5cf6"
                    />

                    {selectedDepartment && (
                      <View style={styles.selectedDeptChip}>
                        <Ionicons name="business" size={16} color="#8b5cf6" />
                        <Text style={styles.selectedDeptChipText}>{selectedDepartment}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedDepartment("");
                            setSelectedEmployeeId("");
                            setEmployeeSearch("");
                          }}
                          style={styles.chipRemoveBtn}
                        >
                          <Ionicons name="close-circle" size={18} color="#8b5cf6" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {selectedDepartment && employeeFilter === "specific" && (
                      <View style={styles.selectionCard}>
                        <View style={styles.selectionCardHeader}>
                          <Ionicons name="person" size={16} color="#10b981" />
                          <Text style={styles.selectionCardTitle}>Select Employee</Text>
                          {selectedEmployeeId && (
                            <View style={styles.selectedBadge}>
                              <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                              <Text style={styles.selectedBadgeText}>Selected</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.employeeSearchContainerEnhanced}>
                          <Ionicons name="search" size={20} color="#9ca3af" />
                          <TextInput
                            placeholder="Search by name or employee ID..."
                            placeholderTextColor="#9ca3af"
                            value={employeeSearch}
                            onChangeText={setEmployeeSearch}
                            style={styles.employeeSearchInputEnhanced}
                          />
                          {employeeSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setEmployeeSearch("")}>
                              <Ionicons name="close-circle" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                          )}
                        </View>

                        {selectedEmployeeId && getSelectedEmployeeDetails() && (
                          <View style={styles.selectedEmployeeSummary}>
                            <View style={styles.selectedEmployeeAvatar}>
                              <Text style={styles.selectedEmployeeAvatarText}>
                                {getSelectedEmployeeDetails()?.name?.charAt(0).toUpperCase() || "U"}
                              </Text>
                            </View>
                            <View style={styles.selectedEmployeeInfo}>
                              <Text style={styles.selectedEmployeeName}>
                                {getSelectedEmployeeDetails()?.name || "Unknown"}
                              </Text>
                              <Text style={styles.selectedEmployeeId}>
                                ID: {getSelectedEmployeeDetails()?.employeeId || "N/A"}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedEmployeeId("");
                                setEmployeeSearch("");
                              }}
                              style={styles.selectedEmployeeRemoveBtn}
                            >
                              <Ionicons name="close-circle" size={24} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        )}

                        <ScrollView
                          style={styles.employeeListContainerEnhanced}
                          showsVerticalScrollIndicator={true}
                          nestedScrollEnabled={true}
                        >
                          {exportEmployees
                            .filter((r) => r.department === selectedDepartment)
                            .filter((r) => employeeSearch === "" || r.name.toLowerCase().includes(employeeSearch.toLowerCase()) || r.employeeId.toLowerCase().includes(employeeSearch.toLowerCase()))
                            .map((emp) => {
                              const empKey = emp.user_id?.toString() || emp.employeeId || emp.id?.toString();
                              const isSelected = selectedEmployeeId === empKey || selectedEmployeeId === emp.employeeId || selectedEmployeeId === emp.user_id?.toString();
                              return (
                                <TouchableOpacity
                                  key={empKey}
                                  style={[styles.employeeListItemEnhanced, isSelected && styles.employeeListItemEnhancedActive]}
                                  onPress={() => setSelectedEmployeeId(emp.user_id?.toString() || emp.employeeId)}
                                  activeOpacity={0.7}
                                >
                                  <View style={[styles.employeeListAvatarEnhanced, isSelected && styles.employeeListAvatarEnhancedActive]}>
                                    <Text style={styles.employeeListAvatarText}>{emp.name?.charAt(0).toUpperCase() || "U"}</Text>
                                  </View>
                                  <View style={styles.employeeListInfo}>
                                    <Text style={[styles.employeeListNameEnhanced, isSelected && styles.employeeListNameEnhancedActive]}>{emp.name}</Text>
                                    <Text style={styles.employeeListIdEnhanced}>ID: {emp.employeeId}</Text>
                                  </View>
                                  {isSelected && (
                                    <View style={styles.selectedCheckmark}>
                                      <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          {exportEmployees.filter((r) => r.department === selectedDepartment).length === 0 && (
                            <View style={styles.emptyStateContainer}>
                              {isLoadingExportCount ? (
                                <ActivityIndicator size="small" color="#3b82f6" />
                              ) : (
                                <View>
                                  <Ionicons name="people-outline" size={32} color="#d1d5db" />
                                  <Text style={styles.emptyStateText}>No employees found in this department for the selected date range</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Enhanced Action Footer */}
            <View style={styles.exportActionsEnhanced}>
              <View style={styles.exportButtonsRow}>
                <TouchableOpacity
                  style={styles.exportCancelBtnEnhanced}
                  onPress={() => setExportModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#6b7280" />
                  <Text style={styles.exportCancelTextEnhanced}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.exportConfirmBtnEnhanced, (exportRecordsCount === 0 || isLoadingExportCount) && styles.exportConfirmBtnDisabled]}
                  onPress={async () => {
                    if (exportFormat === "csv") await onExportCsv();
                    else await onExportPdf();
                    if (exportRecordsCount > 0) {
                      setExportModalVisible(false);
                    }
                  }}
                  disabled={exportRecordsCount === 0 || isLoadingExportCount}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={(exportRecordsCount === 0 || isLoadingExportCount) ? ["#9ca3af", "#9ca3af"] : ["#10b981", "#059669"]}
                    style={styles.exportConfirmGradient}
                  >
                    <Ionicons name="download" size={20} color="#fff" />
                    <Text style={styles.exportConfirmTextEnhanced}>Export as {exportFormat.toUpperCase()}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* iOS Date Picker Modal */}
      {Platform.OS === "ios" && (
        <Modal visible={iosDatePickerVisible} transparent animationType="fade">
          <View style={styles.iosDatePickerOverlay}>
            <View style={styles.iosDatePickerModal}>
              <View style={styles.iosDatePickerHeader}>
                <TouchableOpacity onPress={() => setIosDatePickerVisible(false)}>
                  <Text style={styles.iosDatePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.iosDatePickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => {
                  if (iosDatePickerField === "start") {
                    setExportStartDate(tempExportDate);
                  } else {
                    setExportEndDate(tempExportDate);
                  }
                  setIosDatePickerVisible(false);
                }}>
                  <Text style={styles.iosDatePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempExportDate}
                mode="date"
                display="spinner"
                onChange={(e, date) => { if (date) setTempExportDate(date); }}
                style={styles.iosDatePicker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingTextLarge}>Processing...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default AttendanceManager;


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  // Header
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 10 : 0, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center", marginRight: 12 },
  headerTitleSection: { flexDirection: "row", alignItems: "center", flex: 1 },
  headerIconBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center", marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#1f2937" },
  headerSubtitle: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  // Toggle
  toggleContainer: { flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 12 },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10, gap: 6 },
  toggleBtnActive: { backgroundColor: "#3b82f6" },
  toggleText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  toggleTextActive: { color: "#fff" },

  // Date Badge
  dateBadge: { backgroundColor: "#eff6ff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#dbeafe" },
  dateBadgeText: { color: "#1e40af", fontSize: 13, fontWeight: "600" },

  // Export Header Button
  exportHeaderBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#3b82f6", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8, marginTop: 8, alignSelf: "flex-start" },
  exportHeaderBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },


  // Content
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 20, backgroundColor: "#f8fafc" },

  // Admin Tabs
  adminTabContainer: { flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 20 },
  adminTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10, gap: 6 },
  adminTabActive: { backgroundColor: "#3b82f6" },
  adminTabText: { fontSize: 14, fontWeight: "600", color: "#3b82f6" },
  adminTabTextActive: { color: "#fff" },

  // Location Card
  locationCard: { borderRadius: 12, overflow: "hidden", marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" },
  locationGradient: { padding: 20, backgroundColor: "#fff" },
  locationHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  locationIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center" },
  locationTitle: { fontSize: 15, fontWeight: "700", color: "#1f2937", flex: 1 },
  locationAddress: { fontSize: 14, fontWeight: "600", color: "#374151", lineHeight: 20, marginBottom: 6 },
  locationCoords: { fontSize: 11, color: "#6b7280", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", marginBottom: 8 },
  locationNote: { fontSize: 11, color: "#6b7280", fontStyle: "italic" },

  // Status Card
  statusCard: { borderRadius: 16, overflow: "hidden", marginBottom: 20 },
  statusGradient: { padding: 20 },
  statusHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  statusIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center", marginRight: 16 },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  statusSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.9)", marginTop: 4 },
  timeRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, padding: 16 },
  timeBlock: { flex: 1, alignItems: "center" },
  timeDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.3)", marginHorizontal: 16 },
  timeLabel: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 6 },
  timeValue: { fontSize: 18, fontWeight: "700", color: "#fff", marginTop: 4 },

  // Action Button
  actionContainer: { alignItems: "center", marginBottom: 24 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, paddingHorizontal: 48, borderRadius: 16, gap: 10 },
  actionBtnText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  completedBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#dcfce7", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, gap: 8 },
  completedText: { fontSize: 14, fontWeight: "600", color: "#16a34a" },

  // Section Header
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937" },

  // History Card
  historyCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  historyDateBadge: { width: 50, height: 50, borderRadius: 12, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center", marginRight: 14 },
  historyDay: { fontSize: 18, fontWeight: "700", color: "#3b82f6" },
  historyMonth: { fontSize: 10, fontWeight: "600", color: "#60a5fa", textTransform: "uppercase" },
  historyInfo: { flex: 1 },
  historyDayName: { fontSize: 15, fontWeight: "600", color: "#1f2937", marginBottom: 4 },
  historyTimeRow: { flexDirection: "row", alignItems: "center" },
  historyTimeText: { fontSize: 13, color: "#6b7280", marginLeft: 4 },
  historyStatus: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  historyStatusText: { fontSize: 12, fontWeight: "600" },

  // Empty State
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 14, color: "#9ca3af", marginTop: 12 },

  // Search & Filters
  searchContainer: { marginBottom: 20 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: "#e5e7eb" },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: "#111827", marginLeft: 10 },
  filterRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 10 },
  filterPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#e5e7eb", gap: 6 },
  filterPillText: { fontSize: 13, fontWeight: "600", color: "#3b82f6" },
  countBadge: { backgroundColor: "#3b82f6", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginLeft: "auto" },
  countText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Employee Card
  employeeCard: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 16, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb" },
  employeeTop: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  employeeAvatar: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 14 },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 6 },
  employeeMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f4f6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  metaText: { fontSize: 11, color: "#6b7280", fontWeight: "600" },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },

  // Employee Time Row
  employeeTimeRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#f9fafb", gap: 8 },
  employeeTimeCard: { flexDirection: "row", alignItems: "center", flex: 1, gap: 8 },
  timeIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  timeCardLabel: { fontSize: 10, color: "#9ca3af", fontWeight: "600", textTransform: "uppercase" },
  timeCardValue: { fontSize: 15, color: "#111827", fontWeight: "700", marginTop: 2 },
  timeArrow: { paddingHorizontal: 4 },
  hoursChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#eff6ff", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
  hoursText: { fontSize: 14, color: "#3b82f6", fontWeight: "800" },

  // Employee Bottom
  employeeBottom: { padding: 16, paddingTop: 12, gap: 12 },
  locationRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9fafb", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 6 },
  locationText: { fontSize: 12, color: "#6b7280", flex: 1, fontWeight: "500" },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  photoBtn: { position: "relative" },
  photoThumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#f3f4f6" },
  photoEmpty: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", borderStyle: "dashed" },
  photoLabel: { position: "absolute", bottom: -4, right: -4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  photoLabelText: { fontSize: 9, fontWeight: "700" },
  viewPhotosBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#eff6ff", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, gap: 6, marginLeft: "auto" },
  viewPhotosBtnText: { fontSize: 13, color: "#3b82f6", fontWeight: "600" },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },

  // Role Modal
  roleModal: { width: "100%", backgroundColor: "#fff", borderRadius: 20, padding: 20 },
  roleModalTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16, textAlign: "center" },
  roleOption: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 8 },
  roleOptionActive: { backgroundColor: "#eff6ff", borderColor: "#3b82f6" },
  roleOptionText: { fontSize: 15, color: "#111827", fontWeight: "600" },
  roleOptionTextActive: { color: "#3b82f6" },
  roleCloseBtn: { marginTop: 8, paddingVertical: 14, alignItems: "center" },
  roleCloseBtnText: { fontSize: 15, color: "#6b7280", fontWeight: "600" },

  // Checkout Modal
  checkoutModal: { width: "100%", backgroundColor: "#fff", borderRadius: 24, padding: 24, position: "relative" },
  modalCloseBtn: { position: "absolute", top: 16, right: 16, zIndex: 10 },
  checkoutHeader: { alignItems: "center", marginBottom: 20 },
  checkoutIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#fee2e2", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  checkoutTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  checkoutSubtitle: { fontSize: 14, color: "#6b7280", marginTop: 4, textAlign: "center" },
  checkoutInput: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 16, fontSize: 15, color: "#111827", minHeight: 100, textAlignVertical: "top", marginBottom: 16 },
  filePickerBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, backgroundColor: "#f9fafb", gap: 10, marginBottom: 12 },
  filePickerText: { fontSize: 14, color: "#6b7280", flex: 1 },
  selectedFile: { flexDirection: "row", alignItems: "center", backgroundColor: "#ecfdf5", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#a7f3d0", gap: 8, marginBottom: 16 },
  selectedFileName: { fontSize: 13, color: "#065f46", fontWeight: "500", flex: 1 },
  checkoutActions: { flexDirection: "row", gap: 12 },
  checkoutCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center" },
  checkoutCancelText: { fontSize: 16, fontWeight: "600", color: "#6b7280" },
  checkoutConfirmBtn: { flex: 1, borderRadius: 12, overflow: "hidden" },
  checkoutConfirmDisabled: { opacity: 0.6 },
  checkoutConfirmGradient: { paddingVertical: 14, alignItems: "center" },
  checkoutConfirmText: { fontSize: 16, fontWeight: "600", color: "#fff" },

  // WFH Rejection Modal
  rejectModal: { width: "100%", backgroundColor: "#fff", borderRadius: 24, padding: 24 },
  rejectModalHeader: { alignItems: "center", marginBottom: 20 },
  rejectModalIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#fee2e2", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  rejectModalTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  rejectModalSubtitle: { fontSize: 14, color: "#6b7280", marginTop: 4, textAlign: "center" },
  rejectModalInput: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 16, fontSize: 15, color: "#111827", minHeight: 120, textAlignVertical: "top", marginBottom: 8 },
  rejectModalCharCount: { fontSize: 12, color: "#9ca3af", textAlign: "right", marginBottom: 20 },
  rejectModalActions: { flexDirection: "row", gap: 12 },
  rejectModalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center" },
  rejectModalCancelText: { fontSize: 16, fontWeight: "600", color: "#6b7280" },
  rejectModalConfirmBtn: { flex: 1, flexDirection: "row", paddingVertical: 14, borderRadius: 12, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", gap: 8 },
  rejectModalConfirmDisabled: { backgroundColor: "#fca5a5" },
  rejectModalConfirmText: { fontSize: 16, fontWeight: "600", color: "#fff" },

  // Selfie Modal
  selfieModal: { width: "100%", maxHeight: "90%", backgroundColor: "#fff", borderRadius: 24, padding: 24 },
  selfieCloseBtn: { position: "absolute", top: -15, right: -15, zIndex: 10 },
  selfieHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  selfieHeaderIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center", marginRight: 12 },
  selfieTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  selfieDate: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  selfieInfoCard: { backgroundColor: "#f9fafb", padding: 12, borderRadius: 12, marginBottom: 20, gap: 8 },
  selfieInfoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  selfieInfoText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  selfieSection: { marginBottom: 24 },
  selfieSectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  selfieSectionTitle: { fontWeight: "700", color: "#111827", fontSize: 15, flex: 1 },
  selfieSectionTime: { fontSize: 12, color: "#6b7280", fontWeight: "600", backgroundColor: "#f3f4f6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  selfieImage: { width: "100%", height: 280, borderRadius: 16, backgroundColor: "#f9fafb" },
  selfieEmpty: { alignItems: "center", justifyContent: "center", borderWidth: 2, borderStyle: "dashed", borderColor: "#d1d5db", height: 180, borderRadius: 16, backgroundColor: "#f9fafb" },
  selfieEmptyText: { color: "#9ca3af", marginTop: 12, fontSize: 14, fontWeight: "500" },

  // Export Modal
  exportModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  exportModal: { backgroundColor: "#fff", borderRadius: 0, width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", alignSelf: "center", overflow: "hidden", paddingBottom: 12 },
  exportModalHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#f8fafc" },
  exportModalTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  exportModalSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 4 },
  exportModalContent: { flex: 1, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff" },
  exportModalContentContainer: { paddingBottom: 160 },
  exportLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 10, marginTop: 12 },
  formatSelectionRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  formatOption: { flex: 1, borderWidth: 2, borderColor: "#e5e7eb", borderRadius: 16, padding: 20, alignItems: "center", backgroundColor: "#fff", position: "relative", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  formatOptionActive: { borderColor: "#3b82f6", backgroundColor: "#f0f9ff", shadowOpacity: 0.1, elevation: 4 },
  formatOptionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginTop: 12 },
  formatOptionSubtitle: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  employeeFilterRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  filterRadio: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", gap: 8 },
  filterRadioActive: { backgroundColor: "#eff6ff", borderColor: "#3b82f6" },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#d1d5db" },
  radioCircleActive: { borderColor: "#3b82f6", backgroundColor: "#3b82f6" },
  filterRadioText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  employeeSearchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
  employeeSearchInput: { flex: 1, height: 40, fontSize: 14, color: "#111827", marginLeft: 8 },
  employeeListContainer: { maxHeight: 200, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, backgroundColor: "#f9fafb" },
  employeeListContainerFlat: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, backgroundColor: "#f9fafb", marginBottom: 16, maxHeight: 200 },
  employeeListItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", gap: 10 },
  employeeListItemActive: { backgroundColor: "#eff6ff" },
  employeeListAvatar: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  employeeListAvatarText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  employeeListInfo: { flex: 1 },
  employeeListName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  employeeListId: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  pickerContainer: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, overflow: "hidden", backgroundColor: "#f9fafb" },
  dateRangeRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  dateInput: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, backgroundColor: "#f9fafb" },
  dateInputText: { color: "#111827", fontSize: 14, flex: 1 },
  dateRangeSummaryBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#eff6ff", borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: "#dbeafe" },
  dateRangeSummaryText: { color: "#1e40af", fontSize: 13, fontWeight: "600" },
  exportActions: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#f9fafb" },
  exportCancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center" },
  exportCancelText: { fontWeight: "600", color: "#374151" },
  exportConfirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#3b82f6", alignItems: "center" },
  exportConfirmText: { color: "#fff", fontWeight: "700" },
  exportSummary: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: "#eff6ff", borderRadius: 10, borderWidth: 1, borderColor: "#dbeafe", marginRight: 8 },
  exportSummaryText: { color: "#1f2937", fontSize: 12, fontWeight: "700" },

  // Enhanced Export Modal Styles
  exportModalHeaderContainer: { overflow: "hidden" },
  exportModalHeaderGradient: { paddingHorizontal: 20, paddingVertical: 16 },
  exportModalHeaderContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  exportModalIconBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  exportModalCloseBtn: { padding: 4 },

  // View Mode Toggle
  viewModeContainer: { flexDirection: "row", gap: 10, marginBottom: 20, backgroundColor: "#f3f4f6", padding: 4, borderRadius: 12 },
  viewModeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, gap: 8, backgroundColor: "transparent" },
  viewModeBtnActive: { backgroundColor: "#3b82f6", shadowColor: "#3b82f6", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
  viewModeBtnText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  viewModeBtnTextActive: { color: "#fff" },

  exportSection: { marginBottom: 24 },
  exportSectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  exportSectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },

  formatIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  formatIconContainerActive: { backgroundColor: "#eff6ff" },
  formatOptionTitleActive: { color: "#3b82f6" },
  formatSelectedBadge: { position: "absolute", top: 10, right: 10 },

  pickerContainerEnhanced: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, overflow: "hidden", backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },

  exportLabelEnhanced: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8, marginTop: 4 },
  dateRangeRowEnhanced: { flexDirection: "row", gap: 12, marginTop: 16, alignItems: "flex-end" },
  dateInputEnhanced: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 14, backgroundColor: "#fff", gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  dateInputTextEnhanced: { color: "#111827", fontSize: 14, flex: 1, fontWeight: "500" },
  dateIconContainer: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center" },
  dateArrowContainer: { alignItems: "center", justifyContent: "flex-end", paddingBottom: 14 },

  dateRangeSummaryBoxEnhanced: { marginTop: 16, borderRadius: 12, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  dateRangeSummaryGradient: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  dateRangeSummaryTextEnhanced: { color: "#1e40af", fontSize: 14, fontWeight: "700", flex: 1 },

  employeeFilterRowEnhanced: { flexDirection: "row", gap: 10, marginBottom: 16 },
  filterRadioEnhanced: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 10, paddingVertical: 14, borderRadius: 12, backgroundColor: "#fff", borderWidth: 2, borderColor: "#e5e7eb", gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  filterRadioEnhancedActive: { backgroundColor: "#f0f9ff", borderColor: "#3b82f6", shadowOpacity: 0.1, elevation: 2 },
  radioCircleEnhanced: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#d1d5db", justifyContent: "center", alignItems: "center" },
  radioCircleEnhancedActive: { borderColor: "#3b82f6" },
  radioInnerCircle: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#3b82f6" },
  filterRadioTextEnhanced: { fontSize: 13, fontWeight: "700", color: "#374151", flexShrink: 1 },
  filterRadioTextEnhancedActive: { color: "#3b82f6" },

  specificEmployeeContainer: { marginTop: 16 },
  loadingContainer: { padding: 20, alignItems: "center", backgroundColor: "#f9fafb", borderRadius: 12, marginBottom: 16 },
  loadingText: { color: "#6b7280", fontSize: 13, marginTop: 8 },
  emptyStateContainer: { padding: 24, alignItems: "center", backgroundColor: "#f9fafb", borderRadius: 12, marginBottom: 16 },
  emptyStateText: { color: "#6b7280", fontSize: 13, marginTop: 12, textAlign: "center", lineHeight: 20 },

  employeeSearchContainerEnhanced: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  employeeSearchInputEnhanced: { flex: 1, height: 44, fontSize: 14, color: "#111827", marginLeft: 10 },

  employeeListContainerEnhanced: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, backgroundColor: "#fff", marginBottom: 16, maxHeight: 280, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  employeeListItemEnhanced: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", gap: 12 },
  employeeListItemEnhancedActive: { backgroundColor: "#f0fdf4", borderBottomColor: "#d1fae5" },
  employeeListAvatarEnhanced: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", backgroundColor: "#ddd6fe" },
  employeeListAvatarEnhancedActive: { backgroundColor: "#a7f3d0" },
  employeeListNameEnhanced: { fontSize: 15, fontWeight: "700", color: "#111827" },
  employeeListNameEnhancedActive: { color: "#059669" },
  employeeListIdEnhanced: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  selectedCheckmark: { marginLeft: "auto" },

  // Enhanced Employee Filter Styles
  selectionCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  selectionCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  selectionCardTitle: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  selectedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#d1fae5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  selectedBadgeText: { fontSize: 11, fontWeight: "700", color: "#059669" },

  selectedDeptChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f5f3ff", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: "#e9d5ff" },
  selectedDeptChipText: { fontSize: 14, fontWeight: "600", color: "#7c3aed", flex: 1 },
  chipRemoveBtn: { padding: 2 },

  selectedEmployeeSummary: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f0fdf4", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#bbf7d0" },
  selectedEmployeeAvatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#10b981", justifyContent: "center", alignItems: "center" },
  selectedEmployeeAvatarText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  selectedEmployeeInfo: { flex: 1 },
  selectedEmployeeName: { fontSize: 15, fontWeight: "700", color: "#065f46" },
  selectedEmployeeId: { fontSize: 12, color: "#059669", marginTop: 2 },
  selectedEmployeeRemoveBtn: { padding: 4 },

  exportActionsEnhanced: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#f9fafb" },

  exportButtonsRow: { flexDirection: "row", gap: 12, flex: 1 },
  exportCancelBtnEnhanced: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 14, backgroundColor: "#f3f4f6", gap: 8 },
  exportCancelTextEnhanced: { fontWeight: "700", color: "#374151", fontSize: 15 },
  exportConfirmBtnEnhanced: { flex: 2, borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  exportConfirmBtnDisabled: { shadowOpacity: 0, elevation: 0 },
  exportConfirmGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, paddingHorizontal: 20, gap: 10 },
  exportConfirmTextEnhanced: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Loading
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  loadingBox: { backgroundColor: "#fff", paddingVertical: 24, paddingHorizontal: 32, borderRadius: 16, alignItems: "center" },
  loadingTextLarge: { fontSize: 14, color: "#6b7280", marginTop: 12 },

  // iOS Date Picker
  iosDatePickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  iosDatePickerModal: { backgroundColor: "#fff", borderRadius: 20, width: "100%", overflow: "hidden" },
  iosDatePickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  iosDatePickerTitle: { fontSize: 17, fontWeight: "600", color: "#111827" },
  iosDatePickerCancel: { fontSize: 16, color: "#6b7280" },
  iosDatePickerDone: { fontSize: 16, fontWeight: "600", color: "#3b82f6" },
  iosDatePicker: { height: 200, width: "100%" },

  // Camera
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  cameraGradient: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: "flex-end", alignItems: "center", paddingBottom: 60 },
  cameraFrame: { width: 250, height: 300, position: "absolute", top: "25%" },
  cornerBorder: { position: "absolute", width: 40, height: 40, borderColor: "#fff" },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
  cameraHint: { color: "#fff", fontSize: 14, marginBottom: 30, opacity: 0.8 },
  captureButton: { borderRadius: 40, overflow: "hidden", marginBottom: 20 },
  captureGradient: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  cancelCameraBtn: { paddingVertical: 12, paddingHorizontal: 32 },
  cancelCameraText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // WFH Panel
  wfhPanel: { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 16 },
  wfhPanelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  wfhPanelTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  wfhPanelTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  wfhPanelCount: { fontSize: 12, fontWeight: "700", color: "#64748b" },


  // WFH Dedicated Page Styles
  wfhContainer: { flex: 1, padding: 16 },
  wfhHeader: { alignItems: "center", paddingVertical: 20, marginBottom: 16 },
  wfhTitle: { fontSize: 20, fontWeight: "700", color: "#0f172a", marginTop: 8 },
  wfhSubtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },

  wfhFilterContainer: { flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 16 },
  wfhFilterTab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  wfhFilterTabActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  wfhFilterText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  wfhFilterTextActive: { color: "#0f172a" },
  pendingBadge: { color: "#dc2626", fontWeight: "800" },

  wfhRequestsList: { flex: 1 },
  wfhRequestCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  wfhRequestHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  wfhRequestUser: { flexDirection: "row", alignItems: "center", flex: 1 },
  wfhUserAvatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center", marginRight: 12 },
  wfhUserAvatarText: { color: "#1e3a8a", fontWeight: "800", fontSize: 16 },
  wfhUserName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  wfhUserDept: { fontSize: 12, color: "#64748b", marginTop: 1 },
  wfhStatusChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  wfhStatusPending: { backgroundColor: "#fef3c7", borderColor: "#f59e0b" },
  wfhStatusApproved: { backgroundColor: "#d1fae5", borderColor: "#10b981" },
  wfhStatusRejected: { backgroundColor: "#fee2e2", borderColor: "#ef4444" },
  wfhStatusText: { fontSize: 11, fontWeight: "700" },

  wfhRequestContent: { marginBottom: 12 },
  wfhReason: { fontSize: 14, color: "#111827", fontWeight: "600", lineHeight: 20 },
  wfhNotes: { fontSize: 13, color: "#475569", marginTop: 4, lineHeight: 18 },
  wfhApprover: { fontSize: 12, color: "#166534", marginTop: 6, fontWeight: "600" },

  wfhActions: { flexDirection: "row", gap: 12 },
  wfhActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  wfhActionText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  wfhApproveBtn: { backgroundColor: "#10b981" },
  wfhRejectBtn: { backgroundColor: "#ef4444" },

  wfhEmptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  wfhEmptyTitle: { fontSize: 18, fontWeight: "600", color: "#374151", marginTop: 16 },
  wfhEmptyText: { fontSize: 14, color: "#6b7280", marginTop: 4, textAlign: "center" },

  // WFH Status Banner (New)
  wfhStatusBanner: { marginBottom: 20, borderRadius: 16, overflow: "hidden", shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  wfhStatusContent: { padding: 20 },
  wfhTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  wfhIconBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 14 },
  wfhBannerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  wfhBannerDate: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  wfhStatusTag: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  wfhStatusTagText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  wfhBannerReason: { fontSize: 14, color: "rgba(255,255,255,0.9)", lineHeight: 20 },

  // Work Mode Switcher
  workModeSwitcher: { flexDirection: "row", backgroundColor: "#e2e8f0", padding: 4, borderRadius: 12, marginBottom: 20 },
  workModeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10, gap: 8 },
  workModeBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  workModeText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  workModeTextActive: { color: "#1e3a8a" },

  // WFH Card (Request Form)
  wfhCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  wfhHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  wfhIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  required: { color: "#ef4444" },
  optional: { color: "#9ca3af", fontWeight: "400", fontSize: 12 },
  textInput: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, fontSize: 15, color: "#1e293b", backgroundColor: "#f8fafc", textAlignVertical: "top" },

  // Enhanced Admin Tab Styles
  adminTabContainerEnhanced: { flexDirection: "column", gap: 12, marginBottom: 24 },
  adminTabEnhanced: { borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  adminTabEnhancedActive: { shadowOpacity: 0.15, elevation: 4 },
  adminTabGradient: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16, gap: 14 },
  adminTabLabelContainer: { flex: 1 },
  adminTabEnhancedText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  adminTabEnhancedSubtext: { fontSize: 12, color: "#6b7280", marginTop: 2, fontWeight: "500" },
  adminTabEnhancedTextActive: { color: "#fff" },
  adminTabEnhancedSubtextActive: { color: "rgba(255,255,255,0.9)" },

  // Enhanced WFH Container
  wfhContainerEnhanced: { flex: 1, marginBottom: 20 },
  wfhHeaderEnhanced: { borderRadius: 16, overflow: "hidden", marginBottom: 20, shadowColor: "#10b981", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  wfhHeaderGradient: { paddingVertical: 20, paddingHorizontal: 16 },
  wfhHeaderContent: { flexDirection: "row", alignItems: "center", gap: 14 },
  wfhHeaderIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  wfhHeaderText: { flex: 1 },
  wfhHeaderTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  wfhHeaderSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  wfhPendingBadge: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 40, alignItems: "center" },
  wfhPendingBadgeText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Enhanced Filter Container
  wfhFiltersWrapper: { marginBottom: 16 },
  wfhFilterContainerEnhanced: { flexDirection: "row", gap: 10, marginBottom: 12, paddingHorizontal: 0 },
  wfhFilterTabEnhanced: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb", gap: 6 },
  wfhFilterTabEnhancedActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  wfhFilterTextEnhanced: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  wfhFilterTextEnhancedActive: { color: "#fff" },
  wfhFilterBadge: { backgroundColor: "rgba(255,255,255,0.3)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 20, alignItems: "center" },
  wfhFilterBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  // Enhanced WFH Requests List
  wfhRequestsListEnhanced: { gap: 12, marginBottom: 20 },
  wfhRequestCardEnhanced: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  wfhRequestHeaderEnhanced: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  wfhRequestUserEnhanced: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  wfhUserAvatarEnhanced: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", backgroundColor: "#dbeafe" },
  wfhAvatarApproved: { backgroundColor: "#d1fae5" },
  wfhAvatarRejected: { backgroundColor: "#fee2e2" },
  wfhAvatarPending: { backgroundColor: "#fef3c7" },
  wfhUserAvatarTextEnhanced: { fontSize: 18, fontWeight: "700", color: "#1e3a8a" },
  wfhUserInfoEnhanced: { flex: 1 },
  wfhUserNameEnhanced: { fontSize: 15, fontWeight: "700", color: "#111827" },
  wfhUserMetaEnhanced: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  wfhUserDeptEnhanced: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  wfhMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#d1d5db" },
  wfhStatusChipEnhanced: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#fef3c7" },
  wfhStatusChipApproved: { backgroundColor: "#d1fae5" },
  wfhStatusChipRejected: { backgroundColor: "#fee2e2" },
  wfhStatusChipPending: { backgroundColor: "#fef3c7" },
  wfhStatusTextEnhanced: { fontSize: 12, fontWeight: "700", color: "#fff" },

  // Enhanced Request Content
  wfhRequestContentEnhanced: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  wfhReasonBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#f0fdf4", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  wfhReasonEnhanced: { fontSize: 14, color: "#111827", fontWeight: "600", flex: 1, lineHeight: 20 },
  wfhNotesBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#f5f3ff", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  wfhNotesEnhanced: { fontSize: 13, color: "#475569", flex: 1, lineHeight: 18 },
  wfhApproverBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f0fdf4", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  wfhApproverEnhanced: { fontSize: 12, color: "#166534", fontWeight: "600" },

  // Added Styles for WFH Management
  wfhFilterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
  wfhFilterPillActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  wfhStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  wfhRequestDetails: { backgroundColor: "#f9fafb", padding: 12, borderRadius: 8, gap: 8 },
  wfhDetailRow: { flexDirection: "row", gap: 8 },
  wfhDetailText: { fontSize: 13, color: "#374151", flex: 1 },
  wfhActionButtons: { flexDirection: "row", gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  wfhBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 8, gap: 6 },
  wfhBtnReject: { backgroundColor: "#fee2e2" },
  wfhBtnApprove: { backgroundColor: "#10b981" },
  wfhBtnTextReject: { color: "#dc2626", fontWeight: "600", fontSize: 13 },
  wfhBtnTextApprove: { color: "#fff", fontWeight: "600", fontSize: 13 },
  // Enhanced Empty State
  wfhEmptyStateEnhanced: { alignItems: "center", justifyContent: "center", paddingVertical: 80, paddingHorizontal: 20 },
  wfhEmptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  wfhEmptyTitleEnhanced: { fontSize: 18, fontWeight: "700", color: "#374151", marginBottom: 8 },
  wfhEmptyTextEnhanced: { fontSize: 14, color: "#6b7280", textAlign: "center" },
  wfhErrorContainer: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fef2f2", marginHorizontal: 20, marginTop: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#fee2e2" },
  wfhErrorText: { flex: 1, fontSize: 13, color: "#b91c1c", fontWeight: "500" },
  wfhRetryBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#ef4444", borderRadius: 8 },
  wfhRetryText: { fontSize: 12, color: "#fff", fontWeight: "600" },
  typeSwitcherContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    gap: 8,
  },
  typeOptionActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  typeOptionTextActive: {
    color: "#fff",
  },
});
