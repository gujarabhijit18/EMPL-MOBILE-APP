import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Check, ChevronDown, ChevronUp } from "lucide-react-native";

const screenHeight = Dimensions.get("window").height;

/**
 * 🎯 Select (Expo Compatible)
 * ✅ Works on iOS, Android, and Web (Expo Go)
 * 
 * - Custom dropdown using React Native Modal
 * - No platform-specific APIs
 * - No external API integrations
 */

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  items: { label: string; value: string }[];
  label?: string;
  disabled?: boolean;
  style?: any;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  placeholder = "Select an option",
  items,
  label,
  disabled = false,
  style,
}) => {
  const [open, setOpen] = useState(false);

  const selectedLabel = items.find((item) => item.value === value)?.label;

  return (
    <View style={[styles.container, style]}>
      {/* Optional Label */}
      {label && <Text style={styles.label}>{label}</Text>}

      {/* Trigger Button */}
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.disabledTrigger]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !value && styles.placeholder]}>
          {selectedLabel || placeholder}
        </Text>
        <ChevronDown color="#6B7280" size={18} />
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdown}>
                {/* Header */}
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownTitle}>Select an option</Text>
                  <TouchableOpacity onPress={() => setOpen(false)}>
                    <ChevronUp color="#374151" size={20} />
                  </TouchableOpacity>
                </View>

                {/* Options */}
                <FlatList
                  data={items}
                  keyExtractor={(item) => item.value}
                  contentContainerStyle={{ paddingBottom: 10 }}
                  renderItem={({ item }) => {
                    const isSelected = item.value === value;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.item,
                          isSelected && styles.activeItem,
                        ]}
                        onPress={() => {
                          onValueChange?.(item.value);
                          setOpen(false);
                        }}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            styles.itemText,
                            isSelected && styles.activeItemText,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {isSelected && <Check color="#2563EB" size={16} />}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

/* ✅ Expo-Safe Styling (no elevation or platform-specific shadows) */
const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
    fontWeight: "500",
  },
  trigger: {
    height: 45,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: {
    fontSize: 15,
    color: "#111827",
  },
  placeholder: {
    color: "#9CA3AF",
  },
  disabledTrigger: {
    backgroundColor: "#F3F4F6",
    opacity: 0.6,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    maxHeight: screenHeight * 0.6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingBottom: 5,
    // ✅ Expo-safe subtle shadow (no elevation)
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  dropdownTitle: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activeItem: {
    backgroundColor: "#EFF6FF",
  },
  itemText: {
    fontSize: 15,
    color: "#1F2937",
  },
  activeItemText: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
});

export default Select;