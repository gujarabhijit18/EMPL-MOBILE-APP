// 📂 src/screens/settings/SettingsScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
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
import { Button, Card, Divider } from "react-native-paper";
import RNPickerSelect from "react-native-picker-select";
import { SafeAreaView } from "react-native-safe-area-context";
import { ColorTheme, ThemeMode, useTheme } from "../../contexts/ThemeContext";
import { apiService, UserSettings } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";

interface LanguageItem {
  label: string;
  value: string;
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  
  // Use global theme context
  const { themeMode, setThemeMode, colorTheme, setColorTheme, isDarkMode } = useTheme();
  
  // Tab bar visibility with auto-hide on scroll
  const { onScroll, scrollEventThrottle, tabBarHeight } = useAutoHideTabBarOnScroll({
    threshold: 16,
    overscrollMargin: 50,
  });
  
  // Animation values for header elements
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  
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

  // Dynamic styles based on theme
  const dynamicStyles = getThemedStyles(isDarkMode);
  
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

  // ✅ Load Settings from API
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get user ID from stored user data
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        setUserId(user.user_id);
        
        // Fetch settings from API
        const settings = await apiService.getSettingsByUserId(user.user_id);
        console.log("📥 Loaded settings from API:", settings);
        
        // Update global theme context
        setThemeMode(settings.theme_mode as ThemeMode || "system");
        setColorTheme(settings.color_theme as ColorTheme || "default");
        
        setLanguage(settings.language || "en");
        setEmailNotifications(settings.email_notifications ?? true);
        setPushNotifications(settings.push_notifications ?? true);
        setTwoFactorEnabled(settings.two_factor_enabled ?? false);
        
