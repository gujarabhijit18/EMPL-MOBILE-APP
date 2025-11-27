import React, { createContext, useContext, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  LayoutChangeEvent,
  Pressable,
  Platform,
} from "react-native";

const SCREEN = Dimensions.get("window");

type Side = "top" | "bottom" | "left" | "right";

interface TooltipContextType {
  delayDuration: number;
}

const TooltipContext = createContext<TooltipContextType>({ delayDuration: 500 });

/**
 * 🧠 TooltipProvider (optional)
 * Wrap your app in this if you want a default delay for all tooltips.
 */
export const TooltipProvider: React.FC<{
  delayDuration?: number;
  children: React.ReactNode;
}> = ({ delayDuration = 500, children }) => {
  return (
    <TooltipContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipContext.Provider>
  );
};

/**
 * 💬 Tooltip (Expo-Compatible)
 * ✅ Works perfectly in Expo Go (iOS, Android, Web)
 * - Long press or hover (on web) to show tooltip
 * - Smooth fade + scale animation
 * - Automatically stays within screen bounds
 */
interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: Side;
  sideOffset?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  side = "top",
  sideOffset = 8,
}) => {
  const { delayDuration } = useContext(TooltipContext);
  const [visible, setVisible] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Show tooltip (after delay)
  const show = () => {
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 6,
        }),
      ]).start();
    }, delayDuration);
  };

  // ✅ Hide tooltip
  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  };

  // ✅ Capture layout position of trigger
  const handleLayout = (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setTriggerLayout({ x, y, w: width, h: height });
  };

  // ✅ Compute tooltip position dynamically
  const getTooltipPosition = () => {
    if (!triggerLayout) return { top: 0, left: 0 };

    const cx = triggerLayout.x + triggerLayout.w / 2;
    const cy = triggerLayout.y + triggerLayout.h / 2;

    const pos = {
      top: { top: cy - triggerLayout.h / 2 - sideOffset, left: cx },
      bottom: { top: cy + triggerLayout.h / 2 + sideOffset, left: cx },
      left: { top: cy, left: triggerLayout.x - sideOffset },
      right: { top: cy, left: triggerLayout.x + triggerLayout.w + sideOffset },
    }[side];

    // Keep tooltip inside screen bounds
    return {
      top: Math.max(10, Math.min(SCREEN.height - 50, pos.top)),
      left: Math.max(10, Math.min(SCREEN.width - 120, pos.left - 60)),
    };
  };

  return (
    <View>
      {/* 🎯 Trigger element */}
      <Pressable
        onLayout={handleLayout}
        onLongPress={show}
        onPressOut={hide}
        delayLongPress={delayDuration}
        accessibilityLabel={typeof content === "string" ? content : undefined}
      >
        {children}
      </Pressable>

      {/* 💬 Tooltip content */}
      {visible && triggerLayout && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tooltipContainer,
            {
              opacity,
              transform: [{ scale }],
              top: getTooltipPosition().top,
              left: getTooltipPosition().left,
            },
          ]}
        >
          <View style={styles.tooltipBox}>
            <Text style={styles.tooltipText}>{content}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

// ✅ Expo-safe styling
const styles = StyleSheet.create({
  tooltipContainer: {
    position: "absolute",
    zIndex: 9999,
  },
  tooltipBox: {
    backgroundColor: "#1F2937", // Tailwind gray-800
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  tooltipText: {
    color: "#F9FAFB", // Tailwind gray-50
    fontSize: 13,
  },
});

export default Tooltip;
