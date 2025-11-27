import React from "react";
import { Platform, View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";

// ✅ Import navigators
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";

// ✅ Screens
import NotFoundScreen from "../screens/NotFound";

// ✅ Create Stack Navigator
const Stack = createNativeStackNavigator();

/**
 * 🌐 RootNavigator (Expo-Compatible)
 * Handles navigation flow between:
 * - Auth flow (Login, Signup)
 * - Main app flow (Dashboards, Screens)
 * ✅ Works perfectly in Expo Go (Android, iOS, Web)
 * 🚫 No API integration or native dependency required
 */
export default function RootNavigator() {
  const { user, isLoading } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: Platform.select({
          ios: "slide_from_right",
          android: "slide_from_right",
          web: "fade", // smoother for Expo Web
        }),
      }}
    >
      {user ? (
        // ✅ Logged-in user → Main app flow
        <Stack.Screen name="Main" component={MainNavigator} />
      ) : (
        // 🚪 Not logged in → Auth flow (Login page first)
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}

      {/* 🧱 Fallback screen (404 or undefined routes) */}
      <Stack.Screen name="NotFound" component={NotFoundScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
