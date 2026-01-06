// 📂 src/screens/hiring/InterviewSchedule.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

export default function InterviewSchedule() {
    const navigation = useNavigation<any>();
    const interviews = [
        {
            id: "1",
            candidate: "Sarah Johnson",
            jobTitle: "Senior React Native Developer",
            date: "2026-01-05",
            time: "10:00 AM",
            mode: "Online",
            interviewer: "John Doe",
            status: "Scheduled",
        },
        {
            id: "2",
            candidate: "Michael Chen",
            jobTitle: "Product Manager",
            date: "2026-01-06",
            time: "2:00 PM",
            mode: "In-person",
            interviewer: "Jane Smith",
            status: "Scheduled",
        },
    ];

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <LinearGradient
                    colors={["#4facfe", "#00f2fe"] as const}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Interview Schedule</Text>
                            <Text style={styles.headerSubtitle}>{interviews.length} upcoming</Text>
                        </View>
                        <TouchableOpacity style={styles.addButton}>
                            <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    {interviews.map((interview) => (
                        <TouchableOpacity key={interview.id} style={styles.interviewCard} activeOpacity={0.9}>
                            <View style={styles.cardHeader}>
                                <View style={styles.iconBadge}>
                                    <Ionicons name="calendar-outline" size={20} color="#4facfe" />
                                </View>
                                <Text style={styles.candidateName}>{interview.candidate}</Text>
                            </View>
                            <Text style={styles.jobTitle}>{interview.jobTitle}</Text>

                            <View style={styles.detailsContainer}>
                                <View style={styles.detailRow}>
                                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                                    <Text style={styles.detailText}>{interview.date}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                                    <Text style={styles.detailText}>{interview.time}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    {interview.mode === "Online" ? (
                                        <Ionicons name="videocam-outline" size={16} color="#6b7280" />
                                    ) : (
                                        <Ionicons name="location-outline" size={16} color="#6b7280" />
                                    )}
                                    <Text style={styles.detailText}>{interview.mode}</Text>
                                </View>
                            </View>

                            <View style={styles.footer}>
                                <Text style={styles.interviewer}>Interviewer: {interview.interviewer}</Text>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>{interview.status}</Text>
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
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
    interviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    iconBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    candidateName: { fontSize: 16, fontWeight: '700', color: '#1f2937', flex: 1 },
    jobTitle: { fontSize: 14, color: '#6b7280', marginBottom: 12, fontWeight: '500' },
    detailsContainer: { marginBottom: 12, gap: 8 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailText: { fontSize: 14, color: '#4b5563', fontWeight: '500' },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
    interviewer: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#d1fae5' },
    statusText: { fontSize: 12, fontWeight: '600', color: '#065f46' },
});
