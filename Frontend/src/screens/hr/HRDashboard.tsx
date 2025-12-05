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
import { useTheme } from "../../contexts/ThemeContext";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import { apiService } from "../../lib/api";

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
  const { isDarkMode, colors } = useTheme();
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

      // 1. Fetch all employees and filter by department
      const allEmployees = await apiService.getEmployees();
      const departmentEmployees = allEmployees.filter(
        (emp: any) => emp.department === userDepartment
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
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      case 'approved': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      case 'new': return '#3b82f6';
      case 'submitted': return '#8b5cf6';
      case 'processing': return '#06b6d4';
      default: return '#6b7280';
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'leave': return '#fef3c7';
      case 'hire': return '#e0e7ff';
      case 'document': return '#dbeafe';
      case 'exit': return '#fee2e2';
      default: return '#f3f4f6';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.header }]} edges={['top']}>
      <StatusBar style="light" />

      {/* Modern HR Header */}
      <LinearGradient
        colors={['#3b82f6', '#2563eb']}
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
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                  style={styles.iconBadgeGradient}
                >
                  <Ionicons name="people" size={24} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.headerTextSection}>
                <Text style={styles.headerTitle}>HR Dashboard</Text>
                <Text style={styles.headerSubtitle}>Human Resources Management</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.dateTimeContainer}>
                <Text style={styles.timeText}>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              </View>
            </View>
          </View>

          {/* Stats Overview Bar */}
          <View style={styles.statsOverviewBar}>
            <View style={styles.miniStatItem}>
              <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats?.totalEmployees || 0}</Text>
              <Text style={styles.miniStatLabel}>Staff</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="checkmark-circle-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats?.presentToday || 0}</Text>
              <Text style={styles.miniStatLabel}>Present</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats?.onLeave || 0}</Text>
              <Text style={styles.miniStatLabel}>Leave</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="briefcase-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats?.attendanceRate || 0}%</Text>
              <Text style={styles.miniStatLabel}>Rate</Text>
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
              <View style={styles.statCard}>
                <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.statGradient}>
                  <Ionicons name="people" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.totalEmployees}</Text>
                  <Text style={styles.statLabel}>Employees</Text>
                </View>
              </View>

              {/* Stat Card - Present Today */}
              <View style={styles.statCard}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.statGradient}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.presentToday}</Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
              </View>

              {/* Stat Card - On Leave */}
              <View style={styles.statCard}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.statGradient}>
                  <Ionicons name="calendar" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.onLeave}</Text>
                  <Text style={styles.statLabel}>On Leave</Text>
                </View>
              </View>

              {/* Stat Card - Pending Leaves */}
              <View style={styles.statCard}>
                <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.statGradient}>
                  <Ionicons name="time" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.pendingLeaves}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
              </View>
            </Animated.View>

            {/* Department Info Card */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Department</Text>
              </View>

              <View style={styles.departmentInfoCard}>
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.departmentIconLarge}
                >
                  <Ionicons name="business" size={28} color="#fff" />
                </LinearGradient>
                <View style={styles.departmentInfoContent}>
                  <Text style={styles.departmentInfoName}>{stats.departmentName}</Text>
                  <View style={styles.departmentInfoRow}>
                    <View style={styles.departmentInfoItem}>
                      <Ionicons name="people" size={14} color="#6b7280" />
                      <Text style={styles.departmentInfoText}>{stats.totalEmployees} Members</Text>
                    </View>
                    <View style={styles.departmentInfoItem}>
                      <Ionicons name="trending-up" size={14} color="#10b981" />
                      <Text style={styles.departmentInfoText}>{stats.attendanceRate}% Attendance</Text>
                    </View>
                  </View>
                  <View style={styles.departmentInfoRow}>
                    <View style={styles.departmentInfoItem}>
                      <Ionicons name="person-add" size={14} color="#6b7280" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  // Decorative Pattern
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerContent: {
    paddingHorizontal: 20,
    position: 'relative',
    zIndex: 1,
  },
  // Header Top Section
  headerTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    marginRight: 14,
  },
  iconBadgeGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTextSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  dateTimeContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  timeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontWeight: '600',
  },
  // Stats Overview Bar
  statsOverviewBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  miniStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  miniStatLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
  },
  // Compact Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statGradient: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  // Section Container
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  // Compact Department Cards
  departmentList: {
    gap: 10,
  },
  compactDeptCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  deptCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  deptIconWrapper: {
    marginRight: 10,
  },
  deptIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deptInfo: {
    flex: 1,
  },
  deptName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  deptEmployees: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  deptBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deptGrowth: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '700',
    minWidth: 32,
  },
  // Compact Activities
  activitiesList: {
    gap: 8,
  },
  compactActivityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
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
    color: '#1f2937',
  },
  activityDeptName: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  activityStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
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
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
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
    marginTop: 16,
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  // Department Info Card
  departmentInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  departmentIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  departmentInfoContent: {
    flex: 1,
  },
  departmentInfoName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  departmentInfoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  departmentInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  departmentInfoText: {
    fontSize: 12,
    color: '#6b7280',
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
    color: '#9ca3af',
    marginTop: 12,
    fontWeight: '600',
  },
});

export default HRDashboard;
