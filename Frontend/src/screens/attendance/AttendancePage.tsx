import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import { CameraView } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar, setStatusBarBackgroundColor, setStatusBarStyle } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  Dimensions,
  Modal,
  Platform,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Shadows, BorderRadius, Spacing, Typography, getStatusBadgeStyle } from "../../constants/designSystem";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../lib/api";
import OnlineStatusToggle from "../../components/OnlineStatusToggle";
import CameraService, { CameraPhoto } from "../../services/cameraService";
import LocationService from "../../services/locationService";
import { requestAttendancePermissions } from "../../utils/permissions";
import { calculateCheckInStatus, calculateCheckOutStatus, getStatusColor } from "../../utils/attendanceStatus";
import {
  isAdminRole,
  canPerformAttendanceActions,
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
  WfhRequest,
} from "../../utils/attendanceWfhLogic";
type WfhStatus = "not_requested" | "pending" | "approved" | "rejected";

interface OfficeHours {
  id?: number;
  start_time: string;
  end_time: string;
  check_in_grace_minutes: number;
  check_out_grace_minutes: number;
}

import {
  getCurrentISTTime,
  formatIST,
  formatTimeIST,
  formatDateIST,
  getDayOfWeek
} from "../../utils/dateTime";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Removed local IST helpers to use global utils


const convertToIST = (dateString: string | Date): Date => {
  if (dateString instanceof Date) return dateString;
  if (!dateString.includes('Z') && !dateString.includes('+')) {
    const utcDate = new Date(dateString + 'Z');
    if (!isNaN(utcDate.getTime())) return utcDate;
  }
  return new Date(dateString);
};

const formatAttendanceDate = (date: Date): string => {
  return formatIST(date, "dd MMM yyyy");
};

// getDayOfWeek is imported from dateTime.ts

const formatTimeToIST = (dateString: string | Date | undefined): string => {
  return formatTimeIST(dateString);
};

const formatDateToIST = (dateString: string | Date | undefined): string => {
  if (!dateString) return "-";
  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    if (isNaN(date.getTime())) return "-";

    // Format date using IST timezone
    const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return formatAttendanceDate(istDate);
  } catch { return "-"; }
};

const buildSelfieUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const baseUrl = apiService.getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  selfie?: string | null;
  checkInSelfie?: string | null;
  checkOutSelfie?: string | null;
  status?: string;
  workSummary?: string;
  workReportFileName?: string;
  workLocation?: "Work From Home" | "Work From Office";
}

