import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TouchableOpacity,
} from "react-native";
import Modal from "react-native-modal";

export interface ContextMenuItemType {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  checked?: boolean;
  radio?: boolean;
  submenu?: ContextMenuItemType[];
}

interface ContextMenuProps {
  visible: boolean;
  onClose: () => void;
  items: ContextMenuItemType[];
  title?: string;
  position?: { top?: number; left?: number; right?: number; bottom?: number };
}

/**
 * ⚡ Context Menu — Expo Compatible
 * - Nested submenus
 * - Checkbox & radio support
 * - Works across iOS, Android, and Web (Expo Go)
 * - No native dependencies
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  onClose,
  items,
  title,
  position = { top: 100, left: 50 },
}) => {
  const [submenu, setSubmenu] = useState<ContextMenuItemType[] | null>(null);
  const [submenuTitle, setSubmenuTitle] = useState<string | null>(null);

  const openSubmenu = (menu: ContextMenuItemType[]) => setSubmenu(menu);
  const closeSubmenu = () => setSubmenu(null);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={() => {
        onClose();
        closeSubmenu();
      }}
      animationIn="fadeIn"
      animationOut="fadeOut"
      backdropOpacity={0.15}
      useNativeDriver
      style={styles.modal}
      hideModalContentWhileAnimating
    >
      {/* Main Menu */}
      <View
        style={[
          styles.menuContainer,
          {
            top: position.top ?? 100,
            left: position.left ?? 50,
          },
        ]}
      >
        {title && <Text style={styles.menuTitle}>{title}</Text>}

        <FlatList
          data={items}
          keyExtractor={(_, idx) => idx.toString()}
          renderItem={({ item }) => (
            <MenuItem
              item={item}
              onPress={() => {
                if (item.submenu) {
                  setSubmenuTitle(item.label);
                  openSubmenu(item.submenu);
                } else {
                  item.onPress?.();
                  onClose();
                }
              }}
            />
          )}
        />
      </View>

      {/* Submenu */}
      {submenu && (
        <View
          style={[
            styles.menuContainer,
            {
              top: position.top ?? 100,
              left: (position.left ?? 50) + 170,
            },
          ]}
        >
          <TouchableOpacity onPress={closeSubmenu} style={styles.backButton}>
            <Text style={styles.submenuBack}>← {submenuTitle}</Text>
          </TouchableOpacity>

          <FlatList
            data={submenu}
            keyExtractor={(_, idx) => idx.toString()}
            renderItem={({ item }) => (
              <MenuItem
                item={item}
                onPress={() => {
                  item.onPress?.();
                  closeSubmenu();
                  onClose();
                }}
              />
            )}
          />
        </View>
      )}
    </Modal>
  );
};

interface MenuItemProps {
  item: ContextMenuItemType;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ item, onPress }) => (
  <Pressable
    onPress={onPress}
    disabled={item.disabled}
    accessibilityRole="menuitem"
    style={({ pressed }) => [
      styles.item,
      item.disabled && { opacity: 0.5 },
      pressed && !item.disabled && { backgroundColor: "#F3F4F6" },
    ]}
  >
    {/* Icon (radio/check) */}
    <View style={styles.iconWrapper}>
      {item.radio ? (
        item.checked ? (
          <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: "#2563EB"}} />
        ) : (
          <View style={styles.radioPlaceholder} />
        )
      ) : item.checked ? (
        <Text style={{color: "#2563EB", fontSize: 14}}>✓</Text>
      ) : null}
    </View>

    {/* Label */}
    <Text
      style={[styles.itemText, item.disabled && { color: "#9CA3AF" }]}
      numberOfLines={1}
    >
      {item.label}
    </Text>

    {/* Submenu Arrow */}
    {item.submenu && <Text style={{color: "#6B7280"}}>›</Text>}
  </Pressable>
);

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  menuContainer: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 4,
    width: 180,
    borderWidth: 1,
    borderColor: "#E5E7EB",

    // ✅ Expo-safe shadow
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  submenuBack: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "500",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  itemText: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
  },
  iconWrapper: {
    width: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  radioPlaceholder: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#9CA3AF",
  },
});

export default ContextMenu;
