import React from "react";
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import Modal from "react-native-modal";

const { width: screenWidth } = Dimensions.get("window");

/**
 * 📱 React Native Popover (Expo Compatible)
 * ✅ Works on iOS, Android & Web (Expo Go)
 * 
 * Dependencies:
 *   expo install react-native-modal
 */
export const Popover = ({ children }: { children: React.ReactNode }) => {
  return <View>{children}</View>;
};

/** 🟢 Trigger Component */
export const PopoverTrigger = ({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) => (
  <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
    {children}
  </TouchableOpacity>
);

/** 🟣 Content Component (Popover Body) */
export const PopoverContent = ({
  visible,
  onClose,
  children,
  width: popWidth = 280,
  align = "center",
  backgroundColor = "#FFFFFF",
  topOffset = 100,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  align?: "left" | "center" | "right";
  backgroundColor?: string;
  topOffset?: number;
}) => {
  // Alignment for popover placement
  const alignment =
    align === "left"
      ? { alignItems: "flex-start" as const }
      : align === "right"
      ? { alignItems: "flex-end" as const }
      : { alignItems: "center" as const };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={0.3}
      animationIn="fadeInDown"
      animationOut="fadeOutUp"
      animationInTiming={250}
      animationOutTiming={200}
      backdropTransitionOutTiming={0}
      style={[styles.modal, alignment, { marginTop: topOffset }]}
    >
      {/* Tap anywhere outside to close */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Popover Box */}
      <View
        style={[
          styles.popoverBox,
          {
            width: popWidth,
            backgroundColor,
          },
        ]}
      >
        {children}
      </View>
    </Modal>
  );
};

/** 🧾 Styles */
const styles = StyleSheet.create({
  modal: {
    justifyContent: "flex-start",
    margin: 0,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  popoverBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    backgroundColor: "#FFFFFF",
    maxWidth: screenWidth * 0.9,
    // ✅ Expo-safe cross-platform shadow (no elevation)
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});

export default Popover;
