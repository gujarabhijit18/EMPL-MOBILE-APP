// 📂 src/screens/ContactSupport.tsx
import React from "react";
import {
  View,
  Text,
  Linking,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Card, Button } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient"; // ✅ Expo-safe import
import { Ionicons } from "@expo/vector-icons"; // ✅ Expo-safe icons
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from 'expo-status-bar';

const ContactSupport: React.FC = () => {
  const navigation = useNavigation<any>();

  const contactMethods = [
    {
      icon: "call",
      title: "24/7 Phone Support",
      description: "Call us anytime for immediate assistance",
      details: ["+91 9975072250", "+91 8485050671"],
      action: "tel:+919975072250",
      color: "#3B82F6",
      actionLabel: "Call Now",
    },
    {
      icon: "logo-whatsapp",
      title: "WhatsApp Support",
      description: "Chat with us on WhatsApp for quick help",
      details: ["+91 9975072250"],
      action:
        "https://wa.me/919975072250?text=Hello,%20I%20need%20help%20with%20the%20App",
      color: "#22C55E",
      actionLabel: "Open WhatsApp",
    },
    {
      icon: "mail",
      title: "Email Support",
      description: "Send us an email and we’ll respond within 24 hours",
      details: ["support@shekrulabs.com"],
      action: "mailto:support@shekrulabs.com",
      color: "#8B5CF6",
      actionLabel: "Send Email",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <LinearGradient colors={["#F9FAFB", "#EFF6FF", "#EEF2FF"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* 🔙 Back Button */}
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          icon="arrow-back"
          textColor="#2563EB"
          style={{ alignSelf: "flex-start" }}
        >
          Back
        </Button>

        {/* 🧑‍💻 Header */}
        <View style={styles.header}>
          <LinearGradient colors={["#3B82F6", "#4F46E5"]} style={styles.iconCircle}>
            <Ionicons name="headset" color="#fff" size={32} />
          </LinearGradient>
          <Text style={styles.title}>We're Here to Help</Text>
          <Text style={styles.subtitle}>
            Our support team is available 24/7 to assist you with any questions or
            issues.
          </Text>
        </View>

        {/* 📞 Contact Methods */}
        <View style={styles.cardGrid}>
          {contactMethods.map((method, index) => (
            <Card key={index} style={styles.contactCard}>
              <View style={[styles.cardIcon, { backgroundColor: method.color }]}>
                <Ionicons name={method.icon as any} color="#fff" size={24} />
              </View>
              <Text style={styles.cardTitle}>{method.title}</Text>
              <Text style={styles.cardDesc}>{method.description}</Text>
              {method.details.map((d, i) => (
                <Text key={i} style={styles.cardDetail}>
                  {d}
                </Text>
              ))}
              <Button
                mode="contained"
                onPress={() => Linking.openURL(method.action)}
                buttonColor={method.color}
                style={styles.cardButton}
              >
                {method.actionLabel}
              </Button>
            </Card>
          ))}
        </View>

        {/* 💬 Quick WhatsApp */}
        <LinearGradient colors={["#22C55E", "#059669"]} style={styles.whatsappCard}>
          <Ionicons name="logo-whatsapp" color="#fff" size={40} />
          <Text style={styles.whatsappTitle}>Quick WhatsApp Support</Text>
          <Text style={styles.whatsappDesc}>
            Get instant help via WhatsApp - Available 24/7
          </Text>
          <Button
            mode="contained"
            buttonColor="#fff"
            textColor="#059669"
            onPress={() =>
              Linking.openURL(
                "https://wa.me/919975072250?text=Hello,%20I%20need%20help%20with%20the%20App"
              )
            }
          >
            Chat on WhatsApp
          </Button>
        </LinearGradient>

        {/* 🏢 Company Info */}
        <Card style={styles.infoCard}>
          <Card.Title
            title="Company Information"
            left={() => <Ionicons name="location" size={22} color="#2563EB" />}
          />
          <Card.Content>
            <View style={styles.infoRow}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Company Name</Text>
                <Text style={styles.infoText}>Shekru Labs India Pvt. Ltd.</Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoText}>Pune, Maharashtra, India</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Contact Numbers</Text>
                <TouchableOpacity onPress={() => Linking.openURL("tel:+919975072250")}>
                  <Text style={styles.link}>+91 9975072250</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL("tel:+918485050671")}>
                  <Text style={styles.link}>+91 8485050671</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Support Hours</Text>
                <Text style={styles.infoText}>24/7 - Always Available</Text>
              </View>
            </View>

            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                <Text style={{ fontWeight: "bold", color: "#2563EB" }}>Note:</Text>{" "}
                For urgent issues, please use WhatsApp or phone. Email responses may
                take up to 24 hours.
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* ❓ FAQs */}
        <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
        {faqData.map((faq, idx) => (
          <Card key={idx} style={styles.faqCard}>
            <Card.Title title={faq.q} />
            <Card.Content>
              <Text style={styles.faqAnswer}>{faq.a}</Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </LinearGradient>
    </SafeAreaView>
  );
};

export default ContactSupport;

// 🧠 FAQ Data (Offline)
const faqData = [
  {
    q: "How do I reset my password?",
    a: "Contact our support team via WhatsApp or phone for a secure password reset.",
  },
  {
    q: "What are your support hours?",
    a: "Our support team is available 24/7 for all queries and issues.",
  },
  {
    q: "How quickly will I get a response?",
    a: "WhatsApp/Phone: Immediate. Email: Within 24 hours.",
  },
  {
    q: "Can I schedule a demo?",
    a: "Yes! Contact us via WhatsApp or phone to book a demo.",
  },
];

// 🎨 Styles
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 16, paddingBottom: 50 },
  header: { alignItems: "center", marginBottom: 20 },
  iconCircle: {
    height: 70,
    width: 70,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  subtitle: { textAlign: "center", color: "#4B5563", marginTop: 6, maxWidth: 300 },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },
  contactCard: {
    width: "48%",
    padding: 16,
    borderRadius: 16,
    marginVertical: 8,
    backgroundColor: "#fff",
    elevation: 3,
  },
  cardIcon: {
    height: 50,
    width: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  cardDesc: { fontSize: 13, color: "#6B7280", marginBottom: 6 },
  cardDetail: { fontSize: 14, color: "#111827", fontWeight: "500" },
  cardButton: { marginTop: 10 },
  whatsappCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    alignItems: "center",
  },
  whatsappTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginTop: 10 },
  whatsappDesc: { color: "#D1FAE5", textAlign: "center", marginVertical: 10 },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginTop: 20,
    elevation: 3,
    paddingBottom: 10,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoBlock: { width: "48%", marginTop: 10 },
  infoLabel: { fontWeight: "600", color: "#374151" },
  infoText: { color: "#4B5563", marginTop: 4 },
  link: {
    color: "#2563EB",
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 3,
  },
  noteBox: { marginTop: 16, padding: 12, backgroundColor: "#DBEAFE", borderRadius: 12 },
  noteText: { color: "#374151", fontSize: 13 },
  faqTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 30,
    textAlign: "center",
    color: "#111827",
  },
  faqCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginVertical: 8,
    elevation: 2,
  },
  faqAnswer: { color: "#4B5563", fontSize: 13, marginTop: 4 },
});
