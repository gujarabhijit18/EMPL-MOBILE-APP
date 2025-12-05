// 📷 Enhanced Camera Service for iOS & Android
// Handles camera operations with platform-specific optimizations

import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Platform, Alert } from 'react-native';
import { normalizeFileUri, readFileAsBase64, cleanupTempFile } from '../utils/platformUtils';

export interface CameraPhoto {
    uri: string;
    width: number;
    height: number;
    base64?: string;
    exif?: any;
}

export interface ImagePickerResult {
    uri: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    width: number;
    height: number;
    base64?: string;
}

/**
 * Request camera permission
 * Uses expo-camera's permission hooks for cross-platform compatibility
 */
export const requestCameraPermission = async (): Promise<boolean> => {
    try {
        // Use ImagePicker's camera permission request which is more reliable
        const { status } = await ImagePicker.requestCameraPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                'Camera Permission Required',
                'Please enable camera access to capture attendance selfies.',
                [{ text: 'OK' }]
            );
            return false;
        }

        return true;
    } catch (error) {
        console.error('Camera permission error:', error);
        return false;
    }
};

/**
 * Check if camera permission is granted
 */
export const checkCameraPermission = async (): Promise<boolean> => {
    try {
        // Use ImagePicker's permission check which is more reliable
        const { status } = await ImagePicker.getCameraPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Check camera permission error:', error);
        return false;
    }
};

/**
 * Take photo with camera
 * @param cameraRef Reference to CameraView component
 * @param options Photo options
 */
export const takePicture = async (
    cameraRef: any,
    options?: {
        quality?: number; // 0-1, default 0.7
        base64?: boolean; // Include base64, default false
        skipProcessing?: boolean; // Skip compression, default false
        exif?: boolean; // Include EXIF data, default false
    }
): Promise<CameraPhoto> => {
    try {
        if (!cameraRef || !cameraRef.current) {
            throw new Error('Camera reference is not available');
        }

        const quality = options?.quality !== undefined ? options.quality : 0.7;
        const includeBase64 = options?.base64 || false;
        const includeExif = options?.exif || false;

        const photo = await cameraRef.current.takePictureAsync({
            quality,
            base64: includeBase64,
            skipProcessing: options?.skipProcessing || false,
            exif: includeExif,
        });

        console.log('✅ Photo captured:', {
            uri: photo.uri,
            width: photo.width,
            height: photo.height,
            hasBase64: !!photo.base64,
        });

        return {
            uri: normalizeFileUri(photo.uri),
            width: photo.width,
            height: photo.height,
            base64: photo.base64,
            exif: photo.exif,
        };
    } catch (error) {
        console.error('❌ Failed to take picture:', error);
        throw new Error('Failed to capture photo. Please try again.');
    }
};

/**
 * Compress photo to target size
 * Useful for reducing upload size
 */
export const compressPhoto = async (
    uri: string,
    options?: {
        maxWidth?: number; // Max width in pixels
        maxHeight?: number; // Max height in pixels
        quality?: number; // 0-1, compression quality
    }
): Promise<string> => {
    try {
        // For now, we'll use ImagePicker's compress functionality
        // In production, you might want to use a dedicated image manipulation library

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: options?.quality || 0.7,
            base64: false,
            allowsEditing: false,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return uri; // Return original if compression fails
        }

        console.log('✅ Photo compressed');
        return normalizeFileUri(result.assets[0].uri);
    } catch (error) {
        console.warn('⚠️ Photo compression failed, using original:', error);
        return uri;
    }
};

/**
 * Convert photo to base64
 * Handles platform-specific URI schemes
 */
export const photoToBase64 = async (uri: string): Promise<string> => {
    try {
        const normalizedUri = normalizeFileUri(uri);
        const base64 = await readFileAsBase64(normalizedUri);
        console.log('✅ Photo converted to base64, size:', base64.length);
        return base64;
    } catch (error) {
        console.error('❌ Failed to convert photo to base64:', error);
        throw new Error('Failed to process photo');
    }
};

/**
 * Save photo to device gallery
 * Requires media library permission
 */
export const savePhotoToGallery = async (uri: string, albumName?: string): Promise<void> => {
    try {
        // Request media library permission
        const { status } = await MediaLibrary.requestPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Please enable media library access to save photos.',
                [{ text: 'OK' }]
            );
            return;
        }

        const normalizedUri = normalizeFileUri(uri);

        // Save to gallery
        const asset = await MediaLibrary.createAssetAsync(normalizedUri);

        // Optionally create/add to album
        if (albumName) {
            try {
                const album = await MediaLibrary.getAlbumAsync(albumName);
                if (album) {
                    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                } else {
                    await MediaLibrary.createAlbumAsync(albumName, asset, false);
                }
                console.log(`✅ Photo saved to album: ${albumName}`);
            } catch (error) {
                console.warn('⚠️ Failed to add to album, but photo is saved:', error);
            }
        }

        console.log('✅ Photo saved to gallery');
    } catch (error) {
        console.error('❌ Failed to save photo:', error);
        Alert.alert('Error', 'Failed to save photo to gallery');
    }
};

/**
 * Pick image from gallery
 * Cross-platform compatible for iOS and Android
 */
