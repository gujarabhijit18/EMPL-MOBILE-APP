/**
 * 🔔 Header With Badge Component
 * A reusable header component that displays a notification badge
 * Can be used in screen headers to show module-specific notification counts
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useModuleBadges, ModuleType } from "../../contexts/ModuleBadgeContext";
import NotificationBadge from "./NotificationBadge";

interface HeaderWithBadgeProps {
  title: string;
  subtitle?: string;
  module?: ModuleType;
  onBackPress?: () => void;
  onNotificationPress?: () => void;
  showBackButton?: boolean;
  showNotificationIcon?: boolean;
  headerStyle?: ViewStyle;
  titleColor?: string;
  subtitleColor?: string;
  iconColor?: string;
  rightComponent?: React.ReactNode;
}

const HeaderWithBadge: React.FC<HeaderWithBadgeProps> = ({
  title,
  subtitle,
  module,
  onBackPress,
  onNotificationPress,
  showBackButton = true,
  showNotificationIcon = true,
  headerStyle,
  titleColor = "#ffffff",
  subtitleColor = "rgba(255,255,255,0.8)",
  iconColor = "#ffffff",
  rightComponent,
}) => {
  const { badges, totalUnread } = useModuleBadges();
  
  // Get badge count for specific module or total
  const badgeCount = module ? badges[module] : totalUnread;

  return (
    <View style={[styles.header, headerStyle]}>
      {/* Left Section - Back Button */}
      <View style={styles.leftSection}>
        {showBackButton && onBackPress && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={iconColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Center Section - Title */}
      <View style={styles.centerSection}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right Section - Notification Icon or Custom Component */}
      <View style={styles.rightSection}>
        {rightComponent ? (
          rightComponent
        ) : showNotificationIcon && onNotificationPress ? (
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Ionicons name="notifications-outline" size={24} color={iconColor} />
              <NotificationBadge
                count={badgeCount}
                size="small"
                position="topRight"
                style={styles.badge}
              />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftSection: {
    width: 48,
    alignItems: "flex-start",
  },
  centerSection: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  rightSection: {
    width: 48,
    alignItems: "flex-end",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapper: {
    position: "relative",
  },
  badge: {
    top: -8,
    right: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
    height: 40,
  },
});

export default HeaderWithBadge;

/**
 * Simple Badge Icon Button
 * A standalone notification icon with badge
 */
export const BadgeIconButton: React.FC<{
  module?: ModuleType;
  onPress?: () => void;
  iconName?: string;
  iconSize?: number;
  iconColor?: string;
  badgeColor?: string;
  style?: ViewStyle;
}> = ({
  module,
  onPress,
  iconName = "notifications-outline",
  iconSize = 24,
  iconColor = "#374151",
  badgeColor = "#ef4444",
  style,
}) => {
  const { badges, totalUnread } = useModuleBadges();
  const badgeCount = module ? badges[module] : totalUnread;

  return (
    <TouchableOpacity
      style={[{ padding: 8 }, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrapper}>
        <Ionicons name={iconName as any} size={iconSize} color={iconColor} />
        <NotificationBadge
          count={badgeCount}
          size="small"
          color={badgeColor}
          position="topRight"
        />
      </View>
    </TouchableOpacity>
  );
};


