// 📂 src/screens/settings/SettingsScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar, setStatusBarBackgroundColor, setStatusBarStyle } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiService, UserSettings } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";

const { width } = Dimensions.get("window");

interface LanguageItem {
  label: string;
  value: string;
}

export default function SettingsScreen() {
  const navigation = useNavigation();



  // Tab bar visibility with auto-hide on scroll
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll({
    threshold: 16,
    overscrollMargin: 50,
  });

  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  // Set status bar
  useEffect(() => {
    if (Platform.OS === "android") {
      setStatusBarBackgroundColor("#6366f1", true);
    }
    setStatusBarStyle("light");
  }, []);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  // Language
  const [language, setLanguage] = useState("en");

  // 🔔 Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Animate header elements on component mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, []);

  // ✅ Load Settings from API
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        setUserId(user.user_id);

        const settings = await apiService.getSettingsByUserId(user.user_id);

        setLanguage(settings.language || "en");
        setEmailNotifications(settings.email_notifications ?? true);
        setPushNotifications(settings.push_notifications ?? true);
        setTwoFactorEnabled(settings.two_factor_enabled ?? false);

        await AsyncStorage.multiSet([
          ["language", settings.language || "en"],
          ["emailNotifications", JSON.stringify(settings.email_notifications ?? true)],
          ["pushNotifications", JSON.stringify(settings.push_notifications ?? true)],
          ["twoFactorEnabled", JSON.stringify(settings.two_factor_enabled ?? false)],
        ]);
      } else {
        await loadLocalSettings();
      }
    } catch (error) {
      await loadLocalSettings();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadLocalSettings = async () => {
    try {
      const storedLang = await AsyncStorage.getItem("language");
      const email = await AsyncStorage.getItem("emailNotifications");
      const push = await AsyncStorage.getItem("pushNotifications");
      const twofa = await AsyncStorage.getItem("twoFactorEnabled");

      if (storedLang) setLanguage(storedLang);
      if (email) setEmailNotifications(JSON.parse(email));
      if (push) setPushNotifications(JSON.parse(push));
      if (twofa) setTwoFactorEnabled(JSON.parse(twofa));
    } catch (error) {
      console.log("⚠️ Error loading local settings:", error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ✅ Save Settings to API
  const saveSettings = useCallback(
    async (settingsData: Partial<UserSettings>) => {
      if (!userId) {
        try {
          await AsyncStorage.multiSet([
            ["language", language],
            ["emailNotifications", JSON.stringify(emailNotifications)],
            ["pushNotifications", JSON.stringify(pushNotifications)],
            ["twoFactorEnabled", JSON.stringify(twoFactorEnabled)],
          ]);
        } catch (error) {
          console.log("⚠️ Error saving local settings:", error);
        }
        return;
      }

      setIsSaving(true);
      try {
        const updatedSettings = await apiService.updateSettingsByUserId(userId, settingsData);

        await AsyncStorage.multiSet([
          ["language", updatedSettings.language || "en"],
          ["emailNotifications", JSON.stringify(updatedSettings.email_notifications ?? true)],
          ["pushNotifications", JSON.stringify(updatedSettings.push_notifications ?? true)],
          ["twoFactorEnabled", JSON.stringify(updatedSettings.two_factor_enabled ?? false)],
        ]);
      } catch (error) {
        try {
          await AsyncStorage.multiSet([
            ["language", language],
            ["emailNotifications", JSON.stringify(emailNotifications)],
            ["pushNotifications", JSON.stringify(pushNotifications)],
            ["twoFactorEnabled", JSON.stringify(twoFactorEnabled)],
          ]);
        } catch (localError) {
          console.log("⚠️ Error saving local settings:", localError);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [userId, language, emailNotifications, pushNotifications, twoFactorEnabled]
  );

  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Settings", message);
    }
  };

  const handleLanguageChange = (value: string | null) => {
    if (!value) return; // Ignore null/undefined values
    setLanguage(value);
    saveSettings({ language: value });
    showToast(`${value.toUpperCase()} selected`);
  };

  const handleEmailNotificationsChange = (value: boolean) => {
    setEmailNotifications(value);
    saveSettings({ email_notifications: value });
    showToast(`Email notifications ${value ? "enabled" : "disabled"}`);
  };

  const handlePushNotificationsChange = (value: boolean) => {
    setPushNotifications(value);
    saveSettings({ push_notifications: value });
    showToast(`Push notifications ${value ? "enabled" : "disabled"}`);
  };

  const handleTwoFactorChange = (value: boolean) => {
    setTwoFactorEnabled(value);
    saveSettings({ two_factor_enabled: value });
    showToast(`Two-Factor Authentication ${value ? "enabled" : "disabled"}`);
  };

  const languages: LanguageItem[] = [
    { label: "English", value: "en" },
    { label: "हिंदी", value: "hi" },
    { label: "मराठी", value: "mr" },
  ];

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <LinearGradient colors={["#6366f1", "#4f46e5"]} style={styles.loaderGradient}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loaderText}>Loading settings...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" backgroundColor="#6366f1" translucent={false} />

      {/* Premium Gradient Header */}
      <LinearGradient
        colors={["#6366f1", "#4f46e5", "#4338ca"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Background Pattern */}
        <View style={styles.headerPattern}>
          <View style={[styles.patternCircle, { top: -30, right: -30, width: 140, height: 140 }]} />
          <View style={[styles.patternCircle, { bottom: -40, left: -40, width: 160, height: 160 }]} />
          <View style={[styles.patternCircle, { top: 50, right: 100, width: 80, height: 80 }]} />
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
          {/* Header Top Row */}
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerTitleSection}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle}>Settings</Text>
                {isSaving && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />}
              </View>
              <Text style={styles.headerSubtitle}>Customize your preferences</Text>
            </View>

            <TouchableOpacity style={styles.refreshButton} onPress={() => loadSettings()} activeOpacity={0.7}>
              <Ionicons name="refresh-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarVisible ? tabBarHeight + 24 : 24 }]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: contentAnim,
            transform: [
              {
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          }}
        >
          {/* Language Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: "#dbeafe" }]}>
                <Ionicons name="language-outline" size={18} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Language</Text>
                <Text style={styles.sectionSubtitle}>Select your preferred language</Text>
              </View>
            </View>

            <View style={styles.languageCard}>
              <View style={styles.pickerWrapper}>
                <RNPickerSelect
                  onValueChange={(value) => handleLanguageChange(value)}
                  items={languages}
                  value={language || "en"}
                  placeholder={{}}
                  useNativeAndroidPickerStyle={false}
                  style={{
                    inputIOS: styles.pickerInput,
                    inputAndroid: styles.pickerInput,
                    iconContainer: { top: 14, right: 12 },
                  }}
                  Icon={() => <Ionicons name="chevron-down" size={20} color="#6b7280" />}
                />
              </View>
            </View>
          </View>

          {/* Notifications Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: "#d1fae5" }]}>
                <Ionicons name="notifications-outline" size={18} color="#10b981" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Notifications</Text>
                <Text style={styles.sectionSubtitle}>Manage how you receive alerts</Text>
              </View>
            </View>

            <View style={styles.settingsCard}>
              <View style={styles.settingItem}>
                <View style={[styles.settingIconBg, { backgroundColor: "#dbeafe" }]}>
                  <Ionicons name="mail-outline" size={20} color="#3b82f6" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Email Notifications</Text>
                  <Text style={styles.settingSubtitle}>Receive updates via email</Text>
                </View>
                <Switch
                  value={emailNotifications}
                  onValueChange={handleEmailNotificationsChange}
                  trackColor={{ false: "#e5e7eb", true: "#6366f1" }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingDivider} />

              <View style={styles.settingItem}>
                <View style={[styles.settingIconBg, { backgroundColor: "#fef3c7" }]}>
                  <Ionicons name="phone-portrait-outline" size={20} color="#f59e0b" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                  <Text style={styles.settingSubtitle}>Enable mobile push alerts</Text>
                </View>
                <Switch
                  value={pushNotifications}
                  onValueChange={handlePushNotificationsChange}
                  trackColor={{ false: "#e5e7eb", true: "#6366f1" }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>

          {/* Sync Status */}
          <View style={styles.syncStatusContainer}>
            <View style={[styles.syncStatusBadge, { backgroundColor: userId ? "#d1fae5" : "#f3f4f6" }]}>
              <Ionicons
                name={userId ? "cloud-done-outline" : "cloud-offline-outline"}
                size={16}
                color={userId ? "#10b981" : "#6b7280"}
              />
              <Text style={[styles.syncStatusText, { color: userId ? "#10b981" : "#6b7280" }]}>
                {userId ? "Settings synced with server" : "Settings stored locally"}
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6366f1",
  },
  loaderContainer: {
    flex: 1,
  },
  loaderGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  headerGradient: {
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitleSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
    fontWeight: "500",
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  sectionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1f2937",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  languageCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pickerWrapper: {
    paddingHorizontal: 4,
  },
  pickerInput: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1f2937",
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingRight: 40,
  },
  settingsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  settingIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
  },
  settingDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginLeft: 74,
  },
  syncStatusContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  syncStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  syncStatusText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
