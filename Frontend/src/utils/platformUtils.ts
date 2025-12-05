// 🎯 Platform-Specific Utilities for iOS & Android
// Handles platform-specific behaviors, file paths, and UI adjustments

import { Platform, Dimensions, StatusBar } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Platform detection utilities
 */
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

/**
 * Get platform-specific UI constants
 */
export const getPlatformConstants = () => ({
    statusBarHeight: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    headerHeight: Platform.OS === 'ios' ? 64 : 56,
    tabBarHeight: Platform.OS === 'ios' ? 49 : 56,
    bottomSafeArea: Platform.OS === 'ios' ? 34 : 0,
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
});

/**
 * Get platform-specific padding
 */
export const getPlatformPadding = (type: 'top' | 'bottom' | 'horizontal') => {
    switch (type) {
        case 'top':
            return Platform.OS === 'ios' ? 10 : 0;
        case 'bottom':
            return Platform.OS === 'ios' ? 34 : 20;
        case 'horizontal':
            return 16;
        default:
            return 0;
    }
};

/**
 * Get platform-specific keyboard behavior
 */
export const getKeyboardBehavior = (): 'padding' | 'height' | 'position' => {
    return Platform.OS === 'ios' ? 'padding' : 'height';
};

/**
 * Get platform-specific keyboard offset
 */
export const getKeyboardVerticalOffset = (): number => {
    return Platform.OS === 'ios' ? 0 : 20;
};

/**
 * Get platform-specific date picker display
 */
export const getDatePickerDisplay = (type: 'date' | 'time' = 'date'): 'default' | 'spinner' | 'calendar' | 'clock' => {
    if (type === 'date') {
        return Platform.OS === 'ios' ? 'spinner' : 'default';
    } else {
        return Platform.OS === 'ios' ? 'spinner' : 'clock';
    }
};

/**
 * File URI handling - Cross-platform
 * iOS uses different URI schemes than Android
 */
export const normalizeFileUri = (uri: string): string => {
    if (!uri) return '';

    // Handle data URIs (base64) - return as-is
    if (uri.startsWith('data:')) {
        return uri;
    }

    // Handle http/https URLs - return as-is
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
        return uri;
    }

    // iOS files might start with file://
    // Android files might start with content:// or file://
    if (Platform.OS === 'ios') {
        // iOS: Ensure file:// prefix for local files
        if (!uri.startsWith('file://') && !uri.startsWith('content://') && !uri.startsWith('ph://')) {
            return `file://${uri}`;
        }
    } else if (Platform.OS === 'android') {
        // Android: Handle content:// URIs (from gallery/document picker)
        // These should be used as-is
        if (uri.startsWith('content://')) {
            return uri;
        }
        // For file paths without scheme, add file://
        if (!uri.startsWith('file://') && uri.startsWith('/')) {
            return `file://${uri}`;
        }
    }

    return uri;
};

/**
 * Get platform-specific cache directory
 */
export const getCacheDirectory = (): string => {
    return FileSystem.cacheDirectory || '';
};

/**
 * Get platform-specific document directory
 */
export const getDocumentDirectory = (): string => {
    return FileSystem.documentDirectory || '';
};

/**
 * Clean up temporary files (cross-platform)
 */
export const cleanupTempFile = async (uri: string): Promise<void> => {
    try {
        const normalizedUri = normalizeFileUri(uri);
        const fileInfo = await FileSystem.getInfoAsync(normalizedUri);

        if (fileInfo.exists) {
            await FileSystem.deleteAsync(normalizedUri, { idempotent: true });
            console.log('✅ Cleaned up temp file:', normalizedUri);
        }
    } catch (error) {
        console.warn('⚠️ Failed to cleanup temp file:', error);
        // Don't throw, as cleanup is not critical
    }
};

/**
 * Copy file to app directory (cross-platform)
 * Useful for iOS where files from external sources need to be copied
 */
export const copyFileToAppDirectory = async (
    sourceUri: string,
    filename: string
): Promise<string> => {
    try {
        const normalizedSource = normalizeFileUri(sourceUri);
        const destinationDir = getDocumentDirectory();
        const destinationUri = `${destinationDir}${filename}`;

        await FileSystem.copyAsync({
            from: normalizedSource,
            to: destinationUri,
        });

        console.log('✅ File copied to app directory:', destinationUri);
        return destinationUri;
    } catch (error) {
        console.error('❌ Failed to copy file:', error);
        throw new Error('Failed to copy file to app directory');
    }
};

/**
 * Read file as base64 (cross-platform)
 * Handles platform-specific URI schemes
 */
export const readFileAsBase64 = async (uri: string): Promise<string> => {
    try {
        const normalizedUri = normalizeFileUri(uri);
        const base64 = await FileSystem.readAsStringAsync(normalizedUri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
    } catch (error) {
        console.error('❌ Failed to read file as base64:', error);
        throw new Error('Failed to read file');
    }
};

/**
 * Write base64 to file (cross-platform)
 */
export const writeBase64ToFile = async (
    base64: string,
    filename: string
): Promise<string> => {
    try {
        const destinationDir = getDocumentDirectory();
        const destinationUri = `${destinationDir}${filename}`;

        await FileSystem.writeAsStringAsync(destinationUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
        });

        console.log('✅ Base64 written to file:', destinationUri);
        return destinationUri;
    } catch (error) {
        console.error('❌ Failed to write base64 to file:', error);
        throw new Error('Failed to write file');
    }
};

