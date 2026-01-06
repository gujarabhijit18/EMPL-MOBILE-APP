import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../lib/api";
import { formatTimeIST, formatIST, getCurrentISTTime } from "../../utils/dateTime";

// ==========================================
// 🔸 Types & Interfaces
// ==========================================

interface AttendanceRecord {
    attendance_id: number;
    user_id: number;
    employee_id: string;
    name: string;
    role: string;
    department: string;
    check_in: string;
    check_out: string | null;
    total_hours: number;
    date: string;
    status: "Present" | "Absent" | "Half Day" | "WFH";
    work_location?: string;
    profile_photo?: string;
    effective_work_hours?: number;
    total_online_minutes?: number;
    total_offline_minutes?: number;
    checkInSelfie?: string;
    checkOutSelfie?: string;
}

type DateFilter = "today" | "yesterday" | "week" | "month" | "custom";
type SortOrder = "latest" | "oldest";

// ==========================================
// 🔸 Helper Functions
// ==========================================

/**
 * Calculate total working hours from check-in and check-out times
 */
const calculateWorkingHours = (record: AttendanceRecord): string => {
    // 1. Prioritize effective_work_hours (which strictly excludes offline time)
    const effectiveHours = record.effective_work_hours || record.total_hours;

    if (effectiveHours && effectiveHours > 0) {
        const hours = Math.floor(effectiveHours);
        const minutes = Math.round((effectiveHours - hours) * 60);
        return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    }

    // 2. If no effective hours but we have total_online_minutes (live or from backend)
    const onlineMinutes = record.total_online_minutes;
    if (onlineMinutes && onlineMinutes > 0) {
        const hours = Math.floor(onlineMinutes / 60);
        const minutes = Math.round(onlineMinutes % 60);
        return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    }

    if (!record.check_out) return "In Progress";

    try {
        // Standardize date strings for safer parsing
        const parseDate = (dateStr: string) => {
            if (!dateStr) return new Date(NaN);
            // If it's a simple "YYYY-MM-DD HH:mm:ss" format, convert to "YYYY-MM-DDTHH:mm:ss"
            let standardized = dateStr.trim();
            if (standardized.includes(' ') && !standardized.includes('T')) {
                standardized = standardized.replace(' ', 'T');
            }
            return new Date(standardized);
        };

        const checkInTime = parseDate(record.check_in);
        const checkOutTime = parseDate(record.check_out);

        if (isNaN(checkInTime.getTime()) || isNaN(checkOutTime.getTime())) return "--:--";

        const diffMs = checkOutTime.getTime() - checkInTime.getTime();
        if (diffMs < 0) return "0h 00m";

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        return `${diffHours}h ${String(diffMinutes).padStart(2, '0')}m`;
    } catch (error) {
        console.warn("Calculation error:", error);
        return "--:--";
    }
};

/**
 * Determine attendance status based on check-in/out and work location
 */
const determineAttendanceStatus = (
    record: AttendanceRecord
): "Present" | "Absent" | "Half Day" | "WFH" => {
    if (!record.check_in) return "Absent";
    if (record.work_location === "Work From Home") return "WFH";

    // Use pre-calculated status if available from record
    if (record.status && ["Present", "Absent", "Half Day", "WFH"].includes(record.status)) {
        return record.status as any;
    }

    // Calculate working hours if checked out
    if (record.check_out) {
        const checkInStr = record.check_in.includes(' ') && !record.check_in.includes('T')
            ? record.check_in.replace(' ', 'T')
            : record.check_in;
        const checkOutStr = record.check_out.includes(' ') && !record.check_out.includes('T')
            ? record.check_out.replace(' ', 'T')
            : record.check_out;

        const checkInTime = new Date(checkInStr);
        const checkOutTime = new Date(checkOutStr);

        if (!isNaN(checkInTime.getTime()) && !isNaN(checkOutTime.getTime())) {
            const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            // Half day threshold: 4 hours
            if (hoursWorked < 4) return "Half Day";
        }
    }

    return "Present";
};

/**
 * Get status badge color configuration
 */
