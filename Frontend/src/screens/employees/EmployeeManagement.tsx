import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar, setStatusBarBackgroundColor, setStatusBarStyle } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_CONFIG } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { apiService, Employee, EmployeeData } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import PlatformUtils from "../../utils/platformUtils";

const { width } = Dimensions.get("window");

const EmployeeManagement = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  // Tab bar visibility hook
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();
  
  // Helper function to get full profile photo URL
  const getProfilePhotoUrl = (photoPath?: string): string | null => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) return photoPath;
    if (photoPath.startsWith('file://')) return photoPath;
    const baseUrl = API_CONFIG.getApiBaseUrl();
    const cleanPath = photoPath.startsWith('/') ? photoPath.substring(1) : photoPath;
    return `${baseUrl}/${cleanPath}`;
  };
  
  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  // State management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Set status bar to match header color
  useEffect(() => {
    if (Platform.OS === "android") {
      setStatusBarBackgroundColor("#3b82f6", true);
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
    ]).start();
  }, []);

  // Fetch employees on mount - with delay to ensure token is ready on iOS
  useEffect(() => {
    // iOS fix: Add small delay to ensure token is available after navigation
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  const fetchEmployees = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    try {
      setLoading(true);
      // iOS fix: Ensure API service has fresh token before request
      await apiService.refreshTokenCache();
      
      // Debug: Test if auth header is being received by backend
      try {
        const debugResult = await apiService.debugAuthHeader();
        console.log("🔧 Auth Debug Result:", JSON.stringify(debugResult));
      } catch (debugError) {
        console.log("🔧 Auth Debug failed:", debugError);
      }
      
      const data = await apiService.getEmployees();
      console.log("📥 Fetched employees:", data.length, "employees");
      setEmployees(data);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      
      // iOS fix: Retry with delay if auth error
      if (retryCount < MAX_RETRIES && (error.message?.includes('authenticated') || error.message?.includes('401') || error.message?.includes('403'))) {
        console.log(`Retrying fetchEmployees... attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
        return fetchEmployees(retryCount + 1);
      }
      
      Alert.alert("Error", error.message || "Failed to fetch employees");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  // Helper function to get role badge color
  const getRoleBadgeColor = (role?: string) => {
    const roleColors: { [key: string]: any } = {
      'Admin': { bg: '#fee2e2', text: '#991b1b', gradient: ['#ef4444', '#dc2626'] },
      'HR': { bg: '#fce7f3', text: '#831843', gradient: ['#ec4899', '#db2777'] },
      'Manager': { bg: '#fed7aa', text: '#9a3412', gradient: ['#f97316', '#ea580c'] },
      'Team Lead': { bg: '#bfdbfe', text: '#1e40af', gradient: ['#3b82f6', '#2563eb'] },
      'TeamLead': { bg: '#bfdbfe', text: '#1e40af', gradient: ['#3b82f6', '#2563eb'] },
      'Employee': { bg: '#d1fae5', text: '#065f46', gradient: ['#10b981', '#059669'] },
    };
    return roleColors[role || 'Employee'] || roleColors['Employee'];
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; name: string } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [joiningDate, setJoiningDate] = useState(new Date());
  const [currentStep, setCurrentStep] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const steps = ['Basic Info', 'Work Details', 'Docs & Address'];
  
  // Scroll synchronization
  const scrollViewRefs = useRef<{ [key: string]: any }>({});
  const scrollTimeout = useRef<any>(null);
  const isScrolling = useRef(false);
  
  const [form, setForm] = useState<Partial<Employee>>({
    employee_id: "", name: "", email: "", department: "", designation: "",
    role: "", phone: "", address: "", pan_card: "", aadhar_card: "",
    shift_type: "Day Shift", gender: "Male", employee_type: "Full-time Employee Type", profile_photo: "",
  });

  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [exportMenuVisible, setExportMenuVisible] = useState(false);
  const [filters, setFilters] = useState({
    department: "", role: "", sortBy: "name", sortOrder: "asc",
  });

  // Synchronized scroll handler
  const handleScroll = (event: any, scrollViewId: string) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    if (isScrolling.current) return;
    isScrolling.current = true;
    try {
      if (scrollViewId === 'header') {
        Object.keys(scrollViewRefs.current).forEach((key) => {
          if (key !== 'header' && scrollViewRefs.current[key]) {
            try { scrollViewRefs.current[key]?.scrollTo({ x: offsetX, animated: false }); } catch (e) {}
          }
        });
      } else {
        if (scrollViewRefs.current['header']) {
          try { scrollViewRefs.current['header']?.scrollTo({ x: offsetX, animated: false }); } catch (e) {}
        }
      }
    } finally {
      scrollTimeout.current = setTimeout(() => { isScrolling.current = false; }, 100);
    }
  };

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setJoiningDate(selectedDate);
      setForm({ ...form, resignation_date: formatDate(selectedDate) });
    }
  };

  const resetForm = () => {
    setForm({
      employee_id: "", name: "", email: "", department: "", designation: "",
      role: "", phone: "", address: "", pan_card: "", aadhar_card: "",
      shift_type: "Day Shift", gender: "Male", employee_type: "Full-time Employee Type", profile_photo: "",
    });
    setJoiningDate(new Date());
    setValidationErrors({});
    setModalVisible(false);
    setCurrentStep(0);
  };

  const openImagePicker = async () => {
    const options = [
      {
        text: "Choose from Gallery",
        onPress: async () => {
          try {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled && result.assets.length > 0) {
              setForm({ ...form, profile_photo: result.assets[0].uri });
            }
          } catch (error) {
            console.error("Gallery Error:", error);
            Alert.alert("Error", "Failed to open gallery");
          }
        }
      },
      {
        text: "Remove Photo",
        onPress: () => {
          setForm({ ...form, profile_photo: "" });
        },
        style: "destructive"
      },
      { text: "Cancel", style: "cancel" }
    ];

    Alert.alert("Profile Photo", "Choose an option", options as any);
  };

  // Validation Functions
  const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string): boolean => /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''));
  const validatePAN = (pan: string): boolean => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
  const validateAadhar = (aadhar: string): boolean => /^\d{12}$/.test(aadhar.replace(/\s/g, ''));

  const validateField = (fieldName: string, value: string) => {
    const errors = { ...validationErrors };
    switch (fieldName) {
      case 'email':
        if (value && !validateEmail(value)) errors.email = 'Invalid email format';
        else delete errors.email;
        break;
      case 'phone':
        if (value && !validatePhone(value)) errors.phone = 'Must be 10 digits (6-9 first)';
        else delete errors.phone;
        break;
      case 'pan_card':
        if (value && !validatePAN(value)) errors.pan_card = 'Format: ABCDE1234F';
        else delete errors.pan_card;
        break;
      case 'aadhar_card':
        if (value && !validateAadhar(value)) errors.aadhar_card = 'Must be 12 digits';
        else delete errors.aadhar_card;
        break;
    }
    setValidationErrors(errors);
  };

  const handleSave = async () => {
    const errors: string[] = [];
    if (!form.employee_id?.trim()) errors.push("• Employee ID is required");
    if (!form.name?.trim()) errors.push("• Name is required");
    else if (form.name.trim().length < 2) errors.push("• Name must be at least 2 characters");
    if (!form.email?.trim()) errors.push("• Email is required");
    else if (!validateEmail(form.email)) errors.push("• Please enter a valid email address");
    if (!form.department) errors.push("• Department is required");
    if (!form.role) errors.push("• Role is required");
    if (form.phone?.trim() && !validatePhone(form.phone)) errors.push("• Phone number must be 10 digits starting with 6-9");
    if (!form.pan_card?.trim()) errors.push("• PAN Card is required");
    else if (!validatePAN(form.pan_card)) errors.push("• PAN Card format is invalid (e.g., ABCDE1234F)");
    if (!form.aadhar_card?.trim()) errors.push("• Aadhar Card is required");
    else if (!validateAadhar(form.aadhar_card)) errors.push("• Aadhar Card must be 12 digits");
    if (!form.shift_type) errors.push("• Shift Type is required");
    if (!form.employee_type) errors.push("• Employee Type is required");

    if (errors.length > 0) {
      Alert.alert("Validation Error", "Please fix the following errors:\n\n" + errors.join("\n"), [{ text: "OK" }]);
      return;
    }

    try {
      setLoading(true);
      // Normalize role: "Team Lead" -> "TeamLead" for backend compatibility
      const normalizedRole = form.role === "Team Lead" ? "TeamLead" : form.role;
      
      const employeeData: EmployeeData = {
        name: form.name!.trim(), email: form.email!.trim().toLowerCase(), employee_id: form.employee_id!.trim(),
        department: form.department || "", designation: form.designation?.trim() || "", role: normalizedRole || "",
        phone: form.phone?.replace(/\s/g, '') || "", address: form.address?.trim() || "",
        pan_card: form.pan_card!.toUpperCase().trim(), aadhar_card: form.aadhar_card!.replace(/\s/g, ''),
        shift_type: form.shift_type || "Day Shift", gender: form.gender || "Male",
        employee_type: form.employee_type || "Full-time Employee Type",
      };
      if (form.profile_photo) employeeData.profile_photo = form.profile_photo;

      if (editEmployee) {
        const userId = editEmployee.user_id?.toString() || editEmployee.id;
        await apiService.updateEmployee(userId, employeeData);
        Alert.alert("Success", "Employee updated successfully!");
        setEditEmployee(null);
      } else {
        await apiService.createEmployee(employeeData);
        Alert.alert("Success", "Employee created successfully!");
      }
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      console.error("Error saving employee:", error);
      Alert.alert("Error", error.message || "Failed to save employee");
    } finally {
      setLoading(false);
    }
  };

  const handleView = (employee: Employee) => { setViewEmployee(employee); setViewModalVisible(true); };
  const handleEdit = (employee: Employee) => {
    setEditEmployee(employee);
    // Transform "Team Lead" to "TeamLead" for backend compatibility
    const normalizedEmployee = {
      ...employee,
      role: employee.role === "Team Lead" ? "TeamLead" : employee.role
    };
    setForm(normalizedEmployee);
    if (employee.resignation_date) {
      const parts = employee.resignation_date.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        setJoiningDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
      }
    }
    setModalVisible(true);
    setCurrentStep(0);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Employee", "Are you sure you want to delete this record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await apiService.deleteEmployee(id);
            Alert.alert("Success", "Employee deleted successfully!");
            fetchEmployees();
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to delete employee");
          } finally { setLoading(false); }
        },
      },
    ]);
  };

  const handleToggleStatus = (employee: Employee) => {
    const currentStatus = employee.is_active ?? true;
    const newStatus = !currentStatus;
    const action = newStatus ? "activate" : "deactivate";
    
    Alert.alert(`${action.charAt(0).toUpperCase() + action.slice(1)} Employee`, `Are you sure you want to ${action} ${employee.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: action.charAt(0).toUpperCase() + action.slice(1),
        style: newStatus ? "default" : "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            const userId = employee.user_id?.toString() || employee.id;
            await apiService.toggleEmployeeStatus(userId, newStatus);
            Alert.alert("Success", `Employee ${action}d successfully!`);
            fetchEmployees();
          } catch (error: any) {
            Alert.alert("Error", error.message || `Failed to ${action} employee`);
          } finally { setLoading(false); }
        },
      },
    ]);
  };

  const handlePhotoPress = (photoUrl: string | null, employeeName: string) => {
    if (photoUrl) { setSelectedPhoto({ uri: photoUrl, name: employeeName }); setPhotoModalVisible(true); }
  };

  const handleBulkUpload = async () => {
    Alert.alert("Bulk Upload Employees",
      "Upload employee data from CSV, Excel, or PDF file.\n\nSupported formats:\n• CSV (.csv)\n• Excel (.xlsx, .xls)\n• PDF (.pdf)\n\nRequired columns:\n• employee_id\n• name\n• email",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Select File",
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
              if (result.canceled) return;
              const file = result.assets[0];
              const validExtensions = ['.csv', '.xlsx', '.xls', '.pdf'];
              const fileName = file.name.toLowerCase();
              const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
              if (!validExtensions.includes(fileExtension)) {
                Alert.alert("Invalid File", `Please select a CSV, Excel (.xlsx, .xls), or PDF file.`);
                return;
              }
              setLoading(true);
              let mimeType = file.mimeType || 'application/octet-stream';
              if (fileExtension === '.csv') mimeType = 'text/csv';
              else if (fileExtension === '.xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
              else if (fileExtension === '.xls') mimeType = 'application/vnd.ms-excel';
              else if (fileExtension === '.pdf') mimeType = 'application/pdf';
              
              const uploadFile = { uri: file.uri, type: mimeType, name: file.name, size: file.size };
              const uploadResponse = await apiService.bulkUploadEmployees(uploadFile);
              let message = `✅ Successfully created: ${uploadResponse.created} employees`;
              if (uploadResponse.errors > 0) {
                message += `\n❌ Errors: ${uploadResponse.errors}`;
                if (uploadResponse.error_details && uploadResponse.error_details.length > 0) {
                  message += `\n\nFirst errors:\n`;
                  uploadResponse.error_details.slice(0, 3).forEach((error: string, index: number) => { message += `${index + 1}. ${error}\n`; });
                }
              }
              Alert.alert(uploadResponse.created > 0 ? "Upload Complete" : "Upload Failed", message, [{ text: "OK", onPress: () => { if (uploadResponse.created > 0) fetchEmployees(); } }]);
            } catch (error: any) {
              Alert.alert("Upload Failed", error.message || "Failed to upload file");
            } finally { setLoading(false); }
          }
        }
      ]
    );
  };

  const getFilteredEmployees = () => {
    const currentUserRole = user?.role?.toLowerCase();
    const currentUserDepartment = user?.department;
    
    let filtered = employees.filter(emp => {
      // Role-based filtering
      // Admin: Can see all employees (HR, Manager, Team Lead, Employee)
      // HR: Can only see employees from their own department (Manager, Team Lead, Employee - not other HR or Admin)
      
      let matchesRoleAccess = true;
      const empRole = emp.role?.toLowerCase() || 'employee';
      
      if (currentUserRole === 'admin') {
        // Admin can see everyone except other admins
        matchesRoleAccess = empRole !== 'admin';
      } else if (currentUserRole === 'hr') {
        // HR can only see Manager, Team Lead, Employee from their own department
        const allowedRoles = ['manager', 'team lead', 'teamlead', 'employee'];
        const isSameDepartment = !currentUserDepartment || emp.department === currentUserDepartment;
        matchesRoleAccess = allowedRoles.includes(empRole) && isSameDepartment;
      } else if (currentUserRole === 'manager') {
        // Manager can see Team Lead and Employee from their department
        const allowedRoles = ['team lead', 'teamlead', 'employee'];
        const isSameDepartment = !currentUserDepartment || emp.department === currentUserDepartment;
        matchesRoleAccess = allowedRoles.includes(empRole) && isSameDepartment;
      } else {
        // Other roles (Team Lead, Employee) - limited or no access
        matchesRoleAccess = false;
      }
      
      // Search filter
      const matchesSearch = searchQuery.trim() === '' || 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.department?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (emp.role?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      // Department filter (from filter modal)
      const matchesDepartment = filters.department === '' || emp.department === filters.department;
      
      // Role filter (from filter modal)
      const matchesRole = filters.role === '' || emp.role === filters.role;
      
      return matchesRoleAccess && matchesSearch && matchesDepartment && matchesRole;
    });
    
    filtered.sort((a, b) => {
      let aValue: any = a[filters.sortBy as keyof Employee] || '';
      let bValue: any = b[filters.sortBy as keyof Employee] || '';
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      if (filters.sortOrder === 'asc') return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    });
    return filtered;
  };

  const resetFilters = () => { setFilters({ department: "", role: "", sortBy: "name", sortOrder: "asc" }); };
  const applyFilters = () => { setFilterModalVisible(false); };

  const handleExportAction = async (action: "csv" | "pdf" | "bulk") => {
    setExportMenuVisible(false);
    try {
      setLoading(true);
      if (action === "csv") {
        await apiService.exportEmployeesCSV();
        Alert.alert("Success", "CSV file downloaded successfully!");
      } else if (action === "pdf") {
        await apiService.exportEmployeesPDF();
        Alert.alert("Success", "PDF file downloaded successfully!");
      } else if (action === "bulk") {
        await handleBulkUpload();
      }
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Failed to export data.");
    } finally { setLoading(false); }
  };

  const validateStep = (step: number): boolean => {
    const errors: string[] = [];
    if (step === 0) {
      if (!form.employee_id?.trim()) errors.push('• Employee ID is required');
      if (!form.name?.trim()) errors.push('• Name is required');
      else if (form.name.trim().length < 2) errors.push('• Name must be at least 2 characters');
      if (!form.email?.trim()) errors.push('• Email is required');
      else if (!validateEmail(form.email)) errors.push('• Please enter a valid email address');
      if (form.phone?.trim() && !validatePhone(form.phone)) errors.push('• Phone number must be 10 digits starting with 6-9');
    } else if (step === 1) {
      if (!form.department) errors.push('• Department is required');
      if (!form.role) errors.push('• Role is required');
      if (!form.shift_type) errors.push('• Shift Type is required');
      if (!form.employee_type) errors.push('• Employee Type is required');
    } else if (step === 2) {
      if (!form.pan_card?.trim()) errors.push('• PAN Card is required');
      else if (!validatePAN(form.pan_card)) errors.push('• PAN Card format is invalid (e.g., ABCDE1234F)');
      if (!form.aadhar_card?.trim()) errors.push('• Aadhar Card is required');
      else if (!validateAadhar(form.aadhar_card)) errors.push('• Aadhar Card must be 12 digits');
    }
    if (errors.length > 0) {
      Alert.alert('Validation Error', 'Please fix the following errors:\n\n' + errors.join('\n'));
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      if (!validateStep(currentStep)) return;
      setCurrentStep(currentStep + 1);
    } else {
      handleSave();
    }
  };

  const goBack = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  // Check if current step has all required fields filled
  const isStepComplete = (): boolean => {
    if (currentStep === 0) {
      // Basic Info: employee_id, name, email are required
      return !!(
        form.employee_id?.trim() && 
        form.name?.trim() && 
        form.name.trim().length >= 2 &&
        form.email?.trim() && 
        validateEmail(form.email) &&
        (!form.phone?.trim() || validatePhone(form.phone))
      );
    } else if (currentStep === 1) {
      // Work Details: department, role, shift_type, employee_type are required
      return !!(
        form.department && 
        form.role && 
        form.shift_type && 
        form.employee_type
      );
    } else if (currentStep === 2) {
      // Documents: pan_card and aadhar_card are required
      return !!(
        form.pan_card?.trim() && 
        validatePAN(form.pan_card) &&
        form.aadhar_card?.trim() && 
        validateAadhar(form.aadhar_card)
      );
    }
    return false;
  };

  // Get missing required fields for current step
  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    if (currentStep === 0) {
      if (!form.employee_id?.trim()) missing.push('Employee ID');
      if (!form.name?.trim() || form.name.trim().length < 2) missing.push('Full Name');
      if (!form.email?.trim()) missing.push('Email');
      else if (!validateEmail(form.email)) missing.push('Valid Email');
      if (form.phone?.trim() && !validatePhone(form.phone)) missing.push('Valid Phone');
    } else if (currentStep === 1) {
      if (!form.department) missing.push('Department');
      if (!form.role) missing.push('Role');
      if (!form.shift_type) missing.push('Shift Type');
      if (!form.employee_type) missing.push('Employee Type');
    } else if (currentStep === 2) {
      if (!form.pan_card?.trim()) missing.push('PAN Card');
      else if (!validatePAN(form.pan_card)) missing.push('Valid PAN Card');
      if (!form.aadhar_card?.trim()) missing.push('Aadhar Card');
      else if (!validateAadhar(form.aadhar_card)) missing.push('Valid Aadhar Card');
    }
    return missing;
  };

  const uniqueDepartments = [...new Set(employees.map(emp => emp.department).filter(Boolean))].filter(dept => dept?.trim() !== '') as string[];
  const uniqueRoles = [...new Set(employees.map(emp => emp.role).filter(Boolean))].filter(role => role?.trim() !== '') as string[];

  // Stats calculations - based on filtered employees (role-based access)
  const filteredEmployeesList = getFilteredEmployees();
  const totalEmployees = filteredEmployeesList.length;
  const activeEmployees = filteredEmployeesList.filter(emp => emp.is_active !== false).length;
  const inactiveEmployees = filteredEmployeesList.filter(emp => emp.is_active === false).length;
  
  // Get header subtitle based on user role
  const getHeaderSubtitle = () => {
    const currentUserRole = user?.role?.toLowerCase();
    if (currentUserRole === 'admin') return 'All departments & roles';
    if (currentUserRole === 'hr') return `${user?.department || 'Your'} department`;
    if (currentUserRole === 'manager') return `${user?.department || 'Your'} team`;
    return 'Team members';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#3b82f6" }]} edges={['top']}>
      <StatusBar style="light" backgroundColor="#3b82f6" translucent={false} />
      
      {/* Modern Gradient Header */}
      <LinearGradient colors={["#3b82f6", "#1e40af"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        {/* Background Pattern */}
        <View style={styles.headerPattern}>
          <View style={[styles.patternCircle, { top: -20, right: -20, width: 120, height: 120 }]} />
          <View style={[styles.patternCircle, { bottom: -30, left: -30, width: 150, height: 150 }]} />
          <View style={[styles.patternCircle, { top: 40, right: 60, width: 80, height: 80 }]} />
        </View>

        <Animated.View style={[styles.headerContent, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
          {/* Header Top Section */}
          <View style={styles.headerTopSection}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.iconBadge}>
                <LinearGradient colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]} style={styles.iconBadgeGradient}>
                  <Ionicons name="people" size={24} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.headerTextSection}>
                <Text style={styles.headerTitle}>Employees</Text>
                <Text style={styles.headerSubtitle}>{getHeaderSubtitle()}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setFilterModalVisible(true)}>
                <Ionicons name="filter" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setExportMenuVisible(!exportMenuVisible)}>
                <Ionicons name="download-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Overview Bar */}
          <View style={styles.statsOverviewBar}>
            <View style={styles.miniStatItem}>
              <Ionicons name="people" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{totalEmployees}</Text>
              <Text style={styles.miniStatLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="checkmark-circle" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{activeEmployees}</Text>
              <Text style={styles.miniStatLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="close-circle" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{inactiveEmployees}</Text>
              <Text style={styles.miniStatLabel}>Inactive</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="business" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{uniqueDepartments.length}</Text>
              <Text style={styles.miniStatLabel}>Depts</Text>
            </View>
          </View>
        </Animated.View>

        {/* Export Menu Dropdown */}
        {exportMenuVisible && (
          <View style={styles.exportDropdown}>
            <TouchableOpacity style={styles.exportDropdownItem} onPress={() => handleExportAction("csv")}>
              <Ionicons name="document-text-outline" size={18} color="#3b82f6" />
              <Text style={styles.exportDropdownText}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportDropdownItem} onPress={() => handleExportAction("pdf")}>
              <Ionicons name="document-outline" size={18} color="#3b82f6" />
              <Text style={styles.exportDropdownText}>Export PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportDropdownItem} onPress={() => handleExportAction("bulk")}>
              <Ionicons name="cloud-upload-outline" size={18} color="#3b82f6" />
              <Text style={styles.exportDropdownText}>Bulk Upload</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Search and Add Section */}
        <Animated.View style={[styles.searchSection, { opacity: listAnim, transform: [{ translateY: listAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              placeholder="Search employees..."
              placeholderTextColor="#9ca3af"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => { setEditEmployee(null); resetForm(); setModalVisible(true); }}>
            <LinearGradient colors={["#3b82f6", "#1e40af"]} style={styles.addButtonGradient}>
              <Ionicons name="add" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Employee List */}
        {loading && employees.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Scroll Hint */}
            <View style={styles.scrollHint}>
              <Ionicons name="swap-horizontal" size={14} color="#6b7280" />
              <Text style={styles.scrollHintText}>Scroll horizontally to view all columns</Text>
            </View>
            
            <FlatList
              data={filteredEmployeesList}
              keyExtractor={(item) => item.user_id?.toString() || item.id || item.employee_id}
              onScroll={onScroll}
              scrollEventThrottle={scrollEventThrottle}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              contentContainerStyle={{ paddingBottom: tabBarVisible ? tabBarHeight + 20 : 100 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="people-outline" size={48} color="#9ca3af" />
                  </View>
                  <Text style={styles.emptyTitle}>{searchQuery.trim() !== '' ? 'No matching employees' : 'No employees yet'}</Text>
                  <Text style={styles.emptySubtitle}>Add your first team member to get started</Text>
                  <TouchableOpacity style={styles.emptyButton} onPress={() => { setEditEmployee(null); resetForm(); setModalVisible(true); }}>
                    <LinearGradient colors={["#3b82f6", "#1e40af"]} style={styles.emptyButtonGradient}>
                      <Ionicons name="add" size={20} color="#fff" />
                      <Text style={styles.emptyButtonText}>Add Employee</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              }
              ListHeaderComponent={
                <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={(ref) => { scrollViewRefs.current['header'] = ref; }} onScroll={(e) => handleScroll(e, 'header')} scrollEventThrottle={16}>
                  <View style={styles.tableHeader}>
                    <View style={[styles.tableHeaderCell, { width: 60 }]}><Text style={styles.tableHeaderText}>Photo</Text></View>
                    <View style={[styles.tableHeaderCell, { width: 100 }]}><Text style={styles.tableHeaderText}>Emp ID</Text></View>
                    <View style={[styles.tableHeaderCell, { width: 140 }]}><Text style={styles.tableHeaderText}>Name</Text></View>
                    <View style={[styles.tableHeaderCell, { width: 200 }]}><Text style={styles.tableHeaderText}>Email</Text></View>
                    <View style={[styles.tableHeaderCell, { width: 120 }]}><Text style={styles.tableHeaderText}>Department</Text></View>
                    <View style={[styles.tableHeaderCell, { width: 100 }]}><Text style={styles.tableHeaderText}>Role</Text></View>
                    <View style={[styles.tableHeaderCell, { width: 80 }]}><Text style={styles.tableHeaderText}>Status</Text></View>
                    <View style={[styles.tableHeaderCell, { width: 150 }]}><Text style={styles.tableHeaderText}>Actions</Text></View>
                  </View>
                </ScrollView>
              }

              renderItem={({ item }) => {
                const rowId = `row-${item.user_id || item.employee_id}`;
                const roleColor = getRoleBadgeColor(item.role);
                return (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={(ref) => { scrollViewRefs.current[rowId] = ref; }} onScroll={(e) => handleScroll(e, rowId)} scrollEventThrottle={16}>
                    <View style={styles.tableRow}>
                      {/* Photo */}
                      <View style={[styles.tableCell, { width: 60 }]}>
                        <TouchableOpacity onPress={() => handlePhotoPress(getProfilePhotoUrl(item.profile_photo), item.name)} activeOpacity={getProfilePhotoUrl(item.profile_photo) ? 0.7 : 1}>
                          {getProfilePhotoUrl(item.profile_photo) ? (
                            <Image source={{ uri: getProfilePhotoUrl(item.profile_photo)! }} style={styles.tableAvatar} />
                          ) : (
                            <LinearGradient colors={roleColor.gradient} style={styles.tableAvatarPlaceholder}>
                              <Text style={styles.tableAvatarText}>{item.name?.charAt(0).toUpperCase() || "?"}</Text>
                            </LinearGradient>
                          )}
                        </TouchableOpacity>
                      </View>
                      {/* Employee ID */}
                      <View style={[styles.tableCell, { width: 100 }]}>
                        <Text style={styles.tableCellTextBold} numberOfLines={1}>{item.employee_id || "N/A"}</Text>
                      </View>
                      {/* Name */}
                      <View style={[styles.tableCell, { width: 140 }]}>
                        <Text style={styles.tableCellText} numberOfLines={1}>{item.name}</Text>
                      </View>
                      {/* Email */}
                      <View style={[styles.tableCell, { width: 200 }]}>
                        <Text style={styles.tableCellTextSmall} numberOfLines={1}>{item.email}</Text>
                      </View>
                      {/* Department */}
                      <View style={[styles.tableCell, { width: 120 }]}>
                        <Text style={styles.tableCellText} numberOfLines={1}>{item.department || "N/A"}</Text>
                      </View>
                      {/* Role */}
                      <View style={[styles.tableCell, { width: 100 }]}>
                        <View style={[styles.roleBadge, { backgroundColor: roleColor.bg }]}>
                          <Text style={[styles.roleBadgeText, { color: roleColor.text }]}>{item.role || "Employee"}</Text>
                        </View>
                      </View>
                      {/* Status */}
                      <View style={[styles.tableCell, { width: 80 }]}>
                        <View style={[styles.statusBadge, { backgroundColor: item.is_active !== false ? '#d1fae5' : '#fee2e2' }]}>
                          <Text style={[styles.statusBadgeText, { color: item.is_active !== false ? '#065f46' : '#991b1b' }]}>{item.is_active !== false ? "Active" : "Inactive"}</Text>
                        </View>
                      </View>
                      {/* Actions */}
                      <View style={[styles.tableCell, { width: 150, flexDirection: 'row', gap: 6 }]}>
                        <TouchableOpacity onPress={() => handleView(item)} style={styles.actionBtn}>
                          <Ionicons name="eye-outline" size={16} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
                          <Ionicons name="create-outline" size={16} color="#f59e0b" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.user_id?.toString() || item.id)} style={styles.actionBtn}>
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleToggleStatus(item)} style={[styles.actionBtn, { backgroundColor: item.is_active !== false ? '#fee2e2' : '#d1fae5' }]}>
                          <Ionicons name={item.is_active !== false ? "close-circle-outline" : "checkmark-circle-outline"} size={16} color={item.is_active !== false ? "#991b1b" : "#065f46"} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScrollView>
                );
              }}
            />
          </View>
        )}

        {/* Add/Edit Modal - Premium Modern Design */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Compact Header */}
              <LinearGradient 
                colors={editEmployee ? ["#10b981", "#059669"] : ["#6366f1", "#8b5cf6"]} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 0 }} 
                style={styles.compactModalHeader}
              >
                <View style={styles.compactHeaderContent}>
                  <View style={styles.compactHeaderLeft}>
                    <View style={styles.compactIconBox}>
                      <Ionicons name={editEmployee ? "create" : "person-add"} size={20} color="#fff" />
                    </View>
                    <View>
                      <Text style={styles.compactModalTitle}>{editEmployee ? "Edit Employee" : "Add Employee"}</Text>
                      <Text style={styles.compactModalSubtitle}>
                        {editEmployee ? "Update information" : "Fill in the details below"}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={resetForm} style={styles.compactCloseBtn}>
                    <Ionicons name="close" size={22} color="rgba(255,255,255,0.95)" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
              
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                {/* Compact Step Progress */}
                <View style={styles.compactStepperWrapper}>
                  <View style={styles.compactProgressBar}>
                    <View style={styles.compactProgressBg}>
                      <View style={[styles.compactProgressFill, { width: `${((currentStep + 1) / steps.length) * 100}%` }]} />
                    </View>
                  </View>
                  
                  <View style={styles.compactStepIndicators}>
                    {steps.map((label, index) => {
                      const stepIcons = ['person', 'briefcase', 'document-text'];
                      const isCompleted = currentStep > index;
                      const isCurrent = currentStep === index;
                      
                      return (
                        <TouchableOpacity 
                          key={index} 
                          onPress={() => {
                            // Allow navigation to current step or completed steps
                            if (index <= currentStep) {
                              setCurrentStep(index);
                            }
                          }}
                          activeOpacity={index <= currentStep ? 0.7 : 1}
                          disabled={index > currentStep}
                          style={styles.compactStepItem}
                        >
                          <View style={[
                            styles.compactStepCircle,
                            isCompleted && styles.compactStepCompleted,
                            isCurrent && styles.compactStepActive
                          ]}>
                            {isCompleted ? (
                              <Ionicons name="checkmark" size={14} color="#fff" />
                            ) : (
                              <Ionicons 
                                name={stepIcons[index] as any} 
                                size={14} 
                                color={isCurrent ? '#6366f1' : '#9ca3af'} 
                              />
                            )}
                          </View>
                          <Text style={[
                            styles.compactStepLabel,
                            isCurrent && styles.compactStepLabelActive,
                            isCompleted && styles.compactStepLabelCompleted
                          ]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                  <View style={styles.compactFormCard}>
                    {currentStep === 0 && (
                      <>
                        {/* Compact Section Header */}
                        <View style={styles.compactSectionHeader}>
                          <View style={styles.compactSectionIcon}>
                            <Ionicons name="person" size={16} color="#6366f1" />
                          </View>
                          <Text style={styles.compactSectionTitle}>Personal Information</Text>
                        </View>

                        {/* Compact Profile Photo */}
                        <View style={styles.compactPhotoSection}>
                          <TouchableOpacity onPress={openImagePicker} style={styles.compactPhotoTouchable}>
                            {form.profile_photo ? (
                              <View style={styles.compactPhotoWrapper}>
                                <Image source={{ uri: form.profile_photo as string }} style={styles.compactPhotoPreview} />
                                <View style={styles.compactPhotoEditBadge}>
                                  <Ionicons name="camera" size={12} color="#fff" />
                                </View>
                              </View>
                            ) : (
                              <View style={styles.compactPhotoPlaceholder}>
                                <Ionicons name="camera-outline" size={24} color="#6366f1" />
                              </View>
                            )}
                          </TouchableOpacity>
                          <Text style={styles.compactPhotoHint}>Profile Photo</Text>
                        </View>

                        {/* Compact Form Fields */}
                        <View style={styles.compactFormFields}>
                          {/* Employee ID */}
                          <View style={styles.compactFieldGroup}>
                            <View style={styles.compactLabelRow}>
                              <Text style={styles.compactFieldLabel}>Employee ID</Text>
                              <Text style={styles.compactRequiredStar}>*</Text>
                            </View>
                            <View style={[styles.compactInput, focusedField === 'employee_id' && styles.compactInputFocused]}>
                              <Ionicons name="id-card-outline" size={16} color={focusedField === 'employee_id' ? '#6366f1' : '#9ca3af'} />
                              <TextInput 
                                placeholder="EMP001" 
                                placeholderTextColor="#9ca3af"
                                style={styles.compactInputField} 
                                value={form.employee_id} 
                                onFocus={() => setFocusedField('employee_id')} 
                                onBlur={() => setFocusedField(null)} 
                                onChangeText={(text) => setForm({ ...form, employee_id: text })} 
                              />
                            </View>
                          </View>

                          {/* Full Name */}
                          <View style={styles.compactFieldGroup}>
                            <View style={styles.compactLabelRow}>
                              <Text style={styles.compactFieldLabel}>Full Name</Text>
                              <Text style={styles.compactRequiredStar}>*</Text>
                            </View>
                            <View style={[styles.compactInput, focusedField === 'name' && styles.compactInputFocused]}>
                              <Ionicons name="person-outline" size={16} color={focusedField === 'name' ? '#6366f1' : '#9ca3af'} />
                              <TextInput 
                                placeholder="Enter full name" 
                                placeholderTextColor="#9ca3af"
                                style={styles.compactInputField} 
                                value={form.name} 
                                onFocus={() => setFocusedField('name')} 
                                onBlur={() => setFocusedField(null)} 
                                onChangeText={(text) => setForm({ ...form, name: text })} 
                              />
                            </View>
                          </View>

                          {/* Email */}
                          <View style={styles.compactFieldGroup}>
                            <View style={styles.compactLabelRow}>
                              <Text style={styles.compactFieldLabel}>Email Address</Text>
                              <Text style={styles.compactRequiredStar}>*</Text>
                            </View>
                            <View style={[styles.compactInput, focusedField === 'email' && styles.compactInputFocused, validationErrors.email && styles.compactInputError]}>
                              <Ionicons name="mail-outline" size={16} color={validationErrors.email ? '#ef4444' : (focusedField === 'email' ? '#6366f1' : '#9ca3af')} />
                              <TextInput 
                                placeholder="email@example.com" 
                                placeholderTextColor="#9ca3af"
                                style={styles.compactInputField} 
                                keyboardType="email-address" 
                                autoCapitalize="none" 
                                value={form.email} 
                                onFocus={() => setFocusedField('email')} 
                                onBlur={() => setFocusedField(null)} 
                                onChangeText={(text) => { setForm({ ...form, email: text }); validateField('email', text); }} 
                              />
                            </View>
                            {validationErrors.email && (
                              <View style={styles.compactErrorRow}>
                                <Ionicons name="alert-circle" size={11} color="#ef4444" />
                                <Text style={styles.compactErrorText}>{validationErrors.email}</Text>
                              </View>
                            )}
                          </View>

                          {/* Phone */}
                          <View style={styles.compactFieldGroup}>
                            <Text style={styles.compactFieldLabel}>Phone Number</Text>
                            <View style={[styles.compactPhoneInput, focusedField === 'phone' && styles.compactInputFocused, validationErrors.phone && styles.compactInputError]}>
                              <View style={styles.compactCountryCode}>
                                <Text style={styles.compactCountryFlag}>🇮🇳</Text>
                                <Text style={styles.compactCountryText}>+91</Text>
                              </View>
                              <View style={styles.compactPhoneDivider} />
                              <TextInput 
                                placeholder="9876543210" 
                                placeholderTextColor="#9ca3af"
                                style={styles.compactPhoneField} 
                                keyboardType="phone-pad" 
                                maxLength={10} 
                                value={form.phone} 
                                onFocus={() => setFocusedField('phone')} 
                                onBlur={() => setFocusedField(null)} 
                                onChangeText={(text) => { const cleaned = text.replace(/\D/g, ''); setForm({ ...form, phone: cleaned }); validateField('phone', cleaned); }} 
                              />
                            </View>
                            {validationErrors.phone && (
                              <View style={styles.compactErrorRow}>
                                <Ionicons name="alert-circle" size={11} color="#ef4444" />
                                <Text style={styles.compactErrorText}>{validationErrors.phone}</Text>
                              </View>
                            )}
                          </View>

                          {/* Gender */}
                          <View style={styles.compactFieldGroup}>
                            <Text style={styles.compactFieldLabel}>Gender</Text>
                            <View style={styles.compactGenderSelector}>
                              {[
                                { value: 'Male', icon: 'male', color: '#3b82f6' },
                                { value: 'Female', icon: 'female', color: '#ec4899' },
                                { value: 'Other', icon: 'person', color: '#8b5cf6' }
                              ].map((g) => (
                                <TouchableOpacity 
                                  key={g.value} 
                                  style={[styles.compactGenderOption, form.gender === g.value && { backgroundColor: `${g.color}15`, borderColor: g.color }]} 
                                  onPress={() => setForm({ ...form, gender: g.value })}
                                >
                                  <Ionicons name={g.icon as any} size={16} color={form.gender === g.value ? g.color : '#9ca3af'} />
                                  <Text style={[styles.compactGenderText, form.gender === g.value && { color: g.color, fontWeight: '600' }]}>{g.value}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          {/* Designation */}
                          <View style={styles.compactFieldGroup}>
                            <Text style={styles.compactFieldLabel}>Designation</Text>
                            <View style={[styles.compactInput, focusedField === 'designation' && styles.compactInputFocused]}>
                              <Ionicons name="briefcase-outline" size={16} color={focusedField === 'designation' ? '#6366f1' : '#9ca3af'} />
                              <TextInput 
                                placeholder="Senior Developer" 
                                placeholderTextColor="#9ca3af"
                                style={styles.compactInputField} 
                                value={form.designation} 
                                onFocus={() => setFocusedField('designation')} 
                                onBlur={() => setFocusedField(null)} 
                                onChangeText={(text) => setForm({ ...form, designation: text })} 
                              />
                            </View>
                          </View>
                        </View>
                      </>
                    )}

                    {currentStep === 1 && (
                      <>
                        {/* Compact Section Header - Work Details */}
                        <View style={styles.compactSectionHeader}>
                          <View style={[styles.compactSectionIcon, { backgroundColor: '#fef3c7' }]}>
                            <Ionicons name="briefcase" size={16} color="#f59e0b" />
                          </View>
                          <Text style={styles.compactSectionTitle}>Work Details</Text>
                        </View>

                        <View style={styles.compactFormFields}>
                          {/* Department */}
                          <View style={styles.compactFieldGroup}>
                            <View style={styles.compactLabelRow}>
                              <Text style={styles.compactFieldLabel}>Department</Text>
                              <Text style={styles.compactRequiredStar}>*</Text>
                            </View>
                            <View style={styles.compactPickerWrapper}>
                              <Ionicons name="business-outline" size={16} color="#6366f1" />
                              <Picker 
                                selectedValue={form.department} 
                                style={styles.compactPicker} 
                                onValueChange={(v) => setForm({ ...form, department: v })}
                                dropdownIconColor="#6366f1"
                              >
                                <Picker.Item label="Select Department" value="" />
                                <Picker.Item label="Engineering" value="Engineering" />
                                <Picker.Item label="Marketing" value="Marketing" />
                                <Picker.Item label="HR" value="Human Resources" />
                                <Picker.Item label="Finance" value="Finance" />
                                <Picker.Item label="Operations" value="Operations" />
                                <Picker.Item label="Design" value="Design" />
                              </Picker>
                            </View>
                          </View>

                          {/* Role */}
                          <View style={styles.compactFieldGroup}>
                            <View style={styles.compactLabelRow}>
                              <Text style={styles.compactFieldLabel}>Role</Text>
                              <Text style={styles.compactRequiredStar}>*</Text>
                            </View>
                            <View style={styles.compactPickerWrapper}>
                              <Ionicons name="shield-outline" size={16} color="#6366f1" />
                              <Picker 
                                selectedValue={form.role} 
                                style={styles.compactPicker} 
                                onValueChange={(v) => setForm({ ...form, role: v })}
                                dropdownIconColor="#6366f1"
                              >
                                <Picker.Item label="Select Role" value="" />
                                <Picker.Item label="Admin" value="Admin" />
                                <Picker.Item label="HR" value="HR" />
                                <Picker.Item label="Manager" value="Manager" />
                                <Picker.Item label="Team Lead" value="TeamLead" />
                                <Picker.Item label="Employee" value="Employee" />
                              </Picker>
                            </View>
                          </View>

                          {/* Shift Type */}
                          <View style={styles.compactFieldGroup}>
                            <View style={styles.compactLabelRow}>
                              <Text style={styles.compactFieldLabel}>Shift Type</Text>
                              <Text style={styles.compactRequiredStar}>*</Text>
                            </View>
                            <View style={styles.compactShiftSelector}>
                              {[
                                { value: 'Day Shift', icon: 'sunny', color: '#f59e0b' },
                                { value: 'Night Shift', icon: 'moon', color: '#6366f1' },
                                { value: 'Rotational', icon: 'sync', color: '#10b981' }
                              ].map((shift) => (
                                <TouchableOpacity 
                                  key={shift.value} 
                                  style={[styles.compactShiftOption, form.shift_type === shift.value && { backgroundColor: `${shift.color}15`, borderColor: shift.color }]} 
                                  onPress={() => setForm({ ...form, shift_type: shift.value })}
                                >
                                  <Ionicons name={shift.icon as any} size={14} color={form.shift_type === shift.value ? shift.color : '#9ca3af'} />
                                  <Text style={[styles.compactShiftText, form.shift_type === shift.value && { color: shift.color, fontWeight: '600' }]}>
                                    {shift.value.replace(' Shift', '')}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          {/* Employee Type */}
                          <View style={styles.compactFieldGroup}>
                            <View style={styles.compactLabelRow}>
                              <Text style={styles.compactFieldLabel}>Employee Type</Text>
                              <Text style={styles.compactRequiredStar}>*</Text>
                            </View>
                            <View style={styles.compactPickerWrapper}>
                              <Ionicons name="people-outline" size={16} color="#6366f1" />
                              <Picker 
                                selectedValue={form.employee_type} 
                                style={styles.compactPicker} 
                                onValueChange={(v) => setForm({ ...form, employee_type: v })}
                                dropdownIconColor="#6366f1"
                              >
                                <Picker.Item label="Full-time" value="Full-time Employee Type" />
                                <Picker.Item label="Part-time" value="Part-time Employee Type" />
                                <Picker.Item label="Contract" value="Contract Employee Type" />
                                <Picker.Item label="Intern" value="Intern Employee Type" />
                              </Picker>
                            </View>
                          </View>

                          {/* Joining Date */}
                          {!editEmployee && (
                            <View style={styles.compactFieldGroup}>
                              <Text style={styles.compactFieldLabel}>Joining Date</Text>
                              <TouchableOpacity style={styles.compactDatePicker} onPress={() => setShowDatePicker(true)}>
                                <Ionicons name="calendar" size={16} color="#6366f1" />
                                <Text style={styles.compactDateText}>{form.resignation_date || formatDate(joiningDate)}</Text>
                                <Ionicons name="chevron-down" size={16} color="#9ca3af" />
                              </TouchableOpacity>
                              {showDatePicker && (
                                <View style={styles.compactDatePickerContainer}>
                                  <DateTimePicker 
                                    value={joiningDate} 
                                    mode="date" 
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
                                    onChange={handleDateChange} 
                                    maximumDate={new Date()} 
                                  />
                                  {Platform.OS === 'ios' && (
                                    <TouchableOpacity style={styles.datePickerDoneBtn} onPress={() => setShowDatePicker(false)}>
                                      <Text style={styles.datePickerDoneText}>Done</Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              )}
                            </View>
                          )}
                          {editEmployee && (
                            <View style={styles.dateFieldContainer}>
                              <Text style={styles.fieldLabel}>Resignation Date (Optional)</Text>
                              <TouchableOpacity style={styles.modernDatePicker} onPress={() => setShowDatePicker(true)}>
                                <View style={styles.dateIconBox}>
                                  <Ionicons name="calendar" size={18} color="#ef4444" />
                                </View>
                                <Text style={[styles.dateText, !form.resignation_date && { color: '#9ca3af' }]}>
                                  {form.resignation_date || 'Not Set'}
                                </Text>
                                <View style={styles.dateChevron}>
                                  <Ionicons name="chevron-down" size={18} color="#9ca3af" />
                                </View>
                              </TouchableOpacity>
                              {showDatePicker && (
                                <DateTimePicker 
                                  value={joiningDate} 
                                  mode="date" 
                                  display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
                                  onChange={handleDateChange} 
                                  minimumDate={new Date()} 
                                />
                              )}
                            </View>
                          )}
                        </View>
                      </>
                    )}

                    {currentStep === 2 && (
                      <>
                        {/* Compact Section Header - Documents */}
                        <View style={styles.compactSectionHeader}>
                          <View style={[styles.compactSectionIcon, { backgroundColor: '#d1fae5' }]}>
                            <Ionicons name="document-text" size={16} color="#10b981" />
                          </View>
                          <Text style={styles.compactSectionTitle}>Documents & Address</Text>
                        </View>

                        <View style={styles.compactFormFields}>
                          {/* PAN Card */}
                          <View style={styles.compactFieldGroup}>
                            <View style={styles.compactLabelRow}>
                              <Ionicons name="card" size={14} color="#f59e0b" />
                              <Text style={styles.compactFieldLabel}>PAN Card</Text>
                              <Text style={styles.compactRequiredStar}>*</Text>
                            </View>
                            <View style={[styles.compactInput, focusedField === 'pan_card' && styles.compactInputFocused, validationErrors.pan_card && styles.compactInputError]}>
                              <TextInput 
                                placeholder="ABCDE1234F" 
                                placeholderTextColor="#9ca3af"
                                style={styles.compactInputField} 
                                autoCapitalize="characters" 
                                maxLength={10} 
                                value={form.pan_card} 
                                onFocus={() => setFocusedField('pan_card')} 
                                onBlur={() => setFocusedField(null)} 
                                onChangeText={(text) => { 
                                  const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, ''); 
                                  setForm({ ...form, pan_card: cleaned }); 
                                  validateField('pan_card', cleaned); 
                                }} 
                              />
                            </View>
                            {validationErrors.pan_card && (
                              <View style={styles.compactErrorRow}>
                                <Ionicons name="alert-circle" size={11} color="#ef4444" />
                                <Text style={styles.compactErrorText}>{validationErrors.pan_card}</Text>
                              </View>
                            )}
                          </View>

                          {/* Aadhar Card */}
                          <View style={styles.compactFieldGroup}>
                            <View style={styles.compactLabelRow}>
                              <Ionicons name="finger-print" size={14} color="#3b82f6" />
                              <Text style={styles.compactFieldLabel}>Aadhar Card</Text>
                              <Text style={styles.compactRequiredStar}>*</Text>
                            </View>
                            <View style={[styles.compactInput, focusedField === 'aadhar_card' && styles.compactInputFocused, validationErrors.aadhar_card && styles.compactInputError]}>
                              <TextInput 
                                placeholder="123456789012" 
                                placeholderTextColor="#9ca3af"
                                style={styles.compactInputField} 
                                keyboardType="number-pad" 
                                maxLength={12} 
                                value={form.aadhar_card} 
                                onFocus={() => setFocusedField('aadhar_card')} 
                                onBlur={() => setFocusedField(null)} 
                                onChangeText={(text) => { 
                                  const cleaned = text.replace(/\D/g, ''); 
                                  setForm({ ...form, aadhar_card: cleaned }); 
                                  validateField('aadhar_card', cleaned); 
                                }} 
                              />
                            </View>
                            {validationErrors.aadhar_card && (
                              <View style={styles.compactErrorRow}>
                                <Ionicons name="alert-circle" size={11} color="#ef4444" />
                                <Text style={styles.compactErrorText}>{validationErrors.aadhar_card}</Text>
                              </View>
                            )}
                          </View>

                          {/* Address */}
                          <View style={styles.compactFieldGroup}>
                            <View style={styles.compactLabelRow}>
                              <Ionicons name="location" size={14} color="#8b5cf6" />
                              <Text style={styles.compactFieldLabel}>Address</Text>
                            </View>
                            <View style={[styles.compactTextArea, focusedField === 'address' && styles.compactInputFocused]}>
                              <TextInput 
                                placeholder="Enter complete address" 
                                placeholderTextColor="#9ca3af"
                                style={styles.compactTextAreaField} 
                                multiline 
                                numberOfLines={3} 
                                textAlignVertical="top"
                                value={form.address} 
                                onFocus={() => setFocusedField('address')} 
                                onBlur={() => setFocusedField(null)} 
                                onChangeText={(text) => setForm({ ...form, address: text })} 
                              />
                            </View>
                          </View>

                        </View>
                      </>
                    )}

                  </View>
                </ScrollView>

                {/* Ready to Submit Card - Show when all fields are complete */}
                {currentStep === 2 && isStepComplete() && (
                  <View style={styles.readyToSubmitCard}>
                    <View style={styles.readyToSubmitHeader}>
                      <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                      <Text style={styles.readyToSubmitTitle}>Ready to Submit</Text>
                    </View>
                    <Text style={styles.readyToSubmitText}>
                      Review all details before creating the employee profile. You can edit this information later.
                    </Text>
                  </View>
                )}

                {/* Premium Bottom Action Bar */}
                <View style={styles.premiumActionsBar}>
                  <View style={styles.premiumActionsInner}>
                    {/* Back/Cancel Button */}
                    <TouchableOpacity 
                      style={styles.premiumBackBtn} 
                      onPress={currentStep === 0 ? resetForm : goBack}
                      activeOpacity={0.8}
                    >
                      <View style={styles.premiumBackBtnInner}>
                        <Ionicons 
                          name={currentStep === 0 ? "close" : "arrow-back"} 
                          size={20} 
                          color="#6b7280" 
                        />
                        <Text style={styles.premiumBackBtnText}>
                          {currentStep === 0 ? 'Cancel' : 'Back'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Next/Submit Button */}
                    <TouchableOpacity 
                      style={[styles.premiumNextBtn, !isStepComplete() && styles.premiumNextBtnDisabled]} 
                      onPress={goNext}
                      activeOpacity={0.9}
                      disabled={!isStepComplete()}
                    >
                      <LinearGradient 
                        colors={!isStepComplete() 
                          ? ["#d1d5db", "#9ca3af"] 
                          : currentStep < steps.length - 1 
                            ? ["#6366f1", "#8b5cf6"] 
                            : ["#10b981", "#059669"]
                        } 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 0 }}
                        style={styles.premiumNextBtnGradient}
                      >
                        <Text style={[styles.premiumNextBtnText, !isStepComplete() && styles.premiumNextBtnTextDisabled]}>
                          {currentStep < steps.length - 1 ? 'Continue' : (editEmployee ? 'Update Employee' : 'Create Employee')}
                        </Text>
                        <View style={styles.premiumNextBtnIcon}>
                          <Ionicons 
                            name={currentStep < steps.length - 1 ? "arrow-forward" : (editEmployee ? "checkmark-circle" : "person-add")} 
                            size={20} 
                            color={!isStepComplete() ? "#9ca3af" : "#fff"} 
                          />
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {/* Validation Hint */}
                  {!isStepComplete() && (
                    <View style={styles.validationHint}>
                      <Ionicons name="information-circle" size={14} color="#f59e0b" />
                      <Text style={styles.validationHintText}>
                        Required: {getMissingFields().join(', ')}
                      </Text>
                    </View>
                  )}
                  
                  {/* Progress Indicator */}
                  <View style={styles.premiumActionsProgress}>
                    {steps.map((_, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.premiumProgressDot,
                          index <= currentStep && styles.premiumProgressDotActive
                        ]} 
                      />
                    ))}
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </View>
        </Modal>

        {/* Filter Modal */}
        <Modal visible={filterModalVisible} animationType="slide" transparent>
          <View style={styles.filterModalOverlay}>
            <View style={styles.filterModalContainer}>
              <LinearGradient colors={["#3b82f6", "#1e40af"]} style={styles.filterModalHeader}>
                <View style={styles.filterHeaderContent}>
                  <Ionicons name="funnel" size={24} color="#fff" />
                  <View style={styles.filterHeaderText}>
                    <Text style={styles.filterModalTitle}>Filter & Sort</Text>
                    <Text style={styles.filterModalSubtitle}>Customize your view</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.filterCloseBtn}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
                {/* Department Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Department</Text>
                  <View style={styles.filterChips}>
                    <TouchableOpacity style={[styles.filterChip, filters.department === '' && styles.filterChipActive]} onPress={() => setFilters({...filters, department: ''})}>
                      <Text style={[styles.filterChipText, filters.department === '' && styles.filterChipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {uniqueDepartments.map((dept, i) => (
                      <TouchableOpacity key={`dept-${i}`} style={[styles.filterChip, filters.department === dept && styles.filterChipActive]} onPress={() => setFilters({...filters, department: dept})}>
                        <Text style={[styles.filterChipText, filters.department === dept && styles.filterChipTextActive]}>{dept}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Role Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Role</Text>
                  <View style={styles.filterChips}>
                    <TouchableOpacity style={[styles.filterChip, filters.role === '' && styles.filterChipActive]} onPress={() => setFilters({...filters, role: ''})}>
                      <Text style={[styles.filterChipText, filters.role === '' && styles.filterChipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {uniqueRoles.map((role, i) => (
                      <TouchableOpacity key={`role-${i}`} style={[styles.filterChip, filters.role === role && styles.filterChipActive]} onPress={() => setFilters({...filters, role: role})}>
                        <Text style={[styles.filterChipText, filters.role === role && styles.filterChipTextActive]}>{role}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Sort Options */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Sort By</Text>
                  <View style={styles.sortOptions}>
                    {[{ key: 'name', label: 'Name', icon: 'person-outline' }, { key: 'department', label: 'Department', icon: 'business-outline' }, { key: 'role', label: 'Role', icon: 'briefcase-outline' }].map((opt) => (
                      <TouchableOpacity key={opt.key} style={[styles.sortOption, filters.sortBy === opt.key && styles.sortOptionActive]} onPress={() => setFilters({...filters, sortBy: opt.key})}>
                        <Ionicons name={opt.icon as any} size={18} color={filters.sortBy === opt.key ? '#3b82f6' : '#6b7280'} />
                        <Text style={[styles.sortOptionText, filters.sortBy === opt.key && styles.sortOptionTextActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Sort Order */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Order</Text>
                  <View style={styles.sortOrderRow}>
                    <TouchableOpacity style={[styles.sortOrderBtn, filters.sortOrder === 'asc' && styles.sortOrderBtnActive]} onPress={() => setFilters({...filters, sortOrder: 'asc'})}>
                      <Ionicons name="arrow-up" size={18} color={filters.sortOrder === 'asc' ? '#fff' : '#6b7280'} />
                      <Text style={[styles.sortOrderText, filters.sortOrder === 'asc' && styles.sortOrderTextActive]}>Ascending</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.sortOrderBtn, filters.sortOrder === 'desc' && styles.sortOrderBtnActive]} onPress={() => setFilters({...filters, sortOrder: 'desc'})}>
                      <Ionicons name="arrow-down" size={18} color={filters.sortOrder === 'desc' ? '#fff' : '#6b7280'} />
                      <Text style={[styles.sortOrderText, filters.sortOrder === 'desc' && styles.sortOrderTextActive]}>Descending</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.filterActions}>
                <TouchableOpacity style={styles.resetFilterBtn} onPress={resetFilters}>
                  <Ionicons name="refresh" size={18} color="#6b7280" />
                  <Text style={styles.resetFilterText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyFilterBtn} onPress={applyFilters}>
                  <LinearGradient colors={["#3b82f6", "#1e40af"]} style={styles.applyFilterGradient}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.applyFilterText}>Apply</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* View Employee Modal */}
        <Modal visible={viewModalVisible} animationType="fade" transparent>
          <View style={styles.viewModalOverlay}>
            <View style={styles.viewModalContainer}>
              <LinearGradient colors={["#3b82f6", "#1e40af"]} style={styles.viewModalHeader}>
                <TouchableOpacity onPress={() => setViewModalVisible(false)} style={styles.viewModalCloseBtn}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView style={styles.viewModalContent} showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <View style={styles.viewProfileSection}>
                  {viewEmployee?.profile_photo ? (
                    <Image source={{ uri: getProfilePhotoUrl(viewEmployee.profile_photo)! }} style={styles.viewProfilePhoto} />
                  ) : (
                    <LinearGradient colors={getRoleBadgeColor(viewEmployee?.role).gradient} style={styles.viewProfilePhotoPlaceholder}>
                      <Text style={styles.viewProfilePhotoText}>{viewEmployee?.name?.charAt(0).toUpperCase() || "?"}</Text>
                    </LinearGradient>
                  )}
                  <Text style={styles.viewProfileName}>{viewEmployee?.name}</Text>
                  <Text style={styles.viewProfileDesignation}>{viewEmployee?.designation || viewEmployee?.role || "Employee"}</Text>
                  <View style={[styles.viewStatusBadge, { backgroundColor: viewEmployee?.is_active !== false ? '#d1fae5' : '#fee2e2' }]}>
                    <Text style={[styles.viewStatusText, { color: viewEmployee?.is_active !== false ? '#065f46' : '#991b1b' }]}>{viewEmployee?.is_active !== false ? "Active" : "Inactive"}</Text>
                  </View>
                </View>

                {/* Details Section */}
                <View style={styles.viewDetailsSection}>
                  {[
                    { label: 'Employee ID', value: viewEmployee?.employee_id, icon: 'id-card-outline' },
                    { label: 'Email', value: viewEmployee?.email, icon: 'mail-outline' },
                    { label: 'Phone', value: viewEmployee?.phone || '-', icon: 'call-outline' },
                    { label: 'Department', value: viewEmployee?.department || '-', icon: 'business-outline' },
                    { label: 'Role', value: viewEmployee?.role || 'Employee', icon: 'briefcase-outline' },
                    { label: 'Gender', value: viewEmployee?.gender || '-', icon: 'person-outline' },
                    { label: 'Employee Type', value: viewEmployee?.employee_type || '-', icon: 'people-outline' },
                    { label: 'Shift', value: viewEmployee?.shift_type || '-', icon: 'time-outline' },
                    { label: 'PAN Card', value: viewEmployee?.pan_card || '-', icon: 'card-outline' },
                    { label: 'Aadhar Card', value: viewEmployee?.aadhar_card || '-', icon: 'document-outline' },
                  ].map((item, i) => (
                    <View key={i} style={styles.viewDetailRow}>
                      <View style={styles.viewDetailIcon}>
                        <Ionicons name={item.icon as any} size={18} color="#3b82f6" />
                      </View>
                      <View style={styles.viewDetailContent}>
                        <Text style={styles.viewDetailLabel}>{item.label}</Text>
                        <Text style={styles.viewDetailValue}>{item.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Photo Modal */}
        <Modal visible={photoModalVisible} transparent animationType="fade" onRequestClose={() => setPhotoModalVisible(false)}>
          <TouchableOpacity style={styles.photoModalOverlay} activeOpacity={1} onPress={() => setPhotoModalVisible(false)}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>{selectedPhoto?.name}</Text>
              <TouchableOpacity onPress={() => setPhotoModalVisible(false)}>
                <Ionicons name="close-circle" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.photoModalContent}>
              {selectedPhoto?.uri ? (
                <Image source={{ uri: selectedPhoto.uri }} style={styles.photoModalImage} resizeMode="contain" />
              ) : (
                <View style={styles.photoModalPlaceholder}>
                  <Ionicons name="image-outline" size={80} color="#fff" />
                  <Text style={styles.photoModalPlaceholderText}>No photo available</Text>
                </View>
              )}
            </View>
            <Text style={styles.photoModalHint}>Tap anywhere to close</Text>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default EmployeeManagement;


const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header Styles
  headerGradient: {
    paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    position: "relative", overflow: "hidden",
  },
  headerPattern: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  patternCircle: { position: "absolute", borderRadius: 9999, backgroundColor: "rgba(255, 255, 255, 0.08)" },
  headerContent: { paddingHorizontal: 20, position: "relative", zIndex: 1 },
  headerTopSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  iconBadge: { marginRight: 12 },
  iconBadgeGradient: {
    width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.2)",
  },
  headerTextSection: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2, fontWeight: "500" },
  headerRight: { flexDirection: "row", gap: 8 },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  // Stats Bar
  statsOverviewBar: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14,
    padding: 12, justifyContent: "space-around", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  miniStatItem: { alignItems: "center", flex: 1 },
  miniStatValue: { fontSize: 16, fontWeight: "800", color: "#fff", marginTop: 4, letterSpacing: 0.3 },
  miniStatLabel: { fontSize: 9, color: "rgba(255,255,255,0.75)", marginTop: 2, fontWeight: "600", textTransform: "uppercase" },
  statDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.2)" },
  // Export Dropdown
  exportDropdown: {
    position: "absolute", top: 70, right: 20, backgroundColor: "#fff", borderRadius: 12,
    padding: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15,
    shadowRadius: 12, elevation: 8, zIndex: 100, minWidth: 160,
  },
  exportDropdownItem: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10, borderRadius: 8 },
  exportDropdownText: { fontSize: 14, fontWeight: "600", color: "#1f2937" },

  // Content Container
  contentContainer: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  // Search Section
  searchSection: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10 },
  searchContainer: {
    flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14,
    paddingHorizontal: 14, height: 50, borderWidth: 1, borderColor: "#e5e7eb",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: "#1f2937" },
  addButton: { borderRadius: 14, overflow: "hidden" },
  addButtonGradient: { width: 50, height: 50, justifyContent: "center", alignItems: "center" },
  // Scroll Hint
  scrollHint: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8,
    backgroundColor: "#eff6ff", borderRadius: 8, marginBottom: 8, gap: 6,
  },
  scrollHintText: { fontSize: 12, color: "#6b7280", fontStyle: "italic" },
  // Table Styles
  tableHeader: {
    flexDirection: "row", backgroundColor: "#fff", paddingVertical: 12, paddingHorizontal: 12,
    borderBottomWidth: 2, borderBottomColor: "#e5e7eb", minWidth: 950,
  },
  tableHeaderCell: { justifyContent: "center", paddingHorizontal: 6 },
  tableHeaderText: { fontSize: 11, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: {
    flexDirection: "row", backgroundColor: "#fff", paddingVertical: 12, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6", alignItems: "center", minHeight: 60, minWidth: 950,
  },
  tableCell: { justifyContent: "center", paddingHorizontal: 6 },
  tableCellText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  tableCellTextBold: { fontSize: 13, color: "#3b82f6", fontWeight: "700" },
  tableCellTextSmall: { fontSize: 12, color: "#6b7280" },
  tableAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#e5e7eb" },
  tableAvatarPlaceholder: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  tableAvatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: "#f3f4f6",
    justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb",
  },

  // Empty State
  emptyContainer: { alignItems: "center", justifyContent: "center", padding: 40, marginTop: 40 },
  emptyIconContainer: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: "#f3f4f6",
    justifyContent: "center", alignItems: "center", marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#6b7280", marginBottom: 24, textAlign: "center" },
  emptyButton: { borderRadius: 12, overflow: "hidden" },
  emptyButtonGradient: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 24, gap: 8 },
  emptyButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  // Loading
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6b7280", fontWeight: "500" },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-start", alignItems: 'center', paddingVertical: 24, paddingHorizontal: 12 },
  modalContainer: { flex: 1, width: '100%', marginVertical: 8, backgroundColor: "#fff", borderRadius: 24, maxHeight: "95%", overflow: 'hidden' },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalHeader: {
    paddingHorizontal: 20, paddingVertical: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    position: 'relative', overflow: 'hidden',
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  modalContent: { padding: 20 },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepActive: { borderColor: '#667eea', backgroundColor: '#f5f3ff' },
  stepNumber: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  stepNumberActive: { color: '#667eea' },
  stepLabel: { fontSize: 10, color: '#9ca3af', marginTop: 8, fontWeight: '600', textAlign: 'center' },
  stepLabelActive: { color: '#667eea', fontWeight: '700' },
  stepLine: { position: 'absolute', top: 14, left: '50%', right: -10, height: 2, backgroundColor: '#e5e7eb' },
  stepLineActive: { backgroundColor: '#667eea' },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  formSectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  formSectionTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  formSectionHint: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  fieldRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  halfField: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#4b5563', marginBottom: 6 },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 14,
    color: '#1f2937',
  },
  inputFocused: { borderColor: '#3b82f6', backgroundColor: '#eef2ff' },
  inputWithIcon: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 10, top: 12 },
  inputWithIconField: { paddingLeft: 36 },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  phoneInputContainerFocused: { borderColor: '#3b82f6', backgroundColor: '#eef2ff' },
  countryCode: { paddingHorizontal: 10, paddingVertical: 10, borderRightWidth: 1, borderColor: '#d1d5db' },
  countryCodeText: { fontSize: 14, fontWeight: '600' },
  phoneInput: { flex: 1, paddingHorizontal: 10, fontSize: 14, color: '#1f2937' },
  radioGroup: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#cbd5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: { borderColor: '#3b82f6', backgroundColor: '#3b82f6' },
  radioText: { fontSize: 12, color: '#4b5563', fontWeight: '600' },
  inputError: { borderColor: '#ef4444' },
  errorText: { fontSize: 11, color: '#ef4444', marginTop: 4 },
  finderSplit: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 14 },
  pickerContainer: { borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', overflow: 'hidden' },
  picker: { height: 44, width: '100%' },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  datePickerText: { fontSize: 14, color: '#1f2937', flex: 1, marginLeft: 10 },
  datePickerDoneBtn: { marginTop: 8, alignItems: 'flex-end' },
  datePickerDoneText: { color: '#2563eb', fontWeight: '600' },
  fieldContainer: { marginTop: 12 },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#6b7280' },
  saveBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  saveBtnGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  filterModalContainer: { width: '100%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', maxHeight: '85%' },
  filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  filterHeaderContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterHeaderText: { flex: 1 },
  filterModalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  filterModalSubtitle: { fontSize: 12, color: '#e0e7ff' },
  filterCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  filterContent: { padding: 20 },
  filterSection: { marginBottom: 16 },
  filterSectionTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937', marginBottom: 6 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f8fafc' },
  filterChipActive: { borderColor: '#3b82f6', backgroundColor: '#e0e7ff' },
  filterChipText: { fontSize: 12, color: '#1f2937' },
  filterChipTextActive: { color: '#1d4ed8', fontWeight: '700' },
  sortOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', gap: 6 },
  sortOptionActive: { borderColor: '#3b82f6', backgroundColor: '#e0e7ff' },
  sortOptionText: { fontSize: 12, color: '#4b5563' },
  sortOptionTextActive: { color: '#1d4ed8', fontWeight: '700' },
  sortOrderRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  sortOrderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  sortOrderBtnActive: { borderColor: '#3b82f6', backgroundColor: '#e0e7ff' },
  sortOrderText: { fontSize: 12, color: '#4b5563' },
  sortOrderTextActive: { color: '#1d4ed8', fontWeight: '700' },
  filterActions: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16, gap: 12 },
  resetFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resetFilterText: { fontSize: 12, color: '#1f2937' },
  applyFilterBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  applyFilterGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  applyFilterText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  rowSplit: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  spacingReference: {
    height: 16,
  },
  // Image Picker
  imagePicker: {
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  imagePickerPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 96,
  },
  imagePreview: { width: 96, height: 96, borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  imagePickerText: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  // Photo Modal
  photoModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  photoModalHeader: { position: "absolute", top: 50, left: 20, right: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", zIndex: 10 },
  photoModalTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  photoModalContent: { width: "100%", height: "70%", justifyContent: "center", alignItems: "center" },
  photoModalImage: { width: "90%", height: "100%", borderRadius: 12 },
  photoModalPlaceholder: { justifyContent: "center", alignItems: "center" },
  photoModalPlaceholderText: { color: "#fff", fontSize: 16, marginTop: 16, opacity: 0.7 },
  photoModalHint: { position: "absolute", bottom: 50, color: "#fff", fontSize: 14, opacity: 0.7 },
  // View Modal
  viewModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  viewModalContainer: { backgroundColor: "#fff", borderRadius: 24, width: "100%", maxWidth: 400, maxHeight: "85%", overflow: "hidden" },
  viewModalHeader: { height: 80, justifyContent: "flex-end", alignItems: "flex-end", padding: 16 },
  viewModalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  viewModalContent: { padding: 20 },
  viewProfileSection: { alignItems: "center", marginTop: -50, marginBottom: 24 },
  viewProfilePhoto: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: "#fff", backgroundColor: "#e5e7eb" },
  viewProfilePhotoPlaceholder: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", borderWidth: 4, borderColor: "#fff" },
  viewProfilePhotoText: { fontSize: 36, fontWeight: "800", color: "#fff" },
  viewProfileName: { fontSize: 22, fontWeight: "800", color: "#1f2937", marginTop: 12 },
  viewProfileDesignation: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  viewStatusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  viewStatusText: { fontSize: 13, fontWeight: "700" },
  viewDetailsSection: { gap: 12 },
  viewDetailRow: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#f9fafb", borderRadius: 12 },
  viewDetailIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center", marginRight: 12 },
  viewDetailContent: { flex: 1 },
  viewDetailLabel: { fontSize: 12, color: "#6b7280", marginBottom: 2 },
  viewDetailValue: { fontSize: 14, fontWeight: "600", color: "#1f2937" },

  // ============ MODERN MODAL STYLES ============
  // Modal Header Enhanced
  modalHeaderPattern: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalPatternCircle: { position: 'absolute', borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.1)' },
  modalHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalIconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  modalSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Stepper Enhanced
  stepperWrapper: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  stepperProgressBg: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 16 },
  stepperProgressFill: { height: '100%', backgroundColor: '#667eea', borderRadius: 2 },
  stepCompleted: { backgroundColor: '#10b981', borderColor: '#10b981' },

  // Section Header Enhanced
  sectionIconBadge: { marginRight: 12 },
  sectionIconGradient: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionHeaderText: { flex: 1 },

  // Photo Picker Enhanced
  photoPickerSection: { alignItems: 'center', marginVertical: 20 },
  photoPickerTouchable: { alignItems: 'center' },
  photoPreviewWrapper: { position: 'relative' },
  photoPreview: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#667eea' },
  photoEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#667eea', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden' },
  photoPlaceholderGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 50, borderStyle: 'dashed' },
  photoPlaceholderText: { fontSize: 11, color: '#9ca3af', marginTop: 4, fontWeight: '600' },
  photoHint: { fontSize: 11, color: '#9ca3af', marginTop: 8 },

  // Form Fields Enhanced
  formFieldsContainer: { marginTop: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  requiredStar: { color: '#ef4444', fontSize: 14, marginLeft: 2, fontWeight: '700' },

  // Modern Input
  modernInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', overflow: 'hidden' },
  modernInputFocused: { borderColor: '#667eea', backgroundColor: '#faf5ff' },
  modernInputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  inputIconBox: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(102,126,234,0.05)' },
  modernInputField: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1f2937' },

  // Phone Input Enhanced
  phoneInputModern: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', overflow: 'hidden' },
  phoneInputModernFocused: { borderColor: '#667eea', backgroundColor: '#faf5ff' },
  countryCodeModern: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6 },
  countryFlag: { fontSize: 18 },
  phoneDivider: { width: 1, height: 24, backgroundColor: '#e5e7eb' },
  phoneInputField: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1f2937' },

  // Error Row
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },

  // Gender Selector
  genderSelector: { flexDirection: 'row', gap: 8 },
  genderOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  genderText: { fontSize: 12, color: '#6b7280' },

  // Modern Picker
  modernPickerWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', overflow: 'hidden' },
  pickerIconBox: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(102,126,234,0.05)' },
  modernPicker: { flex: 1, height: 44 },

  // Shift Selector
  shiftSelector: { flexDirection: 'row', gap: 6 },
  shiftOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  shiftText: { fontSize: 11, color: '#6b7280' },

  // Date Picker Enhanced
  dateFieldContainer: { marginTop: 16 },
  modernDatePicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', overflow: 'hidden' },
  dateIconBox: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(102,126,234,0.05)' },
  dateText: { flex: 1, paddingHorizontal: 12, fontSize: 14, color: '#1f2937' },
  dateChevron: { paddingRight: 12 },
  datePickerContainer: { marginTop: 8, backgroundColor: '#f9fafb', borderRadius: 12, padding: 8 },

  // Document Cards
  documentCardsRow: { flexDirection: 'row', gap: 12 },
  documentCard: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  documentCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  documentIconBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  documentCardTitle: { fontSize: 13, fontWeight: '600', color: '#374151' },
  documentInput: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', overflow: 'hidden' },
  documentInputFocused: { borderColor: '#667eea' },
  documentInputError: { borderColor: '#ef4444' },
  documentInputField: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1f2937', textAlign: 'center', fontWeight: '600', letterSpacing: 1 },
  documentHint: { fontSize: 10, color: '#9ca3af', marginTop: 6, textAlign: 'center' },

  // Address Field
  addressFieldContainer: { marginTop: 16 },
  addressHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  addressInputWrapper: { backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', overflow: 'hidden' },
  addressInputFocused: { borderColor: '#667eea', backgroundColor: '#faf5ff' },
  addressInput: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1f2937', minHeight: 100 },

  // Ready to Submit Card
  readyToSubmitCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
  },
  readyToSubmitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  readyToSubmitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065f46',
  },
  readyToSubmitText: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 18,
    fontWeight: '500',
  },

  // Modal Actions Bar
  modalActionsBar: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: Platform.OS === 'ios' ? 24 : 16 },
  modalActionsInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#f3f4f6' },
  backActionText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  nextActionBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  nextActionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  nextActionText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // ============ PREMIUM MODAL STYLES ============
  premiumModalHeader: {
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  premiumHeaderContent: {
    position: 'relative',
    zIndex: 1,
  },
  premiumHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  premiumCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  premiumHeaderMain: {
    alignItems: 'center',
  },
  premiumIconContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  premiumIconInner: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  premiumIconRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
  },
  premiumModalTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  premiumModalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },

  // Premium Stepper Styles
  premiumStepperWrapper: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  premiumProgressContainer: {
    marginBottom: 20,
  },
  premiumProgressBg: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  premiumProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  premiumProgressText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 8,
  },
  premiumStepperContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  premiumStepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  premiumStepConnector: {
    position: 'absolute',
    top: 20,
    left: -50,
    width: 100,
    height: 3,
    backgroundColor: '#e5e7eb',
    zIndex: -1,
  },
  premiumStepCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumStepLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Premium Form Card
  premiumFormCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },

  // Premium Section Header
  premiumSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  premiumSectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  premiumSectionText: {
    flex: 1,
  },
  premiumSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
    letterSpacing: 0.3,
  },
  premiumSectionHint: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  premiumSectionBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  premiumSectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Premium Photo Section
  premiumPhotoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  premiumPhotoTouchable: {
    alignItems: 'center',
  },
  premiumPhotoWrapper: {
    position: 'relative',
  },
  premiumPhotoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#e0e7ff',
  },
  premiumPhotoEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  premiumPhotoPlaceholder: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  premiumPhotoPlaceholderInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e0e7ff',
    borderStyle: 'dashed',
  },
  premiumPhotoPlaceholderText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: 4,
  },
  premiumPhotoRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 66,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },

  // Premium Actions Bar
  premiumActionsBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  premiumActionsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  premiumBackBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  premiumBackBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  premiumBackBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  premiumNextBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  premiumNextBtnDisabled: {
    shadowColor: '#9ca3af',
    shadowOpacity: 0.1,
    elevation: 2,
    opacity: 0.6,
  },
  premiumNextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  premiumNextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  premiumNextBtnTextDisabled: {
    color: '#e5e7eb',
  },
  premiumNextBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    marginTop: 10,
  },
  validationHintText: {
    flex: 1,
    fontSize: 12,
    color: '#d97706',
    fontWeight: '500',
  },
  premiumActionsProgress: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  premiumProgressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  premiumProgressDotActive: {
    backgroundColor: '#6366f1',
    width: 24,
  },

  // ============ COMPACT MODAL STYLES ============
  compactModalHeader: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  compactHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  compactIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  compactModalSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  compactCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Compact Stepper
  compactStepperWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  compactProgressBar: {
    marginBottom: 12,
  },
  compactProgressBg: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  compactProgressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  compactStepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compactStepItem: {
    flex: 1,
    alignItems: 'center',
  },
  compactStepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactStepActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#6366f1',
  },
  compactStepCompleted: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  compactStepLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  compactStepLabelActive: {
    color: '#6366f1',
    fontWeight: '700',
  },
  compactStepLabelCompleted: {
    color: '#6366f1',
  },

  // Compact Form
  compactFormCard: {
    flex: 1,
    backgroundColor: '#fff',
  },
  compactSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  compactSectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  // Compact Photo
  compactPhotoSection: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  compactPhotoTouchable: {
    marginBottom: 6,
  },
  compactPhotoWrapper: {
    position: 'relative',
  },
  compactPhotoPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#e5e7eb',
  },
  compactPhotoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  compactPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactPhotoHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },

  // Compact Form Fields
  compactFormFields: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  compactFieldGroup: {
    marginBottom: 16,
  },
  compactFieldRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  compactHalfField: {
    flex: 1,
  },
  compactLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  compactFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  compactRequiredStar: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '700',
  },

  // Compact Input
  compactInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
  },
  compactInputFocused: {
    backgroundColor: '#fff',
    borderColor: '#6366f1',
  },
  compactInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  compactInputField: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },

  // Compact Phone Input
  compactPhoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
  },
  compactCountryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
  },
  compactCountryFlag: {
    fontSize: 16,
  },
  compactCountryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  compactPhoneDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#d1d5db',
    marginRight: 10,
  },
  compactPhoneField: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },

  // Compact Gender Selector
  compactGenderSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  compactGenderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    minHeight: 50,
  },
  compactGenderText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },

  // Compact Picker
  compactPickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    minHeight: 48,
  },
  compactPicker: {
    flex: 1,
    marginLeft: 8,
    color: '#111827',
    fontSize: 14,
  },

  // Compact Shift Selector
  compactShiftSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  compactShiftOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    minHeight: 50,
  },
  compactShiftText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },

  // Compact Date Picker
  compactDatePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
  },
  compactDateText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  compactDatePickerContainer: {
    marginTop: 8,
  },

  // Compact Text Area
  compactTextArea: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    minHeight: 90,
  },
  compactTextAreaField: {
    fontSize: 14,
    color: '#111827',
    padding: 0,
    textAlignVertical: 'top',
  },

  // Compact Error
  compactErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  compactErrorText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '500',
  },
});
