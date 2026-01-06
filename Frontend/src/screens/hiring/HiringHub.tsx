// 📂 src/screens/hiring/HiringHub.tsx
import React, { useCallback, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated,
    Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useModuleBadges } from "../../contexts/ModuleBadgeContext";
import { useAuth } from "../../contexts/AuthContext";

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

interface ModuleCardProps {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    gradient: readonly [string, string, ...string[]];
    onPress: () => void;
    badge?: number;
    delay: number;
}

const ModuleCard: React.FC<ModuleCardProps> = ({
    title,
    subtitle,
    icon,
    gradient,
    onPress,
    badge,
    delay,
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.moduleCard,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
                <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                >
                    <View style={styles.cardContent}>
                        <View style={styles.iconContainer}>
                            {icon}
                            {badge && badge > 0 ? (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{badge}</Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={styles.cardTitle}>{title}</Text>
                        <Text style={styles.cardSubtitle}>{subtitle}</Text>
                        <View style={styles.arrowContainer}>
                            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function HiringHub() {
    const navigation = useNavigation<any>();
    const { resetBadge } = useModuleBadges();
    const { user } = useAuth();
    const role = user?.role || "employee";

    const headerAnim = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        useCallback(() => {
            resetBadge("hiring");
        }, [resetBadge])
    );

    useEffect(() => {
        Animated.timing(headerAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const canAccess = role === "admin" || role === "hr";

    const modules = [
        {
            title: "Job Postings",
            subtitle: "Manage openings",
            icon: <Ionicons name="briefcase-outline" size={32} color="#fff" />,
            gradient: ["#667eea", "#764ba2"] as const,
            screen: "JobManagement",
            badge: 3,
        },
        {
            title: "Candidates",
            subtitle: "Track applicants",
            icon: <Ionicons name="people-outline" size={32} color="#fff" />,
            gradient: ["#f093fb", "#f5576c"] as const,
            screen: "CandidateManagement",
            badge: 12,
        },
        {
            title: "Interviews",
            subtitle: "Schedule & track",
            icon: <Ionicons name="calendar-outline" size={32} color="#fff" />,
            gradient: ["#4facfe", "#00f2fe"] as const,
            screen: "InterviewSchedule",
            badge: 5,
        },
        {
            title: "Feedback",
            subtitle: "Evaluate candidates",
            icon: <Ionicons name="document-text-outline" size={32} color="#fff" />,
            gradient: ["#43e97b", "#38f9d7"] as const,
            screen: "InterviewFeedback",
            badge: 2,
        },
        {
            title: "Offers",
            subtitle: "Manage offers",
            icon: <Ionicons name="person-add-outline" size={32} color="#fff" />,
            gradient: ["#fa709a", "#fee140"] as const,
            screen: "OfferManagement",
            badge: 1,
        },
        {
            title: "Analytics",
            subtitle: "Hiring insights",
            icon: <Ionicons name="trending-up-outline" size={32} color="#fff" />,
            gradient: ["#30cfd0", "#330867"] as const,
            screen: "HiringAnalytics",
        },
    ];

    if (!canAccess) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.noAccessContainer}>
                        <Text style={styles.noAccessText}>Access Denied</Text>
                        <Text style={styles.noAccessSubtext}>
                            Only Admin and HR roles can access the Hiring module.
                        </Text>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.backButtonText}>Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>

                {/* Header */}
                <Animated.View
                    style={[
                        styles.header,
                        {
                            opacity: headerAnim,
                            transform: [{
                                translateY: headerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-20, 0],
                                }),
                            }],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={["#667eea", "#764ba2"] as const}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.headerGradient}
                    >
                        <View style={styles.headerContent}>
                            <TouchableOpacity
                                style={styles.backIconButton}
                                onPress={() => navigation.goBack()}
                            >
                                <Ionicons name="chevron-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <View style={styles.headerTextContainer}>
                                <Text style={styles.headerTitle}>Hiring Hub</Text>
                                <Text style={styles.headerSubtitle}>Complete recruitment lifecycle</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Content */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.cardsContainer}>
                        {modules.map((module, index) => (
                            <ModuleCard
                                key={module.screen}
                                title={module.title}
                                subtitle={module.subtitle}
                                icon={module.icon}
                                gradient={module.gradient}
                                badge={module.badge}
                                delay={index * 100}
                                onPress={() => navigation.navigate(module.screen)}
                            />
                        ))}
                    </View>
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
        marginBottom: 20,
    },
    headerGradient: {
        paddingVertical: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backIconButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    cardsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    moduleCard: {
        width: CARD_WIDTH,
        marginBottom: 16,
    },
    cardGradient: {
        borderRadius: 20,
        padding: 20,
        minHeight: 160,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'space-between',
    },
    iconContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    badge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#ff4757',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '500',
    },
    arrowContainer: {
        alignSelf: 'flex-end',
        marginTop: 8,
    },
    noAccessContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    noAccessText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 12,
    },
    noAccessSubtext: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 32,
    },
    backButton: {
        backgroundColor: '#667eea',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
