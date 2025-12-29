import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar, setStatusBarBackgroundColor, setStatusBarStyle } from 'expo-status-bar';
import React, { useEffect, useRef, useState, useCallback } from "react";
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
import { useModuleBadges } from "../../contexts/ModuleBadgeContext";
import { apiService, Employee, EmployeeData } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import PlatformUtils from "../../utils/platformUtils";
import { formatIST, getCurrentISTTime } from "../../utils/dateTime";
import { Select } from "../../components/ui/select";
import {
  validateEmployeeId,
  validateName,
  validateEmail,
  validatePhone,
  validatePanCard,
  validateAadharCard,
  validateAddress,
  validateJoiningDate,
  validateResignationDate,
  validateDepartment,
  validateRole,
  validateDesignation,
  validateEmploymentType,
  validateShiftType,
  validateGender,
  formatPhoneNumber,
  formatAadharCard,
  formatEmployeeId,
  formatPanCard,
} from "../../utils/employeeValidation";

const { width } = Dimensions.get("window");

const EmployeeManagement = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { resetBadge } = useModuleBadges();

  // Reset badge when screen is focused
  useFocusEffect(
    useCallback(() => {
      resetBadge("employees");
    }, [resetBadge])
  );

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
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewType, setViewType] = useState<"list" | "grid">("list");

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
      fetchDepartments();
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
    fetchDepartments();
  };

  const fetchDepartments = async () => {
    try {
      const deptList = await apiService.getDepartments();
      let deptNames = deptList.map(d => d.name);

      // Filter departments based on user authorization for HR and Managers
      const currentUserRole = user?.role?.toLowerCase();
      const currentUserDepartment = user?.department;

      if ((currentUserRole === 'hr' || currentUserRole === 'manager') && currentUserDepartment) {
        const authDepts = currentUserDepartment.split(',').map(d => d.trim()).filter(Boolean);
        // Only allow them to see/select departments they are assigned to
        deptNames = deptNames.filter(d => authDepts.includes(d));

        // Ensure they at least see their assigned departments even if not currently in deptList
        authDepts.forEach(ad => {
          if (!deptNames.includes(ad)) deptNames.push(ad);
        });
      }

      setDepartments(deptNames.sort());
      console.log("📥 Fetched authorized departments:", deptNames);
    } catch (error: any) {
      console.error("Error fetching departments:", error);
      // Fallback
      setDepartments(['Engineering', 'Marketing', 'Human Resources', 'Finance', 'Operations', 'Design']);
    }
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
  const [joiningDate, setJoiningDate] = useState(getCurrentISTTime());
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [resignationDate, setResignationDate] = useState<Date | null>(null);
  const [showResignationDatePicker, setShowResignationDatePicker] = useState(false);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerConfig, setPickerConfig] = useState<{
    title: string;
    options: { label: string; value: string }[];
    onSelect: (value: string) => void;
    selectedValue: string;
  }>({ title: '', options: [], onSelect: () => { }, selectedValue: '' });

  const openPicker = (title: string, options: { label: string; value: string }[], onSelect: (v: string) => void, selectedValue: string) => {
    setPickerConfig({ title, options, onSelect, selectedValue });
    setPickerModalVisible(true);
  };

  // Address split fields state
  const [addressDetails, setAddressDetails] = useState({
    houseNo: '', street: '', area: '', city: '', pincode: '', state: ''
  });
  const [reportingManager, setReportingManager] = useState<string>('');

  // Assigned departments for HR and Manager roles
  const [assignedDepartments, setAssignedDepartments] = useState<string[]>([]);
  const [countryCode, setCountryCode] = useState("+91");

  // Sync address details to form.address
  useEffect(() => {
    const { houseNo, street, area, city, pincode, state } = addressDetails;
    const parts = [houseNo, street, area, city, state, pincode].filter(Boolean);
    if (parts.length > 0) {
      const fullAddress = `${houseNo ? houseNo + ', ' : ''}${street ? street + ', ' : ''}${area ? area + ', ' : ''}${city ? city + ', ' : ''}${state ? state + ' - ' : ''}${pincode}`;
      setForm(prev => ({ ...prev, address: fullAddress }));
    }
  }, [addressDetails]);

  // Scroll synchronization
  const scrollViewRefs = useRef<{ [key: string]: any }>({});
  const scrollTimeout = useRef<any>(null);
  const isScrolling = useRef(false);

  const [form, setForm] = useState<Partial<Employee>>({
    employee_id: "", name: "", email: "", department: "", designation: "",
    role: "", phone: "", address: "", pan_card: "", aadhar_card: "",
    shift_type: "General (GS)", gender: "Male", employee_type: "Permanent", profile_photo: "",
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
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
            try { scrollViewRefs.current[key]?.scrollTo({ x: offsetX, animated: false }); } catch (e) { }
          }
        });
      } else {
        if (scrollViewRefs.current['header']) {
          try { scrollViewRefs.current['header']?.scrollTo({ x: offsetX, animated: false }); } catch (e) { }
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
      const formatted = formatIST(selectedDate, 'yyyy-MM-dd');
      setForm({ ...form, joining_date: formatted });
    }
  };

  const handleResignationDateChange = (event: any, selectedDate?: Date) => {
    setShowResignationDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setResignationDate(selectedDate);
      const formatted = formatIST(selectedDate, 'yyyy-MM-dd');
      setForm({ ...form, resignation_date: formatted });
    } else if (event.type === 'dismissed') {
      // Keep existing or null
    }
  };

  const resetForm = () => {
    setForm({
      employee_id: "", name: "", email: "", department: "", designation: "",
      role: "", phone: "", address: "", pan_card: "", aadhar_card: "",
      shift_type: "General (GS)", gender: "Male", employee_type: "Permanent", profile_photo: "",
      joining_date: formatIST(getCurrentISTTime(), 'yyyy-MM-dd'),
    });
    setAddressDetails({ houseNo: '', street: '', area: '', city: '', pincode: '', state: '' });
    setReportingManager('');
    setAssignedDepartments([]);
    setJoiningDate(getCurrentISTTime());
    setResignationDate(null);
    setCountryCode("+91");
    setValidationErrors({});
    setModalVisible(false);
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

  // Field-level validation with real-time feedback
  const validateField = (fieldName: string, value: string) => {
    const errors = { ...validationErrors };

    switch (fieldName) {
      case 'employee_id':
        const empIdResult = validateEmployeeId(value);
        if (!empIdResult.isValid) {
          errors.employee_id = empIdResult.error || 'Invalid Employee ID';
        } else {
          delete errors.employee_id;
        }
        break;

      case 'name':
        const nameResult = validateName(value);
        if (!nameResult.isValid) {
          errors.name = nameResult.error || 'Invalid name';
        } else {
          delete errors.name;
        }
        break;

      case 'email':
        const emailResult = validateEmail(value);
        if (!emailResult.isValid) {
          errors.email = emailResult.error || 'Invalid email';
        } else {
          delete errors.email;
        }
        break;

      case 'phone':
        if (value.trim()) {
          const phoneResult = validatePhone(value, countryCode);
          if (!phoneResult.isValid) {
            errors.phone = phoneResult.error || 'Invalid phone number';
          } else {
            delete errors.phone;
          }
        } else {
          delete errors.phone;
        }
        break;

      case 'pan_card':
        const panResult = validatePanCard(value);
        if (!panResult.isValid) {
          errors.pan_card = panResult.error || 'Invalid PAN Card';
        } else {
          delete errors.pan_card;
        }
        break;

      case 'aadhar_card':
        const aadharResult = validateAadharCard(value);
        if (!aadharResult.isValid) {
          errors.aadhar_card = aadharResult.error || 'Invalid Aadhar Card';
        } else {
          delete errors.aadhar_card;
        }
        break;

      case 'address':
        const addressResult = validateAddress(value);
        if (!addressResult.isValid) {
          errors.address = addressResult.error || 'Invalid address';
        } else {
          delete errors.address;
        }
        break;

      case 'designation':
        const designationResult = validateDesignation(value, form.role || '');
        if (!designationResult.isValid) {
          errors.designation = designationResult.error || 'Invalid designation';
        } else {
          delete errors.designation;
        }
        break;
    }

    setValidationErrors(errors);
  };

  const handleSave = async () => {
    const fieldErrors: { [key: string]: string } = {};

    // ============ STEP 0: BASIC INFO VALIDATION ============
    // Employee ID
    const empIdValidation = validateEmployeeId(form.employee_id || '');
    if (!empIdValidation.isValid) {
      fieldErrors.employee_id = empIdValidation.error || 'Invalid Employee ID';
    }

    // Full Name
    const nameValidation = validateName(form.name || '');
    if (!nameValidation.isValid) {
      fieldErrors.name = nameValidation.error || 'Invalid Name';
    }

    // Email
    const emailValidation = validateEmail(form.email || '');
    if (!emailValidation.isValid) {
      fieldErrors.email = emailValidation.error || 'Invalid Email';
    }

    // Phone (optional but if provided, must be valid)
    if (form.phone?.trim()) {
      const phoneValidation = validatePhone(form.phone, countryCode);
      if (!phoneValidation.isValid) {
        fieldErrors.phone = phoneValidation.error || 'Invalid Phone Number';
      }
    }

    // ============ STEP 1: WORK DETAILS VALIDATION ============
    // Role
    const roleValidation = validateRole(form.role || '');
    if (!roleValidation.isValid) {
      fieldErrors.role = roleValidation.error || 'Invalid Role';
    }

    // Department validation based on role
    if (form.role === 'HR' || form.role === 'Manager') {
      // For HR and Manager, validate assigned departments
      if (!assignedDepartments || assignedDepartments.length === 0) {
        fieldErrors.assignedDepartments = 'Please select at least one department';
      }
    } else {
      // For other roles, validate single department
      const deptValidation = validateDepartment(form.department || '', form.role || '');
      if (!deptValidation.isValid) {
        fieldErrors.department = deptValidation.error || 'Invalid Department';
      }
    }

    // Designation (skip for HR and Manager)
    if (form.role !== 'HR' && form.role !== 'Manager') {
      const designationValidation = validateDesignation(form.designation || '', form.role || '');
      if (!designationValidation.isValid) {
        fieldErrors.designation = designationValidation.error || 'Invalid Designation';
      }
    }

    // Shift Type
    const shiftValidation = validateShiftType(form.shift_type || '');
    if (!shiftValidation.isValid) {
      fieldErrors.shift_type = shiftValidation.error || 'Invalid Shift Type';
    }

    // Employment Type
    const empTypeValidation = validateEmploymentType(form.employee_type || '');
    if (!empTypeValidation.isValid) {
      fieldErrors.employee_type = empTypeValidation.error || 'Invalid Employment Type';
    }

    // Gender
    const genderValidation = validateGender(form.gender || '');
    if (!genderValidation.isValid) {
      fieldErrors.gender = genderValidation.error || 'Invalid Gender';
    }

    // ============ STEP 2: DOCUMENTS & ADDRESS VALIDATION ============
    // PAN Card
    const panValidation = validatePanCard(form.pan_card || '');
    if (!panValidation.isValid) {
      fieldErrors.pan_card = panValidation.error || 'Invalid PAN Card';
    }

    // Aadhar Card
    const aadharValidation = validateAadharCard(form.aadhar_card || '');
    if (!aadharValidation.isValid) {
      fieldErrors.aadhar_card = aadharValidation.error || 'Invalid Aadhar Card';
    }

    // Address (Validate individual fields or full address)
    const { houseNo, street, area, city, pincode, state } = addressDetails;
    if (!houseNo) fieldErrors.houseNo = 'House No is required';
    if (!street) fieldErrors.street = 'Street is required';
    if (!area) fieldErrors.area = 'Area is required';
    if (!city) fieldErrors.city = 'City is required';
    if (!state) fieldErrors.state = 'State is required';
    if (!pincode) fieldErrors.pincode = 'Pincode is required';

    // Joining Date (Already validated but ensure formatting)
    const joiningDateValidation = validateJoiningDate(joiningDate);
    if (!joiningDateValidation.isValid) {
      fieldErrors.joiningDate = joiningDateValidation.error || 'Invalid Joining Date';
    }

    // Resignation Date (only if provided)
    if (resignationDate) {
      const resValidation = validateResignationDate(resignationDate, joiningDate, 'Inactive');
      if (!resValidation.isValid) {
        fieldErrors.resignation_date = resValidation.error || 'Invalid Resignation Date';
      }
    }

    setValidationErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      Alert.alert(
        "Validation Error",
        "Please fix the errors highlighted in the form.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setLoading(true);

      // Normalize role: "Team Lead" -> "TeamLead" for backend compatibility
      const normalizedRole = form.role === "Team Lead" ? "TeamLead" : form.role;

      // Format data for submission
      const employeeData: EmployeeData = {
        name: form.name!.trim(),
        email: form.email!.trim().toLowerCase(),
        employee_id: formatEmployeeId(form.employee_id!),
        department: (form.role === 'HR' || form.role === 'Manager')
          ? assignedDepartments.join(', ')
          : (form.department || ""),
        designation: form.designation?.trim() || "",
        role: normalizedRole || "",
        phone: form.phone?.trim() ? `${countryCode}${form.phone.replace(/\D/g, "")}` : "",
        address: form.address?.trim() || "",
        pan_card: formatPanCard(form.pan_card!),
        aadhar_card: form.aadhar_card!, // Backend expects XXXX-XXXX-XXXX format (14 chars)
        shift_type: (form.shift_type === 'General (GS)' ? 'general' : form.shift_type?.toLowerCase()) || "general",
        gender: form.gender?.toLowerCase() || "male",
        employee_type: form.employee_type?.toLowerCase() || "permanent",
        joining_date: form.joining_date || formatIST(joiningDate, 'yyyy-MM-dd'),
        resignation_date: form.resignation_date || (resignationDate ? formatIST(resignationDate, 'yyyy-MM-dd') : undefined),
        reporting_manager: (normalizedRole === 'TeamLead' || normalizedRole === 'Employee') ? reportingManager : "",
      };

      if (form.profile_photo) {
        employeeData.profile_photo = form.profile_photo;
      }

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

      // Handle backend duplicate errors
      const errorMessage = error.message || "Failed to save employee";

      if (errorMessage.includes('Employee ID') || errorMessage.includes('employee_id')) {
        Alert.alert("Duplicate Employee ID", "This Employee ID already exists. Please use a unique ID.");
      } else if (errorMessage.includes('email')) {
        Alert.alert("Duplicate Email", "This email is already registered. Please use a different email.");
      } else if (errorMessage.includes('PAN') || errorMessage.includes('pan_card')) {
        Alert.alert("Duplicate PAN Card", "This PAN Card is already registered. Please verify the number.");
      } else if (errorMessage.includes('Aadhar') || errorMessage.includes('aadhar_card')) {
        Alert.alert("Duplicate Aadhar Card", "This Aadhar Card is already registered. Please verify the number.");
      } else {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleView = (employee: Employee) => { setViewEmployee(employee); setViewModalVisible(true); };
  const handleEdit = (employee: Employee) => {
    setEditEmployee(employee);
    // Transform "Team Lead" to "TeamLead" for backend compatibility

    // Format Phone and Aadhar for UI
    let displayPhone = employee.phone || "";
    let extractedCountryCode = "+91";
    if (displayPhone.startsWith('+')) {
      if (displayPhone.startsWith('+91')) {
        extractedCountryCode = "+91";
        displayPhone = displayPhone.substring(3);
      } else if (displayPhone.length > 10) {
        // Fallback for other codes: assume last 10 are number
        extractedCountryCode = displayPhone.substring(0, displayPhone.length - 10);
        displayPhone = displayPhone.substring(displayPhone.length - 10);
      }
    }
    setCountryCode(extractedCountryCode);

    // Normalization helper for Select/Radio fields
    const normalize = (value: string | undefined, options: string[], defaultVal: string) => {
      if (!value) return defaultVal;
      const match = options.find(opt => opt.toLowerCase() === value.toLowerCase());
      return match || defaultVal;
    };

    const normalizedEmployee = {
      ...employee,
      role: employee.role === "TeamLead" ? "Team Lead" : employee.role,
      department: normalize(employee.department, departments, employee.department || ""),
      phone: formatPhoneNumber(displayPhone),
      aadhar_card: employee.aadhar_card ? formatAadharCard(employee.aadhar_card) : "",
      gender: normalize(employee.gender, ['Male', 'Female', 'Other'], 'Male'),
      shift_type: normalize(employee.shift_type, ['General (GS)', 'Morning', 'Afternoon', 'Night', 'Rotational'], 'General (GS)'),
      employee_type: normalize(employee.employee_type, ['Contract-based', 'Permanent'], 'Permanent'),
    };
    setForm(normalizedEmployee);
    setReportingManager(employee.reporting_manager || "");

    // Parse Address for Edit
    if (employee.address) {
      const parts = employee.address.split(', ');
      if (parts.length >= 5) {
        const [house, str, ar, ci, ...rest] = parts;
        const lastPart = rest.join(', '); // Join back if state had commas? Unlikely based on format
        const [st, pin] = lastPart.split(' - ');
        setAddressDetails({
          houseNo: house || '',
          street: str || '',
          area: ar || '',
          city: ci || '',
          state: st || '',
          pincode: pin || ''
        });
      } else {
        setAddressDetails({ houseNo: '', street: employee.address, area: '', city: '', pincode: '', state: '' });
      }
    } else {
      setAddressDetails({ houseNo: '', street: '', area: '', city: '', pincode: '', state: '' });
    }


    // Parse Assigned Departments for HR and Manager
    if (employee.role === 'HR' || employee.role === 'Manager') {
      if (employee.department && employee.department.includes(',')) {
        // Multiple departments assigned
        const depts = employee.department.split(',').map(d => d.trim());
        setAssignedDepartments(depts);
      } else if (employee.department) {
        // Single department (legacy or edge case)
        setAssignedDepartments([employee.department]);
      }
    }

    // Parsing dates from backend
    if (employee.joining_date) {
      const date = new Date(employee.joining_date);
      if (!isNaN(date.getTime())) {
        setJoiningDate(date);
        setForm(prev => ({ ...prev, joining_date: employee.joining_date }));
      }
    }

    if (employee.resignation_date) {
      const date = new Date(employee.resignation_date);
      if (!isNaN(date.getTime())) {
        setResignationDate(date);
        setForm(prev => ({ ...prev, resignation_date: employee.resignation_date }));
      }
    } else {
      setResignationDate(null);
    }
    setModalVisible(true);
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
            const errorMsg = error.message || "";
            // Handle Database Integrity Error gracefully in UI
            if (errorMsg.includes("IntegrityError") || errorMsg.includes("user_id' cannot be null")) {
              Alert.alert(
                "Delete Prevented",
                "This employee has linked records (like WFH requests or tasks) that prevent permanent deletion. We recommend using the 'Deactivate' feature instead to disable the account while keeping data intact.",
                [{ text: "OK" }]
              );
            } else {
              Alert.alert("Error", error.message || "Failed to delete employee");
            }
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

            // UI fix: Update local viewEmployee state if modal is open
            if (viewEmployee && (viewEmployee.id === employee.id || viewEmployee.user_id === employee.user_id)) {
              setViewEmployee({ ...viewEmployee, is_active: newStatus });
            }

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
        // HR can only see Manager, Team Lead, Employee from their own unauthorized departments
        const allowedRoles = ['manager', 'team lead', 'teamlead', 'employee'];
        const authDepts = (currentUserDepartment || '').split(',').map(d => d.trim()).filter(Boolean);
        const empDepts = (emp.department || '').split(',').map(d => d.trim()).filter(Boolean);
        const isSameDepartment = !currentUserDepartment || empDepts.some(d => authDepts.includes(d));
        matchesRoleAccess = allowedRoles.includes(empRole) && isSameDepartment;
      } else if (currentUserRole === 'manager') {
        // Manager can see Team Lead and Employee from their department
        const allowedRoles = ['team lead', 'teamlead', 'employee'];
        const authDepts = (currentUserDepartment || '').split(',').map(d => d.trim()).filter(Boolean);
        const empDepts = (emp.department || '').split(',').map(d => d.trim()).filter(Boolean);
        const isSameDepartment = !currentUserDepartment || empDepts.some(d => authDepts.includes(d));
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
      const matchesDepartment = filters.department === '' ||
        (emp.department || '').split(',').map(d => d.trim()).includes(filters.department);

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

  const handleExportAction = async (action: "csv" | "pdf" | "bulk" | "template") => {
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
      } else if (action === "template") {
        await apiService.downloadEmployeeTemplate();
        Alert.alert("Success", "Template downloaded successfully!\n\nFill in the employee details and use 'Bulk Upload' to import multiple employees at once.");
      }
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Failed to export data.");
    } finally { setLoading(false); }
  };


  const uniqueDepartments = [...new Set(
    employees.flatMap(emp => (emp.department || '').split(',').map(d => d.trim()).filter(Boolean))
  )].filter(dept => dept !== '') as string[];
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
    <SafeAreaView style={[styles.container, { backgroundColor: "#f8fafc" }]} edges={['top']}>
      <StatusBar style="dark" backgroundColor="#fff" translucent={false} />

      {/* Modern Minimalist Header */}
      <View style={styles.headerContainer}>
        <Animated.View style={[styles.headerContent, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }]}>
          {/* Header Top Section */}
          <View style={styles.headerTopSection}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={22} color="#111827" />
              </TouchableOpacity>
              <View style={styles.headerTextSection}>
                <Text style={styles.headerTitle}>Employees</Text>
                <Text style={styles.headerSubtitle}>{getHeaderSubtitle()}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setFilterModalVisible(true)}>
                <Ionicons name="options-outline" size={20} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setExportMenuVisible(true)}>
                <Ionicons name="cloud-download-outline" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Overview Bar - Minimalist Floating Card */}
          <View style={styles.statsOverviewBar}>
            <View style={styles.miniStatItem}>
              <Text style={styles.miniStatValue}>{totalEmployees}</Text>
              <Text style={styles.miniStatLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Text style={[styles.miniStatValue, { color: '#10b981' }]}>{activeEmployees}</Text>
              <Text style={styles.miniStatLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Text style={[styles.miniStatValue, { color: '#ef4444' }]}>{inactiveEmployees}</Text>
              <Text style={styles.miniStatLabel}>Inactive</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Text style={styles.miniStatValue}>{uniqueDepartments.length}</Text>
              <Text style={styles.miniStatLabel}>Depts</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Export Menu Modal - Closes on outside click */}
      <Modal visible={exportMenuVisible} transparent animationType="fade" onRequestClose={() => setExportMenuVisible(false)}>
        <TouchableOpacity style={styles.exportMenuOverlay} activeOpacity={1} onPress={() => setExportMenuVisible(false)}>
          <View style={styles.exportMenuContainer}>
            {/* Export CSV */}
            <TouchableOpacity
              style={styles.exportMenuItem}
              onPress={() => {
                handleExportAction("csv");
                setExportMenuVisible(false);
              }}
            >
              <View style={[styles.exportMenuIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="document-text-outline" size={18} color="#3b82f6" />
              </View>
              <View style={styles.exportMenuContent}>
                <Text style={styles.exportMenuTitle}>Export CSV</Text>
                <Text style={styles.exportMenuDesc}>Download as spreadsheet</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>

            {/* Export PDF */}
            <TouchableOpacity
              style={styles.exportMenuItem}
              onPress={() => {
                handleExportAction("pdf");
                setExportMenuVisible(false);
              }}
            >
              <View style={[styles.exportMenuIcon, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="document-outline" size={18} color="#ef4444" />
              </View>
              <View style={styles.exportMenuContent}>
                <Text style={styles.exportMenuTitle}>Export PDF</Text>
                <Text style={styles.exportMenuDesc}>Download as document</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>

            {/* Bulk Upload */}
            <TouchableOpacity
              style={styles.exportMenuItem}
              onPress={() => {
                handleExportAction("bulk");
                setExportMenuVisible(false);
              }}
            >
              <View style={[styles.exportMenuIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="cloud-upload-outline" size={18} color="#f59e0b" />
              </View>
              <View style={styles.exportMenuContent}>
                <Text style={styles.exportMenuTitle}>Bulk Upload</Text>
                <Text style={styles.exportMenuDesc}>Import multiple employees</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.exportMenuDivider} />

            {/* Download Template */}
            <TouchableOpacity
              style={styles.exportMenuItem}
              onPress={() => {
                handleExportAction("template");
                setExportMenuVisible(false);
              }}
            >
              <View style={[styles.exportMenuIcon, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="download-outline" size={18} color="#10b981" />
              </View>
              <View style={styles.exportMenuContent}>
                <Text style={styles.exportMenuTitle}>Download Template</Text>
                <Text style={styles.exportMenuDesc}>Get CSV template</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>


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
          <TouchableOpacity
            style={styles.viewToggleBtn}
            onPress={() => setViewType(viewType === "list" ? "grid" : "list")}
          >
            <View style={styles.viewToggleInner}>
              <Ionicons
                name={viewType === "list" ? "grid-outline" : "list-outline"}
                size={20}
                color="#6366f1"
              />
            </View>
          </TouchableOpacity>

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


            <FlatList
              key={viewType}
              data={filteredEmployeesList}
              numColumns={viewType === "list" ? 1 : 2}
              keyExtractor={(item) => item.user_id?.toString() || item.id || item.employee_id}
              onScroll={onScroll}
              scrollEventThrottle={scrollEventThrottle}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              contentContainerStyle={[
                { paddingBottom: tabBarVisible ? tabBarHeight + 20 : 100, paddingTop: 10 },
                viewType === "grid" && styles.gridContentContainer
              ]}
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
              renderItem={({ item, index }) => {
                const roleColor = getRoleBadgeColor(item.role);
                const isActive = item.is_active !== false;

                if (viewType === "grid") {
                  return (
                    <TouchableOpacity
                      style={[styles.empGridCard, !isActive && styles.empCardInactive]}
                      onPress={() => handleView(item)}
                      onLongPress={() => handleToggleStatus(item)}
                      activeOpacity={0.9}
                    >
                      <View style={styles.empGridAvatarWrapper}>
                        {getProfilePhotoUrl(item.profile_photo) ? (
                          <Image source={{ uri: getProfilePhotoUrl(item.profile_photo)! }} style={styles.empGridAvatar} />
                        ) : (
                          <LinearGradient colors={roleColor.gradient} style={styles.empGridAvatarPlaceholder}>
                            <Text style={styles.empCardAvatarText}>{item.name?.charAt(0).toUpperCase() || "?"}</Text>
                          </LinearGradient>
                        )}
                        <View style={[styles.empGridStatusDot, { backgroundColor: isActive ? '#10b981' : '#ef4444' }]} />
                      </View>
                      <Text style={styles.empGridName} numberOfLines={1}>{item.name}</Text>
                      <View style={[styles.empGridRoleBadge, { backgroundColor: roleColor.bg }]}>
                        <Text style={[styles.empGridRoleText, { color: roleColor.text }]}>{item.role || "Employee"}</Text>
                      </View>
                      <Text style={styles.empGridDept} numberOfLines={1}>{item.department}</Text>
                    </TouchableOpacity>
                  );
                }

                return (
                  <TouchableOpacity
                    style={[
                      styles.empCard,
                      { marginTop: index === 0 ? 4 : 12 },
                      !isActive && styles.empCardInactive
                    ]}
                    onPress={() => handleView(item)}
                    onLongPress={() => handleToggleStatus(item)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.empCardHeader}>
                      <View style={styles.empCardLeft}>
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); handlePhotoPress(getProfilePhotoUrl(item.profile_photo), item.name); }}>
                          {getProfilePhotoUrl(item.profile_photo) ? (
                            <Image source={{ uri: getProfilePhotoUrl(item.profile_photo)! }} style={styles.empCardAvatar} />
                          ) : (
                            <LinearGradient colors={roleColor.gradient} style={styles.empCardAvatarPlaceholder}>
                              <Text style={styles.empCardAvatarText}>{item.name?.charAt(0).toUpperCase() || "?"}</Text>
                            </LinearGradient>
                          )}
                        </TouchableOpacity>
                        <View style={styles.empCardInfo}>
                          <Text style={styles.empCardName} numberOfLines={1}>{item.name}</Text>
                          <View style={styles.empCardRoleRow}>
                            <View style={[styles.empRoleBadge, { backgroundColor: roleColor.bg }]}>
                              <Text style={[styles.empRoleText, { color: roleColor.text }]}>{item.role || "Employee"}</Text>
                            </View>
                            <Text style={styles.empCardDept}>• {item.department}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.empCardRight}>
                        <View style={[styles.empStatusDot, { backgroundColor: isActive ? '#10b981' : '#ef4444' }]} />
                        <Ionicons name="chevron-forward" size={20} color="#d1d5db" style={{ marginLeft: 8 }} />
                      </View>
                    </View>

                    <View style={styles.empCardDivider} />

                    <View style={styles.empCardFooter}>
                      <View style={styles.empFooterItem}>
                        <Ionicons name="id-card-outline" size={14} color="#6b7280" />
                        <Text style={styles.empFooterText}>{item.employee_id}</Text>
                      </View>
                      <View style={styles.empFooterItem}>
                        <Ionicons name="mail-outline" size={14} color="#6b7280" />
                        <Text style={[styles.empFooterText, { maxWidth: 150 }]} numberOfLines={1}>{item.email}</Text>
                      </View>
                      <View style={[styles.empFooterItem, !isActive && styles.empFooterItemInactive]}>
                        <Ionicons name={isActive ? "checkmark-circle-outline" : "alert-circle-outline"} size={14} color={isActive ? "#059669" : "#dc2626"} />
                        <Text style={[styles.empFooterText, { color: isActive ? "#059669" : "#dc2626", fontWeight: isActive ? "500" : "700" }]}>
                          {isActive ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* Add/Edit Modal - Single Column Layout */}
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
                        {editEmployee ? "Update employee information" : "Fill in all required details"}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={resetForm} style={styles.compactCloseBtn}>
                    <Ionicons name="close" size={22} color="rgba(255,255,255,0.95)" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                {/* Single Scrollable Form */}
                <ScrollView
                  style={styles.modalContent}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={{ paddingBottom: 100 }}
                >
                  <View style={styles.compactFormCard}>
                    {/* Profile Photo */}
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
                      <Text style={styles.compactPhotoHint}>Profile Photo (Optional)</Text>
                    </View>

                    {/* All Form Fields in Single Column */}
                    <View style={styles.compactFormFields}>
                      {/* Employee ID */}
                      <View style={styles.compactFieldGroup}>
                        <View style={styles.compactLabelRow}>
                          <Text style={styles.compactFieldLabel}>Employee ID</Text>
                          <Text style={styles.compactRequiredStar}>*</Text>
                        </View>
                        <TextInput
                          placeholder="e.g., EMP001"
                          placeholderTextColor="#9ca3af"
                          style={styles.compactInputField}
                          value={form.employee_id}
                          autoCapitalize="characters"
                          editable={!editEmployee}
                          onChangeText={(text) => {
                            const formatted = formatEmployeeId(text);
                            setForm({ ...form, employee_id: formatted });
                            validateField('employee_id', formatted);
                          }}
                        />
                        {!editEmployee && <Text style={styles.compactPhotoHint}>(Uppercase & Numbers only)</Text>}
                        {validationErrors.employee_id && <Text style={styles.compactErrorText}>{validationErrors.employee_id}</Text>}
                      </View>

                      {/* Full Name */}
                      <View style={styles.compactFieldGroup}>
                        <View style={styles.compactLabelRow}>
                          <Text style={styles.compactFieldLabel}>Name</Text>
                          <Text style={styles.compactRequiredStar}>*</Text>
                        </View>
                        <TextInput
                          placeholder="e.g., John Doe"
                          placeholderTextColor="#9ca3af"
                          style={styles.compactInputField}
                          value={form.name}
                          onChangeText={(text) => {
                            const filteredText = text.replace(/[^a-zA-Z\s]/g, '');
                            setForm({ ...form, name: filteredText });
                            validateField('name', filteredText);
                          }}
                        />
                        {validationErrors.name && <Text style={styles.compactErrorText}>{validationErrors.name}</Text>}
                      </View>

                      {/* Email */}
                      <View style={styles.compactFieldGroup}>
                        <View style={styles.compactLabelRow}>
                          <Text style={styles.compactFieldLabel}>Email</Text>
                          <Text style={styles.compactRequiredStar}>*</Text>
                        </View>
                        <TextInput
                          placeholder="e.g. john@company.com"
                          placeholderTextColor="#9ca3af"
                          style={styles.compactInputField}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={form.email}
                          onChangeText={(text) => { setForm({ ...form, email: text }); validateField('email', text); }}
                        />
                        {validationErrors.email && <Text style={styles.compactErrorText}>{validationErrors.email}</Text>}
                      </View>

                      {/* Role */}
                      <Select
                        label="Role"
                        required
                        items={[
                          { label: 'Admin', value: 'Admin' },
                          { label: 'HR', value: 'HR' },
                          { label: 'Manager', value: 'Manager' },
                          { label: 'Team Lead', value: 'TeamLead' },
                          { label: 'Employee', value: 'Employee' },
                        ]}
                        value={form.role}
                        onValueChange={(v) => setForm({ ...form, role: v })}
                        placeholder="Select Role"
                        error={validationErrors.role}
                      />


                      {/* Department - Show dropdown for non-HR/Manager roles */}
                      {form.role && form.role !== 'HR' && form.role !== 'Manager' ? (
                        <Select
                          label="Department"
                          required
                          items={departments.map(d => ({ label: d, value: d }))}
                          value={form.department}
                          onValueChange={(v) => setForm({ ...form, department: v })}
                          placeholder="Select Department"
                          error={validationErrors.department || validationErrors.role}
                        />
                      ) : (form.role === 'HR' || form.role === 'Manager') ? (
                        <View style={styles.compactFieldGroup}>
                          <View style={styles.compactLabelRow}>
                            <Text style={styles.compactFieldLabel}>Assigned Departments</Text>
                            <Text style={styles.compactRequiredStar}>*</Text>
                            <TouchableOpacity
                              onPress={() => {
                                // Check if all departments are currently selected
                                const allSelected = departments.length > 0 && assignedDepartments.length === departments.length;
                                if (allSelected) {
                                  // Deselect all
                                  setAssignedDepartments([]);
                                } else {
                                  // Select all
                                  setAssignedDepartments([...departments]);
                                }
                              }}
                            >
                              <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '600' }}>
                                {departments.length > 0 && assignedDepartments.length === departments.length ? 'Deselect All' : 'Select All'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <View style={{
                            backgroundColor: '#f9fafb',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            padding: 12,
                            maxHeight: 200,
                          }}>
                            <ScrollView
                              nestedScrollEnabled={true}
                              showsVerticalScrollIndicator={true}
                            >
                              {departments.length > 0 ? (
                                departments.map(dept => (
                                  <TouchableOpacity
                                    key={dept}
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      paddingVertical: 10,
                                      paddingHorizontal: 4,
                                      borderBottomWidth: 1,
                                      borderBottomColor: '#f3f4f6',
                                    }}
                                    onPress={() => {
                                      if (assignedDepartments.includes(dept)) {
                                        setAssignedDepartments(prev => prev.filter(d => d !== dept));
                                      } else {
                                        setAssignedDepartments(prev => [...prev, dept]);
                                      }
                                    }}
                                  >
                                    <View style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: 4,
                                      borderWidth: 2,
                                      borderColor: assignedDepartments.includes(dept) ? '#3b82f6' : '#d1d5db',
                                      backgroundColor: assignedDepartments.includes(dept) ? '#3b82f6' : '#fff',
                                      marginRight: 12,
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                    }}>
                                      {assignedDepartments.includes(dept) && (
                                        <Ionicons name="checkmark" size={14} color="#fff" />
                                      )}
                                    </View>
                                    <Text style={{
                                      fontSize: 14,
                                      color: '#1f2937',
                                      fontWeight: assignedDepartments.includes(dept) ? '600' : '400',
                                      flex: 1,
                                    }}>
                                      {dept === 'Human Resources' ? '(QA) Department' : dept}
                                    </Text>
                                  </TouchableOpacity>
                                ))
                              ) : (
                                <Text style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', paddingVertical: 16 }}>
                                  Loading departments...
                                </Text>
                              )}
                            </ScrollView>
                          </View>
                          {validationErrors.assignedDepartments && <Text style={styles.compactErrorText}>{validationErrors.assignedDepartments}</Text>}
                        </View>
                      ) : null}


                      {/* Designation - Hide for HR and Manager */}
                      {form.role && form.role !== 'HR' && form.role !== 'Manager' && (
                        <View style={styles.compactFieldGroup}>
                          <Text style={styles.compactFieldLabel}>Designation</Text>
                          <TextInput
                            placeholder="e.g. Software Engineer"
                            placeholderTextColor="#9ca3af"
                            style={styles.compactInputField}
                            value={form.designation}
                            onChangeText={(text) => setForm({ ...form, designation: text })}
                          />
                          {validationErrors.designation && <Text style={styles.compactErrorText}>{validationErrors.designation}</Text>}
                        </View>
                      )}

                      {/* Reporting Manager (Conditional Rendering) */}
                      {(form.role === 'TeamLead' || form.role === 'Employee') && (
                        <Select
                          label="Reporting Manager"
                          items={employees
                            .filter(e => ['Admin', 'Manager', 'Team Lead', 'TeamLead', 'HR'].includes(e.role || ''))
                            .map(e => ({ label: `${e.name} (${e.role})`, value: e.user_id?.toString() || e.employee_id || '' }))}
                          value={reportingManager}
                          onValueChange={(v) => setReportingManager(v)}
                          placeholder="Select Manager"
                        />
                      )}

                      {/* Joining Date */}
                      <View style={styles.compactFieldGroup}>
                        <View style={styles.compactLabelRow}>
                          <Text style={styles.compactFieldLabel}>Joining Date</Text>
                          <Text style={styles.compactRequiredStar}>*</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.compactInputField, (user?.role !== 'admin' && user?.role !== 'hr') && { backgroundColor: '#f3f4f6' }]}
                          onPress={() => {
                            if (user?.role === 'admin' || user?.role === 'hr') {
                              setShowDatePicker(true);
                            } else {
                              Alert.alert("Permission Denied", "Only Admin and HR can edit the Joining Date.");
                            }
                          }}
                          disabled={user?.role !== 'admin' && user?.role !== 'hr'}
                        >
                          <Text style={{ color: user?.role === 'admin' || user?.role === 'hr' ? '#1f2937' : '#6b7280' }}>
                            {form.joining_date || formatIST(joiningDate, 'yyyy-MM-dd')}
                          </Text>
                          <Ionicons name="calendar-outline" size={18} color={user?.role === 'admin' || user?.role === 'hr' ? "#6b7280" : "#9ca3af"} style={{ position: 'absolute', right: 12, top: 12 }} />
                        </TouchableOpacity>
                        {(user?.role !== 'admin' && user?.role !== 'hr') && (
                          <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>* Only Admin/HR can edit this field</Text>
                        )}
                        {validationErrors.joiningDate && <Text style={styles.compactErrorText}>{validationErrors.joiningDate}</Text>}
                        {showDatePicker && (
                          <DateTimePicker
                            value={joiningDate}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                          />
                        )}
                      </View>

                      {/* Country Code & Phone */}
                      <View style={styles.compactFieldGroup}>
                        <Text style={styles.compactFieldLabel}>Country Code</Text>
                        <TouchableOpacity
                          style={[styles.compactPickerWrapper, { marginBottom: 10 }]}
                          onPress={() => {
                            openPicker(
                              "Select Country Code",
                              [
                                { label: "🇮🇳 +91 (India)", value: "+91" },
                                { label: "🇺🇸 +1 (USA)", value: "+1" },
                                { label: "🇬🇧 +44 (UK)", value: "+44" },
                                { label: "🇦🇪 +971 (UAE)", value: "+971" }
                              ],
                              (v) => setCountryCode(v),
                              countryCode
                            );
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 10, height: 44 }}>
                            <Text>{countryCode === '+91' ? '🇮🇳 +91 (India)' : countryCode === '+1' ? '🇺🇸 +1 (USA)' : countryCode === '+44' ? '🇬🇧 +44 (UK)' : countryCode === '+971' ? '🇦🇪 +971 (UAE)' : countryCode}</Text>
                            <Ionicons name="chevron-down" size={20} color="#6b7280" style={{ marginLeft: 'auto', marginRight: 10 }} />
                          </View>
                        </TouchableOpacity>
                        <View style={styles.compactLabelRow}>
                          <Text style={styles.compactFieldLabel}>Phone</Text>
                          <Text style={styles.compactRequiredStar}>*</Text>
                        </View>
                        <TextInput
                          placeholder="e.g., 987-654-3210"
                          placeholderTextColor="#9ca3af"
                          style={styles.compactInputField}
                          keyboardType="phone-pad"
                          maxLength={12}
                          value={form.phone}
                          onChangeText={(text) => {
                            const formatted = formatPhoneNumber(text);
                            setForm({ ...form, phone: formatted });
                            if (formatted.replace(/\D/g, '').length === 10) validateField('phone', formatted);
                          }}
                        />
                        {validationErrors.phone && <Text style={styles.compactErrorText}>{validationErrors.phone}</Text>}
                      </View>

                      {/* Address (Split Fields) */}
                      <View style={styles.compactFieldGroup}>
                        <View style={styles.compactLabelRow}>
                          <Text style={styles.compactFieldLabel}>Address</Text>
                          <Text style={styles.compactRequiredStar}>*</Text>
                        </View>

                        {/* Row 1 */}
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, color: '#4b5563', marginBottom: 4 }}>House No</Text>
                            <TextInput
                              placeholder="e.g., 123"
                              style={styles.compactInputField}
                              value={addressDetails.houseNo}
                              onChangeText={t => setAddressDetails(p => ({ ...p, houseNo: t }))}
                            />
                            {validationErrors.houseNo && <Text style={styles.compactErrorText}>{validationErrors.houseNo}</Text>}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, color: '#4b5563', marginBottom: 4 }}>Street/Landmark</Text>
                            <TextInput
                              placeholder="e.g., Main St"
                              style={styles.compactInputField}
                              value={addressDetails.street}
                              onChangeText={t => setAddressDetails(p => ({ ...p, street: t }))}
                            />
                            {validationErrors.street && <Text style={styles.compactErrorText}>{validationErrors.street}</Text>}
                          </View>
                        </View>

                        {/* Row 2 */}
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, color: '#4b5563', marginBottom: 4 }}>Area</Text>
                            <TextInput
                              placeholder="e.g., Downtown"
                              style={styles.compactInputField}
                              value={addressDetails.area}
                              onChangeText={t => setAddressDetails(p => ({ ...p, area: t }))}
                            />
                            {validationErrors.area && <Text style={styles.compactErrorText}>{validationErrors.area}</Text>}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, color: '#4b5563', marginBottom: 4 }}>City</Text>
                            <TextInput
                              placeholder="e.g., Mumbai"
                              style={styles.compactInputField}
                              value={addressDetails.city}
                              onChangeText={t => setAddressDetails(p => ({ ...p, city: t }))}
                            />
                            {validationErrors.city && <Text style={styles.compactErrorText}>{validationErrors.city}</Text>}
                          </View>
                        </View>

                        {/* Row 3 */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, color: '#4b5563', marginBottom: 4 }}>Pincode</Text>
                            <TextInput
                              placeholder="e.g., 400001"
                              keyboardType="numeric"
                              style={styles.compactInputField}
                              value={addressDetails.pincode}
                              onChangeText={t => setAddressDetails(p => ({ ...p, pincode: t }))}
                            />
                            {validationErrors.pincode && <Text style={styles.compactErrorText}>{validationErrors.pincode}</Text>}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, color: '#4b5563', marginBottom: 4 }}>State</Text>
                            <TextInput
                              placeholder="e.g., Maharashtra"
                              style={styles.compactInputField}
                              value={addressDetails.state}
                              onChangeText={t => setAddressDetails(p => ({ ...p, state: t }))}
                            />
                            {validationErrors.state && <Text style={styles.compactErrorText}>{validationErrors.state}</Text>}
                          </View>
                        </View>
                      </View>

                      {/* PAN Card */}
                      <View style={styles.compactFieldGroup}>
                        <View style={styles.compactLabelRow}>
                          <Text style={styles.compactFieldLabel}>PAN Card</Text>
                          <Text style={styles.compactRequiredStar}>*</Text>
                        </View>
                        <TextInput
                          placeholder="e.g., ABCDE1234F"
                          placeholderTextColor="#9ca3af"
                          style={styles.compactInputField}
                          autoCapitalize="characters"
                          maxLength={10}
                          value={form.pan_card}
                          editable={!editEmployee}
                          onChangeText={(text) => {
                            const formatted = formatPanCard(text);
                            setForm({ ...form, pan_card: formatted });
                            validateField('pan_card', formatted);
                          }}
                        />
                        {validationErrors.pan_card && <Text style={styles.compactErrorText}>{validationErrors.pan_card}</Text>}
                      </View>

                      {/* Aadhar Card */}
                      <View style={styles.compactFieldGroup}>
                        <View style={styles.compactLabelRow}>
                          <Text style={styles.compactFieldLabel}>Aadhar Card</Text>
                          <Text style={styles.compactRequiredStar}>*</Text>
                        </View>
                        <TextInput
                          placeholder="e.g., 1234-5678-9012"
                          placeholderTextColor="#9ca3af"
                          style={styles.compactInputField}
                          keyboardType="numeric"
                          maxLength={14}
                          value={form.aadhar_card}
                          editable={!editEmployee}
                          onChangeText={(text) => {
                            const cleaned = text.replace(/\D/g, '');
                            const formatted = formatAadharCard(cleaned);
                            setForm({ ...form, aadhar_card: formatted });
                            validateField('aadhar_card', formatted);
                          }}
                        />
                        {validationErrors.aadhar_card && <Text style={styles.compactErrorText}>{validationErrors.aadhar_card}</Text>}
                      </View>

                      {/* Shift Type */}
                      <Select
                        label="Shift"
                        required
                        items={[
                          { label: 'General (GS)', value: 'General (GS)' },
                          { label: 'Morning', value: 'Morning' },
                          { label: 'Afternoon', value: 'Afternoon' },
                          { label: 'Night', value: 'Night' },
                          { label: 'Rotational', value: 'Rotational' },
                        ]}
                        value={form.shift_type}
                        onValueChange={(v) => setForm({ ...form, shift_type: v })}
                        placeholder="Select Shift"
                        error={validationErrors.shift_type}
                      />

                      {/* Gender */}
                      <View style={styles.compactFieldGroup}>
                        <View style={styles.compactLabelRow}>
                          <Text style={styles.compactFieldLabel}>Gender</Text>
                          <Text style={styles.compactRequiredStar}>*</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 20, paddingTop: 5 }}>
                          {['Male', 'Female', 'Other'].map(option => (
                            <TouchableOpacity
                              key={option}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                              onPress={() => setForm({ ...form, gender: option })}
                            >
                              <View style={{
                                width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                                borderColor: form.gender === option ? '#3b82f6' : '#9ca3af',
                                justifyContent: 'center', alignItems: 'center'
                              }}>
                                {form.gender === option && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6' }} />}
                              </View>
                              <Text style={{ color: '#374151', fontSize: 13, fontWeight: '500' }}>{option}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {validationErrors.gender && <Text style={styles.compactErrorText}>{validationErrors.gender}</Text>}
                      </View>

                      {/* Employee Type */}
                      <Select
                        label="Employee Type"
                        required
                        items={[
                          { label: 'Contract-based', value: 'Contract-based' },
                          { label: 'Permanent', value: 'Permanent' },
                        ]}
                        value={form.employee_type}
                        onValueChange={(v) => setForm({ ...form, employee_type: v })}
                        placeholder="Select Employee Type"
                        error={validationErrors.employee_type}
                      />

                      {/* Date of Resignation (Only for edit) */}
                      {editEmployee && (
                        <View style={[styles.compactFieldGroup, { marginTop: 15 }]}>
                          <Text style={styles.compactFieldLabel}>Date of Resignation</Text>
                          <TouchableOpacity
                            style={[styles.compactInputField, { flexDirection: 'row', alignItems: 'center' }]}
                            onPress={() => setShowResignationDatePicker(true)}
                          >
                            <Text style={{ color: form.resignation_date ? '#1f2937' : '#9ca3af', flex: 1 }}>
                              {resignationDate ? formatDate(resignationDate) : "mm / dd / yyyy"}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                          </TouchableOpacity>
                          {showResignationDatePicker && (
                            <DateTimePicker
                              value={resignationDate || getCurrentISTTime()}
                              mode="date"
                              display="default"
                              onChange={handleResignationDateChange}
                            />
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </ScrollView>

                {/* Single Submit Button */}
                <View style={styles.premiumActionsBar}>
                  <View style={styles.premiumActionsInner}>
                    {/* Cancel Button */}
                    <TouchableOpacity
                      style={styles.premiumBackBtn}
                      onPress={resetForm}
                      activeOpacity={0.8}
                    >
                      <View style={styles.premiumBackBtnInner}>
                        <Ionicons name="close" size={20} color="#6b7280" />
                        <Text style={styles.premiumBackBtnText}>Cancel</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={styles.premiumNextBtn}
                      onPress={handleSave}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={editEmployee ? ["#10b981", "#059669"] : ["#6366f1", "#8b5cf6"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.premiumNextBtnGradient}
                      >
                        <Text style={styles.premiumNextBtnText}>
                          {editEmployee ? 'Update Employee' : 'Create Employee'}
                        </Text>
                        <View style={styles.premiumNextBtnIcon}>
                          <Ionicons
                            name={editEmployee ? "checkmark-circle" : "person-add"}
                            size={20}
                            color="#fff"
                          />
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </View>
        </Modal>

        {/* Premium Selection Picker Modal */}
        <Modal
          visible={pickerModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.pickerModalOverlay}
            activeOpacity={1}
            onPress={() => setPickerModalVisible(false)}
          >
            <View style={styles.pickerSheetContainer}>
              <View style={styles.pickerSheetHeader}>
                <Text style={styles.pickerSheetTitle}>{pickerConfig.title}</Text>
                <TouchableOpacity onPress={() => setPickerModalVisible(false)} style={styles.pickerCloseBtn}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.pickerOptionsList} showsVerticalScrollIndicator={false}>
                {pickerConfig.options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.pickerOptionItem,
                      pickerConfig.selectedValue === option.value && styles.pickerOptionItemActive
                    ]}
                    onPress={() => {
                      pickerConfig.onSelect(option.value);
                      setPickerModalVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      pickerConfig.selectedValue === option.value && styles.pickerOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                    {pickerConfig.selectedValue === option.value && (
                      <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Filter Modal - Enhanced */}
        <Modal visible={filterModalVisible} animationType="slide" transparent>
          <View style={styles.filterModalOverlay}>
            <View style={styles.filterModalContainer}>
              {/* Header */}
              <LinearGradient colors={["#3b82f6", "#1e40af"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.filterModalHeader}>
                <View style={styles.filterHeaderPattern}>
                  <View style={[styles.filterPatternCircle, { top: -20, right: -20, width: 100, height: 100 }]} />
                  <View style={[styles.filterPatternCircle, { bottom: -30, left: -30, width: 120, height: 120 }]} />
                </View>
                <View style={styles.filterHeaderTopRow}>
                  <View style={styles.filterHeaderContent}>
                    <View style={styles.filterHeaderIcon}>
                      <Ionicons name="funnel" size={24} color="#fff" />
                    </View>
                    <View style={styles.filterHeaderText}>
                      <Text style={styles.filterModalTitle}>Filter & Sort</Text>
                      <Text style={styles.filterModalSubtitle}>Organize your employee list</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.filterCloseBtn}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Department Filter Card */}
                <View style={styles.filterCard}>
                  <View style={styles.filterCardHeader}>
                    <View style={styles.filterCardIcon}>
                      <Ionicons name="business" size={18} color="#3b82f6" />
                    </View>
                    <Text style={styles.filterCardTitle}>Department</Text>
                  </View>
                  <View style={styles.filterChips}>
                    <TouchableOpacity style={[styles.filterChip, filters.department === '' && styles.filterChipActive]} onPress={() => setFilters({ ...filters, department: '' })}>
                      <Text style={[styles.filterChipText, filters.department === '' && styles.filterChipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {uniqueDepartments.map((dept, i) => (
                      <TouchableOpacity key={`dept-${i}`} style={[styles.filterChip, filters.department === dept && styles.filterChipActive]} onPress={() => setFilters({ ...filters, department: dept })}>
                        <Text style={[styles.filterChipText, filters.department === dept && styles.filterChipTextActive]}>{dept}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Role Filter Card */}
                <View style={styles.filterCard}>
                  <View style={styles.filterCardHeader}>
                    <View style={styles.filterCardIcon}>
                      <Ionicons name="shield" size={18} color="#8b5cf6" />
                    </View>
                    <Text style={styles.filterCardTitle}>Role</Text>
                  </View>
                  <View style={styles.filterChips}>
                    <TouchableOpacity style={[styles.filterChip, filters.role === '' && styles.filterChipActive]} onPress={() => setFilters({ ...filters, role: '' })}>
                      <Text style={[styles.filterChipText, filters.role === '' && styles.filterChipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {uniqueRoles.map((role, i) => (
                      <TouchableOpacity key={`role-${i}`} style={[styles.filterChip, filters.role === role && styles.filterChipActive]} onPress={() => setFilters({ ...filters, role: role })}>
                        <Text style={[styles.filterChipText, filters.role === role && styles.filterChipTextActive]}>{role}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Sort By Card */}
                <View style={styles.filterCard}>
                  <View style={styles.filterCardHeader}>
                    <View style={styles.filterCardIcon}>
                      <Ionicons name="swap-vertical" size={18} color="#10b981" />
                    </View>
                    <Text style={styles.filterCardTitle}>Sort By</Text>
                  </View>
                  <View style={styles.sortOptionsGrid}>
                    {[
                      { key: 'name', label: 'Name', icon: 'person-outline' },
                      { key: 'department', label: 'Department', icon: 'business-outline' },
                      { key: 'role', label: 'Briefcase', icon: 'briefcase-outline' }
                    ].map((opt) => (
                      <TouchableOpacity
                        key={opt.key}
                        style={[styles.sortOptionCard, filters.sortBy === opt.key && styles.sortOptionCardActive]}
                        onPress={() => setFilters({ ...filters, sortBy: opt.key })}
                      >
                        <View style={[styles.sortOptionIconBox, filters.sortBy === opt.key && styles.sortOptionIconBoxActive]}>
                          <Ionicons name={opt.icon as any} size={20} color={filters.sortBy === opt.key ? '#fff' : '#6b7280'} />
                        </View>
                        <Text style={[styles.sortOptionLabel, filters.sortBy === opt.key && styles.sortOptionLabelActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Sort Order Card */}
                <View style={styles.filterCard}>
                  <View style={styles.filterCardHeader}>
                    <View style={styles.filterCardIcon}>
                      <Ionicons name="swap-vertical" size={18} color="#f59e0b" />
                    </View>
                    <Text style={styles.filterCardTitle}>Sort Order</Text>
                  </View>
                  <View style={styles.sortOrderGrid}>
                    <TouchableOpacity
                      style={[styles.sortOrderCard, filters.sortOrder === 'asc' && styles.sortOrderCardActive]}
                      onPress={() => setFilters({ ...filters, sortOrder: 'asc' })}
                    >
                      <View style={[styles.sortOrderIconBox, filters.sortOrder === 'asc' && styles.sortOrderIconBoxActive]}>
                        <Ionicons name="arrow-up" size={20} color={filters.sortOrder === 'asc' ? '#fff' : '#6b7280'} />
                      </View>
                      <Text style={[styles.sortOrderLabel, filters.sortOrder === 'asc' && styles.sortOrderLabelActive]}>
                        Ascending
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sortOrderCard, filters.sortOrder === 'desc' && styles.sortOrderCardActive]}
                      onPress={() => setFilters({ ...filters, sortOrder: 'desc' })}
                    >
                      <View style={[styles.sortOrderIconBox, filters.sortOrder === 'desc' && styles.sortOrderIconBoxActive]}>
                        <Ionicons name="arrow-down" size={20} color={filters.sortOrder === 'desc' ? '#fff' : '#6b7280'} />
                      </View>
                      <Text style={[styles.sortOrderLabel, filters.sortOrder === 'desc' && styles.sortOrderLabelActive]}>
                        Descending
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Active Filters Summary */}
                {(filters.department !== '' || filters.role !== '') && (
                  <View style={styles.activeFiltersSummary}>
                    <View style={styles.activeFiltersHeader}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.activeFiltersTitle}>Active Filters</Text>
                    </View>
                    <View style={styles.activeFiltersTags}>
                      {filters.department !== '' && (
                        <View style={styles.filterTag}>
                          <Text style={styles.filterTagText}>{filters.department}</Text>
                          <TouchableOpacity onPress={() => setFilters({ ...filters, department: '' })}>
                            <Ionicons name="close" size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      )}
                      {filters.role !== '' && (
                        <View style={styles.filterTag}>
                          <Text style={styles.filterTagText}>{filters.role}</Text>
                          <TouchableOpacity onPress={() => setFilters({ ...filters, role: '' })}>
                            <Ionicons name="close" size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.filterActionsBar}>
                <TouchableOpacity style={styles.resetFilterBtnNew} onPress={resetFilters}>
                  <Ionicons name="refresh" size={18} color="#6b7280" />
                  <Text style={styles.resetFilterTextNew}>Reset All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyFilterBtnNew} onPress={applyFilters}>
                  <LinearGradient colors={["#3b82f6", "#1e40af"]} style={styles.applyFilterGradientNew}>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.applyFilterTextNew}>Apply Filters</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Next-Level View Employee Modal */}
        <Modal
          visible={viewModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setViewModalVisible(false)}
        >
          <View style={styles.viewModalOverlay}>
            <View style={styles.viewModalCard}>
              {/* Immersive Header */}
              <View style={styles.viewModalHeaderBg}>
                <LinearGradient
                  colors={getRoleBadgeColor(viewEmployee?.role).gradient}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.headerGlassOverlay} />

                <TouchableOpacity onPress={() => setViewModalVisible(false)} style={styles.viewModalCloseHeader}>
                  <Ionicons name="close-circle" size={32} color="#fff" />
                </TouchableOpacity>

                {/* Overlapping Profile Section */}
                <View style={styles.viewModalAvatarWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handlePhotoPress(getProfilePhotoUrl(viewEmployee?.profile_photo), viewEmployee?.name || '')}
                    style={styles.viewModalAvatarContainer}
                  >
                    {viewEmployee?.profile_photo ? (
                      <Image source={{ uri: getProfilePhotoUrl(viewEmployee.profile_photo)! }} style={styles.viewModalAvatar} />
                    ) : (
                      <View style={styles.viewModalAvatarPlaceholder}>
                        <Text style={styles.viewModalAvatarTextLarge}>{viewEmployee?.name?.charAt(0).toUpperCase() || "?"}</Text>
                      </View>
                    )}
                    <View style={[styles.avatarStatusGlow, { backgroundColor: viewEmployee?.is_active !== false ? '#10b981' : '#ef4444' }]} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.viewModalMainContent}>
                <View style={styles.viewHeaderInfo}>
                  <View style={styles.viewNameRow}>
                    <Text style={styles.viewNameText}>{viewEmployee?.name}</Text>
                    <View style={styles.viewIdBadgeCompact}>
                      <Text style={styles.viewIdBadgeTextCompact}>#{viewEmployee?.employee_id}</Text>
                    </View>
                  </View>
                  <View style={styles.viewBadgeRow}>
                    <View style={[styles.viewRoleBadge, { backgroundColor: getRoleBadgeColor(viewEmployee?.role).bg }]}>
                      <Text style={[styles.viewRoleBadgeText, { color: getRoleBadgeColor(viewEmployee?.role).text }]}>
                        {viewEmployee?.role?.toUpperCase() || "EMPLOYEE"}
                      </Text>
                    </View>
                    <View style={[styles.viewStatusBadge, { backgroundColor: viewEmployee?.is_active !== false ? '#d1fae5' : '#fee2e2' }]}>
                      <Text style={[styles.viewStatusBadgeText, { color: viewEmployee?.is_active !== false ? '#065f46' : '#991b1b' }]}>
                        {viewEmployee?.is_active !== false ? "ACTIVE" : "INACTIVE"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.viewDesignationText}>{viewEmployee?.designation || "Team Member"}</Text>
                </View>

                {/* Primary Actions Row (Wait - removed toggle button here per request) */}
                <View style={styles.viewActionButtonsRow}>
                  <TouchableOpacity style={styles.premiumEditBtn} onPress={() => { setViewModalVisible(false); handleEdit(viewEmployee!); }}>
                    <LinearGradient colors={["#6366f1", "#4f46e5"]} style={styles.actionBtnGradient}>
                      <Ionicons name="create-outline" size={20} color="#fff" />
                      <Text style={styles.actionBtnText}>Edit Profile</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.premiumDeleteBtn} onPress={() => handleDelete(viewEmployee?.id || viewEmployee?.user_id?.toString() || '')}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.viewDetailsScroll} showsVerticalScrollIndicator={false}>
                  {/* Contact Details Section */}
                  <View style={styles.infoSectionCard}>
                    <View style={styles.infoSectionHeader}>
                      <View style={styles.infoIconBox}>
                        <Ionicons name="mail-unread-outline" size={18} color="#6366f1" />
                      </View>
                      <Text style={styles.infoSectionTitle}>Contact Details</Text>
                    </View>

                    <View style={styles.detailFieldRow}>
                      <Text style={styles.detailFieldLabel}>EMAIL ADDRESS</Text>
                      <Text style={styles.detailFieldValue}>{viewEmployee?.email}</Text>
                    </View>

                    <View style={styles.detailFieldRow}>
                      <Text style={styles.detailFieldLabel}>PHONE NUMBER</Text>
                      <Text style={styles.detailFieldValue}>{viewEmployee?.phone || 'Not Shared'}</Text>
                    </View>

                    <View style={[styles.detailFieldRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.detailFieldLabel}>PRIMARY RESIDENCE</Text>
                      <Text style={styles.detailFieldValue}>{viewEmployee?.address || 'Address details not provided'}</Text>
                    </View>
                  </View>

                  {/* Work Profile Section */}
                  <View style={styles.infoSectionCard}>
                    <View style={styles.infoSectionHeader}>
                      <View style={styles.infoIconBox}>
                        <Ionicons name="shield-outline" size={18} color="#10b981" />
                      </View>
                      <Text style={styles.infoSectionTitle}>Work Profile</Text>
                    </View>

                    <View style={styles.detailFieldRow}>
                      <View style={styles.detailRowHalf}>
                        <Text style={styles.detailFieldLabel}>DEPARTMENT</Text>
                        <Text style={styles.detailFieldValue}>{viewEmployee?.department || 'General'}</Text>
                      </View>
                      <View style={styles.detailRowDivider} />
                      <View style={styles.detailRowHalf}>
                        <Text style={styles.detailFieldLabel}>EMPLOYEE ID</Text>
                        <Text style={styles.detailFieldValue}>{viewEmployee?.employee_id}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailFieldRow, { borderBottomWidth: 0 }]}>
                      <View style={styles.detailRowHalf}>
                        <Text style={styles.detailFieldLabel}>WORK SHIFT</Text>
                        <Text style={styles.detailFieldValue}>{viewEmployee?.shift_type || 'Day Shift'}</Text>
                      </View>
                      <View style={styles.detailRowDivider} />
                      <View style={styles.detailRowHalf}>
                        <Text style={styles.detailFieldLabel}>JOB TYPE</Text>
                        <Text style={styles.detailFieldValue}>{viewEmployee?.employee_type || 'Full Time'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Powerful Bottom Action Section */}
                  <View style={styles.statusActionWrapper}>
                    <View style={styles.statusActionShield}>
                      <Ionicons
                        name={viewEmployee?.is_active !== false ? "checkmark-circle-outline" : "alert-circle-outline"}
                        size={24}
                        color={viewEmployee?.is_active !== false ? "#10b981" : "#ef4444"}
                      />
                    </View>
                    <View style={styles.statusActionInfo}>
                      <Text style={styles.statusActionTitle}>
                        {viewEmployee?.is_active !== false ? "Deactivate Account" : "Activate Account"}
                      </Text>
                      <Text style={styles.statusActionDescription}>
                        {viewEmployee?.is_active !== false
                          ? "Temporarily disable access for this user."
                          : "Restore full system access for this employee."}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, { backgroundColor: viewEmployee?.is_active !== false ? '#fee2e2' : '#d1fae5' }]}
                      onPress={() => handleToggleStatus(viewEmployee!)}
                    >
                      <Text style={[styles.statusToggleBtnText, { color: viewEmployee?.is_active !== false ? '#ef4444' : '#10b981' }]}>
                        {viewEmployee?.is_active !== false ? "Disable" : "Enable"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ height: 40 }} />
                </ScrollView>
              </View>
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
      </View >
    </SafeAreaView >
  );
};

export default EmployeeManagement;


const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTopSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center", marginRight: 14,
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  headerTextSection: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#111827", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: "#64748b", marginTop: 2, fontWeight: "500" },
  headerRight: { flexDirection: "row", gap: 10 },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  // Stats Bar
  statsOverviewBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  miniStatItem: { alignItems: "center", flex: 1 },
  miniStatValue: { fontSize: 18, fontWeight: "900", color: "#111827", letterSpacing: -0.5 },
  miniStatLabel: { fontSize: 10, color: "#9ca3af", marginTop: 4, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, height: 24, backgroundColor: "#f1f5f9" },
  // Export Menu Modal
  exportMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportMenuContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    width: '85%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  exportMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  exportMenuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportMenuContent: {
    flex: 1,
  },
  exportMenuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  exportMenuDesc: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  exportMenuDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },


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
  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterModalContainer: { width: '100%', backgroundColor: '#f8fafc', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', maxHeight: '90%' },
  filterModalHeader: { paddingTop: 16, paddingBottom: 24, paddingHorizontal: 20, position: 'relative', overflow: 'hidden' },
  filterHeaderPattern: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  filterPatternCircle: { position: 'absolute', borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.1)' },
  filterHeaderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1, gap: 12 },
  filterHeaderContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  filterHeaderIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  filterHeaderText: { flex: 1 },
  filterModalTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  filterModalSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: '500' },
  filterCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', flexShrink: 0 },
  filterContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  filterCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  filterCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  filterCardIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center' },
  filterCardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  filterChipActive: { borderColor: '#3b82f6', backgroundColor: '#e0e7ff' },
  filterChipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  filterChipTextActive: { color: '#1d4ed8', fontWeight: '700' },
  sortOptionsGrid: { flexDirection: 'row', gap: 10 },
  sortOptionCard: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  sortOptionCardActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  sortOptionIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  sortOptionIconBoxActive: { backgroundColor: '#10b981' },
  sortOptionLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', textAlign: 'center' },
  sortOptionLabelActive: { color: '#059669', fontWeight: '700' },
  sortOrderGrid: { flexDirection: 'row', gap: 12 },
  sortOrderCard: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  sortOrderCardActive: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
  sortOrderIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  sortOrderIconBoxActive: { backgroundColor: '#f59e0b' },
  sortOrderLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', textAlign: 'center' },
  sortOrderLabelActive: { color: '#d97706', fontWeight: '700' },
  activeFiltersSummary: { borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#d1fae5', backgroundColor: '#ecfdf5' },
  activeFiltersHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  activeFiltersTitle: { fontSize: 13, fontWeight: '700', color: '#065f46' },
  activeFiltersTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#10b981' },
  filterTagText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  filterActionsBar: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: Platform.OS === 'ios' ? 24 : 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  resetFilterBtnNew: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  resetFilterTextNew: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  applyFilterBtnNew: { flex: 1, borderRadius: 12, overflow: 'hidden', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  applyFilterGradientNew: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 18 },
  applyFilterTextNew: { fontSize: 14, fontWeight: '700', color: '#fff' },
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
    fontSize: 14,
    color: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    width: '100%',
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
  compactPickerText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },

  // Picker Modal Styles
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  pickerSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  pickerCloseBtn: {
    padding: 4,
  },
  pickerOptionsList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pickerOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  pickerOptionItemActive: {
    backgroundColor: '#eff6ff',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  pickerOptionTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
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

  // View Toggle Styles
  viewToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginRight: 8,
  },
  viewToggleInner: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f5f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Grid View Styles
  gridContentContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 100,
  },
  empGridCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    margin: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  empGridAvatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  empGridAvatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
  },
  empGridAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empGridStatusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  empGridName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  empGridRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  empGridRoleText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  empGridDept: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },

  // ============ NEW CARD & VIEW MODAL STYLES ============
  empCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  empCardInactive: {
    backgroundColor: '#f8fafc',
    opacity: 0.75,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  empCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  empCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  empCardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
  },
  empCardAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empCardAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  empCardInfo: {
    flex: 1,
  },
  empCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  empCardRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  empRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  empRoleText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  empCardDept: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  empCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  empCardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  empCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  empFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  empFooterText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  empFooterItemInactive: {
    backgroundColor: '#fff1f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },

  // ============ NEXT-LEVEL VIEW MODAL STYLES ============
  viewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  viewModalCard: {
    backgroundColor: '#f8fafc',
    height: '92%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  viewModalHeaderBg: {
    height: 160,
    width: '100%',
    padding: 20,
  },
  headerGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewModalCloseHeader: {
    alignSelf: 'flex-end',
    zIndex: 10,
  },
  viewModalAvatarWrapper: {
    position: 'absolute',
    bottom: -50,
    left: 20,
    zIndex: 20,
  },
  viewModalAvatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 30,
    backgroundColor: '#fff',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  viewModalAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  viewModalAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModalAvatarTextLarge: {
    fontSize: 42,
    fontWeight: '800',
    color: '#374151',
  },
  avatarStatusGlow: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#fff',
  },
  viewModalMainContent: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  viewHeaderInfo: {
    marginBottom: 20,
  },
  viewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  viewNameText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  viewIdBadgeCompact: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  viewIdBadgeTextCompact: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  viewBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6,
  },
  viewRoleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewRoleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewDesignationText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  viewActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  premiumEditBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
  },
  actionBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  premiumDeleteBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fee2e2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteBtnText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 13,
  },
  viewDetailsScroll: {
    flex: 1,
  },
  infoSectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  infoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f5f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1f2937',
    letterSpacing: 0.2,
  },
  detailFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    flexWrap: 'wrap',
  },
  detailFieldLabel: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
    width: '100%',
  },
  detailFieldValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '700',
  },
  detailRowHalf: {
    flex: 1,
  },
  detailRowDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
  statusActionWrapper: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    marginBottom: 20,
  },
  statusActionShield: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusActionInfo: {
    flex: 1,
    marginRight: 8,
  },
  statusActionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  statusActionDescription: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },
  statusToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusToggleBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 20,
  },
});
