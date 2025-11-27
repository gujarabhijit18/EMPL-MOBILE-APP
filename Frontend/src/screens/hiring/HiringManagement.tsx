import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HiringManagement() {
  const navigation = useNavigation();
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();
  const { user } = useAuth();
  const isHR = user?.role === "hr";

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState<"vacancies" | "candidates">("vacancies");
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [vacancyModalVisible, setVacancyModalVisible] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<any | null>(null);
  const [formStep, setFormStep] = useState(1);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingVacancy, setViewingVacancy] = useState<any | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharingVacancy, setSharingVacancy] = useState<any | null>(null);
  const [shareData, setShareData] = useState({
    linkedin: false,
    linkedinUrl: "",
    naukri: false,
    naukriUrl: "",
    indeed: false,
    indeedUrl: "",
    other: false,
    otherUrl: "",
  });

  const [vacancyFormData, setVacancyFormData] = useState({
    title: "",
    department: user?.department || "",
    location: "",
    employment_type: "full-time",
    experience_required: "",
    salary_range_min: "",
    salary_range_max: "",
    vacancies: "1",
    closing_date: "",
    status: "Open",
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

  const experienceLevels = [
    "0-1 years (Entry Level)",
    "1-3 years (Junior)",
    "3-5 years (Mid Level)",
    "5-8 years (Senior)",
    "8+ years (Lead/Principal)",
  ];

  const openNewVacancy = () => {
    setSelectedVacancy(null);
    setFormStep(1);
    setVacancyFormData({
      title: "",
      department: user?.department || "",
      location: "",
      employment_type: "full-time",
      experience_required: "",
      salary_range_min: "",
      salary_range_max: "",
      vacancies: "1",
      closing_date: "",
      status: "Open",
      job_description: "",
      responsibilities: "",
      requirements: "",
      nice_to_have: "",
    });
    setVacancyModalVisible(true);
    Animated.parallel([
      Animated.spring(modalScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
      Animated.timing(modalOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalScale, { toValue: 0.9, duration: 200, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVacancyModalVisible(false);
      setFormStep(1);
    });
  };

  const saveVacancy = async () => {
    if (!vacancyFormData.title || !vacancyFormData.department || !vacancyFormData.location) {
      Alert.alert("Validation", "Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);
      
      // Build salary range string from min/max values
      let salaryRange = "";
      if (vacancyFormData.salary_range_min && vacancyFormData.salary_range_max) {
        const minLakh = Math.round(parseInt(vacancyFormData.salary_range_min) / 100000);
        const maxLakh = Math.round(parseInt(vacancyFormData.salary_range_max) / 100000);
        salaryRange = `₹${minLakh}L - ₹${maxLakh}L`;
      } else if (vacancyFormData.salary_range_min) {
        salaryRange = `₹${Math.round(parseInt(vacancyFormData.salary_range_min) / 100000)}L+`;
      }
      
      const vacancyData = {
        title: vacancyFormData.title,
        department: vacancyFormData.department,
        location: vacancyFormData.location,
        employment_type: vacancyFormData.employment_type,
        experience_required: vacancyFormData.experience_required || "0-2 years",
        description: vacancyFormData.job_description || "",
        requirements: vacancyFormData.requirements || "",
        responsibilities: vacancyFormData.responsibilities || "",
        nice_to_have_skills: vacancyFormData.nice_to_have || "",
        salary_range: salaryRange,
        status: vacancyFormData.status.toLowerCase(),
        closing_date: vacancyFormData.closing_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      if (selectedVacancy) {
        await apiService.updateJobOpening(selectedVacancy.vacancy_id, vacancyData);
        Alert.alert("Success", "Vacancy updated successfully.");
      } else {
        await apiService.createJobOpening(vacancyData);
        Alert.alert("Success", "Vacancy created successfully.");
      }

      closeModal();
      fetchVacancies();
    } catch (error: any) {
      console.error("Error saving vacancy:", error);
      Alert.alert("Error", error.message || "Failed to save vacancy");
    } finally {
      setLoading(false);
    }
  };

  const fetchVacancies = async () => {
    try {
      setLoading(true);
      const data = await apiService.getJobOpenings();
      setVacancies(data.map((vacancy: any) => ({
        id: vacancy.vacancy_id,
        vacancy_id: vacancy.vacancy_id,
        title: vacancy.title,
        department: vacancy.department,
        location: vacancy.location,
        employment_type: vacancy.employment_type || "full-time",
        status: vacancy.status || "open",
        candidates_count: vacancy.candidates_count || 0,
        experience_required: vacancy.experience_required,
        salary_range: vacancy.salary_range,
        closing_date: vacancy.closing_date,
        description: vacancy.description,
        requirements: vacancy.requirements,
        responsibilities: vacancy.responsibilities,
        nice_to_have_skills: vacancy.nice_to_have_skills,
      })));
    } catch (error: any) {
      console.error("Error fetching vacancies:", error);
      setVacancies([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCandidates();
      setCandidates(data.map((candidate: any) => ({
        id: candidate.candidate_id,
        candidate_id: candidate.candidate_id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        vacancy_title: candidate.vacancy_title || "",
        vacancy_department: candidate.vacancy_department || "",
        status: candidate.status,
        applied_at: candidate.applied_at?.split('T')[0] || "",
        vacancy_id: candidate.vacancy_id,
      })));
    } catch (error: any) {
      console.error("Error fetching candidates:", error);
      if (!error.message.includes("Not Found")) {
        Alert.alert("Error", "Failed to load candidates");
      }
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteVacancy = async (vacancyId: number) => {
    Alert.alert("Delete Vacancy", "Are you sure you want to delete this vacancy?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiService.deleteJobOpening(vacancyId);
            Alert.alert("Success", "Vacancy deleted successfully");
            fetchVacancies();
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to delete vacancy");
          }
        },
      },
    ]);
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(headerTranslateY, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
    ]).start();
    fetchVacancies();
    fetchCandidates();
  }, []);

  const filteredVacancies = vacancies.filter((v) => {
    const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = !departmentFilter || v.department === departmentFilter;
    const matchesStatus = !statusFilter || v.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesDepartment && matchesStatus;
  });
  const filteredCandidates = candidates.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!vacancyFormData.title) { Alert.alert("Required", "Please enter a job title"); return false; }
      if (!vacancyFormData.department) { Alert.alert("Required", "Please select a department"); return false; }
      if (!vacancyFormData.location) { Alert.alert("Required", "Please enter a location"); return false; }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(formStep)) {
      setFormStep(formStep + 1);
    }
  };

  const prevStep = () => setFormStep(formStep - 1);

  // Step Progress Indicator Component
  const StepIndicator = () => (
    <View style={styles.stepContainer}>
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <TouchableOpacity
            onPress={() => step < formStep && setFormStep(step)}
            style={[
              styles.stepCircle,
              formStep >= step && styles.stepCircleActive,
              formStep === step && styles.stepCircleCurrent,
            ]}
          >
            {formStep > step ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={[styles.stepNumber, formStep >= step && styles.stepNumberActive]}>
                {step}
              </Text>
            )}
          </TouchableOpacity>
          {step < 3 && (
            <View style={[styles.stepLine, formStep > step && styles.stepLineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const StepLabels = () => (
    <View style={styles.stepLabelsContainer}>
      <Text style={[styles.stepLabel, formStep >= 1 && styles.stepLabelActive]}>Basic Info</Text>
      <Text style={[styles.stepLabel, formStep >= 2 && styles.stepLabelActive]}>Details</Text>
      <Text style={[styles.stepLabel, formStep >= 3 && styles.stepLabelActive]}>Description</Text>
    </View>
  );

  // Form Input Component
  const FormInput = ({ label, icon, iconColor, placeholder, value, onChangeText, multiline = false, required = false }: any) => (
    <View style={styles.formInputContainer}>
      <View style={styles.formLabelRow}>
        {icon && (
          <View style={[styles.formIconBadge, { backgroundColor: iconColor + "20" }]}>
            <Ionicons name={icon} size={14} color={iconColor} />
          </View>
        )}
        <Text style={styles.formLabel}>
          {label} {required && <Text style={styles.requiredStar}>*</Text>}
        </Text>
      </View>
      <TextInput
        style={[styles.formInput, multiline && styles.formTextArea]}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );

  // Form Picker Component
  const FormPicker = ({ label, icon, iconColor, value, onValueChange, items, enabled = true, required = false }: any) => (
    <View style={styles.formInputContainer}>
      <View style={styles.formLabelRow}>
        {icon && (
          <View style={[styles.formIconBadge, { backgroundColor: iconColor + "20" }]}>
            <Ionicons name={icon} size={14} color={iconColor} />
          </View>
        )}
        <Text style={styles.formLabel}>
          {label} {required && <Text style={styles.requiredStar}>*</Text>}
        </Text>
      </View>
      <View style={[styles.formPickerWrapper, !enabled && { opacity: 0.6 }]}>
        <Picker selectedValue={value} onValueChange={onValueChange} enabled={enabled} style={styles.formPicker}>
          {items.map((item: any) => (
            <Picker.Item key={item.value} label={item.label} value={item.value} />
          ))}
        </Picker>
      </View>
    </View>
  );

  // Step 1: Basic Information
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={styles.stepIconGradient}>
          <Ionicons name="briefcase" size={24} color="#fff" />
        </LinearGradient>
        <View style={styles.stepHeaderText}>
          <Text style={styles.stepTitle}>Role Snapshot</Text>
          <Text style={styles.stepSubtitle}>Define the core details of this position</Text>
        </View>
      </View>

      <FormInput
        label="Job Title"
        icon="person"
        iconColor="#6366F1"
        placeholder="e.g., Senior Software Engineer"
        value={vacancyFormData.title}
        onChangeText={(text: string) => setVacancyFormData({ ...vacancyFormData, title: text })}
        required
      />

      <FormPicker
        label="Department"
        icon="business"
        iconColor="#10B981"
        value={vacancyFormData.department}
        onValueChange={(val: string) => setVacancyFormData({ ...vacancyFormData, department: val })}
        enabled={!isHR}
        required
        items={[
          { label: "Select department...", value: "" },
          ...departments.map((d) => ({ label: d, value: d })),
        ]}
      />

      <FormInput
        label="Location"
        icon="location"
        iconColor="#EF4444"
        placeholder="e.g., Mumbai, India or Remote"
        value={vacancyFormData.location}
        onChangeText={(text: string) => setVacancyFormData({ ...vacancyFormData, location: text })}
        required
      />

      <FormPicker
        label="Employment Type"
        icon="time"
        iconColor="#F59E0B"
        value={vacancyFormData.employment_type}
        onValueChange={(val: string) => setVacancyFormData({ ...vacancyFormData, employment_type: val })}
        items={[
          { label: "Full Time", value: "full-time" },
          { label: "Part Time", value: "part-time" },
          { label: "Contract", value: "contract" },
          { label: "Internship", value: "internship" },
        ]}
      />
    </View>
  );

  // Step 2: Compensation & Requirements
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <LinearGradient colors={["#10B981", "#059669"]} style={styles.stepIconGradient}>
          <Ionicons name="cash" size={24} color="#fff" />
        </LinearGradient>
        <View style={styles.stepHeaderText}>
          <Text style={styles.stepTitle}>Compensation & Details</Text>
          <Text style={styles.stepSubtitle}>Set salary range and experience requirements</Text>
        </View>
      </View>

      <View style={styles.salaryRow}>
        <View style={styles.salaryInputWrapper}>
          <Text style={styles.formLabel}>Min Salary (₹)</Text>
          <View style={styles.salaryInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.salaryInput}
              placeholder="500000"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={vacancyFormData.salary_range_min}
              onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, salary_range_min: text })}
            />
          </View>
        </View>
        <View style={styles.salaryDivider}>
          <Text style={styles.salaryDividerText}>to</Text>
        </View>
        <View style={styles.salaryInputWrapper}>
          <Text style={styles.formLabel}>Max Salary (₹)</Text>
          <View style={styles.salaryInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.salaryInput}
              placeholder="1000000"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={vacancyFormData.salary_range_max}
              onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, salary_range_max: text })}
            />
          </View>
        </View>
      </View>

      <FormPicker
        label="Experience Required"
        icon="trending-up"
        iconColor="#8B5CF6"
        value={vacancyFormData.experience_required}
        onValueChange={(val: string) => setVacancyFormData({ ...vacancyFormData, experience_required: val })}
        items={[
          { label: "Select experience level...", value: "" },
          ...experienceLevels.map((e) => ({ label: e, value: e })),
        ]}
      />

      <View style={styles.rowInputs}>
        <View style={styles.halfInput}>
          <FormInput
            label="No. of Vacancies"
            icon="people"
            iconColor="#3B82F6"
            placeholder="1"
            value={vacancyFormData.vacancies}
            onChangeText={(text: string) => setVacancyFormData({ ...vacancyFormData, vacancies: text })}
          />
        </View>
        <View style={styles.halfInput}>
          <FormPicker
            label="Status"
            icon="flag"
            iconColor="#EF4444"
            value={vacancyFormData.status}
            onValueChange={(val: string) => setVacancyFormData({ ...vacancyFormData, status: val })}
            items={[
              { label: "Open", value: "Open" },
              { label: "On Hold", value: "On Hold" },
              { label: "Closed", value: "Closed" },
            ]}
          />
        </View>
      </View>
    </View>
  );

  // Step 3: Job Description
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <LinearGradient colors={["#F59E0B", "#D97706"]} style={styles.stepIconGradient}>
          <Ionicons name="document-text" size={24} color="#fff" />
        </LinearGradient>
        <View style={styles.stepHeaderText}>
          <Text style={styles.stepTitle}>Role Narrative</Text>
          <Text style={styles.stepSubtitle}>Craft compelling descriptions to attract talent</Text>
        </View>
      </View>

      <FormInput
        label="Job Description"
        icon="document-text"
        iconColor="#EF4444"
        placeholder="Describe the role, mission, and impact of this position..."
        value={vacancyFormData.job_description}
        onChangeText={(text: string) => setVacancyFormData({ ...vacancyFormData, job_description: text })}
        multiline
        required
      />

      <FormInput
        label="Key Responsibilities"
        icon="checkmark-circle"
        iconColor="#10B981"
        placeholder="• Lead development of core features&#10;• Mentor junior developers&#10;• Participate in code reviews"
        value={vacancyFormData.responsibilities}
        onChangeText={(text: string) => setVacancyFormData({ ...vacancyFormData, responsibilities: text })}
        multiline
      />

      <FormInput
        label="Requirements"
        icon="shield-checkmark"
        iconColor="#8B5CF6"
        placeholder="• 5+ years of experience&#10;• Strong problem-solving skills&#10;• Excellent communication"
        value={vacancyFormData.requirements}
        onChangeText={(text: string) => setVacancyFormData({ ...vacancyFormData, requirements: text })}
        multiline
      />

      <FormInput
        label="Nice-to-Have Skills"
        icon="star"
        iconColor="#F59E0B"
        placeholder="• Experience with cloud platforms&#10;• Open source contributions&#10;• Leadership experience"
        value={vacancyFormData.nice_to_have}
        onChangeText={(text: string) => setVacancyFormData({ ...vacancyFormData, nice_to_have: text })}
        multiline
      />
    </View>
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
            style={[styles.headerTextContainer, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}
          >
            <Text style={styles.headerTitle}>Hiring Management</Text>
            <Text style={styles.headerSubtitle}>Track vacancies and candidates</Text>
          </Animated.View>

          <View style={styles.headerActionGroup}>
            <TouchableOpacity style={styles.headerIconButton} onPress={() => { fetchVacancies(); fetchCandidates(); }}>
              <Ionicons name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
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
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab("vacancies")}
            style={[styles.tab, activeTab === "vacancies" && styles.tabActive]}
          >
            <Ionicons name="briefcase-outline" size={18} color={activeTab === "vacancies" ? "#4F46E5" : "#6366F1"} />
            <Text style={[styles.tabText, activeTab === "vacancies" && styles.tabTextActive]}>Vacancies</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("candidates")}
            style={[styles.tab, activeTab === "candidates" && styles.tabActive]}
          >
            <Ionicons name="people-outline" size={18} color={activeTab === "candidates" ? "#4F46E5" : "#6366F1"} />
            <Text style={[styles.tabText, activeTab === "candidates" && styles.tabTextActive]}>Candidates</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH + FILTERS */}
        {activeTab === "vacancies" && (
          <View style={styles.filterRow}>
            <View style={styles.searchInputWrapperLarge}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                placeholder="Search vacancies..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInputLarge}
              />
            </View>
            <View style={styles.filterPickerWrapper}>
              <Picker
                selectedValue={departmentFilter}
                onValueChange={setDepartmentFilter}
                style={styles.filterPicker}
              >
                <Picker.Item label="All Departments" value="" />
                {departments.map((d) => <Picker.Item key={d} label={d} value={d} />)}
              </Picker>
            </View>
            <View style={styles.filterPickerWrapper}>
              <Picker
                selectedValue={statusFilter}
                onValueChange={setStatusFilter}
                style={styles.filterPicker}
              >
                <Picker.Item label="All Status" value="" />
                <Picker.Item label="Open" value="open" />
                <Picker.Item label="Closed" value="closed" />
                <Picker.Item label="On Hold" value="on hold" />
              </Picker>
            </View>
          </View>
        )}

        {activeTab === "candidates" && (
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                placeholder="Search candidates..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
            </View>
          </View>
        )}

        {/* CONTENT */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : activeTab === "vacancies" ? (
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <View style={styles.tableHeaderLeft}>
                <Text style={styles.tableTitle}>Job Vacancies</Text>
                <Text style={styles.tableSubtitle}>Overview of all open roles and hiring progress.</Text>
              </View>
              <View style={styles.tableHeaderRight}>
                <TouchableOpacity style={styles.addVacancyBtn} onPress={openNewVacancy}>
                  <Ionicons name="briefcase-outline" size={16} color="#3B82F6" />
                  <Text style={styles.addVacancyBtnText}>{filteredVacancies.length} roles</Text>
                </TouchableOpacity>
              </View>
            </View>

            {filteredVacancies.length === 0 ? (
              <View style={styles.emptyStateInner}>
                <View style={styles.emptyIconWrapper}>
                  <Ionicons name="briefcase-outline" size={48} color="#6366F1" />
                </View>
                <Text style={styles.emptyTitle}>No vacancies found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery || departmentFilter || statusFilter ? "Try adjusting your filters" : "Create your first job opening to start hiring"}
                </Text>
                {!searchQuery && !departmentFilter && !statusFilter && (
                  <TouchableOpacity style={styles.emptyButton} onPress={openNewVacancy}>
                    <LinearGradient colors={["#6366F1", "#4F46E5"]} style={styles.emptyButtonGradient}>
                      <Ionicons name="add" size={20} color="#fff" />
                      <Text style={styles.emptyButtonText}>Create Vacancy</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.vacancyListContainer}>
                {filteredVacancies.map((item) => (
                  <View key={item.id} style={styles.vacancyCardNew}>
                    {/* Card Header - Title & Status */}
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardTitleSection}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.cardDepartment}>{item.department}</Text>
                      </View>
                      <View style={[styles.statusBadge, item.status === "open" ? styles.statusOpen : styles.statusClosed]}>
                        <Text style={[styles.statusText, item.status === "open" ? styles.statusTextOpen : styles.statusTextClosed]}>
                          {item.status === "open" ? "Open" : item.status === "closed" ? "Closed" : "On Hold"}
                        </Text>
                      </View>
                    </View>

                    {/* Card Info Row */}
                    <View style={styles.cardInfoRow}>
                      <View style={styles.cardInfoItem}>
                        <Ionicons name="location-outline" size={14} color="#6B7280" />
                        <Text style={styles.cardInfoText}>{item.location}</Text>
                      </View>
                      <View style={styles.cardInfoItem}>
                        <Ionicons name="time-outline" size={14} color="#6B7280" />
                        <Text style={styles.cardInfoText}>
                          {item.employment_type === "full-time" ? "Full Time" : 
                           item.employment_type === "part-time" ? "Part Time" : 
                           item.employment_type === "contract" ? "Contract" : 
                           item.employment_type === "internship" ? "Internship" : item.employment_type}
                        </Text>
                      </View>
                    </View>

                    {/* Card Stats Row */}
                    <View style={styles.cardStatsRow}>
                      <View style={styles.cardStatItem}>
                        <Text style={styles.cardStatValue}>{item.candidates_count || 0}</Text>
                        <Text style={styles.cardStatLabel}>Candidates</Text>
                      </View>
                      <View style={styles.cardStatDivider} />
                      <View style={styles.cardStatItem}>
                        <View style={styles.socialIconsRow}>
                          <Ionicons name="logo-linkedin" size={18} color={item.posted_on_linkedin ? "#0A66C2" : "#D1D5DB"} />
                          <Ionicons name="globe-outline" size={18} color={item.posted_on_naukri ? "#3B82F6" : "#D1D5DB"} />
                        </View>
                        <Text style={styles.cardStatLabel}>Social Media</Text>
                      </View>
                    </View>

                    {/* Card Actions */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity style={styles.cardActionBtn} onPress={() => { setViewingVacancy(item); setViewModalVisible(true); }}>
                        <Ionicons name="eye-outline" size={18} color="#6B7280" />
                        <Text style={styles.cardActionText}>View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cardActionBtn} onPress={() => { setSharingVacancy(item); setShareModalVisible(true); }}>
                        <Ionicons name="share-social-outline" size={18} color="#6B7280" />
                        <Text style={styles.cardActionText}>Share</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cardActionBtn}>
                        <Ionicons name="create-outline" size={18} color="#6B7280" />
                        <Text style={styles.cardActionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.cardActionBtn, styles.cardActionBtnDanger]} onPress={() => deleteVacancy(item.vacancy_id)}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        <Text style={[styles.cardActionText, styles.cardActionTextDanger]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View>
            {filteredCandidates.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrapper}>
                  <Ionicons name="people-outline" size={48} color="#6366F1" />
                </View>
                <Text style={styles.emptyTitle}>No candidates found</Text>
                <Text style={styles.emptySubtitle}>Candidates will appear here once they apply</Text>
              </View>
            ) : (
              filteredCandidates.map((item) => (
                <View key={item.id} style={styles.candidateCard}>
                  <View style={styles.candidateAvatar}>
                    <Text style={styles.candidateInitials}>{item.name.split(" ").map((n: string) => n[0]).join("")}</Text>
                  </View>
                  <View style={styles.candidateInfo}>
                    <Text style={styles.candidateName}>{item.name}</Text>
                    <Text style={styles.candidateEmail}>{item.email}</Text>
                    <View style={styles.candidateMeta}>
                      <View style={[styles.tag, styles.tagPrimary]}>
                        <Text style={styles.tagTextPrimary}>{item.status}</Text>
                      </View>
                      <Text style={styles.candidateDate}>Applied: {item.applied_at}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Vacancy Modal - Full Screen Form */}
      <Modal visible={vacancyModalVisible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeaderNew}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconCircle}>
                  <Ionicons name="briefcase" size={24} color="#3B82F6" />
                </View>
                <View>
                  <Text style={styles.modalTitleNew}>{selectedVacancy ? "Edit Vacancy" : "Create New Vacancy"}</Text>
                  <Text style={styles.modalSubtitleNew}>Craft a compelling job post with clear responsibilities and requirements.</Text>
                </View>
              </View>
              <View style={styles.modalHeaderRight}>
                <TouchableOpacity style={styles.newOpportunityBadge}>
                  <Ionicons name="sparkles" size={14} color="#3B82F6" />
                  <Text style={styles.newOpportunityText}>New opportunity</Text>
                </TouchableOpacity>
                <Text style={styles.statusLabel}>STATUS: <Text style={styles.statusValue}>{vacancyFormData.status.toUpperCase()}</Text></Text>
              </View>
              <TouchableOpacity style={styles.closeButtonNew} onPress={closeModal}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBodyNew} showsVerticalScrollIndicator={false}>
              {/* ROLE SNAPSHOT Section */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitleNew}>ROLE SNAPSHOT</Text>
                <Text style={styles.sectionSubtitleNew}>Give this vacancy a clear title and connect it to the right department.</Text>

                {/* Row 1: Job Title & Department */}
                <View style={styles.formRow}>
                  <View style={styles.formFieldHalf}>
                    <Text style={styles.fieldLabel}>Job Title <Text style={styles.required}>*</Text></Text>
                    <TextInput
                      style={[styles.fieldInput, styles.fieldInputFocused]}
                      placeholder="e.g., Senior Software Engineer"
                      placeholderTextColor="#9CA3AF"
                      value={vacancyFormData.title}
                      onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, title: text })}
                    />
                  </View>
                  <View style={styles.formFieldHalf}>
                    <Text style={styles.fieldLabel}>Department <Text style={styles.required}>*</Text></Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={vacancyFormData.department}
                        onValueChange={(val) => setVacancyFormData({ ...vacancyFormData, department: val })}
                        style={styles.pickerStyle}
                        enabled={!isHR}
                      >
                        <Picker.Item label="Select department" value="" />
                        {departments.map((d) => <Picker.Item key={d} label={d} value={d} />)}
                      </Picker>
                    </View>
                  </View>
                </View>

                {/* Row 2: Location, Employment Type */}
                <View style={styles.formRow}>
                  <View style={styles.formFieldThird}>
                    <Text style={styles.fieldLabel}>Location <Text style={styles.required}>*</Text></Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g., Mumbai, India"
                      placeholderTextColor="#9CA3AF"
                      value={vacancyFormData.location}
                      onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, location: text })}
                    />
                  </View>
                  <View style={styles.formFieldThird}>
                    <Text style={styles.fieldLabel}>Employment Type <Text style={styles.required}>*</Text></Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={vacancyFormData.employment_type}
                        onValueChange={(val) => setVacancyFormData({ ...vacancyFormData, employment_type: val })}
                        style={styles.pickerStyle}
                      >
                        <Picker.Item label="Full Time" value="full-time" />
                        <Picker.Item label="Part Time" value="part-time" />
                        <Picker.Item label="Contract" value="contract" />
                        <Picker.Item label="Internship" value="internship" />
                      </Picker>
                    </View>
                  </View>
                </View>

                {/* Row 3: Salary Range (Min & Max) */}
                <View style={styles.formRow}>
                  <View style={styles.formFieldHalf}>
                    <Text style={styles.fieldLabel}>Min Salary (₹)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g., 500000"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={vacancyFormData.salary_range_min}
                      onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, salary_range_min: text.replace(/[^0-9]/g, '') })}
                    />
                  </View>
                  <View style={styles.formFieldHalf}>
                    <Text style={styles.fieldLabel}>Max Salary (₹)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g., 1000000"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={vacancyFormData.salary_range_max}
                      onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, salary_range_max: text.replace(/[^0-9]/g, '') })}
                    />
                  </View>
                </View>

                {/* Row 3: Status */}
                <View style={styles.formRow}>
                  <View style={styles.formFieldThird}>
                    <Text style={styles.fieldLabel}>Status <Text style={styles.required}>*</Text></Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={vacancyFormData.status}
                        onValueChange={(val) => setVacancyFormData({ ...vacancyFormData, status: val })}
                        style={styles.pickerStyle}
                      >
                        <Picker.Item label="Open" value="Open" />
                        <Picker.Item label="On Hold" value="On Hold" />
                        <Picker.Item label="Closed" value="Closed" />
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>

              {/* ROLE NARRATIVE Section */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitleNew}>ROLE NARRATIVE</Text>
                <Text style={styles.sectionSubtitleNew}>Use rich descriptions, responsibilities, and requirements to attract the right talent.</Text>

                {/* Job Description */}
                <View style={styles.narrativeField}>
                  <View style={styles.narrativeLabelRow}>
                    <Ionicons name="document-text" size={16} color="#EF4444" />
                    <Text style={styles.narrativeLabel}>Job Description <Text style={styles.required}>*</Text></Text>
                  </View>
                  <View style={styles.formattingBar}>
                    <Text style={styles.formattingText}>Formatting:</Text>
                    <TouchableOpacity style={styles.formatBtn}><Text style={styles.formatBtnText}>B</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.formatBtn}><Text style={styles.formatBtnText}>•</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.formatBtn}><Text style={styles.formatBtnText}>1.</Text></TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.narrativeInput}
                    placeholder="Describe the role, mission, and impact of this position..."
                    placeholderTextColor="#9CA3AF"
                    value={vacancyFormData.job_description}
                    onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, job_description: text })}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Responsibilities */}
                <View style={styles.narrativeField}>
                  <View style={styles.narrativeLabelRow}>
                    <Ionicons name="git-branch-outline" size={16} color="#F59E0B" />
                    <Text style={styles.narrativeLabel}>Responsibilities</Text>
                  </View>
                  <View style={styles.formattingBar}>
                    <Text style={styles.formattingText}>Formatting:</Text>
                    <TouchableOpacity style={styles.formatBtn}><Text style={styles.formatBtnText}>B</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.formatBtn}><Text style={styles.formatBtnText}>•</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.formatBtn}><Text style={styles.formatBtnText}>1.</Text></TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.narrativeInput}
                    placeholder="Outline the day-to-day responsibilities..."
                    placeholderTextColor="#9CA3AF"
                    value={vacancyFormData.responsibilities}
                    onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, responsibilities: text })}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Requirements */}
                <View style={styles.narrativeField}>
                  <View style={styles.narrativeLabelRow}>
                    <Ionicons name="shield-checkmark" size={16} color="#8B5CF6" />
                    <Text style={styles.narrativeLabel}>Requirements</Text>
                  </View>
                  <View style={styles.formattingBar}>
                    <Text style={styles.formattingText}>Formatting:</Text>
                    <TouchableOpacity style={styles.formatBtn}><Text style={styles.formatBtnText}>B</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.formatBtn}><Text style={styles.formatBtnText}>•</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.formatBtn}><Text style={styles.formatBtnText}>1.</Text></TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.narrativeInput}
                    placeholder="List the required skills, qualifications, and experience..."
                    placeholderTextColor="#9CA3AF"
                    value={vacancyFormData.requirements}
                    onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, requirements: text })}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Nice-to-Have Skills */}
                <View style={styles.narrativeField}>
                  <View style={styles.narrativeLabelRow}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.narrativeLabel}>Nice-to-Have Skills</Text>
                  </View>
                  <View style={styles.formattingBar}>
                    <Text style={styles.formattingText}>Formatting:</Text>
                    <TouchableOpacity style={styles.formatBtn}><Text style={styles.formatBtnText}>B</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.formatBtn}><Text style={styles.formatBtnText}>•</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.formatBtn}><Text style={styles.formatBtnText}>1.</Text></TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.narrativeInput}
                    placeholder="Share any bonus skills or experience that would make candidates stand out..."
                    placeholderTextColor="#9CA3AF"
                    value={vacancyFormData.nice_to_have}
                    onChangeText={(text) => setVacancyFormData({ ...vacancyFormData, nice_to_have: text })}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooterNew}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={saveVacancy}>
                <Text style={styles.createBtnText}>{selectedVacancy ? "Save" : "Create"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* View Vacancy Details Modal */}
      <Modal visible={viewModalVisible} animationType="fade" transparent>
        <View style={styles.viewModalOverlay}>
          <View style={styles.viewModalContainer}>
            {viewingVacancy && (
              <>
                {/* Header */}
                <View style={styles.viewModalHeader}>
                  <View style={styles.viewModalTitleSection}>
                    <Text style={styles.viewModalTitle}>{viewingVacancy.title}</Text>
                    <Text style={styles.viewModalSubtitle}>{viewingVacancy.department} • {viewingVacancy.location}</Text>
                  </View>
                  <TouchableOpacity style={styles.viewModalCloseBtn} onPress={() => setViewModalVisible(false)}>
                    <Ionicons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.viewModalBody} showsVerticalScrollIndicator={false}>
                  {/* Info Grid */}
                  <View style={styles.viewInfoGrid}>
                    <View style={styles.viewInfoItem}>
                      <Text style={styles.viewInfoLabel}>Employment Type</Text>
                      <Text style={styles.viewInfoValue}>
                        {viewingVacancy.employment_type === "full-time" ? "Full Time" : 
                         viewingVacancy.employment_type === "part-time" ? "Part Time" : 
                         viewingVacancy.employment_type === "contract" ? "Contract" : 
                         viewingVacancy.employment_type === "internship" ? "Internship" : viewingVacancy.employment_type}
                      </Text>
                    </View>
                    <View style={styles.viewInfoItem}>
                      <Text style={styles.viewInfoLabel}>Status</Text>
                      <View style={[styles.statusBadge, viewingVacancy.status === "open" ? styles.statusOpen : styles.statusClosed]}>
                        <Text style={[styles.statusText, viewingVacancy.status === "open" ? styles.statusTextOpen : styles.statusTextClosed]}>
                          {viewingVacancy.status === "open" ? "Open" : viewingVacancy.status === "closed" ? "Closed" : "On Hold"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.viewInfoGrid}>
                    <View style={styles.viewInfoItem}>
                      <Text style={styles.viewInfoLabel}>Salary Range</Text>
                      <Text style={styles.viewInfoValue}>{viewingVacancy.salary_range || "Not specified"}</Text>
                    </View>
                    <View style={styles.viewInfoItem}>
                      <Text style={styles.viewInfoLabel}>Candidates</Text>
                      <Text style={styles.viewInfoValue}>{viewingVacancy.candidates_count || 0} applications</Text>
                    </View>
                  </View>

                  {/* Description Sections */}
                  {viewingVacancy.description && (
                    <View style={styles.viewSection}>
                      <View style={styles.viewSectionHeader}>
                        <Ionicons name="document-text" size={16} color="#EF4444" />
                        <Text style={styles.viewSectionTitle}>Job Description</Text>
                      </View>
                      <Text style={styles.viewSectionContent}>{viewingVacancy.description}</Text>
                    </View>
                  )}

                  {viewingVacancy.responsibilities && (
                    <View style={styles.viewSection}>
                      <View style={styles.viewSectionHeader}>
                        <Ionicons name="git-branch-outline" size={16} color="#F59E0B" />
                        <Text style={styles.viewSectionTitle}>Responsibilities</Text>
                      </View>
                      <Text style={styles.viewSectionContent}>{viewingVacancy.responsibilities}</Text>
                    </View>
                  )}

                  {viewingVacancy.requirements && (
                    <View style={styles.viewSection}>
                      <View style={styles.viewSectionHeader}>
                        <Ionicons name="shield-checkmark" size={16} color="#8B5CF6" />
                        <Text style={styles.viewSectionTitle}>Requirements</Text>
                      </View>
                      <Text style={styles.viewSectionContent}>{viewingVacancy.requirements}</Text>
                    </View>
                  )}

                  {viewingVacancy.nice_to_have_skills && (
                    <View style={styles.viewSection}>
                      <View style={styles.viewSectionHeader}>
                        <Ionicons name="star" size={16} color="#F59E0B" />
                        <Text style={styles.viewSectionTitle}>Nice-to-Have Skills</Text>
                      </View>
                      <Text style={styles.viewSectionContent}>{viewingVacancy.nice_to_have_skills}</Text>
                    </View>
                  )}

                  {/* Social Media Posts */}
                  <View style={styles.viewSection}>
                    <Text style={styles.viewSectionTitle}>Social Media Posts</Text>
                    <View style={styles.socialMediaRow}>
                      <View style={[styles.socialMediaItem, viewingVacancy.posted_on_linkedin && styles.socialMediaItemActive]}>
                        <Ionicons name="logo-linkedin" size={20} color={viewingVacancy.posted_on_linkedin ? "#0A66C2" : "#D1D5DB"} />
                      </View>
                      <View style={[styles.socialMediaItem, viewingVacancy.posted_on_naukri && styles.socialMediaItemActive]}>
                        <Ionicons name="globe-outline" size={20} color={viewingVacancy.posted_on_naukri ? "#3B82F6" : "#D1D5DB"} />
                      </View>
                      <View style={[styles.socialMediaItem, viewingVacancy.posted_on_indeed && styles.socialMediaItemActive]}>
                        <Ionicons name="briefcase-outline" size={20} color={viewingVacancy.posted_on_indeed ? "#2557A7" : "#D1D5DB"} />
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Footer */}
                <View style={styles.viewModalFooter}>
                  <TouchableOpacity style={styles.viewModalCloseButton} onPress={() => setViewModalVisible(false)}>
                    <Text style={styles.viewModalCloseButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Share to Social Media Modal */}
      <Modal visible={shareModalVisible} animationType="fade" transparent>
        <View style={styles.viewModalOverlay}>
          <View style={styles.shareModalContainer}>
            {sharingVacancy && (
              <>
                {/* Header */}
                <View style={styles.shareModalHeader}>
                  <View>
                    <Text style={styles.shareModalTitle}>Post to Social Media</Text>
                    <Text style={styles.shareModalSubtitle}>Select platforms to post the vacancy: {sharingVacancy.title}</Text>
                  </View>
                  <TouchableOpacity style={styles.viewModalCloseBtn} onPress={() => setShareModalVisible(false)}>
                    <Ionicons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.shareModalBody} showsVerticalScrollIndicator={false}>
                  {/* LinkedIn */}
                  <View style={styles.sharePlatformItem}>
                    <TouchableOpacity 
                      style={styles.sharePlatformHeader}
                      onPress={() => setShareData({ ...shareData, linkedin: !shareData.linkedin })}
                    >
                      <View style={[styles.shareCheckbox, shareData.linkedin && styles.shareCheckboxActive]}>
                        {shareData.linkedin && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Ionicons name="logo-linkedin" size={20} color="#0A66C2" />
                      <Text style={styles.sharePlatformName}>LinkedIn</Text>
                    </TouchableOpacity>
                    {shareData.linkedin && (
                      <TextInput
                        style={styles.sharePlatformInput}
                        placeholder="LinkedIn post URL (optional)"
                        placeholderTextColor="#9CA3AF"
                        value={shareData.linkedinUrl}
                        onChangeText={(text) => setShareData({ ...shareData, linkedinUrl: text })}
                      />
                    )}
                  </View>

                  {/* Naukri */}
                  <View style={styles.sharePlatformItem}>
                    <TouchableOpacity 
                      style={styles.sharePlatformHeader}
                      onPress={() => setShareData({ ...shareData, naukri: !shareData.naukri })}
                    >
                      <View style={[styles.shareCheckbox, shareData.naukri && styles.shareCheckboxActive]}>
                        {shareData.naukri && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Ionicons name="briefcase" size={20} color="#10B981" />
                      <Text style={styles.sharePlatformName}>Naukri</Text>
                    </TouchableOpacity>
                    {shareData.naukri && (
                      <TextInput
                        style={styles.sharePlatformInput}
                        placeholder="Naukri post URL (optional)"
                        placeholderTextColor="#9CA3AF"
                        value={shareData.naukriUrl}
                        onChangeText={(text) => setShareData({ ...shareData, naukriUrl: text })}
                      />
                    )}
                  </View>

                  {/* Indeed */}
                  <View style={styles.sharePlatformItem}>
                    <TouchableOpacity 
                      style={styles.sharePlatformHeader}
                      onPress={() => setShareData({ ...shareData, indeed: !shareData.indeed })}
                    >
                      <View style={[styles.shareCheckbox, shareData.indeed && styles.shareCheckboxActive]}>
                        {shareData.indeed && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Ionicons name="briefcase-outline" size={20} color="#2557A7" />
                      <Text style={styles.sharePlatformName}>Indeed</Text>
                    </TouchableOpacity>
                    {shareData.indeed && (
                      <TextInput
                        style={styles.sharePlatformInput}
                        placeholder="Indeed post URL (optional)"
                        placeholderTextColor="#9CA3AF"
                        value={shareData.indeedUrl}
                        onChangeText={(text) => setShareData({ ...shareData, indeedUrl: text })}
                      />
                    )}
                  </View>

                  {/* Other Platforms */}
                  <View style={styles.sharePlatformItem}>
                    <TouchableOpacity 
                      style={styles.sharePlatformHeader}
                      onPress={() => setShareData({ ...shareData, other: !shareData.other })}
                    >
                      <View style={[styles.shareCheckbox, shareData.other && styles.shareCheckboxActive]}>
                        {shareData.other && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Ionicons name="share-social" size={20} color="#6B7280" />
                      <Text style={styles.sharePlatformName}>Other Platforms</Text>
                    </TouchableOpacity>
                    {shareData.other && (
                      <TextInput
                        style={styles.sharePlatformInput}
                        placeholder="Other platform post URL (optional)"
                        placeholderTextColor="#9CA3AF"
                        value={shareData.otherUrl}
                        onChangeText={(text) => setShareData({ ...shareData, otherUrl: text })}
                      />
                    )}
                  </View>
                </ScrollView>

                {/* Footer */}
                <View style={styles.shareModalFooter}>
                  <TouchableOpacity style={styles.shareCancelBtn} onPress={() => setShareModalVisible(false)}>
                    <Text style={styles.shareCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.sharePostBtn}
                    onPress={async () => {
                      try {
                        const platforms = [];
                        const links: any = {};
                        if (shareData.linkedin) { platforms.push("linkedin"); if (shareData.linkedinUrl) links.linkedin = shareData.linkedinUrl; }
                        if (shareData.naukri) { platforms.push("naukri"); if (shareData.naukriUrl) links.naukri = shareData.naukriUrl; }
                        if (shareData.indeed) { platforms.push("indeed"); if (shareData.indeedUrl) links.indeed = shareData.indeedUrl; }
                        if (shareData.other) { platforms.push("other"); if (shareData.otherUrl) links.other = shareData.otherUrl; }
                        
                        // Call API to post to social media (you can implement this)
                        Alert.alert("Success", `Posted to ${platforms.length} platform(s)`);
                        setShareModalVisible(false);
                        fetchVacancies();
                      } catch (error: any) {
                        Alert.alert("Error", error.message || "Failed to post");
                      }
                    }}
                  >
                    <Ionicons name="share-social" size={18} color="#fff" />
                    <Text style={styles.sharePostBtnText}>Post to Selected Platforms</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeAreaContainer: { flex: 1, backgroundColor: "#39549fff" },
  header: { backgroundColor: "#39549fff", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 30 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.1)", justifyContent: "center", alignItems: "center" },
  headerTextContainer: { flex: 1, paddingHorizontal: 16 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "white", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "#a5b4fc", opacity: 0.9 },
  headerActionGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.1)", justifyContent: "center", alignItems: "center" },
  contentContainer: { flex: 1, backgroundColor: "#f9fafb", padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20 },

  // Tabs
  tabContainer: { flexDirection: "row", backgroundColor: "#EEF2FF", padding: 4, borderRadius: 16, marginBottom: 16 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, gap: 6 },
  tabActive: { backgroundColor: "#fff", shadowColor: "#6366F1", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontWeight: "600", color: "#6366F1", fontSize: 14 },
  tabTextActive: { color: "#4F46E5" },

  // Search
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  searchInputWrapper: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: "#111827" },
  addButton: { borderRadius: 14, overflow: "hidden" },
  addButtonGradient: { width: 52, height: 52, justifyContent: "center", alignItems: "center" },

  // Loading
  loadingContainer: { alignItems: "center", marginTop: 60 },
  loadingText: { marginTop: 12, color: "#6B7280", fontSize: 14 },

  // Empty State
  emptyState: { alignItems: "center", marginTop: 60, paddingHorizontal: 40 },
  emptyIconWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20 },
  emptyButton: { marginTop: 24, borderRadius: 12, overflow: "hidden" },
  emptyButtonGradient: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 14, gap: 8 },
  emptyButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },

  // Vacancy Card
  vacancyCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  vacancyCardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  vacancyIconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  vacancyInfo: { flex: 1 },
  vacancyTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  vacancyMeta: { fontSize: 13, color: "#6B7280" },
  deleteButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FEF2F2", justifyContent: "center", alignItems: "center" },
  vacancyTags: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagPrimary: { backgroundColor: "#EEF2FF" },
  tagSuccess: { backgroundColor: "#D1FAE5" },
  tagWarning: { backgroundColor: "#FEF3C7" },
  tagTextPrimary: { fontSize: 12, fontWeight: "600", color: "#4F46E5" },
  tagTextSuccess: { fontSize: 12, fontWeight: "600", color: "#059669" },
  tagTextWarning: { fontSize: 12, fontWeight: "600", color: "#D97706" },
  vacancyStats: { flexDirection: "row", gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  statItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { fontSize: 12, color: "#6B7280" },

  // Candidate Card
  candidateCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  candidateAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#6366F1", justifyContent: "center", alignItems: "center", marginRight: 14 },
  candidateInitials: { fontSize: 18, fontWeight: "700", color: "#fff" },
  candidateInfo: { flex: 1 },
  candidateName: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 2 },
  candidateEmail: { fontSize: 13, color: "#6B7280", marginBottom: 8 },
  candidateMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  candidateDate: { fontSize: 12, color: "#9CA3AF" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "#fff" },
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 24 },
  modalHeaderContent: { flexDirection: "row", alignItems: "flex-start" },
  modalHeaderIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(255, 255, 255, 0.2)", justifyContent: "center", alignItems: "center", marginRight: 14 },
  modalHeaderText: { flex: 1 },
  modalTitle: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: "rgba(255, 255, 255, 0.8)", lineHeight: 18 },
  modalCloseButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.2)", justifyContent: "center", alignItems: "center" },

  // Step Indicator
  stepIndicatorWrapper: { marginTop: 20 },
  stepContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255, 255, 255, 0.2)", justifyContent: "center", alignItems: "center" },
  stepCircleActive: { backgroundColor: "rgba(255, 255, 255, 0.9)" },
  stepCircleCurrent: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  stepNumber: { fontSize: 14, fontWeight: "700", color: "rgba(255, 255, 255, 0.6)" },
  stepNumberActive: { color: "#4F46E5" },
  stepLine: { width: 60, height: 3, backgroundColor: "rgba(255, 255, 255, 0.2)", marginHorizontal: 8, borderRadius: 2 },
  stepLineActive: { backgroundColor: "rgba(255, 255, 255, 0.9)" },
  stepLabelsContainer: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, marginTop: 10 },
  stepLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255, 255, 255, 0.5)", textAlign: "center", width: 80 },
  stepLabelActive: { color: "rgba(255, 255, 255, 0.9)" },

  // Modal Body
  modalBody: { maxHeight: 420, paddingHorizontal: 20 },
  stepContent: { paddingVertical: 20 },
  stepHeader: { flexDirection: "row", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  stepIconGradient: { width: 52, height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 14 },
  stepHeaderText: { flex: 1 },
  stepTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 4 },
  stepSubtitle: { fontSize: 13, color: "#6B7280", lineHeight: 18 },

  // Form Inputs
  formInputContainer: { marginBottom: 18 },
  formLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  formIconBadge: { width: 24, height: 24, borderRadius: 6, justifyContent: "center", alignItems: "center", marginRight: 8 },
  formLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  requiredStar: { color: "#EF4444" },
  formInput: { backgroundColor: "#F9FAFB", borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#111827" },
  formTextArea: { height: 110, textAlignVertical: "top", paddingTop: 14 },
  formPickerWrapper: { backgroundColor: "#F9FAFB", borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 12, overflow: "hidden" },
  formPicker: { marginHorizontal: -8 },

  // Salary Row
  salaryRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 18 },
  salaryInputWrapper: { flex: 1 },
  salaryInputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 12 },
  currencySymbol: { fontSize: 16, fontWeight: "600", color: "#6B7280", marginRight: 4 },
  salaryInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: "#111827" },
  salaryDivider: { paddingHorizontal: 12, paddingBottom: 14 },
  salaryDividerText: { fontSize: 13, color: "#9CA3AF", fontWeight: "500" },
  rowInputs: { flexDirection: "row", gap: 12 },
  halfInput: { flex: 1 },

  // Modal Footer
  modalFooter: { flexDirection: "row", padding: 20, paddingTop: 16, gap: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6", backgroundColor: "#FAFAFA" },
  footerButtonSecondary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 14, backgroundColor: "#EEF2FF", gap: 8 },
  footerButtonSecondaryText: { fontSize: 15, fontWeight: "600", color: "#6366F1" },
  footerButtonPrimary: { flex: 2, borderRadius: 14, overflow: "hidden" },
  footerButtonGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  footerButtonPrimaryText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // New Modal Styles (matching image design)
  modalHeaderNew: { flexDirection: "row", alignItems: "flex-start", padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", backgroundColor: "#fff" },
  modalHeaderLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start" },
  modalIconCircle: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  modalTitleNew: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 4 },
  modalSubtitleNew: { fontSize: 13, color: "#6B7280", lineHeight: 18, maxWidth: 280 },
  modalHeaderRight: { alignItems: "flex-end" },
  newOpportunityBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4, marginBottom: 6 },
  newOpportunityText: { fontSize: 12, fontWeight: "600", color: "#3B82F6" },
  statusLabel: { fontSize: 11, color: "#9CA3AF" },
  statusValue: { color: "#10B981", fontWeight: "600" },
  closeButtonNew: { position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  modalBodyNew: { flex: 1, backgroundColor: "#F9FAFB" },
  
  // Section Card
  sectionCard: { backgroundColor: "#fff", margin: 16, marginBottom: 8, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  sectionTitleNew: { fontSize: 11, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5, marginBottom: 4 },
  sectionSubtitleNew: { fontSize: 13, color: "#9CA3AF", marginBottom: 20 },
  
  // Form Fields
  formRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  formFieldHalf: { flex: 1 },
  formFieldThird: { flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: "500", color: "#374151", marginBottom: 8 },
  required: { color: "#EF4444" },
  fieldInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827" },
  fieldInputFocused: { borderColor: "#3B82F6", borderWidth: 2 },
  pickerWrapper: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, overflow: "hidden" },
  pickerStyle: { marginHorizontal: -8, marginVertical: -4 },
  
  // Narrative Fields
  narrativeField: { marginBottom: 20 },
  narrativeLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  narrativeLabel: { fontSize: 13, fontWeight: "500", color: "#374151" },
  formattingBar: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  formattingText: { fontSize: 12, color: "#9CA3AF" },
  formatBtn: { width: 28, height: 28, borderRadius: 4, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
  formatBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  narrativeInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827", minHeight: 100, textAlignVertical: "top" },
  
  // New Modal Footer
  modalFooterNew: { flexDirection: "row", justifyContent: "flex-end", padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB", backgroundColor: "#fff" },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: "#F3F4F6" },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  createBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, backgroundColor: "#3B82F6" },
  createBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  // Filter Row
  filterRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  searchInputWrapperLarge: { flex: 2, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12, height: 44 },
  searchInputLarge: { flex: 1, fontSize: 14, color: "#111827", paddingVertical: 10 },
  filterPickerWrapper: { flex: 1, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", height: 44, justifyContent: "center", overflow: "hidden" },
  filterPicker: { marginHorizontal: -8, marginVertical: -8 },

  // Table Styles
  tableContainer: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  tableHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  tableHeaderLeft: { flex: 1 },
  tableTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 4 },
  tableSubtitle: { fontSize: 13, color: "#6B7280" },
  tableHeaderRight: { alignItems: "flex-end" },
  addVacancyBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EFF6FF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addVacancyBtnText: { fontSize: 13, fontWeight: "600", color: "#3B82F6" },

  // Column Headers
  columnHeaderRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#F9FAFB", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  columnHeader: { fontSize: 12, fontWeight: "500", color: "#6B7280", textTransform: "capitalize" },

  // Table Row
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  tableCell: { fontSize: 14, color: "#374151" },
  tableCellTitle: { fontWeight: "600", color: "#111827" },
  tableCellLocation: { flexDirection: "row", alignItems: "center", gap: 4 },

  // Status Badge
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusOpen: { backgroundColor: "#DBEAFE" },
  statusClosed: { backgroundColor: "#FEE2E2" },
  statusText: { fontSize: 12, fontWeight: "600" },
  statusTextOpen: { color: "#1D4ED8" },
  statusTextClosed: { color: "#DC2626" },

  // Social Media Icons
  socialMediaIcons: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },

  // Action Buttons
  actionButtons: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  actionBtn: { width: 32, height: 32, borderRadius: 6, justifyContent: "center", alignItems: "center", backgroundColor: "#F9FAFB" },

  // New Vacancy Card Styles
  vacancyListContainer: { paddingHorizontal: 0 },
  emptyStateInner: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
  vacancyCardNew: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 16, paddingBottom: 12 },
  cardTitleSection: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  cardDepartment: { fontSize: 13, color: "#6B7280" },
  cardInfoRow: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 12, gap: 16 },
  cardInfoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardInfoText: { fontSize: 13, color: "#6B7280" },
  cardStatsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#F9FAFB", borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  cardStatItem: { flex: 1, alignItems: "center" },
  cardStatValue: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 2 },
  cardStatLabel: { fontSize: 11, color: "#9CA3AF", textTransform: "uppercase" },
  cardStatDivider: { width: 1, height: 30, backgroundColor: "#E5E7EB" },
  socialIconsRow: { flexDirection: "row", gap: 8, marginBottom: 2 },
  cardActionsRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  cardActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 6, borderRightWidth: 1, borderRightColor: "#F3F4F6" },
  cardActionText: { fontSize: 12, fontWeight: "500", color: "#6B7280" },
  cardActionBtnDanger: { borderRightWidth: 0 },
  cardActionTextDanger: { color: "#EF4444" },

  // View Modal Styles
  viewModalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  viewModalContainer: { backgroundColor: "#fff", borderRadius: 12, width: "100%", maxWidth: 500, maxHeight: "85%", overflow: "hidden" },
  viewModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20, paddingBottom: 16 },
  viewModalTitleSection: { flex: 1, marginRight: 16 },
  viewModalTitle: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 4 },
  viewModalSubtitle: { fontSize: 14, color: "#6B7280" },
  viewModalCloseBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  viewModalBody: { paddingHorizontal: 20, maxHeight: 400 },
  viewInfoGrid: { flexDirection: "row", marginBottom: 16 },
  viewInfoItem: { flex: 1 },
  viewInfoLabel: { fontSize: 12, color: "#9CA3AF", marginBottom: 4 },
  viewInfoValue: { fontSize: 15, fontWeight: "600", color: "#111827" },
  viewSection: { marginBottom: 20 },
  viewSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  viewSectionTitle: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
  viewSectionContent: { fontSize: 14, color: "#374151", lineHeight: 22 },
  socialMediaRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  socialMediaItem: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  socialMediaItemActive: { backgroundColor: "#EFF6FF" },
  viewModalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB", alignItems: "flex-end" },
  viewModalCloseButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: "#F3F4F6" },
  viewModalCloseButtonText: { fontSize: 14, fontWeight: "600", color: "#374151" },

  // Share Modal Styles
  shareModalContainer: { backgroundColor: "#fff", borderRadius: 12, width: "100%", maxWidth: 480, maxHeight: "80%", overflow: "hidden" },
  shareModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20, paddingBottom: 16 },
  shareModalTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 4 },
  shareModalSubtitle: { fontSize: 13, color: "#6B7280", maxWidth: 320 },
  shareModalBody: { paddingHorizontal: 20, paddingBottom: 10 },
  sharePlatformItem: { marginBottom: 16 },
  sharePlatformHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  shareCheckbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#D1D5DB", justifyContent: "center", alignItems: "center" },
  shareCheckboxActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  sharePlatformName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  sharePlatformInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827" },
  shareModalFooter: { flexDirection: "row", justifyContent: "flex-end", padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  shareCancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB" },
  shareCancelBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  sharePostBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: "#3B82F6" },
  sharePostBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});
