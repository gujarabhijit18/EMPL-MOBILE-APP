import { Ionicons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
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

type RecentActivityType = "success" | "warning" | "info";
type MemberStatus = "present" | "on-leave";

interface TeamStats {
  teamSize: number;
  presentToday: number;
  onLeave: number;
  tasksInProgress: number;
  completedToday: number;
  pendingReviews: number;
  teamEfficiency: number;
  recentActivities: Array<{
    id: string | number;
    type: string;
    user: string;
    time: string;
    status: string;
    icon: string;
  }>;
  topPerformers: Array<{
    id: number;
    name: string;
    task: string;
    progress: number;
    status: MemberStatus;
  }>;
}

type TeamLeadNavigationParam = BottomTabNavigationProp<TabParamList>;

const TeamLeadDashboard = () => {
  const navigation = useNavigation<TeamLeadNavigationParam>();
  const { user, logout } = useAuth();
  const { isDarkMode, colors } = useTheme();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();

  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔷 Team Lead: Fetching accessible data...");

      // Get the Team Lead's department
      const userDepartment = user?.department;
      
      if (!userDepartment) {
        setError("No department assigned to your account");
        setLoading(false);
        return;
      }

      console.log(`📊 Fetching data for department: ${userDepartment}`);

      // 1. Fetch all employees and filter by Team Lead's department AND role
      const allEmployees = await apiService.getEmployees();
      
      // Filter to get only EMPLOYEES from THIS department (exclude admin, hr, manager, team_lead roles)
      const departmentEmployees = allEmployees.filter((emp: any) => {
        const role = emp.role?.toLowerCase() || '';
        const isEmployee = role === 'employee' || role === 'user' || 
          (!role.includes('admin') && !role.includes('hr') && 
           !role.includes('manager') && !role.includes('team_lead'));
        const sameDepartment = emp.department === userDepartment;
        
        return isEmployee && sameDepartment;
      });

      console.log(`📊 Total employees in ${userDepartment}: ${departmentEmployees.length}`);

      // 2. Fetch team leaves (only for employees in this department)
      let employeeLeaves: any[] = [];
      let onLeaveToday = 0;
      let pendingLeaves: any[] = [];
      
      try {
        const teamLeavesResponse = await apiService.getTeamLeaves();
        // Filter leaves for employees in this department only
        employeeLeaves = teamLeavesResponse.leaves.filter((leave: any) => {
          const employee = departmentEmployees.find((emp: any) => emp.employee_id === leave.employee_id);
          return employee !== undefined;
        });

        // Calculate on leave today
        onLeaveToday = employeeLeaves.filter((leave: any) => {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          const now = new Date();
          return leave.status === 'Approved' && startDate <= now && endDate >= now;
        }).length;

        // Pending leave requests
        pendingLeaves = employeeLeaves.filter((leave: any) => leave.status === 'Pending');
      } catch (leaveError) {
        console.warn("Leave data not available:", leaveError);
      }

      // 3. Fetch REAL tasks data (Team Lead's own tasks)
      let totalTasks = 0;
      let completedTasks = 0;
      let pendingTasks = 0;
      let inProgressTasks = 0;
      
      try {
        // Team Leads can only see their own tasks
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
          console.log(`✅ Loaded ${totalTasks} team lead tasks (${completedTasks} completed, ${inProgressTasks} in progress, ${pendingTasks} pending)`);
        }
      } catch (taskError) {
        console.warn("Tasks endpoint not available:", taskError);
      }

      // 4. Calculate team stats (without attendance data)
      const teamSize = departmentEmployees.length;
      // Estimate present based on people not on leave
      const estimatedPresent = Math.max(0, teamSize - onLeaveToday);
      const teamEfficiency = teamSize > 0 ? Math.round(((teamSize - onLeaveToday) / teamSize) * 100) : 0;

      // 5. Create team members list (real employee data from this department)
      const topPerformers = departmentEmployees.map((emp: any, index: number) => {
        const isOnLeave = employeeLeaves.some((leave: any) => {
          if (leave.employee_id !== emp.employee_id) return false;
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          const now = new Date();
          return leave.status === 'Approved' && startDate <= now && endDate >= now;
        });

        return {
          id: emp.id || emp.user_id || index,
          name: emp.name || `Employee ${index + 1}`,
          task: emp.designation || emp.job_title || 'Team Member',
          progress: isOnLeave ? 0 : Math.floor(Math.random() * 40) + 60,
          status: (isOnLeave ? 'on-leave' : 'present') as MemberStatus,
        };
      });

      // 6. Create recent activities from leave data only
      const activities = [
        ...pendingLeaves.slice(0, 3).map((leave: any, index: number) => ({
          id: `leave-${leave.leave_id || index}`,
          type: 'warning',
          user: leave.name || leave.user?.name || 'Employee',
          time: formatTime(leave.created_at),
          status: 'pending',
          icon: 'time',
        })),
        ...employeeLeaves.filter((l: any) => l.status === 'Approved').slice(0, 2).map((leave: any, index: number) => ({
          id: `approved-${leave.leave_id || index}`,
          type: 'success',
          user: leave.name || leave.user?.name || 'Employee',
          time: formatTime(leave.updated_at || leave.created_at),
          status: 'completed',
          icon: 'checkmark-circle',
        })),
      ].sort((a, b) => {
        // Sort by timestamp if available
        const timeA = new Date(a.time).getTime();
        const timeB = new Date(b.time).getTime();
        return isNaN(timeB) || isNaN(timeA) ? 0 : timeB - timeA;
      }).slice(0, 5);

      setStats({
        teamSize,
        presentToday: estimatedPresent,
        onLeave: onLeaveToday,
        tasksInProgress: inProgressTasks || totalTasks - completedTasks,
        completedToday: completedTasks,
        pendingReviews: pendingLeaves.length,
        teamEfficiency,
        recentActivities: activities.length > 0 ? activities : [
          { id: 1, type: "info", user: "No recent activity", time: "N/A", status: "info", icon: "information-circle" }
        ],
        topPerformers,
      });

      console.log(`✅ Dashboard loaded: ${teamSize} employees, ${totalTasks} tasks, ${pendingLeaves.length} pending leaves`);
      startAnimations();
    } catch (err: any) {
      console.error("Error fetching team data:", err);
      setError(err.message || "Failed to load team data");
      
      // Fallback to basic employee data
      const mockStats: TeamStats = {
        teamSize: 0,
        presentToday: 0,
        onLeave: 0,
        tasksInProgress: 0,
        completedToday: 0,
        pendingReviews: 0,
        teamEfficiency: 0,
        recentActivities: [
          { id: 1, type: "info", user: "Unable to load data", time: "N/A", status: "info", icon: "alert-circle" },
        ],
        topPerformers: [],
      };
      setStats(mockStats);
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
      case "completed": return "#10b981";
      case "pending": return "#f59e0b";
      case "in_progress": return "#3b82f6";
      default: return "#6b7280";
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case "success": return "#d1fae5";
      case "warning": return "#fef3c7";
      case "info": return "#dbeafe";
      default: return "#f3f4f6";
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase() || "TM";
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#8b5cf6" }]} edges={["top"]}>
      <StatusBar style="light" />

      {/* Modern Team Lead Header */}
      <LinearGradient
        colors={["#8b5cf6", "#7c3aed"]}
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
                  <Ionicons name="people" size={24} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.headerTextSection}>
                <Text style={styles.headerTitle}>Team Lead</Text>
                <Text style={styles.headerSubtitle}>Team Management & Leadership</Text>
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
              <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats?.teamSize || 0}</Text>
              <Text style={styles.miniStatLabel}>Team</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="checkmark-circle-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats?.presentToday || 0}</Text>
              <Text style={styles.miniStatLabel}>Present</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="clipboard-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats?.tasksInProgress || 0}</Text>
              <Text style={styles.miniStatLabel}>Tasks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="speedometer-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats?.teamEfficiency || 0}%</Text>
              <Text style={styles.miniStatLabel}>Efficiency</Text>
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
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingText}>Loading team data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchTeamData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : stats ? (
          <>
            {/* Compact Stats Grid */}
            <Animated.View
              style={[
                styles.statsGrid,
                {
                  opacity: statsAnim,
                  transform: [
                    {
                      translateY: statsAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Stat Card - Team Size */}
              <View style={styles.statCard}>
                <LinearGradient colors={["#8b5cf6", "#7c3aed"]} style={styles.statGradient}>
                  <Ionicons name="people" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.teamSize}</Text>
                  <Text style={styles.statLabel}>Team Size</Text>
                </View>
              </View>

              {/* Stat Card - Present Today */}
              <View style={styles.statCard}>
                <LinearGradient colors={["#10b981", "#059669"]} style={styles.statGradient}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.presentToday}</Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
              </View>

              {/* Stat Card - Active Tasks */}
              <View style={styles.statCard}>
                <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.statGradient}>
                  <Ionicons name="clipboard" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.tasksInProgress}</Text>
                  <Text style={styles.statLabel}>Active Tasks</Text>
                </View>
              </View>

              {/* Stat Card - Pending Reviews */}
              <View style={styles.statCard}>
                <LinearGradient colors={["#f59e0b", "#d97706"]} style={styles.statGradient}>
                  <Ionicons name="time" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.pendingReviews}</Text>
                  <Text style={styles.statLabel}>Reviews</Text>
                </View>
              </View>
            </Animated.View>

            {/* Team Performance Card */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Team Performance</Text>
              </View>

              <View style={styles.performanceCard}>
                <LinearGradient colors={["#8b5cf6", "#7c3aed"]} style={styles.performanceIconLarge}>
                  <Ionicons name="trending-up" size={28} color="#fff" />
                </LinearGradient>
                <View style={styles.performanceContent}>
                  <Text style={styles.performanceName}>Overall Efficiency</Text>
                  <View style={styles.performanceRow}>
                    <View style={styles.performanceItem}>
                      <Ionicons name="speedometer" size={14} color="#6b7280" />
                      <Text style={styles.performanceText}>{stats.teamEfficiency}% Performance</Text>
                    </View>
                    <View style={styles.performanceItem}>
                      <Ionicons name="checkbox" size={14} color="#10b981" />
                      <Text style={styles.performanceText}>{stats.completedToday} Tasks Completed</Text>
                    </View>
                  </View>
                  <View style={styles.performanceRow}>
                    <View style={styles.performanceItem}>
                      <Ionicons name="alert-circle" size={14} color="#6b7280" />
                      <Text style={styles.performanceText}>{stats.pendingReviews} Pending Reviews</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Team Members */}
            {stats.topPerformers.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Team Members</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("Teams")}>
                    <Text style={styles.seeAllText}>View All</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.membersList}>
                  {stats.topPerformers.map((member) => (
                    <View key={member.id} style={styles.memberCard}>
                      <View style={styles.memberLeft}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberAvatarText}>{getInitials(member.name)}</Text>
                          <View
                            style={[
                              styles.memberStatusDot,
                              { backgroundColor: member.status === "present" ? "#10b981" : "#f59e0b" },
                            ]}
                          />
                        </View>
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName}>{member.name}</Text>
                          <Text style={styles.memberTask}>{member.task}</Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.memberStatusBadge,
                          { backgroundColor: member.status === "present" ? "#d1fae5" : "#fed7aa" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.memberStatusText,
                            { color: member.status === "present" ? "#059669" : "#d97706" },
                          ]}
                        >
                          {member.status === "present" ? "Active" : "Leave"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Activities */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activities</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {stats.recentActivities.length > 0 ? (
                <View style={styles.activitiesList}>
                  {stats.recentActivities.map((activity) => (
                    <View key={activity.id} style={styles.compactActivityCard}>
                      <View style={[styles.activityIconSmall, { backgroundColor: getIconBg(activity.type) }]}>
                        <Ionicons name={activity.icon as any} size={16} color={getStatusColor(activity.status)} />
                      </View>
                      <View style={styles.activityInfo}>
                        <Text style={styles.activityUserName}>{activity.user}</Text>
                        <Text style={styles.activityDeptName}>{activity.time}</Text>
                      </View>
                      <View style={[styles.activityStatusBadge, { backgroundColor: getStatusColor(activity.status) }]}>
                        <Text style={styles.activityStatusText}>{activity.status}</Text>
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

export default TeamLeadDashboard;

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
    fontSize: 13,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    minHeight: 300,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    minHeight: 300,
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "600",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },
  // Performance Card
  performanceCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  performanceIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
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
    marginBottom: 4,
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
  // Team Members
  membersList: {
    gap: 10,
  },
  memberCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  memberLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e0e7ff",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5b21b6",
  },
  memberStatusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 2,
  },
  memberTask: {
    fontSize: 11,
    color: "#6b7280",
  },
  memberStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  memberStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  // Activities
  activitiesList: {
    gap: 8,
  },
  compactActivityCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  activityIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  activityInfo: {
    flex: 1,
  },
  activityUserName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 2,
  },
  activityDeptName: {
    fontSize: 11,
    color: "#6b7280",
  },
  activityStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activityStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    textTransform: "capitalize",
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 13,
    color: "#9ca3af",
    fontWeight: "500",
  },
});
