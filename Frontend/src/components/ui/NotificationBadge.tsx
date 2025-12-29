/**
 * 🔔 Notification Badge Component
 * A reusable badge component for displaying notification counts
 * Consistent styling across the app
 */
import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";

interface NotificationBadgeProps {
  count: number;
  size?: "small" | "medium" | "large";
  color?: string;
  textColor?: string;
  maxCount?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  showZero?: boolean;
  position?: "topRight" | "topLeft" | "bottomRight" | "bottomLeft" | "inline";
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  size = "medium",
  color = "#ef4444",
  textColor = "#ffffff",
  maxCount = 99,
  style,
  textStyle,
  showZero = false,
  position = "topRight",
}) => {
  // Don't render if count is 0 and showZero is false
  if (count <= 0 && !showZero) {
    return null;
  }

  // Format the count display
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  // Get size-specific styles
  const sizeStyles = getSizeStyles(size as "small" | "medium" | "large");

  // Get position styles
  const positionStyles = getPositionStyles(position as "topRight" | "topLeft" | "bottomRight" | "bottomLeft" | "inline");

  return (
    <View
      style={[
        styles.badge,
        sizeStyles.container,
        positionStyles,
        { backgroundColor: color },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          sizeStyles.text,
          { color: textColor },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {displayCount}
      </Text>
    </View>
  );
};

// Size configurations
const getSizeStyles = (size: "small" | "medium" | "large") => {
  switch (size) {
    case "small":
      return {
        container: {
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          paddingHorizontal: 4,
        },
        text: {
          fontSize: 9,
          lineHeight: 12,
        },
      };
    case "large":
      return {
        container: {
          minWidth: 24,
          height: 24,
          borderRadius: 12,
          paddingHorizontal: 6,
        },
        text: {
          fontSize: 12,
          lineHeight: 16,
        },
      };
    case "medium":
    default:
      return {
        container: {
          minWidth: 20,
          height: 20,
          borderRadius: 10,
          paddingHorizontal: 5,
        },
        text: {
          fontSize: 10,
          lineHeight: 14,
        },
      };
  }
};

// Position configurations
const getPositionStyles = (position: NotificationBadgeProps["position"]): ViewStyle => {
  switch (position) {
    case "topLeft":
      return {
        position: "absolute",
        top: -6,
        left: -6,
      };
    case "bottomRight":
      return {
        position: "absolute",
        bottom: -6,
        right: -6,
      };
    case "bottomLeft":
      return {
        position: "absolute",
        bottom: -6,
        left: -6,
      };
    case "inline":
      return {
        position: "relative",
        marginLeft: 8,
      };
    case "topRight":
    default:
      return {
        position: "absolute",
        top: -6,
        right: -6,
      };
  }
};

const styles = StyleSheet.create({
  badge: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  text: {
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default NotificationBadge;

/**
 * Badge Dot Component
 * A simple dot indicator without count
 */
export const BadgeDot: React.FC<{
  color?: string;
  size?: number;
  style?: ViewStyle;
  visible?: boolean;
}> = ({ color = "#ef4444", size = 10, style, visible = true }) => {
  if (!visible) return null;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          position: "absolute",
          top: -2,
          right: -2,
          borderWidth: 2,
          borderColor: "#ffffff",
        },
        style,
      ]}
    />
  );
};

/**
 * Icon with Badge wrapper
 * Wraps any icon component with a badge
 */
export const IconWithBadge: React.FC<{
  children: React.ReactNode;
  count: number;
  badgeProps?: Partial<NotificationBadgeProps>;
  containerStyle?: ViewStyle;
}> = ({ children, count, badgeProps, containerStyle }) => {
  return (
    <View style={[{ position: "relative" }, containerStyle]}>
      {children}
      <NotificationBadge count={count} size="small" {...badgeProps} />
    </View>
  );
};
