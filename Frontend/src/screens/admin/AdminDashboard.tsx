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
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { apiService } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";

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
  const { isDarkMode, colors } = useTheme();
  const navigation = useNavigation<any>();
  const { logout, user } = useAuth();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();

  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await fetchDashboardData();
      setLoading(false);
      startAnimations();
    };
    loadData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData]);

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
      case 'on-time': case 'completed': case 'approved': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'late': return '#ef4444';
      case 'new': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'check-in': return '#dcfce7';
      case 'leave': return '#fef3c7';
      case 'task': return '#dbeafe';
      case 'hire': return '#e0e7ff';
      default: return '#f3f4f6';
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar style="light" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading Dashboard...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />

        {/* Modern Sophisticated Header */}
        <View style={styles.headerGradient}>
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
                  <Ionicons name="speedometer" size={24} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.headerTextSection}>
                <Text style={styles.headerTitle}>Dashboard</Text>
                <Text style={styles.headerSubtitle}>Administrator Control Panel</Text>
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
              <Text style={styles.miniStatValue}>{stats.totalEmployees}</Text>
              <Text style={styles.miniStatLabel}>Staff</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="trending-up-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats.attendanceRate}%</Text>
              <Text style={styles.miniStatLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="checkmark-circle-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats.activeTasks}</Text>
              <Text style={styles.miniStatLabel}>Tasks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="briefcase-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{stats.departments}</Text>
              <Text style={styles.miniStatLabel}>Depts</Text>
            </View>
          </View>
        </Animated.View>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} />
        }
      >
        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

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
          {/* Stat Card - Present Today */}
          <TouchableOpacity style={styles.statCard} onPress={() => goTo('Attendance')} activeOpacity={0.7}>
            <LinearGradient colors={['#10b981', '#059669']} style={styles.statGradient}>
              <Ionicons name="people" size={18} color="#fff" />
            </LinearGradient>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{stats.presentToday}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>

          {/* Stat Card - On Leave */}
          <TouchableOpacity style={styles.statCard} onPress={() => goTo('Leaves')} activeOpacity={0.7}>
            <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.statGradient}>
              <Ionicons name="calendar" size={18} color="#fff" />
            </LinearGradient>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{stats.onLeave}</Text>
              <Text style={styles.statLabel}>On Leave</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>

          {/* Stat Card - Active Tasks */}
          <TouchableOpacity style={styles.statCard} onPress={() => goTo('Tasks')} activeOpacity={0.7}>
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.statGradient}>
              <Ionicons name="checkbox" size={18} color="#fff" />
            </LinearGradient>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{stats.activeTasks}</Text>
              <Text style={styles.statLabel}>Tasks</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>

          {/* Stat Card - Pending Leaves */}
          <TouchableOpacity style={styles.statCard} onPress={() => goTo('Leaves')} activeOpacity={0.7}>
            <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.statGradient}>
              <Ionicons name="time" size={18} color="#fff" />
            </LinearGradient>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{stats.pendingLeaves}</Text>
              <Text style={styles.statLabel}>Pending Leave</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </Animated.View>

        {/* Department Performance - Compact */}
        {stats.departmentPerformance.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Departments</Text>
              <TouchableOpacity onPress={() => goTo('Departments')}>
                <Text style={styles.seeAllText}>See All</Text>
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
                      styles.compactDeptCard,
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
                    <View style={styles.deptCardHeader}>
                      <View style={styles.deptIconWrapper}>
                        <LinearGradient
                          colors={
                            index === 0
                              ? ['#3b82f6', '#2563eb']
                              : index === 1
                              ? ['#10b981', '#059669']
                              : ['#f59e0b', '#d97706']
                          }
                          style={styles.deptIcon}
                        >
                          <Ionicons name="briefcase" size={16} color="#fff" />
                        </LinearGradient>
                      </View>
                      <View style={styles.deptInfo}>
                        <Text style={styles.deptName}>{dept.name}</Text>
                        <Text style={styles.deptEmployees}>{dept.employees} employees</Text>
                      </View>
                      <View style={styles.deptBadge}>
                        <Text style={styles.deptGrowth}>{dept.growth}</Text>
                      </View>
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressTrack}>
                        <LinearGradient
                          colors={
                            index === 0
                              ? ['#3b82f6', '#2563eb']
                              : index === 1
                              ? ['#10b981', '#059669']
                              : ['#f59e0b', '#d97706']
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.progressFill, { width: `${dept.performance}%` }]}
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
              <Text style={styles.sectionTitle}>Top Departments</Text>
            </View>
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={40} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No department data available</Text>
            </View>
          </View>
        )}

        {/* Recent Activities - Compact */}
        {stats.recentActivities.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activities</Text>
              <TouchableOpacity onPress={() => goTo('RecentActivities')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.activitiesList}>
              {stats.recentActivities.map((activity) => (
                <View key={activity.id} style={styles.compactActivityCard}>
                  <View style={[styles.activityIconSmall, { backgroundColor: getIconBg(activity.type) }]}>
                    <Ionicons name={activity.icon as any} size={16} color={getStatusColor(activity.status)} />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityUserName}>{activity.user}</Text>
                    <Text style={styles.activityDeptName}>{activity.dept} • {activity.time}</Text>
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
              <Ionicons name="time-outline" size={40} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No recent activities</Text>
            </View>
          </View>
        )}
      </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};


const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
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
  // Error Container
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 13,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
    color: '#667eea',
  },
  // Empty State
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
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
});

export default AdminDashboard;
