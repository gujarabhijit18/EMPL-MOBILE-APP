import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Easing, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Button, Card, ProgressBar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronDown } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import { apiService, DepartmentPerformance, EmployeePerformance, ExecutiveSummary, ReportsData } from "../../lib/api";

type RatingType = "poor" | "average" | "good" | "excellent";
type TabType = "employee" | "department" | "executive";
type MonthType = "January" | "February" | "March" | "April" | "May" | "June" | "July" | "August" | "September" | "October" | "November" | "December";

interface FilterOptions {
  month: MonthType;
  department: string;
}

const MONTHS: MonthType[] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Helper functions
const getRatingColor = (rating: number | null): string => {
  if (rating === null) return "#9ca3af";
  if (rating >= 90) return "#22c55e";
  if (rating >= 80) return "#3b82f6";
  if (rating >= 70) return "#f59e0b";
  return "#ef4444";
};

const getRatingLabel = (rating: number | null): RatingType => {
  if (rating === null) return "average";
  if (rating >= 90) return "excellent";
  if (rating >= 75) return "good";
  if (rating >= 60) return "average";
  return "poor";
};

const getRatingStatusColor = (status: RatingType): string => {
  switch (status) {
    case "excellent": return "#10b981";
    case "good": return "#3b82f6";
    case "average": return "#f59e0b";
    case "poor": return "#ef4444";
    default: return "#6b7280";
  }
};

const getRatingStatusBgColor = (status: RatingType): string => {
  switch (status) {
    case "excellent": return "#d1fae5";
    case "good": return "#dbeafe";
    case "average": return "#fef3c7";
    case "poor": return "#fee2e2";
    default: return "#f3f4f6";
  }
};

const getRatingStatusIcon = (status: RatingType): keyof typeof Ionicons.glyphMap => {
  switch (status) {
    case "excellent": return "trophy";
    case "good": return "thumbs-up";
    case "average": return "remove-circle";
    case "poor": return "warning";
    default: return "help-circle";
  }
};

// Dropdown component
const Dropdown = ({ 
  value, 
  options, 
  onSelect 
}: { 
  label?: string; 
  value: string; 
  options: string[]; 
  onSelect: (value: string) => void 
}) => {
  const [open, setOpen] = useState(false);
  
  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity style={styles.dropdownButton} onPress={() => setOpen(!open)}>
        <Text style={styles.dropdownLabel}>{value}</Text>
        <ChevronDown size={16} color="#6b7280" />
      </TouchableOpacity>
      
      {open && (
        <View style={styles.dropdownOptions}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.dropdownOption}
                onPress={() => { onSelect(option); setOpen(false); }}
              >
                <Text style={[styles.dropdownOptionText, option === value && styles.dropdownOptionTextActive]}>
                  {option}
                </Text>
                {option === value && <Ionicons name="checkmark" size={16} color="#2563eb" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// Star Rating component
const StarRating = ({ rating, onRatingChange, size = 24 }: { rating: number; onRatingChange: (rating: number) => void; size?: number }) => (
  <View style={styles.starRatingContainer}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity key={star} onPress={() => onRatingChange(star * 20)} style={styles.starButton}>
        <Ionicons name={star * 20 <= rating ? "star" : "star-outline"} size={size} color={star * 20 <= rating ? "#f59e0b" : "#d1d5db"} />
      </TouchableOpacity>
    ))}
    <Text style={styles.ratingText}>{rating === 0 ? "Not rated (0%)" : `${rating}%`}</Text>
  </View>
);

// Get current month name
const getCurrentMonth = (): MonthType => {
  const monthIndex = new Date().getMonth();
  return MONTHS[monthIndex];
};

