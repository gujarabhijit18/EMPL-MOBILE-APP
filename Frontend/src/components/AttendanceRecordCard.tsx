import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiService } from "../lib/api";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import { calculateCheckInStatus, calculateCheckOutStatus } from "../utils/attendanceStatus";

interface AttendanceRecordCardProps {
  record: any;
  onPhotoPress?: (record: any) => void;
  onCardPress?: (record: any) => void;
}

const AttendanceRecordCard: React.FC<AttendanceRecordCardProps> = ({
  record,
  onPhotoPress,
  onCardPress,
}) => {
  const [checkInStatus, setCheckInStatus] = useState<any>(null);
  const [checkOutStatus, setCheckOutStatus] = useState<any>(null);
  const [onlineStatus, setOnlineStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatusData();
  }, [record]);

  const loadStatusData = async () => {
    try {
      setLoading(true);

      // Fetch office hours for status calculation
      const officeHours = await apiService.getEffectiveOfficeTiming(record.department);

      // Calculate check-in status
      const checkInStat = calculateCheckInStatus(officeHours);
      setCheckInStatus(checkInStat);

      // Calculate check-out status if checked out
      if (record.check_out) {
        const checkOutStat = calculateCheckOutStatus(officeHours);
        setCheckOutStatus(checkOutStat);
      }

      // Fetch online status if available
      if (record.user_id) {
        try {
          const onlineStat = await apiService.getOnlineStatus(record.user_id);
          setOnlineStatus(onlineStat);
        } catch (error) {
          console.log("Online status not available:", error);
        }
      }
    } catch (error) {
      console.error("Error loading status data:", error);
    } finally {
      setLoading(false);
    }
  };

  const roleColors: Record<string, string> = {
    HR: "#8b5cf6",
    Manager: "#f59e0b",
    "Team Lead": "#10b981",
    Employee: "#3b82f6",
  };

  const roleColor = roleColors[record.role] || "#6b7280";

  const isValidImageUri = (uri: string | null | undefined): boolean => {
    if (!uri || typeof uri !== "string") return false;
    const trimmed = uri.trim();
    if (trimmed === "" || trimmed === "null" || trimmed === "undefined") return false;
    return trimmed.startsWith("http") || trimmed.startsWith("file") || trimmed.startsWith("data:") || trimmed.startsWith("/");
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onCardPress?.(record)}
      activeOpacity={0.7}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: roleColor }]}>
            <Text style={styles.avatarText}>{record.name?.charAt(0).toUpperCase() || "U"}</Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.name}>{record.name}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Ionicons name="id-card-outline" size={11} color="#3b82f6" />
                <Text style={styles.metaText}>{record.employeeId}</Text>
              </View>
              <View style={styles.metaChip}>
                <Ionicons name="business-outline" size={11} color="#8b5cf6" />
                <Text style={styles.metaText}>{record.department}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Status Badges */}
        <View style={styles.statusBadges}>
          {/* Role Badge */}
          <View style={[styles.roleBadge, { backgroundColor: `${roleColor}15` }]}>
            <Text style={[styles.roleBadgeText, { color: roleColor }]}>{record.role}</Text>
          </View>

          {/* Online Status Badge */}
          {onlineStatus && (
            <View
              style={[
                styles.onlineBadge,
                { backgroundColor: onlineStatus.is_online ? "#dcfce7" : "#f3f4f6" },
              ]}
            >
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: onlineStatus.is_online ? "#16a34a" : "#9ca3af" },
                ]}
              />
              <Text
                style={[
                  styles.onlineText,
                  { color: onlineStatus.is_online ? "#16a34a" : "#6b7280" },
                ]}
              >
                {onlineStatus.is_online ? "Online" : "Offline"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Time Section */}
      <View style={styles.timeSection}>
        {/* Check-In */}
        <View style={styles.timeBlock}>
          <View style={styles.timeHeader}>
            <View style={[styles.timeIconBg, { backgroundColor: "#dcfce7" }]}>
              <Ionicons name="log-in" size={14} color="#16a34a" />
            </View>
            <Text style={styles.timeLabel}>Check-In</Text>
          </View>
          <Text style={styles.timeValue}>{record.check_in || "--:--"}</Text>

          {/* Check-In Status */}
          {!loading && checkInStatus && (
            <View style={styles.statusContainer}>
              <AttendanceStatusBadge
                status={checkInStatus.checkInStatus}
                minutesOffset={checkInStatus.minutesEarly || checkInStatus.minutesLate}
                size="small"
                showLabel={true}
              />
              <Text style={styles.statusMessage} numberOfLines={2}>
                {checkInStatus.message}
              </Text>
            </View>
          )}
        </View>

        {/* Arrow */}
        <View style={styles.arrow}>
          <Ionicons name="arrow-forward" size={16} color="#d1d5db" />
        </View>

        {/* Check-Out */}
        <View style={styles.timeBlock}>
          <View style={styles.timeHeader}>
            <View style={[styles.timeIconBg, { backgroundColor: "#fee2e2" }]}>
              <Ionicons name="log-out" size={14} color="#dc2626" />
            </View>
            <Text style={styles.timeLabel}>Check-Out</Text>
          </View>
          <Text style={styles.timeValue}>{record.check_out || "--:--"}</Text>

          {/* Check-Out Status */}
          {record.check_out && !loading && checkOutStatus && (
            <View style={styles.statusContainer}>
              <AttendanceStatusBadge
                status={checkOutStatus.checkOutStatus}
                minutesOffset={checkOutStatus.minutesEarly || checkOutStatus.minutesLate}
                size="small"
                showLabel={true}
              />
              <Text style={styles.statusMessage} numberOfLines={2}>
                {checkOutStatus.message}
              </Text>
            </View>
          )}
        </View>

        {/* Hours */}
        <View style={styles.hoursChip}>
          <Ionicons name="time" size={14} color="#3b82f6" />
          <Text style={styles.hoursText}>{record.hours}h</Text>
        </View>
      </View>

      {/* Location */}
      <View style={styles.locationRow}>
        <Ionicons name="location" size={13} color="#6b7280" />
        <Text style={styles.locationText} numberOfLines={1}>
          {record.location}
        </Text>
      </View>

      {/* Photos */}
      <View style={styles.photoRow}>
        <TouchableOpacity
          style={styles.photoBtn}
          onPress={() => onPhotoPress?.(record)}
          disabled={!isValidImageUri(record.selfie)}
        >
          {isValidImageUri(record.selfie) ? (
            <Image source={{ uri: record.selfie }} style={styles.photoThumb} />
          ) : (
            <View style={styles.photoEmpty}>
              <Ionicons name="camera-outline" size={14} color="#9ca3af" />
            </View>
          )}
          <View style={[styles.photoLabel, { backgroundColor: "#dcfce7" }]}>
            <Text style={[styles.photoLabelText, { color: "#16a34a" }]}>In</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.photoBtn}
          onPress={() => onPhotoPress?.(record)}
          disabled={!isValidImageUri(record.checkOutSelfie)}
        >
          {isValidImageUri(record.checkOutSelfie) ? (
            <Image source={{ uri: record.checkOutSelfie }} style={styles.photoThumb} />
          ) : (
            <View style={styles.photoEmpty}>
              <Ionicons name="camera-outline" size={14} color="#9ca3af" />
            </View>
          )}
          <View style={[styles.photoLabel, { backgroundColor: "#fee2e2" }]}>
            <Text style={[styles.photoLabelText, { color: "#dc2626" }]}>Out</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#3b82f6" />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default AttendanceRecordCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: 8,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  headerInfo: {
    flex: 1,
  },

  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },

  metaRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },

  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
  },

  metaText: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
  },

  statusBadges: {
    gap: 6,
    alignItems: "flex-end",
  },

  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  onlineText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Time Section
  timeSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  timeBlock: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 10,
  },

  timeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },

  timeIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  timeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
  },

  timeValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },

  statusContainer: {
    gap: 4,
  },

  statusMessage: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "500",
    lineHeight: 14,
  },

  arrow: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },

  hoursChip: {
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },

  hoursText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3b82f6",
  },

  // Location
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  locationText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    flex: 1,
  },

  // Photos
  photoRow: {
    flexDirection: "row",
    gap: 10,
  },

  photoBtn: {
    flex: 1,
    position: "relative",
  },

  photoThumb: {
    width: "100%",
    height: 80,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
  },

  photoEmpty: {
    width: "100%",
    height: 80,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },

  photoLabel: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  photoLabelText: {
    fontSize: 10,
    fontWeight: "700",
  },

  // Loading
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});
