import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import { getColors, ThemeColors } from "../constants/theme";

/**
 * 🎨 Theme Types
 */
export type ColorTheme = "default" | "purple" | "green" | "orange" | "pink" | "cyan";
export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDarkMode: boolean;
  colors: ThemeColors;
}

/**
 * 🌐 Create Context
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * 🌗 Expo-Compatible Theme Provider
 * ✅ Works fully in Expo Go (Android, iOS, Web)
 * ✅ Uses AsyncStorage for persistence
 * ✅ Listens to system light/dark changes via Appearance
 * 🚫 No backend or native module dependencies
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("default");
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");
  const [systemTheme, setSystemTheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme() || "light"
  );

  /**
   * 🧠 Load stored preferences when app starts
   */
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [savedTheme, savedMode] = await Promise.all([
          AsyncStorage.getItem("userColorTheme"),
          AsyncStorage.getItem("themeMode"),
        ]);

        if (savedTheme) setColorThemeState(savedTheme as ColorTheme);
        if (savedMode) setThemeModeState(savedMode as ThemeMode);
      } catch (error) {
        console.warn("⚠️ Failed to load theme preferences:", error);
      }
    };

    loadPreferences();

    // 👀 Listen to system theme changes (works on Expo)
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  /**
   * 💾 Save color theme
   */
  useEffect(() => {
    AsyncStorage.setItem("userColorTheme", colorTheme).catch((err) =>
      console.warn("⚠️ Failed to save color theme:", err)
    );
  }, [colorTheme]);

  /**
   * 💾 Save theme mode (light/dark/system)
   */
  useEffect(() => {
    AsyncStorage.setItem("themeMode", themeMode).catch((err) =>
      console.warn("⚠️ Failed to save theme mode:", err)
    );
  }, [themeMode]);

  /**
   * 🌙 Determine if dark mode should be active
   */
  const isDarkMode =
    themeMode === "dark" || (themeMode === "system" && systemTheme === "dark");

  /**
   * 🎨 Get current theme colors
   */
  const colors = getColors(isDarkMode);

  /**
   * 🎨 Theme Setters
   */
  const setColorTheme = (theme: ColorTheme) => setColorThemeState(theme);
  const setThemeMode = (mode: ThemeMode) => setThemeModeState(mode);

  return (
    <ThemeContext.Provider
      value={{
        colorTheme,
        setColorTheme,
        themeMode,
        setThemeMode,
        isDarkMode,
        colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * 🧩 Custom Hook
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default values instead of throwing error for better dev experience
    console.warn("useTheme must be used within a ThemeProvider - using defaults");
    return {
      colorTheme: "default" as ColorTheme,
      setColorTheme: () => {},
      themeMode: "light" as ThemeMode,
      setThemeMode: () => {},
      isDarkMode: false,
      colors: getColors(false),
    };
  }
  return context;
};
