import { Ionicons } from "@expo/vector-icons"; // Expo-safe icon import
import { useNavigation } from "@react-navigation/native"; // Import useNavigation
import { format } from "date-fns";
import * as ImagePicker from "expo-image-picker"; // Expo-safe image picker
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { ActivityIndicator, Avatar, Button, Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_CONFIG } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";

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
  
  // Tab bar visibility with auto-hide on scroll
  const { onScroll, scrollEventThrottle, tabBarHeight } = useAutoHideTabBarOnScroll({
    threshold: 16,
    overscrollMargin: 50,
  });
  
  // Animation values for header elements
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  
  // Animate header elements on component mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
    ]).start();
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Helper function to get full profile photo URL
  const getProfilePhotoUrl = (photoPath?: string) => {
    if (!photoPath) {
      console.log("📸 No profile photo path provided");
      return null;
    }
    
    // If it's already a full URL, return as is
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      console.log(`📸 Profile Photo URL (absolute): ${photoPath}`);
      return photoPath;
    }
    
    // Remove leading slash if present to avoid double slashes
    const cleanPath = photoPath.startsWith('/') ? photoPath.substring(1) : photoPath;
    
    // Construct full URL from backend
    const fullUrl = `${API_CONFIG.getApiBaseUrl()}/${cleanPath}`;
    console.log(`📸 Profile Photo URL (constructed): ${fullUrl}`);
    console.log(`   - Base URL: ${API_CONFIG.getApiBaseUrl()}`);
    console.log(`   - Photo Path: ${photoPath}`);
    console.log(`   - Clean Path: ${cleanPath}`);
    return fullUrl;
  };

  // Fetch user profile from backend
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        
        if (!authUser) {
          Alert.alert("Error", "No user logged in");
          return;
        }

        // Fetch full profile from backend
        const profileData = await apiService.getCurrentUserProfile();
        
        console.log("📦 Backend Profile Data:", {
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          address: profileData.address,
          department: profileData.department,
          designation: profileData.designation,
          profile_photo: profileData.profile_photo,
          employee_id: profileData.employee_id,
          role: profileData.role,
        });
        
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
          profilePhoto: profileData.profile_photo, // ✅ Fixed: use profile_photo from backend
          employee_id: profileData.employee_id,
          gender: profileData.gender,
          employee_type: profileData.employee_type,
          shift_type: profileData.shift_type,
          status: profileData.status || "active",
        };
        
        setUser(userProfile);
        setEditedUser(userProfile);
        console.log("✅ Profile loaded and set:", {
          name: userProfile.name,
          email: userProfile.email,
          phone: userProfile.phone,
          address: userProfile.address,
          role: userProfile.role,
          department: userProfile.department,
          designation: userProfile.designation,
          profilePhoto: userProfile.profilePhoto,
          fullPhotoUrl: getProfilePhotoUrl(userProfile.profilePhoto),
        });
      } catch (error: any) {
        console.error("❌ Error fetching profile:", error);
        
        // Fallback to auth context data if API fails
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
          setEditedUser(fallbackUser);
        }
        
        Alert.alert("Notice", "Using cached profile data. Some information may be outdated.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [authUser]);

  // Open Image Picker (Expo)
  const pickImage = async () => {
    // Ask permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.status !== "granted") {
      Alert.alert("Permission required", "Please allow photo access to upload profile pictures.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Save profile changes
  const handleSave = async () => {
    if (!editedUser || !user) return;
    
    try {
      setIsLoading(true);
      
      // Prepare update data
      const updateData = {
        name: editedUser.name,
        email: editedUser.email,
        phone: editedUser.phone,
        address: editedUser.address,
        department: editedUser.department,
        designation: editedUser.designation,
        employee_id: editedUser.employee_id || user.employee_id,
      };
      
      // Update profile via API
      const updatedProfile = await apiService.updateUserProfile(user.id, updateData);
      
      const updatedUser: User = {
        ...user,
        ...editedUser,
        profilePhoto: selectedImage || user.profilePhoto,
      };
      
      setUser(updatedUser);
      setIsEditing(false);
      setSelectedImage(null);
      
      Alert.alert("✅ Success", "Profile updated successfully!");
      console.log("✅ Profile updated:", updatedProfile);
    } catch (error: any) {
      console.error("❌ Error updating profile:", error);
      Alert.alert("Error", error.message || "Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedUser(user);
    setSelectedImage(null);
    setIsEditing(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "#8B5CF6";
      case "hr":
        return "#3B82F6";
      case "manager":
        return "#22C55E";
      case "team_lead":
        return "#F97316";
      default:
        return "#6B7280";
    }
  };

  // Role-based stats display
  const getRoleBasedStats = () => {
    if (!user) return [];
    
    const baseStats = [
      { label: "Employee ID", value: user.employee_id || "N/A", icon: "card-outline", color: "#3B82F6" },
      { label: "Status", value: user.status === "active" ? "Active" : "Inactive", icon: "checkmark-circle-outline", color: "#22C55E" },
    ];

    switch (user.role) {
      case "admin":
        return [
          ...baseStats,
          { label: "Access Level", value: "Full", icon: "shield-checkmark-outline", color: "#8B5CF6" },
          { label: "Type", value: user.employee_type || "N/A", icon: "briefcase-outline", color: "#F97316" },
        ];
      case "hr":
        return [
          ...baseStats,
          { label: "Access Level", value: "HR", icon: "people-outline", color: "#3B82F6" },
          { label: "Type", value: user.employee_type || "N/A", icon: "briefcase-outline", color: "#F97316" },
        ];
      case "manager":
        return [
          ...baseStats,
          { label: "Access Level", value: "Manager", icon: "business-outline", color: "#22C55E" },
          { label: "Type", value: user.employee_type || "N/A", icon: "briefcase-outline", color: "#F97316" },
        ];
      case "team_lead":
        return [
          ...baseStats,
          { label: "Access Level", value: "Team Lead", icon: "people-circle-outline", color: "#F97316" },
          { label: "Type", value: user.employee_type || "N/A", icon: "briefcase-outline", color: "#F97316" },
        ];
      default:
        return [
          ...baseStats,
          { label: "Shift", value: user.shift_type || "N/A", icon: "time-outline", color: "#8B5CF6" },
          { label: "Type", value: user.employee_type || "N/A", icon: "briefcase-outline", color: "#F97316" },
        ];
    }
  };

  const stats = getRoleBasedStats();

  if (isLoading || !user) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
      <StatusBar style="light" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Animated.View 
            style={[
              styles.headerTextContainer,
              { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }
            ]}
          >
            <Text style={styles.headerTitle}>My Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your personal information</Text>
          </Animated.View>
          
          <TouchableOpacity style={styles.headerIconButton}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <Card style={styles.statsCard}>
            <Ionicons name="person" size={20} color="#3b82f6" style={styles.statsIcon} />
            <Text style={styles.cardLabel}>Role</Text>
            <Text style={styles.cardValue}>{user.role.toUpperCase()}</Text>
          </Card>
          <Card style={styles.statsCard}>
            <Ionicons name="business" size={20} color="#10b981" style={styles.statsIcon} />
            <Text style={styles.cardLabel}>Department</Text>
            <Text style={styles.cardValue}>{user.department}</Text>
          </Card>
          <Card style={styles.statsCard}>
            <Ionicons name="calendar" size={20} color="#f59e0b" style={styles.statsIcon} />
            <Text style={styles.cardLabel}>Joined</Text>
            <Text style={styles.cardValue}>{format(new Date(user.joiningDate || ""), "MMM yyyy")}</Text>
          </Card>
        </View>
      </View>
      
      <ScrollView 
        style={[styles.contentContainer, { paddingBottom: tabBarHeight + 16 }]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >
          {/* Profile Header */}
          <Card style={styles.profileCard}>
            <View style={styles.cover} />
            <View style={styles.profileContent}>
              <View style={styles.avatarContainer}>
                {(() => {
                  const photoUrl = selectedImage || getProfilePhotoUrl(user.profilePhoto);
                  
                  if (photoUrl && !photoLoadError) {
                    console.log(`🖼️ Rendering Avatar with URL: ${photoUrl}`);
                    return (
                      <Avatar.Image
                        size={100}
                        source={{ uri: photoUrl }}
                        onError={(error) => {
                          console.log("❌ Error loading profile photo:", error);
                          console.log("   - Attempted URL:", photoUrl);
                          setPhotoLoadError(true);
                        }}
                      />
                    );
                  } else {
                    console.log(`👤 Rendering fallback Avatar icon (photoLoadError: ${photoLoadError})`);
                    return (
                      <Avatar.Icon
                        size={100}
                        icon="account"
                        style={{ backgroundColor: getRoleColor(user.role) }}
                      />
                    );
                  }
                })()}
                {isEditing && (
                  <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
                    <Ionicons name="camera" color="#fff" size={18} />
                  </TouchableOpacity>
                )}
                {photoLoadError && user.profilePhoto && (
                  <TouchableOpacity 
                    style={styles.retryBtn} 
                    onPress={() => {
                      console.log("🔄 Retrying photo load...");
                      setPhotoLoadError(false);
                    }}
                  >
                    <Ionicons name="refresh" color="#fff" size={16} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.infoContainer}>
                <Text style={styles.name}>{user.name}</Text>
                <View
                  style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}
                >
                  <Ionicons name="shield-outline" size={14} color="#fff" />
                  <Text style={styles.roleText}> {user.role.toUpperCase()}</Text>
                </View>
                <Text style={styles.designation}>{user.designation}</Text>
                <Text style={styles.detailText}>
                  {user.department} • Joined{" "}
                  {format(new Date(user.joiningDate || ""), "MMM dd, yyyy")}
                </Text>
                <View style={styles.contactInfo}>
                  <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={14} color="#6B7280" />
                    <Text style={styles.detailText}> {user.email}</Text>
                  </View>
                  {user.phone && (
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={14} color="#6B7280" />
                      <Text style={styles.detailText}> {user.phone}</Text>
                    </View>
                  )}
                  {user.address && (
                    <View style={styles.contactRow}>
                      <Ionicons name="location-outline" size={14} color="#6B7280" />
                      <Text style={styles.detailText}> {user.address}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.editButtons}>
                {!isEditing ? (
                  <Button mode="contained" onPress={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Button mode="contained" onPress={handleSave}>
                      Save
                    </Button>
                    <Button mode="outlined" onPress={handleCancel}>
                      Cancel
                    </Button>
                  </View>
                )}
              </View>
            </View>
          </Card>

          {/* Debug Info Card (Development Only) */}
          {user.profilePhoto && (
            <Card style={styles.debugCard}>
              <Card.Content>
                <TouchableOpacity 
                  onPress={() => setShowDebugInfo(!showDebugInfo)}
                  style={styles.debugHeader}
                >
                  <Ionicons name="bug-outline" size={16} color="#6B7280" />
                  <Text style={styles.debugTitle}>Photo Debug Info</Text>
                  <Ionicons 
                    name={showDebugInfo ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#6B7280" 
                  />
                </TouchableOpacity>
                {showDebugInfo && (
                  <View style={styles.debugContent}>
                    <Text style={styles.debugLabel}>Backend Path:</Text>
                    <Text style={styles.debugValue}>{user.profilePhoto}</Text>
                    <Text style={styles.debugLabel}>Full URL:</Text>
                    <Text style={styles.debugValue}>{getProfilePhotoUrl(user.profilePhoto)}</Text>
                    <Text style={styles.debugLabel}>Load Status:</Text>
                    <Text style={[styles.debugValue, { color: photoLoadError ? "#EF4444" : "#10B981" }]}>
                      {photoLoadError ? "❌ Failed" : "✅ OK"}
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          )}

          {/* Stats */}
          <View style={styles.statsGrid}>
            {stats.map((stat) => (
              <Card key={stat.label} style={styles.statCard}>
                <Card.Content style={styles.statContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <Text style={styles.statValue}>{stat.value}</Text>
                  </View>
                  <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                    <Ionicons name={stat.icon as any} size={20} color="#fff" />
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>

          {/* Personal Info */}
          <Card style={styles.sectionCard}>
            <Card.Title title="Personal Information" />
            <Card.Content>
              {[
                { label: "Full Name", key: "name" },
                { label: "Email", key: "email" },
                { label: "Phone", key: "phone" },
                { label: "Address", key: "address" },
                { label: "Gender", key: "gender" },
              ].map((f) => (
                <View key={f.key} style={styles.inputGroup}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    value={(editedUser as any)?.[f.key] || ""}
                    onChangeText={(text) =>
                      setEditedUser({ ...editedUser!, [f.key]: text })
                    }
                    editable={isEditing && f.key !== "email"}
                    style={[styles.input, f.key === "email" && styles.inputDisabled]}
                  />
                </View>
              ))}
            </Card.Content>
          </Card>

          {/* Professional Info */}
          <Card style={styles.sectionCard}>
            <Card.Title title="Professional Information" />
            <Card.Content>
              {[
                { label: "Employee ID", key: "employee_id", editable: false },
                { label: "Department", key: "department" },
                { label: "Designation", key: "designation" },
                { label: "Employee Type", key: "employee_type", editable: false },
                { label: "Shift Type", key: "shift_type", editable: false },
                { label: "Role", key: "role", editable: false },
              ].map((f) => (
                <View key={f.key} style={styles.inputGroup}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    value={String((editedUser as any)?.[f.key] || "").toUpperCase()}
                    onChangeText={(text) =>
                      setEditedUser({ ...editedUser!, [f.key]: text })
                    }
                    editable={isEditing && f.editable !== false}
                    style={[styles.input, f.editable === false && styles.inputDisabled]}
                  />
                </View>
              ))}
            </Card.Content>
          </Card>

          {/* Settings */}
          <Card style={styles.settingsCard}>
            <Card.Title title="Settings" />
            <Card.Content>
              <TouchableOpacity style={styles.settingRow}>
                <Ionicons name="notifications-outline" size={22} />
                <Text style={styles.settingText}>Notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingRow}>
                <Ionicons name="lock-closed-outline" size={22} />
                <Text style={styles.settingText}>Security</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingRow} onPress={logout}>
                <Ionicons name="log-out-outline" size={22} />
                <Text style={styles.settingText}>Logout</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#39549fff",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  header: {
    backgroundColor: "#39549fff",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 30,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#a5b4fc",
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 10,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsIcon: {
    marginBottom: 6,
  },
  cardLabel: { 
    fontSize: 12, 
    color: "#6b7280",
    marginBottom: 4,
  },
  cardValue: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#111827" 
  },
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 12 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  profileCard: { borderRadius: 16, overflow: "hidden", marginBottom: 16, marginTop: 0 },
  cover: { height: 100, backgroundColor: "#2563EB" },
  profileContent: { alignItems: "center", padding: 16 },
  avatarContainer: { position: "relative", marginTop: -50 },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2563EB",
    padding: 6,
    borderRadius: 20,
  },
  retryBtn: {
    position: "absolute",
    bottom: 0,
    left: 0,
    backgroundColor: "#F97316",
    padding: 6,
    borderRadius: 20,
  },
  infoContainer: { alignItems: "center", marginTop: 8 },
  name: { fontSize: 22, fontWeight: "700" },
  designation: { color: "#6B7280", fontSize: 14 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  roleText: { color: "#fff", fontSize: 12 },
  detailText: { color: "#6B7280", fontSize: 12, marginLeft: 4 },
  contactInfo: {
    marginTop: 8,
    alignItems: "center",
    gap: 4,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    marginVertical: 2,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 8,
  },
  addressText: {
    color: "#6B7280",
    fontSize: 12,
    flex: 1,
    flexWrap: "wrap",
  },
  editButtons: { marginTop: 10 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statCard: { width: "48%", marginBottom: 10, borderRadius: 14 },
  statContent: { flexDirection: "row", alignItems: "center" },
  statLabel: { fontSize: 12, color: "#6B7280" },
  statValue: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCard: { marginBottom: 12, borderRadius: 16 },
  settingsCard: { marginBottom: 12, borderRadius: 16 },
  inputGroup: { marginBottom: 10 },
  label: { fontSize: 13, color: "#6B7280", marginBottom: 4 },
  input: {
    backgroundColor: "#fff",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  inputDisabled: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  settingText: { fontSize: 14, color: "#111827" },
  debugCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  debugHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  debugTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
  },
  debugContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#FCD34D",
  },
  debugLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    marginTop: 8,
  },
  debugValue: {
    fontSize: 11,
    color: "#78350F",
    marginTop: 2,
    fontFamily: "monospace",
  },
});
