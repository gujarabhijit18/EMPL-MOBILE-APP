import { useState, useEffect } from "react";
import { Dimensions, ScaledSize } from "react-native";

const MOBILE_BREAKPOINT = 768; // px width threshold for mobile detection

/**
 * 📱 useIsMobile (Expo Compatible)
 * ✅ Works in Expo Go (Android, iOS, and Web)
 * ✅ Listens to screen size/orientation changes
 * 🚫 No native linking or API dependencies
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    const { width } = Dimensions.get("window");
    return width < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const handleDimensionChange = ({ window }: { window: ScaledSize }) => {
      setIsMobile(window.width < MOBILE_BREAKPOINT);
    };

    // ✅ New API (Expo SDK ≥ 48 / RN ≥ 0.72)
    const subscription = Dimensions.addEventListener("change", handleDimensionChange);

    // 🧹 Cleanup (Expo always uses new API)
    return () => subscription.remove();
  }, []);

  return isMobile;
}
