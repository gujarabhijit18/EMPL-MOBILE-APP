// 📂 App.tsx
import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ✅ Local Context Providers (Pure Context Logic)
import { AuthProvider } from "./src/contexts/AuthContext";
import { LanguageProvider } from "./src/contexts/LanguageContext";
import { NotificationProvider } from "./src/contexts/NotificationContext";
import { ModuleBadgeProvider } from "./src/contexts/ModuleBadgeContext";

// ✅ App Navigation
import RootNavigation from "./src/navigation/RootNavigation";

// ✅ Expo-Optimized (Offline + No API)
export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <ModuleBadgeProvider>
              <NavigationContainer>
                <RootNavigation />
                <Toast />
              </NavigationContainer>
            </ModuleBadgeProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}