const getStatusBadgeStyle = (status: string) => {
    switch (status) {
        case "Present":
            return { bg: "#dcfce7", color: "#16a34a", icon: "checkmark-circle" };
        case "WFH":
            return { bg: "#dbeafe", color: "#2563eb", icon: "home" };
        case "Half Day":
            return { bg: "#fef3c7", color: "#d97706", icon: "time" };
        case "Absent":
            return { bg: "#fee2e2", color: "#dc2626", icon: "close-circle" };
        default:
            return { bg: "#f1f5f9", color: "#64748b", icon: "help-circle" };
    }
};

/**
 * Get role badge color
 */
const getRoleBadgeColor = (role: string): string => {
    const roleColors: Record<string, string> = {
        Admin: "#8b5cf6",
        HR: "#ec4899",
        Manager: "#f59e0b",
        "Team Lead": "#10b981",
        Employee: "#3b82f6",
    };
    return roleColors[role] || "#64748b";
};

/**
 * Filter records based on role visibility rules
 */
const filterRecordsByRole = (
    records: AttendanceRecord[],
    userRole: string,
    userDepartment: string,
    userId: number
): AttendanceRecord[] => {
    const normalizedRole = userRole?.toLowerCase();

    // Admin: Can view all records
    if (normalizedRole === "admin") {
        return records;
    }

    // HR: Can view all records
    if (normalizedRole === "hr") {
        return records;
    }

    // Manager: Can view records within their department
    if (normalizedRole === "manager") {
        return records.filter(
            (record) => record.department === userDepartment
        );
    }

    // Team Lead / Employee: Can view only their own records
    return records.filter((record) => record.user_id === userId);
};

/**
 * Apply date filter to records
 */
const filterRecordsByDate = (
    records: AttendanceRecord[],
    filter: DateFilter,
    customStartDate?: Date,
    customEndDate?: Date
): AttendanceRecord[] => {
    const now = getCurrentISTTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return records.filter((record) => {
        const recordDate = new Date(record.date);

        switch (filter) {
            case "today":
                return recordDate >= today;
            case "yesterday": {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return (
                    recordDate >= yesterday &&
                    recordDate < today
                );
            }
            case "week": {
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return recordDate >= weekAgo;
            }
            case "month": {
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return recordDate >= monthAgo;
            }
            case "custom":
                if (customStartDate && customEndDate) {
                    return recordDate >= customStartDate && recordDate <= customEndDate;
                }
                return true;
            default:
                return true;
        }
    });
};

/**
 * Sort records by date
 */
const sortRecords = (
    records: AttendanceRecord[],
    order: SortOrder
): AttendanceRecord[] => {
    return [...records].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return order === "latest" ? dateB - dateA : dateA - dateB;
    });
};

// ==========================================
// 🔸 Attendance Card Component
// ==========================================

