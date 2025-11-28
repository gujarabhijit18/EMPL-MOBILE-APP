import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { StatusBar } from 'expo-status-bar';
import React, { useState } from "react";
import {
    Alert,
    Animated,
    Easing,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    Avatar,
    Button,
    Card,
    Chip,
    ProgressBar,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";

export default function EmployeeDashboard({ navigation }: any) {
  const { user, logout } = useAuth();
  const { isDarkMode, colors } = useTheme();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();
  const [stats] = useState({
    tasksAssigned: 12,
    tasksCompleted: 9,
    tasksPending: 3,
    leavesAvailable: 12,
    leavesTaken: 4,
    attendancePercentage: 90,
    currentMonthHours: 160,
  });

  const [myTasks] = useState([
    {
      id: 1,
      title: "Fix login issue",
      priority: "high",
      status: "in-progress",
      dueDate: "2025-11-07",
      progress: 60,
    },
    {
      id: 2,
      title: "Code review PR #234",
      priority: "urgent",
      status: "completed",
      dueDate: "2025-11-05",
      progress: 100,
    },
  ]);

  const [recentActivities] = useState([
    { id: 1, action: "Completed task", desc: "PR #234", time: "1 hr ago", type: "success" },
    { id: 2, action: "Checked in", desc: "On time at 09:00 AM", time: "3 hrs ago", type: "info" },
    { id: 3, action: "Leave approved", desc: "Casual leave on 15th Oct", time: "Yesterday", type: "success" },
    { id: 4, action: "New task assigned", desc: "Bug Fix - Login", time: "2 days ago", type: "warning" },
  ]);

  const today = format(new Date(), "EEEE, MMM dd yyyy");

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownOpacity = React.useRef(new Animated.Value(0)).current;
  const dropdownTranslateY = React.useRef(new Animated.Value(-10)).current;

  const toggleDropdown = () => {
    const next = !dropdownVisible;
    setDropdownVisible(next);
    Animated.parallel([
      Animated.timing(dropdownOpacity, {
        toValue: next ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(dropdownTranslateY, {
        toValue: next ? 0 : -10,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
    ]).start();
  };

  const handleDropdownItemPress = (action: 'profile' | 'settings' | 'logout') => {
    if (action === 'profile') {
      navigation.navigate('Profile' as never);
    } else if (action === 'settings') {
      navigation.navigate('Settings' as never);
    } else if (action === 'logout') {
      logout();
    }
    if (dropdownVisible) toggleDropdown();
  };

  const handleNavigation = (screen: string) => {
    if (screen === "Profile") {
      navigation.navigate("Profile" as never);
    } else if (screen === "Settings") {
      navigation.navigate("Settings" as never);
    } else if (screen === "Attendance") {
      navigation.navigate("AttendancePage" as never);
    } else if (screen === "Tasks" || screen === "Task List" || screen === "TaskManagement") {
      try {
        navigation.navigate("Tasks" as never);
      } catch (_) {
        // Fallback to parent navigator which may have a Drawer route
        navigation.getParent()?.navigate("TaskManagement" as never);
      }
    } else {
      Alert.alert("Navigation", `Navigate to ${screen} screen`);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.header }} edges={['top']}>
      <StatusBar style={isDarkMode ? "light" : "light"} />
      <View style={[styles.pageContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.header }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.profileSection}>
              <TouchableOpacity onPress={toggleDropdown} activeOpacity={0.8} style={styles.avatarTouchable}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(user?.name || 'Employee').charAt(0).toUpperCase()}</Text>
                  <View style={styles.statusIndicator}>
                    <View style={styles.onlineStatus} />
                  </View>
                </View>
              </TouchableOpacity>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.name || 'Employee User'}</Text>
                <Text style={styles.userRole}>Employee</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerWelcomeSection}>
            <Text style={styles.headerTitle}>Welcome back! 👋</Text>
            <Text style={styles.headerSub}>{today}</Text>
          </View>
        </View>

        {dropdownVisible && (
          <>
            <TouchableOpacity style={styles.dropdownBackdrop} activeOpacity={1} onPress={toggleDropdown} />
            <Animated.View
              style={[
                styles.dropdownMenu,
                { opacity: dropdownOpacity, transform: [{ translateY: dropdownTranslateY }] },
              ]}
            >
              <View style={styles.dropdownHeader}>
                <View style={styles.dropdownAvatar}>
                  <Text style={styles.dropdownAvatarText}>{(user?.name || 'Employee').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.dropdownUserInfo}>
                  <Text style={styles.dropdownUserName}>{user?.name || 'Employee User'}</Text>
                  <Text style={styles.dropdownUserEmail}>{user?.email || 'employee@example.com'}</Text>
                  <View style={styles.dropdownRoleBadge}>
                    <Text style={styles.dropdownRoleBadgeText}>Employee</Text>
                  </View>
                </View>
              </View>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity style={styles.dropdownItem} onPress={() => handleDropdownItemPress('profile')} activeOpacity={0.7}>
                <View style={[styles.dropdownItemIcon, { backgroundColor: '#3b82f6' }]}>
                  <Ionicons name="person-outline" size={18} color="#fff" />
                </View>
                <Text style={styles.dropdownItemText}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => handleDropdownItemPress('settings')} activeOpacity={0.7}>
                <View style={[styles.dropdownItemIcon, { backgroundColor: '#8b5cf6' }]}>
                  <Ionicons name="settings-outline" size={18} color="#fff" />
                </View>
                <Text style={styles.dropdownItemText}>Settings</Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity style={styles.dropdownItem} onPress={() => handleDropdownItemPress('logout')} activeOpacity={0.7}>
                <View style={[styles.dropdownItemIcon, { backgroundColor: '#ef4444' }]}>
                  <Ionicons name="log-out-outline" size={18} color="#fff" />
                </View>
                <Text style={[styles.dropdownItemText, { color: '#ef4444' }]}>Logout</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={{ paddingBottom: tabBarVisible ? tabBarHeight + 24 : 24 }}
        >
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>Employee Dashboard</Text>
            <Text style={styles.contentSubtitle}>Your work overview</Text>
          </View>

          <View style={styles.statsGrid}>
            <Card style={[styles.card, { backgroundColor: "#3B82F6" }]}>
              <Card.Content>
                <Text style={styles.cardTitle}>My Tasks</Text>
                <Text style={styles.cardValue}>{stats.tasksAssigned}</Text>
                <Text style={styles.cardSub}>Completed {stats.tasksCompleted}</Text>
              </Card.Content>
            </Card>

            <Card style={[styles.card, { backgroundColor: "#10B981" }]}>
              <Card.Content>
                <Text style={styles.cardTitle}>Attendance</Text>
                <Text style={styles.cardValue}>{stats.attendancePercentage}%</Text>
                <ProgressBar progress={stats.attendancePercentage / 100} color="white" />
              </Card.Content>
            </Card>

            <Card style={[styles.card, { backgroundColor: "#06b6d4" }]}>
              <Card.Content>
                <Text style={styles.cardTitle}>Leaves Left</Text>
                <Text style={styles.cardValue}>{stats.leavesAvailable}</Text>
                <Text style={styles.cardSub}>Used {stats.leavesTaken}</Text>
              </Card.Content>
            </Card>

            <Card style={[styles.card, { backgroundColor: "#F59E0B" }]}>
              <Card.Content>
                <Text style={styles.cardTitle}>Work Hours</Text>
                <Text style={styles.cardValue}>{stats.currentMonthHours}h</Text>
                <Text style={styles.cardSub}>On track</Text>
              </Card.Content>
            </Card>
          </View>

          <Card style={styles.sectionCard}>
            <Card.Title title="My Tasks" left={(props) => <Avatar.Icon {...props} icon="clipboard-list-outline" />} />
            <Card.Content>
              {myTasks.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Chip
                      compact
                      style={[styles.taskChip, { backgroundColor: task.priority === 'urgent' ? '#ef4444' : task.priority === 'high' ? '#f59e0b' : '#9ca3af' }]}
                      textStyle={{ color: 'white', fontSize: 10 }}
                    >
                      {task.priority}
                    </Chip>
                  </View>
                  <Text style={styles.taskMeta}>Due: {task.dueDate}</Text>
                  <Text style={styles.taskStatus}>{task.status.toUpperCase()} • {task.progress}%</Text>
                  <ProgressBar progress={task.progress / 100} color={task.status === 'completed' ? '#22c55e' : '#2563eb'} style={{ height: 6, borderRadius: 5, marginTop: 4 }} />
                </View>
              ))}
              <Button mode="outlined" onPress={() => handleNavigation('Tasks')} style={{ marginTop: 10 }}>View All Tasks</Button>
            </Card.Content>
          </Card>

          <Card style={styles.sectionCard}>
            <Card.Title title="Recent Activities" left={(props) => <Avatar.Icon {...props} icon="history" />} />
            <Card.Content>
              {recentActivities.map((act) => (
                <View key={act.id} style={styles.activityRow}>
                  <View style={[styles.activityIcon, { backgroundColor: act.type === 'success' ? '#10b981' : act.type === 'warning' ? '#f59e0b' : '#3b82f6' }]}>
                    <Ionicons name={act.type === 'success' ? 'checkmark-circle-outline' : act.type === 'warning' ? 'alert-circle-outline' : 'pulse-outline'} size={18} color="white" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityTitle}>{act.action}</Text>
                    <Text style={styles.activityDesc}>{act.desc}</Text>
                    <Text style={styles.activityTime}>{act.time}</Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
          <Card style={styles.sectionCard}>
            <Card.Title title="More Options" />
            <Card.Content>
              <View style={styles.quickGrid}>
                <TouchableOpacity style={styles.quickBtn} onPress={() => handleNavigation('Settings')}>
                  <Ionicons name="settings-outline" size={22} color="#6366f1" />
                  <Text style={styles.quickText}>Settings</Text>
                </TouchableOpacity>
                   <TouchableOpacity style={styles.quickBtn} onPress={() => handleNavigation('Profile')}>
                  <Ionicons name="person-outline" size={22} color="#7c3aed" />
                  <Text style={styles.quickText}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickBtn} onPress={logout}>
                  <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                  <Text style={styles.quickText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  pageContainer: { flex: 1, backgroundColor: "#39549fff" },
  scrollContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingHorizontal: 16,
    marginTop: -10,
  },
  header: { 
    backgroundColor: "#39549fff", 
    paddingHorizontal: 20, 
    paddingTop: 15, 
    paddingBottom: 40, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40,
  },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  profileSection: { flexDirection: "row", alignItems: "center" },
  avatarTouchable: { marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255, 255, 255, 0.25)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  statusIndicator: { position: "absolute", bottom: 2, right: 2 },
  onlineStatus: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10b981" },
  userInfo: { marginLeft: 8 },
  userName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  userRole: { color: "#fce7f3", fontSize: 12 },
  headerWelcomeSection: { marginTop: 12 },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  headerSub: { color: "#fce7f3", marginTop: 4 },
  contentHeader: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contentTitle: { fontSize: 22, fontWeight: "bold", color: "#1F2937", marginBottom: 4 },
  contentSubtitle: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  card: {
    width: "48%",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  cardTitle: { color: "white", fontSize: 14, fontWeight: "600" },
  cardValue: { color: "white", fontSize: 24, fontWeight: "bold" },
  cardSub: { color: "white", fontSize: 12 },
  sectionCard: { marginVertical: 8 },
  taskCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  taskHeader: { flexDirection: "row", justifyContent: "space-between" },
  taskTitle: { fontWeight: "bold", fontSize: 14 },
  taskChip: { height: 22, justifyContent: "center" },
  taskMeta: { fontSize: 11, color: "#6b7280" },
  taskStatus: { fontSize: 11, color: "#374151" },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  activityTitle: { fontWeight: "bold", fontSize: 13 },
  activityDesc: { fontSize: 11, color: "#6b7280" },
  activityTime: { fontSize: 10, color: "#9ca3af" },
  quickGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  quickBtn: {
    alignItems: "center",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 12,
    width: 80,
    elevation: 1,
  },
  quickText: { fontSize: 11, marginTop: 5 },
  dropdownBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.25)", zIndex: 999 },
  dropdownMenu: { position: "absolute", top: 120, left: 20, right: 20, backgroundColor: "#fff", borderRadius: 16, elevation: 15, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, zIndex: 1000, overflow: "hidden" },
  dropdownHeader: { flexDirection: "row", alignItems: "center", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  dropdownAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#3b82f6", alignItems: "center", justifyContent: "center", marginRight: 12 },
  dropdownAvatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  dropdownUserInfo: { flex: 1 },
  dropdownUserName: { fontSize: 16, fontWeight: "700", color: "#1f2937", marginBottom: 2 },
  dropdownUserEmail: { fontSize: 13, color: "#6b7280", marginBottom: 6 },
  dropdownRoleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf: "flex-start", backgroundColor: "#a78bfa" },
  dropdownRoleBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  dropdownDivider: { height: 1, backgroundColor: "#e5e7eb", marginHorizontal: 16 },
  dropdownItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", marginRight: 12 },
  dropdownItemText: { fontSize: 15, fontWeight: "500", color: "#374151" },
});
