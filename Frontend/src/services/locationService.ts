// 📍 Enhanced Location Service for iOS & Android
// Provides high-accuracy GPS tracking with proper error handling

import * as Location from 'expo-location';
import { Platform, Alert } from 'react-native';

export interface LocationCoordinates {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number | null;
    heading?: number | null;
    speed?: number | null;
}

export interface LocationAddress {
    street?: string;
    name?: string;
    district?: string;
    subregion?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
    formattedAddress: string;
}

export interface LocationResult {
    coordinates: LocationCoordinates;
    address?: LocationAddress;
    timestamp: Date;
}

/**
 * Request location permission with proper platform handling
 */
export const requestLocationPermission = async (): Promise<boolean> => {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                'Location Permission Required',
                'Please enable location access to mark attendance and verify your workplace.',
                [{ text: 'OK' }]
            );
            return false;
        }

        // For iOS, optionally request background permission if needed
        if (Platform.OS === 'ios') {
            // Background permission request can be done separately when needed
            // await Location.requestBackgroundPermissionsAsync();
        }

        return true;
    } catch (error) {
        console.error('Location permission error:', error);
        return false;
    }
};

/**
 * Check if location permission is granted
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
 * Get current location with high accuracy
 * Uses platform-specific optimizations for iOS and Android
 */
export const getCurrentLocation = async (
    options?: {
        timeout?: number;
        accuracy?: 'low' | 'balanced' | 'high' | 'highest';
    }
): Promise<LocationCoordinates> => {
    try {
        const timeout = options?.timeout || 15000; // 15 seconds default
        const accuracyLevel = options?.accuracy || 'high';

        // Map accuracy level to Expo Location accuracy
        const accuracyMap = {
            low: Location.Accuracy.Low,
            balanced: Location.Accuracy.Balanced,
            high: Location.Accuracy.High,
            highest: Location.Accuracy.Highest,
        };

        const accuracy = accuracyMap[accuracyLevel];

        // 1. Try to get last known position first (nearly instant)
        try {
            const lastKnown = await Location.getLastKnownPositionAsync();
            if (lastKnown) {
                const ageMinutes = (Date.now() - lastKnown.timestamp) / 60000;
                // If it's very fresh (last 2 mins) and accurate enough, use it immediately
                if (ageMinutes < 2 && (lastKnown.coords.accuracy || 1000) < 50) {
                    console.log('✅ Using fresh last known location');
                    return {
                        latitude: lastKnown.coords.latitude,
                        longitude: lastKnown.coords.longitude,
                        accuracy: lastKnown.coords.accuracy || undefined,
                    };
                }
            }
        } catch (e) {
            console.warn('⚠️ Could not get last known position:', e);
        }

        // 2. Try to get current position with full accuracy
        const locationOptions: Location.LocationOptions = {
            accuracy,
        };

        // Create a wrapper for getCurrentPositionAsync that we can timeout
        const getFreshLocation = async () => {
            try {
                return await Location.getCurrentPositionAsync(locationOptions);
            } catch (err) {
                // If high accuracy fails, try balanced as a fallback immediately
                if (accuracy === Location.Accuracy.High || accuracy === Location.Accuracy.Highest) {
                    console.log('🔄 High accuracy failed, falling back to balanced...');
                    return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                }
                throw err;
            }
        };

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Location request timeout')), timeout);
        });

        const location = await Promise.race([getFreshLocation(), timeoutPromise]) as Location.LocationObject;

        console.log('✅ Location obtained:', {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy,
            platform: Platform.OS,
        });

        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
        };
    } catch (error) {
        console.error('❌ Failed to get location:', error);

        // Final fallback: try to get ANY last known position if current fetch failed or timed out
        try {
            const finalFallback = await Location.getLastKnownPositionAsync();
            if (finalFallback) {
                console.log('✅ Using fallback last known location after failure');
                return {
                    latitude: finalFallback.coords.latitude,
                    longitude: finalFallback.coords.longitude,
                    accuracy: finalFallback.coords.accuracy || undefined,
                };
            }
        } catch (e) { }

        if (error instanceof Error && error.message.includes('timeout')) {
            throw new Error('Location request timed out. Please ensure GPS is enabled and try again.');
        }

        const platformHint = Platform.OS === 'ios'
            ? 'Go to Settings > Privacy > Location Services to enable.'
            : 'Go to Settings > Location to enable GPS.';

        throw new Error(`Unable to get your location. ${platformHint}`);
    }
};

/**
 * Get address from coordinates (reverse geocoding)
 * Platform-agnostic
 */
