import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from "react";
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
import { ProgressBar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";

export default function ManagerDashboard() {
  const navigation = useNavigation<any>();
  const { logout, user } = useAuth();
  const { isDarkMode, colors } = useTheme();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();

  // ✅ Offline mock stats
  const [stats] = useState({
    teamMembers: 25,
    presentToday: 22,
    onLeave: 3,
    activeTasks: 18,
    completedTasks: 14,
    pendingApprovals: 4,
    teamPerformance: 88,
    overdueItems: 2,
  });

  // ✅ Team Activity (mock)
  const teamActivities = [
    {
      id: 1,
      type: "task",
      user: "Alice Cooper",
      task: "Design Review",
      time: "11:00 AM",
      status: "completed",
    },
    {
      id: 2,
      type: "leave",
      user: "Bob Martin",
      time: "09:30 AM",
      status: "pending",
    },
    {
      id: 3,
      type: "check-in",
      user: "Carol White",
      time: "09:00 AM",
      status: "on-time",
    },
  ];

  // ✅ Team Summary
  const teamLeads = [
    { name: "Frontend Team", lead: "Alice Cooper", members: 8, completion: 92 },
    { name: "Backend Team", lead: "Bob Martin", members: 10, completion: 85 },
    { name: "QA Team", lead: "Carol White", members: 6, completion: 88 },
  ];

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownOpacity = useRef(new Animated.Value(0)).current;
  const dropdownTranslateY = useRef(new Animated.Value(-10)).current;

  const initials = (() => {
    const name = (user?.name || "Manager").trim();
    if (!name) return "MG";
    const parts = name.split(" ").filter(Boolean);
    return (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
  })();

  const displayName = user?.name || "Manager User";
  const roleLabel = (user?.role || "manager").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const goTo = (routeName: string) => {
    try {
      navigation.navigate(routeName as never);
    } catch (_) {
      navigation.getParent()?.navigate(routeName as never);
    }
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

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <SafeAreaView style={[styles.safeAreaContainer, { backgroundColor: colors.header }]} edges={['top']}>
      <StatusBar style={isDarkMode ? "light" : "light"} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.headerContainer, { backgroundColor: colors.header }]}>
          <View style={[styles.headerGradient, { backgroundColor: colors.header }]}>
            <View style={styles.headerContent}>
              <TouchableOpacity activeOpacity={0.8} onPress={toggleDropdown} style={styles.avatarTouchable}>
                <View style={styles.headerAvatar}>
                  <Text style={styles.headerAvatarText}>{initials}</Text>
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
              <Text style={styles.headerSubtitle2}>{formattedDate}</Text>
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
              <LinearGradient
                colors={["#e0f2f1", "#eff6ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dropdownHeader}
              >
                <View style={styles.dropdownAvatar}>
                  <Text style={styles.dropdownAvatarText}>{initials}</Text>
                </View>
                <View style={styles.dropdownUserInfo}>
                  <Text style={styles.dropdownUserName}>{displayName}</Text>
                  <Text style={styles.dropdownUserEmail}>{user?.email || "manager@example.com"}</Text>
                  <LinearGradient
                    colors={["#0d9488", "#2563eb"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dropdownRoleBadge}
                  >
                    <Text style={styles.dropdownRoleBadgeText}>{roleLabel}</Text>
                  </LinearGradient>
                </View>
              </LinearGradient>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleDropdownItemPress("profile")}
                activeOpacity={0.7}
              >
                <LinearGradient colors={["#60a5fa", "#2563eb"]} style={styles.dropdownItemIcon}>
                  <Ionicons name="person-outline" size={18} color="#fff" />
                </LinearGradient>
                <Text style={styles.dropdownItemText}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleDropdownItemPress("settings")}
                activeOpacity={0.7}
              >
                <LinearGradient colors={["#a78bfa", "#7c3aed"]} style={styles.dropdownItemIcon}>
                  <Ionicons name="settings-outline" size={18} color="#fff" />
                </LinearGradient>
                <Text style={styles.dropdownItemText}>Settings</Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleDropdownItemPress("logout")}
                activeOpacity={0.7}
              >
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
          contentContainerStyle={{ paddingBottom: Math.max(32, tabBarVisible ? tabBarHeight + 24 : 32) }}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          {/* 📊 Quick Stats */}
          <View style={styles.statsGrid}>
            <StatCard
              title="Team Members"
              icon={<Ionicons name="people-outline" size={20} color="#fff" />}
              value={stats.teamMembers}
              subtitle={`${stats.presentToday} present today`}
              colors={["#2563eb", "#1d4ed8"]}
            />
            <StatCard
              title="Team Performance"
              icon={<Ionicons name="speedometer-outline" size={20} color="#fff" />}
              value={`${stats.teamPerformance}%`}
              progress={stats.teamPerformance / 100}
              colors={["#10b981", "#059669"]}
            />
            <StatCard
              title="Active Tasks"
              icon={<Ionicons name="briefcase-outline" size={20} color="#fff" />}
              value={stats.activeTasks}
              colors={["#0ea5e9", "#2563eb"]}
              onPress={() => navigation.navigate("ManagerTasks")}
            />
            <StatCard
              title="Pending Approvals"
              icon={<Ionicons name="alert-circle-outline" size={20} color="#fff" />}
              value={stats.pendingApprovals}
              subtitle={`${stats.overdueItems} overdue`}
              colors={["#f97316", "#ea580c"]}
            />
          </View>

          {/* 🧩 Team Activities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Activities</Text>
            {teamActivities.map((a) => (
              <View key={a.id} style={styles.activityCard}>
                <View
                  style={[
                    styles.activityIconBox,
                    a.type === "task"
                      ? { backgroundColor: "#3b82f6" }
                      : a.type === "leave"
                      ? { backgroundColor: "#f59e0b" }
                      : { backgroundColor: "#10b981" },
                  ]}
                >
                  <Ionicons
                    name={
                      a.type === "task"
                        ? "clipboard-outline"
                        : a.type === "leave"
                        ? "calendar-outline"
                        : "time-outline"
                    }
                    color="#fff"
                    size={18}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.activityUser}>{a.user}</Text>
                  <Text style={styles.activityText}>
                    {a.type === "task"
                      ? `Working on: ${a.task}`
                      : a.type === "leave"
                      ? "Applied for leave"
                      : "Checked in"}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.activityTime}>{a.time}</Text>
                  <View
                    style={[
                      styles.badge,
                      a.status === "completed" || a.status === "on-time"
                        ? styles.badgeSuccess
                        : a.status === "pending"
                        ? styles.badgeWarning
                        : styles.badgeOutline,
                    ]}
                  >
                    <Text style={styles.badgeText}>{a.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* 👥 Team Performance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Performance</Text>
            {teamLeads.map((team) => (
              <View key={team.name} style={styles.teamCard}>
                <View style={styles.teamRow}>
                  <View>
                    <Text style={styles.teamName}>{team.name}</Text>
                    <Text style={styles.teamLead}>
                      {team.lead} • {team.members} members
                    </Text>
                  </View>
                  <Text style={styles.teamPercent}>{team.completion}%</Text>
                </View>
                <ProgressBar
                  progress={team.completion / 100}
                  color="#0d9488"
                  style={{ height: 6, borderRadius: 4 }}
                />
              </View>
            ))}
          </View>

          {/* 👤 Account & Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account & Settings</Text>
            <View style={styles.accountGrid}>
              <TouchableOpacity
                style={styles.accountButton}
                onPress={() => navigation.navigate("Profile" as never)}
              >
                <Ionicons name="person-outline" size={24} color="#0d9488" />
                <Text style={styles.accountText}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.accountButton}
                onPress={() => navigation.navigate("Settings" as never)}
              >
                <Ionicons name="settings-outline" size={24} color="#0d9488" />
                <Text style={styles.accountText}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.accountButton}
                onPress={() => navigation.navigate("Reports" as never)}
              >
                <Ionicons name="document-text-outline" size={24} color="#0d9488" />
                <Text style={styles.accountText}>Reports</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.accountButton}
                onPress={logout}
              >
                <Ionicons name="log-out-outline" size={24} color="#0d9488" />
                <Text style={styles.accountText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ✅ Reusable StatCard Component
const StatCard = ({ title, value, icon, subtitle, colors, progress, onPress }: any) => (
  <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.statCardWrapper}>
    <LinearGradient colors={colors} style={styles.statCard}>
      <View style={styles.statHeader}>
        <Text style={styles.statTitle}>{title}</Text>
        <View style={styles.statIcon}>{icon}</View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      {progress !== undefined && (
        <ProgressBar
          progress={progress}
          color="#fff"
          style={styles.statProgress}
        />
      )}
    </LinearGradient>
  </TouchableOpacity>
);

// 🎨 Styles
const styles = StyleSheet.create({
  safeAreaContainer: { flex: 1, backgroundColor: '#39549fff' },
  container: { flex: 1, backgroundColor: '#39549fff' },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerGradient: {
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    backgroundColor: '#39549fff',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  onlineStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#0d9488',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSubtitle: { color: '#d1fae5', fontSize: 13, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  headerWelcomeSection: {
    marginTop: 16,
  },
  welcomeText: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  headerSubtitle2: { color: '#e0f2fe', fontSize: 14, fontWeight: '500', marginTop: 4 },
  headerActionRow: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 12,
  },
  headerActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionText: { marginLeft: 8, fontWeight: '600', color: '#0f172a' },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -12,
    paddingTop: 32,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 5,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 6,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dropdownAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dropdownAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  dropdownUserInfo: { flex: 1 },
  dropdownUserName: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  dropdownUserEmail: { fontSize: 13, color: '#475569', marginBottom: 8 },
  dropdownRoleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  dropdownRoleBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  dropdownDivider: { height: 1, backgroundColor: '#e2e8f0', marginHorizontal: 16 },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dropdownItemText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
    paddingHorizontal: 16,
  },
  statCardWrapper: {
    width: '48%',
    minWidth: 160,
  },
  statCard: {
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 18,
    minHeight: 150,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statTitle: { color: "#fff", fontSize: 12, opacity: 0.9 },
  statIcon: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 50,
  },
  statValue: { color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 6 },
  statSubtitle: { color: "#e0f2fe", fontSize: 12, marginTop: 4 },
  statProgress: { height: 4, marginTop: 6, backgroundColor: "rgba(255,255,255,0.3)" },
  section: { margin: 12, backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 10, color: "#111827" },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  activityIconBox: {
    height: 40,
    width: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  activityUser: { fontWeight: "600", fontSize: 13 },
  activityText: { color: "#6b7280", fontSize: 11 },
  activityTime: { fontSize: 10, color: "#6b7280" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  badgeText: { fontSize: 10, color: "#fff", textTransform: "capitalize" },
  badgeSuccess: { backgroundColor: "#10b981" },
  badgeWarning: { backgroundColor: "#f59e0b" },
  badgeOutline: { backgroundColor: "#9ca3af" },
  teamCard: { marginBottom: 10 },
  teamRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teamName: { fontSize: 14, fontWeight: "600" },
  teamLead: { color: "#6b7280", fontSize: 11 },
  teamPercent: { fontWeight: "700", fontSize: 13 },
  accountGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 10,
  },
  accountButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5",
    paddingVertical: 14,
    borderRadius: 10,
  },
  accountText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#0d9488",
  },
});
