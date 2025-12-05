import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar, setStatusBarBackgroundColor, setStatusBarStyle } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Modal,
    Platform,
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

// Header gradient primary color for status bar
const HEADER_PRIMARY_COLOR = "#764ba2";

const { width } = Dimensions.get("window");

export default function DepartmentManagement() {
  const navigation = useNavigation();
  const { isDarkMode, colors } = useTheme();
  
  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  
  // Set status bar to match header gradient color
  useEffect(() => {
    if (Platform.OS === "android") {
      setStatusBarBackgroundColor(HEADER_PRIMARY_COLOR, true);
    }
    setStatusBarStyle("light");
  }, []);

  // Animate on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(statsAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(listAnim, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.spring(fabAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        delay: 500,
        useNativeDriver: true,
      }),
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
    const hasEmployees = dept?.employee_count && dept.employee_count > 0;
    
    const message = hasEmployees 
      ? `Are you sure you want to delete "${dept?.name}"?\n\nThis department has ${dept.employee_count} employee(s). The employees will NOT be deleted, but their department assignment will remain as "${dept?.name}".`
      : `Are you sure you want to delete "${dept?.name}"?`;
    
    Alert.alert("Confirm Delete", message, [
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
  const inactiveDepartments = departments.filter(d => d.status === "inactive").length;
  const totalEmployees = departments.reduce((sum, d) => sum + (d.employee_count || 0), 0);
  const totalBudget = departments.reduce((sum, d) => sum + (d.budget || 0), 0);

  const getManagerName = (managerId?: number) => {
    if (!managerId) return "Not Assigned";
    return managers.find((m) => m.id === managerId)?.name || "Not Assigned";
  };

  const openView = (dept: DepartmentResponse) => { setSelectedDept(dept); setViewModalVisible(true); };
  
  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentResponse | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    manager_id: null as number | null,
    description: '',
    status: 'active' as 'active' | 'inactive',
    employee_count: 0,
    budget: 0,
    location: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);

  const openEdit = (dept: DepartmentResponse) => {
    setEditingDept(dept);
    setEditForm({
      name: dept.name || '',
      code: dept.code || '',
      manager_id: dept.manager_id || null,
      description: dept.description || '',
      status: (dept.status as 'active' | 'inactive') || 'active',
      employee_count: dept.employee_count || 0,
      budget: dept.budget || 0,
      location: dept.location || '',
    });
    setManagerSearch('');
    setShowManagerDropdown(false);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingDept(null);
    setManagerSearch('');
    setShowManagerDropdown(false);
  };

  const handleEditSubmit = async () => {
    if (!editingDept) return;
    if (!editForm.name.trim()) {
      Alert.alert('Error', 'Department name is required');
      return;
    }
    if (!editForm.code.trim()) {
      Alert.alert('Error', 'Department code is required');
      return;
    }

    setEditSubmitting(true);
    try {
      await apiService.updateDepartment(editingDept.id, {
        name: editForm.name,
        code: editForm.code.toUpperCase(),
        manager_id: editForm.manager_id || undefined,
        description: editForm.description || undefined,
        status: editForm.status,
        budget: editForm.budget,
        location: editForm.location || undefined,
      });
      await fetchDepartments();
      closeEditModal();
      Alert.alert('Success', 'Department updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update department');
    } finally {
      setEditSubmitting(false);
    }
  };

  const departmentManagers = managers.filter(m => 
    editingDept && 
    m.department && 
    m.department.toLowerCase() === editingDept.name.toLowerCase() &&
    m.role.toLowerCase() === 'manager'
  );
  
  const filteredEditManagers = departmentManagers.filter(m =>
    m.name.toLowerCase().includes(managerSearch.toLowerCase())
  );

  const selectedEditManager = departmentManagers.find(m => m.id === editForm.manager_id) || 
    managers.find(m => m.id === editForm.manager_id);

  // Create Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    manager_id: null as number | null,
    description: '',
    status: 'active' as 'active' | 'inactive',
    employee_count: 0,
    budget: 0,
    location: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createManagerSearch, setCreateManagerSearch] = useState('');
  const [showCreateManagerDropdown, setShowCreateManagerDropdown] = useState(false);

  const openNewDepartment = () => {
    setCreateForm({
      name: '',
      code: '',
      manager_id: null,
      description: '',
      status: 'active',
      employee_count: 0,
      budget: 0,
      location: '',
    });
    setCreateManagerSearch('');
    setShowCreateManagerDropdown(false);
    setCreateModalVisible(true);
  };

  const closeCreateModal = () => {
    setCreateModalVisible(false);
    setCreateManagerSearch('');
    setShowCreateManagerDropdown(false);
  };

  const handleCreateSubmit = async () => {
    if (!createForm.name.trim()) {
      Alert.alert('Error', 'Department name is required');
      return;
    }
    if (!createForm.code.trim()) {
      Alert.alert('Error', 'Department code is required');
      return;
    }

    setCreateSubmitting(true);
    try {
      await apiService.createDepartment({
        name: createForm.name,
        code: createForm.code.toUpperCase(),
        manager_id: createForm.manager_id || undefined,
        description: createForm.description || undefined,
        status: createForm.status,
        budget: createForm.budget,
        location: createForm.location || undefined,
      });
      await fetchDepartments();
      closeCreateModal();
      Alert.alert('Success', 'Department created successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create department');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const filteredCreateManagers = managers.filter(m =>
    m.name.toLowerCase().includes(createManagerSearch.toLowerCase()) ||
    m.role.toLowerCase().includes(createManagerSearch.toLowerCase()) ||
    (m.department && m.department.toLowerCase().includes(createManagerSearch.toLowerCase()))
  );

  const selectedCreateManager = managers.find(m => m.id === createForm.manager_id);

  const [syncing, setSyncing] = useState(false);

  // Employee List Modal State
  const [employeeListModalVisible, setEmployeeListModalVisible] = useState(false);
  const [departmentEmployees, setDepartmentEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const fetchDepartmentEmployees = async (deptName: string) => {
    setLoadingEmployees(true);
    try {
      const allEmployees = await apiService.getEmployees();
      const filtered = allEmployees.filter((emp: any) => emp.department?.toLowerCase() === deptName.toLowerCase());
      setDepartmentEmployees(filtered);
    } catch (error: any) {
      console.error("Failed to fetch employees:", error);
      setDepartmentEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const openEmployeeList = async (dept: DepartmentResponse) => {
    setSelectedDept(dept);
    setViewModalVisible(false);
    await fetchDepartmentEmployees(dept.name);
    setEmployeeListModalVisible(true);
  };
  
  const handleSyncDepartments = async () => {
    Alert.alert(
      "Sync Departments",
      "This will automatically create departments based on existing users' department data. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sync",
          onPress: async () => {
            try {
              setSyncing(true);
              const result = await apiService.syncDepartmentsFromUsers();
              await fetchDepartments();
              if (result.created_departments.length > 0) {
                Alert.alert("Success", `Created ${result.created_departments.length} new departments:\n${result.created_departments.join(", ")}`);
              } else {
                Alert.alert("Info", "All departments are already synced. No new departments created.");
              }
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to sync departments");
            } finally {
              setSyncing(false);
            }
          },
        },
      ]
    );
  };

  // Filter Modal State
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const getStatusColor = (status: string) => {
    return status === "active" 
      ? { bg: '#dcfce7', text: '#16a34a', dot: '#22c55e' }
      : { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" backgroundColor={HEADER_PRIMARY_COLOR} translucent={false} />
        <LinearGradient colors={[HEADER_PRIMARY_COLOR, "#764ba2"]} style={styles.loadingGradient}>
          <View style={styles.loadingContainer}>
            <View style={styles.loadingIconBox}>
              <Ionicons name="business" size={40} color="#fff" />
            </View>
            <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
            <Text style={styles.loadingText}>Loading departments...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const renderDepartmentCard = ({ item, index }: { item: DepartmentResponse; index: number }) => {
    const statusColor = getStatusColor(item.status);
    const cardAnim = new Animated.Value(0);
    
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 80,
      useNativeDriver: true,
      easing: Easing.out(Easing.back(1.2)),
    }).start();

    return (
      <Animated.View style={[
        styles.card,
        {
          opacity: cardAnim,
          transform: [{ 
            translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] })
          }]
        }
      ]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <LinearGradient 
              colors={item.status === "active" ? ['#7d57a3ff', '#7d57a3ff'] : ['#9ca3af', '#6b7280']} 
              style={styles.codeBox}
            >
              <Text style={styles.codeText}>{item.code}</Text>
            </LinearGradient>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color="#9ca3af" />
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  {item.location || 'No location'}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor.dot }]} />
            <Text style={[styles.statusText, { color: statusColor.text }]}>{item.status}</Text>
          </View>
        </View>

        {/* Card Stats Grid */}
        <View style={styles.cardStatsGrid}>
          <View style={styles.cardStatItem}>
            <View style={[styles.cardStatIcon, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="person" size={14} color="#3b82f6" />
            </View>
            <View>
              <Text style={styles.cardStatLabel}>Manager</Text>
              <Text style={styles.cardStatValue} numberOfLines={1}>{getManagerName(item.manager_id)}</Text>
            </View>
          </View>
          <View style={styles.cardStatItem}>
            <View style={[styles.cardStatIcon, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="people" size={14} color="#22c55e" />
            </View>
            <View>
              <Text style={styles.cardStatLabel}>Employees</Text>
              <Text style={styles.cardStatValue}>{item.employee_count || 0}</Text>
            </View>
          </View>
          <View style={styles.cardStatItem}>
            <View style={[styles.cardStatIcon, { backgroundColor: '#faf5ff' }]}>
              <Ionicons name="wallet" size={14} color="#a855f7" />
            </View>
            <View>
              <Text style={styles.cardStatLabel}>Budget</Text>
              <Text style={styles.cardStatValue}>₹{((item.budget || 0) / 100000).toFixed(1)}L</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {item.description && (
          <View style={styles.descriptionBox}>
            <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
          </View>
        )}

        {/* Card Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openView(item)}>
            <Ionicons name="eye-outline" size={18} color="#6b7280" />
            <Text style={styles.actionBtnText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => openEdit(item)}>
            <Ionicons name="create-outline" size={18} color="#667eea" />
            <Text style={[styles.actionBtnText, { color: '#667eea' }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.toggleBtn, 
              { backgroundColor: item.status === "active" ? '#fef3c7' : '#d1fae5' }
            ]} 
            onPress={() => handleToggleStatus(item)}
          >
            <Ionicons 
              name={item.status === "active" ? "pause-circle-outline" : "play-circle-outline"} 
              size={16} 
              color={item.status === "active" ? "#d97706" : "#059669"} 
            />
            <Text style={[styles.toggleBtnText, { color: item.status === "active" ? "#d97706" : "#059669" }]}>
              {item.status === "active" ? "Deactivate" : "Activate"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" backgroundColor={HEADER_PRIMARY_COLOR} translucent={false} />
      
      {/* Modern Gradient Header */}
      <LinearGradient colors={[HEADER_PRIMARY_COLOR, "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        {/* Background Pattern */}
        <View style={styles.headerPattern}>
          <View style={[styles.patternCircle, { top: -30, right: -30, width: 140, height: 140 }]} />
          <View style={[styles.patternCircle, { bottom: -40, left: -40, width: 160, height: 160 }]} />
          <View style={[styles.patternCircle, { top: 50, right: 80, width: 60, height: 60 }]} />
        </View>

        <Animated.View style={[styles.headerContent, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
          {/* Header Top */}
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.iconBadge}>
                <LinearGradient colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]} style={styles.iconBadgeGradient}>
                  <Ionicons name="business" size={24} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.headerTextSection}>
                <Text style={styles.headerTitle}>Departments</Text>
                <Text style={styles.headerSubtitle}>Manage your organization</Text>
              </View>
            </View>

          </View>
        </Animated.View>
      </LinearGradient>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Stats Cards */}
        <Animated.View style={[styles.statsContainer, { opacity: statsAnim, transform: [{ scale: statsAnim }] }]}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconBoxSmall, { backgroundColor: '#f0f0ff' }]}>
                <Ionicons name="business" size={18} color="#667eea" />
              </View>
              <Text style={[styles.statValueSmall, { color: '#667eea' }]}>{totalDepartments}</Text>
              <Text style={styles.statLabelSmall}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBoxSmall, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
              </View>
              <Text style={[styles.statValueSmall, { color: '#16a34a' }]}>{activeDepartments}</Text>
              <Text style={styles.statLabelSmall}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBoxSmall, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="close-circle" size={18} color="#ef4444" />
              </View>
              <Text style={[styles.statValueSmall, { color: '#dc2626' }]}>{inactiveDepartments}</Text>
              <Text style={styles.statLabelSmall}>Inactive</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBoxSmall, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="people" size={18} color="#3b82f6" />
              </View>
              <Text style={[styles.statValueSmall, { color: '#1e40af' }]}>{totalEmployees}</Text>
              <Text style={styles.statLabelSmall}>Staff</Text>
            </View>
          </View>
        </Animated.View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput 
              placeholder="Search departments..." 
              style={styles.searchInput} 
              value={search} 
              onChangeText={setSearch} 
              placeholderTextColor="#9ca3af" 
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.filterChip, statusFilter !== 'all' && styles.filterChipActive]} 
            onPress={() => setStatusFilter(statusFilter === "all" ? "active" : statusFilter === "active" ? "inactive" : "all")}
          >
            <Ionicons 
              name={statusFilter === 'all' ? 'filter-outline' : statusFilter === 'active' ? 'checkmark-circle' : 'close-circle'} 
              size={16} 
              color={statusFilter !== 'all' ? '#667eea' : '#6b7280'} 
            />
            <Text style={[styles.filterChipText, statusFilter !== 'all' && { color: '#667eea' }]}>
              {statusFilter === "all" ? "All" : statusFilter}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Department List */}
        <Animated.View style={[styles.listWrapper, { opacity: listAnim }]}>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} tintColor="#667eea" />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="business-outline" size={48} color="#d1d5db" />
                </View>
                <Text style={styles.emptyText}>No departments found</Text>
                <Text style={styles.emptySubtext}>
                  {search ? "Try a different search term" : "Create your first department"}
                </Text>
                {!search && (
                  <TouchableOpacity style={styles.emptyBtn} onPress={openNewDepartment}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.emptyBtnText}>Add Department</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            renderItem={renderDepartmentCard}
          />
        </Animated.View>
      </View>

      {/* Floating Action Buttons */}
      <Animated.View style={[styles.fabContainer, { opacity: fabAnim, transform: [{ scale: fabAnim }] }]}>
        <TouchableOpacity style={styles.fabSecondary} onPress={handleSyncDepartments} activeOpacity={0.8} disabled={syncing}>
          <LinearGradient colors={['#7d57a3ff', '#7d57a3ff']} style={styles.fabGradient}>
            {syncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="sync" size={22} color="#fff" />
            )}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fabPrimary} onPress={openNewDepartment} activeOpacity={0.8}>
          <LinearGradient colors={['#7d57a3ff', '#7d57a3ff']} style={styles.fabGradient}>
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>


      {/* View Department Modal */}
      <Modal visible={viewModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.viewModalContainer}>
            {/* Modal Header */}
            <LinearGradient colors={['#7d57a3ff', '#7d57a3ff']} style={styles.viewModalHeader}>
              <View style={styles.viewModalHeaderContent}>
                <View style={styles.viewModalIconBox}>
                  <Ionicons name="business" size={24} color="#fff" />
                </View>
                <View style={styles.viewModalHeaderText}>
                  <Text style={styles.viewModalTitle}>Department Details</Text>
                  <Text style={styles.viewModalSubtitle}>{selectedDept?.name}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setViewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            {selectedDept && (
              <ScrollView style={styles.viewModalBody} showsVerticalScrollIndicator={false}>
                {/* Code & Status */}
                <View style={styles.viewInfoRow}>
                  <View style={styles.viewInfoItem}>
                    <Text style={styles.viewInfoLabel}>Code</Text>
                    <View style={styles.viewCodeBadge}>
                      <Text style={styles.viewCodeText}>{selectedDept.code}</Text>
                    </View>
                  </View>
                  <View style={styles.viewInfoItem}>
                    <Text style={styles.viewInfoLabel}>Status</Text>
                    <View style={[styles.viewStatusBadge, { backgroundColor: selectedDept.status === "active" ? "#dcfce7" : "#fee2e2" }]}>
                      <View style={[styles.statusDot, { backgroundColor: selectedDept.status === "active" ? "#22c55e" : "#ef4444" }]} />
                      <Text style={[styles.viewStatusText, { color: selectedDept.status === "active" ? "#16a34a" : "#dc2626" }]}>
                        {selectedDept.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Stats Cards */}
                <View style={styles.viewStatsRow}>
                  <View style={styles.viewStatCard}>
                    <View style={[styles.viewStatIcon, { backgroundColor: '#f3f4f6' }]}>
                      <Ionicons name="person" size={18} color="#6b7280" />
                    </View>
                    <Text style={styles.viewStatLabel}>Manager</Text>
                    <Text style={styles.viewStatValue}>{getManagerName(selectedDept.manager_id)}</Text>
                  </View>
                  <View style={styles.viewStatCard}>
                    <View style={[styles.viewStatIcon, { backgroundColor: '#f3f4f6' }]}>
                      <Ionicons name="people" size={18} color="#6b7280" />
                    </View>
                    <Text style={styles.viewStatLabel}>Employees</Text>
                    <Text style={styles.viewStatValue}>{selectedDept.employee_count || 0}</Text>
                  </View>
                  <View style={styles.viewStatCard}>
                    <View style={[styles.viewStatIcon, { backgroundColor: '#f3f4f6' }]}>
                      <Ionicons name="wallet" size={18} color="#6b7280" />
                    </View>
                    <Text style={styles.viewStatLabel}>Budget</Text>
                    <Text style={styles.viewStatValue}>₹{((selectedDept.budget || 0) / 100000).toFixed(1)}L</Text>
                  </View>
                </View>

                {/* Details List */}
                <View style={styles.viewDetailsList}>
                  <View style={styles.viewDetailItem}>
                    <View style={styles.viewDetailIcon}>
                      <Ionicons name="location-outline" size={18} color="#667eea" />
                    </View>
                    <View style={styles.viewDetailContent}>
                      <Text style={styles.viewDetailLabel}>Location</Text>
                      <Text style={styles.viewDetailValue}>{selectedDept.location || 'Not specified'}</Text>
                    </View>
                  </View>
                  <View style={styles.viewDetailItem}>
                    <View style={styles.viewDetailIcon}>
                      <Ionicons name="document-text-outline" size={18} color="#667eea" />
                    </View>
                    <View style={styles.viewDetailContent}>
                      <Text style={styles.viewDetailLabel}>Description</Text>
                      <Text style={styles.viewDetailValue}>{selectedDept.description || 'No description'}</Text>
                    </View>
                  </View>
                  <View style={styles.viewDetailItem}>
                    <View style={styles.viewDetailIcon}>
                      <Ionicons name="calendar-outline" size={18} color="#667eea" />
                    </View>
                    <View style={styles.viewDetailContent}>
                      <Text style={styles.viewDetailLabel}>Created</Text>
                      <Text style={styles.viewDetailValue}>{new Date(selectedDept.created_at).toLocaleDateString()}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}

            {/* Modal Actions */}
            <View style={styles.viewModalActions}>
              <TouchableOpacity style={styles.viewActionBtn} onPress={() => { selectedDept && openEmployeeList(selectedDept); }}>
                <LinearGradient colors={['#7d57a3ff', '#7d57a3ff']} style={styles.viewActionBtnGradient}>
                  <Ionicons name="people-outline" size={18} color="#fff" />
                  <Text style={styles.viewActionBtnText}>View Employees</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Department Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContainer}>
            {/* Modal Header */}
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.formModalHeader}>
              <View style={styles.formModalHeaderContent}>
                <View style={styles.formModalIconBox}>
                  <Ionicons name="create" size={24} color="#fff" />
                </View>
                <View style={styles.formModalHeaderText}>
                  <Text style={styles.formModalTitle}>Edit Department</Text>
                  <Text style={styles.formModalSubtitle}>{editingDept?.name}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeEditModal}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Form Body */}
            <ScrollView style={styles.formModalBody} showsVerticalScrollIndicator={false}>
              {/* Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  <Ionicons name="business-outline" size={14} color="#667eea" /> Department Name *
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.name}
                  onChangeText={(t) => setEditForm({ ...editForm, name: t })}
                  placeholder="Enter department name"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Code */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  <Ionicons name="code-outline" size={14} color="#667eea" /> Department Code *
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.code}
                  onChangeText={(t) => setEditForm({ ...editForm, code: t.toUpperCase() })}
                  placeholder="e.g., ENG, MKT"
                  placeholderTextColor="#9ca3af"
                  maxLength={5}
                  autoCapitalize="characters"
                />
              </View>

              {/* Status */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  <Ionicons name="toggle-outline" size={14} color="#667eea" /> Status
                </Text>
                <View style={styles.statusToggleRow}>
                  <TouchableOpacity
                    style={[styles.statusToggleBtn, editForm.status === 'active' && styles.statusToggleBtnActive]}
                    onPress={() => setEditForm({ ...editForm, status: 'active' })}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={editForm.status === 'active' ? '#fff' : '#22c55e'} />
                    <Text style={[styles.statusToggleText, editForm.status === 'active' && styles.statusToggleTextActive]}>Active</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusToggleBtn, editForm.status === 'inactive' && styles.statusToggleBtnInactive]}
                    onPress={() => setEditForm({ ...editForm, status: 'inactive' })}
                  >
                    <Ionicons name="close-circle" size={18} color={editForm.status === 'inactive' ? '#fff' : '#ef4444'} />
                    <Text style={[styles.statusToggleText, editForm.status === 'inactive' && styles.statusToggleTextActive]}>Inactive</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Manager Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  <Ionicons name="person-outline" size={14} color="#667eea" /> Department Manager
                </Text>
                {selectedEditManager ? (
                  <View style={styles.selectedManagerBox}>
                    <View style={styles.managerAvatar}>
                      <Text style={styles.managerAvatarText}>{selectedEditManager.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.managerInfo}>
                      <Text style={styles.managerName}>{selectedEditManager.name}</Text>
                      <Text style={styles.managerRole}>{selectedEditManager.role} {selectedEditManager.department ? `• ${selectedEditManager.department}` : ''}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setEditForm({ ...editForm, manager_id: null })}>
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.selectManagerBtn} onPress={() => setShowManagerDropdown(!showManagerDropdown)}>
                    <Ionicons name="person-add-outline" size={18} color="#667eea" />
                    <Text style={styles.selectManagerText}>Select a Manager</Text>
                    <Ionicons name={showManagerDropdown ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
                {showManagerDropdown && !selectedEditManager && (
                  <View style={styles.managerDropdown}>
                    <View style={styles.managerSearchBox}>
                      <Ionicons name="search" size={16} color="#9ca3af" />
                      <TextInput
                        style={styles.managerSearchInput}
                        placeholder="Search managers..."
                        placeholderTextColor="#9ca3af"
                        value={managerSearch}
                        onChangeText={setManagerSearch}
                      />
                    </View>
                    <ScrollView style={styles.managerList} nestedScrollEnabled>
                      {filteredEditManagers.length === 0 ? (
                        <View style={styles.noManagersBox}>
                          <Ionicons name="person-outline" size={28} color="#d1d5db" />
                          <Text style={styles.noManagersText}>No managers found</Text>
                        </View>
                      ) : (
                        filteredEditManagers.map((m) => (
                          <TouchableOpacity
                            key={m.id}
                            style={styles.managerOption}
                            onPress={() => {
                              setEditForm({ ...editForm, manager_id: m.id });
                              setShowManagerDropdown(false);
                              setManagerSearch('');
                            }}
                          >
                            <View style={styles.managerOptionAvatar}>
                              <Text style={styles.managerOptionAvatarText}>{m.name.charAt(0)}</Text>
                            </View>
                            <View style={styles.managerOptionInfo}>
                              <Text style={styles.managerOptionName}>{m.name}</Text>
                              <Text style={styles.managerOptionRole}>{m.role} {m.department ? `• ${m.department}` : ''}</Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Employee Count Info */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  <Ionicons name="people-outline" size={14} color="#667eea" /> Number of Employees
                </Text>
                <View style={styles.autoCalcBox}>
                  <Ionicons name="information-circle" size={18} color="#667eea" />
                  <Text style={styles.autoCalcText}>Auto-calculated: {editForm.employee_count} employees</Text>
                </View>
              </View>

              {/* Budget */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  <Ionicons name="cash-outline" size={14} color="#667eea" /> Annual Budget (₹)
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={String(editForm.budget)}
                  onChangeText={(t) => setEditForm({ ...editForm, budget: parseInt(t) || 0 })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Location */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  <Ionicons name="location-outline" size={14} color="#667eea" /> Location
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={editForm.location}
                  onChangeText={(t) => setEditForm({ ...editForm, location: t })}
                  placeholder="e.g., Building A, Floor 3"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  <Ionicons name="document-text-outline" size={14} color="#667eea" /> Description
                </Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={editForm.description}
                  onChangeText={(t) => setEditForm({ ...editForm, description: t })}
                  placeholder="Brief description..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.formModalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeEditModal} disabled={editSubmitting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleEditSubmit} disabled={editSubmitting}>
                {editSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <LinearGradient colors={['#667eea', '#764ba2']} style={styles.saveBtnGradient}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Create Department Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContainer}>
            {/* Modal Header */}
            <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.formModalHeader}>
              <View style={styles.formModalHeaderContent}>
                <View style={styles.formModalIconBox}>
                  <Ionicons name="add-circle" size={24} color="#fff" />
                </View>
                <View style={styles.formModalHeaderText}>
                  <Text style={styles.formModalTitle}>Create Department</Text>
                  <Text style={styles.formModalSubtitle}>Add a new department</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeCreateModal}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Form Body */}
            <ScrollView style={styles.formModalBody} showsVerticalScrollIndicator={false}>
              {/* Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: '#22c55e' }]}>
                  <Ionicons name="business-outline" size={14} color="#22c55e" /> Department Name *
                </Text>
                <TextInput
                  style={[styles.formInput, styles.formInputGreen]}
                  value={createForm.name}
                  onChangeText={(t) => setCreateForm({ ...createForm, name: t })}
                  placeholder="Enter department name"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Code */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: '#22c55e' }]}>
                  <Ionicons name="code-outline" size={14} color="#22c55e" /> Department Code *
                </Text>
                <TextInput
                  style={[styles.formInput, styles.formInputGreen]}
                  value={createForm.code}
                  onChangeText={(t) => setCreateForm({ ...createForm, code: t.toUpperCase() })}
                  placeholder="e.g., ENG, MKT"
                  placeholderTextColor="#9ca3af"
                  maxLength={5}
                  autoCapitalize="characters"
                />
              </View>

              {/* Status */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: '#22c55e' }]}>
                  <Ionicons name="toggle-outline" size={14} color="#22c55e" /> Status
                </Text>
                <View style={styles.statusToggleRow}>
                  <TouchableOpacity
                    style={[styles.statusToggleBtn, createForm.status === 'active' && styles.statusToggleBtnActiveGreen]}
                    onPress={() => setCreateForm({ ...createForm, status: 'active' })}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={createForm.status === 'active' ? '#fff' : '#22c55e'} />
                    <Text style={[styles.statusToggleText, createForm.status === 'active' && styles.statusToggleTextActive]}>Active</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusToggleBtn, createForm.status === 'inactive' && styles.statusToggleBtnInactive]}
                    onPress={() => setCreateForm({ ...createForm, status: 'inactive' })}
                  >
                    <Ionicons name="close-circle" size={18} color={createForm.status === 'inactive' ? '#fff' : '#ef4444'} />
                    <Text style={[styles.statusToggleText, createForm.status === 'inactive' && styles.statusToggleTextActive]}>Inactive</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Manager Selection */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: '#22c55e' }]}>
                  <Ionicons name="person-outline" size={14} color="#22c55e" /> Department Manager
                </Text>
                {selectedCreateManager ? (
                  <View style={[styles.selectedManagerBox, { borderColor: '#22c55e' }]}>
                    <View style={[styles.managerAvatar, { backgroundColor: '#22c55e' }]}>
                      <Text style={styles.managerAvatarText}>{selectedCreateManager.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.managerInfo}>
                      <Text style={styles.managerName}>{selectedCreateManager.name}</Text>
                      <Text style={styles.managerRole}>{selectedCreateManager.role} {selectedCreateManager.department ? `• ${selectedCreateManager.department}` : ''}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setCreateForm({ ...createForm, manager_id: null })}>
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.selectManagerBtn, { borderColor: '#d1fae5' }]} onPress={() => setShowCreateManagerDropdown(!showCreateManagerDropdown)}>
                    <Ionicons name="person-add-outline" size={18} color="#22c55e" />
                    <Text style={styles.selectManagerText}>Select a Manager</Text>
                    <Ionicons name={showCreateManagerDropdown ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
                {showCreateManagerDropdown && !selectedCreateManager && (
                  <View style={styles.managerDropdown}>
                    <View style={styles.managerSearchBox}>
                      <Ionicons name="search" size={16} color="#9ca3af" />
                      <TextInput
                        style={styles.managerSearchInput}
                        placeholder="Search managers..."
                        placeholderTextColor="#9ca3af"
                        value={createManagerSearch}
                        onChangeText={setCreateManagerSearch}
                      />
                    </View>
                    <ScrollView style={styles.managerList} nestedScrollEnabled>
                      {filteredCreateManagers.length === 0 ? (
                        <View style={styles.noManagersBox}>
                          <Ionicons name="person-outline" size={28} color="#d1d5db" />
                          <Text style={styles.noManagersText}>No managers found</Text>
                        </View>
                      ) : (
                        filteredCreateManagers.map((m) => (
                          <TouchableOpacity
                            key={m.id}
                            style={styles.managerOption}
                            onPress={() => {
                              setCreateForm({ ...createForm, manager_id: m.id });
                              setShowCreateManagerDropdown(false);
                              setCreateManagerSearch('');
                            }}
                          >
                            <View style={[styles.managerOptionAvatar, { backgroundColor: '#22c55e' }]}>
                              <Text style={styles.managerOptionAvatarText}>{m.name.charAt(0)}</Text>
                            </View>
                            <View style={styles.managerOptionInfo}>
                              <Text style={styles.managerOptionName}>{m.name}</Text>
                              <Text style={styles.managerOptionRole}>{m.role} {m.department ? `• ${m.department}` : ''}</Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Employee Count Info */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: '#22c55e' }]}>
                  <Ionicons name="people-outline" size={14} color="#22c55e" /> Number of Employees
                </Text>
                <View style={[styles.autoCalcBox, { backgroundColor: '#f0fdf4', borderColor: '#22c55e' }]}>
                  <Ionicons name="information-circle" size={18} color="#22c55e" />
                  <Text style={[styles.autoCalcText, { color: '#16a34a' }]}>Auto-calculated from users</Text>
                </View>
              </View>

              {/* Budget */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: '#22c55e' }]}>
                  <Ionicons name="cash-outline" size={14} color="#22c55e" /> Annual Budget (₹)
                </Text>
                <TextInput
                  style={[styles.formInput, styles.formInputGreen]}
                  value={String(createForm.budget)}
                  onChangeText={(t) => setCreateForm({ ...createForm, budget: parseInt(t) || 0 })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Location */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: '#22c55e' }]}>
                  <Ionicons name="location-outline" size={14} color="#22c55e" /> Location
                </Text>
                <TextInput
                  style={[styles.formInput, styles.formInputGreen]}
                  value={createForm.location}
                  onChangeText={(t) => setCreateForm({ ...createForm, location: t })}
                  placeholder="e.g., Building A, Floor 3"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: '#22c55e' }]}>
                  <Ionicons name="document-text-outline" size={14} color="#22c55e" /> Description
                </Text>
                <TextInput
                  style={[styles.formInput, styles.formInputGreen, styles.formTextArea]}
                  value={createForm.description}
                  onChangeText={(t) => setCreateForm({ ...createForm, description: t })}
                  placeholder="Brief description..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.formModalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeCreateModal} disabled={createSubmitting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateSubmit} disabled={createSubmitting}>
                {createSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.saveBtnGradient}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Create Department</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Employee List Modal */}
      <Modal visible={employeeListModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.employeeModalContainer}>
            {/* Header */}
            <LinearGradient colors={['#7d57a3ff', '#7d57a3ff']} style={styles.employeeModalHeader}>
              <View style={styles.employeeModalHeaderContent}>
                <View style={styles.employeeModalIconBox}>
                  <Ionicons name="people" size={24} color="#fff" />
                </View>
                <View style={styles.employeeModalHeaderText}>
                  <Text style={styles.employeeModalTitle}>Department Employees</Text>
                  <Text style={styles.employeeModalSubtitle}>{selectedDept?.name}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setEmployeeListModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Employee Count Badge */}
            <View style={styles.employeeCountSection}>
              <View style={styles.employeeCountCard}>
                <View style={styles.employeeCountIconBox}>
                  <Ionicons name="people" size={24} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.employeeCountNumber}>{departmentEmployees.length}</Text>
                  <Text style={styles.employeeCountLabel}>Total Employees</Text>
                </View>
              </View>
            </View>

            {/* Employee List */}
            {loadingEmployees ? (
              <View style={styles.employeeLoadingBox}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.employeeLoadingText}>Loading employees...</Text>
              </View>
            ) : departmentEmployees.length === 0 ? (
              <View style={styles.employeeEmptyBox}>
                <View style={styles.employeeEmptyIconBox}>
                  <Ionicons name="people-outline" size={48} color="#d1d5db" />
                </View>
                <Text style={styles.employeeEmptyText}>No employees found</Text>
                <Text style={styles.employeeEmptySubtext}>This department has no employees yet</Text>
              </View>
            ) : (
              <FlatList
                data={departmentEmployees}
                keyExtractor={(item) => item.id?.toString() || item.user_id?.toString()}
                contentContainerStyle={styles.employeeListContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.employeeCard}>
                    <View style={[styles.employeeAvatar, { backgroundColor: '#f3f4f6' }]}>
                      <Text style={[styles.employeeAvatarText, { color: '#6b7280' }]}>{(item.name || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.employeeInfo}>
                      <Text style={styles.employeeName}>{item.name}</Text>
                      <Text style={styles.employeeRole}>{item.role || 'N/A'}</Text>
                      <Text style={styles.employeeEmail}>{item.email}</Text>
                    </View>
                    <View style={styles.employeeIdBadge}>
                      <Text style={styles.employeeIdText}>{item.employee_id || 'N/A'}</Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} animationType="fade" transparent>
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContainer}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter Options</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.filterModalBody}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterOptionsRow}>
                {['all', 'active', 'inactive'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.filterOption, statusFilter === status && styles.filterOptionActive]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionTextActive]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.filterApplyBtn} onPress={() => setFilterModalVisible(false)}>
              <LinearGradient colors={['#667eea', '#764ba2']} style={styles.filterApplyBtnGradient}>
                <Text style={styles.filterApplyBtnText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: HEADER_PRIMARY_COLOR 
  },
  
  // Loading Screen
  loadingGradient: { 
    flex: 1 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  loadingIconBox: { 
    width: 80, 
    height: 80, 
    borderRadius: 24, 
    backgroundColor: "rgba(255,255,255,0.2)", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: "#fff", 
    fontWeight: "500" 
  },

  // Header
  headerGradient: { 
    paddingBottom: 20 
  },
  headerPattern: { 
    position: "absolute", 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    overflow: "hidden" 
  },
  patternCircle: { 
    position: "absolute", 
    borderRadius: 999, 
    backgroundColor: "rgba(255,255,255,0.08)" 
  },
  headerContent: { 
    paddingHorizontal: 16, 
    paddingTop: 12 
  },
  headerTop: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between" 
  },
  headerLeft: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1 
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: "rgba(255,255,255,0.15)", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  iconBadge: { 
    marginLeft: 12 
  },
  iconBadgeGradient: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  headerTextSection: { 
    marginLeft: 12, 
    flex: 1 
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: "700", 
    color: "#fff" 
  },
  headerSubtitle: { 
    fontSize: 13, 
    color: "rgba(255,255,255,0.8)", 
    marginTop: 2 
  },


  // Content
  content: { 
    flex: 1, 
    backgroundColor: "#f8fafc", 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    marginTop: -4 
  },

  // Stats
  statsContainer: { 
    paddingHorizontal: 16, 
    paddingTop: 20 
  },
  statsRow: { 
    flexDirection: "row", 
    gap: 10 
  },
  statCard: { 
    flex: 1, 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 12, 
    alignItems: "center", 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 8, 
    elevation: 3 
  },
  statIconBoxSmall: { 
    width: 32, 
    height: 32, 
    borderRadius: 10, 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 6 
  },
  statValueSmall: { 
    fontSize: 20, 
    fontWeight: "800" 
  },
  statLabelSmall: { 
    fontSize: 10, 
    fontWeight: "600", 
    color: "#6b7280", 
    marginTop: 2 
  },

  // Search
  searchSection: { 
    flexDirection: "row", 
    paddingHorizontal: 16, 
    paddingTop: 16, 
    gap: 10 
  },
  searchContainer: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    borderRadius: 14, 
    paddingHorizontal: 14, 
    height: 48, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 4, 
    elevation: 2, 
    gap: 10 
  },
  searchInput: { 
    flex: 1, 
    fontSize: 15, 
    color: "#1f2937" 
  },
  filterChip: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    borderRadius: 14, 
    paddingHorizontal: 14, 
    height: 48, 
    gap: 6, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 4, 
    elevation: 2 
  },
  filterChipActive: { 
    backgroundColor: "#f0f0ff", 
    borderWidth: 1, 
    borderColor: "#667eea" 
  },
  filterChipText: { 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#6b7280", 
    textTransform: "capitalize" 
  },

  // List
  listWrapper: { 
    flex: 1 
  },
  listContainer: { 
    padding: 16, 
    paddingBottom: 120 
  },

  // Card
  card: { 
    backgroundColor: "#fff", 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 14, 
    shadowColor: "#667eea", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 4 
  },
  cardHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "flex-start", 
    marginBottom: 16 
  },
  cardHeaderLeft: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1 
  },
  codeBox: { 
    width: 52, 
    height: 52, 
    borderRadius: 14, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  codeText: { 
    color: "#fff", 
    fontWeight: "800", 
    fontSize: 14 
  },
  cardTitleContainer: { 
    flex: 1, 
    marginLeft: 12 
  },
  cardTitle: { 
    fontSize: 17, 
    fontWeight: "700", 
    color: "#1f2937" 
  },
  locationRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: 4, 
    gap: 4 
  },
  cardSubtitle: { 
    fontSize: 12, 
    color: "#9ca3af" 
  },
  statusBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 20, 
    gap: 6 
  },
  statusDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3 
  },
  statusText: { 
    fontSize: 12, 
    fontWeight: "600", 
    textTransform: "capitalize" 
  },

  // Card Stats
  cardStatsGrid: { 
    flexDirection: "row", 
    backgroundColor: "#f8fafc", 
    borderRadius: 14, 
    padding: 12, 
    marginBottom: 12, 
    gap: 8 
  },
  cardStatItem: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8 
  },
  cardStatIcon: { 
    width: 32, 
    height: 32, 
    borderRadius: 10, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  cardStatLabel: { 
    fontSize: 10, 
    color: "#9ca3af", 
    fontWeight: "500" 
  },
  cardStatValue: { 
    fontSize: 12, 
    fontWeight: "700", 
    color: "#1f2937" 
  },

  // Description
  descriptionBox: { 
    backgroundColor: "#f8fafc", 
    borderRadius: 10, 
    padding: 12, 
    marginBottom: 12 
  },
  cardDescription: { 
    fontSize: 13, 
    color: "#6b7280", 
    lineHeight: 18 
  },

  // Card Actions
  cardActions: { 
    flexDirection: "row", 
    alignItems: "center", 
    borderTopWidth: 1, 
    borderTopColor: "#f1f5f9", 
    paddingTop: 12, 
    gap: 8 
  },
  actionBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 10, 
    backgroundColor: "#f8fafc", 
    gap: 6 
  },
  actionBtnPrimary: { 
    backgroundColor: "#f0f0ff" 
  },
  actionBtnText: { 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#6b7280" 
  },
  toggleBtn: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: 8, 
    borderRadius: 10, 
    gap: 6 
  },
  toggleBtnText: { 
    fontSize: 12, 
    fontWeight: "600" 
  },
  deleteBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: "#fef2f2", 
    justifyContent: "center", 
    alignItems: "center" 
  },

  // Empty State
  emptyContainer: { 
    alignItems: "center", 
    paddingVertical: 60 
  },
  emptyIconBox: { 
    width: 100, 
    height: 100, 
    borderRadius: 30, 
    backgroundColor: "#f3f4f6", 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 16 
  },
  emptyText: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#374151" 
  },
  emptySubtext: { 
    fontSize: 14, 
    color: "#9ca3af", 
    marginTop: 4 
  },
  emptyBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#667eea", 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 12, 
    marginTop: 20, 
    gap: 8 
  },
  emptyBtnText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#fff" 
  },

  // FAB
  fabContainer: { 
    position: "absolute", 
    bottom: 24, 
    right: 20, 
    gap: 12 
  },
  fabPrimary: { 
    shadowColor: "#667eea", 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 12, 
    elevation: 8 
  },
  fabSecondary: { 
    shadowColor: "#3b82f6", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 6 
  },
  fabGradient: { 
    width: 56, 
    height: 56, 
    borderRadius: 18, 
    justifyContent: "center", 
    alignItems: "center" 
  },


  // Modal Common
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    justifyContent: "flex-end" 
  },
  modalCloseBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: "rgba(255,255,255,0.2)", 
    justifyContent: "center", 
    alignItems: "center" 
  },

  // View Modal
  viewModalContainer: { 
    backgroundColor: "#fff", 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    maxHeight: "85%" 
  },
  viewModalHeader: { 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    padding: 20, 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  viewModalHeaderContent: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1 
  },
  viewModalIconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    backgroundColor: "rgba(255,255,255,0.2)", 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: 14 
  },
  viewModalHeaderText: { 
    flex: 1 
  },
  viewModalTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#fff" 
  },
  viewModalSubtitle: { 
    fontSize: 13, 
    color: "rgba(255,255,255,0.8)", 
    marginTop: 2 
  },
  viewModalBody: { 
    padding: 20 
  },
  viewInfoRow: { 
    flexDirection: "row", 
    gap: 12, 
    marginBottom: 16 
  },
  viewInfoItem: { 
    flex: 1 
  },
  viewInfoLabel: { 
    fontSize: 12, 
    color: "#6b7280", 
    fontWeight: "500", 
    marginBottom: 6 
  },
  viewCodeBadge: { 
    backgroundColor: "#667eea", 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 10, 
    alignSelf: "flex-start" 
  },
  viewCodeText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 14 
  },
  viewStatusBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 10, 
    alignSelf: "flex-start", 
    gap: 6 
  },
  viewStatusText: { 
    fontSize: 13, 
    fontWeight: "600", 
    textTransform: "capitalize" 
  },
  viewStatsRow: { 
    flexDirection: "row", 
    gap: 10, 
    marginBottom: 20 
  },
  viewStatCard: { 
    flex: 1, 
    backgroundColor: "#fff", 
    borderRadius: 14, 
    padding: 14, 
    alignItems: "center", 
    borderWidth: 1, 
    borderColor: "#f1f5f9" 
  },
  viewStatIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 8 
  },
  viewStatValue: { 
    fontSize: 14, 
    fontWeight: "700", 
    color: "#1f2937", 
    marginTop: 4, 
    textAlign: "center" 
  },
  viewStatLabel: { 
    fontSize: 11, 
    color: "#9ca3af", 
    fontWeight: "500" 
  },
  viewDetailsList: { 
    gap: 12 
  },
  viewDetailItem: { 
    flexDirection: "row", 
    alignItems: "flex-start", 
    backgroundColor: "#f8fafc", 
    borderRadius: 12, 
    padding: 14 
  },
  viewDetailIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: "#f0f0ff", 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: 12 
  },
  viewDetailContent: { 
    flex: 1 
  },
  viewDetailLabel: { 
    fontSize: 12, 
    color: "#6b7280", 
    fontWeight: "500" 
  },
  viewDetailValue: { 
    fontSize: 14, 
    color: "#1f2937", 
    fontWeight: "600", 
    marginTop: 2 
  },
  viewModalActions: { 
    padding: 20, 
    borderTopWidth: 1, 
    borderTopColor: "#f1f5f9" 
  },
  viewActionBtn: { 
    borderRadius: 14, 
    overflow: "hidden" 
  },
  viewActionBtnGradient: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: 14, 
    gap: 8 
  },
  viewActionBtnText: { 
    fontSize: 15, 
    fontWeight: "700", 
    color: "#fff" 
  },

  // Form Modal
  formModalContainer: { 
    backgroundColor: "#fff", 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    maxHeight: "90%" 
  },
  formModalHeader: { 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    padding: 20, 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  formModalHeaderContent: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1 
  },
  formModalIconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    backgroundColor: "rgba(255,255,255,0.2)", 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: 14 
  },
  formModalHeaderText: { 
    flex: 1 
  },
  formModalTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#fff" 
  },
  formModalSubtitle: { 
    fontSize: 13, 
    color: "rgba(255,255,255,0.8)", 
    marginTop: 2 
  },
  formModalBody: { 
    padding: 20, 
    maxHeight: 450 
  },
  formGroup: { 
    marginBottom: 18 
  },
  formLabel: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#667eea", 
    marginBottom: 8 
  },
  formInput: { 
    borderWidth: 1.5, 
    borderColor: "#e5e7eb", 
    borderRadius: 14, 
    padding: 14, 
    fontSize: 15, 
    color: "#1f2937", 
    backgroundColor: "#fff" 
  },
  formInputGreen: { 
    borderColor: "#d1fae5" 
  },
  formTextArea: { 
    height: 90, 
    textAlignVertical: "top" 
  },
  statusToggleRow: { 
    flexDirection: "row", 
    gap: 12 
  },
  statusToggleBtn: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: 14, 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: "#e5e7eb", 
    backgroundColor: "#fff", 
    gap: 8 
  },
  statusToggleBtnActive: { 
    backgroundColor: "#22c55e", 
    borderColor: "#22c55e" 
  },
  statusToggleBtnActiveGreen: { 
    backgroundColor: "#22c55e", 
    borderColor: "#22c55e" 
  },
  statusToggleBtnInactive: { 
    backgroundColor: "#ef4444", 
    borderColor: "#ef4444" 
  },
  statusToggleText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#6b7280" 
  },
  statusToggleTextActive: { 
    color: "#fff" 
  },

  // Manager Selection
  selectedManagerBox: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#f0f0ff", 
    borderWidth: 1.5, 
    borderColor: "#667eea", 
    borderRadius: 14, 
    padding: 12, 
    gap: 12 
  },
  managerAvatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: "#667eea", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  managerAvatarText: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#fff" 
  },
  managerInfo: { 
    flex: 1 
  },
  managerName: { 
    fontSize: 15, 
    fontWeight: "600", 
    color: "#1f2937" 
  },
  managerRole: { 
    fontSize: 12, 
    color: "#6b7280", 
    marginTop: 2 
  },
  selectManagerBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    borderWidth: 1.5, 
    borderColor: "#e5e7eb", 
    borderRadius: 14, 
    padding: 14, 
    gap: 10, 
    backgroundColor: "#fff" 
  },
  selectManagerText: { 
    flex: 1, 
    fontSize: 15, 
    color: "#9ca3af" 
  },
  managerDropdown: { 
    borderWidth: 1.5, 
    borderColor: "#e5e7eb", 
    borderRadius: 14, 
    backgroundColor: "#fff", 
    marginTop: 8, 
    overflow: "hidden" 
  },
  managerSearchBox: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: "#f1f5f9", 
    gap: 8 
  },
  managerSearchInput: { 
    flex: 1, 
    fontSize: 14, 
    color: "#1f2937" 
  },
  managerList: { 
    maxHeight: 160 
  },
  noManagersBox: { 
    alignItems: "center", 
    padding: 20, 
    gap: 6 
  },
  noManagersText: { 
    fontSize: 13, 
    color: "#9ca3af" 
  },
  managerOption: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: "#f1f5f9", 
    gap: 10 
  },
  managerOptionAvatar: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: "#667eea", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  managerOptionAvatarText: { 
    fontSize: 14, 
    fontWeight: "700", 
    color: "#fff" 
  },
  managerOptionInfo: { 
    flex: 1 
  },
  managerOptionName: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#1f2937" 
  },
  managerOptionRole: { 
    fontSize: 11, 
    color: "#6b7280", 
    marginTop: 1 
  },
  autoCalcBox: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#f0f0ff", 
    borderWidth: 1.5, 
    borderColor: "#667eea", 
    borderRadius: 14, 
    padding: 14, 
    gap: 10 
  },
  autoCalcText: { 
    flex: 1, 
    fontSize: 14, 
    color: "#4338ca", 
    fontWeight: "500" 
  },
  formModalActions: { 
    flexDirection: "row", 
    padding: 20, 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: "#f1f5f9", 
    gap: 12 
  },
  cancelBtn: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 14, 
    borderWidth: 1.5, 
    borderColor: "#e5e7eb", 
    alignItems: "center", 
    backgroundColor: "#fff" 
  },
  cancelBtnText: { 
    fontSize: 15, 
    fontWeight: "600", 
    color: "#6b7280" 
  },
  saveBtn: { 
    flex: 2, 
    borderRadius: 14, 
    overflow: "hidden" 
  },
  saveBtnGradient: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: 14, 
    gap: 8 
  },
  saveBtnText: { 
    fontSize: 15, 
    fontWeight: "700", 
    color: "#fff" 
  },


  // Employee Modal
  employeeModalContainer: { 
    backgroundColor: "#fff", 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    maxHeight: "90%", 
    flex: 1 
  },
  employeeModalHeader: { 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    padding: 20, 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  employeeModalHeaderContent: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1 
  },
  employeeModalIconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    backgroundColor: "rgba(255,255,255,0.2)", 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: 14 
  },
  employeeModalHeaderText: { 
    flex: 1 
  },
  employeeModalTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#fff" 
  },
  employeeModalSubtitle: { 
    fontSize: 13, 
    color: "rgba(255,255,255,0.8)", 
    marginTop: 2 
  },
  employeeCountSection: { 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    backgroundColor: "#f0f9ff", 
    borderBottomWidth: 1, 
    borderBottomColor: "#e0e7ff" 
  },
  employeeCountCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    borderRadius: 14, 
    padding: 14, 
    borderWidth: 1, 
    borderColor: "#e0e7ff", 
    gap: 14 
  },
  employeeCountIconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    backgroundColor: "#eff6ff", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  employeeCountNumber: { 
    fontSize: 28, 
    fontWeight: "800", 
    color: "#3b82f6" 
  },
  employeeCountLabel: { 
    fontSize: 13, 
    color: "#6b7280", 
    fontWeight: "500" 
  },
  employeeLoadingBox: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  employeeLoadingText: { 
    marginTop: 12, 
    fontSize: 16, 
    color: "#6b7280" 
  },
  employeeEmptyBox: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    paddingHorizontal: 20 
  },
  employeeEmptyIconBox: { 
    width: 100, 
    height: 100, 
    borderRadius: 30, 
    backgroundColor: "#f3f4f6", 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 16 
  },
  employeeEmptyText: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#374151" 
  },
  employeeEmptySubtext: { 
    fontSize: 14, 
    color: "#9ca3af", 
    marginTop: 4 
  },
  employeeListContent: { 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    paddingBottom: 20 
  },
  employeeCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 14, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: "#e5e7eb", 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 4, 
    elevation: 2 
  },
  employeeAvatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: 12 
  },
  employeeAvatarText: { 
    fontSize: 18, 
    fontWeight: "700" 
  },
  employeeInfo: { 
    flex: 1 
  },
  employeeName: { 
    fontSize: 15, 
    fontWeight: "700", 
    color: "#1f2937", 
    marginBottom: 2 
  },
  employeeRole: { 
    fontSize: 12, 
    color: "#6b7280", 
    fontWeight: "500", 
    marginBottom: 2 
  },
  employeeEmail: { 
    fontSize: 11, 
    color: "#9ca3af" 
  },
  employeeIdBadge: { 
    backgroundColor: "#f3f4f6", 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  employeeIdText: { 
    fontSize: 12, 
    fontWeight: "600", 
    color: "#374151" 
  },

  // Filter Modal
  filterModalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 20 
  },
  filterModalContainer: { 
    backgroundColor: "#fff", 
    borderRadius: 24, 
    width: "100%", 
    maxWidth: 400, 
    padding: 20 
  },
  filterModalHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 20 
  },
  filterModalTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#1f2937" 
  },
  filterModalBody: { 
    marginBottom: 20 
  },
  filterLabel: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#374151", 
    marginBottom: 12 
  },
  filterOptionsRow: { 
    flexDirection: "row", 
    gap: 10 
  },
  filterOption: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: "#e5e7eb", 
    alignItems: "center", 
    backgroundColor: "#fff" 
  },
  filterOptionActive: { 
    backgroundColor: "#f0f0ff", 
    borderColor: "#667eea" 
  },
  filterOptionText: { 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#6b7280" 
  },
  filterOptionTextActive: { 
    color: "#667eea" 
  },
  filterApplyBtn: { 
    borderRadius: 14, 
    overflow: "hidden" 
  },
  filterApplyBtnGradient: { 
    paddingVertical: 14, 
    alignItems: "center" 
  },
  filterApplyBtnText: { 
    fontSize: 15, 
    fontWeight: "700", 
    color: "#fff" 
  },
});
