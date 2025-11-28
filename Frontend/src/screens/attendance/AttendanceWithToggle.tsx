import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { Button, Card, Chip, Switch } from "react-native-paper";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../lib/api";

// IST Timezone Helper Functions
// Backend stores times in UTC, we convert to IST for display

// Get current time
const getCurrentISTTime = (): Date => {
  return new Date();
};

// Convert UTC datetime to IST Date object
// Backend stores times in UTC without 'Z' suffix, we need to add it
const convertToIST = (dateString: string | Date): Date => {
  if (dateString instanceof Date) {
    return dateString;
  }
  
  // If the string doesn't have timezone info, assume it's UTC from backend
  if (!dateString.includes('Z') && !dateString.includes('+')) {
    // Add 'Z' to treat as UTC, JavaScript will convert to local time (IST)
    const utcDate = new Date(dateString + 'Z');
    if (!isNaN(utcDate.getTime())) {
      return utcDate;
    }
  }
  
  return new Date(dateString);
};

// Format time to display in IST (e.g., "12:09 PM")
const formatTimeToIST = (dateString: string | Date | undefined | null): string => {
  if (!dateString) return "-";
  try {
    const date = convertToIST(dateString);
    if (isNaN(date.getTime())) return "-";
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const hoursStr = hours.toString().padStart(2, '0');
    
    return `${hoursStr}:${minutes} ${ampm}`;
  } catch (error) {
    console.error("Error formatting time:", error);
    return "-";
  }
};

