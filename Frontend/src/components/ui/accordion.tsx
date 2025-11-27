import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  Easing,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

// ✅ Enable LayoutAnimation safely for Android (Expo-compatible)
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  try {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  } catch (e) {
    console.warn("LayoutAnimation not supported on this Android build.");
  }
}

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * 📂 Accordion Component
 * ✅ 100% Compatible with Expo (No native dependencies)
 */
export const Accordion: React.FC<AccordionProps> = ({
  title,
  children,
  initiallyOpen = false,
  icon = "chevron-down",
  style,
}) => {
  const [expanded, setExpanded] = useState(initiallyOpen);
  const rotateAnim = useRef(new Animated.Value(initiallyOpen ? 1 : 0)).current;

  // ✅ Toggle accordion open/close
  const toggleAccordion = () => {
    // LayoutAnimation works in Expo without linking
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  // ✅ Animate arrow rotation
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={[styles.accordionContainer, style]}>
      {/* Header */}
      <TouchableOpacity
        onPress={toggleAccordion}
        activeOpacity={0.7}
        style={styles.header}
      >
        <Text style={styles.title}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Icon name={icon} size={22} color="#2563EB" />
        </Animated.View>
      </TouchableOpacity>

      {/* Content */}
      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
};

/**
 * Optional: Wrapper for grouped accordions
 */
export const AccordionGroup: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <View style={styles.group}>{children}</View>;
};

// ✅ Styles (Expo Safe)
const styles = StyleSheet.create<{
  group: ViewStyle;
  accordionContainer: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  content: ViewStyle;
}>({
  group: {
    marginVertical: 4,
  },
  accordionContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginVertical: 6,
    overflow: "hidden",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    elevation: 2,
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
  content: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
  },
});
