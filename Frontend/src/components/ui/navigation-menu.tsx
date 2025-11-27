import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { Menu } from "react-native-paper";
import { ChevronDown } from "lucide-react-native";

/**
 * 📱 Navigation Menu (Expo Compatible)
 * ✅ Works in Expo Go (iOS, Android, Web)
 * - Smooth dropdown animation
 * - Built using react-native-paper + lucide-react-native
 */
export const NavigationMenu = ({ menus }: NavigationMenuProps) => {
  return (
    <View style={styles.menuBar}>
      {menus.map((menu, index) => (
        <NavigationMenuItem key={index} {...menu} />
      ))}
    </View>
  );
};

interface NavigationMenuProps {
  menus: {
    label: string;
    items: { label: string; onPress?: () => void }[];
  }[];
}

/** 🔽 Single Dropdown Menu */
const NavigationMenuItem = ({
  label,
  items,
}: {
  label: string;
  items: { label: string; onPress?: () => void }[];
}) => {
  const [visible, setVisible] = useState(false);
  const rotateAnim = useState(new Animated.Value(0))[0];

  const toggleMenu = () => {
    Animated.timing(rotateAnim, {
      toValue: visible ? 0 : 1,
      duration: 200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
    setVisible(!visible);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.trigger, visible && styles.triggerActive]}
          onPress={toggleMenu}
        >
          <Text style={styles.triggerText}>{label}</Text>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <ChevronDown size={14} color="#374151" />
          </Animated.View>
        </TouchableOpacity>
      }
      contentStyle={styles.dropdown}
    >
      {items.map((item, idx) => (
        <TouchableOpacity
          key={idx}
          style={styles.menuItem}
          activeOpacity={0.7}
          onPress={() => {
            item.onPress?.();
            setVisible(false);
          }}
        >
          <Text style={styles.menuText}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </Menu>
  );
};

/* ------------------------------
 * 🎨 Styles (Expo-safe)
 * ------------------------------ */
const styles = StyleSheet.create({
  menuBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    // ✅ Expo-safe shadow instead of elevation
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: "#F9FAFB",
    marginHorizontal: 4,
  },
  triggerActive: {
    backgroundColor: "#E0E7FF", // light indigo
  },
  triggerText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    marginRight: 6,
  },
  dropdown: {
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 4,
    // ✅ Expo-safe shadow (no Android elevation)
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  menuText: {
    fontSize: 14,
    color: "#111827",
  },
});

export default NavigationMenu;
