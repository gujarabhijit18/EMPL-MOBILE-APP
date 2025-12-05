import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";

/**
 * 🧠 User Types (can be expanded for your app)
 */
export type UserRole = "admin" | "hr" | "manager" | "team_lead" | "employee";

export interface User {
  id: string;
  user_id?: number;  // Backend user ID for API calls
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  designation?: string;
  joiningDate?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  profile_photo?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, otp: string, userData?: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
}

/**
 * 🔐 AuthContext (Expo-Compatible)
 * ✅ 100% works with Expo Go (iOS, Android, Web)
 * - No backend calls
 * - Mock login for admin & employee
 * - Persists session using AsyncStorage
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 🧠 Load stored user session on app start
   */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          // Pre-warm the API token cache for faster subsequent requests
          const { apiService } = await import("../lib/api");
          await apiService.refreshTokenCache();
        }
      } catch (error) {
        console.warn("⚠️ Failed to load stored user:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  /**
   * 🧩 Local Role Mapping
   * Ensures backend-style roles (if used later) map to frontend roles safely
   */
  const normalizeRole = (role: string): UserRole => {
    const map: Record<string, UserRole> = {
      "admin": "admin",
      "Admin": "admin",
      "hr": "hr", 
      "HR": "hr",
      "manager": "manager",
      "Manager": "manager",
      "teamlead": "team_lead",
      "TeamLead": "team_lead",
      "team_lead": "team_lead",
      "Team_Lead": "team_lead",
      "employee": "employee",
      "Employee": "employee",
    };
    return map[role] || "employee";
  };

  /**
   * 🔑 Real API Login with Backend Integration
   * Supports all roles: admin, hr, manager, team_lead, employee
   */
  const login = async (email: string, otp: string, userData?: any) => {
    setIsLoading(true);
    try {
      // Use real API response
      if (!userData) {
        throw new Error("Authentication failed. No user data received.");
      }

      const userObj: User = {
        id: userData.user_id?.toString() || "",
        user_id: userData.user_id,  // Store numeric user_id for API calls
        name: userData.name || "Unknown",
        email: userData.email || email,
        role: normalizeRole(userData.role || "employee"),
        department: userData.department || "",
        designation: userData.designation || "",
        joiningDate: userData.joining_date || new Date().toISOString(),
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem("user", JSON.stringify(userObj));
      setUser(userObj);
      
      // iOS fix: Ensure API service has the latest token after login
      // Add a small delay to ensure AsyncStorage write is complete
      await new Promise(resolve => setTimeout(resolve, 200));
      const { apiService } = await import("../lib/api");
      await apiService.refreshTokenCache();
      
      // Alert is shown in Login.tsx after successful login
      console.log(`✅ Login Successful: ${userObj.name} (${userObj.role})`);
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Authentication failed. Please check your credentials and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🚪 Logout (Clear token and user data)
   */
  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(["user", "token"]);
      // Clear the API token cache
      const { apiService } = await import("../lib/api");
      apiService.clearTokenCache();
      setUser(null);
      Alert.alert("👋 Logged Out", "You have been logged out successfully.");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out.");
    }
  };

  /**
   * ✏️ Update stored user
   */
  const updateUser = async (updatedUser: User) => {
    try {
      setUser(updatedUser);
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 🪄 Hook: useAuth
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
