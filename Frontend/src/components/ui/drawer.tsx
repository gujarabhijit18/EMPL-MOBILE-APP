import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from "react-native";
import Modal from "react-native-modal";

interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number;
  overlayOpacity?: number;
  shouldScaleBackground?: boolean;
}

interface DrawerHeaderProps {
  children?: React.ReactNode;
}
interface DrawerFooterProps {
  children?: React.ReactNode;
}
interface DrawerTitleProps {
  children?: React.ReactNode;
}
interface DrawerDescriptionProps {
  children?: React.ReactNode;
}

/**
 * 📱 Drawer — Expo Compatible
 * - Works on Android, iOS & Web in Expo Go
 * - Includes swipe-to-close, animations, and safe shadow styling
 */
export const Drawer: React.FC<DrawerProps> = ({
  visible,
  onClose,
  children,
  height = 400,
  overlayOpacity = 0.6,
  shouldScaleBackground = false,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const [isDragging, setIsDragging] = useState(false);

  // PanResponder for swipe-down gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
          setIsDragging(true);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        setIsDragging(false);
        if (gesture.dy > 120) {
          Animated.timing(translateY, {
            toValue: height,
            duration: 200,
            useNativeDriver: true,
          }).start(onClose);
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      useNativeDriver
      hideModalContentWhileAnimating
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={overlayOpacity}
      style={styles.modal}
    >
      {/* Optional background scaling effect */}
      {shouldScaleBackground && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ scale: isDragging ? 0.98 : 1 }] },
          ]}
        />
      )}

      <Animated.View
        style={[
          styles.container,
          { height, transform: [{ translateY }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Handle Indicator */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Drawer Content */}
        {children}
      </Animated.View>
    </Modal>
  );
};

/* Subcomponents */
export const DrawerContent: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => <View style={styles.content}>{children}</View>;

export const DrawerHeader: React.FC<DrawerHeaderProps> = ({ children }) => (
  <View style={styles.header}>{children}</View>
);

export const DrawerFooter: React.FC<DrawerFooterProps> = ({ children }) => (
  <View style={styles.footer}>{children}</View>
);

export const DrawerTitle: React.FC<DrawerTitleProps> = ({ children }) => (
  <Text style={styles.title}>{children}</Text>
);

export const DrawerDescription: React.FC<DrawerDescriptionProps> = ({
  children,
}) => <Text style={styles.description}>{children}</Text>;

export const DrawerClose: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity
    accessibilityRole="button"
    onPress={onPress}
    style={styles.closeButton}
    activeOpacity={0.8}
  >
    <Text style={styles.closeText}>×</Text>
  </TouchableOpacity>
);

/* Styles */
const styles = StyleSheet.create({
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    paddingBottom: 24,

    // ✅ Expo-safe shadow (no elevation)
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },
  handleContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  handle: {
    width: 60,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    padding: 16,
    alignItems: "center",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 10,
  },
  closeText: {
    fontSize: 24,
    color: "#6B7280",
  },
});

export default Drawer;