export const getAddressFromCoordinates = async (
    coords: LocationCoordinates
): Promise<LocationAddress> => {
    try {
        const [place] = await Location.reverseGeocodeAsync({
            latitude: coords.latitude,
            longitude: coords.longitude,
        });

        if (!place) {
            // Fallback to coordinates if no address found
            return {
                formattedAddress: `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
            };
        }

        // Build formatted address
        const addressParts = [
            place.name,
            place.street,
            place.district || place.subregion,
            place.city,
            place.region,
            place.country,
        ].filter(Boolean);

        const formattedAddress = addressParts.length > 0
            ? addressParts.join(', ')
            : `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;

        return {
            street: place.street || undefined,
            name: place.name || undefined,
            district: place.district || undefined,
            subregion: place.subregion || undefined,
            city: place.city || undefined,
            region: place.region || undefined,
            country: place.country || undefined,
            postalCode: place.postalCode || undefined,
            formattedAddress,
        };
    } catch (error) {
        console.warn('⚠️ Reverse geocoding failed, using coordinates:', error);

        // Fallback to coordinates
        return {
            formattedAddress: `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
        };
    }
};

/**
 * Get current location with address
 * Convenience method that combines location and geocoding
 */
export const getCurrentLocationWithAddress = async (
    options?: {
        timeout?: number;
        accuracy?: 'low' | 'balanced' | 'high' | 'highest';
        skipGeocoding?: boolean;
    }
): Promise<LocationResult> => {
    const coordinates = await getCurrentLocation({
        timeout: options?.timeout,
        accuracy: options?.accuracy,
    });

    let address: LocationAddress | undefined;

    if (!options?.skipGeocoding) {
        try {
            address = await getAddressFromCoordinates(coordinates);
        } catch (error) {
            console.warn('⚠️ Could not get address, continuing without it:', error);
        }
    }

    return {
        coordinates,
        address,
        timestamp: new Date(),
    };
};

/**
 * Format coordinates for API (string format)
 */
export const formatCoordinatesForAPI = (coords: LocationCoordinates): string => {
    return `${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
};

/**
 * Calculate distance between two coordinates (in meters)
 * Uses Haversine formula
 */
export const calculateDistance = (
    coord1: LocationCoordinates,
    coord2: LocationCoordinates
): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (coord1.latitude * Math.PI) / 180;
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

/**
 * Validate if user is within workplace radius
 * @param currentLocation User's current location
 * @param workplaceLocation Workplace location
 * @param radiusMeters Allowed radius in meters (default: 100m)
 */
export const isWithinWorkplaceRadius = (
    currentLocation: LocationCoordinates,
    workplaceLocation: LocationCoordinates,
    radiusMeters: number = 100
): boolean => {
    const distance = calculateDistance(currentLocation, workplaceLocation);
    return distance <= radiusMeters;
};

/**
 * Watch location changes (for continuous tracking)
 * Returns a subscription that can be removed
 */
export const watchLocation = async (
    callback: (location: LocationCoordinates) => void,
    options?: {
        accuracy?: 'low' | 'balanced' | 'high' | 'highest';
        distanceInterval?: number; // Minimum distance change (meters)
        timeInterval?: number; // Minimum time change (ms)
    }
): Promise<Location.LocationSubscription> => {
    const accuracyMap = {
        low: Location.Accuracy.Low,
        balanced: Location.Accuracy.Balanced,
        high: Location.Accuracy.High,
        highest: Location.Accuracy.Highest,
    };

    const accuracy = accuracyMap[options?.accuracy || 'balanced'];

    const subscription = await Location.watchPositionAsync(
        {
            accuracy,
            distanceInterval: options?.distanceInterval || 10, // 10 meters
            timeInterval: options?.timeInterval || 5000, // 5 seconds
        },
        (location) => {
            callback({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy || undefined,
                altitude: location.coords.altitude,
                heading: location.coords.heading,
                speed: location.coords.speed,
            });
        }
    );

    return subscription;
};

/**
 * Stop watching location
 */
export const stopWatchingLocation = (subscription: Location.LocationSubscription): void => {
    subscription.remove();
    console.log('✅ Stopped watching location');
};

/**
 * Check if location services are enabled
 */
export const isLocationEnabled = async (): Promise<boolean> => {
    try {
        return await Location.hasServicesEnabledAsync();
    } catch (error) {
        console.error('Error checking location services:', error);
        return false;
    }
};

/**
 * Prompt user to enable location services if disabled
 */
export const promptEnableLocation = async (): Promise<void> => {
    const enabled = await isLocationEnabled();

    if (!enabled) {
        Alert.alert(
            'Location Services Disabled',
            'Please enable location services in your device settings to use this feature.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Open Settings',
                    onPress: () => {
                        // This will open app settings where user can enable location
                        if (Platform.OS === 'ios') {
                            // iOS doesn't allow direct navigation to location settings
                            Alert.alert('Enable Location', 'Go to Settings > Privacy > Location Services');
                        } else {
                            // Android can open location settings
                            // Linking.openSettings();
                        }
                    }
                },
            ]
        );
    }
};

/**
 * Get location with retry logic
 * Useful for handling temporary GPS issues
 */
export const getLocationWithRetry = async (
    maxRetries: number = 3,
    options?: {
        timeout?: number;
        accuracy?: 'low' | 'balanced' | 'high' | 'highest';
    }
): Promise<LocationCoordinates> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Location attempt ${attempt}/${maxRetries}`);
            const location = await getCurrentLocation(options);
            console.log(`✅ Location obtained on attempt ${attempt}`);
            return location;
        } catch (error) {
            lastError = error as Error;
            console.warn(`⚠️ Location attempt ${attempt} failed:`, error);

            if (attempt < maxRetries) {
                // Wait before retry (exponential backoff)
                const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    throw lastError || new Error('Failed to get location after multiple attempts');
};

export default {
    requestLocationPermission,
    checkLocationPermission,
    getCurrentLocation,
    getAddressFromCoordinates,
    getCurrentLocationWithAddress,
    formatCoordinatesForAPI,
    calculateDistance,
    isWithinWorkplaceRadius,
    watchLocation,
    stopWatchingLocation,
    isLocationEnabled,
    promptEnableLocation,
    getLocationWithRetry,
};
