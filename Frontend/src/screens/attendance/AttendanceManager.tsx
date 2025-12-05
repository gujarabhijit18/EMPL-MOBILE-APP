import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar, setStatusBarBackgroundColor, setStatusBarStyle } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import OfficeHoursScreen from "../../components/ui/OfficeHoursScreen";
import { GeoLocation } from "../../types";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import { API_CONFIG } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../lib/api";

const { width } = Dimensions.get("window");

// IST Timezone Helper Functions
const getCurrentISTTime = (): Date => new Date();

const convertToIST = (dateString: string | Date): Date => {
  if (dateString instanceof Date) return dateString;
  if (!dateString.includes("Z") && !dateString.includes("+")) {
    const utcDate = new Date(dateString + "Z");
    if (!isNaN(utcDate.getTime())) return utcDate;
  }
  return new Date(dateString);
};

const formatTimeToIST = (dateString: string | Date | undefined | null): string => {
  if (!dateString) return "-";
  try {
    const date = convertToIST(dateString);
    if (isNaN(date.getTime())) return "-";
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
  } catch {
    return "-";
  }
};

const getISTDateString = (dateString: string | Date): string => {
  try {
    const date = convertToIST(dateString);
    if (isNaN(date.getTime())) return format(new Date(), "yyyy-MM-dd");
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return format(new Date(), "yyyy-MM-dd");
  }
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
};

