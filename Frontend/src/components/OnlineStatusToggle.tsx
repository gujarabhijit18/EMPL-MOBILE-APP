/**
 * OnlineStatusToggle Component
 * 
 * Add-on component for tracking Online/Offline status during attendance.
 * - Shows only after check-in and before check-out
 * - Defaults to Online after check-in
 * - Shows popup for offline reason when switching to Offline
 * - Pauses work hour calculation while Offline
 * - Hidden/disabled after checkout
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Animated,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { apiService, OnlineStatusResponse, ToggleStatusResponse } from "../lib/api";

interface OnlineStatusToggleProps {
  userId: number;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  onStatusChange?: (isOnline: boolean, summary: ToggleStatusResponse) => void;
}

export default function OnlineStatusToggle({
  userId,
  isCheckedIn,
  isCheckedOut,
  onStatusChange,
}: OnlineStatusToggleProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineReason, setOfflineReason] = useState("");
  const [statusData, setStatusData] = useState<OnlineStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Animation for the toggle
  const toggleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Fetch current status on mount and when check-in status changes
  useEffect(() => {
    if (isCheckedIn && !isCheckedOut) {
      fetchCurrentStatus();
      startPulseAnimation();
    }
  }, [isCheckedIn, isCheckedOut, userId]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  };

  const fetchCurrentStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const status = await apiService.getOnlineStatus(userId);
      setStatusData(status);
      setIsOnline(status.is_online);
    } catch (err: any) {
      // If no status exists yet, default to online (will be created on first toggle)
      if (err.message?.includes("404") || err.message?.includes("No active attendance")) {
        setIsOnline(true);
        setError(null);
      } else {
        console.error("Error fetching online status:", err);
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePress = () => {
    if (isOnline) {
      // Going offline - show reason modal
      setShowOfflineModal(true);
    } else {
      // Going online - no reason needed
      performToggle();
    }
  };

  const performToggle = async (reason?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.toggleOnlineStatus(userId, reason);
      
      setIsOnline(response.is_online);
      setShowOfflineModal(false);
      setOfflineReason("");
      
      // Animate the toggle
      Animated.sequence([
        Animated.timing(toggleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.timing(toggleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange(response.is_online, response);
      }
      
      // Refresh status data
      fetchCurrentStatus();
      
    } catch (err: any) {
      console.error("Error toggling status:", err);
      setError(err.message);
      Alert.alert("Error", err.message || "Failed to toggle status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfflineSubmit = () => {
    if (!offlineReason.trim()) {
      Alert.alert("Required", "Please provide a reason for going offline.");
      return;
    }
    performToggle(offlineReason.trim());
  };

  // Don't render if not checked in or already checked out
  if (!isCheckedIn || isCheckedOut) {
    return null;
  }

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <View style={styles.container}>
      {/* Status Card */}
      <View style={styles.statusCard}>
        <LinearGradient
          colors={isOnline ? ["#dcfce7", "#bbf7d0"] : ["#fef3c7", "#fde68a"]}
          style={styles.statusGradient}
        >
          <View style={styles.statusHeader}>
            <View style={styles.statusLeft}>
              <Animated.View style={[styles.statusIndicator, { transform: [{ scale: pulseAnim }] }]}>
                <View style={[styles.statusDot, { backgroundColor: isOnline ? "#22c55e" : "#f59e0b" }]} />
              </Animated.View>
              <View style={styles.statusTextContainer}>
                <Text style={[styles.statusLabel, { color: isOnline ? "#15803d" : "#b45309" }]}>
                  {isOnline ? "Online" : "Offline"}
                </Text>
                <Text style={styles.statusSubtext}>
                  {isOnline ? "Working hours counting" : "Hours paused"}
                </Text>
              </View>
            </View>
            
            {/* Toggle Button */}
            <Animated.View style={{ transform: [{ scale: toggleAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: isOnline ? "#ef4444" : "#22c55e" }
                ]}
                onPress={handleTogglePress}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={isOnline ? "pause" : "play"}
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.toggleButtonText}>
                      {isOnline ? "Go Offline" : "Go Online"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Time Summary */}
          {statusData && (
            <View style={styles.timeSummary}>
              <View style={styles.timeBlock}>
                <Ionicons name="time-outline" size={14} color="#22c55e" />
                <Text style={styles.timeLabel}>Online</Text>
                <Text style={styles.timeValue}>{formatMinutes(statusData.total_online_minutes)}</Text>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeBlock}>
                <Ionicons name="pause-circle-outline" size={14} color="#f59e0b" />
                <Text style={styles.timeLabel}>Offline</Text>
                <Text style={styles.timeValue}>{formatMinutes(statusData.total_offline_minutes)}</Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Offline Reason Modal */}
      <Modal visible={showOfflineModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="pause-circle" size={40} color="#f59e0b" />
              </View>
              <Text style={styles.modalTitle}>Going Offline?</Text>
              <Text style={styles.modalSubtitle}>
                Your working hours will be paused. Please provide a reason.
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Reason for going offline <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Lunch break, Meeting, Personal work..."
                placeholderTextColor="#9ca3af"
                value={offlineReason}
                onChangeText={setOfflineReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowOfflineModal(false);
                  setOfflineReason("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !offlineReason.trim() && styles.confirmButtonDisabled]}
                onPress={handleOfflineSubmit}
                disabled={!offlineReason.trim() || isLoading}
              >
                <LinearGradient
                  colors={offlineReason.trim() ? ["#f59e0b", "#d97706"] : ["#d1d5db", "#9ca3af"]}
                  style={styles.confirmButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="pause" size={18} color="#fff" />
                      <Text style={styles.confirmButtonText}>Go Offline</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  statusCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusGradient: {
    padding: 16,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusSubtext: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  toggleButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  timeSummary: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  timeBlock: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  timeDivider: {
    width: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginHorizontal: 16,
  },
  timeLabel: {
    fontSize: 11,
    color: "#6b7280",
    textTransform: "uppercase",
  },
  timeValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
  },
  modalHeader: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fffbeb",
    borderBottomWidth: 1,
    borderBottomColor: "#fef3c7",
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  inputContainer: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1f2937",
    backgroundColor: "#f9fafb",
    minHeight: 100,
  },
  modalActions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#ef4444",
    flex: 1,
  },
});
