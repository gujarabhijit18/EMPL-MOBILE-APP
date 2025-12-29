/**
 * Design System - Centralized Design Tokens
 * 
 * This file contains all design tokens for consistent UI/UX across the application.
 * Based on the EmployeeManagement screen design language.
 * 
 * IMPORTANT: All screens must use these tokens for visual consistency.
 * Do NOT use hardcoded colors, spacing, or typography values.
 */

import { Platform, StyleSheet, ViewStyle, TextStyle } from 'react-native';

// ============ COLORS ============
export const Colors = {
  // Primary Brand - Blue
  primary: '#3b82f6',
  primaryDark: '#1e40af',
  primaryLight: '#dbeafe',
  primaryLighter: '#eff6ff',
  
  // Success - Green
  success: '#10b981',
  successDark: '#059669',
  successLight: '#d1fae5',
  successLighter: '#ecfdf5',
  
  // Warning - Amber/Orange
  warning: '#f59e0b',
  warningDark: '#d97706',
  warningLight: '#fef3c7',
  warningLighter: '#fffbeb',
  
  // Error - Red
  error: '#ef4444',
  errorDark: '#dc2626',
  errorLight: '#fee2e2',
  errorLighter: '#fef2f2',
  
  // Info - Cyan/Teal
  info: '#06b6d4',
  infoDark: '#0891b2',
  infoLight: '#cffafe',
  infoLighter: '#ecfeff',
  
  // Purple (for special highlights)
  purple: '#8b5cf6',
  purpleDark: '#7c3aed',
  purpleLight: '#ede9fe',
  purpleLighter: '#f5f3ff',
  
  // Neutrals
  text: '#1f2937',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  textDisabled: '#d1d5db',
  
  // Borders
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  borderDark: '#d1d5db',
  
  // Backgrounds
  background: '#f8fafc',
  backgroundAlt: '#f1f5f9',
  surface: '#ffffff',
  surfaceHover: '#f9fafb',
  
  // Header specific (white header design)
  headerBg: '#ffffff',
  headerText: '#111827',
  headerSubtext: '#6b7280',
  headerBorder: '#e2e8f0',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Status Badge Colors (standardized)
  statusActive: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
  statusApproved: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
  statusPending: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  statusRejected: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  statusInactive: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  statusCancelled: { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db' },
  statusOnTime: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
  statusLate: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  statusEarly: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
};

// ============ TYPOGRAPHY ============
export const Typography = {
  // Screen titles (main headers)
  screenTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.headerText,
    letterSpacing: -0.3,
  },
  // Section titles within screens
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#334155',
  },
  // Card titles
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  // Body text
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#374151',
    lineHeight: 20,
  },
  // Secondary/supporting text
  secondary: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  // Labels for form fields
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#4b5563',
  },
  // Small captions
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  // Extra small text (badges, etc)
  tiny: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  // Button text
  buttonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  // Button text small
  buttonTextSmall: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
};

