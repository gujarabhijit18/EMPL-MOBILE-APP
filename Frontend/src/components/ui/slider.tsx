import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import SliderBase, { SliderProps as BaseSliderProps } from "@react-native-community/slider";

type SliderProps = BaseSliderProps & {
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * 🎚️ Expo-Compatible Slider (ShadCN → RN)
 * ✅ Works in Expo Go (iOS, Android, Web)
 * 
 * Installation:
 *   ✅ No native linking required
 *   npm install @react-native/slider
 *
 * Features:
 * - Smooth value tracking
 * - Custom track and thumb colors
 * - Fully Expo-safe (no pod install or native config)
 */
export const Slider: React.FC<SliderProps> = ({
  value = 0,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  minimumTrackTintColor = "#2563EB", // Tailwind blue-600
  maximumTrackTintColor = "#E5E7EB", // Tailwind gray-200
  thumbTintColor = "#FFFFFF",
  containerStyle,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <SliderBase
        value={value}
        onValueChange={onValueChange}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        minimumTrackTintColor={minimumTrackTintColor}
        maximumTrackTintColor={maximumTrackTintColor}
        thumbTintColor={thumbTintColor}
        style={styles.slider}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "center",
  },
  slider: {
    width: "100%",
    height: 40,
  },
});

export default Slider;
