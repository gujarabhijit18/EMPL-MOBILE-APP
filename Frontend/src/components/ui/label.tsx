import React, { forwardRef } from "react";
import { Text, StyleSheet, TextProps, Platform } from "react-native";

/**
 * 🏷️ Label (Expo Compatible)
 * ✅ Works in Expo Go (iOS, Android, Web)
 * - Supports disabled and required states
 * - Expo-safe text styling and accessibility
 */
interface LabelProps extends TextProps {
  disabled?: boolean;
  required?: boolean;
}

export const Label = forwardRef<Text, LabelProps>(
  ({ style, disabled = false, required = false, children, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        style={[
          styles.label,
          disabled && styles.disabled,
          style,
        ]}
        accessibilityRole="text"
        {...props}
      >
        {children}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
    );
  }
);

Label.displayName = "Label";

/* --------------------------
 * Styles (Expo-safe)
 * -------------------------- */
const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600", // consistent on all platforms
    lineHeight: 20,
    color: "#111827", // Tailwind gray-900
    marginBottom: 4,
    textAlignVertical: "center",
  },
  disabled: {
    opacity: 0.6,
    color: "#9CA3AF", // gray-400 for disabled text
  },
  required: {
    color: "#DC2626", // red-600 for asterisk
  },
});

export default Label;
