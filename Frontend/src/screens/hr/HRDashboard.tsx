import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Easing,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from "../../contexts/AuthContext";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import { apiService } from "../../lib/api";
import { formatTimeIST, getDayMonthIST, getRelativeTime } from "../../utils/dateTime";
import { Colors, Shadows, BorderRadius, Spacing, Typography, Gradients } from "../../constants/designSystem";

const { width } = Dimensions.get('window');

// Department-specific HR Data Interface
interface DepartmentStats {
  departmentName: string;
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  pendingLeaves: number;
  newJoiners: number;
  attendanceRate: number;
  recentActivities: Array<{
    id: string | number;
    type: string;
    user: string;
    time: string;
    status: string;
    icon: string;
  }>;
}

const HRDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const { logout, user } = useAuth();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();

  const [stats, setStats] = useState<DepartmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchDepartmentData();
  }, []);

  const fetchDepartmentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get HR user's department from user profile
      const userDepartment = user?.department;
      
      if (!userDepartment) {
        setError("No department assigned to your account");
        setLoading(false);
        return;
      }

      console.log(`📊 Fetching data for department: ${userDepartment}`);

      // 1. Fetch all employees and filter by department (exclude Admin role)
      const allEmployees = await apiService.getEmployees();
      const departmentEmployees = allEmployees.filter(
        (emp: any) => emp.department === userDepartment && emp.role !== 'Admin'
      );

      // 2. Fetch Attendance (Real Data)
      const today = new Date().toISOString().split('T')[0];
      const allAttendance = await apiService.getAllAttendance(today);
      const departmentAttendance = allAttendance.filter((record: any) => 
        record.department === userDepartment
      );

      // 3. Fetch Leaves
      // HR should see department leaves. apiService.getTeamLeaves() handles role-based fetching!
      const teamLeavesResponse = await apiService.getTeamLeaves();
      const departmentLeaves = teamLeavesResponse.leaves.filter((leave: any) => {
        // Double check department if the API returns more
        const employee = departmentEmployees.find((emp: any) => emp.employee_id === leave.employee_id);
        return employee !== undefined;
      });

      const pendingLeaves = departmentLeaves.filter((leave: any) => leave.status === 'Pending');

      // 4. Fetch Job Openings (Real Data)
      const vacancies = await apiService.getJobOpenings(userDepartment);
      const openPositions = vacancies.filter((v: any) => v.status === 'Open').length;

      // 5. Calculate Stats
      const totalEmployees = departmentEmployees.length;
      const presentToday = departmentAttendance.length;
      const onLeave = departmentLeaves.filter((leave: any) => {
        const startDate = new Date(leave.start_date);
        const endDate = new Date(leave.end_date);
        const now = new Date();
        return leave.status === 'Approved' && startDate <= now && endDate >= now;
      }).length;

      // Calculate new joiners this month
      const newJoinersThisMonth = departmentEmployees.filter((emp: any) => {
        if (!emp.created_at) return false;
        const joinDate = new Date(emp.created_at);
        const thisMonth = new Date();
        return joinDate.getMonth() === thisMonth.getMonth() && 
               joinDate.getFullYear() === thisMonth.getFullYear();
      }).length;

      // Create recent activities
      const activities = [
        ...pendingLeaves.slice(0, 3).map((leave: any, index: number) => ({
          id: `leave-${leave.leave_id || index}`,
          type: 'leave_request',
          user: leave.name || leave.user?.name || 'Unknown',
          time: formatTime(leave.created_at),
          status: leave.status.toLowerCase(),
          icon: 'calendar',
        })),
        ...departmentAttendance.slice(0, 3).map((att: any, index: number) => ({
          id: `att-${att.attendance_id || index}`,
          type: 'attendance',
          user: att.user_name || 'Employee',
          time: formatTime(att.check_in),
          status: 'present',
          icon: 'checkmark-circle',
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

      setStats({
        departmentName: userDepartment,
        totalEmployees,
        presentToday,
        onLeave,
        pendingLeaves: pendingLeaves.length,
        newJoiners: newJoinersThisMonth,
        attendanceRate: totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0,
        recentActivities: activities,
      });

      startAnimations();
    } catch (err: any) {
      console.error('Error fetching department data:', err);
      setError(err.message || 'Failed to load department data');
      
      // Fallback to mock data if backend fails
      const mockStats: DepartmentStats = {
        departmentName: user?.department || 'Engineering',
        totalEmployees: 95,
        presentToday: 88,
        onLeave: 5,
        pendingLeaves: 3,
        newJoiners: 2,
        attendanceRate: 93,
        recentActivities: [
          { id: 1, type: "leave", user: "Sarah Johnson", time: "09:15 AM", status: "pending", icon: "calendar" },
          { id: 2, type: "document", user: "Michael Chen", time: "Today", status: "submitted", icon: "document-text" },
          { id: 3, type: "leave", user: "Emma Wilson", time: "10:30 AM", status: "approved", icon: "checkmark-done" },
        ],
      };
      setStats(mockStats);
      startAnimations();
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return getRelativeTime(timestamp);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'leave_request': return 'calendar';
      case 'document_submission': return 'document-text';
      case 'attendance': return 'checkmark-circle';
      case 'new_joiner': return 'person-add';
      default: return 'information-circle';
    }
  };

  const startAnimations = () => {
    // Header animation
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Stats cards animation
    Animated.spring(statsAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const goTo = (route: string) => {
    try {
      navigation.navigate(route);
    } catch (e) {
      console.log('Navigation error:', e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return Colors.success;
      case 'pending': return Colors.warning;
      case 'rejected': return Colors.error;
      case 'new': return Colors.primary;
      case 'submitted': return Colors.purple;
      case 'processing': return Colors.info;
      default: return Colors.textSecondary;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'leave': return Colors.warningLight;
      case 'hire': return Colors.purpleLight;
      case 'document': return Colors.primaryLight;
      case 'exit': return Colors.errorLight;
      default: return Colors.backgroundAlt;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.surface }]} edges={['top']}>
      <StatusBar style="dark" />

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
                <Text style={styles.headerTitle}>HR Dashboard</Text>
                <Text style={styles.headerSubtitle}>Human Resources Management</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.dateTimeContainer}>
                <Text style={styles.timeText}>{formatTimeIST(new Date())}</Text>
                <Text style={styles.dateText}>{getDayMonthIST(new Date())}</Text>
              </View>
            </View>
          </View>

          {/* Stats Overview Bar */}
          <View style={styles.statsOverviewBar}>
            <View style={styles.miniStatItem}>
              <Ionicons name="people-outline" size={14} color={Colors.primary} />
              <Text style={styles.miniStatValue}>{stats?.totalEmployees || 0}</Text>
              <Text style={styles.miniStatLabel}>Staff</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
              <Text style={styles.miniStatValue}>{stats?.presentToday || 0}</Text>
              <Text style={styles.miniStatLabel}>Present</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="calendar-outline" size={14} color={Colors.warning} />
              <Text style={styles.miniStatValue}>{stats?.onLeave || 0}</Text>
              <Text style={styles.miniStatLabel}>Leave</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="briefcase-outline" size={14} color={Colors.purple} />
              <Text style={styles.miniStatValue}>{stats?.attendanceRate || 0}%</Text>
              <Text style={styles.miniStatLabel}>Rate</Text>
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
            <Text style={styles.loadingText}>Loading department data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDepartmentData}>
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
              {/* Stat Card - Total Employees */}
              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => goTo('Employees')}
                activeOpacity={0.7}
              >
                <LinearGradient colors={[...Gradients.primary]} style={styles.statGradient}>
                  <Ionicons name="people" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.totalEmployees}</Text>
                  <Text style={styles.statLabel}>Employees</Text>
                </View>
              </TouchableOpacity>

              {/* Stat Card - Present Today */}
              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => goTo('Attendance')}
                activeOpacity={0.7}
              >
                <LinearGradient colors={[...Gradients.success]} style={styles.statGradient}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.presentToday}</Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
              </TouchableOpacity>

              {/* Stat Card - On Leave */}
              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => goTo('Leaves')}
                activeOpacity={0.7}
              >
                <LinearGradient colors={[...Gradients.warning]} style={styles.statGradient}>
                  <Ionicons name="calendar" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.onLeave}</Text>
                  <Text style={styles.statLabel}>On Leave</Text>
                </View>
              </TouchableOpacity>

              {/* Stat Card - Pending Leaves */}
              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => goTo('LeaveRequests')}
                activeOpacity={0.7}
              >
                <LinearGradient colors={[...Gradients.purple]} style={styles.statGradient}>
                  <Ionicons name="time" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.pendingLeaves}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Department Info Card */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Department</Text>
              </View>

              <View style={styles.departmentInfoCard}>
                <LinearGradient
                  colors={[...Gradients.primary]}
                  style={styles.departmentIconLarge}
                >
                  <Ionicons name="business" size={28} color="#fff" />
                </LinearGradient>
                <View style={styles.departmentInfoContent}>
                  <Text style={styles.departmentInfoName}>{stats.departmentName}</Text>
                  <View style={styles.departmentInfoRow}>
                    <View style={styles.departmentInfoItem}>
                      <Ionicons name="people" size={14} color={Colors.textSecondary} />
                      <Text style={styles.departmentInfoText}>{stats.totalEmployees} Members</Text>
                    </View>
                    <View style={styles.departmentInfoItem}>
                      <Ionicons name="trending-up" size={14} color={Colors.success} />
                      <Text style={styles.departmentInfoText}>{stats.attendanceRate}% Attendance</Text>
                    </View>
                  </View>
                  <View style={styles.departmentInfoRow}>
                    <View style={styles.departmentInfoItem}>
                      <Ionicons name="person-add" size={14} color={Colors.textSecondary} />
                      <Text style={styles.departmentInfoText}>{stats.newJoiners} New This Month</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Recent Department Activities - Compact */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activities</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {stats.recentActivities.length > 0 ? (
                <View style={styles.activitiesList}>
                  {stats.recentActivities.slice(0, 2).map((activity) => (
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'flex-end',
  },
  dateTimeContainer: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  timeText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 10,
    color: Colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  // Stats Overview Bar
  statsOverviewBar: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundAlt,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  miniStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  miniStatLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
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
  // Compact Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.xl,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  statGradient: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  // Section Container
  sectionContainer: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.sectionTitle,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Compact Activities
  activitiesList: {
    gap: Spacing.sm,
  },
  compactActivityCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  activityIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityInfo: {
    flex: 1,
  },
  activityUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  activityDeptName: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activityStatusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  activityStatusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  errorText: {
    marginTop: Spacing.lg,
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  // Department Info Card
  departmentInfoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  departmentIconLarge: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  departmentInfoContent: {
    flex: 1,
  },
  departmentInfoName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  departmentInfoRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  departmentInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  departmentInfoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  // Empty State
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
    fontWeight: '600',
  },
});

export default HRDashboard;
