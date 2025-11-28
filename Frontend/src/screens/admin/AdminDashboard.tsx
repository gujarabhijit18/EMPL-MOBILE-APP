import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StatusBar } from 'expo-status-bar';
import React, { useRef } from 'react';
import {
    Alert,
    Animated,
    Easing,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Badge,
    Button,
    Card,
    ProgressBar,
} from "react-native-paper";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";

// Mock translation hook (Expo-safe, no API)
const useLanguage = () => ({
  t: {
    common: { welcome: "Welcome" },
    employee: { addEmployee: "Add Employee" },
    dashboard: {
      totalEmployees: "Total Employees",
      presentToday: "Present Today",
      pendingApprovals: "Pending Approvals",
      recentActivities: "Recent Activities",
      quickActions: "Manage Sections",
    },
  },
  language: "en",
});

// Mock Data Service (no API calls)
const mockDashboardData = {
  totalEmployees: 50,
  presentToday: 45,
  onLeave: 3,
  lateArrivals: 2,
  pendingLeaves: 5,
  activeTasks: 10,
  completedTasks: 30,
  departments: 4,
  departmentPerformance: [
    { name: "HR", employees: 8, performance: 90 },
    { name: "Engineering", employees: 25, performance: 88 },
    { name: "Sales", employees: 10, performance: 92 },
  ],
  recentActivities: [
    {
      id: 1,
      type: "check-in",
      user: "John Doe",
      time: new Date().toISOString(),
      status: "on-time",
    },
    {
      id: 2,
      type: "leave",
      user: "Jane Smith",
      time: new Date().toISOString(),
      status: "pending",
    },
    {
      id: 3,
      type: "task",
      user: "Mark Brown",
      time: new Date().toISOString(),
      status: "completed",
    },
  ],
};