export default function Reports() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<TabType>("employee");
  
  // Get department from route params if provided
  const initialDepartment = route.params?.department || "All Departments";
  const [filters, setFilters] = useState<FilterOptions>({ month: getCurrentMonth(), department: initialDepartment });
  const [departments, setDepartments] = useState<string[]>(["All Departments"]);
  
  // Data state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  
  // Rating modal state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePerformance | null>(null);
  const [productivityRating, setProductivityRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [productivityComment, setProductivityComment] = useState("");
  const [qualityComment, setQualityComment] = useState("");
  
  // Export modal state
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('pdf');
  const [exportDepartment, setExportDepartment] = useState<string>('all');
  const [exportEmployee, setExportEmployee] = useState<string>('all');
  const [exportTimeRange, setExportTimeRange] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [exportMonth, setExportMonth] = useState<MonthType>(filters.month);
  const [exportYear, setExportYear] = useState<string>(new Date().getFullYear().toString());
  
  // Export dropdown open states
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [timeRangeDropdownOpen, setTimeRangeDropdownOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  
  // Department expansion state
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();
  
  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  // Fetch reports data
  const fetchReportsData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch data with current filters
      const data = await apiService.getReportsData(filters.month, filters.department);
      
      // Also fetch all departments list (for the dropdown) if a specific department is selected
      // This ensures we always have the full department list available
      let allDepartments: string[] = ["All Departments"];
      
      if (filters.department !== "All Departments") {
        // Fetch all data to get complete department list
        try {
          const allData = await apiService.getReportsData(filters.month, "All Departments");
          allData.employees.forEach(emp => {
            if (emp.department && !allDepartments.includes(emp.department)) {
              allDepartments.push(emp.department);
            }
          });
        } catch {
          // If fetching all fails, at least add current department
          if (!allDepartments.includes(filters.department)) {
            allDepartments.push(filters.department);
          }
        }
      } else {
        // Extract departments from current data
        data.employees.forEach(emp => {
          if (emp.department && !allDepartments.includes(emp.department)) {
            allDepartments.push(emp.department);
          }
        });
      }
      
      setDepartments(allDepartments);
      
      // Check if selected department still exists (might have been deleted)
      const selectedDeptExists = filters.department === "All Departments" || 
        allDepartments.includes(filters.department);
      
      if (!selectedDeptExists) {
        // Reset to "All Departments" if selected department was deleted
        console.log(`⚠️ Department "${filters.department}" no longer exists, resetting to All Departments`);
        setFilters(prev => ({ ...prev, department: "All Departments" }));
        // Refetch with all departments
        const allData = await apiService.getReportsData(filters.month, "All Departments");
        setReportsData(allData);
        return;
      }
      
      setReportsData(data);
    } catch (err: any) {
      console.error('Failed to fetch reports data:', err);
      setError(err.message || 'Failed to load reports data');
    }
  }, [filters.month, filters.department]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchReportsData();
      setLoading(false);
      startAnimations();
    };
    loadData();
  }, [fetchReportsData]);

  // Refresh data when screen comes into focus (after task/attendance/department updates)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Refresh data when screen comes into focus
      // This handles cases like department deletion from another screen
      fetchReportsData();
    });
    return unsubscribe;
  }, [navigation, fetchReportsData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReportsData();
    setRefreshing(false);
  }, [fetchReportsData]);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(headerTranslateY, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 800, delay: 200, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: 800, delay: 200, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
    ]).start();
  };

  const handleTabChange = (tab: TabType) => {
    contentOpacity.setValue(0);
    contentTranslateY.setValue(20);
    setActiveTab(tab);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
    ]).start();
  };

  const openRatingModal = (employee: EmployeePerformance) => {
    setSelectedEmployee(employee);
    setProductivityRating(employee.productivity || 0);
    setQualityRating(employee.qualityScore || 0);
    setProductivityComment("");
    setQualityComment("");
    setRatingModalVisible(true);
  };

  const closeRatingModal = () => {
    setRatingModalVisible(false);
    setSelectedEmployee(null);
    setProductivityRating(0);
    setQualityRating(0);
    setProductivityComment("");
    setQualityComment("");
  };

  // Export modal functions
  const openExportModal = () => {
    setExportMonth(filters.month);
    setExportYear(new Date().getFullYear().toString());
    setExportDepartment('all');
    setExportEmployee('all');
    setExportFormat('pdf');
    setExportTimeRange('monthly');
    setDepartmentDropdownOpen(false);
    setEmployeeDropdownOpen(false);
    setTimeRangeDropdownOpen(false);
    setMonthDropdownOpen(false);
    setYearDropdownOpen(false);
    setExportModalVisible(true);
  };

  const closeExportModal = () => {
    setExportModalVisible(false);
    setDepartmentDropdownOpen(false);
    setEmployeeDropdownOpen(false);
    setTimeRangeDropdownOpen(false);
    setMonthDropdownOpen(false);
    setYearDropdownOpen(false);
  };
  
  // Get employees filtered by export department
  const exportFilteredEmployees = useMemo(() => {
    if (!reportsData?.employees) return [];
    if (exportDepartment === 'all') return reportsData.employees;
    return reportsData.employees.filter(emp => emp.department === exportDepartment);
  }, [reportsData?.employees, exportDepartment]);

  const closeAllExportDropdowns = () => {
    setDepartmentDropdownOpen(false);
    setEmployeeDropdownOpen(false);
    setTimeRangeDropdownOpen(false);
    setMonthDropdownOpen(false);
    setYearDropdownOpen(false);
  };

  const handleExport = () => {
    // TODO: Implement actual export logic
    console.log('Exporting:', { exportFormat, exportDepartment, exportEmployee, exportTimeRange, exportMonth, exportYear });
    closeExportModal();
  };

  const calculateOverallScore = (attendance: number, taskCompletion: number, productivity: number, quality: number): number => {
    return Math.round((attendance + taskCompletion + productivity + quality) / 4);
  };

  const saveRatings = async () => {
    if (selectedEmployee) {
      try {
        await apiService.saveEmployeeRating(selectedEmployee.id, {
          productivity: productivityRating,
          qualityScore: qualityRating,
          productivityComment,
          qualityComment,
        });
        
        // Update the employee in the local state
        if (reportsData) {
          const overallScore = calculateOverallScore(
            selectedEmployee.attendance,
            selectedEmployee.taskCompletion,
            productivityRating,
            qualityRating
          );
          const newStatus = getRatingLabel(overallScore);
          
          const updatedEmployee: EmployeePerformance = {
            ...selectedEmployee,
            productivity: productivityRating,
            qualityScore: qualityRating,
            overallRating: overallScore,
            status: newStatus
          };
          
          const updatedEmployees = reportsData.employees.map(emp => 
            emp.id === selectedEmployee.id ? updatedEmployee : emp
          );
          
          // Recalculate department averages
          const updatedDepartments = reportsData.departments.map(dept => {
            const deptEmployees = updatedEmployees.filter(emp => emp.department === dept.name);
            if (deptEmployees.length === 0) return dept;
            
            const avgAttendance = Math.round(
              deptEmployees.reduce((sum, emp) => sum + emp.attendance, 0) / deptEmployees.length
            );
            const avgTaskCompletion = Math.round(
              deptEmployees.reduce((sum, emp) => sum + emp.taskCompletion, 0) / deptEmployees.length
            );
            const avgProductivity = Math.round(
              deptEmployees.reduce((sum, emp) => sum + (emp.productivity || 0), 0) / deptEmployees.length
            );
            const avgQuality = Math.round(
              deptEmployees.reduce((sum, emp) => sum + (emp.qualityScore || 0), 0) / deptEmployees.length
            );
            const performanceScore = calculateOverallScore(avgAttendance, avgTaskCompletion, avgProductivity, avgQuality);
            const status = getRatingLabel(performanceScore) as RatingType;
            
            return {
              ...dept,
              avgProductivity,
              avgAttendance,
              avgQuality,
              performanceScore,
              status
            };
          });
          
          // Create a new object to ensure state update is detected
          setReportsData(prevData => 
            prevData ? {
              ...prevData,
              employees: updatedEmployees,
              departments: updatedDepartments
            } : null
          );
          
          // Update selected employee to show updated data in modal before closing
          setSelectedEmployee(updatedEmployee);
        }
        
        closeRatingModal();
        Alert.alert('Success', 'Employee rating saved successfully!');
      } catch (err: any) {
        console.error('Failed to save ratings:', err);
        Alert.alert('Error', err.message || 'Failed to save ratings');
      }
    }
  };

  // Filtered data
  const filteredEmployees = useMemo(() => {
    if (!reportsData) return [];
    return filters.department === "All Departments"
      ? reportsData.employees
      : reportsData.employees.filter(emp => emp.department === filters.department);
  }, [reportsData, filters.department]);

  const filteredDepartments = useMemo(() => {
    if (!reportsData) return [];
    return filters.department === "All Departments"
      ? reportsData.departments
      : reportsData.departments.filter(dept => dept.name === filters.department);
  }, [reportsData, filters.department]);

  // Group employees by department
  const employeesByDepartment = useMemo(() => {
    const grouped: { [key: string]: { employees: EmployeePerformance[]; avgScore: number; status: string } } = {};
    filteredEmployees.forEach(emp => {
      if (!grouped[emp.department]) {
        grouped[emp.department] = { employees: [], avgScore: 0, status: 'poor' };
      }
      grouped[emp.department].employees.push(emp);
    });
    // Calculate avg score for each department
    Object.keys(grouped).forEach(dept => {
      const emps = grouped[dept].employees;
      const totalScore = emps.reduce((sum, e) => sum + (e.attendance + e.taskCompletion) / 2, 0);
      const avgScore = emps.length > 0 ? Math.round(totalScore / emps.length) : 0;
      grouped[dept].avgScore = avgScore;
      grouped[dept].status = avgScore >= 90 ? 'excellent' : avgScore >= 75 ? 'good' : avgScore >= 60 ? 'average' : 'poor';
    });
    return grouped;
  }, [filteredEmployees]);

  const toggleDepartment = (dept: string) => {
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dept)) {
        newSet.delete(dept);
      } else {
        newSet.add(dept);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedDepartments(new Set(Object.keys(employeesByDepartment)));
  };

  const collapseAll = () => {
    setExpandedDepartments(new Set());
  };

  // Performance Metric component
  const PerformanceMetric = ({ label, value, color }: { label: string; value: number | null; color: string }) => {
    const rating = getRatingLabel(value);
    const ratingColor = getRatingStatusColor(rating);
    const ratingBgColor = getRatingStatusBgColor(rating);
    const ratingIcon = getRatingStatusIcon(rating);
    
    return (
      <View style={styles.modernMetricContainer}>
        <View style={styles.metricHeaderRow}>
          <View style={styles.metricLabelContainer}>
            <Text style={styles.modernMetricLabel}>{label}</Text>
            <View style={[styles.modernStatusBadge, { backgroundColor: ratingBgColor }]}>
              <Ionicons name={ratingIcon} size={12} color={ratingColor} style={styles.statusBadgeIcon} />
              <Text style={[styles.modernStatusText, { color: ratingColor }]}>{rating.charAt(0).toUpperCase() + rating.slice(1)}</Text>
            </View>
          </View>
          <Text style={[styles.modernMetricValue, { color: ratingColor }]}>{value !== null ? `${value}%` : 'N/A'}</Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${value !== null ? value : 0}%`, backgroundColor: ratingColor }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabelStart}>0%</Text>
            <Text style={styles.progressLabelEnd}>100%</Text>
          </View>
        </View>
      </View>
    );
  };

  // Department Card component
  const DepartmentCard = ({ department }: { department: DepartmentPerformance }) => (
    <Card style={styles.departmentCard}>
      <View style={styles.departmentCardHeader}>
        <Text style={styles.departmentName}>{department.name}</Text>
        <View style={[styles.enhancedStatusBadge, { backgroundColor: getRatingStatusBgColor(department.status) }]}>
          <Ionicons name={getRatingStatusIcon(department.status)} size={14} color={getRatingStatusColor(department.status)} style={styles.statusBadgeIcon} />
          <Text style={[styles.enhancedStatusText, { color: getRatingStatusColor(department.status) }]}>{department.status.charAt(0).toUpperCase() + department.status.slice(1)}</Text>
        </View>
      </View>
      <View style={styles.departmentStats}>
        <View style={styles.departmentStatItem}><Text style={styles.statLabel}>Total Employees</Text><Text style={styles.statValue}>{department.totalEmployees}</Text></View>
        <View style={styles.departmentStatItem}><Text style={styles.statLabel}>Avg Productivity</Text><Text style={[styles.statValue, { color: getRatingColor(department.avgProductivity) }]}>{department.avgProductivity}%</Text></View>
        <View style={styles.departmentStatItem}><Text style={styles.statLabel}>Avg Attendance</Text><Text style={[styles.statValue, { color: getRatingColor(department.avgAttendance) }]}>{department.avgAttendance}%</Text></View>
        <View style={styles.departmentStatItem}><Text style={styles.statLabel}>Tasks Completed</Text><Text style={styles.statValue}>{department.tasksCompleted}</Text></View>
        <View style={styles.departmentStatItem}><Text style={styles.statLabel}>Tasks Pending</Text><Text style={styles.statValue}>{department.tasksPending}</Text></View>
      </View>
      <View style={styles.performanceScoreContainer}>
        <Text style={styles.performanceScoreLabel}>Performance Score</Text>
        <View style={styles.performanceScoreRow}>
          <ProgressBar progress={department.performanceScore / 100} color={getRatingColor(department.performanceScore)} style={styles.performanceBar} />
          <Text style={[styles.performanceScoreValue, { color: getRatingColor(department.performanceScore) }]}>{department.performanceScore}%</Text>
        </View>
      </View>
    </Card>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
        <StatusBar style="light" backgroundColor="#0891b2" translucent={false} />
        <LinearGradient colors={['#0891b2', '#0e7490', '#155e75']} style={styles.headerGradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading Reports...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Render tab content
  const renderTabContent = () => {
    if (!reportsData) return null;

    switch (activeTab) {
      case "employee":
        return (
          <>
            {/* Section Header */}
            <View style={styles.sectionHeaderCard}>
              <LinearGradient colors={['#dbeafe', '#bfdbfe']} style={styles.sectionHeaderGradient}>
                <View style={styles.sectionHeaderContent}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.sectionHeaderIconBg, { backgroundColor: '#3b82f6' }]}>
                      <Ionicons name="people" size={20} color="#fff" />
                    </View>
                    <View style={styles.sectionHeaderTextContainer}>
                      <Text style={styles.sectionHeaderTitle}>Individual Performance Metrics</Text>
                      <Text style={styles.sectionHeaderSubtitle}>{filteredEmployees.length} employees • {filters.month}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.employeeExportButton} 
                    activeOpacity={0.7} 
                    onPress={openExportModal}
                  >
                    <LinearGradient 
                      colors={['#3b82f6', '#2563eb']} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 1 }}
                      style={styles.employeeExportButtonGradient}
                    >
                      <View style={styles.employeeExportButtonContent}>
                        <View style={styles.employeeExportIconWrapper}>
                          <Ionicons name="download-outline" size={18} color="#fff" />
                        </View>
                        <View style={styles.employeeExportTextWrapper}>
                          <Text style={styles.employeeExportButtonLabel}>Export</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            {/* Expand/Collapse All */}
            <View style={styles.expandCollapseRow}>
              <TouchableOpacity style={styles.expandCollapseBtn} onPress={expandAll}>
                <Text style={styles.expandCollapseText}>Expand All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.expandCollapseBtn} onPress={collapseAll}>
                <Text style={styles.expandCollapseText}>Collapse All</Text>
              </TouchableOpacity>
            </View>
            
            {filteredEmployees.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyStateText}>No employees found</Text>
              </View>
            ) : (
              Object.entries(employeesByDepartment).map(([deptName, deptData]) => (
                <View key={deptName} style={styles.deptSection}>
                  {/* Department Header */}
                  <TouchableOpacity 
                    style={styles.deptHeader} 
                    onPress={() => toggleDepartment(deptName)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.deptHeaderLeft}>
                      <View style={styles.deptIconBg}>
                        <Ionicons name="people" size={20} color="#3b82f6" />
                      </View>
                      <View>
                        <Text style={styles.deptName}>{deptName}</Text>
                        <Text style={styles.deptMeta}>{deptData.employees.length} Employee{deptData.employees.length !== 1 ? 's' : ''} • Avg Score: {deptData.avgScore}%</Text>
                      </View>
                    </View>
                    <View style={styles.deptHeaderRight}>
                      <View style={[styles.deptStatusBadge, { backgroundColor: getRatingStatusBgColor(deptData.status as RatingType) }]}>
                        <Text style={[styles.deptStatusText, { color: getRatingStatusColor(deptData.status as RatingType) }]}>
                          {deptData.status.charAt(0).toUpperCase() + deptData.status.slice(1)}
                        </Text>
                      </View>
                      <Ionicons 
                        name={expandedDepartments.has(deptName) ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#6b7280" 
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Employee List */}
                  {expandedDepartments.has(deptName) && (
                    <View style={styles.deptEmployees}>
                      {deptData.employees.map(employee => (
                        <View key={employee.id} style={styles.empCard}>
                          {/* Employee Header Row */}
                          <View style={styles.empCardHeader}>
                            <View style={styles.empAvatarContainer}>
                              <View style={styles.empAvatar}>
                                <Text style={styles.empAvatarText}>{employee.name.charAt(0).toUpperCase()}</Text>
                              </View>
                              <View style={styles.empNameContainer}>
                                <Text style={styles.empName}>{employee.name}</Text>
                                <Text style={styles.empMeta}>{employee.empId} • {employee.department} • {employee.role}</Text>
                              </View>
                            </View>
                            <View style={styles.empActions}>
                              <View style={[styles.empStatusBadge, { backgroundColor: getRatingStatusBgColor(employee.status) }]}>
                                <Text style={[styles.empStatusText, { color: getRatingStatusColor(employee.status) }]}>
                                  {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                                </Text>
                              </View>
                              <TouchableOpacity 
                                style={styles.prominentRateBtn} 
                                onPress={() => openRatingModal(employee)}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="create-outline" size={14} color="#fff" />
                                <Text style={styles.prominentRateBtnText}>Rate</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Horizontal Metrics Row */}
                          <View style={styles.metricsRow}>
                            {/* Attendance */}
                            <View style={styles.metricBox}>
                              <View style={styles.metricIconRow}>
                                <Ionicons name="time-outline" size={14} color="#6b7280" />
                                <Text style={styles.metricLabel}>Attendance</Text>
                              </View>
                              <Text style={[styles.metricValue, { color: getRatingColor(employee.attendance) }]}>
                                {employee.attendance}<Text style={styles.metricUnit}> %</Text>
                              </Text>
                              <View style={styles.metricProgress}>
                                <View style={[styles.metricProgressFill, { width: `${employee.attendance}%`, backgroundColor: getRatingColor(employee.attendance) }]} />
                              </View>
                              <Text style={styles.metricNote}>Auto-calculated</Text>
                            </View>

                            {/* Tasks */}
                            <View style={styles.metricBox}>
                              <View style={styles.metricIconRow}>
                                <Ionicons name="checkmark-circle-outline" size={14} color="#22c55e" />
                                <Text style={styles.metricLabel}>Tasks</Text>
                              </View>
                              <Text style={[styles.metricValue, { color: getRatingColor(employee.taskCompletion) }]}>
                                {employee.taskCompletion}<Text style={styles.metricUnit}> %</Text>
                              </Text>
                              <View style={styles.metricProgress}>
                                <View style={[styles.metricProgressFill, { width: `${employee.taskCompletion}%`, backgroundColor: getRatingColor(employee.taskCompletion) }]} />
                              </View>
                              <Text style={styles.metricNote}>Auto-calculated</Text>
                            </View>

                            {/* Productivity */}
                            <View style={styles.metricBox}>
                              <View style={styles.metricIconRow}>
                                <Ionicons name="trending-up-outline" size={14} color="#f59e0b" />
                                <Text style={styles.metricLabel}>Productivity</Text>
                              </View>
                              <Text style={[styles.metricValue, { color: employee.productivity !== null ? getRatingColor(employee.productivity) : '#9ca3af' }]}>
                                {employee.productivity !== null ? `${employee.productivity}%` : 'Not rated yet'}
                              </Text>
                              {employee.productivity !== null && (
                                <View style={styles.metricProgress}>
                                  <View style={[styles.metricProgressFill, { width: `${employee.productivity}%`, backgroundColor: getRatingColor(employee.productivity) }]} />
                                </View>
                              )}
                              <Text style={styles.metricNote}>Manual rating</Text>
                            </View>

                            {/* Quality */}
                            <View style={styles.metricBox}>
                              <View style={styles.metricIconRow}>
                                <Ionicons name="ribbon-outline" size={14} color="#f59e0b" />
                                <Text style={styles.metricLabel}>Quality</Text>
                              </View>
                              <Text style={[styles.metricValue, { color: employee.qualityScore !== null ? getRatingColor(employee.qualityScore) : '#9ca3af' }]}>
                                {employee.qualityScore !== null ? `${employee.qualityScore}%` : 'Not rated yet'}
                              </Text>
                              {employee.qualityScore !== null && (
                                <View style={styles.metricProgress}>
                                  <View style={[styles.metricProgressFill, { width: `${employee.qualityScore}%`, backgroundColor: getRatingColor(employee.qualityScore) }]} />
                                </View>
                              )}
                              <Text style={styles.metricNote}>Manual rating</Text>
                            </View>

                            {/* Overall */}
                            <View style={[styles.metricBox, styles.metricBoxHighlight]}>
                              <View style={styles.metricIconRow}>
                                <Ionicons name="bar-chart-outline" size={14} color="#3b82f6" />
                                <Text style={styles.metricLabel}>Overall</Text>
                              </View>
                              <Text style={[styles.metricValue, { color: employee.overallRating !== null ? getRatingColor(employee.overallRating) : '#9ca3af' }]}>
                                {employee.overallRating !== null ? `${employee.overallRating}%` : 'Pending ratings'}
                              </Text>
                              {employee.overallRating === null && (
                                <Text style={styles.metricNote}>Average score</Text>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        );

      case "department":
        return (
          <>
            <View style={styles.sectionHeaderCard}>
              <LinearGradient colors={['#fef3c7', '#fde68a']} style={styles.sectionHeaderGradient}>
                <View style={styles.sectionHeaderContent}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.sectionHeaderIconBg, { backgroundColor: '#f59e0b' }]}><Ionicons name="business" size={20} color="#fff" /></View>
                    <View>
                      <Text style={styles.sectionHeaderTitle}>Department Overview</Text>
                      <Text style={styles.sectionHeaderSubtitle}>{filteredDepartments.length} departments • {filters.month}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.modernExportButton} activeOpacity={0.8}>
                    <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.exportButtonGradient}>
                      <Ionicons name="download-outline" size={16} color="#fff" />
                      <Text style={styles.modernExportButtonText}>Export</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
            
            {filteredDepartments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="business-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyStateText}>No departments found</Text>
              </View>
            ) : (
              <View style={styles.departmentsGrid}>
                {filteredDepartments.map(department => <DepartmentCard key={department.id} department={department} />)}
              </View>
            )}
          </>
        );

      case "executive":
        const exec = reportsData.executive;
        return (
          <>
            <View style={styles.modernSummaryCards}>
              <View style={[styles.modernSummaryCard, styles.topPerformerCard]}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.summaryCardGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                  <View style={styles.summaryCardContent}>
                    <View style={styles.summaryCardHeader}><Text style={styles.modernSummaryCardLabel}>Top Performer</Text><View style={styles.summaryCardIconContainer}><Ionicons name="trophy" size={20} color="#fff" /></View></View>
                    <Text style={styles.modernSummaryCardTitle}>{exec.topPerformer.name}</Text>
                    <Text style={styles.modernSummaryCardValue}>{exec.topPerformer.score}% Overall Score</Text>
                  </View>
                </LinearGradient>
              </View>
              
              <View style={[styles.modernSummaryCard, styles.avgPerformanceCard]}>
                <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.summaryCardGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                  <View style={styles.summaryCardContent}>
                    <View style={styles.summaryCardHeader}><Text style={styles.modernSummaryCardLabel}>Avg Performance</Text><View style={styles.summaryCardIconContainer}><Ionicons name="analytics" size={20} color="#fff" /></View></View>
                    <Text style={styles.modernSummaryCardTitle}>{exec.avgPerformance.toFixed(1)}%</Text>
                    <Text style={styles.modernSummaryCardValue}>All Employees</Text>
                  </View>
                </LinearGradient>
              </View>
              
              <View style={[styles.modernSummaryCard, styles.tasksCompletedCard]}>
                <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.summaryCardGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                  <View style={styles.summaryCardContent}>
                    <View style={styles.summaryCardHeader}><Text style={styles.modernSummaryCardLabel}>Tasks Completed</Text><View style={styles.summaryCardIconContainer}><Ionicons name="checkmark-circle" size={20} color="#fff" /></View></View>
                    <Text style={styles.modernSummaryCardTitle}>{exec.tasksCompleted}</Text>
                    <Text style={styles.modernSummaryCardValue}>{exec.tasksTrend >= 0 ? '+' : ''}{exec.tasksTrend}% vs last month</Text>
                  </View>
                </LinearGradient>
              </View>
              
              <View style={[styles.modernSummaryCard, styles.bestDepartmentCard]}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.summaryCardGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                  <View style={styles.summaryCardContent}>
                    <View style={styles.summaryCardHeader}><Text style={styles.modernSummaryCardLabel}>Best Department</Text><View style={styles.summaryCardIconContainer}><Ionicons name="business" size={20} color="#fff" /></View></View>
                    <Text style={styles.modernSummaryCardTitle}>{exec.bestDepartment.name}</Text>
                    <Text style={styles.modernSummaryCardValue}>{exec.bestDepartment.score}% Score</Text>
                  </View>
                </LinearGradient>
              </View>
            </View>

            <Card style={styles.executiveSummaryCard}>
              <Text style={styles.executiveSectionTitle}>Executive Summary</Text>
              
              <View style={styles.executiveSection}>
                <Text style={styles.executiveSectionSubtitle}>Key Findings</Text>
                {exec.keyFindings.map((finding, index) => (
                  <View key={`finding-${index}`} style={styles.executiveListItem}>
                    <View style={styles.executiveListBullet} />
                    <Text style={styles.executiveListText}>{finding}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.executiveSection}>
                <Text style={styles.executiveSectionSubtitle}>Recommendations</Text>
                {exec.recommendations.map((rec, index) => (
                  <View key={`rec-${index}`} style={styles.executiveListItem}>
                    <View style={styles.executiveListBullet} />
                    <Text style={styles.executiveListText}>{rec}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.executiveSection}>
                <Text style={styles.executiveSectionSubtitle}>Action Items</Text>
                {exec.actionItems.map((action, index) => (
                  <View key={`action-${index}`} style={styles.executiveListItem}>
                    <View style={styles.executiveListBullet} />
                    <Text style={styles.executiveListText}>{action}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.reportActions}>
                <Button mode="contained" icon="file-document-outline" onPress={() => {}} style={styles.generateReportButton}>Generate Full Report</Button>
                <Button mode="contained" icon="download" onPress={() => {}} style={styles.downloadSummaryButton}>Download Summary</Button>
              </View>
            </Card>
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
      <StatusBar style="light" backgroundColor="#0891b2" translucent={false} />
      
      {/* Header */}
      <LinearGradient colors={['#0891b2', '#0e7490', '#155e75']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        <View style={styles.headerPattern}>
          <View style={[styles.patternCircle, { top: -30, right: -30, width: 140, height: 140 }]} />
          <View style={[styles.patternCircle, { bottom: -40, left: -40, width: 160, height: 160 }]} />
          <View style={[styles.patternCircle, { top: 50, right: 100, width: 80, height: 80 }]} />
        </View>

        <Animated.View style={[styles.headerContent, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
          <View style={styles.headerTopRow}>
            {/* Hide back button for admin since Reports is their main screen */}
            {!isAdmin && (
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            {isAdmin && (
              <View style={styles.adminIconContainer}>
                <Ionicons name="shield-checkmark" size={24} color="#fff" />
              </View>
            )}
            <View style={styles.headerTitleSection}>
              <Text style={styles.headerTitle}>{isAdmin ? 'Admin Reports' : 'Performance Reports'}</Text>
              <Text style={styles.headerSubtitle}>{isAdmin ? 'All departments & roles data' : 'Analyze metrics, export insights'}</Text>
            </View>
            <TouchableOpacity style={styles.exportHeaderButton} activeOpacity={0.7}>
              <Ionicons name="download-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            <Dropdown 
              value={filters.month} 
              options={MONTHS} 
              onSelect={(m) => {
                setFilters(prev => ({ ...prev, month: m as MonthType }));
              }} 
            />
            <Dropdown 
              value={filters.department} 
              options={departments} 
              onSelect={(d) => {
                setFilters(prev => ({ ...prev, department: d }));
              }} 
            />
          </View>
        </Animated.View>
      </LinearGradient>
      
      <View style={styles.contentContainer}>
        {/* Tabs */}
        <View style={styles.modernTabsContainer}>
          <TouchableOpacity style={[styles.modernTab, activeTab === "employee" && styles.modernTabActive]} onPress={() => handleTabChange("employee")} activeOpacity={0.7}>
            <View style={[styles.modernTabIcon, activeTab === "employee" && styles.modernTabIconActive]}><Ionicons name="person-outline" size={18} color={activeTab === "employee" ? "#fff" : "#6b7280"} /></View>
            <Text style={[styles.modernTabText, activeTab === "employee" && styles.modernTabTextActive]}>Employee</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modernTab, activeTab === "department" && styles.modernTabActive]} onPress={() => handleTabChange("department")} activeOpacity={0.7}>
            <View style={[styles.modernTabIcon, activeTab === "department" && styles.modernTabIconActive]}><Ionicons name="business-outline" size={18} color={activeTab === "department" ? "#fff" : "#6b7280"} /></View>
            <Text style={[styles.modernTabText, activeTab === "department" && styles.modernTabTextActive]}>Department</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modernTab, activeTab === "executive" && styles.modernTabActive]} onPress={() => handleTabChange("executive")} activeOpacity={0.7}>
            <View style={[styles.modernTabIcon, activeTab === "executive" && styles.modernTabIconActive]}><Ionicons name="stats-chart-outline" size={18} color={activeTab === "executive" ? "#fff" : "#6b7280"} /></View>
            <Text style={[styles.modernTabText, activeTab === "executive" && styles.modernTabTextActive]}>Executive</Text>
          </TouchableOpacity>
        </View>

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        )}
        
        {/* Content */}
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[styles.scrollContentContainer, { paddingBottom: tabBarVisible ? tabBarHeight + 24 : 100 }]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0891b2']} />}
        >
          <Animated.View style={[styles.tabContent, { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }]}>
            {renderTabContent()}
          </Animated.View>
        </ScrollView>
      </View>

      {/* Rating Modal */}
      <Modal visible={ratingModalVisible} animationType="slide" transparent onRequestClose={closeRatingModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.ratingModalContainer}>
            <View style={styles.ratingModalHeader}>
              <View style={styles.ratingModalHeaderTop}>
                <View style={styles.ratingModalEmployeeInfo}>
                  <View style={styles.ratingModalAvatar}>
                    <Text style={styles.ratingModalAvatarText}>{selectedEmployee?.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.ratingModalEmployeeDetails}>
                    <Text style={styles.ratingModalTitle}>Rate Performance</Text>
                    <Text style={styles.ratingModalSubtitle}>{selectedEmployee?.name} • {selectedEmployee?.empId}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.modalCloseButton} onPress={closeRatingModal}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.ratingModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.ratingSection}>
                <View style={styles.ratingSectionHeader}>
                  <Ionicons name="trending-up-outline" size={20} color="#f59e0b" />
                  <Text style={styles.ratingSectionTitle}>Productivity Rating</Text>
                </View>
                <Text style={styles.ratingSectionDescription}>Rate the employee's productivity and output quality</Text>
                <StarRating rating={productivityRating} onRatingChange={setProductivityRating} size={32} />
                <View style={styles.commentSection}>
                  <Text style={styles.commentLabel}>Comments (Optional)</Text>
                  <TextInput 
                    style={styles.commentInput} 
                    placeholder="Describe the employee's productivity..." 
                    value={productivityComment} 
                    onChangeText={setProductivityComment} 
                    multiline 
                    numberOfLines={4} 
                    textAlignVertical="top"
                    maxLength={500}
                  />
                  <Text style={styles.characterCount}>{productivityComment.length}/500</Text>
                </View>
              </View>

              <View style={styles.ratingSection}>
                <View style={styles.ratingSectionHeader}>
                  <Ionicons name="ribbon-outline" size={20} color="#f59e0b" />
                  <Text style={styles.ratingSectionTitle}>Quality Score</Text>
                </View>
                <Text style={styles.ratingSectionDescription}>Rate the quality of work and attention to detail</Text>
                <StarRating rating={qualityRating} onRatingChange={setQualityRating} size={32} />
                <View style={styles.commentSection}>
                  <Text style={styles.commentLabel}>Comments (Optional)</Text>
                  <TextInput 
                    style={styles.commentInput} 
                    placeholder="Describe the quality of work..." 
                    value={qualityComment} 
                    onChangeText={setQualityComment} 
                    multiline 
                    numberOfLines={4} 
                    textAlignVertical="top"
                    maxLength={500}
                  />
                  <Text style={styles.characterCount}>{qualityComment.length}/500</Text>
                </View>
              </View>

              <View style={styles.ratingOverallPreview}>
                <Text style={styles.ratingOverallLabel}>Overall Score Preview</Text>
                <View style={styles.ratingOverallMetricsGrid}>
                  <View style={styles.ratingOverallMetricItem}>
                    <Text style={styles.ratingOverallMetricLabel}>Attendance</Text>
                    <Text style={[styles.ratingOverallMetricValue, { color: getRatingColor(selectedEmployee?.attendance || 0) }]}>
                      {selectedEmployee?.attendance || 0}%
                    </Text>
                  </View>
                  <View style={styles.ratingOverallMetricItem}>
                    <Text style={styles.ratingOverallMetricLabel}>Tasks</Text>
                    <Text style={[styles.ratingOverallMetricValue, { color: getRatingColor(selectedEmployee?.taskCompletion || 0) }]}>
                      {selectedEmployee?.taskCompletion || 0}%
                    </Text>
                  </View>
                  <View style={styles.ratingOverallMetricItem}>
                    <Text style={styles.ratingOverallMetricLabel}>Productivity</Text>
                    <Text style={[styles.ratingOverallMetricValue, { color: getRatingColor(productivityRating) }]}>
                      {productivityRating > 0 ? `${productivityRating}%` : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.ratingOverallMetricItem}>
                    <Text style={styles.ratingOverallMetricLabel}>Quality</Text>
                    <Text style={[styles.ratingOverallMetricValue, { color: getRatingColor(qualityRating) }]}>
                      {qualityRating > 0 ? `${qualityRating}%` : 'N/A'}
                    </Text>
                  </View>
                </View>
                <View style={styles.ratingOverallFinalScore}>
                  <Text style={styles.ratingOverallFinalLabel}>Final Overall Score</Text>
                  <Text style={[styles.ratingOverallFinalValue, { color: getRatingColor(productivityRating > 0 && qualityRating > 0 ? calculateOverallScore(selectedEmployee?.attendance || 0, selectedEmployee?.taskCompletion || 0, productivityRating, qualityRating) : null) }]}>
                    {productivityRating > 0 && qualityRating > 0 ? `${calculateOverallScore(selectedEmployee?.attendance || 0, selectedEmployee?.taskCompletion || 0, productivityRating, qualityRating)}%` : 'Pending ratings'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.ratingModalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeRatingModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, (productivityRating === 0 || qualityRating === 0) && styles.saveButtonDisabled]} 
                onPress={saveRatings}
                disabled={productivityRating === 0 || qualityRating === 0}
              >
                <Text style={styles.saveButtonText}>Save Ratings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal visible={exportModalVisible} animationType="fade" transparent onRequestClose={closeExportModal}>
        <View style={styles.exportModalOverlay}>
          <View style={styles.exportModalContainer}>
            {/* Header */}
            <LinearGradient 
              colors={['#3b82f6', '#1d4ed8']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }}
              style={styles.exportModalHeader}
            >
              <View style={styles.exportModalHeaderRow}>
                <View style={styles.exportModalHeaderIcon}>
                  <Ionicons name="document-text-outline" size={22} color="#fff" />
                </View>
                <View style={styles.exportModalHeaderTextWrap}>
                  <Text style={styles.exportModalTitle}>Export Report</Text>
                  <Text style={styles.exportModalSubtitle}>Download performance data</Text>
                </View>
                <TouchableOpacity style={styles.exportModalCloseBtn} onPress={closeExportModal}>
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Content */}
            <View style={styles.exportModalBody}>
              {/* Format Selection - Compact */}
              <View style={styles.exportFieldGroup}>
                <Text style={styles.exportFieldLabel}>Format</Text>
                <View style={styles.exportFormatBtnRow}>
                  <TouchableOpacity 
                    style={[styles.exportFormatBtn, exportFormat === 'pdf' && styles.exportFormatBtnActive]}
                    onPress={() => setExportFormat('pdf')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="document-text" size={18} color={exportFormat === 'pdf' ? '#fff' : '#ef4444'} />
                    <Text style={[styles.exportFormatBtnText, exportFormat === 'pdf' && styles.exportFormatBtnTextActive]}>PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.exportFormatBtn, exportFormat === 'csv' && styles.exportFormatBtnActiveGreen]}
                    onPress={() => setExportFormat('csv')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="grid" size={18} color={exportFormat === 'csv' ? '#fff' : '#22c55e'} />
                    <Text style={[styles.exportFormatBtnText, exportFormat === 'csv' && styles.exportFormatBtnTextActive]}>CSV</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Department Selection */}
              <View style={styles.exportFieldGroup}>
                <Text style={styles.exportFieldLabel}>Department</Text>
                <TouchableOpacity 
                  style={[styles.exportDropdownTrigger, departmentDropdownOpen && styles.exportDropdownTriggerActive]}
                  onPress={() => {
                    closeAllExportDropdowns();
                    setDepartmentDropdownOpen(!departmentDropdownOpen);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="business" size={16} color="#6b7280" />
                  <Text style={styles.exportDropdownTriggerText} numberOfLines={1}>
                    {exportDepartment === 'all' ? 'All Departments' : exportDepartment}
                  </Text>
                  <Ionicons name={departmentDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Employee Selection */}
              <View style={styles.exportFieldGroup}>
                <Text style={styles.exportFieldLabel}>Employee ({exportFilteredEmployees.length})</Text>
                <TouchableOpacity 
                  style={[styles.exportDropdownTrigger, employeeDropdownOpen && styles.exportDropdownTriggerActive]}
                  onPress={() => {
                    closeAllExportDropdowns();
                    setEmployeeDropdownOpen(!employeeDropdownOpen);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person" size={16} color="#6b7280" />
                  <Text style={styles.exportDropdownTriggerText} numberOfLines={1}>
                    {exportEmployee === 'all' ? 'All Employees' : exportFilteredEmployees.find(e => e.id.toString() === exportEmployee)?.name || 'Select'}
                  </Text>
                  <Ionicons name={employeeDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Time Range */}
              <View style={styles.exportFieldGroup}>
                <Text style={styles.exportFieldLabel}>Time Range</Text>
                <TouchableOpacity 
                  style={[styles.exportDropdownTrigger, timeRangeDropdownOpen && styles.exportDropdownTriggerActive]}
                  onPress={() => {
                    closeAllExportDropdowns();
                    setTimeRangeDropdownOpen(!timeRangeDropdownOpen);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="time" size={16} color="#6b7280" />
                  <Text style={styles.exportDropdownTriggerText}>
                    {exportTimeRange === 'monthly' ? 'Monthly' : exportTimeRange === 'quarterly' ? 'Quarterly' : 'Yearly'}
                  </Text>
                  <Ionicons name={timeRangeDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Month & Year Row */}
              <View style={styles.exportFieldRow}>
                <View style={styles.exportFieldHalf}>
                  <Text style={styles.exportFieldLabel}>Month</Text>
                  <TouchableOpacity 
                    style={[styles.exportDropdownTrigger, monthDropdownOpen && styles.exportDropdownTriggerActive]}
                    onPress={() => {
                      closeAllExportDropdowns();
                      setMonthDropdownOpen(!monthDropdownOpen);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.exportDropdownTriggerText}>{exportMonth}</Text>
                    <Ionicons name={monthDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
                <View style={styles.exportFieldHalf}>
                  <Text style={styles.exportFieldLabel}>Year</Text>
                  <TouchableOpacity 
                    style={[styles.exportDropdownTrigger, yearDropdownOpen && styles.exportDropdownTriggerActive]}
                    onPress={() => {
                      closeAllExportDropdowns();
                      setYearDropdownOpen(!yearDropdownOpen);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.exportDropdownTriggerText}>{exportYear}</Text>
                    <Ionicons name={yearDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.exportModalFooter}>
              <TouchableOpacity style={styles.exportCancelBtn} onPress={closeExportModal} activeOpacity={0.7}>
                <Text style={styles.exportCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportSubmitBtn} onPress={handleExport} activeOpacity={0.8}>
                <LinearGradient colors={['#3b82f6', '#1d4ed8']} style={styles.exportSubmitBtnGradient}>
                  <Ionicons name="download" size={18} color="#fff" />
                  <Text style={styles.exportSubmitBtnText}>Export {exportFormat.toUpperCase()}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Dropdown Modals - Rendered outside main container for proper z-index */}
          {departmentDropdownOpen && (
            <View style={styles.exportDropdownOverlay}>
              <TouchableOpacity style={styles.exportDropdownBackdrop} onPress={() => setDepartmentDropdownOpen(false)} />
              <View style={styles.exportDropdownModal}>
                <View style={styles.exportDropdownHeader}>
                  <Text style={styles.exportDropdownHeaderText}>Select Department</Text>
                  <TouchableOpacity onPress={() => setDepartmentDropdownOpen(false)}>
                    <Ionicons name="close" size={22} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={['all', ...departments.filter(d => d !== 'All Departments')]}
                  keyExtractor={(item) => item}
                  style={styles.exportDropdownScrollContainer}
                  contentContainerStyle={styles.exportDropdownScrollContent}
                  showsVerticalScrollIndicator={true}
                  bounces={true}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  renderItem={({ item: dept }) => (
                    <TouchableOpacity 
                      style={[styles.exportDropdownOption, exportDepartment === dept && styles.exportDropdownOptionActive]}
                      onPress={() => { setExportDepartment(dept === 'all' ? 'all' : dept); setExportEmployee('all'); setDepartmentDropdownOpen(false); }}
                    >
                      <Ionicons name={dept === 'all' ? "business" : "folder"} size={20} color={exportDepartment === dept ? "#3b82f6" : "#6b7280"} />
                      <Text style={[styles.exportDropdownOptionText, exportDepartment === dept && styles.exportDropdownOptionTextActive]}>
                        {dept === 'all' ? 'All Departments' : dept}
                      </Text>
                      {exportDepartment === dept && <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          )}

          {employeeDropdownOpen && (
            <View style={styles.exportDropdownOverlay}>
              <TouchableOpacity style={styles.exportDropdownBackdrop} onPress={() => setEmployeeDropdownOpen(false)} />
              <View style={styles.exportDropdownModal}>
                <View style={styles.exportDropdownHeader}>
                  <View>
                    <Text style={styles.exportDropdownHeaderText}>Select Employee</Text>
                    <Text style={styles.exportDropdownHeaderSub}>{exportFilteredEmployees.length} employees available</Text>
                  </View>
                  <TouchableOpacity onPress={() => setEmployeeDropdownOpen(false)}>
                    <Ionicons name="close" size={22} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={[{ id: 'all', name: 'All Employees', empId: '', department: '' }, ...exportFilteredEmployees]}
                  keyExtractor={(item) => item.id.toString()}
                  style={styles.exportDropdownScrollContainer}
                  contentContainerStyle={styles.exportDropdownScrollContent}
                  showsVerticalScrollIndicator={true}
                  bounces={true}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  ListEmptyComponent={
                    <View style={styles.exportDropdownEmpty}>
                      <Ionicons name="people-outline" size={36} color="#d1d5db" />
                      <Text style={styles.exportDropdownEmptyText}>No employees in this department</Text>
                    </View>
                  }
                  renderItem={({ item: emp }) => (
                    <TouchableOpacity 
                      style={[styles.exportDropdownOption, exportEmployee === emp.id.toString() && styles.exportDropdownOptionActive]}
                      onPress={() => { setExportEmployee(emp.id.toString()); setEmployeeDropdownOpen(false); }}
                    >
                      {emp.id === 'all' ? (
                        <Ionicons name="people" size={20} color={exportEmployee === 'all' ? "#3b82f6" : "#6b7280"} />
                      ) : (
                        <View style={styles.exportDropdownAvatar}>
                          <Text style={styles.exportDropdownAvatarText}>{emp.name.charAt(0)}</Text>
                        </View>
                      )}
                      <View style={styles.exportDropdownOptionInfo}>
                        <Text style={[styles.exportDropdownOptionText, exportEmployee === emp.id.toString() && styles.exportDropdownOptionTextActive]}>{emp.name}</Text>
                        {emp.id !== 'all' && <Text style={styles.exportDropdownOptionSub}>{emp.empId} • {emp.department}</Text>}
                      </View>
                      {exportEmployee === emp.id.toString() && <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          )}

          {timeRangeDropdownOpen && (
            <View style={styles.exportDropdownOverlay}>
              <TouchableOpacity style={styles.exportDropdownBackdrop} onPress={() => setTimeRangeDropdownOpen(false)} />
              <View style={[styles.exportDropdownModal, styles.exportDropdownModalSmall]}>
                <View style={styles.exportDropdownHeader}>
                  <Text style={styles.exportDropdownHeaderText}>Time Range</Text>
                  <TouchableOpacity onPress={() => setTimeRangeDropdownOpen(false)}>
                    <Ionicons name="close" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                {['monthly', 'quarterly', 'yearly'].map(range => (
                  <TouchableOpacity 
                    key={range}
                    style={[styles.exportDropdownOption, exportTimeRange === range && styles.exportDropdownOptionActive]}
                    onPress={() => { setExportTimeRange(range as any); setTimeRangeDropdownOpen(false); }}
                  >
                    <Ionicons name="calendar" size={18} color={exportTimeRange === range ? "#3b82f6" : "#6b7280"} />
                    <Text style={[styles.exportDropdownOptionText, exportTimeRange === range && styles.exportDropdownOptionTextActive]}>
                      {range.charAt(0).toUpperCase() + range.slice(1)}
                    </Text>
                    {exportTimeRange === range && <Ionicons name="checkmark-circle" size={18} color="#3b82f6" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {monthDropdownOpen && (
            <View style={styles.exportDropdownOverlay}>
              <TouchableOpacity style={styles.exportDropdownBackdrop} onPress={() => setMonthDropdownOpen(false)} />
              <View style={styles.exportDropdownModal}>
                <View style={styles.exportDropdownHeader}>
                  <Text style={styles.exportDropdownHeaderText}>Select Month</Text>
                  <TouchableOpacity onPress={() => setMonthDropdownOpen(false)}>
                    <Ionicons name="close" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={MONTHS}
                  keyExtractor={(item) => item}
                  style={styles.exportDropdownScrollContainer}
                  contentContainerStyle={styles.exportDropdownScrollContent}
                  showsVerticalScrollIndicator={true}
                  bounces={true}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  renderItem={({ item: month }) => (
                    <TouchableOpacity 
                      style={[styles.exportDropdownOption, exportMonth === month && styles.exportDropdownOptionActive]}
                      onPress={() => { setExportMonth(month); setMonthDropdownOpen(false); }}
                    >
                      <Text style={[styles.exportDropdownOptionText, exportMonth === month && styles.exportDropdownOptionTextActive]}>{month}</Text>
                      {exportMonth === month && <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          )}

          {yearDropdownOpen && (
            <View style={styles.exportDropdownOverlay}>
              <TouchableOpacity style={styles.exportDropdownBackdrop} onPress={() => setYearDropdownOpen(false)} />
              <View style={[styles.exportDropdownModal, styles.exportDropdownModalSmall]}>
                <View style={styles.exportDropdownHeader}>
                  <Text style={styles.exportDropdownHeaderText}>Select Year</Text>
                  <TouchableOpacity onPress={() => setYearDropdownOpen(false)}>
                    <Ionicons name="close" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                {['2023', '2024', '2025'].map(year => (
                  <TouchableOpacity 
                    key={year}
                    style={[styles.exportDropdownOption, exportYear === year && styles.exportDropdownOptionActive]}
                    onPress={() => { setExportYear(year); setYearDropdownOpen(false); }}
                  >
                    <Text style={[styles.exportDropdownOptionText, exportYear === year && styles.exportDropdownOptionTextActive]}>{year}</Text>
                    {exportYear === year && <Ionicons name="checkmark-circle" size={18} color="#3b82f6" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeAreaContainer: { flex: 1, backgroundColor: "#0891b2" },
  headerGradient: { paddingTop: 8, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, position: 'relative', overflow: 'hidden' },
  headerPattern: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  patternCircle: { position: 'absolute', borderRadius: 9999, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  headerContent: { paddingHorizontal: 20, position: 'relative', zIndex: 1 },
  contentContainer: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 16, paddingTop: 16 },
  scrollView: { flex: 1 },
  scrollContentContainer: { flexGrow: 1 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255, 255, 255, 0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.2)" },
  adminIconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255, 255, 255, 0.2)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.3)" },
  exportHeaderButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255, 255, 255, 0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.2)" },
  headerTitleSection: { flex: 1, paddingHorizontal: 16 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 13, color: "rgba(255, 255, 255, 0.8)", marginTop: 2, fontWeight: "500" },
  filterRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 16, fontWeight: '600' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, marginBottom: 16, gap: 8 },
  errorText: { flex: 1, color: '#ef4444', fontSize: 13 },
  retryButton: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyState: { backgroundColor: '#fff', borderRadius: 14, padding: 32, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { marginTop: 12, fontSize: 14, color: '#9ca3af', textAlign: 'center' },

  // Tabs
  modernTabsContainer: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, marginBottom: 20, padding: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, gap: 6 },
  modernTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, gap: 6 },
  modernTabActive: { backgroundColor: "#0891b2", shadowColor: "#0891b2", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  modernTabIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  modernTabIconActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  modernTabText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  modernTabTextActive: { color: "#fff" },
  tabContent: { flex: 1, minHeight: '100%' },
  
  // Dropdown
  dropdownContainer: { position: "relative", width: "48%" },
  dropdownButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255, 255, 255, 0.2)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  dropdownLabel: { color: "#fff", fontSize: 14, fontWeight: "500" },
  dropdownOptions: { position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "#fff", borderRadius: 8, marginTop: 4, padding: 4, zIndex: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, maxHeight: 200 },
  dropdownOption: { paddingVertical: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 6 },
  dropdownOptionText: { fontSize: 14, color: "#374151" },
  dropdownOptionTextActive: { color: "#2563eb", fontWeight: "600" },
  
  // Section Header
  sectionHeaderCard: { borderRadius: 16, overflow: "hidden", marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  sectionHeaderGradient: { padding: 16 },
  sectionHeaderContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12, marginRight: 12 },
  sectionHeaderTextContainer: { flex: 1 },
  sectionHeaderIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#0891b2", alignItems: "center", justifyContent: "center" },
  sectionHeaderTitle: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  sectionHeaderSubtitle: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  modernExportButton: { borderRadius: 10, overflow: "hidden" },
  exportButtonGradient: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  modernExportButtonText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  
  // Employee Export Button
  employeeExportButton: { borderRadius: 12, overflow: "hidden", shadowColor: "#3b82f6", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  employeeExportButtonGradient: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, justifyContent: "center" },
  employeeExportButtonContent: { flexDirection: "row", alignItems: "center", gap: 6 },
  employeeExportIconWrapper: { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  employeeExportTextWrapper: { justifyContent: "center" },
  employeeExportButtonLabel: { fontSize: 13, fontWeight: "700", color: "#fff", letterSpacing: 0.2 },
  employeeExportButtonSubtext: { fontSize: 10, color: "rgba(255,255,255,0.85)", marginTop: 1, fontWeight: "500", letterSpacing: 0.1 },

  // Employee Card
  employeeCard: { marginBottom: 16, borderRadius: 16, overflow: "hidden", padding: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: "#f1f5f9" },
  employeeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  employeeName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  employeeMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  metricsContainer: { padding: 16, backgroundColor: "#fff" },
  overallRatingContainer: { padding: 16, backgroundColor: "#f8fafc", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  overallRatingLabel: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 8 },
  overallRatingStatus: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  overallRatingValue: { fontSize: 18, fontWeight: "700", color: "#2563eb" },
  overallRatingSubtext: { fontSize: 12, color: "#6b7280" },
  addRatingButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, backgroundColor: "#f0f9ff", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  addRatingButtonText: { fontSize: 14, fontWeight: "600", color: "#3b82f6", marginLeft: 6 },
  
  // Status Badge
  enhancedStatusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" },
  enhancedStatusText: { fontSize: 12, fontWeight: "600", marginLeft: 4 },
  statusBadgeIcon: { marginRight: 2 },
  
  // Performance Metric
  modernMetricContainer: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  metricHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  metricLabelContainer: { flex: 1 },
  modernMetricLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  modernStatusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-start" },
  modernStatusText: { fontSize: 10, fontWeight: "600", marginLeft: 3 },
  modernMetricValue: { fontSize: 24, fontWeight: "700", marginLeft: 12 },
  progressContainer: { marginTop: 4 },
  progressTrack: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4, minWidth: 2 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  progressLabelStart: { fontSize: 10, color: "#9ca3af" },
  progressLabelEnd: { fontSize: 10, color: "#9ca3af" },

  // Department Card
  departmentsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 },
  departmentCard: { width: "48%", marginBottom: 16, borderRadius: 16, overflow: "hidden", padding: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: "#f1f5f9" },
  departmentCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  departmentName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  departmentStats: { padding: 12, backgroundColor: "#fff" },
  departmentStatItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statLabel: { fontSize: 12, color: "#6b7280" },
  statValue: { fontSize: 14, fontWeight: "600", color: "#111827" },
  performanceScoreContainer: { padding: 12, backgroundColor: "#f8fafc", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  performanceScoreLabel: { fontSize: 12, fontWeight: "600", color: "#111827", marginBottom: 8 },
  performanceScoreRow: { flexDirection: "row", alignItems: "center" },
  performanceBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "#e5e7eb", marginRight: 8 },
  performanceScoreValue: { fontSize: 16, fontWeight: "700" },
  
  // Executive Summary Cards
  modernSummaryCards: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20 },
  modernSummaryCard: { width: "48%", marginBottom: 16, borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  summaryCardGradient: { flex: 1, padding: 16 },
  summaryCardContent: { flex: 1 },
  summaryCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modernSummaryCardLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryCardIconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  modernSummaryCardTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 4 },
  modernSummaryCardValue: { fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: "500" },
  topPerformerCard: {},
  avgPerformanceCard: {},
  tasksCompletedCard: {},
  bestDepartmentCard: {},

  // Executive Summary Card
  executiveSummaryCard: { padding: 20, borderRadius: 16, backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: "#f1f5f9" },
  executiveSectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16 },
  executiveSection: { marginBottom: 20 },
  executiveSectionSubtitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 12 },
  executiveListItem: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  executiveListBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#3b82f6", marginRight: 8 },
  executiveListText: { fontSize: 14, color: "#4b5563", flex: 1 },
  reportActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  generateReportButton: { flex: 1, marginRight: 8, backgroundColor: "#2563eb" },
  downloadSummaryButton: { flex: 1, marginLeft: 8, backgroundColor: "#3b82f6" },
  
  // Star Rating
  starRatingContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  starButton: { padding: 4, marginRight: 4 },
  ratingText: { marginLeft: 12, fontSize: 14, color: '#6b7280', fontWeight: '500' },

  // New Employee Performance Section Styles
  performanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  performanceTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  performanceSubtitle: { fontSize: 13, color: '#6b7280' },
  exportCsvButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, gap: 6 },
  exportCsvText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  expandCollapseRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12, gap: 8 },
  expandCollapseBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  expandCollapseText: { fontSize: 12, color: '#374151', fontWeight: '500' },

  // Department Section
  deptSection: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  deptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  deptHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deptIconBg: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  deptName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  deptMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  deptHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deptStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  deptStatusText: { fontSize: 12, fontWeight: '600' },
  deptEmployees: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },

  // Employee Card (inside department)
  empCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fafbfc' },
  empCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  empAvatarContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  empAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  empAvatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empNameContainer: { flex: 1 },
  empName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  empMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  empActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  empStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  empStatusText: { fontSize: 11, fontWeight: '600' },
  rateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  rateBtnText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  prominentRateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#ef4444', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  prominentRateBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  // Horizontal Metrics Row
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricBox: { flexBasis: '31%', flexGrow: 0, flexShrink: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', minWidth: 100 },
  metricBoxHighlight: { flexBasis: '48%', backgroundColor: '#f0f9ff', borderColor: '#bfdbfe' },
  metricIconRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  metricLabel: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  metricValue: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  metricUnit: { fontSize: 12, fontWeight: '500' },
  metricProgress: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 6, overflow: 'hidden' },
  metricProgressFill: { height: '100%', borderRadius: 2 },
  metricNote: { fontSize: 10, color: '#9ca3af' },
  
  // Rating Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  ratingModalContainer: { backgroundColor: '#fff', marginHorizontal: 20, marginVertical: 60, borderRadius: 20, maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  ratingModalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#f8fafc' },
  ratingModalHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingModalEmployeeInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  ratingModalAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  ratingModalAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  ratingModalEmployeeDetails: { flex: 1 },
  ratingModalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  ratingModalSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  modalCloseButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  ratingModalContent: { flex: 1, paddingHorizontal: 20, paddingVertical: 16 },
  ratingSection: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  ratingSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  ratingSectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  ratingSectionDescription: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  commentSection: { marginTop: 16 },
  commentLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 8 },
  commentInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', minHeight: 100 },
  characterCount: { fontSize: 12, color: '#9ca3af', textAlign: 'right', marginTop: 4 },
  ratingOverallPreview: { backgroundColor: '#f0f9ff', borderRadius: 12, padding: 16, marginVertical: 16, borderWidth: 1, borderColor: '#bfdbfe' },
  ratingOverallLabel: { fontSize: 13, fontWeight: '600', color: '#1e40af', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  ratingOverallMetricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  ratingOverallMetricItem: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#dbeafe' },
  ratingOverallMetricLabel: { fontSize: 11, color: '#6b7280', fontWeight: '500', marginBottom: 4 },
  ratingOverallMetricValue: { fontSize: 16, fontWeight: '700' },
  ratingOverallFinalScore: { backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: '#3b82f6' },
  ratingOverallFinalLabel: { fontSize: 11, color: '#6b7280', fontWeight: '500', marginBottom: 6 },
  ratingOverallFinalValue: { fontSize: 24, fontWeight: '800' },
  ratingOverallRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  ratingOverallItem: { alignItems: 'center', flex: 1 },
  ratingOverallItemLabel: { fontSize: 11, color: '#6b7280', fontWeight: '500', marginBottom: 4 },
  ratingOverallItemValue: { fontSize: 18, fontWeight: '700' },
  ratingOverallDivider: { width: 1, height: 40, backgroundColor: '#bfdbfe', marginHorizontal: 8 },
  ratingModalActions: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#fff', alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  saveButton: { flex: 1, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  saveButtonDisabled: { backgroundColor: '#9ca3af', opacity: 0.6 },
  saveButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Export Modal - Clean Redesign
  exportModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  exportModalContainer: { backgroundColor: '#fff', borderRadius: 20, width: '100%', maxWidth: 380, shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 20, overflow: 'hidden' },
  exportModalHeader: { paddingVertical: 16, paddingHorizontal: 18 },
  exportModalHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  exportModalHeaderIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  exportModalHeaderTextWrap: { flex: 1 },
  exportModalTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  exportModalSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  exportModalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  exportModalBody: { padding: 18 },
  
  // Export Field Groups
  exportFieldGroup: { marginBottom: 16 },
  exportFieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  exportFieldRow: { flexDirection: 'row', gap: 12 },
  exportFieldHalf: { flex: 1 },
  
  // Format Buttons - Compact
  exportFormatBtnRow: { flexDirection: 'row', gap: 10 },
  exportFormatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e5e7eb' },
  exportFormatBtnActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  exportFormatBtnActiveGreen: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  exportFormatBtnText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  exportFormatBtnTextActive: { color: '#fff' },
  
  // Dropdown Trigger
  exportDropdownTrigger: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e5e7eb' },
  exportDropdownTriggerActive: { borderColor: '#3b82f6', backgroundColor: '#fff' },
  exportDropdownTriggerText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#111827' },
  
  // Dropdown Overlay & Modal
  exportDropdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  exportDropdownBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  exportDropdownModal: { backgroundColor: '#fff', borderRadius: 16, width: '90%', maxWidth: 360, maxHeight: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 15, overflow: 'hidden' },
  exportDropdownModalSmall: { maxHeight: 220 },
  exportDropdownHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#f8fafc', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  exportDropdownHeaderText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  exportDropdownHeaderSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  exportDropdownScrollContainer: { flex: 1, maxHeight: 300 },
  exportDropdownScrollContent: { paddingBottom: 16 },
  exportDropdownEmpty: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  exportDropdownEmptyText: { fontSize: 14, color: '#9ca3af', marginTop: 10 },
  exportDropdownOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  exportDropdownOptionActive: { backgroundColor: '#eff6ff' },
  exportDropdownOptionText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#374151' },
  exportDropdownOptionTextActive: { color: '#2563eb', fontWeight: '600' },
  exportDropdownOptionSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  exportDropdownOptionInfo: { flex: 1 },
  exportDropdownAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  exportDropdownAvatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  
  // Export Modal Footer
  exportModalFooter: { flexDirection: 'row', padding: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 10, backgroundColor: '#f8fafc' },
  exportCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  exportCancelBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  exportSubmitBtn: { flex: 1.5, borderRadius: 10, overflow: 'hidden' },
  exportSubmitBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, gap: 6 },
  exportSubmitBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
