import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

type AlertVariant = "default" | "destructive";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  description?: string;
  icon?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * ✅ Expo-Compatible Alert Component
 * Works perfectly in Expo Go (no Android Studio or native setup needed)
 */
export const Alert: React.FC<AlertProps> = ({
  variant = "default",
  title,
  description,
  icon = "information-circle-outline",
  children,
  style,
}) => {
  const isDestructive = variant === "destructive";

  return (
    <View
      style={[
        styles.container,
        isDestructive ? styles.destructive : styles.default,
        style,
      ]}
    >
      <Icon
        name={icon}
        size={24}
        color={isDestructive ? "#DC2626" : "#2563EB"}
      />

      <View style={styles.textContainer}>
        {title && (
          <Text
            style={[
              styles.title,
              isDestructive && { color: "#DC2626" },
            ]}
          >
            {title}
          </Text>
        )}

        {description && (
          <Text
            style={[
              styles.description,
              isDestructive && { color: "#7F1D1D" },
            ]}
          >
            {description}
          </Text>
        )}

        {children}
      </View>
    </View>
  );
};

// ✅ Optional subcomponents for cleaner syntax
export const AlertTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <Text style={styles.title}>{children}</Text>;

export const AlertDescription: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <Text style={styles.description}>{children}</Text>;

// ✅ Styles (Expo Safe)
const styles = StyleSheet.create<{
  container: ViewStyle;
  default: ViewStyle;
  destructive: ViewStyle;
  icon: ViewStyle;
  textContainer: ViewStyle;
  title: TextStyle;
  description: TextStyle;
}>({
  container: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    paddingLeft: 44,
    position: "relative",
    marginVertical: 6,
  },
  default: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  destructive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  icon: {
    position: "absolute",
    left: 14,
    top: 16,
  },
  textContainer: {
    flexDirection: "column",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
});
