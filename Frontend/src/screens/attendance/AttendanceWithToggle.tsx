import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { CameraView, useCameraPermissions } from "expo-camera";
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
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../lib/api";
import OnlineStatusToggle from "../../components/OnlineStatusToggle";

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

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  location?: string;
  selfie?: string | null;
  workHours?: number;
  status?: string;
}

export default function AttendanceWithToggle() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"self" | "employee">("self");
  const [cameraVisible, setCameraVisible] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(true);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [todaysWork, setTodaysWork] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [employeeAttendance, setEmployeeAttendance] = useState<AttendanceRecord[]>([]);
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Set status bar to match header color
  useEffect(() => {
    if (Platform.OS === "android") {
      setStatusBarBackgroundColor("#3b82f6", true);
    }
    setStatusBarStyle("light");
  }, []);

  useEffect(() => {
    requestPermissions();
    loadAttendanceData();
  }, [viewMode]);

  useEffect(() => {
    // Pulse animation for check-in button
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
    if (!permission?.granted) await requestPermission();
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    setHasLocationPermission(locationStatus === "granted");
    if (locationStatus === "granted") {
      const current = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    } else {
      Alert.alert("Permission Required", "Location access is needed for attendance.");
    }
  };

  const loadAttendanceData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      if (viewMode === "self") {
        const data = await apiService.getSelfAttendance(parseInt(user.id));
        const today = format(getCurrentISTTime(), "yyyy-MM-dd");
        const transformedData: AttendanceRecord[] = data.map((record: any) => ({
          id: record.attendance_id.toString(),
          userId: record.user_id.toString(),
          date: getISTDateString(record.check_in),
          checkInTime: formatTimeToIST(record.check_in),
          checkOutTime: record.check_out ? formatTimeToIST(record.check_out) : undefined,
          status: record.status || "present",
          location: record.gps_location,
          selfie: record.checkInSelfie || record.selfie,
          workHours: record.total_hours,
        }));
        setAttendanceHistory(transformedData);
        setCurrentAttendance(transformedData.find((r) => r.date === today) || null);
      } else {
        let data = await apiService.getAllAttendance(selectedDate);
        if (user.role === "hr" || user.role === "manager") {
          data = data.filter((record: any) => record.department === user.department);
        }
        const transformedData: AttendanceRecord[] = data.map((record: any) => ({
          id: record.attendance_id.toString(),
          userId: record.user_id.toString(),
          date: getISTDateString(record.check_in),
          checkInTime: formatTimeToIST(record.check_in),
          checkOutTime: record.check_out ? formatTimeToIST(record.check_out) : undefined,
          status: record.status || "present",
          location: record.gps_location,
          selfie: record.checkInSelfie || record.selfie,
          workHours: record.total_hours,
        }));
        setEmployeeAttendance(transformedData);
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to load attendance data.");
    } finally {
      setLoading(false);
    }
  };

  const openCamera = (checkIn: boolean) => {
    if (!permission?.granted) {
      Alert.alert("Permission Required", "Please allow camera access.");
      return;
    }
    setIsCheckingIn(checkIn);
    setCameraVisible(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const data = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      setCameraVisible(false);
      handleAttendance(data.uri);
    }
  };


  const handleAttendance = async (photoUri: string) => {
    if (!user?.id) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }
    setLoading(true);
    try {
      const gpsLocationString = location ? `${location.latitude},${location.longitude}` : "0,0";
      const base64Image = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (isCheckingIn) {
        const response = await apiService.checkIn(parseInt(user.id), gpsLocationString, base64Image);
        const istNow = getCurrentISTTime();
        const formattedTime = formatTimeToIST(istNow);
        const today = format(istNow, "yyyy-MM-dd");
        const record: AttendanceRecord = {
          id: response.attendance_id.toString(),
          userId: user.id.toString(),
          date: today,
          checkInTime: formattedTime,
          selfie: photoUri,
          status: "present",
          location: gpsLocationString,
        };
        setCurrentAttendance(record);
        setAttendanceHistory((prev) => [record, ...prev]);
        Alert.alert("✅ Checked In", "Successfully marked attendance!");
      } else if (currentAttendance) {
        const response = await apiService.checkOut(
          parseInt(user.id),
          gpsLocationString,
          base64Image,
          todaysWork || "Completed daily tasks"
        );
        const istNow = getCurrentISTTime();
        const formattedTime = formatTimeToIST(istNow);
        const updated = { ...currentAttendance, checkOutTime: formattedTime, workHours: response.total_hours };
        setCurrentAttendance(updated);
        setAttendanceHistory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setTodaysWork("");
        Alert.alert("✅ Checked Out", "Great work today!");
      }
      await loadAttendanceData();
    } catch (error: any) {
      Alert.alert("Attendance Error", error.message || "Unable to submit attendance.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportLoading(true);
      if (viewMode === "self" && user?.id) {
        await apiService.downloadAttendanceCSV(parseInt(user.id));
      } else if (user) {
        const departmentFilter = user.role === "hr" || user.role === "manager" ? user.department : undefined;
        await apiService.downloadAttendanceCSV(undefined, undefined, undefined, departmentFilter);
      }
      Alert.alert("Success", "CSV exported successfully!");
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Failed to export CSV");
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      if (viewMode === "self" && user?.id) {
        await apiService.downloadAttendancePDF(parseInt(user.id));
      } else if (user) {
        const departmentFilter = user.role === "hr" || user.role === "manager" ? user.department : undefined;
        await apiService.downloadAttendancePDF(undefined, undefined, undefined, departmentFilter);
      }
      Alert.alert("Success", "PDF exported successfully!");
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Failed to export PDF");
    } finally {
      setExportLoading(false);
    }
  };

  const formatTime = (time?: string) => time || "-";

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "present": return { bg: "#dcfce7", text: "#15803d" };
      case "absent": return { bg: "#fee2e2", text: "#dc2626" };
      case "late": return { bg: "#fef3c7", text: "#d97706" };
      default: return { bg: "#e0e7ff", text: "#4f46e5" };
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
                <LinearGradient colors={["#3b82f6", "#1d4ed8"]} style={styles.captureGradient}>
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
    <SafeAreaView style={[styles.container, { backgroundColor: "#3b82f6" }]} edges={["top"]}>
      <StatusBar style="light" backgroundColor="#3b82f6" translucent={false} />
      
      {/* Header with Gradient */}
      <LinearGradient colors={["#3b82f6", "#1e40af"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerGreeting}>Hello, {user?.name || "User"} 👋</Text>
            <Text style={styles.headerSubtitle}>{format(new Date(), "EEEE, MMM d, yyyy")}</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={24} color="#3b82f6" />
          </View>
        </View>
        
        {/* View Mode Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === "self" && styles.toggleBtnActive]}
            onPress={() => setViewMode("self")}
          >
            <Ionicons name="person-outline" size={18} color={viewMode === "self" ? "#3b82f6" : "#fff"} />
            <Text style={[styles.toggleText, viewMode === "self" && styles.toggleTextActive]}>My Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === "employee" && styles.toggleBtnActive]}
            onPress={() => setViewMode("employee")}
          >
            <Ionicons name="people-outline" size={18} color={viewMode === "employee" ? "#3b82f6" : "#fff"} />
            <Text style={[styles.toggleText, viewMode === "employee" && styles.toggleTextActive]}>Team View</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {viewMode === "self" ? (
          <>
            {/* Today's Status Card */}
            <View style={styles.statusCard}>
              <LinearGradient
                colors={currentAttendance?.checkOutTime ? ["#10b981", "#059669"] : currentAttendance?.checkInTime ? ["#f59e0b", "#d97706"] : ["#3b82f6", "#1e40af"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statusGradient}
              >
                <View style={styles.statusHeader}>
                  <View style={styles.statusIconContainer}>
                    <Ionicons
                      name={currentAttendance?.checkOutTime ? "checkmark-circle" : currentAttendance?.checkInTime ? "time" : "finger-print"}
                      size={40}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.statusInfo}>
                    <Text style={styles.statusTitle}>
                      {currentAttendance?.checkOutTime ? "Day Complete" : currentAttendance?.checkInTime ? "Working" : "Not Checked In"}
                    </Text>
                    <Text style={styles.statusSubtitle}>
                      {currentAttendance?.checkOutTime
                        ? `${currentAttendance.workHours?.toFixed(1) || 0} hours worked`
                        : currentAttendance?.checkInTime
                        ? `Since ${currentAttendance.checkInTime}`
                        : "Tap to check in"}
                    </Text>
                  </View>
                </View>

                <View style={styles.timeRow}>
                  <View style={styles.timeBlock}>
                    <Ionicons name="log-in-outline" size={20} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.timeLabel}>Check In</Text>
                    <Text style={styles.timeValue}>{formatTime(currentAttendance?.checkInTime)}</Text>
                  </View>
                  <View style={styles.timeDivider} />
                  <View style={styles.timeBlock}>
                    <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.timeLabel}>Check Out</Text>
                    <Text style={styles.timeValue}>{formatTime(currentAttendance?.checkOutTime)}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Action Button */}
            <View style={styles.actionContainer}>
              {!currentAttendance?.checkInTime ? (
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity style={styles.checkInBtn} onPress={() => openCamera(true)} activeOpacity={0.9}>
                    <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.actionBtnGradient}>
                      <Ionicons name="finger-print" size={28} color="#fff" />
                      <Text style={styles.actionBtnText}>Check In</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ) : !currentAttendance?.checkOutTime ? (
                <TouchableOpacity style={styles.checkOutBtn} onPress={() => setCheckoutModal(true)} activeOpacity={0.9}>
                  <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.actionBtnGradient}>
                    <Ionicons name="exit-outline" size={28} color="#fff" />
                    <Text style={styles.actionBtnText}>Check Out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                  <Text style={styles.completedText}>Attendance Completed for Today</Text>
                </View>
              )}
            </View>

            {/* Location Info */}
            {location && (
              <View style={styles.locationCard}>
                <Ionicons name="location" size={20} color="#3b82f6" />
                <Text style={styles.locationText}>
                  📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </Text>
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

            {/* Attendance History */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent History</Text>
              <TouchableOpacity style={styles.exportSmallBtn} onPress={handleExportCSV} disabled={exportLoading}>
                <Ionicons name="download-outline" size={18} color="#3b82f6" />
              </TouchableOpacity>
            </View>

            {attendanceHistory.length > 0 ? (
              attendanceHistory.slice(0, 7).map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyLeft}>
                    <View style={styles.historyDateBadge}>
                      <Text style={styles.historyDay}>{format(new Date(item.date), "dd")}</Text>
                      <Text style={styles.historyMonth}>{format(new Date(item.date), "MMM")}</Text>
                    </View>
                    <View style={styles.historyDetails}>
                      <Text style={styles.historyDayName}>{format(new Date(item.date), "EEEE")}</Text>
                      <View style={styles.historyTimeRow}>
                        <Ionicons name="log-in-outline" size={14} color="#6b7280" />
                        <Text style={styles.historyTimeText}>{formatTime(item.checkInTime)}</Text>
                        <Ionicons name="log-out-outline" size={14} color="#6b7280" style={{ marginLeft: 12 }} />
                        <Text style={styles.historyTimeText}>{formatTime(item.checkOutTime)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status).bg }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status).text }]}>
                      {item.workHours ? `${item.workHours.toFixed(1)}h` : item.status || "Present"}
                    </Text>
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
          <>
            {/* Employee View Header */}
            <View style={styles.employeeHeader}>
              <Text style={styles.employeeTitle}>Team Attendance</Text>
              <Text style={styles.employeeDate}>{selectedDate}</Text>
            </View>

            {/* Export Buttons */}
            <View style={styles.exportRow}>
              <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV} disabled={exportLoading}>
                <Ionicons name="document-text-outline" size={20} color="#3b82f6" />
                <Text style={styles.exportBtnText}>Export CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportButton} onPress={handleExportPDF} disabled={exportLoading}>
                <Ionicons name="document-outline" size={20} color="#ef4444" />
                <Text style={styles.exportBtnText}>Export PDF</Text>
              </TouchableOpacity>
            </View>

            {/* Employee List */}
            {employeeAttendance.length > 0 ? (
              employeeAttendance.map((item) => (
                <View key={item.id} style={styles.employeeCard}>
                  <View style={styles.employeeAvatar}>
                    <Ionicons name="person" size={24} color="#3b82f6" />
                  </View>
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>Employee #{item.userId}</Text>
                    <View style={styles.employeeTimeRow}>
                      <View style={styles.employeeTimeItem}>
                        <Ionicons name="log-in-outline" size={14} color="#22c55e" />
                        <Text style={styles.employeeTimeText}>{formatTime(item.checkInTime)}</Text>
                      </View>
                      <View style={styles.employeeTimeItem}>
                        <Ionicons name="log-out-outline" size={14} color="#ef4444" />
                        <Text style={styles.employeeTimeText}>{formatTime(item.checkOutTime)}</Text>
                      </View>
                      {item.workHours !== undefined && (
                        <View style={styles.employeeTimeItem}>
                          <Ionicons name="time-outline" size={14} color="#3b82f6" />
                          <Text style={styles.employeeTimeText}>{item.workHours.toFixed(1)}h</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status).bg }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status).text }]}>
                      {item.status || "Present"}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No attendance records for this date</Text>
              </View>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Checkout Modal */}
      <Modal visible={checkoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="exit-outline" size={32} color="#ef4444" />
              </View>
              <Text style={styles.modalTitle}>Ready to Check Out?</Text>
              <Text style={styles.modalSubtitle}>Add a quick summary of your work today</Text>
            </View>
            
            <TextInput
              placeholder="What did you accomplish today?"
              value={todaysWork}
              onChangeText={setTodaysWork}
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholderTextColor="#9ca3af"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCheckoutModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => {
                  setCheckoutModal(false);
                  openCamera(false);
                }}
              >
                <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.modalConfirmGradient}>
                  <Text style={styles.modalConfirmText}>Check Out</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: Platform.OS === "android" ? 10 : 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerGreeting: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: "#fff",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  toggleTextActive: {
    color: "#3b82f6",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: "#fff",
  },
  statusCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  statusGradient: {
    padding: 20,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  statusIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  statusSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  timeRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 16,
  },
  timeBlock: {
    flex: 1,
    alignItems: "center",
  },
  timeDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 16,
  },
  timeLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 6,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginTop: 4,
  },
  actionContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  checkInBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  checkOutBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  actionBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 48,
    gap: 10,
  },
  actionBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  completedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  locationText: {
    fontSize: 13,
    color: "#3b82f6",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  exportSmallBtn: {
    padding: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  historyDateBadge: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  historyDay: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3b82f6",
  },
  historyMonth: {
    fontSize: 11,
    fontWeight: "600",
    color: "#60a5fa",
    textTransform: "uppercase",
  },
  historyDetails: {
    flex: 1,
  },
  historyDayName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  historyTimeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyTimeText: {
    fontSize: 13,
    color: "#6b7280",
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 12,
  },
  employeeHeader: {
    marginBottom: 16,
  },
  employeeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  employeeDate: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  exportRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  exportButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  employeeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 6,
  },
  employeeTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
  employeeTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  employeeTimeText: {
    fontSize: 12,
    color: "#6b7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1f2937",
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  modalConfirmBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalConfirmGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingBox: {
    backgroundColor: "#fff",
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 12,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraGradient: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 60,
  },
  cameraFrame: {
    width: 250,
    height: 300,
    position: "absolute",
    top: "25%",
  },
  cornerBorder: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#fff",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  cameraHint: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 30,
    opacity: 0.8,
  },
  captureButton: {
    borderRadius: 40,
    overflow: "hidden",
    marginBottom: 20,
  },
  captureGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelCameraBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  cancelCameraText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
