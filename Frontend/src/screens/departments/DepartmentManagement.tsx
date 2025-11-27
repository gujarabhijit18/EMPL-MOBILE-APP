import React, { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Button, Chip, Divider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from "@react-navigation/native";
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';

interface Department {
  id: string;
  name: string;
  code: string;
  managerId: string;
  description?: string;
  status: "active" | "inactive";
  employeeCount?: number;
  budget?: number;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

const { width: screenWidth } = Dimensions.get('window');

export default function DepartmentManagement() {
  const navigation = useNavigation();
  
  // Animation values for header elements
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  
  // Next-level modal animations
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(50)).current;
  const formFieldAnimations = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0))
  ).current;
  // Animate header elements on component mount
  React.useEffect(() => {
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
  }, []);

  const [departments, setDepartments] = useState<Department[]>([
    {
      id: "1",
      name: "Engineering",
      code: "ENG",
      managerId: "manager1",
      description: "Software development and technical operations",
      status: "active",
      employeeCount: 45,
      budget: 5000000,
      location: "Building A, Floor 3",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      name: "Marketing",
      code: "MKT",
      managerId: "manager2",
      description: "Marketing and communications",
      status: "active",
      employeeCount: 20,
      budget: 2000000,
      location: "Building B, Floor 2",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState<Partial<Department>>({
    name: "",
    code: "",
    managerId: "",
    description: "",
    status: "active",
    employeeCount: 0,
    budget: 0,
    location: "",
  });

  const managers = [
    { id: "manager1", name: "John Smith" },
    { id: "manager2", name: "Sarah Johnson" },
    { id: "manager3", name: "Michael Chen" },
  ];

  // ✅ Next-level modal animations
  const animateModalOpen = () => {
    // Reset animation values
    modalScale.setValue(0.8);
    modalOpacity.setValue(0);
    modalTranslateY.setValue(50);
    formFieldAnimations.forEach(anim => anim.setValue(0));

    // Animate modal entrance
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(modalTranslateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
    ]).start();

    // Stagger form field animations
    const fieldAnimations = formFieldAnimations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      })
    );
    
    Animated.stagger(50, fieldAnimations).start();
  };

  const animateModalClose = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  // ✅ Reset form fields
  const resetForm = () => {
    setForm({
      name: "",
      code: "",
      managerId: "",
      description: "",
      status: "active",
      employeeCount: 0,
      budget: 0,
      location: "",
    });
    setSelectedDept(null);
  };

  // ✅ Create or Update Department (offline)
  const handleSave = () => {
    if (!form.name || !form.code || !form.managerId) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    if (editMode && selectedDept) {
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === selectedDept.id
            ? { ...d, ...form, updatedAt: new Date().toISOString() }
            : d
        )
      );
      Alert.alert("Updated", "Department updated successfully!");
    } else {
      const newDept: Department = {
        id: Date.now().toString(),
        name: form.name!,
        code: form.code!.toUpperCase(),
        managerId: form.managerId!,
        description: form.description,
        status: form.status as "active" | "inactive",
        employeeCount: form.employeeCount || 0,
        budget: form.budget || 0,
        location: form.location,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDepartments((prev) => [...prev, newDept]);
      Alert.alert("Created", "Department added successfully!");
    }

    setModalVisible(false);
    resetForm();
    setEditMode(false);
  };

  // ✅ Delete Department (local)
  const handleDelete = (id: string) => {
    const dept = departments.find((d) => d.id === id);
    if (dept?.employeeCount && dept.employeeCount > 0) {
      Alert.alert("Error", "Cannot delete department with active employees.");
      return;
    }
    setDepartments((prev) => prev.filter((d) => d.id !== id));
    Alert.alert("Deleted", "Department removed successfully.");
  };

  // ✅ Filter Departments
  const filtered = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ Stats
  const totalEmployees = departments.reduce(
    (sum, d) => sum + (d.employeeCount || 0),
    0
  );
  const totalBudget = departments.reduce((sum, d) => sum + (d.budget || 0), 0);

  // ✅ Navigate to edit department form
  const openEdit = (dept: Department) => {
    (navigation as any).navigate('CreateDepartmentForm', { department: dept });
  };

  // ✅ Navigate to full-page department form
  const openNewDepartment = () => {
    (navigation as any).navigate('CreateDepartmentForm');
  };

  // ✅ Close modal with animation
  const closeModal = () => {
    animateModalClose(() => {
      setModalVisible(false);
      resetForm();
    });
  };

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
      <StatusBar style="light" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Animated.View 
            style={[
              styles.headerTextContainer,
              { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }
            ]}
          >
            <Text style={styles.headerTitle}>Department Management</Text>
            <Text style={styles.headerSubtitle}>Organize company structure</Text>
          </Animated.View>
        </View>
        
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <Card style={styles.statsCard}>
            <Ionicons name="business" size={20} color="#3b82f6" style={styles.statsIcon} />
            <Text style={styles.cardLabel}>Departments</Text>
            <Text style={styles.cardValue}>{departments.length}</Text>
          </Card>
          <Card style={styles.statsCard}>
            <Ionicons name="people" size={20} color="#10b981" style={styles.statsIcon} />
            <Text style={styles.cardLabel}>Employees</Text>
            <Text style={styles.cardValue}>{totalEmployees}</Text>
          </Card>
          <Card style={styles.statsCard}>
            <Ionicons name="cash" size={20} color="#f59e0b" style={styles.statsIcon} />
            <Text style={styles.cardLabel}>Budget (₹L)</Text>
            <Text style={styles.cardValue}>{(totalBudget / 100000).toFixed(1)}</Text>
          </Card>
        </View>
      </View>
      
      <View style={styles.contentContainer}>

      {/* 🔍 Search + ➕ Add */}
      <View style={styles.rowBetween}>
        <TextInput
          placeholder="Search department..."
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
        <Button
          mode="contained"
          onPress={openNewDepartment}
        >
          + Add
        </Button>
      </View>

      {/* 🏢 Department List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const manager = managers.find((m) => m.id === item.managerId)?.name;
          return (
            <Card style={styles.deptCard}>
              <View style={styles.deptRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deptTitle}>
                    {item.name} ({item.code})
                  </Text>
                  <Text style={styles.deptDesc}>{item.description}</Text>
                  <Text style={styles.deptMeta}>Manager: {manager || "N/A"}</Text>
                  <Text style={styles.deptMeta}>
                    Employees: {item.employeeCount} | ₹
                    {(item.budget! / 100000).toFixed(1)}L
                  </Text>
                  <Chip
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor:
                          item.status === "active" ? "#22c55e30" : "#9ca3af40",
                      },
                    ]}
                  >
                    {item.status}
                  </Chip>
                </View>

                {/* ✏️ Actions */}
                <View style={styles.iconActions}>
                  <TouchableOpacity onPress={() => openEdit(item)}>
                    <Ionicons name="create-outline" size={22} color="#2563eb" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={{ marginLeft: 16 }}
                  >
                    <Ionicons name="trash-outline" size={22} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        }}
      />

      </View>
      
      {/* 🚀 Next-Level Department Modal */}
      <Modal visible={modalVisible} animationType="none" transparent>
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                opacity: modalOpacity,
                transform: [
                  { scale: modalScale },
                  { translateY: modalTranslateY }
                ]
              }
            ]}
          >
            {/* Gradient Header */}
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientHeader}
            >
              <View style={styles.modalHeaderContent}>
                <View style={styles.headerIconContainer}>
                  <Ionicons name="business" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalHeaderTextContainer}>
                  <Text style={styles.modalTitle}>
                    {editMode ? "Edit Department" : "Create New Department"}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {editMode ? "Update department information" : "Add a new department to your organization"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeModal}
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Animated Row 1: Department Name & Department Code */}
              <Animated.View 
                style={[
                  styles.formRow,
                  {
                    opacity: formFieldAnimations[0],
                    transform: [{ translateY: formFieldAnimations[0].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })}]
                  }
                ]}
              >
                <View style={styles.formFieldHalf}>
                  <Text style={styles.fieldLabel}>
                    <Ionicons name="business-outline" size={16} color="#667eea" /> Department Name *
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.formInput, form.name ? styles.formInputFilled : null]}
                      value={form.name}
                      onChangeText={(v) => setForm({ ...form, name: v })}
                      placeholder="Enter department name"
                      placeholderTextColor="#9ca3af"
                    />
                    {form.name && (
                      <View style={styles.inputIcon}>
                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.fieldLabel}>
                    <Ionicons name="code-outline" size={16} color="#667eea" /> Department Code *
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.formInput, styles.codeInput, form.code ? styles.formInputFilled : null]}
                      value={form.code}
                      onChangeText={(v) => setForm({ ...form, code: v.toUpperCase() })}
                      placeholder="e.g., ENG, MKT, HR"
                      placeholderTextColor="#9ca3af"
                      maxLength={5}
                    />
                    {form.code && (
                      <View style={styles.inputIcon}>
                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>

              {/* Row 2: Department Manager & Status */}
              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.fieldLabel}>Department Manager *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={form.managerId}
                      onValueChange={(itemValue) =>
                        setForm({ ...form, managerId: itemValue })
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Manager" value="" />
                      {managers.map((manager) => (
                        <Picker.Item
                          key={manager.id}
                          label={manager.name}
                          value={manager.id}
                        />
                      ))}
                    </Picker>
                    <Ionicons name="chevron-down" size={20} color="#6b7280" style={styles.pickerIcon} />
                  </View>
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={form.status}
                      onValueChange={(itemValue) =>
                        setForm({ ...form, status: itemValue as "active" | "inactive" })
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="Active" value="active" />
                      <Picker.Item label="Inactive" value="inactive" />
                    </Picker>
                    <Ionicons name="chevron-down" size={20} color="#6b7280" style={styles.pickerIcon} />
                  </View>
                </View>
              </View>

              {/* Row 3: Number of Employees & Annual Budget */}
              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.fieldLabel}>Number of Employees</Text>
                  <View style={styles.numberInputContainer}>
                    <TextInput
                      style={styles.numberInput}
                      value={String(form.employeeCount || "")}
                      onChangeText={(v) =>
                        setForm({ ...form, employeeCount: parseInt(v) || 0 })
                      }
                      keyboardType="numeric"
                      placeholder="0"
                    />
                    <TouchableOpacity
                      style={styles.numberButton}
                      onPress={() =>
                        setForm({ ...form, employeeCount: (form.employeeCount || 0) + 1 })
                      }
                    >
                      <Ionicons name="chevron-up" size={16} color="#6b7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.numberButton}
                      onPress={() =>
                        setForm({
                          ...form,
                          employeeCount: Math.max(0, (form.employeeCount || 0) - 1),
                        })
                      }
                    >
                      <Ionicons name="chevron-down" size={16} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.fieldLabel}>Annual Budget (₹)</Text>
                  <View style={styles.numberInputContainer}>
                    <TextInput
                      style={styles.numberInput}
                      value={String(form.budget || "")}
                      onChangeText={(v) => setForm({ ...form, budget: parseInt(v) || 0 })}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                    <TouchableOpacity
                      style={styles.numberButton}
                      onPress={() =>
                        setForm({ ...form, budget: (form.budget || 0) + 100000 })
                      }
                    >
                      <Ionicons name="chevron-up" size={16} color="#6b7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.numberButton}
                      onPress={() =>
                        setForm({
                          ...form,
                          budget: Math.max(0, (form.budget || 0) - 100000),
                        })
                      }
                    >
                      <Ionicons name="chevron-down" size={16} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Location Field */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Location</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.location}
                  onChangeText={(v) => setForm({ ...form, location: v })}
                  placeholder="e.g., Building A, Floor 3"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Description Field */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={form.description}
                  onChangeText={(v) => setForm({ ...form, description: v })}
                  placeholder="Brief description of the department's responsibilities..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* Next-Level Action Buttons */}
            <LinearGradient
              colors={['#f8fafc', '#ffffff']}
              style={styles.modalActions}
            >
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
                activeOpacity={0.8}
              >
                <Ionicons name="close-outline" size={20} color="#6b7280" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createButton}
              >
                <TouchableOpacity
                  style={styles.createButtonInner}
                  onPress={handleSave}
                  activeOpacity={0.9}
                >
                  <Ionicons name="checkmark-outline" size={20} color="#ffffff" />
                  <Text style={styles.createButtonText}>
                    {editMode ? "Update Department" : "Create Department"}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#39549fff",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
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
  headerIconButton: {
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
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 10,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsIcon: {
    marginBottom: 6,
  },
  cardLabel: { 
    fontSize: 12, 
    color: "#6b7280",
    marginBottom: 4,
  },
  cardValue: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#111827" 
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 10,
    flex: 1,
    marginRight: 10,
    height: 45,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  deptCard: { marginVertical: 5, padding: 12 },
  deptRow: { flexDirection: "row", justifyContent: "space-between" },
  deptTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 3 },
  deptDesc: { color: "#6b7280" },
  deptMeta: { color: "#4b5563", fontSize: 13 },
  statusChip: { marginTop: 6, alignSelf: "flex-start" },
  iconActions: { flexDirection: "row", alignItems: "center" },
  // 🚀 Next-Level Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 15,
    overflow: 'hidden',
  },
  gradientHeader: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalHeaderTextContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 16,
  },
  formField: {
    marginBottom: 20,
  },
  formFieldHalf: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  formInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formInputFilled: {
    borderColor: '#667eea',
    backgroundColor: '#f8faff',
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
  },
  codeInput: {
    textTransform: 'uppercase',
  },
  pickerContainer: {
    position: 'relative',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  picker: {
    height: 48,
    color: '#1f2937',
  },
  pickerIcon: {
    position: 'absolute',
    right: 12,
    top: 14,
    pointerEvents: 'none',
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  numberInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  numberButton: {
    width: 32,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  createButton: {
    flex: 2,
    borderRadius: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  // Legacy styles (keeping for compatibility)
  modalBox: { padding: 20, backgroundColor: "white", flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
});
