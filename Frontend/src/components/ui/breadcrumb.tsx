import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { ChevronRight, MoreHorizontal } from "lucide-react-native";

interface IconProps {
  color?: string;
  size?: number;
}

/**
 * ✅ Wrapper for Lucide icons (Expo-safe)
 */
const LucideIconWrapper: React.FC<
  IconProps & { icon: React.ComponentType<IconProps> }
> = ({ icon: Icon, color, size }) => <Icon color={color} size={size} />;

interface BreadcrumbProps {
  children: React.ReactNode;
  separator?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface BreadcrumbItemProps {
  label: string;
  onPress?: () => void;
  isCurrentPage?: boolean;
  separator?: React.ReactNode;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * ✅ Breadcrumb container (Expo-compatible)
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({ children, style }) => {
  return <View style={[styles.container, style]}>{children}</View>;
};

/**
 * ✅ Breadcrumb item (clickable or active)
 */
export const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({
  label,
  onPress,
  isCurrentPage = false,
  separator = (
    <LucideIconWrapper icon={ChevronRight} color="#6B7280" size={14} />
  ),
  textStyle,
}) => {
  return (
    <View style={styles.itemContainer}>
      <TouchableOpacity
        disabled={isCurrentPage}
        onPress={onPress}
        activeOpacity={0.6}
        accessibilityRole="link"
        accessibilityLabel={label}
        style={styles.item}
      >
        <Text
          style={[
            styles.text,
            isCurrentPage ? styles.activeText : styles.linkText,
            textStyle,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>

      {!isCurrentPage && <View style={styles.separator}>{separator}</View>}
    </View>
  );
};

/**
 * ✅ Breadcrumb ellipsis (for long paths)
 */
export const BreadcrumbEllipsis: React.FC = () => (
  <View style={styles.ellipsis}>
    <LucideIconWrapper icon={MoreHorizontal} color="#6B7280" size={16} />
  </View>
);

const styles = StyleSheet.create<{
  container: ViewStyle;
  itemContainer: ViewStyle;
  item: ViewStyle;
  text: TextStyle;
  linkText: TextStyle;
  activeText: TextStyle;
  separator: ViewStyle;
  ellipsis: ViewStyle;
}>({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  item: {
    paddingVertical: 2,
  },
  text: {
    fontSize: 14,
  },
  linkText: {
    color: "#2563EB", // blue-600
  },
  activeText: {
    color: "#111827", // gray-900
    fontWeight: "600",
  },
  separator: {
    marginHorizontal: 6,
  },
  ellipsis: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Breadcrumb;
