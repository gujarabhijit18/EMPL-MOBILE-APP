import React, {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import { TouchableOpacity, View, StyleSheet, Animated } from "react-native";
import { Check } from "lucide-react-native";

export interface CheckboxProps {
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  size?: number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
}

/**
 * Expo-Compatible Checkbox Component
 * Features:
 * - Animated check/uncheck
 * - Controlled/uncontrolled support
 * - Disabled state
 * - Works 100% in Expo Go (no native linking)
 */
export const Checkbox = forwardRef<any, CheckboxProps>(
  (
    {
      checked: checkedProp = false,
      disabled = false,
      onChange,
      size = 22,
      color = "#FFFFFF",
      backgroundColor = "#2563EB", // Tailwind blue-600
      borderColor = "#2563EB",
    },
    ref
  ) => {
    const [checked, setChecked] = useState(checkedProp);
    const scaleAnim = useRef(new Animated.Value(checkedProp ? 1 : 0)).current;

    // Sync external state
    useEffect(() => {
      setChecked(checkedProp);
      Animated.spring(scaleAnim, {
        toValue: checkedProp ? 1 : 0,
        useNativeDriver: true,
        friction: 5,
      }).start();
    }, [checkedProp]);

    const handleToggle = (value?: boolean) => {
      if (disabled) return;

      const newValue = value ?? !checked;
      setChecked(newValue);
      onChange?.(newValue);

      Animated.spring(scaleAnim, {
        toValue: newValue ? 1 : 0,
        useNativeDriver: true,
        friction: 5,
      }).start();
    };

    // Expose helper methods
    useImperativeHandle(ref, () => ({
      toggle: () => handleToggle(),
      setChecked: (val: boolean) => handleToggle(val),
      isChecked: () => checked,
    }));

    const animatedStyle = {
      transform: [{ scale: scaleAnim }],
      opacity: scaleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    };

    return (
      <TouchableOpacity
        style={[
          styles.container,
          {
            width: size + 8,
            height: size + 8,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        activeOpacity={0.8}
        onPress={() => handleToggle()}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
      >
        <View
          style={[
            styles.box,
            {
              width: size,
              height: size,
              borderColor,
              borderRadius: 4,
              backgroundColor: checked ? backgroundColor : "transparent",
              borderWidth: checked ? 0 : 1.5,
            },
          ]}
        >
          <Animated.View style={animatedStyle}>
            {checked && <Check {...({ size: size * 0.7, color, strokeWidth: 3 } as any)} />}
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    backgroundColor: "#FFF",

    // Cross-platform shadow (Expo safe)
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
});

export default Checkbox;
