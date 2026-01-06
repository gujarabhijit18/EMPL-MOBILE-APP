// 📂 src/screens/payroll/SalaryDisbursement.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, CheckCircle2, Clock } from "lucide-react-native";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

export default function SalaryDisbursement() {
    const navigation = useNavigation<any>();

    const disbursements = [
        { id: "1", employee: "John Doe", amount: 80800, status: "Paid", paidDate: "2026-01-30" },
        { id: "2", employee: "Jane Smith", amount: 106400, status: "Paid", paidDate: "2026-01-30" },
        { id: "3", employee: "Mike Johnson", amount: 75000, status: "Pending", paidDate: "-" },
    ];

    const summary = {
        totalEmployees: 152,
        paidEmployees: 148,
        pendingEmployees: 4,
        totalPaid: 11248600,
        totalPending: 302400,
    };

    const getStatusConfig = (status: string) => {
        if (status === "Paid") return { bg: '#d1fae5', text: '#065f46', icon: <CheckCircle2 size={16} color="#10b981" /> };
        if (status === "Pending") return { bg: '#fef3c7', text: '#92400e', icon: <Clock size={16} color="#f59e0b" /> };
        return { bg: '#fee2e2', text: '#991b1b', icon: <Clock size={16} color="#dc2626" /> };
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <LinearGradient
                    colors={["#30cfd0", "#330867"] as const}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <ChevronLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Salary Disbursement</Text>
                            <Text style={styles.headerSubtitle}>January 2026</Text>
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryValue}>{summary.paidEmployees}</Text>
                                <Text style={styles.summaryLabel}>Paid</Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{summary.pendingEmployees}</Text>
                                <Text style={styles.summaryLabel}>Pending</Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryValue}>{summary.totalEmployees}</Text>
                                <Text style={styles.summaryLabel}>Total</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Disbursement Status</Text>
                    {disbursements.map((disbursement) => (
                        <View key={disbursement.id} style={styles.disbursementCard}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.employeeName}>{disbursement.employee}</Text>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        { backgroundColor: getStatusConfig(disbursement.status).bg },
                                    ]}
                                >
                                    {getStatusConfig(disbursement.status).icon}
                                    <Text
                                        style={[
                                            styles.statusText,
                                            { color: getStatusConfig(disbursement.status).text },
                                        ]}
                                    >
                                        {disbursement.status}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.detailsRow}>
                                <View>
                                    <Text style={styles.detailLabel}>Amount</Text>
                                    <Text style={styles.amount}>${disbursement.amount.toLocaleString()}</Text>
                                </View>
                                <View>
                                    <Text style={styles.detailLabel}>Paid On</Text>
                                    <Text style={styles.paidDate}>{disbursement.paidDate}</Text>
                                </View>
                            </View>

                            {disbursement.status === "Pending" && (
                                <TouchableOpacity style={styles.markPaidButton}>
                                    <CheckCircle2 size={16} color="#fff" />
                                    <Text style={styles.markPaidText}>Mark as Paid</Text>
                                </TouchableOpacity>
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
    summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryValue: { fontSize: 28, fontWeight: '800', color: '#10b981', marginBottom: 4 },
    summaryLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
    summaryDivider: { width: 1, height: 40, backgroundColor: '#e5e7eb' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
    disbursementCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    employeeName: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: '600' },
    detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    detailLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: '500' },
    amount: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
    paidDate: { fontSize: 14, fontWeight: '600', color: '#4b5563' },
    markPaidButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 10 },
    markPaidText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
