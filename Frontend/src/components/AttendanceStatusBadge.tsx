import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getStatusColor } from "../utils/attendanceStatus";

interface AttendanceStatusBadgeProps {
  status: "on-time" | "early" | "late";
  minutesOffset?: number;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
}

const AttendanceStatusBadge: React.FC<AttendanceStatusBadgeProps> = ({
  status,
  minutesOffset,
  size = "medium",
  showLabel = true,
}) => {
  const colors = getStatusColor(status);
  
  const sizeStyles = {
    small: { width: 28, height: 28, fontSize: 10, iconSize: 12 },
    medium: { width: 36, height: 36, fontSize: 12, iconSize: 14 },
    large: { width: 48, height: 48, fontSize: 14, iconSize: 18 },
  };

  const currentSize = sizeStyles[size];

  const getIcon = () => {
    switch (status) {
      case "on-time":
        return "checkmark-circle";
      case "early":
        return "arrow-up-circle";
      case "late":
        return "alert-circle";
      default:
        return "help-circle";
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          { 
            width: currentSize.width, 
            height: currentSize.height,
            backgroundColor: colors.bg,
          },
        ]}
      >
        <Ionicons
          name={getIcon()}
          size={currentSize.iconSize}
          color={colors.text}
        />
      </View>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.text, fontSize: currentSize.fontSize }]}>
            {colors.label}
          </Text>
          {minutesOffset !== undefined && (
            <Text style={[styles.offset, { color: colors.text, fontSize: currentSize.fontSize - 2 }]}>
              {minutesOffset} min
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

export default AttendanceStatusBadge;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 4,
  },
  badge: {
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  labelContainer: {
    alignItems: "center",
  },
  label: {
    fontWeight: "700",
  },
  offset: {
    fontWeight: "500",
  },
});
