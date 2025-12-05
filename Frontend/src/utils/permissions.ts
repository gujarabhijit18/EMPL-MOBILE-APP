// 📱 Unified Permission Manager for iOS & Android
// Handles all permission requests with proper error handling and user feedback

import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { Platform, Alert, Linking } from 'react-native';

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  message?: string;
}

/**
 * Request camera permissions with fallback to settings
 */
export const requestCameraPermission = async (): Promise<PermissionStatus> => {
  try {
    const permission = await Camera.requestCameraPermissionsAsync();
    
    if (permission.granted) {
      return { granted: true, canAskAgain: true };
    }

    if (!permission.canAskAgain) {
      // User has denied permission previously
      Alert.alert(
        'Camera Permission Required',
        'Camera access is required to capture attendance selfies. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return { granted: false, canAskAgain: false, message: 'Permission denied permanently' };
    }

    Alert.alert(
      'Camera Permission Denied',
      'Camera access is required for attendance selfies. Please grant permission to continue.',
      [{ text: 'OK' }]
    );
    
    return { granted: false, canAskAgain: true, message: 'Permission denied' };
  } catch (error) {
    console.error('Camera permission error:', error);
    return { granted: false, canAskAgain: true, message: 'Permission request failed' };
  }
};

/**
 * Request location permissions (foreground and background for iOS)
 */
export const requestLocationPermission = async (background: boolean = false): Promise<PermissionStatus> => {
  try {
    // First request foreground location
    const { status: foregroundStatus, canAskAgain: foregroundCanAsk } = 
      await Location.requestForegroundPermissionsAsync();

    if (foregroundStatus !== 'granted') {
      if (!foregroundCanAsk) {
        Alert.alert(
          'Location Permission Required',
          'Location access is required for attendance tracking. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return { granted: false, canAskAgain: false, message: 'Foreground permission denied permanently' };
      }

      Alert.alert(
        'Location Permission Denied',
        'Location access is required to mark your attendance and verify your workplace location.',
        [{ text: 'OK' }]
      );
      return { granted: false, canAskAgain: true, message: 'Foreground permission denied' };
    }

    // If background location is requested (mainly for iOS)
    if (background && Platform.OS === 'ios') {
      const { status: backgroundStatus, canAskAgain: backgroundCanAsk } = 
        await Location.requestBackgroundPermissionsAsync();

      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission denied (iOS)');
        // Still return success for foreground as it's the minimum required
      }
    }

    return { granted: true, canAskAgain: true };
  } catch (error) {
    console.error('Location permission error:', error);
    return { granted: false, canAskAgain: true, message: 'Permission request failed' };
  }
};

/**
 * Request media library permissions (for saving photos)
 */
export const requestMediaLibraryPermission = async (): Promise<PermissionStatus> => {
  try {
    const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
    
    if (status === 'granted') {
      return { granted: true, canAskAgain: true };
    }

    if (!canAskAgain) {
      Alert.alert(
        'Media Library Permission Required',
        'Media library access is required to save attendance photos. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return { granted: false, canAskAgain: false, message: 'Permission denied permanently' };
    }

    return { granted: false, canAskAgain: true, message: 'Permission denied' };
  } catch (error) {
    console.error('Media library permission error:', error);
    return { granted: false, canAskAgain: true, message: 'Permission request failed' };
  }
};

/**
 * Request image picker permissions (for selecting photos from gallery)
 */
export const requestImagePickerPermission = async (): Promise<PermissionStatus> => {
  try {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status === 'granted') {
      return { granted: true, canAskAgain: true };
    }

    if (!canAskAgain) {
      Alert.alert(
        'Photo Library Permission Required',
        'Photo library access is required to upload work reports and documents. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return { granted: false, canAskAgain: false, message: 'Permission denied permanently' };
    }

    return { granted: false, canAskAgain: true, message: 'Permission denied' };
  } catch (error) {
    console.error('Image picker permission error:', error);
    return { granted: false, canAskAgain: true, message: 'Permission request failed' };
  }
};

/**
 * Check if camera permission is already granted
 */
export const checkCameraPermission = async (): Promise<boolean> => {
  try {
    const permission = await Camera.getCameraPermissionsAsync();
    return permission.granted;
  } catch (error) {
    console.error('Check camera permission error:', error);
    return false;
  }
};

/**
 * Check if location permission is already granted
 */
export const checkLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Check location permission error:', error);
    return false;
  }
};

/**
 * Check if media library permission is already granted
 */
export const checkMediaLibraryPermission = async (): Promise<boolean> => {
  try {
    const { status } = await MediaLibrary.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Check media library permission error:', error);
    return false;
  }
};

/**
 * Request all required permissions for attendance module
 * This should be called when the app starts or when user navigates to attendance
 */
export const requestAttendancePermissions = async (): Promise<{
  camera: boolean;
  location: boolean;
  allGranted: boolean;
}> => {
  const cameraResult = await requestCameraPermission();
  const locationResult = await requestLocationPermission(false);

  return {
    camera: cameraResult.granted,
    location: locationResult.granted,
    allGranted: cameraResult.granted && locationResult.granted,
  };
};

/**
 * Platform-specific permission helper
 * Returns true if permission should be requested on this platform
 */
export const shouldRequestPermission = (permissionType: 'camera' | 'location' | 'media'): boolean => {
  // Both platforms require all permissions
  return true;
};

/**
 * Get user-friendly error message for permission denial
 */
export const getPermissionErrorMessage = (
  permissionType: 'camera' | 'location' | 'media' | 'gallery'
): string => {
  const messages = {
    camera: 'Camera access is required to capture attendance selfies. Please enable it in settings.',
    location: 'Location access is required to mark your attendance and verify your workplace. Please enable it in settings.',
    media: 'Media library access is required to save attendance photos. Please enable it in settings.',
    gallery: 'Photo library access is required to upload documents and work reports. Please enable it in settings.',
  };

  return messages[permissionType] || 'Permission is required for this feature.';
};

/**
 * Show permission explanation before requesting (best practice for iOS)
 */
export const showPermissionExplanation = (
  permissionType: 'camera' | 'location' | 'media' | 'gallery',
  onContinue: () => void
): void => {
  const explanations = {
    camera: {
      title: 'Camera Access Required',
      message: 'We need access to your camera to capture attendance selfies for identity verification. Your photos are securely stored and only used for attendance tracking.',
    },
    location: {
      title: 'Location Access Required',
      message: 'We need your location to verify you are at the correct workplace when marking attendance. This helps prevent fraudulent check-ins.',
    },
    media: {
      title: 'Media Library Access Required',
      message: 'We need access to your media library to save attendance photos to your device.',
    },
    gallery: {
      title: 'Photo Library Access Required',
      message: 'We need access to your photo library to allow you to upload work reports and documents.',
    },
  };

  const explanation = explanations[permissionType];

  Alert.alert(
    explanation.title,
    explanation.message,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: onContinue },
    ]
  );
};

export default {
  requestCameraPermission,
  requestLocationPermission,
  requestMediaLibraryPermission,
  requestImagePickerPermission,
  checkCameraPermission,
  checkLocationPermission,
  checkMediaLibraryPermission,
  requestAttendancePermissions,
  shouldRequestPermission,
  getPermissionErrorMessage,
  showPermissionExplanation,
};
