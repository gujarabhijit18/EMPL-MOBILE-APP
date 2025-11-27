import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

/**
 * 📊 Progress Bar (Expo Compatible)
 * ✅ Works perfectly on iOS, Android, and Web via Expo Go
 *
 * Props:
 * - value: number (0–100)
 * - height?: number
 * - color?: string
 * - backgroundColor?: string
 * - borderRadius?: number
 * - animationDuration?: number
 */
interface ProgressProps {
  value?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  animationDuration?: number;
}

export const Progress: React.FC<ProgressProps> = ({
  value = 0,
  height = 10,
  color = "#2563EB", // Tailwind blue-600
  backgroundColor = "#E5E7EB", // Tailwind gray-200
  borderRadius = 9999,
  animationDuration = 300,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const safeValue = Math.min(Math.max(value, 0), 100);

    Animated.timing(animatedValue, {
      toValue: safeValue,
      duration: animationDuration,
      useNativeDriver: false, // width animation = layout property
    }).start();
  }, [value, animationDuration]);

  const widthInterpolated = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor,
          borderRadius,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.progress,
          {
            width: widthInterpolated,
            backgroundColor: color,
            borderRadius,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
  },
  progress: {
    height: "100%",
    // ✅ Expo-safe cross-platform shadow (no elevation)
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
});

export default Progress;
