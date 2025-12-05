// 📂 src/screens/dashboard/RoleDashboard.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, UserRole } from "../../contexts/AuthContext";
import { apiService, Employee } from "../../lib/api";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 60) / 3;

// Feature configuration based on roles
interface FeatureItem {
  id: string;
  icon: string;
  iconType: "ionicons" | "material";
  label: string;
  route: string;
  gradient: string[];
  iconBg: string;
  roles: UserRole[];
}

const allFeatures: FeatureItem[] = [
  {
    id: "home",
    icon: "home",
    iconType: "ionicons",
    label: "Home",
    route: "HomeDashboard",
    gradient: ["#3b82f6", "#1d4ed8"],
    iconBg: "#eff6ff",
    roles: ["admin", "hr", "manager", "team_lead", "employee"],
  },
  {
    id: "attendance",
    icon: "calendar",
    iconType: "ionicons",
    label: "Attendance",
    route: "Attendance",
    gradient: ["#ef4444", "#dc2626"],
    iconBg: "#fef2f2",
    roles: ["admin", "hr", "manager", "team_lead", "employee"],
  },
  {
    id: "leaves",
    icon: "airplane",
    iconType: "ionicons",
    label: "Leave",
    route: "Leaves",
    gradient: ["#f97316", "#ea580c"],
    iconBg: "#fff7ed",
    roles: ["admin", "hr", "manager", "team_lead", "employee"],
  },
  {
    id: "tasks",
    icon: "checkbox",
    iconType: "ionicons",
    label: "Tasks",
    route: "Tasks",
    gradient: ["#eab308", "#ca8a04"],
    iconBg: "#fefce8",
    roles: ["admin", "hr", "manager", "team_lead", "employee"],
  },
  {
    id: "employees",
    icon: "people",
    iconType: "ionicons",
    label: "Employees",
    route: "Employees",
    gradient: ["#8b5cf6", "#7c3aed"],
    iconBg: "#f5f3ff",
    roles: ["admin", "hr"],
  },
  {
    id: "departments",
    icon: "business",
    iconType: "ionicons",
    label: "Department",
    route: "Departments",
    gradient: ["#ec4899", "#db2777"],
    iconBg: "#fdf2f8",
    roles: ["admin"],
  },
  {
    id: "hiring",
    icon: "person-add",
    iconType: "ionicons",
    label: "Hiring",
    route: "Hiring",
    gradient: ["#14b8a6", "#0d9488"],
    iconBg: "#f0fdfa",
    roles: ["admin", "hr"],
  },
  {
    id: "reports",
    icon: "bar-chart",
    iconType: "ionicons",
    label: "Reports",
    route: "Reports",
    gradient: ["#6366f1", "#4f46e5"],
    iconBg: "#eef2ff",
    roles: ["admin", "hr", "manager", "team_lead"],
  },
  {
    id: "shifts",
    icon: "time",
    iconType: "ionicons",
    label: "Shifts",
    route: "Shifts",
    gradient: ["#10b981", "#059669"],
    iconBg: "#ecfdf5",
    roles: ["manager"],
  },
  {
    id: "teams",
    icon: "people-circle",
    iconType: "ionicons",
    label: "Teams",
    route: "Teams",
    gradient: ["#f59e0b", "#d97706"],
    iconBg: "#fffbeb",
    roles: ["manager", "team_lead"],
  },
  {
    id: "teamshifts",
    icon: "calendar-outline",
    iconType: "ionicons",
    label: "My Shifts",
    route: "TeamShifts",
    gradient: ["#06b6d4", "#0891b2"],
    iconBg: "#ecfeff",
    roles: ["team_lead", "employee"],
  },
  {
    id: "profile",
    icon: "person-circle",
    iconType: "ionicons",
    label: "Profile",
    route: "Profile",
    gradient: ["#8b5cf6", "#7c3aed"],
    iconBg: "#f5f3ff",
    roles: ["admin", "hr", "manager", "team_lead", "employee"],
  },
  {
    id: "settings",
    icon: "settings-sharp",
    iconType: "ionicons",
    label: "Settings",
    route: "Settings",
    gradient: ["#64748b", "#475569"],
    iconBg: "#f8fafc",
    roles: ["admin", "hr", "manager", "team_lead", "employee"],
  },
];

const RoleDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const role = user?.role || "employee";

  // Filter features based on user role
  const features = allFeatures.filter((f) => f.roles.includes(role));

  // Real notification counts from API
  const [notifications, setNotifications] = useState<Record<string, number>>({});
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [employeeTasks, setEmployeeTasks] = useState<any[]>([]);
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Fetch real notification counts from API
  const fetchNotificationCounts = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingNotifications(true);
    const counts: Record<string, number> = {};

    try {
      // Fetch pending tasks assigned to user
      const tasks = await apiService.getMyTasks();
      const pendingTasks = Array.isArray(tasks) 
        ? tasks.filter((t: any) => t.status === "Pending" || t.status === "In Progress").length 
        : 0;
      if (pendingTasks > 0) counts.tasks = pendingTasks;

      // For admin/hr/manager - fetch pending leave approvals
      if (["admin", "hr", "manager"].includes(role)) {
        try {
          const teamLeaves = await apiService.getTeamLeaves(1, 100, "Pending");
          if (teamLeaves.total > 0) counts.leaves = teamLeaves.total;
        } catch (e) {
          console.log("Could not fetch pending leaves:", e);
        }
      }

      // For admin/hr - fetch pending hiring candidates
      if (["admin", "hr"].includes(role)) {
        try {
          const candidates = await apiService.getCandidates(undefined, "Applied");
          const pendingCandidates = Array.isArray(candidates) ? candidates.length : 0;
          if (pendingCandidates > 0) counts.hiring = pendingCandidates;
        } catch (e) {
          console.log("Could not fetch pending candidates:", e);
        }
      }

      setNotifications(counts);
    } catch (error) {
      console.log("Error fetching notification counts:", error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user, role]);

  // Fetch notifications on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchNotificationCounts();
    }, [fetchNotificationCounts])
  );

  // Search employees by name or ID
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const employees = await apiService.getEmployees();
      const filtered = employees.filter((emp: Employee) => {
        const searchLower = query.toLowerCase();
        return (
          emp.name?.toLowerCase().includes(searchLower) ||
          emp.employee_id?.toLowerCase().includes(searchLower)
        );
      });
      setSearchResults(filtered);
      setShowSearchResults(true);
    } catch (error) {
      console.log("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Load employee details, tasks, and attendance
  const loadEmployeeDetails = useCallback(async (employee: Employee) => {
    setIsLoadingDetails(true);
    try {
      setSelectedEmployee(employee);
      setEmployeeDetails(employee);
      
      // Fetch all tasks and filter by employee
      try {
        const allTasks = await apiService.getAllTasks?.();
        const employeeTasks = Array.isArray(allTasks) 
          ? allTasks.filter((t: any) => t.assigned_to === employee.id || t.assigned_to_id === employee.user_id)
          : [];
        setEmployeeTasks(employeeTasks);
      } catch (e) {
        console.log("Could not fetch employee tasks:", e);
        setEmployeeTasks([]);
      }

      // Fetch attendance records
      try {
        const attendance = await apiService.getAttendanceHistory?.({ department: employee.department });
        setEmployeeAttendance(Array.isArray(attendance) ? attendance : []);
      } catch (e) {
        console.log("Could not fetch employee attendance:", e);
        setEmployeeAttendance([]);
      }
    } catch (error) {
      console.log("Error loading employee details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  // Navigate to employee profile
  const handleEmployeeSelect = (employee: Employee) => {
    setShowSearchResults(false);
    loadEmployeeDetails(employee);
  };

  // Close employee details view
  const closeEmployeeDetails = () => {
    setSelectedEmployee(null);
    setEmployeeDetails(null);
    setEmployeeTasks([]);
    setEmployeeAttendance([]);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Animation refs
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(features.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Header animation
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Staggered card animations
    cardAnims.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 300 + index * 80,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }).start();
    });
  }, []);

  const handleFeaturePress = (route: string) => {
    try {
      navigation.navigate(route);
    } catch (e) {
      console.log("Navigation error:", e);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      admin: "Administrator",
      hr: "HR Manager",
      manager: "Manager",
      team_lead: "Team Lead",
      employee: "Employee",
    };
    return labels[role] || "Employee";
  };

  const renderFeatureCard = (feature: FeatureItem, index: number) => {
    const animValue = cardAnims[index] || new Animated.Value(1);
    const notificationCount = notifications[feature.id] || 0;

    return (
      <Animated.View
        key={feature.id}
        style={[
          styles.featureCardWrapper,
          {
            opacity: animValue,
            transform: [
              {
                scale: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              },
              {
                translateY: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => handleFeaturePress(feature.route)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: feature.iconBg }]}>
            {feature.iconType === "ionicons" ? (
              <Ionicons
                name={feature.icon as any}
                size={32}
                color={feature.gradient[0]}
              />
            ) : (
              <MaterialCommunityIcons
                name={feature.icon as any}
                size={32}
                color={feature.gradient[0]}
              />
            )}
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.featureLabel}>{feature.label}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render full-screen employee details
  if (selectedEmployee) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        
        {/* Header with back button */}
        <View style={styles.detailsHeader}>
          <TouchableOpacity onPress={closeEmployeeDetails}>
            <Ionicons name="arrow-back" size={28} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.detailsHeaderTitle}>Employee Details</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.detailsScrollView} showsVerticalScrollIndicator={false}>
          {/* Employee Card */}
          <View style={styles.employeeCard}>
            <View style={styles.employeeCardHeader}>
              {employeeDetails?.profile_photo ? (
                <Image
                  source={{ uri: employeeDetails.profile_photo }}
                  style={styles.employeeCardAvatar}
                />
              ) : (
                <View style={[styles.employeeCardAvatar, { backgroundColor: "#667eea" }]}>
                  <Text style={styles.employeeCardAvatarText}>
                    {employeeDetails?.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.employeeCardInfo}>
                <Text style={styles.employeeCardName}>{employeeDetails?.name}</Text>
                <Text style={styles.employeeCardId}>{employeeDetails?.employee_id}</Text>
                <Text style={styles.employeeCardRole}>{employeeDetails?.designation}</Text>
              </View>
            </View>

            {/* Employee Info Grid */}
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{employeeDetails?.email}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Department</Text>
                <Text style={styles.infoValue}>{employeeDetails?.department}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{employeeDetails?.phone || "N/A"}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={[styles.infoValue, { color: employeeDetails?.is_active ? "#10b981" : "#ef4444" }]}>
                  {employeeDetails?.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
          </View>

          {/* Tasks Section */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsSectionTitle}>Tasks ({employeeTasks.length})</Text>
            {isLoadingDetails ? (
              <Text style={styles.loadingText}>Loading tasks...</Text>
            ) : employeeTasks.length > 0 ? (
              employeeTasks.slice(0, 5).map((task: any, index: number) => (
                <View key={index} style={styles.taskItem}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle}>{task.title || task.name}</Text>
                    <View style={[styles.taskStatus, { backgroundColor: task.status === "Completed" ? "#d1fae5" : "#fef3c7" }]}>
                      <Text style={[styles.taskStatusText, { color: task.status === "Completed" ? "#065f46" : "#92400e" }]}>
                        {task.status}
                      </Text>
                    </View>
                  </View>
                  {task.description && <Text style={styles.taskDescription}>{task.description}</Text>}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No tasks assigned</Text>
            )}
          </View>

          {/* Attendance Section */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsSectionTitle}>Recent Attendance ({employeeAttendance.length})</Text>
            {isLoadingDetails ? (
              <Text style={styles.loadingText}>Loading attendance...</Text>
            ) : employeeAttendance.length > 0 ? (
              employeeAttendance.slice(0, 5).map((record: any, index: number) => (
                <View key={index} style={styles.attendanceItem}>
                  <View style={styles.attendanceRow}>
                    <Text style={styles.attendanceDate}>{record.date || record.check_in_time?.split("T")[0]}</Text>
                    <View style={[styles.attendanceStatus, { backgroundColor: record.status === "Present" ? "#d1fae5" : "#fee2e2" }]}>
                      <Text style={[styles.attendanceStatusText, { color: record.status === "Present" ? "#065f46" : "#991b1b" }]}>
                        {record.status}
                      </Text>
                    </View>
                  </View>
                  {record.check_in_time && <Text style={styles.attendanceTime}>Check-in: {record.check_in_time}</Text>}
                  {record.check_out_time && <Text style={styles.attendanceTime}>Check-out: {record.check_out_time}</Text>}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No attendance records</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            style={styles.logoContainer}
          >
            <Text style={styles.logoText}>S</Text>
          </LinearGradient>
          <View style={styles.brandInfo}>
            <Text style={styles.brandName}>Shekru Labs</Text>
            <Text style={styles.brandTagline}>bringing life to life</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate("Profile")}
          >
            <View style={styles.avatarContainer}>
              {user?.profile_photo ? (
                <Image
                  source={{ uri: user.profile_photo }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {(user?.name || "U").charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => Alert.alert(
              "User Information",
              `Name: ${user?.name || "N/A"}\nEmail: ${user?.email || "N/A"}\nRole: ${getRoleLabel(role)}\nDepartment: ${user?.department || "N/A"}\nDesignation: ${user?.designation || "N/A"}`,
              [{ text: "OK", style: "default" }]
            )}
          >
            <Ionicons name="help-circle-outline" size={28} color="#667eea" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>
          Welcome, {user?.name || "User"}! 👋
        </Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{getRoleLabel(role)}</Text>
        </View>
      </View>

      {/* Features Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => renderFeatureCard(feature, index))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate("Attendance")}
            >
              <LinearGradient
                colors={["#10b981", "#059669"]}
                style={styles.quickActionGradient}
              >
                <Ionicons name="finger-print" size={24} color="#fff" />
                <Text style={styles.quickActionText}>Check In</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate("Leaves")}
            >
              <LinearGradient
                colors={["#f59e0b", "#d97706"]}
                style={styles.quickActionGradient}
              >
                <Ionicons name="calendar" size={24} color="#fff" />
                <Text style={styles.quickActionText}>Apply Leave</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  brandInfo: {
    marginLeft: 12,
  },
  brandName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  brandTagline: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  profileButton: {
    padding: 2,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0e7ff",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  helpButton: {
    padding: 2,
  },

  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    color: "#4f46e5",
    fontSize: 12,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 15,
    paddingTop: 20,
    justifyContent: "flex-start",
  },
  featureCardWrapper: {
    width: CARD_WIDTH,
    marginHorizontal: 5,
    marginBottom: 18,
  },
  featureCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: "center",
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  iconContainer: {
    width: 65,
    height: 65,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    lineHeight: 14,
  },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#fff",
  },
  notificationText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 15,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 15,
  },
  quickActionButton: {
    flex: 1,
  },
  quickActionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 15,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    gap: 8,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
  },
  // Employee Details Styles
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailsHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  detailsScrollView: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  employeeCard: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  employeeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  employeeCardAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  employeeCardAvatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  employeeCardInfo: {
    flex: 1,
  },
  employeeCardName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  employeeCardId: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 4,
  },
  employeeCardRole: {
    fontSize: 13,
    color: "#667eea",
    fontWeight: "600",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  infoItem: {
    width: "50%",
    paddingVertical: 12,
    paddingRight: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "500",
  },
  detailsSection: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  taskItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#667eea",
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  taskStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  taskStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  taskDescription: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 6,
  },
  attendanceItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
  },
  attendanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  attendanceDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  attendanceStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attendanceStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  attendanceTime: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  loadingText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    paddingVertical: 20,
  },
});

export default RoleDashboard;
