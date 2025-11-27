// 📂 src/screens/settings/SettingsScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  ToastAndroid,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Card, Button, Divider } from "react-native-paper";
import RNPickerSelect from "react-native-picker-select";
import { Ionicons } from "@expo/vector-icons"; // ✅ Expo-safe
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from "@react-navigation/native";
import { useColorScheme } from "react-native"; // For theme detection
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";

interface LanguageItem {
  label: string;
  value: string;
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  
  // Tab bar visibility with auto-hide on scroll
  const { onScroll, scrollEventThrottle, tabBarHeight } = useAutoHideTabBarOnScroll({
    threshold: 16,
    overscrollMargin: 50,
  });
  
  // Animation values for header elements
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  
  // 🌗 Theme + Language
  const [themeMode, setThemeMode] = useState("system");
  const [colorTheme, setColorTheme] = useState("default");
  const [language, setLanguage] = useState("en");

  // 🔔 Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const systemTheme = useColorScheme(); // Detect light/dark mode
  
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

  // ✅ Load Settings from local storage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem("themeMode");
        const storedColor = await AsyncStorage.getItem("colorTheme");
        const storedLang = await AsyncStorage.getItem("language");
        const email = await AsyncStorage.getItem("emailNotifications");
        const push = await AsyncStorage.getItem("pushNotifications");
        const twofa = await AsyncStorage.getItem("twoFactorEnabled");

