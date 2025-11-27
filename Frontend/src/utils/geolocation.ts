// 📂 src/utils/locationUtils.ts
import * as Location from "expo-location";
import { Alert } from "react-native";
import { GeoLocation } from "../types";

// -----------------------------
// ✅ PVG College Coordinates (Sample)
// -----------------------------
const PVG_COLLEGE_COORDS = {
  latitude: 18.4649,
  longitude: 73.8678,
  address: "PVG College, Parvati, Pune, Maharashtra 411009",
  radius: 100, // meters
};

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
// ✅ Request Location Permission (Expo Way)
// -----------------------------
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
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
// ✅ Check if Current Location is Within PVG Campus
// -----------------------------
export const isWithinAllowedLocation = (
  currentLat: number,
  currentLon: number,
  allowedLat: number = PVG_COLLEGE_COORDS.latitude,
  allowedLon: number = PVG_COLLEGE_COORDS.longitude,
  allowedRadiusMeters: number = PVG_COLLEGE_COORDS.radius
): boolean => {
  const distance = calculateDistance(currentLat, currentLon, allowedLat, allowedLon);
  return distance <= allowedRadiusMeters;
};

// -----------------------------
// ✅ Offline Mock Reverse Geocoding
// -----------------------------
export const getAddressFromCoords = async (
  lat: number,
  lon: number
): Promise<{ address: string; placeName: string }> => {
  try {
    // Expo reverse geocoding (offline-friendly if cached)
    const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (geocode.length > 0) {
      const place = geocode[0];
      return {
        address: `${place.name || place.street}, ${place.city || ""} ${place.region || ""}`,
        placeName: place.name || place.city || "Unknown Area",
      };
    }
  } catch {
    // Ignore errors — fallback below
  }

  // 🚫 No API calls — simulated local result
  const isNearPVG = isWithinAllowedLocation(lat, lon);
  return {
    address: isNearPVG
      ? PVG_COLLEGE_COORDS.address
      : "Approximate location detected (offline mode)",
    placeName: isNearPVG ? "PVG College Campus" : "Unknown Area",
  };
};

// -----------------------------
// ✅ Get Current Location with Validation
// -----------------------------
export const getCurrentLocation = async (): Promise<LocationData> => {
  try {
    const position = await getCurrentPosition();
    const { latitude, longitude, accuracy } = position.coords;

    // Validate location proximity
    const isAllowed = isWithinAllowedLocation(latitude, longitude);
    if (!isAllowed) {
      throw new Error(
        "❌ You must be within PVG College premises to check in/out."
      );
    }

    // Reverse geocode (offline-safe)
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

// -----------------------------
// ✅ Mock Location (For Emulator / Testing)
// -----------------------------
export const getMockLocation = (): LocationData => ({
  latitude: 18.4649,
  longitude: 73.8678,
  accuracy: 10,
  address: PVG_COLLEGE_COORDS.address,
  placeName: "PVG College Campus (Mock)",
  timestamp: Date.now(),
});
