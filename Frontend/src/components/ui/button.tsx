import React from "react";
import {
  Text,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type GestureResponderEvent,
} from "react-native";

type Variant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type Size = "default" | "sm" | "lg" | "icon";

interface ButtonProps {
  title?: string;
  variant?: Variant;
  size?: Size;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * ✅ ShadCN-style Button for Expo
 * Works 100% in Expo Go — no Android Studio or linking required.
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  variant = "default",
  size = "default",
  onPress,
  disabled,
  icon,
  children,
  style,
  textStyle,
}) => {
  const variantStyle = getVariantStyle(variant);
  const sizeStyle = getSizeStyle(size);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title || "button"}
      style={({ pressed }) => [
        styles.base,
        variantStyle.button,
        sizeStyle.button,
        pressed && { opacity: 0.8 }, // ✅ Expo-safe press feedback
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        {title && (
          <Text
            style={[
              styles.text,
              variantStyle.text,
              sizeStyle.text,
              textStyle,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
        {!title && children}
      </View>
    </Pressable>
  );
};

/** ✅ Variant Styles */
const getVariantStyle = (
  variant: Variant
): { button: ViewStyle; text: TextStyle } => {
  switch (variant) {
    case "destructive":
      return {
        button: { backgroundColor: "#DC2626" }, // red-600
        text: { color: "#FFFFFF" },
      };
    case "outline":
      return {
        button: {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: "#D1D5DB",
        },
        text: { color: "#111827" },
      };
    case "secondary":
      return {
        button: { backgroundColor: "#E5E7EB" },
        text: { color: "#111827" },
      };
    case "ghost":
      return {
        button: { backgroundColor: "transparent" },
        text: { color: "#111827" },
      };
    case "link":
      return {
        button: { backgroundColor: "transparent" },
        text: {
          color: "#2563EB",
          textDecorationLine: "underline",
        },
      };
    default:
      return {
        button: { backgroundColor: "#2563EB" }, // blue-600
        text: { color: "#FFFFFF" },
      };
  }
};

/** ✅ Size Styles */
const getSizeStyle = (size: Size): { button: ViewStyle; text: TextStyle } => {
  switch (size) {
    case "sm":
      return {
        button: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
        text: { fontSize: 13 },
      };
    case "lg":
      return {
        button: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
        text: { fontSize: 16 },
      };
    case "icon":
      return {
        button: {
          width: 40,
          height: 40,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
        },
        text: { fontSize: 14 },
      };
    default:
      return {
        button: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
        text: { fontSize: 14 },
      };
  }
};

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginRight: 6,
  },
  text: {
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;
