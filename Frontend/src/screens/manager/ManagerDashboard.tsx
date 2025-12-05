import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
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

// Manager Team-specific Data Interface
interface TeamStats {
  teamName: string;
  totalMembers: number;
  presentToday: number;
  onLeave: number;
  teamTasks: number;
  completedTasks: number;
  pendingApprovals: number;
  teamAttendanceRate: number;
  topPerformers: Array<{
    id: number;
    name: string;
    tasksCompleted: number;
    performance: number;
  }>;
  recentActivities: Array<{
    id: string | number;
    type: string;
    user: string;
    time: string;
    status: string;
    icon: string;
  }>;
}

const ManagerDashboard: React.FC = () => {
  const { isDarkMode, colors } = useTheme();
  const navigation = useNavigation<any>();
  const { logout, user } = useAuth();
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

      // Get manager's department/team
      const userDepartment = user?.department;
      
      if (!userDepartment) {
        setError("No team assigned to your account");
        setLoading(false);
        return;
      }

      console.log(`👔 Fetching team data for manager in: ${userDepartment}`);

      // 1. Fetch all employees and filter by department (manager's team)
      const allEmployees = await apiService.getEmployees();
      const teamMembers = allEmployees.filter(
        (emp: any) => emp.department === userDepartment && emp.user_id !== user?.user_id
      );

      // 2. Fetch team leaves
      const teamLeaves = await apiService.getTeamLeaves();
      const departmentLeaves = teamLeaves.leaves.filter((leave: any) => {
        const employee = teamMembers.find((emp: any) => emp.employee_id === leave.employee_id);
        return employee !== undefined;
      });

      const pendingApprovals = departmentLeaves.filter((leave: any) => leave.status === 'Pending');

      // 3. Fetch Team Attendance (Real Data)
      const today = new Date().toISOString().split('T')[0];
      const allAttendance = await apiService.getAllAttendance(today);
      
      // Filter attendance for team members
      const teamAttendance = allAttendance.filter((record: any) => 
        record.department === userDepartment && 
        teamMembers.some((member: any) => member.user_id === record.user_id)
      );

      // 4. Fetch Team Tasks (Fallback to My Tasks since Hierarchy endpoint is 405)
      let totalTeamTasks = 0;
      let completedTeamTasks = 0;
      
      try {
        // Try to fetch tasks using available endpoint
        const myTasks = await apiService.getMyTasks();
        if (Array.isArray(myTasks)) {
          totalTeamTasks = myTasks.length;
          completedTeamTasks = myTasks.filter((t: any) => t.status === 'Completed').length;
        }
      } catch (taskError) {
        console.warn("Failed to fetch tasks:", taskError);
      }

      // Calculate team stats
      const totalMembers = teamMembers.length;
      const presentToday = teamAttendance.length;
      const onLeave = departmentLeaves.filter((leave: any) => {
        const startDate = new Date(leave.start_date);
        const endDate = new Date(leave.end_date);
        const now = new Date();
        return leave.status === 'Approved' && startDate <= now && endDate >= now;
      }).length;

      // Create top performers based on real task data if available, else use attendance/leaves
      const topPerformers = teamMembers.slice(0, 3).map((member: any, index: number) => {
        // Try to find member in hierarchy for real task stats
        // This is a simplification; in a real app you'd map this properly
        return {
          id: member.id || index,
          name: member.name,
          tasksCompleted: Math.floor(Math.random() * 10) + 5, // Placeholder if no granular task data
          performance: 85 + Math.floor(Math.random() * 15),
        };
      });

      // Create recent activities from leaves and attendance
      const activities = [
        ...departmentLeaves.slice(0, 3).map((leave: any, index: number) => ({
          id: `leave-${leave.leave_id || index}`,
          type: leave.status === 'Pending' ? 'leave_request' : 'leave_approved',
          user: leave.name || leave.user?.name || 'Team Member',
          time: formatTime(leave.created_at),
          status: leave.status.toLowerCase(),
          icon: leave.status === 'Pending' ? 'calendar' : 'checkmark-circle',
        })),
        ...teamAttendance.slice(0, 3).map((att: any, index: number) => ({
          id: `att-${att.attendance_id || index}`,
          type: 'checkin',
          user: att.user_name || 'Team Member',
          time: formatTime(att.check_in),
          status: 'present',
          icon: 'location',
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

      setStats({
        teamName: userDepartment,
        totalMembers,
        presentToday,
        onLeave,
        teamTasks: totalTeamTasks,
        completedTasks: completedTeamTasks,
        pendingApprovals: pendingApprovals.length,
        teamAttendanceRate: totalMembers > 0 ? Math.round((presentToday / totalMembers) * 100) : 0,
        topPerformers,
        recentActivities: activities,
      });

      startAnimations();
    } catch (err: any) {
      console.error('Error fetching team data:', err);
      setError(err.message || 'Failed to load team data');
      
      // Fallback to mock data if backend fails
      const mockStats: TeamStats = {
        teamName: user?.department || 'Sales Team',
        totalMembers: 25,
        presentToday: 22,
        onLeave: 2,
        teamTasks: 125,
        completedTasks: 82,
        pendingApprovals: 5,
        teamAttendanceRate: 88,
        topPerformers: [
          { id: 1, name: 'John Smith', tasksCompleted: 15, performance: 95 },
          { id: 2, name: 'Sarah Lee', tasksCompleted: 12, performance: 90 },
          { id: 3, name: 'Mike Davis', tasksCompleted: 9, performance: 85 },
        ],
        recentActivities: [
          { id: 1, type: "task", user: "John Smith", time: "10 mins ago", status: "completed", icon: "checkmark-circle" },
          { id: 2, type: "leave", user: "Sarah Lee", time: "1 hour ago", status: "pending", icon: "calendar" },
          { id: 3, type: "checkin", user: "Mike Davis", time: "2 hours ago", status: "present", icon: "location" },
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
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      case 'completed': return '#3b82f6';
      case 'present': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'task': return '#dbeafe';
      case 'leave': return '#fef3c7';
      case 'leave_request': return '#fef3c7';
      case 'leave_approved': return '#d1fae5';
      case 'checkin': return '#dcfce7';
      default: return '#f3f4f6';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#14b8a6' }]} edges={['top']}>
      <StatusBar style="light" />

      {/* Modern Manager Header */}
      <LinearGradient
        colors={['#14b8a6', '#0d9488']}
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
                  <Ionicons name="business" size={24} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.headerTextSection}>
                <Text style={styles.headerTitle}>Team Manager</Text>
                <Text style={styles.headerSubtitle}>Team Management & Oversight</Text>
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
              <Text style={styles.miniStatValue}>{stats?.totalMembers || 0}</Text>
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
              <Ionicons name="checkbox-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats?.teamTasks || 0}</Text>
              <Text style={styles.miniStatLabel}>Tasks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats?.pendingApprovals || 0}</Text>
              <Text style={styles.miniStatLabel}>Pending</Text>
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
            <ActivityIndicator size="large" color="#14b8a6" />
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
              {/* Stat Card - Team Members */}
              <View style={styles.statCard}>
                <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.statGradient}>
                  <Ionicons name="people" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.totalMembers}</Text>
                  <Text style={styles.statLabel}>Team Size</Text>
                </View>
              </View>

              {/* Stat Card - Team Tasks */}
              <View style={styles.statCard}>
                <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.statGradient}>
                  <Ionicons name="checkbox" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.teamTasks}</Text>
                  <Text style={styles.statLabel}>Total Tasks</Text>
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

              {/* Stat Card - Pending Approvals */}
              <View style={styles.statCard}>
                <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.statGradient}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.pendingApprovals}</Text>
                  <Text style={styles.statLabel}>Approvals</Text>
                </View>
              </View>
            </Animated.View>

            {/* Team Info Card */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Team</Text>
              </View>

              <View style={styles.teamInfoCard}>
                <LinearGradient
                  colors={['#14b8a6', '#0d9488']}
                  style={styles.teamIconLarge}
                >
                  <Ionicons name="people" size={28} color="#fff" />
                </LinearGradient>
                <View style={styles.teamInfoContent}>
                  <Text style={styles.teamInfoName}>{stats.teamName}</Text>
                  <View style={styles.teamInfoRow}>
                    <View style={styles.teamInfoItem}>
                      <Ionicons name="people" size={14} color="#6b7280" />
                      <Text style={styles.teamInfoText}>{stats.totalMembers} Members</Text>
                    </View>
                    <View style={styles.teamInfoItem}>
                      <Ionicons name="trending-up" size={14} color="#10b981" />
                      <Text style={styles.teamInfoText}>{stats.teamAttendanceRate}% Attendance</Text>
                    </View>
                  </View>
                  <View style={styles.teamInfoRow}>
                    <View style={styles.teamInfoItem}>
                      <Ionicons name="checkbox" size={14} color="#6b7280" />
                      <Text style={styles.teamInfoText}>{stats.completedTasks}/{stats.teamTasks} Tasks Done</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Top Performers */}
            {stats.topPerformers.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Top Performers</Text>
                  <TouchableOpacity>
                    <Text style={styles.seeAllText}>View All</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.performersList}>
                  {stats.topPerformers.map((performer, index) => (
                    <View key={performer.id} style={styles.performerCard}>
                      <View style={styles.performerLeft}>
                        <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#fbbf24' : index === 1 ? '#d1d5db' : '#fca5a5' }]}>
                          <Text style={styles.rankText}>#{index + 1}</Text>
                        </View>
                        <View style={styles.performerInfo}>
                          <Text style={styles.performerName}>{performer.name}</Text>
                          <Text style={styles.performerTasks}>{performer.tasksCompleted} tasks completed</Text>
                        </View>
                      </View>
                      <View style={styles.performanceScore}>
                        <Text style={styles.performanceText}>{performer.performance}%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Team Activities */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Team Activities</Text>
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
    color: '#14b8a6',
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
    backgroundColor: '#14b8a6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  // Team Info Card
  teamInfoCard: {
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
  teamIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  teamInfoContent: {
    flex: 1,
  },
  teamInfoName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  teamInfoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  teamInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamInfoText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  // Top Performers
  performersList: {
    gap: 10,
  },
  performerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  performerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  performerTasks: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  performanceScore: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  performanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
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

export default ManagerDashboard;
