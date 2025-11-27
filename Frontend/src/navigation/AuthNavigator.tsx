import React from "react";
import { Platform, StatusBar } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// ✅ Import Screens
import Login from "../screens/Login";
import ContactSupport from "../screens/ContactSupport";

// ✅ Stack Navigation Types (for TypeScript users)
export type AuthStackParamList = {
  Login: undefined;
  ContactSupport: undefined;
};

// ✅ Create Stack Navigator
const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * 🔐 AuthNavigator (Expo Compatible)
 * Handles all authentication-related screens (Login, Support, etc.)
 * ✅ Works perfectly in Expo Go (Android, iOS, Web)
 * 🚫 No native dependencies or API integration
 */
export default function AuthNavigator() {
  return (
    <>
      {/* ✅ Expo-safe StatusBar configuration */}
      <StatusBar
        translucent
        backgroundColor={Platform.OS === "android" ? "#2563EB" : "transparent"}
        barStyle={Platform.OS === "ios" ? "light-content" : "light-content"}
      />

      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: Platform.select({
            ios: "slide_from_right",
            android: "slide_from_right",
            web: "fade", // smooth for web
          }),
        }}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="ContactSupport" component={ContactSupport} />
      </Stack.Navigator>
    </>
  );
}
