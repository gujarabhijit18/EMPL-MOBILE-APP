import React, { useState } from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  ImageErrorEventData,
  NativeSyntheticEvent,
} from "react-native";

interface AvatarProps {
  uri?: string; // Image URL
  size?: number; // Avatar size
  name?: string; // Fallback initials
  backgroundColor?: string; // Background color for fallback
  textColor?: string; // Text color for fallback
  style?: StyleProp<ViewStyle>;
}

/**
 * ✅ Expo-Compatible Avatar Component
 * Works in Expo Go (no Android Studio or native linking required)
 * Displays profile image or fallback initials if image fails
 */
export const Avatar: React.FC<AvatarProps> = ({
  uri,
  size = 40,
  name,
  backgroundColor = "#E5E7EB",
  textColor = "#374151",
  style,
}) => {
  const [loadError, setLoadError] = useState(false);

  // Generate initials (first letters of up to 2 words)
  const initials =
    name
      ?.trim()
      .split(" ")
      .map((n) => n[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "?";

  // Handle image load error (Expo-safe)
  const handleError = (e: NativeSyntheticEvent<ImageErrorEventData>) => {
    console.log("⚠️ Avatar failed to load:", e.nativeEvent.error);
    setLoadError(true);
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      {/* ✅ Show image if available and not failed */}
      {!loadError && uri ? (
        <Image
          source={{ uri }}
          onError={handleError}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      ) : (
        // ✅ Fallback (initials)
        <View
          style={[
            styles.fallback,
            {
              backgroundColor,
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <Text
            style={[
              styles.fallbackText,
              { color: textColor, fontSize: size / 2.5 },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
};

// ✅ Styles
const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    resizeMode: "cover",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    fontWeight: "600",
  },
});

export default Avatar;