/**
 * Get file extension from URI or filename
 */
export const getFileExtension = (uriOrFilename: string): string => {
    const parts = uriOrFilename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Get filename from URI
 */
export const getFilenameFromUri = (uri: string): string => {
    const parts = uri.split('/');
    return parts[parts.length - 1];
};

/**
 * Get MIME type from file extension
 */
export const getMimeType = (extension: string): string => {
    const mimeTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        txt: 'text/plain',
        csv: 'text/csv',
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
};

/**
 * Platform-specific shadow styles
 */
export const getPlatformShadow = (elevation: number = 5) => {
    if (Platform.OS === 'ios') {
        return {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: elevation / 2 },
            shadowOpacity: 0.1 + (elevation / 50),
            shadowRadius: elevation,
        };
    } else {
        return {
            elevation,
        };
    }
};

/**
 * Platform-specific font family
 */
export const getPlatformFont = (weight: 'regular' | 'medium' | 'bold' = 'regular') => {
    if (Platform.OS === 'ios') {
        switch (weight) {
            case 'bold':
                return 'System';
            case 'medium':
                return 'System';
            default:
                return 'System';
        }
    } else {
        switch (weight) {
            case 'bold':
                return 'Roboto-Bold';
            case 'medium':
                return 'Roboto-Medium';
            default:
                return 'Roboto';
        }
    }
};

/**
 * Check if device has notch (iOS X and above)
 */
export const hasNotch = (): boolean => {
    if (Platform.OS === 'ios') {
        const { height, width } = Dimensions.get('window');
        // iPhone X, XS, XR, 11, 12, 13, 14, 15 dimensions
        return (
            (height === 812 || width === 812) || // iPhone X, XS, 11 Pro
            (height === 896 || width === 896) || // iPhone XR, XS Max, 11, 11 Pro Max
            (height === 844 || width === 844) || // iPhone 12, 12 Pro, 13, 13 Pro, 14
            (height === 926 || width === 926) || // iPhone 12 Pro Max, 13 Pro Max, 14 Plus, 14 Pro Max
            (height === 852 || width === 852) || // iPhone 14 Pro
            (height === 932 || width === 932) || // iPhone 14 Pro Max, 15 Pro Max
            (height === 393 || width === 393) || // iPhone 15, 15 Pro
            (height === 430 || width === 430)    // iPhone 15 Plus, 15 Pro Max
        );
    }
    return false;
};

/**
 * Get safe area insets
 */
export const getSafeAreaInsets = () => ({
    top: hasNotch() ? 44 : 20,
    bottom: hasNotch() ? 34 : 0,
    left: 0,
    right: 0,
});

/**
 * Platform-specific haptic feedback
 * Import Haptics from expo-haptics and use this wrapper
 */
export const shouldUseHaptics = (): boolean => {
    // iOS has better haptic support
    return Platform.OS === 'ios';
};

/**
 * Platform-specific status bar style
 */
export const getStatusBarStyle = (theme: 'light' | 'dark' = 'light'): 'light-content' | 'dark-content' => {
    return theme === 'dark' ? 'light-content' : 'dark-content';
};

/**
 * Platform-specific navigation header height
 */
export const getNavigationHeaderHeight = (): number => {
    return Platform.OS === 'ios' ? 64 : 56;
};

/**
 * Check if running on tablet
 */
export const isTablet = (): boolean => {
    const { width, height } = Dimensions.get('window');
    const aspectRatio = height / width;

    // Generally tablets have aspect ratios closer to 1.33 (4:3) or 1.6 (16:10)
    // Phones typically have ratios around 2 (18:9 or similar)
    return aspectRatio < 1.75 && (width >= 600 || height >= 600);
};

/**
 * Get responsive size based on screen width
 */
export const getResponsiveSize = (baseSize: number): number => {
    const baseWidth = 375; // iPhone 11 width
    const scaleFactor = SCREEN_WIDTH / baseWidth;
    return Math.round(baseSize * scaleFactor);
};

/**
 * Get platform-specific animation duration
 */
export const getAnimationDuration = (type: 'fast' | 'normal' | 'slow' = 'normal'): number => {
    const durations = {
        fast: Platform.OS === 'ios' ? 200 : 250,
        normal: Platform.OS === 'ios' ? 300 : 350,
        slow: Platform.OS === 'ios' ? 500 : 550,
    };

    return durations[type];
};

export default {
    isIOS,
    isAndroid,
    isWeb,
    getPlatformConstants,
    getPlatformPadding,
    getKeyboardBehavior,
    getKeyboardVerticalOffset,
    getDatePickerDisplay,
    normalizeFileUri,
    getCacheDirectory,
    getDocumentDirectory,
    cleanupTempFile,
    copyFileToAppDirectory,
    readFileAsBase64,
    writeBase64ToFile,
    getFileExtension,
    getFilenameFromUri,
    getMimeType,
    getPlatformShadow,
    getPlatformFont,
    hasNotch,
    getSafeAreaInsets,
    shouldUseHaptics,
    getStatusBarStyle,
    getNavigationHeaderHeight,
    isTablet,
    getResponsiveSize,
    getAnimationDuration,
};