        // Also save to local storage for offline access
        await AsyncStorage.multiSet([
          ["themeMode", settings.theme_mode || "system"],
          ["userColorTheme", settings.color_theme || "default"],
          ["language", settings.language || "en"],
          ["emailNotifications", JSON.stringify(settings.email_notifications ?? true)],
          ["pushNotifications", JSON.stringify(settings.push_notifications ?? true)],
          ["twoFactorEnabled", JSON.stringify(settings.two_factor_enabled ?? false)],
        ]);
      } else {
        // Fallback to local storage if not logged in
        await loadLocalSettings();
      }
    } catch (error) {
      console.log("⚠️ Error loading settings from API, falling back to local:", error);
      await loadLocalSettings();
    } finally {
      setIsLoading(false);
    }
  }, [setThemeMode, setColorTheme]);

  // Load from local storage (fallback)
  const loadLocalSettings = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem("themeMode");
      const storedColor = await AsyncStorage.getItem("userColorTheme");
      const storedLang = await AsyncStorage.getItem("language");
      const email = await AsyncStorage.getItem("emailNotifications");
      const push = await AsyncStorage.getItem("pushNotifications");
      const twofa = await AsyncStorage.getItem("twoFactorEnabled");

      if (storedTheme) setThemeMode(storedTheme as ThemeMode);
      if (storedColor) setColorTheme(storedColor as ColorTheme);
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
  const saveSettings = useCallback(async (settingsData: Partial<UserSettings>) => {
    if (!userId) {
      // Save locally if no user ID
      try {
        await AsyncStorage.multiSet([
          ["themeMode", themeMode],
          ["userColorTheme", colorTheme],
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
      console.log("✅ Settings saved to API:", updatedSettings);
      
      // Also update local storage
      await AsyncStorage.multiSet([
        ["themeMode", updatedSettings.theme_mode],
        ["userColorTheme", updatedSettings.color_theme],
        ["language", updatedSettings.language],
        ["emailNotifications", JSON.stringify(updatedSettings.email_notifications)],
        ["pushNotifications", JSON.stringify(updatedSettings.push_notifications)],
        ["twoFactorEnabled", JSON.stringify(updatedSettings.two_factor_enabled)],
      ]);
    } catch (error) {
      console.log("⚠️ Error saving settings to API:", error);
      // Still save locally as fallback
      try {
        await AsyncStorage.multiSet([
          ["themeMode", themeMode],
          ["userColorTheme", colorTheme],
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
  }, [userId, themeMode, colorTheme, language, emailNotifications, pushNotifications, twoFactorEnabled]);

  // ✅ Toast replacement
  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Settings", message);
    }
  };

  // ✅ Handle setting changes
  const handleThemeModeChange = (value: ThemeMode) => {
    setThemeMode(value); // Update global context
    saveSettings({ theme_mode: value });
    showToast(`${value.charAt(0).toUpperCase() + value.slice(1)} mode applied`);
  };

  const handleColorThemeChange = (value: ColorTheme, label: string) => {
    setColorTheme(value); // Update global context
    saveSettings({ color_theme: value });
    showToast(`${label} theme applied`);
  };

  const handleLanguageChange = (value: string) => {
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

  // ✅ Static Options
  const themeModes = [
    { label: "Light", value: "light" as ThemeMode, icon: "sunny-outline" },
    { label: "Dark", value: "dark" as ThemeMode, icon: "moon-outline" },
    { label: "System", value: "system" as ThemeMode, icon: "phone-portrait-outline" },
  ];

  const colorThemes = [
    { label: "Blue", value: "default" as ColorTheme, color: "#3B82F6" },
    { label: "Purple", value: "purple" as ColorTheme, color: "#8B5CF6" },
    { label: "Green", value: "green" as ColorTheme, color: "#10B981" },
    { label: "Orange", value: "orange" as ColorTheme, color: "#F97316" },
    { label: "Pink", value: "pink" as ColorTheme, color: "#EC4899" },
    { label: "Cyan", value: "cyan" as ColorTheme, color: "#06B6D4" },
  ];

  const languages: LanguageItem[] = [
    { label: "English", value: "en" },
    { label: "हिंदी", value: "hi" },
    { label: "मराठी", value: "mr" },
  ];

  // Calculate stats for header cards
  const totalSettings = 6;
  const enabledSettings = [
    emailNotifications,
    pushNotifications,
    twoFactorEnabled
  ].filter(Boolean).length + 3;

  // Get current theme mode display text
  const getThemeModeDisplay = () => {
    if (themeMode === "system") {
      return isDarkMode ? "SYS-D" : "SYS-L";
    }
    return themeMode.toUpperCase();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeAreaContainer, dynamicStyles.safeArea]} edges={['top']}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <View style={[styles.loadingContainer, dynamicStyles.safeArea]}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.safeAreaContainer, dynamicStyles.safeArea]} edges={['top']}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Enhanced Header */}
      <View style={[styles.header, dynamicStyles.header]}>
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
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Settings</Text>
              {isSaving && (
                <ActivityIndicator size="small" color="#fff" style={styles.savingIndicator} />
              )}
            </View>
            <Text style={styles.headerSubtitle}>Customize your preferences</Text>
          </Animated.View>
          
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => loadSettings()}
          >
            <Ionicons name="refresh-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <Card style={[styles.statsCard, dynamicStyles.statsCard]}>
            <Ionicons name="settings" size={20} color="#3b82f6" style={styles.statsIcon} />
            <Text style={[styles.cardLabel, dynamicStyles.cardLabel]}>Total</Text>
            <Text style={[styles.cardValue, dynamicStyles.cardValue]}>{totalSettings}</Text>
          </Card>
          <Card style={[styles.statsCard, dynamicStyles.statsCard]}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" style={styles.statsIcon} />
            <Text style={[styles.cardLabel, dynamicStyles.cardLabel]}>Active</Text>
            <Text style={[styles.cardValue, dynamicStyles.cardValue]}>{enabledSettings}</Text>
          </Card>
          <Card style={[styles.statsCard, dynamicStyles.statsCard]}>
            <Ionicons 
              name={isDarkMode ? "moon" : "sunny"} 
              size={20} 
              color={isDarkMode ? "#a78bfa" : "#f59e0b"} 
              style={styles.statsIcon} 
            />
            <Text style={[styles.cardLabel, dynamicStyles.cardLabel]}>Mode</Text>
            <Text style={[styles.cardValue, dynamicStyles.cardValue]}>{getThemeModeDisplay()}</Text>
          </Card>
        </View>
      </View>
      
      <ScrollView 
        style={[styles.contentContainer, dynamicStyles.contentContainer, { paddingBottom: tabBarHeight + 16 }]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >

        {/* 🌗 Theme Mode */}
        <Card style={[styles.card, dynamicStyles.card]}>
          <Card.Title 
            title="🌓 Display Mode" 
            subtitle="Choose Light / Dark / System mode"
            titleStyle={dynamicStyles.cardTitle}
            subtitleStyle={dynamicStyles.cardSubtitle}
          />
          <Card.Content>
            <View style={styles.rowWrap}>
              {themeModes.map((mode) => (
                <TouchableOpacity
                  key={mode.value}
                  style={[
                    styles.optionCard,
                    dynamicStyles.optionCard,
                    themeMode === mode.value && styles.activeCard,
                  ]}
                  onPress={() => handleThemeModeChange(mode.value)}
                >
                  <Ionicons
                    name={mode.icon as any}
                    size={24}
                    color={themeMode === mode.value ? "#fff" : (isDarkMode ? "#e5e7eb" : "#333")}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      dynamicStyles.optionText,
                      themeMode === mode.value && { color: "#fff" },
                    ]}
                  >
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* 🎨 Color Theme */}
        <Card style={[styles.card, dynamicStyles.card]}>
          <Card.Title 
            title="🎨 Color Theme" 
            subtitle="Choose your favorite accent color"
            titleStyle={dynamicStyles.cardTitle}
            subtitleStyle={dynamicStyles.cardSubtitle}
          />
          <Card.Content>
            <View style={styles.colorRow}>
              {colorThemes.map((theme) => (
                <TouchableOpacity
                  key={theme.value}
                  onPress={() => handleColorThemeChange(theme.value, theme.label)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: theme.color },
                    colorTheme === theme.value && styles.activeCircle,
                  ]}
                />
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* 🌐 Language */}
        <Card style={[styles.card, dynamicStyles.card]}>
          <Card.Title 
            title="🌐 Language" 
            subtitle="Select your preferred language"
            titleStyle={dynamicStyles.cardTitle}
            subtitleStyle={dynamicStyles.cardSubtitle}
          />
          <Card.Content>
            <View style={[styles.pickerContainer, dynamicStyles.pickerContainer]}>
              <RNPickerSelect
                onValueChange={(value: string) => handleLanguageChange(value)}
                items={languages}
                value={language}
                style={{
                  inputIOS: [styles.picker, dynamicStyles.picker],
                  inputAndroid: [styles.picker, dynamicStyles.picker],
                }}
              />
            </View>
          </Card.Content>
        </Card>

        {/* 🔔 Notifications */}
        <Card style={[styles.card, dynamicStyles.card]}>
          <Card.Title 
            title="🔔 Notifications" 
            subtitle="Manage how you receive alerts"
            titleStyle={dynamicStyles.cardTitle}
            subtitleStyle={dynamicStyles.cardSubtitle}
          />
          <Card.Content>
            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.settingTitle, dynamicStyles.settingTitle]}>Email Notifications</Text>
                <Text style={[styles.settingDesc, dynamicStyles.settingDesc]}>Receive updates via email</Text>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={handleEmailNotificationsChange}
                trackColor={{ false: isDarkMode ? "#4b5563" : "#d1d5db", true: "#3b82f6" }}
                thumbColor={emailNotifications ? "#fff" : "#f4f3f4"}
              />
            </View>
            <Divider style={dynamicStyles.divider} />
            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.settingTitle, dynamicStyles.settingTitle]}>Push Notifications</Text>
                <Text style={[styles.settingDesc, dynamicStyles.settingDesc]}>Enable mobile push alerts</Text>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={handlePushNotificationsChange}
                trackColor={{ false: isDarkMode ? "#4b5563" : "#d1d5db", true: "#3b82f6" }}
                thumbColor={pushNotifications ? "#fff" : "#f4f3f4"}
              />
            </View>
          </Card.Content>
        </Card>

        {/* 🔒 Security */}
        <Card style={[styles.card, dynamicStyles.card]}>
          <Card.Title 
            title="🔒 Security" 
            subtitle="Privacy and safety options"
            titleStyle={dynamicStyles.cardTitle}
            subtitleStyle={dynamicStyles.cardSubtitle}
          />
          <Card.Content>
            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.settingTitle, dynamicStyles.settingTitle]}>Two-Factor Authentication</Text>
                <Text style={[styles.settingDesc, dynamicStyles.settingDesc]}>Add extra login protection</Text>
              </View>
              <Switch
                value={twoFactorEnabled}
                onValueChange={handleTwoFactorChange}
                trackColor={{ false: isDarkMode ? "#4b5563" : "#d1d5db", true: "#3b82f6" }}
                thumbColor={twoFactorEnabled ? "#fff" : "#f4f3f4"}
              />
            </View>
            <Divider style={dynamicStyles.divider} />
            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.settingTitle, dynamicStyles.settingTitle]}>Change Password</Text>
                <Text style={[styles.settingDesc, dynamicStyles.settingDesc]}>
                  Update password regularly for better security
                </Text>
              </View>
              <Button
                mode="outlined"
                onPress={() => Alert.alert("Change Password", "Redirecting...")}
                textColor={isDarkMode ? "#93c5fd" : "#3b82f6"}
              >
                Change
              </Button>
            </View>
          </Card.Content>
        </Card>
        
        {/* Sync Status */}
        <View style={styles.syncStatus}>
          <Ionicons 
            name={userId ? "cloud-done-outline" : "cloud-offline-outline"} 
            size={16} 
            color={userId ? "#10b981" : (isDarkMode ? "#9ca3af" : "#6b7280")} 
          />
          <Text style={[styles.syncText, { color: userId ? "#10b981" : (isDarkMode ? "#9ca3af" : "#6b7280") }]}>
            {userId ? "Settings synced with server" : "Settings stored locally"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// 🎨 Dynamic themed styles
const getThemedStyles = (isDarkMode: boolean) => StyleSheet.create({
  safeArea: {
    backgroundColor: isDarkMode ? "#1e293b" : "#39549fff",
  },
  header: {
    backgroundColor: isDarkMode ? "#1e293b" : "#39549fff",
  },
  contentContainer: {
    backgroundColor: isDarkMode ? "#0f172a" : "#f9fafb",
  },
  statsCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "white",
  },
  cardLabel: {
    color: isDarkMode ? "#9ca3af" : "#6b7280",
  },
  cardValue: {
    color: isDarkMode ? "#f3f4f6" : "#111827",
  },
  card: {
    backgroundColor: isDarkMode ? "#1e293b" : "white",
  },
  cardTitle: {
    color: isDarkMode ? "#f3f4f6" : "#111827",
  },
  cardSubtitle: {
    color: isDarkMode ? "#9ca3af" : "#6b7280",
  },
  optionCard: {
    backgroundColor: isDarkMode ? "#374151" : "#E5E7EB",
  },
  optionText: {
    color: isDarkMode ? "#e5e7eb" : "#333",
  },
  pickerContainer: {
    backgroundColor: isDarkMode ? "#374151" : "#fff",
  },
  picker: {
    color: isDarkMode ? "#f3f4f6" : "#111",
  },
  settingTitle: {
    color: isDarkMode ? "#f3f4f6" : "#111827",
  },
  settingDesc: {
    color: isDarkMode ? "#9ca3af" : "#6B7280",
  },
  divider: {
    backgroundColor: isDarkMode ? "#374151" : "#e5e7eb",
  },
});

