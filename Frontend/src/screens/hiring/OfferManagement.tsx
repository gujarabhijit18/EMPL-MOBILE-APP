// 📂 src/screens/hiring/OfferManagement.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

export default function OfferManagement() {
    const navigation = useNavigation<any>();
    const offers = [
        {
            id: "1",
            candidate: "Sarah Johnson",
            designation: "Senior React Native Developer",
            department: "Engineering",
            ctc: 120000,
            joiningDate: "2026-02-01",
            validityDate: "2026-01-15",
            status: "Sent",
            approvalStatus: "Approved",
        },
    ];

    const getStatusColor = (status: string) => {
        if (status === "Accepted") return { bg: '#d1fae5', text: '#065f46' };
        if (status === "Sent") return { bg: '#dbeafe', text: '#1e40af' };
        if (status === "Draft") return { bg: '#f3f4f6', text: '#4b5563' };
        if (status === "Rejected") return { bg: '#fee2e2', text: '#991b1b' };
        return { bg: '#fef3c7', text: '#92400e' };
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <LinearGradient
                    colors={["#fa709a", "#fee140"] as const}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Offer Management</Text>
                            <Text style={styles.headerSubtitle}>{offers.length} offers</Text>
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    {offers.map((offer) => (
                        <View key={offer.id} style={styles.offerCard}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.candidateName}>{offer.candidate}</Text>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        { backgroundColor: getStatusColor(offer.status).bg },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.statusText,
                                            { color: getStatusColor(offer.status).text },
                                        ]}
                                    >
                                        {offer.status}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.designation}>{offer.designation}</Text>
                            <Text style={styles.department}>{offer.department}</Text>

                            <View style={styles.detailsContainer}>
                                <View style={styles.detailRow}>
                                    <Ionicons name="cash-outline" size={16} color="#6b7280" />
                                    <Text style={styles.detailText}>CTC: ${(offer.ctc / 1000).toFixed(0)}k/year</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                                    <Text style={styles.detailText}>Joining: {offer.joiningDate}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                                    <Text style={styles.detailText}>Validity: {offer.validityDate}</Text>
                                </View>
                            </View>

                            <View style={styles.approvalRow}>
                                <Text style={styles.approvalLabel}>Approval:</Text>
                                <View style={styles.approvalBadge}>
                                    <Ionicons name="checkmark" size={14} color="#10b981" />
                                    <Text style={styles.approvalText}>{offer.approvalStatus}</Text>
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
    offerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    candidateName: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: '600' },
    designation: { fontSize: 14, color: '#4b5563', fontWeight: '600', marginBottom: 4 },
    department: { fontSize: 13, color: '#6b7280', marginBottom: 12, fontWeight: '500' },
    detailsContainer: { marginBottom: 12, gap: 8 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailText: { fontSize: 14, color: '#4b5563', fontWeight: '500' },
    approvalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
    approvalLabel: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
    approvalBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#d1fae5' },
    approvalText: { fontSize: 13, color: '#065f46', fontWeight: '600' },
});
