import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { Card, Button } from "react-native-paper";
import Icon from "react-native-vector-icons/Ionicons";

// Reference point (PVG College)
const PVG_COLLEGE_COORDS = {
  latitude: 18.4649,
  longitude: 73.8678,
  radius: 100, // meters
  address: "PVG College, Parvati, Pune, Maharashtra 411009",
};

export default function AttendanceWithLocationScreen() {
  const [location, setLocation] = useState<any>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [status, setStatus] = useState<"checked-in" | "checked-out">("checked-out");

  // ✅ Haversine formula (to measure distance between two coordinates)
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
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

  // ✅ Get current location using Expo Location API
  const getCurrentLocation = async () => {
    try {
      setCheckingLocation(true);
      setLocationError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Location permission denied");
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const { latitude, longitude, accuracy } = loc.coords;

      const distance = getDistance(
        latitude,
        longitude,
        PVG_COLLEGE_COORDS.latitude,
        PVG_COLLEGE_COORDS.longitude
      );

      if (distance > PVG_COLLEGE_COORDS.radius) {
        throw new Error("You must be within PVG College premises to check in/out");
      }

      const locationData = {
        latitude,
        longitude,
        accuracy,
        address: PVG_COLLEGE_COORDS.address,
        timestamp: new Date().toISOString(),
      };

      setLocation(locationData);
      return locationData;
    } catch (error: any) {
      setLocationError(error.message);
      Alert.alert("Location Error", error.message);
      throw error;
    } finally {
      setCheckingLocation(false);
    }
  };

  // ✅ Handle Check In
  const handleCheckIn = async () => {
    try {
      const loc = await getCurrentLocation();
      setStatus("checked-in");
      Alert.alert("✅ Checked In", `Location verified: ${loc.address}`);
    } catch (err) {
      // handled inside getCurrentLocation
    }
  };

  // ✅ Handle Check Out
  const handleCheckOut = async () => {
    try {
      const loc = await getCurrentLocation();
      setStatus("checked-out");
      setLocation(null);
      Alert.alert("👋 Checked Out", `Checked out from: ${loc.address}`);
    } catch (err) {
      // handled inside getCurrentLocation
    }
  };

  // ✅ UI for showing location and status
  const renderLocationStatus = () => {
    if (checkingLocation)
      return (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.textMuted}> Detecting your location...</Text>
        </View>
      );

    if (locationError)
      return (
        <View style={styles.statusRow}>
          <Icon name="alert-circle" color="#EF4444" size={18} />
          <Text style={styles.textError}> {locationError}</Text>
        </View>
      );

    if (location)
      return (
        <View style={{ gap: 4 }}>
          <View style={styles.statusRow}>
            <Icon name="checkmark-circle" color="#10B981" size={18} />
            <Text style={styles.textGreen}>
              {" "}
              Location verified: PVG College
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Icon name="location" color="#6B7280" size={14} />
            <Text style={styles.textSmall}>{location.address}</Text>
          </View>
          <View style={styles.statusRow}>
            <Icon name="time" color="#6B7280" size={12} />
            <Text style={styles.textSmall}>
              Accuracy: {Math.round(location.accuracy)}m
            </Text>
          </View>
        </View>
      );

    return (
      <Text style={styles.textMuted}>
        Your location will be verified when you check in/out.{"\n"}
        <Text style={styles.textSmall}>
          You must be within 100m of PVG College.
        </Text>
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Attendance" />
        <Card.Content>
          <Text style={styles.description}>
            {status === "checked-out"
              ? "Check in to start tracking attendance"
              : "You are currently checked in"}
          </Text>

          <View style={styles.locationBox}>
            <View style={styles.locationHeader}>
              <Icon name="location-outline" size={18} color="#2563EB" />
              <Text style={styles.locationTitle}> Location</Text>
            </View>
            {renderLocationStatus()}
          </View>

          {status === "checked-out" && (
            <Button
              mode="contained"
              icon="checkmark"
              loading={checkingLocation}
              onPress={handleCheckIn}
              style={styles.actionButton}
            >
              Check In
            </Button>
          )}

          {status === "checked-in" && (
            <Button
              mode="outlined"
              icon="log-out-outline"
              loading={checkingLocation}
              onPress={handleCheckOut}
              style={styles.actionButton}
            >
              Check Out
            </Button>
          )}

          <Text style={styles.footerText}>
            You must be within PVG College premises to check in/out.{"\n"}
            Address: {PVG_COLLEGE_COORDS.address}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    borderRadius: 16,
    elevation: 3,
  },
  description: {
    color: "#6B7280",
    marginBottom: 10,
  },
  locationBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 10,
    marginVertical: 10,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  locationTitle: {
    fontWeight: "600",
    fontSize: 14,
    color: "#111827",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  textMuted: { color: "#6B7280", fontSize: 13 },
  textError: { color: "#EF4444", fontSize: 13 },
  textGreen: { color: "#10B981", fontSize: 13 },
  textSmall: { color: "#6B7280", fontSize: 12 },
  actionButton: {
    marginVertical: 8,
  },
  footerText: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
  },
});
