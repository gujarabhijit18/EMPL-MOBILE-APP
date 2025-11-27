import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import Modal from "react-native-modal";
// Using text X instead of icon

interface DialogProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationIn?: "zoomIn" | "slideInUp" | "fadeIn";
  animationOut?: "zoomOut" | "slideOutDown" | "fadeOut";
  transparent?: boolean;
}

interface DialogHeaderProps {
  title?: string;
  description?: string;
}

interface DialogFooterProps {
  children?: React.ReactNode;
}

/**
 * 🪟 Dialog (Expo-Compatible)
 * - Uses react-native-modal for animation
 * - Works across Android, iOS, and Web in Expo Go
 * - Scrollable body, header, and footer support
 */
export const Dialog: React.FC<DialogProps> = ({
  visible,
  onClose,
  children,
  animationIn = "zoomIn",
  animationOut = "zoomOut",
  transparent = true,
}) => {
  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={transparent ? 0.6 : 0.3}
      useNativeDriver
      hideModalContentWhileAnimating
      animationIn={animationIn}
      animationOut={animationOut}
      style={styles.modal}
    >
      <View style={styles.dialogContainer}>
        {/* ❌ Close Button */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.closeButtonText}>X</Text>
        </TouchableOpacity>

        {/* 🧾 Scrollable Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
};

/* ---------- Header & Footer Components ---------- */

export const DialogHeader: React.FC<DialogHeaderProps> = ({
  title,
  description,
}) => (
  <View style={styles.header}>
    {title && <Text style={styles.title}>{title}</Text>}
    {description && <Text style={styles.description}>{description}</Text>}
  </View>
);

export const DialogFooter: React.FC<DialogFooterProps> = ({ children }) => (
  <View style={styles.footer}>{children}</View>
);

export const DialogTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <Text style={styles.title}>{children}</Text>;

export const DialogDescription: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <Text style={styles.description}>{children}</Text>;

export const DialogClose: React.FC<{ onPress: () => void }> = ({
  onPress,
}) => (
  <TouchableOpacity
    accessibilityRole="button"
    onPress={onPress}
    style={styles.closeButton}
    activeOpacity={0.7}
  >
    <Text style={styles.closeButtonText}>X</Text>
  </TouchableOpacity>
);

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  modal: {
    justifyContent: "center",
    alignItems: "center",
    margin: 0,
  },
  dialogContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "85%",
    maxHeight: "80%",
    padding: 20,
    overflow: "hidden",

    // ✅ Expo-safe shadow
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
    borderRadius: 20,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  scrollContainer: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
});

export default Dialog;
