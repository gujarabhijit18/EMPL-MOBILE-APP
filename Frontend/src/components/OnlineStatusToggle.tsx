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
  attendanceId: number | null;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  onStatusChange?: (isOnline: boolean, summary: ToggleStatusResponse) => void;
}

export default function OnlineStatusToggle({
  userId,
  attendanceId,
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

  // Last toggle time display - shows the time when status was last changed
  const [lastOnlineTime, setLastOnlineTime] = useState<string | null>(null);
  const [lastOfflineTime, setLastOfflineTime] = useState<string | null>(null);

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const toggleAnim = useRef(new Animated.Value(1)).current;

  // Live Timer State
  const [dataTimestamp, setDataTimestamp] = useState<Date>(new Date());
  const [now, setNow] = useState<Date>(new Date());

  // Update 'now' every second to enable live timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000); // Update every second for better precision
    return () => clearInterval(timer);
  }, []);

  // Reset reference timestamp whenever data is refreshed/updated from backend
  useEffect(() => {
    if (statusData) {
      setDataTimestamp(new Date());
      setNow(new Date()); // Sync now to avoid jumps
    }
  }, [statusData]);

  // Helper to calculate live seconds including time elapsed since last fetch
  const getDisplaySecondsTotal = (type: 'online' | 'offline') => {
    if (!statusData) return 0;

    // Backend provides minutes. Convert to seconds.
    let baseMinutes = type === 'online' ? (statusData.total_online_minutes || 0) : (statusData.total_offline_minutes || 0);
    let baseSeconds = baseMinutes * 60;

    // We use last_status_change if available for absolute accuracy, fallback to dataTimestamp
    const reference = statusData.last_status_change ? new Date(statusData.last_status_change) : dataTimestamp;
    const referenceMs = reference.getTime();

    // If currently in the requested state, add elapsed time since the reference point
    if (statusData.is_online && type === 'online') {
      const diffMs = now.getTime() - referenceMs;
      return baseSeconds + Math.max(0, Math.floor(diffMs / 1000));
    } else if (!statusData.is_online && type === 'offline') {
      const diffMs = now.getTime() - referenceMs;
      return baseSeconds + Math.max(0, Math.floor(diffMs / 1000));
    }

    return baseSeconds;
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

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
      console.log("📥 Fetching current status for user:", userId);
      const status = await apiService.getOnlineStatus(userId);
      console.log("✅ Current status:", status);
      setStatusData(status);
      setIsOnline(status.is_online);
    } catch (err: any) {
      console.log("⚠️ Error fetching status:", err.message || err);
      // If no status exists yet, default to online (will be created on first toggle)
      // This is expected behavior - no error to display
      if (err.message?.includes("404") || err.message?.includes("No active attendance") || err.message?.includes("not checked in") || err.status === 404) {
        setIsOnline(false);
        setStatusData(null);
        setError(null);
        // Silently handle - this is expected when no attendance record exists yet
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

      console.log("🔄 Toggling status, current isOnline:", isOnline, "reason:", reason);

      const response = await apiService.toggleOnlineStatus(attendanceId, userId, !isOnline, reason);

      console.log("✅ Toggle response:", response);

      // Capture the current time for display
      const currentTime = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });

      // Update last toggle times based on the NEW status
      // When going OFFLINE (response.is_online = false), show the online time that just ended
      // When going ONLINE (response.is_online = true), show the offline time that just ended
      if (response.is_online) {
        // Just went online - show when offline period ended (now)
        setLastOfflineTime(currentTime);
      } else {
        // Just went offline - show when online period ended (now)
        setLastOnlineTime(currentTime);
      }

      // Update state with response
      setIsOnline(response.is_online);
      setShowOfflineModal(false);
      setOfflineReason("");

      // Update status data with new values.
      // CRITICAL: We sync dataTimestamp AND now to ensure the next frame's calculation is stable
      const syncTime = new Date();
      setDataTimestamp(syncTime);
      setNow(syncTime);

      setStatusData(prev => {
        // Calculate session that just ended if backend didn't provide updated totals
        let finalOnline = response.total_online_minutes;
        let finalOffline = response.total_offline_minutes;

        if (prev && response.total_online_minutes === undefined) {
          // If we just went from ONLINE -> OFFLINE, add the duration of the finished online session
          if (prev.is_online && !response.is_online) {
            const elapsedSeconds = Math.floor((syncTime.getTime() - dataTimestamp.getTime()) / 1000);
            finalOnline = (prev.total_online_minutes || 0) + (elapsedSeconds / 60);
          } else {
            finalOnline = prev.total_online_minutes;
          }
        }

        if (prev && response.total_offline_minutes === undefined) {
          // If we just went from OFFLINE -> ONLINE, add the duration of the finished offline session
          if (!prev.is_online && response.is_online) {
            const elapsedSeconds = Math.floor((syncTime.getTime() - dataTimestamp.getTime()) / 1000);
            finalOffline = (prev.total_offline_minutes || 0) + (elapsedSeconds / 60);
          } else {
            finalOffline = prev.total_offline_minutes;
          }
        }

        return {
          id: response.id || prev?.id || 0,
          user_id: userId,
          attendance_id: attendanceId,
          is_online: response.is_online,
          total_online_minutes: finalOnline || 0,
          total_offline_minutes: finalOffline || 0,
          current_session_minutes: 0,
          last_status_change: response.last_status_change || syncTime.toISOString()
        };
      });

      // Animate the toggle
      Animated.sequence([
        Animated.timing(toggleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.timing(toggleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();

      // Notify parent component
      if (onStatusChange) {
        onStatusChange(response.is_online, response);
      }

    } catch (err: any) {
      console.error("❌ Error toggling status:", err);
      // Handle specific error cases
      if (err.status === 404 || err.message?.includes("No active attendance") || err.message?.includes("Cannot toggle status")) {
        setError(null);
        Alert.alert("Attendance Required", "Please check in first before toggling online status. If you have already checked out, you cannot toggle status.");
      } else if (err.status === 400) {
        Alert.alert("Error", err.message || "Cannot toggle status. Please ensure you have an active check-in.");
      } else {
        setError(err.message);
        Alert.alert("Error", err.message || "Failed to toggle status. Please try again.");
      }
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
                <Text style={styles.timeLabel}>ONLINE</Text>
                <Text style={styles.timeValue}>{formatDuration(getDisplaySecondsTotal('online'))}</Text>
                <Text style={styles.statusLabelSmall}>{isOnline ? 'Counting...' : 'Paused'}</Text>
                {/* Show last online time when currently offline */}
                {!isOnline && lastOnlineTime && (
                  <Text style={styles.lastTimeText}>Last: {lastOnlineTime}</Text>
                )}
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeBlock}>
                <Ionicons name="pause-circle-outline" size={14} color="#f59e0b" />
                <Text style={styles.timeLabel}>OFFLINE</Text>
                <Text style={styles.timeValue}>{formatDuration(getDisplaySecondsTotal('offline'))}</Text>
                <Text style={styles.statusLabelSmall}>{!isOnline ? 'Counting...' : 'Paused'}</Text>
                {/* Show last offline time when currently online */}
                {isOnline && lastOfflineTime && (
                  <Text style={styles.lastTimeText}>Last: {lastOfflineTime}</Text>
                )}
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
  lastTimeText: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2,
    fontStyle: "italic",
  },
  statusLabelSmall: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
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
