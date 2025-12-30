import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import { formatTimeIST, getDayMonthIST, formatDateIST } from "../../utils/dateTime";
import { Colors, Spacing, BorderRadius, Typography, Shadows, CardStyles, HeaderStyles } from "../../constants/designSystem";

const { width } = Dimensions.get('window');

// Dashboard data interface
interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  lateArrivals: number;
  pendingLeaves: number;
  activeTasks: number;
  completedTasks: number;
  departments: number;
  newHires: number;
  openPositions: number;
  attendanceRate: number;
  taskCompletionRate: number;
  departmentPerformance: Array<{
    name: string;
    employees: number;
    performance: number;
    growth: string;
  }>;
  recentActivities: Array<{
    id: number;
    type: string;
    user: string;
    dept: string;
    time: string;
    status: string;
    icon: string;
  }>;
}

// Recent Decision interface
interface RecentDecision {
  leave_id: number;
  user: {
    name: string;
    department: string;
  };
  leave_type: string;
  start_date: string;
  end_date: string;
  status: 'Approved' | 'Rejected';
  approver?: {
    name: string;
  };
  decision_date?: string;
  days: number;
}

// Default empty state
const defaultStats: DashboardStats = {
  totalEmployees: 0,
  presentToday: 0,
  onLeave: 0,
  lateArrivals: 0,
  pendingLeaves: 0,
  activeTasks: 0,
  completedTasks: 0,
  departments: 0,
  newHires: 0,
  openPositions: 0,
  attendanceRate: 0,
  taskCompletionRate: 0,
  departmentPerformance: [],
  recentActivities: [],
};

