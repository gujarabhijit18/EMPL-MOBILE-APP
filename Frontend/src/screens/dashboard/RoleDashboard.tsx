// 📂 src/screens/dashboard/RoleDashboard.tsx
import {
  Search,
  X,
  LayoutDashboard,
  Calendar,
  Plane,
  CheckSquare,
  Users,
  Building2,
  UserPlus,
  BarChart3,
  Clock,
  UserCircle,
  CalendarRange,
  MessageSquare,
  Wallet,
  Settings,
  ArrowRight,
  LogOut,
  HelpCircle,
  ChevronRight,
  Fingerprint
} from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  View,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, UserRole } from "../../contexts/AuthContext";
import { useModuleBadges, ModuleType } from "../../contexts/ModuleBadgeContext";
import { apiService, Employee } from "../../lib/api";
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
  Gradients,
  getStatusBadgeStyle
} from "../../constants/designSystem";

const { width } = Dimensions.get("window");
const GAP = 12;
const PADDING = 20;
const CARD_WIDTH = (width - (PADDING * 2) - (GAP * 2)) / 3;

interface FeatureItem {
  id: string;
  icon: string;
  iconType: "lucide";
  label: string;
  route: string;
  gradient: string[];
  iconBg: string;
  roles: UserRole[];
}

const allFeatures: FeatureItem[] = [
  {
    id: "home",
    icon: "LayoutDashboard",
    iconType: "lucide",
    label: "Dashboard",
    route: "HomeDashboard",
    gradient: Gradients.primary as unknown as string[],
    iconBg: Colors.primaryLighter,
    roles: ["admin", "hr", "manager", "team_lead", "employee"],
  },
  {
    id: "attendance",
    icon: "Clock",
    iconType: "lucide",
    label: "Attendance",
    route: "Attendance",
    gradient: Gradients.success as unknown as string[],
    iconBg: Colors.successLighter,
    roles: ["admin", "hr", "manager", "team_lead", "employee"],
  },
  {
    id: "leaves",
    icon: "Plane",
    iconType: "lucide",
    label: "Leave",
    route: "Leaves",
    gradient: Gradients.warning as unknown as string[],
    iconBg: Colors.warningLighter,
    roles: ["admin", "hr", "manager", "team_lead", "employee"],
  },
  {
    id: "tasks",
    icon: "CheckSquare",
    iconType: "lucide",
    label: "Tasks",
    route: "Tasks",
    gradient: Gradients.purple as unknown as string[],
    iconBg: Colors.purpleLighter,
    roles: ["admin", "hr", "manager", "team_lead", "employee"],
  },
  {
    id: "employees",
    icon: "Users",
    iconType: "lucide",
    label: "Employees",
    route: "Employees",
    gradient: Gradients.primary as unknown as string[],
    iconBg: Colors.primaryLighter,
    roles: ["admin", "hr"],
  },
  {
    id: "departments",
    icon: "Building2",
    iconType: "lucide",
    label: "Department",
    route: "Departments",
    gradient: ["#ec4899", "#db2777"],
    iconBg: "#fdf2f8",
    roles: ["admin"],
  },
  {
    id: "hiring",
    icon: "UserPlus",
    iconType: "lucide",
    label: "Hiring",
    route: "Hiring",
    gradient: ["#14b8a6", "#0d9488"],
    iconBg: "#f0fdfa",
    roles: ["admin", "hr"],
  },
  {
    id: "reports",
    icon: "BarChart3",
    iconType: "lucide",
    label: "Reports",
    route: "Reports",
    gradient: ["#64748b", "#475569"],
    iconBg: "#f8fafc",
    roles: ["admin"],
  },
  {
    id: "shifts",
    icon: "Clock",
    iconType: "lucide",
    label: "Shifts",
    route: "Shifts",
    gradient: Gradients.info as unknown as string[],
    iconBg: Colors.infoLighter,
    roles: ["manager"],
  },
  {
    id: "teamshifts",
    icon: "CalendarRange",
    iconType: "lucide",
    label: "My Shifts",
    route: "TeamShifts",
    gradient: Gradients.info as unknown as string[],
    iconBg: Colors.infoLighter,
    roles: ["employee"],
  },
  {
    id: "chat",
    icon: "MessageSquare",
    iconType: "lucide",
    label: "Chat",
    route: "ChatList",
    gradient: Gradients.primary as unknown as string[],
    iconBg: Colors.primaryLighter,
    roles: ["admin", "hr", "manager", "team_lead", "employee"],
  },
  {
    id: "payroll",
    icon: "Wallet",
    iconType: "lucide",
    label: "Payroll",
    route: "Payroll",
    gradient: Gradients.purple as unknown as string[],
    iconBg: Colors.purpleLighter,
    roles: ["admin", "hr", "employee"],
  },
  {
    id: "settings",
    icon: "Settings",
    iconType: "lucide",
    label: "Settings",
    route: "Settings",
    gradient: ["#475569", "#334155"],
    iconBg: "#f8fafc",
    roles: ["admin", "hr", "manager", "team_lead", "employee"],
  },
];

const RoleDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const role = user?.role || "employee";
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const features = allFeatures.filter((f) => f.roles.includes(role));
  const { badges, refreshBadgesFromAPI, resetBadge } = useModuleBadges();

  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  // Search & Profile States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeTasks, setEmployeeTasks] = useState<any[]>([]);
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getDashboardByRole(role);
      setDashboardData(data);
    } catch (error) {
      console.log("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useFocusEffect(
    useCallback(() => {
      refreshBadgesFromAPI();
    }, [refreshBadgesFromAPI])
  );

  const toggleProfileMenu = () => {
    if (isProfileMenuVisible) {
      Animated.timing(dropdownAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }).start(() => setIsProfileMenuVisible(false));
    } else {
      setIsProfileMenuVisible(true);
      Animated.timing(dropdownAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }).start();
    }
  };

  const menuScale = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const menuOpacity = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const menuTranslateY = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const employees = await apiService.getEmployees();
      const filtered = employees.filter((emp: Employee) => {
        const q = query.toLowerCase();
        return emp.name?.toLowerCase().includes(q) || emp.employee_id?.toLowerCase().includes(q);
      });
      setSearchResults(filtered);
    } catch (error) {
      console.log("Search error:", error);
    }
  }, []);

  const handleEmployeeSelect = async (employee: Employee) => {
    setIsSearching(false);
    setIsLoadingDetails(true);
    setSelectedEmployee(employee);
    setEmployeeTasks([]);
    setEmployeeAttendance([]);

    try {
      // 1. Fetch Tasks
      let tasks: any[] = [];
      try {
        tasks = await apiService.getAllTasks?.() || [];
      } catch (e) {
        console.warn("Falling back to my tasks for detail view");
        tasks = await apiService.getMyTasks?.() || [];
      }

      // 2. Fetch Attendance (try specific endpoint, fallback to general if 404)
      let attendance: any[] = [];
      try {
        // Try to get history for this specific department/user
        attendance = await apiService.getAttendanceHistory?.({ department: employee.department }) || [];
      } catch (e: any) {
        console.warn("Attendance history 404/fail, falling back to all records");
        try {
          attendance = await apiService.getAllAttendance?.() || [];
        } catch (innerE) {
          attendance = [];
        }
      }

      // Filter tasks for this employee (handling both string/number IDs)
      const filteredTasks = Array.isArray(tasks)
        ? tasks.filter((t: any) => String(t.assigned_to) === String(employee.id) || String(t.user_id) === String(employee.id))
        : [];

      // Filter attendance for this employee
      const filteredAttendance = Array.isArray(attendance)
        ? attendance.filter((a: any) => String(a.user_id) === String(employee.id) || String(a.employee_id) === String(employee.employee_id))
        : [];

      setEmployeeTasks(filteredTasks);
      setEmployeeAttendance(filteredAttendance);
    } catch (e) {
      console.log("Error details logic:", e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef<Animated.Value[]>([]);

  // Initialize animations if they don't exist or length mismatch
  if (cardAnims.current.length !== features.length) {
    cardAnims.current = features.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    cardAnims.current.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 200 + index * 100,
        useNativeDriver: true,
      }).start();
    });
  }, [features.length]);

  const handleFeaturePress = (route: string, featureId: string) => {
    navigation.navigate(route);
    const moduleType = featureToModule[featureId];
    if (moduleType) resetBadge(moduleType);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to exit?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const featureToModule: Record<string, ModuleType> = {
    "home": "home",
    "attendance": "attendance",
    "leaves": "leaves",
    "tasks": "tasks",
    "employees": "employees",
    "chat": "chat",
    "payroll": "payroll",
  };

  const renderFeatureCard = (feature: FeatureItem, index: number) => {
    const animValue = cardAnims.current[index] || new Animated.Value(1);
    const moduleType = featureToModule[feature.id];
    const count = moduleType ? badges[moduleType] : 0;

    // Safety check for icon
    const Icons = require("lucide-react-native");
    const LucideIcon = Icons[feature.icon];

    // Use gradient for icon background
    const iconColors = feature.gradient;

    return (
      <Animated.View
        key={feature.id}
        style={[
          styles.featureCardWrapper,
          {
            opacity: animValue,
            transform: [{ scale: animValue }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => handleFeaturePress(feature.route, feature.id)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={iconColors as any}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {LucideIcon && <LucideIcon size={32} color="#fff" strokeWidth={2.5} />}
            {count > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{count > 9 ? "9+" : count}</Text>
              </View>
            )}
          </LinearGradient>

          <Text style={styles.featureLabel} numberOfLines={1}>{feature.label}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };



  if (selectedEmployee) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.detailsHeader}>
          <TouchableOpacity onPress={() => setSelectedEmployee(null)} style={styles.backButton}>
            <View style={{ transform: [{ rotate: "180deg" }] }}>
              <ChevronRight size={24} color={Colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.detailsHeaderTitle}>Profile Overview</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.detailsScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.employeeMainCard}>
            <LinearGradient colors={Gradients.primary} style={styles.employeeCardGradient} />
            <View style={styles.employeeCardContent}>
              <View style={styles.employeeAvatarContainer}>
                {selectedEmployee.profile_photo ? (
                  <Image source={{ uri: selectedEmployee.profile_photo }} style={styles.employeeAvatarLarge} />
                ) : (
                  <View style={[styles.employeeAvatarLarge, { backgroundColor: Colors.surface }]}>
                    <Text style={[styles.avatarTextLarge, { color: Colors.primary }]}>{selectedEmployee.name.charAt(0)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.employeeNameLarge}>{selectedEmployee.name}</Text>
              <Text style={styles.employeeIdBadge}>{selectedEmployee.employee_id}</Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>{selectedEmployee.designation}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <View style={styles.sectionHeaderCompact}>
              <Text style={styles.sectionTitleSmall}>Active Tasks</Text>
              <Text style={styles.sectionBadge}>{employeeTasks.length}</Text>
            </View>
            {isLoadingDetails ? (
              <Text style={styles.loadingTextMini}>Loading tasks...</Text>
            ) : employeeTasks.length > 0 ? (
              employeeTasks.slice(0, 3).map((task, idx) => (
                <View key={task.id || `task-${idx}`} style={styles.taskListItemMini}>
                  <View style={[styles.taskStatusDot, { backgroundColor: task.status === 'Completed' ? Colors.success : Colors.warning }]} />
                  <Text style={styles.taskListTitleMini} numberOfLines={1}>{task.title}</Text>
                  <Text style={styles.taskListTimeMini}>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyTextMini}>No tasks assigned</Text>
            )}
          </View>

          <View style={styles.detailsSection}>
            <View style={styles.sectionHeaderCompact}>
              <Text style={styles.sectionTitleSmall}>Recent Attendance</Text>
              <Text style={styles.sectionBadge}>{employeeAttendance.length}</Text>
            </View>
            {isLoadingDetails ? (
              <Text style={styles.loadingTextMini}>Loading records...</Text>
            ) : employeeAttendance.length > 0 ? (
              employeeAttendance.slice(0, 3).map((record, idx) => (
                <View key={record.attendance_id || `attn-${idx}`} style={styles.attendanceRowMini}>
                  <Clock size={12} color={Colors.textTertiary} />
                  <Text style={styles.attnDateMini}>{record.check_in ? new Date(record.check_in).toLocaleDateString() : 'N/A'}</Text>
                  <View style={[styles.statusBadgeSmall, { backgroundColor: record.status === 'Present' ? Colors.successLighter : Colors.errorLighter }]}>
                    <Text style={[styles.statusTextSmall, { color: record.status === 'Present' ? Colors.success : Colors.error }]}>{record.status}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyTextMini}>No attendance records found</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={toggleProfileMenu} style={styles.profileButton} activeOpacity={0.8}>
            <View style={styles.avatarContainer}>
              {user?.profile_photo ? (
                <Image source={{ uri: user.profile_photo }} style={styles.avatarImage} />
              ) : (
                <LinearGradient colors={Gradients.primary} style={styles.avatarGradient}>
                  <Text style={styles.avatarText}>{(user?.name || "U")[0].toUpperCase()}</Text>
                </LinearGradient>
              )}
              {/* Online Status Indicator */}
              <View style={styles.onlineStatusDot} />
            </View>
          </TouchableOpacity>
          <View style={styles.brandInfo}>
            <Text style={styles.brandName}>Shekru Labs</Text>
            <Text style={styles.brandTagline}>HR Management</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setIsSearching(true)}>
            <Search size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { marginLeft: 10 }]}
            onPress={() => navigation.navigate("HelpSupport")}
          >
            <HelpCircle size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <Modal visible={isProfileMenuVisible} transparent animationType="none">
          <TouchableWithoutFeedback onPress={toggleProfileMenu}>
            <View style={styles.modalOverlay}>
              <Animated.View style={[styles.dropdownMenu, { opacity: menuOpacity, transform: [{ scale: menuScale }, { translateY: menuTranslateY }] }]}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuUserName}>{user?.name}</Text>
                  <Text style={styles.menuUserEmail}>{user?.email}</Text>
                </View>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={() => { toggleProfileMenu(); navigation.navigate("Profile"); }}>
                  <UserCircle size={20} color={Colors.textSecondary} />
                  <Text style={styles.menuItemText}>My Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <LogOut size={20} color={Colors.error} />
                  <Text style={[styles.menuItemText, { color: Colors.error }]}>Sign Out</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </Animated.View>

      <Modal visible={isSearching} transparent animationType="slide">
        <View style={styles.searchModalOverlay}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.searchHeader}>
              <TouchableOpacity onPress={() => setIsSearching(false)} style={styles.backButton}>
                <View style={{ transform: [{ rotate: "180deg" }] }}>
                  <ChevronRight size={24} color={Colors.text} />
                </View>
              </TouchableOpacity>
              <View style={styles.searchInputContainer}>
                <Search size={18} color={Colors.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search staff..."
                  autoFocus
                  value={searchQuery}
                  onChangeText={handleSearch}
                />
              </View>
            </View>
            <ScrollView contentContainerStyle={styles.searchResultsContainer}>
              {searchResults.length > 0 ? (
                searchResults.map(emp => (
                  <TouchableOpacity key={emp.id || emp.employee_id} style={styles.searchResultItem} onPress={() => handleEmployeeSelect(emp)}>
                    <View style={styles.searchResultAvatar}>
                      <Text style={styles.searchResultText}>{emp.name?.[0] || '?'}</Text>
                    </View>
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>{emp.name}</Text>
                      <Text style={styles.searchResultDept}>{emp.department}</Text>
                    </View>
                    <ChevronRight size={18} color={Colors.border} />
                  </TouchableOpacity>
                ))
              ) : searchQuery.trim() !== "" ? (
                <View style={styles.emptySearchContainer}>
                  <Users size={48} color={Colors.border} />
                  <Text style={styles.emptySearchText}>No employees found for "{searchQuery}"</Text>
                </View>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.welcomeGreeting}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{user?.name?.split(' ')[0]} 👋</Text>
          </View>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>{role.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Modules</Text>
        </View>

        <View style={styles.featuresGrid}>
          {features.map((f, i) => renderFeatureCard(f, i))}
        </View>

        {/* Quick Actions for non-admin */}
        {(role === 'employee' || role === 'manager') && (
          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate("Attendance")}
              >
                <LinearGradient colors={Gradients.success} style={styles.quickActionIcon}>
                  <Fingerprint size={20} color="#fff" />
                </LinearGradient>
                <Text style={styles.quickActionLabel}>Check In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate("Leaves")}
              >
                <LinearGradient colors={Gradients.warning} style={styles.quickActionIcon}>
                  <Calendar size={20} color="#fff" />
                </LinearGradient>
                <Text style={styles.quickActionLabel}>Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.footerLogout} onPress={handleLogout}>
          <LogOut size={20} color={Colors.textTertiary} />
          <Text style={styles.footerLogoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: 15,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  profileButton: { marginRight: 4 },
  brandInfo: { marginLeft: 12 },
  brandName: { fontSize: 18, fontWeight: "800", color: Colors.text },
  brandTagline: { fontSize: 10, color: Colors.textTertiary, fontWeight: "600", textTransform: "uppercase" },
  headerRight: { flexDirection: "row" },
  iconButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Colors.borderLight },
  avatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    padding: 2,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    ...(Shadows.card || {}),
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 21 },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  onlineStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  dropdownMenu: { position: "absolute", top: 100, left: 20, width: 240, backgroundColor: Colors.surface, borderRadius: 24, padding: 8, ...(Shadows.modal || {}) },
  menuHeader: { padding: 16 },
  menuUserName: { fontSize: 16, fontWeight: "800", color: Colors.text },
  menuUserEmail: { fontSize: 12, color: Colors.textSecondary },
  menuDivider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: 16 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  menuItemText: { fontSize: 14, fontWeight: "600", color: Colors.text },
  welcomeSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.xl },
  welcomeGreeting: { fontSize: 14, color: Colors.textSecondary },
  welcomeName: { fontSize: 26, fontWeight: "900", color: Colors.text, marginTop: 2 },
  statsContainer: { marginBottom: 24 },
  statsScroll: { paddingHorizontal: Spacing.xl, gap: 12 },
  statCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, borderRadius: 20, minWidth: 140, ...(Shadows.card || {}) },
  statIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  sectionHeader: { paddingHorizontal: Spacing.xl, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  featuresGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 12 },
  featureCardWrapper: { width: CARD_WIDTH, alignItems: "center" },
  featureCard: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    ...(Shadows.card || {})
  },
  featureLabel: { fontSize: 13, fontWeight: "600", color: Colors.text, textAlign: 'center', width: '100%' },
  notificationBadge: { position: "absolute", top: -4, right: -4, backgroundColor: Colors.error, borderRadius: 10, minWidth: 18, height: 18, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: Colors.surface },
  notificationText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  footerLogout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 8 },
  footerLogoutText: { fontSize: 14, color: Colors.textTertiary, fontWeight: '600' },
  detailsHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  detailsHeaderTitle: { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center', color: Colors.text },
  backButton: { padding: 8 },
  employeeMainCard: { margin: Spacing.xl, borderRadius: 30, overflow: 'hidden', backgroundColor: Colors.surface, ...(Shadows.card || {}) },
  employeeCardGradient: { height: 80, width: '100%' },
  employeeCardContent: { alignItems: 'center', paddingBottom: 20, marginTop: -40 },
  employeeAvatarContainer: { width: 80, height: 80, borderRadius: 25, backgroundColor: Colors.surface, padding: 4, ...(Shadows.card || {}) },
  employeeAvatarLarge: { width: '100%', height: '100%', borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarTextLarge: { fontSize: 30, fontWeight: '800' },
  employeeNameLarge: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 12 },
  employeeIdBadge: { fontSize: 12, color: Colors.textTertiary },
  roleTag: { backgroundColor: Colors.primaryLighter, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  roleTagText: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  detailsSection: { paddingHorizontal: Spacing.xl, marginBottom: 20 },
  sectionTitleSmall: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  infoGridCompact: { flexDirection: 'row', gap: 10 },
  infoBox: { flex: 1, backgroundColor: Colors.surface, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderLight },
  infoLabelSmall: { fontSize: 9, color: Colors.textTertiary, fontWeight: '700', textTransform: 'uppercase' },
  infoValueSmall: { fontSize: 13, fontWeight: '700', color: Colors.text },
  searchModalOverlay: { flex: 1, backgroundColor: Colors.surface },
  searchHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, marginLeft: 10, paddingHorizontal: 12, borderRadius: 12, height: 40 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: Colors.text },
  searchResultsContainer: { padding: 15 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  searchResultAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primaryLighter, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  searchResultText: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  searchResultInfo: { flex: 1 },
  searchResultName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  searchResultDept: { fontSize: 12, color: Colors.textSecondary },
  scrollContent: { paddingBottom: 100 },
  detailsScrollView: { flex: 1 },
  quickActionsContainer: { paddingHorizontal: Spacing.xl, marginTop: 24 },
  quickActionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  quickActionButton: { flex: 1, backgroundColor: Colors.surface, padding: 16, borderRadius: 20, alignItems: 'center', ...(Shadows.card || {}) },
  quickActionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionLabel: { fontSize: 12, fontWeight: '700', color: Colors.text },
  sectionHeaderCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionBadge: { backgroundColor: Colors.borderLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
  loadingTextMini: { fontSize: 12, color: Colors.textTertiary, fontStyle: 'italic', paddingVertical: 10 },
  emptyTextMini: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center', paddingVertical: 15, backgroundColor: Colors.background, borderRadius: 12 },
  taskListItemMini: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 10 },
  taskStatusDot: { width: 8, height: 8, borderRadius: 4 },
  taskListTitleMini: { flex: 1, fontSize: 13, color: Colors.text, fontWeight: '600' },
  taskListTimeMini: { fontSize: 11, color: Colors.textTertiary },
  attendanceRowMini: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 10 },
  attnDateMini: { flex: 1, fontSize: 13, color: Colors.text },
  statusBadgeSmall: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusTextSmall: { fontSize: 10, fontWeight: '700' },
  emptySearchContainer: { alignItems: 'center', marginTop: 100, gap: 16 },
  emptySearchText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
});

export default RoleDashboard;
