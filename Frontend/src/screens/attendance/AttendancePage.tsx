import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { CameraView } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar, setStatusBarBackgroundColor, setStatusBarStyle } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
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
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../lib/api";
import OnlineStatusToggle from "../../components/OnlineStatusToggle";
import CameraService, { CameraPhoto } from "../../services/cameraService";
import LocationService from "../../services/locationService";
import { requestAttendancePermissions } from "../../utils/permissions";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// IST Timezone helpers
const getCurrentISTTime = (): Date => new Date();

const convertToIST = (dateString: string | Date): Date => {
  if (dateString instanceof Date) return dateString;
  if (!dateString.includes('Z') && !dateString.includes('+')) {
    const utcDate = new Date(dateString + 'Z');
    if (!isNaN(utcDate.getTime())) return utcDate;
  }
  return new Date(dateString);
};

const formatAttendanceDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const getDayOfWeek = (date: Date): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

const formatTimeToIST = (dateString: string | Date | undefined): string => {
  if (!dateString) return "-";
  try {
    const date = convertToIST(dateString);
    if (isNaN(date.getTime())) return "-";
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  } catch { return "-"; }
};

const formatDateToIST = (dateString: string | Date | undefined): string => {
  if (!dateString) return "-";
  try {
    const date = convertToIST(dateString);
    if (isNaN(date.getTime())) return "-";
    return formatAttendanceDate(date);
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
}

// Animated Pulse Component for live status
const PulseIndicator = ({ color = "#22c55e" }: { color?: string }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Set status bar to match header color
  useEffect(() => {
    if (Platform.OS === "android") {
      setStatusBarBackgroundColor("#3b82f6", true);
    }
    setStatusBarStyle("light");
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
  const cameraRef = useRef<any>(null);
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const initialize = async () => {
      await requestPermissions();
      await loadAttendanceData();
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
      const today = format(istNow, "yyyy-MM-dd");
      const transformedData: AttendanceRecord[] = data.map((record: any) => {
        const workReportPath = record.work_report || record.workReport;
        let workReportFileName: string | undefined;
        if (workReportPath) {
          const parts = workReportPath.split('/');
          workReportFileName = parts[parts.length - 1];
        }
        const checkInDate = new Date(record.check_in);
        const checkInDateIST = checkInDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        
        return {
          id: record.attendance_id.toString(),
          date: checkInDateIST,
          checkInTime: formatTimeToIST(record.check_in),
          checkOutTime: record.check_out ? formatTimeToIST(record.check_out) : undefined,
          status: record.status || "present",
          selfie: record.checkInSelfie || record.selfie,
          checkInSelfie: record.checkInSelfie,
          checkOutSelfie: record.checkOutSelfie,
          workSummary: record.work_summary || record.workSummary,
          workReportFileName,
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
      const coords = await LocationService.getLocationWithRetry(3, { accuracy: 'high', timeout: 20000 });
      setLocation(coords);
      try {
        const address = await LocationService.getAddressFromCoordinates(coords);
        if (address?.formattedAddress) {
          setLocationAddress(address.formattedAddress);
        }
      } catch (addressError) {
        console.warn("Address lookup failed:", addressError);
      }

      const gpsLocationString = LocationService.formatCoordinatesForAPI(coords);
      const base64Image = photo.base64 ?? await CameraService.photoToBase64(photo.uri);

      if (isCheckingIn) {
        const response = await apiService.checkIn(parseInt(user.id), gpsLocationString, base64Image);
        const istNow = getCurrentISTTime();
        const formattedTime = formatTimeToIST(istNow);
        const today = format(istNow, "yyyy-MM-dd");

        const record: AttendanceRecord = {
          id: response.attendance_id.toString(),
          date: today,
          checkInTime: formattedTime,
          selfie: photo.uri,
          status: "present",
        };
        
        setCurrentAttendance(record);
        setAttendanceHistory((prev) => [record, ...prev]);
        Alert.alert("✅ Success", "You've checked in successfully!");
      } else if (currentAttendance) {
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
        };
        
        setCurrentAttendance(updated);
        setAttendanceHistory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setWorkSummaryForCheckout("");
        setTodaysWork("");
        setWorkReportFile(null);
        Alert.alert("✅ Success", "You've checked out successfully!");
      }
      await loadAttendanceData();
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

  const formatTime = (time?: string) => (time ? time : "-");

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
      <StatusBar style="light" backgroundColor="#3b82f6" translucent={false} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: "#3b82f6" }]} edges={['top']}>
      
      {/* Premium Header with Gradient */}
      <LinearGradient colors={["#3b82f6", "#1e40af"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
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
              <Ionicons name="calendar" size={24} color="#3b82f6" />
            </View>
            <View style={styles.dateInfo}>
              <Text style={styles.dateText}>{formatAttendanceDate(getCurrentISTTime())}</Text>
              <Text style={styles.dayText}>{getDayOfWeek(getCurrentISTTime())}</Text>
            </View>
            <View style={styles.timeDisplay}>
              <Text style={styles.currentTime}>{format(getCurrentISTTime(), "hh:mm")}</Text>
              <Text style={styles.ampm}>{format(getCurrentISTTime(), "a")}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
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
          {user?.id && (
            <OnlineStatusToggle
              userId={parseInt(user.id)}
              isCheckedIn={!!currentAttendance?.checkInTime}
              isCheckedOut={!!currentAttendance?.checkOutTime}
              onStatusChange={(isOnline, summary) => {
                console.log(`Status changed to ${isOnline ? 'Online' : 'Offline'}`, summary);
              }}
            />
          )}

          {/* Today's Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusCardHeader}>
              <Text style={styles.sectionTitle}>Today's Status</Text>
              {currentAttendance?.status && (
                <View style={[styles.statusChip, { backgroundColor: currentAttendance.status === "late" ? "#fef2f2" : "#f0fdf4" }]}>
                  <View style={[styles.statusDot, { backgroundColor: currentAttendance.status === "late" ? "#ef4444" : "#22c55e" }]} />
                  <Text style={[styles.statusChipText, { color: currentAttendance.status === "late" ? "#dc2626" : "#16a34a" }]}>
                    {currentAttendance.status === "late" ? "Late" : "On Time"}
                  </Text>
                </View>
              )}
            </View>

            {currentAttendance ? (
              <View style={styles.timeCardsContainer}>
                {/* Check-in Card */}
                <View style={[styles.timeCard, styles.checkInCard]}>
                  <View style={styles.timeCardIcon}>
                    <Ionicons name="log-in" size={20} color="#22c55e" />
                  </View>
                  <Text style={styles.timeCardLabel}>Check-in</Text>
                  <Text style={styles.timeCardValue}>{formatTime(currentAttendance.checkInTime)}</Text>
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
                </View>
              </View>
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
              {!currentAttendance?.checkInTime ? (
                <TouchableOpacity style={styles.checkInButton} onPress={() => openCamera(true)} activeOpacity={0.85}>
                  <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.actionButtonGradient}>
                    <Ionicons name="finger-print" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Check In</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : !currentAttendance?.checkOutTime ? (
                <TouchableOpacity style={styles.checkOutButton} onPress={() => setShowCheckoutModal(true)} activeOpacity={0.85}>
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

          {/* Attendance History */}
          <View style={styles.historySection}>
            <View style={styles.historySectionHeader}>
              <Text style={styles.sectionTitle}>Attendance History</Text>
              <Text style={styles.historyCount}>{attendanceHistory.length} records</Text>
            </View>
            
            {attendanceHistory.length > 0 ? (
              <View style={styles.historyList}>
                {attendanceHistory.slice(0, 10).map((item, index) => (
                  <View key={item.id} style={[styles.historyItem, index === 0 && styles.historyItemFirst]}>
                    <View style={styles.historyDateBadge}>
                      <Text style={styles.historyDateDay}>{formatDateToIST(item.date).split(' ')[0]}</Text>
                      <Text style={styles.historyDateMonth}>{formatDateToIST(item.date).split(' ')[1]}</Text>
                    </View>
                    <View style={styles.historyDetails}>
                      <View style={styles.historyTimeRow}>
                        <View style={styles.historyTimeBlock}>
                          <Ionicons name="enter-outline" size={14} color="#22c55e" />
                          <Text style={styles.historyTimeText}>{formatTime(item.checkInTime)}</Text>
                        </View>
                        <View style={styles.historyTimeDivider} />
                        <View style={styles.historyTimeBlock}>
                          <Ionicons name="exit-outline" size={14} color={item.checkOutTime ? "#ef4444" : "#9ca3af"} />
                          <Text style={[styles.historyTimeText, !item.checkOutTime && styles.pendingText]}>
                            {item.checkOutTime ? formatTime(item.checkOutTime) : "Pending"}
                          </Text>
                        </View>
                      </View>
                      {item.workSummary && (
                        <Text style={styles.historyWorkSummary} numberOfLines={1}>{item.workSummary}</Text>
                      )}
                    </View>
                    <View style={[styles.historyStatusDot, { backgroundColor: item.checkOutTime ? "#22c55e" : "#f59e0b" }]} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyHistory}>
                <Ionicons name="calendar-outline" size={40} color="#d1d5db" />
                <Text style={styles.emptyHistoryText}>No attendance history yet</Text>
              </View>
            )}
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
      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#3b82f6" },
  safeArea: { flex: 1 },
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  headerGradient: { paddingBottom: 20 },
  headerContent: { paddingHorizontal: 20, paddingTop: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backButton: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitleContainer: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  statusBadge: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, gap: 6,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  dateCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  dateIconContainer: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: "#eff6ff",
    alignItems: "center", justifyContent: "center",
  },
  dateInfo: { flex: 1, marginLeft: 14 },
  dateText: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  dayText: { fontSize: 13, color: "#64748b", marginTop: 2 },
  timeDisplay: { flexDirection: "row", alignItems: "baseline" },
  currentTime: { fontSize: 28, fontWeight: "700", color: "#1e3a8a" },
  ampm: { fontSize: 14, fontWeight: "600", color: "#64748b", marginLeft: 4 },
  
  contentContainer: { flex: 1, backgroundColor: "#fff", marginTop: 0 },
  scrollContent: { padding: 20, paddingBottom: 40 },

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

  statusCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  statusCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  statusChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 6 },
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
    backgroundColor: "#fff", borderRadius: 16, padding: 20, marginTop: 8,
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  historySectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  historyCount: { fontSize: 13, color: "#64748b", fontWeight: "500" },
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
  historyWorkSummary: { fontSize: 12, color: "#64748b", marginTop: 4 },
  historyStatusDot: { width: 10, height: 10, borderRadius: 5 },
  emptyHistory: { alignItems: "center", paddingVertical: 32 },
  emptyHistoryText: { fontSize: 14, color: "#94a3b8", marginTop: 12 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContainer: { width: "100%", maxWidth: 400, backgroundColor: "#fff", borderRadius: 24, overflow: "hidden" },
  modalHeader: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20, position: "relative" },
  modalCloseBtn: { position: "absolute", top: 16, right: 16, padding: 4 },
  modalTitle: { fontSize: 22, fontWeight: "700", color: "#fff", marginTop: 12 },
  modalSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4, textAlign: "center" },
  modalBody: { padding: 24 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#334155", marginBottom: 8 },
  required: { color: "#ef4444" },
  optional: { color: "#94a3b8", fontWeight: "400" },
  textInput: {
    borderWidth: 2, borderColor: "#e2e8f0", borderRadius: 14, padding: 16,
    minHeight: 100, fontSize: 15, color: "#1e293b", backgroundColor: "#f8fafc",
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
});
