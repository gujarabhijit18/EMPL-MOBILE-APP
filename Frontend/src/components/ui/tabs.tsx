import React, { useState, useContext, createContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";

/**
 * 🧩 Tabs (Expo-Compatible)
 * ✅ Works in Expo Go (iOS, Android, Web)
 * Features:
 * - Context-based tab management
 * - Clean Tailwind-inspired design
 * - No native dependencies or linking
 */

interface TabsProps {
  defaultValue?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface TabsContextType {
  value: string;
  setValue: (val: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

export const Tabs: React.FC<TabsProps> = ({ defaultValue, children, style }) => {
  const [value, setValue] = useState(defaultValue || "");

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <View style={[styles.tabsContainer, style]}>{children}</View>
    </TabsContext.Provider>
  );
};

/* ---------------- TabsList ---------------- */
export const TabsList: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ children, style }) => (
  <View style={[styles.tabsList, style]}>{children}</View>
);

/* ---------------- TabsTrigger ---------------- */
interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  style,
  textStyle,
}) => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used inside <Tabs>");

  const isActive = ctx.value === value;

  return (
    <TouchableOpacity
      onPress={() => ctx.setValue(value)}
      activeOpacity={0.8}
      style={[
        styles.tabTrigger,
        isActive && styles.tabTriggerActive,
        style,
      ]}
    >
      <Text
        style={[
          styles.tabText,
          isActive && styles.tabTextActive,
          textStyle,
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
};

/* ---------------- TabsContent ---------------- */
interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
  style,
}) => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used inside <Tabs>");

  if (ctx.value !== value) return null;

  return <View style={[styles.tabContent, style]}>{children}</View>;
};

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  tabsContainer: {
    width: "100%",
  },
  tabsList: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6", // gray-100
    borderRadius: 8,
    padding: 4,
    justifyContent: "center",
  },
  tabTrigger: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tabTriggerActive: {
    backgroundColor: "#FFFFFF",
    // ✅ Expo-safe shadow (no elevation)
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  tabText: {
    fontSize: 14,
    color: "#6B7280", // gray-500
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#111827", // gray-900
  },
  tabContent: {
    marginTop: 12,
  },
});

export default Tabs;
