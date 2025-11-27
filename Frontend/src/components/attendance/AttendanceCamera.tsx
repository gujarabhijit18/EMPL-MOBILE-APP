import React, { useState, useRef, useEffect } from "react";
import { View, Image, StyleSheet, Text } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, Card } from "react-native-paper";
import Icon from "react-native-vector-icons/Ionicons";

interface AttendanceCameraProps {
  onCapture: (imagePath: string) => void;
  onCancel: () => void;
}

export default function AttendanceCameraScreen({
  onCapture,
  onCancel,
}: AttendanceCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });
      setPhotoUri(photo.uri);
    }
  };

  const retakePhoto = () => {
    setPhotoUri(null);
  };

  const confirmPhoto = () => {
    if (photoUri) onCapture(photoUri);
  };

  if (!permission) {
    // Still loading permissions
    return (
      <View style={styles.permissionContainer}>
        <Text>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-outline" size={60} color="#9CA3AF" />
        <Text style={styles.permissionText}>
          Camera permission required to capture attendance photo.
        </Text>
        <Button mode="contained" onPress={requestPermission}>
          Grant Permission
        </Button>
        <Button onPress={onCancel}>Cancel</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.headerText}>Capture Attendance Photo</Text>

          <View style={styles.cameraContainer}>
            {!photoUri ? (
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="front"
              />
            ) : (
              <Image source={{ uri: photoUri }} style={styles.capturedPhoto} />
            )}
          </View>

          <View style={styles.buttonsRow}>
            {!photoUri ? (
              <>
                <Button
                  mode="contained"
                  icon="camera"
                  onPress={takePicture}
                  style={styles.captureButton}
                >
                  Capture
                </Button>
                <Button
                  mode="outlined"
                  onPress={onCancel}
                  icon="close"
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  mode="outlined"
                  onPress={retakePhoto}
                  icon="refresh"
                  style={styles.retakeButton}
                >
                  Retake
                </Button>
                <Button
                  mode="contained"
                  onPress={confirmPhoto}
                  icon="checkmark"
                  style={styles.confirmButton}
                >
                  Use Photo
                </Button>
              </>
            )}
          </View>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
  },
  card: {
    marginHorizontal: 20,
    padding: 10,
    borderRadius: 16,
    elevation: 4,
  },
  headerText: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#111827",
  },
  cameraContainer: {
    borderRadius: 16,
    overflow: "hidden",
    height: 400,
    backgroundColor: "#E5E7EB",
  },
  camera: {
    flex: 1,
  },
  capturedPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  captureButton: {
    backgroundColor: "#2563EB",
  },
  cancelButton: {
    borderColor: "#9CA3AF",
  },
  retakeButton: {
    borderColor: "#6B7280",
  },
  confirmButton: {
    backgroundColor: "#059669",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F9FAFB",
  },
  permissionText: {
    fontSize: 14,
    textAlign: "center",
    color: "#374151",
    marginTop: 10,
    marginBottom: 10,
  },
});
