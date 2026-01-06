// 📂 src/screens/payroll/PayrollDashboard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Banknote, Users, TrendingUp, Calendar } from "lucide-react-native";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

export default function PayrollDashboard() {
    const navigation = useNavigation<any>();

    const stats = [
        { title: "Total Employees", value: "156", icon: <Users size={24} color="#fff" />, gradient: ["#667eea", "#764ba2"] as const },
        { title: "Gross Salary", value: "$425K", icon: <Banknote size={24} color="#fff" />, gradient: ["#f093fb", "#f5576c"] as const },
        { title: "Deductions", value: "$45K", icon: <TrendingUp size={24} color="#fff" />, gradient: ["#fa709a", "#fee140"] as const },
        { title: "Net Payable", value: "$380K", icon: <Banknote size={24} color="#fff" />, gradient: ["#43e97b", "#38f9d7"] as const },
    ];

    const monthlyData = [
        { month: "December 2025", employees: 152, gross: "$415K", net: "$372K", status: "Paid" },
        { month: "November 2025", employees: 148, gross: "$405K", net: "$365K", status: "Paid" },
    ];

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <LinearGradient
                    colors={["#667eea", "#764ba2"] as const}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <ChevronLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Payroll Dashboard</Text>
                            <Text style={styles.headerSubtitle}>January 2026</Text>
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.statsGrid}>
                        {stats.map((stat, index) => (
                            <View key={index} style={styles.statCard}>
                                <LinearGradient
                                    colors={stat.gradient}
                                    style={styles.statGradient}
                                >
                                    <View style={styles.statIcon}>{stat.icon}</View>
                                    <Text style={styles.statValue}>{stat.value}</Text>
                                    <Text style={styles.statTitle}>{stat.title}</Text>
                                </LinearGradient>
                            </View>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>Recent Payrolls</Text>
                    {monthlyData.map((data, index) => (
                        <View key={index} style={styles.payrollCard}>
                            <View style={styles.payrollHeader}>
                                <Calendar size={20} color="#667eea" />
                                <Text style={styles.payrollMonth}>{data.month}</Text>
                                <View style={styles.paidBadge}>
                                    <Text style={styles.paidText}>{data.status}</Text>
                                </View>
                            </View>
                            <View style={styles.payrollDetails}>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Employees</Text>
                                    <Text style={styles.detailValue}>{data.employees}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Gross</Text>
                                    <Text style={styles.detailValue}>{data.gross}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Net</Text>
                                    <Text style={styles.detailValue}>{data.net}</Text>
                                </View>
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
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
    statCard: { width: '48%' },
    statGradient: { borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
    statIcon: { marginBottom: 12 },
    statValue: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
    statTitle: { fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
    payrollCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    payrollHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    payrollMonth: { fontSize: 16, fontWeight: '700', color: '#1f2937', flex: 1, marginLeft: 8 },
    paidBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#d1fae5' },
    paidText: { fontSize: 12, fontWeight: '600', color: '#065f46' },
    payrollDetails: { flexDirection: 'row', justifyContent: 'space-around' },
    detailItem: { alignItems: 'center' },
    detailLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: '500' },
    detailValue: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
});
