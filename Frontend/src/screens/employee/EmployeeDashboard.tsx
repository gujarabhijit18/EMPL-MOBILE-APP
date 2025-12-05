import { Ionicons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar, setStatusBarBackgroundColor, setStatusBarStyle } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import type { TabParamList } from "../../navigation/TabNavigator";
import { apiService } from "../../lib/api";

const { width } = Dimensions.get("window");

interface EmployeeStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  totalLeaves: number;
  approvedLeaves: number;
  pendingLeaves: number;
  rejectedLeaves: number;
  attendancePercentage: number;
  presentDays: number;
  totalDays: number;
  recentActivities: Array<{
    id: string | number;
    type: string;
    title: string;
    description: string;
    time: string;
    status: string;
    icon: string;
  }>;
}

type EmployeeNavigationParam = BottomTabNavigationProp<TabParamList>;

const EmployeeDashboard = () => {
  const navigation = useNavigation<EmployeeNavigationParam>();
  const { user, logout } = useAuth();
  const { isDarkMode, colors } = useTheme();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();

  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  // Set status bar to match header color
  useEffect(() => {
    if (Platform.OS === "android") {
      setStatusBarBackgroundColor("#3b82f6", true);
    }
    setStatusBarStyle("light");
  }, []);

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔷 Employee: Fetching personal data...");

      // 1. Fetch employee's tasks
      let totalTasks = 0;
      let completedTasks = 0;
      let inProgressTasks = 0;
      let pendingTasks = 0;
      
      try {
        const myTasks = await apiService.getMyTasks();
        if (Array.isArray(myTasks)) {
          totalTasks = myTasks.length;
          completedTasks = myTasks.filter((t: any) => 
            t.status?.toLowerCase() === 'completed' || t.status?.toLowerCase() === 'done'
          ).length;
          inProgressTasks = myTasks.filter((t: any) => 
            t.status?.toLowerCase() === 'in progress' || t.status?.toLowerCase() === 'in_progress'
          ).length;
          pendingTasks = myTasks.filter((t: any) => 
            t.status?.toLowerCase() === 'pending' || t.status?.toLowerCase() === 'todo'
          ).length;
          console.log(`✅ Loaded ${totalTasks} tasks (${completedTasks} completed, ${inProgressTasks} in progress, ${pendingTasks} pending)`);
        }
      } catch (taskError) {
        console.warn("Tasks endpoint not available:", taskError);
      }

      // 2. Fetch employee's leaves
      let totalLeaves = 0;
      let approvedLeaves = 0;
      let pendingLeaves = 0;
      let rejectedLeaves = 0;
      let leaveActivities: any[] = [];
      
      try {
        const myLeaves = await apiService.getMyLeaves();
        const leavesArray = Array.isArray(myLeaves) ? myLeaves : [];
        totalLeaves = leavesArray.length;
        approvedLeaves = leavesArray.filter((l: any) => l.status === 'Approved').length;
        pendingLeaves = leavesArray.filter((l: any) => l.status === 'Pending').length;
        rejectedLeaves = leavesArray.filter((l: any) => l.status === 'Rejected').length;
        
        // Create activities from recent leaves
        leaveActivities = leavesArray.slice(0, 3).map((leave: any, index: number) => ({
          id: `leave-${leave.leave_id || index}`,
          type: leave.status === 'Approved' ? 'success' : leave.status === 'Rejected' ? 'error' : 'warning',
          title: `Leave Request ${leave.status}`,
          description: `${leave.leave_type || 'Leave'} - ${formatDateRange(leave.start_date, leave.end_date)}`,
          time: formatTime(leave.updated_at || leave.created_at),
          status: leave.status.toLowerCase(),
          icon: leave.status === 'Approved' ? 'checkmark-circle' : leave.status === 'Rejected' ? 'close-circle' : 'time',
        }));
        
        console.log(`✅ Loaded ${totalLeaves} leaves (${approvedLeaves} approved, ${pendingLeaves} pending, ${rejectedLeaves} rejected)`);
      } catch (leaveError) {
        console.warn("Leaves endpoint not available:", leaveError);
      }

      // 3. Fetch employee's attendance
      let attendancePercentage = 0;
      let presentDays = 0;
      let totalDays = 0;
      let attendanceActivities: any[] = [];
      
      try {
        if (!user?.user_id) {
          throw new Error('User ID not available');
        }
        const myAttendance = await apiService.getSelfAttendance(user.user_id);
        const attendanceArray = Array.isArray(myAttendance) ? myAttendance : [];
        
        // Calculate this month's attendance
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const thisMonthAttendance = attendanceArray.filter((record: any) => {
          const recordDate = new Date(record.date || record.check_in);
          return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        });
        
        totalDays = thisMonthAttendance.length;
        presentDays = thisMonthAttendance.filter((record: any) => 
          record.status?.toLowerCase() === 'present' || record.check_in
        ).length;
        
        attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        
        // Create activities from recent attendance
        attendanceActivities = thisMonthAttendance.slice(0, 2).map((record: any, index: number) => ({
          id: `attendance-${record.attendance_id || index}`,
          type: record.status?.toLowerCase() === 'present' ? 'success' : 'info',
          title: record.status === 'present' ? 'Checked In' : 'Attendance Recorded',
          description: `${formatDate(record.date || record.check_in)} - ${record.check_in ? new Date(record.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}`,
          time: formatTime(record.date || record.check_in),
          status: record.status?.toLowerCase() || 'info',
          icon: 'finger-print',
        }));
        
        console.log(`✅ Loaded attendance: ${presentDays}/${totalDays} days (${attendancePercentage}%)`);
      } catch (attendanceError) {
        console.warn("Attendance endpoint not available:", attendanceError);
      }

      // 4. Combine recent activities
      const recentActivities = [...leaveActivities, ...attendanceActivities]
        .sort((a, b) => {
          // Simple sort by time string (most recent first)
          return b.time.localeCompare(a.time);
        })
        .slice(0, 5);

      setStats({
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        totalLeaves,
        approvedLeaves,
        pendingLeaves,
        rejectedLeaves,
        attendancePercentage,
        presentDays,
        totalDays,
        recentActivities: recentActivities.length > 0 ? recentActivities : [
          { id: 1, type: "info", title: "No recent activity", description: "Your activities will appear here", time: "N/A", status: "info", icon: "information-circle" }
        ],
      });

      console.log(`✅ Employee dashboard loaded successfully`);
      startAnimations();
    } catch (err: any) {
      console.error("Error fetching employee data:", err);
      setError(err.message || "Failed to load employee data");
      
      // Fallback to empty stats
      const emptyStats: EmployeeStats = {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 0,
        totalLeaves: 0,
        approvedLeaves: 0,
        pendingLeaves: 0,
        rejectedLeaves: 0,
        attendancePercentage: 0,
        presentDays: 0,
        totalDays: 0,
        recentActivities: [
          { id: 1, type: "info", title: "Unable to load data", description: "Please try again later", time: "N/A", status: "info", icon: "alert-circle" },
        ],
      };
      setStats(emptyStats);
      startAnimations();
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return 'Recently';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (start: string, end: string) => {
    if (!start || !end) return 'N/A';
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const startAnimations = () => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.spring(statsAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const goTo = (routeName: string) => {
    try {
      navigation.navigate(routeName as never);
    } catch (_) {
      (navigation as any).getParent?.()?.navigate(routeName as never);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
      case "present": 
        return "#10b981";
      case "pending": 
        return "#f59e0b";
      case "in_progress": 
        return "#3b82f6";
      case "rejected":
        return "#ef4444";
      default: 
        return "#6b7280";
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case "success": return "#d1fae5";
      case "warning": return "#fef3c7";
      case "error": return "#fee2e2";
      case "info": return "#dbeafe";
      default: return "#f3f4f6";
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#3b82f6" }]} edges={["top"]}>
      <StatusBar style="light" backgroundColor="#3b82f6" translucent={false} />

      {/* Modern Employee Header */}
      <LinearGradient
        colors={["#3b82f6", "#1e40af"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Background Pattern */}
        <View style={styles.headerPattern}>
          <View style={[styles.patternCircle, { top: -20, right: -20, width: 120, height: 120 }]} />
          <View style={[styles.patternCircle, { bottom: -30, left: -30, width: 150, height: 150 }]} />
          <View style={[styles.patternCircle, { top: 40, right: 60, width: 80, height: 80 }]} />
        </View>

        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header Top Section */}
          <View style={styles.headerTopSection}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBadge}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]}
                  style={styles.iconBadgeGradient}
                >
                  <Ionicons name="person" size={24} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.headerTextSection}>
                <Text style={styles.headerTitle}>My Dashboard</Text>
                <Text style={styles.headerSubtitle}>Personal Workspace</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.dateTimeContainer}>
                <Text style={styles.timeText}>
                  {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </Text>
                <Text style={styles.dateText}>
                  {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Overview Bar */}
          <View style={styles.statsOverviewBar}>
            <View style={styles.miniStatItem}>
              <Ionicons name="clipboard-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats?.totalTasks || 0}</Text>
              <Text style={styles.miniStatLabel}>Tasks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="checkmark-circle-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats?.completedTasks || 0}</Text>
              <Text style={styles.miniStatLabel}>Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats?.approvedLeaves || 0}</Text>
              <Text style={styles.miniStatLabel}>Leaves</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="speedometer-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats?.attendancePercentage || 0}%</Text>
              <Text style={styles.miniStatLabel}>Attendance</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarVisible ? tabBarHeight + 24 : 24 },
        ]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading your data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchEmployeeData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : stats ? (
          <>
            {/* Work Overview Card */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Work Overview</Text>
              </View>

              <View style={styles.performanceCard}>
                <LinearGradient colors={["#3b82f6", "#1e40af"]} style={styles.performanceIconLarge}>
                  <Ionicons name="stats-chart" size={28} color="#fff" />
                </LinearGradient>
                <View style={styles.performanceContent}>
                  <Text style={styles.performanceName}>Your Performance</Text>
                  <View style={styles.performanceRow}>
                    <View style={styles.performanceItem}>
                      <Ionicons name="clipboard" size={14} color="#6b7280" />
                      <Text style={styles.performanceText}>{stats.totalTasks} Total Tasks</Text>
                    </View>
                    <View style={styles.performanceItem}>
                      <Ionicons name="checkbox" size={14} color="#10b981" />
                      <Text style={styles.performanceText}>{stats.completedTasks} Completed</Text>
                    </View>
                  </View>
                  <View style={styles.performanceRow}>
                    <View style={styles.performanceItem}>
                      <Ionicons name="calendar" size={14} color="#6b7280" />
                      <Text style={styles.performanceText}>{stats.presentDays}/{stats.totalDays} Days Present</Text>
                    </View>
                    <View style={styles.performanceItem}>
                      <Ionicons name="time" size={14} color="#f59e0b" />
                      <Text style={styles.performanceText}>{stats.inProgressTasks} In Progress</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Leaves Summary */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Leave Summary</Text>
                <TouchableOpacity onPress={() => goTo("Leaves")}>
                  <Text style={styles.seeAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.leaveStatsRow}>
                <View style={styles.leaveStatCard}>
                  <View style={[styles.leaveStatIcon, { backgroundColor: "#d1fae5" }]}>
                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  </View>
                  <Text style={[styles.leaveStatValue, { color: "#059669" }]}>{stats.approvedLeaves}</Text>
                  <Text style={styles.leaveStatLabel}>Approved</Text>
                </View>

                <View style={styles.leaveStatCard}>
                  <View style={[styles.leaveStatIcon, { backgroundColor: "#fef3c7" }]}>
                    <Ionicons name="time" size={20} color="#d97706" />
                  </View>
                  <Text style={[styles.leaveStatValue, { color: "#d97706" }]}>{stats.pendingLeaves}</Text>
                  <Text style={styles.leaveStatLabel}>Pending</Text>
                </View>

                <View style={styles.leaveStatCard}>
                  <View style={[styles.leaveStatIcon, { backgroundColor: "#fee2e2" }]}>
                    <Ionicons name="close-circle" size={20} color="#dc2626" />
                  </View>
                  <Text style={[styles.leaveStatValue, { color: "#dc2626" }]}>{stats.rejectedLeaves}</Text>
                  <Text style={styles.leaveStatLabel}>Rejected</Text>
                </View>
              </View>
            </View>

            {/* Recent Activities */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activities</Text>
              </View>

              {stats.recentActivities.length > 0 ? (
                <View style={styles.activitiesList}>
                  {stats.recentActivities.map((activity) => (
                    <View key={activity.id} style={styles.compactActivityCard}>
                      <View style={[styles.activityIconSmall, { backgroundColor: getIconBg(activity.type) }]}>
                        <Ionicons name={activity.icon as any} size={16} color={getStatusColor(activity.status)} />
                      </View>
                      <View style={styles.activityInfo}>
                        <Text style={styles.activityTitle}>{activity.title}</Text>
                        <Text style={styles.activityDescription}>{activity.description}</Text>
                        <Text style={styles.activityTime}>{activity.time}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyStateText}>No recent activities</Text>
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default EmployeeDashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: "relative",
    overflow: "hidden",
  },
  // Decorative Pattern
  headerPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  headerContent: {
    paddingHorizontal: 20,
    position: "relative",
    zIndex: 1,
  },
  // Header Top Section
  headerTopSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconBadge: {
    marginRight: 14,
  },
  iconBadgeGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerTextSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  dateTimeContainer: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  timeText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
    fontWeight: "600",
  },
  // Stats Overview Bar
  statsOverviewBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: 12,
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  miniStatItem: {
    alignItems: "center",
    flex: 1,
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    marginTop: 4,
    letterSpacing: 0.3,
  },
  miniStatLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 16,
  },
  // Compact Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statGradient: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "600",
  },
  // Section Container
  sectionContainer: {
    marginBottom: 20,
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
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
  },
  // Performance Card
  performanceCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  performanceIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  performanceContent: {
    flex: 1,
  },
  performanceName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  performanceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 6,
  },
  performanceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  performanceText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  // Leave Stats Row
  leaveStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  leaveStatCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  leaveStatIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  leaveStatValue: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  leaveStatLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "600",
  },
  // Activities List
  activitiesList: {
    gap: 10,
  },
  compactActivityCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  activityIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 3,
  },
  activityDescription: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 3,
  },
  activityTime: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "500",
  },
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
  },
});
