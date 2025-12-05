// 📂 src/screens/Login.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../lib/api";

const { height } = Dimensions.get("window");

const LoginScreen = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isLoadingOTP, setIsLoadingOTP] = useState(false);
  const [isFocused, setIsFocused] = useState({ email: false, otp: false });

  // Refs for inputs
  const emailInputRef = useRef<TextInput>(null);
  const otpInputRef = useRef<TextInput>(null);

  // Animation values
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const otpFormAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(formAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(buttonAnim, {
          toValue: 1,
          duration: 500,
          delay: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (otpSent) {
      Animated.spring(otpFormAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
      // Focus OTP input after animation
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } else {
      otpFormAnim.setValue(0);
    }
  }, [otpSent]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const testBackendConnection = async () => {
    try {
      await apiService.testConnection();
      return true;
    } catch (error: any) {
      console.error("❌ Backend connection failed:", error.message);
      Alert.alert(
        "Connection Error",
        `Cannot connect to backend server.\n\nPlease ensure:\n• Server is running on ${apiService.getBaseUrl()}\n• Correct IP/Port is configured\n• No firewall blocking the connection`,
        [{ text: "OK" }]
      );
      return false;
    }
  };

  const validateEmail = (emailValue: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailValue);
  };

  const handleSendOTP = async () => {
    Keyboard.dismiss();
    
    if (!email) {
      setEmailError("Please enter your email");
      shakeError();
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      shakeError();
      return;
    }

    setEmailError("");
    setOtpError("");

    const isConnected = await testBackendConnection();
    if (!isConnected) return;

    try {
      setIsLoadingOTP(true);
      const response = await apiService.sendOTP(email);
      setOtpSent(true);
      setCountdown(60);

      const isDevelopment = response.environment !== "production" && response.otp !== undefined;
      const otpValue = isDevelopment && response.otp ? response.otp.toString() : null;

      if (isDevelopment && response.otp) {
        console.log(`🔑 DEV OTP: ${response.otp}`);
      }

      const message = isDevelopment
        ? `OTP sent to ${email}\n\n🔑 DEV OTP: ${response.otp}\n\nExpires in ${response.expires_in_minutes} minutes`
        : `OTP sent to ${email}\n\nExpires in ${response.expires_in_minutes} minutes`;

      Alert.alert("✅ OTP Sent", message, [
        {
          text: "OK",
          onPress: () => {
            if (otpValue) {
              setOtp(otpValue);
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error("❌ Send OTP Error:", error);
      Alert.alert("Error", error.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoadingOTP(false);
    }
  };

  const handleResendOTP = () => {
    if (countdown > 0) return;
    handleSendOTP();
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    
    if (!otp) {
      setOtpError("Please enter the OTP");
      shakeError();
      return;
    }

    if (otp.length !== 4 && otp.length !== 6) {
      setOtpError("Please enter a valid OTP (4 or 6 digits)");
      shakeError();
      return;
    }

    try {
      console.log(`🔐 Attempting login with email: ${email}, OTP: ${otp}`);
      const response = await apiService.verifyOTP(email, otp);
      await login(email, otp, response);
      Alert.alert("✅ Success", `Welcome back, ${response.name}!`);
    } catch (error: any) {
      console.error("❌ Login Error:", error);
      setOtpError(error.message || "Invalid OTP. Please try again.");
      shakeError();
      Alert.alert("Login Failed", error.message || "Invalid OTP. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={["#667eea", "#764ba2", "#f093fb"] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />

      {/* Decorative Circles */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo Section */}
            <Animated.View
              style={[
                styles.logoSection,
                {
                  opacity: logoAnim,
                  transform: [
                    {
                      scale: logoAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    },
                    {
                      translateY: logoAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"] as const}
                  style={styles.logoGradient}
                >
                  <Text style={styles.logoText}>S</Text>
                </LinearGradient>
              </View>
              <Text style={styles.brandName}>Shekru Labs India</Text>
              <Text style={styles.brandTagline}>Employee Management System</Text>
            </Animated.View>

            {/* Form Card */}
            <Animated.View
              style={[
                styles.formCard,
                {
                  opacity: formAnim,
                  transform: [
                    {
                      translateY: formAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                    { translateX: shakeAnim },
                  ],
                },
              ]}
            >
              <Text style={styles.welcomeTitle}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtitle}>
                {otpSent ? "Enter the OTP sent to your email" : "Sign in to continue"}
              </Text>

              {/* Email Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => emailInputRef.current?.focus()}
                  style={[
                    styles.inputContainer,
                    isFocused.email && styles.inputFocused,
                    emailError ? styles.inputError : null,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={isFocused.email ? "#667eea" : "#9ca3af"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={emailInputRef}
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (emailError) setEmailError("");
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    editable={!otpSent}
                    returnKeyType="next"
                    onSubmitEditing={handleSendOTP}
                    onFocus={() => setIsFocused((prev) => ({ ...prev, email: true }))}
                    onBlur={() => setIsFocused((prev) => ({ ...prev, email: false }))}
                  />
                </TouchableOpacity>
                {emailError ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color="#ef4444" />
                    <Text style={styles.errorText}>{emailError}</Text>
                  </View>
                ) : null}
              </View>

              {/* OTP Input */}
              {otpSent && (
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    {
                      opacity: otpFormAnim,
                      transform: [
                        {
                          translateY: otpFormAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.otpLabelRow}>
                    <Text style={styles.inputLabel}>Enter OTP</Text>
                    <TouchableOpacity onPress={handleResendOTP} disabled={countdown > 0}>
                      <Text
                        style={[
                          styles.resendText,
                          countdown === 0 && styles.resendActive,
                        ]}
                      >
                        {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => otpInputRef.current?.focus()}
                    style={[
                      styles.inputContainer,
                      isFocused.otp && styles.inputFocused,
                      otpError ? styles.inputError : null,
                    ]}
                  >
                    <Ionicons
                      name="key-outline"
                      size={20}
                      color={isFocused.otp ? "#667eea" : "#9ca3af"}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={otpInputRef}
                      style={styles.input}
                      placeholder="Enter 4-6 digit OTP"
                      placeholderTextColor="#9ca3af"
                      value={otp}
                      onChangeText={(text) => {
                        setOtp(text.replace(/[^0-9]/g, ""));
                        if (otpError) setOtpError("");
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      onFocus={() => setIsFocused((prev) => ({ ...prev, otp: true }))}
                      onBlur={() => setIsFocused((prev) => ({ ...prev, otp: false }))}
                    />
                  </TouchableOpacity>
                  {otpError ? (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={14} color="#ef4444" />
                      <Text style={styles.errorText}>{otpError}</Text>
                    </View>
                  ) : null}
                </Animated.View>
              )}

              {/* Buttons */}
              <Animated.View
                style={[
                  styles.buttonSection,
                  {
                    opacity: buttonAnim,
                    transform: [
                      {
                        translateY: buttonAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {!otpSent ? (
                  <TouchableOpacity
                    style={[styles.primaryButton, (isLoading || isLoadingOTP) && styles.buttonDisabled]}
                    onPress={handleSendOTP}
                    disabled={isLoading || isLoadingOTP}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#667eea", "#764ba2"] as const}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      {isLoading || isLoadingOTP ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Send OTP</Text>
                          <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                      onPress={handleLogin}
                      disabled={isLoading || isLoadingOTP}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={["#10b981", "#059669"] as const}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buttonGradient}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Text style={styles.buttonText}>Verify & Login</Text>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => {
                        setOtpSent(false);
                        setOtp("");
                        setEmailError("");
                        setOtpError("");
                      }}
                      disabled={isLoading || isLoadingOTP}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-back" size={18} color="#667eea" />
                      <Text style={styles.secondaryButtonText}>Change Email</Text>
                    </TouchableOpacity>
                  </>
                )}
              </Animated.View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  By signing in, you agree to our{" "}
                  <Text style={styles.linkText}>Terms of Service</Text> and{" "}
                  <Text style={styles.linkText}>Privacy Policy</Text>
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#667eea",
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  decorativeCircle1: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  decorativeCircle3: {
    position: "absolute",
    top: height * 0.3,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 15,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoText: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
  },
  brandName: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 5,
  },
  brandTagline: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  formCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 25,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  otpLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  resendText: {
    fontSize: 13,
    color: "#9ca3af",
  },
  resendActive: {
    color: "#667eea",
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 15,
    height: 54,
  },
  inputFocused: {
    borderColor: "#667eea",
    backgroundColor: "#fff",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
    paddingVertical: 0,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginLeft: 4,
  },
  buttonSection: {
    marginTop: 10,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  secondaryButtonText: {
    color: "#667eea",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
  },
  linkText: {
    color: "#667eea",
    fontWeight: "500",
  },
});

export default LoginScreen;