// Get date string (yyyy-MM-dd format) in IST
const getISTDateString = (dateString: string | Date): string => {
  try {
    const date = convertToIST(dateString);
    if (isNaN(date.getTime())) return format(new Date(), "yyyy-MM-dd");
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error getting date string:", error);
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

  useEffect(() => {
    requestPermissions();
    loadAttendanceData();
  }, [viewMode]);

  // Request Permissions (Expo)
  const requestPermissions = async () => {
    if (!permission?.granted) {
      await requestPermission();
    }

    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    setHasLocationPermission(locationStatus === "granted");

    if (locationStatus === "granted") {
      const current = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } else {
      Alert.alert("Permission Required", "Location access is needed for attendance.");
    }
  };

  // Load attendance data from API
  const loadAttendanceData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      if (viewMode === "self") {
        // Load self attendance
        const data = await apiService.getSelfAttendance(parseInt(user.id));
        
        // Use IST for today's date comparison
        const istNow = getCurrentISTTime();
        const today = format(istNow, "yyyy-MM-dd");
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
        // Load all employee attendance
        let data = await apiService.getAllAttendance(selectedDate);
        
        // For HR and Manager, filter by their department
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
      console.error("Failed to load attendance data:", error);
      Alert.alert("Error", "Failed to load attendance data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Open Camera
  const openCamera = (checkIn: boolean) => {
    if (!permission?.granted) {
      Alert.alert("Permission Required", "Please allow camera access.");
      return;
    }
    setIsCheckingIn(checkIn);
    setCameraVisible(true);
  };

  // Capture Image
  const takePicture = async () => {
    if (cameraRef.current) {
      const data = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      setCameraVisible(false);
      handleAttendance(data.uri);
    }
  };

  // Handle Attendance with real API
  const handleAttendance = async (photoUri: string) => {
    if (!user?.id) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      const gpsLocationString = location 
        ? `${location.latitude},${location.longitude}` 
        : "0,0";

      // Convert image to base64
      const base64Image = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (isCheckingIn) {
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

        // Use IST time for display
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
        Alert.alert("Checked In", "Successfully marked attendance!");
      } else if (currentAttendance) {
        const response = await apiService.checkOut(
          parseInt(user.id),
          gpsLocationString,
          base64Image,
          todaysWork || "Completed daily tasks"  // Include work summary
        );

        // Use IST time for display
        const istNow = getCurrentISTTime();
        const formattedTime = formatTimeToIST(istNow);
        const updated = { 
          ...currentAttendance, 
          checkOutTime: formattedTime,
          workHours: response.total_hours,
        };
        
        setCurrentAttendance(updated);
        setAttendanceHistory((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        
        // Clear work summary
        setTodaysWork("");
        
        Alert.alert("Checked Out", "Good job today!");
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
      setLoading(false);
    }
  };

  const formatTime = (time?: string) => (time ? time : "-");

  // Export handlers
  const handleExportCSV = async () => {
    try {
      setExportLoading(true);
      if (viewMode === "self" && user?.id) {
        await apiService.downloadAttendanceCSV(parseInt(user.id));
      } else if (user) {
        // For HR and Manager, export only their department
        const departmentFilter = (user.role === "hr" || user.role === "manager") ? user.department : undefined;
        await apiService.downloadAttendanceCSV(undefined, undefined, undefined, departmentFilter);
      }
      Alert.alert("Success", "Attendance CSV exported successfully!");
    } catch (error: any) {
      console.error("Export CSV failed:", error);
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
        // For HR and Manager, export only their department
        const departmentFilter = (user.role === "hr" || user.role === "manager") ? user.department : undefined;
        await apiService.downloadAttendancePDF(undefined, undefined, undefined, departmentFilter);
      }
      Alert.alert("Success", "Attendance PDF exported successfully!");
    } catch (error: any) {
      console.error("Export PDF failed:", error);
      Alert.alert("Export Failed", error.message || "Failed to export PDF");
    } finally {
      setExportLoading(false);
    }
  };

  // Camera UI
  if (cameraVisible) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView ref={cameraRef} facing="front" style={styles.camera}>
          <View style={styles.cameraOverlay}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <Button mode="outlined" style={{ marginTop: 16 }} onPress={() => setCameraVisible(false)}>
              Cancel
            </Button>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#f9fafb'}}>
      <StatusBar style="dark" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          Attendance ({viewMode === "self" ? "My" : "Employee"} View)
        </Text>
        <Switch
          value={viewMode === "employee"}
          onValueChange={(v) => setViewMode(v ? "employee" : "self")}
          color="#fff"
        />
      </View>

      {/* Self Attendance */}
      {viewMode === "self" ? (
        <Card style={styles.card}>
          <Text style={styles.title}>Today's Status</Text>
          {currentAttendance ? (
            <>
              <Text>Check-in: {formatTime(currentAttendance.checkInTime)}</Text>
              <Text>Check-out: {formatTime(currentAttendance.checkOutTime)}</Text>
              <Text>Location: {currentAttendance.location || "N/A"}</Text>
            </>
          ) : (
            <Text style={styles.muted}>No record for today</Text>
          )}

          <View style={styles.actions}>
            {!currentAttendance?.checkInTime ? (
              <Button mode="contained" buttonColor="#22c55e" onPress={() => openCamera(true)}>
                Check In
              </Button>
            ) : !currentAttendance?.checkOutTime ? (
              <Button mode="contained" buttonColor="#ef4444" onPress={() => setCheckoutModal(true)}>
                Check Out
              </Button>
            ) : (
              <Chip style={{ backgroundColor: "#16a34a" }} textStyle={{ color: "#fff" }}>
                Attendance Completed
              </Chip>
            )}
          </View>
        </Card>
      ) : (
        /* Employee Attendance List */
        <>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>Employee Attendance ({selectedDate})</Text>
              <View style={styles.exportButtons}>
                <TouchableOpacity 
                  style={styles.exportBtn}
                  onPress={handleExportCSV}
                  disabled={exportLoading}
                >
                  <Ionicons name="document-text-outline" size={20} color="#2563eb" />
                  <Text style={styles.exportText}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.exportBtn}
                  onPress={handleExportPDF}
                  disabled={exportLoading}
                >
                  <Ionicons name="document-outline" size={20} color="#ef4444" />
                  <Text style={styles.exportText}>PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {employeeAttendance.length > 0 ? (
              <FlatList
                data={employeeAttendance}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.listRow}>
                    <Ionicons name="person-outline" size={18} color="#2563eb" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.employeeName}>User ID: {item.userId}</Text>
                      <Text style={styles.muted}>
                        In: {formatTime(item.checkInTime)} | Out: {formatTime(item.checkOutTime)}
                      </Text>
                      {item.workHours !== undefined && (
                        <Text style={styles.workHours}>
                          Hours: {item.workHours.toFixed(2)}
                        </Text>
                      )}
                    </View>
                    <Chip 
                      compact 
                      style={{ 
                        backgroundColor: item.status === "present" ? "#dcfce7" : "#fee2e2" 
                      }}
                      textStyle={{ 
                        color: item.status === "present" ? "#16a34a" : "#dc2626" 
                      }}
                    >
                      {item.status || "Present"}
                    </Chip>
                  </View>
                )}
              />
            ) : (
              <Text style={styles.muted}>No employee attendance for this date</Text>
            )}
          </Card>
          
          {/* Self Attendance History */}
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>My Attendance History</Text>
              <TouchableOpacity 
                style={styles.exportBtn}
                onPress={handleExportCSV}
                disabled={exportLoading}
              >
                <Ionicons name="download-outline" size={20} color="#2563eb" />
                <Text style={styles.exportText}>Export</Text>
              </TouchableOpacity>
            </View>
            
            {attendanceHistory.length > 0 ? (
              <FlatList
                data={attendanceHistory}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyDate}>{item.date}</Text>
                      <Text style={styles.muted}>
                        In: {formatTime(item.checkInTime)} | Out: {formatTime(item.checkOutTime)}
                      </Text>
                      {item.workHours !== undefined && (
                        <Text style={styles.workHours}>
                          Hours: {item.workHours.toFixed(2)}
                        </Text>
                      )}
                    </View>
                    <Chip compact style={{ backgroundColor: "#dcfce7" }}>
                      {item.status || "Present"}
                    </Chip>
                  </View>
                )}
              />
            ) : (
              <Text style={styles.muted}>No attendance history</Text>
            )}
          </Card>
        </>
      )}

      {/* Checkout Modal */}
      <Modal visible={checkoutModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirm Check-out</Text>
            <TextInput
              placeholder="Add work summary (optional)"
              value={todaysWork}
              onChangeText={setTodaysWork}
              style={styles.textInput}
              multiline
            />
            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setCheckoutModal(false)}>
                Cancel
              </Button>
              <Button
                mode="contained"
                buttonColor="#ef4444"
                onPress={() => {
                  setCheckoutModal(false);
                  openCamera(false);
                }}
              >
                Proceed
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      )}
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { backgroundColor: "#f9fafb", flex: 1, padding: 10 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 8,
  },
  headerText: { color: "white", fontSize: 18, fontWeight: "bold" },
  card: { padding: 16, marginVertical: 10 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontWeight: "bold", fontSize: 16 },
  muted: { color: "#6b7280", marginVertical: 5, fontSize: 13 },
  actions: { marginTop: 10, alignItems: "center" },
  exportButtons: {
    flexDirection: "row",
    gap: 8,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  exportText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 12,
  },
  employeeName: {
    fontWeight: "600",
    fontSize: 14,
    color: "#111827",
  },
  workHours: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "600",
    marginTop: 2,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 12,
  },
  historyDate: {
    fontWeight: "600",
    fontSize: 14,
    color: "#111827",
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#0008",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: { fontWeight: "bold", fontSize: 18, marginBottom: 8 },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  modalActions: { flexDirection: "row", justifyContent: "space-between" },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0002",
  },
  camera: { flex: 1 },
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
