import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { Menu, Divider } from "react-native-paper";
import { Check, ChevronRight, Circle } from "lucide-react-native";

/**
 * 🧱 Menubar (Expo Compatible)
 * ✅ Works in Expo Go (iOS, Android, Web)
 * Built using react-native-paper + lucide-react-native
 */
export const Menubar = ({ menus }: { menus: MenubarMenuProps[] }) => {
  return (
    <View style={styles.menubarContainer}>
      {menus.map((menu, index) => (
        <MenubarMenu key={index} {...menu} />
      ))}
    </View>
  );
};

interface MenubarMenuProps {
  label: string;
  items: MenuItem[];
}

interface MenuItem {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  checked?: boolean;
  radio?: boolean;
  submenu?: MenuItem[];
  shortcut?: string;
}

/* ---------------------------------------------
 * 📂 Single Menu (Trigger + Content)
 * --------------------------------------------- */
const MenubarMenu: React.FC<MenubarMenuProps> = ({ label, items }) => {
  const [visible, setVisible] = useState(false);
  const [submenuVisible, setSubmenuVisible] = useState<number | null>(null);

  const openMenu = () => setVisible(true);
  const closeMenu = () => {
    setVisible(false);
    setSubmenuVisible(null);
  };

  return (
    <Menu
      visible={visible}
      onDismiss={closeMenu}
      anchor={
        <TouchableOpacity
          onPress={openMenu}
          style={styles.menuTrigger}
          activeOpacity={0.8}
        >
          <Text style={styles.menuTriggerText}>{label}</Text>
        </TouchableOpacity>
      }
      contentStyle={styles.menuContent}
    >
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 260 }}
      >
        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            {item.label === "---" ? (
              <Divider style={styles.divider} />
            ) : (
              <View>
                <TouchableOpacity
                  disabled={item.disabled}
                  onPress={() => {
                    if (item.submenu) {
                      setSubmenuVisible(submenuVisible === idx ? null : idx);
                    } else {
                      item.onPress?.();
                      closeMenu();
                    }
                  }}
                  style={[
                    styles.menuItem,
                    item.disabled && styles.disabledItem,
                  ]}
                  activeOpacity={0.7}
                >
                  {/* Left section: Icon + Label */}
                  <View style={styles.menuItemLeft}>
                    {item.radio ? (
                      <View style={styles.iconWrapper}>
                        {item.checked ? (
                          <Circle size={10} color="#2563EB" fill="#2563EB" />
                        ) : (
                          <Circle size={10} color="#9CA3AF" />
                        )}
                      </View>
                    ) : item.checked ? (
                      <View style={styles.iconWrapper}>
                        <Check size={14} color="#2563EB" />
                      </View>
                    ) : (
                      <View style={styles.iconWrapper} />
                    )}

                    <Text style={styles.menuItemText}>{item.label}</Text>
                  </View>

                  {/* Right section: Shortcut or Chevron */}
                  {item.shortcut && (
                    <Text style={styles.shortcutText}>{item.shortcut}</Text>
                  )}
                  {item.submenu && (
                    <ChevronRight size={14} color="#6B7280" />
                  )}
                </TouchableOpacity>

                {/* Submenu */}
                {item.submenu && submenuVisible === idx && (
                  <View style={styles.submenu}>
                    {item.submenu.map((subItem, subIdx) => (
                      <TouchableOpacity
                        key={subIdx}
                        onPress={() => {
                          subItem.onPress?.();
                          closeMenu();
                        }}
                        style={styles.submenuItem}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.submenuText}>
                          {subItem.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </React.Fragment>
        ))}
      </ScrollView>
    </Menu>
  );
};

/* ---------------------------------------------
 * 🎨 Styles (Expo-Safe)
 * --------------------------------------------- */
const styles = StyleSheet.create({
  menubarContainer: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  menuTrigger: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    marginHorizontal: 4,
    // ✅ Expo-safe shadows (no elevation)
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  menuTriggerText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  menuContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrapper: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  menuItemText: {
    fontSize: 14,
    color: "#111827",
  },
  shortcutText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },
  disabledItem: {
    opacity: 0.5,
  },
  submenu: {
    backgroundColor: "#F3F4F6",
    marginLeft: 18,
    borderRadius: 6,
    marginVertical: 4,
    paddingVertical: 4,
  },
  submenuItem: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  submenuText: {
    fontSize: 13,
    color: "#1F2937",
  },
});

export default Menubar;
