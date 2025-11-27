import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { Calendar } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Button, Card, Provider as PaperProvider } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import OfficeHoursScreen from "../../components/ui/OfficeHoursScreen";
import { GeoLocation } from "../../types";

// Import tab bar visibility
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";

// Import real auth context
import { API_CONFIG } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../lib/api";

// IST Timezone Helper Functions (inline to avoid module resolution issues)
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // UTC+5:30

const getCurrentISTTime = (): Date => {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + IST_OFFSET_MS);
};

const formatAttendanceDate = (date: Date): string => {
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getDayOfWeek = (date: Date): string => {
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  });
};

const useLanguage = () => ({
  t: {
    attendance: { todayAttendance: "Today's Attendance" },
  },
});

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

type LocationFetchResult = {
  coords: { latitude: number; longitude: number };
  formattedAddress: string;
  details: Location.LocationGeocodedAddress | null;
  geoLocation: GeoLocation;
};

const formatLocationLabel = (value?: GeoLocation | string | null) => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  const coordsLabel = `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`;
  return value.address ? `${value.address} (${coordsLabel})` : coordsLabel;
};

// No mock data - using real API data only

const AttendanceManager: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  // Animation values for header elements
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;

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
  const [viewMode, setViewMode] = useState<'self' | 'employee'>(
    (user?.role === 'hr' || user?.role === 'manager' || user?.role === 'admin') ? 'employee' : 'self'
  );
  const [adminTab, setAdminTab] = useState<'records' | 'officeHours'>('records');
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

  // CSV Export Modal State
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [pdfExportModalVisible, setPdfExportModalVisible] = useState(false);
  const quickFilterOptions = [
    "Today",
    "Yesterday",
    "Last 7 Days",
    "This Month",
    "Custom Date Range",
  ];
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>("Custom Date Range");
  const [exportStartDate, setExportStartDate] = useState<Date | null>(null);
  const [exportEndDate, setExportEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState<'all' | 'specific'>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  // Tab bar visibility hook
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();

  // Load real data from API
  useEffect(() => {
    // Load attendance data based on view mode
    if (viewMode === 'self') {
      loadSelfAttendanceData();
      requestPermissions();
    } else {
      loadEmployeeAttendanceData();
    }
    
    // Animate header elements
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
      ]),
      Animated.timing(statsOpacity, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [viewMode]);

  // Reload employee attendance when date changes
  useEffect(() => {
    if (viewMode === 'employee') {
      loadEmployeeAttendanceData();
    }
  }, [selectedDate]);

  // Request permissions for self attendance
  const requestPermissions = async () => {
    if (!permission?.granted) {
      await requestCameraPermission();
    }

    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    const granted = locationStatus === "granted";
    setHasLocationPermission(granted);

    if (granted) {
      await fetchAndSetLocation();
    }
  };

  // Load self attendance data from API
  const loadSelfAttendanceData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const data = await apiService.getSelfAttendance(parseInt(user.id));
      
      // Transform API data to match component structure
      const today = format(new Date(), "yyyy-MM-dd");
      const transformedData: SelfAttendanceRecord[] = data.map((record) => ({
        id: record.attendance_id.toString(),
        date: format(new Date(record.check_in), "yyyy-MM-dd"),
        checkInTime: format(new Date(record.check_in), "hh:mm a"),
        checkOutTime: record.check_out ? format(new Date(record.check_out), "hh:mm a") : undefined,
        status: "present",
        checkInLocation: record.gps_location,
        checkOutLocation: record.check_out ? record.gps_location : undefined,
        selfie: record.selfie,
      }));
      
      setSelfAttendanceHistory(transformedData);
      setCurrentAttendance(transformedData.find((r) => r.date === today) || null);
    } catch (error: any) {
      console.error("Failed to load self attendance data:", error);
      Alert.alert("Error", "Failed to load attendance data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load employee attendance data from API
  const loadEmployeeAttendanceData = async () => {
    try {
      setIsLoading(true);
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      // Add a small delay to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const data = await apiService.getAllAttendance(dateStr);
      
      console.log("� L oaded employee attendance:", data.length, "records");
      
      // Log first record to debug
      if (data.length > 0) {
        console.log("📋 Sample record:", JSON.stringify(data[0], null, 2));
      }
      
      // Transform API data to match component structure
      const transformedData = data.map((record: any) => {
        // Backend provides checkInSelfie and checkOutSelfie fields
        // Fallback to selfie field if checkInSelfie is not available
        let checkInSelfie = record.checkInSelfie || record.selfie || null;
        let checkOutSelfie = record.checkOutSelfie || null;
        
        console.log("🖼️ Processing selfie data for record:", {
          attendance_id: record.attendance_id,
          checkInSelfie: checkInSelfie,
          checkOutSelfie: checkOutSelfie,
          has_checkout: !!record.check_out,
          raw_selfie: record.selfie,
          raw_checkInSelfie: record.checkInSelfie,
          raw_checkOutSelfie: record.checkOutSelfie
        });
        
        // Convert relative paths to full URLs if needed
        const baseUrl = API_CONFIG.getApiBaseUrl();
        if (checkInSelfie && !checkInSelfie.startsWith('http') && !checkInSelfie.startsWith('data:')) {
          checkInSelfie = checkInSelfie.replace(/\\/g, '/');
          checkInSelfie = `${baseUrl}${checkInSelfie.startsWith('/') ? '' : '/'}${checkInSelfie}`;
        }
        if (checkOutSelfie && !checkOutSelfie.startsWith('http') && !checkOutSelfie.startsWith('data:')) {
          checkOutSelfie = checkOutSelfie.replace(/\\/g, '/');
          checkOutSelfie = `${baseUrl}${checkOutSelfie.startsWith('/') ? '' : '/'}${checkOutSelfie}`;
        }
        
        console.log("🔗 Final selfie URLs:", { checkInSelfie, checkOutSelfie });
        
        // Parse location data
        let locationText = "N/A";
        if (record.gps_location) {
          try {
            if (typeof record.gps_location === 'string') {
              // Try to parse as JSON to get address
              try {
                const locData = JSON.parse(record.gps_location);
                // Extract address or coordinates
                if (locData.address) {
                  locationText = locData.address;
                } else if (locData.latitude && locData.longitude) {
                  locationText = `${locData.latitude.toFixed(4)}, ${locData.longitude.toFixed(4)}`;
                } else {
                  locationText = record.gps_location;
                }
              } catch {
                locationText = record.gps_location;
              }
            } else if (typeof record.gps_location === 'object') {
              if (record.gps_location.address) {
                locationText = record.gps_location.address;
              } else if (record.gps_location.latitude && record.gps_location.longitude) {
                locationText = `${record.gps_location.latitude.toFixed(4)}, ${record.gps_location.longitude.toFixed(4)}`;
              }
            }
          } catch (e) {
            console.error("Error parsing location:", e);
          }
        }
        
        return {
          id: record.attendance_id,
          // Backend returns 'name' not 'user_name'
          name: record.name || record.userName || record.user_name || record.email || `User ${record.user_id}`,
          employeeId: record.employee_id || `EMP${record.user_id}`,
          department: record.department || "N/A",
          email: record.email || record.userEmail || "N/A",
          check_in: format(new Date(record.check_in), "hh:mm a"),
          check_out: record.check_out ? format(new Date(record.check_out), "hh:mm a") : "",
          location: locationText,
          selfie: checkInSelfie,
          checkOutSelfie: checkOutSelfie,
          status: record.status || "present",
          hours: record.total_hours ? `${record.total_hours.toFixed(2)}` : "0:00",
          role: "Employee",
          date: dateStr,
        };
      });
      
      setAttendanceRecords(transformedData);
      setFilteredRecords(transformedData);
    } catch (error: any) {
      console.error("Failed to load employee attendance data:", error);
      Alert.alert("Error", "Failed to load employee attendance. Please try again.");
      // Set empty data on error
      setAttendanceRecords([]);
      setFilteredRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddressFromPlace = (place: Location.LocationGeocodedAddress) => {
    const segments = [
      [place.name, place.street].filter(Boolean).join(", "),
      [place.district || place.subregion, place.city].filter(Boolean).join(", "),
      [place.region, place.postalCode].filter(Boolean).join(" "),
      place.country,
    ].filter(Boolean);
    return segments.join(", ");
  };

  const fetchAndSetLocation = async () => {
    try {
      setIsFetchingLocation(true);
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      let formattedAddress = "";
      let resolvedPlace: Location.LocationGeocodedAddress | null = null;
      try {
        const [place] = await Location.reverseGeocodeAsync(coords);
        if (place) {
          resolvedPlace = place;
          formattedAddress = formatAddressFromPlace(place);
        }
      } catch (error) {
        console.warn("Failed to reverse geocode location", error);
      }

      const fallbackAddress = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
      const finalAddress = formattedAddress || fallbackAddress;
      const geoLocation: GeoLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: finalAddress,
      };

      setLocation(geoLocation);
      setLocationAddress(finalAddress);
      setLocationDetails(resolvedPlace);

      return {
        coords,
        formattedAddress: finalAddress,
        details: resolvedPlace,
        geoLocation,
      };
    } catch (error) {
      console.warn("Failed to fetch location", error);
      return null;
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const ensureLocationPermission = async () => {
    if (hasLocationPermission) {
      return true;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === "granted";
    setHasLocationPermission(granted);
    if (!granted) {
      Alert.alert("Location Required", "Please enable location access to record attendance.");
    }
    return granted;
  };

  const refreshLocation = async () => {
    if (isFetchingLocation) return;
    const granted = await ensureLocationPermission();
    if (!granted) return;
    const result = await fetchAndSetLocation();
    if (!result) {
      Alert.alert("Location Unavailable", "Unable to fetch your location. Please try again.");
    }
  };

  // Open camera for self attendance
  const openCamera = (checkIn: boolean) => {
    if (!permission?.granted) {
      Alert.alert("Permission Required", "Please grant camera access.");
      return;
    }
    setIsCheckingIn(checkIn);
    setCameraVisible(true);
  };

  // Take picture for attendance
  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      setCameraVisible(false);
      await handleSubmitAttendance(photo.uri);
    }
  };

  // Submit attendance with real API
  const handleSubmitAttendance = async (photoUri: string) => {
    if (!user?.id) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    setIsLoading(true);
    try {
      const locationAllowed = await ensureLocationPermission();
      const latestLocation = locationAllowed ? await fetchAndSetLocation() : null;
      const latestGeo = latestLocation?.geoLocation || location;
      const gpsLocationString = latestGeo 
        ? `${latestGeo.latitude},${latestGeo.longitude}` 
        : "0,0";

      // Convert image to base64
      const base64Image = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (isCheckingIn) {
        // Call check-in API
        console.log("📤 Calling check-in API with:", {
          userId: parseInt(user.id),
          gpsLocation: gpsLocationString,
          imageLength: base64Image.length
        });
        
        const response = await apiService.checkIn(
          parseInt(user.id),
          gpsLocationString,
          base64Image
        );
        
        console.log("✅ Check-in response:", response);

        const now = new Date();
        const formattedTime = format(now, "hh:mm a");
        const today = format(now, "yyyy-MM-dd");

        const record: SelfAttendanceRecord = {
          id: response.attendance_id.toString(),
          date: today,
          checkInTime: formattedTime,
          checkInLocation: latestGeo || gpsLocationString,
          checkOutLocation: "",
          selfie: photoUri,
          status: "present",
        };
        
        setCurrentAttendance(record);
        setSelfAttendanceHistory((prev) => [record, ...prev]);
        Alert.alert("Success", "Checked In Successfully!");
      } else if (currentAttendance) {
        // Call check-out API with work summary and optional work report file
        const response = await apiService.checkOut(
          parseInt(user.id),
          gpsLocationString,
          base64Image,
          todaysWork || "Completed daily tasks",
          workReportFile  // Include work report file if selected
        );

        const formattedTime = format(new Date(), "hh:mm a");
        const updated: SelfAttendanceRecord = {
          ...currentAttendance,
          checkOutTime: formattedTime,
          checkOutLocation: latestGeo || gpsLocationString,
        };
        
        setCurrentAttendance(updated);
        setSelfAttendanceHistory((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        
        // Clear work summary and work report file
        setTodaysWork("");
        setWorkReportFile(null);
        
        Alert.alert("Success", "Checked Out Successfully!");
      }

      // Reload attendance data
      await loadSelfAttendanceData();
    } catch (error: any) {
      console.error("❌ Failed to submit attendance:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      
      // Show detailed error message
      const errorMessage = error.message || "Unable to submit attendance. Please try again.";
      Alert.alert(
        "Attendance Error", 
        errorMessage + "\n\nPlease check:\n• Backend is running\n• Network connection\n• Camera/Location permissions"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Pick work report PDF file
  const pickWorkReportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setWorkReportFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/pdf',
        });
        console.log("📄 Work report file selected:", file.name);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document. Please try again.");
    }
  };

  // Clear work report file
  const clearWorkReportFile = () => {
    setWorkReportFile(null);
  };

  const confirmCheckOut = () => {
    if (!todaysWork.trim()) {
      Alert.alert("Required", "Please provide today's work summary before checking out.");
      return;
    }
    setShowCheckoutModal(false);
    openCamera(false);
  };

  const formatTime = (time?: string) => (time ? time : "-");

  // 🔎 Apply search, role, and date filters
  useEffect(() => {
    const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
    const roleFilter = filterStatus; // "All Roles" or specific role

    const results = attendanceRecords.filter((r) => {
      const matchesSearch = [r.name, r.email, r.employeeId, r.department]
        .filter(Boolean)
        .some((field: string) => field.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole = roleFilter === "All Roles" ? true : r.role === roleFilter;
      const matchesDate = r.date === selectedDateStr;
      return matchesSearch && matchesRole && matchesDate;
    });

    setFilteredRecords(results);
  }, [searchTerm, attendanceRecords, selectedDate, filterStatus]);

  const getStatusBadge = (record: any) => {
    if (!record.check_out) return "Active";
    if (record.status === "late") return "Late";
    if (record.status === "present") return "On Time";
    return "Unknown";
  };


  // if (isLoading) {
  //   return (
  //     <SafeAreaView style={styles.loaderContainer} edges={["top"]}>
  //       <StatusBar style="light" />
  //       <ActivityIndicator size="large" color="#2563eb" />
  //       <Text style={{ marginTop: 8 }}>Loading Attendance...</Text>
  //     </SafeAreaView>
  //   );
  // }
  
  // Calculate attendance stats from real data
  const totalEmployees = attendanceRecords.length;
  const presentToday = attendanceRecords.filter(emp => emp.check_in && emp.status === 'present').length;
  const lateArrivals = attendanceRecords.filter(emp => emp.status === 'late').length;
  const earlyDepartures = 0;

  const currentLocationLabel = locationAddress || (location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : "");
  const fallbackLocationLabel = currentLocationLabel || (isFetchingLocation ? "Detecting location..." : "Location unavailable");
  const primaryLocationText = locationDetails
    ? [locationDetails?.name, locationDetails?.street].filter(Boolean).join(", ") || fallbackLocationLabel
    : fallbackLocationLabel;
  const secondaryLocationLine = locationDetails
    ? [locationDetails?.district || locationDetails?.subregion, locationDetails?.city].filter(Boolean).join(", ")
    : "";
  const tertiaryLocationLine = locationDetails
    ? [locationDetails?.region, locationDetails?.postalCode, locationDetails?.country].filter(Boolean).join(" • ")
    : "";

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

  // Export functions now use API service directly - no need for local CSV/HTML generation

  const onExportCsv = async () => {
    try {
      setIsLoading(true);
      
      // Get filtered records based on export settings
      const recordsToExport = filterExportRecords();
      
      if (recordsToExport.length === 0) {
        Alert.alert("No Data", "No attendance records found for the selected filters.");
        setIsLoading(false);
        return;
      }
      
      // Format dates for API
      const startDateStr = exportStartDate ? format(exportStartDate, "yyyy-MM-dd") : undefined;
      const endDateStr = exportEndDate ? format(exportEndDate, "yyyy-MM-dd") : undefined;
      
      console.log("📊 Exporting CSV with filters:", {
        startDate: startDateStr,
        endDate: endDateStr,
        department: selectedDepartment,
        employeeId: employeeFilter === 'specific' ? selectedEmployeeId : undefined,
        recordCount: recordsToExport.length
      });
      
      await apiService.downloadAttendanceCSV(
        undefined, // userId - undefined for all employees
        startDateStr,
        endDateStr,
        selectedDepartment || undefined,
        employeeFilter === 'specific' ? selectedEmployeeId : undefined
      );
      
      Alert.alert("Success", `Attendance CSV exported successfully! (${recordsToExport.length} records)`);
    } catch (error: any) {
      console.error("CSV export failed:", error);
      Alert.alert("Error", error.message || "Failed to export CSV");
    } finally {
      setIsLoading(false);
    }
  };

  const onExportPdf = async () => {
    try {
      setIsLoading(true);
      
      // Get filtered records based on export settings
      const recordsToExport = filterExportRecords();
      
      if (recordsToExport.length === 0) {
        Alert.alert("No Data", "No attendance records found for the selected filters.");
        setIsLoading(false);
        return;
      }
      
      // Format dates for API
      const startDateStr = exportStartDate ? format(exportStartDate, "yyyy-MM-dd") : undefined;
      const endDateStr = exportEndDate ? format(exportEndDate, "yyyy-MM-dd") : undefined;
      
      console.log("📊 Exporting PDF with filters:", {
        startDate: startDateStr,
        endDate: endDateStr,
        department: selectedDepartment,
        employeeId: employeeFilter === 'specific' ? selectedEmployeeId : undefined,
        recordCount: recordsToExport.length
      });
      
      await apiService.downloadAttendancePDF(
        undefined, // userId - undefined for all employees
        startDateStr,
        endDateStr,
        selectedDepartment || undefined,
        employeeFilter === 'specific' ? selectedEmployeeId : undefined
      );
      
      Alert.alert("Success", `Attendance PDF exported successfully! (${recordsToExport.length} records)`);
    } catch (error: any) {
      console.error("PDF export failed:", error);
      Alert.alert("Error", error.message || "Failed to export PDF");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PaperProvider>
    <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
      <StatusBar style="light" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
          {/* Header Title Row */}
          <Animated.View 
            style={[
              styles.headerTitleRow,
              { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }
            ]}
          >
            <TouchableOpacity 
              style={styles.backButtonCompact} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            
           
            
            <View style={styles.headerTextContainerCompact}>
              <Animated.Text 
                style={[
                  styles.headerTitleCompact,
                  { opacity: headerOpacity }
                ]}
              >
                Attendance
              </Animated.Text>
              <Animated.Text 
                style={[
                  styles.headerSubtitleCompact,
                  { opacity: headerOpacity }
                ]}
              >
                {viewMode === 'self' ? 'Track your attendance' : 
                 user?.role === 'admin' ? 'View employee attendance' : 'Monitor team attendance'}
              </Animated.Text>
            </View>
            
            {/* Toggle Switch - Show for HR and Manager roles */}
            {(user?.role === 'hr' || user?.role === 'manager') && (
              <Animated.View 
                style={[
                  styles.toggleContainerHorizontal,
                  { opacity: headerOpacity }
                ]}
              >
                <View style={styles.toggleWrapperHorizontal}>
                  <TouchableOpacity 
                    style={[styles.toggleButton, viewMode === 'self' && styles.toggleButtonActive]}
                    onPress={() => setViewMode('self')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.toggleButtonText, viewMode === 'self' && styles.toggleButtonTextActive]}>Self</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.toggleButton, viewMode === 'employee' && styles.toggleButtonActive]}
                    onPress={() => setViewMode('employee')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.toggleButtonText, viewMode === 'employee' && styles.toggleButtonTextActive]}>Team</Text>
                  </TouchableOpacity>
                </View>
            </Animated.View>
          )}
          
          </Animated.View>
          
          {/* Date Badge in Header - Only show for self view */}
          {viewMode === 'self' && (
            <Animated.View 
              style={[
                styles.headerDateBadge,
                { opacity: headerOpacity }
              ]}
            >
              <Text style={styles.headerDateText}>{formatAttendanceDate(getCurrentISTTime())}</Text>
              <Text style={styles.headerDayText}>{getDayOfWeek(getCurrentISTTime())}</Text>
            </Animated.View>
          )}
          
          {/* Export Actions Below Title - Only show for Admin in employee view */}
          {viewMode === 'employee' && user?.role === 'admin' && (
            <Animated.View 
              style={[
                styles.headerExportActionsBelow,
                { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }
              ]}
            >
              <TouchableOpacity style={styles.exportBtnCompact} activeOpacity={0.8} onPress={() => setExportModalVisible(true)}>
                <Ionicons name="download-outline" size={16} color="#fff" />
                <Text style={styles.exportBtnCompactText}>CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtnCompact} activeOpacity={0.8} onPress={() => setPdfExportModalVisible(true)}>
                <Ionicons name="document-text-outline" size={16} color="#fff" />
                <Text style={styles.exportBtnCompactText}>PDF</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      
      {/* Stats Cards - Only show for Admin in employee view */}
      {viewMode === 'employee' && user?.role === 'admin' && (
        <View style={styles.statsContainer}>
          <Animated.View style={[styles.statsRow, { opacity: statsOpacity }]}>
            <Card style={[styles.statsCard, { backgroundColor: "#2563eb" }]}>
              <Text style={styles.cardLabel}>Total Employees</Text>
              <Text style={[styles.cardValue, { color: "#fff" }]}>{totalEmployees}</Text>
            </Card>
            <Card style={[styles.statsCard, { backgroundColor: "#10b981" }]}>
              <Text style={styles.cardLabel}>Present Today</Text>
              <Text style={[styles.cardValue, { color: "#fff" }]}>{presentToday}</Text>
            </Card>
            <Card style={[styles.statsCard, { backgroundColor: "#f97316" }]}>
              <Text style={styles.cardLabel}>Late Arrivals</Text>
              <Text style={[styles.cardValue, { color: "#fff" }]}>{lateArrivals}</Text>
            </Card>
            <Card style={[styles.statsCard, { backgroundColor: "#eab308" }]}>
              <Text style={styles.cardLabel}>Early Departures</Text>
              <Text style={[styles.cardValue, { color: "#fff" }]}>{earlyDepartures}</Text>
            </Card>
          </Animated.View>
        </View>
      )}
      
      <ScrollView 
        style={styles.contentContainer}
        contentContainerStyle={[
          styles.scrollContentContainer,
          { paddingBottom: Math.max(120, insets.bottom + 100, tabBarVisible ? tabBarHeight + 24 : 32) }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        {viewMode === 'employee' && user?.role === 'admin' && (
          <View style={styles.adminToggleContainer}>
            <View style={styles.adminToggleWrapper}>
              <TouchableOpacity
                style={[styles.adminToggleButton, adminTab === 'records' && styles.adminToggleButtonActive]}
                onPress={() => setAdminTab('records')}
                activeOpacity={0.8}
              >
                <Ionicons name="list-outline" size={16} color={adminTab === 'records' ? '#fff' : '#2563eb'} style={styles.adminToggleIcon} />
                <Text style={[styles.adminToggleText, adminTab === 'records' && styles.adminToggleTextActive]}>Records</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adminToggleButton, adminTab === 'officeHours' && styles.adminToggleButtonActive]}
                onPress={() => setAdminTab('officeHours')}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={16} color={adminTab === 'officeHours' ? '#fff' : '#2563eb'} style={styles.adminToggleIcon} />
                <Text style={[styles.adminToggleText, adminTab === 'officeHours' && styles.adminToggleTextActive]}>Office Hours</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {user?.role === 'admin' && adminTab === 'officeHours' ? (
          <OfficeHoursScreen />
        ) : (
          <>
            {/* Attendance Records Header - Only for employee view */}
            {viewMode === 'employee' && (
              <View style={styles.recordsHeader}>
                <Text style={styles.recordsTitle}>Employee Attendance Records</Text>
                <Text style={styles.recordsSubtitle}>
                  {user?.role === 'admin' ? 'View employee attendance records' : 'View and manage employee attendance'}
                </Text>
              </View>
            )}

        {/* Search and Date Filter - only for employee/team view */}
        {viewMode === 'employee' && (
          <View style={styles.filterContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#6b7280" style={{ marginRight: 6 }} />
              <TextInput
                placeholder="Search by name, email, employee ID, or department..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={styles.searchInput}
              />
            </View>

            <View style={styles.filterRow}>
              <TouchableOpacity style={styles.filterBox} onPress={() => setRoleSheetVisible(true)}>
                <Ionicons name="funnel-outline" size={16} color="#2563eb" />
                <Text style={styles.filterText}>{filterStatus}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dateBox} onPress={() => setDatePickerVisible(true)}>
                <Calendar size={16} color="#2563eb" />
                <Text style={styles.dateText}>{format(selectedDate, "MMMM do, yyyy")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Table Container with Horizontal Scroll */}
        <View style={styles.tableContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tableContent}>
              
            </View>
          </ScrollView>

          {/* Content based on view mode */}
          {viewMode === 'self' ? (
            /* Self Attendance View - Matching the design image */
            <View style={styles.selfViewContainer}>
              {/* Current Location Card */}
              <Card style={styles.locationCard}>
                <View style={styles.locationCardHeader}>
                  <Ionicons name="location" size={20} color="#2563eb" />
                  <Text style={styles.locationCardTitle}>Current Location</Text>
                </View>
                <TouchableOpacity
                  onPress={refreshLocation}
                  activeOpacity={0.8}
                  disabled={isFetchingLocation}
                >
                  <View style={styles.locationCardContent}>
                    <Text style={styles.locationPinIcon}>📍</Text>
                    <Text style={styles.locationAddressText}>
                      {primaryLocationText || "Detecting location..."}
                    </Text>
                  </View>
                  {secondaryLocationLine ? (
                    <Text style={styles.locationSecondaryText}>{secondaryLocationLine}</Text>
                  ) : null}
                  {tertiaryLocationLine ? (
                    <Text style={styles.locationSecondaryText}>{tertiaryLocationLine}</Text>
                  ) : null}
                  {location && (
                    <Text style={styles.locationCoordsText}>
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </Text>
                  )}
                  <Text style={styles.locationNoteText}>
                    Location will be recorded with attendance
                  </Text>
                </TouchableOpacity>
                {isFetchingLocation && (
                  <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 8 }} />
                )}
              </Card>

              {/* Today's Status Card */}
              <Card style={styles.todayStatusCard}>
                <Text style={styles.todayStatusTitle}>Today's Status</Text>
                
                {currentAttendance ? (
                  <View style={styles.todayStatusContent}>
                    {/* Check-in Row */}
                    <View style={styles.checkTimeRow}>
                      <View style={styles.checkTimeIcon}>
                        <Ionicons name="log-in-outline" size={20} color="#10b981" />
                      </View>
                      <Text style={styles.checkTimeLabel}>Check-in:</Text>
                      <Text style={styles.checkTimeValue}>{formatTime(currentAttendance.checkInTime)}</Text>
                    </View>
                    
                    {/* Check-out Row */}
                    <View style={styles.checkTimeRow}>
                      <View style={styles.checkTimeIcon}>
                        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                      </View>
                      <Text style={styles.checkTimeLabel}>Check-out:</Text>
                      <Text style={styles.checkTimeValue}>{formatTime(currentAttendance.checkOutTime)}</Text>
                    </View>
                    
                    {/* Status Chip */}
                    {currentAttendance.checkInTime && (
                      <View style={[
                        styles.onTimeChip,
                        currentAttendance.status === "late" ? styles.lateChip : {}
                      ]}>
                        <Text style={[
                          styles.onTimeChipText,
                          currentAttendance.status === "late" ? styles.lateChipText : {}
                        ]}>
                          {currentAttendance.status === "late" ? "Late Arrival" : "On Time"}
                        </Text>
                      </View>
                    )}
                    
                    {/* Action Button */}
                    <View style={styles.actionButtonContainer}>
                      {!currentAttendance?.checkOutTime ? (
                        <TouchableOpacity
                          style={styles.checkOutButton}
                          onPress={() => setShowCheckoutModal(true)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.checkOutButtonText}>Check Out</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.completedButton}>
                          <Text style={styles.completedButtonText}>Attendance Completed</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={styles.noRecordContainer}>
                    <View style={styles.noRecordIconContainer}>
                      <Ionicons name="time-outline" size={32} color="#9ca3af" />
                    </View>
                    <Text style={styles.noRecordText}>No record for today</Text>
                    <Text style={styles.noRecordSubtext}>Check in to start tracking your attendance</Text>
                    
                    {/* Check In Button */}
                    <TouchableOpacity
                      style={styles.checkInButton}
                      onPress={() => openCamera(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="log-in-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.checkInButtonText}>Check In</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>

              {/* Attendance History Card */}
              <Card style={styles.historyCard}>
                <Text style={styles.historyTitle}>Attendance History</Text>
                <Text style={styles.historySubtitle}>Your recent attendance records</Text>
                
                {selfAttendanceHistory.length > 0 ? (
                  <View style={styles.historyList}>
                    {selfAttendanceHistory.slice(0, 10).map((item) => (
                      <View key={item.id} style={styles.historyItem}>
                        <View style={styles.historyItemLeft}>
                          <View style={styles.historyCalendarIcon}>
                            <Ionicons name="calendar-outline" size={18} color="#2563eb" />
                          </View>
                          <Text style={styles.historyItemDate}>
                            {format(new Date(item.date), "dd MMM yyyy")}
                          </Text>
                        </View>
                        <View style={styles.historyItemRight}>
                          <View style={styles.historyTimeGroup}>
                            <Text style={styles.historyTimeLabel}>In:</Text>
                            <Text style={styles.historyTimeValue}>{formatTime(item.checkInTime)}</Text>
                          </View>
                          <View style={styles.historyTimeGroup}>
                            <Text style={styles.historyTimeLabel}>Out:</Text>
                            <Text style={styles.historyTimeValue}>{formatTime(item.checkOutTime)}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noHistoryContainer}>
                    <Ionicons name="document-text-outline" size={32} color="#9ca3af" />
                    <Text style={styles.noHistoryText}>No attendance history</Text>
                  </View>
                )}
              </Card>
            </View>
          ) : (
            /* Employee Attendance View */
            <View style={styles.employeeAttendanceContainer}>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <Card key={record.id} style={styles.employeeAttendanceCard}>
                    <View style={styles.employeeCardHeader}>
                      <View style={styles.employeeInfo}>
                        <View style={styles.employeeAvatar}>
                          <Text style={styles.employeeAvatarText}>
                            {record.name ? record.name.charAt(0).toUpperCase() : "U"}
                          </Text>
                        </View>
                        <View style={styles.employeeDetails}>
                          <Text style={styles.employeeName}>{record.name}</Text>
                          <Text style={styles.employeeId}>{record.employeeId}</Text>
                          <Text style={styles.employeeDepartment}>{record.department}</Text>
                        </View>
                      </View>
                      <View style={styles.employeeStatus}>
                        <View style={[
                          styles.statusBadge,
                          record.status === 'late' ? styles.statusLate : styles.statusPresent
                        ]}>
                          <Text style={styles.statusBadgeText}>
                            {getStatusBadge(record)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.employeeAttendanceDetails}>
                      <View style={styles.attendanceDetailRow}>
                        <View style={styles.attendanceDetailItem}>
                          <View style={styles.attendanceDetailHeader}>
                            <Ionicons name="log-in-outline" size={18} color="#10b981" />
                            <Text style={styles.attendanceDetailLabel}>Check In</Text>
                          </View>
                          <Text style={styles.attendanceDetailValue}>{record.check_in || "-"}</Text>
                        </View>
                        <View style={styles.attendanceDetailItem}>
                          <View style={styles.attendanceDetailHeader}>
                            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                            <Text style={styles.attendanceDetailLabel}>Check Out</Text>
                          </View>
                          <Text style={styles.attendanceDetailValue}>{record.check_out || "-"}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.attendanceDetailRow}>
                        <View style={styles.attendanceDetailItem}>
                          <View style={styles.attendanceDetailHeader}>
                            <Ionicons name="time-outline" size={18} color="#6b7280" />
                            <Text style={styles.attendanceDetailLabel}>Hours</Text>
                          </View>
                          <Text style={styles.attendanceDetailValue}>{record.hours}</Text>
                        </View>
                        <View style={styles.attendanceDetailItem}>
                          <View style={styles.attendanceDetailHeader}>
                            <Ionicons name="location-outline" size={18} color="#6b7280" />
                            <Text style={styles.attendanceDetailLabel}>Location</Text>
                          </View>
                          <Text style={styles.attendanceDetailValue}>{record.location}</Text>
                        </View>
                      </View>
                      
                      {/* Selfie Section - Always show */}
                      <View style={styles.selfieSection}>
                        <Text style={styles.selfieSectionTitle}>Attendance Photos</Text>
                        <View style={styles.selfieRow}>
                            {record.selfie ? (
                              <TouchableOpacity 
                                style={styles.selfieContainer}
                                onPress={() => {
                                  console.log("📸 Opening selfie modal for:", record.name);
                                  console.log("Check-in selfie:", record.selfie);
                                  console.log("Check-out selfie:", record.checkOutSelfie);
                                  setSelectedRecord(record);
                                  setShowSelfieModal(true);
                                }}
                                activeOpacity={0.7}
                              >
                                <View style={styles.selfieImageWrapper}>
                                  <Image 
                                    source={{ uri: record.selfie }} 
                                    style={styles.selfieThumb}
                                    resizeMode="cover"
                                    onError={(error) => {
                                      console.error("❌ Failed to load check-in image:", record.selfie, error.nativeEvent.error);
                                    }}
                                    onLoad={() => {
                                      console.log("✅ Check-in image loaded:", record.selfie);
                                    }}
                                  />
                                  <View style={styles.selfieOverlay}>
                                    <Ionicons name="expand-outline" size={20} color="#fff" />
                                  </View>
                                </View>
                                <View style={styles.selfieLabelContainer}>
                                  <Ionicons name="log-in-outline" size={14} color="#10b981" />
                                  <Text style={styles.selfieLabel}>Check-in</Text>
                                </View>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.selfieContainer}>
                                <View style={[styles.selfieImageWrapper, styles.selfieEmpty]}>
                                  <Ionicons name="camera-outline" size={24} color="#9ca3af" />
                                </View>
                                <View style={styles.selfieLabelContainer}>
                                  <Ionicons name="log-in-outline" size={14} color="#9ca3af" />
                                  <Text style={[styles.selfieLabel, { color: "#9ca3af" }]}>No photo</Text>
                                </View>
                              </View>
                            )}
                            
                            {record.checkOutSelfie ? (
                              <TouchableOpacity 
                                style={styles.selfieContainer}
                                onPress={() => {
                                  console.log("📸 Opening selfie modal for:", record.name);
                                  console.log("Check-in selfie:", record.selfie);
                                  console.log("Check-out selfie:", record.checkOutSelfie);
                                  setSelectedRecord(record);
                                  setShowSelfieModal(true);
                                }}
                                activeOpacity={0.7}
                              >
                                <View style={styles.selfieImageWrapper}>
                                  <Image 
                                    source={{ uri: record.checkOutSelfie }} 
                                    style={styles.selfieThumb}
                                    resizeMode="cover"
                                    onError={(error) => {
                                      console.error("❌ Failed to load check-out image:", record.checkOutSelfie, error.nativeEvent.error);
                                    }}
                                    onLoad={() => {
                                      console.log("✅ Check-out image loaded:", record.checkOutSelfie);
                                    }}
                                  />
                                  <View style={styles.selfieOverlay}>
                                    <Ionicons name="expand-outline" size={20} color="#fff" />
                                  </View>
                                </View>
                                <View style={styles.selfieLabelContainer}>
                                  <Ionicons name="log-out-outline" size={14} color="#ef4444" />
                                  <Text style={styles.selfieLabel}>Check-out</Text>
                                </View>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.selfieContainer}>
                                <View style={[styles.selfieImageWrapper, styles.selfieEmpty]}>
                                  <Ionicons name="camera-outline" size={24} color="#9ca3af" />
                                </View>
                                <View style={styles.selfieLabelContainer}>
                                  <Ionicons name="log-out-outline" size={14} color="#9ca3af" />
                                  <Text style={[styles.selfieLabel, { color: "#9ca3af" }]}>No photo</Text>
                                </View>
                              </View>
                            )}
                          </View>
                        </View>
                    </View>
                  </Card>
                ))
              ) : (
                <View style={styles.emptyTableState}>
                  <Ionicons name="information-circle-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyTableText}>No attendance records found for the selected date</Text>
                </View>
              )}
            </View>
          )}
        </View>
          </>
        )}
        
        {/* Extra spacing for tab bar */}
        <View style={{ height: 60 }} />
      </ScrollView>

      {viewMode === 'employee' && datePickerVisible && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event: any, date?: Date) => {
            if (event.type === "dismissed") {
              setDatePickerVisible(false);
              return;
            }
            if (date) setSelectedDate(date);
            setDatePickerVisible(false);
          }}
        />
      )}

      {viewMode === 'employee' && (
        <Modal visible={roleSheetVisible} transparent animationType="fade">
          <View style={styles.roleModalOverlay}>
            <View style={styles.roleModalContent}>
              <Text style={styles.roleModalTitle}>Select Role</Text>
              {(["All Roles", "Team Lead", "Employee"]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleOption, filterStatus === r && styles.roleOptionActive]}
                  onPress={() => { setFilterStatus(r); setRoleSheetVisible(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.roleOptionText, filterStatus === r && styles.roleOptionTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.roleModalButtons}>
                <Button mode="outlined" onPress={() => setRoleSheetVisible(false)}>Close</Button>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Export CSV Modal */}
      <Modal visible={exportModalVisible} animationType="slide" transparent>
        <View style={styles.exportModalOverlay}> 
          <View style={styles.exportModalCard}> 
            <Text style={styles.exportModalTitle}>Export Attendance Report (CSV)</Text>
            <Text style={styles.exportModalSubtitle}>Configure your export preferences.</Text>

            {/* Quick Filter */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Quick Filter</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedQuickFilter}
                  onValueChange={(val) => {
                    setSelectedQuickFilter(val);
                    if (val === "Today") {
                      const d = new Date(); setExportStartDate(d); setExportEndDate(d);
                    } else if (val === "Yesterday") {
                      const d = new Date(); d.setDate(d.getDate() - 1); setExportStartDate(d); setExportEndDate(d);
                    } else if (val === "Last 7 Days") {
                      const d = new Date(); const start = new Date(); start.setDate(d.getDate() - 6); setExportStartDate(start); setExportEndDate(d);
                    } else if (val === "This Month") {
                      const d = new Date(); const start = new Date(d.getFullYear(), d.getMonth(), 1); setExportStartDate(start); setExportEndDate(d);
                    }
                  }}
                >
                  {quickFilterOptions.map((opt) => (
                    <Picker.Item key={opt} label={opt} value={opt} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Date Range */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Start Date</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowStartPicker(true)}>
                  <Text style={styles.inputText}>{exportStartDate ? format(exportStartDate, "MMMM do, yyyy") : "Select start date"}</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={exportStartDate || new Date()}
                    mode="date"
                    onChange={(e, date) => { setShowStartPicker(false); if (date) setExportStartDate(date); }}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>End Date</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowEndPicker(true)}>
                  <Text style={styles.inputText}>{exportEndDate ? format(exportEndDate, "MMMM do, yyyy") : "Select end date"}</Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={exportEndDate || new Date()}
                    mode="date"
                    onChange={(e, date) => { setShowEndPicker(false); if (date) setExportEndDate(date); }}
                  />
                )}
              </View>
            </View>

            {/* Employee Filter */}
            <View style={{ marginTop: 16 }}>
              <Text style={styles.label}>Employee Filter</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <TouchableOpacity onPress={() => setEmployeeFilter("all")} style={styles.radioRow}>
                  <View style={[styles.radio, employeeFilter === 'all' && styles.radioActive]} />
                  <Text style={styles.radioLabel}>All Employees</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEmployeeFilter("specific")} style={styles.radioRow}>
                  <View style={[styles.radio, employeeFilter === 'specific' && styles.radioActive]} />
                  <Text style={styles.radioLabel}>Specific Employee</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Department */}
            <View style={{ marginTop: 16 }}>
              <Text style={styles.label}>Department</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={selectedDepartment} onValueChange={(val) => setSelectedDepartment(val)}>
                  <Picker.Item label="All" value="" />
                  {Array.from(new Set(attendanceRecords.map((r) => r.department))).map((dept) => (
                    <Picker.Item key={dept} label={dept} value={dept} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Select Employee */}
            {employeeFilter === 'specific' && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.label}>Select Employee</Text>
                <TextInput
                  placeholder="Search by name or employee ID..."
                  style={[styles.input, { marginBottom: 10 }]}
                  value={employeeSearch}
                  onChangeText={setEmployeeSearch}
                />
                <View style={styles.employeeList}>
                  {attendanceRecords
                    .filter((r) => (selectedDepartment ? r.department === selectedDepartment : true))
                    .filter((r) => [r.name, r.employeeId].some((f: string) => f.toLowerCase().includes(employeeSearch.toLowerCase())))
                    .map((r) => (
                      <TouchableOpacity
                        key={r.employeeId}
                        style={[styles.employeeListItem, selectedEmployeeId === r.employeeId && styles.employeeListItemActive]}
                        onPress={() => setSelectedEmployeeId(r.employeeId)}
                      >
                        <Text style={styles.employeeName}>{r.name}</Text>
                        <Text style={styles.employeeMeta}>ID: {r.employeeId}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: "#e5e7eb" }]} onPress={() => setExportModalVisible(false)}>
                <Text style={{ fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#2563eb" }]}
                onPress={async () => { await onExportCsv(); setExportModalVisible(false); }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>Export CSV</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* Export PDF Modal (same form as CSV) */}
      <Modal visible={pdfExportModalVisible} animationType="slide" transparent>
        <View style={styles.exportModalOverlay}> 
          <View style={styles.exportModalCard}> 
            <Text style={styles.exportModalTitle}>Export Attendance Report (PDF)</Text>
            <Text style={styles.exportModalSubtitle}>Configure your export preferences.</Text>

            {/* Quick Filter */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Quick Filter</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedQuickFilter}
                  onValueChange={(val) => {
                    setSelectedQuickFilter(val);
                    if (val === "Today") {
                      const d = new Date(); setExportStartDate(d); setExportEndDate(d);
                    } else if (val === "Yesterday") {
                      const d = new Date(); d.setDate(d.getDate() - 1); setExportStartDate(d); setExportEndDate(d);
                    } else if (val === "Last 7 Days") {
                      const d = new Date(); const start = new Date(); start.setDate(d.getDate() - 6); setExportStartDate(start); setExportEndDate(d);
                    } else if (val === "This Month") {
                      const d = new Date(); const start = new Date(d.getFullYear(), d.getMonth(), 1); setExportStartDate(start); setExportEndDate(d);
                    }
                  }}
                >
                  {quickFilterOptions.map((opt) => (
                    <Picker.Item key={opt} label={opt} value={opt} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Date Range */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Start Date</Text>
                <TouchableOpacity style={styles.input}>
                  <Text style={styles.inputText}>{exportStartDate ? format(exportStartDate, "MMMM do, yyyy") : "Select start date"}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>End Date</Text>
                <TouchableOpacity style={styles.input}>
                  <Text style={styles.inputText}>{exportEndDate ? format(exportEndDate, "MMMM do, yyyy") : "Select end date"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Employee Filter */}
            <View style={{ marginTop: 16 }}>
              <Text style={styles.label}>Employee Filter</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <TouchableOpacity onPress={() => setEmployeeFilter("all")} style={styles.radioRow}>
                  <View style={[styles.radio, employeeFilter === 'all' && styles.radioActive]} />
                  <Text style={styles.radioLabel}>All Employees</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEmployeeFilter("specific")} style={styles.radioRow}>
                  <View style={[styles.radio, employeeFilter === 'specific' && styles.radioActive]} />
                  <Text style={styles.radioLabel}>Specific Employee</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Department */}
            <View style={{ marginTop: 16 }}>
              <Text style={styles.label}>Department</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={selectedDepartment} onValueChange={(val) => setSelectedDepartment(val)}>
                  <Picker.Item label="All" value="" />
                  {Array.from(new Set(attendanceRecords.map((r) => r.department))).map((dept) => (
                    <Picker.Item key={dept} label={dept} value={dept} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Select Employee */}
            {employeeFilter === 'specific' && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.label}>Select Employee</Text>
                <TextInput
                  placeholder="Search by name or employee ID..."
                  style={[styles.input, { marginBottom: 10 }]}
                  value={employeeSearch}
                  onChangeText={setEmployeeSearch}
                />
                <View style={styles.employeeList}>
                  {attendanceRecords
                    .filter((r) => (selectedDepartment ? r.department === selectedDepartment : true))
                    .filter((r) => [r.name, r.employeeId].some((f: string) => f.toLowerCase().includes(employeeSearch.toLowerCase())))
                    .map((r) => (
                      <TouchableOpacity
                        key={r.employeeId}
                        style={[styles.employeeListItem, selectedEmployeeId === r.employeeId && styles.employeeListItemActive]}
                        onPress={() => setSelectedEmployeeId(r.employeeId)}
                      >
                        <Text style={styles.employeeName}>{r.name}</Text>
                        <Text style={styles.employeeMeta}>ID: {r.employeeId}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: "#e5e7eb" }]} onPress={() => setPdfExportModalVisible(false)}>
                <Text style={{ fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#2563eb" }]}
                onPress={async () => { await onExportPdf(); setPdfExportModalVisible(false); }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>Export PDF</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* Camera View for Self Attendance */}
      {cameraVisible && (
        <Modal visible={cameraVisible} animationType="slide">
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={{ flex: 1, backgroundColor: "#000" }}>
              <CameraView 
                ref={cameraRef} 
                style={{ flex: 1 }} 
                facing="front"
              >
                <View style={styles.cameraOverlay}>
                  <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                    <View style={styles.captureInner} />
                  </TouchableOpacity>
                  <Button
                    mode="contained"
                    style={{ marginTop: 16 }}
                    onPress={() => setCameraVisible(false)}
                  >
                    Cancel
                  </Button>
                </View>
              </CameraView>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* Checkout Modal */}
      <Modal visible={showCheckoutModal} transparent animationType="slide">
        <View style={styles.checkoutModalOverlay}>
          <View style={styles.checkoutModalContent}>
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.checkoutModalClose}
              onPress={() => {
                setShowCheckoutModal(false);
                setWorkReportFile(null);
              }}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            
            <Text style={styles.checkoutModalTitle}>Confirm Check-out</Text>
            <Text style={styles.checkoutModalSubtitle}>
              Please provide today's work summary before checking out. You can optionally upload a work report PDF.
            </Text>
            
            {/* Work Summary Input */}
            <Text style={styles.checkoutInputLabel}>Today's Work Summary <Text style={{ color: '#ef4444' }}>*</Text></Text>
            <TextInput
              placeholder="Brief description of today's work..."
              value={todaysWork}
              onChangeText={setTodaysWork}
              style={styles.checkoutTextInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            {/* PDF Upload Section */}
            <Text style={styles.checkoutInputLabel}>Upload Work Report PDF (Optional)</Text>
            <TouchableOpacity 
              style={styles.filePickerButton}
              onPress={pickWorkReportFile}
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#2563eb" />
              <Text style={styles.filePickerText}>
                {workReportFile ? workReportFile.name : "Browse... No file selected."}
              </Text>
            </TouchableOpacity>
            
            {/* Selected File Preview */}
            {workReportFile && (
              <View style={styles.selectedFileContainer}>
                <View style={styles.selectedFileInfo}>
                  <Ionicons name="document-text" size={20} color="#10b981" />
                  <Text style={styles.selectedFileName} numberOfLines={1}>
                    {workReportFile.name}
                  </Text>
                </View>
                <TouchableOpacity onPress={clearWorkReportFile}>
                  <Ionicons name="close-circle" size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
            
            {/* Action Buttons */}
            <View style={styles.checkoutModalButtons}>
              <TouchableOpacity 
                style={styles.checkoutCancelButton}
                onPress={() => {
                  setShowCheckoutModal(false);
                  setWorkReportFile(null);
                }}
              >
                <Text style={styles.checkoutCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.checkoutProceedButton,
                  !todaysWork.trim() && styles.checkoutProceedButtonDisabled
                ]}
                onPress={confirmCheckOut}
                disabled={!todaysWork.trim()}
              >
                <Text style={styles.checkoutProceedText}>Proceed to Check-out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 📸 Selfie Modal */}
      <Modal visible={showSelfieModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setShowSelfieModal(false)}
              style={styles.modalClose}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={32} color="#fff" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderIcon}>
                  <Ionicons name="camera" size={24} color="#2563eb" />
                </View>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>
                    {selectedRecord?.name}'s Attendance Photos
                  </Text>
                  <Text style={styles.modalDate}>
                    {selectedRecord?.date ? format(new Date(selectedRecord.date), "MMMM dd, yyyy") : ""}
                  </Text>
                </View>
              </View>

              {/* Attendance Info */}
              <View style={styles.modalInfoCard}>
                <View style={styles.modalInfoRow}>
                  <Ionicons name="briefcase-outline" size={16} color="#6b7280" />
                  <Text style={styles.modalInfoText}>{selectedRecord?.department}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Ionicons name="time-outline" size={16} color="#6b7280" />
                  <Text style={styles.modalInfoText}>
                    {selectedRecord?.check_in} - {selectedRecord?.check_out || "In Progress"}
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Ionicons name="hourglass-outline" size={16} color="#6b7280" />
                  <Text style={styles.modalInfoText}>{selectedRecord?.hours} hours</Text>
                </View>
              </View>

              {/* Check-in Selfie */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Ionicons name="log-in" size={20} color="#10b981" />
                  <Text style={styles.modalSubtitle}>Check-in Photo</Text>
                  <Text style={styles.modalTime}>{selectedRecord?.check_in}</Text>
                </View>
                {selectedRecord?.selfie ? (
                  <View style={styles.selfieImgContainer}>
                    <Image
                      source={{ uri: selectedRecord.selfie }}
                      style={styles.selfieImg}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <View style={styles.emptySelfieBox}>
                    <Ionicons name="camera-outline" size={48} color="#9ca3af" />
                    <Text style={styles.emptySelfieText}>No Check-in Photo</Text>
                  </View>
                )}
              </View>

              {/* Check-out Selfie */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Ionicons name="log-out" size={20} color="#ef4444" />
                  <Text style={styles.modalSubtitle}>Check-out Photo</Text>
                  <Text style={styles.modalTime}>{selectedRecord?.check_out || "Not yet"}</Text>
                </View>
                {selectedRecord?.checkOutSelfie ? (
                  <View style={styles.selfieImgContainer}>
                    <Image
                      source={{ uri: selectedRecord.checkOutSelfie }}
                      style={styles.selfieImg}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <View style={styles.emptySelfieBox}>
                    <Ionicons name="camera-outline" size={48} color="#9ca3af" />
                    <Text style={styles.emptySelfieText}>
                      {selectedRecord?.check_out ? "No Check-out Photo" : "Not checked out yet"}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </PaperProvider>
  );
};

export default AttendanceManager;

// 🎨 Styles
const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#39549fff",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  scrollContentContainer: {
    padding: 16,
    flexGrow: 1,
  },
  // loaderContainer: { 
  //   flex: 1, 
  //   alignItems: "center", 
  //   justifyContent: "center", 
  //   backgroundColor: "white" 
  // },
  headerGradient: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#39549fff",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(10px)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  headerCenterActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    flex: 1,
  },
  exportBtnHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportBtnHeaderText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  headerRightSpace: {
    width: 44,
  },
  headerExportActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 20,
  },
  // Compact Header Styles
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 12,
  },
  headerExportActionsBelow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 8,
  },
  backButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  headerIconContainerCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  headerTextContainerCompact: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitleCompact: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  headerSubtitleCompact: {
    fontSize: 12,
    color: "#e0e7ff",
    opacity: 0.9,
    fontWeight: "500",
  },
  headerDateBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  headerDateText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  headerDayText: {
    color: "#bfdbfe",
    marginTop: 2,
    fontSize: 14,
  },
  headerExportActionsCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exportBtnCompact: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  exportBtnCompactText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  exportModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center" },
  exportModalCard: { backgroundColor: "#fff", marginHorizontal: 20, borderRadius: 16, padding: 16 },
  exportModalTitle: { fontSize: 18, fontWeight: "700" },
  exportModalSubtitle: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  pickerContainer: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, overflow: "hidden", backgroundColor: "#fff" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, backgroundColor: "#fff" },
  inputText: { color: "#111827", fontSize: 14 },
  radioRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#2563eb" },
  radioActive: { backgroundColor: "#2563eb" },
  radioLabel: { fontSize: 14, color: "#374151" },
  employeeList: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, overflow: "hidden" },
  employeeListItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  employeeListItemActive: { backgroundColor: "#eef2ff" },
  employeeListName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  employeeMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  modalButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: "center", marginHorizontal: 6 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  headerContent: {
    marginTop: 8,
  },
  headerTitleSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 2,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "white",
    marginBottom: 6,
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#e0e7ff",
    opacity: 0.95,
    lineHeight: 20,
    letterSpacing: 0.3,
    fontWeight: "500",
  },
  exportSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  statsContainer: {
    backgroundColor: "#39549fff",
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 10,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsIcon: {
    marginBottom: 6,
  },
  cardLabel: { 
    fontSize: 12, 
    color: "#fff",
    marginBottom: 4,
    fontWeight: "500",
  },
  cardValue: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#111827" 
  },
  headerIcon: {
    marginRight: 8,
  },
  exportButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    minWidth: 80,
    justifyContent: "center",
  },
  exportBtnSecondary: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  exportBtnText: { 
    color: "#1e40af", 
    marginLeft: 6, 
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  recordsHeader: {
    marginBottom: 16,
  },
  recordsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  recordsSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    flex: 1,
    marginRight: 8,
  },
  searchInput: { flex: 1, height: 40 },
  filterBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filterText: { 
    marginLeft: 6, 
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "500",
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  dateText: {
    marginLeft: 6,
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "500",
  },
  tableContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    alignItems: "center",
  },
  tableContent: {
    minWidth: 1000, // Minimum width for horizontal scrolling
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    paddingVertical: 8,
  },
  // Column width styles
  columnEmployee: {
    width: 140,
    textAlign: "left",
    paddingLeft: 16,
  },
  columnEmployeeId: {
    width: 100,
  },
  columnDepartment: {
    width: 120,
  },
  columnTime: {
    width: 90,
  },
  columnHours: {
    width: 70,
  },
  columnLocation: {
    width: 120,
  },
  columnSelfie: {
    width: 80,
  },
  columnStatus: {
    width: 90,
    paddingRight: 16,
  },
  emptyTableState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 20,
    minHeight: 200,
  },
  emptyTableText: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  recordCard: {
    backgroundColor: "#fff",
    marginBottom: 10,
    borderRadius: 10,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  userRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  userName: { fontWeight: "600", fontSize: 15 },
  userEmail: { color: "#6b7280", fontSize: 12 },
  recordRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  recordText: { marginLeft: 6, color: "#111827", fontSize: 13 },
  locationText: { marginLeft: 6, color: "#6b7280", fontSize: 12 },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  statusLate: { backgroundColor: "#f87171" },
  statusPresent: { backgroundColor: "#10b981" },
  statusActive: { backgroundColor: "#3b82f6" },
  emptyState: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#9ca3af", fontSize: 14, marginTop: 10 },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.85)", 
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    maxHeight: "90%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalClose: {
    position: "absolute",
    top: -15,
    right: -15,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  modalInfoCard: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalInfoText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  modalSection: { 
    marginBottom: 24,
  },
  modalSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  modalSubtitle: { 
    fontWeight: "700", 
    color: "#111827",
    fontSize: 15,
    flex: 1,
  },
  modalTime: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selfieImgContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  selfieImg: { 
    width: "100%", 
    height: 300,
  },
  emptySelfieBox: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    height: 200,
    borderRadius: 16,
    backgroundColor: "#f9fafb",
  },
  emptySelfieText: { 
    color: "#9ca3af", 
    marginTop: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  roleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  roleModalContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  roleModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
    textAlign: 'center',
  },
  roleOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  roleOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  roleOptionText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  roleOptionTextActive: {
    color: '#2563eb',
  },
  roleModalButtons: {
    marginTop: 8,
    alignItems: 'center',
  },
  // Toggle Switch Styles
  toggleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  toggleContainerHorizontal: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  toggleWrapper: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  toggleWrapperHorizontal: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  toggleLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    minWidth: 32,
    textAlign: 'center',
  },
  toggleLabelActive: {
    color: '#fff',
    opacity: 1,
  },
  toggleSwitch: {
    marginVertical: 4,
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }, { rotate: '90deg' }],
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  toggleButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  toggleButtonTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  adminToggleContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  adminToggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  adminToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  adminToggleButtonActive: {
    backgroundColor: '#2563eb',
  },
  adminToggleIcon: {
    marginRight: 6,
  },
  adminToggleText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  adminToggleTextActive: {
    color: '#fff',
  },
  // Self Attendance View Styles - Matching the design image
  selfViewContainer: {
    flex: 1,
  },
  // Date Badge Card
  dateBadgeCard: {
    backgroundColor: '#39549fff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    padding: 12,
    alignSelf: 'flex-start',
  },
  dateBadgeContent: {
    alignItems: 'flex-start',
  },
  dateBadgeDate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateBadgeDay: {
    color: '#bfdbfe',
    fontSize: 14,
    marginTop: 2,
  },
  // Location Card
  locationCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginLeft: 8,
  },
  locationCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationPinIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  locationAddressText: {
    fontSize: 14,
    color: '#1e3a8a',
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  locationSecondaryText: {
    fontSize: 13,
    color: '#3b82f6',
    marginTop: 2,
    marginLeft: 18,
  },
  locationCoordsText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: 6,
  },
  locationNoteText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 8,
  },
  // Today's Status Card
  todayStatusCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  todayStatusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  todayStatusContent: {
    gap: 12,
  },
  checkTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkTimeIcon: {
    marginRight: 8,
  },
  checkTimeLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  checkTimeValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  onTimeChip: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  onTimeChipText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
  },
  lateChip: {
    backgroundColor: '#fee2e2',
  },
  lateChipText: {
    color: '#dc2626',
  },
  actionButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  checkInButton: {
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 16,
  },
  checkInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  checkOutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completedButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  completedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noRecordContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noRecordIconContainer: {
    marginBottom: 12,
  },
  noRecordText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  noRecordSubtext: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  // History Card
  historyCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  historySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  historyList: {
    gap: 0,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyCalendarIcon: {
    marginRight: 8,
  },
  historyItemDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  historyItemRight: {
    flexDirection: 'row',
    gap: 16,
  },
  historyTimeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyTimeLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  historyTimeValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  noHistoryContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noHistoryText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
  },
  // Legacy styles kept for compatibility
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Camera Styles
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    borderColor: '#fff',
  },
  captureInner: {
    backgroundColor: '#fff',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  // Checkout Modal Styles
  checkoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  checkoutModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    position: 'relative',
  },
  checkoutModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  checkoutModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  checkoutModalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  checkoutInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  checkoutTextInput: {
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 10,
    padding: 14,
    minHeight: 100,
    marginBottom: 20,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#f9fafb',
    gap: 10,
  },
  filePickerText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  selectedFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  selectedFileName: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '500',
    flex: 1,
  },
  checkoutModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
  },
  checkoutCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  checkoutCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  checkoutProceedButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  checkoutProceedButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  checkoutProceedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Employee Attendance Styles
  employeeAttendanceContainer: {
    padding: 16,
  },
  employeeAttendanceCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  employeeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  employeeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 3,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 3,
    borderColor: '#e0f2fe',
  },
  employeeAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  employeeId: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 3,
    fontWeight: '500',
  },
  employeeDepartment: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  employeeStatus: {
    alignItems: 'flex-end',
  },
  employeeAttendanceDetails: {
    gap: 12,
  },
  attendanceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  attendanceDetailItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  attendanceDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendanceDetailLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  attendanceDetailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  // Selfie Display Styles
  selfieSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  selfieSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selfieRow: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'flex-start',
  },
  selfieContainer: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 120,
  },
  selfieImageWrapper: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    position: 'relative',
    marginBottom: 8,
  },
  selfieThumb: {
    width: '100%',
    height: '100%',
  },
  selfieEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  selfieOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 4,
    borderTopLeftRadius: 8,
  },
  selfieLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selfieLabel: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
  },
});
