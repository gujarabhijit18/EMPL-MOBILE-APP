// 📂 src/screens/hiring/JobManagement.tsx
import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Animated,
    Modal,
    Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface Job {
    id: string;
    title: string;
    department: string;
    employmentType: string;
    experience: string;
    salaryRange: { min: number; max: number };
    status: 'open' | 'closed';
    applicants: number;
    createdDate: string;
    location: string;
}

export default function JobManagement() {
    const navigation = useNavigation<any>();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
    const [showNewJobModal, setShowNewJobModal] = useState(false);
    const [jobs, setJobs] = useState<Job[]>([
        {
            id: "1",
            title: "Senior React Native Developer",
            department: "Engineering",
            employmentType: "Full-time",
            experience: "3-5 years",
            salaryRange: { min: 80000, max: 120000 },
            status: 'open',
            applicants: 24,
            createdDate: "2026-01-01",
            location: "Remote",
        },
        {
            id: "2",
            title: "Product Manager",
            department: "Product",
            employmentType: "Full-time",
            experience: "5-7 years",
            salaryRange: { min: 100000, max: 150000 },
            status: 'open',
            applicants: 15,
            createdDate: "2025-12-28",
            location: "Hybrid",
        },
        {
            id: "3",
            title: "UX Designer",
            department: "Design",
            employmentType: "Contract",
            experience: "2-4 years",
            salaryRange: { min: 60000, max: 90000 },
            status: 'closed',
            applicants: 42,
            createdDate: "2025-12-20",
            location: "On-site",
        },
    ]);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const filteredJobs = jobs.filter(job => {
        const matchesSearch =
            job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.department.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || job.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const renderJobCard = (job: Job, index: number) => (
        <Animated.View
            key={job.id}
            style={[
                styles.jobCard,
                {
                    opacity: fadeAnim,
                    transform: [{
                        translateY: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [50, 0],
                        }),
                    }],
                },
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {/* Navigate to job details */ }}
            >
                <View style={styles.jobCardHeader}>
                    <View style={styles.jobIconContainer}>
                        <LinearGradient
                            colors={job.status === 'open' ? ['#667eea', '#764ba2'] : ['#94a3b8', '#64748b']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.jobIconGradient}
                        >
                            <Ionicons name="briefcase-outline" size={24} color="#fff" />
                        </LinearGradient>
                    </View>
                    <View style={styles.jobHeaderText}>
                        <Text style={styles.jobTitle}>{job.title}</Text>
                        <View style={styles.jobMeta}>
                            <Text style={styles.jobDepartment}>{job.department}</Text>
                            <View style={styles.jobMetaSeparator} />
                            <Text style={styles.jobType}>{job.employmentType}</Text>
                        </View>
                    </View>
                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: job.status === 'open' ? '#d1fae5' : '#fee2e2' },
                        ]}
                    >
                        <Text
                            style={[
                                styles.statusText,
                                { color: job.status === 'open' ? '#065f46' : '#991b1b' },
                            ]}
                        >
                            {job.status === 'open' ? 'Open' : 'Closed'}
                        </Text>
                    </View>
                </View>

                <View style={styles.jobDetails}>
                    <View style={styles.jobDetailRow}>
                        <Ionicons name="cash-outline" size={16} color="#6b7280" />
                        <Text style={styles.jobDetailText}>
                            ${(job.salaryRange.min / 1000).toFixed(0)}k - ${(job.salaryRange.max / 1000).toFixed(0)}k
                        </Text>
                    </View>
                    <View style={styles.jobDetailRow}>
                        <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                        <Text style={styles.jobDetailText}>{job.experience}</Text>
                    </View>
                    <View style={styles.jobDetailRow}>
                        <Ionicons name="location-outline" size={16} color="#6b7280" />
                        <Text style={styles.jobDetailText}>{job.location}</Text>
                    </View>
                </View>

                <View style={styles.jobFooter}>
                    <View style={styles.applicantsContainer}>
                        <Text style={styles.applicantsCount}>{job.applicants}</Text>
                        <Text style={styles.applicantsLabel}>Applicants</Text>
                    </View>
                    <View style={styles.jobActions}>
                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="eye-outline" size={18} color="#667eea" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="create-outline" size={18} color="#059669" />
                        </TouchableOpacity>
                        {job.status === 'open' && (
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="close-circle-outline" size={18} color="#dc2626" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>

                {/* Header */}
                <LinearGradient
                    colors={["#667eea", "#764ba2"] as const}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Job Postings</Text>
                            <Text style={styles.headerSubtitle}>{filteredJobs.length} active positions</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setShowNewJobModal(true)}
                        >
                            <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* Search and Filter */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputContainer}>
                        <Ionicons name="search" size={20} color="#9ca3af" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search jobs..."
                            placeholderTextColor="#9ca3af"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity style={styles.filterButton}>
                        <Ionicons name="filter" size={20} color="#667eea" />
                    </TouchableOpacity>
                </View>

                {/* Status Filters */}
                <View style={styles.filterTabs}>
                    {(['all', 'open', 'closed'] as const).map((status) => (
                        <TouchableOpacity
                            key={status}
                            style={[
                                styles.filterTab,
                                filterStatus === status && styles.filterTabActive,
                            ]}
                            onPress={() => setFilterStatus(status)}
                        >
                            <Text
                                style={[
                                    styles.filterTabText,
                                    filterStatus === status && styles.filterTabTextActive,
                                ]}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Job List */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {filteredJobs.map((job, index) => renderJobCard(job, index))}
                </ScrollView>

                {/* New Job Modal */}
                <Modal
                    visible={showNewJobModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowNewJobModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Create New Job</Text>
                                <TouchableOpacity onPress={() => setShowNewJobModal(false)}>
                                    <Ionicons name="close-circle" size={24} color="#6b7280" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView>
                                <Text style={styles.modalDescription}>
                                    Fill in the details to create a new job posting
                                </Text>
                                {/* Add form fields here */}
                                <TouchableOpacity
                                    style={styles.createButton}
                                    onPress={() => setShowNewJobModal(false)}
                                >
                                    <Text style={styles.createButtonText}>Create Job</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
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
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
    },
    searchInputContainer: {
        flex: 1,
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
    filterButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    filterTabs: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 16,
    },
    filterTab: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#fff',
    },
    filterTabActive: {
        backgroundColor: '#667eea',
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    filterTabTextActive: {
        color: '#fff',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    jobCard: {
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
    jobCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    jobIconContainer: {
        marginRight: 12,
    },
    jobIconGradient: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    jobHeaderText: {
        flex: 1,
    },
    jobTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
    },
    jobMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    jobDepartment: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    jobMetaSeparator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#d1d5db',
        marginHorizontal: 8,
    },
    jobType: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    jobDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 16,
    },
    jobDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    jobDetailText: {
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '500',
    },
    jobFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    applicantsContainer: {
        alignItems: 'center',
    },
    applicantsCount: {
        fontSize: 20,
        fontWeight: '700',
        color: '#667eea',
    },
    applicantsLabel: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
    jobActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 24,
        paddingHorizontal: 20,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1f2937',
    },
    modalDescription: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 24,
    },
    createButton: {
        backgroundColor: '#667eea',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