interface AttendanceCardProps {
    record: AttendanceRecord;
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ record }) => {
    const workingHours = calculateWorkingHours(record);
    const status = determineAttendanceStatus(record);
    const statusStyle = getStatusBadgeStyle(status);
    const roleColor = getRoleBadgeColor(record.role);

    return (
        <View style={styles.card}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <View style={[styles.avatar, { backgroundColor: `${roleColor}20` }]}>
                        <Text style={[styles.avatarText, { color: roleColor }]}>
                            {record.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{record.name}</Text>
                        <View style={styles.metaRow}>
                            <View style={styles.metaChip}>
                                <Ionicons name="id-card-outline" size={10} color="#64748b" />
                                <Text style={styles.metaText}>{record.employee_id}</Text>
                            </View>
                        </View>
                    </View>
                </View>
                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Ionicons name={statusStyle.icon as any} size={12} color={statusStyle.color} />
                    <Text style={[styles.statusText, { color: statusStyle.color }]}>
                        {status}
                    </Text>
                </View>
            </View>

            {/* Role & Department Row */}
            <View style={styles.badgeRow}>
                <View style={[styles.roleBadge, { backgroundColor: `${roleColor}15` }]}>
                    <Ionicons name="briefcase-outline" size={10} color={roleColor} />
                    <Text style={[styles.badgeText, { color: roleColor }]}>{record.role}</Text>
                </View>
                <View style={styles.deptBadge}>
                    <Ionicons name="business-outline" size={10} color="#64748b" />
                    <Text style={styles.badgeText}>{record.department}</Text>
                </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Attendance Details */}
            <View style={styles.detailsSection}>
                {/* Date */}
                <View style={styles.detailRow}>
                    <View style={styles.detailLabel}>
                        <Ionicons name="calendar-outline" size={14} color="#64748b" />
                        <Text style={styles.labelText}>Attendance Date</Text>
                    </View>
                    <Text style={styles.detailValue}>
                        {record.date ? formatIST(record.date, "dd MMM yyyy") : "—"}
                    </Text>
                </View>

                {/* Check-In */}
                <View style={styles.detailRow}>
                    <View style={styles.detailLabel}>
                        <Ionicons name="log-in-outline" size={14} color="#16a34a" />
                        <Text style={styles.labelText}>Check-In Time</Text>
                    </View>
                    <Text style={[styles.detailValue, styles.timeValue]}>
                        {formatTimeIST(record.check_in)}
                    </Text>
                </View>

                {/* Check-Out */}
                <View style={styles.detailRow}>
                    <View style={styles.detailLabel}>
                        <Ionicons name="log-out-outline" size={14} color="#dc2626" />
                        <Text style={styles.labelText}>Check-Out Time</Text>
                    </View>
                    <Text style={[styles.detailValue, styles.timeValue, !record.check_out && styles.mutedText]}>
                        {record.check_out ? formatTimeIST(record.check_out) : "—"}
                    </Text>
                </View>

                {/* Working Hours */}
                <View style={[styles.detailRow, styles.highlightRow]}>
                    <View style={styles.detailLabel}>
                        <Ionicons name="time-outline" size={14} color="#2563eb" />
                        <Text style={styles.labelText}>Total Working Hours</Text>
                    </View>
                    <Text style={[styles.detailValue, styles.hoursValue]}>
                        {workingHours}
                    </Text>
                </View>
            </View>
        </View>
    );
};

// ==========================================
// 🔸 Main Attendance Records Screen
// ==========================================

