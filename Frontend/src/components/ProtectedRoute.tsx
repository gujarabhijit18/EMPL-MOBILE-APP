import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

/**
 * 🔐 ProtectedRoute (Expo-Compatible)
 * ✅ Works perfectly in Expo Go (iOS, Android, Web)
 * - Protects routes based on authentication & user role
 * - Redirects to "Login" or role-based screen dynamically
 */

interface User {
  id: string;
  name: string;
  role: string;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  // Optional mock props for demo/testing without backend
  user?: User | null;
  isAuthenticated?: boolean;
  isLoading?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  user,
  isAuthenticated,
  isLoading,
}) => {
  const navigation = useNavigation<any>();

  /**
   * 🧠 Simulated auth state for demo (no API)
   * Replace this with `useAuth()` context if using real authentication.
   */
  const authUser = user ?? { id: "1", name: "John", role: "User" };
  const authed = isAuthenticated ?? true;
  const loading = isLoading ?? false;

  useEffect(() => {
    if (!loading && !authed) {
      console.log("🔒 Not authenticated → Redirecting to Login");
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
      return;
    }

    // 🧩 Role-based access restriction
    if (authUser && allowedRoles && !allowedRoles.includes(authUser.role)) {
      console.log("🚫 Invalid role → Redirecting to default role screen");
      navigation.reset({
        index: 0,
        routes: [{ name: authUser.role || "Home" }],
      });
    }
  }, [authed, authUser, loading, allowedRoles, navigation]);

  // Show a loader while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // If authenticated and allowed, render children
  return <>{children}</>;
};

export default ProtectedRoute;

// ✅ Styles
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});
