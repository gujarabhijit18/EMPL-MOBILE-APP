import { Ionicons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import {
    Activity,
    AlertCircle,
    Calendar,
    CheckCircle2,
    ClipboardList,
    Clock,
    Users
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import type { ViewStyle } from "react-native";
import { Alert, Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import type { TabParamList } from "../../navigation/TabNavigator";

// Dummy translation
const t = {
  common: { welcome: "Welcome" },
  dashboard: { quickActions: "Quick Actions" },
};

type RecentActivityType = "success" | "warning" | "info";
type MemberStatus = "present" | "on-leave";

type RecentActivity = {
  id: number;
  type: RecentActivityType;
  user: string;
  action: string;
  time: string;
};

type AttendanceRecord = {
  id: number;
  date: string;
  checkIn: string;
  checkOut: string;
  status: "On Time" | "Late";
};

type TeamLeadNavigationParam = BottomTabNavigationProp<TabParamList>;

const TeamLeadDashboard = () => {
  const navigation = useNavigation<TeamLeadNavigationParam>();
  const { user, logout } = useAuth();
  const { isDarkMode, colors } = useTheme();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownOpacity = React.useRef(new Animated.Value(0)).current;
  const dropdownTranslateY = React.useRef(new Animated.Value(-10)).current;

  const [stats, setStats] = useState({
    teamSize: 0,
    presentToday: 0,
    onLeave: 0,
    tasksInProgress: 0,
    completedToday: 0,
    pendingReviews: 0,
    teamEfficiency: 0,
  });

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [attendanceHistory] = useState<AttendanceRecord[]>([
    {
      id: 1,
      date: new Date().toISOString(),
      checkIn: "09:00 AM",
      checkOut: "05:30 PM",
      status: "On Time",
    },
    {
      id: 2,
      date: new Date(Date.now() - 86400000).toISOString(),
      checkIn: "09:05 AM",
      checkOut: "05:20 PM",
      status: "On Time",
    },
    {
      id: 3,
      date: new Date(Date.now() - 2 * 86400000).toISOString(),
      checkIn: "09:15 AM",
      checkOut: "06:15 PM",
      status: "Late",
    },
  ]);

  useEffect(() => {
    // Replace with your API
    setStats({
      teamSize: 4,
      presentToday: 3,
      onLeave: 1,
      tasksInProgress: 5,
      completedToday: 2,
      pendingReviews: 1,
      teamEfficiency: 80,
    });

    setRecentActivities([
      { id: 1, type: "success", user: "John Doe", action: "Completed Feature X", time: "10:30 AM" },
      { id: 2, type: "warning", user: "Jane Smith", action: "Pending Review", time: "10:50 AM" },
    ]);
  }, []);

  const goTo = (routeName: string) => {
    try {
      navigation.navigate(routeName as never);
    } catch (_) {
      // Fallback for nested navigators
      (navigation as any).getParent?.()?.navigate(routeName as never);
    }
  };

  const initials = (() => {
    const n = (user?.name || "TL").trim();
    if (!n) return "TL";
    const parts = n.split(" ").filter(Boolean);
    const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : n.slice(0, 2);
    return letters.toUpperCase();
  })();
  const roleLabel = (user?.role || "team_lead").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const getInitials = (n: string) => {
    const parts = (n || "").trim().split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    const letters = (first + second) || first;
    return letters.toUpperCase();
  };

  const toggleDropdown = () => {
    const toValue = dropdownVisible ? 0 : 1;
    setDropdownVisible(!dropdownVisible);
    Animated.parallel([
      Animated.timing(dropdownOpacity, {
        toValue,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(dropdownTranslateY, {
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
        case "profile":
          goTo("Profile");
          break;
        case "settings":
          goTo("Settings");
          break;
        case "logout":
          Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: logout },
          ]);
          break;
      }
    }, 100);
  };

  const teamMembers: Array<{ name: string; status: MemberStatus; task: string; progress: number }> = [
    { name: "John Doe", status: "present", task: "Feature Development", progress: 75 },
    { name: "Jane Smith", status: "present", task: "Bug Fixes", progress: 90 },
    { name: "Mike Johnson", status: "on-leave", task: "Code Review", progress: 0 },
    { name: "Sarah Wilson", status: "present", task: "Testing", progress: 60 },
  ];

  return (
    <SafeAreaView style={[styles.safeAreaContainer, { backgroundColor: colors.header }]} edges={["top"]}>
      <StatusBar style={isDarkMode ? "light" : "light"} />
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <View style={[styles.headerCard, { backgroundColor: colors.header }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity activeOpacity={0.8} onPress={toggleDropdown} style={styles.avatarTouchable}>
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>{(user?.name || "TL").charAt(0).toUpperCase()}</Text>
                <View style={styles.statusIndicator}>
                  <View style={styles.onlineStatus} />
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{user?.name || "Team Lead"}</Text>
              <Text style={styles.headerRole}>{roleLabel}</Text>
            </View>
          </View>

          <View style={styles.headerWelcomeSection}>
            <Text style={styles.welcomeText}>Welcome back! 👋</Text>
            <Text style={styles.headerDate}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>
      </View>

        {dropdownVisible && (
          <>
            <TouchableOpacity style={styles.dropdownBackdrop} onPress={toggleDropdown} />
            <Animated.View
              style={[
                styles.dropdownMenu,
                { opacity: dropdownOpacity, transform: [{ translateY: dropdownTranslateY }] },
              ]}
            >
              <LinearGradient colors={["#e9f0ff", "#f6f9ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dropdownHeader}>
                <View style={styles.dropdownAvatar}>
                  <Text style={styles.dropdownAvatarText}>{initials}</Text>
                </View>
                <View style={styles.dropdownUserInfo}>
                  <Text style={styles.dropdownUserName}>{user?.name || "Team Lead"}</Text>
                  <Text style={styles.dropdownUserEmail}>{user?.email || "teamlead@example.com"}</Text>
                  <LinearGradient colors={["#3b82f6", "#2563eb"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dropdownRoleBadge}>
                    <Text style={styles.dropdownRoleBadgeText}>{roleLabel}</Text>
                  </LinearGradient>
                </View>
              </LinearGradient>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity style={styles.dropdownItem} onPress={() => handleDropdownItemPress("profile")} activeOpacity={0.7}>
                <LinearGradient colors={["#60a5fa", "#2563eb"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dropdownItemIcon}>
                  <Ionicons name="person-outline" size={18} color="#fff" />
                </LinearGradient>
                <Text style={styles.dropdownItemText}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => handleDropdownItemPress("settings")} activeOpacity={0.7}>
                <LinearGradient colors={["#a78bfa", "#7c3aed"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dropdownItemIcon}>
                  <Ionicons name="settings-outline" size={18} color="#fff" />
                </LinearGradient>
                <Text style={styles.dropdownItemText}>Settings</Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity style={styles.dropdownItem} onPress={() => handleDropdownItemPress("logout")} activeOpacity={0.7}>
                <View style={[styles.dropdownItemIcon, { backgroundColor: "#ef4444" }]}>
                  <Ionicons name="log-out-outline" size={18} color="#fff" />
                </View>
                <Text style={[styles.dropdownItemText, { color: "#ef4444" }]}>Logout</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}

        <View style={styles.contentContainer}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: Math.max(24, tabBarVisible ? tabBarHeight + 24 : 24) }}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          {/* QUICK STATS */}
      <View style={styles.grid}>
        <View style={[styles.card, styles.cardBase]}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardLabel}>Team Members</Text>
            <View style={styles.cardIconBubble}><Ionicons name="people" size={18} color="#fff" /></View>
          </View>
          <Text style={styles.cardValue}>{stats.teamSize}</Text>
          <Text style={styles.cardSub}>{stats.presentToday} present today</Text>
        </View>

        <View style={[styles.cardGreen, styles.cardBase]}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardLabel}>Team Performance</Text>
            <View style={styles.cardIconBubble}><Ionicons name="speedometer" size={18} color="#fff" /></View>
          </View>
          <Text style={styles.cardValue}>{stats.teamEfficiency}%</Text>
        </View>

        <View style={[styles.cardBlue, styles.cardBase]}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardLabel}>Active Tasks</Text>
            <View style={styles.cardIconBubble}><Ionicons name="briefcase-outline" size={18} color="#fff" /></View>
          </View>
          <Text style={styles.cardValue}>{stats.tasksInProgress}</Text>
          <Text style={styles.cardSub}>{stats.completedToday} completed today</Text>
        </View>

        <View style={[styles.cardOrange, styles.cardBase]}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardLabel}>Pending Approvals</Text>
            <View style={styles.cardIconBubble}><Ionicons name="alert-circle" size={18} color="#fff" /></View>
          </View>
          <Text style={styles.cardValue}>{stats.pendingReviews}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Tasks")}>
            <Text style={styles.reviewText}>Review Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TEAM MEMBERS */}
      <View style={styles.bigCard}>
        <Text style={styles.bigCardTitle}>
          <Users size={20} color="#059669" /> Team Members
        </Text>
        <Text style={styles.bigCardDesc}>Current status and task progress</Text>

        {teamMembers.map((m) => (
          <View key={m.name} style={styles.memberItem}>
            <View style={styles.memberTopRow}>
              <View style={styles.memberLeft}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{getInitials(m.name)}</Text>
                  <View style={styles.memberStatusWrap}>
                    <View style={[styles.memberStatusDot, { backgroundColor: m.status === "present" ? "#22c55e" : "#f59e0b" }]} />
                  </View>
                </View>
                <View>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberTask}>{m.task}</Text>
                </View>
              </View>
              <View style={[styles.badgeBase, getBadgeStyle(m.status)]}>
                <Text style={styles.badgeText}>{m.status === "present" ? "Active" : "On Leave"}</Text>
              </View>
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${m.progress}%` }]} /></View>
          </View>
        ))}
      </View>

      {/* RECENT ACTIVITY */}
      <View style={styles.bigCard}>
        <Text style={styles.bigCardTitle}>
          <Activity size={20} color="#6366f1" /> Recent Activity
        </Text>
        <Text style={styles.bigCardDesc}>Latest team updates</Text>

        {recentActivities.map((a) => (
          <View key={a.id} style={styles.activityItem}>
            <View
              style={[
                styles.activityIcon,
                a.type === "success" ? styles.bgGreen : a.type === "warning" ? styles.bgOrange : styles.bgBlue,
              ]}
            >
              {a.type === "success" && <CheckCircle2 size={18} color="white" />}
              {a.type === "warning" && <AlertCircle size={18} color="white" />}
              {a.type === "info" && <Activity size={18} color="white" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityName}>{a.user}</Text>
              <Text style={styles.activityText}>{a.action}</Text>
            </View>
            <View style={styles.activityRight}>
              <Text style={styles.activityTime}>{a.time}</Text>
              <View style={[
                styles.activityBadge,
                a.type === "success" ? styles.activityBadgeSuccess : a.type === "warning" ? styles.activityBadgeWarning : styles.activityBadgeInfo,
              ]}>
                <Text style={styles.activityBadgeText}>{a.type === "success" ? "Completed" : a.type === "warning" ? "Pending" : "Update"}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* QUICK ACTIONS */}
      <View style={styles.quickCard}>
        <Text style={styles.quickTitle}>{t.dashboard.quickActions}</Text>
        <Text style={styles.quickDesc}>Frequently used team lead actions</Text>

        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate("Teams")}
          >
            <Users size={22} />
            <Text style={styles.quickText}>View Team</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate("Attendance")}
          >
            <Clock size={22} />
            <Text style={styles.quickText}>My Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate("Leaves")}
          >
            <Calendar size={22} />
            <Text style={styles.quickText}>Leave Requests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate("Tasks")}
          >
            <ClipboardList size={22} />
            <Text style={styles.quickText}>Manage Tasks</Text>
          </TouchableOpacity>
        </View>
      </View>

        </ScrollView>
        </View>
    </SafeAreaView>
  );
};

export default TeamLeadDashboard;

const styles = StyleSheet.create({
  safeAreaContainer: { flex: 1, backgroundColor: "#39549fff" },
  container: { flex: 1 },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    padding: 16,
  },

  /* HEADER */
  header: {
    backgroundColor: "#39549fff",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
    position: "relative",
  },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "flex-start" },
  headerTextContainer: { flex: 1, paddingHorizontal: 16 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "white", marginBottom: 0 },
  headerRole: { color: "#c7d2fe", fontSize: 13, textTransform: "uppercase", marginTop: 2 },
  headerDate: { marginTop: 4, color: "#ccfbf1", fontSize: 12 },
  headerWelcomeSection: { marginTop: 8 },
  welcomeText: { color: "#ffffff", fontSize: 20, fontWeight: "700" },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  headerAvatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  avatarTouchable: { flexDirection: "row", alignItems: "center" },
  statusIndicator: { position: "absolute", bottom: 2, right: 2 },
  onlineStatus: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10b981" },
  

  dropdownBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    zIndex: 999,
  },
  dropdownMenu: {
    position: "absolute",
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    zIndex: 1000,
    overflow: "hidden",
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  dropdownAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dropdownAvatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  dropdownUserInfo: { flex: 1 },
  dropdownUserName: { fontSize: 16, fontWeight: "700", color: "#1f2937", marginBottom: 2 },
  dropdownUserEmail: { fontSize: 13, color: "#6b7280", marginBottom: 6 },
  dropdownRoleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf: "flex-start" },
  dropdownRoleBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  dropdownDivider: { height: 1, backgroundColor: "#e5e7eb", marginHorizontal: 16 },
  dropdownItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", marginRight: 12 },
  dropdownItemText: { fontSize: 15, fontWeight: "500", color: "#374151" },

  /* SMALL CARDS */
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    backgroundColor: "#6366f1",
    width: "47%",
    padding: 16,
    borderRadius: 16,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  cardGreen: {
    backgroundColor: "#10b981",
    width: "47%",
    padding: 16,
    borderRadius: 16,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  cardBlue: {
    backgroundColor: "#0ea5e9",
    width: "47%",
    padding: 16,
    borderRadius: 16,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  cardOrange: {
    backgroundColor: "#f59e0b",
    width: "47%",
    padding: 16,
    borderRadius: 16,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  cardBase: { position: "relative" },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: { fontSize: 12, color: "white" },
  cardValue: { fontSize: 28, color: "white", fontWeight: "bold" },
  cardSub: { color: "#e0f2fe", marginTop: 6 },

  /* TEAM CARD */
  bigCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
  },
  bigCardTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  bigCardDesc: { color: "#6b7280", marginBottom: 12 },

  memberItem: { marginBottom: 16 },
  memberTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  memberLeft: { flexDirection: "row", gap: 12, alignItems: "center" },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e5edff",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  memberAvatarText: { color: "#1f2937", fontSize: 14, fontWeight: "700" },
  memberStatusWrap: { position: "absolute", bottom: 2, right: 2 },
  memberStatusDot: { width: 8, height: 8, borderRadius: 4 },
  memberName: { fontWeight: "600" },
  memberTask: { fontSize: 12, color: "#6b7280" },
  badgeBase: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: "white", fontSize: 12 },
  progressTrack: { height: 6, backgroundColor: "#e5e7eb", borderRadius: 6, marginTop: 10 },
  progressFill: { height: 6, backgroundColor: "#6366f1", borderRadius: 6 },

  /* RECENT ACTIVITY */
  activityItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    alignItems: "center",
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bgGreen: { backgroundColor: "#10b981" },
  bgOrange: { backgroundColor: "#f59e0b" },
  bgBlue: { backgroundColor: "#6366f1" },
  activityName: { fontWeight: "600" },
  activityText: { fontSize: 12, color: "#6b7280" },
  activityTime: { fontSize: 12, color: "#9ca3af" },
  activityRight: { alignItems: "flex-end" },
  activityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginTop: 6 },
  activityBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  activityBadgeSuccess: { backgroundColor: "#10b981" },
  activityBadgeWarning: { backgroundColor: "#f59e0b" },
  activityBadgeInfo: { backgroundColor: "#6366f1" },

  /* QUICK ACTIONS */
  quickCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 30,
  },
  quickTitle: { fontSize: 18, fontWeight: "bold" },
  quickDesc: { color: "#6b7280", marginBottom: 14 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickBtn: {
    width: "47%",
    padding: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    alignItems: "center",
    gap: 6,
  },
  quickText: { fontSize: 12, color: "#374151" },
  reviewText: { marginTop: 8, color: "white", fontWeight: "600" },
});

const getBadgeStyle = (status: MemberStatus): ViewStyle => ({
  backgroundColor: status === "present" ? "#059669" : "#475569",
});
