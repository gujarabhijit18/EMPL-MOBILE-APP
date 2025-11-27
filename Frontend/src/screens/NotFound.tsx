// 📂 src/screens/NotFoundScreen.tsx

import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from 'expo-status-bar';

const NotFoundScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();

  // ⚠️ Log any invalid route access
  useEffect(() => {
    console.warn(`⚠️ 404 Error: Tried to access unknown route — ${route.name}`);
  }, [route.name]);

  const handleGoHome = () => {
    try {
      navigation.navigate("Home");
    } catch (error) {
      Alert.alert("Navigation Error", "Unable to return to Home screen.");
      console.error("Navigation Error:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.code}>404</Text>
        <Text style={styles.message}>Oops! Page not found</Text>

        <TouchableOpacity style={styles.button} onPress={handleGoHome}>
          <Text style={styles.buttonText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default NotFoundScreen;

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6", // light gray
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  content: {
    alignItems: "center",
  },
  code: {
    fontSize: 72,
    fontWeight: "800",
    color: "#1F2937", // gray-800
    marginBottom: 12,
  },
  message: {
    fontSize: 18,
    color: "#4B5563", // gray-600
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#2563EB", // blue-600
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4, // Android shadow
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
