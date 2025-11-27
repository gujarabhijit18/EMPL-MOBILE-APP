import { Ionicons } from "@expo/vector-icons";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { Button, Card, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_CONFIG } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { apiService, LeaveRequestResponse, LeaveSummary } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";

// 🧩 Types
type LeaveType = "Annual Leave" | "Sick Leave" | "Casual Leave" | "Maternity Leave" | "Paternity Leave" | "Unpaid Leave";
type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

interface Holiday {
  date: Date;
  name: string;
}

export default function LeaveManagement() {
  const { user } = useAuth();
  const navigation = useNavigation();
  
  // Animation values for header elements
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  
  // Tab bar visibility with auto-hide on scroll
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();
  
  // Use actual user from auth context
  const currentUser = user || { id: "EMP001", name: "John Doe", role: "employee" as const, department: "Engineering", user_id: 1, employee_id: "EMP001" };
  const employeeId = (currentUser as any).employee_id || currentUser.id || "EMP001";

  // API State
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [myLeaves, setMyLeaves] = useState<LeaveRequestResponse[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequestResponse[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequestResponse[]>([]); // All leaves for recent decisions
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
  
  // Animate header elements on component mount
  useEffect(() => {
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
  }, []);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [holidayForm, setHolidayForm] = useState({ date: new Date(), name: "" });
  
  // Calendar modal state
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [modalCurrentMonth, setModalCurrentMonth] = useState(new Date());
  const [modalSelectedDate, setModalSelectedDate] = useState<Date | null>(null);
  
  // Leave type dropdown state
  const [showLeaveTypeDropdown, setShowLeaveTypeDropdown] = useState(false);
  
  // Rejection modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingLeaveId, setRejectingLeaveId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Role-based permissions
  const userRole = currentUser.role?.toLowerCase() || 'employee';
  const isAdmin = userRole === "admin";
  const canApproveLeaves = ["admin", "hr", "manager"].includes(userRole);
  const canApply = !isAdmin; // Admin cannot apply for leave, all other roles can
  const canSeeTeamLeaves = ["admin", "hr", "manager"].includes(userRole);
  const isTeamLead = userRole === "team_lead";
  const isEmployee = userRole === "employee";

  // Default tab: Admin goes to approvals, others go to apply (My Leaves)
  const [activeTab, setActiveTab] = useState<"apply" | "approvals" | "calendar">(
    isAdmin ? "approvals" : "apply"
  );

  // 📡 Fetch my leaves from API
  const fetchMyLeaves = useCallback(async () => {
    try {
      console.log("📥 Fetching my leaves...");
      const leaves = await apiService.getMyLeaves();
      setMyLeaves(leaves);
      console.log("✅ My leaves fetched:", leaves.length);
    } catch (err: any) {
      console.error("❌ Failed to fetch my leaves:", err);
      setError(err.message);
    }
  }, []);

  // 📡 Fetch team leaves for approval (Admin/HR/Manager only)
  // Backend enforces strict department isolation
  const fetchTeamLeaves = useCallback(async () => {
    if (!canSeeTeamLeaves) return;
    
    try {
      console.log(`📥 Fetching leaves for ${userRole}...`);
      
      // Backend handles role-based filtering:
      // - Admin: /leave/all (all departments, all roles)
      // - HR/Manager: /leave/department (their department, Employee/TeamLead only)
      const response = await apiService.getTeamLeaves();
      const fetchedLeaves = response.leaves || [];
      
      console.log(`📊 Fetched ${fetchedLeaves.length} leave requests from backend`);
      console.log(`👤 Role: ${userRole}, Department: ${currentUser.department}`);
      
      // Store all leaves for recent decisions
      setAllLeaves(fetchedLeaves);
      
      // Sort leaves: Pending first, then by date (newest first)
      const statusOrder: Record<string, number> = { Pending: 0, Approved: 1, Rejected: 2, Cancelled: 3 };
      const sorted = [...fetchedLeaves].sort((a: any, b: any) => {
        // First sort by status
        const statusDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        
        // Then sort by created_at (newest first)
        const dateA = new Date(a.created_at || a.start_date).getTime();
        const dateB = new Date(b.created_at || b.start_date).getTime();
        return dateB - dateA;
      });
      setTeamLeaves(sorted);
      
      console.log("✅ Leaves sorted - Pending:", sorted.filter(l => l.status === "Pending").length);
    } catch (err: any) {
      console.error("❌ Failed to fetch team leaves:", err);
      setError(err.message);
    }
  }, [canSeeTeamLeaves, userRole, currentUser.department]);

  // 📡 Fetch leave summary
  const fetchLeaveSummary = useCallback(async () => {
    try {
      console.log("📥 Fetching leave summary...");
      const summary = await apiService.getMyLeaveSummary();
      setLeaveSummary(summary);
      console.log("✅ Leave summary fetched:", summary);
    } catch (err: any) {
      console.error("❌ Failed to fetch leave summary:", err);
    }
  }, []);

  // 🔄 Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchMyLeaves(),
        fetchTeamLeaves(),
        fetchLeaveSummary(),
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchMyLeaves, fetchTeamLeaves, fetchLeaveSummary]);

  // 🔄 Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ✅ Open Date Picker (Expo-compatible)
  const openDatePicker = (field: "startDate" | "endDate") => {
    DateTimePickerAndroid.open({
      value: form[field],
      mode: "date",
      is24Hour: true,
      onChange: (_, date) => {
        if (date) setForm({ ...form, [field]: date });
      },
    });
  };

  // ✅ Submit Leave Request to API
  const submitLeave = async () => {
    if (!form.reason.trim()) {
      Alert.alert("Error", "Please enter a reason for leave.");
      return;
    }

    setLoading(true);
    try {
      const leaveData = {
        employee_id: employeeId,
        leave_type: form.type,
        start_date: format(form.startDate, "yyyy-MM-dd"),
        end_date: format(form.endDate, "yyyy-MM-dd"),
        reason: form.reason,
        status: "Pending",
      };

      console.log("📤 Submitting leave request:", leaveData);
      const result = await apiService.submitLeaveRequest(leaveData);
      console.log("✅ Leave request submitted:", result);

      Alert.alert("Success", "Leave request submitted successfully.");
      setForm({ type: "Annual Leave", startDate: new Date(), endDate: new Date(), reason: "" });
      
      // Refresh leaves list
      await fetchMyLeaves();
    } catch (err: any) {
      console.error("❌ Failed to submit leave:", err);
      Alert.alert("Error", err.message || "Failed to submit leave request.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Approve Leave Request
  const handleApprove = async (leaveId: number) => {
    Alert.alert(
      "Approve Leave Request",
      "Are you sure you want to approve this leave request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: async () => {
            setLoading(true);
            try {
              console.log("✅ Approving leave:", leaveId);
              await apiService.approveLeaveRequest(leaveId, "Approved by " + currentUser.name);
              Alert.alert("✅ Success", "Leave request has been approved successfully.");
              
              // Refresh both team leaves and summary
              await Promise.all([
                fetchTeamLeaves(),
                fetchLeaveSummary(),
              ]);
            } catch (err: any) {
              console.error("❌ Failed to approve leave:", err);
              Alert.alert("❌ Error", err.message || "Failed to approve leave request. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ✅ Open Reject Modal
  const handleReject = (leaveId: number) => {
    setRejectingLeaveId(leaveId);
    setRejectionReason("");
    setRejectModalVisible(true);
  };

  // ✅ Submit Rejection
  const submitRejection = async () => {
    if (rejectingLeaveId === null) return;
    
    setLoading(true);
    setRejectModalVisible(false);
    
    try {
      const reason = rejectionReason.trim() || "No reason provided";
      console.log("❌ Rejecting leave:", rejectingLeaveId, "Reason:", reason);
      await apiService.rejectLeaveRequest(rejectingLeaveId, reason);
      Alert.alert("✅ Success", "Leave request has been rejected.");
      
      // Refresh both team leaves and summary
      await Promise.all([
        fetchTeamLeaves(),
        fetchLeaveSummary(),
      ]);
      
      // Reset state
      setRejectingLeaveId(null);
      setRejectionReason("");
    } catch (err: any) {
      console.error("❌ Failed to reject leave:", err);
      Alert.alert("❌ Error", err.message || "Failed to reject leave request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete Leave Request
  const handleDeleteLeave = async (leaveId: number) => {
    Alert.alert(
      "Delete Leave Request",
      "Are you sure you want to delete this leave request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await apiService.deleteLeaveRequest(leaveId);
              Alert.alert("Success", "Leave request deleted.");
              await fetchMyLeaves();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete leave request.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ✅ Export Leaves to Excel
  const handleExportExcel = async () => {
    setLoading(true);
    try {
      await apiService.exportLeavesExcel();
      Alert.alert("Success", "Leaves exported successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to export leaves.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Add Holiday (Offline)
  const addHoliday = () => {
    if (!holidayForm.name.trim()) {
      Alert.alert("Error", "Please enter a holiday name.");
      return;
    }
    setHolidays([...holidays, { date: holidayForm.date, name: holidayForm.name }]);
    setHolidayForm({ date: new Date(), name: "" });
    Alert.alert("Success", "Holiday added successfully.");
  };

  // ✅ Remove Holiday
  const removeHoliday = (index: number) => {
    Alert.alert(
      "Remove Holiday",
      "Are you sure you want to remove this holiday?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => setHolidays(holidays.filter((_, i) => i !== index)),
        },
      ]
    );
  };

  // ✅ Calendar navigation
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToModalPreviousMonth = () => setModalCurrentMonth(subMonths(modalCurrentMonth, 1));
  const goToModalNextMonth = () => setModalCurrentMonth(addMonths(modalCurrentMonth, 1));

  // ✅ Get calendar days
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

  // ✅ Check if date is a holiday
  const isHoliday = (date: Date) => holidays.some((holiday) => isSameDay(holiday.date, date));
  const getHolidayName = (date: Date) => holidays.find((h) => isSameDay(h.date, date))?.name || null;

  // ✅ Calculate leave count for a specific date
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

  // ✅ Open holiday date picker
  const openHolidayDatePicker = () => {
    DateTimePickerAndroid.open({
      value: holidayForm.date,
      mode: "date",
      is24Hour: true,
      onChange: (_, date) => {
        if (date) setHolidayForm({ ...holidayForm, date });
      },
    });
  };

  // ✅ Helper: Leave Type Color
  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "annual leave": case "annual": return "#3B82F6";
      case "sick leave": case "sick": return "#EF4444";
      case "casual leave": case "casual": return "#10B981";
      case "maternity leave": case "maternity": return "#A855F7";
      case "paternity leave": case "paternity": return "#6366F1";
      case "unpaid leave": case "unpaid": return "#9CA3AF";
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

  // 📆 Leave history period filter
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

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
      <StatusBar style="light" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Animated.View style={[styles.headerTextContainer, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
            <Text style={styles.headerTitle}>Leave Management</Text>
            <Text style={styles.headerSubtitle}>Track and manage employee leaves</Text>
          </Animated.View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconButton} onPress={handleExportExcel}>
              <Ionicons name="download-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton} onPress={() => setCalendarModalVisible(true)}>
              <Ionicons name="calendar-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        
      </View>
      
      {/* Loading Indicator */}
      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      )}
      
      <ScrollView 
        style={styles.contentContainer}
        contentContainerStyle={[styles.scrollContentContainer, { paddingBottom: tabBarVisible ? tabBarHeight + 24 : 100 }]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4F46E5"]} />}
      >
        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 🧭 Tabs */}
        <View style={styles.tabs}>
          {/* My Leaves tab - hidden for admin */}
          {canApply && (
            <TouchableOpacity style={[styles.tab, activeTab === "apply" && styles.tabActive]} onPress={() => setActiveTab("apply")}>
              <Text style={[styles.tabText, activeTab === "apply" && styles.tabTextActive]}>
                My Leaves
              </Text>
            </TouchableOpacity>
          )}
          {canSeeTeamLeaves && (
            <TouchableOpacity style={[styles.tab, activeTab === "approvals" && styles.tabActive]} onPress={() => setActiveTab("approvals")}>
              <Text style={[styles.tabText, activeTab === "approvals" && styles.tabTextActive]}>
                {isAdmin ? 'Approvals' : 'Team Leaves'} {teamLeaves.filter(l => l.status === "Pending").length > 0 && `(${teamLeaves.filter(l => l.status === "Pending").length})`}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.tab, activeTab === "calendar" && styles.tabActive]} onPress={() => setActiveTab("calendar")}>
            <Text style={[styles.tabText, activeTab === "calendar" && styles.tabTextActive]}>Leave Calendar</Text>
          </TouchableOpacity>
        </View>

        {/* 📝 Apply Leave Tab - Only for non-admin users */}
        {activeTab === "apply" && canApply && (
          <View>
            <Card style={styles.leaveRequestCard}>
              <Card.Content>
                <Text style={styles.leaveRequestTitle}>Request Leave</Text>
                
                {/* Leave Type Dropdown */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Leave Type</Text>
                  <TouchableOpacity style={styles.dropdown} onPress={() => setShowLeaveTypeDropdown(!showLeaveTypeDropdown)}>
                    <Text style={styles.dropdownText}>{form.type}</Text>
                    <Ionicons name={showLeaveTypeDropdown ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                  </TouchableOpacity>
                  
                  {showLeaveTypeDropdown && (
                    <View style={styles.dropdownOptions}>
                      {(["Annual Leave", "Sick Leave", "Casual Leave", "Maternity Leave", "Paternity Leave", "Unpaid Leave"] as LeaveType[]).map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[styles.dropdownOption, form.type === option && styles.dropdownOptionSelected]}
                          onPress={() => { setForm({ ...form, type: option }); setShowLeaveTypeDropdown(false); }}
                        >
                          <Text style={[styles.dropdownOptionText, form.type === option && styles.dropdownOptionTextSelected]}>{option}</Text>
                          {form.type === option && <Ionicons name="checkmark" size={20} color="#fff" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Duration Section */}
                <Text style={styles.durationLabel}>Duration</Text>
                <View style={styles.dateRow}>
                  <TouchableOpacity onPress={() => openDatePicker("startDate")} style={styles.dateInput}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.dateInputText}>{format(form.startDate, "MMMM do, yyyy")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openDatePicker("endDate")} style={styles.dateInput}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.dateInputText}>{format(form.endDate, "MMMM do, yyyy")}</Text>
                  </TouchableOpacity>
                </View>

                {/* Reason Section */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Reason</Text>
                  <TextInput
                    value={form.reason}
                    onChangeText={(text) => setForm({ ...form, reason: text })}
                    placeholder="Please provide a reason for your leave request..."
                    multiline
                    numberOfLines={4}
                    style={styles.reasonTextArea}
                  />
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={submitLeave} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.submitButtonText}>Submit Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Card.Content>
            </Card>

            {/* 📚 Leave History */}
            <Card style={styles.card}>
              <LinearGradient colors={["#ede9fe", "#f5f3ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.historyHeader}>
                <View style={styles.historyHeaderLeft}>
                  <View style={styles.historyIconBox}>
                    <Ionicons name="calendar-clear-outline" size={20} color="#7c3aed" />
                  </View>
                  <View>
                    <Text style={styles.historyTitle}>My Leave History</Text>
                    <Text style={styles.historySubtitle}>Track all your leave requests</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.historyFilterBox} onPress={() => setHistorySheetVisible(true)}>
                  <Text style={styles.historyFilterText}>{historyRange}</Text>
                  <Ionicons name="chevron-down" size={16} color="#374151" />
                </TouchableOpacity>
              </LinearGradient>
              <Card.Content>
                {filteredLeavesByPeriod.length === 0 ? (
                  <View style={styles.historyEmpty}>
                    <View style={styles.historyEmptyIconBox}>
                      <Ionicons name="alert-circle-outline" size={28} color="#a78bfa" />
                    </View>
                    <Text style={styles.historyEmptyTitle}>No Leave History</Text>
                    <Text style={styles.historyEmptySubtitle}>No leave requests found for the selected period.</Text>
                  </View>
                ) : (
                  filteredLeavesByPeriod.map((req) => (
                    <View key={req.leave_id} style={styles.leaveItem}>
                      <View style={styles.leaveItemLeft}>
                        <Text style={styles.leaveText}>
                          {format(parseISO(req.start_date), "MMM dd")} - {format(parseISO(req.end_date), "MMM dd, yyyy")}
                        </Text>
                        <Text style={styles.leaveReason} numberOfLines={1}>{req.reason}</Text>
                      </View>
                      <View style={styles.leaveItemRight}>
                        <Chip style={{ backgroundColor: getTypeColor(req.leave_type || ""), marginBottom: 4 }} textStyle={{ color: "#fff", fontSize: 10 }}>
                          {req.leave_type || "Leave"}
                        </Chip>
                        <Chip style={{ backgroundColor: getStatusColor(req.status) }} textStyle={{ color: "#fff", fontSize: 10 }}>
                          {req.status}
                        </Chip>
                      </View>
                      {req.status === "Pending" && (
                        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteLeave(req.leave_id)}>
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* ✅ Approvals Tab */}
        {activeTab === "approvals" && (
          <View>
            {/* Stats Summary */}
            <View style={styles.approvalStatsContainer}>
              <View style={styles.approvalStatCard}>
                <View style={[styles.approvalStatIcon, { backgroundColor: "#FEF3C7" }]}>
                  <Ionicons name="time-outline" size={20} color="#F59E0B" />
                </View>
                <Text style={styles.approvalStatValue}>{teamLeaves.filter(l => l.status === "Pending").length}</Text>
                <Text style={styles.approvalStatLabel}>Pending</Text>
              </View>
              <View style={styles.approvalStatCard}>
                <View style={[styles.approvalStatIcon, { backgroundColor: "#D1FAE5" }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                </View>
                <Text style={styles.approvalStatValue}>{teamLeaves.filter(l => l.status === "Approved").length}</Text>
                <Text style={styles.approvalStatLabel}>Approved</Text>
              </View>
              <View style={styles.approvalStatCard}>
                <View style={[styles.approvalStatIcon, { backgroundColor: "#FEE2E2" }]}>
                  <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                </View>
                <Text style={styles.approvalStatValue}>{teamLeaves.filter(l => l.status === "Rejected").length}</Text>
                <Text style={styles.approvalStatLabel}>Rejected</Text>
              </View>
              <View style={styles.approvalStatCard}>
                <View style={[styles.approvalStatIcon, { backgroundColor: "#E0E7FF" }]}>
                  <Ionicons name="list-outline" size={20} color="#4F46E5" />
                </View>
                <Text style={styles.approvalStatValue}>{teamLeaves.length}</Text>
                <Text style={styles.approvalStatLabel}>Total</Text>
              </View>
            </View>

            {/* Leave Approval Requests Section */}
            <Card style={styles.approvalSectionCard}>
              <View style={styles.approvalSectionHeader}>
                <View style={styles.approvalSectionHeaderLeft}>
                  <Ionicons name="clipboard-outline" size={20} color="#4F46E5" />
                  <Text style={styles.approvalSectionTitle}>Leave Requests</Text>
                </View>
                <TouchableOpacity onPress={fetchTeamLeaves} style={styles.refreshButton}>
                  <Ionicons name="refresh" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4F46E5" />
                  <Text style={styles.loadingText}>Loading leave requests...</Text>
                </View>
              ) : teamLeaves.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIconContainer}>
                    <Ionicons name="checkmark-done-circle-outline" size={56} color="#10B981" />
                  </View>
                  <Text style={styles.emptyStateTitle}>All Caught Up!</Text>
                  <Text style={styles.emptyStateText}>No leave requests to review</Text>
                  <TouchableOpacity style={styles.emptyStateButton} onPress={fetchTeamLeaves}>
                    <Ionicons name="refresh" size={16} color="#4F46E5" />
                    <Text style={styles.emptyStateButtonText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView style={styles.approvalScrollView} nestedScrollEnabled={true}>
                  {teamLeaves.map((req) => {
                    // Calculate days between dates
                    const startDate = parseISO(req.start_date);
                    const endDate = parseISO(req.end_date);
                    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    const isPending = req.status === "Pending";
                    const createdDate = req.created_at ? format(parseISO(req.created_at), "MMM dd, yyyy") : "";
                    
                    // Get department from nested user object or direct field
                    const department = req.user?.department || req.department || "Not Specified";
                    
                    // Get profile photo - check both nested user object and direct field
                    const profilePhoto = req.user?.profile_photo || req.profile_photo;
                    const photoUri = profilePhoto ? `${API_CONFIG.getApiBaseUrl()}${profilePhoto}` : null;
                    
                    return (
                      <View key={req.leave_id} style={[styles.approvalRequestCard, isPending && styles.approvalRequestCardPending]}>
                        {/* Top Row: Avatar, Name, Type Chip, Status */}
                        <View style={styles.approvalTopRow}>
                          {photoUri ? (
                            <Image 
                              source={{ uri: photoUri }}
                              style={styles.approvalAvatar}
                            />
                          ) : (
                            <View style={styles.approvalAvatarContainer}>
                              <Ionicons name="person" size={20} color="#fff" />
                            </View>
                          )}
                          <View style={styles.approvalNameContainer}>
                            <Text style={styles.approvalName}>{req.user?.name || req.name || "Employee"}</Text>
                            <Text style={styles.approvalEmployeeId}>{req.employee_id || req.user?.employee_id || "N/A"}</Text>
                          </View>
                          <View style={{ flex: 1 }} />
                          <View style={[styles.approvalStatusChip, { backgroundColor: getStatusColor(req.status) }]}>
                            <Text style={styles.approvalStatusChipText}>{req.status.toUpperCase()}</Text>
                          </View>
                        </View>
                        
                        {/* Leave Type Badge */}
                        <View style={styles.approvalTypeRow}>
                          <View style={[styles.approvalTypeBadge, { backgroundColor: getTypeColor(req.leave_type || "") }]}>
                            <Ionicons name="calendar" size={14} color="#fff" />
                            <Text style={styles.approvalTypeBadgeText}>{req.leave_type || "Leave"}</Text>
                          </View>
                          {createdDate && (
                            <Text style={styles.approvalCreatedDate}>Requested: {createdDate}</Text>
                          )}
                        </View>
                        
                        {/* Details Grid */}
                        <View style={styles.approvalDetailsGrid}>
                          <View style={styles.approvalDetailBox}>
                            <Ionicons name="briefcase-outline" size={16} color="#6B7280" />
                            <Text style={styles.approvalDetailLabel}>Department</Text>
                            <Text style={styles.approvalDetailValue}>{department}</Text>
                          </View>
                          <View style={styles.approvalDetailBox}>
                            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                            <Text style={styles.approvalDetailLabel}>Duration</Text>
                            <Text style={styles.approvalDetailValue}>{req.days || daysDiff} days</Text>
                          </View>
                        </View>
                        
                        {/* Date Range */}
                        <View style={styles.approvalDateRange}>
                          <View style={styles.approvalDateItem}>
                            <Text style={styles.approvalDateLabel}>From</Text>
                            <Text style={styles.approvalDateValue}>{format(startDate, "MMM dd, yyyy")}</Text>
                          </View>
                          <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
                          <View style={styles.approvalDateItem}>
                            <Text style={styles.approvalDateLabel}>To</Text>
                            <Text style={styles.approvalDateValue}>{format(endDate, "MMM dd, yyyy")}</Text>
                          </View>
                        </View>
                        
                        {/* Reason */}
                        <View style={styles.approvalReasonContainer}>
                          <View style={styles.approvalReasonHeader}>
                            <Ionicons name="document-text-outline" size={14} color="#6B7280" />
                            <Text style={styles.approvalReasonLabel}>Reason</Text>
                          </View>
                          <Text style={styles.approvalReasonText}>{req.reason || "No reason provided"}</Text>
                        </View>
                        
                        {/* Comments (if rejected or approved) */}
                        {(req.comments || req.rejection_reason) && (
                          <View style={styles.approvalCommentsContainer}>
                            <View style={styles.approvalCommentsHeader}>
                              <Ionicons name="chatbox-outline" size={14} color="#6B7280" />
                              <Text style={styles.approvalCommentsLabel}>
                                {req.status === "Rejected" ? "Rejection Reason" : "Comments"}
                              </Text>
                            </View>
                            <Text style={styles.approvalCommentsText}>
                              {req.rejection_reason || req.comments}
                            </Text>
                          </View>
                        )}
                        
                        {/* Approver Info (if approved) */}
                        {req.approver && req.approved_at && (
                          <View style={styles.approvalApproverInfo}>
                            <Ionicons name="person-circle-outline" size={14} color="#10B981" />
                            <Text style={styles.approvalApproverText}>
                              {req.status === "Approved" ? "Approved" : "Rejected"} by {req.approver.name} on {format(parseISO(req.approved_at), "MMM dd, yyyy")}
                            </Text>
                          </View>
                        )}
                        
                        {/* Action Buttons - Only show for pending requests */}
                        {isPending && (
                          <View style={styles.approvalActionRow}>
                            <TouchableOpacity 
                              style={[styles.approveButton, loading && styles.buttonDisabled]} 
                              onPress={() => handleApprove(req.leave_id)}
                              disabled={loading}
                              activeOpacity={0.7}
                            >
                              {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                  <Text style={styles.approveButtonText}>Approve</Text>
                                </>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.rejectButton, loading && styles.buttonDisabled]} 
                              onPress={() => handleReject(req.leave_id)}
                              disabled={loading}
                              activeOpacity={0.7}
                            >
                              {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <Ionicons name="close-circle" size={18} color="#fff" />
                                  <Text style={styles.rejectButtonText}>Reject</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </Card>
            
            {/* Recent Decisions Section */}
            {allLeaves.filter(l => l.status === "Approved" || l.status === "Rejected").length > 0 && (
              <Card style={styles.recentDecisionsCard}>
                <View style={styles.recentDecisionsHeader}>
                  <Ionicons name="time-outline" size={18} color="#6B7280" />
                  <Text style={styles.recentDecisionsTitle}>Recent Decisions</Text>
                </View>
                <View style={styles.recentDecisionsContent}>
                  {allLeaves
                    .filter(l => l.status === "Approved" || l.status === "Rejected")
                    .slice(0, 5)
                    .map((leave) => {
                      // Get profile photo - check both nested user object and direct field
                      const profilePhoto = leave.user?.profile_photo || leave.profile_photo;
                      const photoUri = profilePhoto ? `${API_CONFIG.getApiBaseUrl()}${profilePhoto}` : null;
                      
                      return (
                        <View key={leave.leave_id} style={styles.recentDecisionItem}>
                          {photoUri ? (
                            <Image 
                              source={{ uri: photoUri }}
                              style={styles.recentDecisionAvatar}
                            />
                          ) : (
                            <View style={styles.recentDecisionAvatarPlaceholder}>
                              <Ionicons name="person" size={16} color="#9CA3AF" />
                            </View>
                          )}
                          <View style={styles.recentDecisionLeft}>
                            <Text style={styles.recentDecisionName}>{leave.user?.name || leave.name || leave.employee_id || "Employee"}</Text>
                            <Text style={styles.recentDecisionDate}>
                              {format(parseISO(leave.start_date), "MMM dd")} - {format(parseISO(leave.end_date), "MMM dd")}
                            </Text>
                            <Text style={styles.recentDecisionType}>{leave.leave_type || "Leave"}</Text>
                          </View>
                          <View style={[styles.recentDecisionStatus, { backgroundColor: getStatusColor(leave.status) }]}>
                            <Ionicons 
                              name={leave.status === "Approved" ? "checkmark-circle" : "close-circle"} 
                              size={14} 
                              color="#fff" 
                            />
                            <Text style={styles.recentDecisionStatusText}>{leave.status}</Text>
                          </View>
                        </View>
                      );
                    })}
                </View>
              </Card>
            )}
          </View>
        )}

        {/* 📆 Calendar Tab */}
        {activeTab === "calendar" && (
          <View style={styles.calendarContainer}>
            {/* Set Company Holidays Section */}
            <View style={styles.holidaySection}>
              <View style={styles.holidaySectionHeader}>
                <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
                <Text style={styles.holidaySectionTitle}>Set Company Holidays</Text>
              </View>
              
              <View style={styles.holidayForm}>
                <TouchableOpacity onPress={openHolidayDatePicker} style={styles.holidayDateInput}>
                  <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                  <Text style={styles.holidayDateText}>{format(holidayForm.date, "MMMM do, yyyy")}</Text>
                </TouchableOpacity>
                
                <TextInput
                  style={styles.holidayNameInput}
                  placeholder="Holiday name"
                  value={holidayForm.name}
                  onChangeText={(text) => setHolidayForm({ ...holidayForm, name: text })}
                />
                
                <TouchableOpacity onPress={addHoliday} style={styles.addHolidayButton}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.addHolidayButtonText}>Add</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.currentHolidaysSection}>
                <Text style={styles.currentHolidaysTitle}>Current Holidays:</Text>
                {holidays.length === 0 ? (
                  <Text style={styles.noHolidaysText}>No holidays set</Text>
                ) : (
                  holidays.map((holiday, index) => (
                    <View key={index} style={styles.holidayListItem}>
                      <Text style={styles.holidayListItemText}>
                        {holiday.name} ({format(holiday.date, "EEE MMM dd yyyy")})
                      </Text>
                      <TouchableOpacity onPress={() => removeHoliday(index)} style={styles.removeHolidayButton}>
                        <Text style={styles.removeHolidayButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* Calendar View */}
            <Card style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthNavButton}>
                  <Ionicons name="chevron-back" size={24} color="#2563eb" />
                </TouchableOpacity>
                <Text style={styles.monthYearText}>{format(currentMonth, "MMMM yyyy")}</Text>
                <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavButton}>
                  <Ionicons name="chevron-forward" size={24} color="#2563eb" />
                </TouchableOpacity>
              </View>

              <View style={styles.daysOfWeekHeader}>
                {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((day) => (
                  <Text key={day} style={styles.dayOfWeekText}>{day}</Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {getCalendarDays().map((date: Date, index: number) => {
                  const isCurrentMonthDay = isSameMonth(date, currentMonth);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const isHolidayDate = isHoliday(date);

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.calendarDay, !isCurrentMonthDay && styles.calendarDayOtherMonth, isSelected && styles.calendarDaySelected]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text style={[styles.calendarDayText, !isCurrentMonthDay && styles.calendarDayTextOtherMonth, isSelected && styles.calendarDayTextSelected]}>
                        {format(date, "d")}
                      </Text>
                      {isHolidayDate && <View style={styles.holidayDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.holidaysLegend}>
                <View style={styles.holidaysLegendHeader}>
                  <Ionicons name="calendar-outline" size={16} color="#F59E0B" />
                  <Text style={styles.holidaysLegendTitle}>Company Holidays:</Text>
                </View>
                {holidays.length === 0 ? (
                  <Text style={styles.noHolidaysLegendText}>No holidays set</Text>
                ) : (
                  holidays.map((holiday, index) => (
                    <View key={index} style={styles.holidayLegendItem}>
                      <View style={styles.holidayLegendDot} />
                      <Text style={styles.holidayLegendText}>{holiday.name} ({format(holiday.date, "EEE MMM dd yyyy")})</Text>
                    </View>
                  ))
                )}
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* History Range Bottom Sheet */}
      <Modal visible={historySheetVisible} transparent animationType="fade">
        <View style={styles.historyModalOverlay}>
          <View style={styles.historyModalContent}>
            <Text style={styles.historyModalTitle}>Select Period</Text>
            {historyRanges.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.historyOption, historyRange === r && styles.historyOptionActive]}
                onPress={() => { setHistoryRange(r); setHistorySheetVisible(false); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.historyOptionText, historyRange === r && styles.historyOptionTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.historyModalButtons}>
              <Button mode="outlined" onPress={() => setHistorySheetVisible(false)}>Close</Button>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Rejection Reason Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade" onRequestClose={() => setRejectModalVisible(false)}>
        <View style={styles.rejectModalOverlay}>
          <View style={styles.rejectModalContent}>
            <View style={styles.rejectModalHeader}>
              <View style={styles.rejectModalIconContainer}>
                <Ionicons name="close-circle" size={28} color="#EF4444" />
              </View>
              <Text style={styles.rejectModalTitle}>Reject Leave Request</Text>
              <Text style={styles.rejectModalSubtitle}>Provide a reason for rejection (optional)</Text>
            </View>
            
            <View style={styles.rejectModalBody}>
              <Text style={styles.rejectModalLabel}>Rejection Reason</Text>
              <TextInput
                style={styles.rejectModalInput}
                placeholder="Enter reason for rejection (optional)..."
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoFocus
              />
              <Text style={styles.rejectModalHint}>
                💡 Providing a reason helps the employee understand the decision
              </Text>
            </View>
            
            <View style={styles.rejectModalActions}>
              <TouchableOpacity 
                style={styles.rejectModalCancelButton} 
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectionReason("");
                  setRejectingLeaveId(null);
                }}
                disabled={loading}
              >
                <Text style={styles.rejectModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.rejectModalSubmitButton} 
                onPress={submitRejection}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={18} color="#fff" />
                    <Text style={styles.rejectModalSubmitText}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Calendar Modal */}
      <Modal visible={calendarModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCalendarModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Leave Calendar</Text>
            <TouchableOpacity onPress={() => setCalendarModalVisible(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Card style={styles.modalCalendarCard}>
              <View style={styles.modalCalendarHeader}>
                <TouchableOpacity onPress={goToModalPreviousMonth} style={styles.modalMonthNavButton}>
                  <Ionicons name="chevron-back" size={24} color="#2563eb" />
                </TouchableOpacity>
                <Text style={styles.modalMonthYearText}>{format(modalCurrentMonth, "MMMM yyyy")}</Text>
                <TouchableOpacity onPress={goToModalNextMonth} style={styles.modalMonthNavButton}>
                  <Ionicons name="chevron-forward" size={24} color="#2563eb" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalDaysOfWeekHeader}>
                {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((day) => (
                  <Text key={day} style={styles.modalDayOfWeekText}>{day}</Text>
                ))}
              </View>

              <View style={styles.modalCalendarGrid}>
                {getModalCalendarDays().map((date: Date, index: number) => {
                  const isCurrentMonthDay = isSameMonth(date, modalCurrentMonth);
                  const isHolidayDate = isHoliday(date);
                  const leaveCount = getLeaveCountForDate(date);
                  const isToday = isSameDay(date, new Date());
                  const isSelected = modalSelectedDate && isSameDay(date, modalSelectedDate);

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.modalCalendarDay, !isCurrentMonthDay && styles.modalCalendarDayOtherMonth, isToday && styles.modalCalendarDayToday, isSelected && styles.modalCalendarDaySelected]}
                      onPress={() => setModalSelectedDate(date)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modalCalendarDayText, !isCurrentMonthDay && styles.modalCalendarDayTextOtherMonth, isToday && styles.modalCalendarDayTextToday]}>
                        {format(date, "d")}
                      </Text>
                      {leaveCount > 0 && (
                        <View style={styles.leaveCountBadge}>
                          <Text style={styles.leaveCountText}>{leaveCount}</Text>
                        </View>
                      )}
                      {isHolidayDate && <View style={styles.modalHolidayDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <View style={styles.modalLegend}>
                <Text style={styles.modalLegendTitle}>Legend:</Text>
                <View style={styles.modalLegendRow}>
                  <View style={styles.modalLegendItem}>
                    <View style={styles.leaveCountBadge}><Text style={styles.leaveCountText}>2</Text></View>
                    <Text style={styles.modalLegendText}>Leaves on day</Text>
                  </View>
                  <View style={styles.modalLegendItem}>
                    <View style={styles.modalHolidayDot} />
                    <Text style={styles.modalLegendText}>Company holiday</Text>
                  </View>
                </View>
              </View>
            </Card>
            
            {modalSelectedDate && (
              <Card style={styles.modalLeaveDetailsCard}>
                <View style={styles.modalLeaveDetailsHeader}>
                  <Ionicons name="calendar" size={20} color="#3B82F6" />
                  <Text style={styles.modalLeaveDetailsTitle}>Leaves on {format(modalSelectedDate, "EEEE, MMMM do, yyyy")}</Text>
                </View>
                
                <View style={styles.modalLeaveDetailsContent}>
                  {getHolidayName(modalSelectedDate) && (
                    <View style={styles.modalHolidayInfo}>
                      <Ionicons name="star" size={16} color="#F59E0B" />
                      <Text style={styles.modalHolidayInfoText}>Company Holiday: {getHolidayName(modalSelectedDate)}</Text>
                    </View>
                  )}
                  
                  {(() => {
                    const dayLeaves = getLeavesForDate(modalSelectedDate);
                    return dayLeaves.length === 0 ? (
                      <View style={styles.modalNoLeavesContainer}>
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        <Text style={styles.modalNoLeavesText}>No leaves on this day</Text>
                      </View>
                    ) : (
                      <View style={styles.modalLeavesList}>
                        {dayLeaves.map((leave) => (
                          <View key={leave.leave_id} style={styles.modalLeaveItem}>
                            <View style={styles.modalLeaveItemHeader}>
                              <Text style={styles.modalLeaveEmployeeName}>{leave.user?.name || "You"}</Text>
                              <View style={[styles.modalLeaveTypeChip, { backgroundColor: getTypeColor(leave.leave_type || "") }]}>
                                <Text style={styles.modalLeaveTypeText}>{(leave.leave_type || "Leave").toUpperCase()}</Text>
                              </View>
                            </View>
                            <Text style={styles.modalLeaveDuration}>
                              {format(parseISO(leave.start_date), "MMM dd")} - {format(parseISO(leave.end_date), "MMM dd, yyyy")}
                            </Text>
                            {leave.reason && <Text style={styles.modalLeaveReason}>"{leave.reason}"</Text>}
                          </View>
                        ))}
                      </View>
                    );
                  })()}
                </View>
              </Card>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}


// 🎨 Styles
const styles = StyleSheet.create({
  safeAreaContainer: { flex: 1, backgroundColor: "#39549fff" },
  contentContainer: { flex: 1, backgroundColor: "#f9fafb", borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20 },
  scrollContentContainer: { flexGrow: 1, padding: 16 },
  header: { backgroundColor: "#39549fff", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 30 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.1)", justifyContent: "center", alignItems: "center" },
  headerIconButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255, 255, 255, 0.1)", justifyContent: "center", alignItems: "center", marginLeft: 8 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  headerTextContainer: { flex: 1, paddingHorizontal: 16 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "white", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "#a5b4fc", opacity: 0.9 },
  leaveStatsRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 12, gap: 8 },
  leaveStatsCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: "center", elevation: 2 },
  leaveStatsIcon: { marginBottom: 6 },
  leaveCardLabel: { color: "#fff", fontSize: 11, fontWeight: "600", textAlign: "center", marginBottom: 2 },
  leaveCardValue: { color: "#fff", fontSize: 20, fontWeight: "bold", textAlign: "center" },
  leaveCardSubtext: { color: "rgba(255,255,255,0.8)", fontSize: 10, textAlign: "center" },
  loadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.7)", justifyContent: "center", alignItems: "center", zIndex: 100 },
  errorContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEE2E2", padding: 12, borderRadius: 8, marginBottom: 12 },
  errorText: { flex: 1, color: "#DC2626", marginLeft: 8, fontSize: 13 },
  retryText: { color: "#2563EB", fontWeight: "600", marginLeft: 8 },
  tabs: { flexDirection: "row", marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#E5E7EB" },
  tabActive: { borderBottomColor: "#4F46E5" },
  tabText: { color: "#6B7280", fontWeight: "600", fontSize: 14 },
  tabTextActive: { color: "#4F46E5" },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  leaveRequestCard: { marginBottom: 16, borderRadius: 12, elevation: 2 },
  leaveRequestTitle: { fontSize: 18, fontWeight: "bold", color: "#111827", marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, minHeight: 48 },
  dropdownText: { fontSize: 15, color: "#111827", flex: 1 },
  dropdownOptions: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, marginTop: 4, elevation: 3, zIndex: 1000 },
  dropdownOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionSelected: { backgroundColor: "#4F46E5" },
  dropdownOptionText: { fontSize: 15, color: "#111827", flex: 1 },
  dropdownOptionTextSelected: { color: "#fff", fontWeight: "600" },
  durationLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 10, marginTop: 4 },
  dateRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  dateInput: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, minHeight: 48 },
  dateInputText: { fontSize: 14, color: "#111827", marginLeft: 8, flex: 1 },
  reasonTextArea: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: "#111827", textAlignVertical: "top", minHeight: 100 },
  submitButton: { backgroundColor: "#4F46E5", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 8, marginTop: 16 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  historyHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  historyIconBox: { width: 30, height: 30, borderRadius: 12, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  historyTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  historySubtitle: { fontSize: 11, color: '#6b7280' },
  historyFilterBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 100, justifyContent: 'space-between', elevation: 1 },
  historyFilterText: { fontSize: 12, color: '#374151', marginRight: 4 },
  historyEmpty: { alignItems: 'center', paddingVertical: 24 },
  historyEmptyIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  historyEmptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  historyEmptySubtitle: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  leaveItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  leaveItemLeft: { flex: 1 },
  leaveItemRight: { alignItems: "flex-end" },
  leaveText: { fontSize: 14, fontWeight: "600", color: "#111827" },
  leaveReason: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  deleteButton: { padding: 8, marginLeft: 8 },
  emptyState: { alignItems: "center", paddingVertical: 32 },
  emptyStateTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 12 },
  emptyStateText: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  calendarContainer: { flex: 1 },
  holidaySection: { backgroundColor: "#FEF3C7", borderRadius: 12, padding: 14, marginBottom: 16 },
  holidaySectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  holidaySectionTitle: { fontSize: 16, fontWeight: "600", color: "#111", marginLeft: 8 },
  holidayForm: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  holidayDateInput: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#D1D5DB", flex: 1, minWidth: 140 },
  holidayDateText: { marginLeft: 8, fontSize: 13, color: "#374151" },
  holidayNameInput: { backgroundColor: "#fff", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#D1D5DB", flex: 1, minWidth: 100, fontSize: 13 },
  addHolidayButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#F59E0B", borderRadius: 8, padding: 10, paddingHorizontal: 14, gap: 4 },
  addHolidayButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  currentHolidaysSection: { marginTop: 8 },
  currentHolidaysTitle: { fontSize: 13, fontWeight: "600", color: "#111", marginBottom: 8 },
  noHolidaysText: { fontSize: 12, color: "#6B7280", fontStyle: "italic" },
  holidayListItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  holidayListItemText: { fontSize: 13, color: "#111", flex: 1 },
  removeHolidayButton: { paddingHorizontal: 10, paddingVertical: 4 },
  removeHolidayButtonText: { color: "#EF4444", fontSize: 13, fontWeight: "600" },
  calendarCard: { borderRadius: 12, padding: 14, marginBottom: 16 },
  calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  monthNavButton: { padding: 6 },
  monthYearText: { fontSize: 17, fontWeight: "bold", color: "#2563eb" },
  daysOfWeekHeader: { flexDirection: "row", justifyContent: "space-around", marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  dayOfWeekText: { fontSize: 11, fontWeight: "600", color: "#6B7280", width: 36, textAlign: "center" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start", marginBottom: 14 },
  calendarDay: { width: "14.28%", aspectRatio: 1, justifyContent: "center", alignItems: "center", position: "relative", marginBottom: 4 },
  calendarDayOtherMonth: { opacity: 0.3 },
  calendarDaySelected: { backgroundColor: "#4F46E5", borderRadius: 18 },
  calendarDayText: { fontSize: 13, color: "#111" },
  calendarDayTextOtherMonth: { color: "#9CA3AF" },
  calendarDayTextSelected: { color: "#fff", fontWeight: "600" },
  holidayDot: { position: "absolute", bottom: 3, width: 5, height: 5, borderRadius: 3, backgroundColor: "#F59E0B" },
  holidaysLegend: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  holidaysLegendHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  holidaysLegendTitle: { fontSize: 13, fontWeight: "600", color: "#111", marginLeft: 6 },
  noHolidaysLegendText: { fontSize: 12, color: "#6B7280", fontStyle: "italic" },
  holidayLegendItem: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  holidayLegendDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#F59E0B", marginRight: 8 },
  holidayLegendText: { fontSize: 12, color: "#374151" },

  historyModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  historyModalContent: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  historyModalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 12 },
  historyOption: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  historyOptionActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  historyOptionText: { fontSize: 14, color: '#111827', fontWeight: '600' },
  historyOptionTextActive: { color: '#2563eb' },
  historyModalButtons: { marginTop: 8, alignItems: 'center' },
  modalContainer: { flex: 1, backgroundColor: "#F9FAFB" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  modalCloseButton: { padding: 6 },
  modalContent: { flex: 1, padding: 16 },
  modalCalendarCard: { borderRadius: 12, padding: 14, marginBottom: 16 },
  modalCalendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  modalMonthNavButton: { padding: 6 },
  modalMonthYearText: { fontSize: 17, fontWeight: "bold", color: "#2563eb" },
  modalDaysOfWeekHeader: { flexDirection: "row", justifyContent: "space-around", marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalDayOfWeekText: { fontSize: 11, fontWeight: "600", color: "#6B7280", width: 36, textAlign: "center" },
  modalCalendarGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start", marginBottom: 14 },
  modalCalendarDay: { width: "14.28%", aspectRatio: 1, justifyContent: "center", alignItems: "center", position: "relative", marginBottom: 4 },
  modalCalendarDayOtherMonth: { opacity: 0.3 },
  modalCalendarDayToday: { backgroundColor: "#EEF2FF", borderRadius: 18, borderWidth: 2, borderColor: "#3B82F6" },
  modalCalendarDaySelected: { backgroundColor: "#3B82F6", borderRadius: 18 },
  modalCalendarDayText: { fontSize: 13, color: "#111" },
  modalCalendarDayTextOtherMonth: { color: "#9CA3AF" },
  modalCalendarDayTextToday: { color: "#3B82F6", fontWeight: "600" },
  leaveCountBadge: { position: "absolute", top: -2, right: 2, backgroundColor: "#EF4444", borderRadius: 8, minWidth: 16, height: 16, justifyContent: "center", alignItems: "center", paddingHorizontal: 3 },
  leaveCountText: { fontSize: 9, fontWeight: "600", color: "#fff" },
  modalHolidayDot: { position: "absolute", bottom: 3, width: 5, height: 5, borderRadius: 3, backgroundColor: "#F59E0B" },
  modalLegend: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  modalLegendTitle: { fontSize: 13, fontWeight: "600", color: "#111", marginBottom: 10 },
  modalLegendRow: { flexDirection: "row", justifyContent: "space-around", flexWrap: "wrap" },
  modalLegendItem: { flexDirection: "row", alignItems: "center", marginBottom: 6, minWidth: "40%" },
  modalLegendText: { fontSize: 11, color: "#374151", marginLeft: 6 },
  modalLeaveDetailsCard: { borderRadius: 12, padding: 14, marginTop: 12, marginBottom: 16 },
  modalLeaveDetailsHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalLeaveDetailsTitle: { fontSize: 14, fontWeight: "600", color: "#111827", marginLeft: 8, flex: 1 },
  modalLeaveDetailsContent: { flex: 1 },
  modalHolidayInfo: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", padding: 10, borderRadius: 8, marginBottom: 10 },
  modalHolidayInfoText: { fontSize: 13, color: "#92400E", marginLeft: 8, fontWeight: "500" },
  modalNoLeavesContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "#F0FDF4", borderRadius: 8 },
  modalNoLeavesText: { fontSize: 13, color: "#166534", marginLeft: 8, fontWeight: "500" },
  modalLeavesList: { flex: 1 },
  modalLeaveItem: { padding: 10, backgroundColor: "#FAFAFA", borderRadius: 8, marginBottom: 8 },
  modalLeaveItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  modalLeaveEmployeeName: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1 },
  modalLeaveTypeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  modalLeaveTypeText: { fontSize: 9, fontWeight: "600", color: "#fff" },
  modalLeaveDuration: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  modalLeaveReason: { fontSize: 12, color: "#374151", fontStyle: "italic" },
  
  // Approval Stats Styles
  approvalStatsContainer: { flexDirection: "row", gap: 8, marginBottom: 16 },
  approvalStatCard: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12, alignItems: "center", elevation: 2 },
  approvalStatIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  approvalStatValue: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 2 },
  approvalStatLabel: { fontSize: 11, color: "#6B7280", textAlign: "center" },
  
  // Approval Section Styles
  approvalSectionCard: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 16, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, maxHeight: 600 },
  approvalSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  approvalSectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  approvalSectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  refreshButton: { padding: 6, borderRadius: 6, backgroundColor: "#F3F4F6" },
  
  loadingContainer: { padding: 32, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  
  approvalScrollView: { maxHeight: 500 },
  
  approvalRequestCard: { padding: 16, marginHorizontal: 12, marginVertical: 8, backgroundColor: "#FAFAFA", borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  approvalRequestCardPending: { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" },
  
  approvalTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  approvalAvatarContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center", marginRight: 12 },
  approvalAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 2, borderColor: "#4F46E5" },
  approvalNameContainer: { flex: 1 },
  approvalName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  approvalEmployeeId: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  approvalStatusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  approvalStatusChipText: { fontSize: 10, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },
  
  approvalTypeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  approvalTypeBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  approvalTypeBadgeText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  approvalCreatedDate: { fontSize: 11, color: "#6B7280", fontStyle: "italic" },
  
  approvalDetailsGrid: { flexDirection: "row", gap: 8, marginBottom: 12 },
  approvalDetailBox: { flex: 1, backgroundColor: "#fff", padding: 10, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  approvalDetailLabel: { fontSize: 11, color: "#6B7280", marginTop: 4, marginBottom: 2 },
  approvalDetailValue: { fontSize: 14, fontWeight: "600", color: "#111827" },
  
  approvalDateRange: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  approvalDateItem: { flex: 1, alignItems: "center" },
  approvalDateLabel: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  approvalDateValue: { fontSize: 13, fontWeight: "600", color: "#111827" },
  
  approvalReasonContainer: { backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  approvalReasonHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  approvalReasonLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  approvalReasonText: { fontSize: 13, color: "#374151", lineHeight: 18 },
  
  approvalCommentsContainer: { backgroundColor: "#FEF3C7", padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: "#FCD34D" },
  approvalCommentsHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  approvalCommentsLabel: { fontSize: 12, fontWeight: "600", color: "#92400E" },
  approvalCommentsText: { fontSize: 13, color: "#78350F", lineHeight: 18, fontStyle: "italic" },
  
  approvalApproverInfo: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#E5E7EB", marginTop: 8 },
  approvalApproverText: { fontSize: 12, color: "#6B7280", fontStyle: "italic" },
  
  approvalActionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  approveButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#10B981", paddingVertical: 12, borderRadius: 8, gap: 6, elevation: 2 },
  approveButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  rejectButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#EF4444", paddingVertical: 12, borderRadius: 8, gap: 6, elevation: 2 },
  rejectButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  buttonDisabled: { opacity: 0.6 },
  
  emptyStateIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#D1FAE5", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyStateButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#EEF2FF", borderRadius: 8 },
  emptyStateButtonText: { fontSize: 14, fontWeight: "600", color: "#4F46E5" },
  
  // Recent Decisions Styles
  recentDecisionsCard: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 16, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  recentDecisionsHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  recentDecisionsTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  recentDecisionsContent: { padding: 16 },
  noRecentDecisions: { fontSize: 14, color: "#6B7280", textAlign: "center", paddingVertical: 8 },
  recentDecisionItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  recentDecisionAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  recentDecisionAvatarPlaceholder: { width: 32, height: 32, borderRadius: 16, marginRight: 10, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  recentDecisionLeft: { flex: 1 },
  recentDecisionName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  recentDecisionDate: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  recentDecisionType: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  recentDecisionStatus: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  recentDecisionStatusText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  
  // Rejection Modal Styles
  rejectModalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  rejectModalContent: { backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  rejectModalHeader: { alignItems: "center", paddingTop: 24, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rejectModalIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  rejectModalTitle: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 6, textAlign: "center" },
  rejectModalSubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center" },
  rejectModalBody: { padding: 20 },
  rejectModalLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  rejectModalInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111827", minHeight: 100, textAlignVertical: "top" },
  rejectModalHint: { fontSize: 12, color: "#6B7280", marginTop: 8, fontStyle: "italic", lineHeight: 16 },
  rejectModalActions: { flexDirection: "row", gap: 10, padding: 20, paddingTop: 0 },
  rejectModalCancelButton: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  rejectModalCancelText: { fontSize: 16, fontWeight: "600", color: "#374151" },
  rejectModalSubmitButton: { flex: 1, flexDirection: "row", paddingVertical: 14, borderRadius: 10, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center", gap: 6, elevation: 2 },
  rejectModalSubmitText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
