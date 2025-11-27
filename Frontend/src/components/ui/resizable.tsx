import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  Dimensions,
} from "react-native";
import { GripVertical } from "lucide-react-native";
import * as Haptics from "expo-haptics"; // ✅ Works perfectly in Expo

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

/**
 * 🎚️ ResizablePanelGroup (Expo Compatible)
 * ✅ Works seamlessly on iOS, Android, and Web (Expo Go)
 * 
 * Features:
 * - Horizontal or Vertical resizing
 * - Smooth animation via Animated API
 * - Optional Expo Haptic feedback
 */

interface ResizablePanelGroupProps {
  direction?: "horizontal" | "vertical";
  children: React.ReactNode[]; // two panels required
  initial?: number; // initial % for the first panel (default 50)
}

export const ResizablePanelGroup: React.FC<ResizablePanelGroupProps> = ({
  direction = "horizontal",
  children,
  initial = 50,
}) => {
  const [size, setSize] = useState(initial);
  const containerSize = useRef(
    direction === "horizontal" ? screenWidth : screenHeight
  );
  const animatedValue = useRef(new Animated.Value(initial)).current;

  // Handle live drag movement
  const handlePanMove = (gestureState: any) => {
    const delta =
      direction === "horizontal"
        ? (gestureState.dx / containerSize.current) * 100
        : (gestureState.dy / containerSize.current) * 100;

    const newSize = Math.max(10, Math.min(90, size + delta)); // clamp 10–90%
    animatedValue.setValue(newSize);
  };

  // Handle drag release (save size + haptic)
  const handlePanRelease = async (gestureState: any) => {
    const delta =
      direction === "horizontal"
        ? (gestureState.dx / containerSize.current) * 100
        : (gestureState.dy / containerSize.current) * 100;

    const finalSize = Math.max(10, Math.min(90, size + delta));
    setSize(finalSize);
    animatedValue.setValue(finalSize);

    // ✅ Soft vibration feedback using Expo Haptics
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Web fallback (ignore)
    }
  };

  // PanResponder for handling drag events
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => handlePanMove(gestureState),
      onPanResponderRelease: (_, gestureState) =>
        handlePanRelease(gestureState),
    })
  ).current;

  // Layout event to get actual container size
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    containerSize.current = direction === "horizontal" ? width : height;
  };

  // Smooth size interpolation for panel resizing
  const firstPanelStyle =
    direction === "horizontal"
      ? {
        width: animatedValue.interpolate({
          inputRange: [0, 100],
          outputRange: ["0%", "100%"],
        }),
      }
      : {
        height: animatedValue.interpolate({
          inputRange: [0, 100],
          outputRange: ["0%", "100%"],
        }),
      };

  return (
    <View
      style={[
        styles.container,
        direction === "horizontal" ? styles.row : styles.column,
      ]}
      onLayout={onLayout}
    >
      {/* Left or Top Panel */}
      <Animated.View style={[styles.panel, firstPanelStyle]}>
        {children[0]}
      </Animated.View>

      {/* Draggable Handle */}
      <View
        style={[
          styles.handle,
          direction === "horizontal"
            ? styles.handleHorizontal
            : styles.handleVertical,
        ]}
        {...panResponder.panHandlers}
      >
        <GripVertical
          size={18}
          color="#6B7280"
          style={
            direction === "vertical"
              ? { transform: [{ rotate: "90deg" }] as unknown as any }
              : undefined
          }
        />
      </View>

      {/* Right or Bottom Panel */}
      <View style={[styles.panel, { flex: 1 }]}>{children[1]}</View>
    </View>
  );
};

/* Optional subpanel wrapper */
export const ResizablePanel = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.panel}>{children}</View>
);

/* ✅ Expo-Safe Styling (No Elevation or Native Shadows) */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  row: {
    flexDirection: "row",
  },
  column: {
    flexDirection: "column",
  },
  panel: {
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
  },
  handle: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    // ✅ Cross-platform subtle shadow
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  handleHorizontal: {
    width: 14,
  },
  handleVertical: {
    height: 14,
  },
});

export default ResizablePanelGroup;
