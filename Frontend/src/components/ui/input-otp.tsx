import React, { useRef, useState, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import { Dot } from "lucide-react-native";

interface InputOTPProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

/**
 * 🔢 InputOTP — Expo Compatible
 * ✅ Works in Expo Go (iOS, Android, Web)
 * ✨ Animated caret, custom styling, no native linking
 */
export const InputOTP: React.FC<InputOTPProps> = ({
  length = 6,
  value = "",
  onChange,
  disabled = false,
}) => {
  const inputs = useRef<TextInput[]>([]);
  const [otp, setOtp] = useState<string[]>(
    Array.from({ length }, (_, i) => value[i] || "")
  );
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    onChange?.(otp.join(""));
  }, [otp]);

  const handleChange = (text: string, index: number) => {
    if (!/^[0-9a-zA-Z]*$/.test(text)) return;
    const updated = [...otp];
    updated[index] = text;
    setOtp(updated);

    if (text && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.group}>
      {Array.from({ length }).map((_, index) => (
        <InputOTPSlot
          key={index}
          index={index}
          value={otp[index]}
          isActive={index === activeIndex}
          onChangeText={(t) => handleChange(t, index)}
          onFocus={() => setActiveIndex(index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          inputRef={(ref) => (inputs.current[index] = ref!)}
          disabled={disabled}
        />
      ))}
    </View>
  );
};

/* --------------------------
 * OTP Group Container
 * -------------------------- */
export const InputOTPGroup: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <View style={styles.group}>{children}</View>;

/* --------------------------
 * OTP Single Box (Slot)
 * -------------------------- */
interface InputOTPSlotProps {
  index: number;
  value: string;
  isActive: boolean;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onKeyPress: (e: any) => void;
  inputRef: (ref: TextInput | null) => void;
  disabled?: boolean;
}

export const InputOTPSlot: React.FC<InputOTPSlotProps> = ({
  value,
  isActive,
  onChangeText,
  onFocus,
  onKeyPress,
  inputRef,
  disabled = false,
}) => {
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let blink: Animated.CompositeAnimation;
    if (isActive) {
      blink = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      );
      blink.start();
    } else {
      blinkAnim.setValue(1);
    }
    return () => blink?.stop?.();
  }, [isActive]);

  return (
    <TouchableWithoutFeedback
      onPress={() => !disabled && inputRef && inputRef(null)}
    >
      <View
        style={[
          styles.slot,
          isActive && styles.activeSlot,
          disabled && { opacity: 0.5 },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onKeyPress={onKeyPress}
          style={[styles.input, { color: disabled ? "#9CA3AF" : "#111827" }]}
          editable={!disabled}
          maxLength={1}
          keyboardType="number-pad"
          selectionColor="#2563EB"
          caretHidden
        />
        {isActive && !value && (
          <Animated.View style={[styles.caret, { opacity: blinkAnim }]} />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

/* --------------------------
 * Optional Dot Separator
 * -------------------------- */
export const InputOTPSeparator: React.FC = () => (
  <View style={styles.separator}>
    <Dot color="#6B7280" />
  </View>
);

/* --------------------------
 * Styles (Expo-safe)
 * -------------------------- */
const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  slot: {
    height: 52,
    width: 52,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  activeSlot: {
    borderColor: "#2563EB",
    borderWidth: 2,
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  input: {
    fontSize: 20,
    textAlign: "center",
    width: "100%",
    height: "100%",
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
  },
  caret: {
    position: "absolute",
    width: 2,
    height: 22,
    backgroundColor: "#2563EB",
  },
  separator: {
    marginHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default InputOTP;