// ============ SPACING ============
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ============ BORDER RADIUS ============
export const BorderRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// ============ SHADOWS ============
export const Shadows = {
  // Light shadow for cards
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
    },
    android: {
      elevation: 2,
    },
  }) as ViewStyle,
  
  // Medium shadow for elevated cards
  cardMedium: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
  }) as ViewStyle,
  
  // Strong shadow for modals
  modal: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
    },
    android: {
      elevation: 10,
    },
  }) as ViewStyle,
  
  // Button shadow (colored)
  button: Platform.select({
    ios: {
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }) as ViewStyle,
  
  // Success button shadow
  buttonSuccess: Platform.select({
    ios: {
      shadowColor: Colors.success,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }) as ViewStyle,
  
  // Error button shadow
  buttonError: Platform.select({
    ios: {
      shadowColor: Colors.error,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }) as ViewStyle,
  
  // No shadow
  none: {} as ViewStyle,
};

// ============ GRADIENTS ============
export const Gradients = {
  primary: ['#3b82f6', '#2563eb'] as const,
  primarySoft: ['#60a5fa', '#3b82f6'] as const,
  success: ['#10b981', '#059669'] as const,
  successSoft: ['#34d399', '#10b981'] as const,
  warning: ['#f59e0b', '#d97706'] as const,
  error: ['#ef4444', '#dc2626'] as const,
  purple: ['#8b5cf6', '#7c3aed'] as const,
  info: ['#06b6d4', '#0891b2'] as const,
  // Subtle gradients for backgrounds
  backgroundSubtle: ['#f8fafc', '#f1f5f9'] as const,
};

// ============ STYLE PATTERNS ============

// Standard White Header Pattern (no gradients)
export const HeaderStyles = {
  container: {
    backgroundColor: Colors.headerBg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.headerBorder,
  } as ViewStyle,
  containerWithSafeArea: {
    backgroundColor: Colors.headerBg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.headerBorder,
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.headerBorder,
  } as ViewStyle,
  titleContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  } as ViewStyle,
  title: {
    ...Typography.screenTitle,
  } as TextStyle,
  subtitle: {
    ...Typography.secondary,
    marginTop: 2,
  } as TextStyle,
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  } as ViewStyle,
  iconButtonSecondary: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.headerBorder,
  } as ViewStyle,
};

// Card Pattern
export const CardStyles = {
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.card,
  } as ViewStyle,
  containerMedium: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    ...Shadows.cardMedium,
  } as ViewStyle,
  containerCompact: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadows.card,
  } as ViewStyle,
  // Card with left accent border
  containerAccent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    padding: Spacing.lg,
    ...Shadows.card,
  } as ViewStyle,
};

// Button Patterns
export const ButtonStyles = {
  // Primary button (gradient background)
  primary: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  primaryGradient: Gradients.primary,
  
  // Secondary button (outlined/light)
  secondary: {
    backgroundColor: '#f1f5f9',
    borderColor: Colors.headerBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  
  // Destructive button
  destructive: {
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  
  // Success button
  success: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.buttonSuccess,
  } as ViewStyle,
  
  // Small button variant
  small: {
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  
  // Button text styles
  text: {
    primary: {
      color: '#ffffff',
      ...Typography.buttonText,
    } as TextStyle,
    secondary: {
      color: '#64748b',
      ...Typography.buttonText,
    } as TextStyle,
    destructive: {
      color: Colors.error,
      ...Typography.buttonText,
    } as TextStyle,
    success: {
      color: '#ffffff',
      ...Typography.buttonText,
    } as TextStyle,
  },
};

// Input Field Pattern
export const InputStyles = {
  container: {
    backgroundColor: '#f9fafb',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    minHeight: 44,
  } as ViewStyle,
  containerWithIcon: {
    backgroundColor: '#f9fafb',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  focused: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: '#eef2ff',
  } as ViewStyle,
  error: {
    borderColor: Colors.error,
    backgroundColor: '#fef2f2',
  } as ViewStyle,
  text: {
    color: Colors.text,
    fontSize: 14,
  } as TextStyle,
  placeholder: {
    color: Colors.textTertiary,
  },
  label: {
    ...Typography.label,
    marginBottom: 6,
  } as TextStyle,
  errorText: {
    color: Colors.error,
    fontSize: 11,
    marginTop: 4,
  } as TextStyle,
  // Text area variant
  textArea: {
    backgroundColor: '#f9fafb',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
  } as ViewStyle,
};

// Modal Pattern
export const ModalStyles = {
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  overlayBottom: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  } as ViewStyle,
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    ...Shadows.modal,
    maxWidth: '90%',
    width: '100%',
  } as ViewStyle,
  containerBottom: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    ...Shadows.modal,
    maxHeight: '90%',
  } as ViewStyle,
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  } as ViewStyle,
  headerWhite: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  } as ViewStyle,
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  closeButtonDark: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  content: {
    padding: Spacing.xl,
  } as ViewStyle,
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  } as ViewStyle,
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.headerText,
    textAlign: 'center',
  } as TextStyle,
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  } as TextStyle,
};

