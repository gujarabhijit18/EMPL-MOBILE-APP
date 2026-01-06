import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from 'expo-status-bar';
import {
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Building2,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  LayoutDashboard,
  ChevronLeft,
  MessageSquare
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import { useModuleBadges } from "../../contexts/ModuleBadgeContext";
import { formatTimeIST, getDayMonthIST } from "../../utils/dateTime";
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
  Gradients,
  getStatusBadgeStyle
} from "../../constants/designSystem";

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - (Spacing.lg * 2) - Spacing.md) / 2;

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
  const { user } = useAuth();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();
  const { badges, resetBadge } = useModuleBadges();
  const unreadMessages = badges.chat || 0;

  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const response = await apiService.getDashboardByRole('admin');

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
          icon: activity.type || activity.activity_type || 'check-in',
        })),
      };

      setStats(mappedStats);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    }
  }, []);

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
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 800,
        delay: 200,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(cardsAnim, {
        toValue: 1,
        duration: 800,
        delay: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const goTo = (route: string) => {
    try {
      navigation.navigate(route);
    } catch (e) {
      console.log('Navigation error:', e);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'check-in': return <CheckCircle2 size={18} color={Colors.success} />;
      case 'leave': return <Calendar size={18} color={Colors.warning} />;
      case 'task': return <LayoutDashboard size={18} color={Colors.primary} />;
      case 'hire': return <Users size={18} color={Colors.purple} />;
      default: return <Clock size={18} color={Colors.textSecondary} />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'check-in': return Colors.successLighter;
      case 'leave': return Colors.warningLighter;
      case 'task': return Colors.primaryLighter;
      case 'hire': return Colors.purpleLighter;
      default: return Colors.borderLight;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Preparing your dashboard...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header Section */}
        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <ChevronLeft size={22} color={Colors.text} strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerGreeting}>Management Hub</Text>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
              </View>
            </View>

            {/* Quick Stats Summary */}
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{stats.totalEmployees}</Text>
                <Text style={styles.summaryLabel}>Total Staff</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: Colors.info }]}>{stats.departments}</Text>
                <Text style={styles.summaryLabel}>Depts</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: Colors.success }]}>{stats.newHires}</Text>
                <Text style={styles.summaryLabel}>New Hires</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: Colors.warning }]}>{stats.openPositions}</Text>
                <Text style={styles.summaryLabel}>Open Pos</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={styles.contentContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: tabBarVisible ? tabBarHeight + Spacing.xxl : Spacing.xxl },
            ]}
            onScroll={onScroll}
            scrollEventThrottle={scrollEventThrottle}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
            }
          >
            {error && (
              <View style={styles.errorBanner}>
                <AlertCircle size={20} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Main Stats Grid */}
            <View style={styles.gridSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.gridTitle}>Key Performance Indicators</Text>
                <View style={styles.dateLabel}>
                  <Clock size={12} color={Colors.textTertiary} />
                  <Text style={styles.dateText}>{getDayMonthIST(new Date())}</Text>
                </View>
              </View>

              <Animated.View
                style={[
                  styles.statsGrid,
                  {
                    opacity: statsAnim,
                    transform: [{
                      translateY: statsAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })
                    }]
                  }
                ]}
              >
                {/* Attendance Mini-Card */}
                <TouchableOpacity
                  style={[styles.statCard, { backgroundColor: Colors.successLighter, borderColor: Colors.successLight }]}
                  onPress={() => goTo('Attendance')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconBox, { backgroundColor: Colors.surface }]}>
                    <Users size={20} color={Colors.success} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardValue}>{stats.presentToday}</Text>
                    <Text style={styles.cardLabel} numberOfLines={1}>Attendance</Text>
                  </View>
                </TouchableOpacity>

                {/* Leaves Mini-Card */}
                <TouchableOpacity
                  style={[styles.statCard, { backgroundColor: Colors.warningLighter, borderColor: Colors.warningLight }]}
                  onPress={() => goTo('Leaves')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconBox, { backgroundColor: Colors.surface }]}>
                    <Calendar size={20} color={Colors.warning} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardValue}>{stats.onLeave}</Text>
                    <Text style={styles.cardLabel} numberOfLines={1}>On Leave</Text>
                  </View>
                </TouchableOpacity>

                {/* Tasks Mini-Card */}
                <TouchableOpacity
                  style={[styles.statCard, { backgroundColor: Colors.primaryLighter, borderColor: Colors.primaryLight }]}
                  onPress={() => goTo('Tasks')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconBox, { backgroundColor: Colors.surface }]}>
                    <LayoutDashboard size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardValue}>{stats.activeTasks}</Text>
                    <Text style={styles.cardLabel} numberOfLines={1}>Active Tasks</Text>
                  </View>
                </TouchableOpacity>

                {/* Chat Mini-Card */}
                <TouchableOpacity
                  style={[styles.statCard, { backgroundColor: Colors.purpleLighter, borderColor: Colors.purpleLight }]}
                  onPress={() => {
                    navigation.navigate('ChatList');
                    resetBadge('chat');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconBox, { backgroundColor: Colors.surface }]}>
                    <MessageSquare size={20} color={Colors.purple} />
                    {unreadMessages > 0 && (
                      <View style={styles.badgeIndicator}>
                        <Text style={styles.badgeText}>{unreadMessages > 9 ? '9+' : unreadMessages}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardValue}>{unreadMessages}</Text>
                    <Text style={styles.cardLabel} numberOfLines={1}>Unread Chat</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Department Performance Section */}
            {stats.departmentPerformance.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Department Performance</Text>
                  <TouchableOpacity onPress={() => goTo('Departments')} style={styles.seeAllBtn}>
                    <Text style={styles.seeAllText}>Analysis</Text>
                    <ArrowRight size={14} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                <Animated.View style={[styles.deptList, { opacity: cardsAnim }]}>
                  {stats.departmentPerformance.slice(0, 3).map((dept, index) => (
                    <TouchableOpacity
                      key={dept.name}
                      onPress={() => navigation.navigate('Reports', { department: dept.name })}
                      style={styles.deptCard}
                      activeOpacity={0.7}
                    >
                      <View style={styles.deptMain}>
                        <View style={[styles.deptIcon, {
                          backgroundColor: index === 0 ? Colors.primaryLighter : index === 1 ? Colors.successLighter : Colors.warningLighter
                        }]}>
                          <Building2 size={20} color={index === 0 ? Colors.primary : index === 1 ? Colors.success : Colors.warning} />
                        </View>
                        <View style={styles.deptInfo}>
                          <Text style={styles.deptName}>{dept.name}</Text>
                          <Text style={styles.deptSub}>{dept.employees} Employees • {dept.growth} Growth</Text>
                        </View>
                        <View style={styles.deptScore}>
                          <Text style={styles.scoreValue}>{dept.performance}%</Text>
                        </View>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[styles.progressFill, {
                            width: `${dept.performance}%`,
                            backgroundColor: index === 0 ? Colors.primary : index === 1 ? Colors.success : Colors.warning
                          }]}
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              </View>
            )}

            {/* Recent Activities Section */}
            {stats.recentActivities.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Global Activity Feed</Text>
                  <TouchableOpacity onPress={() => goTo('RecentActivities')} style={styles.seeAllBtn}>
                    <Text style={styles.seeAllText}>Full History</Text>
                    <ArrowRight size={14} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                <Animated.View style={[styles.activityList, { opacity: cardsAnim }]}>
                  {stats.recentActivities.slice(0, 4).map((activity) => {
                    const statusStyle = getStatusBadgeStyle(activity.status);
                    return (
                      <View key={activity.id} style={styles.activityItem}>
                        <View style={[styles.activityIconBox, { backgroundColor: getIconBg(activity.type) }]}>
                          {getActivityIcon(activity.type)}
                        </View>
                        <View style={styles.activityContent}>
                          <View style={styles.activityTop}>
                            <Text style={styles.activityUser}>{activity.user}</Text>
                            <Text style={styles.activityTime}>{activity.time}</Text>
                          </View>
                          <Text style={styles.activityDesc}>{activity.dept}</Text>
                        </View>
                        <View style={[styles.statusBadge, statusStyle.container]}>
                          <Text style={[styles.statusText, statusStyle.text]}>{activity.status}</Text>
                        </View>
                      </View>
                    );
                  })}
                </Animated.View>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // Header Styles
  header: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 10 : 15,
    paddingBottom: 20,
    backgroundColor: Colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 16,
    ...Shadows.card,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.6,
  },

  // Summary Bar
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    opacity: 0.6,
  },

  // Content
  contentContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLighter,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.errorLight,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  retryBtn: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
  },
  retryBtnText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },

  // Grid Section
  gridSection: {
    marginBottom: Spacing.xxl,
  },
  gridTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  dateLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  badgeIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surface,
    paddingHorizontal: 2,
  },
  badgeText: {
    color: Colors.surface,
    fontSize: 9,
    fontWeight: '800',
  },
  cardContent: {
    flex: 1,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  cardLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  cardTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.successLighter,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },

  // Sections
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Department List
  deptList: {
    gap: Spacing.md,
  },
  deptCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  deptMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  deptIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  deptInfo: {
    flex: 1,
  },
  deptName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  deptSub: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  deptScore: {
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Activity Feed
  activityList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  activityIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityUser: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  activityTime: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  activityDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    marginLeft: Spacing.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

export default AdminDashboard;
