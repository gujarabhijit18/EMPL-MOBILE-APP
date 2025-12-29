import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Linking,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Shadows, BorderRadius, Spacing, Typography, Gradients } from "../../constants/designSystem";

const HelpSupportScreen = () => {
    const navigation = useNavigation();

    const handleContactSupport = () => {
        Linking.openURL("tel:07776827177");
    };

    const handleEmailSupport = () => {
        Linking.openURL("mailto:info@shekruweb.com");
    };

    const handleWebsite = () => {
        Linking.openURL("https://www.shekruweb.com");
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="dark" />

            {/* Modern White Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={20} color={Colors.headerText} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Help & Support</Text>
                    <Text style={styles.headerSubtitle}>Get assistance when you need it</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <LinearGradient
                    colors={[...Gradients.purple]}
                    style={styles.heroCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.heroContent}>
                        <MaterialCommunityIcons name="lifebuoy" size={48} color="#fff" />
                        <Text style={styles.heroTitle}>How can we help you?</Text>
                        <Text style={styles.heroSubtitle}>
                            Our support team is available 24/7 to assist you with any issues.
                        </Text>
                    </View>
                </LinearGradient>

                {/* Quick Contact Options */}
                <Text style={styles.sectionTitle}>Contact Us</Text>
                <View style={styles.contactGrid}>
                    <TouchableOpacity style={styles.contactCard} onPress={handleContactSupport}>
                        <View style={[styles.iconContainer, { backgroundColor: Colors.primaryLight }]}>
                            <Ionicons name="call" size={24} color={Colors.primary} />
                        </View>
                        <Text style={styles.contactLabel}>Helpline</Text>
                        <Text style={styles.contactValue}>077768 27177</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactCard} onPress={handleEmailSupport}>
                        <View style={[styles.iconContainer, { backgroundColor: Colors.successLight }]}>
                            <Ionicons name="mail" size={24} color={Colors.success} />
                        </View>
                        <Text style={styles.contactLabel}>Email Support</Text>
                        <Text style={styles.contactValue}>info@shekruweb.com</Text>
                    </TouchableOpacity>
                </View>

                {/* Company Info Section */}
                <Text style={styles.sectionTitle}>Company Information</Text>
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="business" size={20} color="#64748b" />
                        </View>
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Company Name</Text>
                            <Text style={styles.infoValue}>Shekru Labs India Pvt. Ltd.</Text>
                        </View>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="location" size={20} color="#64748b" />
                        </View>
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Headquarters</Text>
                            <Text style={styles.infoValue}>Muktangan English School & Jr College, office No. 6, 2 Floor manogat, Parvati, Pune, Maharashtra 411009</Text>
                        </View>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="globe" size={20} color={Colors.textSecondary} />
                        </View>
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Website</Text>
                            <TouchableOpacity onPress={handleWebsite}>
                                <Text style={[styles.infoValue, { color: Colors.purple, textDecorationLine: 'underline' }]}>
                                    www.shekruweb.com
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="time" size={20} color="#64748b" />
                        </View>
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Office Hours</Text>
                            <Text style={styles.infoValue}>Mon - Fri, 10:00 AM - 6:00 PM</Text>
                        </View>
                    </View>
                </View>

                {/* App Info */}
                <View style={styles.appInfoContainer}>
                    <Text style={styles.appVersionText}>App Version 1.0.0</Text>
                    <Text style={styles.copyrightText}>© 2024 Shekru Labs. All rights reserved.</Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border,
    },
    headerTextContainer: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    headerTitle: {
        ...Typography.screenTitle,
    },
    headerSubtitle: {
        ...Typography.secondary,
        marginTop: 2,
    },
    content: {
        flex: 1,
        padding: Spacing.xl,
        backgroundColor: Colors.background,
    },
    heroCard: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.xxl,
        marginBottom: Spacing.xxxl,
        ...Shadows.cardMedium,
    },
    heroContent: {
        alignItems: "center",
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#fff",
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    heroSubtitle: {
        fontSize: 14,
        color: "#e0e7ff",
        textAlign: "center",
        lineHeight: 20,
    },
    sectionTitle: {
        ...Typography.sectionTitle,
        marginBottom: Spacing.lg,
        marginLeft: 4,
    },
    contactGrid: {
        flexDirection: "row",
        gap: Spacing.lg,
        marginBottom: Spacing.xxxl,
    },
    contactCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.card,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.full,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.md,
    },
    contactLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    contactValue: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.text,
    },
    infoCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.xxxl,
        ...Shadows.card,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    infoIcon: {
        width: 32,
        alignItems: "center",
        marginTop: 2,
    },
    infoTextContainer: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    infoLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: Colors.textTertiary,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: "500",
        color: Colors.text,
        lineHeight: 22,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.borderLight,
        marginVertical: Spacing.lg,
        marginLeft: 44,
    },
    appInfoContainer: {
        alignItems: "center",
        marginTop: Spacing.xl,
    },
    appVersionText: {
        fontSize: 14,
        color: Colors.textTertiary,
        marginBottom: 4,
    },
    copyrightText: {
        fontSize: 12,
        color: Colors.textDisabled,
    },
});

export default HelpSupportScreen;
