// 📂 src/hooks/useThemedStyles.ts
// Hook for getting themed colors based on dark/light mode

import { getColors, ThemeColors } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";

export interface ThemedStyles {
  colors: ThemeColors;
  isDarkMode: boolean;
}

export const useThemedStyles = (): ThemedStyles => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  
  return {
    colors,
    isDarkMode,
  };
};

// Common themed style generators
export const getCommonThemedStyles = (isDarkMode: boolean) => {
  const colors = getColors(isDarkMode);
  
  return {
    // Container styles
    safeArea: {
      flex: 1,
      backgroundColor: colors.header,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      flex: 1,
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      marginTop: -20,
    },
    
    // Header styles
    header: {
      backgroundColor: colors.header,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 30,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "bold" as const,
      color: colors.textOnPrimary,
    },
    headerSubtitle: {
      fontSize: 14,
      color: isDarkMode ? "#a5b4fc" : "#a5b4fc",
      opacity: 0.9,
    },
    
    // Card styles
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      marginVertical: 8,
      elevation: 2,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    cardTitle: {
      color: colors.textPrimary,
    },
    cardSubtitle: {
      color: colors.textSecondary,
    },
    
    // Stats card styles
    statsCard: {
      flex: 1,
      marginHorizontal: 4,
      padding: 12,
      alignItems: "center" as const,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      elevation: 2,
    },
    statsLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    statsValue: {
      fontSize: 18,
      fontWeight: "bold" as const,
      color: colors.textPrimary,
    },
    
    // Text styles
    textPrimary: {
      color: colors.textPrimary,
    },
    textSecondary: {
      color: colors.textSecondary,
    },
    textTertiary: {
      color: colors.textTertiary,
    },
    
    // Input styles
    input: {
      backgroundColor: colors.inputBackground,
      borderColor: colors.inputBorder,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 44,
      color: colors.inputText,
    },
    inputDisabled: {
      backgroundColor: colors.surfaceVariant,
      color: colors.textSecondary,
    },
    
    // Divider
    divider: {
      backgroundColor: colors.divider,
    },
    
    // Switch colors
    switchTrackOff: colors.switchTrackOff,
    switchTrackOn: colors.switchTrackOn,
    switchThumb: colors.switchThumb,
    
    // Status bar style
    statusBarStyle: colors.statusBarStyle,
    
    // Loading container
    loadingContainer: {
      flex: 1,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      backgroundColor: colors.background,
    },
    
    // Section card
    sectionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      marginBottom: 12,
    },
    
    // Setting row
    settingRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 12,
    },
    settingTitle: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    settingDesc: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    
    // Picker container
    pickerContainer: {
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      padding: 12,
    },
    picker: {
      color: colors.inputText,
    },
    
    // Scroll view
    scrollView: {
      backgroundColor: colors.background,
    },
  };
};

export default useThemedStyles;
