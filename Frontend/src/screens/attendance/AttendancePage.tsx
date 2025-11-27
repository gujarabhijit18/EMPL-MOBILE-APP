import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Button, Card, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
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

// Helper to build full selfie URL from backend path
const buildSelfieUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  // If already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Build full URL using API base
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

export default function AttendancePage() {
  const { user } = useAuth();
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(true);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [todaysWork, setTodaysWork] = useState("");
  const [workReportFile, setWorkReportFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const navigation = useNavigation();

  useEffect(() => {
    requestPermissions();
    loadAttendanceData();
  }, []);

  // ✅ Request camera + location permission
  const requestPermissions = async () => {
    try {
      if (!permission?.granted) {
        const cameraResult = await requestPermission();
        if (!cameraResult.granted) {
          Alert.alert("Camera Permission Required", "Please enable camera access in settings to use attendance features.");
          return;
        }
      }

      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(locationStatus === "granted");

      if (locationStatus === "granted") {
        try {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          
          const coords = {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          };
          
          setLocation(coords);
          
          console.log("📍 Location captured:", {
            lat: coords.latitude,
            lon: coords.longitude,
            accuracy: currentLocation.coords.accuracy
          });
          
          // Get human-readable address
          try {
            const [place] = await Location.reverseGeocodeAsync(coords);
            if (place) {
              const addressParts = [
                place.name,
                place.street,
                place.district || place.subregion,
                place.city,
                place.region,
                place.country
              ].filter(Boolean);
              
              const formattedAddress = addressParts.join(", ");
              setLocationAddress(formattedAddress || "Location detected");
              console.log("📍 Address:", formattedAddress);
            } else {
              setLocationAddress(`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
            }
          } catch (geoError) {
            console.warn("Failed to reverse geocode:", geoError);
            setLocationAddress(`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
          }
        } catch (locError) {
          console.error("Failed to get location:", locError);
          Alert.alert("Location Error", "Unable to get your location. Please ensure GPS is enabled.");
        }
      } else {
        Alert.alert("Location Permission Required", "Location access is needed for attendance tracking.");
      }
    } catch (error) {
      console.error("Permission request error:", error);
    }
  };

  // ✅ Load attendance data from API
  const loadAttendanceData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      // For HR and Manager, show only their department's attendance
      // For others, show their own attendance
      let data;
      if (user.role === "hr" || user.role === "manager") {
        // Get all attendance and filter by department
        data = await apiService.getAllAttendance();
        // Filter by user's department
        data = data.filter((record: any) => record.department === user.department);
      } else {
        // Regular employees see only their own attendance
        data = await apiService.getSelfAttendance(parseInt(user.id));
      }
      
      // Transform API data to match component structure
      const today = format(new Date(), "yyyy-MM-dd");
      const transformedData: AttendanceRecord[] = data.map((record: any) => {
        // Extract work report filename from path if available
        const workReportPath = record.work_report || record.workReport;
        let workReportFileName: string | undefined;
        if (workReportPath) {
          const parts = workReportPath.split('/');
          workReportFileName = parts[parts.length - 1];
        }
        
        return {
          id: record.attendance_id.toString(),
          date: format(new Date(record.check_in), "yyyy-MM-dd"),
          checkInTime: format(new Date(record.check_in), "hh:mm a"),
          checkOutTime: record.check_out ? format(new Date(record.check_out), "hh:mm a") : undefined,
          status: "present",
          selfie: record.checkInSelfie || record.selfie,
          checkInSelfie: record.checkInSelfie,
          checkOutSelfie: record.checkOutSelfie,
          workSummary: record.work_summary || record.workSummary,
          workReportFileName: workReportFileName,
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

  // ✅ Open camera (Expo)
  const openCamera = (checkIn: boolean) => {
    if (!permission?.granted) {
      Alert.alert("Permission Required", "Please grant camera access.");
      return;
    }
    setIsCheckingIn(checkIn);
    setCameraVisible(true);
  };

  // ✅ Capture photo
  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      setCameraVisible(false);
      handleSubmitAttendance(photo.uri);
    }
  };

  // ✅ Submit attendance with real API
  const handleSubmitAttendance = async (photoUri: string) => {
    if (!user?.id) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    setIsLoading(true);
    try {
      const gpsLocationString = location 
        ? `${location.latitude},${location.longitude}` 
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

        const record: AttendanceRecord = {
          id: response.attendance_id.toString(),
          date: today,
          checkInTime: formattedTime,
          selfie: photoUri,
          status: "present",
        };
        
        setCurrentAttendance(record);
        setAttendanceHistory((prev) => [record, ...prev]);
        Alert.alert("Success", "Checked In Successfully!");
      } else if (currentAttendance) {
        // Call check-out API with work summary and optional file
        await apiService.checkOut(
          parseInt(user.id),
          gpsLocationString,
          base64Image,
          workSummaryForCheckout || "Completed daily tasks",
          workReportFile
        );

        const formattedTime = format(new Date(), "hh:mm a");
        const updated: AttendanceRecord = {
          ...currentAttendance,
          checkOutTime: formattedTime,
          workSummary: workSummaryForCheckout || "Completed daily tasks",
          workReportFileName: workReportFile?.name,
        };
        
        setCurrentAttendance(updated);
        setAttendanceHistory((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        
        // Clear work summary and file
        setWorkSummaryForCheckout("");
        setTodaysWork("");
        setWorkReportFile(null);
        
        Alert.alert("Success", "Checked Out Successfully!");
      }

      // Reload attendance data
      await loadAttendanceData();
    } catch (error: any) {
      console.error("❌ Failed to submit attendance:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack
      });
      
      Alert.alert(
        "Attendance Error", 
        error.message || "Unable to submit attendance. Please try again."
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

  const confirmCheckOut = () => {
    if (!todaysWork.trim()) {
      Alert.alert("Required", "Please provide today's work summary before checking out.");
      return;
    }
    // Store the work summary before closing modal
    setWorkSummaryForCheckout(todaysWork);
    setShowCheckoutModal(false);
    openCamera(false);
  };

  // Store work summary for checkout
  const [workSummaryForCheckout, setWorkSummaryForCheckout] = useState("");

  // ✅ Helper
  const formatTime = (time?: string) => (time ? time : "-");

  // ✅ Camera Screen (Expo)
  if (cameraVisible) {
    return (
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
    );
  }

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.heroContentRow}>
          <TouchableOpacity style={styles.backCircle} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroTitleBlock}>
            <Text style={styles.headerTitle}>Attendance</Text>
            <Text style={styles.headerSubtitle}>Track your check-ins and keep the team aligned</Text>
          </View>
        </View>
        <View style={styles.heroDateBadge}>
          <Text style={styles.heroDate}>{formatAttendanceDate(getCurrentISTTime())}</Text>
          <Text style={styles.heroDay}>{getDayOfWeek(getCurrentISTTime())}</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {/* Location Status Card */}
          {location && (
            <Card style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <Ionicons name="location" size={20} color="#2563eb" />
                <Text style={styles.locationTitle}>Current Location</Text>
              </View>
              <Text style={styles.locationText}>
                📍 {locationAddress || "Detecting address..."}
              </Text>
              {locationAddress && (
                <Text style={styles.locationCoords}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
              )}
              <Text style={styles.locationSubtext}>Location will be recorded with attendance</Text>
            </Card>
          )}

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Today's Status</Text>
            {currentAttendance ? (
              <View style={{ marginTop: 10 }}>
                <View style={styles.statusRow}>
                  <Ionicons name="log-in-outline" size={18} color="#10b981" />
                  <Text style={styles.statusLabel}>Check-in:</Text>
                  <Text style={styles.statusValue}>{formatTime(currentAttendance.checkInTime)}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                  <Text style={styles.statusLabel}>Check-out:</Text>
                  <Text style={styles.statusValue}>{formatTime(currentAttendance.checkOutTime)}</Text>
                </View>
                <Chip 
                  style={{ 
                    marginTop: 12,
                    backgroundColor: currentAttendance.status === "late" ? "#fee2e2" : "#dcfce7"
                  }}
                  textStyle={{ 
                    color: currentAttendance.status === "late" ? "#dc2626" : "#16a34a",
                    fontWeight: "600"
                  }}
                >
                  {currentAttendance.status === "late" ? "Late Arrival" : "On Time"}
                </Chip>

                {/* Selfies Section - show check-in and check-out selfies */}
                {(currentAttendance.checkInSelfie || currentAttendance.checkOutSelfie) && (
                  <View style={styles.selfiesContainer}>
                    <View style={styles.selfiesHeader}>
                      <Ionicons name="camera-outline" size={18} color="#2563eb" />
                      <Text style={styles.selfiesTitle}>Attendance Selfies</Text>
                    </View>
                    <View style={styles.selfiesRow}>
                      {/* Check-in Selfie */}
                      <View style={styles.selfieItem}>
                        <Text style={styles.selfieLabel}>Check-in</Text>
                        {currentAttendance.checkInSelfie && buildSelfieUrl(currentAttendance.checkInSelfie) ? (
                          <RNImage 
                            source={{ uri: buildSelfieUrl(currentAttendance.checkInSelfie)! }}
                            style={styles.selfieImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.selfieImagePlaceholder}>
                            <Ionicons name="person-outline" size={24} color="#9ca3af" />
                          </View>
                        )}
                      </View>
                      
                      {/* Check-out Selfie */}
                      <View style={styles.selfieItem}>
                        <Text style={styles.selfieLabel}>Check-out</Text>
                        {currentAttendance.checkOutSelfie && buildSelfieUrl(currentAttendance.checkOutSelfie) ? (
                          <RNImage 
                            source={{ uri: buildSelfieUrl(currentAttendance.checkOutSelfie)! }}
                            style={styles.selfieImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.selfieImagePlaceholder}>
                            <Ionicons name="person-outline" size={24} color="#9ca3af" />
                            <Text style={styles.selfieImagePlaceholderText}>
                              {currentAttendance.checkOutTime ? "No selfie" : "Pending"}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                {/* Today's Work Summary - shown after checkout */}
                {currentAttendance.checkOutTime && currentAttendance.workSummary && (
                  <View style={styles.workSummaryCard}>
                    <View style={styles.workSummaryHeader}>
                      <Ionicons name="document-text-outline" size={18} color="#2563eb" />
                      <Text style={styles.workSummaryTitle}>Today's Work Summary</Text>
                    </View>
                    <Text style={styles.workSummaryText}>{currentAttendance.workSummary}</Text>
                    
                    {currentAttendance.workReportFileName && (
                      <View style={styles.workReportFileInfo}>
                        <Ionicons name="attach" size={16} color="#10b981" />
                        <Text style={styles.workReportFileName}>{currentAttendance.workReportFileName}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noRecordContainer}>
                <Ionicons name="time-outline" size={32} color="#9ca3af" />
                <Text style={styles.noRecordText}>No record for today</Text>
                <Text style={styles.noRecordSubtext}>Check in to start tracking your attendance</Text>
              </View>
            )}

            <View style={styles.actions}>
              {!currentAttendance?.checkInTime ? (
                <Button
                  icon="login"
                  mode="contained"
                  onPress={() => openCamera(true)}
                  buttonColor="#22c55e"
                >
                  Check In
                </Button>
              ) : !currentAttendance?.checkOutTime ? (
                <Button
                  icon="logout"
                  mode="contained"
                  onPress={() => setShowCheckoutModal(true)}
                  buttonColor="#ef4444"
                >
                  Check Out
                </Button>
              ) : (
                <Chip style={{ backgroundColor: "#16a34a" }} textStyle={{ color: "#fff" }}>
                  Attendance Completed
                </Chip>
              )}
            </View>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Attendance History</Text>
            <Text style={styles.sectionSubtitle}>Your recent attendance records</Text>
            {attendanceHistory.length > 0 ? (
              attendanceHistory.map((item) => (
                <View key={item.id} style={styles.historyRow}>
                  <View style={styles.historyDateContainer}>
                    <Ionicons name="calendar-outline" size={18} color="#2563eb" />
                    <Text style={styles.historyDate}>
                      {format(new Date(item.date), "dd MMM yyyy")}
                    </Text>
                  </View>
                  <View style={styles.historyTimes}>
                    <View style={styles.historyTimeItem}>
                      <Text style={styles.historyTimeLabel}>In:</Text>
                      <Text style={styles.historyTimeValue}>{formatTime(item.checkInTime)}</Text>
                    </View>
                    <View style={styles.historyTimeItem}>
                      <Text style={styles.historyTimeLabel}>Out:</Text>
                      <Text style={styles.historyTimeValue}>{formatTime(item.checkOutTime)}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noHistoryContainer}>
                <Ionicons name="document-text-outline" size={32} color="#9ca3af" />
                <Text style={styles.noHistoryText}>No attendance history</Text>
              </View>
            )}
          </Card>

          <Modal visible={showCheckoutModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                {/* Close Button */}
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => {
                    setShowCheckoutModal(false);
                    setWorkReportFile(null);
                  }}
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
                
                <Text style={styles.modalTitle}>Confirm Check-out</Text>
                <Text style={styles.modalSubtitle}>
                  Please provide today's work summary before checking out. You can optionally upload a work report PDF.
                </Text>
                
                {/* Work Summary Input */}
                <Text style={styles.inputLabel}>Today's Work Summary <Text style={{ color: '#ef4444' }}>*</Text></Text>
                <TextInput
                  placeholder="Brief description of today's work..."
                  value={todaysWork}
                  onChangeText={setTodaysWork}
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                
                {/* PDF Upload Section */}
                <Text style={styles.inputLabel}>Upload Work Report PDF (Optional)</Text>
                <TouchableOpacity 
                  style={styles.filePickerBtn}
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
                  <View style={styles.selectedFile}>
                    <View style={styles.selectedFileInfo}>
                      <Ionicons name="document-text" size={20} color="#10b981" />
                      <Text style={styles.selectedFileName} numberOfLines={1}>
                        {workReportFile.name}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setWorkReportFile(null)}>
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* Action Buttons */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelBtn}
                    onPress={() => {
                      setShowCheckoutModal(false);
                      setWorkReportFile(null);
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.proceedBtn,
                      !todaysWork.trim() && styles.proceedBtnDisabled
                    ]}
                    onPress={confirmCheckOut}
                    disabled={!todaysWork.trim()}
                  >
                    <Text style={styles.proceedBtnText}>Proceed to Check-out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {isLoading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  safeAreaContainer: { flex: 1, backgroundColor: "#39549fff" },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: {
    backgroundColor: "#39549fff",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  heroContentRow: { flexDirection: "row", alignItems: "center" },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  heroTitleBlock: { flex: 1 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  headerSubtitle: { color: "#e0f2fe", fontSize: 14 },
  heroDateBadge: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  heroDate: { color: "white", fontWeight: "600", fontSize: 16 },
  heroDay: { color: "#bfdbfe", marginTop: 2 },
  locationCard: {
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
    marginLeft: 8,
  },
  locationText: {
    fontSize: 14,
    color: "#1e3a8a",
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 20,
  },
  locationCoords: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: "monospace",
    marginBottom: 6,
  },
  locationSubtext: {
    fontSize: 11,
    color: "#64748b",
    fontStyle: "italic",
  },
  card: { padding: 16, marginVertical: 8, marginHorizontal: 16, borderRadius: 12 },
  sectionTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 8 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  noRecordContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  noRecordText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  noRecordSubtext: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 4,
  },
  actions: { flexDirection: "row", marginTop: 16, justifyContent: "center" },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },
  historyRow: {
    borderBottomColor: "#e5e7eb",
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginBottom: 8,
  },
  historyDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 8,
  },
  historyTimes: {
    flexDirection: "row",
    gap: 24,
    marginLeft: 26,
  },
  historyTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyTimeLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  historyTimeValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  noHistoryContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  noHistoryText: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 8,
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
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    position: "relative",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    marginBottom: 8,
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: "#2563eb",
    borderRadius: 10,
    padding: 14,
    minHeight: 100,
    marginBottom: 20,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
  },
  filePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#f9fafb",
    gap: 10,
  },
  filePickerText: {
    fontSize: 14,
    color: "#6b7280",
    flex: 1,
  },
  selectedFile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  selectedFileInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  selectedFileName: {
    fontSize: 13,
    color: "#065f46",
    fontWeight: "500",
    flex: 1,
  },
  modalButtons: { 
    flexDirection: "row", 
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  proceedBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
  },
  proceedBtnDisabled: {
    backgroundColor: "#93c5fd",
  },
  proceedBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0002",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    borderColor: "#fff",
  },
  captureInner: {
    backgroundColor: "#fff",
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  workSummaryCard: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "#f0f9ff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  workSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  workSummaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
  },
  workSummaryText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  workReportFileInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#bfdbfe",
    gap: 6,
  },
  workReportFileName: {
    fontSize: 13,
    color: "#065f46",
    fontWeight: "500",
  },
  selfiesContainer: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "#fefce8",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fde047",
  },
  selfiesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  selfiesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#854d0e",
  },
  selfiesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 16,
  },
  selfieItem: {
    alignItems: "center",
    flex: 1,
  },
  selfieLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  selfieImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#10b981",
  },
  selfieImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  selfieImagePlaceholderText: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 4,
  },
});
