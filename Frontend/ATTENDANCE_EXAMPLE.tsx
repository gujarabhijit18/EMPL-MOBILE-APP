// 📱 EXAMPLE: Updated AttendancePage with New Services
// This shows how to integrate the new permission, location, and camera services
// Copy relevant parts to your actual AttendancePage.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Alert, View, Text, TouchableOpacity } from 'react-native';
import { CameraView } from 'expo-camera';

// ✅ Import new services
import { requestAttendancePermissions, checkCameraPermission, checkLocationPermission } from './src/utils/permissions';
import LocationService from './src/services/locationService';
import CameraService from './src/services/cameraService';
import { apiRequest, createAuthRequest } from './src/services/enhancedApiService';

export default function AttendancePageExample() {
  const [hasPermissions, setHasPermissions] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [cameraVisible, setCameraVisible] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(true);
  const cameraRef = useRef<any>(null);

  // ✅ Request permissions on mount
  useEffect(() => {
    initializePermissions();
  }, []);

  const initializePermissions = async () => {
    try {
      // Request all permissions at once
      const { camera, location, allGranted } = await requestAttendancePermissions();

      if (!allGranted) {
        Alert.alert(
          'Permissions Required',
          'This app requires camera and location access for attendance tracking.',
          [{ text: 'OK' }]
        );
        return;
      }

      setHasPermissions(true);

      // Get location with retry and timeout
      await loadLocation();
    } catch (error) {
      console.error('Permission initialization error:', error);
      Alert.alert('Error', 'Failed to initialize permissions');
    }
  };

  // ✅ Load location with new service
  const loadLocation = async () => {
    try {
      // Check permission first
      const hasLocationPermission = await checkLocationPermission();
      if (!hasLocationPermission) {
        Alert.alert('Location Required', 'Please enable location access');
        return;
      }

      // Get location with address
      // Automatically retries 3 times with 15s timeout
      const result = await LocationService.getCurrentLocationWithAddress({
        accuracy: 'high',
        timeout: 15000
      });

      setLocation(result.coordinates);
      setLocationAddress(result.address?.formattedAddress || 'Location detected');

      console.log('✅ Location loaded:', {
        coords: result.coordinates,
        address: result.address?.formattedAddress,
        accuracy: result.coordinates.accuracy
      });
    } catch (error: any) {
      console.error('Location error:', error);
      
      // User-friendly error messages
      if (error.message.includes('timeout')) {
        Alert.alert(
          'GPS Timeout',
          'Unable to get your location. Please ensure GPS is enabled and you have a clear view of the sky.'
        );
      } else {
        Alert.alert(
          'Location Error',
          'Failed to get your location. Please check that location services are enabled.'
        );
      }
    }
  };

  // ✅ Open camera with permission check
  const openCamera = async (checkIn: boolean) => {
    try {
      // Check permission
      const hasCameraPermission = await checkCameraPermission();
      if (!hasCameraPermission) {
        Alert.alert('Camera Required', 'Please enable camera access');
        return;
      }

      setIsCheckingIn(checkIn);
      setCameraVisible(true);
    } catch (error) {
      console.error('Camera open error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  // ✅ Take picture with new service
  const takePicture = async () => {
    try {
      // Capture photo with quality optimization
      const photo = await CameraService.takePicture(cameraRef, {
        quality: 0.7, // Balance between quality and size
        base64: false // We'll convert separately for better control
      });

      console.log('✅ Photo captured:', photo.uri);

      // Close camera
      setCameraVisible(false);

      // Submit attendance with photo
      await handleSubmitAttendance(photo.uri);
    } catch (error) {
      console.error('Photo capture error:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  // ✅ Submit attendance with new API service
  const handleSubmitAttendance = async (photoUri: string) => {
    try {
      if (!location) {
        Alert.alert('Location Required', 'Please enable location services');
        return;
      }

      // Show loading state
      // setIsLoading(true);

      // Prepare photo for upload (includes base64 conversion)
      const preparedPhoto = await CameraService.preparePhotoForUpload(photoUri, {
        quality: 0.7,
        maxSizeBytes: 5 * 1024 * 1024 // 5MB max
      });

      console.log('📤 Uploading photo, size:', preparedPhoto.size, 'bytes');

      // Format location for API
      const locationString = LocationService.formatCoordinatesForAPI(location);

      // Get user ID and token (from your auth context)
      const userId = 1; // Replace with actual user ID
      const token = 'your-token'; // Replace with actual token

      // Make API request with automatic retry
      const options = createAuthRequest(token, 'POST', {
        user_id: userId,
        location: locationString,
        selfie: preparedPhoto.base64,
        check_in: isCheckingIn,
        timestamp: new Date().toISOString()
      });

      const result = await apiRequest(
        'http://your-api.com/attendance/check-in',
        options
      );

      console.log('✅ Attendance submitted:', result);

      // Cleanup temporary photo file
      await CameraService.deletePhoto(photoUri);

      // Show success
      Alert.alert(
        'Success',
        isCheckingIn ? 'Checked in successfully!' : 'Checked out successfully!',
        [{ text: 'OK' }]
      );

      // Refresh attendance data
      // await loadAttendanceData();
    } catch (error: any) {
      console.error('Attendance submission error:', error);

      // Handle different error types
      let errorMessage = 'Failed to submit attendance. Please try again.';

      if (error.message.includes('Network request failed')) {
        errorMessage = 'No internet connection. Please check your network.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      // setIsLoading(false);
    }
  };

  // ✅ Refresh location button
  const handleRefreshLocation = async () => {
    Alert.alert(
      'Refresh Location',
      'Getting your current location...',
      [{ text: 'Cancel', style: 'cancel' }]
    );
    
    await loadLocation();
  };

  // ✅ Validate workplace location (optional)
  const checkWorkplaceProximity = async () => {
    if (!location) return false;

    // Define workplace coordinates (get from config or API)
    const workplaceCoords = {
      latitude: 12.345678,
      longitude: 98.765432
    };

    const radiusMeters = 100; // 100 meters

    const isNearWorkplace = LocationService.isWithinWorkplaceRadius(
      location,
      workplaceCoords,
      radiusMeters
    );

    if (!isNearWorkplace) {
      Alert.alert(
        'Location Warning',
        'You appear to be outside the workplace area. Continue anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => openCamera(true) }
        ]
      );
      return false;
    }

    return true;
  };

  // Render camera view
  if (cameraVisible) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front">
          <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 }}>
            <TouchableOpacity
              onPress={takePicture}
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: '#fff',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#3b82f6' }} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCameraVisible(false)}
              style={{ marginTop: 20 }}
            >
              <Text style={{ color: '#fff', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  // Main attendance UI
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Attendance
      </Text>

      {/* Location Card */}
      {location && (
        <View style={{ backgroundColor: '#f0f9ff', padding: 16, borderRadius: 12, marginBottom: 20 }}>
          <Text style={{ fontSize: 14, color: '#3b82f6', fontWeight: '600' }}>
            CURRENT LOCATION
          </Text>
          <Text style={{ fontSize: 16, color: '#1e3a8a', marginTop: 8 }}>
            {locationAddress}
          </Text>
          <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
          <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            Accuracy: ±{location.accuracy?.toFixed(0) || 'N/A'}m
          </Text>

          <TouchableOpacity
            onPress={handleRefreshLocation}
            style={{ marginTop: 12, alignSelf: 'flex-start' }}
          >
            <Text style={{ color: '#3b82f6', fontSize: 14, fontWeight: '600' }}>
              🔄 Refresh Location
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!location && (
        <View style={{ backgroundColor: '#fef2f2', padding: 16, borderRadius: 12, marginBottom: 20 }}>
          <Text style={{ color: '#dc2626', fontSize: 14 }}>
            ⚠️ Location not available. Please enable location services.
          </Text>
          <TouchableOpacity
            onPress={loadLocation}
            style={{ marginTop: 12 }}
          >
            <Text style={{ color: '#dc2626', fontSize: 14, fontWeight: '600' }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      <TouchableOpacity
        onPress={() => openCamera(true)}
        disabled={!hasPermissions || !location}
        style={{
          backgroundColor: hasPermissions && location ? '#22c55e' : '#d1d5db',
          padding: 16,
          borderRadius: 12,
          alignItems: 'center',
          marginBottom: 12
        }}
      >
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
          📸 Check In
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => openCamera(false)}
        disabled={!hasPermissions || !location}
        style={{
          backgroundColor: hasPermissions && location ? '#ef4444' : '#d1d5db',
          padding: 16,
          borderRadius: 12,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
          🏁 Check Out
        </Text>
      </TouchableOpacity>

      {!hasPermissions && (
        <View style={{ marginTop: 20, backgroundColor: '#fef3c7', padding: 16, borderRadius: 12 }}>
          <Text style={{ color: '#92400e', fontSize: 14 }}>
            ⚠️ Missing permissions. Please grant camera and location access.
          </Text>
          <TouchableOpacity
            onPress={initializePermissions}
            style={{ marginTop: 12 }}
          >
            <Text style={{ color: '#92400e', fontSize: 14, fontWeight: '600' }}>
              Request Permissions
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/*
 * 🎯 Key Changes Summary:
 * 
 * 1. Permission Management
 *    - requestAttendancePermissions() - One call for all permissions
 *    - checkCameraPermission(), checkLocationPermission() - Before actions
 * 
 * 2. Location Service
 *    - getCurrentLocationWithAddress() - Gets location with retry + timeout
 *    - formatCoordinatesForAPI() - Formats for backend
 *    - isWithinWorkplaceRadius() - Validate proximity
 * 
 * 3. Camera Service
 *    - takePicture() - Optimized photo capture
 *    - preparePhotoForUpload() - Automatic base64 + compression
 *    - deletePhoto() - Cleanup temp files
 * 
 * 4. API Service
 *    - createAuthRequest() - Build request with auth + retry
 *    - apiRequest() - Automatic retry + error parsing
 * 
 * 5. Error Handling
 *    - User-friendly messages for all error types
 *    - Network, timeout, permission errors handled
 * 
 * 📝 To integrate into your AttendancePage.tsx:
 *    1. Copy the imports
 *    2. Replace requestPermissions() with initializePermissions()
 *    3. Replace location logic with loadLocation()
 *    4. Replace camera logic with openCamera() and takePicture()
 *    5. Replace API calls with new apiRequest()
 *    6. Add error handling as shown
 * 
 * ✅ Result: Robust, cross-platform attendance tracking!
 */
