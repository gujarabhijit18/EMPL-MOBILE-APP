// 📂 src/screens/payroll/PayrollApproval.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, CheckCircle2, Clock } from "lucide-react-native";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

export default function PayrollApproval() {
    const navigation = useNavigation<any>();

    const approvals = [
        {
            id: "1",
            month: "January 2026",
            preparedBy: "HR Team",
            preparedDate: "2026-01-25",
            totalEmployees: 152,
            grossAmount: 425000,
            netAmount: 380000,
            status: "Pending Admin Approval",
            approvalLevel: "Admin Review",
        },
        {
            id: "2",
            month: "December 2025",
            preparedBy: "HR Team",
            preparedDate: "2025-12-25",
            totalEmployees: 148,
            grossAmount: 415000,
            netAmount: 372000,
            status: "Approved",
            approvalLevel: "Final Approved",
            approvedBy: "Admin",
            approvedDate: "2025-12-26",
        },
    ];

    const getStatusColor = (status: string) => {
        if (status.includes("Approved")) return { bg: '#d1fae5', text: '#065f46', icon: <CheckCircle2 size={20} color="#10b981" /> };
        if (status.includes("Pending")) return { bg: '#fef3c7', text: '#92400e', icon: <Clock size={20} color="#f59e0b" /> };
        return { bg: '#fee2e2', text: '#991b1b', icon: <Clock size={20} color="#dc2626" /> };
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <LinearGradient
                    colors={["#fa709a", "#fee140"] as const}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <ChevronLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Payroll Approvals</Text>
                            <Text style={styles.headerSubtitle}>3 pending approvals</Text>
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    {approvals.map((approval) => (
                        <View key={approval.id} style={styles.approvalCard}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.month}>{approval.month}</Text>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        { backgroundColor: getStatusColor(approval.status).bg },
                                    ]}
                                >
                                    {getStatusColor(approval.status).icon}
                                    <Text
                                        style={[
                                            styles.statusText,
                                            { color: getStatusColor(approval.status).text },
                                        ]}
                                    >
                                        {approval.approvalLevel}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.detailsContainer}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Prepared by:</Text>
                                    <Text style={styles.detailValue}>{approval.preparedBy}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Date:</Text>
                                    <Text style={styles.detailValue}>{approval.preparedDate}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Employees:</Text>
                                    <Text style={styles.detailValue}>{approval.totalEmployees}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Net Amount:</Text>
                                    <Text style={styles.amountValue}>${approval.netAmount.toLocaleString()}</Text>
                                </View>
                            </View>

                            {approval.status.includes("Pending") ? (
                                <View style={styles.actionsContainer}>
                                    <TouchableOpacity style={styles.viewButton}>
                                        <CheckCircle2 size={16} color="#667eea" />
                                        <Text style={styles.viewButtonText}>Review</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.approveButton}>
                                        <CheckCircle2 size={16} color="#fff" />
                                        <Text style={styles.approveButtonText}>Approve</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.rejectButton}>
                                        <Clock size={16} color="#fff" />
                                        <Text style={styles.rejectButtonText}>Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.approvedInfo}>
                                    <Text style={styles.approvedText}>
                                        Approved by {approval.approvedBy} on {approval.approvedDate}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    safeArea: { flex: 1 },
    header: { paddingVertical: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerContent: { flexDirection: 'row', alignItems: 'center' },
    backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    headerTextContainer: { flex: 1 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
    headerSubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', marginTop: 2 },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
    approvalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    month: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: '600' },
    detailsContainer: { marginBottom: 16, gap: 8 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailLabel: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
    detailValue: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
    amountValue: { fontSize: 16, fontWeight: '700', color: '#fa709a' },
    actionsContainer: { flexDirection: 'row', gap: 8 },
    viewButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#ede9fe' },
    viewButtonText: { fontSize: 14, fontWeight: '600', color: '#667eea' },
    approveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#10b981' },
    approveButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
    rejectButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#dc2626' },
    rejectButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
    approvedInfo: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
    approvedText: { fontSize: 13, color: '#059669', fontWeight: '500', textAlign: 'center' },
});
