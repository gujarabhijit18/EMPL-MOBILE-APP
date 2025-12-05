import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_CONFIG } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { apiService, LeaveRequestResponse, LeaveSummary } from "../../lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type LeaveType = "Annual Leave" | "Sick Leave" | "Casual Leave" | "Maternity Leave" | "Paternity Leave" | "Unpaid Leave";
type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

interface Holiday {
  date: Date;
  name: string;
}

// Animated Pulse Component
const PulseIndicator = ({ color = "#f59e0b" }: { color?: string }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
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

export default function LeaveManagement() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  const currentUser = user || { id: "EMP001", name: "John Doe", role: "employee" as const, department: "Engineering", user_id: 1, employee_id: "EMP001" };
  const employeeId = (currentUser as any).employee_id || currentUser.id || "EMP001";

  // API State
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [myLeaves, setMyLeaves] = useState<LeaveRequestResponse[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequestResponse[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequestResponse[]>([]);
  const [leaveSummary, setLeaveSummary] = useState<LeaveSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    type: "Annual Leave" as LeaveType,
    startDate: new Date(),
    endDate: new Date(),
    reason: "",
  });

  const [holidays, setHolidays] = useState<Holiday[]>([
    { date: new Date(2025, 0, 1), name: "New Year" },
    { date: new Date(2025, 1, 26), name: "Republic Day" },
  ]);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [holidayForm, setHolidayForm] = useState({ date: new Date(), name: "" });
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [modalCurrentMonth, setModalCurrentMonth] = useState(new Date());
  const [modalSelectedDate, setModalSelectedDate] = useState<Date | null>(null);
  const [showLeaveTypeDropdown, setShowLeaveTypeDropdown] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingLeaveId, setRejectingLeaveId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Cross-platform date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<"startDate" | "endDate" | "holiday">("startDate");
  const [tempDate, setTempDate] = useState(new Date());

  // Role-based permissions
  const userRole = currentUser.role?.toLowerCase() || 'employee';
  const isAdmin = userRole === "admin";
  const canApproveLeaves = ["admin", "hr", "manager"].includes(userRole);
  const canApply = !isAdmin;
  const canSeeTeamLeaves = ["admin", "hr", "manager"].includes(userRole);

  const [activeTab, setActiveTab] = useState<"apply" | "approvals" | "calendar">(isAdmin ? "approvals" : "apply");

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
    ]).start();
  }, []);

  const fetchMyLeaves = useCallback(async () => {
    try {
      const leaves = await apiService.getMyLeaves();
      setMyLeaves(leaves);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchTeamLeaves = useCallback(async () => {
    if (!canSeeTeamLeaves) return;
    try {
      const response = await apiService.getTeamLeaves();
      const fetchedLeaves = response.leaves || [];
      setAllLeaves(fetchedLeaves);
      const statusOrder: Record<string, number> = { Pending: 0, Approved: 1, Rejected: 2, Cancelled: 3 };
      const sorted = [...fetchedLeaves].sort((a: any, b: any) => {
        const statusDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime();
      });
      setTeamLeaves(sorted);
    } catch (err: any) {
      setError(err.message);
    }
  }, [canSeeTeamLeaves, userRole]);

  const fetchLeaveSummary = useCallback(async () => {
    try {
      const summary = await apiService.getMyLeaveSummary();
      setLeaveSummary(summary);
    } catch (err: any) {}
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchMyLeaves(), fetchTeamLeaves(), fetchLeaveSummary()]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchMyLeaves, fetchTeamLeaves, fetchLeaveSummary]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openDatePicker = (field: "startDate" | "endDate") => {
    setDatePickerField(field);
    setTempDate(form[field]);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === "android") {
        if (datePickerField === "holiday") {
          setHolidayForm({ ...holidayForm, date: selectedDate });
        } else {
          setForm({ ...form, [datePickerField]: selectedDate });
        }
      }
    }
  };

  const confirmIOSDate = () => {
    if (datePickerField === "holiday") {
      setHolidayForm({ ...holidayForm, date: tempDate });
    } else {
      setForm({ ...form, [datePickerField]: tempDate });
    }
    setShowDatePicker(false);
  };

  const submitLeave = async () => {
    if (!form.reason.trim()) {
      Alert.alert("Required", "Please enter a reason for leave.");
      return;
    }
    setLoading(true);
    try {
      await apiService.submitLeaveRequest({
        employee_id: employeeId,
        leave_type: form.type,
        start_date: format(form.startDate, "yyyy-MM-dd"),
        end_date: format(form.endDate, "yyyy-MM-dd"),
        reason: form.reason,
        status: "Pending",
      });
      Alert.alert("✅ Success", "Leave request submitted successfully.");
      setForm({ type: "Annual Leave", startDate: new Date(), endDate: new Date(), reason: "" });
      await fetchMyLeaves();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit leave request.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId: number) => {
    Alert.alert("Approve Leave", "Are you sure you want to approve this request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve", style: "default",
        onPress: async () => {
          setLoading(true);
          try {
            await apiService.approveLeaveRequest(leaveId, "Approved by " + currentUser.name);
            Alert.alert("✅ Success", "Leave request approved.");
            await Promise.all([fetchTeamLeaves(), fetchLeaveSummary()]);
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to approve.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleReject = (leaveId: number) => {
    setRejectingLeaveId(leaveId);
    setRejectionReason("");
    setRejectModalVisible(true);
  };

  const submitRejection = async () => {
    if (rejectingLeaveId === null) return;
    setLoading(true);
    setRejectModalVisible(false);
    try {
      await apiService.rejectLeaveRequest(rejectingLeaveId, rejectionReason.trim() || "No reason provided");
      Alert.alert("✅ Success", "Leave request rejected.");
      await Promise.all([fetchTeamLeaves(), fetchLeaveSummary()]);
      setRejectingLeaveId(null);
      setRejectionReason("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to reject.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLeave = async (leaveId: number) => {
    Alert.alert("Delete Request", "Are you sure you want to delete this request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await apiService.deleteLeaveRequest(leaveId);
            Alert.alert("Success", "Leave request deleted.");
            await fetchMyLeaves();
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to delete.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      await apiService.exportLeavesExcel();
      Alert.alert("Success", "Leaves exported successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to export.");
    } finally {
      setLoading(false);
    }
  };

  const addHoliday = () => {
    if (!holidayForm.name.trim()) {
      Alert.alert("Required", "Please enter a holiday name.");
      return;
    }
    setHolidays([...holidays, { date: holidayForm.date, name: holidayForm.name }]);
    setHolidayForm({ date: new Date(), name: "" });
    Alert.alert("Success", "Holiday added.");
  };

  const removeHoliday = (index: number) => {
    Alert.alert("Remove Holiday", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => setHolidays(holidays.filter((_, i) => i !== index)) },
    ]);
  };

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToModalPreviousMonth = () => setModalCurrentMonth(subMonths(modalCurrentMonth, 1));
  const goToModalNextMonth = () => setModalCurrentMonth(addMonths(modalCurrentMonth, 1));

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = [];
    let currentDate = calendarStart;
    while (currentDate <= calendarEnd) {
      days.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    return days;
  };

  const getModalCalendarDays = () => {
    const monthStart = startOfMonth(modalCurrentMonth);
    const monthEnd = endOfMonth(modalCurrentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = [];
    let currentDate = calendarStart;
    while (currentDate <= calendarEnd) {
      days.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    return days;
  };

  const isHoliday = (date: Date) => holidays.some((h) => isSameDay(h.date, date));
  const getHolidayName = (date: Date) => holidays.find((h) => isSameDay(h.date, date))?.name || null;

  const getLeaveCountForDate = (date: Date) => {
    return myLeaves.filter(leave => {
      if (leave.status !== "Approved") return false;
      const leaveStart = parseISO(leave.start_date);
      const leaveEnd = parseISO(leave.end_date);
      return date >= leaveStart && date <= leaveEnd;
    }).length;
  };

  const getLeavesForDate = (date: Date) => {
    return myLeaves.filter(leave => {
      if (leave.status !== "Approved") return false;
      const leaveStart = parseISO(leave.start_date);
      const leaveEnd = parseISO(leave.end_date);
      return date >= leaveStart && date <= leaveEnd;
    });
  };

  const openHolidayDatePicker = () => {
    setDatePickerField("holiday");
    setTempDate(holidayForm.date);
    setShowDatePicker(true);
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "annual leave": case "annual": return "#3B82F6";
      case "sick leave": case "sick": return "#EF4444";
      case "casual leave": case "casual": return "#10B981";
      case "maternity leave": case "maternity": return "#A855F7";
      case "paternity leave": case "paternity": return "#6366F1";
      case "unpaid leave": case "unpaid": return "#6B7280";
      default: return "#6B7280";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved": return "#10B981";
      case "rejected": return "#EF4444";
      case "pending": return "#F59E0B";
      case "cancelled": return "#6B7280";
      default: return "#9CA3AF";
    }
  };

  const historyRanges = ["Current Month", "Last 3 Months", "Last 6 Months", "Last 1 Year"] as const;
  type HistoryRange = typeof historyRanges[number];
  const [historyRange, setHistoryRange] = useState<HistoryRange>("Current Month");
  const [historySheetVisible, setHistorySheetVisible] = useState(false);

  const today = new Date();
  const rangeStart = (() => {
    switch (historyRange) {
      case "Current Month": return startOfMonth(today);
      case "Last 3 Months": return subMonths(today, 3);
      case "Last 6 Months": return subMonths(today, 6);
      case "Last 1 Year": return subMonths(today, 12);
      default: return startOfMonth(today);
    }
  })();
  const rangeEnd = endOfMonth(today);

  const filteredLeavesByPeriod = myLeaves.filter((req) => {
    const start = parseISO(req.start_date);
    const end = parseISO(req.end_date);
    return end >= rangeStart && start <= rangeEnd;
  });

  const pendingCount = teamLeaves.filter(l => l.status === "Pending").length;

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" backgroundColor="#7c3aed" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        
        {/* Premium Header */}
        <LinearGradient colors={["#7c3aed", "#8b5cf6", "#a78bfa"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Animated.View style={[styles.headerTitleContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <Text style={styles.headerTitle}>Leave Management</Text>
                <Text style={styles.headerSubtitle}>Track and manage your leaves</Text>
              </Animated.View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerIconBtn} onPress={handleExportExcel} activeOpacity={0.7}>
                  <Ionicons name="download-outline" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIconBtn} onPress={() => setCalendarModalVisible(true)} activeOpacity={0.7}>
                  <Ionicons name="calendar-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>

        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#7c3aed"]} />}
          >
            {/* Error */}
            {error && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={loadData}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
              </View>
            )}

            {/* Tabs */}
            <View style={styles.tabsContainer}>
              {canApply && (
                <TouchableOpacity style={[styles.tab, activeTab === "apply" && styles.tabActive]} onPress={() => setActiveTab("apply")} activeOpacity={0.8}>
                  <Ionicons name="document-text" size={18} color={activeTab === "apply" ? "#7c3aed" : "#9ca3af"} />
                  <Text style={[styles.tabText, activeTab === "apply" && styles.tabTextActive]}>My Leaves</Text>
                </TouchableOpacity>
              )}
              {canSeeTeamLeaves && (
                <TouchableOpacity style={[styles.tab, activeTab === "approvals" && styles.tabActive]} onPress={() => setActiveTab("approvals")} activeOpacity={0.8}>
                  <View style={styles.tabWithBadge}>
                    <Ionicons name="clipboard" size={18} color={activeTab === "approvals" ? "#7c3aed" : "#9ca3af"} />
                    <Text style={[styles.tabText, activeTab === "approvals" && styles.tabTextActive]}>
                      {isAdmin ? "Approvals" : "Team"}
                    </Text>
                    {pendingCount > 0 && (
                      <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{pendingCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.tab, activeTab === "calendar" && styles.tabActive]} onPress={() => setActiveTab("calendar")} activeOpacity={0.8}>
                <Ionicons name="calendar" size={18} color={activeTab === "calendar" ? "#7c3aed" : "#9ca3af"} />
                <Text style={[styles.tabText, activeTab === "calendar" && styles.tabTextActive]}>Calendar</Text>
              </TouchableOpacity>
            </View>

            {/* Apply Leave Tab */}
            {activeTab === "apply" && canApply && (
              <View>
                {/* Request Leave Card */}
                <View style={styles.requestCard}>
                  <LinearGradient colors={["#f5f3ff", "#ede9fe"]} style={styles.requestCardHeader}>
                    <View style={styles.requestCardHeaderIcon}>
                      <MaterialCommunityIcons name="file-document-edit" size={24} color="#7c3aed" />
                    </View>
                    <View>
                      <Text style={styles.requestCardTitle}>Request Leave</Text>
                      <Text style={styles.requestCardSubtitle}>Submit a new leave application</Text>
                    </View>
                  </LinearGradient>

                  <View style={styles.requestCardBody}>
                    {/* Leave Type */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Leave Type</Text>
                      <TouchableOpacity style={styles.selectInput} onPress={() => setShowLeaveTypeDropdown(!showLeaveTypeDropdown)} activeOpacity={0.8}>
                        <View style={[styles.leaveTypeDot, { backgroundColor: getTypeColor(form.type) }]} />
                        <Text style={styles.selectInputText}>{form.type}</Text>
                        <Ionicons name={showLeaveTypeDropdown ? "chevron-up" : "chevron-down"} size={20} color="#6b7280" />
                      </TouchableOpacity>
                      {showLeaveTypeDropdown && (
                        <View style={styles.dropdownList}>
                          {(["Annual Leave", "Sick Leave", "Casual Leave", "Maternity Leave", "Paternity Leave", "Unpaid Leave"] as LeaveType[]).map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={[styles.dropdownItem, form.type === option && styles.dropdownItemActive]}
                              onPress={() => { setForm({ ...form, type: option }); setShowLeaveTypeDropdown(false); }}
                            >
                              <View style={[styles.leaveTypeDot, { backgroundColor: getTypeColor(option) }]} />
                              <Text style={[styles.dropdownItemText, form.type === option && styles.dropdownItemTextActive]}>{option}</Text>
                              {form.type === option && <Ionicons name="checkmark" size={18} color="#7c3aed" />}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Date Range */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Duration</Text>
                      <View style={styles.dateRow}>
                        <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker("startDate")} activeOpacity={0.8}>
                          <Ionicons name="calendar-outline" size={18} color="#7c3aed" />
                          <View style={styles.dateInputContent}>
                            <Text style={styles.dateInputLabel}>From</Text>
                            <Text style={styles.dateInputValue}>{format(form.startDate, "MMM dd, yyyy")}</Text>
                          </View>
                        </TouchableOpacity>
                        <View style={styles.dateArrow}>
                          <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
                        </View>
                        <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker("endDate")} activeOpacity={0.8}>
                          <Ionicons name="calendar-outline" size={18} color="#7c3aed" />
                          <View style={styles.dateInputContent}>
                            <Text style={styles.dateInputLabel}>To</Text>
                            <Text style={styles.dateInputValue}>{format(form.endDate, "MMM dd, yyyy")}</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Reason */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Reason <Text style={styles.required}>*</Text></Text>
                      <TextInput
                        style={styles.textArea}
                        placeholder="Please provide a reason for your leave..."
                        placeholderTextColor="#9ca3af"
                        value={form.reason}
                        onChangeText={(text) => setForm({ ...form, reason: text })}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity style={styles.submitBtn} onPress={submitLeave} disabled={loading} activeOpacity={0.85}>
                      <LinearGradient colors={["#7c3aed", "#6d28d9"]} style={styles.submitBtnGradient}>
                        {loading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="send" size={18} color="#fff" />
                            <Text style={styles.submitBtnText}>Submit Request</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Leave History */}
                <View style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyHeaderLeft}>
                      <View style={styles.historyIconBg}>
                        <Ionicons name="time" size={18} color="#7c3aed" />
                      </View>
                      <View>
                        <Text style={styles.historyTitle}>Leave History</Text>
                        <Text style={styles.historySubtitle}>{filteredLeavesByPeriod.length} requests</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.filterBtn} onPress={() => setHistorySheetVisible(true)} activeOpacity={0.8}>
                      <Text style={styles.filterBtnText}>{historyRange}</Text>
                      <Ionicons name="chevron-down" size={16} color="#6b7280" />
                    </TouchableOpacity>
                  </View>

                  {filteredLeavesByPeriod.length === 0 ? (
                    <View style={styles.emptyState}>
                      <View style={styles.emptyStateIcon}>
                        <Ionicons name="document-text-outline" size={40} color="#d1d5db" />
                      </View>
                      <Text style={styles.emptyStateTitle}>No Leave History</Text>
                      <Text style={styles.emptyStateSubtitle}>No requests found for this period</Text>
                    </View>
                  ) : (
                    <View style={styles.historyList}>
                      {filteredLeavesByPeriod.map((req) => (
                        <View key={req.leave_id} style={styles.historyItem}>
                          <View style={[styles.historyItemBar, { backgroundColor: getTypeColor(req.leave_type || "") }]} />
                          <View style={styles.historyItemContent}>
                            <View style={styles.historyItemTop}>
                              <Text style={styles.historyItemDate}>
                                {format(parseISO(req.start_date), "MMM dd")} - {format(parseISO(req.end_date), "MMM dd, yyyy")}
                              </Text>
                              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) }]}>
                                <Text style={styles.statusBadgeText}>{req.status}</Text>
                              </View>
                            </View>
                            <View style={styles.historyItemBottom}>
                              <View style={[styles.typeBadge, { backgroundColor: getTypeColor(req.leave_type || "") + "20" }]}>
                                <Text style={[styles.typeBadgeText, { color: getTypeColor(req.leave_type || "") }]}>{req.leave_type || "Leave"}</Text>
                              </View>
                              <Text style={styles.historyItemReason} numberOfLines={1}>{req.reason}</Text>
                            </View>
                          </View>
                          {req.status === "Pending" && (
                            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteLeave(req.leave_id)}>
                              <Ionicons name="trash-outline" size={18} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Approvals Tab */}
            {activeTab === "approvals" && canSeeTeamLeaves && (
              <View>
                {/* Approval Stats */}
                <View style={styles.approvalStats}>
                  <View style={[styles.approvalStatItem, { backgroundColor: "#fef3c7" }]}>
                    <Ionicons name="time-outline" size={20} color="#f59e0b" />
                    <Text style={[styles.approvalStatValue, { color: "#f59e0b" }]}>{teamLeaves.filter(l => l.status === "Pending").length}</Text>
                    <Text style={styles.approvalStatLabel}>Pending</Text>
                  </View>
                  <View style={[styles.approvalStatItem, { backgroundColor: "#d1fae5" }]}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
                    <Text style={[styles.approvalStatValue, { color: "#10b981" }]}>{teamLeaves.filter(l => l.status === "Approved").length}</Text>
                    <Text style={styles.approvalStatLabel}>Approved</Text>
                  </View>
                  <View style={[styles.approvalStatItem, { backgroundColor: "#fee2e2" }]}>
                    <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                    <Text style={[styles.approvalStatValue, { color: "#ef4444" }]}>{teamLeaves.filter(l => l.status === "Rejected").length}</Text>
                    <Text style={styles.approvalStatLabel}>Rejected</Text>
                  </View>
                </View>

                {/* Approval Requests */}
                <View style={styles.approvalSection}>
                  <View style={styles.approvalSectionHeader}>
                    <Text style={styles.approvalSectionTitle}>Leave Requests</Text>
                    <TouchableOpacity style={styles.refreshBtn} onPress={fetchTeamLeaves}>
                      <Ionicons name="refresh" size={18} color="#6b7280" />
                    </TouchableOpacity>
                  </View>

                  {loading && !refreshing ? (
                    <View style={styles.loadingState}>
                      <ActivityIndicator size="large" color="#7c3aed" />
                      <Text style={styles.loadingText}>Loading requests...</Text>
                    </View>
                  ) : teamLeaves.length === 0 ? (
                    <View style={styles.emptyState}>
                      <View style={[styles.emptyStateIcon, { backgroundColor: "#d1fae5" }]}>
                        <Ionicons name="checkmark-done-circle" size={48} color="#10b981" />
                      </View>
                      <Text style={styles.emptyStateTitle}>All Caught Up!</Text>
                      <Text style={styles.emptyStateSubtitle}>No leave requests to review</Text>
                    </View>
                  ) : (
                    <View style={styles.approvalList}>
                      {teamLeaves.map((req) => {
                        const startDate = parseISO(req.start_date);
                        const endDate = parseISO(req.end_date);
                        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        const isPending = req.status === "Pending";
                        const department = req.user?.department || req.department || "N/A";
                        const profilePhoto = req.user?.profile_photo || req.profile_photo;
                        // Validate profile photo URI - must be a non-empty string with valid path
                        const isValidPhoto = profilePhoto && 
                          typeof profilePhoto === 'string' && 
                          profilePhoto.trim() !== '' && 
                          profilePhoto !== 'null' && 
                          profilePhoto !== 'undefined' &&
                          (profilePhoto.startsWith('/') || profilePhoto.startsWith('http'));
                        const photoUri = isValidPhoto 
                          ? (profilePhoto.startsWith('http') ? profilePhoto : `${API_CONFIG.getApiBaseUrl()}${profilePhoto.startsWith('/') ? '' : '/'}${profilePhoto}`)
                          : null;

                        return (
                          <View key={req.leave_id} style={[styles.approvalCard, isPending && styles.approvalCardPending]}>
                            {/* Header */}
                            <View style={styles.approvalCardHeader}>
                              {photoUri ? (
                                <Image source={{ uri: photoUri }} style={styles.approvalAvatar} onError={() => {}} />
                              ) : (
                                <View style={styles.approvalAvatarPlaceholder}>
                                  <Ionicons name="person" size={20} color="#fff" />
                                </View>
                              )}
                              <View style={styles.approvalInfo}>
                                <Text style={styles.approvalName}>{req.user?.name || req.name || "Employee"}</Text>
                                <Text style={styles.approvalDept}>{department}</Text>
                              </View>
                              <View style={[styles.approvalStatusBadge, { backgroundColor: getStatusColor(req.status) }]}>
                                {isPending && <PulseIndicator color="#fff" />}
                                <Text style={styles.approvalStatusText}>{req.status}</Text>
                              </View>
                            </View>

                            {/* Leave Type & Duration */}
                            <View style={styles.approvalMeta}>
                              <View style={[styles.approvalTypeBadge, { backgroundColor: getTypeColor(req.leave_type || "") }]}>
                                <Ionicons name="calendar" size={14} color="#fff" />
                                <Text style={styles.approvalTypeText}>{req.leave_type || "Leave"}</Text>
                              </View>
                              <Text style={styles.approvalDuration}>{req.days || daysDiff} days</Text>
                            </View>

                            {/* Date Range */}
                            <View style={styles.approvalDateRange}>
                              <View style={styles.approvalDateItem}>
                                <Text style={styles.approvalDateLabel}>From</Text>
                                <Text style={styles.approvalDateValue}>{format(startDate, "MMM dd, yyyy")}</Text>
                              </View>
                              <Ionicons name="arrow-forward" size={16} color="#d1d5db" />
                              <View style={styles.approvalDateItem}>
                                <Text style={styles.approvalDateLabel}>To</Text>
                                <Text style={styles.approvalDateValue}>{format(endDate, "MMM dd, yyyy")}</Text>
                              </View>
                            </View>

                            {/* Reason */}
                            <View style={styles.approvalReason}>
                              <Text style={styles.approvalReasonLabel}>Reason</Text>
                              <Text style={styles.approvalReasonText}>{req.reason || "No reason provided"}</Text>
                            </View>

                            {/* Actions */}
                            {isPending && (
                              <View style={styles.approvalActions}>
                                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(req.leave_id)} disabled={loading} activeOpacity={0.85}>
                                  <LinearGradient colors={["#10b981", "#059669"]} style={styles.actionBtnGradient}>
                                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                    <Text style={styles.actionBtnText}>Approve</Text>
                                  </LinearGradient>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(req.leave_id)} disabled={loading} activeOpacity={0.85}>
                                  <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.actionBtnGradient}>
                                    <Ionicons name="close-circle" size={18} color="#fff" />
                                    <Text style={styles.actionBtnText}>Reject</Text>
                                  </LinearGradient>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Calendar Tab */}
            {activeTab === "calendar" && (
              <View>
                {/* Holiday Section */}
                <View style={styles.holidaySection}>
                  <LinearGradient colors={["#fef3c7", "#fde68a"]} style={styles.holidaySectionHeader}>
                    <Ionicons name="sunny" size={20} color="#f59e0b" />
                    <Text style={styles.holidaySectionTitle}>Company Holidays</Text>
                  </LinearGradient>
                  <View style={styles.holidaySectionBody}>
                    <View style={styles.holidayForm}>
                      <TouchableOpacity style={styles.holidayDateBtn} onPress={openHolidayDatePicker} activeOpacity={0.8}>
                        <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                        <Text style={styles.holidayDateText}>{format(holidayForm.date, "MMM dd, yyyy")}</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.holidayNameInput}
                        placeholder="Holiday name"
                        placeholderTextColor="#9ca3af"
                        value={holidayForm.name}
                        onChangeText={(text) => setHolidayForm({ ...holidayForm, name: text })}
                      />
                      <TouchableOpacity style={styles.addHolidayBtn} onPress={addHoliday} activeOpacity={0.85}>
                        <Ionicons name="add" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    {holidays.length > 0 && (
                      <View style={styles.holidayList}>
                        {holidays.map((h, i) => (
                          <View key={i} style={styles.holidayItem}>
                            <View style={styles.holidayItemLeft}>
                              <View style={styles.holidayDot} />
                              <Text style={styles.holidayItemText}>{h.name}</Text>
                              <Text style={styles.holidayItemDate}>{format(h.date, "MMM dd")}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeHoliday(i)}>
                              <Ionicons name="close-circle" size={20} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* Calendar */}
                <View style={styles.calendarCard}>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity style={styles.calendarNavBtn} onPress={goToPreviousMonth}>
                      <Ionicons name="chevron-back" size={24} color="#7c3aed" />
                    </TouchableOpacity>
                    <Text style={styles.calendarMonthText}>{format(currentMonth, "MMMM yyyy")}</Text>
                    <TouchableOpacity style={styles.calendarNavBtn} onPress={goToNextMonth}>
                      <Ionicons name="chevron-forward" size={24} color="#7c3aed" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.calendarWeekHeader}>
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                      <Text key={i} style={styles.calendarWeekDay}>{d}</Text>
                    ))}
                  </View>
                  <View style={styles.calendarGrid}>
                    {getCalendarDays().map((date, index) => {
                      const isCurrentMonth = isSameMonth(date, currentMonth);
                      const isSelected = selectedDate && isSameDay(date, selectedDate);
                      const isHolidayDate = isHoliday(date);
                      const isToday = isSameDay(date, new Date());
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[styles.calendarDay, !isCurrentMonth && styles.calendarDayOther, isSelected && styles.calendarDaySelected, isToday && styles.calendarDayToday]}
                          onPress={() => setSelectedDate(date)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.calendarDayText, !isCurrentMonth && styles.calendarDayTextOther, isSelected && styles.calendarDayTextSelected]}>{format(date, "d")}</Text>
                          {isHolidayDate && <View style={styles.calendarHolidayDot} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {/* Cross-Platform Date Picker */}
        {showDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {/* iOS Date Picker Modal */}
        {Platform.OS === "ios" && (
          <Modal visible={showDatePicker} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModal}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>Select Date</Text>
                  <TouchableOpacity onPress={confirmIOSDate}>
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  style={styles.iosDatePicker}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* History Range Modal */}
        <Modal visible={historySheetVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalSheetTitle}>Select Period</Text>
              {historyRanges.map((r) => (
                <TouchableOpacity key={r} style={[styles.modalOption, historyRange === r && styles.modalOptionActive]} onPress={() => { setHistoryRange(r); setHistorySheetVisible(false); }} activeOpacity={0.8}>
                  <Text style={[styles.modalOptionText, historyRange === r && styles.modalOptionTextActive]}>{r}</Text>
                  {historyRange === r && <Ionicons name="checkmark" size={20} color="#7c3aed" />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setHistorySheetVisible(false)}>
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Rejection Modal */}
        <Modal visible={rejectModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.rejectModal}>
              <View style={styles.rejectModalHeader}>
                <View style={styles.rejectModalIcon}>
                  <Ionicons name="close-circle" size={32} color="#ef4444" />
                </View>
                <Text style={styles.rejectModalTitle}>Reject Leave</Text>
                <Text style={styles.rejectModalSubtitle}>Provide a reason (optional)</Text>
              </View>
              <View style={styles.rejectModalBody}>
                <TextInput
                  style={styles.rejectModalInput}
                  placeholder="Enter rejection reason..."
                  placeholderTextColor="#9ca3af"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.rejectModalActions}>
                <TouchableOpacity style={styles.rejectModalCancelBtn} onPress={() => { setRejectModalVisible(false); setRejectionReason(""); setRejectingLeaveId(null); }}>
                  <Text style={styles.rejectModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectModalSubmitBtn} onPress={submitRejection} disabled={loading} activeOpacity={0.85}>
                  <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.rejectModalSubmitGradient}>
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.rejectModalSubmitText}>Reject</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Calendar Modal */}
        <Modal visible={calendarModalVisible} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={styles.calendarModalContainer}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>Leave Calendar</Text>
              <TouchableOpacity style={styles.calendarModalCloseBtn} onPress={() => setCalendarModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.calendarModalContent}>
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity style={styles.calendarNavBtn} onPress={goToModalPreviousMonth}>
                    <Ionicons name="chevron-back" size={24} color="#7c3aed" />
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthText}>{format(modalCurrentMonth, "MMMM yyyy")}</Text>
                  <TouchableOpacity style={styles.calendarNavBtn} onPress={goToModalNextMonth}>
                    <Ionicons name="chevron-forward" size={24} color="#7c3aed" />
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarWeekHeader}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <Text key={i} style={styles.calendarWeekDay}>{d}</Text>
                  ))}
                </View>
                <View style={styles.calendarGrid}>
                  {getModalCalendarDays().map((date, index) => {
                    const isCurrentMonth = isSameMonth(date, modalCurrentMonth);
                    const isHolidayDate = isHoliday(date);
                    const leaveCount = getLeaveCountForDate(date);
                    const isToday = isSameDay(date, new Date());
                    const isSelected = modalSelectedDate && isSameDay(date, modalSelectedDate);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.calendarDay, !isCurrentMonth && styles.calendarDayOther, isSelected && styles.calendarDaySelected, isToday && styles.calendarDayToday]}
                        onPress={() => setModalSelectedDate(date)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.calendarDayText, !isCurrentMonth && styles.calendarDayTextOther, isSelected && styles.calendarDayTextSelected]}>{format(date, "d")}</Text>
                        {leaveCount > 0 && <View style={styles.leaveCountBadge}><Text style={styles.leaveCountText}>{leaveCount}</Text></View>}
                        {isHolidayDate && <View style={styles.calendarHolidayDot} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {modalSelectedDate && (
                <View style={styles.selectedDateCard}>
                  <Text style={styles.selectedDateTitle}>{format(modalSelectedDate, "EEEE, MMMM dd, yyyy")}</Text>
                  {getHolidayName(modalSelectedDate) && (
                    <View style={styles.selectedDateHoliday}>
                      <Ionicons name="sunny" size={16} color="#f59e0b" />
                      <Text style={styles.selectedDateHolidayText}>{getHolidayName(modalSelectedDate)}</Text>
                    </View>
                  )}
                  {getLeavesForDate(modalSelectedDate).length === 0 ? (
                    <Text style={styles.selectedDateNoLeaves}>No leaves on this day</Text>
                  ) : (
                    getLeavesForDate(modalSelectedDate).map((leave) => (
                      <View key={leave.leave_id} style={styles.selectedDateLeave}>
                        <View style={[styles.selectedDateLeaveBar, { backgroundColor: getTypeColor(leave.leave_type || "") }]} />
                        <View style={styles.selectedDateLeaveContent}>
                          <Text style={styles.selectedDateLeaveName}>{leave.user?.name || "You"}</Text>
                          <Text style={styles.selectedDateLeaveType}>{leave.leave_type}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Loading Overlay */}
        {loading && !refreshing && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#7c3aed" />
              <Text style={styles.loadingOverlayText}>Processing...</Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#7c3aed" },
  safeArea: { flex: 1 },
  headerGradient: { paddingBottom: 24 },
  headerContent: { paddingHorizontal: 20, paddingTop: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitleContainer: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },

  statsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12, alignItems: "center" },
  statIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: "700", color: "#1e293b" },
  statLabel: { fontSize: 11, color: "#64748b", marginTop: 2 },

  contentContainer: { flex: 1, backgroundColor: "#f8fafc", borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -16 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  errorCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fef2f2", padding: 12, borderRadius: 12, marginBottom: 16, gap: 8 },
  errorText: { flex: 1, color: "#dc2626", fontSize: 13 },
  retryText: { color: "#7c3aed", fontWeight: "600" },

  tabsContainer: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, padding: 4, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, gap: 6 },
  tabActive: { backgroundColor: "#f5f3ff" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#9ca3af" },
  tabTextActive: { color: "#7c3aed" },
  tabWithBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabBadge: { backgroundColor: "#ef4444", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  tabBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  requestCard: { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  requestCardHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  requestCardHeaderIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  requestCardTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  requestCardSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  requestCardBody: { padding: 20, paddingTop: 8 },

  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  required: { color: "#ef4444" },
  selectInput: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, gap: 10 },
  selectInputText: { flex: 1, fontSize: 15, color: "#1e293b", fontWeight: "500" },
  leaveTypeDot: { width: 10, height: 10, borderRadius: 5 },
  dropdownList: { backgroundColor: "#fff", borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden", elevation: 4 },
  dropdownItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  dropdownItemActive: { backgroundColor: "#f5f3ff" },
  dropdownItemText: { flex: 1, fontSize: 15, color: "#374151" },
  dropdownItemTextActive: { color: "#7c3aed", fontWeight: "600" },

  dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateInput: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, padding: 12, gap: 10 },
  dateInputContent: { flex: 1 },
  dateInputLabel: { fontSize: 11, color: "#64748b", marginBottom: 2 },
  dateInputValue: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  dateArrow: { paddingHorizontal: 4 },

  textArea: { backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, fontSize: 15, color: "#1e293b", minHeight: 100, textAlignVertical: "top" },

  submitBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  submitBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  historyCard: { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  historyHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  historyIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center" },
  historyTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  historySubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  filterBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderWidth: 1, borderColor: "#e2e8f0" },
  filterBtnText: { fontSize: 12, color: "#374151", fontWeight: "500" },

  historyList: { padding: 12 },
  historyItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 12, marginBottom: 10, overflow: "hidden" },
  historyItemBar: { width: 4, alignSelf: "stretch" },
  historyItemContent: { flex: 1, padding: 12 },
  historyItemTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  historyItemDate: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: "600", color: "#fff" },
  historyItemBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: "600" },
  historyItemReason: { flex: 1, fontSize: 12, color: "#64748b" },
  deleteBtn: { padding: 12 },

  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyStateIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyStateTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  emptyStateSubtitle: { fontSize: 13, color: "#9ca3af", marginTop: 4 },

  approvalStats: { flexDirection: "row", gap: 10, marginBottom: 20 },
  approvalStatItem: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center" },
  approvalStatValue: { fontSize: 22, fontWeight: "700", marginTop: 6 },
  approvalStatLabel: { fontSize: 11, color: "#64748b", marginTop: 2 },

  approvalSection: { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  approvalSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  approvalSectionTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },

  loadingState: { alignItems: "center", paddingVertical: 40 },
  loadingText: { fontSize: 14, color: "#64748b", marginTop: 12 },

  approvalList: { padding: 12 },
  approvalCard: { backgroundColor: "#f8fafc", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  approvalCardPending: { backgroundColor: "#fffbeb", borderColor: "#fcd34d" },
  approvalCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  approvalAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: "#7c3aed" },
  approvalAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#7c3aed", alignItems: "center", justifyContent: "center" },
  approvalInfo: { flex: 1, marginLeft: 12 },
  approvalName: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  approvalDept: { fontSize: 12, color: "#64748b", marginTop: 2 },
  approvalStatusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 4 },
  approvalStatusText: { fontSize: 11, fontWeight: "600", color: "#fff" },

  approvalMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  approvalTypeBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6 },
  approvalTypeText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  approvalDuration: { fontSize: 13, fontWeight: "600", color: "#64748b" },

  approvalDateRange: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 12 },
  approvalDateItem: { flex: 1, alignItems: "center" },
  approvalDateLabel: { fontSize: 11, color: "#9ca3af", marginBottom: 4 },
  approvalDateValue: { fontSize: 13, fontWeight: "600", color: "#1e293b" },

  approvalReason: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 14 },
  approvalReasonLabel: { fontSize: 11, color: "#9ca3af", marginBottom: 4 },
  approvalReasonText: { fontSize: 13, color: "#374151", lineHeight: 18 },

  approvalActions: { flexDirection: "row", gap: 10 },
  approveBtn: { flex: 1, borderRadius: 12, overflow: "hidden" },
  rejectBtn: { flex: 1, borderRadius: 12, overflow: "hidden" },
  actionBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 6 },
  actionBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  holidaySection: { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  holidaySectionHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 10 },
  holidaySectionTitle: { fontSize: 16, fontWeight: "700", color: "#92400e" },
  holidaySectionBody: { padding: 16, paddingTop: 0 },
  holidayForm: { flexDirection: "row", gap: 8, marginBottom: 12 },
  holidayDateBtn: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 10, padding: 12, gap: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  holidayDateText: { fontSize: 13, color: "#374151" },
  holidayNameInput: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 10, padding: 12, fontSize: 13, color: "#1e293b", borderWidth: 1, borderColor: "#e2e8f0" },
  addHolidayBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#f59e0b", alignItems: "center", justifyContent: "center" },
  holidayList: { marginTop: 8 },
  holidayItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  holidayItemLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  holidayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#f59e0b" },
  holidayItemText: { fontSize: 14, fontWeight: "500", color: "#1e293b" },
  holidayItemDate: { fontSize: 12, color: "#64748b" },

  calendarCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  calendarNavBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center" },
  calendarMonthText: { fontSize: 18, fontWeight: "700", color: "#7c3aed" },
  calendarWeekHeader: { flexDirection: "row", marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  calendarWeekDay: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600", color: "#9ca3af" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarDay: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  calendarDayOther: { opacity: 0.3 },
  calendarDaySelected: { backgroundColor: "#7c3aed", borderRadius: 12 },
  calendarDayToday: { backgroundColor: "#f5f3ff", borderRadius: 12 },
  calendarDayText: { fontSize: 14, fontWeight: "500", color: "#1e293b" },
  calendarDayTextOther: { color: "#9ca3af" },
  calendarDayTextSelected: { color: "#fff", fontWeight: "700" },
  calendarHolidayDot: { position: "absolute", bottom: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: "#f59e0b" },
  leaveCountBadge: { position: "absolute", top: 2, right: 4, backgroundColor: "#ef4444", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  leaveCountText: { fontSize: 9, fontWeight: "700", color: "#fff" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalSheetTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b", textAlign: "center", marginBottom: 16 },
  modalOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 12, backgroundColor: "#f8fafc", marginBottom: 8 },
  modalOptionActive: { backgroundColor: "#f5f3ff", borderWidth: 1, borderColor: "#7c3aed" },
  modalOptionText: { fontSize: 15, color: "#374151", fontWeight: "500" },
  modalOptionTextActive: { color: "#7c3aed", fontWeight: "600" },
  modalCloseBtn: { alignItems: "center", paddingVertical: 14, marginTop: 8 },
  modalCloseBtnText: { fontSize: 15, fontWeight: "600", color: "#64748b" },

  rejectModal: { backgroundColor: "#fff", borderRadius: 24, margin: 20, overflow: "hidden" },
  rejectModalHeader: { alignItems: "center", padding: 24, backgroundColor: "#fef2f2" },
  rejectModalIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  rejectModalTitle: { fontSize: 20, fontWeight: "700", color: "#1e293b" },
  rejectModalSubtitle: { fontSize: 13, color: "#64748b", marginTop: 4 },
  rejectModalBody: { padding: 20 },
  rejectModalInput: { backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, fontSize: 15, color: "#1e293b", minHeight: 100, textAlignVertical: "top" },
  rejectModalActions: { flexDirection: "row", gap: 12, padding: 20, paddingTop: 0 },
  rejectModalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#f1f5f9", alignItems: "center" },
  rejectModalCancelText: { fontSize: 15, fontWeight: "600", color: "#64748b" },
  rejectModalSubmitBtn: { flex: 1, borderRadius: 12, overflow: "hidden" },
  rejectModalSubmitGradient: { paddingVertical: 14, alignItems: "center" },
  rejectModalSubmitText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  calendarModalContainer: { flex: 1, backgroundColor: "#f8fafc" },
  calendarModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  calendarModalTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  calendarModalCloseBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  calendarModalContent: { flex: 1, padding: 16 },

  selectedDateCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginTop: 16 },
  selectedDateTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 12 },
  selectedDateHoliday: { flexDirection: "row", alignItems: "center", backgroundColor: "#fef3c7", padding: 10, borderRadius: 10, gap: 8, marginBottom: 12 },
  selectedDateHolidayText: { fontSize: 13, fontWeight: "500", color: "#92400e" },
  selectedDateNoLeaves: { fontSize: 13, color: "#64748b", textAlign: "center", paddingVertical: 16 },
  selectedDateLeave: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 10, marginBottom: 8, overflow: "hidden" },
  selectedDateLeaveBar: { width: 4, alignSelf: "stretch" },
  selectedDateLeaveContent: { flex: 1, padding: 12 },
  selectedDateLeaveName: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  selectedDateLeaveType: { fontSize: 12, color: "#64748b", marginTop: 2 },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  loadingCard: { backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  loadingOverlayText: { fontSize: 15, fontWeight: "600", color: "#64748b", marginTop: 16 },

  pulseContainer: { width: 10, height: 10, alignItems: "center", justifyContent: "center" },
  pulseOuter: { position: "absolute", width: 10, height: 10, borderRadius: 5 },
  pulseInner: { width: 6, height: 6, borderRadius: 3 },

  // Cross-platform Date Picker styles
  datePickerModal: { backgroundColor: "#fff", borderRadius: 20, margin: 20, overflow: "hidden" },
  datePickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  datePickerTitle: { fontSize: 17, fontWeight: "600", color: "#1e293b" },
  datePickerCancelText: { fontSize: 16, color: "#64748b" },
  datePickerDoneText: { fontSize: 16, fontWeight: "600", color: "#7c3aed" },
  iosDatePicker: { height: 200, width: "100%" },
});
