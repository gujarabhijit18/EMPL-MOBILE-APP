import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
} from "react-native";
import { ChevronDown, Check } from "lucide-react-native";

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  items: { label: string; value: string }[];
  label?: string;
  required?: boolean;
  disabled?: boolean;
  style?: any;
  textStyle?: any;
  activeColor?: string;
  chevronColor?: string;
  error?: string;
  containerStyle?: any;
  leftIcon?: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  placeholder = "Select an item",
  items,
  label,
  required,
  activeColor = "#1D4ED8",
  chevronColor = "#1E40AF",
  disabled = false,
  style,
  textStyle,
  error,
  containerStyle,
  leftIcon,
}) => {
  const [open, setOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<View>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const selectedLabel = items.find((item) => item.value === value)?.label;

  const handleOpen = () => {
    if (disabled) return;

    triggerRef.current?.measure((x, y, width, height, pageX, pageY) => {
      // Calculate position
      let top = pageY + height;

      // Prevent overflow bottom
      const listHeight = Math.min(items.length * 48 + 10, 250);
      if (top + listHeight > screenHeight - 20) {
        top = pageY - listHeight;
      }

      setDropdownPosition({ top, left: pageX, width });
      setOpen(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setOpen(false));
  };

  const handleSelect = (itemValue: string) => {
    onValueChange?.(itemValue);
    handleClose();
  };

  return (
    <View style={[styles.mainContainer, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.requiredStar}> *</Text>}
        </View>
      )}

      <View
        ref={triggerRef}
        collapsable={false}
        style={[
          styles.triggerContainer,
          error ? styles.errorBorder : styles.normalBorder,
          disabled && styles.disabledTrigger,
          style,
        ]}
      >
        <TouchableOpacity
          style={styles.triggerContent}
          onPress={handleOpen}
          activeOpacity={0.7}
          disabled={disabled}
        >
          {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
          <Text
            numberOfLines={1}
            style={[styles.triggerText, !value && styles.placeholderText, textStyle]}
          >
            {selectedLabel || placeholder}
          </Text>
          <View style={styles.chevronBox}>
            <ChevronDown color={chevronColor} size={20} />
          </View>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.dropdownList,
                {
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  width: dropdownPosition.width,
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <FlatList
                data={items}
                keyExtractor={(item) => item.value}
                showsVerticalScrollIndicator={true}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                style={{ maxHeight: 250 }}
                renderItem={({ item }) => {
                  const isSelected = item.value === value;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.item,
                        isSelected && styles.selectedItem,
                      ]}
                      onPress={() => handleSelect(item.value)}
                      activeOpacity={0.6}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          isSelected && { color: activeColor, fontWeight: '600' },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {isSelected && (
                        <Check color={activeColor} size={16} strokeWidth={3} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    width: "100%",
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: "row",
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  requiredStar: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "700",
  },
  triggerContainer: {
    height: 48,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderWidth: 1.5,
  },
  normalBorder: {
    borderColor: "#E5E7EB",
  },
  errorBorder: {
    borderColor: "#EF4444",
  },
  disabledTrigger: {
    backgroundColor: "#F3F4F6",
    opacity: 0.7,
  },
  triggerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingHorizontal: 12,
  },
  placeholderText: {
    color: "#9CA3AF",
  },
  chevronBox: {
    width: 44,
    height: "100%",
    backgroundColor: "#DBEAFE", // Light blue as in the image
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1.5,
    borderLeftColor: "#E5E7EB",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  dropdownList: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
    }),
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  selectedItem: {
    backgroundColor: "#EFF6FF", // Soft background for selected items
  },
  itemText: {
    fontSize: 15,
    color: "#374151",
    flex: 1,
  },
  selectedItemText: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
    paddingHorizontal: 2,
  },
  leftIconContainer: {
    paddingLeft: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Select;