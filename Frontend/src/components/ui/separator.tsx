import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";

interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean; // Accessibility hint
  color?: string;
  thickness?: number;
  margin?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * ─────────────────────────────────────────────
 * 🧱 React Native Separator (Expo Compatible)
 * ✅ Works perfectly on iOS, Android, and Web (Expo Go)
 * 
 * A flexible, accessible divider for layouts.
 * - Horizontal or Vertical orientation
 * - No platform or native dependencies
 * - Accessible if decorative = false
 * ─────────────────────────────────────────────
 */
export const Separator: React.FC<SeparatorProps> = ({
  orientation = "horizontal",
  decorative = true,
  color = "#E5E7EB", // Tailwind gray-200
  thickness = StyleSheet.hairlineWidth,
  margin = 8,
  style,
}) => {
  const isHorizontal = orientation === "horizontal";

  return (
    <View
      accessible={!decorative}
      importantForAccessibility={decorative ? "no" : "yes"}
      accessibilityRole={!decorative ? "none" : undefined}
      style={[
        isHorizontal
          ? [
              styles.horizontal,
              {
                height: thickness,
                backgroundColor: color,
                marginVertical: margin,
              },
            ]
          : [
              styles.vertical,
              {
                width: thickness,
                backgroundColor: color,
                marginHorizontal: margin,
              },
            ],
        style,
      ]}
    />
  );
};

/* ✅ Expo-Safe, Cross-Platform Styles */
const styles = StyleSheet.create({
  horizontal: {
    width: "100%",
  },
  vertical: {
    height: "100%",
    alignSelf: "stretch",
  },
});

export default Separator;
