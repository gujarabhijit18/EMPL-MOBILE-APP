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
  FlatList,
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
import { useModuleBadges } from "../../contexts/ModuleBadgeContext";
import { apiService, LeaveRequestResponse, LeaveSummary, HolidayResponse } from "../../lib/api";
import { formatDateIST, formatDateShortIST, getDayMonthIST, getMonthYearIST, formatDateWithDayIST, formatIST } from "../../utils/dateTime";
import { validateLeaveApplication, getLeaveBalanceImpactMessage, validateLeaveOverlap } from "../../utils/leaveValidation";
import { mapLeaveTypeToAPI, normalizeLeaveType } from "../../utils/leaveTypeMapper";
import { LeaveHistoryCard } from "../../components/LeaveHistoryCard";
import { LeaveApprovalCard } from "../../components/LeaveApprovalCard";
import { EditLeaveModal } from "../../components/EditLeaveModal";
import { Colors, Shadows, BorderRadius, Spacing, Gradients } from "../../constants/designSystem";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type LeaveType = "Annual Leave" | "Sick Leave" | "Casual Leave" | "Maternity Leave" | "Paternity Leave" | "Unpaid Leave";
type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

interface Holiday {
  holiday_id?: number;
  date: Date;
  name: string;
  description?: string;
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
  const { resetBadge } = useModuleBadges();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const currentUser = user || { id: "EMP001", name: "John Doe", role: "employee" as const, department: "Engineering", user_id: 1, employee_id: "EMP001" };
  const employeeId = (currentUser as any).employee_id || currentUser.id || "EMP001";

  // Reset badge when screen is focused
  // Consolidate focus effects and stabilize initial load
  useFocusEffect(
    useCallback(() => {
      // 1. Reset badges
      resetBadge("leaves");

      // 2. Load all necessary screen data
      loadData();

      return () => {
        // Cleanup if needed
      };
    }, []) // Logic runs once per focal shift
  );

