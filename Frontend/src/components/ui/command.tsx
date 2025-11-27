import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Modal from "react-native-modal";
// @ts-ignore
import { Search } from "lucide-react-native";

interface CommandItemProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  shortcut?: string;
}

interface CommandGroupProps {
  title: string;
  items: CommandItemProps[];
}

interface CommandPaletteProps {
  visible: boolean;
  onClose: () => void;
  groups: CommandGroupProps[];
  placeholder?: string;
}

/**
 * ⚡ CommandPalette (Expo Compatible)
 * ShadCN-inspired command modal for React Native (Expo, iOS, Android, Web)
 * - Animated modal
 * - Keyboard-aware
 * - Search filter
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  visible,
  onClose,
  groups,
  placeholder = "Search commands...",
}) => {
  const [search, setSearch] = useState("");

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      animationIn="zoomIn"
      animationOut="zoomOut"
      backdropTransitionOutTiming={0}
      useNativeDriver
      backdropColor="rgba(0,0,0,0.4)"
      style={styles.modal}
      hideModalContentWhileAnimating
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        {/* 🔍 Search Header */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            autoFocus
            selectionColor="#2563EB"
          />
        </View>

        {/* ⚙️ Command Groups */}
        {filteredGroups.length > 0 ? (
          <FlatList
            data={filteredGroups}
            keyExtractor={(item) => item.title}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View style={styles.group}>
                <Text style={styles.groupTitle}>{item.title}</Text>
                {item.items.map((cmd, idx) => (
                  <TouchableOpacity
                    key={`${item.title}-${idx}`}
                    style={[styles.item, cmd.disabled && { opacity: 0.4 }]}
                    disabled={cmd.disabled}
                    activeOpacity={0.7}
                    onPress={() => {
                      cmd.onPress();
                      onClose();
                    }}
                  >
                    <Text style={styles.itemLabel}>{cmd.label}</Text>
                    {cmd.shortcut && (
                      <Text style={styles.shortcut}>{cmd.shortcut}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No commands found</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: "center",
    margin: 0,
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: "80%",

    // ✅ Expo-safe shadow (no elevation)
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 8,
  },
  group: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  groupTitle: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 6,
  },
  itemLabel: {
    fontSize: 15,
    color: "#111827",
  },
  shortcut: {
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: Platform.OS === "ios" ? "Menlo" : undefined, // removed android monospace
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 14,
  },
});

export default CommandPalette;