// Animated Pulse Component for live status
const PulseIndicator = ({ color = "#22c55e" }: { color?: string }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Set status bar to match header color
  useEffect(() => {
    if (Platform.OS === "android") {
      setStatusBarBackgroundColor("#ffffff", true);
    }
    setStatusBarStyle("dark");
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.pulseContainer}>
      <Animated.View style={[styles.pulseOuter, { backgroundColor: color, opacity: 0.3, transform: [{ scale: pulseAnim }] }]} />
      <View style={[styles.pulseInner, { backgroundColor: color }]} />
    </View>
  );
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(true);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState<string>("");
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [todaysWork, setTodaysWork] = useState("");
  const [workReportFile, setWorkReportFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [workSummaryForCheckout, setWorkSummaryForCheckout] = useState("");
  const [workMode, setWorkMode] = useState<"office" | "wfh">("office");
  const [wfhRequestStatus, setWfhRequestStatus] = useState<WfhStatus>("not_requested");
  const [wfhRequestId, setWfhRequestId] = useState<string | null>(null);
  const [wfhReason, setWfhReason] = useState("");
  const [wfhType, setWfhType] = useState<"Full Day" | "Half Day">("Full Day");
  const [wfhStartDate, setWfhStartDate] = useState("");
  const [wfhEndDate, setWfhEndDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end">("start");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [officeHours, setOfficeHours] = useState<OfficeHours | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<any>(null);
  const [checkOutStatus, setCheckOutStatus] = useState<any>(null);
  // NEW: Store all WFH requests for proper date range checking
  const [allWfhRequests, setAllWfhRequests] = useState<WfhRequest[]>([]);
  // NEW: Active WFH request for today (approved and in date range)
  const [activeWfhToday, setActiveWfhToday] = useState<WfhRequest | null>(null);
  // NEW: Last checked date for midnight refresh
  const [lastCheckedDate, setLastCheckedDate] = useState<string>(getTodayIST());
  const cameraRef = useRef<any>(null);
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Admin role check - Admin cannot perform attendance actions
  const isAdmin = isAdminRole(user?.role);
  const canPerformActions = canPerformAttendanceActions(user?.role);

  // NEW: Auto-refresh on app state change (background -> foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        console.log("📱 App returned to foreground - Checking for date change");
        handleMidnightRefresh();
      }
    });
    return () => subscription.remove();
  }, [lastCheckedDate]);

  // NEW: Screen focus refresh
  useFocusEffect(
    useCallback(() => {
      console.log("👀 Screen focused - Refreshing data");
      handleMidnightRefresh();
      return () => {};
    }, [lastCheckedDate])
  );

  // NEW: Midnight refresh handler
  const handleMidnightRefresh = async () => {
    const today = getTodayIST();
    if (today !== lastCheckedDate) {
      console.log(`🌙 Date changed from ${lastCheckedDate} to ${today} - Refreshing all data`);
      setLastCheckedDate(today);
      // Reset current attendance for new day
      setCurrentAttendance(null);
      // Reload all data
      await loadAttendanceData();
      await loadAllWfhRequests();
    } else {
      // Just refresh data without full reset
      await loadAttendanceData();
      await loadAllWfhRequests();
    }
  };

  // NEW: Load all WFH requests and find active one for today
  const loadAllWfhRequests = async () => {
    if (!user?.id) return;
    try {
      const requests = await apiService.getMyWfhRequests();
      setAllWfhRequests(requests);
      
      // Find active approved WFH for today
      const activeWfh = findActiveWfhForToday(requests);
      setActiveWfhToday(activeWfh);
      
      // Also find any WFH request (any status) for today for UI display
      const anyWfhToday = findAnyWfhForToday(requests);
      if (anyWfhToday) {
        setWfhRequestStatus((anyWfhToday.status?.toLowerCase() as WfhStatus) || "pending");
        setWfhRequestId(anyWfhToday.id?.toString() || anyWfhToday.wfh_id?.toString() || null);
        setWfhReason(anyWfhToday.reason || "");
        setWfhStartDate(anyWfhToday.start_date || "");
        setWfhEndDate(anyWfhToday.end_date || "");
        
        // Auto-switch to WFH mode if approved
        if (activeWfh) {
          setWorkMode("wfh");
        }
      } else {
        setWfhRequestStatus("not_requested");
        setWfhRequestId(null);
      }
      
      console.log(`✅ Loaded ${requests.length} WFH requests, active today: ${activeWfh ? 'Yes' : 'No'}`);
    } catch (error) {
      console.warn("Failed to load WFH requests:", error);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await requestPermissions();
      await loadOfficeHours();
      await loadAttendanceData();
      await loadAllWfhRequests(); // NEW: Load all WFH requests
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    };
    initialize();
  }, []);

  const refreshCurrentLocation = async () => {
    try {
      const result = await LocationService.getCurrentLocationWithAddress({
        accuracy: 'high',
        timeout: 20000,
      });
      setLocation(result.coordinates);
      setLocationAddress(result.address?.formattedAddress || `${result.coordinates.latitude.toFixed(6)}, ${result.coordinates.longitude.toFixed(6)}`);
    } catch (error) {
      console.warn("Unable to refresh location:", error);
      setLocationAddress("Unable to determine current location");
    }
  };

  const requestPermissions = async () => {
    try {
      const { camera, location } = await requestAttendancePermissions();
      setHasCameraPermission(camera);
      setHasLocationPermission(location);

      if (!camera) {
        Alert.alert("Camera Permission Required", "Please enable camera access in settings to continue.");
      }

      if (location) {
        await refreshCurrentLocation();
      } else {
        setLocationAddress("Location access is required for attendance tracking.");
        Alert.alert("Location Permission Required", "Location access is needed for attendance tracking.");
      }
    } catch (error) {
      console.error("Permission request error:", error);
    }
  };

  const loadOfficeHours = async () => {
    try {
      const timing = await apiService.getEffectiveOfficeTiming(user?.department);
      setOfficeHours(timing);

      // Calculate current status
      if (timing) {
        const checkInStat = calculateCheckInStatus(timing);
        const checkOutStat = calculateCheckOutStatus(timing);
        setCheckInStatus(checkInStat);
        setCheckOutStatus(checkOutStat);
      }
    } catch (error) {
      console.warn("Failed to load office hours:", error);
    }
  };

  // Refresh status every minute
  useEffect(() => {
    if (!officeHours) return;

    const interval = setInterval(() => {
      const checkInStat = calculateCheckInStatus(officeHours);
      const checkOutStat = calculateCheckOutStatus(officeHours);
      setCheckInStatus(checkInStat);
      setCheckOutStatus(checkOutStat);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [officeHours]);

  const loadAttendanceData = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      let data;
      if (user.role === "hr" || user.role === "manager") {
        data = await apiService.getAllAttendance();
        data = data.filter((record: any) => record.department === user.department);
      } else {
        data = await apiService.getSelfAttendance(parseInt(user.id));
      }

      const istNow = getCurrentISTTime();
      const today = formatIST(istNow, "yyyy-MM-dd");
      const transformedData: AttendanceRecord[] = data.map((record: any) => {
        const workReportPath = record.work_report || record.workReport;
        let workReportFileName: string | undefined;
        if (workReportPath) {
          const parts = workReportPath.split('/');
          workReportFileName = parts[parts.length - 1];
        }
        const checkInDate = new Date(record.check_in);
        const checkInDateIST = checkInDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        // Parse selfie data - handle JSON format with check_in and check_out
        let checkInSelfie = record.checkInSelfie || null;
        let checkOutSelfie = record.checkOutSelfie || null;

        if (!checkInSelfie && !checkOutSelfie && record.selfie) {
          try {
            if (typeof record.selfie === "string" && record.selfie.trim().startsWith("{")) {
              const selfieData = JSON.parse(record.selfie);
              checkInSelfie = selfieData.check_in || null;
              checkOutSelfie = selfieData.check_out || null;
            } else {
              checkInSelfie = record.selfie;
            }
          } catch {
            checkInSelfie = record.selfie;
          }
        }

        return {
          id: record.attendance_id.toString(),
          date: checkInDateIST,
          checkInTime: formatTimeToIST(record.check_in),
          checkOutTime: record.check_out ? formatTimeToIST(record.check_out) : undefined,
          status: record.status || "present",
          selfie: checkInSelfie,
          checkInSelfie: checkInSelfie,
          checkOutSelfie: checkOutSelfie,
          workSummary: record.work_summary || record.workSummary,
          workReportFileName,
          workLocation: (record.work_location || record.workLocation) === "Work From Home" ? "Work From Home" : "Work From Office",
        };
      });

      setAttendanceHistory(transformedData);
      setCurrentAttendance(transformedData.find((r) => r.date === today) || null);
    } catch (error: any) {
      console.error("Failed to load attendance data:", error);
      Alert.alert("Error", "Failed to load attendance data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const openCamera = (checkIn: boolean) => {
    if (!hasCameraPermission) {
      Alert.alert("Permission Required", "Please grant camera access.");
      return;
    }
    setIsCheckingIn(checkIn);
    setCameraVisible(true);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await CameraService.takePicture(cameraRef, { quality: 0.75, base64: true });
      setCameraVisible(false);
      await handleSubmitAttendance(photo);
    } catch (error) {
      console.error("Camera capture failed:", error);
      Alert.alert("Camera Error", "Failed to capture selfie. Please try again.");
    }
  };

  const handleSubmitAttendance = async (photo: CameraPhoto) => {
    if (!user?.id) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }
    setIsLoading(true);
    try {
      // Get base64 image first (this should always work)
      const base64Image = photo.base64 ? photo.base64 : await CameraService.photoToBase64(photo.uri);

      // Try to get location with proper error handling
      let coords: any = null;
      let gpsLocationString = "0,0"; // Default fallback coordinates
      let locationObtained = false;

      try {
        console.log("📍 Attempting to get location...");
        coords = await LocationService.getLocationWithRetry(2, { accuracy: 'balanced', timeout: 10000 });
        setLocation(coords);
        gpsLocationString = LocationService.formatCoordinatesForAPI(coords);
        locationObtained = true;

        console.log("✅ Location obtained:", gpsLocationString);

        // Get address in background (don't wait for it)
        LocationService.getAddressFromCoordinates(coords)
          .then((address) => {
            if (address?.formattedAddress) {
              console.log("📍 Address:", address.formattedAddress);
              setLocationAddress(address.formattedAddress);
            }
          })
          .catch((err) => {
            console.warn("⚠️ Could not get address:", err);
          });
      } catch (locationError) {
        // Location failed, but continue with check-in
        console.warn("⚠️ Location unavailable, continuing with check-in:", locationError);
        setLocationAddress("Location unavailable - GPS may be disabled");

        // Use default fallback coordinates
        gpsLocationString = "0,0";
        locationObtained = false;

        // Show warning for office mode
        if (workMode === "office") {
          Alert.alert(
            "⚠️ Location Unavailable",
            "GPS is not available. Please enable location services for accurate attendance tracking. Continuing with check-in.",
            [{ text: "OK", onPress: () => { } }]
          );
        }
      }

      if (isCheckingIn) {
        // Determine work location based on enforced mode (WFH takes priority if approved)
        const workLocationMode = enforcedWorkMode === "wfh" ? "wfh" : "office";
        const workLocationLabel = enforcedWorkMode === "wfh" ? "Work From Home" : "Work From Office";

        console.log("📍 Check-in with work location:", workLocationLabel);

        const response = await apiService.checkIn(
          parseInt(user.id),
          gpsLocationString,
          base64Image,
          workLocationMode
        );

        const istNow = getCurrentISTTime();
        const formattedTime = formatTimeToIST(istNow);
        const today = formatIST(istNow, "yyyy-MM-dd");

        const record: AttendanceRecord = {
          id: response.attendance_id.toString(),
          date: today,
          checkInTime: formattedTime,
          selfie: photo.uri,
          status: "present",
          workLocation: workLocationLabel,
        };

        setCurrentAttendance(record);
        setAttendanceHistory((prev) => [record, ...prev]);

        // Show success with location info
        const locationInfo = locationObtained ? "✅ Location detected" : "⚠️ Location unavailable";

        // Auto-set chat status to online after check-in
        try {
          await apiService.toggleOnlineStatus(response.attendance_id, parseInt(user.id), true);
          console.log("✅ Chat status set to Online after check-in");
        } catch (chatErr) {
          console.warn("⚠️ Failed to set chat status to Online:", chatErr);
        }

        Alert.alert(
          "✅ Check-in Successful",
          `${workLocationLabel}\n${locationInfo}`,
          [{ text: "OK" }]
        );

        // Refresh data in background (don't wait)
        loadAttendanceData().catch(() => { });
      } else if (currentAttendance) {
        // Determine work location based on enforced mode
        const workLocationMode = enforcedWorkMode === "wfh" ? "wfh" : "office";
        const workLocationLabel = enforcedWorkMode === "wfh" ? "Work From Home" : "Work From Office";

        console.log("📍 Check-out with work location:", workLocationLabel);

        await apiService.checkOut(
          parseInt(user.id),
          gpsLocationString,
          base64Image,
          workSummaryForCheckout || "Completed daily tasks",
          workReportFile
        );

        const istNow = getCurrentISTTime();
        const formattedTime = formatTimeToIST(istNow);
        const updated: AttendanceRecord = {
          ...currentAttendance,
          checkOutTime: formattedTime,
          workSummary: workSummaryForCheckout || "Completed daily tasks",
          workReportFileName: workReportFile?.name,
          workLocation: workLocationLabel,
        };

        setCurrentAttendance(updated);
        setAttendanceHistory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setWorkSummaryForCheckout("");
        setTodaysWork("");
        setWorkReportFile(null);

        // Show success with location info
        const locationInfo = locationObtained ? "✅ Location detected" : "⚠️ Location unavailable";

        // Auto-set chat status to offline after check-out
        try {
          await apiService.toggleOnlineStatus(parseInt(currentAttendance.id), parseInt(user.id), false, "Shift completed / Checked out");
          console.log("✅ Chat status set to Offline after check-out");
        } catch (chatErr) {
          console.warn("⚠️ Failed to set chat status to Offline:", chatErr);
        }

        Alert.alert(
          "✅ Check-out Successful",
          `${workLocationLabel}\n${locationInfo}`,
          [{ text: "OK" }]
        );

        // Refresh data in background (don't wait)
        loadAttendanceData().catch(() => { });
      }
    } catch (error: any) {
      console.error("Failed to submit attendance:", error);
      Alert.alert("Attendance Error", error.message || "Unable to submit attendance. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const pickWorkReportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setWorkReportFile({ uri: file.uri, name: file.name, type: file.mimeType || 'application/pdf' });
      }
    } catch {
      Alert.alert("Error", "Failed to pick document. Please try again.");
    }
  };

  const confirmCheckOut = () => {
    if (!todaysWork.trim()) {
      Alert.alert("Required", "Please provide today's work summary before checking out.");
      return;
    }
    setWorkSummaryForCheckout(todaysWork);
    setShowCheckoutModal(false);
    openCamera(false);
  };

  const loadWfhRequestForToday = async () => {
    if (!user?.id) return;
    const istNow = getCurrentISTTime();
    const today = formatIST(istNow, "yyyy-MM-dd");
    try {
      const existing = await apiService.getMyWfhRequest(today);
      if (existing) {
        setWfhRequestStatus((existing.status as WfhStatus) || "pending");
        if (existing.id) setWfhRequestId(existing.id.toString());
        setWfhReason(existing.reason || "");
        setWfhStartDate(existing.start_date || "");
        setWfhEndDate(existing.end_date || "");
      } else {
        setWfhRequestStatus("not_requested");
        setWfhRequestId(null);
      }
    } catch (error) {
      console.warn("Failed to load WFH request", error);
      setWfhRequestStatus("not_requested");
      setWfhRequestId(null);
    }
  };

  const submitWfhRequest = async () => {
    if (!wfhReason.trim()) {
      Alert.alert("Required", "Please add a brief reason for WFH.");
      return;
    }
    if (!wfhStartDate.trim()) {
      Alert.alert("Required", "Please select a start date.");
      return;
    }
    if (!wfhEndDate.trim()) {
      Alert.alert("Required", "Please select an end date.");
      return;
    }
    
    // NEW: Validate 24-hour advance notice rule
    const advanceNoticeValidation = validateWfhAdvanceNotice(wfhStartDate, wfhEndDate);
    if (!advanceNoticeValidation.isValid) {
      Alert.alert(
        "WFH Request Not Allowed",
        advanceNoticeValidation.error || "Please check your dates and try again."
      );
      return;
    }
    
    if (!user?.id) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }
    const istNow = getCurrentISTTime();
    const today = formatIST(istNow, "yyyy-MM-dd");
    try {
      const saved = await apiService.submitWfhRequest(wfhReason, wfhStartDate, wfhEndDate, wfhType);
      if (saved.id) setWfhRequestId(saved.id.toString());
      setWfhRequestStatus((saved.status as WfhStatus) || "pending");

      // Clear inputs
      setWfhReason("");
      setWfhType("Full Day");
      setWfhStartDate("");
      setWfhEndDate("");

      Alert.alert("WFH Request Sent", "Waiting for approval from your HR/Manager/Admin.");
    } catch (error: any) {
      const errorMessage = error?.message || error?.detail || "Unable to submit WFH request. Please try again.";
      Alert.alert("WFH Request Failed", errorMessage);
    }
  };

  // Check if WFH is approved for today (within date range)
  const isWfhApprovedForToday = (): boolean => {
    // Use the centralized logic
    return activeWfhToday !== null;
  };

  const wfhApprovedForToday = isWfhApprovedForToday();
  // NEW: Enforce WFH mode when approved
  const enforcedWorkMode = getEnforcedWorkMode(activeWfhToday, workMode);
  const officeModeDisabled = isOfficeModeDisabled(activeWfhToday);
  const workLocationLabel = currentAttendance?.workLocation || (wfhApprovedForToday ? "Work From Home" : (enforcedWorkMode === "wfh" ? "Work From Home" : "Work From Office"));
  const canCheckInForMode = enforcedWorkMode === "office" || wfhApprovedForToday;

  const handleCheckInPress = () => {
    // Admin cannot check-in
    if (isAdmin) {
      Alert.alert("Read-Only Access", "Admin users can view attendance but cannot check in/out.");
      return;
    }
    
    if (enforcedWorkMode === "wfh") {
      // Validate WFH check-in
      const validation = validateWfhCheckIn(activeWfhToday, currentAttendance);
      if (!validation.canCheckIn) {
        Alert.alert("Cannot Check In", validation.reason || "WFH check-in not allowed.");
        return;
      }
    }
    openCamera(true);
  };

  const handleCheckOutPress = () => {
    // Admin cannot check-out
    if (isAdmin) {
      Alert.alert("Read-Only Access", "Admin users can view attendance but cannot check in/out.");
      return;
    }
    
    if (enforcedWorkMode === "wfh") {
      const validation = validateWfhCheckOut(activeWfhToday, currentAttendance);
      if (!validation.canCheckOut) {
        Alert.alert("Cannot Check Out", validation.reason || "WFH check-out not allowed.");
        return;
      }
    }
    setShowCheckoutModal(true);
  };

  const formatTime = (time?: string) => (time ? time : "-");

  // Date Picker Helper Functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateForDisplay = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const handleDateSelect = (day: number) => {
    const selectedDate = formatDateForDisplay(currentMonth.getFullYear(), currentMonth.getMonth(), day);

    if (datePickerMode === "start") {
      setWfhStartDate(selectedDate);
    } else {
      setWfhEndDate(selectedDate);
    }

    setShowDatePicker(false);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarEmptyDay} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateForDisplay(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isSelected = (datePickerMode === "start" && dateStr === wfhStartDate) ||
        (datePickerMode === "end" && dateStr === wfhEndDate);

      days.push(
        <TouchableOpacity
          key={day}
          style={[styles.calendarDay, isSelected && styles.calendarDaySelected]}
          onPress={() => handleDateSelect(day)}
          activeOpacity={0.7}
        >
          <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <Text style={styles.calendarMonthYear}>{monthName}</Text>
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarWeekDays}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <Text key={day} style={styles.calendarWeekDay}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.calendarDays}>{days}</View>
      </View>
    );
  };

  // Camera Screen
  if (cameraVisible) {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar style="light" backgroundColor="transparent" translucent />
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front">
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <LinearGradient colors={["rgba(0,0,0,0.4)", "transparent", "rgba(0,0,0,0.8)"]} locations={[0, 0.3, 1]} style={styles.cameraGradient}>
              <View style={styles.cameraControls}>
                <Text style={styles.cameraTitle}>{isCheckingIn ? "Check-in Selfie" : "Check-out Selfie"}</Text>
                <Text style={styles.cameraSubtitle}>Position your face in the frame</Text>
                <View style={styles.captureButtonContainer}>
                  <TouchableOpacity style={styles.captureButton} onPress={takePicture} activeOpacity={0.8}>
                    <View style={styles.captureInner}>
                      <Ionicons name="camera" size={28} color="#1e40af" />
                    </View>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.cameraCancelBtn} onPress={() => setCameraVisible(false)}>
                  <Text style={styles.cameraCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  const getStatusInfo = () => {
    if (!currentAttendance?.checkInTime) return { status: "not_started", label: "Not Started", color: "#6b7280", bgColor: "#f3f4f6" };
    if (!currentAttendance?.checkOutTime) return { status: "in_progress", label: "Working", color: "#f59e0b", bgColor: "#fef3c7" };
    return { status: "completed", label: "Completed", color: "#22c55e", bgColor: "#dcfce7" };
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: "#ffffff" }]} edges={['top']}>

        {/* Modern White Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={20} color={Colors.headerText} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Attendance</Text>
                <Text style={styles.headerSubtitle}>Track your daily check-ins</Text>
              </View>
              <View style={styles.headerRight}>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                  {statusInfo.status === "in_progress" && <PulseIndicator color={statusInfo.color} />}
                  <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                </View>
              </View>
            </View>

            {/* Date Display Card */}
            <View style={styles.dateCard}>
              <View style={styles.dateIconContainer}>
                <Ionicons name="calendar" size={24} color={Colors.primary} />
              </View>
              <View style={styles.dateInfo}>
                <Text style={styles.dateText}>{formatAttendanceDate(getCurrentISTTime())}</Text>
                <Text style={styles.dayText}>{getDayOfWeek(getCurrentISTTime())}</Text>
              </View>
              <View style={styles.timeDisplay}>
                <Text style={styles.currentTime}>{formatIST(getCurrentISTTime(), "hh:mm")}</Text>
                <Text style={styles.ampm}>{formatIST(getCurrentISTTime(), "a")}</Text>
              </View>
            </View>
          </View>
        </View>

        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* Work Mode Switcher */}
            <View style={styles.workModeSwitcher}>
              <TouchableOpacity
                style={[styles.workModeBtn, enforcedWorkMode === "office" && styles.workModeBtnActive, officeModeDisabled && styles.workModeBtnDisabled]}
                onPress={() => !officeModeDisabled && setWorkMode("office")}
                activeOpacity={officeModeDisabled ? 0.5 : 0.85}
                disabled={officeModeDisabled}
              >
                <Ionicons name="business-outline" size={16} color={officeModeDisabled ? "#cbd5e1" : (enforcedWorkMode === "office" ? "#1e3a8a" : "#64748b")} />
                <Text style={[styles.workModeText, enforcedWorkMode === "office" && styles.workModeTextActive, officeModeDisabled && styles.workModeTextDisabled]}>Office</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.workModeBtn, enforcedWorkMode === "wfh" && styles.workModeBtnActive, wfhApprovedForToday && styles.workModeBtnForced]}
                onPress={() => setWorkMode("wfh")}
                activeOpacity={0.85}
              >
                <Ionicons name="home-outline" size={16} color={wfhApprovedForToday ? "#059669" : (enforcedWorkMode === "wfh" ? "#1e3a8a" : "#64748b")} />
                <Text style={[styles.workModeText, enforcedWorkMode === "wfh" && styles.workModeTextActive, wfhApprovedForToday && styles.workModeTextForced]}>WFH</Text>
              </TouchableOpacity>
            </View>

            {/* WFH Enforcement Notice */}
            {wfhApprovedForToday && (
              <View style={styles.wfhEnforcementNotice}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <Text style={styles.wfhEnforcementText}>WFH Approved: {formatDateRange(wfhStartDate, wfhEndDate)}</Text>
              </View>
            )}

            {/* Admin Read-Only Notice */}
            {isAdmin && (
              <View style={[styles.wfhEnforcementNotice, { backgroundColor: "#fef3c7", borderLeftColor: "#f59e0b" }]}>
                <Ionicons name="eye" size={16} color="#d97706" />
                <Text style={[styles.wfhEnforcementText, { color: "#d97706" }]}>Admin View: Read-only access</Text>
              </View>
            )}

            {/* WFH Request Sub-page */}
            {workMode === "wfh" && (
              <View style={styles.wfhCard}>
                <View style={styles.wfhHeader}>
                  <View style={styles.wfhHeaderLeft}>
                    <View style={styles.wfhIconWrap}>
                      <Ionicons name="laptop-outline" size={20} color="#1e3a8a" />
                    </View>
                    <View>
                      <Text style={styles.wfhTitle}>Work From Home Request</Text>
                      <Text style={styles.wfhSubtitle}>Submit and await approval to check in as WFH</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.wfhStatus,
                    wfhRequestStatus === "approved"
                      ? { backgroundColor: "#dcfce7" }
                      : wfhRequestStatus === "pending"
                        ? { backgroundColor: "#fef3c7" }
                        : { backgroundColor: "#e5e7eb" }
                  ]}>
                    <View style={[
                      styles.wfhStatusDot,
                      wfhRequestStatus === "approved"
                        ? { backgroundColor: "#16a34a" }
                        : wfhRequestStatus === "pending"
                          ? { backgroundColor: "#d97706" }
                          : { backgroundColor: "#6b7280" }
                    ]} />
                    <Text style={styles.wfhStatusText}>
                      {wfhRequestStatus === "approved" ? "Approved" : wfhRequestStatus === "pending" ? "Pending" : "Not Requested"}
                    </Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Reason for WFH <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    placeholder="e.g., Awaiting a delivery or personal constraint"
                    placeholderTextColor="#9ca3af"
                    value={wfhReason}
                    onChangeText={setWfhReason}
                    style={styles.textInput}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                {/* NEW: Advance Notice Information */}
                <View style={styles.advanceNoticeInfo}>
                  <Ionicons name="information-circle" size={16} color="#2563eb" />
                  <Text style={styles.advanceNoticeText}>
                    {getAdvanceNoticeMessage()}
                  </Text>
                </View>

                <View style={styles.dateRangeContainer}>
                  <View style={styles.dateInputWrapper}>
                    <Text style={styles.inputLabel}>Start Date <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity
                      style={styles.dateInputBox}
                      onPress={() => {
                        setDatePickerMode("start");
                        setShowDatePicker(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="calendar" size={18} color="#3b82f6" />
                      <Text style={[styles.dateInput, !wfhStartDate && { color: "#9ca3af" }]}>
                        {wfhStartDate || "YYYY-MM-DD"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateArrow}>
                    <Ionicons name="arrow-forward" size={20} color="#3b82f6" />
                  </View>

                  <View style={styles.dateInputWrapper}>
                    <Text style={styles.inputLabel}>End Date <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity
                      style={styles.dateInputBox}
                      onPress={() => {
                        setDatePickerMode("end");
                        setShowDatePicker(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="calendar" size={18} color="#3b82f6" />
                      <Text style={[styles.dateInput, !wfhEndDate && { color: "#9ca3af" }]}>
                        {wfhEndDate || "YYYY-MM-DD"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>WFH Type <Text style={styles.required}>*</Text></Text>
                  <View style={styles.typeSwitcherContainer}>
                    <TouchableOpacity
                      style={[styles.typeOption, wfhType === "Full Day" && styles.typeOptionActive]}
                      onPress={() => setWfhType("Full Day")}
                    >
                      <Ionicons name={wfhType === "Full Day" ? "radio-button-on" : "radio-button-off"} size={18} color={wfhType === "Full Day" ? "#fff" : "#64748b"} />
                      <Text style={[styles.typeOptionText, wfhType === "Full Day" && styles.typeOptionTextActive]}>Full Day</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeOption, wfhType === "Half Day" && styles.typeOptionActive]}
                      onPress={() => setWfhType("Half Day")}
                    >
                      <Ionicons name={wfhType === "Half Day" ? "radio-button-on" : "radio-button-off"} size={18} color={wfhType === "Half Day" ? "#fff" : "#64748b"} />
                      <Text style={[styles.typeOptionText, wfhType === "Half Day" && styles.typeOptionTextActive]}>Half Day</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Date Range Summary */}
                {wfhStartDate && wfhEndDate && (
                  <View style={styles.dateRangeSummary}>
                    <Ionicons name="calendar" size={16} color="#3b82f6" />
                    <Text style={styles.dateRangeSummaryText}>
                      {wfhStartDate} to {wfhEndDate}
                    </Text>
                  </View>
                )}

                {/* WFH Enforcement Info */}
                {wfhRequestStatus === "approved" && wfhStartDate && wfhEndDate && (
                  <View style={styles.wfhEnforcedInfo}>
                    <Ionicons name="shield-checkmark" size={16} color="#059669" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.wfhEnforcedTitle}>WFH Enforced</Text>
                      <Text style={styles.wfhEnforcedSubtitle}>
                        Automatically applied for all days in the approved range
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.wfhActions}>
                  <TouchableOpacity
                    style={[styles.wfhActionBtn, { backgroundColor: "#f1f5f9" }]}
                    onPress={async () => {
                      setWfhReason("");
                      setWfhStartDate("");
                      setWfhEndDate("");
                      await loadWfhRequestForToday();
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="refresh" size={18} color="#475569" />
                    <Text style={styles.wfhActionText}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.wfhActionBtn,
                      { backgroundColor: wfhRequestStatus === "approved" ? "#22c55e" : "#1d4ed8" },
                      wfhRequestStatus === "pending" && { opacity: 0.6 }
                    ]}
                    onPress={submitWfhRequest}
                    disabled={wfhRequestStatus === "pending"}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={wfhRequestStatus === "approved" ? "shield-checkmark" : "send"} size={18} color="#fff" />
                    <Text style={[styles.wfhActionText, { color: "#fff" }]}>
                      {wfhRequestStatus === "approved" ? "WFH Approved" : wfhRequestStatus === "pending" ? "Requesting..." : "Submit WFH Request"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Location Card */}
            {location && (
              <View style={styles.locationCard}>
                <LinearGradient colors={["#eff6ff", "#dbeafe"]} style={styles.locationGradient}>
                  <View style={styles.locationHeader}>
                    <View style={styles.locationIconBg}>
                      <Ionicons name="location" size={18} color="#2563eb" />
                    </View>
                    <View style={styles.locationInfo}>
                      <Text style={styles.locationTitle}>Current Location</Text>
                      <Text style={styles.locationAddress} numberOfLines={2}>{locationAddress || "Detecting..."}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* Online/Offline Status Toggle - Shows only when checked in and not checked out */}
            {/* For regular employees: show their own status */}
            {/* For HR/Manager: show the status (same logic applies) */}
            {user?.id && (
              <OnlineStatusToggle
                userId={parseInt(user.id)}
                attendanceId={currentAttendance?.id ? parseInt(currentAttendance.id) : null}
                isCheckedIn={!!currentAttendance?.checkInTime}
                isCheckedOut={!!currentAttendance?.checkOutTime}
                onStatusChange={(isOnline, summary) => {
                  console.log(`Status changed to ${isOnline ? 'Online' : 'Offline'}`, summary);
                }}
              />
            )}

            {/* Office Hours Card */}
            {officeHours && (
              <View style={styles.officeHoursCard}>
                <View style={styles.officeHoursHeader}>
                  <Ionicons name="time" size={18} color="#3b82f6" />
                  <Text style={styles.officeHoursTitle}>Office Hours</Text>
                </View>
                <View style={styles.officeHoursContent}>
                  <View style={styles.officeHourRow}>
                    <View style={styles.officeHourItem}>
                      <Text style={styles.officeHourLabel}>Start Time</Text>
                      <Text style={styles.officeHourValue}>{officeHours.start_time}</Text>
                      <Text style={styles.officeHourGrace}>Grace: {officeHours.check_in_grace_minutes}min</Text>
                    </View>
                    <View style={styles.officeHourDivider} />
                    <View style={styles.officeHourItem}>
                      <Text style={styles.officeHourLabel}>End Time</Text>
                      <Text style={styles.officeHourValue}>{officeHours.end_time}</Text>
                      <Text style={styles.officeHourGrace}>Grace: {officeHours.check_out_grace_minutes}min</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Today's Status Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusCardHeader}>
                <Text style={styles.sectionTitle}>Today's Status</Text>
              </View>
              <View style={[styles.workLocationBadge, workLocationLabel === "Work From Home" ? { backgroundColor: "#f0f9ff" } : { backgroundColor: "#f0fdf4" }]}>
                <Ionicons name={workLocationLabel === "Work From Home" ? "home" : "business"} size={14} color={workLocationLabel === "Work From Home" ? "#1e3a8a" : "#16a34a"} />
                <Text style={[styles.workLocationText, workLocationLabel === "Work From Home" ? { color: "#1e3a8a" } : { color: "#166534" }]}>
                  {workLocationLabel}
                </Text>
              </View>

              {currentAttendance ? (
                <>
                  <View style={styles.timeCardsContainer}>
                    {/* Check-in Card */}
                    <View style={[styles.timeCard, styles.checkInCard]}>
                      <View style={styles.timeCardIcon}>
                        <Ionicons name="log-in" size={20} color="#22c55e" />
                      </View>
                      <Text style={styles.timeCardLabel}>Check-in</Text>
                      <Text style={styles.timeCardValue}>{formatTime(currentAttendance.checkInTime)}</Text>
                      {checkInStatus && (
                        <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(checkInStatus.checkInStatus).bg }]}>
                          <Text style={[styles.statusBadgeSmallText, { color: getStatusColor(checkInStatus.checkInStatus).text }]}>
                            {getStatusColor(checkInStatus.checkInStatus).label}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Check-out Card */}
                    <View style={[styles.timeCard, styles.checkOutCard]}>
                      <View style={styles.timeCardIcon}>
                        <Ionicons name="log-out" size={20} color={currentAttendance.checkOutTime ? "#ef4444" : "#9ca3af"} />
                      </View>
                      <Text style={styles.timeCardLabel}>Check-out</Text>
                      <Text style={[styles.timeCardValue, !currentAttendance.checkOutTime && styles.pendingText]}>
                        {currentAttendance.checkOutTime ? formatTime(currentAttendance.checkOutTime) : "Pending"}
                      </Text>
                      {currentAttendance.checkOutTime && checkOutStatus && (
                        <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(checkOutStatus.checkOutStatus).bg }]}>
                          <Text style={[styles.statusBadgeSmallText, { color: getStatusColor(checkOutStatus.checkOutStatus).text }]}>
                            {getStatusColor(checkOutStatus.checkOutStatus).label}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Status Messages */}
                  {(checkInStatus || checkOutStatus) && (
                    <View style={styles.statusMessagesContainer}>
                      {checkInStatus && (
                        <View style={styles.statusMessage}>
                          <Ionicons name={checkInStatus.checkInStatus === "late" ? "alert-circle" : "checkmark-circle"} size={16} color={getStatusColor(checkInStatus.checkInStatus).text} />
                          <Text style={[styles.statusMessageText, { color: getStatusColor(checkInStatus.checkInStatus).text }]}>
                            {checkInStatus.message}
                          </Text>
                        </View>
                      )}
                      {currentAttendance.checkOutTime && checkOutStatus && (
                        <View style={styles.statusMessage}>
                          <Ionicons name={checkOutStatus.checkOutStatus === "early" ? "alert-circle" : "checkmark-circle"} size={16} color={getStatusColor(checkOutStatus.checkOutStatus).text} />
                          <Text style={[styles.statusMessageText, { color: getStatusColor(checkOutStatus.checkOutStatus).text }]}>
                            {checkOutStatus.message}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <View style={styles.emptyStateIcon}>
                    <MaterialCommunityIcons name="clock-outline" size={48} color="#d1d5db" />
                  </View>
                  <Text style={styles.emptyStateTitle}>No Record Today</Text>
                  <Text style={styles.emptyStateSubtitle}>Check in to start tracking your attendance</Text>
                </View>
              )}

              {/* Selfies Section */}
              {currentAttendance && (currentAttendance.checkInSelfie || currentAttendance.checkOutSelfie) && (
                <View style={styles.selfiesSection}>
                  <Text style={styles.selfiesSectionTitle}>Attendance Selfies</Text>
                  <View style={styles.selfiesGrid}>
                    <View style={styles.selfieCard}>
                      <Text style={styles.selfieLabel}>Check-in</Text>
                      {currentAttendance.checkInSelfie && buildSelfieUrl(currentAttendance.checkInSelfie) ? (
                        <RNImage source={{ uri: buildSelfieUrl(currentAttendance.checkInSelfie)! }} style={styles.selfieImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.selfiePlaceholder}>
                          <Ionicons name="person" size={24} color="#d1d5db" />
                        </View>
                      )}
                    </View>
                    <View style={styles.selfieCard}>
                      <Text style={styles.selfieLabel}>Check-out</Text>
                      {currentAttendance.checkOutSelfie && buildSelfieUrl(currentAttendance.checkOutSelfie) ? (
                        <RNImage source={{ uri: buildSelfieUrl(currentAttendance.checkOutSelfie)! }} style={styles.selfieImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.selfiePlaceholder}>
                          <Ionicons name="person" size={24} color="#d1d5db" />
                          <Text style={styles.selfiePlaceholderText}>{currentAttendance.checkOutTime ? "N/A" : "Pending"}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Work Summary */}
              {currentAttendance?.checkOutTime && currentAttendance.workSummary && (
                <View style={styles.workSummarySection}>
                  <View style={styles.workSummaryHeader}>
                    <Ionicons name="document-text" size={18} color="#3b82f6" />
                    <Text style={styles.workSummaryTitle}>Work Summary</Text>
                  </View>
                  <Text style={styles.workSummaryText}>{currentAttendance.workSummary}</Text>
                  {currentAttendance.workReportFileName && (
                    <View style={styles.attachmentBadge}>
                      <Ionicons name="attach" size={14} color="#059669" />
                      <Text style={styles.attachmentText}>{currentAttendance.workReportFileName}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Action Button */}
              <View style={styles.actionContainer}>
                {isAdmin ? (
                  /* Admin: Read-only - no action buttons */
                  <View style={[styles.completedBadge, { backgroundColor: "#fef3c7" }]}>
                    <Ionicons name="eye" size={24} color="#d97706" />
                    <Text style={[styles.completedText, { color: "#d97706" }]}>View Only Mode</Text>
                  </View>
                ) : !currentAttendance?.checkInTime ? (
                  <TouchableOpacity
                    style={[styles.checkInButton, !canCheckInForMode && enforcedWorkMode === "wfh" && { opacity: 0.6 }]}
                    onPress={handleCheckInPress}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.actionButtonGradient}>
                      <Ionicons name="finger-print" size={24} color="#fff" />
                      <Text style={styles.actionButtonText}>Check In</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : !currentAttendance?.checkOutTime ? (
                  <TouchableOpacity
                    style={[styles.checkOutButton, !canCheckInForMode && enforcedWorkMode === "wfh" && { opacity: 0.6 }]}
                    onPress={handleCheckOutPress}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.actionButtonGradient}>
                      <Ionicons name="exit" size={24} color="#fff" />
                      <Text style={styles.actionButtonText}>Check Out</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    <Text style={styles.completedText}>Attendance Completed</Text>
                  </View>
                )}
              </View>
            </View>


          </ScrollView>
        </Animated.View>

        {/* Checkout Modal */}
        <Modal visible={showCheckoutModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <LinearGradient colors={["#3b82f6", "#1e40af"]} style={styles.modalHeader}>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { setShowCheckoutModal(false); setWorkReportFile(null); }}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Ionicons name="exit-outline" size={40} color="#fff" />
                <Text style={styles.modalTitle}>Check Out</Text>
                <Text style={styles.modalSubtitle}>Complete your day with a summary</Text>
              </LinearGradient>

              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Work Summary <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    placeholder="What did you accomplish today?"
                    placeholderTextColor="#9ca3af"
                    value={todaysWork}
                    onChangeText={setTodaysWork}
                    style={styles.textInput}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Attach Report <Text style={styles.optional}>(Optional)</Text></Text>
                  <TouchableOpacity style={styles.fileUploadBtn} onPress={pickWorkReportFile} activeOpacity={0.7}>
                    <View style={styles.fileUploadIcon}>
                      <Ionicons name="cloud-upload" size={24} color="#3b82f6" />
                    </View>
                    <View style={styles.fileUploadInfo}>
                      <Text style={styles.fileUploadTitle}>{workReportFile ? "File Selected" : "Upload PDF or Image"}</Text>
                      <Text style={styles.fileUploadSubtitle}>{workReportFile ? workReportFile.name : "Tap to browse files"}</Text>
                    </View>
                    {workReportFile && (
                      <TouchableOpacity onPress={() => setWorkReportFile(null)} style={styles.fileRemoveBtn}>
                        <Ionicons name="close-circle" size={22} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowCheckoutModal(false); setWorkReportFile(null); }}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, !todaysWork.trim() && styles.modalConfirmBtnDisabled]}
                    onPress={confirmCheckOut}
                    disabled={!todaysWork.trim()}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={todaysWork.trim() ? ["#22c55e", "#16a34a"] : ["#d1d5db", "#9ca3af"]} style={styles.modalConfirmGradient}>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.modalConfirmText}>Proceed</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          </View>
        )}

        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>
                  {datePickerMode === "start" ? "Select Start Date" : "Select End Date"}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
              </View>

              {renderCalendar()}

              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  style={[styles.datePickerBtn, { backgroundColor: "#f1f5f9" }]}
                  onPress={() => setShowDatePicker(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.datePickerBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  
  // Modern White Header Styles
  headerContainer: {
    backgroundColor: Colors.surface,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.xl },
  backButton: {
    width: 40, height: 40, borderRadius: BorderRadius.md, backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e2e8f0",
  },
  headerTitleContainer: { flex: 1, marginLeft: Spacing.md },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.headerText },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  statusBadge: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: BorderRadius.sm, gap: 6,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  dateCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, 
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.card,
  },
  dateIconContainer: {
    width: 48, height: 48, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  dateInfo: { flex: 1, marginLeft: 14 },
  dateText: { fontSize: 16, fontWeight: "700", color: Colors.headerText },
  dayText: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  timeDisplay: { flexDirection: "row", alignItems: "baseline" },
  currentTime: { fontSize: 28, fontWeight: "700", color: Colors.primaryDark },
  ampm: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary, marginLeft: 4 },

  contentContainer: { flex: 1, backgroundColor: Colors.background, marginTop: 0 },
  scrollContent: { padding: Spacing.xl, paddingBottom: 40 },

  locationCard: { marginBottom: 16, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#dbeafe" },
  locationGradient: { padding: 16 },
  locationHeader: { flexDirection: "row", alignItems: "center" },
  locationIconBg: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  locationInfo: { flex: 1, marginLeft: 12 },
  locationTitle: { fontSize: 12, fontWeight: "600", color: "#3b82f6", textTransform: "uppercase", letterSpacing: 0.5 },
  locationAddress: { fontSize: 14, color: "#1e3a8a", fontWeight: "500", marginTop: 2 },

  workModeSwitcher: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  workModeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  workModeBtnActive: { backgroundColor: "#e0ecff" },
  workModeBtnDisabled: { opacity: 0.5, backgroundColor: "#f1f5f9" },
  workModeBtnForced: { backgroundColor: "#dcfce7" },
  workModeText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  workModeTextActive: { color: "#1e3a8a" },
  workModeTextDisabled: { color: "#cbd5e1" },
  workModeTextForced: { color: "#059669" },
  wfhEnforcementNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#dcfce7",
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#059669",
    marginBottom: 16,
  },
  wfhEnforcementText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
    flex: 1,
  },

  wfhCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", padding: 14, marginBottom: 16 },
  wfhHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  wfhHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  wfhIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#e0ecff", alignItems: "center", justifyContent: "center" },
  wfhTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  wfhSubtitle: { fontSize: 12, color: "#6b7280" },
  wfhStatus: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  wfhStatusDot: { width: 8, height: 8, borderRadius: 4 },
  wfhStatusText: { fontSize: 12, fontWeight: "700", color: "#111827" },
  dateRangeSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
  },
  dateRangeSummaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e40af",
  },
  wfhEnforcedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#dcfce7",
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#059669",
  },
  wfhEnforcedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669",
  },
  wfhEnforcedSubtitle: {
    fontSize: 11,
    color: "#047857",
    marginTop: 2,
  },
  wfhActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  wfhActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  wfhActionText: { fontSize: 14, fontWeight: "700", color: "#111827" },

  statusCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.card,
  },
  statusCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: Colors.headerText },
  statusChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.md, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusChipText: { fontSize: 12, fontWeight: "600" },

  timeCardsContainer: { flexDirection: "row", gap: 12 },
  timeCard: {
    flex: 1, padding: 16, borderRadius: 16, alignItems: "center",
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  checkInCard: { backgroundColor: "#f0fdf4" },
  checkOutCard: { backgroundColor: "#fef2f2" },
  timeCardIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  timeCardLabel: { fontSize: 12, color: "#64748b", fontWeight: "500", marginBottom: 4 },
  timeCardValue: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  pendingText: { color: "#9ca3af", fontStyle: "italic" },
  workLocationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  workLocationText: { fontSize: 13, fontWeight: "700" },

  emptyStateContainer: { alignItems: "center", paddingVertical: 32 },
  emptyStateIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#f1f5f9",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyStateTitle: { fontSize: 16, fontWeight: "600", color: "#475569" },
  emptyStateSubtitle: { fontSize: 13, color: "#94a3b8", marginTop: 4, textAlign: "center" },

  selfiesSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  selfiesSectionTitle: { fontSize: 14, fontWeight: "600", color: "#475569", marginBottom: 12 },
  selfiesGrid: { flexDirection: "row", gap: 16 },
  selfieCard: { flex: 1, alignItems: "center" },
  selfieLabel: { fontSize: 11, fontWeight: "600", color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  selfieImage: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: "#22c55e" },
  selfiePlaceholder: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "#f1f5f9",
    borderWidth: 2, borderColor: "#e2e8f0", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  selfiePlaceholderText: { fontSize: 10, color: "#94a3b8", marginTop: 2 },

  workSummarySection: { marginTop: 20, padding: 16, backgroundColor: "#f0f9ff", borderRadius: 12, borderWidth: 1, borderColor: "#bfdbfe" },
  workSummaryHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  workSummaryTitle: { fontSize: 14, fontWeight: "600", color: "#1e40af" },
  workSummaryText: { fontSize: 14, color: "#334155", lineHeight: 20 },
  attachmentBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: "#bfdbfe",
  },
  attachmentText: { fontSize: 12, color: "#059669", fontWeight: "500" },

  actionContainer: { marginTop: 24 },
  checkInButton: { borderRadius: 16, overflow: "hidden" },
  checkOutButton: { borderRadius: 16, overflow: "hidden" },
  actionButtonGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 18, gap: 10,
  },
  actionButtonText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  completedBadge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 16, backgroundColor: "#f0fdf4", borderRadius: 16,
    borderWidth: 2, borderColor: "#bbf7d0", gap: 10,
  },
  completedText: { fontSize: 16, fontWeight: "600", color: "#16a34a" },

  historySection: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl, marginTop: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.card,
  },
  historySectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  historyCount: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
  historyList: {},
  historyItem: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: "#f1f5f9",
  },
  historyItemFirst: { borderTopWidth: 0 },
  historyDateBadge: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: "#f1f5f9",
    alignItems: "center", justifyContent: "center",
  },
  historyDateDay: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  historyDateMonth: { fontSize: 10, fontWeight: "600", color: "#64748b", textTransform: "uppercase" },
  historyDetails: { flex: 1, marginLeft: 14 },
  historyTimeRow: { flexDirection: "row", alignItems: "center" },
  historyTimeBlock: { flexDirection: "row", alignItems: "center", gap: 4 },
  historyTimeDivider: { width: 20, height: 1, backgroundColor: "#e2e8f0", marginHorizontal: 8 },
  historyTimeText: { fontSize: 13, fontWeight: "600", color: "#334155" },
  historyLocationRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 },
  historyLocationText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  historyWorkSummary: { fontSize: 12, color: "#64748b", marginTop: 4 },
  historyStatusDot: { width: 10, height: 10, borderRadius: 5 },
  emptyHistory: { alignItems: "center", paddingVertical: 32 },
  emptyHistoryText: { fontSize: 14, color: "#94a3b8", marginTop: 12 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  modalContainer: { width: "100%", maxWidth: 400, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, overflow: "hidden", ...Shadows.modal },
  modalHeader: { alignItems: "center", paddingVertical: 28, paddingHorizontal: Spacing.xl, position: "relative" },
  modalCloseBtn: { position: "absolute", top: Spacing.lg, right: Spacing.lg, padding: 4 },
  modalTitle: { fontSize: 22, fontWeight: "700", color: "#fff", marginTop: Spacing.md },
  modalSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4, textAlign: "center" },
  modalBody: { padding: Spacing.xxl },
  inputGroup: { marginBottom: Spacing.xl },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#334155", marginBottom: Spacing.sm },
  required: { color: Colors.error },
  optional: { color: Colors.textTertiary, fontWeight: "400" },
  textInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg,
    minHeight: 100, fontSize: 15, color: Colors.text, backgroundColor: "#f9fafb",
  },
  dateRangeContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 20,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateInputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
    gap: 10,
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
  },
  dateArrow: {
    paddingBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fileUploadBtn: {
    flexDirection: "row", alignItems: "center", padding: 16,
    borderWidth: 2, borderColor: "#e2e8f0", borderRadius: 14, borderStyle: "dashed",
    backgroundColor: "#f8fafc",
  },
  fileUploadIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: "#eff6ff",
    alignItems: "center", justifyContent: "center",
  },
  fileUploadInfo: { flex: 1, marginLeft: 14 },
  fileUploadTitle: { fontSize: 14, fontWeight: "600", color: "#334155" },
  fileUploadSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  fileRemoveBtn: { padding: 4 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: "#f1f5f9",
    alignItems: "center", justifyContent: "center",
  },
  modalCancelText: { fontSize: 16, fontWeight: "600", color: "#475569" },
  modalConfirmBtn: { flex: 1, borderRadius: 14, overflow: "hidden" },
  modalConfirmBtnDisabled: { opacity: 0.6 },
  modalConfirmGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 16, gap: 8,
  },
  modalConfirmText: { fontSize: 16, fontWeight: "600", color: "#fff" },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center", alignItems: "center",
  },
  loadingCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  loadingText: { fontSize: 16, fontWeight: "600", color: "#475569", marginTop: 16 },

  cameraGradient: { flex: 1, justifyContent: "flex-end" },
  cameraControls: { alignItems: "center", paddingBottom: 50 },
  cameraTitle: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 4 },
  cameraSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 30 },
  captureButtonContainer: { marginBottom: 20 },
  captureButton: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: "#fff",
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)",
  },
  captureInner: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  cameraCancelBtn: { paddingVertical: 12, paddingHorizontal: 32 },
  cameraCancelText: { fontSize: 16, fontWeight: "600", color: "#fff" },

  pulseContainer: { width: 12, height: 12, alignItems: "center", justifyContent: "center" },
  pulseOuter: { position: "absolute", width: 12, height: 12, borderRadius: 6 },
  pulseInner: { width: 8, height: 8, borderRadius: 4 },

  // Office Hours Styles
  officeHoursCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 16,
    marginBottom: 16,
  },
  officeHoursHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  officeHoursTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e40af",
  },
  officeHoursContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
  },
  officeHourRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  officeHourItem: {
    flex: 1,
    alignItems: "center",
  },
  officeHourLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  officeHourValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a8a",
  },
  officeHourGrace: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },
  officeHourDivider: {
    width: 1,
    height: 50,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 12,
  },

  // Status Badge Styles
  statusBadgeSmall: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "center",
  },
  statusBadgeSmallText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Status Messages Container
  statusMessagesContainer: {
    marginTop: 12,
    gap: 8,
  },
  statusMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
  },
  statusMessageText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },

  // Date Picker Styles
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  datePickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  calendarContainer: {
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  calendarMonthYear: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  calendarWeekDays: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  calendarWeekDay: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    width: "14.28%",
    textAlign: "center",
  },
  calendarDays: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 8,
  },
  calendarDaySelected: {
    backgroundColor: "#3b82f6",
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  calendarDayTextSelected: {
    color: "#fff",
  },
  calendarEmptyDay: {
    width: "14.28%",
    aspectRatio: 1,
  },
  datePickerActions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  datePickerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
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
  // NEW: Advance Notice Info Styles
  advanceNoticeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#2563eb",
    marginBottom: 16,
  },
  advanceNoticeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e40af",
    flex: 1,
    lineHeight: 16,
  },
});