const AttendanceRecordsScreen: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
    const [displayedRecords, setDisplayedRecords] = useState<AttendanceRecord[]>([]);

    // Filters
    const [dateFilter, setDateFilter] = useState<DateFilter>("today");
    const [sortOrder, setSortOrder] = useState<SortOrder>("latest");
    const [departmentFilter, setDepartmentFilter] = useState<string>("all");
    const [departments, setDepartments] = useState<string[]>([]);

    // Load attendance records
    const loadAttendanceRecords = async () => {
        if (!user?.id) return;

        try {
            setLoading(true);

            // Fetch attendance history
            const data = await apiService.getAttendanceHistory({});

            // Transform data
            const transformedRecords: AttendanceRecord[] = data.map((item: any) => {
                let onlineMins = item.total_online_minutes ?? item.totalOnlineMinutes ?? 0;
                const offlineMins = item.total_offline_minutes ?? item.totalOfflineMinutes ?? 0;

                // Fallback for duration calculation if online minutes is 0
                if (onlineMins === 0 && item.check_in && item.check_out) {
                    try {
                        const start = new Date(item.check_in).getTime();
                        const end = new Date(item.check_out).getTime();
                        if (!isNaN(start) && !isNaN(end)) {
                            const diffMins = Math.floor((end - start) / (1000 * 60));
                            onlineMins = Math.max(0, diffMins - offlineMins);
                        }
                    } catch (e) { }
                }

                return {
                    attendance_id: item.attendance_id,
                    user_id: item.user_id,
                    employee_id: item.employee_id,
                    name: item.name || item.userName,
                    // Prioritize role from item, fallback to user_role, ensure capitalization
                    role: (item.role || item.user_role || "Employee").charAt(0).toUpperCase() + (item.role || item.user_role || "Employee").slice(1),
                    department: item.department,
                    check_in: item.check_in,
                    check_out: item.check_out,
                    total_hours: item.total_hours || 0,
                    date: item.check_in ? new Date(item.check_in).toISOString().split("T")[0] : "",
                    status: item.status || "Present",
                    work_location: item.work_location,
                    profile_photo: item.profile_photo,
                    effective_work_hours: item.effective_work_hours ?? item.effectiveWorkHours ?? 0,
                    total_online_minutes: onlineMins,
                    total_offline_minutes: offlineMins,
                    checkInSelfie: item.checkInSelfie || item.check_in_selfie,
                    checkOutSelfie: item.checkOutSelfie || item.check_out_selfie,
                };
            });

            // Filter by role visibility
            const filteredByRole = filterRecordsByRole(
                transformedRecords,
                user.role || "",
                user.department || "",
                parseInt(user.id)
            );

            setAllRecords(filteredByRole);

            // Extract unique departments for filter
            const uniqueDepts = Array.from(
                new Set(filteredByRole.map((r) => r.department).filter(Boolean))
            );
            setDepartments(uniqueDepts);

            applyFiltersAndSort(filteredByRole);
        } catch (error: any) {
            console.error("Failed to load attendance records:", error);
            Alert.alert("Error", "Failed to load attendance records. Please try again.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Apply filters and sorting
    const applyFiltersAndSort = useCallback(
        (records: AttendanceRecord[]) => {
            let filtered = [...records];

            // Apply department filter (only for HR/Admin)
            if (departmentFilter !== "all") {
                filtered = filtered.filter((r) => r.department === departmentFilter);
            }

            // Apply date filter
            filtered = filterRecordsByDate(filtered, dateFilter);

            // Apply sorting
            filtered = sortRecords(filtered, sortOrder);

            setDisplayedRecords(filtered);
        },
        [dateFilter, sortOrder, departmentFilter]
    );

    // Refresh handler
    const handleRefresh = () => {
        setRefreshing(true);
        loadAttendanceRecords();
    };

    // Load on mount and screen focus
    useEffect(() => {
        loadAttendanceRecords();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadAttendanceRecords();
        }, [])
    );

    // Re-apply filters when they change
    useEffect(() => {
        applyFiltersAndSort(allRecords);
    }, [dateFilter, sortOrder, departmentFilter, allRecords, applyFiltersAndSort]);

    // Check if user can access department filter
    const canFilterByDepartment = ["admin", "hr"].includes(user?.role?.toLowerCase() || "");

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header */}
            <LinearGradient
                colors={["#ffffff", "#f8fafc"]}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerTitle}>Attendance Records</Text>
                        <Text style={styles.headerSubtitle}>
                            {displayedRecords.length} record{displayedRecords.length !== 1 ? "s" : ""} found
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                        <Ionicons name="refresh" size={20} color="#3b82f6" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Filters Section */}
            <View style={styles.filtersSection}>
                {/* Date Filter */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterScroll}
                    contentContainerStyle={styles.filterScrollContent}
                >
                    {(["today", "yesterday", "week", "month"] as DateFilter[]).map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[
                                styles.filterChip,
                                dateFilter === filter && styles.filterChipActive,
                            ]}
                            onPress={() => setDateFilter(filter)}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    dateFilter === filter && styles.filterChipTextActive,
                                ]}
                            >
                                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Department Filter (HR/Admin only) */}
                {canFilterByDepartment && departments.length > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.filterScroll}
                        contentContainerStyle={styles.filterScrollContent}
                    >
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                departmentFilter === "all" && styles.filterChipActive,
                            ]}
                            onPress={() => setDepartmentFilter("all")}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    departmentFilter === "all" && styles.filterChipTextActive,
                                ]}
                            >
                                All Departments
                            </Text>
                        </TouchableOpacity>
                        {departments.map((dept) => (
                            <TouchableOpacity
                                key={dept}
                                style={[
                                    styles.filterChip,
                                    departmentFilter === dept && styles.filterChipActive,
                                ]}
                                onPress={() => setDepartmentFilter(dept)}
                            >
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        departmentFilter === dept && styles.filterChipTextActive,
                                    ]}
                                >
                                    {dept}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Sort Controls */}
                <View style={styles.sortRow}>
                    <Text style={styles.sortLabel}>Sort by:</Text>
                    <TouchableOpacity
                        style={[
                            styles.sortButton,
                            sortOrder === "latest" && styles.sortButtonActive,
                        ]}
                        onPress={() => setSortOrder("latest")}
                    >
                        <Ionicons
                            name="arrow-down"
                            size={14}
                            color={sortOrder === "latest" ? "#fff" : "#64748b"}
                        />
                        <Text
                            style={[
                                styles.sortButtonText,
                                sortOrder === "latest" && styles.sortButtonTextActive,
                            ]}
                        >
                            Latest First
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.sortButton,
                            sortOrder === "oldest" && styles.sortButtonActive,
                        ]}
                        onPress={() => setSortOrder("oldest")}
                    >
                        <Ionicons
                            name="arrow-up"
                            size={14}
                            color={sortOrder === "oldest" ? "#fff" : "#64748b"}
                        />
                        <Text
                            style={[
                                styles.sortButtonText,
                                sortOrder === "oldest" && styles.sortButtonTextActive,
                            ]}
                        >
                            Oldest First
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Records List */}
            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Loading attendance records...</Text>
                </View>
            ) : displayedRecords.length === 0 ? (
                <View style={styles.centerContent}>
                    <Ionicons name="calendar-outline" size={64} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>No attendance records found</Text>
                    <Text style={styles.emptySubtitle}>
                        No attendance records found for the selected period.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.recordsList}
                    contentContainerStyle={styles.recordsListContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#3b82f6"]} />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {displayedRecords.map((record) => (
                        <AttendanceCard key={record.attendance_id} record={record} />
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export default AttendanceRecordsScreen;

// ==========================================
// 🔸 Styles
// ==========================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    headerContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#0f172a",
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        color: "#64748b",
        marginTop: 2,
    },
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#eff6ff",
        justifyContent: "center",
        alignItems: "center",
    },
    filtersSection: {
        backgroundColor: "#fff",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    filterScroll: {
        marginBottom: 8,
    },
    filterScrollContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#f1f5f9",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    filterChipActive: {
        backgroundColor: "#3b82f6",
        borderColor: "#3b82f6",
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#64748b",
    },
    filterChipTextActive: {
        color: "#fff",
    },
    sortRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        gap: 8,
    },
    sortLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#64748b",
    },
    sortButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: "#f1f5f9",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    sortButtonActive: {
        backgroundColor: "#3b82f6",
        borderColor: "#3b82f6",
    },
    sortButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748b",
    },
    sortButtonTextActive: {
        color: "#fff",
    },
    centerContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: "#64748b",
    },
    emptyTitle: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: "600",
        color: "#0f172a",
    },
    emptySubtitle: {
        marginTop: 8,
        fontSize: 14,
        color: "#64748b",
        textAlign: "center",
    },
    recordsList: {
        flex: 1,
    },
    recordsListContent: {
        padding: 16,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: "row",
        gap: 12,
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        fontSize: 18,
        fontWeight: "700",
    },
    userInfo: {
        flex: 1,
        justifyContent: "center",
    },
    userName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0f172a",
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: "row",
        gap: 6,
    },
    metaChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        backgroundColor: "#f1f5f9",
    },
    metaText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#64748b",
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "700",
    },
    badgeRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 12,
    },
    roleBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    deptBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: "#f1f5f9",
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#64748b",
    },
    divider: {
        height: 1,
        backgroundColor: "#e2e8f0",
        marginBottom: 12,
    },
    detailsSection: {
        gap: 10,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    highlightRow: {
        backgroundColor: "#f8fafc",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginTop: 4,
    },
    detailLabel: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    labelText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#64748b",
    },
    detailValue: {
        fontSize: 13,
        fontWeight: "600",
        color: "#0f172a",
    },
    timeValue: {
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    hoursValue: {
        fontSize: 14,
        fontWeight: "700",
        color: "#2563eb",
    },
    mutedText: {
        color: "#94a3b8",
    },
});
