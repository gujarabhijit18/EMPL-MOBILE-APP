// 📂 src/screens/hiring/CandidateManagement.tsx
import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

interface Candidate {
    id: string;
    name: string;
    email: string;
    phone: string;
    jobTitle: string;
    status: 'Applied' | 'Shortlisted' | 'Interview Scheduled' | 'Selected' | 'Rejected';
    appliedDate: string;
    resumeUrl?: string;
}

export default function CandidateManagement() {
    const navigation = useNavigation<any>();
    const [searchQuery, setSearchQuery] = useState("");
    const [candidates] = useState<Candidate[]>([
        {
            id: "1",
            name: "Sarah Johnson",
            email: "sarah.j@email.com",
            phone: "+1 234 567 8900",
            jobTitle: "Senior React Native Developer",
            status: "Interview Scheduled",
            appliedDate: "2026-01-01",
        },
        {
            id: "2",
            name: "Michael Chen",
            email: "m.chen@email.com",
            phone: "+1 234 567 8901",
            jobTitle: "Product Manager",
            status: "Shortlisted",
            appliedDate: "2025-12-30",
        },
        {
            id: "3",
            name: "Emily Davis",
            email: "emily.d@email.com",
            phone: "+1 234 567 8902",
            jobTitle: "UX Designer",
            status: "Selected",
            appliedDate: "2025-12-28",
        },
    ]);

    const getStatusColor = (status: Candidate['status']) => {
        switch (status) {
            case 'Applied': return { bg: '#e0e7ff', text: '#3730a3' };
            case 'Shortlisted': return { bg: '#fef3c7', text: '#92400e' };
            case 'Interview Scheduled': return { bg: '#dbeafe', text: '#1e40af' };
            case 'Selected': return { bg: '#d1fae5', text: '#065f46' };
            case 'Rejected': return { bg: '#fee2e2', text: '#991b1b' };
        }
    };

    const filteredCandidates = candidates.filter(candidate =>
        candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>

                <LinearGradient
                    colors={["#f093fb", "#f5576c"] as const}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Candidates</Text>
                            <Text style={styles.headerSubtitle}>{filteredCandidates.length} applicants</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.searchContainer}>
                    <View style={styles.searchInputContainer}>
                        <Ionicons name="search" size={20} color="#9ca3af" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search candidates..."
                            placeholderTextColor="#9ca3af"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    {filteredCandidates.map((candidate) => (
                        <TouchableOpacity key={candidate.id} style={styles.candidateCard} activeOpacity={0.9}>
                            <View style={styles.candidateHeader}>
                                <View style={styles.avatarContainer}>
                                    <LinearGradient
                                        colors={['#f093fb', '#f5576c'] as const}
                                        style={styles.avatar}
                                    >
                                        <Text style={styles.avatarText}>{candidate.name.charAt(0)}</Text>
                                    </LinearGradient>
                                </View>
                                <View style={styles.candidateInfo}>
                                    <Text style={styles.candidateName}>{candidate.name}</Text>
                                    <Text style={styles.candidateJob}>{candidate.jobTitle}</Text>
                                </View>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        { backgroundColor: getStatusColor(candidate.status).bg },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.statusText,
                                            { color: getStatusColor(candidate.status).text },
                                        ]}
                                    >
                                        {candidate.status}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.candidateDetails}>
                                <View style={styles.detailRow}>
                                    <Ionicons name="mail-outline" size={16} color="#6b7280" />
                                    <Text style={styles.detailText}>{candidate.email}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="call-outline" size={16} color="#6b7280" />
                                    <Text style={styles.detailText}>{candidate.phone}</Text>
                                </View>
                            </View>

                            <View style={styles.candidateFooter}>
                                <Text style={styles.appliedDate}>Applied: {candidate.appliedDate}</Text>
                                <TouchableOpacity style={styles.downloadButton}>
                                    <Ionicons name="download-outline" size={16} color="#f093fb" />
                                    <Text style={styles.downloadText}>Resume</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 2,
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        color: '#1f2937',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    candidateCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    candidateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    candidateInfo: {
        flex: 1,
    },
    candidateName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 2,
    },
    candidateJob: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    candidateDetails: {
        marginBottom: 12,
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '500',
    },
    candidateFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    appliedDate: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#fef3f2',
    },
    downloadText: {
        fontSize: 13,
        color: '#f093fb',
        fontWeight: '600',
    },
});
