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
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import type { TabParamList } from "../../navigation/TabNavigator";
import { apiService } from "../../lib/api";
import { formatTimeIST, getDayMonthIST, getRelativeTime } from "../../utils/dateTime";
import { Colors, Shadows, BorderRadius, Spacing, Typography, Gradients } from "../../constants/designSystem";

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
      setStatusBarBackgroundColor(Colors.surface, true);
    }
    setStatusBarStyle("dark");
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
          description: `${formatDate(record.date || record.check_in)} - ${record.check_in ? formatTimeIST(record.check_in) : 'N/A'}`,
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
    return getRelativeTime(timestamp);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return getDayMonthIST(dateStr);
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
        return Colors.success;
      case "pending": 
        return Colors.warning;
      case "in_progress": 
        return Colors.primary;
      case "rejected":
        return Colors.error;
      default: 
        return Colors.textSecondary;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case "success": return Colors.successLight;
      case "warning": return Colors.warningLight;
      case "error": return Colors.errorLight;
      case "info": return Colors.primaryLight;
      default: return Colors.backgroundAlt;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.surface }]} edges={["top"]}>
      <StatusBar style="dark" backgroundColor={Colors.surface} translucent={false} />

      {/* Modern White Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          {/* Header Top Section */}
          <View style={styles.headerTopSection}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={Colors.headerText} />
            </TouchableOpacity>
            <View style={styles.headerLeft}>
              <View style={styles.headerTextSection}>
                <Text style={styles.headerTitle}>My Dashboard</Text>
                <Text style={styles.headerSubtitle}>Personal Workspace</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.dateTimeContainer}>
                <Text style={styles.timeText}>
                  {formatTimeIST(new Date())}
                </Text>
                <Text style={styles.dateText}>
                  {getDayMonthIST(new Date())}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Overview Bar */}
          <View style={styles.statsOverviewBar}>
            <View style={styles.miniStatItem}>
              <Ionicons name="clipboard-outline" size={14} color={Colors.primary} />
              <Text style={styles.miniStatValue}>{stats?.totalTasks || 0}</Text>
              <Text style={styles.miniStatLabel}>Tasks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
              <Text style={styles.miniStatValue}>{stats?.completedTasks || 0}</Text>
              <Text style={styles.miniStatLabel}>Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="calendar-outline" size={14} color={Colors.warning} />
              <Text style={styles.miniStatValue}>{stats?.approvedLeaves || 0}</Text>
              <Text style={styles.miniStatLabel}>Leaves</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="speedometer-outline" size={14} color={Colors.purple} />
              <Text style={styles.miniStatValue}>{stats?.attendancePercentage || 0}%</Text>
              <Text style={styles.miniStatLabel}>Attendance</Text>
            </View>
          </View>
        </View>
      </View>

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
                <LinearGradient colors={[...Gradients.primary]} style={styles.performanceIconLarge}>
                  <Ionicons name="stats-chart" size={28} color="#fff" />
                </LinearGradient>
                <View style={styles.performanceContent}>
                  <Text style={styles.performanceName}>Your Performance</Text>
                  <View style={styles.performanceRow}>
                    <View style={styles.performanceItem}>
                      <Ionicons name="clipboard" size={14} color={Colors.textSecondary} />
                      <Text style={styles.performanceText}>{stats.totalTasks} Total Tasks</Text>
                    </View>
                    <View style={styles.performanceItem}>
                      <Ionicons name="checkbox" size={14} color={Colors.success} />
                      <Text style={styles.performanceText}>{stats.completedTasks} Completed</Text>
                    </View>
                  </View>
                  <View style={styles.performanceRow}>
                    <View style={styles.performanceItem}>
                      <Ionicons name="calendar" size={14} color={Colors.textSecondary} />
                      <Text style={styles.performanceText}>{stats.presentDays}/{stats.totalDays} Days Present</Text>
                    </View>
                    <View style={styles.performanceItem}>
                      <Ionicons name="time" size={14} color={Colors.warning} />
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
                  <View style={[styles.leaveStatIcon, { backgroundColor: Colors.successLight }]}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.successDark} />
                  </View>
                  <Text style={[styles.leaveStatValue, { color: Colors.successDark }]}>{stats.approvedLeaves}</Text>
                  <Text style={styles.leaveStatLabel}>Approved</Text>
                </View>

                <View style={styles.leaveStatCard}>
                  <View style={[styles.leaveStatIcon, { backgroundColor: Colors.warningLight }]}>
                    <Ionicons name="time" size={20} color={Colors.warningDark} />
                  </View>
                  <Text style={[styles.leaveStatValue, { color: Colors.warningDark }]}>{stats.pendingLeaves}</Text>
                  <Text style={styles.leaveStatLabel}>Pending</Text>
                </View>

                <View style={styles.leaveStatCard}>
                  <View style={[styles.leaveStatIcon, { backgroundColor: Colors.errorLight }]}>
                    <Ionicons name="close-circle" size={20} color={Colors.errorDark} />
                  </View>
                  <Text style={[styles.leaveStatValue, { color: Colors.errorDark }]}>{stats.rejectedLeaves}</Text>
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
  headerContainer: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // Header Top Section
  headerTopSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTextSection: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.screenTitle,
  },
  headerSubtitle: {
    ...Typography.secondary,
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  dateTimeContainer: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  timeText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 10,
    color: Colors.primary,
    marginTop: 2,
    fontWeight: "600",
  },
  // Stats Overview Bar
  statsOverviewBar: {
    flexDirection: "row",
    backgroundColor: Colors.backgroundAlt,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  miniStatItem: {
    alignItems: "center",
    flex: 1,
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  miniStatLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  // Section Container
  sectionContainer: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.sectionTitle,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  // Performance Card
  performanceCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  performanceIconLarge: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  performanceContent: {
    flex: 1,
  },
  performanceName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  performanceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: 6,
  },
  performanceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  performanceText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  // Leave Stats Row
  leaveStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  leaveStatCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  leaveStatIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  leaveStatValue: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  leaveStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  // Activities List
  activitiesList: {
    gap: 10,
  },
  compactActivityCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  activityIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 3,
  },
  activityDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  activityTime: {
    fontSize: 11,
    color: Colors.textTertiary,
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
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  errorText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.error,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  retryButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
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
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: "500",
  },
});
