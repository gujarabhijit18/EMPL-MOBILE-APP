import { Ionicons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import type { TabParamList } from "../../navigation/TabNavigator";
import { apiService } from "../../lib/api";

const { width } = Dimensions.get("window");

interface TeamMember {
  id: number;
  name: string;
  task: string;
  progress: number;
  status: "present" | "on-leave";
  department?: string;
  email?: string;
}

type TeamLeadNavigationParam = BottomTabNavigationProp<TabParamList>;

const TeamMembersList = () => {
  const navigation = useNavigation<TeamLeadNavigationParam>();
  const { user } = useAuth();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "present" | "on-leave">("all");

  const headerAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [searchQuery, filterStatus, members]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const userDepartment = user?.department;

      if (!userDepartment) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const allEmployees = await apiService.getEmployees();
      const departmentEmployees = allEmployees.filter((emp: any) => {
        const role = emp.role?.toLowerCase() || "";
        const isEmployee =
          role === "employee" ||
          role === "user" ||
          (!role.includes("admin") &&
            !role.includes("hr") &&
            !role.includes("manager") &&
            !role.includes("team_lead"));
        const sameDepartment = emp.department === userDepartment;
        return isEmployee && sameDepartment;
      });

      let employeeLeaves: any[] = [];
      try {
        const teamLeavesResponse = await apiService.getTeamLeaves();
        employeeLeaves = teamLeavesResponse.leaves.filter((leave: any) => {
          const employee = departmentEmployees.find((emp: any) => emp.employee_id === leave.employee_id);
          return employee !== undefined;
        });
      } catch (leaveError) {
        console.warn("Leave data not available:", leaveError);
      }

      const teamMembers = departmentEmployees.map((emp: any, index: number) => {
        const isOnLeave = employeeLeaves.some((leave: any) => {
          if (leave.employee_id !== emp.employee_id) return false;
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          const now = new Date();
          return leave.status === "Approved" && startDate <= now && endDate >= now;
        });

        return {
          id: emp.id || emp.user_id || index,
          name: emp.name || `Employee ${index + 1}`,
          task: emp.designation || emp.job_title || "Team Member",
          progress: isOnLeave ? 0 : Math.floor(Math.random() * 40) + 60,
          status: (isOnLeave ? "on-leave" : "present") as "present" | "on-leave",
          department: emp.department,
          email: emp.email,
        };
      });

      setMembers(teamMembers);
      startAnimations();
    } catch (err) {
      console.error("Error fetching team members:", err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = members;

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.task.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((member) => member.status === filterStatus);
    }

    setFilteredMembers(filtered);
  };

  const startAnimations = () => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.spring(listAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase() || "TM";
  };

  const renderMemberCard = ({ item }: { item: TeamMember; index: number }) => (
    <Animated.View
      style={[
        styles.memberCardContainer,
        {
          opacity: listAnim,
          transform: [
            {
              translateY: listAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.memberCardContent}>
        <View style={styles.memberCardLeft}>
          <View style={styles.memberAvatarLarge}>
            <Text style={styles.memberAvatarTextLarge}>{getInitials(item.name)}</Text>
            <View
              style={[
                styles.memberStatusDotLarge,
                { backgroundColor: item.status === "present" ? "#10b981" : "#f59e0b" },
              ]}
            />
          </View>

          <View style={styles.memberDetailsContainer}>
            <Text style={styles.memberNameLarge}>{item.name}</Text>
            <Text style={styles.memberDesignation}>{item.task}</Text>
            {item.email && <Text style={styles.memberEmail}>{item.email}</Text>}

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${item.progress}%`,
                      backgroundColor:
                        item.progress >= 80
                          ? "#10b981"
                          : item.progress >= 60
                            ? "#3b82f6"
                            : "#f59e0b",
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{item.progress}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.memberCardRight}>
          <View
            style={[
              styles.statusBadgeLarge,
              { backgroundColor: item.status === "present" ? "#d1fae5" : "#fed7aa" },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.status === "present" ? "#10b981" : "#f59e0b" },
              ]}
            />
            <Text
              style={[
                styles.statusTextLarge,
                { color: item.status === "present" ? "#059669" : "#d97706" },
              ]}
            >
              {item.status === "present" ? "Active" : "Leave"}
            </Text>
          </View>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="ellipsis-vertical" size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#8b5cf6" }]} edges={["top"]}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={["#8b5cf6", "#7c3aed"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerPattern}>
          <View style={[styles.patternCircle, { top: -20, right: -20, width: 120, height: 120 }]} />
          <View style={[styles.patternCircle, { bottom: -30, left: -30, width: 150, height: 150 }]} />
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
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerLeft}>
              <View style={styles.iconBadge}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]}
                  style={styles.iconBadgeGradient}
                >
                  <Ionicons name="people" size={24} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.headerTextSection}>
                <Text style={styles.headerTitle}>Team Members</Text>
                <Text style={styles.headerSubtitle}>{members.length} members in your team</Text>
              </View>
            </View>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statValue}>{members.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statValue}>{members.filter((m) => m.status === "present").length}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statValue}>{members.filter((m) => m.status === "on-leave").length}</Text>
              <Text style={styles.statLabel}>On Leave</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Search & Filter */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or role..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterButtons}>
          {(["all", "present", "on-leave"] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                filterStatus === status && styles.filterButtonActive,
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterStatus === status && styles.filterButtonTextActive,
                ]}
              >
                {status === "all" ? "All" : status === "present" ? "Active" : "On Leave"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Members List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading team members...</Text>
        </View>
      ) : filteredMembers.length > 0 ? (
        <FlatList
          data={filteredMembers}
          renderItem={renderMemberCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarVisible ? tabBarHeight + 24 : 24 },
          ]}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="search-outline" size={56} color="#d1d5db" />
          <Text style={styles.emptyStateTitle}>No members found</Text>
          <Text style={styles.emptyStateText}>
            {searchQuery ? "Try adjusting your search" : "No team members available"}
          </Text>
          {searchQuery && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery("");
                setFilterStatus("all");
              }}
            >
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

export default TeamMembersList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: "relative",
    overflow: "hidden",
  },
  headerPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  headerContent: {
    paddingHorizontal: 20,
    position: "relative",
    zIndex: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTopSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconBadge: {
    marginRight: 12,
  },
  iconBadgeGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerTextSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    fontWeight: "500",
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 12,
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    marginTop: 4,
  },
  statLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  searchFilterContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterButtonActive: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  listContent: {
    padding: 16,
  },
  memberCardContainer: {
    marginBottom: 12,
  },
  memberCardContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  memberCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  memberAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#e0e7ff",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  memberAvatarTextLarge: {
    fontSize: 16,
    fontWeight: "800",
    color: "#5b21b6",
  },
  memberStatusDotLarge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "#fff",
  },
  memberDetailsContainer: {
    flex: 1,
  },
  memberNameLarge: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 2,
  },
  memberDesignation: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "400",
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    minWidth: 28,
  },
  memberCardRight: {
    alignItems: "center",
    gap: 12,
  },
  statusBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTextLarge: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    fontWeight: "500",
  },
  clearButton: {
    marginTop: 20,
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },
});
