import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Menu, Divider, Provider } from "react-native-paper";
import { Check, ChevronDown, Circle } from "lucide-react-native";

interface DropdownMenuProps {
  triggerLabel: string;
  items: {
    label: string;
    onPress?: () => void;
    disabled?: boolean;
    icon?: React.ReactNode;
    checked?: boolean;
    radio?: boolean;
    group?: string;
  }[];
  width?: number | "auto" | `${number}%`;
}

/**
 * 🧭 Dropdown Menu (Expo Compatible)
 * ✅ Works on iOS, Android & Web (Expo Go)
 * 🧩 Based on react-native-paper's Menu API
 */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  triggerLabel,
  items,
  width = 180,
}) => {
  const [visible, setVisible] = useState(false);

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  return (
    <Provider>
      <View style={styles.container}>
        {/* Trigger Button */}
        <Menu
          visible={visible}
          onDismiss={closeMenu}
          anchor={
            <Pressable
              style={({ pressed }) => [
                styles.trigger,
                pressed && { opacity: 0.85 },
              ]}
              onPress={openMenu}
              accessibilityRole="button"
              accessibilityLabel="Open dropdown menu"
            >
              <Text style={styles.triggerText}>{triggerLabel}</Text>
              <ChevronDown size={16} color="#6B7280" />
            </Pressable>
          }
          contentStyle={[styles.menuContent, { width }]}
        >
          {items.map((item, index) => (
            <React.Fragment key={index}>
              <Menu.Item
                onPress={() => {
                  closeMenu();
                  if (!item.disabled) item.onPress?.();
                }}
                titleStyle={[
                  styles.menuText,
                  item.disabled && { color: "#9CA3AF" },
                ]}
                disabled={item.disabled}
                leadingIcon={() =>
                  item.radio ? (
                    item.checked ? (
                      <Circle size={10} color="#2563EB" fill="#2563EB" />
                    ) : (
                      <Circle size={10} color="#9CA3AF" />
                    )
                  ) : item.checked ? (
                    <Check size={14} color="#2563EB" />
                  ) : (
                    item.icon || undefined
                  )
                }
                title={item.label}
              />
              {index !== items.length - 1 && (
                <Divider style={styles.divider} />
              )}
            </React.Fragment>
          ))}
        </Menu>
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 150,
  },
  triggerText: {
    fontSize: 15,
    color: "#111827",
    marginRight: 4,
  },
  menuContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    // ✅ Expo-safe shadow (no elevation)
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  menuText: {
    fontSize: 14,
    color: "#111827",
  },
  divider: {
    backgroundColor: "#E5E7EB",
    height: 1,
  },
});

export default DropdownMenu;
