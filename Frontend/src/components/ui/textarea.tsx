import React from "react";
import {
  TextInput,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";

interface TextareaProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

/**
 * 📝 Textarea (Expo-Compatible)
 * ✅ Works perfectly in Expo Go (iOS, Android, Web)
 * Features:
 * - Multi-line input
 * - Fully customizable styles
 * - Expo-safe (no linking or native dependencies)
 */
export const Textarea: React.FC<TextareaProps> = ({
  value,
  onChangeText,
  placeholder = "Enter text...",
  editable = true,
  numberOfLines = 4,
  style,
  inputStyle,
}) => {
  return (
    <View style={[styles.container, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        editable={editable}
        multiline
        numberOfLines={numberOfLines}
        textAlignVertical="top" // keeps alignment correct on Android
        placeholderTextColor="#9CA3AF" // gray-400
        style={[
          styles.textarea,
          !editable && styles.disabled,
          inputStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  textarea: {
    minHeight: 100,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E7EB", // gray-200
    backgroundColor: "#FFFFFF", // white
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 15,
    color: "#111827", // gray-900
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.6,
    backgroundColor: "#F3F4F6", // gray-100
  },
});

export default Textarea;
