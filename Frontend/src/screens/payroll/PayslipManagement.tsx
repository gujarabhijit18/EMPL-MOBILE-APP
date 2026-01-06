// 📂 src/screens/payroll/PayslipManagement.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Download,  FileText, Calendar } from "lucide-react-native";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

export default function PayslipManagement() {
    const navigation = useNavigation<any>();

    const payslips = [
        { id: "1", employee: "John Doe", month: "January 2026", netSalary: 80800, status: "Generated" },
        { id: "2", employee: "Jane Smith", month: "January 2026", netSalary: 106400, status: "Generated" },
        { id: "3", employee: "Mike Johnson", month: "January 2026", netSalary: 75000, status: "Pending" },
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
                            <Text style={styles.headerTitle}>Payslips</Text>
                            <Text style={styles.headerSubtitle}>{payslips.length} payslips</Text>
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    {payslips.map((payslip) => (
                        <View key={payslip.id} style={styles.payslipCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.iconContainer}>
                                    <FileText size={24} color="#4facfe" />
                                </View>
                                <View style={styles.payslipInfo}>
                                    <Text style={styles.employeeName}>{payslip.employee}</Text>
                                    <View style={styles.monthRow}>
                                        <Calendar size={14} color="#6b7280" />
                                        <Text style={styles.month}>{payslip.month}</Text>
                                    </View>
                                </View>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        {
                                            backgroundColor: payslip.status === "Generated" ? '#d1fae5' : '#fef3c7',
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.statusText,
                                            {
                                                color: payslip.status === "Generated" ? '#065f46' : '#92400e',
                                            },
                                        ]}
                                    >
                                        {payslip.status}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.amountContainer}>
                                <Text style={styles.amountLabel}>Net Salary</Text>
                                <Text style={styles.amountValue}>${payslip.netSalary.toLocaleString()}</Text>
                            </View>

                            {payslip.status === "Generated" && (
                                <View style={styles.actionsContainer}>
                                    <TouchableOpacity style={styles.viewButton}>
                                        <FileText size={16} color="#4facfe" />
                                        <Text style={styles.viewButtonText}>View</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.downloadButton}>
                                        <Download size={16} color="#10b981" />
                                        <Text style={styles.downloadButtonText}>Download PDF</Text>
                                    </TouchableOpacity>
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
    payslipCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    payslipInfo: { flex: 1 },
    employeeName: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
    monthRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    month: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: '600' },
    amountContainer: { marginBottom: 16, alignItems: 'center', paddingVertical: 12, backgroundColor: '#f9fafb', borderRadius: 12 },
    amountLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4, fontWeight: '500' },
    amountValue: { fontSize: 24, fontWeight: '800', color: '#4facfe' },
    actionsContainer: { flexDirection: 'row', gap: 12 },
    viewButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, backgroundColor: '#e0f2fe' },
    viewButtonText: { fontSize: 14, fontWeight: '600', color: '#4facfe' },
    downloadButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, backgroundColor: '#d1fae5' },
    downloadButtonText: { fontSize: 14, fontWeight: '600', color: '#10b981' },
});
