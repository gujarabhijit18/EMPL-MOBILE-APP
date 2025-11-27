import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  LayoutChangeEvent,
} from "react-native";
import { ChevronDown } from "lucide-react-native";

export interface CollapsibleProps {
  title?: string;
  open?: boolean;
  duration?: number;
  onToggle?: (isOpen: boolean) => void;
  children: React.ReactNode;
  icon?: boolean;
  style?: object;
}

/**
 * Collapsible (Expo Compatible)
 * - Works perfectly in Expo Go (no native linking)
 * - Animated expand/collapse
 * - Controlled/uncontrolled
 * - Clean cross-platform shadows
 */
export const Collapsible: React.FC<CollapsibleProps> = ({
  title = "Expand",
  open = false,
  duration = 250,
  onToggle,
  children,
  icon = true,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(open);
  const [contentHeight, setContentHeight] = useState(0);
  const animation = useRef(new Animated.Value(open ? 1 : 0)).current;

  // Sync external open prop
  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  // Animate open/close
  useEffect(() => {
    Animated.timing(animation, {
      toValue: isOpen ? 1 : 0,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false, // height cannot use native driver
    }).start();
  }, [isOpen, duration, animation]);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    onToggle?.(next);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const measuredHeight = event.nativeEvent.layout.height;
    if (measuredHeight !== contentHeight) setContentHeight(measuredHeight);
  };

  const containerHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });

  const rotateIcon = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        activeOpacity={0.7}
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
      >
        <Text style={styles.title}>{title}</Text>
        {icon && (
          <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
            <ChevronDown size={20} color="#374151" />
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Animated Content */}
      <Animated.View style={[styles.collapsible, { height: containerHeight }]}>
        <View style={styles.contentWrapper} onLayout={handleLayout}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#E5E7EB", // gray-200
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",

    // Expo-safe cross-platform shadow
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  collapsible: {
    overflow: "hidden",
  },
  contentWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});

export default Collapsible;
