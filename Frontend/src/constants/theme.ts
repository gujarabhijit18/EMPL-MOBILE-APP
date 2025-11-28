// 📂 src/constants/theme.ts
// Centralized theme colors for light and dark modes

export const lightColors = {
  // Backgrounds
  background: "#f9fafb",
  surface: "#ffffff",
  surfaceVariant: "#f3f4f6",
  header: "#39549fff",
  
  // Text
  textPrimary: "#111827",
  textSecondary: "#6b7280",
  textTertiary: "#9ca3af",
  textOnPrimary: "#ffffff",
  
  // Cards
  cardBackground: "#ffffff",
  cardBorder: "#e5e7eb",
  
  // Inputs
  inputBackground: "#ffffff",
  inputBorder: "#d1d5db",
  inputText: "#111827",
  inputPlaceholder: "#9ca3af",
  
  // Status colors
  success: "#10b981",
  successLight: "#d1fae5",
  successDark: "#065f46",
  error: "#ef4444",
  errorLight: "#fee2e2",
  errorDark: "#991b1b",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  warningDark: "#92400e",
  info: "#3b82f6",
  infoLight: "#dbeafe",
  infoDark: "#1e40af",
  
  // Dividers
  divider: "#e5e7eb",
  
  // Shadows
  shadowColor: "#000",
  
  // Switch
  switchTrackOff: "#d1d5db",
  switchTrackOn: "#3b82f6",
  switchThumb: "#ffffff",
  
  // StatusBar
  statusBarStyle: "dark" as const,
};

export const darkColors = {
  // Backgrounds
  background: "#0f172a",
  surface: "#1e293b",
  surfaceVariant: "#334155",
  header: "#1e293b",
  
  // Text
  textPrimary: "#f3f4f6",
  textSecondary: "#9ca3af",
  textTertiary: "#6b7280",
  textOnPrimary: "#ffffff",
  
  // Cards
  cardBackground: "#1e293b",
  cardBorder: "#374151",
  
  // Inputs
  inputBackground: "#374151",
  inputBorder: "#4b5563",
  inputText: "#f3f4f6",
  inputPlaceholder: "#9ca3af",
  
  // Status colors
  success: "#10b981",
  successLight: "#064e3b",
  successDark: "#6ee7b7",
  error: "#ef4444",
  errorLight: "#7f1d1d",
  errorDark: "#fca5a5",
  warning: "#f59e0b",
  warningLight: "#78350f",
  warningDark: "#fcd34d",
  info: "#3b82f6",
  infoLight: "#1e3a8a",
  infoDark: "#93c5fd",
  
  // Dividers
  divider: "#374151",
  
  // Shadows
  shadowColor: "#000",
  
  // Switch
  switchTrackOff: "#4b5563",
  switchTrackOn: "#3b82f6",
  switchThumb: "#ffffff",
  
  // StatusBar
  statusBarStyle: "light" as const,
};

export type ThemeColors = Omit<typeof lightColors, 'statusBarStyle'> & {
  statusBarStyle: "dark" | "light";
};

export const getColors = (isDarkMode: boolean): ThemeColors => {
  return isDarkMode ? darkColors : lightColors;
};
