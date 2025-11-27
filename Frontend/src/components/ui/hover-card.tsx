import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  Pressable,
  Platform,
} from "react-native";

const { width: screenWidth } = Dimensions.get("window");

interface HoverCardProps {
  children: React.ReactNode;
}

interface HoverCardTriggerProps {
  children: React.ReactNode;
  onOpen?: () => void;
}

interface HoverCardContentProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  backgroundColor?: string;
  position?: "top" | "bottom" | "center";
}

/**
 * 🪶 HoverCard (Expo Compatible)
 * ✅ Works perfectly in Expo Go (iOS, Android, Web)
 * ✨ Uses press interaction (no hover on mobile)
 */
export const HoverCard: React.FC<HoverCardProps> = ({ children }) => {
  return <>{children}</>;
};

/** Trigger — Opens the HoverCard on tap or long press */
export const HoverCardTrigger: React.FC<HoverCardTriggerProps> = ({
  children,
  onOpen,
}) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onOpen}
    onLongPress={onOpen}
    accessibilityRole="button"
  >
    {children}
  </TouchableOpacity>
);

/** Content — Appears as an animated popover/modal */
export const HoverCardContent: React.FC<HoverCardContentProps> = ({
  visible,
  onClose,
  children,
  width = 250,
  backgroundColor = "#FFFFFF",
  position = "center",
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Expo-safe positioning styles
  const getPositionStyle = (): ViewStyle => {
  switch (position) {
    case "top":
      return { justifyContent: "flex-start" as const, marginTop: 100 };
    case "bottom":
      return { justifyContent: "flex-end" as const, marginBottom: 100 };
    default:
      return { justifyContent: "center" as const };
  }
};

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      statusBarTranslucent
    >
      {/* Overlay */}
      <Pressable style={[styles.overlay]} onPress={onClose}>
        <Animated.View
          style={[
            styles.card,
            getPositionStyle(),
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              backgroundColor,
              width,
            },
          ]}
        >
          <Pressable style={styles.innerContent}>{children}</Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

/* --------------------------
 * Styles (Expo-safe)
 * -------------------------- */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  innerContent: {
    width: "100%",
  },
});

export default HoverCard;