  // API State
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [myLeaves, setMyLeaves] = useState<LeaveRequestResponse[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequestResponse[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequestResponse[]>([]);
  const [leaveSummary, setLeaveSummary] = useState<LeaveSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    type: "Sick Leave" as LeaveType,
    startDate: new Date(),
    endDate: new Date(),
    reason: "",
  });

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);

  // Calendar state
  const getTodayNormalized = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(getTodayNormalized());
  const [holidayForm, setHolidayForm] = useState({ date: getTodayNormalized(), name: "" });
  const [holidayListModalVisible, setHolidayListModalVisible] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [modalCurrentMonth, setModalCurrentMonth] = useState(new Date());
  const [modalSelectedDate, setModalSelectedDate] = useState<Date | null>(null);
  const [showLeaveTypeDropdown, setShowLeaveTypeDropdown] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingLeaveId, setRejectingLeaveId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Edit Leave State
  const [editingLeave, setEditingLeave] = useState<LeaveRequestResponse | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Leave Allocation Configuration State
  const [leaveAllocation, setLeaveAllocation] = useState({
    Total: "15",
    sick: "10",
    casual: "5",
    other: "0"
  });

  // Week-off Planner State
  const [selectedDeptForWeekOff, setSelectedDeptForWeekOff] = useState("Engineering");
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [selectedWeekOffs, setSelectedWeekOffs] = useState<string[]>(["Saturday", "Sunday"]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([
    { id: 1, name: "Engineering" },
    { id: 2, name: "Design" },
    { id: 3, name: "Marketing" },
    { id: 4, name: "HR" },
    { id: 5, name: "Sales" },
    { id: 6, name: "Operations" }
  ]);
  const deptDropdownAnim = useRef(new Animated.Value(0)).current;

  // Collapsible toggle state for Admin Config
  const [isAllocationExpanded, setIsAllocationExpanded] = useState(false);
  const [isWeekOffExpanded, setIsWeekOffExpanded] = useState(false);

  const weekDays = [
    { name: "Sunday", icon: "sunny-outline", color: "#f59e0b" },
    { name: "Monday", icon: "partly-sunny-outline", color: "#f97316" },
    { name: "Tuesday", icon: "cloud-outline", color: "#64748b" },
    { name: "Wednesday", icon: "water-outline", color: "#3b82f6" },
    { name: "Thursday", icon: "leaf-outline", color: "#10b981" },
    { name: "Friday", icon: "heart-outline", color: "#ef4444" },
    { name: "Saturday", icon: "beer-outline", color: "#8b5cf6" } // purely decorative icons
  ];

  const toggleWeekOffDay = (day: string) => {
    if (selectedWeekOffs.includes(day)) {
      // Allow deselection
      setSelectedWeekOffs(selectedWeekOffs.filter(d => d !== day));
    } else {
      // Check if already at max (2 days)
      if (selectedWeekOffs.length >= 2) {
        Alert.alert(
          "Maximum Days Reached",
          "You can select a maximum of 2 days for week-off. Please deselect a day first.",
          [{ text: "OK", style: "default" }]
        );
        return;
      }
      setSelectedWeekOffs([...selectedWeekOffs, day]);
    }
  };

  const saveAllocation = async () => {
    setLoading(true);
    try {
      // Prepare allocation data matching backend field names
      const allocationData = {
        total_annual_leave: parseInt(leaveAllocation.Total) || 15,
        sick_leave_allocation: parseInt(leaveAllocation.sick) || 10,
        casual_leave_allocation: parseInt(leaveAllocation.casual) || 5,
        other_leave_allocation: parseInt(leaveAllocation.other) || 0,
      };

      console.log("📤 Saving global leave allocation:", allocationData);

      // Save to backend using new global allocation endpoint
      await apiService.updateGlobalLeaveAllocation(allocationData);

      // Update local state
      setLeaveAllocation({
        Total: allocationData.total_annual_leave.toString(),
        sick: allocationData.sick_leave_allocation.toString(),
        casual: allocationData.casual_leave_allocation.toString(),
        other: allocationData.other_leave_allocation.toString(),
      });

      // Refresh leave data to reflect new allocation
      await Promise.all([fetchMyLeaves(), fetchLeaveSummary(), fetchLeaveAllocation()]);

      Alert.alert("✅ Success", "Leave allocation configuration saved successfully for all employees.");
    } catch (err: any) {
      console.error("❌ Error saving allocation:", err);
      Alert.alert("Error", err.message || "Failed to save leave allocation.");
    } finally {
      setLoading(false);
    }
  };

  const saveWeekOff = async () => {
    // Validate selection
    if (selectedWeekOffs.length === 0) {
      Alert.alert(
        "Minimum Days Required",
        "Please select at least 1 day for week-off.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    if (selectedWeekOffs.length > 2) {
      Alert.alert(
        "Maximum Days Exceeded",
        "You can select a maximum of 2 days for week-off.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    setLoading(true);
    try {
      // Find the ID for the selected department
      const selectedDept = departments.find(d => d.name === selectedDeptForWeekOff);
      const departmentId = selectedDept ? selectedDept.id : (departments.length > 0 ? departments[0].id : 1);

      const weekOffData = {
        week_off_days: selectedWeekOffs,
      };

      console.log("📤 Saving week-off configuration for department:", departmentId, selectedDeptForWeekOff, weekOffData);

      // Save to backend using new week-off endpoint
      await apiService.updateDepartmentWeekOff(departmentId, weekOffData);

      // Refresh data
      await Promise.all([fetchMyLeaves(), fetchTeamLeaves(), fetchDepartmentWeekOff()]);

      Alert.alert("✅ Success", `Week-off rules updated for ${selectedDeptForWeekOff}.\nSelected days: ${selectedWeekOffs.join(", ")}`);
    } catch (err: any) {
      console.error("❌ Error saving week-off:", err);
      Alert.alert("Error", err.message || "Failed to save week-off configuration.");
    } finally {
      setLoading(false);
    }
  };

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
  const canManageHolidays = ["admin", "hr"].includes(userRole);
  const canViewTeamCalendar = ["admin", "hr"].includes(userRole);

  const [activeTab, setActiveTab] = useState<"apply" | "approvals" | "calendar">(isAdmin ? "approvals" : "apply");

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
    ]).start();
  }, []);

  // Department dropdown animation
  useEffect(() => {
    if (showDeptDropdown) {
      Animated.timing(deptDropdownAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(deptDropdownAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showDeptDropdown, deptDropdownAnim]);

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
    } catch (err: any) { }
  }, []);

  const fetchHolidays = useCallback(async () => {
    setHolidaysLoading(true);
    try {
      const holidaysData = await apiService.getHolidays();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const formattedHolidays: Holiday[] = holidaysData
        .map((h: HolidayResponse) => ({
          holiday_id: h.holiday_id,
          date: new Date(h.date),
          name: h.name,
          description: h.description,
        }))
        .filter((h) => {
          // Keep only current and future holidays
          const holidayDate = new Date(h.date);
          holidayDate.setHours(0, 0, 0, 0);
          return holidayDate >= today;
        });

      // Auto-delete expired holidays from backend
      const expiredHolidays = holidaysData.filter((h: HolidayResponse) => {
        const holidayDate = new Date(h.date);
        holidayDate.setHours(0, 0, 0, 0);
        return holidayDate < today && h.holiday_id !== undefined && h.holiday_id !== null;
      });

      if (expiredHolidays.length > 0 && isAdmin) {
        console.log("🗑️ Auto-removing expired holidays:", expiredHolidays.length);
        for (const expiredHoliday of expiredHolidays) {
          try {
            console.log("🗑️ Deleting holiday:", expiredHoliday.holiday_id, expiredHoliday.name);
            await apiService.deleteHoliday(expiredHoliday.holiday_id);
            console.log("✅ Expired holiday deleted:", expiredHoliday.name);
          } catch (err: any) {
            console.log("⚠️ Could not delete expired holiday:", err.message);
          }
        }
      }

      setHolidays(formattedHolidays);
    } catch (err: any) {
      console.log("Failed to fetch holidays:", err.message);
      // Keep existing holidays if fetch fails
    } finally {
      setHolidaysLoading(false);
    }
  }, [isAdmin]);

  const fetchLeaveAllocation = useCallback(async () => {
    try {
      console.log("📥 Fetching global leave allocation");
      const allocation = await apiService.getGlobalLeaveAllocation();
      if (allocation) {
        setLeaveAllocation({
          Total: allocation.total_annual_leave?.toString() || "15",
          sick: allocation.sick_leave_allocation?.toString() || "10",
          casual: allocation.casual_leave_allocation?.toString() || "5",
          other: allocation.other_leave_allocation?.toString() || "0",
        });
        console.log("✅ Global leave allocation loaded:", allocation);
      }
    } catch (err: any) {
      console.log("⚠️ Could not fetch leave allocation:", err.message);
      // Use defaults if fetch fails
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    // Only fetch departments for admin users (departments are only used in admin-only Week-off Planner)
    if (!isAdmin) {
      console.log("📥 Skipping departments fetch (non-admin user)");
      return;
    }
    try {
      console.log("📥 Fetching all departments");
      const deptList = await apiService.getDepartments();
      if (deptList && deptList.length > 0) {
        const formattedDepts = deptList.map((dept: any) => ({
          id: dept.id || dept.department_id,
          name: dept.name || dept.department_name,
        }));

        // Prevent infinite loop by only updating if data actually changed
        setDepartments(prev => {
          if (JSON.stringify(prev) === JSON.stringify(formattedDepts)) return prev;
          return formattedDepts;
        });
        console.log("✅ Departments loaded:", formattedDepts.length);
      }
    } catch (err: any) {
      console.log("⚠️ Could not fetch departments:", err.message);
    }
  }, [isAdmin]);

  const fetchDepartmentWeekOff = useCallback(async () => {
    // Only fetch week-off settings for admin users (used in admin-only Week-off Planner)
    if (!isAdmin) {
      console.log("📥 Skipping week-off settings fetch (non-admin user)");
      return;
    }
    try {
      console.log(`📥 Fetching week-off settings for department: ${selectedDeptForWeekOff}`);

      // Find the ID for the currently selected department name
      const selectedDept = departments.find(d => d.name === selectedDeptForWeekOff);
      const departmentId = selectedDept ? selectedDept.id : 1;

      const weekOffRules = await apiService.getDepartmentWeekOff(departmentId);

      // API returns an array of week-off rules
      // Find the rule that matches the current selected department name if possible
      let weekOff = weekOffRules.find(rule => rule.department === selectedDeptForWeekOff);

      // Fallback: if no exact match found, but we have rules, use the first one if it's the only one
      if (!weekOff && weekOffRules.length > 0) {
        weekOff = weekOffRules[0];
      }

      if (weekOff) {
        // Extract days - the API might return an array or a comma-separated string
        const days = Array.isArray(weekOff.days)
          ? weekOff.days
          : (typeof (weekOff as any).week_off_days === 'object' && Array.isArray((weekOff as any).week_off_days)
            ? (weekOff as any).week_off_days
            : (typeof (weekOff.days as any) === 'string'
              ? (weekOff.days as any).split(',').map((d: string) => d.trim())
              : ["Saturday", "Sunday"]));

        // Prevent redundant state updates
        setSelectedWeekOffs(prev => {
          if (JSON.stringify(prev) === JSON.stringify(days)) return prev;
          return days;
        });
        console.log(`✅ Week-off settings loaded for ${selectedDeptForWeekOff}:`, weekOff.days);
      } else {
        console.log(`⚠️ No week-off settings found for ${selectedDeptForWeekOff}, using defaults`);
        setSelectedWeekOffs(["Saturday", "Sunday"]);
      }
    } catch (err: any) {
      console.log("⚠️ Could not fetch week-off settings:", err.message);
      setSelectedWeekOffs(["Saturday", "Sunday"]);
    }
  }, [isAdmin, selectedDeptForWeekOff, departments]);

  // Effect to automatically fetch week-off rules when department selection changes
  useEffect(() => {
    if (isAdmin && selectedDeptForWeekOff) {
      fetchDepartmentWeekOff();
    }
  }, [selectedDeptForWeekOff, isAdmin]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchMyLeaves(),
        fetchTeamLeaves(),
        fetchLeaveSummary(),
        fetchHolidays(),
        fetchLeaveAllocation(),
        fetchDepartments(),
        fetchDepartmentWeekOff(),
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchMyLeaves, fetchTeamLeaves, fetchLeaveSummary, fetchHolidays, fetchLeaveAllocation, fetchDepartments, fetchDepartmentWeekOff]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // useFocusEffect(useCallback(() => { loadData(); }, [loadData])); 
  // Loop prevented by consolidated effect above

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
          if (editingHoliday) {
            setEditingHoliday({ ...editingHoliday, date: selectedDate });
          } else {
            setHolidayForm({ ...holidayForm, date: selectedDate });
          }
        } else {
          setForm({ ...form, [datePickerField]: selectedDate });
        }
      }
    }
  };

  const confirmIOSDate = () => {
    if (datePickerField === "holiday") {
      if (editingHoliday) {
        setEditingHoliday({ ...editingHoliday, date: tempDate });
      } else {
        setHolidayForm({ ...holidayForm, date: tempDate });
      }
    } else {
      setForm({ ...form, [datePickerField]: tempDate });
    }
    setShowDatePicker(false);
  };

  const submitLeave = async () => {
    // Validate reason
    if (!form.reason.trim()) {
      Alert.alert("Required", "Please enter a reason for leave.");
      return;
    }

    // Validate leave application against strict rules
    const validationResult = validateLeaveApplication({
      leaveType: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      joiningDate: user?.joiningDate ? new Date(user.joiningDate) : undefined,
      currentTime: new Date(),
    });

    if (!validationResult.isValid) {
      Alert.alert("Validation Error", validationResult.error || "Please check your leave request.");
      return;
    }

    // Validate leave overlap with existing leaves
    const overlapValidation = validateLeaveOverlap({
      startDate: form.startDate,
      endDate: form.endDate,
      existingLeaves: myLeaves,
    });

    if (!overlapValidation.isValid) {
      Alert.alert("Overlap Detected", overlapValidation.error || "Your leave dates overlap with an existing leave request.");
      return;
    }

    setLoading(true);
    try {
      await apiService.submitLeaveRequest({
        employee_id: employeeId,
        leave_type: mapLeaveTypeToAPI(form.type), // Convert display type to API value
        start_date: formatIST(form.startDate, "yyyy-MM-dd"),
        end_date: formatIST(form.endDate, "yyyy-MM-dd"),
        reason: form.reason,
        status: "Pending",
      });
      Alert.alert("✅ Success", "Leave request submitted successfully.");
      setForm({ type: "Sick Leave", startDate: new Date(), endDate: new Date(), reason: "" });
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

  const handleEditLeave = (leave: LeaveRequestResponse) => {
    setEditingLeave(leave);
    setEditModalVisible(true);
  };

  const handleUpdateLeave = async (updatedData: {
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
  }) => {
    if (!editingLeave) return;

    setLoading(true);
    try {
      await apiService.updateLeaveRequest(editingLeave.leave_id, updatedData);
      Alert.alert("✅ Success", "Leave request updated successfully.");
      setEditingLeave(null);
      setEditModalVisible(false);
      await fetchMyLeaves();
    } catch (err: any) {
      throw err;
    } finally {
      setLoading(false);
    }
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

  const addHoliday = async () => {
    if (!holidayForm.name.trim()) {
      Alert.alert("Required", "Please enter a holiday name.");
      return;
    }

    // Validate date - must be today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(holidayForm.date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      Alert.alert("Invalid Date", "Holiday date must be today or in the future. Past dates cannot be added.");
      return;
    }

    setLoading(true);
    try {
      const dateStr = formatIST(holidayForm.date, "yyyy-MM-dd");
      const createData = {
        name: holidayForm.name.trim(),
        date: dateStr,
      };

      console.log("📤 Creating holiday:", createData);
      const response = await apiService.createHoliday(createData);
      console.log("✅ Holiday created from backend:", response);

      // Immediately add to local state for instant UI feedback
      setHolidays(prevHolidays => [
        ...prevHolidays,
        {
          holiday_id: response.holiday_id,
          date: new Date(dateStr),
          name: response.name,
          description: response.description,
        }
      ]);

      // Clear form and reset to today
      setHolidayForm({ date: new Date(), name: "" });

      // Refresh from backend to ensure complete sync
      await fetchHolidays();
      Alert.alert("✅ Success", "Holiday added successfully.");
    } catch (err: any) {
      console.error("❌ Error adding holiday:", err);
      Alert.alert("Error", err.message || "Failed to add holiday.");
      // Refresh to restore correct state if creation failed
      await fetchHolidays();
    } finally {
      setLoading(false);
    }
  };

  const removeHoliday = (holiday: Holiday) => {
    Alert.alert("Remove Holiday", `Are you sure you want to remove "${holiday.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          if (!holiday.holiday_id) {
            // Local-only holiday (shouldn't happen with backend)
            setHolidays(holidays.filter((h) => h.date.getTime() !== holiday.date.getTime()));
            return;
          }
          setLoading(true);
          try {
            // Delete from backend (permanent delete from database)
            const response = await apiService.deleteHoliday(holiday.holiday_id);
            console.log("✅ Holiday permanently deleted from backend:", response);

            // Immediately update local state for instant UI feedback
            setHolidays(prevHolidays =>
              prevHolidays.filter((h) => h.holiday_id !== holiday.holiday_id)
            );

            // Refresh from backend to ensure sync
            await fetchHolidays();
            Alert.alert("✅ Success", "Holiday removed successfully.");
          } catch (err: any) {
            console.error("❌ Error removing holiday:", err);
            Alert.alert("Error", err.message || "Failed to remove holiday.");
            // Refresh to restore correct state if deletion failed
            await fetchHolidays();
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const startEditingHoliday = (holiday: Holiday) => {
    setEditingHoliday({ ...holiday });
  };

  const cancelEditingHoliday = () => {
    setEditingHoliday(null);
  };

  const saveEditingHoliday = async () => {
    if (!editingHoliday) return;
    if (!editingHoliday.holiday_id) return;
    if (!editingHoliday.name.trim()) {
      Alert.alert("Required", "Please enter a holiday name.");
      return;
    }

    // Validate date - must be today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(editingHoliday.date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      Alert.alert("Invalid Date", "Holiday date must be today or in the future. Past dates cannot be set.");
      return;
    }

    setLoading(true);
    try {
      const dateStr = formatIST(editingHoliday.date, "yyyy-MM-dd");
      const updateData = {
        name: editingHoliday.name.trim(),
        date: dateStr,
      };

      console.log("📤 Updating holiday:", editingHoliday.holiday_id, updateData);
      const response = await apiService.updateHoliday(editingHoliday.holiday_id, updateData);
      console.log("✅ Holiday updated from backend:", response);

      // Immediately update local state for instant UI feedback
      setHolidays(prevHolidays =>
        prevHolidays.map((h) =>
          h.holiday_id === editingHoliday.holiday_id
            ? { ...editingHoliday, date: new Date(dateStr) }
            : h
        )
      );

      // Clear editing state
      setEditingHoliday(null);

      // Refresh from backend to ensure complete sync
      await fetchHolidays();
      Alert.alert("✅ Success", "Holiday updated successfully.");
    } catch (err: any) {
      console.error("❌ Error updating holiday:", err);
      Alert.alert("Error", err.message || "Failed to update holiday.");
      // Refresh to restore correct state if update failed
      await fetchHolidays();
    } finally {
      setLoading(false);
    }
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
    let currentDate = new Date(calendarStart);
    currentDate.setHours(0, 0, 0, 0);
    while (currentDate <= calendarEnd) {
      days.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
      currentDate.setHours(0, 0, 0, 0);
    }
    return days;
  };

  const getModalCalendarDays = () => {
    const monthStart = startOfMonth(modalCurrentMonth);
    const monthEnd = endOfMonth(modalCurrentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = [];
    let currentDate = new Date(calendarStart);
    currentDate.setHours(0, 0, 0, 0);
    while (currentDate <= calendarEnd) {
      days.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
      currentDate.setHours(0, 0, 0, 0);
    }
    return days;
  };

  const normalizeDate = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const isHoliday = (date: Date) => {
    const normalizedDate = normalizeDate(date);
    return holidays.some((h) => isSameDay(normalizeDate(h.date), normalizedDate));
  };

  const getHolidayName = (date: Date) => {
    const normalizedDate = normalizeDate(date);
    return holidays.find((h) => isSameDay(normalizeDate(h.date), normalizedDate))?.name || null;
  };

  const getLeaveCountForDate = (date: Date) => {
    const leavesToSearch = canViewTeamCalendar ? teamLeaves : myLeaves;
    const normalizedDate = normalizeDate(date);
    return leavesToSearch.filter(leave => {
      if (leave.status !== "Approved") return false;
      const leaveStart = normalizeDate(parseISO(leave.start_date));
      const leaveEnd = normalizeDate(parseISO(leave.end_date));
      return normalizedDate >= leaveStart && normalizedDate <= leaveEnd;
    }).length;
  };

  const getLeavesForDate = (date: Date) => {
    const leavesToSearch = canViewTeamCalendar ? teamLeaves : myLeaves;
    const normalizedDate = normalizeDate(date);
    return leavesToSearch.filter(leave => {
      if (leave.status !== "Approved") return false;
      const leaveStart = normalizeDate(parseISO(leave.start_date));
      const leaveEnd = normalizeDate(parseISO(leave.end_date));
      return normalizedDate >= leaveStart && normalizedDate <= leaveEnd;
    });
  };

  const openHolidayDatePicker = () => {
    setDatePickerField("holiday");
    // Ensure date picker starts with today or later
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const formDate = new Date(holidayForm.date);
    formDate.setHours(0, 0, 0, 0);

    const dateToShow = formDate >= today ? holidayForm.date : today;
    setTempDate(dateToShow);
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

  const checkDateOverlap = () => {
    const overlapValidation = validateLeaveOverlap({
      startDate: form.startDate,
      endDate: form.endDate,
      existingLeaves: myLeaves,
    });
    return overlapValidation;
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
  const [viewAllHistoryVisible, setViewAllHistoryVisible] = useState(false);

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

  const leaveCounts = React.useMemo(() => {
    const counts = { "Annual Leave": 0, "Sick Leave": 0, "Casual Leave": 0, "Unpaid Leave": 0 };
    myLeaves.forEach(req => {
      if (req.status === 'Approved' || req.status === 'Pending') {
        let duration = req.days;
        if (!duration) {
          const start = typeof req.start_date === 'string' ? parseISO(req.start_date) : req.start_date;
          const end = typeof req.end_date === 'string' ? parseISO(req.end_date) : req.end_date;
          duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
        const type = req.leave_type || "Annual Leave";
        // @ts-ignore
        if (counts[type] !== undefined) {
          // @ts-ignore
          counts[type] += duration;
        }
      }
    });
    return counts;
  }, [myLeaves]);

  const pendingCount = teamLeaves.filter(l => l.status === "Pending").length;

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Modern White Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={20} color={Colors.headerText} />
              </TouchableOpacity>
              <Animated.View style={[styles.headerTitleContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <Text style={styles.headerTitle}>Leave Management</Text>
                <Text style={styles.headerSubtitle}>Track and manage your leaves</Text>
              </Animated.View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerIconBtn} onPress={handleExportExcel} activeOpacity={0.7}>
                  <Ionicons name="download-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>

              </View>
            </View>
          </View>
        </View>

        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
          <ScrollView
            ref={scrollViewRef}
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
                {/* Leave Balance Stats Section */}
                <View style={styles.balanceStatsSection}>
                  <View style={styles.balanceStatsHeader}>
                    <Text style={styles.balanceStatsTitle}>Leave Balance</Text>
                    <Text style={styles.balanceStatsSubtitle}>Current year allocation</Text>
                  </View>

                  <View style={styles.balanceStatsGrid}>
                    {/* Total Leave Card */}
                    <View style={styles.balanceStatCard}>
                      <View style={styles.balanceStatCardHeader}>
                        <View style={[styles.balanceStatIcon, { backgroundColor: '#dbeafe' }]}>
                          <Ionicons name="calendar" size={20} color="#3b82f6" />
                        </View>
                        <View style={styles.balanceStatInfo}>
                          <Text style={styles.balanceStatLabel}>Total</Text>
                          <Text style={styles.balanceStatValue}>
                            {parseInt(leaveAllocation.Total) - leaveCounts["Annual Leave"]}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.balanceStatProgressContainer}>
                        <View style={styles.balanceStatProgressBg}>
                          <View
                            style={[
                              styles.balanceStatProgressBar,
                              {
                                width: `${((leaveCounts["Annual Leave"] / parseInt(leaveAllocation.Total)) * 100) || 0}%`,
                                backgroundColor: '#3b82f6',
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.balanceStatProgressText}>
                          {leaveCounts["Annual Leave"]}/{leaveAllocation.Total}
                        </Text>
                      </View>
                    </View>

                    {/* Sick Leave Card */}
                    <View style={styles.balanceStatCard}>
                      <View style={styles.balanceStatCardHeader}>
                        <View style={[styles.balanceStatIcon, { backgroundColor: '#fee2e2' }]}>
                          <Ionicons name="alert-circle" size={20} color="#ef4444" />
                        </View>
                        <View style={styles.balanceStatInfo}>
                          <Text style={styles.balanceStatLabel}>Sick</Text>
                          <Text style={styles.balanceStatValue}>
                            {parseInt(leaveAllocation.sick) - leaveCounts["Sick Leave"]}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.balanceStatProgressContainer}>
                        <View style={styles.balanceStatProgressBg}>
                          <View
                            style={[
                              styles.balanceStatProgressBar,
                              {
                                width: `${((leaveCounts["Sick Leave"] / parseInt(leaveAllocation.sick)) * 100) || 0}%`,
                                backgroundColor: '#ef4444',
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.balanceStatProgressText}>
                          {leaveCounts["Sick Leave"]}/{leaveAllocation.sick}
                        </Text>
                      </View>
                    </View>

                    {/* Casual Leave Card */}
                    <View style={styles.balanceStatCard}>
                      <View style={styles.balanceStatCardHeader}>
                        <View style={[styles.balanceStatIcon, { backgroundColor: '#d1fae5' }]}>
                          <Ionicons name="time" size={20} color="#10b981" />
                        </View>
                        <View style={styles.balanceStatInfo}>
                          <Text style={styles.balanceStatLabel}>Casual</Text>
                          <Text style={styles.balanceStatValue}>
                            {parseInt(leaveAllocation.casual) - leaveCounts["Casual Leave"]}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.balanceStatProgressContainer}>
                        <View style={styles.balanceStatProgressBg}>
                          <View
                            style={[
                              styles.balanceStatProgressBar,
                              {
                                width: `${((leaveCounts["Casual Leave"] / parseInt(leaveAllocation.casual)) * 100) || 0}%`,
                                backgroundColor: '#10b981',
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.balanceStatProgressText}>
                          {leaveCounts["Casual Leave"]}/{leaveAllocation.casual}
                        </Text>
                      </View>
                    </View>

                    {/* Unpaid Leave Card */}
                    <View style={styles.balanceStatCard}>
                      <View style={styles.balanceStatCardHeader}>
                        <View style={[styles.balanceStatIcon, { backgroundColor: '#f3f4f6' }]}>
                          <Ionicons name="document-text" size={20} color="#6b7280" />
                        </View>
                        <View style={styles.balanceStatInfo}>
                          <Text style={styles.balanceStatLabel}>Unpaid</Text>
                          <Text style={styles.balanceStatValue}>
                            {leaveCounts["Unpaid Leave"]}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.balanceStatProgressContainer}>
                        <Text style={styles.balanceStatProgressTextSmall}>
                          {leaveCounts["Unpaid Leave"]} days taken
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Request Leave Card */}
                <View style={styles.requestCardNew}>
                  <LinearGradient colors={["#7c3aed", "#8b5cf6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.requestCardHeaderGradient}>
                    <View style={styles.requestCardHeaderNew}>
                      <Ionicons name="calendar-outline" size={24} color="#fff" />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.requestCardTitleNew}>Request Leave</Text>
                        <Text style={styles.requestCardSubtitleNew}>Submit a new leave request</Text>
                      </View>
                    </View>
                  </LinearGradient>

                  {/* Info Note */}
                  <View style={styles.infoNoteBox}>
                    <Ionicons name="information-circle" size={16} color="#1e40af" style={{ marginRight: 8 }} />
                    <Text style={styles.infoNoteText}>
                      <Text style={{ fontWeight: '700' }}>Note:</Text> Sick, Casual, and other leave requests will deduct from your <Text style={{ fontWeight: '700' }}>Total Leave</Text> balance.
                    </Text>
                  </View>

                  <View style={styles.requestCardBody}>
                    {/* Leave Type */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        <Ionicons name="bookmark-outline" size={14} color="#7c3aed" /> Leave Type
                      </Text>
                      <TouchableOpacity style={styles.selectInputNew} onPress={() => setShowLeaveTypeDropdown(!showLeaveTypeDropdown)} activeOpacity={0.8}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <View style={[styles.leaveTypeDot, { backgroundColor: getTypeColor(form.type) }]} />
                          <Text style={styles.selectInputText}>{form.type}</Text>
                        </View>
                        <Ionicons name={showLeaveTypeDropdown ? "chevron-up" : "chevron-down"} size={20} color="#6b7280" />
                      </TouchableOpacity>
                      {showLeaveTypeDropdown && (
                        <View style={styles.dropdownList}>
                          {(["Sick Leave", "Casual Leave", "Maternity Leave", "Paternity Leave", "Unpaid Leave"] as LeaveType[]).map((option) => (
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

                    {/* Validation Rules Info */}
                    <View style={styles.validationRulesBox}>
                      <View style={styles.validationRulesHeader}>
                        <Ionicons name="information-circle" size={18} color="#7c3aed" />
                        <Text style={styles.validationRulesTitle}>Validation Rules</Text>
                      </View>
                      {form.type.toLowerCase().includes("sick") ? (
                        <View style={styles.validationRulesList}>
                          <Text style={styles.validationRuleItem}>
                            • Minimum <Text style={{ fontWeight: '700' }}>3 days</Text> required
                          </Text>
                          <Text style={styles.validationRuleItem}>
                            • Must apply <Text style={{ fontWeight: '700' }}>2 hours</Text> in advance
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.validationRulesList}>
                          <Text style={styles.validationRuleItem}>
                            • Must apply <Text style={{ fontWeight: '700' }}>24 hours</Text> in advance
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Date Range */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        <Ionicons name="calendar" size={14} color="#7c3aed" /> Duration
                      </Text>
                      <View style={styles.dateRowNew}>
                        <TouchableOpacity style={styles.dateInputNew} onPress={() => openDatePicker("startDate")} activeOpacity={0.8}>
                          <Ionicons name="calendar-outline" size={16} color="#7c3aed" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dateInputLabelNew}>From</Text>
                            <Text style={styles.dateInputValueNew}>{formatDateIST(form.startDate)}</Text>
                          </View>
                        </TouchableOpacity>
                        <View style={styles.dateConnectorNew}>
                          <Ionicons name="arrow-forward" size={16} color="#cbd5e1" />
                        </View>
                        <TouchableOpacity style={styles.dateInputNew} onPress={() => openDatePicker("endDate")} activeOpacity={0.8}>
                          <Ionicons name="calendar-outline" size={16} color="#7c3aed" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dateInputLabelNew}>To</Text>
                            <Text style={styles.dateInputValueNew}>{formatDateIST(form.endDate)}</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Overlap Warning */}
                    {(() => {
                      const overlapCheck = checkDateOverlap();
                      return !overlapCheck.isValid ? (
                        <View style={styles.overlapWarningBox}>
                          <View style={styles.overlapWarningHeader}>
                            <Ionicons name="alert-circle" size={18} color="#dc2626" />
                            <Text style={styles.overlapWarningTitle}>Date Conflict</Text>
                          </View>
                          <Text style={styles.overlapWarningText}>{overlapCheck.error}</Text>
                        </View>
                      ) : null;
                    })()}

                    {/* Reason */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        <Ionicons name="document-text" size={14} color="#7c3aed" /> Reason
                      </Text>
                      <TextInput
                        style={styles.textAreaNew}
                        placeholder="Describe the reason for your leave request..."
                        placeholderTextColor="#9ca3af"
                        value={form.reason}
                        onChangeText={(text) => setForm({ ...form, reason: text })}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                      <Text style={styles.charCountText}>{form.reason.length}/500</Text>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity style={styles.submitBtnNew} onPress={submitLeave} disabled={loading} activeOpacity={0.85}>
                      <LinearGradient
                        colors={["#7c3aed", "#6d28d9"]}
                        style={styles.submitBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
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
                      <LinearGradient colors={["#7c3aed", "#8b5cf6"]} style={styles.historyIconBg}>
                        <Ionicons name="time" size={18} color="#fff" />
                      </LinearGradient>
                      <View>
                        <Text style={styles.historyTitle}>Leave History</Text>
                        <Text style={styles.historySubtitle}>{myLeaves.length} {myLeaves.length === 1 ? 'request' : 'requests'}</Text>
                      </View>
                    </View>
                    {myLeaves.length > 2 && (
                      <TouchableOpacity style={styles.viewAllHeaderBtn} onPress={() => setViewAllHistoryVisible(true)} activeOpacity={0.8}>
                        <Text style={styles.viewAllHeaderBtnText}>View All</Text>
                        <Ionicons name="arrow-forward" size={14} color="#7c3aed" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {myLeaves.length === 0 ? (
                    <View style={styles.emptyState}>
                      <View style={styles.emptyStateIcon}>
                        <Ionicons name="document-text-outline" size={40} color="#d1d5db" />
                      </View>
                      <Text style={styles.emptyStateTitle}>No Leave History</Text>
                      <Text style={styles.emptyStateSubtitle}>You haven't applied for any leaves yet</Text>
                    </View>
                  ) : (
                    <View style={styles.historyList}>
                      {/* Show only first 2 items */}
                      {myLeaves.slice(0, 2).map((req) => (
                        <LeaveHistoryCard
                          key={req.leave_id}
                          leave={req}
                          onEdit={handleEditLeave}
                          onDelete={handleDeleteLeave}
                          getTypeColor={getTypeColor}
                          getStatusColor={getStatusColor}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Approvals Tab */}
            {activeTab === "approvals" && canSeeTeamLeaves && (
              <View>
                {/* Modern Approval Stats */}
                {/* Modern Approval Stats Fixed Layout */}
                <View style={styles.statsRowContainer}>
                  <View style={[styles.statCardFixed, styles.shadowSm, { backgroundColor: '#fff7ed', borderColor: '#ffedd5' }]}>
                    <View style={[styles.statIconContainer, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                      <Ionicons name="time" size={24} color="#d97706" />
                    </View>
                    <View>
                      <Text style={[styles.statValueModern, { color: '#d97706' }]}>{teamLeaves.filter(l => l.status === "Pending").length}</Text>
                      <Text style={[styles.statLabelModern, { color: '#fbbf24' }]}>Pending</Text>
                    </View>
                  </View>

                  <View style={[styles.statCardFixed, styles.shadowSm, { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }]}>
                    <View style={[styles.statIconContainer, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                      <Ionicons name="checkmark-circle" size={24} color="#059669" />
                    </View>
                    <View>
                      <Text style={[styles.statValueModern, { color: '#059669' }]}>{teamLeaves.filter(l => l.status === "Approved").length}</Text>
                      <Text style={[styles.statLabelModern, { color: '#34d399' }]}>Approved</Text>
                    </View>
                  </View>

                  <View style={[styles.statCardFixed, styles.shadowSm, { backgroundColor: '#fef2f2', borderColor: '#fee2e2' }]}>
                    <View style={[styles.statIconContainer, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
                      <Ionicons name="close-circle" size={24} color="#dc2626" />
                    </View>
                    <View>
                      <Text style={[styles.statValueModern, { color: '#dc2626' }]}>{teamLeaves.filter(l => l.status === "Rejected").length}</Text>
                      <Text style={[styles.statLabelModern, { color: '#f87171' }]}>Rejected</Text>
                    </View>
                  </View>
                </View>

                {/* Section Title & Refresh */}
                <View style={styles.sectionHeaderContainer}>
                  <View>
                    <Text style={styles.sectionHeaderTitle}>Leave Requests</Text>
                    <Text style={styles.sectionHeaderSubtitle}>Review and manage employee leaves</Text>
                  </View>
                  <TouchableOpacity style={styles.refreshIconBtn} onPress={fetchTeamLeaves} activeOpacity={0.7}>
                    <Ionicons name="sync" size={18} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* Approval List */}
                {loading && !refreshing ? (
                  <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color="#7c3aed" />
                    <Text style={styles.loadingText}>Syncing requests...</Text>
                  </View>
                ) : teamLeaves.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <Image
                      source={{ uri: "https://cdn-icons-png.flaticon.com/512/7486/7486744.png" }}
                      style={styles.emptyStateImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.emptyStateTitle}>All Caught Up!</Text>
                    <Text style={styles.emptyStateSubtitle}>There are no pending leave requests to review at this moment.</Text>
                  </View>
                ) : (
                  <View style={styles.requestsList}>
                    {teamLeaves.map((req) => (
                      <LeaveApprovalCard
                        key={req.leave_id}
                        leave={req}
                        onApprove={handleApprove}
                        onDecline={handleReject}
                        getTypeColor={getTypeColor}
                        getStatusColor={getStatusColor}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Calendar Tab */}
            {activeTab === "calendar" && (
              <View>
                {/* Holiday Section */}
                {/* Admin Configuration Sections - Only Admin can manage */}
                {isAdmin && (
                  <>
                    {/* Leave Allocation Configuration */}
                    <View style={styles.configCard}>
                      <TouchableOpacity
                        style={styles.configHeader}
                        onPress={() => setIsAllocationExpanded(!isAllocationExpanded)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.configIconBg}>
                          <MaterialCommunityIcons name="file-document-edit-outline" size={24} color="#7c3aed" />
                        </View>
                        <View style={styles.configHeaderText}>
                          <Text style={styles.configTitle}>Leave Allocation Configuration</Text>
                          <Text style={styles.configSubtitle}>Set annual leave distribution across types.</Text>
                        </View>
                        <View style={styles.expandIndicator}>
                          <Ionicons name={isAllocationExpanded ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
                        </View>
                      </TouchableOpacity>

                      {isAllocationExpanded && (
                        <View style={styles.configBody}>
                          <View style={styles.allocationGrid}>
                            <View style={styles.allocationItem}>
                              <Text style={[styles.allocationLabel, { color: "#7c3aed" }]}>Total Annual</Text>
                              <View style={[styles.allocationInputWrap, { borderColor: "#ddd6fe" }]}>
                                <TextInput
                                  style={styles.allocationInput}
                                  value={leaveAllocation.Total}
                                  keyboardType="numeric"
                                  onChangeText={(t) => setLeaveAllocation({ ...leaveAllocation, Total: t })}
                                />
                              </View>
                              <Text style={styles.allocationHelperText}>Days/year</Text>
                            </View>

                            <View style={styles.allocationItem}>
                              <Text style={[styles.allocationLabel, { color: "#ef4444" }]}>Sick Leave</Text>
                              <View style={[styles.allocationInputWrap, { borderColor: "#fecaca" }]}>
                                <TextInput
                                  style={styles.allocationInput}
                                  value={leaveAllocation.sick}
                                  keyboardType="numeric"
                                  onChangeText={(t) => setLeaveAllocation({ ...leaveAllocation, sick: t })}
                                />
                              </View>
                              <Text style={styles.allocationHelperText}>Allocated</Text>
                            </View>

                            <View style={styles.allocationItem}>
                              <Text style={[styles.allocationLabel, { color: "#10b981" }]}>Casual Leave</Text>
                              <View style={[styles.allocationInputWrap, { borderColor: "#a7f3d0" }]}>
                                <TextInput
                                  style={styles.allocationInput}
                                  value={leaveAllocation.casual}
                                  keyboardType="numeric"
                                  onChangeText={(t) => setLeaveAllocation({ ...leaveAllocation, casual: t })}
                                />
                              </View>
                              <Text style={styles.allocationHelperText}>Allocated</Text>
                            </View>

                            <View style={styles.allocationItem}>
                              <Text style={[styles.allocationLabel, { color: "#64748b" }]}>Other Leave</Text>
                              <View style={[styles.allocationInputWrap, { borderColor: "#e2e8f0" }]}>
                                <TextInput
                                  style={styles.allocationInput}
                                  value={leaveAllocation.other}
                                  keyboardType="numeric"
                                  onChangeText={(t) => setLeaveAllocation({ ...leaveAllocation, other: t })}
                                />
                              </View>
                              <Text style={styles.allocationHelperText}>Allocated</Text>
                            </View>
                          </View>

                          <View style={styles.infoBox}>
                            <Text style={styles.infoBoxText}>
                              <Text style={{ fontWeight: '700' }}>Note:</Text> Sick, Casual, and other leave requests will deduct from the <Text style={{ fontWeight: '700' }}>Total Annual Leave</Text> balance. Individual allocations are for reference/tracking.
                            </Text>
                          </View>

                          <TouchableOpacity style={styles.saveConfigBtn} onPress={saveAllocation} activeOpacity={0.8} disabled={loading}>
                            <LinearGradient colors={["#7c3aed", "#6d28d9"]} style={styles.saveConfigGradient}>
                              {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <Ionicons name="checkbox-outline" size={18} color="#fff" />
                                  <Text style={styles.saveConfigText}>Save Configuration</Text>
                                </>
                              )}
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {/* Department Week-off Planner */}
                    <View style={styles.configCard}>
                      <TouchableOpacity
                        style={styles.configHeader}
                        onPress={() => setIsWeekOffExpanded(!isWeekOffExpanded)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.configIconBg, { backgroundColor: '#e0f2fe' }]}>
                          <Ionicons name="time-outline" size={24} color="#0284c7" />
                        </View>
                        <View style={styles.configHeaderText}>
                          <Text style={styles.configTitle}>Department Week-off Planner</Text>
                          <Text style={styles.configSubtitle}>Define weekly off days for aligned schedules.</Text>
                        </View>
                        <View style={styles.expandIndicator}>
                          <Ionicons name={isWeekOffExpanded ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
                        </View>
                      </TouchableOpacity>

                      {isWeekOffExpanded && (
                        <View style={styles.configBody}>
                          <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Department</Text>
                            <TouchableOpacity
                              style={[styles.deptSelectInput, showDeptDropdown && styles.deptSelectInputActive]}
                              onPress={() => setShowDeptDropdown(!showDeptDropdown)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.deptSelectContent}>
                                <View style={styles.deptSelectIcon}>
                                  <Ionicons name="business" size={18} color="#0284c7" />
                                </View>
                                <View style={styles.deptSelectTextContainer}>
                                  <Text style={styles.deptSelectLabel}>Selected Department</Text>
                                  <Text style={styles.deptSelectValue}>{selectedDeptForWeekOff}</Text>
                                </View>
                              </View>
                              <Ionicons
                                name={showDeptDropdown ? "chevron-up" : "chevron-down"}
                                size={22}
                                color="#0284c7"
                              />
                            </TouchableOpacity>


                          </View>

                          <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Weekly Off Days</Text>
                            <View style={styles.weekDaysContainer}>
                              <View style={styles.weekDaysRow}>
                                {weekDays.slice(0, 4).map((day) => {
                                  const isSelected = selectedWeekOffs.includes(day.name);
                                  return (
                                    <TouchableOpacity
                                      key={day.name}
                                      style={[styles.weekDayButton, isSelected && styles.weekDayButtonActive]}
                                      onPress={() => toggleWeekOffDay(day.name)}
                                      activeOpacity={0.65}
                                    >
                                      <View style={[styles.weekDayButtonContent, isSelected && { backgroundColor: `${day.color}10` }]}>
                                        <Ionicons
                                          name={day.icon as any}
                                          size={16}
                                          color={isSelected ? day.color : "#cbd5e1"}
                                        />
                                        <Text style={[styles.weekDayButtonText, isSelected && { color: day.color, fontWeight: '700' }]}>
                                          {day.name.slice(0, 3)}
                                        </Text>
                                      </View>
                                      {isSelected && (
                                        <View style={[styles.weekDayButtonBadge, { backgroundColor: day.color }]}>
                                          <Ionicons name="checkmark" size={9} color="#fff" />
                                        </View>
                                      )}
                                    </TouchableOpacity>
                                  )
                                })}
                              </View>
                              <View style={styles.weekDaysRow}>
                                {weekDays.slice(4, 7).map((day) => {
                                  const isSelected = selectedWeekOffs.includes(day.name);
                                  return (
                                    <TouchableOpacity
                                      key={day.name}
                                      style={[styles.weekDayButton, isSelected && styles.weekDayButtonActive]}
                                      onPress={() => toggleWeekOffDay(day.name)}
                                      activeOpacity={0.65}
                                    >
                                      <View style={[styles.weekDayButtonContent, isSelected && { backgroundColor: `${day.color}10` }]}>
                                        <Ionicons
                                          name={day.icon as any}
                                          size={16}
                                          color={isSelected ? day.color : "#cbd5e1"}
                                        />
                                        <Text style={[styles.weekDayButtonText, isSelected && { color: day.color, fontWeight: '700' }]}>
                                          {day.name.slice(0, 3)}
                                        </Text>
                                      </View>
                                      {isSelected && (
                                        <View style={[styles.weekDayButtonBadge, { backgroundColor: day.color }]}>
                                          <Ionicons name="checkmark" size={9} color="#fff" />
                                        </View>
                                      )}
                                    </TouchableOpacity>
                                  )
                                })}
                                <View style={styles.weekDayButtonPlaceholder} />
                              </View>
                            </View>
                            <View style={styles.helperTextContainer}>
                              <Text style={styles.helperTextSmall}>
                                <Text style={{ fontWeight: '600' }}>Required:</Text> Select minimum 1 day and maximum 2 days for week-off.
                              </Text>
                              <Text style={[styles.helperTextSmall, { marginTop: 4, color: '#64748b' }]}>
                                Currently selected: <Text style={{ fontWeight: '600', color: selectedWeekOffs.length === 0 ? '#ef4444' : selectedWeekOffs.length < 2 ? '#f59e0b' : '#10b981' }}>{selectedWeekOffs.length} day{selectedWeekOffs.length !== 1 ? 's' : ''}</Text>
                              </Text>
                            </View>
                          </View>

                          <View style={styles.weekOffActionContainer}>
                            <TouchableOpacity
                              style={[styles.saveWeekOffBtnNew, selectedWeekOffs.length === 0 && styles.saveWeekOffBtnDisabled]}
                              onPress={saveWeekOff}
                              activeOpacity={0.75}
                              disabled={selectedWeekOffs.length === 0}
                            >
                              <LinearGradient
                                colors={selectedWeekOffs.length === 0 ? ["#cbd5e1", "#a1a5ab"] : ["#0284c7", "#0369a1"]}
                                style={styles.saveWeekOffGradient}
                              >
                                <View style={styles.saveWeekOffContent}>
                                  <Ionicons
                                    name={loading ? "sync" : "checkmark-done"}
                                    size={18}
                                    color="#fff"
                                    style={loading ? { transform: [{ rotate: '45deg' }] } : {}}
                                  />
                                  <Text style={styles.saveWeekOffText}>
                                    {loading ? "Saving..." : "Save Week-off Configuration"}
                                  </Text>
                                </View>
                              </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.weekOffSummaryBox}>
                              <View style={styles.weekOffSummaryHeader}>
                                <Ionicons name="information-circle" size={16} color="#0284c7" />
                                <Text style={styles.weekOffSummaryTitle}>Selected Days</Text>
                              </View>
                              {selectedWeekOffs.length > 0 ? (
                                <View style={styles.weekOffSummaryDays}>
                                  {selectedWeekOffs.map((day, idx) => (
                                    <View key={day} style={styles.weekOffSummaryDay}>
                                      <Text style={styles.weekOffSummaryDayText}>{day}</Text>
                                    </View>
                                  ))}
                                </View>
                              ) : (
                                <Text style={styles.weekOffSummaryEmpty}>No days selected yet</Text>
                              )}
                            </View>
                          </View>

                          <View style={styles.activeRulesContainer}>
                            <Text style={styles.activeRulesTitle}>Active Week-off Rules</Text>
                            <Text style={styles.activeRulesEmpty}>No department-specific week-offs defined yet.</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {/* Holiday Section */}
                <View style={styles.sectionHeaderContainer}>
                  <Text style={styles.sectionHeaderTitle}>Calendar & Holidays</Text>
                </View>

                {/* Next Holiday Card (Teaser) */}
                <TouchableOpacity
                  style={styles.nextHolidayCard}
                  activeOpacity={0.9}
                  onPress={() => setHolidayListModalVisible(true)}
                >
                  <LinearGradient
                    colors={["#8b5cf6", "#7c3aed"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.nextHolidayGradient}
                  >
                    <View style={styles.nextHolidayContent}>
                      <View style={styles.nextHolidayIconContainer}>
                        <Ionicons name="gift-outline" size={24} color="#fff" />
                      </View>
                      <View style={styles.nextHolidayInfo}>
                        <Text style={styles.nextHolidayLabel}>Upcoming Holiday</Text>
                        {holidays.length > 0 ? (
                          (() => {
                            const futureHolidays = holidays.filter(h => isSameDay(h.date, new Date()) || h.date > new Date()).sort((a, b) => a.date.getTime() - b.date.getTime());
                            const nextHoliday = futureHolidays.length > 0 ? futureHolidays[0] : holidays[holidays.length - 1];
                            return (
                              <>
                                <Text style={styles.nextHolidayName}>{nextHoliday.name}</Text>
                                <Text style={styles.nextHolidayDate}>{formatDateWithDayIST(nextHoliday.date)}</Text>
                              </>
                            );
                          })()
                        ) : (
                          <Text style={styles.nextHolidayName}>No upcoming holidays</Text>
                        )}
                      </View>
                      <View style={styles.nextHolidayArrow}>
                        <Ionicons name="chevron-forward" size={20} color="#fff" />
                      </View>
                    </View>
                    {/* Decorative Circles */}
                    <View style={styles.decorativeCircle1} />
                    <View style={styles.decorativeCircle2} />
                  </LinearGradient>
                </TouchableOpacity>

                {/* Calendar */}
                {/* Calendar */}
                <View style={styles.calendarCard}>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity style={styles.calendarNavBtn} onPress={goToPreviousMonth} activeOpacity={0.7}>
                      <Ionicons name="chevron-back" size={20} color="#7c3aed" />
                    </TouchableOpacity>
                    <View style={styles.calendarDateContainer}>
                      <Ionicons name="calendar" size={16} color="#7c3aed" style={{ marginRight: 6 }} />
                      <Text style={styles.calendarMonthText}>{getMonthYearIST(currentMonth)}</Text>
                    </View>
                    <TouchableOpacity style={styles.calendarNavBtn} onPress={goToNextMonth} activeOpacity={0.7}>
                      <Ionicons name="chevron-forward" size={20} color="#7c3aed" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.calendarWeekHeader}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                      <Text key={i} style={styles.calendarWeekDay}>{d}</Text>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {getCalendarDays().map((date, index) => {
                      const isCurrentMonth = isSameMonth(date, currentMonth);
                      const isSelected = selectedDate && isSameDay(date, selectedDate);
                      const isHolidayDate = isHoliday(date);
                      const isToday = isSameDay(date, getTodayNormalized());
                      const showHolidayDot = isHolidayDate && !isSelected;

                      return (
                        <View key={index} style={styles.calendarDayWrapper}>
                          <TouchableOpacity
                            style={[
                              styles.calendarDayInner,
                              !isCurrentMonth && styles.calendarDayOther,
                              isSelected && styles.calendarDaySelected,
                              !isSelected && isToday && styles.calendarDayToday
                            ]}
                            onPress={() => setSelectedDate(date)}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.calendarDayText,
                              !isCurrentMonth && styles.calendarDayTextOther,
                              isSelected && styles.calendarDayTextSelected,
                              !isSelected && isToday && styles.calendarDayTextToday
                            ]}>
                              {format(date, "d")}
                            </Text>
                            {showHolidayDot && <View style={styles.calendarHolidayDot} />}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>

                  {/* Selected Date Details */}
                  {selectedDate && (
                    <Animated.View style={styles.selectedDateDetails}>
                      <View style={styles.selectedDateHeader}>
                        <Text style={styles.selectedDateLabel}>Events for</Text>
                        <Text style={styles.selectedDateValue}>{formatDateWithDayIST(selectedDate)}</Text>
                      </View>

                      {isHoliday(selectedDate) ? (
                        <View style={styles.eventCardHoliday}>
                          <View style={styles.eventCardIconHoliday}>
                            <Ionicons name="sunny" size={20} color="#f59e0b" />
                          </View>
                          <View style={styles.eventCardContent}>
                            <Text style={styles.eventCardTitleHoliday}>{getHolidayName(selectedDate)}</Text>
                            <Text style={styles.eventCardSubtitle}>Holiday</Text>
                          </View>
                        </View>
                      ) : getLeaveCountForDate(selectedDate) > 0 ? (
                        <View>
                          {getLeavesForDate(selectedDate).map(leave => (
                            <View key={leave.leave_id} style={styles.leaveEventCard}>
                              <View style={[styles.leaveEventBar, { backgroundColor: getTypeColor(leave.leave_type || "") }]} />
                              <View style={styles.leaveEventContent}>
                                <Text style={styles.leaveEventName}>{leave.user?.name || "Employee"}</Text>
                                <Text style={styles.leaveEventType}>{leave.leave_type}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.noEventsText}>No events or holidays on this day.</Text>
                      )}
                    </Animated.View>
                  )}
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
            minimumDate={datePickerField === "holiday" ? new Date() : undefined}
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
                  <Text style={styles.datePickerTitle}>
                    {datePickerField === "holiday" ? "Select Holiday Date" : "Select Date"}
                  </Text>
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
                  minimumDate={datePickerField === "holiday" ? new Date() : undefined}
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

        {/* View All Leave History Modal */}
        <Modal visible={viewAllHistoryVisible} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={styles.viewAllHistoryModalContainer}>
            {/* Premium Header */}
            <LinearGradient colors={["#7c3aed", "#8b5cf6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.viewAllHistoryModalHeader}>
              <View style={styles.viewAllHistoryModalHeaderContent}>
                <TouchableOpacity
                  style={styles.viewAllHistoryModalBackBtn}
                  onPress={() => setViewAllHistoryVisible(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.viewAllHistoryModalHeaderText}>
                  <Text style={styles.viewAllHistoryModalTitle}>Leave History</Text>
                  <Text style={styles.viewAllHistoryModalSubtitle}>
                    {myLeaves.length} {myLeaves.length === 1 ? 'request' : 'requests'} total
                  </Text>
                </View>
                <View style={styles.viewAllHistoryModalHeaderSpacer} />
              </View>
            </LinearGradient>

            {/* Stats Summary */}
            <View style={styles.viewAllHistoryStatsRow}>
              <View style={[styles.viewAllHistoryStat, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="time" size={16} color="#d97706" />
                <Text style={[styles.viewAllHistoryStatValue, { color: '#d97706' }]}>
                  {myLeaves.filter(l => l.status === 'Pending').length}
                </Text>
                <Text style={styles.viewAllHistoryStatLabel}>Pending</Text>
              </View>
              <View style={[styles.viewAllHistoryStat, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={[styles.viewAllHistoryStatValue, { color: '#059669' }]}>
                  {myLeaves.filter(l => l.status === 'Approved').length}
                </Text>
                <Text style={styles.viewAllHistoryStatLabel}>Approved</Text>
              </View>
              <View style={[styles.viewAllHistoryStat, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="close-circle" size={16} color="#dc2626" />
                <Text style={[styles.viewAllHistoryStatValue, { color: '#dc2626' }]}>
                  {myLeaves.filter(l => l.status === 'Rejected').length}
                </Text>
                <Text style={styles.viewAllHistoryStatLabel}>Rejected</Text>
              </View>
            </View>

            {/* Leave History List */}
            <FlatList
              data={myLeaves}
              keyExtractor={(item) => item.leave_id.toString()}
              contentContainerStyle={styles.viewAllHistoryList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.viewAllHistoryItem}>
                  <LeaveHistoryCard
                    leave={item}
                    onEdit={handleEditLeave}
                    onDelete={handleDeleteLeave}
                    getTypeColor={getTypeColor}
                    getStatusColor={getStatusColor}
                  />
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.viewAllHistoryEmpty}>
                  <View style={styles.viewAllHistoryEmptyIcon}>
                    <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
                  </View>
                  <Text style={styles.viewAllHistoryEmptyTitle}>No Leave History</Text>
                  <Text style={styles.viewAllHistoryEmptySubtitle}>You haven't applied for any leaves yet</Text>
                </View>
              }
            />
          </SafeAreaView>
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
                  <Text style={styles.calendarMonthText}>{getMonthYearIST(modalCurrentMonth)}</Text>
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
                    const isToday = isSameDay(date, getTodayNormalized());
                    const isSelected = modalSelectedDate && isSameDay(date, modalSelectedDate);
                    return (
                      <View key={index} style={styles.calendarDayWrapper}>
                        <TouchableOpacity
                          style={[
                            styles.calendarDayInner,
                            !isCurrentMonth && styles.calendarDayOther,
                            isSelected && styles.calendarDaySelected,
                            !isSelected && isToday && styles.calendarDayToday
                          ]}
                          onPress={() => setModalSelectedDate(date)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.calendarDayText, !isCurrentMonth && styles.calendarDayTextOther, isSelected && styles.calendarDayTextSelected]}>{format(date, "d")}</Text>
                          {leaveCount > 0 && <View style={styles.leaveCountBadge}><Text style={styles.leaveCountText}>{leaveCount}</Text></View>}
                          {isHolidayDate && !isSelected && <View style={styles.calendarHolidayDot} />}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
              {modalSelectedDate && (
                <View style={styles.selectedDateCard}>
                  <Text style={styles.selectedDateTitle}>{formatDateWithDayIST(modalSelectedDate)}</Text>
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

        {/* Holiday List Modal */}
        <Modal visible={holidayListModalVisible} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={styles.holidayListModalContainer}>
            {/* Premium Header */}
            <LinearGradient colors={["#7c3aed", "#8b5cf6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.holidayModalHeaderGradient}>
              <View style={styles.holidayModalHeaderContent}>
                <View style={styles.holidayModalHeaderTop}>
                  <TouchableOpacity
                    style={styles.holidayModalBackBtn}
                    onPress={() => {
                      setHolidayListModalVisible(false);
                      setEditingHoliday(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.holidayModalHeaderText}>
                    <Text style={styles.holidayModalTitle}>Manage Holidays</Text>
                    <Text style={styles.holidayModalSubtitle}>Configure company holidays</Text>
                  </View>
                  <View style={styles.holidayModalHeaderSpacer} />
                </View>
              </View>
            </LinearGradient>

            <ScrollView style={styles.holidayListModalContent} showsVerticalScrollIndicator={false}>
              {/* Add Holiday Form (Only for Admin) */}
              {isAdmin && (
                <View style={styles.holidayAddFormCard}>
                  <View style={styles.holidayAddFormHeader}>
                    <View style={styles.holidayAddFormIconBg}>
                      <Ionicons name="add-circle" size={24} color="#7c3aed" />
                    </View>
                    <Text style={styles.holidayAddFormTitle}>Add New Holiday</Text>
                  </View>

                  <View style={styles.holidayAddFormBody}>
                    <View style={styles.holidayFormGroup}>
                      <Text style={styles.holidayFormLabel}>Holiday Date</Text>
                      <TouchableOpacity
                        style={styles.holidayFormDateInput}
                        onPress={openHolidayDatePicker}
                        activeOpacity={0.8}
                      >
                        <View style={styles.holidayFormDateIconBg}>
                          <Ionicons name="calendar" size={18} color="#7c3aed" />
                        </View>
                        <Text style={styles.holidayFormDateText}>{formatDateIST(holidayForm.date)}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.holidayFormGroup}>
                      <Text style={styles.holidayFormLabel}>Holiday Name</Text>
                      <TextInput
                        style={styles.holidayFormNameInput}
                        placeholder="e.g., Diwali, Christmas, New Year"
                        placeholderTextColor="#cbd5e1"
                        value={holidayForm.name}
                        onChangeText={(text) => setHolidayForm({ ...holidayForm, name: text })}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.holidayAddFormSubmitBtn}
                      onPress={addHoliday}
                      activeOpacity={0.85}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={["#7c3aed", "#6d28d9"]}
                        style={styles.holidayAddFormSubmitGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="add" size={18} color="#fff" />
                            <Text style={styles.holidayAddFormSubmitText}>Add Holiday</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Holidays List Section */}
              <View style={styles.holidaysListSection}>
                <View style={styles.holidaysListHeader}>
                  <View style={styles.holidaysListHeaderLeft}>
                    <View style={styles.holidaysListIconBg}>
                      <Ionicons name="gift" size={20} color="#f59e0b" />
                    </View>
                    <View>
                      <Text style={styles.holidaysListTitle}>All Holidays</Text>
                      <Text style={styles.holidaysListSubtitle}>
                        {holidays.length} {holidays.length === 1 ? 'holiday' : 'holidays'} configured
                      </Text>
                    </View>
                  </View>
                </View>

                {holidaysLoading ? (
                  <View style={styles.holidaysLoadingState}>
                    <ActivityIndicator size="large" color="#f59e0b" />
                    <Text style={styles.holidaysLoadingText}>Loading holidays...</Text>
                  </View>
                ) : holidays.length === 0 ? (
                  <View style={styles.holidaysEmptyState}>
                    <View style={styles.holidaysEmptyStateIcon}>
                      <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
                    </View>
                    <Text style={styles.holidaysEmptyStateTitle}>No Holidays Yet</Text>
                    <Text style={styles.holidaysEmptyStateSubtitle}>
                      {isAdmin ? 'Add holidays to get started' : 'No holidays configured'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.holidaysListWrapper}>
                    {holidays.sort((a, b) => a.date.getTime() - b.date.getTime()).map((holiday, index) => (
                      <View
                        key={holiday.holiday_id || holiday.date.getTime()}
                        style={[
                          styles.holidayItemCard,
                          index === holidays.length - 1 && styles.holidayItemCardLast
                        ]}
                      >
                        {editingHoliday && editingHoliday.holiday_id === holiday.holiday_id ? (
                          // Edit Mode
                          <View style={styles.holidayEditModeContainer}>
                            <View style={styles.holidayEditFormGroup}>
                              <Text style={styles.holidayEditFormLabel}>Holiday Name</Text>
                              <TextInput
                                style={styles.holidayEditFormInput}
                                value={editingHoliday.name}
                                onChangeText={(text) =>
                                  setEditingHoliday({ ...editingHoliday, name: text })
                                }
                                placeholder="Enter holiday name"
                                placeholderTextColor="#cbd5e1"
                              />
                            </View>

                            <View style={styles.holidayEditFormGroup}>
                              <Text style={styles.holidayEditFormLabel}>Date</Text>
                              <TouchableOpacity
                                style={styles.holidayEditDateBtn}
                                onPress={() => {
                                  setDatePickerField("holiday");
                                  setTempDate(editingHoliday.date);
                                  setShowDatePicker(true);
                                }}
                              >
                                <Ionicons name="calendar-outline" size={18} color="#7c3aed" />
                                <Text style={styles.holidayEditDateBtnText}>
                                  {formatDateIST(editingHoliday.date)}
                                </Text>
                              </TouchableOpacity>
                            </View>

                            <View style={styles.holidayEditFormActions}>
                              <TouchableOpacity
                                style={styles.holidayEditCancelBtn}
                                onPress={cancelEditingHoliday}
                              >
                                <Text style={styles.holidayEditCancelBtnText}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.holidayEditSaveBtn}
                                onPress={saveEditingHoliday}
                                disabled={loading}
                              >
                                {loading ? (
                                  <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                  <Text style={styles.holidayEditSaveBtnText}>Save Changes</Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          // View Mode
                          <View style={styles.holidayItemViewMode}>
                            <View style={styles.holidayItemLeftContent}>
                              <View style={styles.holidayItemDateBadge}>
                                <Text style={styles.holidayItemDateDay}>
                                  {format(holiday.date, 'd')}
                                </Text>
                                <Text style={styles.holidayItemDateMonth}>
                                  {format(holiday.date, 'MMM')}
                                </Text>
                              </View>
                              <View style={styles.holidayItemInfo}>
                                <Text style={styles.holidayItemName}>{holiday.name}</Text>
                                <Text style={styles.holidayItemDateFull}>
                                  {formatDateWithDayIST(holiday.date)}
                                </Text>
                              </View>
                            </View>

                            {/* Edit/Delete buttons - Only for Admin */}
                            {isAdmin && (
                              <View style={styles.holidayItemActions}>
                                <TouchableOpacity
                                  style={styles.holidayItemEditBtn}
                                  onPress={() => startEditingHoliday(holiday)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="pencil" size={16} color="#7c3aed" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.holidayItemDeleteBtn}
                                  onPress={() => removeHoliday(holiday)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="trash" size={16} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
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

        {/* Edit Leave Modal */}
        <EditLeaveModal
          visible={editModalVisible}
          leave={editingLeave}
          onClose={() => {
            setEditModalVisible(false);
            setEditingLeave(null);
          }}
          onUpdate={handleUpdateLeave}
          loading={loading}
          getTypeColor={getTypeColor}
        />

        {/* Department Dropdown - Same as Reports Header */}
        {showDeptDropdown && (
          <Modal
            visible={true}
            transparent={true}
            animationType="none"
            onRequestClose={() => setShowDeptDropdown(false)}
          >
            <TouchableOpacity
              style={styles.deptDropdownAbsoluteOverlay}
              activeOpacity={1}
              onPress={() => setShowDeptDropdown(false)}
            >
              <Animated.View style={[
                styles.deptDropdownAbsolutePopup,
                {
                  opacity: deptDropdownAnim,
                  transform: [
                    { scale: deptDropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                    { translateY: deptDropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }
                  ]
                }
              ]}>
                <ScrollView
                  scrollEnabled={departments.length > 6}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                >
                  {departments.map((dept) => (
                    <TouchableOpacity
                      key={dept.id}
                      style={[
                        styles.deptDropdownPopupOption,
                        selectedDeptForWeekOff === dept.name && styles.deptDropdownPopupOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedDeptForWeekOff(dept.name);
                        setShowDeptDropdown(false);
                      }}
                      activeOpacity={0.6}
                    >
                      <Text style={[
                        styles.deptDropdownPopupOptionText,
                        selectedDeptForWeekOff === dept.name && styles.deptDropdownPopupOptionTextActive
                      ]}>
                        {dept.name}
                      </Text>
                      {selectedDeptForWeekOff === dept.name && (
                        <Ionicons name="checkmark" size={18} color="#0284c7" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            </TouchableOpacity>
          </Modal>
        )}
      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  
  // Modern White Header
  headerContainer: {
    backgroundColor: Colors.surface,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.xl },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: BorderRadius.md, 
    backgroundColor: Colors.surface, 
    alignItems: "center", 
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  headerTitleContainer: { flex: 1, marginLeft: Spacing.md },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.headerText },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: Spacing.sm },
  headerIconBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: BorderRadius.md, 
    backgroundColor: Colors.primaryLight, 
    alignItems: "center", 
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

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
  requestCardBody: { padding: 20, paddingTop: 16, backgroundColor: "#fff" },

  formGroup: { marginBottom: 22 },
  formLabel: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginBottom: 10, textTransform: "capitalize" },
  required: { color: "#ef4444" },
  selectInput: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, gap: 10 },
  selectInputText: { flex: 1, fontSize: 15, color: "#1e293b", fontWeight: "500" },
  leaveTypeDot: { width: 10, height: 10, borderRadius: 5 },
  dropdownList: { backgroundColor: "#fff", borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden", elevation: 4 },
  dropdownItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  dropdownItemActive: { backgroundColor: "#f5f3ff" },
  dropdownItemText: { flex: 1, fontSize: 15, color: "#374151" },
  dropdownItemTextActive: { color: "#7c3aed", fontWeight: "600" },

  dateRow: { flexDirection: "row", alignItems: "stretch", gap: 12, minHeight: 80 },
  dateInput: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  dateInputContent: { flex: 1 },
  dateInputLabel: { fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  dateInputValue: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  dateArrow: { paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },

  textArea: { backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, fontSize: 15, color: "#1e293b", minHeight: 100, textAlignVertical: "top" },

  submitBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
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
  holidaySectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, gap: 10 },
  holidaySectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  holidaySectionTitle: { fontSize: 16, fontWeight: "700", color: "#92400e" },
  viewHolidaysBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.6)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6 },
  viewHolidaysBtnText: { fontSize: 13, fontWeight: "600", color: "#92400e" },
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

  calendarCard: { backgroundColor: "#fff", borderRadius: 24, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4, minHeight: 420 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  calendarNavBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  calendarDateContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  calendarMonthText: { fontSize: 15, fontWeight: "700", color: "#7c3aed" },
  calendarWeekHeader: { flexDirection: "row", marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  calendarWeekDay: { width: "14.28%", textAlign: "center", fontSize: 12, fontWeight: "600", color: "#64748b" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarDayWrapper: { width: "14.28%", height: 48, alignItems: "center", justifyContent: "center" },
  calendarDayInner: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  calendarDay: { width: "14.28%", height: 48, alignItems: "center", justifyContent: "center", position: "relative" },
  calendarDayOther: { opacity: 0.4 },
  calendarDaySelected: { backgroundColor: "#c2410c" },
  calendarDayToday: { borderWidth: 2, borderColor: "#c2410c" },
  calendarDayText: { fontSize: 16, fontWeight: "500", color: "#374151", textAlign: "center" },
  calendarDayTextOther: { color: "#9ca3af" },
  calendarDayTextSelected: { color: "#fff", fontWeight: "600" },
  calendarDayTextToday: { color: "#c2410c", fontWeight: "600" },
  calendarHolidayDot: { position: "absolute", bottom: 2, width: 5, height: 5, borderRadius: 3, backgroundColor: "#f59e0b" },
  leaveCountBadge: { position: "absolute", top: 0, right: -2, backgroundColor: "#ef4444", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  leaveCountText: { fontSize: 9, fontWeight: "700", color: "#fff" },

  // Selected Date Details in Calendar
  selectedDateDetails: { marginTop: 20, paddingTop: 16, paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 2, borderTopColor: '#e2e8f0', backgroundColor: '#f8fafc', borderRadius: 14, marginHorizontal: -4 },
  selectedDateHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  selectedDateLabel: { fontSize: 12, color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  selectedDateValue: { fontSize: 15, fontWeight: "700", color: "#1e293b" },

  eventCardHoliday: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', borderRadius: 12, padding: 12, gap: 12, borderWidth: 1.5, borderColor: '#fcd34d', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  eventCardIconHoliday: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fcd34d', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f59e0b' },
  eventCardTitleHoliday: { fontSize: 15, fontWeight: "700", color: "#92400e" },
  eventCardSubtitle: { fontSize: 12, color: "#b45309", fontWeight: "500" },
  eventCardContent: { flex: 1 },

  leaveEventCard: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, overflow: 'hidden', marginBottom: 8, borderWidth: 1.5, borderColor: '#e2e8f0', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  leaveEventBar: { width: 4, alignSelf: 'stretch' },
  leaveEventContent: { flex: 1, padding: 12 },
  leaveEventName: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  leaveEventType: { fontSize: 12, color: "#64748b", marginTop: 2, fontWeight: "500" },

  noEventsText: { fontSize: 12, color: "#94a3b8", fontStyle: "italic", textAlign: 'center', paddingVertical: 8 },

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

  selectedDateCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1.5, borderColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  selectedDateTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b", marginBottom: 12 },
  selectedDateHoliday: { flexDirection: "row", alignItems: "center", backgroundColor: "#fef3c7", padding: 10, borderRadius: 10, gap: 8, marginBottom: 10, borderWidth: 1, borderColor: "#fcd34d" },
  selectedDateHolidayText: { fontSize: 12, fontWeight: "500", color: "#92400e" },
  selectedDateNoLeaves: { fontSize: 13, color: "#64748b", textAlign: "center", paddingVertical: 14, fontStyle: "italic" },
  selectedDateLeave: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 12, marginBottom: 8, overflow: "hidden", borderWidth: 1.5, borderColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  selectedDateLeaveBar: { width: 4, alignSelf: "stretch" },
  selectedDateLeaveContent: { flex: 1, padding: 12 },
  selectedDateLeaveName: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  selectedDateLeaveType: { fontSize: 12, color: "#64748b", marginTop: 2, fontWeight: "500" },

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

  // Holiday List Modal Styles - Enhanced
  holidayListModalContainer: { flex: 1, backgroundColor: "#f8fafc" },
  holidayModalHeaderGradient: { paddingBottom: 20 },
  holidayModalHeaderContent: { paddingHorizontal: 16, paddingTop: 8 },
  holidayModalHeaderTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  holidayModalBackBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  holidayModalHeaderText: { flex: 1 },
  holidayModalTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  holidayModalSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  holidayModalHeaderSpacer: { width: 40 },
  holidayListModalContent: { flex: 1, padding: 16, paddingBottom: 32 },

  // Add Holiday Form Card
  holidayAddFormCard: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1.5, borderColor: "#e2e8f0", overflow: "hidden", marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  holidayAddFormHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  holidayAddFormIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center" },
  holidayAddFormTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  holidayAddFormBody: { padding: 16 },
  holidayFormGroup: { marginBottom: 16 },
  holidayFormLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  holidayFormDateInput: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  holidayFormDateIconBg: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center" },
  holidayFormDateText: { flex: 1, fontSize: 14, fontWeight: "500", color: "#1e293b" },
  holidayFormNameInput: { backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#1e293b" },
  holidayAddFormSubmitBtn: { borderRadius: 12, overflow: "hidden", marginTop: 8 },
  holidayAddFormSubmitGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8 },
  holidayAddFormSubmitText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // Holidays List Section
  holidaysListSection: { marginBottom: 20 },
  holidaysListHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingHorizontal: 4 },
  holidaysListHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  holidaysListIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center" },
  holidaysListTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  holidaysListSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },

  // Holiday Items
  holidaysListWrapper: { gap: 12 },
  holidayItemCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  holidayItemCardLast: { marginBottom: 0 },
  holidayItemViewMode: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  holidayItemLeftContent: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  holidayItemDateBadge: { width: 56, height: 56, borderRadius: 12, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#fcd34d" },
  holidayItemDateDay: { fontSize: 16, fontWeight: "700", color: "#92400e" },
  holidayItemDateMonth: { fontSize: 11, fontWeight: "600", color: "#b45309", marginTop: 2 },
  holidayItemInfo: { flex: 1 },
  holidayItemName: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  holidayItemDateFull: { fontSize: 12, color: "#64748b", marginTop: 4 },
  holidayItemActions: { flexDirection: "row", gap: 8 },
  holidayItemEditBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e9d5ff" },
  holidayItemDeleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#fee2e2" },

  // Edit Mode
  holidayEditModeContainer: { padding: 16, backgroundColor: "#f8fafc" },
  holidayEditFormGroup: { marginBottom: 14 },
  holidayEditFormLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  holidayEditFormInput: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#1e293b" },
  holidayEditDateBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  holidayEditDateBtnText: { flex: 1, fontSize: 14, color: "#1e293b", fontWeight: "500" },
  holidayEditFormActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  holidayEditCancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: "#f1f5f9", alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  holidayEditCancelBtnText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  holidayEditSaveBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: "#7c3aed", alignItems: "center", borderWidth: 1, borderColor: "#7c3aed" },
  holidayEditSaveBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  // Empty and Loading States
  holidaysLoadingState: { alignItems: "center", paddingVertical: 48 },
  holidaysLoadingText: { fontSize: 14, color: "#64748b", marginTop: 12 },
  holidaysEmptyState: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 20 },
  holidaysEmptyStateIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  holidaysEmptyStateTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  holidaysEmptyStateSubtitle: { fontSize: 13, color: "#9ca3af", marginTop: 6, textAlign: "center" },

  // New Styles for UI Update
  sectionHeaderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 },
  sectionHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f5f3ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  manageBtnText: { fontSize: 13, fontWeight: '600', color: '#7c3aed' },

  nextHolidayCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 24, shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 10 },
  nextHolidayGradient: { padding: 20, position: 'relative', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  nextHolidayContent: { flexDirection: 'row', alignItems: 'center', gap: 16, zIndex: 2 },
  nextHolidayIconContainer: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  nextHolidayInfo: { flex: 1 },
  nextHolidayLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  nextHolidayName: { fontSize: 19, fontWeight: '800', color: '#fff' },
  nextHolidayDate: { fontSize: 13, color: 'rgba(255,255,255,0.95)', marginTop: 3, fontWeight: '500' },
  nextHolidayArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  decorativeCircle1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)', top: -30, right: -30, zIndex: 1 },
  decorativeCircle2: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -15, left: 30, zIndex: 1 },

  // Modal Add Form
  modalAddForm: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  modalSectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 },
  modalFormRow: { flexDirection: 'row', gap: 10 },
  modalDateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  modalDateText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  modalNameInput: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
  modalAddBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },

  holidayListContainer: { gap: 12 },
  holidayListItem: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden" },
  holidayListItemContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  holidayListItemInfo: { flex: 1 },
  holidayListItemName: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 4 },
  holidayListItemDate: { fontSize: 13, color: "#64748b" },
  holidayListItemActions: { flexDirection: "row", gap: 8 },
  holidayEditBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center" },
  holidayDeleteBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" },

  holidayEditForm: { padding: 16, backgroundColor: "#f8fafc" },
  editFormGroup: { marginBottom: 16 },
  editFormLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  editFormInput: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 10, padding: 12, fontSize: 14, color: "#1e293b" },
  editDateBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 10, padding: 12, gap: 10 },
  editDateBtnText: { fontSize: 14, color: "#1e293b", fontWeight: "500" },
  editFormActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  editCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#f1f5f9", alignItems: "center" },
  editCancelBtnText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  editSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#7c3aed", alignItems: "center" },
  editSaveBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  // New Styles for Approvals UI
  statsScrollContainer: { minHeight: 120, marginBottom: 20 },
  statsScrollContent: { paddingRight: 20, gap: 12 },
  statCardModern: { width: 140, height: 100, backgroundColor: '#fff', borderRadius: 16, padding: 16, justifyContent: 'space-between', marginRight: 4, borderWidth: 1, borderColor: '#f1f5f9' },
  shadowSm: { shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  statIconContainer: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValueModern: { fontSize: 24, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  statLabelModern: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  sectionHeaderSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  refreshIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },

  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyStateImage: { width: 120, height: 120, marginBottom: 24, opacity: 0.8 },

  requestsList: { gap: 16, paddingBottom: 40 },
  requestCardModern: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, overflow: 'hidden' },
  requestCardPendingBorder: { borderColor: '#fed7aa', borderWidth: 1 },

  reqCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  userInfoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  userAvatarLarge: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  userAvatarPlaceholderLarge: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  userAvatarInitials: { fontSize: 18, fontWeight: '700', color: '#64748b' },
  userDetails: { flex: 1 },
  userNameText: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  userRoleText: { fontSize: 12, color: '#64748b', marginTop: 2 },

  statusTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6 },
  statusTagText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  statusDotPulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ea580c' },

  cardDivider: { height: 1, backgroundColor: '#f8fafc', width: '100%' },

  reqCardBody: { padding: 16 },
  reqMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  reqTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, backgroundColor: '#fff' },
  reqTypeDot: { width: 6, height: 6, borderRadius: 3 },
  reqTypeText: { fontSize: 12, fontWeight: '600' },
  reqDaysText: { fontSize: 13, fontWeight: '600', color: '#64748b' },

  reqTimelineContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 16 },
  reqTimelineItem: { alignItems: 'center', flex: 1 },
  reqTimelineLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  reqTimelineDate: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  reqTimelineDay: { fontSize: 11, color: '#64748b', marginTop: 2 },
  reqTimelineConnector: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  reqTimelineLine: { width: 10, height: 1, backgroundColor: '#cbd5e1' },

  reqReasonBox: { backgroundColor: '#fdfbf7', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#fef3c7' },
  reqReasonLabel: { fontSize: 11, fontWeight: '600', color: '#d97706', marginBottom: 4 },
  reqReasonText: { fontSize: 13, color: '#4b5563', lineHeight: 20 },

  reqCardActions: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 0, gap: 12 },
  actionBtnModern: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 8 },
  rejectBtnModern: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#fee2e2' },
  rejectBtnTextModern: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
  approveBtnModern: { borderRadius: 14, overflow: 'hidden' },
  approveBtnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, width: '100%' },
  approveBtnTextModern: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Fixed Layout Stats Styles
  statsRowContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 24, paddingHorizontal: 4 },
  statCardFixed: { flex: 1, height: 110, borderRadius: 20, padding: 16, justifyContent: 'space-between', borderWidth: 1 },
  // Config Card Styles
  // Config Card Styles
  configCard: { backgroundColor: '#fff', borderRadius: 20, padding: 0, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  configHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  configIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
  configHeaderText: { flex: 1 },
  configTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  configSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 16 },
  expandIndicator: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e2e8f0" },

  configBody: { padding: 20, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 0 },

  allocationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20, marginTop: 16 },
  allocationItem: { flex: 1, minWidth: '45%' },
  allocationLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  allocationInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 44 },
  allocationInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1e293b', paddingVertical: 0 },
  numberControls: { marginLeft: 8, alignItems: 'center', opacity: 0.5 },
  allocationHelperText: { fontSize: 10, color: '#94a3b8', marginTop: 4 },

  infoBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#dbeafe' },
  infoBoxText: { fontSize: 12, color: '#1e40af', lineHeight: 18 },

  saveConfigBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 16 },
  saveConfigGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 14, gap: 8, width: '100%' },
  saveConfigText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  saveConfigHint: { fontSize: 12, color: '#94a3b8' },

  weekDaysContainer: { marginTop: 12, gap: 10 },
  weekDaysRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  weekDayButton: { flex: 1, position: 'relative' },
  weekDayButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  weekDayButtonActive: {},
  weekDayButtonText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  weekDayButtonBadge: { position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  weekDayButtonPlaceholder: { flex: 1 },

  // Department Dropdown Styles
  deptSelectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  deptSelectInputActive: { backgroundColor: '#f0f9ff', borderColor: '#0284c7', borderWidth: 2 },
  deptSelectContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  deptSelectIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  deptSelectTextContainer: { flex: 1 },
  deptSelectLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '500', marginBottom: 2 },
  deptSelectValue: { fontSize: 14, color: '#1e293b', fontWeight: '700' },

  // Department Dropdown - Same as Reports (Top-to-Bottom)
  deptDropdownAbsoluteOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)"
  },
  deptDropdownAbsolutePopup: {
    position: "absolute",
    top: 180,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 14,
    maxHeight: 280,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: "hidden",
    zIndex: 1000,
    borderWidth: 1,
    borderColor: "rgba(2, 132, 199, 0.1)"
  },
  deptDropdownPopupOption: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
    minHeight: 46,
    backgroundColor: "#fff"
  },
  deptDropdownPopupOptionSelected: {
    backgroundColor: "#f0f9ff",
    borderLeftWidth: 3,
    borderLeftColor: "#0284c7",
    paddingLeft: 11
  },
  deptDropdownPopupOptionText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flex: 1
  },
  deptDropdownPopupOptionTextActive: {
    color: "#0284c7",
    fontWeight: "700"
  },
  helperTextSmall: { fontSize: 11, color: '#94a3b8', marginTop: 8 },
  helperTextContainer: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 12 },

  // Overlap Warning Styles
  overlapWarningBox: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1.5, borderColor: '#fecaca', gap: 8 },
  overlapWarningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overlapWarningTitle: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  overlapWarningText: { fontSize: 12, color: '#991b1b', lineHeight: 18 },

  weekOffActionContainer: { marginTop: 20, gap: 12 },
  saveWeekOffBtnNew: { borderRadius: 14, overflow: 'hidden', shadowColor: '#0284c7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveWeekOffBtnDisabled: { opacity: 0.6, shadowOpacity: 0.1 },
  saveWeekOffGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, width: '100%' },
  saveWeekOffContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  saveWeekOffText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  saveWeekOffBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  saveWeekOffBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  weekOffSummaryBox: { backgroundColor: '#f0f9ff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#bfdbfe', gap: 10 },
  weekOffSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekOffSummaryTitle: { fontSize: 13, fontWeight: '700', color: '#0284c7' },
  weekOffSummaryDays: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weekOffSummaryDay: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  weekOffSummaryDayText: { fontSize: 12, fontWeight: '600', color: '#0284c7' },
  weekOffSummaryEmpty: { fontSize: 12, color: '#64748b', fontStyle: 'italic' },

  activeRulesContainer: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  activeRulesTitle: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4 },
  activeRulesEmpty: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },

  // New UI Styles
  balanceCardsScroll: { gap: 12, paddingHorizontal: 4, paddingBottom: 10 },
  balanceCardNew: { width: SCREEN_WIDTH * 0.45, borderRadius: 16, padding: 16, justifyContent: 'space-between', height: 110, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  balanceCardTitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500', marginBottom: 4 },
  balanceCardValue: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 2 },
  balanceCardSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  balanceCardIcon: { position: 'absolute', right: 12, top: 12, opacity: 0.8 },

  // Balance Stats Section (New Design)
  balanceStatsSection: { marginBottom: 28, paddingHorizontal: 4 },
  balanceStatsHeader: { marginBottom: 16 },
  balanceStatsTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  balanceStatsSubtitle: { fontSize: 13, color: '#64748b' },
  balanceStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  balanceStatCard: { flex: 1, minWidth: '48%', backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  balanceStatCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  balanceStatIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  balanceStatInfo: { flex: 1 },
  balanceStatLabel: { fontSize: 11, color: '#64748b', fontWeight: '500', marginBottom: 1 },
  balanceStatValue: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  balanceStatProgressContainer: { gap: 6 },
  balanceStatProgressBg: { height: 5, backgroundColor: '#f1f5f9', borderRadius: 2.5, overflow: 'hidden' },
  balanceStatProgressBar: { height: '100%', borderRadius: 2.5 },
  balanceStatProgressText: { fontSize: 10, color: '#64748b', fontWeight: '500' },
  balanceStatProgressTextSmall: { fontSize: 11, color: '#64748b', fontWeight: '500' },

  requestCardNew: { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: "#f1f5f9" },
  requestCardHeaderNew: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestCardTitleNew: { fontSize: 19, fontWeight: "700", color: "#fff" },

  infoNoteBox: { backgroundColor: '#eff6ff', marginHorizontal: 16, marginTop: 12, marginBottom: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe', flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoNoteText: { fontSize: 13, color: '#1e40af', lineHeight: 18, flex: 1 },

  validationRulesBox: { backgroundColor: '#f5f3ff', marginBottom: 16, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd6fe' },
  validationRulesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  validationRulesTitle: { fontSize: 13, fontWeight: '600', color: '#7c3aed' },
  validationRulesList: { gap: 6 },
  validationRuleItem: { fontSize: 12, color: '#6d28d9', lineHeight: 16 },

  selectInputNew: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'space-between', minHeight: 50 },

  dateRowNew: { flexDirection: 'row', alignItems: 'stretch', gap: 12, minHeight: 90 },
  dateInputNew: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  dateInputValueNew: { fontSize: 15, color: '#1e293b', fontWeight: '600' },
  dateToText: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  textAreaNew: { backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 14, padding: 14, fontSize: 15, color: "#1e293b", minHeight: 120, textAlignVertical: "top" },

  submitBtnNew: { borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 0, gap: 0, marginTop: 10, overflow: 'hidden' },
  submitBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8, width: '100%' },

  // Edit Mode Styles
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  submitBtnNewFlex: { flex: 1 },
  cancelBtnNew: { flex: 1, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: 'transparent', elevation: 0, flexDirection: 'row', gap: 6 },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#64748b' },

  // Enhanced Request Card Styles
  requestCardHeaderGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  requestCardSubtitleNew: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Enhanced Date Input Styles
  dateInputLabelNew: { fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  dateConnectorNew: { alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, paddingHorizontal: 4 },

  // Character Count
  charCountText: { fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'right' },

  // View All Header Button
  viewAllHeaderBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 4, borderWidth: 1, borderColor: '#ede9fe' },
  viewAllHeaderBtnText: { fontSize: 13, fontWeight: '600', color: '#7c3aed' },

  // View All History Modal Styles
  viewAllHistoryModalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  viewAllHistoryModalHeader: { paddingTop: 12, paddingBottom: 20, paddingHorizontal: 20 },
  viewAllHistoryModalHeaderContent: { flexDirection: 'row', alignItems: 'center' },
  viewAllHistoryModalBackBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  viewAllHistoryModalHeaderText: { flex: 1, marginLeft: 12 },
  viewAllHistoryModalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  viewAllHistoryModalSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  viewAllHistoryModalFilterBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  viewAllHistoryModalHeaderSpacer: { width: 40 },

  // View All History Stats Row
  viewAllHistoryStatsRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  viewAllHistoryStat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, gap: 6 },
  viewAllHistoryStatValue: { fontSize: 16, fontWeight: '700' },
  viewAllHistoryStatLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },

  // View All History List
  viewAllHistoryList: { padding: 20, paddingBottom: 40 },
  viewAllHistoryItem: { marginBottom: 4 },

  // View All History Empty State
  viewAllHistoryEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  viewAllHistoryEmptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  viewAllHistoryEmptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  viewAllHistoryEmptySubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});
