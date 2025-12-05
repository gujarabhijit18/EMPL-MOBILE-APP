// 📂 src/utils/locationUtils.ts
import * as Location from "expo-location";
import { Alert } from "react-native";
import { GeoLocation } from "../types";

// -----------------------------
// ✅ Type Definitions
// -----------------------------
export type LocationData = GeoLocation & {
  accuracy?: number;
  placeName?: string;
  timestamp?: number;
};

export const formatLocationLabel = (value?: GeoLocation | string | null) => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  const coordsLabel = `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`;
  return value.address ? `${value.address} (${coordsLabel})` : coordsLabel;
};

// -----------------------------
// ✅ Request Location Permission (Expo Way - Cross-Platform)
// -----------------------------
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    // First check if location services are enabled
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      Alert.alert(
        "Location Services Disabled",
        "Please enable location services in your device settings to use this feature."
      );
      return false;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Location access is required to perform check-in/out."
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("Expo Location Permission Error:", error);
    return false;
  }
};

// -----------------------------
// ✅ Get Current Position (Expo)
// -----------------------------
export const getCurrentPosition = async (): Promise<Location.LocationObject> => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) throw new Error("Location permission denied.");

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
    return position;
  } catch (error) {
    console.error("Error fetching location:", error);
    throw new Error("Unable to get location. Please try again.");
  }
};

// -----------------------------
// ✅ Haversine Formula (Distance in Meters)
// -----------------------------
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth’s radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// -----------------------------
// ✅ Check if Current Location is Within Allowed Area
// -----------------------------
export const isWithinAllowedLocation = (
  currentLat: number,
  currentLon: number,
  allowedLat: number,
  allowedLon: number,
  allowedRadiusMeters: number
): boolean => {
  const distance = calculateDistance(currentLat, currentLon, allowedLat, allowedLon);
  return distance <= allowedRadiusMeters;
};

// -----------------------------
// ✅ Reverse Geocoding - Get Address from Coordinates
// -----------------------------
export const getAddressFromCoords = async (
  lat: number,
  lon: number
): Promise<{ address: string; placeName: string }> => {
  try {
    // Expo reverse geocoding
    const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (geocode.length > 0) {
      const place = geocode[0];
      const addressParts = [
        place.name || place.street,
        place.city,
        place.region,
        place.postalCode,
        place.country
      ].filter(Boolean);
      
      return {
        address: addressParts.join(", "),
        placeName: place.name || place.street || place.city || "Unknown Location",
      };
    }
  } catch (error) {
    console.error("Reverse geocoding error:", error);
  }

  // Fallback if geocoding fails
  return {
    address: `Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
    placeName: "Location detected",
  };
};

// -----------------------------
// ✅ Get Current Location - Detects User's Actual Location
// -----------------------------
export const getCurrentLocation = async (): Promise<LocationData> => {
  try {
    const position = await getCurrentPosition();
    const { latitude, longitude, accuracy } = position.coords;

    // Get address from coordinates
    const { address, placeName } = await getAddressFromCoords(latitude, longitude);

    return {
      latitude,
      longitude,
      accuracy: accuracy ?? undefined,
      address,
      placeName,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error getting current location:", error);
    throw error;
  }
};
