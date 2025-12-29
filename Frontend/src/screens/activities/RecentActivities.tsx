import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { apiService } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows,
  Typography,
  HeaderStyles,
  CardStyles,
  CommonStyles,
  getStatusBadgeStyle,
  getRoleBadgeColor,
} from "../../constants/designSystem";

interface Activity {
  id: string;
  type: string;
  user: string;
  dept: string;
  role: string;
  time: string;
  status: string;
  icon: string;
  description?: string;
}

const RecentActivities: React.FC = () => {
  const navigation = useNavigation<any>();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  const getActivityIcon = (type: string): string => {
    switch (type) {
      case 'check-in': return 'checkmark-circle';
      case 'check-out': return 'exit-outline';
      case 'leave': return 'calendar';
      case 'task': return 'checkbox';
      case 'hire': return 'person-add';
      default: return 'ellipse';
    }
  };

  const fetchActivities = useCallback(async () => {
    try {
      setError(null);
      const response = await apiService.getDashboardByRole('admin');
      
      const mappedActivities: Activity[] = (response.recent_activities || response.recentActivities || []).map((activity: any) => {
        const dept = activity.department || activity.dept || 'N/A';
        const role = activity.role || 'Employee';
        
        return {
          id: activity.id,
          type: activity.type || 'check-in',
          user: activity.user || 'Unknown',
          dept: dept,
          role: role,
          time: activity.time || 'N/A',
          status: activity.status || 'completed',
          icon: getActivityIcon(activity.type || 'check-in'),
          description: activity.description,
        };
      });
      
      setActivities(mappedActivities);
    } catch (err: any) {
      console.error('Failed to fetch activities:', err);
      setError(err.message || 'Failed to load activities');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchActivities();
      setLoading(false);
      startAnimations();
    };
    loadData();
  }, [fetchActivities]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  }, [fetchActivities]);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 800,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'check-in': return Colors.successLight;
      case 'check-out': return Colors.warningLight;
      case 'leave': return Colors.warningLight;
      case 'task': return Colors.primaryLight;
      case 'hire': return Colors.purpleLight;
      default: return Colors.backgroundAlt;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'check-in': return Colors.success;
      case 'check-out': return Colors.warning;
      case 'leave': return Colors.warning;
      case 'task': return Colors.primary;
      case 'hire': return Colors.purple;
      default: return Colors.textSecondary;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'check-in': return 'Check In';
      case 'check-out': return 'Check Out';
      case 'leave': return 'Leave Request';
      case 'task': return 'Task Update';
      case 'hire': return 'New Hire';
      default: return 'Activity';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerTextSection}>
            <Text style={styles.headerTitle}>Recent Activities</Text>
            <Text style={styles.headerSubtitle}>Loading...</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Activities...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* White Header */}
      <Animated.View
        style={[
          styles.header,
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
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerTextSection}>
          <Text style={styles.headerTitle}>Recent Activities</Text>
          <Text style={styles.headerSubtitle}>{activities.length} activities</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Content */}
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

        {/* Activities List */}
        <Animated.View
          style={[
            styles.activitiesContainer,
            {
              opacity: contentAnim,
              transform: [
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {activities.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="time-outline" size={48} color={Colors.textTertiary} />
              </View>
              <Text style={styles.emptyStateTitle}>No Recent Activities</Text>
              <Text style={styles.emptyStateText}>Activities will appear here as they happen</Text>
            </View>
          ) : (
            activities.map((activity, index) => {
              const statusStyle = getStatusBadgeStyle(activity.status);
              const roleColor = getRoleBadgeColor(activity.role);
              
              return (
                <Animated.View
                  key={activity.id}
                  style={[
                    styles.activityCard,
                    {
                      opacity: contentAnim,
                      transform: [
                        {
                          translateX: contentAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={[styles.activityIcon, { backgroundColor: getIconBg(activity.type) }]}>
                    <Ionicons name={activity.icon as any} size={20} color={getIconColor(activity.type)} />
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                      <View style={styles.userInfoContainer}>
                        <View style={styles.userNameRow}>
                          <Text style={styles.activityUser} numberOfLines={1}>{activity.user}</Text>
                          <View style={[statusStyle.container, styles.statusBadge]}>
                            <Text style={statusStyle.text}>{activity.status}</Text>
                          </View>
                        </View>
                        <View style={styles.userMetaBadges}>
                          <View style={styles.departmentBadge}>
                            <Ionicons name="business-outline" size={12} color={Colors.primary} />
                            <Text style={styles.departmentText}>{activity.dept}</Text>
                          </View>
                          <View style={[styles.roleBadge, { backgroundColor: roleColor.bg }]}>
                            <Ionicons name="person-circle-outline" size={11} color={roleColor.text} />
                            <Text style={[styles.roleText, { color: roleColor.text }]}>{activity.role}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <View style={styles.activityTypeSection}>
                      <View style={[styles.activityTypeIcon, { backgroundColor: getIconBg(activity.type) }]}>
                        <Ionicons name={activity.icon as any} size={14} color={getIconColor(activity.type)} />
                      </View>
                      <Text style={styles.activityType}>{getTypeLabel(activity.type)}</Text>
                    </View>
                    {activity.description && (
                      <Text style={styles.activityDescription}>{activity.description}</Text>
                    )}
                    <View style={styles.activityMeta}>
                      <Ionicons name="time-outline" size={12} color={Colors.textTertiary} />
                      <Text style={styles.activityTime}>{activity.time}</Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Header - White design
  header: {
    ...HeaderStyles.containerWithSafeArea,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 10 : 16,
  },
  backButton: {
    ...HeaderStyles.backButton,
  },
  headerTextSection: {
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
  refreshButton: {
    ...HeaderStyles.iconButton,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    color: Colors.primary,
    marginTop: Spacing.lg,
    fontSize: 16,
    fontWeight: '600',
  },
  // Content
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLighter,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    padding: 14,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  errorText: {
    flex: 1,
    color: Colors.errorDark,
    fontSize: 13,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  // Activities
  activitiesContainer: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  // Empty State
  emptyState: {
    ...CommonStyles.emptyState.container,
    marginTop: 40,
  },
  emptyIconContainer: {
    ...CommonStyles.emptyState.iconContainer,
  },
  emptyStateTitle: {
    ...CommonStyles.emptyState.title,
  },
  emptyStateText: {
    ...CommonStyles.emptyState.subtitle,
  },
  // Activity Card
  activityCard: {
    ...CardStyles.containerAccent,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 100,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  userInfoContainer: {
    flex: 1,
    gap: Spacing.sm,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  activityUser: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    // Additional styles if needed
  },
  userMetaBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  departmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  departmentText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primaryDark,
    textTransform: 'capitalize',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    gap: 3,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activityTypeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 10,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: BorderRadius.sm,
  },
  activityTypeIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityType: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
    flex: 1,
  },
  activityDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
    lineHeight: 18,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  activityTime: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
});

export default RecentActivities;
