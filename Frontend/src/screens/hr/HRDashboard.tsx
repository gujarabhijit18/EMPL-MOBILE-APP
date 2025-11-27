import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // ✅ Expo-safe icons
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from 'expo-status-bar';
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns";

interface Stats {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  lateArrivals: number;
  pendingLeaves: number;
  newJoinersThisMonth: number;
  exitingThisMonth: number;
  openPositions: number;
}

interface SelfAttendanceRecord {
  id: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status?: "present" | "late" | "absent";
}

export default function HRDashboard() {
  const navigation = useNavigation<any>();
  const { logout, user } = useAuth();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownOpacity = React.useRef(new Animated.Value(0)).current;
  const dropdownTranslateY = React.useRef(new Animated.Value(-10)).current;
  const [attendanceViewMode, setAttendanceViewMode] = useState<'self' | 'employee'>('self');
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    lateArrivals: 0,
    pendingLeaves: 0,
    newJoinersThisMonth: 0,
    exitingThisMonth: 0,
    openPositions: 0,
  });
  const [selfAttendanceHistory, setSelfAttendanceHistory] = useState<SelfAttendanceRecord[]>([]);
  const [currentSelfAttendance, setCurrentSelfAttendance] = useState<SelfAttendanceRecord | null>(null);

  useEffect(() => {
    // ✅ Simulate data (offline mode)
    const loadStats = async () => {
      setTimeout(() => {
        setStats({
          totalEmployees: 50,
          presentToday: 42,
          onLeave: 5,
          lateArrivals: 3,
          pendingLeaves: 4,
          newJoinersThisMonth: 2,
          exitingThisMonth: 1,
          openPositions: 3,
        });
      }, 800);
    };
    loadStats();
  }, []);

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const mockSelfData: SelfAttendanceRecord[] = [
      { id: "1", date: today, checkInTime: "09:12 AM", checkOutTime: "--", status: "present" },
      { id: "2", date: "2025-11-17", checkInTime: "09:04 AM", checkOutTime: "06:02 PM", status: "present" },
      { id: "3", date: "2025-11-16", checkInTime: "09:25 AM", checkOutTime: "06:30 PM", status: "late" },
      { id: "4", date: "2025-11-15", checkInTime: "--", checkOutTime: "--", status: "absent" },
    ];
    setSelfAttendanceHistory(mockSelfData);
    setCurrentSelfAttendance(mockSelfData.find((record) => record.date === today) || null);
  }, []);

  const formatTime = (time?: string) => {
    if (!time || time === "--") return "--";
    return time;
  };

  const formatDateDisplay = (date: string) => {
    try {
      return format(new Date(date), "dd MMM yyyy");
    } catch {
      return date;
    }
  };

  const getStatusBadgeStyle = (status?: string) => {
    switch (status) {
      case "late":
        return { backgroundColor: "#f97316" };
      case "absent":
        return { backgroundColor: "#ef4444" };
      default:
        return { backgroundColor: "#10b981" };
    }
  };

  const recentActivities = [
    { id: "1", type: "leave", user: "Jane Smith", time: "10:30 AM", status: "Pending" },
    { id: "2", type: "join", user: "Mike Johnson", time: "Today", status: "New Joiner" },
    { id: "3", type: "document", user: "Sarah Wilson", time: "2:00 PM", status: "Submitted" },
    { id: "4", type: "leave", user: "Tom Anderson", time: "3:15 PM", status: "Approved" },
  ];

  // ✅ Navigation handler
  const goTo = (routeName: string) => {
    try {
      navigation.navigate(routeName as never);
    } catch (_) {
      navigation.getParent()?.navigate(routeName as never);
    }
  };

  const initials = (() => {
    const n = (user?.name || "HR").trim();
    if (!n) return "HR";
    const parts = n.split(" ").filter(Boolean);
    const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : n.slice(0, 2);
    return letters.toUpperCase();
  })();
  const roleLabel = (user?.role || "hr").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  // Show the actual HR name coming from backend, fall back only if missing
  const displayName = user?.name || "HR User";

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

  const handleNavigation = (screen: string) => {
    if (screen === "Reports") {
      goTo("Reports");
    } else if (screen === "Profile") {
      goTo("Profile");
    } else if (screen === "Settings") {
      goTo("Settings");
    } else if (screen === "Attendance") {
      // Navigate to AttendanceManager (now has role-based logic built-in)
      goTo("AttendanceManager");
    } else if (screen === "AddEmployee") {
      goTo("EmployeeManagement");
    } else {
      Alert.alert("Navigation", `Would navigate to ${screen}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* Enhanced Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleDropdown}
              style={styles.avatarTouchable}
            >
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>
                  {(user?.name || "HR").charAt(0).toUpperCase()}
                </Text>
                <View style={styles.statusIndicator}>
                  <View style={styles.onlineStatus} />
                </View>
              </View>
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{displayName}</Text>
              <Text style={styles.headerSubtitle}>{roleLabel}</Text>
            </View>
          </View>

          <View style={styles.headerWelcomeSection}>
            <Text style={styles.welcomeText}>Welcome back! 👋</Text>
            <Text style={styles.headerSubtitle2}>Ready to manage your organization efficiently</Text>
          </View>
        </View>

        {/* Dropdown Menu */}
        {dropdownVisible && (
          <>
            <TouchableOpacity style={styles.dropdownBackdrop} onPress={toggleDropdown} />
            <Animated.View
              style={[
                styles.dropdownMenu,
                { opacity: dropdownOpacity, transform: [{ translateY: dropdownTranslateY }] },
              ]}
            >
              <LinearGradient
                colors={["#e9f0ff", "#f6f9ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dropdownHeader}
              >
                <View style={styles.dropdownAvatar}>
                  <Text style={styles.dropdownAvatarText}>{initials}</Text>
                </View>
                <View style={styles.dropdownUserInfo}>
                  <Text style={styles.dropdownUserName}>{user?.name || "HR User"}</Text>
                  <Text style={styles.dropdownUserEmail}>{user?.email || "hr@example.com"}</Text>
                  <LinearGradient
                    colors={["#3b82f6", "#2563eb"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dropdownRoleBadge}
                  >
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

        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={{ paddingBottom: tabBarVisible ? tabBarHeight + 24 : 24 }}
        >
          {/* Content Header Section */}
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>HR Dashboard</Text>
            <Text style={styles.contentSubtitle}>Manage and monitor your team</Text>
          </View>

          {/* 📊 QUICK STATS */}
        <View style={styles.statsContainer}>
          <View style={[styles.card, { backgroundColor: "#3B82F6" }]}>
            <Ionicons name="people-outline" size={22} color="white" />
            <Text style={styles.cardTitle}>Employees</Text>
            <Text style={styles.cardValue}>{stats.totalEmployees}</Text>
            <Text style={styles.cardSub}>+{stats.newJoinersThisMonth} new this month</Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#10B981" }]}>
            <Ionicons name="checkmark-done-outline" size={22} color="white" />
            <Text style={styles.cardTitle}>Present Today</Text>
            <Text style={styles.cardValue}>{stats.presentToday}</Text>
            <Text style={styles.cardSub}>On time attendance</Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#F59E0B" }]}>
            <Ionicons name="alert-circle-outline" size={22} color="white" />
            <Text style={styles.cardTitle}>Pending Leaves</Text>
            <Text style={styles.cardValue}>{stats.pendingLeaves}</Text>
            <Text style={styles.cardSub}>Needs Review</Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#8B5CF6" }]}>
            <Ionicons name="briefcase-outline" size={22} color="white" />
            <Text style={styles.cardTitle}>Open Positions</Text>
            <Text style={styles.cardValue}>{stats.openPositions}</Text>
            <Text style={styles.cardSub}>Active recruitment</Text>
          </View>
        </View>

        {/* 🙋‍♀️ HR Self Attendance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Attendance</Text>
          <View style={styles.selfAttendanceCard}>
            <View style={styles.selfAttendanceHeader}>
              <View>
                <Text style={styles.selfAttendanceTitle}>Today's Status</Text>
                <Text style={styles.selfAttendanceSubtitle}>Stay on top of your check-ins</Text>
              </View>
              <View style={[styles.selfStatusBadge, getStatusBadgeStyle(currentSelfAttendance?.status)]}>
                <Text style={styles.selfStatusBadgeText}>
                  {currentSelfAttendance?.status ? currentSelfAttendance.status.replace(/^./, (c) => c.toUpperCase()) : "--"}
                </Text>
              </View>
            </View>

            <View style={styles.selfStatusGrid}>
              <View style={styles.selfStatusItem}>
                <Text style={styles.selfStatusLabel}>Check-in</Text>
                <Text style={styles.selfStatusValue}>{formatTime(currentSelfAttendance?.checkInTime)}</Text>
              </View>
              <View style={styles.selfStatusDivider} />
              <View style={styles.selfStatusItem}>
                <Text style={styles.selfStatusLabel}>Check-out</Text>
                <Text style={styles.selfStatusValue}>{formatTime(currentSelfAttendance?.checkOutTime)}</Text>
              </View>
              <View style={styles.selfStatusDivider} />
              <View style={styles.selfStatusItem}>
                <Text style={styles.selfStatusLabel}>Hours</Text>
                <Text style={styles.selfStatusValue}>
                  {currentSelfAttendance?.checkInTime && currentSelfAttendance?.checkOutTime ? "08h 45m" : "--"}
                </Text>
              </View>
            </View>

            <View style={styles.selfHistoryListHeader}>
              <Text style={styles.selfHistoryTitle}>Recent History</Text>
              <Text style={styles.selfHistorySubtitle}>Last 5 days</Text>
            </View>

            {selfAttendanceHistory.length ? (
              <View>
                {selfAttendanceHistory.slice(0, 5).map((item) => (
                  <View key={item.id} style={styles.selfHistoryRow}>
                    <View style={styles.selfHistoryDateBlock}>
                      <Text style={styles.selfHistoryDateText}>{formatDateDisplay(item.date)}</Text>
                      <Text style={styles.selfHistoryDayText}>{format(new Date(item.date), "EEE")}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selfHistoryTime}>In: {formatTime(item.checkInTime)}</Text>
                      <Text style={styles.selfHistoryTime}>Out: {formatTime(item.checkOutTime)}</Text>
                    </View>
                    <View style={[styles.selfHistoryStatusBadge, getStatusBadgeStyle(item.status)]}>
                      <Text style={styles.selfHistoryStatusText}>
                        {item.status ? item.status.replace(/^./, (c) => c.toUpperCase()) : "--"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noHistoryText}>No attendance history available</Text>
            )}
          </View>
        </View>

        {/* 🕓 RECENT ACTIVITIES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          {recentActivities.map((item) => (
            <View key={item.id} style={styles.activityCard}>
              <View
                style={[
                  styles.activityIcon,
                  item.type === "leave"
                    ? { backgroundColor: "#FBBF24" }
                    : item.type === "join"
                    ? { backgroundColor: "#10B981" }
                    : { backgroundColor: "#60A5FA" },
                ]}
              >
                <Ionicons
                  name={
                    item.type === "leave"
                      ? "calendar-outline"
                      : item.type === "join"
                      ? "person-add-outline"
                      : "document-text-outline"
                  }
                  color="white"
                  size={18}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityUser}>{item.user}</Text>
                <Text style={styles.activityDesc}>
                  {item.type === "leave"
                    ? "Applied for leave"
                    : item.type === "join"
                    ? "New employee joined"
                    : "Submitted document"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.activityTime}>{item.time}</Text>
                <Text style={styles.activityStatus}>{item.status}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.metricsCard}>
            <View style={styles.metricsHeader}>
              <View style={styles.metricsIcon}>
                <Ionicons name="trending-up-outline" size={18} color="#fff" />
              </View>
              <View>
                <Text style={styles.metricsTitle}>Employee Metrics</Text>
                <Text style={styles.metricsSubtitle}>This month's overview</Text>
              </View>
            </View>
            {[
              { label: "New Joiners", value: stats.newJoinersThisMonth },
              { label: "Exits", value: stats.exitingThisMonth },
              { label: "On Leave", value: stats.onLeave },
              { label: "Late Arrivals Today", value: stats.lateArrivals },
            ].map((row, idx) => {
              const total = Math.max(stats.totalEmployees || 0, 1);
              const pct = Math.min(100, Math.round((row.value / total) * 100));
              return (
                <View key={`${row.label}-${idx}`} style={{ marginBottom: 10 }}>
                  <View style={styles.metricsRow}>
                    <Text style={styles.metricsLabel}>{row.label}</Text>
                    <Text style={styles.metricsValue}>{row.value}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 👤 Account & Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account & Settings</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleNavigation("Profile")}
            >
              <Ionicons name="person-outline" size={20} color="#111" />
              <Text style={styles.actionText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleNavigation("Settings")}
            >
              <Ionicons name="settings-outline" size={20} color="#111" />
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#39549fff',
  },
  container: {
    flex: 1,
    backgroundColor: "#39549fff",
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingHorizontal: 16,
    marginTop: -10,
    zIndex: 2,
  },
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
  contentTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  contentSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  header: {
    backgroundColor: "#39549fff",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: -20,
    zIndex: 1,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
  },
  headerSubtitle: {
    color: "#c7d2fe",
    fontSize: 13,
  },
  headerWelcomeSection: {
    marginTop: 8,
    alignItems: "center",
  },
  welcomeText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubtitle2: {
    color: "#c7d2fe",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 6,
    textAlign: "center",
  },
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
  headerAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  avatarTouchable: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
  },
  onlineStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
  },
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
  dropdownAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  dropdownUserInfo: {
    flex: 1,
  },
  dropdownUserName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 2,
  },
  dropdownUserEmail: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 6,
  },
  dropdownRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  dropdownRoleBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 16,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },
  welcome: { color: "white", fontSize: 22, fontWeight: "700" },
  date: { color: "#DDD6FE", fontSize: 12, marginTop: 4 },
  addButton: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addText: { color: "#6B21A8", fontWeight: "600", marginLeft: 6 },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  card: {
    width: "48%",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardTitle: { color: "white", fontSize: 13, marginTop: 4 },
  cardValue: { color: "white", fontSize: 26, fontWeight: "700", marginTop: 4 },
  cardSub: { color: "#E0E7FF", fontSize: 12 },
  section: { marginVertical: 10 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  selfAttendanceCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  selfAttendanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  selfAttendanceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  selfAttendanceSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  selfStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  selfStatusBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  selfStatusGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  selfStatusItem: {
    flex: 1,
    alignItems: "center",
  },
  selfStatusLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  selfStatusValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  selfStatusDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#e5e7eb",
  },
  selfHistoryListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  selfHistoryTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  selfHistorySubtitle: {
    fontSize: 12,
    color: "#9ca3af",
  },
  selfHistoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  selfHistoryDateBlock: {
    width: 90,
  },
  selfHistoryDateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  selfHistoryDayText: {
    fontSize: 11,
    color: "#6b7280",
  },
  selfHistoryTime: {
    fontSize: 12,
    color: "#4b5563",
  },
  selfHistoryStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  selfHistoryStatusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  noHistoryText: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    paddingVertical: 8,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    elevation: 1,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  activityUser: { fontWeight: "600", fontSize: 14 },
  activityDesc: { fontSize: 12, color: "#6B7280" },
  activityTime: { fontSize: 11, color: "#9CA3AF" },
  activityStatus: { fontSize: 11, fontWeight: "600", color: "#111" },
  metricsCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    elevation: 2,
  },
  metricsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  metricsIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  metricsSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  metricsLabel: {
    fontSize: 13,
    color: "#374151",
  },
  metricsValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  progressTrack: {
    height: 6,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
  },
  progressFill: {
    height: 6,
    borderRadius: 6,
    backgroundColor: "#2563EB",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  actionButton: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "48%",
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    color: "#111",
    textAlign: "center",
  },
});
