import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Modal, Portal, Button, useTheme } from "react-native-paper";
import Icon from "react-native-vector-icons/Ionicons";

interface AlertDialogProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  variant?: "default" | "destructive";
  icon?: string;
}

/**
 * ✅ Fully Expo-Compatible Alert Dialog
 * Works with `react-native-paper` and `react-native-vector-icons`
 */
export const AlertDialog: React.FC<AlertDialogProps> = ({
  visible,
  onDismiss,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  variant = "default",
  icon = "alert-circle-outline",
}) => {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          {
            backgroundColor: theme.colors.background,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 6,
          },
        ]}
      >
        <View style={styles.dialogBox}>
          {/* Icon + Title */}
          <View style={styles.header}>
            <Icon
              name={icon}
              size={44}
              color={variant === "destructive" ? "#EF4444" : theme.colors.primary}
            />
            <Text style={styles.title}>{title}</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>{description}</Text>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              textColor="#6B7280"
              style={styles.cancelButton}
            >
              {cancelText}
            </Button>

            <Button
              mode="contained"
              onPress={onConfirm}
              style={[
                styles.confirmButton,
                variant === "destructive" && { backgroundColor: "#EF4444" },
              ]}
            >
              {confirmText}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

/**
 * Optional Trigger Button — can be used anywhere to open dialog
 */
export const AlertDialogTrigger: React.FC<{ onPress: () => void; label: string }> = ({
  onPress,
  label,
}) => (
  <TouchableOpacity
    style={styles.triggerButton}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={styles.triggerText}>{label}</Text>
  </TouchableOpacity>
);

// ✅ Styles (Expo-safe)
const styles = StyleSheet.create({
  modalContainer: {
    marginHorizontal: 24,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignSelf: "center",
  },
  dialogBox: {
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
    textAlign: "center",
  },
  description: {
    color: "#6B7280",
    textAlign: "center",
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  cancelButton: {
    borderRadius: 10,
    flex: 1,
  },
  confirmButton: {
    borderRadius: 10,
    flex: 1,
  },
  triggerButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: "center",
  },
  triggerText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
