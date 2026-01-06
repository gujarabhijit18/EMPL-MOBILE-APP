// 📂 src/screens/payroll/PayrollCalculation.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Calendar, Users, CheckCircle2 } from "lucide-react-native";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

export default function PayrollCalculation() {
    const navigation = useNavigation<any>();
    const [calculated, setCalculated] = useState(false);

    const payrollData = {
        month: "January 2026",
        totalEmployees: 156,
        activeEmployees: 152,
        grossSalary: 425000,
        totalDeductions: 45000,
        netPayable: 380000,
        workingDays: 22,
        attendanceData: {
            present: 3344,
            leaves: 124,
            wfh: 236,
            lop: 8,
        },
    };

    const handleCalculate = () => {
        setCalculated(true);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <LinearGradient
                    colors={["#43e97b", "#38f9d7"] as const}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <ChevronLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Payroll Calculation</Text>
                            <Text style={styles.headerSubtitle}>{payrollData.month}</Text>
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Calendar size={20} color="#43e97b" />
                            <Text style={styles.infoLabel}>Working Days:</Text>
                            <Text style={styles.infoValue}>{payrollData.workingDays}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Users size={20} color="#43e97b" />
                            <Text style={styles.infoLabel}>Active Employees:</Text>
                            <Text style={styles.infoValue}>{payrollData.activeEmployees}/{payrollData.totalEmployees}</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Attendance Summary</Text>
                    <View style={styles.attendanceCard}>
                        <View style={styles.attendanceRow}>
                            <View style={[styles.attendanceBadge, { backgroundColor: '#d1fae5' }]}>
                                <Text style={[styles.attendanceValue, { color: '#065f46' }]}>{payrollData.attendanceData.present}</Text>
                                <Text style={[styles.attendanceLabel, { color: '#065f46' }]}>Present</Text>
                            </View>
                            <View style={[styles.attendanceBadge, { backgroundColor: '#dbeafe' }]}>
                                <Text style={[styles.attendanceValue, { color: '#1e40af' }]}>{payrollData.attendanceData.leaves}</Text>
                                <Text style={[styles.attendanceLabel, { color: '#1e40af' }]}>Leaves</Text>
                            </View>
                        </View>
                        <View style={styles.attendanceRow}>
                            <View style={[styles.attendanceBadge, { backgroundColor: '#fef3c7' }]}>
                                <Text style={[styles.attendanceValue, { color: '#92400e' }]}>{payrollData.attendanceData.wfh}</Text>
                                <Text style={[styles.attendanceLabel, { color: '#92400e' }]}>WFH</Text>
                            </View>
                            <View style={[styles.attendanceBadge, { backgroundColor: '#fee2e2' }]}>
                                <Text style={[styles.attendanceValue, { color: '#991b1b' }]}>{payrollData.attendanceData.lop}</Text>
                                <Text style={[styles.attendanceLabel, { color: '#991b1b' }]}>LOP</Text>
                            </View>
                        </View>
                    </View>

                    {calculated && (
                        <>
                            <Text style={styles.sectionTitle}>Calculation Summary</Text>
                            <View style={styles.summaryCard}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Gross Salary:</Text>
                                    <Text style={styles.summaryValue}>${payrollData.grossSalary.toLocaleString()}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Total Deductions:</Text>
                                    <Text style={[styles.summaryValue, { color: '#dc2626' }]}>-${payrollData.totalDeductions.toLocaleString()}</Text>
                                </View>
                                <View style={[styles.summaryRow, styles.netRow]}>
                                    <Text style={styles.netLabel}>Net Payable:</Text>
                                    <Text style={styles.netValue}>${payrollData.netPayable.toLocaleString()}</Text>
                                </View>
                            </View>

                            <View style={styles.successBanner}>
                                <CheckCircle2 size={24} color="#10b981" />
                                <Text style={styles.successText}>Payroll calculated successfully!</Text>
                            </View>
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.calculateButton, calculated && styles.calculateButtonDisabled]}
                        onPress={handleCalculate}
                        disabled={calculated}
                    >
                        <CheckCircle2 size={20} color="#fff" />
                        <Text style={styles.calculateButtonText}>
                            {calculated ? "Calculated" : "Calculate Payroll"}
                        </Text>
                    </TouchableOpacity>

                    {calculated && (
                        <TouchableOpacity style={styles.proceedButton}>
                            <Text style={styles.proceedButtonText}>Proceed to Approval</Text>
                        </TouchableOpacity>
                    )}
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
    infoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, gap: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    infoLabel: { fontSize: 14, color: '#4b5563', fontWeight: '500', flex: 1 },
    infoValue: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
    attendanceCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, gap: 12 },
    attendanceRow: { flexDirection: 'row', gap: 12 },
    attendanceBadge: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
    attendanceValue: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
    attendanceLabel: { fontSize: 13, fontWeight: '600' },
    summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, gap: 12 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 14, color: '#4b5563', fontWeight: '500' },
    summaryValue: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
    netRow: { paddingTop: 12, borderTopWidth: 2, borderTopColor: '#e5e7eb', marginTop: 4 },
    netLabel: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
    netValue: { fontSize: 20, fontWeight: '800', color: '#43e97b' },
    successBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#d1fae5', padding: 16, borderRadius: 12, marginBottom: 20 },
    successText: { fontSize: 15, fontWeight: '600', color: '#065f46' },
    calculateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#43e97b', paddingVertical: 16, borderRadius: 12, marginBottom: 12 },
    calculateButtonDisabled: { backgroundColor: '#9ca3af' },
    calculateButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    proceedButton: { backgroundColor: '#667eea', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    proceedButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
