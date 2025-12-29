import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
    Platform,
    ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";
import { apiService, WfhRequestResponse } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { formatIST } from "../../utils/dateTime";
import { Colors, Shadows, BorderRadius, Spacing } from "../../constants/designSystem";

export default function WfhRequestsScreen() {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const [requests, setRequests] = useState<WfhRequestResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("Pending");
    const [departmentFilter, setDepartmentFilter] = useState<string>("All"); // For Admin/HR
    const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

    // Rejection Modal
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [processingId, setProcessingId] = useState<number | null>(null);

    const loadRequests = async () => {
        setLoading(true);
        try {
            // Determine filters
            // If user is Admin/HR, they might want to filter by department.
            // If user is Manager, backend restricts to their department usually.

            const dept = departmentFilter === "All" ? undefined : departmentFilter;
            const statusF = statusFilter === "All" ? undefined : statusFilter;

            const data = await apiService.listWfhRequests(statusF, dept);

            // Sort: Pending first, then by date desc
            const sorted = data.sort((a, b) => {
                if (a.status === "Pending" && b.status !== "Pending") return -1;
                if (a.status !== "Pending" && b.status === "Pending") return 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            setRequests(sorted);

            // Extract departments for filter if Admin/HR
            if (user?.role === "admin" || user?.role === "hr") {
                const depts = Array.from(new Set(data.map(r => r.department).filter(Boolean))) as string[];
                setAvailableDepartments(["All", ...depts]);
            }

        } catch (error) {
            console.warn("Failed to load WFH requests", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadRequests();
        }, [statusFilter, departmentFilter])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadRequests();
    };

    const handleApprove = async (id: number) => {
        setProcessingId(id);
        try {
            // Approve requires no reason
            await apiService.approveRejectWfhRequest(id, true, null);
            Toast.show({ type: "success", text1: "Approved", text2: "Request approved successfully." });
            loadRequests();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to approve request.");
        } finally {
            setProcessingId(null);
        }
    };

    const openRejectModal = (id: number) => {
        setSelectedRequestId(id);
        setRejectionReason("");
        setRejectModalVisible(true);
    };

    const confirmReject = async () => {
        if (!selectedRequestId) return;
        if (!rejectionReason.trim()) {
            Alert.alert("Required", "Please provide a rejection reason.");
            return;
        }

        setProcessingId(selectedRequestId);
        try {
            await apiService.approveRejectWfhRequest(selectedRequestId, false, rejectionReason);
            setRejectModalVisible(false);
            Toast.show({ type: "success", text1: "Rejected", text2: "Request rejected successfully." });
            loadRequests();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to reject request.");
        } finally {
            setProcessingId(null);
            setSelectedRequestId(null);
        }
    };

    const renderStatusTab = (tab: typeof statusFilter) => (
        <TouchableOpacity
            style={[styles.tab, statusFilter === tab && styles.tabActive]}
            onPress={() => setStatusFilter(tab)}
        >
            <Text style={[styles.tabText, statusFilter === tab && styles.tabTextActive]}>{tab}</Text>
        </TouchableOpacity>
    );

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "approved": return "#10b981";
            case "rejected": return "#ef4444";
            default: return "#f59e0b"; // yellow
        }
    };

    const getStatusBg = (status: string) => {
        switch (status.toLowerCase()) {
            case "approved": return "#d1fae5";
            case "rejected": return "#fee2e2";
            default: return "#fef3c7";
        }
    };

    const renderItem = ({ item }: { item: WfhRequestResponse }) => {
        const isPending = item.status.toLowerCase() === "pending";
        const isProcessing = processingId === item.wfh_id;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{(item.name || "U").charAt(0).toUpperCase()}</Text>
                        </View>
                        <View>
                            <Text style={styles.userName}>{item.name || `User ${item.user_id}`}</Text>
                            <Text style={styles.userDept}>{item.department || "N/A"} • {item.role || "Employee"}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.requestDetails}>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar" size={16} color="#64748b" />
                        <Text style={styles.dateText}>
                            {item.start_date} <Text style={{ color: '#94a3b8' }}>to</Text> {item.end_date}
                        </Text>
                    </View>
                    <View style={styles.typeRow}>
                        <Ionicons name="time" size={16} color="#64748b" />
                        <Text style={styles.typeText}>{item.wfh_type}</Text>
                    </View>
                </View>

                {item.reason && (
                    <View style={styles.reasonBox}>
                        <Text style={styles.reasonText}>{item.reason}</Text>
                    </View>
                )}

                {isProcessing && (
                    <ActivityIndicator style={{ marginTop: 10 }} color="#2563eb" />
                )}

                {isPending && !isProcessing && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => handleApprove(item.wfh_id)}
                        >
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.actionText}>Approve</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => openRejectModal(item.wfh_id)}
                        >
                            <Ionicons name="close-circle" size={18} color="#fff" />
                            <Text style={styles.actionText}>Reject</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Modern White Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color={Colors.headerText} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>WFH Requests</Text>
                    <Text style={styles.headerSubtitle}>Review and manage team requests</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Filters */}
            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                    {renderStatusTab("Pending")}
                    {renderStatusTab("Approved")}
                    {renderStatusTab("Rejected")}
                    {renderStatusTab("All")}
                </ScrollView>
            </View>

            <FlatList
                data={requests}
                renderItem={renderItem}
                keyExtractor={(item) => item.wfh_id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="file-tray-outline" size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No requests found</Text>
                        </View>
                    ) : null
                }
            />

            {/* Reject Modal */}
            <Modal
                visible={rejectModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setRejectModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reject Request</Text>
                        <Text style={styles.modalSubtitle}>Please provide a reason for rejection.</Text>

                        <TextInput
                            style={styles.modalInput}
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                            placeholder="Reason required..."
                            multiline
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setRejectModalVisible(false)} style={styles.modalCancelBtn}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={confirmReject} style={[styles.modalRejectBtn, !rejectionReason.trim() && { opacity: 0.5 }]} disabled={!rejectionReason.trim()}>
                                <Text style={styles.modalRejectBtnText}>Reject Request</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: Platform.OS === "ios" ? 50 : 40,
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xl,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    headerTextContainer: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.headerText },
    headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
    backBtn: { 
        width: 40, 
        height: 40, 
        borderRadius: BorderRadius.md, 
        backgroundColor: Colors.surface,
        justifyContent: "center", 
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },

    filterContainer: { backgroundColor: Colors.surface, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
    tabsScroll: { paddingHorizontal: Spacing.lg, gap: 10 },
    tab: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: Colors.border },
    tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    tabText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
    tabTextActive: { color: "#fff" },

    listContent: { padding: Spacing.lg },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.card,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
    userInfo: { flexDirection: "row", alignItems: "center", gap: Spacing.md, flex: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 16, fontWeight: "700", color: Colors.primaryDark },
    userName: { fontSize: 15, fontWeight: "700", color: Colors.headerText },
    userDept: { fontSize: 12, color: Colors.textSecondary },
    statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
    statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },

    requestDetails: { flexDirection: "row", gap: Spacing.lg, marginBottom: Spacing.md },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    typeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    dateText: { fontSize: 13, color: "#334155", fontWeight: "500" },
    typeText: { fontSize: 13, color: "#334155", fontWeight: "500" },

    reasonBox: { backgroundColor: Colors.background, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
    reasonText: { fontSize: 13, color: "#334155", lineHeight: 20, fontStyle: "italic" },

    actions: { flexDirection: "row", gap: Spacing.md },
    actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: BorderRadius.md, gap: 6 },
    approveBtn: { backgroundColor: Colors.success },
    rejectBtn: { backgroundColor: Colors.error },
    actionText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    emptyState: { alignItems: "center", paddingTop: 60 },
    emptyText: { color: Colors.textTertiary, fontSize: 16, marginTop: 10 },

    // Reject Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: Spacing.xl },
    modalContent: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xxl, ...Shadows.modal },
    modalTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: Spacing.sm, color: Colors.headerText },
    modalSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginBottom: Spacing.xl },
    modalInput: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, height: 100, textAlignVertical: "top", marginBottom: Spacing.xl },
    modalActions: { flexDirection: "row", gap: Spacing.md },
    modalCancelBtn: { flex: 1, padding: 14, alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: BorderRadius.md },
    modalCancelText: { color: Colors.textSecondary, fontWeight: "600" },
    modalRejectBtn: { flex: 1, padding: 14, alignItems: "center", backgroundColor: Colors.error, borderRadius: BorderRadius.md },
    modalRejectBtnText: { color: "#fff", fontWeight: "600" },
});
