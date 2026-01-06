// 📂 src/screens/hiring/HiringAnalytics.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

export default function HiringAnalytics() {
    const navigation = useNavigation<any>();

    const stats = [
        { title: "Total Openings", value: "24", icon: <Ionicons name="people-outline" size={24} color="#fff" />, gradient: ["#667eea", "#764ba2"] as const },
        { title: "Total Candidates", value: "156", icon: <Ionicons name="people-outline" size={24} color="#fff" />, gradient: ["#f093fb", "#f5576c"] as const },
        { title: "Interviews Scheduled", value: "42", icon: <Ionicons name="calendar-outline" size={24} color="#fff" />, gradient: ["#4facfe", "#00f2fe"] as const },
        { title: "Offers Sent", value: "12", icon: <Ionicons name="cash-outline" size={24} color="#fff" />, gradient: ["#43e97b", "#38f9d7"] as const },
    ];

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <LinearGradient
                    colors={["#30cfd0", "#330867"] as const}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Hiring Analytics</Text>
                            <Text style={styles.headerSubtitle}>Overview & insights</Text>
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.statsGrid}>
                        {stats.map((stat, index) => (
                            <View key={index} style={styles.statCard}>
                                <LinearGradient
                                    colors={stat.gradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.statGradient}
                                >
                                    <View style={styles.statIcon}>{stat.icon}</View>
                                    <Text style={styles.statValue}>{stat.value}</Text>
                                    <Text style={styles.statTitle}>{stat.title}</Text>
                                </LinearGradient>
                            </View>
                        ))}
                    </View>

                    <View style={styles.chartPlaceholder}>
                        <Ionicons name="trending-up-outline" size={48} color="#d1d5db" />
                        <Text style={styles.placeholderText}>Detailed charts coming soon</Text>
                    </View>
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
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 20 },
    statCard: { width: '48%' },
    statGradient: { borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
    statIcon: { marginBottom: 12 },
    statValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 4 },
    statTitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500' },
    chartPlaceholder: { backgroundColor: '#fff', borderRadius: 16, padding: 60, alignItems: 'center', justifyContent: 'center' },
    placeholderText: { fontSize: 16, color: '#9ca3af', marginTop: 16, fontWeight: '500' },
});
