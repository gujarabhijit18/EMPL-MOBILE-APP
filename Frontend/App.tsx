// 📂 App.tsx
import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ✅ Local Context Providers (Pure Context Logic)
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { AuthProvider } from "./src/contexts/AuthContext";
import { LanguageProvider } from "./src/contexts/LanguageContext";
import { NotificationProvider } from "./src/contexts/NotificationContext";

// ✅ App Navigation
import RootNavigation from "./src/navigation/RootNavigation";

// ✅ Expo-Optimized (Offline + No API)
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <NavigationContainer>
                <RootNavigation />
                <Toast />
              </NavigationContainer>
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}