// 📂 src/screens/hiring/HiringManagement.tsx
import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useModuleBadges } from "../../contexts/ModuleBadgeContext";

const { width } = Dimensions.get('window');

export default function HiringManagement() {
  const navigation = useNavigation<any>();
  const { resetBadge } = useModuleBadges();

  // Reset badge when screen is focused
  useFocusEffect(
    useCallback(() => {
      resetBadge("hiring");
    }, [resetBadge])
  );

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" backgroundColor="#4F46E5" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header */}
        <LinearGradient
          colors={["#4F46E5", "#6366F1", "#818CF8"] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerPattern}>
            <View style={[styles.patternCircle, { top: -20, right: -20, width: 120, height: 120 }]} />
            <View style={[styles.patternCircle, { bottom: -30, left: -30, width: 150, height: 150 }]} />
          </View>

          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleGoBack}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Main Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            {/* Icon Container with Pulse */}
            <Animated.View
              style={[
                styles.iconContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <LinearGradient
                colors={["#4F46E5", "#6366F1"] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <MaterialCommunityIcons name="account-tie" size={48} color="#fff" />
              </LinearGradient>

              {/* Sparkle Icon */}
              <View style={styles.sparkleContainer}>
                <MaterialCommunityIcons name="star" size={24} color="#fbbf24" />
              </View>
            </Animated.View>

            {/* Title */}
            <Text style={styles.mainTitle}>Coming Soon</Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              Version 2 features are under development. Coming soon.
            </Text>

            {/* Loading Dots Animation */}
            <View style={styles.dotsContainer}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>

            {/* Description */}
            <Text style={styles.description}>
              We're working hard to bring you amazing new features
            </Text>

            {/* Go Back Button */}
            <TouchableOpacity
              style={styles.goBackButton}
              onPress={handleGoBack}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
              <Text style={styles.goBackText}>Go Back</Text>
            </TouchableOpacity>

            {/* Indicator Dots */}
            <View style={styles.indicatorDots}>
              <View style={[styles.indicatorDot, styles.indicatorDotActive]} />
              <View style={styles.indicatorDot} />
              <View style={[styles.indicatorDot, styles.indicatorDotPurple]} />
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f0f0ff',
  },
  safeArea: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerContent: {
    paddingHorizontal: 20,
    position: 'relative',
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  sparkleContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#4F46E5',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
    height: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
  description: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  goBackButton: {
    flexDirection: 'row',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  goBackText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  indicatorDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  indicatorDotActive: {
    backgroundColor: '#4F46E5',
  },
  indicatorDotPurple: {
    backgroundColor: '#a855f7',
  },
});
