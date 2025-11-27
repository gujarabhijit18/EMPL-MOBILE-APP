import React, { createContext, useContext, useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";

/**
 * 🎛️ ToggleGroup (Expo Compatible)
 * ✅ Works in Expo Go (iOS, Android, Web)
 * Features:
 * - Single or multiple selection
 * - Outline or Default variant
 * - Small, Default, and Large sizes
 * - Expo-safe shadows (no Android elevation)
 */

type Variant = "default" | "outline";
type Size = "sm" | "default" | "lg";

interface ToggleGroupContextType {
  value: string | string[];
  onChange: (value: string) => void;
  type: "single" | "multiple";
  variant: Variant;
  size: Size;
}

const ToggleGroupContext = createContext<ToggleGroupContextType | null>(null);

// ----------------- ToggleGroup -----------------
interface ToggleGroupProps {
  type?: "single" | "multiple";
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const ToggleGroup: React.FC<ToggleGroupProps> = ({
  type = "single",
  value: controlledValue,
  onValueChange,
  variant = "default",
  size = "default",
  children,
  style,
}) => {
  const [internalValue, setInternalValue] = useState<string | string[]>(
    type === "single" ? "" : []
  );

  const value = controlledValue ?? internalValue;

  const handleChange = (val: string) => {
    if (type === "single") {
      const newVal = val === value ? "" : val;
      setInternalValue(newVal);
      onValueChange?.(newVal);
    } else {
      const arr = Array.isArray(value) ? [...value] : [];
      const index = arr.indexOf(val);
      if (index > -1) arr.splice(index, 1);
      else arr.push(val);
      setInternalValue(arr);
      onValueChange?.(arr);
    }
  };

  return (
    <ToggleGroupContext.Provider
      value={{ value, onChange: handleChange, type, variant, size }}
    >
      <View style={[styles.groupContainer, style]}>{children}</View>
    </ToggleGroupContext.Provider>
  );
};

// ----------------- ToggleGroupItem -----------------
interface ToggleGroupItemProps {
  value: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const ToggleGroupItem: React.FC<ToggleGroupItemProps> = ({
  value,
  children,
  style,
  textStyle,
}) => {
  const ctx = useContext(ToggleGroupContext);
  if (!ctx) throw new Error("ToggleGroupItem must be used within a ToggleGroup");

  const isActive =
    ctx.type === "single"
      ? ctx.value === value
      : Array.isArray(ctx.value) && ctx.value.includes(value);

  const variantStyles = getVariantStyles(ctx.variant, isActive);
  const sizeStyles = getSizeStyles(ctx.size);

  return (
    <TouchableOpacity
      onPress={() => ctx.onChange(value)}
      activeOpacity={0.8}
      style={[
        styles.item,
        variantStyles.container,
        sizeStyles.container,
        isActive && styles.expoShadow, // ✅ Expo-safe shadow
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <Text style={[variantStyles.text, sizeStyles.text, textStyle]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

// ----------------- Style Helpers -----------------
const getVariantStyles = (variant: Variant, active: boolean) => {
  switch (variant) {
    case "outline":
      return {
        container: {
          borderWidth: 1,
          borderColor: active ? "#2563EB" : "#D1D5DB", // blue-600 / gray-300
          backgroundColor: active ? "#DBEAFE" : "transparent", // light blue
        },
        text: {
          color: active ? "#1E3A8A" : "#374151", // dark blue / gray-700
          fontWeight: active ? '600' as const : '500' as const,
        },
      };
    default:
      return {
        container: {
          backgroundColor: active ? "#2563EB" : "#E5E7EB", // blue / gray
        },
        text: {
          color: active ? "#FFFFFF" : "#111827", // white / gray-900
          fontWeight: active ? '600' as const : '500' as const,
        },
      };
  }
};

const getSizeStyles = (size: Size) => {
  switch (size) {
    case "sm":
      return {
        container: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
        text: { fontSize: 12 },
      };
    case "lg":
      return {
        container: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
        text: { fontSize: 16 },
      };
    default:
      return {
        container: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
        text: { fontSize: 14 },
      };
  }
};

// ----------------- Base Styles -----------------
const styles = StyleSheet.create({
  groupContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    marginVertical: 2, // gap replacement
  },
  expoShadow: {
    // ✅ Expo-safe cross-platform shadow (instead of Android elevation)
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
});

export default ToggleGroup;