// ============ HELPER FUNCTIONS ============

/**
 * Get status badge style based on status string
 */
export const getStatusBadgeStyle = (status: string) => {
  const statusLower = status.toLowerCase();
  
  const statusMap: { [key: string]: { bg: string; text: string; border?: string } } = {
    active: Colors.statusActive,
    approved: Colors.statusApproved,
    pending: Colors.statusPending,
    rejected: Colors.statusRejected,
    inactive: Colors.statusInactive,
    cancelled: Colors.statusCancelled,
    present: Colors.statusActive,
    absent: Colors.statusRejected,
    late: Colors.statusLate,
    early: Colors.statusEarly,
    'on-time': Colors.statusOnTime,
    'on time': Colors.statusOnTime,
    completed: Colors.statusApproved,
    new: { bg: Colors.primaryLight, text: Colors.primaryDark },
  };
  
  const style = statusMap[statusLower] || Colors.statusPending;
  
  return {
    container: {
      backgroundColor: style.bg,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
      borderWidth: style.border ? 1 : 0,
      borderColor: style.border || 'transparent',
    } as ViewStyle,
    text: {
      color: style.text,
      fontSize: 12,
      fontWeight: '600' as const,
      textTransform: 'capitalize' as const,
    } as TextStyle,
  };
};

/**
 * Apply shadow with cross-platform support
 */
export const applyShadow = (shadowStyle: ViewStyle) => {
  return Platform.select({
    ios: {
      shadowColor: (shadowStyle as any).shadowColor || '#000',
      shadowOffset: (shadowStyle as any).shadowOffset || { width: 0, height: 2 },
      shadowOpacity: (shadowStyle as any).shadowOpacity || 0.05,
      shadowRadius: (shadowStyle as any).shadowRadius || 10,
    },
    android: {
      elevation: (shadowStyle as any).elevation || 2,
    },
  });
};

/**
 * Get role badge color
 */
export const getRoleBadgeColor = (role?: string) => {
  const roleNormalized = (role || 'Employee').toLowerCase().replace(/\s+/g, '');
  
  const roleColors: { [key: string]: { bg: string; text: string; gradient: readonly [string, string] } } = {
    'admin': { bg: '#fee2e2', text: '#991b1b', gradient: ['#ef4444', '#dc2626'] as const },
    'hr': { bg: '#fce7f3', text: '#831843', gradient: ['#ec4899', '#db2777'] as const },
    'manager': { bg: '#fed7aa', text: '#9a3412', gradient: ['#f97316', '#ea580c'] as const },
    'teamlead': { bg: '#bfdbfe', text: '#1e40af', gradient: ['#3b82f6', '#2563eb'] as const },
    'team lead': { bg: '#bfdbfe', text: '#1e40af', gradient: ['#3b82f6', '#2563eb'] as const },
    'employee': { bg: '#d1fae5', text: '#065f46', gradient: ['#10b981', '#059669'] as const },
  };
  
  return roleColors[roleNormalized] || roleColors['employee'];
};

/**
 * Get leave type color
 */
