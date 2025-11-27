import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
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

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  selfie?: string | null;
  status?: string;
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
      const transformedData: AttendanceRecord[] = data.map((record) => ({
        id: record.attendance_id.toString(),
        date: format(new Date(record.check_in), "yyyy-MM-dd"),
        checkInTime: format(new Date(record.check_in), "hh:mm a"),
        checkOutTime: record.check_out ? format(new Date(record.check_out), "hh:mm a") : undefined,
        status: "present",
        selfie: record.checkInSelfie || record.selfie,
      }));
      
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
        // Call check-out API with work summary
        const response = await apiService.checkOut(
          parseInt(user.id),
          gpsLocationString,
          base64Image,
          workSummaryForCheckout || "Completed daily tasks"  // Use work summary or default
        );

        const formattedTime = format(new Date(), "hh:mm a");
        const updated: AttendanceRecord = {
          ...currentAttendance,
          checkOutTime: formattedTime,
        };
        
        setCurrentAttendance(updated);
        setAttendanceHistory((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        
        // Clear work summary
        setWorkSummaryForCheckout("");
        setTodaysWork("");
        
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

  const confirmCheckOut = () => {
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
          <Text style={styles.heroDate}>{format(new Date(), "dd MMM yyyy")}</Text>
          <Text style={styles.heroDay}>{format(new Date(), "EEEE")}</Text>
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
                <Text style={styles.modalTitle}>Confirm Check-out</Text>
                <Text style={styles.modalSubtitle}>Please provide a brief summary of your work today</Text>
                <TextInput
                  placeholder="e.g., Completed project tasks, attended meetings..."
                  value={todaysWork}
                  onChangeText={setTodaysWork}
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                />
                <View style={styles.modalButtons}>
                  <Button mode="outlined" onPress={() => setShowCheckoutModal(false)}>
                    Cancel
                  </Button>
                  <Button mode="contained" onPress={confirmCheckOut} buttonColor="#ef4444">
                    Continue
                  </Button>
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
    backgroundColor: "#0008",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  modalSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    marginBottom: 16,
    textAlignVertical: "top",
    fontSize: 14,
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
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
});
