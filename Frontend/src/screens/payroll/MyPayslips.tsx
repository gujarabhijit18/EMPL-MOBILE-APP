// 📂 src/screens/payroll/MyPayslips.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Download, FileText, Calendar } from "lucide-react-native";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

export default function MyPayslips() {
    const navigation = useNavigation<any>();

    const payslips = [
        { month: "January 2026", netSalary: 80800, grossSalary: 96000, deductions: 15200, status: "Available" },
        { month: "December 2025", netSalary: 80800, grossSalary: 96000, deductions: 15200, status: "Available" },
        { month: "November 2025", netSalary: 80800, grossSalary: 96000, deductions: 15200, status: "Available" },
    ];

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <LinearGradient
                    colors={["#4facfe", "#00f2fe"] as const}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <ChevronLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>My Payslips</Text>
                            <Text style={styles.headerSubtitle}>View & download your salary slips</Text>
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    {payslips.map((payslip, index) => (
                        <View key={index} style={styles.payslipCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.monthContainer}>
                                    <Calendar size={20} color="#4facfe" />
                                    <Text style={styles.month}>{payslip.month}</Text>
                                </View>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>{payslip.status}</Text>
                                </View>
                            </View>

                            <View style={styles.salaryContainer}>
                                <View style={styles.salaryItem}>
                                    <Text style={styles.salaryLabel}>Gross</Text>
                                    <Text style={styles.salaryValue}>${payslip.grossSalary.toLocaleString()}</Text>
                                </View>
                                <View style={styles.salaryDivider} />
                                <View style={styles.salaryItem}>
                                    <Text style={styles.salaryLabel}>Deductions</Text>
                                    <Text style={[styles.salaryValue, { color: '#dc2626' }]}>-${payslip.deductions.toLocaleString()}</Text>
                                </View>
                                <View style={styles.salaryDivider} />
                                <View style={styles.salaryItem}>
                                    <Text style={styles.salaryLabel}>Net</Text>
                                    <Text style={[styles.salaryValue, { color: '#10b981' }]}>${payslip.netSalary.toLocaleString()}</Text>
                                </View>
                            </View>

                            <View style={styles.actionsContainer}>
                                <TouchableOpacity style={styles.viewButton}>
                                    <FileText size={16} color="#4facfe" />
                                    <Text style={styles.viewButtonText}>View Details</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.downloadButton}>
                                    <Download size={16} color="#fff" />
                                    <Text style={styles.downloadButtonText}>Download PDF</Text>
                                </TouchableOpacity>
                            </View>
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
    payslipCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    monthContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    month: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#d1fae5' },
    statusText: { fontSize: 12, fontWeight: '600', color: '#065f46' },
    salaryContainer: { flexDirection: 'row', marginBottom: 16, backgroundColor: '#f9fafb', borderRadius: 12, padding: 16 },
    salaryItem: { flex: 1, alignItems: 'center' },
    salaryLabel: { fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: '500' },
    salaryValue: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
    salaryDivider: { width: 1, backgroundColor: '#e5e7eb' },
    actionsContainer: { flexDirection: 'row', gap: 12 },
    viewButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, backgroundColor: '#e0f2fe' },
    viewButtonText: { fontSize: 14, fontWeight: '600', color: '#4facfe' },
    downloadButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, backgroundColor: '#4facfe' },
    downloadButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
