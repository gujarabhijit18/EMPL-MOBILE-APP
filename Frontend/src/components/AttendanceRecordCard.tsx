import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { apiService, OnlineStatusLog } from "../lib/api";
import { API_CONFIG } from "../config/api";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import { calculateCheckInStatus, calculateCheckOutStatus } from "../utils/attendanceStatus";

interface AttendanceRecordCardProps {
  record: any;
  onPhotoPress?: (record: any) => void;
  onCardPress?: (record: any) => void;
}

// Helper function to format minutes to "X hr Y min" format
const formatDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return "0 min";
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
};

const AttendanceRecordCard: React.FC<AttendanceRecordCardProps> = ({
  record,
  onPhotoPress,
  onCardPress,
}) => {
  const [checkInStatus, setCheckInStatus] = useState<any>(null);
  const [checkOutStatus, setCheckOutStatus] = useState<any>(null);
  const [onlineStatusData, setOnlineStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLogs, setActivityLogs] = useState<OnlineStatusLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    loadStatusData();

    // Auto-refresh active work time every 2 minutes (120000ms) if session is active
    let intervalId: NodeJS.Timeout;
    const isSessionActive = !record.check_out && record.check_in;

    if (isSessionActive) {
      intervalId = setInterval(() => {
        refreshActiveTime();
      }, 2 * 60 * 1000); // 2 minutes
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [record]);

  const refreshActiveTime = async () => {
    if (!record.user_id || record.check_out) return;
    try {
      const onlineStat = await apiService.getOnlineStatus(record.user_id);
      if (onlineStat) {
        setOnlineStatusData((prev: any) => ({
          ...prev, // Keep existing data just in case
          ...onlineStat, // Overwrite with new status
          is_online: onlineStat.is_online ?? true, // Default to true if active
        }));
      }
    } catch (error) {
      // Silent fail for background refresh
      // console.log("Background refresh failed:", error);
    }
  };

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

      // Use online status data from record if available (from backend)
      // BUT if it's an active session (no check_out), verify if we should fetch fresh data
      // For static lists, simple record data is fine initially. Background refresh handles updates.
      if (record.totalOnlineMinutes !== undefined || record.totalOfflineMinutes !== undefined) {
        setOnlineStatusData({
          is_online: record.isOnline ?? record.is_online ?? !record.check_out,
          total_online_minutes: record.totalOnlineMinutes ?? 0,
          total_offline_minutes: record.totalOfflineMinutes ?? 0,
          effective_work_hours: record.effectiveWorkHours ?? 0,
        });

        // If it's active session, trigger one immediate fresh fetch to ensure up-to-date info
        // (The list might have stale data from 10 mins ago)
        if (!record.check_out) {
          refreshActiveTime();
        }
      } else if (record.user_id && !record.check_out) {
        // Fetch online status if not in record and user is still checked in
        try {
          const onlineStat = await apiService.getOnlineStatus(record.user_id);
          setOnlineStatusData(onlineStat);
        } catch (error: any) {
          if (!error.message?.includes("404") && !error.message?.includes("No active attendance")) {
            console.log("Online status not available:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error loading status data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivityLogs = async () => {
    if (!record.user_id) return;
    try {
      setLoadingLogs(true);
      const logs = await apiService.getOnlineStatusLogs(record.user_id, record.id);
      setActivityLogs(logs || []);
      setShowActivityModal(true);
    } catch (error: any) {
      console.log("Activity logs not available:", error);
      setActivityLogs([]);
      setShowActivityModal(true);
    } finally {
      setLoadingLogs(false);
    }
  };

  const formatLogTime = (isoString: string | null | undefined): string => {
    if (!isoString) return "--:--";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch {
      return "--:--";
    }
  };

  const roleConfig: Record<string, { color: string; gradient: [string, string]; icon: string }> = {
    Admin: { color: "#7c3aed", gradient: ["#7c3aed", "#6d28d9"], icon: "shield-checkmark" },
    HR: { color: "#8b5cf6", gradient: ["#8b5cf6", "#7c3aed"], icon: "briefcase" },
    Manager: { color: "#f59e0b", gradient: ["#f59e0b", "#d97706"], icon: "people" },
    "Team Lead": { color: "#10b981", gradient: ["#10b981", "#059669"], icon: "git-network" },
    Employee: { color: "#3b82f6", gradient: ["#3b82f6", "#2563eb"], icon: "person" },
  };

  const getRoleSettings = (role: string) => {
    if (!role) return roleConfig["Employee"];
    const normalizedRole = role.trim().toLowerCase();
    if (normalizedRole === "admin") return roleConfig["Admin"];
    if (normalizedRole === "hr") return roleConfig["HR"];
    if (normalizedRole === "manager") return roleConfig["Manager"];
    if (normalizedRole === "team lead" || normalizedRole === "team_lead") return roleConfig["Team Lead"];
    return roleConfig["Employee"];
  };

  const roleSettings = getRoleSettings(record.role);

  const isValidImageUri = (uri: string | null | undefined): boolean => {
    if (!uri || typeof uri !== "string") return false;
    const trimmed = uri.trim();
    if (trimmed === "" || trimmed === "null" || trimmed === "undefined") return false;
    return trimmed.startsWith("http") || trimmed.startsWith("file") || trimmed.startsWith("data:") || trimmed.startsWith("/");
  };

  // Determine overall status color
  const getStatusConfig = () => {
    if (record.status === "late" || checkInStatus?.checkInStatus === "late") {
      return { color: "#dc2626", bg: "#fee2e2", icon: "alert-circle", label: "Late" };
    }
    if (record.check_out) {
      return { color: "#059669", bg: "#d1fae5", icon: "checkmark-circle", label: "Completed" };
    }
    return { color: "#3b82f6", bg: "#dbeafe", icon: "time", label: "Active" };
  };

  const statusConfig = getStatusConfig();
  const workLocationLabel = record.workLocation || (record.location ? String(record.location) : "Work From Office");

  // Get active online time and separate offline time
  // Strictly map: Working Hours = Online/Active Time only
  let onlineMinutes = onlineStatusData?.total_online_minutes ?? record.totalOnlineMinutes ?? 0;

  // If we don't have minutes but have hours, convert hours to minutes
  if (onlineMinutes === 0 || !onlineMinutes) {
    const hours = record.effective_work_hours ?? record.effectiveWorkHours ?? record.total_hours ?? record.hours;
    if (hours) {
      onlineMinutes = Math.round(parseFloat(hours) * 60);
    }
  }

  // NOTE: We do NOT adding offline minutes to total work time anymore.
  // We do NOT use check-in/out diff as fallback for "Active Time" because that would include offline time.
  // If check_out exists but onlineMinutes is 0, it likely means we don't have distinct tracking, 
  // so we show 0 or backend value. We strictly respect the "Active" vs "Offline" distinction.

  const offlineMinutes = onlineStatusData?.total_offline_minutes ?? record.totalOfflineMinutes ?? 0;
  const hasCheckedOut = !!(record.check_out && record.check_out !== "" && record.check_out !== "--:--" && record.check_out !== "Pending");

  // Helper to parse "HH:mm AM/PM" format
  const parseTimeStr = (timeStr: string | null | undefined): number | null => {
    if (!timeStr || timeStr === "--:--" || timeStr === "Pending") return null;
    try {
      const parts = timeStr.trim().split(' ');
      if (parts.length < 2) return null;
      const [time, modifier] = parts;
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0).getTime();
    } catch {
      return null;
    }
  };

  // Calculate live active time for ongoing sessions OR fallback for completed sessions with 0 min
  if (onlineMinutes === 0 && (record.check_in || hasCheckedOut)) {
    try {
      const checkInTime = parseTimeStr(record.check_in);
      const checkOutTime = hasCheckedOut ? parseTimeStr(record.check_out) : new Date().getTime();

      if (checkInTime && checkOutTime) {
        // Raw duration in minutes
        const rawDurationMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));
        // Subtract known offline minutes to get "Active" time
        const calculatedActive = rawDurationMinutes - offlineMinutes;

        // Use maximum of calculated vs backend reported
        if (calculatedActive > 0) {
          onlineMinutes = calculatedActive;
        }
      }
    } catch (e) {
      console.warn("Working hours calculation error:", e);
    }
  } else if (!hasCheckedOut && record.check_in) {
    // Even if we have some onlineMinutes, if it's an active session, try to keep it live
    try {
      const checkInTime = parseTimeStr(record.check_in);
      const nowTime = new Date().getTime();
      if (checkInTime) {
        const rawDurationMinutes = Math.floor((nowTime - checkInTime) / (1000 * 60));
        const calculatedActive = rawDurationMinutes - offlineMinutes;
        if (calculatedActive > onlineMinutes) {
          onlineMinutes = calculatedActive;
        }
      }
    } catch (e) { }
  }

  // Work Time = Only Active/Online time
  const activeWorkMinutes = onlineMinutes > 0 ? onlineMinutes : 0;
  const workedTimeFormatted = formatDuration(activeWorkMinutes);

  const handleCardPress = () => {
    setIsExpanded(!isExpanded);
    if (onCardPress && isExpanded) {
      onCardPress(record);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: statusConfig.color }]}
      onPress={handleCardPress}
      activeOpacity={0.9}
    >
      <View style={styles.cardContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {isValidImageUri(record.profile_photo) ? (
              <Image source={{ uri: record.profile_photo }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={roleSettings.gradient}
                style={styles.avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarText}>{record.name?.charAt(0).toUpperCase() || "U"}</Text>
              </LinearGradient>
            )}

            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{record.name}</Text>
                <View style={[styles.statusBadgeMini, { backgroundColor: statusConfig.bg }]}>
                  <Ionicons name={statusConfig.icon as any} size={10} color={statusConfig.color} />
                  <Text style={[styles.statusLabel, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: `${roleSettings.color}15`, borderColor: `${roleSettings.color}30` }]}>
                  <Ionicons name={roleSettings.icon as any} size={9} color={roleSettings.color} />
                  <Text style={[styles.roleBadgeText, { color: roleSettings.color }]}>{record.role}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Ionicons name="id-card-outline" size={10} color="#64748b" />
                  <Text style={styles.metaText}>{record.employeeId}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Ionicons name="business-outline" size={10} color="#64748b" />
                  <Text style={styles.metaText}>{record.department}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.expandIndicator}>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
          </View>
        </View>

        {/* Time Summary Row - Always Visible */}
        <View style={styles.timeSummaryRow}>
          {/* Check-in/out times */}
          <View style={styles.timeBlock}>
            <View style={styles.timeItem}>
              <View style={[styles.timeIcon, { backgroundColor: "#d1fae5" }]}>
                <Ionicons name="log-in" size={12} color="#059669" />
              </View>
              <Text style={styles.timeText}>{record.check_in || "--:--"}</Text>
            </View>
            <Ionicons name="arrow-forward" size={12} color="#cbd5e1" />
            <View style={styles.timeItem}>
              <View style={[styles.timeIcon, { backgroundColor: record.check_out ? "#fee2e2" : "#f1f5f9" }]}>
                <Ionicons name="log-out" size={12} color={record.check_out ? "#dc2626" : "#94a3b8"} />
              </View>
              <Text style={[styles.timeText, !record.check_out && styles.timeTextMuted]}>
                {record.check_out || "--:--"}
              </Text>
            </View>
          </View>

          {/* Work Time - Show if we have any active online time or if checked out */}
          {(hasCheckedOut || activeWorkMinutes > 0) && (
            <View style={[styles.totalHoursChip, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="time-outline" size={12} color="#2563eb" />
              <Text style={[styles.totalHoursText, { color: "#1e40af" }]}>{workedTimeFormatted}</Text>
            </View>
          )}

        </View>

        {/* Location Pill + Online Status + Activity Button */}
        <View style={styles.locationRow}>
          <View style={styles.locationPill}>
            <Ionicons name={workLocationLabel === "Work From Home" ? "home" : "business"} size={11} color="#475569" />
            <Text style={styles.locationPillText}>{workLocationLabel}</Text>
          </View>

          <View style={styles.statusAndActivityRow}>
            {/* Online/Offline Status - Only show if not checked out */}
            {!hasCheckedOut && (
              <View style={[
                styles.onlineStatusPill,
                { backgroundColor: onlineStatusData?.is_online ? "#dcfce7" : "#fef3c7" }
              ]}>
                <View style={[
                  styles.onlineStatusDot,
                  { backgroundColor: onlineStatusData?.is_online ? "#16a34a" : "#f59e0b" }
                ]} />
                <Text style={[
                  styles.onlineStatusText,
                  { color: onlineStatusData?.is_online ? "#15803d" : "#b45309" }
                ]}>
                  {onlineStatusData?.is_online ? "Online" : "Offline"}
                </Text>
              </View>
            )}

            {/* Activity Logs Button */}
            <TouchableOpacity
              style={styles.activityBtn}
              onPress={(e) => { e.stopPropagation(); loadActivityLogs(); }}
              activeOpacity={0.7}
            >
              <Ionicons name="pulse-outline" size={14} color="#6366f1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expanded Content */}
        {isExpanded && (
          <>
            {/* Attendance Times Section */}
            <View style={styles.attendanceSection}>
              <View style={styles.timeContainer}>
                <View style={styles.timeCard}>
                  <View style={[styles.timeIconWrapper, { backgroundColor: "#d1fae5" }]}>
                    <Ionicons name="log-in" size={16} color="#059669" />
                  </View>
                  <View style={styles.timeInfo}>
                    <Text style={styles.timeLabel}>CHECK-IN</Text>
                    <Text style={styles.timeValue}>{record.check_in || "--:--"}</Text>
                  </View>
                </View>
                {!loading && checkInStatus && (
                  <View style={styles.inlineStatus}>
                    <AttendanceStatusBadge status={checkInStatus.checkInStatus} size="small" showLabel={true} />
                  </View>
                )}
              </View>

              <View style={styles.arrowContainer}>
                <Ionicons name="arrow-forward-circle" size={22} color="#e2e8f0" />
              </View>

              <View style={styles.timeContainer}>
                <View style={styles.timeCard}>
                  <View style={[styles.timeIconWrapper, { backgroundColor: record.check_out ? "#fee2e2" : "#f1f5f9" }]}>
                    <Ionicons name="log-out" size={16} color={record.check_out ? "#dc2626" : "#94a3b8"} />
                  </View>
                  <View style={styles.timeInfo}>
                    <Text style={styles.timeLabel}>CHECK-OUT</Text>
                    <Text style={[styles.timeValue, !record.check_out && styles.timeValueMuted]}>
                      {record.check_out || "--:--"}
                    </Text>
                  </View>
                </View>
                {record.check_out && !loading && checkOutStatus && (
                  <View style={styles.inlineStatus}>
                    <AttendanceStatusBadge status={checkOutStatus.checkOutStatus} size="small" showLabel={true} />
                  </View>
                )}
              </View>
            </View>

            {/* Work Hours Summary - Only show after checkout */}
            {hasCheckedOut && (
              <View style={styles.workHoursSummary}>
                <LinearGradient
                  colors={["#eff6ff", "#dbeafe"]}
                  style={styles.workHoursGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.workHoursMain}>
                    <Ionicons
                      name="time"
                      size={18}
                      color="#2563eb"
                    />
                    <View style={styles.workHoursInfo}>
                      <Text style={styles.workHoursLabel}>
                        Working Hours
                      </Text>
                      <Text style={[styles.workHoursValue, { color: "#1e40af" }]}>
                        {workedTimeFormatted}
                      </Text>
                    </View>
                  </View>

                  {/* Active & Offline breakdown - shown at bottom of expanded card */}
                  {(onlineMinutes > 0 || offlineMinutes > 0) && (
                    <View style={styles.workHoursBreakdown}>
                      <View style={styles.breakdownItem}>
                        <View style={[styles.breakdownDot, { backgroundColor: "#16a34a" }]} />
                        <Text style={styles.breakdownLabel}>
                          Working Hours
                        </Text>
                        <Text style={[styles.breakdownValue, { color: "#15803d" }]}>{formatDuration(onlineMinutes)}</Text>
                      </View>
                      {offlineMinutes > 0 && (
                        <View style={styles.breakdownItem}>
                          <View style={[styles.breakdownDot, { backgroundColor: "#f59e0b" }]} />
                          <Text style={styles.breakdownLabel}>Offline</Text>
                          <Text style={[styles.breakdownValue, { color: "#b45309" }]}>{formatDuration(offlineMinutes)}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </LinearGradient>
              </View>
            )}


            {/* Selfie Photos Row */}
            {(() => {
              // Get check-in selfie from multiple possible field names
              const checkInSelfieUri = record.selfie || record.checkInSelfie || record.check_in_selfie;
              // Get check-out selfie from multiple possible field names
              const checkOutSelfieUri = record.checkOutSelfie || record.check_out_selfie;

              return (
                <View style={styles.photosRow}>
                  <Text style={styles.photosLabel}>SELFIES</Text>
                  <View style={styles.photosContainer}>
                    <TouchableOpacity
                      style={styles.photoWrapper}
                      onPress={(e) => { e.stopPropagation(); onPhotoPress?.(record); }}
                      disabled={!isValidImageUri(checkInSelfieUri)}
                      activeOpacity={0.8}
                    >
                      {isValidImageUri(checkInSelfieUri) ? (
                        <>
                          <Image source={{ uri: checkInSelfieUri }} style={styles.photoImage} />
                          <View style={[styles.photoOverlay, { backgroundColor: "rgba(22, 163, 74, 0.9)" }]}>
                            <Ionicons name="log-in" size={10} color="#fff" />
                            <Text style={styles.photoOverlayText}>IN</Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Ionicons name="camera-outline" size={20} color="#cbd5e1" />
                          <Text style={styles.photoPlaceholderText}>IN</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.photoWrapper}
                      onPress={(e) => { e.stopPropagation(); onPhotoPress?.(record); }}
                      disabled={!isValidImageUri(checkOutSelfieUri)}
                      activeOpacity={0.8}
                    >
                      {isValidImageUri(checkOutSelfieUri) ? (
                        <>
                          <Image source={{ uri: checkOutSelfieUri }} style={styles.photoImage} />
                          <View style={[styles.photoOverlay, { backgroundColor: "rgba(220, 38, 38, 0.9)" }]}>
                            <Ionicons name="log-out" size={10} color="#fff" />
                            <Text style={styles.photoOverlayText}>OUT</Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Ionicons name="camera-outline" size={20} color="#cbd5e1" />
                          <Text style={styles.photoPlaceholderText}>OUT</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}

            {/* Work Report Section - Show if work report exists */}
            {(() => {
              const workReportUrl = record.workReport || record.work_report;
              const workSummary = record.workSummary || record.work_summary;

              if (!workReportUrl && !workSummary) return null;

              // Build full URL for work report
              const getFullReportUrl = () => {
                if (!workReportUrl) return null;
                if (workReportUrl.startsWith("http")) return workReportUrl;
                const baseUrl = API_CONFIG.getApiBaseUrl();
                return `${baseUrl}${workReportUrl.startsWith("/") ? "" : "/"}${workReportUrl.replace(/\\/g, "/")}`;
              };

              const fullReportUrl = getFullReportUrl();
              const fileName = workReportUrl ? workReportUrl.split("/").pop() || "work_report" : null;
              const fileExt = fileName ? fileName.split(".").pop()?.toLowerCase() : "";
              const isImage = /^(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileExt || "");
              const isPdf = fileExt === "pdf";
              const isDoc = /^(doc|docx)$/i.test(fileExt || "");
              const isExcel = /^(xls|xlsx|csv)$/i.test(fileExt || "");
              const isText = /^(txt|md|json)$/i.test(fileExt || "");
              const isZip = /^(zip|rar|7z)$/i.test(fileExt || "");

              // Get file type label for display
              const getFileTypeLabel = () => {
                if (isImage) return "Image";
                if (isPdf) return "PDF Document";
                if (isDoc) return "Word Document";
                if (isExcel) return "Spreadsheet";
                if (isText) return "Text File";
                if (isZip) return "Archive";
                return "Attachment";
              };

              // Get icon name based on file type
              const getFileIcon = (): string => {
                if (isImage) return "image";
                if (isPdf) return "document";
                if (isDoc) return "document-text";
                if (isExcel) return "grid";
                if (isText) return "reader";
                if (isZip) return "archive";
                return "attach";
              };

              // Get MIME type based on file extension
              const getMimeType = () => {
                if (!fileName) return "application/octet-stream";
                switch (fileExt) {
                  case "pdf": return "application/pdf";
                  case "jpg": case "jpeg": return "image/jpeg";
                  case "png": return "image/png";
                  case "gif": return "image/gif";
                  case "webp": return "image/webp";
                  case "bmp": return "image/bmp";
                  case "doc": return "application/msword";
                  case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                  case "xls": return "application/vnd.ms-excel";
                  case "xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                  case "csv": return "text/csv";
                  case "txt": return "text/plain";
                  case "md": return "text/markdown";
                  case "json": return "application/json";
                  case "zip": return "application/zip";
                  case "rar": return "application/x-rar-compressed";
                  default: return "application/octet-stream";
                }
              };

              const handleDownload = async () => {
                if (!fullReportUrl || !fileName) return;

                try {
                  // Generate unique filename to avoid cache issues
                  const timestamp = Date.now();
                  const uniqueFileName = `${timestamp}_${fileName}`;
                  const localUri = `${FileSystem.cacheDirectory}${uniqueFileName}`;

                  // Delete existing file if any
                  const fileInfo = await FileSystem.getInfoAsync(localUri);
                  if (fileInfo.exists) {
                    await FileSystem.deleteAsync(localUri, { idempotent: true });
                  }

                  // Download the file
                  const downloadResult = await FileSystem.downloadAsync(
                    fullReportUrl,
                    localUri
                  );

                  if (!downloadResult || downloadResult.status !== 200) {
                    Alert.alert("Error", "Failed to download file");
                    return;
                  }

                  // Verify file was downloaded
                  const downloadedFileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
                  if (!downloadedFileInfo.exists) {
                    Alert.alert("Error", "File download failed");
                    return;
                  }

                  const mimeType = getMimeType();

                  // Use sharing for both platforms - most reliable method
                  const isAvailable = await Sharing.isAvailableAsync();
                  if (isAvailable) {
                    await Sharing.shareAsync(downloadResult.uri, {
                      mimeType: mimeType,
                      dialogTitle: `Open ${fileName}`,
                      UTI: isPdf ? "com.adobe.pdf" : isImage ? "public.image" : undefined,
                    });
                  } else if (Platform.OS === "android") {
                    // Fallback to IntentLauncher on Android if sharing not available
                    try {
                      const contentUri = await FileSystem.getContentUriAsync(downloadResult.uri);
                      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
                        data: contentUri,
                        flags: 1,
                        type: mimeType,
                      });
                    } catch {
                      Alert.alert("Success", "File downloaded to device");
                    }
                  }
                } catch (error: any) {
                  console.error("Download error:", error);
                  // Don't show error if user just cancelled
                  if (!error.message?.includes("cancel") && !error.message?.includes("Cancel")) {
                    Alert.alert("Error", "Failed to open file. Please try again.");
                  }
                }
              };

              return (
                <View style={styles.workReportSection}>
                  <Text style={styles.workReportLabel}>WORK REPORT</Text>

                  {/* Work Summary Text */}
                  {workSummary && (
                    <View style={styles.workSummaryContainer}>
                      <Ionicons name="document-text-outline" size={14} color="#64748b" />
                      <Text style={styles.workSummaryText} numberOfLines={3}>
                        {workSummary}
                      </Text>
                    </View>
                  )}

                  {/* Work Report File */}
                  {fullReportUrl && (
                    <TouchableOpacity
                      style={styles.workReportFile}
                      onPress={handleDownload}
                      activeOpacity={0.7}
                    >
                      <View style={styles.workReportFileIcon}>
                        <Ionicons
                          name={getFileIcon() as any}
                          size={20}
                          color="#3b82f6"
                        />
                      </View>
                      <View style={styles.workReportFileInfo}>
                        <Text style={styles.workReportFileName} numberOfLines={1}>
                          {fileName}
                        </Text>
                        <Text style={styles.workReportFileType}>
                          {getFileTypeLabel()}
                        </Text>
                      </View>
                      <View style={styles.workReportDownloadBtn}>
                        <Ionicons name="download-outline" size={18} color="#3b82f6" />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}
          </>
        )}
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#3b82f6" />
        </View>
      )}

      {/* Activity Logs Modal */}
      <Modal visible={showActivityModal} transparent animationType="fade">
        <View style={styles.activityModalOverlay}>
          <View style={styles.activityModal}>
            <View style={styles.activityModalHeader}>
              <View style={styles.activityModalTitleRow}>
                <Ionicons name="pulse" size={20} color="#6366f1" />
                <Text style={styles.activityModalTitle}>Activity Log</Text>
              </View>
              <TouchableOpacity onPress={() => setShowActivityModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.activityModalSubtitle}>
              Online & Offline activity for {record.name}
            </Text>

            {loadingLogs ? (
              <View style={styles.activityLoading}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={styles.activityLoadingText}>Loading activity...</Text>
              </View>
            ) : activityLogs.length === 0 ? (
              <View style={styles.activityEmpty}>
                <Ionicons name="analytics-outline" size={40} color="#d1d5db" />
                <Text style={styles.activityEmptyText}>No activity logs found</Text>
              </View>
            ) : (
              <ScrollView style={styles.activityList} showsVerticalScrollIndicator={false}>
                {activityLogs.map((log, index) => (
                  <View key={log.id || index} style={styles.activityItem}>
                    <View style={[
                      styles.activityDot,
                      { backgroundColor: log.status === "online" ? "#16a34a" : "#f59e0b" }
                    ]} />
                    <View style={styles.activityContent}>
                      <View style={styles.activityTopRow}>
                        <Text style={[
                          styles.activityStatus,
                          { color: log.status === "online" ? "#15803d" : "#b45309" }
                        ]}>
                          {log.status === "online" ? "Online" : "Offline"}
                        </Text>
                        {log.duration_minutes !== null && log.duration_minutes !== undefined && (
                          <Text style={styles.activityDuration}>
                            {formatDuration(log.duration_minutes)}
                          </Text>
                        )}
                      </View>
                      <View style={styles.activityTimeRow}>
                        <Text style={styles.activityTime}>
                          {formatLogTime(log.started_at)} {log.ended_at ? `→ ${formatLogTime(log.ended_at)}` : "(ongoing)"}
                        </Text>
                      </View>
                      {log.offline_reason && (
                        <Text style={styles.activityReason}>
                          Reason: {log.offline_reason}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.activityCloseBtn}
              onPress={() => setShowActivityModal(false)}
            >
              <Text style={styles.activityCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
};

export default AttendanceRecordCard;


const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  cardContent: {
    padding: 14,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  headerLeft: {
    flexDirection: "row",
    flex: 1,
    gap: 12,
  },

  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e2e8f0",
  },

  avatarText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 17,
  },

  userInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.3,
  },

  statusBadgeMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },

  statusLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },

  roleBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  metaText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },

  expandIndicator: {
    padding: 4,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
  },

  // Time Summary Row
  timeSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },

  timeBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  timeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  timeIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  timeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },

  timeTextMuted: {
    color: "#94a3b8",
  },

  totalHoursChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  totalHoursText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },

  // Online Status Bar
  onlineStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fafafa",
    borderRadius: 10,
  },

  onlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  onlineLabel: {
    fontSize: 11,
    fontWeight: "700",
  },

  onlineTimeStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  onlineTimeStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  onlineTimeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16a34a",
  },

  offlineTimeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#b45309",
  },

  // Completed Stats Bar
  completedStatsBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
  },

  completedStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  completedStatLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748b",
  },

  completedStatValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },

  // Location Row
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },

  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },

  locationPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },

  // Online Status Pill
  onlineStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },

  onlineStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  onlineStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Status and Activity Row
  statusAndActivityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  activityBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eef2ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },

  // Activity Modal
  activityModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  activityModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxHeight: "70%",
    padding: 20,
  },

  activityModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  activityModalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  activityModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },

  activityModalSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 16,
  },

  activityLoading: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },

  activityLoadingText: {
    fontSize: 13,
    color: "#6b7280",
  },

  activityEmpty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },

  activityEmptyText: {
    fontSize: 14,
    color: "#9ca3af",
  },

  activityList: {
    maxHeight: 300,
  },

  activityItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },

  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },

  activityContent: {
    flex: 1,
  },

  activityTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  activityStatus: {
    fontSize: 14,
    fontWeight: "600",
  },

  activityDuration: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },

  activityTimeRow: {
    marginBottom: 4,
  },

  activityTime: {
    fontSize: 12,
    color: "#6b7280",
  },

  activityReason: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
    marginTop: 4,
  },

  activityCloseBtn: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
  },

  activityCloseBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
  },

  // Expanded Section
  attendanceSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 8,
  },

  timeContainer: {
    flex: 1,
  },

  timeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },

  timeIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  timeInfo: {
    flex: 1,
  },

  timeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  timeValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },

  timeValueMuted: {
    color: "#94a3b8",
  },

  inlineStatus: {
    marginTop: 6,
    alignItems: "center",
  },

  arrowContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 8,
  },

  // Work Hours Summary
  workHoursSummary: {
    marginTop: 14,
    borderRadius: 12,
    overflow: "hidden",
  },

  workHoursGradient: {
    padding: 14,
  },

  workHoursMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  workHoursInfo: {
    flex: 1,
  },

  workHoursLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  workHoursValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e40af",
    marginTop: 2,
  },

  workHoursBreakdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#bfdbfe",
  },

  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  breakdownLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748b",
  },

  breakdownValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },

  // Photos
  photosRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },

  photosLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  photosContainer: {
    flexDirection: "row",
    gap: 10,
  },

  photoWrapper: {
    flex: 1,
    aspectRatio: 4 / 3,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  photoImage: {
    width: "100%",
    height: "100%",
  },

  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },

  photoOverlayText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },

  photoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },

  photoPlaceholderText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94a3b8",
  },

  // Loading
  loadingOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
  },

  // Work Report Section
  workReportSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },

  workReportLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  workSummaryContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },

  workSummaryText: {
    flex: 1,
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },

  workReportFile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderStyle: "dashed",
  },

  workReportFileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },

  workReportFileInfo: {
    flex: 1,
    marginLeft: 12,
  },

  workReportFileName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e40af",
  },

  workReportFileType: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },

  workReportDownloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
});
