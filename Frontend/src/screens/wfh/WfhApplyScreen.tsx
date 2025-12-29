import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Toast from "react-native-toast-message";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { apiService } from "../../lib/api";
import { formatIST, getCurrentISTTime } from "../../utils/dateTime";
import { validateWfhAdvanceNotice, getMinimumWfhStartDate } from "../../utils/attendanceWfhLogic";
import { validateWfhRequest, getWfhErrorMessage } from "../../utils/wfhEnhancedValidation";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Shadows, BorderRadius, Spacing, Typography, Gradients } from "../../constants/designSystem";

export default function WfhApplyScreen() {
    const navigation = useNavigation<any>();
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [wfhType, setWfhType] = useState<"Full Day" | "Half Day">("Full Day");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    
    // Success Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [submittedRequest, setSubmittedRequest] = useState<{
        startDate: string;
        endDate: string;
        wfhType: string;
        reason: string;
    } | null>(null);

    // Enhanced validation state
    const [existingWfhRequests, setExistingWfhRequests] = useState<any[]>([]);

    // Refresh dates when screen comes into focus to handle midnight transitions
    useFocusEffect(
        useCallback(() => {
            const today = new Date();
            setStartDate(today);
            setEndDate(today);
            // Fully reset form for fresh entry
            setReason("");
            setWfhType("Full Day");
            
            // Load existing WFH requests for validation
            loadExistingWfhRequests();
            
            return () => { };
        }, [])
    );

    const loadExistingWfhRequests = async () => {
        try {
            const requests = await apiService.getMyWfhRequests();
            setExistingWfhRequests(requests);
        } catch (error) {
            console.warn("Failed to load existing WFH requests:", error);
            setExistingWfhRequests([]);
        }
    };

    const onStartDateChange = (event: any, selectedDate?: Date) => {
        setShowStartPicker(Platform.OS === "ios");
        if (selectedDate) {
            setStartDate(selectedDate);
            if (selectedDate > endDate) {
                setEndDate(selectedDate);
            }
        }
    };

    const onEndDateChange = (event: any, selectedDate?: Date) => {
        setShowEndPicker(Platform.OS === "ios");
        if (selectedDate) {
            setEndDate(selectedDate);
        }
    };

    const isFutureDate = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return startDate > today;
    };

    const handleSubmit = async () => {
        // 1. Validate reason
        if (reason.length < 10 || reason.length > 500) {
            Alert.alert("Invalid Input", "Reason must be between 10 and 500 characters.");
            return;
        }
        
        // 2. Validate date range
        if (startDate > endDate) {
            Alert.alert("Invalid Dates", "Start date cannot be after end date.");
            return;
        }

        // 3. Format dates for validation
        const startStr = formatIST(startDate.toISOString(), "yyyy-MM-dd");
        const endStr = formatIST(endDate.toISOString(), "yyyy-MM-dd");
        
        // 4. Perform comprehensive WFH validation
        const validationResult = validateWfhRequest(startStr, endStr, existingWfhRequests);
        
        if (!validationResult.isValid) {
            const errorMessage = getWfhErrorMessage(validationResult);
            Alert.alert("WFH Request Not Allowed", errorMessage);
            return;
        }

        setLoading(true);
        try {
            await apiService.submitWfhRequest(reason, startStr, endStr, wfhType);

            // Store submitted request details for success modal
            setSubmittedRequest({
                startDate: startStr,
                endDate: endStr,
                wfhType: wfhType,
                reason: reason
            });

            // Show success modal instead of redirecting immediately
            setShowSuccessModal(true);

        } catch (error: any) {
            const msg = error?.message || error?.detail || "Failed to submit request.";
            Alert.alert("Submission Failed", msg);
        } finally {
            setLoading(false);
        }
    };

    const handleViewHistory = () => {
        setShowSuccessModal(false);
        navigation.replace("WfhHistory");
    };

    const handleSubmitAnother = () => {
        setShowSuccessModal(false);
        // Reset form for new request
        setReason("");
        setWfhType("Full Day");
        const today = new Date();
        setStartDate(today);
        setEndDate(today);
        setSubmittedRequest(null);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.container}
        >
            {/* Modern White Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color={Colors.headerText} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Apply for WFH</Text>
                    <Text style={styles.headerSubtitle}>Submit your work from home request</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Date Selection */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Select Dates</Text>

                    <View style={styles.dateRow}>
                        <View style={styles.dateField}>
                            <Text style={styles.label}>Start Date</Text>
                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() => setShowStartPicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
                                <Text style={styles.dateText}>{formatIST(startDate.toISOString(), "yyyy-MM-dd")}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.dateArrow}>
                            <Ionicons name="arrow-forward" size={20} color="#94a3b8" />
                        </View>

                        <View style={styles.dateField}>
                            <Text style={styles.label}>End Date</Text>
                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() => setShowEndPicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
                                <Text style={styles.dateText}>{formatIST(endDate.toISOString(), "yyyy-MM-dd")}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {(showStartPicker) && (
                        <DateTimePicker
                            value={startDate}
                            mode="date"
                            display="default"
                            onChange={onStartDateChange}
                            minimumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
                        />
                    )}

                    {(showEndPicker) && (
                        <DateTimePicker
                            value={endDate}
                            mode="date"
                            display="default"
                            onChange={onEndDateChange}
                            minimumDate={startDate}
                        />
                    )}
                </View>

                {/* Info Note logic */}
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color="#0f766e" />
                    <Text style={styles.infoText}>
                        WFH is not applicable for the same day it is applied. Requests must be submitted at least 24 hours in advance (IST). Earliest available date: {getMinimumWfhStartDate()}
                    </Text>
                </View>

                {/* WFH Type */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>WFH Type</Text>
                    <View style={styles.typeContainer}>
                        <TouchableOpacity
                            style={[styles.typeOption, wfhType === "Full Day" && styles.typeOptionActive]}
                            onPress={() => setWfhType("Full Day")}
                        >
                            <Ionicons
                                name={wfhType === "Full Day" ? "radio-button-on" : "radio-button-off"}
                                size={20}
                                color={wfhType === "Full Day" ? "#fff" : "#64748b"}
                            />
                            <Text style={[styles.typeText, wfhType === "Full Day" && styles.typeTextActive]}>Full Day</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.typeOption, wfhType === "Half Day" && styles.typeOptionActive]}
                            onPress={() => setWfhType("Half Day")}
                        >
                            <Ionicons
                                name={wfhType === "Half Day" ? "radio-button-on" : "radio-button-off"}
                                size={20}
                                color={wfhType === "Half Day" ? "#fff" : "#64748b"}
                            />
                            <Text style={[styles.typeText, wfhType === "Half Day" && styles.typeTextActive]}>Half Day</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Reason */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Reason</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Please detail why you need to work from home (10-500 chars)"
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                    <Text style={[
                        styles.charCount,
                        (reason.length < 10 || reason.length > 500) ? styles.charCountError : styles.charCountOk
                    ]}>
                        {reason.length} / 500 characters
                    </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={loading ? ['#94a3b8', '#94a3b8'] : [...Gradients.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: BorderRadius.md, gap: 8, width: '100%' }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.submitBtnText}>Submit Request</Text>
                                <Ionicons name="send" size={18} color="#fff" />
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

            </ScrollView>

            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.successModal}>
                        {/* Success Icon */}
                        <View style={styles.successIconContainer}>
                            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
                        </View>

                        {/* Title */}
                        <Text style={styles.successTitle}>Request Submitted!</Text>
                        <Text style={styles.successSubtitle}>Your WFH request has been sent for approval</Text>

                        {/* Request Details */}
                        {submittedRequest && (
                            <View style={styles.detailsBox}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Date Range:</Text>
                                    <Text style={styles.detailValue}>
                                        {submittedRequest.startDate} to {submittedRequest.endDate}
                                    </Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Type:</Text>
                                    <Text style={styles.detailValue}>{submittedRequest.wfhType}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Reason:</Text>
                                    <Text style={styles.detailValue} numberOfLines={2}>
                                        {submittedRequest.reason}
                                    </Text>
                                </View>

                                <View style={styles.statusBox}>
                                    <Ionicons name="time-outline" size={16} color="#f59e0b" />
                                    <Text style={styles.statusText}>Status: <Text style={styles.statusBadge}>Pending</Text></Text>
                                </View>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                onPress={handleSubmitAnother}
                            >
                                <Ionicons name="add-circle-outline" size={18} color="#2563eb" />
                                <Text style={styles.secondaryBtnText}>Submit Another</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={handleViewHistory}
                            >
                                <Ionicons name="document-text" size={18} color="#fff" />
                                <Text style={styles.primaryBtnText}>View WFH Request History</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
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
    content: { padding: Spacing.xl },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        marginBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.card,
    },
    sectionTitle: { fontSize: 16, fontWeight: "600", color: "#334155", marginBottom: Spacing.md },
    dateRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
    dateField: { flex: 1 },
    dateArrow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
    label: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
    dateInput: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    dateText: { fontSize: 14, color: Colors.text, fontWeight: "500" },

    infoBox: {
        flexDirection: "row",
        backgroundColor: "#f0fdfa",
        padding: 14,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xl,
        gap: 10,
        borderWidth: 1,
        borderColor: "#ccfbf1",
    },
    infoText: { flex: 1, fontSize: 13, color: "#0f766e", lineHeight: 20 },

    typeContainer: { flexDirection: "row", gap: Spacing.md },
    typeOption: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: Spacing.md,
        backgroundColor: "#f9fafb",
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    typeOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    typeText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
    typeTextActive: { color: "#fff" },

    textArea: {
        backgroundColor: "#f9fafb",
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: 14,
        height: 120,
        fontSize: 15,
        color: Colors.text,
    },
    charCount: { alignSelf: "flex-end", fontSize: 12, marginTop: 6, fontWeight: "500" },
    charCountError: { color: Colors.error },
    charCountOk: { color: Colors.success },

    submitBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
        marginBottom: 40,
        overflow: "hidden",
    },
    submitBtnDisabled: { backgroundColor: "#94a3b8", shadowOpacity: 0 },
    submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    // Success Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: Spacing.xl,
    },
    successModal: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xxl,
        width: "100%",
        maxWidth: 400,
        alignItems: "center",
        ...Shadows.modal,
    },
    successIconContainer: {
        marginBottom: Spacing.lg,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: Colors.headerText,
        marginBottom: Spacing.sm,
        textAlign: "center",
    },
    successSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: Spacing.xxl,
        textAlign: "center",
    },
    detailsBox: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        marginBottom: Spacing.xxl,
        width: "100%",
        borderWidth: 1,
        borderColor: Colors.border,
    },
    detailRow: {
        marginBottom: Spacing.md,
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: "500",
        color: Colors.text,
    },
    statusBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        backgroundColor: Colors.warningLight,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        borderRadius: BorderRadius.sm,
        marginTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: Spacing.md,
    },
    statusText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#92400e",
    },
    statusBadge: {
        color: Colors.warning,
        fontWeight: "700",
    },
    modalActions: {
        flexDirection: "row",
        gap: Spacing.md,
        width: "100%",
    },
    secondaryBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        paddingVertical: 14,
        backgroundColor: Colors.primaryLight,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: "#bfdbfe",
    },
    secondaryBtnText: {
        color: Colors.primary,
        fontWeight: "600",
        fontSize: 14,
    },
    primaryBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        paddingVertical: 14,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        ...Shadows.button,
    },
    primaryBtnText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
    },
});
