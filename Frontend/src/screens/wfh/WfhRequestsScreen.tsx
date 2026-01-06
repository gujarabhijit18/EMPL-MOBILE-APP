import React, { useState, useCallback } from "react";
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
import { apiService, WfhRequestResponse } from "../../lib/api";
import { useAuth, UserRole } from "../../contexts/AuthContext";
import { formatIST } from "../../utils/dateTime";
import { 
    canApproveWfhRequest, 
    normalizeRole, 
    getRoleDisplayName,
    hasApprovalPermissions,
    isRequestLocked,
    WfhApprovalContext,
    WfhRequestContext
} from "../../utils/wfhApprovalLogic";
import { Colors, Shadows, BorderRadius, Spacing } from "../../constants/designSystem";

type StatusFilter = "All" | "Pending" | "Approved" | "Rejected";

// Enhanced Filter Dropdown Component
interface FilterDropdownProps {
    icon: string;
    value: string;
    options: string[];
    onSelect: (value: string) => void;
    isActive: boolean;
}

function FilterDropdown({ icon, value, options, onSelect, isActive }: FilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <View style={styles.dropdownWrapper}>
            <TouchableOpacity
                style={[styles.dropdownTrigger, isActive && styles.dropdownTriggerActive]}
                onPress={() => setIsOpen(!isOpen)}
            >
                <Ionicons name={icon as any} size={16} color={isActive ? Colors.primary : "#64748b"} />
                <Text style={[styles.dropdownLabel, isActive && styles.dropdownLabelActive]}>
                    {value}
                </Text>
                <Ionicons 
                    name={isOpen ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color={isActive ? Colors.primary : "#94a3b8"}
                    style={{ marginLeft: "auto" }}
                />
            </TouchableOpacity>

            {isOpen && (
                <View style={styles.dropdownMenu}>
                    {options.map((option) => (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.dropdownOption,
                                value === option && styles.dropdownOptionActive
                            ]}
                            onPress={() => {
                                onSelect(option);
                                setIsOpen(false);
                            }}
                        >
                            <View style={[
                                styles.optionCheckbox,
                                value === option && styles.optionCheckboxActive
                            ]}>
                                {value === option && (
                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                )}
                            </View>
                            <Text style={[
                                styles.dropdownOptionText,
                                value === option && styles.dropdownOptionTextActive
                            ]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

export default function WfhRequestsScreen() {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const [requests, setRequests] = useState<WfhRequestResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("Pending");
    const [departmentFilter, setDepartmentFilter] = useState<string>("All");
    const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

    // Rejection Modal
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<WfhRequestResponse | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [processingId, setProcessingId] = useState<number | null>(null);

    // Admin Override Modal
    const [overrideModalVisible, setOverrideModalVisible] = useState(false);
    const [overrideAction, setOverrideAction] = useState<"approve" | "reject">("approve");
    const [overrideRemarks, setOverrideRemarks] = useState("");

    // Get current user's approval context
    const getApproverContext = (): WfhApprovalContext => ({
        approverRole: normalizeRole(user?.role),
        approverDepartment: user?.department,
        approverId: user?.user_id || user?.id || "",
    });

    // Convert API response to request context for approval check
    const getRequestContext = (request: WfhRequestResponse): WfhRequestContext => ({
        requesterId: request.user_id,
        requesterRole: normalizeRole(request.role),
        requesterDepartment: request.department,
        status: request.status as "Pending" | "Approved" | "Rejected",
    });

    const loadRequests = async () => {
        setLoading(true);
        try {
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
            const userRole = normalizeRole(user?.role);
            if (userRole === "admin" || userRole === "hr") {
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

    // Check if current user can approve a specific request
    const checkApprovalPermission = (request: WfhRequestResponse): { canApprove: boolean; reason?: string } => {
        const approverContext = getApproverContext();
        const requestContext = getRequestContext(request);
        return canApproveWfhRequest(approverContext, requestContext);
    };

    const handleApprove = async (request: WfhRequestResponse) => {
        const { canApprove, reason } = checkApprovalPermission(request);
        
        if (!canApprove) {
            Alert.alert("Not Authorized", reason || "You don't have permission to approve this request.");
            return;
        }

        // Check if this is an override action (request already processed)
        const isOverride = request.status !== "Pending";
        if (isOverride && normalizeRole(user?.role) === "admin") {
            setSelectedRequest(request);
            setOverrideAction("approve");
            setOverrideRemarks("");
            setOverrideModalVisible(true);
            return;
        }

        setProcessingId(request.wfh_id);
        try {
            await apiService.approveRejectWfhRequest(request.wfh_id, true, null);
            Toast.show({ 
                type: "success", 
                text1: "Approved", 
                text2: `WFH request approved by ${getRoleDisplayName(normalizeRole(user?.role))}.` 
            });
            loadRequests();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to approve request.");
        } finally {
            setProcessingId(null);
        }
    };

    const openRejectModal = (request: WfhRequestResponse) => {
        const { canApprove, reason } = checkApprovalPermission(request);
        
        if (!canApprove) {
            Alert.alert("Not Authorized", reason || "You don't have permission to reject this request.");
            return;
        }

        // Check if this is an override action
        const isOverride = request.status !== "Pending";
        if (isOverride && normalizeRole(user?.role) === "admin") {
            setSelectedRequest(request);
            setOverrideAction("reject");
            setOverrideRemarks("");
            setOverrideModalVisible(true);
            return;
        }

        setSelectedRequest(request);
        setRejectionReason("");
        setRejectModalVisible(true);
    };

    const confirmReject = async () => {
        if (!selectedRequest) return;
        if (!rejectionReason.trim()) {
            Alert.alert("Required", "Please provide a rejection reason.");
            return;
        }

        setProcessingId(selectedRequest.wfh_id);
        try {
            await apiService.approveRejectWfhRequest(selectedRequest.wfh_id, false, rejectionReason);
            setRejectModalVisible(false);
            Toast.show({ 
                type: "success", 
                text1: "Rejected", 
                text2: `WFH request rejected by ${getRoleDisplayName(normalizeRole(user?.role))}.` 
            });
            loadRequests();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to reject request.");
        } finally {
            setProcessingId(null);
            setSelectedRequest(null);
        }
    };

    const confirmOverride = async () => {
        if (!selectedRequest) return;
        if (overrideAction === "reject" && !overrideRemarks.trim()) {
            Alert.alert("Required", "Please provide remarks for the override action.");
            return;
        }

        setProcessingId(selectedRequest.wfh_id);
        try {
            const isApprove = overrideAction === "approve";
            const remarks = overrideRemarks.trim() || `Admin override: ${overrideAction}`;
            
            await apiService.approveRejectWfhRequest(
                selectedRequest.wfh_id, 
                isApprove, 
                isApprove ? null : remarks
            );
            
            setOverrideModalVisible(false);
            Toast.show({ 
                type: "success", 
                text1: `Override ${isApprove ? "Approved" : "Rejected"}`, 
                text2: `Request status changed by Admin.` 
            });
            loadRequests();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to override request.");
        } finally {
            setProcessingId(null);
            setSelectedRequest(null);
            setOverrideRemarks("");
        }
    };

    const renderStatusTab = (tab: StatusFilter) => (
        <TouchableOpacity
            key={tab}
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
            default: return "#f59e0b";
        }
    };

    const getStatusBg = (status: string) => {
        switch (status.toLowerCase()) {
            case "approved": return "#d1fae5";
            case "rejected": return "#fee2e2";
            default: return "#fef3c7";
        }
    };

    const getRoleBadgeStyle = (role?: string) => {
        const normalizedRole = normalizeRole(role);
        const styles: Record<UserRole, { bg: string; text: string }> = {
            admin: { bg: "#fee2e2", text: "#991b1b" },
            hr: { bg: "#fce7f3", text: "#831843" },
            manager: { bg: "#fed7aa", text: "#9a3412" },
            team_lead: { bg: "#bfdbfe", text: "#1e40af" },
            employee: { bg: "#d1fae5", text: "#065f46" },
        };
        return styles[normalizedRole] || styles.employee;
    };

    const renderItem = ({ item }: { item: WfhRequestResponse }) => {
        const isPending = item.status.toLowerCase() === "pending";
        const isProcessing = processingId === item.wfh_id;
        const { canApprove, reason } = checkApprovalPermission(item);
        const userRole = normalizeRole(user?.role);
        const isLocked = isRequestLocked(item.status as any, userRole);
        const isOwnRequest = String(user?.user_id || user?.id) === String(item.user_id);
        const roleBadge = getRoleBadgeStyle(item.role);

        return (
            <View style={styles.card}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {(item.name || item.user_name || "U").charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.userName}>
                                {item.name || item.user_name || `User ${item.user_id}`}
                                {isOwnRequest && <Text style={styles.ownBadge}> (You)</Text>}
                            </Text>
                            <View style={styles.userMeta}>
                                <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg }]}>
                                    <Text style={[styles.roleBadgeText, { color: roleBadge.text }]}>
                                        {getRoleDisplayName(normalizeRole(item.role))}
                                    </Text>
                                </View>
                                <Text style={styles.userDept}>{item.department || "N/A"}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                {/* Request Details */}
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

                {/* Reason */}
                {item.reason && (
                    <View style={styles.reasonBox}>
                        <Text style={styles.reasonLabel}>Reason:</Text>
                        <Text style={styles.reasonText}>{item.reason}</Text>
                    </View>
                )}

                {/* Approval Info (for processed requests) */}
                {!isPending && item.approved_by && (
                    <View style={styles.approvalInfoBox}>
                        <Ionicons 
                            name={item.status === "Approved" ? "checkmark-circle" : "close-circle"} 
                            size={16} 
                            color={item.status === "Approved" ? "#10b981" : "#ef4444"} 
                        />
                        <Text style={styles.approvalInfoText}>
                            {item.status} by {item.approver_name || `User ${item.approved_by}`}
                            {item.approved_at && ` on ${formatIST(item.approved_at, "MMM dd, yyyy")}`}
                        </Text>
                    </View>
                )}

                {/* Rejection Reason */}
                {item.status === "Rejected" && item.rejection_reason && (
                    <View style={styles.rejectionBox}>
                        <Ionicons name="alert-circle" size={16} color="#ef4444" />
                        <Text style={styles.rejectionText}>
                            Rejection Reason: {item.rejection_reason}
                        </Text>
                    </View>
                )}

                {/* Processing Indicator */}
                {isProcessing && (
                    <ActivityIndicator style={{ marginTop: 10 }} color="#2563eb" />
                )}

                {/* Action Buttons */}
                {!isProcessing && canApprove && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => handleApprove(item)}
                        >
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.actionText}>
                                {!isPending && userRole === "admin" ? "Override Approve" : "Approve"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => openRejectModal(item)}
                        >
                            <Ionicons name="close-circle" size={18} color="#fff" />
                            <Text style={styles.actionText}>
                                {!isPending && userRole === "admin" ? "Override Reject" : "Reject"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* No Permission Message */}
                {!isProcessing && !canApprove && isPending && !isOwnRequest && (
                    <View style={styles.noPermissionBox}>
                        <Ionicons name="lock-closed" size={16} color="#94a3b8" />
                        <Text style={styles.noPermissionText}>{reason}</Text>
                    </View>
                )}

                {/* Locked Status Message */}
                {!isPending && isLocked && !canApprove && (
                    <View style={styles.lockedBox}>
                        <Ionicons name="lock-closed" size={16} color="#64748b" />
                        <Text style={styles.lockedText}>
                            This request has been {item.status.toLowerCase()} and cannot be modified.
                        </Text>
                    </View>
                )}

                {/* Own Request Message */}
                {isOwnRequest && isPending && (
                    <View style={styles.ownRequestBox}>
                        <Ionicons name="information-circle" size={16} color="#3b82f6" />
                        <Text style={styles.ownRequestText}>
                            This is your own request. You cannot approve your own WFH request.
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    // Check if user has any approval permissions
    const userRole = normalizeRole(user?.role);
    const canViewApprovals = hasApprovalPermissions(userRole);

    if (!canViewApprovals) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={20} color={Colors.headerText} />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>WFH Requests</Text>
                        <Text style={styles.headerSubtitle}>Access Restricted</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.noAccessContainer}>
                    <Ionicons name="lock-closed" size={64} color="#cbd5e1" />
                    <Text style={styles.noAccessTitle}>Access Restricted</Text>
                    <Text style={styles.noAccessText}>
                        Only Admin, HR, and Managers can view and approve WFH requests.
                    </Text>
                    <TouchableOpacity 
                        style={styles.goBackBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.goBackBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color={Colors.headerText} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>WFH Requests</Text>
                    <Text style={styles.headerSubtitle}>
                        {userRole === "admin" ? "All Requests" : 
                         userRole === "hr" ? "Organization Requests" : 
                         "Department Requests"}
                    </Text>
                </View>
                <View style={styles.roleIndicator}>
                    <Text style={styles.roleIndicatorText}>{getRoleDisplayName(userRole)}</Text>
                </View>
            </View>

            {/* Filters Section */}
            <View style={styles.filtersSection}>
                {/* Status Filter */}
                <View style={styles.filterRow}>
                    <Text style={styles.filterSectionTitle}>Filter by Status</Text>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.statusFilterScroll}
                    >
                        {(["All", "Pending", "Approved", "Rejected"] as StatusFilter[]).map(renderStatusTab)}
                    </ScrollView>
                </View>

                {/* Department Filter for Admin/HR */}
                {(userRole === "admin" || userRole === "hr") && availableDepartments.length > 1 && (
                    <View style={styles.filterRow}>
                        <View style={styles.filterRowHeader}>
                            <Text style={styles.filterSectionTitle}>Filter by Department</Text>
                            {departmentFilter !== "All" && (
                                <TouchableOpacity 
                                    onPress={() => setDepartmentFilter("All")}
                                    style={styles.clearFilterBtn}
                                >
                                    <Text style={styles.clearFilterText}>Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <FilterDropdown
                            icon="business"
                            value={departmentFilter}
                            options={availableDepartments}
                            onSelect={setDepartmentFilter}
                            isActive={departmentFilter !== "All"}
                        />
                    </View>
                )}
            </View>

            {/* Request List */}
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
                            <Text style={styles.emptySubtext}>
                                {statusFilter !== "All" 
                                    ? `No ${statusFilter.toLowerCase()} requests to display`
                                    : "No WFH requests available"}
                            </Text>
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
                        <View style={styles.modalHeader}>
                            <Ionicons name="close-circle" size={40} color="#ef4444" />
                            <Text style={styles.modalTitle}>Reject Request</Text>
                            <Text style={styles.modalSubtitle}>
                                Please provide a reason for rejection.
                            </Text>
                        </View>

                        {selectedRequest && (
                            <View style={styles.modalRequestInfo}>
                                <Text style={styles.modalRequestName}>
                                    {selectedRequest.name || selectedRequest.user_name}
                                </Text>
                                <Text style={styles.modalRequestDates}>
                                    {selectedRequest.start_date} to {selectedRequest.end_date}
                                </Text>
                            </View>
                        )}

                        <TextInput
                            style={styles.modalInput}
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                            placeholder="Enter rejection reason (required)..."
                            placeholderTextColor="#9ca3af"
                            multiline
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                onPress={() => setRejectModalVisible(false)} 
                                style={styles.modalCancelBtn}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={confirmReject} 
                                style={[styles.modalRejectBtn, !rejectionReason.trim() && { opacity: 0.5 }]} 
                                disabled={!rejectionReason.trim()}
                            >
                                <Text style={styles.modalRejectBtnText}>Reject Request</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Admin Override Modal */}
            <Modal
                visible={overrideModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setOverrideModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Ionicons 
                                name="shield-checkmark" 
                                size={40} 
                                color="#f59e0b" 
                            />
                            <Text style={styles.modalTitle}>Admin Override</Text>
                            <Text style={styles.modalSubtitle}>
                                You are about to override a {selectedRequest?.status?.toLowerCase()} request.
                            </Text>
                        </View>

                        {selectedRequest && (
                            <View style={styles.modalRequestInfo}>
                                <Text style={styles.modalRequestName}>
                                    {selectedRequest.name || selectedRequest.user_name}
                                </Text>
                                <Text style={styles.modalRequestDates}>
                                    Current Status: <Text style={{ fontWeight: "700" }}>{selectedRequest.status}</Text>
                                </Text>
                                <Text style={styles.modalRequestDates}>
                                    New Status: <Text style={{ fontWeight: "700", color: overrideAction === "approve" ? "#10b981" : "#ef4444" }}>
                                        {overrideAction === "approve" ? "Approved" : "Rejected"}
                                    </Text>
                                </Text>
                            </View>
                        )}

                        <TextInput
                            style={styles.modalInput}
                            value={overrideRemarks}
                            onChangeText={setOverrideRemarks}
                            placeholder={`Enter remarks for override ${overrideAction === "reject" ? "(required)" : "(optional)"}...`}
                            placeholderTextColor="#9ca3af"
                            multiline
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                onPress={() => setOverrideModalVisible(false)} 
                                style={styles.modalCancelBtn}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={confirmOverride} 
                                style={[
                                    overrideAction === "approve" ? styles.modalApproveBtn : styles.modalRejectBtn,
                                    overrideAction === "reject" && !overrideRemarks.trim() && { opacity: 0.5 }
                                ]} 
                                disabled={overrideAction === "reject" && !overrideRemarks.trim()}
                            >
                                <Text style={styles.modalApproveBtnText}>
                                    Confirm {overrideAction === "approve" ? "Approval" : "Rejection"}
                                </Text>
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
    roleIndicator: {
        backgroundColor: Colors.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: "#bfdbfe",
    },
    roleIndicatorText: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.primaryDark,
    },

    // Filter Section Styles
    filtersSection: {
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
    },
    filterRow: {
        marginBottom: Spacing.lg,
    },
    filterRowHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: Spacing.md,
    },
    filterSectionTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: Spacing.md,
    },
    clearFilterBtn: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.xs,
        backgroundColor: "#fee2e2",
    },
    clearFilterText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#dc2626",
    },
    statusFilterScroll: { 
        gap: 8,
        paddingRight: Spacing.lg,
    },
    tab: { 
        paddingHorizontal: Spacing.md, 
        paddingVertical: Spacing.sm, 
        borderRadius: BorderRadius.md, 
        backgroundColor: "#f1f5f9", 
        borderWidth: 1.5, 
        borderColor: "#e2e8f0",
        minWidth: 80,
        alignItems: "center",
    },
    tabActive: { 
        backgroundColor: Colors.primary, 
        borderColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    tabText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
    tabTextActive: { color: "#fff" },

    // Dropdown Styles
    dropdownWrapper: {
        position: "relative",
        zIndex: 10,
    },
    dropdownTrigger: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        backgroundColor: "#f9fafb",
        borderWidth: 1.5,
        borderColor: "#e2e8f0",
        borderRadius: BorderRadius.md,
        minHeight: 44,
    },
    dropdownTriggerActive: {
        backgroundColor: "#eff6ff",
        borderColor: Colors.primary,
        borderWidth: 2,
    },
    dropdownLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.textSecondary,
        flex: 1,
    },
    dropdownLabelActive: {
        color: Colors.primary,
    },
    dropdownMenu: {
        position: "absolute",
        top: 50,
        left: 0,
        right: 0,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.xs,
        ...Shadows.card,
        zIndex: 1000,
        overflow: "hidden",
    },
    dropdownOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    dropdownOptionActive: {
        backgroundColor: "#eff6ff",
    },
    optionCheckbox: {
        width: 20,
        height: 20,
        borderRadius: BorderRadius.sm,
        borderWidth: 2,
        borderColor: "#cbd5e1",
        alignItems: "center",
        justifyContent: "center",
    },
    optionCheckboxActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    dropdownOptionText: {
        fontSize: 14,
        fontWeight: "500",
        color: Colors.text,
        flex: 1,
    },
    dropdownOptionTextActive: {
        fontWeight: "700",
        color: Colors.primary,
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
    cardHeader: { 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "flex-start", 
        marginBottom: 14 
    },
    userInfo: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, flex: 1 },
    avatar: { 
        width: 44, 
        height: 44, 
        borderRadius: 22, 
        backgroundColor: Colors.primaryLight, 
        alignItems: "center", 
        justifyContent: "center" 
    },
    avatarText: { fontSize: 18, fontWeight: "700", color: Colors.primaryDark },
    userDetails: { flex: 1 },
    userName: { fontSize: 15, fontWeight: "700", color: Colors.headerText },
    ownBadge: { fontSize: 12, fontWeight: "600", color: Colors.primary },
    userMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" },
    userDept: { fontSize: 12, color: Colors.textSecondary },
    roleBadge: { 
        paddingHorizontal: 8, 
        paddingVertical: 2, 
        borderRadius: BorderRadius.xs 
    },
    roleBadgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
    statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
    statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },

    requestDetails: { flexDirection: "row", gap: Spacing.lg, marginBottom: Spacing.md },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    typeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    dateText: { fontSize: 13, color: "#334155", fontWeight: "500" },
    typeText: { fontSize: 13, color: "#334155", fontWeight: "500" },

    reasonBox: { 
        backgroundColor: Colors.background, 
        padding: Spacing.md, 
        borderRadius: BorderRadius.md, 
        marginBottom: Spacing.md 
    },
    reasonLabel: { fontSize: 11, fontWeight: "600", color: Colors.textSecondary, marginBottom: 4 },
    reasonText: { fontSize: 13, color: "#334155", lineHeight: 20 },

    approvalInfoBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        backgroundColor: "#f0fdf4",
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: "#bbf7d0",
    },
    approvalInfoText: { flex: 1, fontSize: 12, color: "#166534", fontWeight: "500" },

    rejectionBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: Spacing.sm,
        backgroundColor: Colors.errorLight,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: "#fecaca",
    },
    rejectionText: { flex: 1, fontSize: 12, color: "#b91c1c", lineHeight: 18 },

    actions: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.md },
    actionBtn: { 
        flex: 1, 
        flexDirection: "row", 
        alignItems: "center", 
        justifyContent: "center", 
        paddingVertical: 12, 
        borderRadius: BorderRadius.md, 
        gap: 6 
    },
    approveBtn: { backgroundColor: Colors.success },
    rejectBtn: { backgroundColor: Colors.error },
    actionText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    noPermissionBox: { 
        flexDirection: "row", 
        alignItems: "center", 
        gap: Spacing.md, 
        backgroundColor: "#f1f5f9", 
        padding: Spacing.md, 
        borderRadius: BorderRadius.md, 
        marginTop: Spacing.md 
    },
    noPermissionText: { fontSize: 13, color: "#64748b", fontWeight: "500", flex: 1 },

    lockedBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        backgroundColor: "#f1f5f9",
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    lockedText: { flex: 1, fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },

    ownRequestBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        backgroundColor: Colors.primaryLight,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.md,
        borderWidth: 1,
        borderColor: "#bfdbfe",
    },
    ownRequestText: { flex: 1, fontSize: 12, color: Colors.primaryDark, fontWeight: "500" },

    emptyState: { alignItems: "center", paddingTop: 60 },
    emptyText: { color: Colors.textTertiary, fontSize: 16, marginTop: 10, fontWeight: "600" },
    emptySubtext: { color: Colors.textTertiary, fontSize: 13, marginTop: 4 },

    // No Access State
    noAccessContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: Spacing.xxl,
    },
    noAccessTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: Colors.headerText,
        marginTop: Spacing.xl,
        marginBottom: Spacing.sm,
    },
    noAccessText: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: Spacing.xxl,
    },
    goBackBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    goBackBtnText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 15,
    },

    // Modal Styles
    modalOverlay: { 
        flex: 1, 
        backgroundColor: "rgba(0,0,0,0.5)", 
        justifyContent: "center", 
        padding: Spacing.xl 
    },
    modalContent: { 
        backgroundColor: Colors.surface, 
        borderRadius: BorderRadius.xl, 
        padding: Spacing.xxl, 
        ...Shadows.modal 
    },
    modalHeader: {
        alignItems: "center",
        marginBottom: Spacing.xl,
    },
    modalTitle: { 
        fontSize: 20, 
        fontWeight: "700", 
        textAlign: "center", 
        marginTop: Spacing.md,
        color: Colors.headerText 
    },
    modalSubtitle: { 
        fontSize: 13, 
        color: Colors.textSecondary, 
        textAlign: "center", 
        marginTop: Spacing.sm,
        lineHeight: 20,
    },
    modalRequestInfo: {
        backgroundColor: Colors.background,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.lg,
        alignItems: "center",
    },
    modalRequestName: {
        fontSize: 15,
        fontWeight: "700",
        color: Colors.headerText,
    },
    modalRequestDates: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    modalInput: { 
        backgroundColor: "#f9fafb", 
        borderWidth: 1, 
        borderColor: Colors.border, 
        borderRadius: BorderRadius.md, 
        padding: Spacing.md, 
        height: 100, 
        textAlignVertical: "top", 
        marginBottom: Spacing.xl,
        fontSize: 14,
        color: Colors.text,
    },
    modalActions: { flexDirection: "row", gap: Spacing.md },
    modalCancelBtn: { 
        flex: 1, 
        padding: 14, 
        alignItems: "center", 
        backgroundColor: "#f1f5f9", 
        borderRadius: BorderRadius.md 
    },
    modalCancelText: { color: Colors.textSecondary, fontWeight: "600" },
    modalRejectBtn: { 
        flex: 1, 
        padding: 14, 
        alignItems: "center", 
        backgroundColor: Colors.error, 
        borderRadius: BorderRadius.md 
    },
    modalRejectBtnText: { color: "#fff", fontWeight: "600" },
    modalApproveBtn: {
        flex: 1,
        padding: 14,
        alignItems: "center",
        backgroundColor: Colors.success,
        borderRadius: BorderRadius.md,
    },
    modalApproveBtnText: { color: "#fff", fontWeight: "600" },
});
