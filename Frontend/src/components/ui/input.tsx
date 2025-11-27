import React, { forwardRef, useState } from "react";
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
  Platform,
} from "react-native";

interface InputProps extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>;
  error?: boolean;
}

/**
 * 🧱 Input Component (Expo Compatible)
 * ✅ Works in Expo Go (iOS, Android, Web)
 * ✨ Includes focus, disabled, and error styles — fully Expo-safe
 */
export const Input = forwardRef<TextInput, InputProps>(
  ({ style, containerStyle, error = false, editable = true, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <View style={[styles.container, containerStyle]}>
        <TextInput
          ref={ref}
          style={[
            styles.input,
            focused && styles.focused,
            error && styles.error,
            !editable && styles.disabled,
            style,
          ]}
          placeholderTextColor="#9CA3AF"
          editable={editable}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
      </View>
    );
  }
);

Input.displayName = "Input";

/* --------------------------
 * Styles (Expo-safe)
 * -------------------------- */
const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  input: {
    height: 46,
    width: "100%",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    fontSize: 16,
    color: "#111827",
    includeFontPadding: false, // fixes Android text alignment
    textAlignVertical: "center",
  },
  focused: {
    borderColor: "#2563EB", // blue-600
    // ✅ Expo-safe shadows (no elevation)
    shadowColor: "#2563EB",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  disabled: {
    opacity: 0.6,
    backgroundColor: "#F3F4F6",
  },
  error: {
    borderColor: "#DC2626", // red-600
  },
});

export default Input;