const AttendanceManager: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All Roles");
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [roleSheetVisible, setRoleSheetVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [viewMode, setViewMode] = useState<"self" | "employee">(
    user?.role === "hr" || user?.role === "manager" || user?.role === "admin" ? "employee" : "self"
  );
  const [adminTab, setAdminTab] = useState<"records" | "officeHours">("records");
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
  const [permission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // Export Modal States
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [pdfExportModalVisible, setPdfExportModalVisible] = useState(false);
  const quickFilterOptions = ["Today", "Yesterday", "Last 7 Days", "This Month", "Custom Date Range"];
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>("Custom Date Range");
  const [exportStartDate, setExportStartDate] = useState<Date | null>(null);
  const [exportEndDate, setExportEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [iosDatePickerVisible, setIosDatePickerVisible] = useState(false);
  const [iosDatePickerField, setIosDatePickerField] = useState<"start" | "end">("start");
  const [tempExportDate, setTempExportDate] = useState(new Date());
  const [employeeFilter, setEmployeeFilter] = useState<"all" | "specific">("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();

  // Set status bar to match header color
  useEffect(() => {
    if (Platform.OS === "android") {
      setStatusBarBackgroundColor("#f8fafc", false);
    }
    setStatusBarStyle("dark");
  }, []);

  useEffect(() => {
    if (viewMode === "self") {
      loadSelfAttendanceData();
      requestPermissions();
    } else {
      loadEmployeeAttendanceData();
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "employee") loadEmployeeAttendanceData();
  }, [selectedDate]);

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
      const today = format(getCurrentISTTime(), "yyyy-MM-dd");
      const transformedData: SelfAttendanceRecord[] = data.map((record: any) => ({
        id: record.attendance_id.toString(),
        date: getISTDateString(record.check_in),
        checkInTime: formatTimeToIST(record.check_in),
        checkOutTime: record.check_out ? formatTimeToIST(record.check_out) : undefined,
        status: record.status || "present",
        checkInLocation: record.gps_location,
        checkOutLocation: record.check_out ? record.gps_location : undefined,
        selfie: record.selfie,
      }));
      setSelfAttendanceHistory(transformedData);
      setCurrentAttendance(transformedData.find((r) => r.date === today) || null);
    } catch (error: any) {
      Alert.alert("Error", "Failed to load attendance data.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployeeAttendanceData = async () => {
    try {
      setIsLoading(true);
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const data = await apiService.getAllAttendance(dateStr);
      const baseUrl = API_CONFIG.getApiBaseUrl();

      console.log("📊 Raw attendance data:", JSON.stringify(data, null, 2));

      const transformedData = data.map((record: any) => {
        // Process selfie URLs - check all possible field names
        let checkInSelfie = record.checkInSelfie || record.selfie || null;
        let checkOutSelfie = record.checkOutSelfie || null;

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

        const transformedRecord = {
          id: record.attendance_id || record.id,
          user_id: record.user_id,
          name: displayName,
          employeeId: displayEmpId,
          department: displayDept,
          email: displayEmail,
          check_in: formatTimeToIST(record.check_in),
          check_out: record.check_out ? formatTimeToIST(record.check_out) : "",
          location: locationText,
          selfie: checkInSelfie,
          checkOutSelfie: checkOutSelfie,
          status: status,
          hours: hoursWorked,
          role: userRole,
          date: record.check_in ? getISTDateString(record.check_in) : dateStr,
          designation: record.designation || "",
          profile_photo: record.profile_photo || null,
          workSummary: record.work_summary || record.workSummary || "",
        };

        console.log("📋 Transformed record:", transformedRecord.name, transformedRecord.role, transformedRecord.department);
        return transformedRecord;
      });

      const currentUserRole = user?.role?.toLowerCase();
      const currentUserDepartment = user?.department;
      let filteredByRole: any[];

      if (currentUserRole === "admin") {
        // Admin can see HR, Manager, Team Lead, and Employee attendance across all departments
        filteredByRole = transformedData.filter((r: any) => 
          r.role === "HR" || r.role === "Manager" || r.role === "Team Lead" || r.role === "Employee"
        );
      } else if (currentUserRole === "hr" || currentUserRole === "manager") {
        filteredByRole = transformedData.filter((r: any) => {
          const isTeamOrEmployee = r.role === "Team Lead" || r.role === "Employee";
          const isSameDepartment = !currentUserDepartment || r.department === currentUserDepartment;
          return isTeamOrEmployee && isSameDepartment;
        });
      } else {
        filteredByRole = [];
      }

      setAttendanceRecords(filteredByRole);
      setFilteredRecords(filteredByRole);
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
      } catch {}

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
      const latestLocation = hasLocationPermission ? await fetchAndSetLocation() : null;
      const latestGeo = latestLocation?.geoLocation || location;
      const gpsLocationString = latestGeo ? `${latestGeo.latitude},${latestGeo.longitude}` : "0,0";
      const base64Image = await FileSystem.readAsStringAsync(photoUri, { encoding: FileSystem.EncodingType.Base64 });

      if (isCheckingIn) {
        const response = await apiService.checkIn(parseInt(user.id), gpsLocationString, base64Image);
        const istNow = getCurrentISTTime();
        const record: SelfAttendanceRecord = {
          id: response.attendance_id.toString(),
          date: format(istNow, "yyyy-MM-dd"),
          checkInTime: formatTimeToIST(istNow),
          checkInLocation: latestGeo || gpsLocationString,
          selfie: photoUri,
          status: "present",
        };
        setCurrentAttendance(record);
        setSelfAttendanceHistory((prev) => [record, ...prev]);
        Alert.alert("✅ Checked In", "Successfully marked attendance!");
      } else if (currentAttendance) {
        await apiService.checkOut(parseInt(user.id), gpsLocationString, base64Image, todaysWork || "Completed daily tasks", workReportFile);
        const istNow = getCurrentISTTime();
        const updated: SelfAttendanceRecord = { ...currentAttendance, checkOutTime: formatTimeToIST(istNow), checkOutLocation: latestGeo || gpsLocationString };
        setCurrentAttendance(updated);
        setSelfAttendanceHistory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setTodaysWork("");
        setWorkReportFile(null);
        Alert.alert("✅ Checked Out", "Great work today!");
      }
      await loadSelfAttendanceData();
    } catch (error: any) {
      Alert.alert("Attendance Error", error.message || "Unable to submit attendance.");
    } finally {
      setIsLoading(false);
    }
  };

  const pickWorkReportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        setWorkReportFile({ uri: file.uri, name: file.name, type: file.mimeType || "application/pdf" });
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

  const filterExportRecords = () => {
    const startStr = exportStartDate ? format(exportStartDate, "yyyy-MM-dd") : null;
    const endStr = exportEndDate ? format(exportEndDate, "yyyy-MM-dd") : null;
    return attendanceRecords.filter((r) => {
      const inRange = (!startStr || r.date >= startStr) && (!endStr || r.date <= endStr);
      const deptOk = selectedDepartment ? r.department === selectedDepartment : true;
      const empOk = employeeFilter === "specific" ? r.employeeId === selectedEmployeeId : true;
      return inRange && deptOk && empOk;
    });
  };

  const onExportCsv = async () => {
    try {
      setIsLoading(true);
      const recordsToExport = filterExportRecords();
      if (recordsToExport.length === 0) {
        Alert.alert("No Data", "No attendance records found.");
        return;
      }
      await apiService.downloadAttendanceCSV(undefined, exportStartDate ? format(exportStartDate, "yyyy-MM-dd") : undefined, exportEndDate ? format(exportEndDate, "yyyy-MM-dd") : undefined, selectedDepartment || undefined, employeeFilter === "specific" ? selectedEmployeeId : undefined);
      Alert.alert("Success", `CSV exported! (${recordsToExport.length} records)`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to export CSV");
    } finally {
      setIsLoading(false);
    }
  };

  const onExportPdf = async () => {
    try {
      setIsLoading(true);
      const recordsToExport = filterExportRecords();
      if (recordsToExport.length === 0) {
        Alert.alert("No Data", "No attendance records found.");
        return;
      }
      await apiService.downloadAttendancePDF(undefined, exportStartDate ? format(exportStartDate, "yyyy-MM-dd") : undefined, exportEndDate ? format(exportEndDate, "yyyy-MM-dd") : undefined, selectedDepartment || undefined, employeeFilter === "specific" ? selectedEmployeeId : undefined);
      Alert.alert("Success", `PDF exported! (${recordsToExport.length} records)`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to export PDF");
    } finally {
      setIsLoading(false);
    }
  };

  const totalEmployees = attendanceRecords.length;
  const presentToday = attendanceRecords.filter((emp) => emp.check_in && emp.status === "present").length;
  const lateArrivals = attendanceRecords.filter((emp) => emp.status === "late").length;

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
            <Text style={styles.dateBadgeText}>{format(new Date(), "EEEE, MMM d, yyyy")}</Text>
          </View>
        )}

        {/* Export Buttons for Admin */}
        {viewMode === "employee" && user?.role === "admin" && (
          <View style={styles.exportRow}>
            <TouchableOpacity style={styles.exportBtn} onPress={() => setExportModalVisible(true)}>
              <Ionicons name="download-outline" size={16} color="#3b82f6" />
              <Text style={styles.exportBtnText}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={() => setPdfExportModalVisible(true)}>
              <Ionicons name="document-text-outline" size={16} color="#3b82f6" />
              <Text style={styles.exportBtnText}>PDF</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* Stats Cards for Admin */}
      {viewMode === "employee" && user?.role === "admin" && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.statGradient}>
              <Ionicons name="people" size={24} color="#fff" />
              <Text style={styles.statValue}>{totalEmployees}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </LinearGradient>
          </View>
          <View style={styles.statCard}>
            <LinearGradient colors={["#10b981", "#059669"]} style={styles.statGradient}>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.statValue}>{presentToday}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </LinearGradient>
          </View>
          <View style={styles.statCard}>
            <LinearGradient colors={["#f59e0b", "#d97706"]} style={styles.statGradient}>
              <Ionicons name="time" size={24} color="#fff" />
              <Text style={styles.statValue}>{lateArrivals}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </LinearGradient>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={scrollEventThrottle}>
        {/* Admin Tab Toggle */}
        {viewMode === "employee" && user?.role === "admin" && (
          <View style={styles.adminTabContainer}>
            <TouchableOpacity style={[styles.adminTab, adminTab === "records" && styles.adminTabActive]} onPress={() => setAdminTab("records")}>
              <Ionicons name="list-outline" size={18} color={adminTab === "records" ? "#fff" : "#3b82f6"} />
              <Text style={[styles.adminTabText, adminTab === "records" && styles.adminTabTextActive]}>Records</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.adminTab, adminTab === "officeHours" && styles.adminTabActive]} onPress={() => setAdminTab("officeHours")}>
              <Ionicons name="time-outline" size={18} color={adminTab === "officeHours" ? "#fff" : "#3b82f6"} />
              <Text style={[styles.adminTabText, adminTab === "officeHours" && styles.adminTabTextActive]}>Office Hours</Text>
            </TouchableOpacity>
          </View>
        )}

        {user?.role === "admin" && adminTab === "officeHours" ? (
          <OfficeHoursScreen />
        ) : viewMode === "self" ? (
          /* Self Attendance View */
          <>
            {/* Location Card */}
            <TouchableOpacity style={styles.locationCard} onPress={refreshLocation} activeOpacity={0.8} disabled={isFetchingLocation}>
              <LinearGradient colors={["#eff6ff", "#dbeafe"]} style={styles.locationGradient}>
                <View style={styles.locationHeader}>
                  <View style={styles.locationIconBg}>
                    <Ionicons name="location" size={20} color="#3b82f6" />
                  </View>
                  <Text style={styles.locationTitle}>Current Location</Text>
                  {isFetchingLocation && <ActivityIndicator size="small" color="#3b82f6" />}
                </View>
                <Text style={styles.locationAddress}>{locationAddress || "Tap to detect location..."}</Text>
                {location && <Text style={styles.locationCoords}>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</Text>}
                <Text style={styles.locationNote}>📍 Location will be recorded with attendance</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Today's Status Card */}
            <View style={styles.statusCard}>
              <LinearGradient
                colors={currentAttendance?.checkOutTime ? ["#22c55e", "#16a34a"] : currentAttendance?.checkInTime ? ["#f59e0b", "#d97706"] : ["#3b82f6", "#1e40af"]}
                style={styles.statusGradient}
              >
                <View style={styles.statusHeader}>
                  <View style={styles.statusIconBg}>
                    <Ionicons name={currentAttendance?.checkOutTime ? "checkmark-circle" : currentAttendance?.checkInTime ? "time" : "finger-print"} size={36} color="#fff" />
                  </View>
                  <View style={styles.statusInfo}>
                    <Text style={styles.statusTitle}>{currentAttendance?.checkOutTime ? "Day Complete" : currentAttendance?.checkInTime ? "Working" : "Not Checked In"}</Text>
                    <Text style={styles.statusSubtitle}>
                      {currentAttendance?.checkOutTime ? "Great work today!" : currentAttendance?.checkInTime ? `Since ${currentAttendance.checkInTime}` : "Tap to check in"}
                    </Text>
                  </View>
                </View>

                <View style={styles.timeRow}>
                  <View style={styles.timeBlock}>
                    <Ionicons name="log-in-outline" size={18} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.timeLabel}>Check In</Text>
                    <Text style={styles.timeValue}>{currentAttendance?.checkInTime || "-"}</Text>
                  </View>
                  <View style={styles.timeDivider} />
                  <View style={styles.timeBlock}>
                    <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.timeLabel}>Check Out</Text>
                    <Text style={styles.timeValue}>{currentAttendance?.checkOutTime || "-"}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Action Button */}
            <View style={styles.actionContainer}>
              {!currentAttendance?.checkInTime ? (
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity onPress={() => openCamera(true)} activeOpacity={0.9}>
                    <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.actionBtn}>
                      <Ionicons name="finger-print" size={26} color="#fff" />
                      <Text style={styles.actionBtnText}>Check In</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ) : !currentAttendance?.checkOutTime ? (
                <TouchableOpacity onPress={() => setShowCheckoutModal(true)} activeOpacity={0.9}>
                  <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.actionBtn}>
                    <Ionicons name="exit-outline" size={26} color="#fff" />
                    <Text style={styles.actionBtnText}>Check Out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
                  <Text style={styles.completedText}>Attendance Completed</Text>
                </View>
              )}
            </View>

            {/* History Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent History</Text>
            </View>

            {selfAttendanceHistory.length > 0 ? (
              selfAttendanceHistory.slice(0, 7).map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyDateBadge}>
                    <Text style={styles.historyDay}>{format(new Date(item.date), "dd")}</Text>
                    <Text style={styles.historyMonth}>{format(new Date(item.date), "MMM")}</Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDayName}>{format(new Date(item.date), "EEEE")}</Text>
                    <View style={styles.historyTimeRow}>
                      <Ionicons name="log-in-outline" size={14} color="#6b7280" />
                      <Text style={styles.historyTimeText}>{item.checkInTime || "-"}</Text>
                      <Ionicons name="log-out-outline" size={14} color="#6b7280" style={{ marginLeft: 12 }} />
                      <Text style={styles.historyTimeText}>{item.checkOutTime || "-"}</Text>
                    </View>
                  </View>
                  <View style={[styles.historyStatus, { backgroundColor: item.status === "late" ? "#fee2e2" : "#dcfce7" }]}>
                    <Text style={[styles.historyStatusText, { color: item.status === "late" ? "#dc2626" : "#16a34a" }]}>{item.status === "late" ? "Late" : "On Time"}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No attendance records yet</Text>
              </View>
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
                  <Text style={styles.filterPillText}>{format(selectedDate, "MMM dd")}</Text>
                </TouchableOpacity>

                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{filteredRecords.length} records</Text>
                </View>
              </View>
            </View>

            {/* Employee Cards */}
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record, index) => {
                const statusInfo = getStatusColor(record.status, !!record.check_out);
                const roleColors: Record<string, string> = {
                  "HR": "#8b5cf6",
                  "Manager": "#f59e0b",
                  "Team Lead": "#10b981",
                  "Employee": "#3b82f6",
                };
                const roleColor = roleColors[record.role] || "#6b7280";
                return (
                  <View key={record.id} style={styles.employeeCard}>
                    <View style={styles.employeeTop}>
                      <View style={[styles.employeeAvatar, { backgroundColor: roleColor }]}>
                        <Text style={styles.avatarText}>{record.name?.charAt(0).toUpperCase() || "U"}</Text>
                      </View>
                      <View style={styles.employeeInfo}>
                        <Text style={styles.employeeName}>{record.name}</Text>
                        <View style={styles.employeeMeta}>
                          <View style={styles.metaChip}>
                            <Ionicons name="id-card-outline" size={12} color="#3b82f6" />
                            <Text style={styles.metaText}>{record.employeeId}</Text>
                          </View>
                          <View style={styles.metaChip}>
                            <Ionicons name="business-outline" size={12} color="#8b5cf6" />
                            <Text style={styles.metaText}>{record.department}</Text>
                          </View>
                        </View>
                        <View style={styles.employeeMeta}>
                          <View style={[styles.metaChip, { backgroundColor: `${roleColor}15` }]}>
                            <Ionicons name="person-outline" size={12} color={roleColor} />
                            <Text style={[styles.metaText, { color: roleColor }]}>{record.role}</Text>
                          </View>
                          {record.email && record.email !== "N/A" && (
                            <View style={styles.metaChip}>
                              <Ionicons name="mail-outline" size={12} color="#6b7280" />
                              <Text style={styles.metaText} numberOfLines={1}>{record.email}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusInfo.text }]} />
                        <Text style={[styles.statusBadgeText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                      </View>
                    </View>

                    <View style={styles.employeeTimeRow}>
                      <View style={styles.employeeTimeCard}>
                        <View style={[styles.timeIconBg, { backgroundColor: "#dcfce7" }]}>
                          <Ionicons name="log-in" size={16} color="#16a34a" />
                        </View>
                        <View>
                          <Text style={styles.timeCardLabel}>Check In</Text>
                          <Text style={styles.timeCardValue}>{record.check_in || "--:--"}</Text>
                        </View>
                      </View>

                      <View style={styles.timeArrow}>
                        <Ionicons name="arrow-forward" size={14} color="#d1d5db" />
                      </View>

                      <View style={styles.employeeTimeCard}>
                        <View style={[styles.timeIconBg, { backgroundColor: "#fee2e2" }]}>
                          <Ionicons name="log-out" size={16} color="#dc2626" />
                        </View>
                        <View>
                          <Text style={styles.timeCardLabel}>Check Out</Text>
                          <Text style={styles.timeCardValue}>{record.check_out || "--:--"}</Text>
                        </View>
                      </View>

                      <View style={styles.hoursChip}>
                        <Ionicons name="time" size={14} color="#3b82f6" />
                        <Text style={styles.hoursText}>{record.hours}h</Text>
                      </View>
                    </View>

                    <View style={styles.employeeBottom}>
                      <View style={styles.locationRow}>
                        <Ionicons name="location" size={14} color="#6b7280" />
                        <Text style={styles.locationText} numberOfLines={2}>{record.location}</Text>
                      </View>

                      <View style={styles.photoRow}>
                        <TouchableOpacity
                          style={styles.photoBtn}
                          onPress={() => {
                            if (record.selfie || record.checkOutSelfie) {
                              setSelectedRecord(record);
                              setShowSelfieModal(true);
                            }
                          }}
                          disabled={!record.selfie && !record.checkOutSelfie}
                        >
                          {isValidImageUri(record.selfie) ? <Image source={{ uri: record.selfie }} style={styles.photoThumb} onError={() => {}} /> : <View style={styles.photoEmpty}><Ionicons name="camera-outline" size={16} color="#9ca3af" /></View>}
                          <View style={[styles.photoLabel, { backgroundColor: "#dcfce7" }]}><Text style={[styles.photoLabelText, { color: "#16a34a" }]}>In</Text></View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.photoBtn}
                          onPress={() => {
                            if (isValidImageUri(record.selfie) || isValidImageUri(record.checkOutSelfie)) {
                              setSelectedRecord(record);
                              setShowSelfieModal(true);
                            }
                          }}
                          disabled={!isValidImageUri(record.selfie) && !isValidImageUri(record.checkOutSelfie)}
                        >
                          {isValidImageUri(record.checkOutSelfie) ? <Image source={{ uri: record.checkOutSelfie }} style={styles.photoThumb} onError={() => {}} /> : <View style={styles.photoEmpty}><Ionicons name="camera-outline" size={16} color="#9ca3af" /></View>}
                          <View style={[styles.photoLabel, { backgroundColor: "#fee2e2" }]}><Text style={[styles.photoLabelText, { color: "#dc2626" }]}>Out</Text></View>
                        </TouchableOpacity>

                        {(isValidImageUri(record.selfie) || isValidImageUri(record.checkOutSelfie)) && (
                          <TouchableOpacity style={styles.viewPhotosBtn} onPress={() => { setSelectedRecord(record); setShowSelfieModal(true); }}>
                            <Ionicons name="images-outline" size={16} color="#3b82f6" />
                            <Text style={styles.viewPhotosBtnText}>View</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No attendance records for {format(selectedDate, "MMM dd, yyyy")}</Text>
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
            {(user?.role?.toLowerCase() === "admin" ? ["All Roles", "HR", "Manager", "Team Lead", "Employee"] : ["All Roles", "Team Lead", "Employee"]).map((r) => (
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
              <Ionicons name="cloud-upload-outline" size={20} color="#3b82f6" />
              <Text style={styles.filePickerText}>{workReportFile ? workReportFile.name : "Upload work report (optional)"}</Text>
            </TouchableOpacity>

            {workReportFile && (
              <View style={styles.selectedFile}>
                <Ionicons name="document-text" size={18} color="#16a34a" />
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
                  <Text style={styles.selfieDate}>{selectedRecord?.date ? format(new Date(selectedRecord.date), "MMMM dd, yyyy") : ""}</Text>
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
                  <Image source={{ uri: selectedRecord!.selfie }} style={styles.selfieImage} resizeMode="contain" onError={() => {}} />
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
                  <Image source={{ uri: selectedRecord!.checkOutSelfie! }} style={styles.selfieImage} resizeMode="contain" onError={() => {}} />
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

      {/* Export CSV Modal */}
      <Modal visible={exportModalVisible} transparent animationType="slide">
        <View style={styles.exportModalOverlay}>
          <View style={styles.exportModal}>
            <Text style={styles.exportModalTitle}>Export CSV Report</Text>
            <Text style={styles.exportModalSubtitle}>Configure your export preferences</Text>

            <Text style={styles.exportLabel}>Quick Filter</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={selectedQuickFilter} onValueChange={(val) => {
                setSelectedQuickFilter(val);
                const d = new Date();
                if (val === "Today") { setExportStartDate(d); setExportEndDate(d); }
                else if (val === "Yesterday") { d.setDate(d.getDate() - 1); setExportStartDate(d); setExportEndDate(d); }
                else if (val === "Last 7 Days") { const start = new Date(); start.setDate(d.getDate() - 6); setExportStartDate(start); setExportEndDate(d); }
                else if (val === "This Month") { setExportStartDate(new Date(d.getFullYear(), d.getMonth(), 1)); setExportEndDate(d); }
              }}>
                {quickFilterOptions.map((opt) => <Picker.Item key={opt} label={opt} value={opt} />)}
              </Picker>
            </View>

            <View style={styles.dateRangeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportLabel}>Start Date</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => {
                  if (Platform.OS === "ios") {
                    setIosDatePickerField("start");
                    setTempExportDate(exportStartDate || new Date());
                    setIosDatePickerVisible(true);
                  } else {
                    setShowStartPicker(true);
                  }
                }}>
                  <Text style={styles.dateInputText}>{exportStartDate ? format(exportStartDate, "MMM dd, yyyy") : "Select"}</Text>
                </TouchableOpacity>
                {showStartPicker && Platform.OS === "android" && (
                  <DateTimePicker value={exportStartDate || new Date()} mode="date" onChange={(e, date) => { setShowStartPicker(false); if (date) setExportStartDate(date); }} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportLabel}>End Date</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => {
                  if (Platform.OS === "ios") {
                    setIosDatePickerField("end");
                    setTempExportDate(exportEndDate || new Date());
                    setIosDatePickerVisible(true);
                  } else {
                    setShowEndPicker(true);
                  }
                }}>
                  <Text style={styles.dateInputText}>{exportEndDate ? format(exportEndDate, "MMM dd, yyyy") : "Select"}</Text>
                </TouchableOpacity>
                {showEndPicker && Platform.OS === "android" && (
                  <DateTimePicker value={exportEndDate || new Date()} mode="date" onChange={(e, date) => { setShowEndPicker(false); if (date) setExportEndDate(date); }} />
                )}
              </View>
            </View>

            <Text style={styles.exportLabel}>Department</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={selectedDepartment} onValueChange={setSelectedDepartment}>
                <Picker.Item label="All Departments" value="" />
                {Array.from(new Set(attendanceRecords.map((r) => r.department))).map((dept) => <Picker.Item key={dept} label={dept} value={dept} />)}
              </Picker>
            </View>

            <View style={styles.exportActions}>
              <TouchableOpacity style={styles.exportCancelBtn} onPress={() => setExportModalVisible(false)}>
                <Text style={styles.exportCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportConfirmBtn} onPress={async () => { await onExportCsv(); setExportModalVisible(false); }}>
                <Text style={styles.exportConfirmText}>Export CSV</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export PDF Modal */}
      <Modal visible={pdfExportModalVisible} transparent animationType="slide">
        <View style={styles.exportModalOverlay}>
          <View style={styles.exportModal}>
            <Text style={styles.exportModalTitle}>Export PDF Report</Text>
            <Text style={styles.exportModalSubtitle}>Configure your export preferences</Text>

            <Text style={styles.exportLabel}>Quick Filter</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={selectedQuickFilter} onValueChange={(val) => {
                setSelectedQuickFilter(val);
                const d = new Date();
                if (val === "Today") { setExportStartDate(d); setExportEndDate(d); }
                else if (val === "Yesterday") { d.setDate(d.getDate() - 1); setExportStartDate(d); setExportEndDate(d); }
                else if (val === "Last 7 Days") { const start = new Date(); start.setDate(d.getDate() - 6); setExportStartDate(start); setExportEndDate(d); }
                else if (val === "This Month") { setExportStartDate(new Date(d.getFullYear(), d.getMonth(), 1)); setExportEndDate(d); }
              }}>
                {quickFilterOptions.map((opt) => <Picker.Item key={opt} label={opt} value={opt} />)}
              </Picker>
            </View>

            <View style={styles.dateRangeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportLabel}>Start Date</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => {
                  if (Platform.OS === "ios") {
                    setIosDatePickerField("start");
                    setTempExportDate(exportStartDate || new Date());
                    setIosDatePickerVisible(true);
                  } else {
                    setShowStartPicker(true);
                  }
                }}>
                  <Text style={styles.dateInputText}>{exportStartDate ? format(exportStartDate, "MMM dd, yyyy") : "Select"}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportLabel}>End Date</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => {
                  if (Platform.OS === "ios") {
                    setIosDatePickerField("end");
                    setTempExportDate(exportEndDate || new Date());
                    setIosDatePickerVisible(true);
                  } else {
                    setShowEndPicker(true);
                  }
                }}>
                  <Text style={styles.dateInputText}>{exportEndDate ? format(exportEndDate, "MMM dd, yyyy") : "Select"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.exportLabel}>Department</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={selectedDepartment} onValueChange={setSelectedDepartment}>
                <Picker.Item label="All Departments" value="" />
                {Array.from(new Set(attendanceRecords.map((r) => r.department))).map((dept) => <Picker.Item key={dept} label={dept} value={dept} />)}
              </Picker>
            </View>

            <View style={styles.exportActions}>
              <TouchableOpacity style={styles.exportCancelBtn} onPress={() => setPdfExportModalVisible(false)}>
                <Text style={styles.exportCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportConfirmBtn} onPress={async () => { await onExportPdf(); setPdfExportModalVisible(false); }}>
                <Text style={styles.exportConfirmText}>Export PDF</Text>
              </TouchableOpacity>
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
            <Text style={styles.loadingText}>Processing...</Text>
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
  
  // Export Row
  exportRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  exportBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 6, borderWidth: 1, borderColor: "#e5e7eb" },
  exportBtnText: { color: "#3b82f6", fontSize: 12, fontWeight: "600" },
  
  // Stats
  statsContainer: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 16, gap: 10, backgroundColor: "#fff", marginTop: 0 },
  statCard: { flex: 1, borderRadius: 12, overflow: "hidden" },
  statGradient: { padding: 14, alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 6 },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: "600", marginTop: 2 },
  
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
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
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
  exportModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  exportModal: { backgroundColor: "#fff", borderRadius: 20, padding: 20 },
  exportModalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  exportModalSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 4, marginBottom: 16 },
  exportLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 12 },
  pickerContainer: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, overflow: "hidden", backgroundColor: "#f9fafb" },
  dateRangeRow: { flexDirection: "row", gap: 12 },
  dateInput: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, backgroundColor: "#f9fafb" },
  dateInputText: { color: "#111827", fontSize: 14 },
  exportActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, gap: 12 },
  exportCancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center" },
  exportCancelText: { fontWeight: "600", color: "#374151" },
  exportConfirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#3b82f6", alignItems: "center" },
  exportConfirmText: { color: "#fff", fontWeight: "700" },
  
  // Loading
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  loadingBox: { backgroundColor: "#fff", paddingVertical: 24, paddingHorizontal: 32, borderRadius: 16, alignItems: "center" },
  loadingText: { fontSize: 14, color: "#6b7280", marginTop: 12 },
  
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
});
