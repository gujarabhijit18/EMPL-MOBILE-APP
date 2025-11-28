import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import * as ImagePicker from "expo-image-picker";
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
import { getColors } from "../../constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
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
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  
  const { onScroll, scrollEventThrottle, tabBarHeight } = useAutoHideTabBarOnScroll({
    threshold: 16,
    overscrollMargin: 50,
  });
  
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  
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

  const getProfilePhotoUrl = (photoPath?: string) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) return photoPath;
    const cleanPath = photoPath.startsWith('/') ? photoPath.substring(1) : photoPath;
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
          setEditedUser(fallbackUser);
        }
        Alert.alert("Notice", "Using cached profile data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserProfile();
  }, [authUser]);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.status !== "granted") {
      Alert.alert("Permission required", "Please allow photo access.");
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

  const handleSave = async () => {
    if (!editedUser || !user) return;
    try {
      setIsLoading(true);
      const updateData = {
        name: editedUser.name,
        email: editedUser.email,
        phone: editedUser.phone,
        address: editedUser.address,
        department: editedUser.department,
        designation: editedUser.designation,
        employee_id: editedUser.employee_id || user.employee_id,
      };
      await apiService.updateUserProfile(user.id, updateData);
      const updatedUser: User = {
        ...user,
        ...editedUser,
        profilePhoto: selectedImage || user.profilePhoto,
      };
      setUser(updatedUser);
      setIsEditing(false);
      setSelectedImage(null);
      Alert.alert("✅ Success", "Profile updated successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update profile.");
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
      case "admin": return "#8B5CF6";
      case "hr": return "#3B82F6";
      case "manager": return "#22C55E";
      case "team_lead": return "#F97316";
      default: return "#6B7280";
    }
  };

  const getRoleBasedStats = () => {
    if (!user) return [];
    return [
      { label: "Employee ID", value: user.employee_id || "N/A", icon: "card-outline", color: "#3B82F6" },
      { label: "Status", value: user.status === "active" ? "Active" : "Inactive", icon: "checkmark-circle-outline", color: "#22C55E" },
      { label: "Shift", value: user.shift_type || "N/A", icon: "time-outline", color: "#8B5CF6" },
      { label: "Type", value: user.employee_type || "N/A", icon: "briefcase-outline", color: "#F97316" },
    ];
  };

  const stats = getRoleBasedStats();

  // Dynamic styles
  const dynamicStyles = {
    safeArea: { backgroundColor: colors.header },
    contentContainer: { backgroundColor: colors.background },
    card: { backgroundColor: colors.cardBackground },
    cardTitle: { color: colors.textPrimary },
    cardSubtitle: { color: colors.textSecondary },
    statsCard: { backgroundColor: colors.cardBackground },
    statsLabel: { color: colors.textSecondary },
    statsValue: { color: colors.textPrimary },
    text: { color: colors.textPrimary },
    textSecondary: { color: colors.textSecondary },
    input: { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText },
    inputDisabled: { backgroundColor: colors.surfaceVariant, color: colors.textSecondary },
  };

  if (isLoading || !user) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.info} />
        <Text style={[{ marginTop: 10 }, dynamicStyles.text]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeAreaContainer, dynamicStyles.safeArea]} edges={['top']}>
      <StatusBar style={isDarkMode ? "light" : "light"} />
      
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Animated.View style={[styles.headerTextContainer, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
            <Text style={styles.headerTitle}>My Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your personal information</Text>
          </Animated.View>
          
          <TouchableOpacity style={styles.headerIconButton}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsRow}>
          <Card style={[styles.statsCard, dynamicStyles.statsCard]}>
            <Ionicons name="person" size={20} color="#3b82f6" style={styles.statsIcon} />
            <Text style={[styles.cardLabel, dynamicStyles.statsLabel]}>Role</Text>
            <Text style={[styles.cardValue, dynamicStyles.statsValue]}>{user.role.toUpperCase()}</Text>
          </Card>
          <Card style={[styles.statsCard, dynamicStyles.statsCard]}>
            <Ionicons name="business" size={20} color="#10b981" style={styles.statsIcon} />
            <Text style={[styles.cardLabel, dynamicStyles.statsLabel]}>Department</Text>
            <Text style={[styles.cardValue, dynamicStyles.statsValue]}>{user.department || "N/A"}</Text>
          </Card>
          <Card style={[styles.statsCard, dynamicStyles.statsCard]}>
            <Ionicons name="calendar" size={20} color="#f59e0b" style={styles.statsIcon} />
            <Text style={[styles.cardLabel, dynamicStyles.statsLabel]}>Joined</Text>
            <Text style={[styles.cardValue, dynamicStyles.statsValue]}>{user.joiningDate ? format(new Date(user.joiningDate), "MMM yyyy") : "N/A"}</Text>
          </Card>
        </View>
      </View>
      
      <ScrollView 
        style={[styles.contentContainer, dynamicStyles.contentContainer, { paddingBottom: tabBarHeight + 16 }]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >
        <Card style={[styles.profileCard, dynamicStyles.card]}>
          <View style={[styles.cover, { backgroundColor: getRoleColor(user.role) }]} />
          <View style={styles.profileContent}>
            <View style={styles.avatarContainer}>
              {(() => {
                const photoUrl = selectedImage || getProfilePhotoUrl(user.profilePhoto);
                if (photoUrl && !photoLoadError) {
                  return (
                    <Avatar.Image
                      size={100}
                      source={{ uri: photoUrl }}
                      onError={() => setPhotoLoadError(true)}
                    />
                  );
                } else {
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
            </View>

            <View style={styles.infoContainer}>
              <Text style={[styles.name, dynamicStyles.text]}>{user.name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
                <Ionicons name="shield-outline" size={14} color="#fff" />
                <Text style={styles.roleText}> {user.role.toUpperCase()}</Text>
              </View>
              <Text style={[styles.designation, dynamicStyles.textSecondary]}>{user.designation}</Text>
              <Text style={[styles.detailText, dynamicStyles.textSecondary]}>
                {user.department} • Joined {user.joiningDate ? format(new Date(user.joiningDate), "MMM dd, yyyy") : "N/A"}
              </Text>
              <View style={styles.contactInfo}>
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailText, dynamicStyles.textSecondary]}> {user.email}</Text>
                </View>
                {user.phone && (
                  <View style={styles.contactRow}>
                    <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, dynamicStyles.textSecondary]}> {user.phone}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.editButtons}>
              {!isEditing ? (
                <Button mode="contained" onPress={() => setIsEditing(true)}>Edit Profile</Button>
              ) : (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button mode="contained" onPress={handleSave}>Save</Button>
                  <Button mode="outlined" onPress={handleCancel}>Cancel</Button>
                </View>
              )}
            </View>
          </View>
        </Card>

        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <Card key={stat.label} style={[styles.statCard, dynamicStyles.card]}>
              <Card.Content style={styles.statContent}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>{stat.label}</Text>
                  <Text style={[styles.statValue, dynamicStyles.text]}>{stat.value}</Text>
                </View>
                <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                  <Ionicons name={stat.icon as any} size={20} color="#fff" />
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>

        <Card style={[styles.sectionCard, dynamicStyles.card]}>
          <Card.Title title="Personal Information" titleStyle={dynamicStyles.cardTitle} />
          <Card.Content>
            {[
              { label: "Full Name", key: "name" },
              { label: "Email", key: "email" },
              { label: "Phone", key: "phone" },
              { label: "Address", key: "address" },
              { label: "Gender", key: "gender" },
            ].map((f) => (
              <View key={f.key} style={styles.inputGroup}>
                <Text style={[styles.label, dynamicStyles.textSecondary]}>{f.label}</Text>
                <TextInput
                  value={(editedUser as any)?.[f.key] || ""}
                  onChangeText={(text) => setEditedUser({ ...editedUser!, [f.key]: text })}
                  editable={isEditing && f.key !== "email"}
                  style={[styles.input, dynamicStyles.input, f.key === "email" && dynamicStyles.inputDisabled]}
                  placeholderTextColor={colors.inputPlaceholder}
                />
              </View>
            ))}
          </Card.Content>
        </Card>

        <Card style={[styles.sectionCard, dynamicStyles.card]}>
          <Card.Title title="Professional Information" titleStyle={dynamicStyles.cardTitle} />
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
                <Text style={[styles.label, dynamicStyles.textSecondary]}>{f.label}</Text>
                <TextInput
                  value={String((editedUser as any)?.[f.key] || "").toUpperCase()}
                  onChangeText={(text) => setEditedUser({ ...editedUser!, [f.key]: text })}
                  editable={isEditing && f.editable !== false}
                  style={[styles.input, dynamicStyles.input, f.editable === false && dynamicStyles.inputDisabled]}
                  placeholderTextColor={colors.inputPlaceholder}
                />
              </View>
            ))}
          </Card.Content>
        </Card>

        <Card style={[styles.settingsCard, dynamicStyles.card]}>
          <Card.Title title="Settings" titleStyle={dynamicStyles.cardTitle} />
          <Card.Content>
            <TouchableOpacity style={styles.settingRow}>
              <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
              <Text style={[styles.settingText, dynamicStyles.text]}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow}>
              <Ionicons name="lock-closed-outline" size={22} color={colors.textPrimary} />
              <Text style={[styles.settingText, dynamicStyles.text]}>Security</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow} onPress={logout}>
              <Ionicons name="log-out-outline" size={22} color={colors.error} />
              <Text style={[styles.settingText, { color: colors.error }]}>Logout</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: { flex: 1 },
  contentContainer: { flex: 1, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20 },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 30 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.1)", justifyContent: "center", alignItems: "center" },
  headerIconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.1)", justifyContent: "center", alignItems: "center" },
  headerTextContainer: { flex: 1, paddingHorizontal: 16 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "white", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "#a5b4fc", opacity: 0.9 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, marginTop: 10 },
  statsCard: { flex: 1, marginHorizontal: 4, padding: 12, alignItems: "center", borderRadius: 12, elevation: 2 },
  statsIcon: { marginBottom: 6 },
  cardLabel: { fontSize: 12, marginBottom: 4 },
  cardValue: { fontSize: 16, fontWeight: "bold" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  profileCard: { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  cover: { height: 100 },
  profileContent: { alignItems: "center", padding: 16 },
  avatarContainer: { position: "relative", marginTop: -50 },
  cameraBtn: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#2563EB", padding: 6, borderRadius: 20 },
  infoContainer: { alignItems: "center", marginTop: 8 },
  name: { fontSize: 22, fontWeight: "700" },
  designation: { fontSize: 14 },
  roleBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  roleText: { color: "#fff", fontSize: 12 },
  detailText: { fontSize: 12, marginLeft: 4 },
  contactInfo: { marginTop: 8, alignItems: "center", gap: 4 },
  contactRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 8, marginVertical: 2 },
  editButtons: { marginTop: 10 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 },
  statCard: { width: "48%", marginBottom: 10, borderRadius: 14 },
  statContent: { flexDirection: "row", alignItems: "center" },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionCard: { marginBottom: 12, borderRadius: 16 },
  settingsCard: { marginBottom: 12, borderRadius: 16 },
  inputGroup: { marginBottom: 10 },
  label: { fontSize: 13, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 40 },
  settingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  settingText: { fontSize: 14 },
});
