import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar, setStatusBarBackgroundColor, setStatusBarStyle } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  ActionSheetIOS
} from "react-native";
import { Avatar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_CONFIG } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { apiService } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import { checkCameraPermission } from "../../utils/permissions";

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
  const { isDarkMode } = useTheme();

  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();

  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Status bar color will be set after user loads

  useEffect(() => {
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

    // Pulse animation for edit button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [photoLoadError, setPhotoLoadError] = useState(false);

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
        setOriginalUser(userProfile);
        setEditedUser(userProfile);
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
          setOriginalUser(fallbackUser);
          setEditedUser(fallbackUser);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserProfile();
  }, [authUser]);

  const pickImage = async () => {
    const takePhoto = async () => {
      const hasPermission = await checkCameraPermission();
      if (!hasPermission) {
        Alert.alert("Permission Required", "Camera permission is needed to take photos.");
        return;
      }
      try {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          // iOS specific: ensure we get a local copy
          exif: false,
        });
        if (!result.canceled && result.assets.length > 0) {
          // Use the URI directly - it's already in the correct format for both platforms
          setSelectedImage(result.assets[0].uri);
        }
      } catch (error) {
        console.error("Camera Error:", error);
        Alert.alert("Error", "Failed to open camera");
      }
    };

    const chooseFromGallery = async () => {
      try {
        // Request permission first (required for iOS 14+)
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Required", "Photo library permission is needed to select photos.");
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          // iOS specific: ensure we get a local copy
          exif: false,
        });
        if (!result.canceled && result.assets.length > 0) {
          setSelectedImage(result.assets[0].uri);
        }
      } catch (error) {
        console.error("Gallery Error:", error);
        Alert.alert("Error", "Failed to open gallery");
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Gallery"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) takePhoto();
          if (buttonIndex === 2) chooseFromGallery();
        }
      );
    } else {
      Alert.alert("Profile Photo", "Choose an option", [
        { text: "Take Photo", onPress: takePhoto },
        { text: "Choose from Gallery", onPress: chooseFromGallery },
        { text: "Cancel", style: "cancel" }
      ]);
    }
  };

  const handleSave = async () => {
    if (!editedUser || !user || !originalUser) return;

    // Build update data with only changed fields
    const updateData: Record<string, any> = {};
    const editableFields = ["name", "phone", "address", "department", "designation", "gender"];

    editableFields.forEach((field) => {
      const newValue = (editedUser as any)[field];
      const originalValue = (originalUser as any)[field];

      // Only include if value actually changed and is not empty
      if (newValue !== originalValue && newValue !== undefined && newValue !== null && newValue !== "") {
        updateData[field] = newValue;
      }
    });

    // Always include required fields from original data
    updateData.email = originalUser.email;
    updateData.employee_id = originalUser.employee_id;
    updateData.name = editedUser.name || originalUser.name;

    // Handle profile photo
    if (selectedImage) {
      updateData.profile_photo = selectedImage;
    }

    // Check if anything changed
    const hasChanges = Object.keys(updateData).some(
      (key) => !["email", "employee_id", "name"].includes(key) || updateData.name !== originalUser.name
    );

    if (!hasChanges && !selectedImage) {
      Alert.alert("No Changes", "No changes were made to your profile.");
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await apiService.updateUserProfile(user.id, updateData);

      const updatedUser: User = {
        ...originalUser,
        ...editedUser,
        profilePhoto: selectedImage || user.profilePhoto,
      };
      setUser(updatedUser);
      setOriginalUser(updatedUser);
      setIsEditing(false);
      setSelectedImage(null);
      Alert.alert("✅ Success", "Profile updated successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedUser(originalUser);
    setSelectedImage(null);
    setIsEditing(false);
  };

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

  // Set status bar color based on role
  useEffect(() => {
    if (user) {
      const statusBarColor = getRoleStatusBarColor(user.role);
      if (Platform.OS === "android") {
        setStatusBarBackgroundColor(statusBarColor, true);
      }
      setStatusBarStyle("light");
    }
  }, [user]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return "shield-checkmark";
      case "hr": return "people";
      case "manager": return "briefcase";
      case "team_lead": return "flag";
      default: return "person";
    }
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: statusBarColor }]} edges={["top"]}>
      <StatusBar style="light" backgroundColor={getRoleStatusBarColor(user.role)} translucent={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarVisible ? tabBarHeight + 24 : 24 }]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >
        {/* Large Modern Header */}
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
            <View style={[styles.decorLine, styles.decorLine1]} />
            <View style={[styles.decorLine, styles.decorLine2]} />
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
            {/* Top Actions */}
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>

              <Text style={styles.headerLabel}>Profile</Text>

              <Animated.View style={{ transform: [{ scale: isEditing ? 1 : pulseAnim }] }}>
                <TouchableOpacity
                  style={[styles.actionBtn, isEditing && styles.actionBtnActive]}
                  onPress={() => setIsEditing(!isEditing)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={isEditing ? "close" : "create-outline"} size={22} color="#fff" />
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Avatar Section */}
            <Animated.View style={[styles.avatarContainer, { transform: [{ scale: avatarScale }] }]}>
              <View style={styles.avatarRing}>
                <View style={styles.avatarInner}>
                  {(() => {
                    const photoUrl = selectedImage || getProfilePhotoUrl(user.profilePhoto);
                    if (photoUrl && !photoLoadError) {
                      return <Avatar.Image size={120} source={{ uri: photoUrl }} style={styles.avatar} />;
                    }
                    return (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={56} color="#fff" />
                      </View>
                    );
                  })()}
                </View>
                {isEditing && (
                  <TouchableOpacity style={styles.cameraBtn} onPress={pickImage} activeOpacity={0.8}>
                    <LinearGradient colors={["#10b981", "#059669"]} style={styles.cameraBtnGradient}>
                      <Ionicons name="camera" size={18} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

              {/* User Info */}
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userDesignation}>{user.designation || "Employee"}</Text>

              {/* Role Badge */}
              <View style={styles.roleBadge}>
                <Ionicons name={getRoleIcon(user.role) as any} size={14} color="#fff" />
                <Text style={styles.roleBadgeText}>{user.role.toUpperCase().replace("_", " ")}</Text>
              </View>

              {/* Quick Info Row */}
              <View style={styles.quickInfoRow}>
                <View style={styles.quickInfoItem}>
                  <Ionicons name="card-outline" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.quickInfoText}>{user.employee_id || "N/A"}</Text>
                </View>
                <View style={styles.quickInfoDivider} />
                <View style={styles.quickInfoItem}>
                  <Ionicons name="business-outline" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.quickInfoText}>{user.department || "N/A"}</Text>
                </View>
                <View style={styles.quickInfoDivider} />
                <View style={styles.quickInfoItem}>
                  <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.quickInfoText}>
                    {user.joiningDate ? format(new Date(user.joiningDate), "MMM yyyy") : "N/A"}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </Animated.View>
        </LinearGradient>

        {/* Content Section with Gradient Background */}
        <LinearGradient
          colors={["#f0f9ff", "#e0f2fe", "#f0fdf4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.contentBackground}
        >
          <Animated.View
            style={[
              styles.contentSection,
              {
                opacity: contentAnim,
                transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
              },
            ]}
          >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {/* Editable Personal Info */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: "#ede9fe" }]}>
                <Ionicons name="person-outline" size={20} color="#8b5cf6" />
              </View>
              <Text style={styles.cardTitle}>Personal Information</Text>
              {isEditing && <View style={styles.editIndicator}><Text style={styles.editIndicatorText}>Editing</Text></View>}
            </View>

            {[
              { label: "Full Name", key: "name", icon: "person-outline", editable: true },
              { label: "Phone", key: "phone", icon: "call-outline", editable: true },
              { label: "Address", key: "address", icon: "location-outline", editable: true },
              { label: "Gender", key: "gender", icon: "male-female-outline", editable: true },
            ].map((field, index) => (
              <View key={field.key} style={[styles.fieldRow, index !== 0 && styles.fieldRowBorder]}>
                <View style={styles.fieldLabel}>
                  <Ionicons name={field.icon as any} size={18} color="#9ca3af" />
                  <Text style={styles.fieldLabelText}>{field.label}</Text>
                </View>
                {isEditing && field.editable ? (
                  <TextInput
                    value={(editedUser as any)?.[field.key] || ""}
                    onChangeText={(text) => setEditedUser({ ...editedUser!, [field.key]: text })}
                    style={styles.fieldInput}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    placeholderTextColor="#d1d5db"
                  />
                ) : (
                  <Text style={styles.fieldValue}>{(user as any)?.[field.key] || "Not set"}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Read-only Professional Info */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: "#dbeafe" }]}>
                <Ionicons name="briefcase-outline" size={20} color="#3b82f6" />
              </View>
              <Text style={styles.cardTitle}>Professional Information</Text>
            </View>

            {[
              { label: "Email", value: user.email, icon: "mail-outline" },
              { label: "Employee ID", value: user.employee_id, icon: "card-outline" },
              { label: "Department", value: user.department, icon: "business-outline" },
              { label: "Designation", value: user.designation, icon: "ribbon-outline" },
              { label: "Employee Type", value: user.employee_type, icon: "people-outline" },
              { label: "Shift Type", value: user.shift_type, icon: "time-outline" },
              { label: "Role", value: user.role?.toUpperCase().replace("_", " "), icon: "shield-outline" },
            ].map((field, index) => (
              <View key={field.label} style={[styles.fieldRow, index !== 0 && styles.fieldRowBorder]}>
                <View style={styles.fieldLabel}>
                  <Ionicons name={field.icon as any} size={18} color="#9ca3af" />
                  <Text style={styles.fieldLabelText}>{field.label}</Text>
                </View>
                <Text style={styles.fieldValue}>{field.value || "Not set"}</Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          {isEditing && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
                <Ionicons name="close-outline" size={20} color="#6b7280" />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving} activeOpacity={0.8}>
                <LinearGradient colors={["#10b981", "#059669"]} style={styles.saveBtnGradient}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-outline" size={20} color="#fff" />
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <View style={styles.logoutBtnContent}>
              <View style={[styles.cardIcon, { backgroundColor: "#fee2e2" }]}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              </View>
              <Text style={styles.logoutBtnText}>Sign Out</Text>
              <Ionicons name="chevron-forward" size={20} color="#ef4444" />
            </View>
          </TouchableOpacity>
          </KeyboardAvoidingView>
          </Animated.View>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f9ff",
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
    backgroundColor: "#f0f9ff",
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header Styles
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    minHeight: height * 0.48,
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
    top: -60,
    right: -60,
  },
  decorCircle2: {
    width: 150,
    height: 150,
    bottom: -30,
    left: -40,
  },
  decorCircle3: {
    width: 80,
    height: 80,
    top: 100,
    left: 30,
  },
  decorLine: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 4,
  },
  decorLine1: {
    width: 120,
    height: 4,
    top: 80,
    right: 40,
    transform: [{ rotate: "-15deg" }],
  },
  decorLine2: {
    width: 80,
    height: 4,
    bottom: 60,
    right: 80,
    transform: [{ rotate: "25deg" }],
  },
  headerContent: {
    paddingHorizontal: 20,
    zIndex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  actionBtnActive: {
    backgroundColor: "rgba(239,68,68,0.3)",
    borderColor: "rgba(239,68,68,0.4)",
  },
  headerLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },

  // Avatar Styles
  avatarContainer: {
    alignItems: "center",
  },
  avatarRing: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 16,
    position: "relative",
  },
  avatarInner: {
    borderRadius: 999,
    overflow: "hidden",
  },
  avatar: {
    backgroundColor: "transparent",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 4,
    right: 4,
  },
  cameraBtnGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
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
    marginBottom: 20,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  quickInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  quickInfoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quickInfoText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  quickInfoDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  // Content Styles
  contentBackground: {
    flex: 1,
    minHeight: height * 0.6,
  },
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
    width: 40,
    height: 40,
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
  editIndicator: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editIndicatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#d97706",
  },
  fieldRow: {
    paddingVertical: 14,
  },
  fieldRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  fieldLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  fieldLabelText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9ca3af",
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    paddingLeft: 26,
  },
  fieldInput: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    marginLeft: 26,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
  },
  saveBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  saveBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  // Logout Button
  logoutBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  logoutBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#ef4444",
  },
});
