import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar, setStatusBarBackgroundColor, setStatusBarStyle } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Avatar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { API_CONFIG } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import { getMonthYearIST } from "../../utils/dateTime";

const { width, height } = Dimensions.get("window");

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  department?: string;
  designation?: string;
  joiningDate?: string;
  role: "admin" | "hr" | "manager" | "team_lead" | "employee";
  profilePhoto?: string;
  employee_id?: string;
  gender?: string;
  employee_type?: string;
  shift_type?: string;
  status?: string;
}

export default function Profile() {
  const navigation = useNavigation();
  const { user: authUser, logout } = useAuth();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();

  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.8)).current;
  const cardAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    // Staggered card animations
    cardAnims.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: 400 + index * 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }).start();
    });
  }, []);

  const getProfilePhotoUrl = (photoPath?: string) => {
    if (!photoPath) return null;
    if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) return photoPath;
    const cleanPath = photoPath.startsWith("/") ? photoPath.substring(1) : photoPath;
    return `${API_CONFIG.getApiBaseUrl()}/${cleanPath}`;
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        if (!authUser) {
          Alert.alert("Error", "No user logged in");
          return;
        }
        const profileData = await apiService.getCurrentUserProfile();
        const userProfile: User = {
          id: profileData.id || authUser.id,
          name: profileData.name || authUser.name,
          email: profileData.email || authUser.email,
          phone: profileData.phone,
          address: profileData.address,
          department: profileData.department || authUser.department,
          designation: profileData.designation || authUser.designation,
          joiningDate: profileData.created_at || authUser.joiningDate,
          role: (profileData.role?.toLowerCase() || authUser.role) as any,
          profilePhoto: profileData.profile_photo,
          employee_id: profileData.employee_id,
          gender: profileData.gender,
          employee_type: profileData.employee_type,
          shift_type: profileData.shift_type,
          status: profileData.status || "active",
        };
        setUser(userProfile);
      } catch (error: any) {
        if (authUser) {
          const fallbackUser: User = {
            id: authUser.id,
            name: authUser.name,
            email: authUser.email,
            department: authUser.department,
            designation: authUser.designation,
            joiningDate: authUser.joiningDate,
            role: authUser.role,
          };
          setUser(fallbackUser);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserProfile();
  }, [authUser]);

  const getRoleGradient = (role: string): [string, string, string] => {
    switch (role) {
      case "admin": return ["#8b5cf6", "#7c3aed", "#6d28d9"];
      case "hr": return ["#3b82f6", "#2563eb", "#1d4ed8"];
      case "manager": return ["#10b981", "#059669", "#047857"];
      case "team_lead": return ["#f59e0b", "#d97706", "#b45309"];
      default: return ["#6366f1", "#4f46e5", "#4338ca"];
    }
  };

  const getRoleStatusBarColor = (role: string): string => {
    switch (role) {
      case "admin": return "#8b5cf6";
      case "hr": return "#3b82f6";
      case "manager": return "#10b981";
      case "team_lead": return "#f59e0b";
      default: return "#6366f1";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return "shield-checkmark";
      case "hr": return "people";
      case "manager": return "briefcase";
      case "team_lead": return "flag";
      default: return "person";
    }
  };

  useEffect(() => {
    if (user) {
      const statusBarColor = getRoleStatusBarColor(user.role);
      if (Platform.OS === "android") {
        setStatusBarBackgroundColor(statusBarColor, true);
      }
      setStatusBarStyle("light");
    }
  }, [user]);

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Denied", "Camera permission is required to take a photo");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const uploadProfilePhoto = async (photoUri: string) => {
    if (!user) return;

    try {
      setIsUploadingPhoto(true);
      
      const filename = photoUri.split("/").pop() || "profile.jpg";
      const response = await apiService.updateUserProfile(user.id, {
        profile_photo: {
          uri: photoUri,
          type: "image/jpeg",
          name: filename,
        } as any,
      });

      if (response.profile_photo) {
        setUser({
          ...user,
          profilePhoto: response.profile_photo,
        });
        setPhotoLoadError(false);
        Alert.alert("Success", "Profile photo updated successfully");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to upload photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert("Remove Photo", "Are you sure you want to remove your profile photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            setIsUploadingPhoto(true);
            await apiService.removeProfilePhoto();
            setUser({
              ...user!,
              profilePhoto: undefined,
            });
            setPhotoLoadError(false);
            Alert.alert("Success", "Profile photo removed successfully");
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to remove photo");
          } finally {
            setIsUploadingPhoto(false);
          }
        },
      },
    ]);
  };

  const handlePhotoOptions = () => {
    const options = ["Take Photo", "Choose from Library"];
    if (user?.profilePhoto) {
      options.push("Remove Photo");
    }
    options.push("Cancel");

    Alert.alert("Profile Photo", "Choose an option", [
      {
        text: "Take Photo",
        onPress: handleTakePhoto,
      },
      {
        text: "Choose from Library",
        onPress: handlePickPhoto,
      },
      ...(user?.profilePhoto
        ? [
            {
              text: "Remove Photo",
              onPress: handleRemovePhoto,
              style: "destructive" as const,
            },
          ]
        : []),
      {
        text: "Cancel",
        style: "cancel" as const,
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  if (isLoading || !user) {
    return (
      <View style={styles.loaderContainer}>
        <LinearGradient colors={["#6366f1", "#8b5cf6", "#a855f7"]} style={styles.loaderGradient}>
          <View style={styles.loaderContent}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loaderText}>Loading profile...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const statusBarColor = getRoleStatusBarColor(user.role);
  const photoUrl = getProfilePhotoUrl(user.profilePhoto);

  // Info card component
  const InfoCard = ({ 
    title, 
    icon, 
    iconBg, 
    iconColor, 
    items, 
    animIndex 
  }: { 
    title: string; 
    icon: string; 
    iconBg: string; 
    iconColor: string; 
    items: { label: string; value: string; icon: string }[];
    animIndex: number;
  }) => {
    const animValue = cardAnims[animIndex];
    return (
      <Animated.View
        style={[
          styles.card,
          {
            opacity: animValue,
            transform: [
              { translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
              { scale: animValue.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
            ],
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
            <Ionicons name={icon as any} size={20} color={iconColor} />
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {items.map((item, index) => (
          <View key={item.label} style={[styles.infoRow, index !== 0 && styles.infoRowBorder]}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name={item.icon as any} size={16} color="#9ca3af" />
              </View>
              <Text style={styles.infoLabel}>{item.label}</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={1}>{item.value || "Not set"}</Text>
          </View>
        ))}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: statusBarColor }]} edges={["top"]}>
      <StatusBar style="light" backgroundColor={statusBarColor} translucent={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarVisible ? tabBarHeight + 24 : 24 }]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={getRoleGradient(user.role)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Decorative Elements */}
          <View style={styles.headerDecor}>
            <View style={[styles.decorCircle, styles.decorCircle1]} />
            <View style={[styles.decorCircle, styles.decorCircle2]} />
            <View style={[styles.decorCircle, styles.decorCircle3]} />
          </View>

          <Animated.View
            style={[
              styles.headerContent,
              {
                opacity: headerAnim,
                transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
              },
            ]}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>My Profile</Text>
              <View style={styles.backBtn} />
            </View>

            {/* Avatar Section */}
            <Animated.View style={[styles.avatarSection, { transform: [{ scale: avatarScale }] }]}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarRing}>
                  {photoUrl && !photoLoadError ? (
                    <Avatar.Image 
                      size={110} 
                      source={{ uri: photoUrl }} 
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={50} color="#fff" />
                    </View>
                  )}
                  {/* Status indicator */}
                  <View style={styles.statusIndicator}>
                    <View style={styles.statusDot} />
                  </View>
                </View>

                {/* Edit Photo Button */}
                <TouchableOpacity
                  style={styles.editPhotoBtn}
                  onPress={handlePhotoOptions}
                  disabled={isUploadingPhoto}
                  activeOpacity={0.7}
                >
                  {isUploadingPhoto ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userDesignation}>{user.designation || "Employee"}</Text>

              {/* Role Badge */}
              <View style={styles.roleBadge}>
                <Ionicons name={getRoleIcon(user.role) as any} size={14} color="#fff" />
                <Text style={styles.roleBadgeText}>{user.role.toUpperCase().replace("_", " ")}</Text>
              </View>
            </Animated.View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <View style={styles.statIconWrapper}>
                  <Ionicons name="card-outline" size={18} color="#fff" />
                </View>
                <Text style={styles.statValue}>{user.employee_id || "N/A"}</Text>
                <Text style={styles.statLabel}>Employee ID</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.statIconWrapper}>
                  <Ionicons name="business-outline" size={18} color="#fff" />
                </View>
                <Text style={styles.statValue}>{user.department || "N/A"}</Text>
                <Text style={styles.statLabel}>Department</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.statIconWrapper}>
                  <Ionicons name="calendar-outline" size={18} color="#fff" />
                </View>
                <Text style={styles.statValue}>{user.joiningDate ? getMonthYearIST(user.joiningDate) : "N/A"}</Text>
                <Text style={styles.statLabel}>Joined</Text>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Content */}
        <View style={styles.contentSection}>
          {/* Personal Info Card */}
          <InfoCard
            title="Personal Information"
            icon="person-outline"
            iconBg="#ede9fe"
            iconColor="#8b5cf6"
            animIndex={0}
            items={[
              { label: "Full Name", value: user.name, icon: "person-outline" },
              { label: "Email", value: user.email, icon: "mail-outline" },
              { label: "Phone", value: user.phone || "", icon: "call-outline" },
              { label: "Gender", value: user.gender || "", icon: "male-female-outline" },
              { label: "Address", value: user.address || "", icon: "location-outline" },
            ]}
          />

          {/* Work Info Card */}
          <InfoCard
            title="Work Information"
            icon="briefcase-outline"
            iconBg="#dbeafe"
            iconColor="#3b82f6"
            animIndex={1}
            items={[
              { label: "Department", value: user.department || "", icon: "business-outline" },
              { label: "Designation", value: user.designation || "", icon: "ribbon-outline" },
              { label: "Employee Type", value: user.employee_type || "", icon: "people-outline" },
              { label: "Shift Type", value: user.shift_type || "", icon: "time-outline" },
              { label: "Role", value: user.role?.toUpperCase().replace("_", " ") || "", icon: "shield-outline" },
            ]}
          />

          {/* Sign Out Button */}
          <Animated.View
            style={{
              opacity: cardAnims[2],
              transform: [{ translateY: cardAnims[2].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
            }}
          >
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <LinearGradient
                colors={["#fef2f2", "#fee2e2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.logoutBtnGradient}
              >
                <View style={styles.logoutIconWrapper}>
                  <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                </View>
                <Text style={styles.logoutBtnText}>Sign Out</Text>
                <Ionicons name="chevron-forward" size={20} color="#ef4444" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
  },
  loaderGradient: {
    flex: 1,
  },
  loaderContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header
  headerGradient: {
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: "relative",
    overflow: "hidden",
  },
  headerDecor: {
    ...StyleSheet.absoluteFillObject,
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  decorCircle1: {
    width: 200,
    height: 200,
    top: -80,
    right: -60,
  },
  decorCircle2: {
    width: 150,
    height: 150,
    bottom: -40,
    left: -50,
  },
  decorCircle3: {
    width: 80,
    height: 80,
    top: 60,
    left: 20,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },

  // Avatar
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    position: "relative",
  },
  avatar: {
    backgroundColor: "transparent",
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10b981",
  },
  editPhotoBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  userName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  userDesignation: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },

  // Quick Stats
  quickStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 4,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 8,
  },

  // Content
  contentSection: {
    padding: 16,
    paddingTop: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#1f2937",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    maxWidth: "45%",
    textAlign: "right",
  },

  // Logout
  logoutBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
  },
  logoutBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  logoutIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#ef4444",
  },
});