const AdminDashboard: React.FC = () => {
  const navigation = useNavigation<any>();
  const { logout, user } = useAuth();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();

  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentDecisions, setRecentDecisions] = useState<RecentDecision[]>([]);
  const [recentDecisionsModalVisible, setRecentDecisionsModalVisible] = useState(false);

  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const response = await apiService.getDashboardByRole('admin');

      // Map API response to our stats structure
      const mappedStats: DashboardStats = {
        totalEmployees: response.total_employees || response.totalEmployees || 0,
        presentToday: response.present_today || response.presentToday || 0,
        onLeave: response.on_leave || response.onLeave || 0,
        lateArrivals: response.late_arrivals || response.lateArrivals || 0,
        pendingLeaves: response.pending_leaves || response.pendingLeaves || 0,
        activeTasks: response.active_tasks || response.activeTasks || 0,
        completedTasks: response.completed_tasks || response.completedTasks || 0,
        departments: response.departments || response.total_departments || 0,
        newHires: response.new_hires || response.newHires || 0,
        openPositions: response.open_positions || response.openPositions || 0,
        attendanceRate: response.attendance_rate || response.attendanceRate || 0,
        taskCompletionRate: response.task_completion_rate || response.taskCompletionRate || 0,
        departmentPerformance: (response.department_performance || response.departmentPerformance || []).map((dept: any) => ({
          name: dept.name || dept.department_name || 'Unknown',
          employees: dept.employees || dept.employee_count || 0,
          performance: dept.performance || dept.performance_rate || 0,
          growth: dept.growth || '+0%',
        })),
        recentActivities: (response.recent_activities || response.recentActivities || []).map((activity: any, index: number) => ({
          id: activity.id || index + 1,
          type: activity.type || activity.activity_type || 'check-in',
          user: activity.user || activity.user_name || activity.employee_name || 'Unknown',
          dept: activity.dept || activity.department || 'N/A',
          time: activity.time || activity.created_at || 'N/A',
          status: activity.status || 'completed',
          icon: getActivityIcon(activity.type || activity.activity_type || 'check-in'),
        })),
      };

      setStats(mappedStats);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    }
  }, []);

  const fetchRecentDecisions = useCallback(async () => {
    try {
      // Fetch team leaves to get recent decisions
      const response = await apiService.getTeamLeaves();
      const teamLeaves = response.leaves || [];
      
      // Filter for recent approved/rejected leaves (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const decisions = teamLeaves
        .filter((leave: any) => 
          (leave.status === 'Approved' || leave.status === 'Rejected') &&
          new Date(leave.updated_at || leave.created_at) >= thirtyDaysAgo
        )
        .sort((a: any, b: any) => 
          new Date(b.updated_at || b.created_at).getTime() - 
          new Date(a.updated_at || a.created_at).getTime()
        )
        .slice(0, 10) // Get latest 10 decisions
        .map((leave: any) => ({
          leave_id: leave.leave_id || leave.id,
          user: {
            name: leave.user?.name || leave.name || leave.employee_name || 'Unknown Employee',
            department: leave.user?.department || leave.department || 'Unknown Department',
          },
          leave_type: leave.leave_type || 'Annual Leave',
          start_date: leave.start_date,
          end_date: leave.end_date,
          status: leave.status,
          approver: leave.approver || null,
          decision_date: leave.updated_at || leave.created_at,
          days: leave.days || 1,
        }));

      setRecentDecisions(decisions);
    } catch (err: any) {
      console.error('Failed to fetch recent decisions:', err);
    }
  }, []);

  const getActivityIcon = (type: string): string => {
    switch (type) {
      case 'check-in': return 'checkmark-circle';
      case 'leave': return 'calendar';
      case 'task': return 'checkbox';
      case 'hire': return 'person-add';
      default: return 'ellipse';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchRecentDecisions()
      ]);
      setLoading(false);
      startAnimations();
    };
    loadData();
  }, [fetchDashboardData, fetchRecentDecisions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboardData(),
      fetchRecentDecisions()
    ]);
    setRefreshing(false);
  }, [fetchDashboardData, fetchRecentDecisions]);

  const startAnimations = () => {
    // Header animation
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Stats cards staggered animation
    Animated.stagger(100, [
      Animated.spring(statsAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      ...cardsAnim.map(anim =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        })
      ),
    ]).start();
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
      case 'on-time': case 'completed': case 'approved': return Colors.success;
      case 'pending': return Colors.warning;
      case 'late': return Colors.error;
      case 'new': return Colors.primary;
      default: return Colors.textSecondary;
    }
  };

  const getLeaveTypeColor = (leaveType: string) => {
    switch (leaveType.toLowerCase()) {
      case 'annual leave': case 'annual': return Colors.primary;
      case 'sick leave': case 'sick': return Colors.error;
      case 'casual leave': case 'casual': return Colors.success;
      case 'maternity leave': case 'maternity': return '#ec4899';
      case 'paternity leave': case 'paternity': return Colors.purple;
      case 'unpaid leave': case 'unpaid': return Colors.textSecondary;
      default: return Colors.textSecondary;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'check-in': return Colors.successLight;
      case 'leave': return Colors.warningLight;
      case 'task': return Colors.primaryLight;
      case 'hire': return Colors.purpleLight;
      default: return Colors.borderLight;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" backgroundColor={Colors.surface} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading Dashboard...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor={Colors.surface} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Clean White Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.headerText} />
              </TouchableOpacity>
              
              <Animated.View
                style={[
                  styles.headerTitleContainer,
                  {
                    opacity: headerAnim,
                    transform: [
                      {
                        translateY: headerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-10, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.headerTitle}>Dashboard</Text>
                <Text style={styles.headerSubtitle}>Administrator Control Panel</Text>
              </Animated.View>

              <View style={styles.headerActions}>
                <View style={styles.dateTimeContainer}>
                  <Text style={styles.timeText}>{formatTimeIST(new Date())}</Text>
                  <Text style={styles.dateText}>{getDayMonthIST(new Date())}</Text>
                </View>
              </View>
            </View>

            {/* Quick Stats Bar */}
            <View style={styles.quickStatsBar}>
              <View style={styles.quickStatItem}>
                <Ionicons name="people-outline" size={16} color={Colors.primary} />
                <Text style={styles.quickStatValue}>{stats.totalEmployees}</Text>
                <Text style={styles.quickStatLabel}>Staff</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.quickStatItem}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
                <Text style={styles.quickStatValue}>{stats.presentToday}</Text>
                <Text style={styles.quickStatLabel}>Present</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.quickStatItem}>
                <Ionicons name="time-outline" size={16} color={Colors.warning} />
                <Text style={styles.quickStatValue}>{stats.pendingLeaves}</Text>
                <Text style={styles.quickStatLabel}>Pending</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.quickStatItem}>
                <Ionicons name="briefcase-outline" size={16} color={Colors.info} />
                <Text style={styles.quickStatValue}>{stats.departments}</Text>
                <Text style={styles.quickStatLabel}>Depts</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: tabBarVisible ? tabBarHeight + 24 : 24 },
            ]}
            onScroll={onScroll}
            scrollEventThrottle={scrollEventThrottle}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
            }
          >
            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Stats Grid */}
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
              {/* Present Today Card */}
              <TouchableOpacity style={styles.statCard} onPress={() => goTo('Attendance')} activeOpacity={0.7}>
                <View style={[styles.statIconContainer, { backgroundColor: Colors.successLight }]}>
                  <Ionicons name="people" size={20} color={Colors.success} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.presentToday}</Text>
                  <Text style={styles.statLabel}>Present Today</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
              </TouchableOpacity>

              {/* On Leave Card */}
              <TouchableOpacity style={styles.statCard} onPress={() => goTo('Leaves')} activeOpacity={0.7}>
                <View style={[styles.statIconContainer, { backgroundColor: Colors.warningLight }]}>
                  <Ionicons name="calendar" size={20} color={Colors.warning} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.onLeave}</Text>
                  <Text style={styles.statLabel}>On Leave</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
              </TouchableOpacity>

              {/* Active Tasks Card */}
              <TouchableOpacity style={styles.statCard} onPress={() => goTo('Tasks')} activeOpacity={0.7}>
                <View style={[styles.statIconContainer, { backgroundColor: Colors.primaryLight }]}>
                  <Ionicons name="checkbox" size={20} color={Colors.primary} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.activeTasks}</Text>
                  <Text style={styles.statLabel}>Active Tasks</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
              </TouchableOpacity>

              {/* Pending Leaves Card */}
              <TouchableOpacity style={styles.statCard} onPress={() => goTo('Leaves')} activeOpacity={0.7}>
                <View style={[styles.statIconContainer, { backgroundColor: Colors.purpleLight }]}>
                  <Ionicons name="time" size={20} color={Colors.purple} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{stats.pendingLeaves}</Text>
                  <Text style={styles.statLabel}>Pending Leaves</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
              </TouchableOpacity>
            </Animated.View>

            {/* Department Performance */}
            {stats.departmentPerformance.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Department Performance</Text>
                  <TouchableOpacity onPress={() => goTo('Departments')}>
                    <Text style={styles.seeAllText}>View All</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.departmentList}>
                  {stats.departmentPerformance.slice(0, 3).map((dept, index) => (
                    <TouchableOpacity
                      key={dept.name}
                      onPress={() => navigation.navigate('Reports', { department: dept.name })}
                      activeOpacity={0.7}
                    >
                      <Animated.View
                        style={[
                          styles.departmentCard,
                          {
                            opacity: cardsAnim[index] || new Animated.Value(1),
                            transform: [
                              {
                                translateX: (cardsAnim[index] || new Animated.Value(1)).interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [-20, 0],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <View style={styles.departmentCardHeader}>
                          <View style={styles.departmentIconContainer}>
                            <View
                              style={[
                                styles.departmentIcon,
                                {
                                  backgroundColor:
                                    index === 0
                                      ? Colors.primaryLight
                                      : index === 1
                                        ? Colors.successLight
                                        : Colors.warningLight,
                                },
                              ]}
                            >
                              <Ionicons
                                name="briefcase"
                                size={18}
                                color={
                                  index === 0
                                    ? Colors.primary
                                    : index === 1
                                      ? Colors.success
                                      : Colors.warning
                                }
                              />
                            </View>
                          </View>
                          <View style={styles.departmentInfo}>
                            <Text style={styles.departmentName}>{dept.name}</Text>
                            <Text style={styles.departmentEmployees}>{dept.employees} employees</Text>
                          </View>
                          <View style={styles.departmentBadge}>
                            <Text style={styles.departmentGrowth}>{dept.growth}</Text>
                          </View>
                        </View>
                        <View style={styles.progressContainer}>
                          <View style={styles.progressTrack}>
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  width: `${dept.performance}%`,
                                  backgroundColor:
                                    index === 0
                                      ? Colors.primary
                                      : index === 1
                                        ? Colors.success
                                        : Colors.warning,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.progressText}>{dept.performance}%</Text>
                        </View>
                      </Animated.View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Empty State for Departments */}
            {stats.departmentPerformance.length === 0 && !loading && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Department Performance</Text>
                </View>
                <View style={styles.emptyState}>
                  <Ionicons name="briefcase-outline" size={40} color={Colors.textTertiary} />
                  <Text style={styles.emptyStateText}>No department data available</Text>
                </View>
              </View>
            )}

            {/* Recent Activities */}
            {stats.recentActivities.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Activities</Text>
                  <TouchableOpacity onPress={() => goTo('RecentActivities')}>
                    <Text style={styles.seeAllText}>View All</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.activitiesList}>
                  {stats.recentActivities.slice(0, 3).map((activity) => (
                    <View key={activity.id} style={styles.activityCard}>
                      <View style={[styles.activityIcon, { backgroundColor: getIconBg(activity.type) }]}>
                        <Ionicons name={activity.icon as any} size={18} color={getStatusColor(activity.status)} />
                      </View>
                      <View style={styles.activityInfo}>
                        <Text style={styles.activityUserName}>{activity.user}</Text>
                        <Text style={styles.activityDetails}>{activity.dept} • {activity.time}</Text>
                      </View>
                      <View style={[styles.activityStatusBadge, { backgroundColor: getStatusColor(activity.status) }]}>
                        <Text style={styles.activityStatusText}>{activity.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Empty State for Activities */}
            {stats.recentActivities.length === 0 && !loading && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Activities</Text>
                </View>
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={40} color={Colors.textTertiary} />
                  <Text style={styles.emptyStateText}>No recent activities</Text>
                </View>
              </View>
            )}

            {/* Recent Decisions Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Leave Decisions</Text>
                <TouchableOpacity onPress={() => setRecentDecisionsModalVisible(true)}>
                  <Text style={styles.seeAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {recentDecisions.length > 0 ? (
                <View style={styles.recentDecisionsList}>
                  {recentDecisions.slice(0, 3).map((decision) => (
                    <View key={decision.leave_id} style={styles.recentDecisionCard}>
                      <View style={[
                        styles.recentDecisionLeftBar,
                        { backgroundColor: decision.status === 'Approved' ? Colors.success : Colors.error }
                      ]} />
                      <View style={styles.recentDecisionContent}>
                        <View style={styles.recentDecisionTop}>
                          <View style={styles.recentDecisionInfo}>
                            <Text style={styles.recentDecisionName}>{decision.user.name}</Text>
                            <View style={[
                              styles.recentDecisionTypeBadge,
                              { backgroundColor: getLeaveTypeColor(decision.leave_type) + '20' }
                            ]}>
                              <Text style={[
                                styles.recentDecisionTypeText,
                                { color: getLeaveTypeColor(decision.leave_type) }
                              ]}>
                                {decision.leave_type}
                              </Text>
                            </View>
                          </View>
                          <View style={[
                            styles.recentDecisionStatusBadge,
                            { backgroundColor: decision.status === 'Approved' ? Colors.success : Colors.error }
                          ]}>
                            <Text style={styles.recentDecisionStatusText}>{decision.status}</Text>
                          </View>
                        </View>
                        <View style={styles.recentDecisionBottom}>
                          <Text style={styles.recentDecisionDate}>
                            {formatDateIST(new Date(decision.start_date))} - {formatDateIST(new Date(decision.end_date))}
                          </Text>
                          <Text style={styles.recentDecisionDept}>
                            • {decision.user.department}
                          </Text>
                        </View>
                        {decision.approver?.name && (
                          <View style={styles.recentDecisionApproverRow}>
                            <Ionicons name="person-circle-outline" size={14} color={Colors.textSecondary} />
                            <Text style={styles.recentDecisionApproverText}>
                              {decision.status === 'Approved' ? 'Approved' : 'Rejected'} by {decision.approver.name}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={40} color={Colors.textTertiary} />
                  <Text style={styles.emptyStateText}>No recent leave decisions</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Recent Decisions Modal */}
        <Modal 
          visible={recentDecisionsModalVisible} 
          animationType="slide" 
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalBackButton}
                onPress={() => setRecentDecisionsModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.headerText} />
              </TouchableOpacity>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Recent Leave Decisions</Text>
                <Text style={styles.modalSubtitle}>
                  {recentDecisions.length} decisions in the last 30 days
                </Text>
              </View>
            </View>

            {/* Modal Content */}
            <View style={styles.modalContent}>
              {recentDecisions.length > 0 ? (
                <FlatList
                  data={recentDecisions}
                  keyExtractor={(item) => item.leave_id.toString()}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalList}
                  renderItem={({ item: decision }) => (
                    <View style={styles.recentDecisionCard}>
                      <View style={[
                        styles.recentDecisionLeftBar,
                        { backgroundColor: decision.status === 'Approved' ? Colors.success : Colors.error }
                      ]} />
                      <View style={styles.recentDecisionContent}>
                        <View style={styles.recentDecisionTop}>
                          <View style={styles.recentDecisionInfo}>
                            <Text style={styles.recentDecisionName}>{decision.user.name}</Text>
                            <View style={[
                              styles.recentDecisionTypeBadge,
                              { backgroundColor: getLeaveTypeColor(decision.leave_type) + '20' }
                            ]}>
                              <Text style={[
                                styles.recentDecisionTypeText,
                                { color: getLeaveTypeColor(decision.leave_type) }
                              ]}>
                                {decision.leave_type}
                              </Text>
                            </View>
                          </View>
                          <View style={[
                            styles.recentDecisionStatusBadge,
                            { backgroundColor: decision.status === 'Approved' ? Colors.success : Colors.error }
                          ]}>
                            <Text style={styles.recentDecisionStatusText}>{decision.status}</Text>
                          </View>
                        </View>
                        <View style={styles.recentDecisionBottom}>
                          <Text style={styles.recentDecisionDate}>
                            {formatDateIST(new Date(decision.start_date))} - {formatDateIST(new Date(decision.end_date))}
                          </Text>
                          <Text style={styles.recentDecisionDept}>
                            • {decision.user.department} • {decision.days} day{decision.days !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        {decision.approver?.name && (
                          <View style={styles.recentDecisionApproverRow}>
                            <Ionicons name="person-circle-outline" size={14} color={Colors.textSecondary} />
                            <Text style={styles.recentDecisionApproverText}>
                              {decision.status === 'Approved' ? 'Approved' : 'Rejected'} by {decision.approver.name}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                />
              ) : (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="document-text-outline" size={60} color={Colors.textTertiary} />
                  <Text style={styles.modalEmptyStateTitle}>No Recent Decisions</Text>
                  <Text style={styles.modalEmptyStateText}>
                    No leave decisions have been made in the last 30 days
                  </Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </View>
  );
};


const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },

  // Clean White Header (matching LeaveManagement)
  headerContainer: {
    backgroundColor: Colors.surface,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.headerBorder,
  },
  headerContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.headerBorder,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerTitle: {
    ...Typography.screenTitle,
  },
  headerSubtitle: {
    ...Typography.secondary,
    marginTop: 2,
  },
  headerActions: {
    alignItems: 'flex-end',
  },
  dateTimeContainer: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  dateText: {
    fontSize: 10,
    color: Colors.primaryDark,
    marginTop: 2,
    fontWeight: '600',
  },

  // Quick Stats Bar
  quickStatsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  quickStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  quickStatLabel: {
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

  // Content Container
  contentContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },

  // Error Container
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLighter,
    padding: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.errorLight,
  },
  errorText: {
    flex: 1,
    color: Colors.error,
    fontSize: 13,
  },
  retryButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
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
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.sectionTitle,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Empty State
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
  },

  // Department Cards
  departmentList: {
    gap: 12,
  },
  departmentCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  departmentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  departmentIconContainer: {
    marginRight: 12,
  },
  departmentIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  departmentInfo: {
    flex: 1,
  },
  departmentName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  departmentEmployees: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  departmentBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  departmentGrowth: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
    minWidth: 32,
  },

  // Activities
  activitiesList: {
    gap: 10,
  },
  activityCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  activityDetails: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activityStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  activityStatusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  // Recent Decisions
  recentDecisionsList: {
    gap: 10,
  },
  recentDecisionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  recentDecisionLeftBar: {
    width: 4,
  },
  recentDecisionContent: {
    flex: 1,
    padding: 14,
  },
  recentDecisionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recentDecisionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  recentDecisionName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  recentDecisionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  recentDecisionTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recentDecisionStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.xs,
  },
  recentDecisionStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  recentDecisionBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  recentDecisionDate: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  recentDecisionDept: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  recentDecisionApproverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  recentDecisionApproverText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.md,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    ...Typography.screenTitle,
  },
  modalSubtitle: {
    ...Typography.secondary,
    marginTop: 2,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  modalList: {
    gap: 12,
  },
  modalEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalEmptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  modalEmptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AdminDashboard;
