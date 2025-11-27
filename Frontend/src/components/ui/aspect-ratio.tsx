import React from "react";
import {
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";

interface AspectRatioProps {
  /** Ratio like 16/9, 4/3, 1 (square), etc. */
  ratio?: number;
  /** Optional custom style */
  style?: StyleProp<ViewStyle>;
  /** Content inside the ratio container */
  children: React.ReactNode;
}

/**
 * ✅ AspectRatio (Expo-Compatible)
 * Maintains a consistent width:height ratio for its children.
 * Works perfectly on Android, iOS, and Web inside Expo.
 */
export const AspectRatio: React.FC<AspectRatioProps> = ({
  ratio = 1, // default square
  style,
  children,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* aspectRatio works directly in Expo — no native linking */}
      <View style={{ aspectRatio: ratio, width: "100%" }}>{children}</View>
    </View>
  );
};

// ✅ Expo-safe styles
const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AspectRatio;
