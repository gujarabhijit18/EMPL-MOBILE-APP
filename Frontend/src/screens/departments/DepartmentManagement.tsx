import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { apiService, DepartmentManager, DepartmentResponse } from "../../lib/api";

export default function DepartmentManagement() {
  const navigation = useNavigation();
  const { isDarkMode, colors } = useTheme();
  
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(headerTranslateY, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
    ]).start();
  }, []);

  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [managers, setManagers] = useState<DepartmentManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<number | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentResponse | null>(null);

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await apiService.getDepartments();
      setDepartments(data);
    } catch (error: any) {
      console.error("Failed to fetch departments:", error);
      Alert.alert("Error", error.message || "Failed to load departments");
    }
  }, []);

  const fetchManagers = useCallback(async () => {
    try {
      const data = await apiService.getDepartmentManagers();
      setManagers(data);
    } catch (error: any) {
      console.error("Failed to fetch managers:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDepartments(), fetchManagers()]);
      setLoading(false);
    };
    loadData();
  }, [fetchDepartments, fetchManagers]);

  useFocusEffect(
    useCallback(() => {
      fetchDepartments();
      fetchManagers();
    }, [fetchDepartments, fetchManagers])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchDepartments(), fetchManagers()]);
    setRefreshing(false);
  }, [fetchDepartments, fetchManagers]);

  const handleDelete = (id: number) => {
    const dept = departments.find((d) => d.id === id);
    if (dept?.employee_count && dept.employee_count > 0) {
      Alert.alert("Error", "Cannot delete department with active employees.");
      return;
    }
    Alert.alert("Confirm Delete", `Are you sure you want to delete "${dept?.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await apiService.deleteDepartment(id);
            setDepartments((prev) => prev.filter((d) => d.id !== id));
            Alert.alert("Success", "Department deleted successfully.");
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to delete department");
          }
        },
      },
    ]);
  };

  const handleToggleStatus = async (dept: DepartmentResponse) => {
    const newStatus = dept.status === "active" ? "inactive" : "active";
    try {
      await apiService.updateDepartment(dept.id, { status: newStatus });
      setDepartments((prev) => prev.map((d) => d.id === dept.id ? { ...d, status: newStatus } : d));
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update status");
    }
  };

  const filtered = departments.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    const matchesManager = !managerFilter || d.manager_id === managerFilter;
    return matchesSearch && matchesStatus && matchesManager;
  });

  const totalDepartments = departments.length;
  const activeDepartments = departments.filter(d => d.status === "active").length;
  const totalEmployees = departments.reduce((sum, d) => sum + (d.employee_count || 0), 0);
  const totalBudget = departments.reduce((sum, d) => sum + (d.budget || 0), 0);

  const getManagerName = (managerId?: number) => {
    if (!managerId) return "N/A";
    return managers.find((m) => m.id === managerId)?.name || "N/A";
  };

  const openView = (dept: DepartmentResponse) => { setSelectedDept(dept); setViewModalVisible(true); };
  const openEdit = (dept: DepartmentResponse) => { (navigation as any).navigate('CreateDepartmentForm', { department: dept, managers }); };
  const openNewDepartment = () => { (navigation as any).navigate('CreateDepartmentForm', { managers }); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading departments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Animated.View style={[styles.headerTextContainer, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIcon}>
                <Ionicons name="business" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Department Management</Text>
                <Text style={styles.headerSubtitle}>Organize teams, assign managers, and keep your org structure clean.</Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Stats Cards Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#eff6ff', borderColor: '#3b82f6' }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#3b82f6' }]}>
              <Ionicons name="business" size={16} color="#fff" />
            </View>
            <Text style={[styles.statValue, { color: '#1e40af' }]}>{totalDepartments}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#ecfdf5', borderColor: '#10b981' }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#10b981' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
            </View>
            <Text style={[styles.statValue, { color: '#047857' }]}>{activeDepartments}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#eef2ff', borderColor: '#6366f1' }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#6366f1' }]}>
              <Ionicons name="people" size={16} color="#fff" />
            </View>
            <Text style={[styles.statValue, { color: '#4338ca' }]}>{totalEmployees}</Text>
            <Text style={styles.statLabel}>Staff</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#faf5ff', borderColor: '#a855f7' }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#a855f7' }]}>
              <Ionicons name="wallet" size={16} color="#fff" />
            </View>
            <Text style={[styles.statValue, { color: '#7c3aed' }]}>₹{(totalBudget / 100000).toFixed(0)}L</Text>
            <Text style={styles.statLabel}>Budget</Text>
          </View>
        </View>

        {/* Departments Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Departments</Text>
            <Text style={styles.sectionSubtitle}>Search, filter, and manage departments across the organisation.</Text>
          </View>
        </View>

        {/* Filters Row */}
        <View style={styles.filtersRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
            <TextInput placeholder="Search by name, code, or location" style={styles.searchInput} value={search} onChangeText={setSearch} placeholderTextColor="#9ca3af" />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setStatusFilter(statusFilter === "all" ? "active" : statusFilter === "active" ? "inactive" : "all")}>
            <Text style={styles.filterText}>{statusFilter === "all" ? "All Status" : statusFilter}</Text>
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Department Cards List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No departments found</Text>
              <Text style={styles.emptySubtext}>{search ? "Try a different search term" : "Add your first department"}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.codeBox, { backgroundColor: item.status === "active" ? "#3b82f6" : "#9ca3af" }]}>
                    <Text style={styles.codeText}>{item.code}</Text>
                  </View>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSubtitle}>{item.location || 'No location specified'}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.status === "active" ? "#dcfce7" : "#fee2e2" }]}>
                  <View style={[styles.statusDot, { backgroundColor: item.status === "active" ? "#16a34a" : "#ef4444" }]} />
                  <Text style={[styles.statusText, { color: item.status === "active" ? "#16a34a" : "#ef4444" }]}>{item.status}</Text>
                </View>
              </View>

              {/* Card Info Grid */}
              <View style={styles.cardInfoGrid}>
                <View style={styles.infoItem}>
                  <Ionicons name="person-outline" size={16} color="#6b7280" />
                  <Text style={styles.infoLabel}>Manager</Text>
                  <Text style={styles.infoValue}>{getManagerName(item.manager_id)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="people-outline" size={16} color="#6b7280" />
                  <Text style={styles.infoLabel}>Employees</Text>
                  <Text style={styles.infoValue}>{item.employee_count || 0}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="cash-outline" size={16} color="#6b7280" />
                  <Text style={styles.infoLabel}>Budget</Text>
                  <Text style={styles.infoValue}>₹{((item.budget || 0) / 100000).toFixed(1)}L</Text>
                </View>
              </View>

              {/* Card Description */}
              {item.description && (
                <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
              )}

              {/* Card Actions */}
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.cardActionBtn} onPress={() => openView(item)}>
                  <Ionicons name="eye-outline" size={18} color="#6b7280" />
                  <Text style={styles.cardActionText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cardActionBtn} onPress={() => openEdit(item)}>
                  <Ionicons name="create-outline" size={18} color="#3b82f6" />
                  <Text style={[styles.cardActionText, { color: "#3b82f6" }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleButton, { backgroundColor: item.status === "active" ? "#fef3c7" : "#d1fae5", borderColor: item.status === "active" ? "#f59e0b" : "#10b981" }]} 
                  onPress={() => handleToggleStatus(item)}
                >
                  <Text style={[styles.toggleButtonText, { color: item.status === "active" ? "#d97706" : "#059669" }]}>
                    {item.status === "active" ? "Deactivate" : "Activate"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cardActionBtn, styles.deleteBtn]} onPress={() => handleDelete(item.id)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={openNewDepartment} activeOpacity={0.8}>
        <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* View Department Modal */}
      <Modal visible={viewModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Department Details</Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {selectedDept && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Code</Text>
                  <Text style={styles.detailValue}>{selectedDept.code}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{selectedDept.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Manager</Text>
                  <Text style={styles.detailValue}>{getManagerName(selectedDept.manager_id)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Employees</Text>
                  <Text style={styles.detailValue}>{selectedDept.employee_count || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Budget</Text>
                  <Text style={styles.detailValue}>₹{((selectedDept.budget || 0) / 100000).toFixed(1)}L</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{selectedDept.location || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: selectedDept.status === "active" ? "#dcfce7" : "#f3f4f6" }]}>
                    <Text style={[styles.statusText, { color: selectedDept.status === "active" ? "#16a34a" : "#6b7280" }]}>{selectedDept.status}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedDept.description || 'No description'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created</Text>
                  <Text style={styles.detailValue}>{new Date(selectedDept.created_at).toLocaleDateString()}</Text>
                </View>
              </ScrollView>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalEditBtn} onPress={() => { setViewModalVisible(false); selectedDept && openEdit(selectedDept); }}>
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.modalEditText}>Edit Department</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#39549f" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#6b7280" },
  header: { backgroundColor: "#39549f", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  headerTextContainer: { flex: 1, marginLeft: 12 },
  headerTitleRow: { flexDirection: "row", alignItems: "center" },
  headerIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  fab: { position: "absolute", bottom: 90, right: 20, zIndex: 100 },
  fabGradient: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", shadowColor: "#a855f7", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  content: { flex: 1, backgroundColor: "#f8fafc", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16 },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1 },
  statIconBox: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: "600", color: "#6b7280" },
  sectionHeader: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937" },
  sectionSubtitle: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  filtersRow: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  searchContainer: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 10 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, fontSize: 14, color: "#1f2937" },
  filterButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 12, height: 40 },
  filterText: { fontSize: 13, color: "#6b7280", marginRight: 4 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 100 },
  // Card Styles
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  codeBox: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
  codeText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cardTitleContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1f2937", marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: "#6b7280" },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  cardInfoGrid: { flexDirection: "row", backgroundColor: "#f9fafb", borderRadius: 12, padding: 12, marginBottom: 12 },
  infoItem: { flex: 1, alignItems: "center" },
  infoLabel: { fontSize: 10, color: "#9ca3af", marginTop: 4, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  cardDescription: { fontSize: 13, color: "#6b7280", lineHeight: 18, marginBottom: 12 },
  cardActions: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 12, gap: 8 },
  cardActionBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#f3f4f6" },
  cardActionText: { fontSize: 13, fontWeight: "500", color: "#6b7280", marginLeft: 6 },
  toggleButton: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  toggleButtonText: { fontSize: 13, fontWeight: "600" },
  deleteBtn: { backgroundColor: "#fef2f2" },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#6b7280", marginTop: 16 },
  emptySubtext: { fontSize: 14, color: "#9ca3af", marginTop: 4 },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContainer: { backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937" },
  modalContent: { padding: 16 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  detailLabel: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  detailValue: { fontSize: 14, color: "#1f2937", fontWeight: "600", textAlign: "right", flex: 1, marginLeft: 16 },
  modalActions: { padding: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  modalEditBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#3b82f6", paddingVertical: 12, borderRadius: 8 },
  modalEditText: { color: "#fff", fontWeight: "600", marginLeft: 8 },
});