export const getLeaveTypeColor = (leaveType?: string) => {
  const typeNormalized = (leaveType || '').toLowerCase();
  
  const typeColors: { [key: string]: { bg: string; text: string; gradient: readonly [string, string] } } = {
    'annual': { bg: '#dbeafe', text: '#1e40af', gradient: Gradients.primary },
    'annual leave': { bg: '#dbeafe', text: '#1e40af', gradient: Gradients.primary },
    'sick': { bg: '#fee2e2', text: '#991b1b', gradient: Gradients.error },
    'sick leave': { bg: '#fee2e2', text: '#991b1b', gradient: Gradients.error },
    'casual': { bg: '#d1fae5', text: '#065f46', gradient: Gradients.success },
    'casual leave': { bg: '#d1fae5', text: '#065f46', gradient: Gradients.success },
    'maternity': { bg: '#fce7f3', text: '#831843', gradient: ['#ec4899', '#db2777'] as const },
    'maternity leave': { bg: '#fce7f3', text: '#831843', gradient: ['#ec4899', '#db2777'] as const },
    'paternity': { bg: '#e0e7ff', text: '#3730a3', gradient: ['#6366f1', '#4f46e5'] as const },
    'paternity leave': { bg: '#e0e7ff', text: '#3730a3', gradient: ['#6366f1', '#4f46e5'] as const },
    'unpaid': { bg: '#f3f4f6', text: '#374151', gradient: ['#6b7280', '#4b5563'] as const },
    'unpaid leave': { bg: '#f3f4f6', text: '#374151', gradient: ['#6b7280', '#4b5563'] as const },
  };
  
  return typeColors[typeNormalized] || { bg: '#f3f4f6', text: '#374151', gradient: ['#6b7280', '#4b5563'] as const };
};

// ============ COMMON STYLE OBJECTS ============

export const CommonStyles = {
  // Screen container
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  } as ViewStyle,
  
  // Content container with padding
  contentContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  } as ViewStyle,
  
  // Row with gap
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  
  rowSpaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  
  // Centered content
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  
  // Empty state
  emptyState: {
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    } as ViewStyle,
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#f3f4f6',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.xl,
    } as ViewStyle,
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: Colors.text,
      marginBottom: Spacing.sm,
      textAlign: 'center',
    } as TextStyle,
    subtitle: {
      fontSize: 14,
      color: Colors.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.xl,
    } as TextStyle,
  },
  
  // Loading state
  loadingState: {
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    } as ViewStyle,
    text: {
      marginTop: Spacing.md,
      fontSize: 14,
      color: Colors.textSecondary,
      fontWeight: '500',
    } as TextStyle,
  },
  
  // List item spacing
  listItemSpacing: {
    marginBottom: Spacing.md,
  } as ViewStyle,
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  } as ViewStyle,
  
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  } as ViewStyle,
  
  // Badge styles
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  } as ViewStyle,
  
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  } as TextStyle,
  
  // Pill/chip styles
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  } as ViewStyle,
  
  pillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  } as TextStyle,
  
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  } as ViewStyle,
  
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 6,
  } as ViewStyle,
  
  tabActive: {
    backgroundColor: Colors.primaryLight,
  } as ViewStyle,
  
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textTertiary,
  } as TextStyle,
  
  tabTextActive: {
    color: Colors.primary,
  } as TextStyle,
  
  // Info box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0fdfa',
    padding: 14,
    borderRadius: BorderRadius.md,
    gap: 10,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  } as ViewStyle,
  
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#0f766e',
    lineHeight: 20,
  } as TextStyle,
  
  // Warning box
  warningBox: {
    flexDirection: 'row',
    backgroundColor: Colors.warningLighter,
    padding: 14,
    borderRadius: BorderRadius.md,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.warningLight,
  } as ViewStyle,
  
  warningBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 20,
  } as TextStyle,
  
  // Error box
  errorBox: {
    flexDirection: 'row',
    backgroundColor: Colors.errorLighter,
    padding: 14,
    borderRadius: BorderRadius.md,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.errorLight,
  } as ViewStyle,
  
  errorBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#991b1b',
    lineHeight: 20,
  } as TextStyle,
};

// ============ TOUCH TARGET ============
// Minimum touch target size for accessibility (44x44)
export const TOUCH_TARGET_SIZE = 44;

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Gradients,
  HeaderStyles,
  CardStyles,
  ButtonStyles,
  InputStyles,
  ModalStyles,
  CommonStyles,
  getStatusBadgeStyle,
  applyShadow,
  getRoleBadgeColor,
  getLeaveTypeColor,
  TOUCH_TARGET_SIZE,
};