// 🎨 Base Styles
const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  header: {
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
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  savingIndicator: {
    marginLeft: 8,
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
    marginBottom: 4,
  },
  cardValue: { 
    fontSize: 18, 
    fontWeight: "bold", 
  },
  card: { 
    marginVertical: 8, 
    borderRadius: 12, 
    elevation: 2,
  },
  rowWrap: { 
    flexDirection: "row", 
    justifyContent: "space-around", 
    flexWrap: "wrap",
  },
  optionCard: {
    width: 90,
    height: 90,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    margin: 6,
  },
  activeCard: { 
    backgroundColor: "#3B82F6",
  },
  optionText: { 
    marginTop: 6, 
    fontSize: 12, 
    fontWeight: "600",
  },
  colorRow: { 
    flexDirection: "row", 
    justifyContent: "space-around", 
    flexWrap: "wrap",
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 6,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  activeCircle: { 
    borderColor: "#3B82F6", 
    borderWidth: 3,
  },
  pickerContainer: {
    padding: 12,
    borderRadius: 10,
  },
  picker: {
    fontSize: 14,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  settingTitle: { 
    fontSize: 15, 
    fontWeight: "600",
  },
  settingDesc: { 
    fontSize: 12,
  },
  syncStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginBottom: 20,
  },
  syncText: {
    fontSize: 12,
    marginLeft: 6,
  },
});
