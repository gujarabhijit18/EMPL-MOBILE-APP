import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  Alert,
} from "react-native";
import { Briefcase } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../../contexts/AuthContext";

export default function HiringManagement() {
  const navigation = useNavigation();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();
  const { user } = useAuth();
  const isHR = user?.role === "hr";

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;

  const [activeTab, setActiveTab] = useState<"vacancies" | "candidates">("vacancies");
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [vacancyModalVisible, setVacancyModalVisible] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<any | null>(null);
  const [vacancyFormData, setVacancyFormData] = useState({
    title: "",
    department: user?.department || "",
    location: "",
    employment_type: "full-time",
    salary_range: "",
    status: "open",
    job_description: "",
    responsibilities: "",
    requirements: "",
    nice_to_have: "",
  });

  const departments = [
    "Human Resources",
    "Engineering",
    "Marketing",
    "Sales",
    "Finance",
    "Operations",
    "Support",
  ];

  const openNewVacancy = () => {
    setSelectedVacancy(null);
    setVacancyFormData({
      title: "",
      department: user?.department || "",
      location: "",
      employment_type: "full-time",
      salary_range: "",
      status: "open",
      job_description: "",
      responsibilities: "",
      requirements: "",
      nice_to_have: "",
    });
    setVacancyModalVisible(true);
  };

  const saveVacancy = () => {
    if (!vacancyFormData.title || !vacancyFormData.department || !vacancyFormData.location) {
      Alert.alert("Validation", "Please fill in all required fields.");
      return;
    }

    const newVacancy = {
      id: Date.now(),
      title: vacancyFormData.title,
      department: vacancyFormData.department,
      location: vacancyFormData.location,
      employment_type: capitalizeLabel(vacancyFormData.employment_type),
      status: capitalizeLabel(vacancyFormData.status),
      candidates_count: 0,
    };

    setVacancies((prev) => [newVacancy, ...prev]);
    setVacancyModalVisible(false);
    Alert.alert("Success", "Vacancy created successfully.");
  };

  const capitalizeLabel = (val: string) => val.replace(/(^.|-.?)/g, (m) => m.toUpperCase());

  // Mock Local Data
  const mockVacancies = [
    {
      id: 1,
      title: "Frontend Developer",
      department: "Engineering",
      location: "Pune",
      employment_type: "Full-Time",
      status: "Open",
      candidates_count: 5,
    },
    {
      id: 2,
      title: "HR Executive",
      department: "Human Resources",
      location: "Mumbai",
      employment_type: "Full-Time",
      status: "On Hold",
      candidates_count: 2,
    },
  ];

  const mockCandidates = [
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      vacancy_title: "Frontend Developer",
      status: "Applied",
      applied_at: "2025-11-05",
    },
    {
      id: 2,
      name: "Priya Sharma",
      email: "priya@example.com",
      vacancy_title: "HR Executive",
      status: "Interviewed",
      applied_at: "2025-11-03",
    },
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
    ]).start();

    setTimeout(() => {
      setVacancies(mockVacancies);
      setCandidates(mockCandidates);
      setLoading(false);
    }, 800);
  }, []);

  const filteredVacancies = vacancies.filter((v) =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCandidates = candidates.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={["top"]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.headerTextContainer,
              { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] },
            ]}
          >
            <Text style={styles.headerTitle}>Hiring Management</Text>
            <Text style={styles.headerSubtitle}>Track vacancies and candidates</Text>
          </Animated.View>

          <View style={styles.headerActionGroup}>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={{ paddingBottom: tabBarVisible ? tabBarHeight + 24 : 24 }}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        {/* TABS */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#E0E7FF",
            padding: 4,
            borderRadius: 50,
            marginBottom: 16,
          }}
        >
        {/* Vacancies Tab */}
        <TouchableOpacity
          onPress={() => setActiveTab("vacancies")}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 50,
            backgroundColor: activeTab === "vacancies" ? "white" : "transparent",
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontWeight: "600",
              color: activeTab === "vacancies" ? "#4F46E5" : "#6366F1",
            }}
          >
            Vacancies
          </Text>
        </TouchableOpacity>

        {/* Candidates Tab */}
        <TouchableOpacity
          onPress={() => setActiveTab("candidates")}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 50,
            backgroundColor: activeTab === "candidates" ? "white" : "transparent",
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontWeight: "600",
              color: activeTab === "candidates" ? "#4F46E5" : "#6366F1",
            }}
          >
            Candidates
          </Text>
        </TouchableOpacity>
      </View>

        {/* SEARCH + ADD */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <TextInput
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              backgroundColor: "white",
              borderRadius: 12,
              padding: 12,
              borderColor: "#D1D5DB",
              borderWidth: 1,
              marginRight: 10,
            }}
          />
          {activeTab === "vacancies" && (
            <TouchableOpacity style={styles.addButton} onPress={openNewVacancy}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>

      {/* CONTENT */}
      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 30 }} />
      ) : activeTab === "vacancies" ? (
        <View>
          {filteredVacancies.length === 0 ? (
            <Text style={{ textAlign: "center", marginTop: 30, color: "#6B7280" }}>
              No vacancies found
            </Text>
          ) : (
            filteredVacancies.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: "white",
                  padding: 16,
                  borderRadius: 20,
                  marginBottom: 14,
                  borderColor: "#E5E7EB",
                  borderWidth: 1,
                  elevation: 2,
                }}
              >
                <Text style={{ fontWeight: "700", fontSize: 16, color: "#111827" }}>
                  {item.title}
                </Text>
                <Text style={{ color: "#6B7280", marginTop: 4 }}>
                  {item.department} • {item.location}
                </Text>
                <Text style={{ color: "#4F46E5", marginTop: 4, fontWeight: "600" }}>
                  {item.employment_type} • {item.status}
                </Text>
                <Text style={{ color: "#9CA3AF", marginTop: 4, fontSize: 12 }}>
                  Candidates: {item.candidates_count}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : (
        <View>
          {filteredCandidates.length === 0 ? (
            <Text style={{ textAlign: "center", marginTop: 30, color: "#6B7280" }}>
              No candidates found
            </Text>
          ) : (
            filteredCandidates.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: "white",
                  padding: 16,
                  borderRadius: 20,
                  marginBottom: 14,
                  borderColor: "#E5E7EB",
                  borderWidth: 1,
                  elevation: 2,
                }}
              >
                <Text style={{ fontWeight: "700", fontSize: 16, color: "#111827" }}>
                  {item.name}
                </Text>
                <Text style={{ color: "#6B7280", marginTop: 4 }}>{item.email}</Text>
                <Text style={{ color: "#4F46E5", marginTop: 4, fontWeight: "600" }}>
                  {item.vacancy_title} • {item.status}
                </Text>
                <Text style={{ color: "#9CA3AF", marginTop: 4, fontSize: 12 }}>
                  Applied: {item.applied_at}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
      </ScrollView>

      {/* Add / Edit Vacancy Modal */}
      <Modal visible={vacancyModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedVacancy ? "Edit Vacancy" : "Create New Vacancy"}</Text>
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Job Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Senior Software Engineer"
                value={vacancyFormData.title}
                onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, title: text })}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Department *</Text>
              <View style={[styles.pickerContainer, isHR && { opacity: 0.7 }]}>
                <Picker
                  enabled={!isHR}
                  selectedValue={vacancyFormData.department}
                  onValueChange={(val) => setVacancyFormData({ ...vacancyFormData, department: val })}
                >
                  <Picker.Item label="Select department" value="" />
                  {departments.map((d) => (
                    <Picker.Item key={d} label={d} value={d} />
                  ))}
                </Picker>
              </View>
              {isHR && (
                <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 6 }}>
                  You can only create vacancies for your department.
                </Text>
              )}
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Location *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Mumbai, India"
                  value={vacancyFormData.location}
                  onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, location: text })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Employment Type *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={vacancyFormData.employment_type}
                    onValueChange={(val) => setVacancyFormData({ ...vacancyFormData, employment_type: val })}
                  >
                    <Picker.Item label="Full Time" value="full-time" />
                    <Picker.Item label="Part Time" value="part-time" />
                    <Picker.Item label="Contract" value="contract" />
                    <Picker.Item label="Internship" value="internship" />
                  </Picker>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Salary Range</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., ₹5L - ₹10L"
                  value={vacancyFormData.salary_range}
                  onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, salary_range: text })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={vacancyFormData.status}
                    onValueChange={(val) => setVacancyFormData({ ...vacancyFormData, status: val })}
                  >
                    <Picker.Item label="Open" value="open" />
                    <Picker.Item label="On Hold" value="on-hold" />
                    <Picker.Item label="Closed" value="closed" />
                  </Picker>
                </View>
              </View>
            </View>

            <View style={{ marginTop: 20 }}>
              <Text style={styles.label}>Job Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the role, mission, and impact of this position..."
                value={vacancyFormData.job_description}
                onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, job_description: text })}
                multiline
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Responsibilities</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Outline the day-to-day responsibilities..."
                value={vacancyFormData.responsibilities}
                onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, responsibilities: text })}
                multiline
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Requirements</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="List the required skills, qualifications, and experience..."
                value={vacancyFormData.requirements}
                onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, requirements: text })}
                multiline
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Nice-to-Have Skills</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Share any bonus skills or experience..."
                value={vacancyFormData.nice_to_have}
                onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, nice_to_have: text })}
                multiline
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#e5e7eb" }]}
                onPress={() => setVacancyModalVisible(false)}
              >
                <Text style={{ fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#4F46E5" }]}
                onPress={saveVacancy}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>{selectedVacancy ? "Save" : "Create"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#39549fff",
  },
  header: {
    backgroundColor: "#39549fff",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 30,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#a5b4fc",
    opacity: 0.9,
  },
  headerActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#00000099",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    margin: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 6,
  },
});