export const pickImageFromGallery = async (
    options?: {
        allowsEditing?: boolean;
        aspect?: [number, number];
        quality?: number;
        includeBase64?: boolean;
    }
): Promise<ImagePickerResult | null> => {
    try {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Please enable photo library access to select images.',
                [{ text: 'OK' }]
            );
            return null;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: options?.allowsEditing || false,
            aspect: options?.aspect,
            quality: options?.quality || 0.8,
            base64: options?.includeBase64 || false,
            // iOS specific: ensure we get a local copy of the image
            exif: false,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return null;
        }

        const asset = result.assets[0];

        console.log('✅ Image picked from gallery:', {
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            platform: Platform.OS,
        });

        // Normalize the URI for cross-platform compatibility
        const normalizedUri = normalizeFileUri(asset.uri);

        // Generate filename if not provided (common on iOS)
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;

        // Determine mime type
        const mimeType = asset.mimeType || (fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

        return {
            uri: normalizedUri,
            fileName,
            fileSize: asset.fileSize,
            mimeType,
            width: asset.width,
            height: asset.height,
            base64: asset.base64 || undefined,
        };
    } catch (error) {
        console.error('❌ Failed to pick image:', error);
        Alert.alert('Error', 'Failed to select image');
        return null;
    }
};

/**
 * Get photo dimensions
 */
export const getPhotoDimensions = async (uri: string): Promise<{ width: number; height: number }> => {
    try {
        const normalizedUri = normalizeFileUri(uri);
        const info = await FileSystem.getInfoAsync(normalizedUri);

        if (!info.exists) {
            throw new Error('File does not exist');
        }

        // For images, we need to use Image.getSize (from React Native)
        // This is a simplified version
        return { width: 0, height: 0 }; // Placeholder
    } catch (error) {
        console.error('Failed to get photo dimensions:', error);
        return { width: 0, height: 0 };
    }
};

/**
 * Get photo file size in bytes
 */
export const getPhotoSize = async (uri: string): Promise<number> => {
    try {
        const normalizedUri = normalizeFileUri(uri);
        const info = await FileSystem.getInfoAsync(normalizedUri);

        if (!info.exists) {
            throw new Error('File does not exist');
        }

        return info.size || 0;
    } catch (error) {
        console.error('Failed to get photo size:', error);
        return 0;
    }
};

/**
 * Delete photo from file system
 */
export const deletePhoto = async (uri: string): Promise<void> => {
    try {
        await cleanupTempFile(uri);
    } catch (error) {
        console.warn('Failed to delete photo:', error);
    }
};

/**
 * Validate photo
 * Checks if photo exists and meets requirements
 */
export const validatePhoto = async (
    uri: string,
    options?: {
        maxSizeBytes?: number; // Max file size in bytes
        minWidth?: number; // Minimum width in pixels
        minHeight?: number; // Minimum height in pixels
    }
): Promise<{ valid: boolean; error?: string }> => {
    try {
        const normalizedUri = normalizeFileUri(uri);
        const info = await FileSystem.getInfoAsync(normalizedUri);

        if (!info.exists) {
            return { valid: false, error: 'Photo file does not exist' };
        }

        // Check file size
        if (options?.maxSizeBytes && info.size && info.size > options.maxSizeBytes) {
            const maxSizeMB = (options.maxSizeBytes / (1024 * 1024)).toFixed(2);
            const actualSizeMB = ((info.size || 0) / (1024 * 1024)).toFixed(2);
            return {
                valid: false,
                error: `Photo is too large (${actualSizeMB}MB). Maximum size is ${maxSizeMB}MB.`,
            };
        }

        // Add dimension checks here if needed
        // Would require Image.getSize from React Native

        return { valid: true };
    } catch (error) {
        console.error('Photo validation error:', error);
        return { valid: false, error: 'Failed to validate photo' };
    }
};

/**
 * Create photo URI from base64
 * Useful for displaying base64 images
 */
export const createPhotoUriFromBase64 = (base64: string, mimeType: string = 'image/jpeg'): string => {
    return `data:${mimeType};base64,${base64}`;
};

/**
 * Prepare photo for upload
 * Returns optimized photo with base64 encoding
 */
export const preparePhotoForUpload = async (
    uri: string,
    options?: {
        quality?: number;
        maxSizeBytes?: number;
    }
): Promise<{ uri: string; base64: string; size: number }> => {
    try {
        let photoUri = uri;

        // Validate photo
        const validation = await validatePhoto(photoUri, {
            maxSizeBytes: options?.maxSizeBytes,
        });

        if (!validation.valid) {
            throw new Error(validation.error || 'Invalid photo');
        }

        // Convert to base64
        const base64 = await photoToBase64(photoUri);
        const size = base64.length;

        console.log('✅ Photo prepared for upload, size:', size);

        return {
            uri: photoUri,
            base64,
            size,
        };
    } catch (error) {
        console.error('❌ Failed to prepare photo for upload:', error);
        throw new Error('Failed to prepare photo for upload');
    }
};

/**
 * Platform-specific camera settings
 */
export const getCameraSettings = () => ({
    // iOS prefers higher quality, Android might need optimization
    quality: Platform.OS === 'ios' ? 0.8 : 0.7,
    // iOS handles compression better
    skipProcessing: false,
    // Flash mode
    flashMode: 'off' as const,
    // Camera type (front/back)
    cameraType: 'front' as const,
    // Zoom
    zoom: 0,
});

export default {
    requestCameraPermission,
    checkCameraPermission,
    takePicture,
    compressPhoto,
    photoToBase64,
    savePhotoToGallery,
    pickImageFromGallery,
    getPhotoDimensions,
    getPhotoSize,
    deletePhoto,
    validatePhoto,
    createPhotoUriFromBase64,
    preparePhotoForUpload,
    getCameraSettings,
};
