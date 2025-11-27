import React, { useRef, useEffect } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { X } from "lucide-react-native";

const { width, height } = Dimensions.get("window");

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
  overlayColor?: string;
}

/**
 * 🪟 Sheet (Expo Compatible)
 * ✅ Works perfectly on iOS, Android, and Web (Expo Go)
 *
 * Features:
 * - Slide from any side (top, bottom, left, right)
 * - Smooth Expo-safe animations
 * - Custom overlay color
 */
export const Sheet: React.FC<SheetProps> = ({
  visible,
  onClose,
  side = "right",
  children,
  overlayColor = "rgba(0,0,0,0.5)",
}) => {
  const translateAnim = useRef(new Animated.Value(0)).current;

  // Determine slide direction & initial value
  const isVertical = side === "top" || side === "bottom";
  const initialValue =
    side === "bottom"
      ? height
      : side === "top"
      ? -height
      : side === "right"
      ? width
      : -width;

  useEffect(() => {
    if (visible) {
      translateAnim.setValue(initialValue);
      Animated.spring(translateAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
      }).start();
    } else {
      Animated.timing(translateAnim, {
        toValue: initialValue,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
          {/* Sheet body */}
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sheet,
                getSideStyle(side),
                {
                  transform: [
                    isVertical
                      ? { translateY: translateAnim }
                      : { translateX: translateAnim },
                  ],
                },
              ]}
            >
              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X color="#6B7280" size={22} />
              </TouchableOpacity>

              {children}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

/* ---- Subcomponents ---- */
export const SheetHeader: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <View style={styles.header}>{children}</View>;

export const SheetFooter: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <View style={styles.footer}>{children}</View>;

export const SheetTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <Text style={styles.title}>{children}</Text>;

export const SheetDescription: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <Text style={styles.description}>{children}</Text>;

/* ---- Helper: Layout by side ---- */
const getSideStyle = (side: SheetProps["side"]) => {
  switch (side) {
    case "top":
      return { top: 0, left: 0, right: 0, height: height * 0.5 };
    case "bottom":
      return { bottom: 0, left: 0, right: 0, height: height * 0.5 };
    case "left":
      return { top: 0, bottom: 0, left: 0, width: width * 0.75 };
    case "right":
    default:
      return { top: 0, bottom: 0, right: 0, width: width * 0.75 };
  }
};

/* ---- Expo-safe styles ---- */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-start",
  },
  sheet: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    // ✅ Expo-safe shadow (no elevation)
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 100,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 6,
    zIndex: 20,
  },
  header: {
    marginBottom: 12,
  },
  footer: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
});

export default Sheet;
