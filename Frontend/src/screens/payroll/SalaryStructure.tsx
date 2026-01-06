// 📂 src/screens/payroll/SalaryStructure.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Search, Plus, Banknote, Percent } from "lucide-react-native";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

export default function SalaryStructure() {
    const navigation = useNavigation<any>();
    const [searchQuery, setSearchQuery] = useState("");

    const employees = [
        {
            id: "1",
            name: "John Doe",
            designation: "Senior Developer",
            basicSalary: 60000,
            hra: 24000,
            allowances: 12000,
            pf: 7200,
            tax: 8000,
            netSalary: 80800,
        },
        {
            id: "2",
            name: "Jane Smith",
            designation: "Product Manager",
            basicSalary: 80000,
            hra: 32000,
            allowances: 16000,
            pf: 9600,
            tax: 12000,
            netSalary: 106400,
        },
    ];

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <LinearGradient
                    colors={["#f093fb", "#f5576c"] as const}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <ChevronLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Salary Structure</Text>
                            <Text style={styles.headerSubtitle}>{employees.length} employees</Text>
                        </View>
                        <TouchableOpacity style={styles.addButton}>
                            <Plus size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <View style={styles.searchContainer}>
                    <View style={styles.searchInputContainer}>
                        <Search size={20} color="#9ca3af" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search employees..."
                            placeholderTextColor="#9ca3af"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    {employees.map((employee) => (
                        <TouchableOpacity key={employee.id} style={styles.employeeCard} activeOpacity={0.9}>
                            <View style={styles.employeeHeader}>
                                <View>
                                    <Text style={styles.employeeName}>{employee.name}</Text>
                                    <Text style={styles.designation}>{employee.designation}</Text>
                                </View>
                                <Text style={styles.netSalary}>${(employee.netSalary / 1000).toFixed(1)}K</Text>
                            </View>

                            <View style={styles.salaryBreakdown}>
                                <Text style={styles.breakdownTitle}>Earnings</Text>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Basic Salary</Text>
                                    <Text style={styles.breakdownValue}>${employee.basicSalary.toLocaleString()}</Text>
                                </View>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>HRA</Text>
                                    <Text style={styles.breakdownValue}>${employee.hra.toLocaleString()}</Text>
                                </View>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Allowances</Text>
                                    <Text style={styles.breakdownValue}>${employee.allowances.toLocaleString()}</Text>
                                </View>

                                <View style={styles.divider} />

                                <Text style={styles.breakdownTitle}>Deductions</Text>
                                <View style={styles.breakdownRow}>
                                    <Text style={[styles.breakdownLabel, styles.deduction]}>PF</Text>
                                    <Text style={[styles.breakdownValue, styles.deduction]}>-${employee.pf.toLocaleString()}</Text>
                                </View>
                                <View style={styles.breakdownRow}>
                                    <Text style={[styles.breakdownLabel, styles.deduction]}>Tax</Text>
                                    <Text style={[styles.breakdownValue, styles.deduction]}>-${employee.tax.toLocaleString()}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
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
    addButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
    searchContainer: { paddingHorizontal: 20, paddingVertical: 16 },
    searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, height: 48, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#1f2937' },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
    employeeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    employeeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    employeeName: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
    designation: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
    netSalary: { fontSize: 24, fontWeight: '800', color: '#f093fb' },
    salaryBreakdown: { gap: 8 },
    breakdownTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937', marginTop: 8, marginBottom: 4 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    breakdownLabel: { fontSize: 14, color: '#4b5563', fontWeight: '500' },
    breakdownValue: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
    deduction: { color: '#dc2626' },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 12 },
});
