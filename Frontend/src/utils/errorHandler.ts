import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../lib/api';

/**
 * 🚨 Global Error Handler for API Errors
 * Detects token expiration and handles logout
 */
export const handleApiError = async (error: any, navigation?: any): Promise<string> => {
  const errorMessage = error?.message || 'An error occurred';
  
  // Check if it's a token expiration error
  const isTokenExpired = 
    errorMessage.includes('session has expired') ||
    errorMessage.includes('Signature has expired') ||
    errorMessage.includes('Invalid or expired token') ||
    errorMessage.includes('Authentication required');

  if (isTokenExpired) {
    console.warn('🔐 Token expiration detected, logging out user...');
    
    try {
      // Clear auth data
      await AsyncStorage.multiRemove(['user', 'token']);
      apiService.clearTokenCache();
      
      // Show alert to user
      Alert.alert(
        '🔐 Session Expired',
        'Your session has expired. Please log in again.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to login if navigation is provided
              if (navigation) {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error('Error during logout:', err);
    }
    
    return 'Your session has expired. Please log in again.';
  }

  return errorMessage;
};

/**
 * 🎯 Check if error is token-related
 */
export const isTokenError = (error: any): boolean => {
  const errorMessage = error?.message || '';
  return (
    errorMessage.includes('session has expired') ||
    errorMessage.includes('Signature has expired') ||
    errorMessage.includes('Invalid or expired token') ||
    errorMessage.includes('Authentication required')
  );
};
