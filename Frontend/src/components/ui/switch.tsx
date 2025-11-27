import React from "react";
import {
  Switch as RNSwitch,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  Platform,
} from "react-native";

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  activeColor?: string;
  inactiveColor?: string;
  thumbColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * 🔘 React Native Switch (Expo Compatible)
 * ✅ Works perfectly in Expo Go (iOS, Android, Web)
 *
 * Features:
 * - Simple and customizable toggle
 * - Uses built-in React Native `Switch` (no native modules)
 * - Fully Expo-safe (no linking or pod install)
 */
export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  activeColor = "#3B82F6", // Tailwind blue-500
  inactiveColor = "#E5E7EB", // Tailwind gray-200
  thumbColor = "#FFFFFF", // Tailwind white
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: inactiveColor,
          true: activeColor,
        }}
        thumbColor={Platform.OS === "android" ? thumbColor : undefined}
        ios_backgroundColor={inactiveColor}
        style={styles.switch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  switch: {
    // Slightly scale up for visual balance on all platforms
    transform:
      Platform.OS === "ios"
        ? [{ scaleX: 1.1 }, { scaleY: 1.1 }]
        : [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
});

export default Switch;
