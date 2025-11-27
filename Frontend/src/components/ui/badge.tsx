import React from "react";
import {
  Text,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface BadgeProps {
  /** Text to display inside the badge */
  label: string;
  /** Visual style variant */
  variant?: BadgeVariant;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
  /** Optional text style */
  textStyle?: StyleProp<TextStyle>;
}

/**
 * ✅ Expo-Compatible Badge Component
 * Works in Expo Go (no Android Studio or native linking required)
 * Equivalent to shadcn/ui Badge with color variants.
 */
export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "default",
  style,
  textStyle,
}) => {
  const variantStyle = getVariantStyle(variant);

  return (
    <View
      style={[styles.badge, variantStyle.container, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Badge: ${label}`}
    >
      <Text style={[styles.text, variantStyle.text, textStyle]}>{label}</Text>
    </View>
  );
};

/** ✅ Variant color styles */
const getVariantStyle = (variant: BadgeVariant) => {
  switch (variant) {
    case "secondary":
      return {
        container: { backgroundColor: "#E5E7EB" },
        text: { color: "#111827" },
      };
    case "destructive":
      return {
        container: { backgroundColor: "#EF4444" },
        text: { color: "#FFFFFF" },
      };
    case "outline":
      return {
        container: {
          borderWidth: 1,
          borderColor: "#9CA3AF",
          backgroundColor: "transparent",
        },
        text: { color: "#374151" },
      };
    default:
      return {
        container: { backgroundColor: "#2563EB" },
        text: { color: "#FFFFFF" },
      };
  }
};

// ✅ Styles (Expo Safe)
const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 9999, // pill shape
    minHeight: 22,
    marginVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});

export default Badge;
