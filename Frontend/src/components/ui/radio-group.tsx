import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

/**
 * 📻 RadioGroup (Expo Compatible)
 * ✅ Works perfectly with Expo Go (iOS, Android, Web)
 * - Controlled or uncontrolled modes
 * - Supports custom color and disabled state
 */

interface RadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

interface RadioGroupItemProps {
  label?: string;
  value: string;
  color?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

/* 🔘 RadioGroup — Parent Container */
export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onValueChange,
  children,
  style,
}) => {
  const [internalValue, setInternalValue] = useState(value ?? "");

  const handleChange = (val: string) => {
    setInternalValue(val);
    onValueChange?.(val);
  };

  // Inject control props into child items
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, {
        selectedValue: internalValue,
        onChange: handleChange,
      });
    }
    return child;
  });

  return <View style={[styles.group, style]}>{enhancedChildren}</View>;
};

/* 🔘 RadioGroupItem — Single Option */
export const RadioGroupItem: React.FC<
  RadioGroupItemProps & {
    selectedValue?: string;
    onChange?: (value: string) => void;
  }
> = ({
  label,
  value,
  color = "#2563EB", // Tailwind blue-600
  disabled = false,
  style,
  selectedValue,
  onChange,
}) => {
  const isSelected = selectedValue === value;

  return (
    <TouchableOpacity
      style={[styles.itemContainer, disabled && styles.disabled, style]}
      onPress={() => !disabled && onChange?.(value)}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected, disabled }}
    >
      <View
        style={[
          styles.radioOuter,
          {
            borderColor: isSelected ? color : "#9CA3AF", // gray border when not selected
          },
        ]}
      >
        {isSelected && (
          <View
            style={[styles.radioInner, { backgroundColor: color }]}
          />
        )}
      </View>

      {label ? <Text style={styles.label}>{label}</Text> : null}
    </TouchableOpacity>
  );
};

/* 🧾 Styles (Expo-safe, no elevation) */
const styles = StyleSheet.create({
  group: {
    flexDirection: "column",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10, // replaces gap
  },
  radioOuter: {
    height: 22,
    width: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 15,
    color: "#111827", // gray-900
  },
  disabled: {
    opacity: 0.5,
  },
});

export default RadioGroup;
