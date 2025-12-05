import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from "../../contexts/ThemeContext";
import { apiService } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";

interface Activity {
  id: number;
  type: string;
  user: string;
  dept: string;
  time: string;
  status: string;
  icon: string;
}

const RecentActivities: React.FC = () => {
  const { colors } = useTheme();
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
      
      const mappedActivities: Activity[] = (response.recent_activities || response.recentActivities || []).map((activity: any, index: number) => ({
        id: activity.id || index + 1,
        type: activity.type || activity.activity_type || 'check-in',
        user: activity.user || activity.user_name || activity.employee_name || 'Unknown',
        dept: activity.dept || activity.department || 'N/A',
        time: activity.time || activity.created_at || 'N/A',
        status: activity.status || 'completed',
        icon: getActivityIcon(activity.type || activity.activity_type || 'check-in'),
      }));
      
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
      case 'check-out': return '#fef3c7';
      case 'leave': return '#fef3c7';
      case 'task': return '#dbeafe';
      case 'hire': return '#e0e7ff';
      default: return '#f3f4f6';
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.header }]} edges={['top']}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading Activities...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.header }]} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerPattern}>
          <View style={[styles.patternCircle, { top: -20, right: -20, width: 100, height: 100 }]} />
          <View style={[styles.patternCircle, { bottom: -30, left: -30, width: 120, height: 120 }]} />
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
          <View style={styles.headerTopSection}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
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
              <Ionicons name="refresh" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

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
              <Ionicons name="time-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateTitle}>No Recent Activities</Text>
              <Text style={styles.emptyStateText}>Activities will appear here as they happen</Text>
            </View>
          ) : (
            activities.map((activity, index) => (
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
                  <Ionicons name={activity.icon as any} size={20} color={getStatusColor(activity.status)} />
                </View>
                <View style={styles.activityContent}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityUser}>{activity.user}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activity.status) }]}>
                      <Text style={styles.statusText}>{activity.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.activityType}>{getTypeLabel(activity.type)}</Text>
                  <View style={styles.activityMeta}>
                    <Ionicons name="business-outline" size={12} color="#9ca3af" />
                    <Text style={styles.activityDept}>{activity.dept}</Text>
                    <Text style={styles.activityDot}>•</Text>
                    <Ionicons name="time-outline" size={12} color="#9ca3af" />
                    <Text style={styles.activityTime}>{activity.time}</Text>
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 8,
    paddingBottom: 20,
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
    paddingHorizontal: 16,
    position: 'relative',
    zIndex: 1,
  },
  headerTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
  },
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
  activitiesContainer: {
    gap: 12,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityUser: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  activityType: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityDept: {
    fontSize: 12,
    color: '#9ca3af',
  },
  activityDot: {
    fontSize: 12,
    color: '#9ca3af',
    marginHorizontal: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default RecentActivities;
