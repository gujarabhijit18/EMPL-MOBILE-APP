// 📂 src/screens/hiring/InterviewFeedback.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

export default function InterviewFeedback() {
    const navigation = useNavigation<any>();
    const feedbacks = [
        {
            id: "1",
            candidate: "Sarah Johnson",
            interviewer: "John Doe",
            skillRating: 5,
            communicationRating: 4,
            technicalRating: 5,
            recommendation: "Hire",
            date: "2026-01-02",
        },
        {
            id: "2",
            candidate: "Michael Chen",
            interviewer: "Jane Smith",
            skillRating: 4,
            communicationRating: 5,
            technicalRating: 4,
            recommendation: "Hold",
            date: "2025-12-31",
        },
    ];

    const getRatingStars = (rating: number) => (
        <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                    key={star}
                    name={star <= rating ? "star" : "star-outline"}
                    size={16}
                    color={star <= rating ? "#fbbf24" : "#d1d5db"}
                />
            ))}
        </View>
    );

    const getRecommendationColor = (rec: string) => {
        if (rec === "Hire") return { bg: '#d1fae5', text: '#065f46' };
        if (rec === "Hold") return { bg: '#fef3c7', text: '#92400e' };
        return { bg: '#fee2e2', text: '#991b1b' };
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <LinearGradient
                    colors={["#43e97b", "#38f9d7"] as const}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Interview Feedback</Text>
                            <Text style={styles.headerSubtitle}>{feedbacks.length} evaluations</Text>
                        </View>
                    </View>
                </LinearGradient>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    {feedbacks.map((feedback) => (
                        <View key={feedback.id} style={styles.feedbackCard}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.candidateName}>{feedback.candidate}</Text>
                                <View
                                    style={[
                                        styles.recommendationBadge,
                                        { backgroundColor: getRecommendationColor(feedback.recommendation).bg },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.recommendationText,
                                            { color: getRecommendationColor(feedback.recommendation).text },
                                        ]}
                                    >
                                        {feedback.recommendation}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.interviewer}>By {feedback.interviewer}</Text>

                            <View style={styles.ratingsContainer}>
                                <View style={styles.ratingRow}>
                                    <Text style={styles.ratingLabel}>Skills:</Text>
                                    {getRatingStars(feedback.skillRating)}
                                </View>
                                <View style={styles.ratingRow}>
                                    <Text style={styles.ratingLabel}>Communication:</Text>
                                    {getRatingStars(feedback.communicationRating)}
                                </View>
                                <View style={styles.ratingRow}>
                                    <Text style={styles.ratingLabel}>Technical:</Text>
                                    {getRatingStars(feedback.technicalRating)}
                                </View>
                            </View>

                            <TouchableOpacity style={styles.viewButton}>
                                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#43e97b" />
                                <Text style={styles.viewButtonText}>View Details</Text>
                            </TouchableOpacity>
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
    feedbackCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    candidateName: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
    recommendationBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    recommendationText: { fontSize: 12, fontWeight: '600' },
    interviewer: { fontSize: 13, color: '#6b7280', marginBottom: 16, fontWeight: '500' },
    ratingsContainer: { gap: 12, marginBottom: 16 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    ratingLabel: { fontSize: 14, color: '#4b5563', fontWeight: '500', flex: 1 },
    starsContainer: { flexDirection: 'row', gap: 4 },
    viewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f0fdf4' },
    viewButtonText: { fontSize: 14, color: '#43e97b', fontWeight: '600' },
});
