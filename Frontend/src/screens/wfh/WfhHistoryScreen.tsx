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
    Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";
import { apiService, WfhRequestResponse } from "../../lib/api";
import { formatIST } from "../../utils/dateTime";
import { canEditWfhRequest, canDeleteWfhRequest } from "../../utils/wfhEnhancedValidation";
import { getRoleDisplayName, normalizeRole } from "../../utils/wfhApprovalLogic";
import { Colors, Shadows, BorderRadius, Spacing, Gradients } from "../../constants/designSystem";

export default function WfhHistoryScreen() {
    const navigation = useNavigation<any>();
    const [requests, setRequests] = useState<WfhRequestResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Edit Modal State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingRequest, setEditingRequest] = useState<WfhRequestResponse | null>(null);
    const [editStartDate, setEditStartDate] = useState(new Date());
    const [editEndDate, setEditEndDate] = useState(new Date());
    const [editWfhType, setEditWfhType] = useState<"Full Day" | "Half Day">("Full Day");
    const [editReason, setEditReason] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);

    // Date Pickers for Edit
    const [showEditStartPicker, setShowEditStartPicker] = useState(false);
    const [showEditEndPicker, setShowEditEndPicker] = useState(false);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const data = await apiService.getMyWfhRequests();
            // Sort by created_at desc
            const sorted = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setRequests(sorted);
        } catch (error) {
            console.warn("Failed to load history", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadRequests();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadRequests();
    };

    const handleDelete = async (id: number) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this WFH request?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await apiService.deleteMyWfhRequest(id);
                            Toast.show({ type: "success", text1: "Deleted", text2: "Request removed successfully." });
                            loadRequests();
                        } catch (error: any) {
                            Alert.alert("Error", error.message || "Failed to delete request.");
                        }
                    }
                }
            ]
        );
    };

    const openEditModal = (req: WfhRequestResponse) => {
        setEditingRequest(req);
        setEditStartDate(new Date(req.start_date));
        setEditEndDate(new Date(req.end_date));
        setEditWfhType((req.wfh_type as "Full Day" | "Half Day") || "Full Day");
        setEditReason(req.reason);
        setEditModalVisible(true);
    };

    const handleUpdate = async () => {
        if (!editingRequest) return;
        if (editReason.length < 10 || editReason.length > 500) {
            Alert.alert("Invalid Input", "Reason must be between 10 and 500 characters.");
            return;
        }
        if (editStartDate > editEndDate) {
            Alert.alert("Invalid Dates", "Start date cannot be after end date.");
            return;
        }

        setSavingEdit(true);
        try {
            const startStr = formatIST(editStartDate.toISOString(), "yyyy-MM-dd");
            const endStr = formatIST(editEndDate.toISOString(), "yyyy-MM-dd");

            await apiService.updateMyWfhRequest(editingRequest.wfh_id, {
                start_date: startStr,
                end_date: endStr,
                wfh_type: editWfhType,
                reason: editReason
            });

            setEditModalVisible(false);
            Toast.show({ type: "success", text1: "Updated", text2: "Request updated successfully." });
            loadRequests();
        } catch (error: any) {
            Alert.alert("Update Failed", error.message || "Could not update request.");
        } finally {
            setSavingEdit(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "approved": return "#10b981"; // green
            case "rejected": return "#ef4444"; // red
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
        const canEdit = canEditWfhRequest(item);
        const canDelete = canDeleteWfhRequest(item);
        const isApprovedOrRejected = !canEdit && !canDelete;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.dateRange}>
                            {item.start_date} <Text style={{ color: '#94a3b8' }}>to</Text> {item.end_date}
                        </Text>
                        <Text style={styles.createdDate}>Applied: {formatIST(item.created_at, "MMM dd, yyyy")}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.pill}>
                        <Ionicons name="time-outline" size={14} color="#64748b" />
                        <Text style={styles.pillText}>{item.wfh_type}</Text>
                    </View>
                </View>

                {item.reason && (
                    <View style={styles.reasonBox}>
                        <Text style={styles.reasonLabel}>Reason:</Text>
                        <Text style={styles.reasonText} numberOfLines={2}>{item.reason}</Text>
                    </View>
                )}

                {/* Approval Info for approved requests */}
                {item.status.toLowerCase() === "approved" && item.approved_by && (
                    <View style={styles.approvalInfoBox}>
                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                        <View style={styles.approvalInfoContent}>
                            <Text style={styles.approvalInfoText}>
                                Approved by {item.approver_name || `User ${item.approved_by}`}
                                {item.approver_role && (
                                    <Text style={styles.approverRole}> ({getRoleDisplayName(normalizeRole(item.approver_role))})</Text>
                                )}
                            </Text>
                            {item.approved_at && (
                                <Text style={styles.approvalDate}>
                                    {formatIST(item.approved_at, "MMM dd, yyyy 'at' hh:mm a")}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {item.status.toLowerCase() === "rejected" && item.rejection_reason && (
                    <View style={styles.rejectionBox}>
                        <Ionicons name="alert-circle" size={16} color="#ef4444" />
                        <View style={styles.rejectionContent}>
                            <Text style={styles.rejectionText}>
                                Rejected by {item.approver_name || `User ${item.approved_by}`}
                                {item.approver_role && (
                                    <Text style={styles.approverRole}> ({getRoleDisplayName(normalizeRole(item.approver_role))})</Text>
                                )}
                            </Text>
                            <Text style={styles.rejectionReasonText}>Reason: {item.rejection_reason}</Text>
                            {item.approved_at && (
                                <Text style={styles.rejectionDate}>
                                    {formatIST(item.approved_at, "MMM dd, yyyy 'at' hh:mm a")}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Locked state message for approved/rejected requests */}
                {isApprovedOrRejected && (
                    <View style={styles.lockedBox}>
                        <Ionicons name="lock-closed" size={16} color="#64748b" />
                        <Text style={styles.lockedText}>
                            {item.status.toLowerCase() === "approved" 
                                ? "Approved requests cannot be edited or deleted." 
                                : "Rejected requests cannot be edited or deleted."}
                        </Text>
                    </View>
                )}

                {isPending && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.editBtn, !canEdit && styles.actionBtnDisabled]}
                            onPress={() => canEdit && openEditModal(item)}
                            disabled={!canEdit}
                        >
                            <Ionicons name="create-outline" size={16} color={canEdit ? "#2563eb" : "#cbd5e1"} />
                            <Text style={[styles.editBtnText, !canEdit && styles.actionBtnTextDisabled]}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.deleteBtn, !canDelete && styles.actionBtnDisabled]}
                            onPress={() => canDelete && handleDelete(item.wfh_id)}
                            disabled={!canDelete}
                        >
                            <Ionicons name="trash-outline" size={16} color={canDelete ? "#ef4444" : "#cbd5e1"} />
                            <Text style={[styles.deleteBtnText, !canDelete && styles.actionBtnTextDisabled]}>Delete</Text>
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
                    <Text style={styles.headerTitle}>WFH Request History</Text>
                    <Text style={styles.headerSubtitle}>View and manage your requests</Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate("WfhApply")}
                >
                    <Ionicons name="add" size={20} color={Colors.primary} />
                </TouchableOpacity>
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
                            <Ionicons name="documents-outline" size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No WFH requests found</Text>
                        </View>
                    ) : null
                }
            />

            {/* Edit Modal */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Request</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Start Date</Text>
                            <TouchableOpacity style={styles.dateInput} onPress={() => setShowEditStartPicker(true)}>
                                <Text>{formatIST(editStartDate.toISOString(), "yyyy-MM-dd")}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>End Date</Text>
                            <TouchableOpacity style={styles.dateInput} onPress={() => setShowEditEndPicker(true)}>
                                <Text>{formatIST(editEndDate.toISOString(), "yyyy-MM-dd")}</Text>
                            </TouchableOpacity>
                        </View>

                        {(showEditStartPicker) && (
                            <DateTimePicker
                                value={editStartDate}
                                mode="date"
                                display="default"
                                onChange={(e, d) => {
                                    setShowEditStartPicker(Platform.OS === 'ios');
                                    if (d) setEditStartDate(d);
                                }}
                            />
                        )}
                        {(showEditEndPicker) && (
                            <DateTimePicker
                                value={editEndDate}
                                mode="date"
                                display="default"
                                onChange={(e, d) => {
                                    setShowEditEndPicker(Platform.OS === 'ios');
                                    if (d) setEditEndDate(d);
                                }}
                            />
                        )}

                        <View style={styles.typeRow}>
                            <TouchableOpacity
                                style={[styles.typeOption, editWfhType === "Full Day" && styles.typeOptionActive]}
                                onPress={() => setEditWfhType("Full Day")}
                            >
                                <Text style={[styles.typeText, editWfhType === "Full Day" && styles.typeTextActive]}>Full Day</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeOption, editWfhType === "Half Day" && styles.typeOptionActive]}
                                onPress={() => setEditWfhType("Half Day")}
                            >
                                <Text style={[styles.typeText, editWfhType === "Half Day" && styles.typeTextActive]}>Half Day</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.modalInput}
                            value={editReason}
                            onChangeText={setEditReason}
                            placeholder="Reason"
                            multiline
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCancelBtn}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleUpdate} style={styles.modalSaveBtn} disabled={savingEdit}>
                                {savingEdit ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Save Changes</Text>}
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
    addBtn: { 
        width: 40, 
        height: 40, 
        borderRadius: BorderRadius.md, 
        backgroundColor: Colors.primaryLight,
        justifyContent: "center", 
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#bfdbfe",
    },

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
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Spacing.md },
    dateRange: { fontSize: 16, fontWeight: "700", color: Colors.headerText },
    createdDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.sm },
    statusText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },

    row: { flexDirection: "row", gap: 10, marginBottom: Spacing.md },
    pill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f1f5f9", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
    pillText: { fontSize: 12, color: "#475569", fontWeight: "600" },

    reasonBox: { backgroundColor: Colors.background, padding: 10, borderRadius: BorderRadius.sm, marginTop: 4 },
    reasonLabel: { fontSize: 11, fontWeight: "600", color: Colors.textSecondary, marginBottom: 2 },
    reasonText: { fontSize: 13, color: "#334155", lineHeight: 18 },

    rejectionBox: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, backgroundColor: Colors.errorLight, padding: 10, borderRadius: BorderRadius.sm, marginTop: Spacing.md, borderWidth: 1, borderColor: "#fecaca" },
    rejectionContent: { flex: 1 },
    rejectionText: { fontSize: 12, color: "#b91c1c", fontWeight: "600" },
    rejectionReasonText: { fontSize: 12, color: "#b91c1c", marginTop: 4, lineHeight: 18 },
    rejectionDate: { fontSize: 11, color: "#dc2626", marginTop: 4 },

    approvalInfoBox: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, backgroundColor: "#d1fae5", padding: 10, borderRadius: BorderRadius.sm, marginTop: Spacing.md, borderWidth: 1, borderColor: "#a7f3d0" },
    approvalInfoContent: { flex: 1 },
    approvalInfoText: { fontSize: 12, color: "#065f46", fontWeight: "600" },
    approverRole: { fontWeight: "500", color: "#047857" },
    approvalDate: { fontSize: 11, color: "#059669", marginTop: 4 },

    lockedBox: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, backgroundColor: "#f1f5f9", padding: 10, borderRadius: BorderRadius.sm, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border },
    lockedText: { flex: 1, fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },

    actions: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg, borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: Spacing.md },
    actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1 },
    actionBtnDisabled: { opacity: 0.5 },
    actionBtnTextDisabled: { color: "#cbd5e1" },
    editBtn: { borderColor: "#bfdbfe", backgroundColor: Colors.primaryLight },
    editBtnText: { color: Colors.primary, fontWeight: "600", fontSize: 13 },
    deleteBtn: { borderColor: "#fecaca", backgroundColor: Colors.errorLight },
    deleteBtnText: { color: Colors.error, fontWeight: "600", fontSize: 13 },

    emptyState: { alignItems: "center", paddingTop: 60 },
    emptyText: { color: Colors.textTertiary, fontSize: 16, marginTop: 10 },

    // Edit Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: Spacing.xl },
    modalContent: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl, ...Shadows.modal },
    modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: Spacing.xl, textAlign: "center", color: Colors.headerText },
    inputGroup: { marginBottom: Spacing.lg },
    label: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 },
    dateInput: { padding: Spacing.md, backgroundColor: "#f9fafb", borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
    modalInput: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, height: 100, textAlignVertical: "top", marginBottom: Spacing.xl },

    typeRow: { flexDirection: "row", gap: 10, marginBottom: Spacing.xl },
    typeOption: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: BorderRadius.sm, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: Colors.border },
    typeOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    typeText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
    typeTextActive: { color: "#fff" },

    modalActions: { flexDirection: "row", gap: Spacing.md },
    modalCancelBtn: { flex: 1, padding: 14, alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: BorderRadius.md },
    modalCancelText: { color: Colors.textSecondary, fontWeight: "600" },
    modalSaveBtn: { flex: 1, padding: 14, alignItems: "center", backgroundColor: Colors.primary, borderRadius: BorderRadius.md },
    modalSaveText: { color: "#fff", fontWeight: "600" },
});
