import { Dimensions, Platform } from "react-native";

/**
 * ✅ Universal Helper Utilities (Expo-Compatible)
 * 🚀 Works perfectly in Expo Go (Android, iOS, Web)
 * 🚫 No API calls or native dependencies
 */

// =============================
// 🔹 Screen Dimensions
// =============================
export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// =============================
// 🔹 Responsive Scale Utility
// =============================
/**
 * Scales size proportionally based on screen width.
 * Example: scaleSize(16) → returns a pixel-perfect responsive value.
 */
export function scaleSize(size: number): number {
  const BASE_WIDTH = 375; // iPhone X baseline
  return (size / BASE_WIDTH) * SCREEN_WIDTH;
}

// =============================
// 🔹 Device Size Utilities
// =============================
/**
 * Detects if the device screen is small (typically compact phones).
 */
export function isSmallDevice(): boolean {
  return SCREEN_WIDTH < 360;
}

/**
 * Detects if the device is large (like a Pro Max or tablet).
 */
export function isLargeDevice(): boolean {
  return SCREEN_WIDTH > 414;
}

/**
 * Detects if the device is a tablet (based on width).
 */
export function isTablet(): boolean {
  return SCREEN_WIDTH >= 768;
}

// =============================
// 🔹 Platform Helpers
// =============================
export const IS_ANDROID = Platform.OS === "android";
export const IS_IOS = Platform.OS === "ios";
export const IS_WEB = Platform.OS === "web";

/**
 * Returns a user-friendly platform name.
 */
export function getPlatformName(): string {
  if (IS_ANDROID) return "Android";
  if (IS_IOS) return "iOS";
  if (IS_WEB) return "Web";
  return "Unknown";
}

// =============================
// 🔹 Class Combiner Utility
// =============================
/**
 * ✅ Lightweight class name combiner (like `clsx`)
 * Works for conditional styles or dynamic class joining.
 * Example: cn("bg-red", isTablet() && "p-4") → "bg-red p-4"
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
