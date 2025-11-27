// 📂 src/screens/Login.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../lib/api";

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }: any) => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isLoadingOTP, setIsLoadingOTP] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null); // Store OTP for development display

  // Test backend connection when user tries to send OTP
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

  // Handle OTP resend countdown
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSendOTP = async () => {
    if (!email) {
      setEmailError("Please enter your email");
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setEmailError("");
    setOtpError("");
    
    // Test connection first
    const isConnected = await testBackendConnection();
    if (!isConnected) return;
    
    try {
      setIsLoadingOTP(true);
      const response = await apiService.sendOTP(email);
      setOtpSent(true);
      setCountdown(60); // 60 seconds countdown for resend OTP
      
      // Store OTP for development (only if environment is not production)
      const isDevelopment = response.environment !== 'production' && response.otp !== undefined;
      const otpValue = isDevelopment && response.otp ? response.otp.toString() : null;
      
      if (isDevelopment && response.otp) {
        console.log(`🔑 DEV OTP: ${response.otp}`);
      }
      
      // Show success message with OTP in development
      const message = isDevelopment
        ? `An OTP has been sent to ${email}.\n\n🔑 DEV OTP: ${response.otp}\n\nClick OK to auto-fill the OTP.\n\nExpires in ${response.expires_in_minutes} minutes`
        : `An OTP has been sent to ${email}. Please check your email.\n\nExpires in ${response.expires_in_minutes} minutes`;
      
      Alert.alert(
        "✅ OTP Sent", 
        message,
        [{ 
          text: "OK",
          onPress: () => {
            // Auto-fill OTP in development mode
            if (otpValue) {
              setOtp(otpValue);
              setDevOtp(null); // Clear dev OTP display
            }
          }
        }]
      );
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
    if (!otp) {
      setOtpError("Please enter the OTP");
      return;
    }

    if (otp.length !== 4 && otp.length !== 6) { // Support both 4 and 6 digit OTPs
      setOtpError("Please enter a valid OTP (4 or 6 digits)");
      return;
    }

    try {
      console.log(`🔐 Attempting login with email: ${email}, OTP: ${otp}`);
      const response = await apiService.verifyOTP(email, otp);
      
      // Update auth context with user data
      await login(email, otp, response);
      
      Alert.alert("✅ Success", `Welcome back, ${response.name}!`);
    } catch (error: any) {
      console.error("❌ Login Error:", error);
      setOtpError(error.message || "Invalid OTP. Please try again.");
      Alert.alert("Login Failed", error.message || "Invalid OTP. Please try again.");
    }
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#f9fafb'}}>
      <StatusBar style="dark" />
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
              {/* Header with Gradient */}
              <LinearGradient
                colors={['#0056b3', '#007bff']}
                style={styles.header}
              >
                <View style={styles.logoContainer}>
                  <View style={styles.logo}>
                    <Text style={styles.logoText}>S</Text>
                  </View>
                  <Text style={styles.companyName}>Shekru Labs India</Text>
                </View>
              </LinearGradient>

              {/* Login Form */}
              <View style={styles.formContainer}>
                <View style={styles.card}>
                  <Text style={styles.welcomeText}>Welcome Back!</Text>
                  <Text style={styles.subtitle}>Please sign in to continue</Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={[styles.input, emailError ? styles.inputError : null]}
                      placeholder="Enter your email"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (emailError) setEmailError("");
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!otpSent}
                    />
                    {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                  </View>

                  {otpSent && (
                    <View style={styles.inputContainer}>
                      <View style={styles.otpHeader}>
                        <Text style={styles.inputLabel}>Enter OTP</Text>
                        <TouchableOpacity 
                          onPress={handleResendOTP} 
                          disabled={countdown > 0}
                        >
                          <Text style={[styles.resendText, countdown === 0 && styles.resendActive]}>
                            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      <TextInput
                        style={[styles.input, otpError ? styles.inputError : null]}
                        placeholder="Enter 4-digit OTP"
                        value={otp}
                        onChangeText={(text) => {
                          setOtp(text);
                          if (otpError) setOtpError("");
                        }}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                      {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
                      <Text style={styles.otpNote}>Enter the OTP sent to your email</Text>
                    </View>
                  )}

                  {!otpSent ? (
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        style={[styles.loginButton, styles.primaryButton, (isLoading || isLoadingOTP) ? styles.buttonDisabled : null]}
                        onPress={handleSendOTP}
                        disabled={isLoading || isLoadingOTP}
                        activeOpacity={0.8}
                      >
                        {(isLoading || isLoadingOTP) ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.loginButtonText}>Send OTP</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        style={[styles.loginButton, styles.primaryButton]}
                        onPress={handleLogin}
                        disabled={isLoading || isLoadingOTP}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.loginButtonText}>Login with OTP</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {otpSent && (
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        style={[styles.loginButton, styles.secondaryButton]}
                        onPress={() => {
                          setOtpSent(false);
                          setOtp("");
                          setEmailError("");
                          setOtpError("");
                          setDevOtp(null);
                        }}
                        disabled={isLoading || isLoadingOTP}
                      >
                        <Text style={[styles.loginButtonText, styles.secondaryButtonText]}>Change Email</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resendText: {
    color: '#999',
    fontSize: 13,
  },
  resendActive: {
    color: '#007bff',
    fontWeight: '500',
  },
  otpNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  termsContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: '#007bff',
    fontWeight: '500',
  },
  helpLink: {
    marginTop: 10,
  },
  helpText: {
    color: '#007bff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff8f8',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  header: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 30,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  companyName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginTop: 10,
  },
  formContainer: {
    flex: 1,
    padding: 20,
    marginTop: -30,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    fontWeight: '500',
  },
  passwordLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  forgotPassword: {
    color: '#007bff',
    fontSize: 13,
    fontWeight: '500',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#555',
  },
  loginButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    width: '100%',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    transform: [{ scale: 1 }],
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007bff',
  },
  secondaryButtonText: {
    color: '#007bff',
  },
  buttonDisabled: {
    backgroundColor: '#84c1ff',
    opacity: 0.8,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  signupText: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    marginVertical: 10,
  },
});

export default LoginScreen;
