import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Easing, FlatList, Modal, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Button, Card, ProgressBar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronDown } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useModuleBadges } from "../../contexts/ModuleBadgeContext";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import { Select } from "../../components/ui/select";
import { apiService, DepartmentPerformance, EmployeePerformance, ExecutiveSummary, ReportsData } from "../../lib/api";
import { handleApiError } from "../../utils/errorHandler";
import { formatDateIST, getCurrentISTISOString } from "../../utils/dateTime";

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


// Star Rating component
const StarRating = ({ rating, onRatingChange, size = 24 }: { rating: number; onRatingChange: (rating: number) => void; size?: number }) => (
  <View style={styles.starRatingContainer}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity key={star} onPress={() => onRatingChange(star * 20)} style={styles.starButton}>
        <Ionicons name={star * 20 <= rating ? "star" : "star-outline"} size={size} color={star * 20 <= rating ? "#f59e0b" : "#d1d5db"} />
      </TouchableOpacity>
    ))}
    <Text style={styles.ratingText}>{rating === 0 ? "Not rated " : `${rating}%`}</Text>
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
  const { user } = useAuth();
  const { resetBadge } = useModuleBadges();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<TabType>("employee");

  // Reset badge when screen is focused
  useFocusEffect(
    useCallback(() => {
      resetBadge("reports");
    }, [resetBadge])
  );

  // Get department from route params if provided
  const initialDepartment = route.params?.department || (!isAdmin && user?.department ? user.department : "All Departments");
  const [filters, setFilters] = useState<FilterOptions>({ month: getCurrentMonth(), department: initialDepartment });
  const [departments, setDepartments] = useState<string[]>([initialDepartment]);

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

  // Report period type state
  const [employeeExportPeriodType, setEmployeeExportPeriodType] = useState<'current' | 'last3' | 'custom'>('current');
  const [departmentExportPeriodType, setDepartmentExportPeriodType] = useState<'current' | 'last3' | 'custom'>('current');

  // Custom range states for employee export
  const [employeeExportFromMonth, setEmployeeExportFromMonth] = useState<MonthType>(getCurrentMonth());
  const [employeeExportFromYear, setEmployeeExportFromYear] = useState<string>(new Date().getFullYear().toString());
  const [employeeExportToMonth, setEmployeeExportToMonth] = useState<MonthType>(getCurrentMonth());
  const [employeeExportToYear, setEmployeeExportToYear] = useState<string>(new Date().getFullYear().toString());

  // Custom range states for department export
  const [departmentExportFromMonth, setDepartmentExportFromMonth] = useState<MonthType>(getCurrentMonth());
  const [departmentExportFromYear, setDepartmentExportFromYear] = useState<string>(new Date().getFullYear().toString());
  const [departmentExportToMonth, setDepartmentExportToMonth] = useState<MonthType>(getCurrentMonth());
  const [departmentExportToYear, setDepartmentExportToYear] = useState<string>(new Date().getFullYear().toString());


  // Export modal state - Employee Export
  const [employeeExportModalVisible, setEmployeeExportModalVisible] = useState(false);
  const [employeeExportFormat, setEmployeeExportFormat] = useState<'csv' | 'pdf'>('pdf');
  const [employeeExportDepartment, setEmployeeExportDepartment] = useState<string>('all');
  const [employeeExportEmployee, setEmployeeExportEmployee] = useState<string>('all');

  // Export modal state - Department Export
  const [departmentExportModalVisible, setDepartmentExportModalVisible] = useState(false);
  const [departmentExportFormat, setDepartmentExportFormat] = useState<'csv' | 'pdf'>('pdf');
  const [departmentExportDept, setDepartmentExportDept] = useState<string>('all');


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
      // Pass user info so API can filter appropriately (non-admin users only see their own data)
      const data = await apiService.getReportsData(filters.month, filters.department, user);

      // Extract departments from current data
      const uniqueDeptsList = Array.from(new Set(
        data.employees.flatMap(emp =>
          (emp.department || '').split(',').map(d => d.trim()).filter(Boolean)
        )
      )).sort();

      let allDepartments: string[] = [];

      // Only add "All Departments" for admins or if multiple departments are actually present
      if (isAdmin || uniqueDeptsList.length > 1) {
        allDepartments.push("All Departments");
      }

      uniqueDeptsList.forEach(dept => {
        if (!allDepartments.includes(dept)) {
          allDepartments.push(dept);
        }
      });

      // For admin users, also try to fetch all departments if filtering by specific department
      // to ensure the dropdown doesn't shrink and hide other departments
      if (isAdmin && filters.department !== "All Departments") {
        try {
          const allData = await apiService.getReportsData(filters.month, "All Departments", user);
          allData.employees.forEach(emp => {
            const depts = (emp.department || '').split(',').map(d => d.trim()).filter(Boolean);
            depts.forEach(dept => {
              if (!allDepartments.includes(dept)) {
                allDepartments.push(dept);
              }
            });
          });
          // Resort to keep it clean
          const headerDepts = allDepartments.filter(d => d === "All Departments");
          const otherDepts = allDepartments.filter(d => d !== "All Departments").sort();
          allDepartments = [...headerDepts, ...otherDepts];
        } catch {
          console.log("⚠️ Could not fetch all departments for admin");
        }
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
        const allData = await apiService.getReportsData(filters.month, "All Departments", user);
        setReportsData(allData);
        return;
      }

      setReportsData(data);
    } catch (err: any) {
      console.error('Failed to fetch reports data:', err);
      const errorMsg = await handleApiError(err, navigation);
      setError(errorMsg);
    }
  }, [filters.month, filters.department, navigation]);

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

  // Export modal functions - Employee Export
  const openEmployeeExportModal = () => {
    setEmployeeExportPeriodType('current');
    setEmployeeExportDepartment('all');
    setEmployeeExportEmployee('all');
    setEmployeeExportFormat('pdf');
    setEmployeeExportModalVisible(true);
  };

  const closeEmployeeExportModal = () => {
    setEmployeeExportModalVisible(false);
  };

  // Export modal functions - Department Export
  const openDepartmentExportModal = () => {
    setDepartmentExportPeriodType('current');
    setDepartmentExportDept('all');
    setDepartmentExportFormat('pdf');
    setDepartmentExportModalVisible(true);
  };

  const closeDepartmentExportModal = () => {
    setDepartmentExportModalVisible(false);
  };

  // Validation function for export
  const validateExportFields = (isEmployeeExport: boolean): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (isEmployeeExport) {
      // Mandatory field: Generated By (from user context)
      if (!user?.name) {
        errors.push('User information is missing.');
      }

      // Validate period selection
      if (employeeExportPeriodType === 'custom') {
        if (!employeeExportFromMonth || !employeeExportFromYear || !employeeExportToMonth || !employeeExportToYear) {
          errors.push('Please select both from and to dates for custom range.');
        }
      }
    } else {
      // Department Export Validation
      // Mandatory field: Generated By
      if (!user?.name) {
        errors.push('User information is missing.');
      }

      // Validate period selection
      if (departmentExportPeriodType === 'custom') {
        if (!departmentExportFromMonth || !departmentExportFromYear || !departmentExportToMonth || !departmentExportToYear) {
          errors.push('Please select both from and to dates for custom range.');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  // Helper to check if export button should be enabled
  const isEmployeeExportValid = useMemo(() => {
    return validateExportFields(true).valid;
  }, [employeeExportPeriodType, employeeExportFromMonth, employeeExportFromYear, employeeExportToMonth, employeeExportToYear, user]);

  const isDepartmentExportValid = useMemo(() => {
    return validateExportFields(false).valid;
  }, [departmentExportPeriodType, departmentExportFromMonth, departmentExportFromYear, departmentExportToMonth, departmentExportToYear, user]);

  const handleExport = async () => {
    try {
      if (!reportsData) {
        Alert.alert('Error', 'No data available to export');
        return;
      }

      // Determine which export modal is open
      const isEmployeeExport = employeeExportModalVisible;
      const isDepartmentExport = departmentExportModalVisible;

      // Validate mandatory fields
      const validation = validateExportFields(isEmployeeExport);
      if (!validation.valid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      if (isEmployeeExport) {
        // Employee Export Logic
        let filteredEmployees = reportsData.employees;

        // Filter by department if not 'all'
        if (employeeExportDepartment !== 'all') {
          filteredEmployees = filteredEmployees.filter(emp => emp.department === employeeExportDepartment);
        }

        // Filter by employee if not 'all'
        if (employeeExportEmployee !== 'all') {
          filteredEmployees = filteredEmployees.filter(emp => emp.name === employeeExportEmployee);
        }

        if (filteredEmployees.length === 0) {
          Alert.alert('Error', 'No employees found with selected filters');
          return;
        }

        if (employeeExportFormat === 'csv') {
          await generateCSVExport(filteredEmployees, employeeExportDepartment === 'all' ? 'All Departments' : employeeExportDepartment);
        } else {
          await generatePDFExport(filteredEmployees, employeeExportDepartment === 'all' ? 'All Departments' : employeeExportDepartment);
        }

        closeEmployeeExportModal();
        Alert.alert('Success', `Employee report exported as ${employeeExportFormat.toUpperCase()} successfully!`);
      } else if (isDepartmentExport) {
        // Department Export Logic
        let filteredDepartments = reportsData.departments;

        // Filter by department if not 'all'
        if (departmentExportDept !== 'all') {
          filteredDepartments = filteredDepartments.filter(dept => dept.name === departmentExportDept);
        }

        if (filteredDepartments.length === 0) {
          Alert.alert('Error', 'No departments found with selected filters');
          return;
        }

        if (departmentExportFormat === 'csv') {
          await generateDepartmentCSVExport(filteredDepartments, departmentExportDept === 'all' ? 'All Departments' : departmentExportDept);
        } else {
          await generateDepartmentPDFExport(filteredDepartments, departmentExportDept === 'all' ? 'All Departments' : departmentExportDept);
        }

        closeDepartmentExportModal();
        Alert.alert('Success', `Department report exported as ${departmentExportFormat.toUpperCase()} successfully!`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export report. Please try again.');
    }
  };

  const generateCSVExport = async (employees: EmployeePerformance[], selectedDepartment: string) => {
    try {
      const { generateEmployeeCSV } = await import('../../utils/reportExporter');
      await generateEmployeeCSV(
        employees.map(emp => ({
          empId: emp.empId,
          name: emp.name,
          department: emp.department,
          role: emp.role,
          attendance: emp.attendance,
          taskCompletion: emp.taskCompletion,
          productivity: emp.productivity,
          qualityScore: emp.qualityScore,
          overallRating: emp.overallRating,
          status: emp.status,
        })),
        {
          format: 'csv',
          type: 'employee',
          department: selectedDepartment,
          employee: employeeExportEmployee,
          periodType: employeeExportPeriodType,
          fromMonth: employeeExportFromMonth,
          fromYear: employeeExportFromYear,
          toMonth: employeeExportToMonth,
          toYear: employeeExportToYear,
          generatedBy: user?.name || 'N/A',
        }
      );
    } catch (error: any) {
      console.error("❌ Export Failed:", error);
      throw new Error(error.message || "Failed to export performance report");
    }
  };

  const generatePDFExport = async (employees: EmployeePerformance[], selectedDepartment: string) => {
    try {
      const { generateEmployeePDF } = await import('../../utils/reportExporter');
      await generateEmployeePDF(
        employees.map(emp => ({
          empId: emp.empId,
          name: emp.name,
          department: emp.department,
          role: emp.role,
          attendance: emp.attendance,
          taskCompletion: emp.taskCompletion,
          productivity: emp.productivity,
          qualityScore: emp.qualityScore,
          overallRating: emp.overallRating,
          status: emp.status,
        })),
        {
          format: 'pdf',
          type: 'employee',
          department: selectedDepartment,
          employee: employeeExportEmployee,
          periodType: employeeExportPeriodType,
          fromMonth: employeeExportFromMonth,
          fromYear: employeeExportFromYear,
          toMonth: employeeExportToMonth,
          toYear: employeeExportToYear,
          generatedBy: user?.name || 'N/A',
        }
      );
    } catch (error: any) {
      console.error("❌ Export Failed:", error);
      throw new Error(error.message || "Failed to export performance report");
    }
  };

  const generateDepartmentCSVExport = async (departments: DepartmentPerformance[], selectedDepartment: string) => {
    try {
      const { generateDepartmentCSV } = await import('../../utils/reportExporter');
      await generateDepartmentCSV(
        departments.map(dept => ({
          name: dept.name,
          totalEmployees: dept.totalEmployees,
          avgAttendance: dept.avgAttendance,
          avgProductivity: dept.avgProductivity,
          performanceScore: dept.performanceScore,
          tasksCompleted: dept.tasksCompleted,
          tasksPending: dept.tasksPending,
          status: dept.status,
        })),
        {
          format: 'csv',
          type: 'department',
          department: selectedDepartment,
          periodType: departmentExportPeriodType,
          fromMonth: departmentExportFromMonth,
          fromYear: departmentExportFromYear,
          toMonth: departmentExportToMonth,
          toYear: departmentExportToYear,
          generatedBy: user?.name || 'N/A',
        }
      );
    } catch (error: any) {
      console.error("❌ Export Failed:", error);
      throw new Error(error.message || "Failed to export department report");
    }
  };

  const generateDepartmentPDFExport = async (departments: DepartmentPerformance[], selectedDepartment: string) => {
    try {
      const { generateDepartmentPDF } = await import('../../utils/reportExporter');
      await generateDepartmentPDF(
        departments.map(dept => ({
          name: dept.name,
          totalEmployees: dept.totalEmployees,
          avgAttendance: dept.avgAttendance,
          avgProductivity: dept.avgProductivity,
          performanceScore: dept.performanceScore,
          tasksCompleted: dept.tasksCompleted,
          tasksPending: dept.tasksPending,
          status: dept.status,
        })),
        {
          format: 'pdf',
          type: 'department',
          department: selectedDepartment,
          periodType: departmentExportPeriodType,
          fromMonth: departmentExportFromMonth,
          fromYear: departmentExportFromYear,
          toMonth: departmentExportToMonth,
          toYear: departmentExportToYear,
          generatedBy: user?.name || 'N/A',
        }
      );
    } catch (error: any) {
      console.error("❌ Export Failed:", error);
      throw new Error(error.message || "Failed to export department report");
    }
  };

  const calculateOverallScore = (attendance: number, taskCompletion: number, productivity: number, quality: number): number => {
    return Math.round((attendance + taskCompletion + productivity + quality) / 4);
  };

  const saveRatings = async () => {
    if (selectedEmployee) {
      try {
        // Validate ratings are set
        if (productivityRating === 0 || qualityRating === 0) {
          Alert.alert('Validation Error', 'Please rate both productivity and quality before saving.');
          return;
        }

        console.log('💾 Saving ratings for employee:', selectedEmployee.id);

        // Save to backend
        await apiService.saveEmployeeRating(selectedEmployee.id, {
          productivity: productivityRating,
          qualityScore: qualityRating,
          productivityComment,
          qualityComment,
        });

        console.log('✅ Ratings saved to backend successfully');

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

          console.log('📝 Updated employee data:', updatedEmployee);

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

          console.log('📊 Updated department data:', updatedDepartments);

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

        // Refresh data after a short delay to ensure backend has processed the update
        setTimeout(() => {
          console.log('🔄 Refreshing reports data after rating save...');
          fetchReportsData();
        }, 500);
      } catch (err: any) {
        console.error('Failed to save ratings:', err);
        const errorMsg = await handleApiError(err, navigation);
        Alert.alert('Error', errorMsg);
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

  // Department Card component - Updated layout matching design
  const DepartmentCard = ({ department }: { department: DepartmentPerformance }) => (
    <View style={styles.deptCardNew}>
      {/* Header: Icon + Name + Status Badge */}
      <View style={styles.deptCardHeader}>
        <View style={styles.deptCardHeaderLeft}>
          <View style={styles.deptCardIconBg}>
            <Ionicons name="people" size={20} color="#fff" />
          </View>
          <Text style={styles.deptCardName}>{department.name}</Text>
        </View>
        <View style={[styles.deptCardStatusBadge, { backgroundColor: getRatingStatusBgColor(department.status) }]}>
          <Text style={[styles.deptCardStatusText, { color: getRatingStatusColor(department.status) }]}>
            {department.status.charAt(0).toUpperCase() + department.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Employees Row */}
      <View style={styles.deptCardEmployeesRow}>
        <Ionicons name="people-outline" size={16} color="#6b7280" />
        <Text style={styles.deptCardEmployeesLabel}>Employees</Text>
        <Text style={styles.deptCardEmployeesValue}>{department.totalEmployees}</Text>
      </View>

      {/* 2x2 Metrics Grid */}
      <View style={styles.deptCardMetricsGrid}>
        {/* Productivity */}
        <View style={[styles.deptCardMetricBox, styles.deptCardMetricBoxYellow]}>
          <Text style={styles.deptCardMetricLabel}>Productivity</Text>
          <Text style={[styles.deptCardMetricValue, { color: getRatingColor(department.avgProductivity) }]}>
            {department.avgProductivity}%
          </Text>
        </View>
        {/* Attendance */}
        <View style={[styles.deptCardMetricBox, styles.deptCardMetricBoxGreen]}>
          <Text style={styles.deptCardMetricLabel}>Attendance</Text>
          <Text style={[styles.deptCardMetricValue, { color: getRatingColor(department.avgAttendance) }]}>
            {department.avgAttendance}%
          </Text>
        </View>
        {/* Completed */}
        <View style={[styles.deptCardMetricBox, styles.deptCardMetricBoxGreen]}>
          <Text style={styles.deptCardMetricLabel}>Completed</Text>
          <Text style={[styles.deptCardMetricValue, { color: '#22c55e' }]}>
            {department.tasksCompleted}
          </Text>
        </View>
        {/* Pending */}
        <View style={[styles.deptCardMetricBox, styles.deptCardMetricBoxYellow]}>
          <Text style={styles.deptCardMetricLabel}>Pending</Text>
          <Text style={[styles.deptCardMetricValue, { color: '#f59e0b' }]}>
            {department.tasksPending}
          </Text>
        </View>
      </View>

      {/* Performance Score */}
      <View style={styles.deptCardPerformanceSection}>
        <View style={styles.deptCardPerformanceHeader}>
          <Text style={styles.deptCardPerformanceLabel}>Performance Score</Text>
          <Text style={[styles.deptCardPerformanceValue, { color: getRatingColor(department.performanceScore) }]}>
            {department.performanceScore}%
          </Text>
        </View>
        <View style={styles.deptCardProgressTrack}>
          <View
            style={[
              styles.deptCardProgressFill,
              {
                width: `${department.performanceScore}%`,
                backgroundColor: getRatingColor(department.performanceScore)
              }
            ]}
          />
        </View>
      </View>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
        <StatusBar style="light" backgroundColor="#0891b2" translucent={false} />
        <LinearGradient colors={['#0891b2', '#0e7490', '#155e75']} style={styles.headerGradient}>
          <TouchableOpacity style={[styles.backButton, { position: 'absolute', top: 16, left: 16, zIndex: 10 }]} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
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
                    onPress={openEmployeeExportModal}
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
                                style={[styles.prominentRateBtn, employee.productivity !== null && employee.qualityScore !== null && styles.prominentRateBtnRated]}
                                onPress={() => openRatingModal(employee)}
                                activeOpacity={0.8}
                              >
                                <Ionicons name={employee.productivity !== null && employee.qualityScore !== null ? "checkmark-circle" : "create-outline"} size={14} color="#fff" />
                                <Text style={styles.prominentRateBtnText}>{employee.productivity !== null && employee.qualityScore !== null ? "Update" : "Rate"}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Rating Status Info */}
                          {(employee.productivity !== null || employee.qualityScore !== null) && (
                            <View style={styles.ratingInfoBanner}>
                              <View style={styles.ratingInfoContent}>
                                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                <View style={styles.ratingInfoText}>
                                  <Text style={styles.ratingInfoTitle}>Ratings Submitted</Text>
                                  <Text style={styles.ratingInfoSubtitle}>
                                    {employee.productivity !== null && employee.qualityScore !== null
                                      ? `Productivity: ${employee.productivity}% • Quality: ${employee.qualityScore}%`
                                      : employee.productivity !== null
                                        ? `Productivity: ${employee.productivity}%`
                                        : `Quality: ${employee.qualityScore}%`
                                    }
                                  </Text>
                                </View>
                              </View>
                            </View>
                          )}

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
                            <View style={[styles.metricBox, employee.productivity !== null && styles.metricBoxRated]}>
                              <View style={styles.metricIconRow}>
                                <Ionicons name="trending-up-outline" size={14} color={employee.productivity !== null ? getRatingColor(employee.productivity) : "#f59e0b"} />
                                <Text style={styles.metricLabel}>Productivity</Text>
                              </View>
                              {employee.productivity !== null ? (
                                <>
                                  <View style={styles.ratedMetricHeader}>
                                    <Text style={[styles.metricValue, { color: getRatingColor(employee.productivity), fontWeight: '700' }]}>
                                      {employee.productivity}%
                                    </Text>
                                    <View style={[styles.ratedBadge, { backgroundColor: getRatingStatusBgColor(getRatingLabel(employee.productivity)) }]}>
                                      <Ionicons name={getRatingStatusIcon(getRatingLabel(employee.productivity))} size={12} color={getRatingStatusColor(getRatingLabel(employee.productivity))} />
                                      <Text style={[styles.ratedBadgeText, { color: getRatingStatusColor(getRatingLabel(employee.productivity)) }]}>
                                        {getRatingLabel(employee.productivity).charAt(0).toUpperCase() + getRatingLabel(employee.productivity).slice(1)}
                                      </Text>
                                    </View>
                                  </View>
                                  <View style={styles.metricProgress}>
                                    <View style={[styles.metricProgressFill, { width: `${employee.productivity}%`, backgroundColor: getRatingColor(employee.productivity) }]} />
                                  </View>
                                </>
                              ) : (
                                <Text style={[styles.metricValue, { color: '#9ca3af' }]}>Not rated yet</Text>
                              )}
                              <Text style={styles.metricNote}>{employee.productivity !== null ? 'Rated' : 'Manual rating'}</Text>
                            </View>

                            {/* Quality */}
                            <View style={[styles.metricBox, employee.qualityScore !== null && styles.metricBoxRated]}>
                              <View style={styles.metricIconRow}>
                                <Ionicons name="ribbon-outline" size={14} color={employee.qualityScore !== null ? getRatingColor(employee.qualityScore) : "#f59e0b"} />
                                <Text style={styles.metricLabel}>Quality</Text>
                              </View>
                              {employee.qualityScore !== null ? (
                                <>
                                  <View style={styles.ratedMetricHeader}>
                                    <Text style={[styles.metricValue, { color: getRatingColor(employee.qualityScore), fontWeight: '700' }]}>
                                      {employee.qualityScore}%
                                    </Text>
                                    <View style={[styles.ratedBadge, { backgroundColor: getRatingStatusBgColor(getRatingLabel(employee.qualityScore)) }]}>
                                      <Ionicons name={getRatingStatusIcon(getRatingLabel(employee.qualityScore))} size={12} color={getRatingStatusColor(getRatingLabel(employee.qualityScore))} />
                                      <Text style={[styles.ratedBadgeText, { color: getRatingStatusColor(getRatingLabel(employee.qualityScore)) }]}>
                                        {getRatingLabel(employee.qualityScore).charAt(0).toUpperCase() + getRatingLabel(employee.qualityScore).slice(1)}
                                      </Text>
                                    </View>
                                  </View>
                                  <View style={styles.metricProgress}>
                                    <View style={[styles.metricProgressFill, { width: `${employee.qualityScore}%`, backgroundColor: getRatingColor(employee.qualityScore) }]} />
                                  </View>
                                </>
                              ) : (
                                <Text style={[styles.metricValue, { color: '#9ca3af' }]}>Not rated yet</Text>
                              )}
                              <Text style={styles.metricNote}>{employee.qualityScore !== null ? 'Rated' : 'Manual rating'}</Text>
                            </View>

                            {/* Overall */}
                            <View style={[styles.metricBox, styles.metricBoxHighlight, employee.overallRating !== null && styles.metricBoxRated]}>
                              <View style={styles.metricIconRow}>
                                <Ionicons name="bar-chart-outline" size={14} color={employee.overallRating !== null ? getRatingColor(employee.overallRating) : "#3b82f6"} />
                                <Text style={styles.metricLabel}>Overall</Text>
                              </View>
                              {employee.overallRating !== null ? (
                                <>
                                  <View style={styles.ratedMetricHeader}>
                                    <Text style={[styles.metricValue, { color: getRatingColor(employee.overallRating), fontWeight: '700' }]}>
                                      {employee.overallRating}%
                                    </Text>
                                    <View style={[styles.ratedBadge, { backgroundColor: getRatingStatusBgColor(getRatingLabel(employee.overallRating)) }]}>
                                      <Ionicons name={getRatingStatusIcon(getRatingLabel(employee.overallRating))} size={12} color={getRatingStatusColor(getRatingLabel(employee.overallRating))} />
                                      <Text style={[styles.ratedBadgeText, { color: getRatingStatusColor(getRatingLabel(employee.overallRating)) }]}>
                                        {getRatingLabel(employee.overallRating).charAt(0).toUpperCase() + getRatingLabel(employee.overallRating).slice(1)}
                                      </Text>
                                    </View>
                                  </View>
                                  <View style={styles.metricProgress}>
                                    <View style={[styles.metricProgressFill, { width: `${employee.overallRating}%`, backgroundColor: getRatingColor(employee.overallRating) }]} />
                                  </View>
                                </>
                              ) : (
                                <Text style={[styles.metricValue, { color: '#9ca3af' }]}>Pending ratings</Text>
                              )}
                              <Text style={styles.metricNote}>{employee.overallRating !== null ? 'Calculated' : 'Average score'}</Text>
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
            {/* Enhanced Section Header - Department Performance Overview */}
            <View style={styles.deptSectionHeaderCard}>
              <LinearGradient colors={['#f3e8ff', '#ede9fe']} style={styles.deptSectionHeaderGradient}>
                <View style={styles.deptSectionHeaderContent}>
                  <View style={styles.deptSectionHeaderLeft}>
                    <View style={styles.deptSectionHeaderIconBg}>
                      <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.deptSectionHeaderIconGradient}>
                        <Ionicons name="business" size={24} color="#fff" />
                      </LinearGradient>
                    </View>
                    <View style={styles.deptSectionHeaderTextContainer}>
                      <Text style={styles.deptSectionHeaderTitle}>Department Performance</Text>
                      <Text style={styles.deptSectionHeaderSubtitle}>{filteredDepartments.length} departments • {filters.month}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deptSectionExportButton}
                    activeOpacity={0.7}
                    onPress={openDepartmentExportModal}
                  >
                    <LinearGradient
                      colors={['#8b5cf6', '#7c3aed']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.deptSectionExportButtonGradient}
                    >
                      <View style={styles.deptSectionExportButtonContent}>
                        <Ionicons name="download-outline" size={16} color="#fff" />
                        <Text style={styles.deptSectionExportButtonLabel}>Export</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            {/* Enhanced Quick Stats Row */}
            <View style={styles.deptQuickStatsContainer}>
              <View style={[styles.deptQuickStatCard, styles.deptQuickStatCardBlue]}>
                <View style={styles.deptQuickStatCardTop}>
                  <View style={[styles.deptQuickStatIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Ionicons name="business" size={18} color="#3b82f6" />
                  </View>
                  <Text style={styles.deptQuickStatValue}>{filteredDepartments.length}</Text>
                </View>
                <Text style={styles.deptQuickStatLabel}>Departments</Text>
              </View>

              <View style={[styles.deptQuickStatCard, styles.deptQuickStatCardGreen]}>
                <View style={styles.deptQuickStatCardTop}>
                  <View style={[styles.deptQuickStatIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  </View>
                  <Text style={styles.deptQuickStatValue}>{filteredDepartments.reduce((sum, d) => sum + d.tasksCompleted, 0)}</Text>
                </View>
                <Text style={styles.deptQuickStatLabel}>Task Completed</Text>
              </View>

              <View style={[styles.deptQuickStatCard, styles.deptQuickStatCardAmber]}>
                <View style={styles.deptQuickStatCardTop}>
                  <View style={[styles.deptQuickStatIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Ionicons name="hourglass" size={18} color="#f59e0b" />
                  </View>
                  <Text style={styles.deptQuickStatValue}>{filteredDepartments.reduce((sum, d) => sum + d.tasksPending, 0)}</Text>
                </View>
                <Text style={styles.deptQuickStatLabel}>Task Pending</Text>
              </View>

              <View style={[styles.deptQuickStatCard, styles.deptQuickStatCardPurple]}>
                <View style={styles.deptQuickStatCardTop}>
                  <View style={[styles.deptQuickStatIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                    <Ionicons name="trending-up" size={18} color="#8b5cf6" />
                  </View>
                  <Text style={styles.deptQuickStatValue}>
                    {filteredDepartments.length > 0 ? Math.round(filteredDepartments.reduce((sum, d) => sum + d.performanceScore, 0) / filteredDepartments.length) : 0}%
                  </Text>
                </View>
                <Text style={styles.deptQuickStatLabel}>Avg Score</Text>
              </View>
            </View>

            {/* Enhanced Expand/Collapse Controls */}
            <View style={styles.deptControlsContainer}>
              <TouchableOpacity
                style={styles.deptControlBtn}
                onPress={() => setExpandedDepartments(new Set(filteredDepartments.map(d => d.name)))}
                activeOpacity={0.7}
              >
                <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.deptControlBtnGradient}>
                  <Ionicons name="expand-outline" size={16} color="#fff" />
                  <Text style={styles.deptControlBtnText}>Expand All</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deptControlBtn}
                onPress={() => setExpandedDepartments(new Set())}
                activeOpacity={0.7}
              >
                <LinearGradient colors={['#6b7280', '#4b5563']} style={styles.deptControlBtnGradient}>
                  <Ionicons name="contract-outline" size={16} color="#fff" />
                  <Text style={styles.deptControlBtnText}>Collapse All</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {filteredDepartments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="business-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyStateText}>No departments found</Text>
              </View>
            ) : (
              <View style={styles.kanbanContainer}>
                {filteredDepartments.map((department, index) => {
                  const isExpanded = expandedDepartments.has(department.name);
                  const statusColor = getRatingStatusColor(department.status);
                  const statusBgColor = getRatingStatusBgColor(department.status);

                  return (
                    <View key={department.id} style={styles.kanbanCard}>
                      {/* Kanban Card Header - Always Visible */}
                      <TouchableOpacity
                        style={styles.kanbanCardHeader}
                        onPress={() => {
                          setExpandedDepartments(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(department.name)) {
                              newSet.delete(department.name);
                            } else {
                              newSet.add(department.name);
                            }
                            return newSet;
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.kanbanCardHeaderLeft}>
                          <View style={[styles.kanbanCardIcon, { backgroundColor: index % 4 === 0 ? '#c026d3' : index % 4 === 1 ? '#3b82f6' : index % 4 === 2 ? '#10b981' : '#f59e0b' }]}>
                            <Ionicons name="business" size={18} color="#fff" />
                          </View>
                          <View style={styles.kanbanCardTitleWrap}>
                            <Text style={styles.kanbanCardTitle} numberOfLines={1}>{department.name}</Text>
                            <View style={styles.kanbanCardMeta}>
                              <Ionicons name="people-outline" size={12} color="#9ca3af" />
                              <Text style={styles.kanbanCardMetaText}>{department.totalEmployees} employees</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.kanbanCardHeaderRight}>
                          <View style={[styles.kanbanStatusBadge, { backgroundColor: statusBgColor }]}>
                            <View style={[styles.kanbanStatusDot, { backgroundColor: statusColor }]} />
                            <Text style={[styles.kanbanStatusText, { color: statusColor }]}>
                              {department.status.charAt(0).toUpperCase() + department.status.slice(1)}
                            </Text>
                          </View>
                          <View style={styles.kanbanChevronWrap}>
                            <Ionicons
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={20}
                              color="#9ca3af"
                            />
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Performance Score Bar - Always Visible */}
                      <View style={styles.kanbanScoreBar}>
                        <View style={styles.kanbanScoreBarHeader}>
                          <Text style={styles.kanbanScoreBarLabel}>Performance</Text>
                          <Text style={[styles.kanbanScoreBarValue, { color: getRatingColor(department.performanceScore) }]}>
                            {department.performanceScore}%
                          </Text>
                        </View>
                        <View style={styles.kanbanScoreBarTrack}>
                          <View
                            style={[
                              styles.kanbanScoreBarFill,
                              {
                                width: `${department.performanceScore}%`,
                                backgroundColor: getRatingColor(department.performanceScore)
                              }
                            ]}
                          />
                        </View>
                      </View>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <View style={styles.kanbanExpandedContent}>
                          {/* Metrics Grid */}
                          <View style={styles.kanbanMetricsGrid}>
                            <View style={[styles.kanbanMetricCard, styles.kanbanMetricCardBlue]}>
                              <View style={styles.kanbanMetricIconWrap}>
                                <Ionicons name="trending-up" size={16} color="#3b82f6" />
                              </View>
                              <Text style={styles.kanbanMetricLabel}>Productivity</Text>
                              <Text style={[styles.kanbanMetricValue, { color: getRatingColor(department.avgProductivity) }]}>
                                {department.avgProductivity}%
                              </Text>
                              <View style={styles.kanbanMetricMiniBar}>
                                <View style={[styles.kanbanMetricMiniFill, { width: `${department.avgProductivity}%`, backgroundColor: getRatingColor(department.avgProductivity) }]} />
                              </View>
                            </View>

                            <View style={[styles.kanbanMetricCard, styles.kanbanMetricCardGreen]}>
                              <View style={styles.kanbanMetricIconWrap}>
                                <Ionicons name="time" size={16} color="#10b981" />
                              </View>
                              <Text style={styles.kanbanMetricLabel}>Attendance</Text>
                              <Text style={[styles.kanbanMetricValue, { color: getRatingColor(department.avgAttendance) }]}>
                                {department.avgAttendance}%
                              </Text>
                              <View style={styles.kanbanMetricMiniBar}>
                                <View style={[styles.kanbanMetricMiniFill, { width: `${department.avgAttendance}%`, backgroundColor: getRatingColor(department.avgAttendance) }]} />
                              </View>
                            </View>

                            <View style={[styles.kanbanMetricCard, styles.kanbanMetricCardPurple]}>
                              <View style={styles.kanbanMetricIconWrap}>
                                <Ionicons name="checkmark-done" size={16} color="#8b5cf6" />
                              </View>
                              <Text style={styles.kanbanMetricLabel}>Task Rate</Text>
                              <Text style={[styles.kanbanMetricValue, { color: getRatingColor(department.tasksCompleted + department.tasksPending > 0 ? Math.round((department.tasksCompleted / (department.tasksCompleted + department.tasksPending)) * 100) : 0) }]}>
                                {department.tasksCompleted + department.tasksPending > 0 ? Math.round((department.tasksCompleted / (department.tasksCompleted + department.tasksPending)) * 100) : 0}%
                              </Text>
                              <View style={styles.kanbanMetricMiniBar}>
                                <View style={[styles.kanbanMetricMiniFill, { width: `${department.tasksCompleted + department.tasksPending > 0 ? Math.round((department.tasksCompleted / (department.tasksCompleted + department.tasksPending)) * 100) : 0}%`, backgroundColor: getRatingColor(department.tasksCompleted + department.tasksPending > 0 ? Math.round((department.tasksCompleted / (department.tasksCompleted + department.tasksPending)) * 100) : 0) }]} />
                              </View>
                            </View>
                          </View>

                          {/* Tasks Summary */}
                          <View style={styles.kanbanTasksSummary}>
                            <Text style={styles.kanbanTasksTitle}>Tasks Overview</Text>
                            <View style={styles.kanbanTasksRow}>
                              <View style={styles.kanbanTaskItem}>
                                <View style={[styles.kanbanTaskIcon, { backgroundColor: '#d1fae5' }]}>
                                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                </View>
                                <View>
                                  <Text style={[styles.kanbanTaskValue, { color: '#10b981' }]}>{department.tasksCompleted}</Text>
                                  <Text style={styles.kanbanTaskLabel}>Completed</Text>
                                </View>
                              </View>
                              <View style={styles.kanbanTaskItem}>
                                <View style={[styles.kanbanTaskIcon, { backgroundColor: '#fef3c7' }]}>
                                  <Ionicons name="hourglass" size={16} color="#f59e0b" />
                                </View>
                                <View>
                                  <Text style={[styles.kanbanTaskValue, { color: '#f59e0b' }]}>{department.tasksPending}</Text>
                                  <Text style={styles.kanbanTaskLabel}>Pending</Text>
                                </View>
                              </View>
                              <View style={styles.kanbanTaskItem}>
                                <View style={[styles.kanbanTaskIcon, { backgroundColor: '#dbeafe' }]}>
                                  <Ionicons name="layers" size={16} color="#3b82f6" />
                                </View>
                                <View>
                                  <Text style={[styles.kanbanTaskValue, { color: '#3b82f6' }]}>{department.tasksCompleted + department.tasksPending}</Text>
                                  <Text style={styles.kanbanTaskLabel}>Active</Text>
                                </View>
                              </View>
                            </View>
                          </View>

                          {/* Action Buttons */}
                          <View style={styles.kanbanActions}>
                            <TouchableOpacity
                              style={styles.kanbanActionBtn}
                              onPress={() => {
                                setFilters(prev => ({ ...prev, department: department.name }));
                                handleTabChange("employee");
                              }}
                            >
                              <Ionicons name="people-outline" size={16} color="#3b82f6" />
                              <Text style={styles.kanbanActionText}>View Employees</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.kanbanActionBtnPrimary}>
                              <Ionicons name="analytics-outline" size={16} color="#fff" />
                              <Text style={styles.kanbanActionTextPrimary}>Details</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        );

      case "executive":
        const exec = reportsData.executive;
        return (
          <>

            {/* Executive Summary Cards Grid */}
            <View style={styles.executiveSummaryCardsContainer}>
              {/* Avg Performance Card */}
              <View style={[styles.executiveSummaryMetricCard, styles.avgPerformanceMetricCard]}>
                <LinearGradient colors={['#3b82f6', '#2563eb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.metricCardBackground} />
                <View style={styles.metricCardContent}>
                  <View style={styles.metricCardTop}>
                    <View style={[styles.executiveSummaryCardIcon, styles.avgPerformanceIcon]}>
                      <Ionicons name="trending-up" size={22} color="#fff" />
                    </View>
                    <View style={styles.metricCardBadge}>
                      <Text style={styles.metricCardBadgeText}>+2.5%</Text>
                    </View>
                  </View>
                  <View style={styles.metricCardBody}>
                    <Text style={styles.executiveSummaryCardLabel}>Avg Performance</Text>
                    <Text style={styles.executiveSummaryCardValue}>{exec.avgPerformance}%</Text>
                    <Text style={styles.executiveSummaryCardMeta}>All Employees</Text>
                  </View>
                  <View style={styles.metricCardProgress}>
                    <View style={[styles.metricCardProgressBar, { width: `${exec.avgPerformance}%`, backgroundColor: '#3b82f6' }]} />
                  </View>
                </View>
              </View>

              {/* Tasks Completed Card */}
              <View style={[styles.executiveSummaryMetricCard, styles.tasksCompletedMetricCard]}>
                <LinearGradient colors={['#a855f7', '#9333ea']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.metricCardBackground} />
                <View style={styles.metricCardContent}>
                  <View style={styles.metricCardTop}>
                    <View style={[styles.executiveSummaryCardIcon, styles.tasksCompletedIcon]}>
                      <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    </View>
                    <View style={styles.metricCardBadge}>
                      <Text style={styles.metricCardBadgeText}>{exec.tasksTrend >= 0 ? '+' : ''}{exec.tasksTrend}%</Text>
                    </View>
                  </View>
                  <View style={styles.metricCardBody}>
                    <Text style={styles.executiveSummaryCardLabel}>Tasks Completed</Text>
                    <Text style={styles.executiveSummaryCardValue}>{exec.tasksCompleted}</Text>
                    <Text style={styles.executiveSummaryCardMeta}>This month</Text>
                  </View>
                  <View style={styles.metricCardProgress}>
                    <View style={[styles.metricCardProgressBar, { width: `${Math.min(exec.tasksCompleted / 100 * 100, 100)}%`, backgroundColor: '#a855f7' }]} />
                  </View>
                </View>
              </View>

              {/* Best Department Card */}
              <View style={[styles.executiveSummaryMetricCard, styles.bestDepartmentMetricCard]}>
                <LinearGradient colors={['#f59e0b', '#d97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.metricCardBackground} />
                <View style={styles.metricCardContent}>
                  <View style={styles.metricCardTop}>
                    <View style={[styles.executiveSummaryCardIcon, styles.bestDepartmentIcon]}>
                      <Ionicons name="medal" size={22} color="#fff" />
                    </View>
                    <View style={styles.metricCardBadge}>
                      <Text style={styles.metricCardBadgeText}>{exec.bestDepartment.score}%</Text>
                    </View>
                  </View>
                  <View style={styles.metricCardBody}>
                    <Text style={styles.executiveSummaryCardLabel}>Best Department</Text>
                    <Text style={styles.executiveSummaryCardValue}>{exec.bestDepartment.name}</Text>
                    <Text style={styles.executiveSummaryCardMeta}>Top performer</Text>
                  </View>
                  <View style={styles.metricCardProgress}>
                    <View style={[styles.metricCardProgressBar, { width: `${exec.bestDepartment.score}%`, backgroundColor: '#f59e0b' }]} />
                  </View>
                </View>
              </View>

              {/* Employees Analyzed Card */}
              <View style={[styles.executiveSummaryMetricCard, styles.employeesAnalyzedMetricCard]}>
                <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.metricCardBackground} />
                <View style={styles.metricCardContent}>
                  <View style={styles.metricCardTop}>
                    <View style={[styles.executiveSummaryCardIcon, styles.employeesAnalyzedIcon]}>
                      <Ionicons name="people" size={22} color="#fff" />
                    </View>
                    <View style={styles.metricCardBadge}>
                      <Text style={styles.metricCardBadgeText}>100%</Text>
                    </View>
                  </View>
                  <View style={styles.metricCardBody}>
                    <Text style={styles.executiveSummaryCardLabel}>Employees Analyzed</Text>
                    <Text style={styles.executiveSummaryCardValue}>{reportsData?.employees.length || 0}</Text>
                    <Text style={styles.executiveSummaryCardMeta}>Active staff</Text>
                  </View>
                  <View style={styles.metricCardProgress}>
                    <View style={[styles.metricCardProgressBar, { width: '100%', backgroundColor: '#10b981' }]} />
                  </View>
                </View>
              </View>
            </View>

            {/* Top 5 Performers Section */}
            <View style={styles.top5PerformersContainer}>
              <LinearGradient colors={['#d1fae5', '#a7f3d0']} style={styles.top5PerformersHeader}>
                <View style={styles.top5PerformersHeaderContent}>
                  <View style={styles.top5PerformersIconBg}>
                    <Ionicons name="trending-up" size={20} color="#10b981" />
                  </View>
                  <View style={styles.top5PerformersHeaderText}>
                    <Text style={styles.top5PerformersTitle}>Top 5 Performers</Text>
                    <Text style={styles.top5PerformersSubtitle}>Based on comprehensive performance metrics</Text>
                  </View>
                </View>
              </LinearGradient>

              {reportsData?.employees && reportsData.employees.length > 0 ? (
                <View style={styles.top5PerformersList}>
                  {reportsData.employees
                    .sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0))
                    .slice(0, 5)
                    .map((performer, index) => (
                      <View key={performer.id} style={styles.top5PerformerItem}>
                        <View style={styles.top5PerformerRank}>
                          <Text style={styles.top5PerformerRankNumber}>{index + 1}</Text>
                        </View>
                        <View style={styles.top5PerformerInfo}>
                          <View style={styles.top5PerformerNameRow}>
                            <Text style={styles.top5PerformerName}>{performer.name}</Text>
                            <View style={[styles.top5PerformerBadge, { backgroundColor: getRatingStatusBgColor(performer.status) }]}>
                              <Text style={[styles.top5PerformerBadgeText, { color: getRatingStatusColor(performer.status) }]}>
                                {performer.status.charAt(0).toUpperCase() + performer.status.slice(1)}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.top5PerformerMeta}>{performer.department} • {performer.role}</Text>
                        </View>
                        <View style={styles.top5PerformerScore}>
                          <Text style={[styles.top5PerformerScoreValue, { color: getRatingColor(performer.overallRating) }]}>
                            {performer.overallRating || 0}%
                          </Text>
                        </View>
                      </View>
                    ))}
                </View>
              ) : (
                <View style={styles.top5PerformersEmpty}>
                  <Ionicons name="trending-up-outline" size={48} color="#d1d5db" />
                  <Text style={styles.top5PerformersEmptyText}>No performance data available</Text>
                  <Text style={styles.top5PerformersEmptySubtext}>Performance data will appear once employees have attendance and task records.</Text>
                </View>
              )}
            </View>

            {/* Key Findings, Recommendations, Action Items Section */}
            <View style={styles.executiveSummaryDetailsContainer}>
              <View style={styles.executiveSummaryDetailsHeader}>
                <Text style={styles.executiveSummaryDetailsTitle}>Executive Summary</Text>
                <Text style={styles.executiveSummaryDetailsSubtitle}>Insights and recommendations</Text>
              </View>

              {/* Key Findings Card */}
              <View style={[styles.executiveDetailCard, styles.keyFindingsDetailCard]}>
                <View style={styles.executiveDetailCardHeader}>
                  <View style={[styles.executiveDetailCardIcon, styles.keyFindingsDetailIcon]}>
                    <Ionicons name="bulb" size={20} color="#fff" />
                  </View>
                  <Text style={styles.executiveDetailCardTitle}>Key Findings</Text>
                </View>
                <View style={styles.executiveDetailCardContent}>
                  {exec.keyFindings.map((finding, index) => (
                    <View key={`finding-${index}`} style={styles.executiveDetailListItem}>
                      <View style={styles.executiveDetailListBullet} />
                      <Text style={styles.executiveDetailListText}>{finding}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Recommendations Card */}
              <View style={[styles.executiveDetailCard, styles.recommendationsDetailCard]}>
                <View style={styles.executiveDetailCardHeader}>
                  <View style={[styles.executiveDetailCardIcon, styles.recommendationsDetailIcon]}>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  </View>
                  <Text style={styles.executiveDetailCardTitle}>Recommendations</Text>
                </View>
                <View style={styles.executiveDetailCardContent}>
                  {exec.recommendations.map((rec, index) => (
                    <View key={`rec-${index}`} style={styles.executiveDetailListItem}>
                      <View style={styles.executiveDetailListBullet} />
                      <Text style={styles.executiveDetailListText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Action Items Card */}
              <View style={[styles.executiveDetailCard, styles.actionItemsDetailCard]}>
                <View style={styles.executiveDetailCardHeader}>
                  <View style={[styles.executiveDetailCardIcon, styles.actionItemsDetailIcon]}>
                    <Ionicons name="clipboard-outline" size={20} color="#fff" />
                  </View>
                  <Text style={styles.executiveDetailCardTitle}>Action Items</Text>
                </View>
                <View style={styles.executiveDetailCardContent}>
                  {exec.actionItems.map((action, index) => (
                    <View key={`action-${index}`} style={styles.executiveDetailListItem}>
                      <View style={styles.executiveDetailListBullet} />
                      <Text style={styles.executiveDetailListText}>{action}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Export Actions */}
              <View style={styles.executiveExportActions}>
                <TouchableOpacity
                  style={styles.exportActionButton}
                  onPress={async () => {
                    try {
                      if (!reportsData?.employees || reportsData.employees.length === 0) {
                        Alert.alert('Error', 'No employee data available to export');
                        return;
                      }
                      await generateCSVExport(reportsData.employees, filters.department);
                      Alert.alert('Success', 'Full performance report exported as CSV successfully!');
                    } catch (error) {
                      Alert.alert('Error', 'Failed to export CSV report');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-outline" size={18} color="#6b7280" />
                  <Text style={styles.exportActionText}>Generate Full Report (CSV)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exportActionButton}
                  onPress={async () => {
                    try {
                      if (!reportsData?.employees || reportsData.employees.length === 0) {
                        Alert.alert('Error', 'No employee data available to export');
                        return;
                      }
                      await generatePDFExport(reportsData.employees, filters.department);
                      Alert.alert('Success', 'Full performance report exported as PDF successfully!');
                    } catch (error) {
                      Alert.alert('Error', 'Failed to export PDF report');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={18} color="#6b7280" />
                  <Text style={styles.exportActionText}>Generate Full Report (PDF)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.exportActionButton, styles.customExportButton]}
                  onPress={openEmployeeExportModal}
                  activeOpacity={0.8}
                >
                  <Ionicons name="settings-outline" size={18} color="#fff" />
                  <Text style={[styles.exportActionText, styles.customExportText]}>Custom Export</Text>
                </TouchableOpacity>
              </View>
            </View>
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
            {/* Back button for all users */}
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitleSection}>
              <Text style={styles.headerTitle}>{isAdmin ? 'Admin Reports' : 'Performance Reports'}</Text>
              <Text style={styles.headerSubtitle}>{isAdmin ? 'All employees performance data' : 'Analyze metrics, export insights'}</Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            <Select
              items={MONTHS.map(m => ({ label: m, value: m }))}
              value={filters.month}
              onValueChange={(v) => setFilters(prev => ({ ...prev, month: v as MonthType }))}
              containerStyle={{ flex: 1, marginBottom: 0 }}
              style={{ height: 40, backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'transparent' }}
            />
            <View style={{ width: 10 }} />
            {isAdmin || departments.length > 1 ? (
              <Select
                items={departments.map(d => ({ label: d, value: d }))}
                value={filters.department}
                onValueChange={(v) => setFilters(prev => ({ ...prev, department: v }))}
                containerStyle={{ flex: 1, marginBottom: 0 }}
                style={{ height: 40, backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'transparent' }}
              />
            ) : (
              <View style={[styles.staticFilter, { flex: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{filters.department}</Text>
              </View>
            )}
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

      {/* EMPLOYEE EXPORT MODAL */}
      <Modal visible={employeeExportModalVisible} animationType="slide" onRequestClose={closeEmployeeExportModal}>
        <View style={styles.exportFullScreenContainer}>
          {/* Full Screen Header */}
          <LinearGradient colors={['#3b82f6', '#2563eb', '#1d4ed8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.exportFullScreenHeader}>
            <View style={styles.exportFullScreenHeaderContent}>
              <TouchableOpacity style={styles.exportFullScreenBackBtn} onPress={closeEmployeeExportModal} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.exportFullScreenHeaderText}>
                <Text style={styles.exportFullScreenTitle}>Export Employee Report</Text>
                <Text style={styles.exportFullScreenSubtitle}>Generate comprehensive employee analytics</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Content */}
          <ScrollView style={styles.exportFullScreenBody} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
            {/* Format Selection Card */}
            <View style={styles.exportSectionNew}>
              <View style={styles.exportSectionHeaderNew}>
                <Ionicons name="document-outline" size={18} color="#3b82f6" />
                <Text style={styles.exportSectionTitleNew}>Export Format</Text>
              </View>
              <View style={styles.exportFormatGridNew}>
                <TouchableOpacity
                  style={[styles.exportFormatCardNew, employeeExportFormat === 'pdf' && styles.exportFormatCardActiveNew]}
                  onPress={() => setEmployeeExportFormat('pdf')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={employeeExportFormat === 'pdf' ? ['#ef4444', '#dc2626'] : ['#fee2e2', '#fecaca']}
                    style={styles.exportFormatCardGradientNew}
                  >
                    <Ionicons name="document-text" size={28} color={employeeExportFormat === 'pdf' ? '#fff' : '#ef4444'} />
                    <Text style={[styles.exportFormatCardTextNew, employeeExportFormat === 'pdf' && styles.exportFormatCardTextActiveNew]}>PDF</Text>
                    <Text style={[styles.exportFormatCardSubNew, employeeExportFormat === 'pdf' && styles.exportFormatCardSubActiveNew]}>Professional</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.exportFormatCardNew, employeeExportFormat === 'csv' && styles.exportFormatCardActiveNew]}
                  onPress={() => setEmployeeExportFormat('csv')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={employeeExportFormat === 'csv' ? ['#22c55e', '#16a34a'] : ['#dcfce7', '#bbf7d0']}
                    style={styles.exportFormatCardGradientNew}
                  >
                    <Ionicons name="grid" size={28} color={employeeExportFormat === 'csv' ? '#fff' : '#22c55e'} />
                    <Text style={[styles.exportFormatCardTextNew, employeeExportFormat === 'csv' && styles.exportFormatCardTextActiveNew]}>CSV</Text>
                    <Text style={[styles.exportFormatCardSubNew, employeeExportFormat === 'csv' && styles.exportFormatCardSubActiveNew]}>Spreadsheet</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Department Selection - Optional */}
            <Select
              label="Select Department"
              items={['all', ...departments.filter(d => d !== "All Departments")].map(d => ({ label: d === 'all' ? 'All Departments' : d, value: d }))}
              value={employeeExportDepartment}
              onValueChange={(v) => {
                setEmployeeExportDepartment(v);
                if (v === 'all') setEmployeeExportEmployee('all');
              }}
              placeholder="Select Department"
            />

            {/* Employee Selection */}
            <Select
              label="Select Employee"
              items={[
                { label: 'All Employees', value: 'all' },
                ...reportsData?.employees
                  .filter(emp => employeeExportDepartment === 'all' || emp.department === employeeExportDepartment)
                  .map(emp => ({ label: emp.name, value: emp.name })) || []
              ]}
              value={employeeExportEmployee}
              onValueChange={(v) => setEmployeeExportEmployee(v)}
              placeholder="Select Employee"
            />

            <Select
              label="Report Period"
              items={[
                { label: 'Current Month', value: 'current' },
                { label: 'Last 3 Months', value: 'last3' },
                { label: 'Custom Range', value: 'custom' }
              ]}
              value={employeeExportPeriodType}
              onValueChange={(v) => setEmployeeExportPeriodType(v as any)}
              placeholder="Select Period"
            />

            {/* Custom Range Inputs - Only show when custom is selected */}
            {employeeExportPeriodType === 'custom' && (
              <View style={styles.exportCustomRangeContainerNew}>
                {/* From Section */}
                <View style={styles.exportCustomRangeSectionNew}>
                  <View style={styles.exportCustomRangeHeaderNew}>
                    <View style={styles.exportCustomRangeIconNew}>
                      <Ionicons name="play-outline" size={14} color="#fff" />
                    </View>
                    <Text style={styles.exportCustomRangeLabelNew}>From</Text>
                  </View>
                  <View style={styles.exportCustomRangeDateGridNew}>
                    <Select
                      items={MONTHS.map(m => ({ label: m, value: m }))}
                      value={employeeExportFromMonth}
                      onValueChange={(v) => setEmployeeExportFromMonth(v as any)}
                      placeholder="Month"
                      containerStyle={{ flex: 1 }}
                    />
                    <Select
                      items={[2024, 2025, 2026].map(y => ({ label: y.toString(), value: y.toString() }))}
                      value={employeeExportFromYear}
                      onValueChange={(v) => setEmployeeExportFromYear(v)}
                      placeholder="Year"
                      containerStyle={{ flex: 1 }}
                    />
                  </View>
                </View>

                {/* Arrow Divider */}
                <View style={styles.exportCustomRangeArrowContainerNew}>
                  <View style={styles.exportCustomRangeArrowLineNew} />
                  <View style={styles.exportCustomRangeArrowIconNew}>
                    <Ionicons name="arrow-forward" size={18} color="#0891b2" />
                  </View>
                  <View style={styles.exportCustomRangeArrowLineNew} />
                </View>

                {/* To Section */}
                <View style={styles.exportCustomRangeSectionNew}>
                  <View style={styles.exportCustomRangeHeaderNew}>
                    <View style={[styles.exportCustomRangeIconNew, { backgroundColor: '#10b981' }]}>
                      <Ionicons name="stop-outline" size={14} color="#fff" />
                    </View>
                    <Text style={styles.exportCustomRangeLabelNew}>To</Text>
                  </View>
                  <View style={styles.exportCustomRangeDateGridNew}>
                    <Select
                      items={MONTHS.map(m => ({ label: m, value: m }))}
                      value={employeeExportToMonth}
                      onValueChange={(v) => setEmployeeExportToMonth(v as any)}
                      placeholder="Month"
                      containerStyle={{ flex: 1 }}
                    />
                    <Select
                      items={[2024, 2025, 2026].map(y => ({ label: y.toString(), value: y.toString() }))}
                      value={employeeExportToYear}
                      onValueChange={(v) => setEmployeeExportToYear(v)}
                      placeholder="Year"
                      containerStyle={{ flex: 1 }}
                    />
                  </View>
                </View>

                {/* Range Preview */}
                <View style={styles.exportCustomRangePreviewNew}>
                  <View style={styles.exportCustomRangePreviewHeaderNew}>
                    <Ionicons name="information-circle" size={16} color="#0891b2" />
                    <Text style={styles.exportCustomRangePreviewTitleNew}>Selected Range</Text>
                  </View>
                  <Text style={styles.exportCustomRangePreviewTextNew}>
                    {employeeExportFromMonth} {employeeExportFromYear} → {employeeExportToMonth} {employeeExportToYear}
                  </Text>
                </View>
              </View>
            )}

            {/* Summary Card */}
            <View style={styles.exportFullScreenSummaryCard}>
              <View style={styles.exportFullScreenSummaryHeader}>
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text style={styles.exportFullScreenSummaryTitle}>Export Summary</Text>
              </View>
              <View style={styles.exportFullScreenSummaryContent}>
                <View style={styles.exportFullScreenSummaryRow}>
                  <Text style={styles.exportFullScreenSummaryLabel}>Format:</Text>
                  <Text style={styles.exportFullScreenSummaryValue}>{employeeExportFormat.toUpperCase()}</Text>
                </View>
                <View style={styles.exportFullScreenSummaryRow}>
                  <Text style={styles.exportFullScreenSummaryLabel}>Department:</Text>
                  <Text style={styles.exportFullScreenSummaryValue}>
                    {employeeExportDepartment === 'all' ? 'All Departments' : employeeExportDepartment}
                  </Text>
                </View>
                <View style={styles.exportFullScreenSummaryRow}>
                  <Text style={styles.exportFullScreenSummaryLabel}>Employee:</Text>
                  <Text style={styles.exportFullScreenSummaryValue}>{employeeExportEmployee === 'all' ? 'All' : employeeExportEmployee}</Text>
                </View>
                <View style={styles.exportFullScreenSummaryRow}>
                  <Text style={styles.exportFullScreenSummaryLabel}>Period:</Text>
                  <Text style={styles.exportFullScreenSummaryValue}>
                    {employeeExportPeriodType === 'current'
                      ? `Current Month (${getCurrentMonth()})`
                      : employeeExportPeriodType === 'last3'
                        ? 'Last 3 Months'
                        : `${employeeExportFromMonth} ${employeeExportFromYear} - ${employeeExportToMonth} ${employeeExportToYear}`}
                  </Text>
                </View>
              </View>
            </View >

            <View style={{ height: 12 }} />
          </ScrollView >

          {/* Footer */}
          < View style={styles.exportFullScreenFooter} >
            <TouchableOpacity style={styles.exportFullScreenCancelBtn} onPress={closeEmployeeExportModal} activeOpacity={0.7}>
              <Text style={styles.exportFullScreenCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportFullScreenSubmitBtn, !isEmployeeExportValid && styles.exportFullScreenSubmitBtnDisabled]}
              onPress={handleExport}
              activeOpacity={isEmployeeExportValid ? 0.8 : 1}
              disabled={!isEmployeeExportValid}
            >
              <LinearGradient
                colors={isEmployeeExportValid ? ['#3b82f6', '#2563eb'] : ['#d1d5db', '#9ca3af']}
                style={styles.exportFullScreenSubmitBtnGradient}
              >
                <Ionicons name="download" size={18} color="#fff" />
                <Text style={styles.exportFullScreenSubmitBtnText}>
                  {isEmployeeExportValid ? `Export ${employeeExportFormat.toUpperCase()}` : 'Select Options'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View >
        </View >
      </Modal>

      {/* DEPARTMENT EXPORT MODAL */}
      <Modal visible={departmentExportModalVisible} animationType="slide" onRequestClose={closeDepartmentExportModal}>
        <View style={styles.exportFullScreenContainer}>
          {/* Compact Header */}
          <LinearGradient colors={['#8b5cf6', '#7c3aed', '#6d28d9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.exportFullScreenHeader}>
            <View style={styles.exportFullScreenHeaderContent}>
              <TouchableOpacity style={styles.exportFullScreenBackBtn} onPress={closeDepartmentExportModal} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.exportFullScreenHeaderText}>
                <Text style={styles.exportFullScreenTitle}>Export Department Report</Text>
                <Text style={styles.exportFullScreenSubtitle}>Generate comprehensive department analytics</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Content */}
          <ScrollView style={styles.exportFullScreenBody} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
            {/* Format Selection Card */}
            <View style={styles.exportSectionNew}>
              <View style={styles.exportSectionHeaderNew}>
                <Ionicons name="document-outline" size={18} color="#8b5cf6" />
                <Text style={styles.exportSectionTitleNew}>Export Format</Text>
              </View>
              <View style={styles.exportFormatGridNew}>
                <TouchableOpacity
                  style={[styles.exportFormatCardNew, departmentExportFormat === 'pdf' && styles.exportFormatCardActiveNew]}
                  onPress={() => setDepartmentExportFormat('pdf')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={departmentExportFormat === 'pdf' ? ['#ef4444', '#dc2626'] : ['#fee2e2', '#fecaca']}
                    style={styles.exportFormatCardGradientNew}
                  >
                    <Ionicons name="document-text" size={28} color={departmentExportFormat === 'pdf' ? '#fff' : '#ef4444'} />
                    <Text style={[styles.exportFormatCardTextNew, departmentExportFormat === 'pdf' && styles.exportFormatCardTextActiveNew]}>PDF</Text>
                    <Text style={[styles.exportFormatCardSubNew, departmentExportFormat === 'pdf' && styles.exportFormatCardSubActiveNew]}>Professional</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.exportFormatCardNew, departmentExportFormat === 'csv' && styles.exportFormatCardActiveNew]}
                  onPress={() => setDepartmentExportFormat('csv')}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={departmentExportFormat === 'csv' ? ['#22c55e', '#16a34a'] : ['#dcfce7', '#bbf7d0']}
                    style={styles.exportFormatCardGradientNew}
                  >
                    <Ionicons name="grid" size={28} color={departmentExportFormat === 'csv' ? '#fff' : '#22c55e'} />
                    <Text style={[styles.exportFormatCardTextNew, departmentExportFormat === 'csv' && styles.exportFormatCardTextActiveNew]}>CSV</Text>
                    <Text style={[styles.exportFormatCardSubNew, departmentExportFormat === 'csv' && styles.exportFormatCardSubActiveNew]}>Spreadsheet</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Department Selection Card */}
            <Select
              label="Select Department"
              items={['all', ...departments.filter(d => d !== "All Departments")].map(d => ({ label: d === 'all' ? 'All Departments' : d, value: d }))}
              value={departmentExportDept}
              onValueChange={(v) => setDepartmentExportDept(v)}
              placeholder="Select Department"
            />

            <Select
              label="Report Period"
              items={[
                { label: 'Current Month', value: 'current' },
                { label: 'Last 3 Months', value: 'last3' },
                { label: 'Custom Range', value: 'custom' }
              ]}
              value={departmentExportPeriodType}
              onValueChange={(v) => setDepartmentExportPeriodType(v as any)}
              placeholder="Select Period"
            />

            {/* Custom Range Inputs - Only show when custom is selected */}
            {departmentExportPeriodType === 'custom' && (
              <View style={styles.exportCustomRangeContainerNew}>
                {/* From Section */}
                <View style={styles.exportCustomRangeSectionNew}>
                  <View style={styles.exportCustomRangeHeaderNew}>
                    <View style={styles.exportCustomRangeIconNew}>
                      <Ionicons name="play-outline" size={14} color="#fff" />
                    </View>
                    <Text style={styles.exportCustomRangeLabelNew}>From</Text>
                  </View>
                  <View style={styles.exportCustomRangeDateGridNew}>
                    <Select
                      items={MONTHS.map(m => ({ label: m, value: m }))}
                      value={departmentExportFromMonth}
                      onValueChange={(v) => setDepartmentExportFromMonth(v as any)}
                      placeholder="Month"
                      containerStyle={{ flex: 1 }}
                    />
                    <Select
                      items={[2024, 2025, 2026].map(y => ({ label: y.toString(), value: y.toString() }))}
                      value={departmentExportFromYear}
                      onValueChange={(v) => setDepartmentExportFromYear(v)}
                      placeholder="Year"
                      containerStyle={{ flex: 1 }}
                    />
                  </View>
                </View>

                {/* Arrow Divider */}
                <View style={styles.exportCustomRangeArrowContainerNew}>
                  <View style={styles.exportCustomRangeArrowLineNew} />
                  <View style={styles.exportCustomRangeArrowIconNew}>
                    <Ionicons name="arrow-forward" size={18} color="#0891b2" />
                  </View>
                  <View style={styles.exportCustomRangeArrowLineNew} />
                </View>

                {/* To Section */}
                <View style={styles.exportCustomRangeSectionNew}>
                  <View style={styles.exportCustomRangeHeaderNew}>
                    <View style={[styles.exportCustomRangeIconNew, { backgroundColor: '#10b981' }]}>
                      <Ionicons name="stop-outline" size={14} color="#fff" />
                    </View>
                    <Text style={styles.exportCustomRangeLabelNew}>To</Text>
                  </View>
                  <View style={styles.exportCustomRangeDateGridNew}>
                    <Select
                      items={MONTHS.map(m => ({ label: m, value: m }))}
                      value={departmentExportToMonth}
                      onValueChange={(v) => setDepartmentExportToMonth(v as any)}
                      placeholder="Month"
                      containerStyle={{ flex: 1 }}
                    />
                    <Select
                      items={[2024, 2025, 2026].map(y => ({ label: y.toString(), value: y.toString() }))}
                      value={departmentExportToYear}
                      onValueChange={(v) => setDepartmentExportToYear(v)}
                      placeholder="Year"
                      containerStyle={{ flex: 1 }}
                    />
                  </View>
                </View>

                {/* Range Preview */}
                <View style={styles.exportCustomRangePreviewNew}>
                  <View style={styles.exportCustomRangePreviewHeaderNew}>
                    <Ionicons name="information-circle" size={16} color="#0891b2" />
                    <Text style={styles.exportCustomRangePreviewTitleNew}>Selected Range</Text>
                  </View>
                  <Text style={styles.exportCustomRangePreviewTextNew}>
                    {departmentExportFromMonth} {departmentExportFromYear} → {departmentExportToMonth} {departmentExportToYear}
                  </Text>
                </View>
              </View>
            )}

            <View style={{ height: 12 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.exportFullScreenFooter}>
            <TouchableOpacity style={styles.exportFullScreenCancelBtn} onPress={closeDepartmentExportModal} activeOpacity={0.7}>
              <Text style={styles.exportFullScreenCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportFullScreenSubmitBtn, !isDepartmentExportValid && styles.exportFullScreenSubmitBtnDisabled]}
              onPress={handleExport}
              activeOpacity={isDepartmentExportValid ? 0.8 : 1}
              disabled={!isDepartmentExportValid}
            >
              <LinearGradient
                colors={isDepartmentExportValid ? ['#8b5cf6', '#7c3aed'] : ['#d1d5db', '#9ca3af']}
                style={styles.exportFullScreenSubmitBtnGradient}
              >
                <Ionicons name="download" size={18} color="#fff" />
                <Text style={styles.exportFullScreenSubmitBtnText}>
                  {isDepartmentExportValid ? `Export ${departmentExportFormat.toUpperCase()}` : 'Select Department'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView >
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
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16
  },
  staticFilter: {},
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
  dropdownContainer: {
    width: "48%"
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  dropdownButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderColor: "rgba(255, 255, 255, 0.5)",
    shadowColor: "rgba(255, 255, 255, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  dropdownButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1
  },
  dropdownLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1
  },
  // Dropdown Absolute Positioning Styles
  dropdownAbsoluteOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)"
  },
  dropdownAbsolutePopup: {
    position: "absolute",
    top: 120,
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 14,
    maxHeight: 280,
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: "hidden",
    zIndex: 1000,
    borderWidth: 1,
    borderColor: "rgba(8, 145, 178, 0.1)"
  },
  dropdownAbsolutePopupLeft: {
    left: 16
  },
  dropdownAbsolutePopupRight: {
    right: 16
  },
  dropdownPopupOption: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
    minHeight: 46,
    backgroundColor: "#fff"
  },
  dropdownPopupOptionSelected: {
    backgroundColor: "#f0f9ff",
    borderLeftWidth: 3,
    borderLeftColor: "#0891b2",
    paddingLeft: 11
  },
  dropdownPopupOptionText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flex: 1
  },
  dropdownPopupOptionTextActive: {
    color: "#0891b2",
    fontWeight: "700"
  },

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

  // Department Overview Header
  deptOverviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingHorizontal: 4 },
  deptOverviewHeaderLeft: { flex: 1, marginRight: 16 },
  deptOverviewTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  deptOverviewSubtitle: { fontSize: 13, color: '#6b7280' },
  deptOverviewExportBtn: { borderRadius: 10, overflow: 'hidden', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  deptOverviewExportGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  deptOverviewExportText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Department Cards Container
  deptCardsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },

  // New Department Card Styles
  deptCardNew: { width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9' },
  deptCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  deptCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  deptCardIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#c026d3', alignItems: 'center', justifyContent: 'center' },
  deptCardName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  deptCardStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  deptCardStatusText: { fontSize: 11, fontWeight: '600' },

  // Employees Row
  deptCardEmployeesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 12 },
  deptCardEmployeesLabel: { flex: 1, fontSize: 13, color: '#6b7280' },
  deptCardEmployeesValue: { fontSize: 16, fontWeight: '700', color: '#111827' },

  // 2x2 Metrics Grid
  deptCardMetricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  deptCardMetricBox: { width: '47%', borderRadius: 10, padding: 12 },
  deptCardMetricBoxYellow: { backgroundColor: '#fef9c3' },
  deptCardMetricBoxGreen: { backgroundColor: '#dcfce7' },
  deptCardMetricLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  deptCardMetricValue: { fontSize: 18, fontWeight: '700' },

  // Performance Score Section
  deptCardPerformanceSection: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  deptCardPerformanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  deptCardPerformanceLabel: { fontSize: 13, fontWeight: '600', color: '#111827' },
  deptCardPerformanceValue: { fontSize: 16, fontWeight: '700' },
  deptCardProgressTrack: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  deptCardProgressFill: { height: '100%', borderRadius: 3 },

  // Legacy Department Card (keeping for backward compatibility)
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

  // Executive Summary Metric Cards Grid
  executiveSummaryCardsContainer: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingVertical: 16, gap: 12, justifyContent: "center" },
  executiveSummaryMetricCard: { width: "47%", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4, borderWidth: 0, minHeight: 170 },
  avgPerformanceMetricCard: {},
  tasksCompletedMetricCard: {},
  bestDepartmentMetricCard: {},
  employeesAnalyzedMetricCard: {},

  // Metric Card Background & Content
  metricCardBackground: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  metricCardContent: { padding: 16, zIndex: 1, flex: 1, justifyContent: "space-between" },
  metricCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  metricCardBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.25)" },
  metricCardBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  metricCardBody: { marginBottom: 12 },
  metricCardProgress: { height: 5, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 2.5, overflow: "hidden" },
  metricCardProgressBar: { height: "100%", borderRadius: 2.5 },

  // Executive Summary Card Icon
  executiveSummaryCardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 3 },
  avgPerformanceIcon: { backgroundColor: "#3b82f6" },
  tasksCompletedIcon: { backgroundColor: "#a855f7" },
  bestDepartmentIcon: { backgroundColor: "#f59e0b" },
  employeesAnalyzedIcon: { backgroundColor: "#10b981" },

  // Executive Summary Card Text
  executiveSummaryCardLabel: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.85)", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.4 },
  executiveSummaryCardValue: { fontSize: 26, fontWeight: "800", color: "#fff", marginBottom: 3 },
  executiveSummaryCardMeta: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "500" },

  // Top 5 Performers Section
  top5PerformersContainer: { marginHorizontal: 12, marginVertical: 16, borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  top5PerformersHeader: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  top5PerformersHeaderContent: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  top5PerformersIconBg: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#10b981", alignItems: "center", justifyContent: "center" },
  top5PerformersHeaderText: { flex: 1 },
  top5PerformersTitle: { fontSize: 16, fontWeight: "700", color: "#047857", marginBottom: 2 },
  top5PerformersSubtitle: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  top5PerformersList: { backgroundColor: "#fff", paddingVertical: 8 },
  top5PerformerItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  top5PerformerRank: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginRight: 12 },
  top5PerformerRankNumber: { fontSize: 14, fontWeight: "700", color: "#111827" },
  top5PerformerInfo: { flex: 1 },
  top5PerformerNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  top5PerformerName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  top5PerformerBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  top5PerformerBadgeText: { fontSize: 10, fontWeight: "600" },
  top5PerformerMeta: { fontSize: 12, color: "#9ca3af", fontWeight: "500" },
  top5PerformerScore: { alignItems: "flex-end" },
  top5PerformerScoreValue: { fontSize: 16, fontWeight: "700" },
  top5PerformersEmpty: { backgroundColor: "#fff", paddingVertical: 40, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  top5PerformersEmptyText: { fontSize: 16, fontWeight: "600", color: "#6b7280", marginTop: 12, marginBottom: 4 },
  top5PerformersEmptySubtext: { fontSize: 13, color: "#9ca3af", textAlign: "center", lineHeight: 18 },

  // Executive Summary Details Container
  executiveSummaryDetailsContainer: { paddingHorizontal: 16, paddingVertical: 20 },
  executiveSummaryDetailsHeader: { marginBottom: 24 },
  executiveSummaryDetailsTitle: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 4 },
  executiveSummaryDetailsSubtitle: { fontSize: 14, color: "#6b7280", fontWeight: "500" },

  // Executive Detail Card Box
  executiveDetailCard: { borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, borderWidth: 1 },
  keyFindingsDetailCard: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  recommendationsDetailCard: { backgroundColor: "#faf5ff", borderColor: "#e9d5ff" },
  actionItemsDetailCard: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },

  // Executive Detail Card Header
  executiveDetailCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  executiveDetailCardIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  keyFindingsDetailIcon: { backgroundColor: "#3b82f6" },
  recommendationsDetailIcon: { backgroundColor: "#a855f7" },
  actionItemsDetailIcon: { backgroundColor: "#10b981" },
  executiveDetailCardTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },

  // Executive Detail Card Content
  executiveDetailCardContent: { gap: 12 },
  executiveDetailListItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  executiveDetailListBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0, backgroundColor: "#3b82f6" },
  executiveDetailListText: { fontSize: 14, color: "#374151", flex: 1, lineHeight: 20 },

  // Executive Export Actions
  executiveExportActions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 24 },
  exportActionButton: { flex: 1, minWidth: "48%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  customExportButton: { backgroundColor: "#10b981", borderColor: "#10b981" },
  exportActionText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  customExportText: { color: "#fff" },

  // Enhanced Department Section Styles
  deptSectionHeaderCard: { borderRadius: 18, overflow: "hidden", marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  deptSectionHeaderGradient: { paddingHorizontal: 18, paddingVertical: 16 },
  deptSectionHeaderContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  deptSectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  deptSectionHeaderIconBg: { width: 52, height: 52, borderRadius: 14, overflow: "hidden", shadowColor: "#8b5cf6", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  deptSectionHeaderIconGradient: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  deptSectionHeaderTextContainer: { flex: 1 },
  deptSectionHeaderTitle: { fontSize: 18, fontWeight: "800", color: "#111827", letterSpacing: 0.3 },
  deptSectionHeaderSubtitle: { fontSize: 12, color: "#6b7280", marginTop: 3, fontWeight: "500" },
  deptSectionExportButton: { borderRadius: 12, overflow: "hidden", shadowColor: "#8b5cf6", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  deptSectionExportButtonGradient: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, justifyContent: "center" },
  deptSectionExportButtonContent: { flexDirection: "row", alignItems: "center", gap: 6 },
  deptSectionExportButtonLabel: { fontSize: 13, fontWeight: "700", color: "#fff", letterSpacing: 0.2 },

  // Enhanced Quick Stats
  deptQuickStatsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  deptQuickStatCard: { flex: 1, minWidth: "48%", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1 },
  deptQuickStatCardBlue: { backgroundColor: "#f0f9ff", borderColor: "#bfdbfe" },
  deptQuickStatCardGreen: { backgroundColor: "#f0fdf4", borderColor: "#dcfce7" },
  deptQuickStatCardAmber: { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
  deptQuickStatCardPurple: { backgroundColor: "#faf5ff", borderColor: "#e9d5ff" },
  deptQuickStatCardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  deptQuickStatIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  deptQuickStatValue: { fontSize: 20, fontWeight: "800", color: "#111827" },
  deptQuickStatLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600" },

  // Enhanced Controls
  deptControlsContainer: { flexDirection: "row", gap: 12, marginBottom: 18 },
  deptControlBtn: { flex: 1, borderRadius: 12, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  deptControlBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 16 },
  deptControlBtnText: { fontSize: 13, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },

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
  prominentRateBtnRated: { backgroundColor: '#10b981', shadowColor: '#10b981' },
  prominentRateBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  // Horizontal Metrics Row
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricBox: { flexBasis: '31%', flexGrow: 0, flexShrink: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', minWidth: 100 },
  metricBoxHighlight: { flexBasis: '48%', backgroundColor: '#f0f9ff', borderColor: '#bfdbfe' },
  metricBoxRated: { borderColor: '#10b981', borderWidth: 2, backgroundColor: '#f0fdf4' },
  metricIconRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  metricLabel: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  metricValue: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  metricUnit: { fontSize: 12, fontWeight: '500' },
  metricProgress: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 6, overflow: 'hidden' },
  metricProgressFill: { height: '100%', borderRadius: 2 },
  metricNote: { fontSize: 10, color: '#9ca3af' },
  ratedMetricHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  ratedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
  ratedBadgeText: { fontSize: 10, fontWeight: '600' },
  ratingInfoBanner: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#10b981' },
  ratingInfoContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingInfoText: { flex: 1 },
  ratingInfoTitle: { fontSize: 12, fontWeight: '600', color: '#10b981', marginBottom: 2 },
  ratingInfoSubtitle: { fontSize: 11, color: '#6b7280' },

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



  // ============================================
  // KANBAN STYLE DEPARTMENT VIEW
  // ============================================

  // Kanban Header
  kanbanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  kanbanHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  kanbanHeaderIconWrap: { borderRadius: 12, overflow: 'hidden' },
  kanbanHeaderIconGradient: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  kanbanHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  kanbanHeaderSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  kanbanExportBtn: { borderRadius: 10, overflow: 'hidden', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  kanbanExportGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  kanbanExportText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Quick Stats Row
  kanbanQuickStats: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  kanbanQuickStatItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  kanbanQuickStatIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kanbanQuickStatValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  kanbanQuickStatLabel: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  kanbanQuickStatDivider: { width: 1, height: 36, backgroundColor: '#e5e7eb', marginHorizontal: 8 },

  // Kanban Controls
  kanbanControls: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 16 },
  kanbanControlBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  kanbanControlText: { fontSize: 12, fontWeight: '500', color: '#6b7280' },

  // Kanban Container
  kanbanContainer: { gap: 12 },

  // Kanban Card
  kanbanCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#f1f5f9' },

  // Kanban Card Header
  kanbanCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fafbfc' },
  kanbanCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  kanbanCardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kanbanCardTitleWrap: { flex: 1 },
  kanbanCardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  kanbanCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  kanbanCardMetaText: { fontSize: 12, color: '#9ca3af' },
  kanbanCardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kanbanStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 6 },
  kanbanStatusDot: { width: 6, height: 6, borderRadius: 3 },
  kanbanStatusText: { fontSize: 11, fontWeight: '600' },
  kanbanChevronWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },

  // Kanban Score Bar
  kanbanScoreBar: { paddingHorizontal: 16, paddingBottom: 12 },
  kanbanScoreBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  kanbanScoreBarLabel: { fontSize: 12, fontWeight: '500', color: '#6b7280' },
  kanbanScoreBarValue: { fontSize: 14, fontWeight: '700' },
  kanbanScoreBarTrack: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  kanbanScoreBarFill: { height: '100%', borderRadius: 3 },

  // Kanban Expanded Content
  kanbanExpandedContent: { borderTopWidth: 1, borderTopColor: '#f1f5f9', padding: 16, backgroundColor: '#fff' },

  // Kanban Metrics Grid
  kanbanMetricsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kanbanMetricCard: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1 },
  kanbanMetricCardBlue: { backgroundColor: '#eff6ff', borderColor: '#dbeafe' },
  kanbanMetricCardGreen: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
  kanbanMetricCardPurple: { backgroundColor: '#faf5ff', borderColor: '#f3e8ff' },
  kanbanMetricIconWrap: { marginBottom: 8 },
  kanbanMetricLabel: { fontSize: 11, color: '#6b7280', fontWeight: '500', marginBottom: 4 },
  kanbanMetricValue: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  kanbanMetricMiniBar: { height: 4, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  kanbanMetricMiniFill: { height: '100%', borderRadius: 2 },

  // Kanban Tasks Summary
  kanbanTasksSummary: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  kanbanTasksTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 12 },
  kanbanTasksRow: { flexDirection: 'row', justifyContent: 'space-between' },
  kanbanTaskItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kanbanTaskIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  kanbanTaskValue: { fontSize: 18, fontWeight: '700' },
  kanbanTaskLabel: { fontSize: 10, color: '#9ca3af', marginTop: 1 },

  // Kanban Actions
  kanbanActions: { flexDirection: 'row', gap: 10 },
  kanbanActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bfdbfe' },
  kanbanActionText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  kanbanActionBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#3b82f6' },
  kanbanActionTextPrimary: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // Export Modal - Premium Design
  exportModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  exportModalContainerNew: { backgroundColor: '#fff', borderRadius: 20, width: '100%', maxWidth: 380, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 32, elevation: 25, overflow: 'hidden', maxHeight: '75%' },

  // Full Screen Export Modal
  exportFullScreenContainer: { flex: 1, backgroundColor: '#f8fafc' },
  exportFullScreenHeader: { paddingVertical: 16, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  exportFullScreenHeaderContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  exportFullScreenBackBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  exportFullScreenHeaderText: { flex: 1 },
  exportFullScreenTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  exportFullScreenSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 3, fontWeight: '500' },
  exportFullScreenBody: { flex: 1, paddingHorizontal: 16, paddingVertical: 20 },
  exportFullScreenFooter: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
  exportFullScreenCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#e5e7eb' },
  exportFullScreenCancelBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  exportFullScreenSubmitBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  exportFullScreenSubmitBtnDisabled: { opacity: 0.5 },
  exportFullScreenSubmitBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  exportFullScreenSubmitBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  // Full Screen Dropdown Trigger
  exportFullScreenDropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
  exportFullScreenDropdownTriggerActive: { borderColor: '#0891b2', backgroundColor: '#f0f9fc', shadowColor: '#0891b2', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  exportFullScreenDropdownTriggerError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  exportFullScreenDropdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  exportFullScreenDropdownIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  exportFullScreenDropdownIconError: { backgroundColor: '#fee2e2' },
  exportFullScreenDropdownLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500', marginBottom: 3 },
  exportFullScreenDropdownValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
  exportFullScreenDropdownValueError: { color: '#ef4444' },

  // Full Screen Date Grid
  exportFullScreenDateGrid: { flexDirection: 'row', gap: 12 },
  exportFullScreenDateField: { flex: 1 },
  exportFullScreenDateLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  exportFullScreenDateDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
  exportFullScreenDateDropdownActive: { borderColor: '#0891b2', backgroundColor: '#f0f9fc', shadowColor: '#0891b2', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  exportFullScreenDateDropdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exportFullScreenDateValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

  // Summary Card
  exportFullScreenSummaryCard: { backgroundColor: '#f0f9fc', borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#cffafe', shadowColor: '#0891b2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  exportFullScreenSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  exportFullScreenSummaryTitle: { fontSize: 14, fontWeight: '700', color: '#0891b2' },
  exportFullScreenSummaryContent: { gap: 10 },
  exportFullScreenSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e0f2fe' },
  exportFullScreenSummaryLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  exportFullScreenSummaryValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  exportFullScreenSummaryValueError: { color: '#ef4444' },

  // Section Label Row
  exportSectionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  exportMandatoryBadge: { fontSize: 10, fontWeight: '700', color: '#fff', backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  exportOptionalBadge: { fontSize: 10, fontWeight: '700', color: '#fff', backgroundColor: '#8b5cf6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Period Type Selection
  exportPeriodTypeContainer: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  exportPeriodTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  exportPeriodTypeBtnActive: { backgroundColor: '#0891b2', borderColor: '#0891b2', shadowColor: '#0891b2', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  exportPeriodTypeBtnText: { fontSize: 11, fontWeight: '600', color: '#6b7280', textAlign: 'center' },
  exportPeriodTypeBtnTextActive: { color: '#fff', fontWeight: '700' },

  // Custom Range Container - New Design
  exportCustomRangeContainerNew: { backgroundColor: '#f0f9fc', borderRadius: 14, padding: 16, marginTop: 14, borderWidth: 1.5, borderColor: '#cffafe', shadowColor: '#0891b2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  exportCustomRangeSectionNew: { marginBottom: 16 },
  exportCustomRangeHeaderNew: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  exportCustomRangeIconNew: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#0891b2', alignItems: 'center', justifyContent: 'center' },
  exportCustomRangeLabelNew: { fontSize: 12, fontWeight: '700', color: '#111827', textTransform: 'uppercase', letterSpacing: 0.4 },
  exportCustomRangeDateGridNew: { flexDirection: 'row', gap: 10 },
  exportCustomRangeDateFieldNew: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  exportCustomRangeDateFieldActiveNew: { borderColor: '#0891b2', backgroundColor: '#f0f9fc', shadowColor: '#0891b2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  exportCustomRangeDateFieldLeftNew: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  exportCustomRangeDateFieldTextNew: { flex: 1 },
  exportCustomRangeDateFieldLabelNew: { fontSize: 10, color: '#9ca3af', fontWeight: '500', marginBottom: 2 },
  exportCustomRangeDateFieldValueNew: { fontSize: 13, fontWeight: '700', color: '#111827' },
  exportCustomRangeArrowContainerNew: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16, paddingHorizontal: 8 },
  exportCustomRangeArrowLineNew: { flex: 1, height: 2, backgroundColor: '#cffafe', borderRadius: 1 },
  exportCustomRangeArrowIconNew: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#cffafe' },
  exportCustomRangePreviewNew: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 12 },
  exportCustomRangePreviewHeaderNew: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  exportCustomRangePreviewTitleNew: { fontSize: 11, fontWeight: '600', color: '#0891b2', textTransform: 'uppercase', letterSpacing: 0.3 },
  exportCustomRangePreviewTextNew: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'center', paddingVertical: 4 },

  // Legacy Custom Range Container (keeping for backward compatibility)
  exportCustomRangeContainer: { backgroundColor: '#f0f9fc', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#cffafe', flexDirection: 'row', alignItems: 'center', gap: 10 },
  exportCustomRangeSection: { flex: 1 },
  exportCustomRangeLabel: { fontSize: 10, fontWeight: '600', color: '#0891b2', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  exportCustomRangeDateGrid: { flexDirection: 'row', gap: 8 },
  exportCustomRangeArrow: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },

  // Export Modal Header
  exportModalHeaderNew: { paddingVertical: 16, paddingHorizontal: 16 },
  exportModalHeaderContentNew: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  exportModalHeaderLeftNew: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  exportModalHeaderIconNew: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  exportModalTitleNew: { fontSize: 16, fontWeight: '700', color: '#fff' },
  exportModalSubtitleNew: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  exportModalCloseBtnNew: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  // Export Modal Body
  exportModalBodyNew: { flex: 1, paddingHorizontal: 16, paddingVertical: 14 },

  // Compact Header Styles
  exportModalHeaderCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  exportModalHeaderCompactLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  exportModalHeaderCompactTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  exportModalCloseBtnCompact: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },

  // Export Section
  exportSectionNew: { marginBottom: 16 },
  exportSectionHeaderNew: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  exportSectionTitleNew: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 10 },

  // Export Format Grid
  exportFormatGridNew: { flexDirection: 'row', gap: 10 },
  exportFormatCardNew: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  exportFormatCardGradientNew: { paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', gap: 6 },
  exportFormatCardActiveNew: { borderColor: '#0891b2' },
  exportFormatCardTextNew: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  exportFormatCardTextActiveNew: { color: '#fff' },
  exportFormatCardSubNew: { fontSize: 10, color: '#9ca3af' },
  exportFormatCardSubActiveNew: { color: 'rgba(255,255,255,0.8)' },

  // Export Dropdown Trigger
  exportDropdownTriggerNew: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb' },
  exportDropdownTriggerActiveNew: { borderColor: '#0891b2', backgroundColor: '#f0f9fc' },
  exportDropdownLeftNew: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  exportDropdownIconNew: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  exportDropdownLabelNew: { fontSize: 10, color: '#9ca3af', fontWeight: '500' },
  exportDropdownValueNew: { fontSize: 13, fontWeight: '600', color: '#111827' },

  // Export Date Grid
  exportDateGridNew: { flexDirection: 'row', gap: 10 },
  exportDateFieldNew: { flex: 1 },
  exportDateLabelNew: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  exportDateDropdownNew: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb' },
  exportDateDropdownActiveNew: { borderColor: '#0891b2', backgroundColor: '#f0f9fc' },
  exportDateValueNew: { fontSize: 13, fontWeight: '600', color: '#111827' },

  // Export Info Box
  exportInfoBoxNew: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f0f9fc', borderRadius: 10, borderWidth: 1, borderColor: '#cffafe', marginTop: 4 },
  exportInfoTextNew: { flex: 1 },
  exportInfoTitleNew: { fontSize: 11, fontWeight: '600', color: '#0891b2' },
  exportInfoDescNew: { fontSize: 10, color: '#6b7280', marginTop: 2 },

  // Export Modal Footer
  exportModalFooterNew: { flexDirection: 'row', padding: 14, gap: 10, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  exportCancelBtnNew: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  exportCancelBtnTextNew: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  exportSubmitBtnNew: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  exportSubmitBtnDisabledNew: { opacity: 0.6 },
  exportSubmitBtnGradientNew: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11 },
  exportSubmitBtnTextNew: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // Export Dropdown Modal
  exportDropdownOverlayNew: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  exportDropdownBackdropNew: { flex: 1 },
  exportDropdownModalNew: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 20 },
  exportDropdownModalSmallNew: { maxHeight: '60%' },
  exportDropdownHeaderNew: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  exportDropdownHeaderTextNew: { fontSize: 16, fontWeight: '700', color: '#111827' },
  exportDropdownOptionNew: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  exportDropdownOptionActiveNew: { backgroundColor: '#f0f9fc' },
  exportDropdownOptionLeftNew: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  exportDropdownOptionIconNew: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  exportDropdownOptionIconActiveNew: { backgroundColor: '#0891b2' },
  exportDropdownOptionTextNew: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  exportDropdownOptionTextActiveNew: { color: '#0891b2', fontWeight: '600' },
});