// Dashboard Component
const AdminDashboard: React.FC = () => {
  const { t, language } = useLanguage();
  const { isDarkMode, colors } = useTheme();
  
  // Define the navigation param list type
  type RootStackParamList = {
    Profile: undefined;
    Settings: undefined;
    Reports: undefined;
    AttendanceManager: undefined;
    LeaveManagement: undefined;
    EmployeeManagement: undefined;
    TaskManagement: undefined;
    DepartmentManagement: undefined;
  };
  
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { logout, user } = useAuth();
  const {
    onScroll,
    scrollEventThrottle,
    tabBarVisible,
    tabBarHeight,
  } = useAutoHideTabBarOnScroll();

  const [stats, setStats] = React.useState(mockDashboardData);
  const [loading, setLoading] = React.useState(true);
  const [dropdownVisible, setDropdownVisible] = React.useState(false);

  // Header animation values
  const headerAnimations = useRef({
    scale: new Animated.Value(0.95),
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(-20),
    backButtonScale: new Animated.Value(0),
    backButtonRotate: new Animated.Value(0),
    titleTranslateX: new Animated.Value(-30),
    titleOpacity: new Animated.Value(0),
    subtitleTranslateX: new Animated.Value(-20),
    subtitleOpacity: new Animated.Value(0),
    filterScale: new Animated.Value(0),
    filterRotate: new Animated.Value(0),
  }).current;

  // Dropdown animation values
  const dropdownAnimations = useRef({
    scale: new Animated.Value(0.8),
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(-10),
  }).current;

  // Animation values for action buttons with professional effects
  const actionButtonAnimations = useRef(
    Array.from({ length: 6 }, () => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      pressScale: new Animated.Value(1),
      rotate: new Animated.Value(0),
      translateY: new Animated.Value(30),
      iconScale: new Animated.Value(0),
      iconRotate: new Animated.Value(0),
      shimmer: new Animated.Value(0),
      shadowOpacity: new Animated.Value(0.08),
      elevation: new Animated.Value(3),
    }))
  ).current;

  // Card entrance animation
  const cardScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // Dropdown functions
  const toggleDropdown = () => {
    const toValue = dropdownVisible ? 0 : 1;
    setDropdownVisible(!dropdownVisible);
    
    Animated.parallel([
      Animated.spring(dropdownAnimations.scale, {
        toValue: dropdownVisible ? 0.8 : 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(dropdownAnimations.opacity, {
        toValue,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(dropdownAnimations.translateY, {
        toValue: dropdownVisible ? -10 : 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleDropdownItemPress = (action: string) => {
    toggleDropdown();
    setTimeout(() => {
      switch (action) {
        case 'profile':
          navigation.navigate('Profile' as any);
          break;
        case 'settings':
          navigation.navigate('Settings' as any);
          break;
        case 'logout':
          Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: logout },
            ]
          );
          break;
      }
    }, 100);
  };

  React.useEffect(() => {
    // Animate header entrance immediately
    Animated.parallel([
      // Header container animation
      Animated.spring(headerAnimations.scale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(headerAnimations.opacity, {
        toValue: 1,
        duration: 600,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(headerAnimations.translateY, {
        toValue: 0,
        duration: 700,
        delay: 100,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      // Back button animation
      Animated.spring(headerAnimations.backButtonScale, {
        toValue: 1,
        tension: 150,
        friction: 6,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(headerAnimations.backButtonRotate, {
        toValue: 1,
        duration: 500,
        delay: 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      // Title animation
      Animated.timing(headerAnimations.titleTranslateX, {
        toValue: 0,
        duration: 600,
        delay: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(headerAnimations.titleOpacity, {
        toValue: 1,
        duration: 500,
        delay: 400,
        useNativeDriver: true,
      }),
      // Subtitle animation
      Animated.timing(headerAnimations.subtitleTranslateX, {
        toValue: 0,
        duration: 600,
        delay: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(headerAnimations.subtitleOpacity, {
        toValue: 1,
        duration: 500,
        delay: 500,
        useNativeDriver: true,
      }),
      // Filter button animation
      Animated.spring(headerAnimations.filterScale, {
        toValue: 1,
        tension: 150,
        friction: 6,
        delay: 600,
        useNativeDriver: true,
      }),
      Animated.timing(headerAnimations.filterRotate, {
        toValue: 1,
        duration: 500,
        delay: 600,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    // Simulated fetch delay (no backend)
    setTimeout(() => {
      setStats(mockDashboardData);
      setLoading(false);
      
      // Animate card entrance
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate action buttons with professional stagger effect
      actionButtonAnimations.forEach((anim, index) => {
        // Entrance animation (native driver only)
        Animated.parallel([
          Animated.spring(anim.scale, {
            toValue: 1,
            tension: 60,
            friction: 7,
            delay: index * 120,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 500,
            delay: index * 120,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: 0,
            duration: 600,
            delay: index * 120,
            easing: Easing.out(Easing.back(1.4)),
            useNativeDriver: true,
          }),
          Animated.spring(anim.iconScale, {
            toValue: 1,
            tension: 120,
            friction: 5,
            delay: index * 120 + 250,
            useNativeDriver: true,
          }),
        ]).start();

        // Continuous shimmer animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim.shimmer, {
              toValue: 1,
              duration: 2000,
              delay: index * 120 + 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim.shimmer, {
              toValue: 0,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    }, 800);
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="refresh" size={40} color={colors.info} />
        <Text style={{ color: colors.info, marginTop: 8 }}>Loading...</Text>
      </View>
    );
  }

  // Ensure navigation works even if dashboard is inside a nested navigator
  const goTo = (routeName: string) => {
    try {
      // Try current navigator
      // @ts-ignore
      navigation.navigate(routeName);
    } catch (_) {
      // Fallback: try parent navigator
      // @ts-ignore
      navigation.getParent()?.navigate(routeName);
    }
  };

  // Handle button press animation with professional effects
  const handleButtonPress = (index: number, routeName: string) => {
    const anim = actionButtonAnimations[index];
    
    // Professional press animation with multiple effects (native driver only)
    Animated.parallel([
      // Scale animation
      Animated.sequence([
        Animated.timing(anim.pressScale, {
          toValue: 0.94,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(anim.pressScale, {
          toValue: 1,
          tension: 400,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Rotation animation
      Animated.sequence([
        Animated.timing(anim.rotate, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim.rotate, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // Icon bounce and rotation
      Animated.parallel([
        Animated.sequence([
          Animated.timing(anim.iconScale, {
            toValue: 1.25,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.spring(anim.iconScale, {
            toValue: 1,
            tension: 300,
            friction: 4,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(anim.iconRotate, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
          Animated.timing(anim.iconRotate, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.back(1.5)),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();

    // Navigate after animation
    setTimeout(() => goTo(routeName), 200);
  };

  // Action buttons configuration
  const actionButtons = [
    { icon: 'calendar', color: '#3b82f6', label: 'Attendance', route: 'AttendanceManager' },
    ...(user?.role === 'admin' ? [{ icon: 'checkmark-circle', color: '#10b981', label: 'Leaves', route: 'LeaveManagement' }] : []),
    { icon: 'people', color: '#f59e0b', label: 'Employees', route: 'EmployeeManagement' },
    { icon: 'clipboard', color: '#8b5cf6', label: 'Tasks', route: 'TaskManagement' },
    { icon: 'business', color: '#ef4444', label: 'Departments', route: 'DepartmentManagement' },
    { icon: 'document-text', color: '#64748b', label: 'Reports', route: 'Reports' },
  ].map((button, idx) => ({ ...button, index: idx }));

  return (
    <SafeAreaView style={[styles.safeAreaContainer, { backgroundColor: colors.header }]}>
      <StatusBar style={isDarkMode ? "light" : "light"} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Enhanced Header */}
        <View style={[styles.header, { backgroundColor: colors.header }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.adminProfileSection}>
              <TouchableOpacity 
                onPress={toggleDropdown}
                activeOpacity={0.8}
                style={styles.avatarTouchable}
              >
                <Animated.View 
                  style={[
                    styles.adminAvatar,
                    {
                      transform: [{ scale: headerAnimations.opacity }]
                    }
                  ]}
                >
                  <Text style={styles.adminAvatarText}>
                    {(user?.name || "Admin").charAt(0).toUpperCase()}
                  </Text>
                  <View style={styles.avatarDropdownIndicator}>
                    <Ionicons 
                      name={dropdownVisible ? "chevron-up" : "chevron-down"} 
                      size={12} 
                      color="#fff" 
                    />
                  </View>
                </Animated.View>
              </TouchableOpacity>
              <View style={styles.adminInfo}>
                <Animated.Text 
                  style={[
                    styles.adminName,
                    {
                      opacity: headerAnimations.opacity,
                      transform: [{ translateX: headerAnimations.translateY }]
                    }
                  ]}
                >
                  {user?.name || "Administrator"}
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.adminRole,
                    {
                      opacity: headerAnimations.opacity,
                      transform: [{ translateX: headerAnimations.translateY }]
                    }
                  ]}
                >
                  Admin
                </Animated.Text>
              </View>
            </View>
            
            
          </View>
          
          <Animated.View 
            style={[
              styles.headerWelcomeSection,
              { 
                opacity: headerAnimations.opacity, 
                transform: [{ translateY: headerAnimations.translateY }] 
              }
            ]}
          >
            <Text style={styles.welcomeText}>Welcome back! 👋</Text>
            <Text style={styles.headerSubtitle}>Ready to manage your organization efficiently</Text>
          </Animated.View>
        </View>

        {/* Dropdown Menu */}
        {dropdownVisible && (
          <>
            <TouchableOpacity
              style={styles.dropdownBackdrop}
              activeOpacity={1}
              onPress={toggleDropdown}
            />
            <Animated.View
              style={[
                styles.dropdownMenu,
                {
                  opacity: dropdownAnimations.opacity,
                  transform: [
                    { scale: dropdownAnimations.scale },
                    { translateY: dropdownAnimations.translateY }
                  ]
                }
              ]}
            >
            <View style={styles.dropdownHeader}>
              <View style={styles.dropdownAvatar}>
                <Text style={styles.dropdownAvatarText}>
                  {(user?.name || "Admin").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.dropdownUserInfo}>
                <Text style={styles.dropdownUserName}>
                  {user?.name || "Administrator"}
                </Text>
                <Text style={styles.dropdownUserEmail}>
                  {user?.email || "admin@company.com"}
                </Text>
                <View style={styles.dropdownAdminBadge}>
                  <Text style={styles.dropdownAdminBadgeText}>Admin</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.dropdownDivider} />
            
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => handleDropdownItemPress('profile')}
              activeOpacity={0.7}
            >
              <View style={[styles.dropdownItemIcon, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="person-outline" size={18} color="#fff" />
              </View>
              <Text style={styles.dropdownItemText}>Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => handleDropdownItemPress('settings')}
              activeOpacity={0.7}
            >
              <View style={[styles.dropdownItemIcon, { backgroundColor: '#8b5cf6' }]}>
                <Ionicons name="settings-outline" size={18} color="#fff" />
              </View>
              <Text style={styles.dropdownItemText}>Settings</Text>
            </TouchableOpacity>
            
            <View style={styles.dropdownDivider} />
            
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => handleDropdownItemPress('logout')}
              activeOpacity={0.7}
            >
              <View style={[styles.dropdownItemIcon, { backgroundColor: '#ef4444' }]}>
                <Ionicons name="log-out-outline" size={18} color="#fff" />
              </View>
              <Text style={[styles.dropdownItemText, { color: '#ef4444' }]}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
          </>
        )}

        <ScrollView
          style={styles.scrollView}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={[
            styles.scrollContentContainer,
            {
              paddingBottom: tabBarVisible ? tabBarHeight + 24 : 24,
            },
          ]}
        >
          {/* Content Container */}
          <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
            {/* Quick Stats */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: "#3b82f6" }]}>
                <View style={styles.statCardHeader}>
                  <Ionicons name="people" color="#fff" size={20} />
                  <Text style={styles.statCardTitle}>{t.dashboard.totalEmployees}</Text>
                </View>
                <Text style={styles.statValue}>{stats.totalEmployees}</Text>
                <Text style={styles.statSub}>+12% from last month</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: "#10b981" }]}>
                <View style={styles.statCardHeader}>
                  <Ionicons name="time" color="#fff" size={20} />
                  <Text style={styles.statCardTitle}>{t.dashboard.presentToday}</Text>
                </View>
                <Text style={styles.statValue}>{stats.presentToday}</Text>
                <ProgressBar
                  progress={stats.presentToday / (stats.totalEmployees || 1)}
                  color="white"
                  style={styles.statProgressBar}
                />
              </View>

              <View style={[styles.statCard, { backgroundColor: "#f59e0b" }]}>
                <View style={styles.statCardHeader}>
                  <Ionicons name="alert-circle" color="#fff" size={20} />
                  <Text style={styles.statCardTitle}>{t.dashboard.pendingApprovals}</Text>
                </View>
                <Text style={styles.statValue}>{stats.pendingLeaves}</Text>
                <Text style={styles.statSub}>Requires attention</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: "#8b5cf6" }]}>
                <View style={styles.statCardHeader}>
                  <Ionicons name="clipboard" color="#fff" size={20} />
                  <Text style={styles.statCardTitle}>Active Tasks</Text>
                </View>
                <Text style={styles.statValue}>{stats.activeTasks}</Text>
                <Text style={styles.statSub}>{stats.completedTasks} completed</Text>
              </View>
            </View>
          </View>

          {/* Department Performance */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
            <Card.Title
              title="Department Performance"
              subtitle="Performance metrics by department"
              titleStyle={{ color: colors.textPrimary }}
              subtitleStyle={{ color: colors.textSecondary }}
              left={() => <Ionicons name="trending-up" size={24} color="#2563eb" />}
            />
            <Card.Content>
              {stats.departmentPerformance.map((dept) => (
                <View key={dept.name} style={styles.deptItem}>
                  <View>
                    <Text style={[styles.deptName, { color: colors.textPrimary }]}>{dept.name}</Text>
                    <Text style={[styles.deptSub, { color: colors.textSecondary }]}>{dept.employees} employees</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.deptPerf, { color: colors.textPrimary }]}>{dept.performance}%</Text>
                    <Badge
                      style={{
                        backgroundColor:
                          dept.performance >= 90 ? "#10b981" : "#f59e0b",
                        color: "white",
                        fontSize: 10,
                        marginTop: 4,
                      }}
                    >
                      {dept.performance >= 90 ? "Excellent" : "Good"}
                    </Badge>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>

          {/* Recent Activities */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
            <Card.Title
              title={t.dashboard.recentActivities}
              subtitle="Latest employee activities"
              titleStyle={{ color: colors.textPrimary }}
              subtitleStyle={{ color: colors.textSecondary }}
              left={() => <Ionicons name="pulse" size={24} color="#22c55e" />}
            />
            <Card.Content>
              {stats.recentActivities.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View
                    style={[
                      styles.iconBox,
                      activity.type === "check-in"
                        ? { backgroundColor: "#10b981" }
                        : activity.type === "leave"
                        ? { backgroundColor: "#f59e0b" }
                        : { backgroundColor: "#3b82f6" },
                    ]}
                  >
                    <Ionicons
                      name={
                        activity.type === "check-in"
                          ? "time"
                          : activity.type === "leave"
                          ? "calendar"
                          : "clipboard"
                      }
                      color="#fff"
                      size={18}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.activityUser, { color: colors.textPrimary }]}>{activity.user}</Text>
                    <Text style={[styles.activityText, { color: colors.textSecondary }]}>
                      {activity.type === "check-in"
                        ? "Checked in"
                        : activity.type === "leave"
                        ? "Applied for leave"
                        : "Completed a task"}
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>
                    {new Date(activity.time).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>

          {/* Profile & Settings */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
            <Card.Title
              title="Account & Settings"
              subtitle="Manage your profile and preferences"
              titleStyle={{ color: colors.textPrimary }}
              subtitleStyle={{ color: colors.textSecondary }}
              left={() => <Ionicons name="settings-outline" size={24} color="#2563eb" />}
            />
            <Card.Content>
              <View style={styles.accountActions}>
                <Button
                  icon="account-circle"
                  mode="contained"
                  buttonColor="#2563eb"
                  onPress={() => navigation.navigate("Profile" as any)}
                  style={styles.accountButton}
                >
                  Profile
                </Button>
                <Button
                  icon="cog"
                  mode="contained"
                  buttonColor="#6366f1"
                  onPress={() => navigation.navigate("Settings" as any)}
                  style={styles.accountButton}
                >
                  Settings
                </Button>
                <Button
                  icon="file-document-outline"
                  mode="contained"
                  buttonColor="#8b5cf6"
                  onPress={() => navigation.navigate("Reports" as any)}
                  style={styles.accountButton}
                >
                  Reports
                </Button>
              
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default AdminDashboard;

// Styles
const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#39549fff',
  },
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  contentContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -25,
    paddingHorizontal: 20,
    paddingTop: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#39549fff",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  adminProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  adminAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  adminRole: {
    color: '#c7d2fe',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1e3a8a',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerWelcomeSection: {
    alignItems: 'center',
    marginTop: 5,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 5,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statusIndicator: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarDropdownIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    zIndex: 1000,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  dropdownAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dropdownAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dropdownUserInfo: {
    flex: 1,
  },
  dropdownUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  dropdownUserEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  dropdownAdminBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  dropdownAdminBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  headerBackButton: {
    width: 44,
    height: 44,
  },
  headerFilterButton: {
    width: 44,
    height: 44,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    textAlign: 'center',
    marginBottom: 2,
  },
  headerSubtitle: {
    color: "#c7d2fe",
    fontSize: 14,
    fontWeight: "500",
    textAlign: 'center',
    letterSpacing: 0.1,
    opacity: 0.9,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
    textAlign: 'center',
  },
  headerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerStatCard: {
    flex: 1,
    alignItems: 'center',
  },
  headerGreeting: {
    color: "#c7d2fe",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  headerDate: {
    color: "#a5b4fc",
    fontSize: 13,
    fontWeight: "400",
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    minWidth: 160,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatValue: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  headerStatLabel: {
    color: "#c7d2fe",
    fontSize: 10,
    marginTop: 2,
  },
  headerStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },
  statCard: {
    width: "48%",
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 100,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    position: 'relative',
    overflow: 'hidden',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  statCardTitle: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
    opacity: 0.95,
    flex: 1,
    lineHeight: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 2,
    lineHeight: 26,
  },
  statSub: {
    fontSize: 9,
    color: "#ffffff",
    opacity: 0.85,
    marginTop: 2,
    lineHeight: 11,
  },
  statProgressBar: {
    marginTop: 6,
    height: 3,
    borderRadius: 2,
  },
  sectionCard: { 
    marginBottom: 20, 
    borderRadius: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: 'hidden',
  },
  deptItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderLeftWidth: 3,
    borderLeftColor: "#2563eb",
  },
  deptName: { fontWeight: "600", fontSize: 13, lineHeight: 16 },
  deptSub: { fontSize: 10, color: "#6b7280", lineHeight: 12 },
  deptPerf: { fontSize: 13, fontWeight: "bold", color: "#111827", lineHeight: 16 },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 8,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  activityUser: { fontWeight: "600", fontSize: 12, lineHeight: 15 },
  activityText: { fontSize: 10, color: "#6b7280", lineHeight: 12 },
  activityTime: { fontSize: 9, color: "#6b7280", lineHeight: 11 },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10
  },
  actionButtonWrapper: {
    width: '31%',
    marginBottom: 8,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
    paddingTop: 14,
    paddingBottom: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#f1f5f9",
    borderLeftWidth: 4,
    width: '100%',
    minHeight: 100,
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  actionButtonShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 50,
    opacity: 0.1,
    transform: [{ skewX: '-20deg' }],
  },
  actionButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.6,
  },
  actionTopAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  actionButtonGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.3,
  },
  actionRipple: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    borderRadius: 50,
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIconGlow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 12,
    opacity: 0.25,
    top: 1,
    left: 1,
    zIndex: -1,
  },
  actionIndicatorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    overflow: 'hidden',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  actionIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  actionIndicatorGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 5,
    opacity: 0.4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  actionLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  accountActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  accountButton: {
    flex: 1,
    minWidth: "30%",
    borderRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
});
