import { Platform, ToastAndroid, Alert } from "react-native";

/**
 * 📢 useToast Hook (Expo Compatible)
 * ✅ Works perfectly in Expo Go (Android, iOS, Web)
 * ✅ Uses native Toast on Android
 * ✅ Uses Alert on iOS & Web as fallback
 * 🚫 No API integration or native dependencies
 */
export const useToast = () => {
  const showToast = (message: string) => {
    if (!message) return;

    if (Platform.OS === "android") {
      // ✅ Native Android toast
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else if (Platform.OS === "web") {
      // ✅ Web fallback
      alert(message);
    } else {
      // ✅ iOS (Expo-safe) fallback using Alert
      Alert.alert("Notification", message);
    }
  };

  return { showToast };
};