        if (storedTheme) setThemeMode(storedTheme);
        if (storedColor) setColorTheme(storedColor);
        if (storedLang) setLanguage(storedLang);
        if (email) setEmailNotifications(JSON.parse(email));
        if (push) setPushNotifications(JSON.parse(push));
        if (twofa) setTwoFactorEnabled(JSON.parse(twofa));
      } catch (error) {
        console.log("⚠️ Error loading settings:", error);
      }
    };
    loadSettings();
  }, []);

  // ✅ Auto Save Settings
  useEffect(() => {
    const saveSettings = async () => {
      try {
        await AsyncStorage.multiSet([
          ["themeMode", themeMode],
          ["colorTheme", colorTheme],
          ["language", language],
          ["emailNotifications", JSON.stringify(emailNotifications)],
          ["pushNotifications", JSON.stringify(pushNotifications)],
          ["twoFactorEnabled", JSON.stringify(twoFactorEnabled)],
        ]);
      } catch (error) {
        console.log("⚠️ Error saving settings:", error);
      }
    };
    saveSettings();
  }, [
    themeMode,
    colorTheme,
    language,
    emailNotifications,
    pushNotifications,
    twoFactorEnabled,
  ]);

  // ✅ Toast replacement
  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Settings", message);
    }
  };

  // ✅ Static Options
  const themeModes = [
    { label: "Light", value: "light", icon: "sunny-outline" },
    { label: "Dark", value: "dark", icon: "moon-outline" },
    { label: "System", value: "system", icon: "phone-portrait-outline" },
  ];

  const colorThemes = [
    { label: "Blue", value: "default", color: "#3B82F6" },
    { label: "Purple", value: "purple", color: "#8B5CF6" },
    { label: "Green", value: "green", color: "#10B981" },
    { label: "Orange", value: "orange", color: "#F97316" },
    { label: "Pink", value: "pink", color: "#EC4899" },
    { label: "Cyan", value: "cyan", color: "#06B6D4" },
  ];

  const languages: LanguageItem[] = [
    { label: "English", value: "en" },
    { label: "हिंदी", value: "hi" },
    { label: "मराठी", value: "mr" },
  ];

  // Calculate stats for header cards
  const totalSettings = 6; // Theme, Color, Language, Email, Push, 2FA
  const enabledSettings = [
    emailNotifications,
    pushNotifications,
    twoFactorEnabled
  ].filter(Boolean).length + 3; // Always count theme, color, language as enabled
  
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
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Customize your preferences</Text>
          </Animated.View>
          
          <TouchableOpacity style={styles.headerIconButton}>
            <Ionicons name="help-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <Card style={styles.statsCard}>
            <Ionicons name="settings" size={20} color="#3b82f6" style={styles.statsIcon} />
            <Text style={styles.cardLabel}>Total</Text>
            <Text style={styles.cardValue}>{totalSettings}</Text>
          </Card>
          <Card style={styles.statsCard}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" style={styles.statsIcon} />
            <Text style={styles.cardLabel}>Active</Text>
            <Text style={styles.cardValue}>{enabledSettings}</Text>
          </Card>
          <Card style={styles.statsCard}>
            <Ionicons name="color-palette" size={20} color="#f59e0b" style={styles.statsIcon} />
            <Text style={styles.cardLabel}>Theme</Text>
            <Text style={styles.cardValue}>{themeMode.toUpperCase()}</Text>
          </Card>
        </View>
      </View>
      
      <ScrollView 
        style={[styles.contentContainer, { paddingBottom: tabBarHeight + 16 }]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >

        {/* 🌗 Theme Mode */}
        <Card style={styles.card}>
          <Card.Title title="🌓 Display Mode" subtitle="Choose Light / Dark / System mode" />
          <Card.Content>
            <View style={styles.rowWrap}>
              {themeModes.map((mode) => (
                <TouchableOpacity
                  key={mode.value}
                  style={[
                    styles.optionCard,
                    themeMode === mode.value && styles.activeCard,
                  ]}
                  onPress={() => {
                    setThemeMode(mode.value);
                    showToast(`${mode.label} mode applied`);
                  }}
                >
                  <Ionicons
                    name={mode.icon as any}
                    size={24}
                    color={themeMode === mode.value ? "#fff" : "#333"}
                  />
                  <Text
                    style={[
                      styles.optionText,
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
        <Card style={styles.card}>
          <Card.Title title="🎨 Color Theme" subtitle="Choose your favorite accent color" />
          <Card.Content>
            <View style={styles.colorRow}>
              {colorThemes.map((theme) => (
                <TouchableOpacity
                  key={theme.value}
                  onPress={() => {
                    setColorTheme(theme.value);
                    showToast(`${theme.label} theme applied`);
                  }}
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
        <Card style={styles.card}>
          <Card.Title title="🌐 Language" subtitle="Select your preferred language" />
          <Card.Content>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={(value: string) => {
                  setLanguage(value);
                  showToast(`${value.toUpperCase()} selected`);
                }}
                items={languages}
                value={language}
                style={{
                  inputIOS: styles.picker,
                  inputAndroid: styles.picker,
                }}
              />
            </View>
          </Card.Content>
        </Card>

        {/* 🔔 Notifications */}
        <Card style={styles.card}>
          <Card.Title title="🔔 Notifications" subtitle="Manage how you receive alerts" />
          <Card.Content>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingTitle}>Email Notifications</Text>
                <Text style={styles.settingDesc}>Receive updates via email</Text>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={(val) => {
                  setEmailNotifications(val);
                  showToast(`Email notifications ${val ? "enabled" : "disabled"}`);
                }}
              />
            </View>
            <Divider />
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingDesc}>Enable mobile push alerts</Text>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={(val) => {
                  setPushNotifications(val);
                  showToast(`Push notifications ${val ? "enabled" : "disabled"}`);
                }}
              />
            </View>
          </Card.Content>
        </Card>

        {/* 🔒 Security */}
        <Card style={styles.card}>
          <Card.Title title="🔒 Security" subtitle="Privacy and safety options" />
          <Card.Content>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
                <Text style={styles.settingDesc}>Add extra login protection</Text>
              </View>
              <Switch
                value={twoFactorEnabled}
                onValueChange={(val) => {
                  setTwoFactorEnabled(val);
                  showToast(
                    `Two-Factor Authentication ${val ? "enabled" : "disabled"}`
                  );
                }}
              />
            </View>
            <Divider />
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingTitle}>Change Password</Text>
                <Text style={styles.settingDesc}>
                  Update password regularly for better security
                </Text>
              </View>
              <Button
                mode="outlined"
                onPress={() => Alert.alert("Change Password", "Redirecting...")}
              >
                Change
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

// 🎨 Styles
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
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 10 },
  title: { fontSize: 24, fontWeight: "bold", marginTop: 10 },
  subtitle: { fontSize: 14, color: "#6B7280", marginBottom: 10 },
  card: { marginVertical: 8, borderRadius: 12, elevation: 2 },
  rowWrap: { flexDirection: "row", justifyContent: "space-around", flexWrap: "wrap" },
  optionCard: {
    width: 90,
    height: 90,
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    margin: 6,
  },
  activeCard: { backgroundColor: "#3B82F6" },
  optionText: { marginTop: 6, fontSize: 12, fontWeight: "600" },
  colorRow: { flexDirection: "row", justifyContent: "space-around", flexWrap: "wrap" },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 6,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  activeCircle: { borderColor: "#3B82F6", borderWidth: 3 },
  pickerContainer: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  picker: {
    fontSize: 14,
    color: "#111",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  settingTitle: { fontSize: 15, fontWeight: "600" },
  settingDesc: { fontSize: 12, color: "#6B7280" },
});
