import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../lib/api";

interface OfficeHours {
  id?: number;
  department?: string | null;
  start_time: string;
  end_time: string;
  check_in_grace_minutes: number;
  check_out_grace_minutes: number;
}

const OfficeHoursManagement: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [officeHours, setOfficeHours] = useState<OfficeHours>({
    start_time: "09:00",
    end_time: "18:00",
    check_in_grace_minutes: 5,
    check_out_grace_minutes: 5,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  useEffect(() => {
    loadOfficeHours();
  }, []);

  const loadOfficeHours = async () => {
    try {
      setLoading(true);
      const timing = await apiService.getEffectiveOfficeTiming();
      if (timing) {
        setOfficeHours(timing);
      }
    } catch (error) {
      console.warn("Failed to load office hours:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveOfficeHours = async () => {
    if (!officeHours.start_time || !officeHours.end_time) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      await apiService.upsertOfficeTiming({
        department: selectedDept || null,
        start_time: officeHours.start_time,
        end_time: officeHours.end_time,
        check_in_grace_minutes: officeHours.check_in_grace_minutes,
        check_out_grace_minutes: officeHours.check_out_grace_minutes,
      });
      Alert.alert("Success", "Office hours updated successfully");
      loadOfficeHours();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save office hours");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" backgroundColor="#3b82f6" translucent={false} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: "#3b82f6" }]} edges={['top']}>
        {/* Header */}
        <LinearGradient colors={["#3b82f6", "#1e40af"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Office Hours</Text>
              <Text style={styles.headerSubtitle}>Configure working hours for all employees</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView style={styles.contentContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Global Settings Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={20} color="#3b82f6" />
              <Text style={styles.cardTitle}>Global Office Hours</Text>
            </View>

            {/* Start Time */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Start Time</Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={styles.timeInput}
                  placeholder="HH:MM"
                  value={officeHours.start_time}
                  onChangeText={(text) => setOfficeHours({ ...officeHours, start_time: text })}
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.timeFormat}>24-hour format</Text>
              </View>
            </View>

            {/* End Time */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>End Time</Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={styles.timeInput}
                  placeholder="HH:MM"
                  value={officeHours.end_time}
                  onChangeText={(text) => setOfficeHours({ ...officeHours, end_time: text })}
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.timeFormat}>24-hour format</Text>
              </View>
            </View>

            {/* Check-in Grace Period */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Check-in Grace Period (minutes)</Text>
              <TextInput
                style={styles.input}
                placeholder="5"
                value={officeHours.check_in_grace_minutes.toString()}
                onChangeText={(text) => setOfficeHours({ ...officeHours, check_in_grace_minutes: parseInt(text) || 0 })}
                keyboardType="number-pad"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.helperText}>Employees can check in up to this many minutes after start time</Text>
            </View>

            {/* Check-out Grace Period */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Check-out Grace Period (minutes)</Text>
              <TextInput
                style={styles.input}
                placeholder="5"
                value={officeHours.check_out_grace_minutes.toString()}
                onChangeText={(text) => setOfficeHours({ ...officeHours, check_out_grace_minutes: parseInt(text) || 0 })}
                keyboardType="number-pad"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.helperText}>Employees can check out up to this many minutes before end time</Text>
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#1e40af" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How it works</Text>
              <Text style={styles.infoText}>
                • Employees checking in after start time + grace period will be marked as "Late"
              </Text>
              <Text style={styles.infoText}>
                • Employees checking out before end time - grace period will be marked as "Early"
              </Text>
              <Text style={styles.infoText}>
                • These settings apply to all employees globally
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
            onPress={saveOfficeHours}
            disabled={saving}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#3b82f6", "#1e40af"]} style={styles.saveButtonGradient}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Office Hours</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#3b82f6" },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerGradient: { paddingBottom: 20 },
  headerContent: { paddingHorizontal: 20, paddingTop: 10, flexDirection: "row", alignItems: "center" },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  contentContainer: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { padding: 20, paddingBottom: 40 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },

  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  timeInputContainer: {
    gap: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  timeFormat: {
    fontSize: 12,
    color: "#64748b",
  },
  helperText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 6,
  },

  infoCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e40af",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#1e40af",
    lineHeight: 18,
    marginBottom: 4,
  },

  saveButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});

export default OfficeHoursManagement;
