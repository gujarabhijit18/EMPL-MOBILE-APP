import React, { useEffect, useRef } from "react";
import {
  Animated,
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Easing,
} from "react-native";

interface SkeletonProps {
  width?: ViewStyle["width"];
  height?: ViewStyle["height"];
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  baseColor?: string;
  highlightColor?: string;
  shimmer?: boolean; // Enables shimmer effect
}

/**
 * 🦴 Skeleton Loader (Expo Compatible)
 * ✅ Works on iOS, Android, and Web (Expo Go)
 *
 * Features:
 * - Smooth pulsing opacity animation
 * - Optional shimmer highlight effect
 * - Customizable colors, size, and border radius
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 6,
  style,
  baseColor = "#E5E7EB", // Tailwind gray-200
  highlightColor = "#F3F4F6", // Tailwind gray-100
  shimmer = false,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const shimmerTranslate = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    // Pulse (breathing) animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    // Optional shimmer animation
    let shimmerLoop: Animated.CompositeAnimation | null = null;
    if (shimmer) {
      shimmerLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerTranslate, {
            toValue: 200,
            duration: 1200,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerTranslate, {
            toValue: -200,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      shimmerLoop.start();
    }

    return () => {
      pulseLoop.stop();
      shimmerLoop?.stop?.();
    };
  }, []);

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
        },
        style,
      ]}
    >
      {/* Shimmer highlight effect */}
      {shimmer && (
        <Animated.View
          style={[
            styles.shimmerOverlay,
            {
              backgroundColor: highlightColor,
              transform: [{ translateX: shimmerTranslate }],
            },
          ]}
        />
      )}

      {/* Base pulsing overlay */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity,
            backgroundColor: baseColor,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: 100,
    opacity: 0.4,
    borderRadius: 6,
  },
});

export default Skeleton;
