import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_CONFIG } from "../../config/api";
import { apiService, Employee, EmployeeData } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";


const EmployeeManagement = () => {
  const navigation = useNavigation();
  
  // Tab bar visibility hook
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();
  
  // Helper function to get full profile photo URL
  const getProfilePhotoUrl = (photoPath?: string): string | null => {
    if (!photoPath) return null;
    
    // If it's already a full URL (starts with http), return as is
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      return photoPath;
    }
    
    // If it's a file URI (from image picker), return as is
    if (photoPath.startsWith('file://')) {
      return photoPath;
    }
    
    // Otherwise, construct full URL from backend
    const baseUrl = API_CONFIG.getApiBaseUrl();
    // Remove leading slash if present to avoid double slashes
    const cleanPath = photoPath.startsWith('/') ? photoPath.substring(1) : photoPath;
    return `${baseUrl}/${cleanPath}`;
  };
  
  // Animation values for header elements
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const searchBarTranslateY = useRef(new Animated.Value(20)).current;
  const searchBarOpacity = useRef(new Animated.Value(0)).current;
  
  // State management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Animate header elements on component mount
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
      Animated.timing(searchBarOpacity, {
        toValue: 1,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(searchBarTranslateY, {
        toValue: 0,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, []);

  // Fetch employees on mount
  useEffect(() => {
    fetchEmployees();
    
    // Cleanup scroll timeout on unmount
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await apiService.getEmployees();
      console.log("📥 Fetched employees:", data.length, "employees");
      if (data.length > 0) {
        console.log("📋 Sample employee data:", {
          id: data[0].id,
          user_id: data[0].user_id,
          employee_id: data[0].employee_id,
          name: data[0].name
        });
      }
      setEmployees(data);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
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
      'Admin': { backgroundColor: '#fee2e2', color: '#991b1b' },
      'HR': { backgroundColor: '#fce7f3', color: '#831843' },
      'Manager': { backgroundColor: '#fed7aa', color: '#9a3412' },
      'Team Lead': { backgroundColor: '#bfdbfe', color: '#1e40af' },
      'TeamLead': { backgroundColor: '#bfdbfe', color: '#1e40af' },
      'Employee': { backgroundColor: '#d1fae5', color: '#065f46' },
    };
    
    const normalizedRole = role || 'Employee';
    return roleColors[normalizedRole] || roleColors['Employee'];
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
  
  // Scroll synchronization
  const scrollViewRefs = useRef<{ [key: string]: any }>({});
  const [scrollX, setScrollX] = useState(0);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<any>(null);
  
  const [form, setForm] = useState<Partial<Employee>>({
    employee_id: "",
    name: "",
    email: "",
    department: "",
    designation: "",
    role: "",
    phone: "",
    address: "",
    pan_card: "",
    aadhar_card: "",
    shift_type: "Day Shift",
    gender: "Male",
    employee_type: "Full-time Employee Type",
    profile_photo: "",
  });

  // Validation error states
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Synchronized scroll handler
  const handleScroll = (event: any, scrollViewId: string) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    
    // Clear any pending timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    // Prevent recursive scrolling
    if (isScrolling.current) {
      return;
    }
    
    isScrolling.current = true;
    
    try {
      // If header scrolls, sync all rows
      if (scrollViewId === 'header') {
        Object.keys(scrollViewRefs.current).forEach((key) => {
          if (key !== 'header' && scrollViewRefs.current[key]) {
            try {
              scrollViewRefs.current[key]?.scrollTo({ x: offsetX, animated: false });
            } catch (e) {
              // Ignore scroll errors for unmounted components
            }
          }
        });
      } 
      // If any row scrolls, only sync the header
      else {
        if (scrollViewRefs.current['header']) {
          try {
            scrollViewRefs.current['header']?.scrollTo({ x: offsetX, animated: false });
          } catch (e) {
            // Ignore scroll errors
          }
        }
      }
    } finally {
      // Reset scrolling flag after a short delay
      scrollTimeout.current = setTimeout(() => {
        isScrolling.current = false;
      }, 100);
    }
  };

  // Format date to DD/MM/YYYY
  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Handle date change from picker
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // Keep open on iOS
    if (selectedDate) {
      setJoiningDate(selectedDate);
      setForm({ ...form, resignation_date: formatDate(selectedDate) });
    }
  };

  // ✅ Reset Form
  const resetForm = () => {
    setForm({
      employee_id: "",
      name: "",
      email: "",
      department: "",
      designation: "",
      role: "",
      phone: "",
      address: "",
      pan_card: "",
      aadhar_card: "",
      shift_type: "Day Shift",
      gender: "Male",
      employee_type: "Full-time Employee Type",
      profile_photo: "",
    });
    setJoiningDate(new Date()); // Reset to current date
    setValidationErrors({}); // Clear validation errors
    setModalVisible(false);
  };
  
  // Filter Modal State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [exportMenuVisible, setExportMenuVisible] = useState(false);
  const [filters, setFilters] = useState({
    department: "",
    role: "",
    sortBy: "name",
    sortOrder: "asc",
  });

  // ✅ Open Image Picker (Expo Safe)
  const openImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Allow access to your photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        setForm({ ...form, profile_photo: result.assets[0].uri });
      }
    } catch (error) {
      console.error("Image Picker Error:", error);
      Alert.alert("Error", "Something went wrong while picking image");
    }
  };

  // ✅ Validation Functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Indian phone number: 10 digits
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validatePAN = (pan: string): boolean => {
    // PAN format: ABCDE1234F (5 letters, 4 digits, 1 letter)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  };

  const validateAadhar = (aadhar: string): boolean => {
    // Aadhar: 12 digits
    const aadharRegex = /^\d{12}$/;
    return aadharRegex.test(aadhar.replace(/\s/g, ''));
  };

  // Real-time field validation
  const validateField = (fieldName: string, value: string) => {
    const errors = { ...validationErrors };

    switch (fieldName) {
      case 'email':
        if (value && !validateEmail(value)) {
          errors.email = 'Invalid email format';
        } else {
          delete errors.email;
        }
        break;
      case 'phone':
        if (value && !validatePhone(value)) {
          errors.phone = 'Must be 10 digits (6-9 first)';
        } else {
          delete errors.phone;
        }
        break;
      case 'pan_card':
        if (value && !validatePAN(value)) {
          errors.pan_card = 'Format: ABCDE1234F';
        } else {
          delete errors.pan_card;
        }
        break;
      case 'aadhar_card':
        if (value && !validateAadhar(value)) {
          errors.aadhar_card = 'Must be 12 digits';
        } else {
          delete errors.aadhar_card;
        }
        break;
    }

    setValidationErrors(errors);
  };

  // ✅ Save or Update Employee (API) with Validation
  const handleSave = async () => {
    // Validate required fields
    const errors: string[] = [];

    // Employee ID
    if (!form.employee_id || form.employee_id.trim() === '') {
      errors.push("• Employee ID is required");
    }

    // Name
    if (!form.name || form.name.trim() === '') {
      errors.push("• Name is required");
    } else if (form.name.trim().length < 2) {
      errors.push("• Name must be at least 2 characters");
    }

    // Email
    if (!form.email || form.email.trim() === '') {
      errors.push("• Email is required");
    } else if (!validateEmail(form.email)) {
      errors.push("• Please enter a valid email address");
    }

    // Department
    if (!form.department || form.department === '') {
      errors.push("• Department is required");
    }

    // Role
    if (!form.role || form.role === '') {
      errors.push("• Role is required");
    }

    // Phone (optional but validate if provided)
    if (form.phone && form.phone.trim() !== '') {
      if (!validatePhone(form.phone)) {
        errors.push("• Phone number must be 10 digits starting with 6-9");
      }
    }

    // PAN Card
    if (!form.pan_card || form.pan_card.trim() === '') {
      errors.push("• PAN Card is required");
    } else if (!validatePAN(form.pan_card)) {
      errors.push("• PAN Card format is invalid (e.g., ABCDE1234F)");
    }

    // Aadhar Card
    if (!form.aadhar_card || form.aadhar_card.trim() === '') {
      errors.push("• Aadhar Card is required");
    } else if (!validateAadhar(form.aadhar_card)) {
      errors.push("• Aadhar Card must be 12 digits");
    }

    // Shift Type
    if (!form.shift_type || form.shift_type === '') {
      errors.push("• Shift Type is required");
    }

    // Employee Type
    if (!form.employee_type || form.employee_type === '') {
      errors.push("• Employee Type is required");
    }

    // If there are validation errors, show them
    if (errors.length > 0) {
      Alert.alert(
        "Validation Error",
        "Please fix the following errors:\n\n" + errors.join("\n"),
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setLoading(true);

      const employeeData: EmployeeData = {
        name: form.name!.trim(),
        email: form.email!.trim().toLowerCase(),
        employee_id: form.employee_id!.trim(),
        
        department: form.department || "",
        designation: form.designation?.trim() || "",
        role: form.role || "",
        phone: form.phone?.replace(/\s/g, '') || "",
        address: form.address?.trim() || "",
        pan_card: form.pan_card!.toUpperCase().trim(),
        aadhar_card: form.aadhar_card!.replace(/\s/g, ''),
        shift_type: form.shift_type || "Day Shift",
        gender: form.gender || "Male",
        employee_type: form.employee_type || "Full-time Employee Type",
      };

      // Include profile_photo if it exists
      if (form.profile_photo) {
        employeeData.profile_photo = form.profile_photo;
        if (form.profile_photo.startsWith("file://")) {
          console.log("📸 Including new profile photo:", form.profile_photo);
        } else {
          console.log("📸 Keeping existing profile photo:", form.profile_photo);
        }
      } else {
        console.log("⚠️ No profile photo");
      }

      if (editEmployee) {
        // Update existing employee - use user_id instead of id
        const userId = editEmployee.user_id?.toString() || editEmployee.id;
        await apiService.updateEmployee(userId, employeeData);
        Alert.alert("Success", "Employee updated successfully!");
        setEditEmployee(null);
      } else {
        // Create new employee
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

  // ✅ View Employee Details
  const handleView = (employee: Employee) => {
    setViewEmployee(employee);
    setViewModalVisible(true);
  };

  // ✅ Edit Employee
  const handleEdit = (employee: Employee) => {
    setEditEmployee(employee);
    setForm(employee);
    
    // Parse existing date if available
    if (employee.resignation_date) {
      const parts = employee.resignation_date.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        setJoiningDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
      }
    }
    
    setModalVisible(true);
  };

  // ✅ Delete Employee (API)
  const handleDelete = (id: string) => {
    Alert.alert("Delete Employee", "Are you sure you want to delete this record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await apiService.deleteEmployee(id);
            Alert.alert("Success", "Employee deleted successfully!");
            fetchEmployees();
          } catch (error: any) {
            console.error("Error deleting employee:", error);
            Alert.alert("Error", error.message || "Failed to delete employee");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // ✅ Toggle Employee Active/Inactive Status (API)
  const handleToggleStatus = (employee: Employee) => {
    const currentStatus = employee.is_active ?? true; // Default to true if undefined
    const newStatus = !currentStatus;
    const action = newStatus ? "activate" : "deactivate";
    
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Employee`,
      `Are you sure you want to ${action} ${employee.name}?`,
      [
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
              console.error(`Error ${action}ing employee:`, error);
              Alert.alert("Error", error.message || `Failed to ${action} employee`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ✅ Open Photo in Full Screen
  const handlePhotoPress = (photoUrl: string | null, employeeName: string) => {
    if (photoUrl) {
      setSelectedPhoto({ uri: photoUrl, name: employeeName });
      setPhotoModalVisible(true);
    }
  };

  // ✅ Handle Bulk Upload
  const handleBulkUpload = async () => {
    try {
      // Show info dialog first
      Alert.alert(
        "Bulk Upload Employees",
        "Upload employee data from CSV, Excel, or PDF file.\n\nSupported formats:\n• CSV (.csv)\n• Excel (.xlsx, .xls)\n• PDF (.pdf)\n\nRequired columns:\n• employee_id\n• name\n• email\n\nOptional: department, designation, phone, role, gender, shift_type, employee_type",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Select File",
            onPress: async () => {
              try {
                // Pick document using expo-document-picker
                // Accept CSV, Excel, and PDF files
                // Using '*/*' to allow all files, then validate by extension
                const result = await DocumentPicker.getDocumentAsync({
                  type: '*/*',
                  copyToCacheDirectory: true,
                });

                if (result.canceled) {
                  return;
                }

                const file = result.assets[0];
                
                console.log("📁 Selected file:", {
                  name: file.name,
                  uri: file.uri,
                  size: file.size,
                  mimeType: file.mimeType
                });
                
                // Validate file extension
                const validExtensions = ['.csv', '.xlsx', '.xls', '.pdf'];
                const fileName = file.name.toLowerCase();
                const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
                
                console.log("📋 File extension:", fileExtension);
                
                if (!validExtensions.includes(fileExtension)) {
                  Alert.alert(
                    "Invalid File", 
                    `Please select a CSV, Excel (.xlsx, .xls), or PDF file.\n\nYou selected: ${file.name}\nExtension: ${fileExtension}`
                  );
                  return;
                }

                setLoading(true);
                console.log("📤 Uploading file:", file.name, "Type:", fileExtension);
                console.log("📄 File URI:", file.uri);
                console.log("📊 File size:", file.size);
                
                // Determine MIME type based on extension (fallback if mimeType not provided)
                let mimeType = file.mimeType || 'application/octet-stream';
                
                // Override with correct MIME type based on extension
                if (fileExtension === '.csv') {
                  mimeType = 'text/csv';
                } else if (fileExtension === '.xlsx') {
                  mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                } else if (fileExtension === '.xls') {
                  mimeType = 'application/vnd.ms-excel';
                } else if (fileExtension === '.pdf') {
                  mimeType = 'application/pdf';
                }
                
                console.log("📋 MIME type (original):", file.mimeType);
                console.log("📋 MIME type (final):", mimeType);
                
                // Create file object for React Native
                const uploadFile = {
                  uri: file.uri,
                  type: mimeType,
                  name: file.name,
                  size: file.size,
                };
                
                console.log("📦 Upload file object:", uploadFile);
                console.log("🔗 API Base URL:", apiService.getBaseUrl());
                
                const uploadResponse = await apiService.bulkUploadEmployees(uploadFile);
                
                console.log("📊 Upload Response:", uploadResponse);
                
                let message = `✅ Successfully created: ${uploadResponse.created} employees`;
                if (uploadResponse.errors > 0) {
                  message += `\n❌ Errors: ${uploadResponse.errors}`;
                  
                  if (uploadResponse.error_details && uploadResponse.error_details.length > 0) {
                    console.log("📋 Upload errors:", uploadResponse.error_details);
                    
                    // Show first 3 errors in the alert
                    const firstErrors = uploadResponse.error_details.slice(0, 3);
                    message += `\n\nFirst errors:\n`;
                    firstErrors.forEach((error, index) => {
                      message += `${index + 1}. ${error}\n`;
                    });
                    
                    if (uploadResponse.error_details.length > 3) {
                      message += `\n...and ${uploadResponse.error_details.length - 3} more errors.`;
                    }
                    
                    message += `\n\nCheck console for all error details.`;
                  }
                }
                
                Alert.alert(
                  uploadResponse.created > 0 ? "Upload Complete" : "Upload Failed",
                  message,
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        if (uploadResponse.created > 0) {
                          fetchEmployees();
                        }
                      }
                    }
                  ]
                );
                
              } catch (error: any) {
                console.error("Bulk upload error:", error);
                Alert.alert("Upload Failed", error.message || "Failed to upload file");
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error("Document picker error:", error);
      Alert.alert("Error", "Failed to open file picker");
    }
  };

  // ✅ Filter Functions
  const getFilteredEmployees = () => {
    let filtered = employees.filter(emp => {
      const matchesSearch = searchQuery.trim() === '' || 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.department?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (emp.role?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      const matchesDepartment = filters.department === '' || emp.department === filters.department;
      const matchesRole = filters.role === '' || emp.role === filters.role;
      
      return matchesSearch && matchesDepartment && matchesRole;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[filters.sortBy as keyof Employee] || '';
      let bValue: any = b[filters.sortBy as keyof Employee] || '';
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (filters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  };

  const resetFilters = () => {
    setFilters({
      department: "",
      role: "",
      sortBy: "name",
      sortOrder: "asc",
    });
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
  };

  const handleExportAction = async (action: "csv" | "pdf" | "bulk") => {
    setExportMenuVisible(false);
    
    try {
      setLoading(true);
      
      if (action === "csv") {
        console.log("📥 Exporting CSV...");
        await apiService.exportEmployeesCSV();
        Alert.alert(
          "Success", 
          "CSV file downloaded successfully! You can now save or share it.",
          [{ text: "OK" }]
        );
      } else if (action === "pdf") {
        console.log("📥 Exporting PDF...");
        await apiService.exportEmployeesPDF();
        Alert.alert(
          "Success", 
          "PDF file downloaded successfully! You can now save or share it.",
          [{ text: "OK" }]
        );
      } else if (action === "bulk") {
        await handleBulkUpload();
      }
    } catch (error: any) {
      console.error("Error exporting:", error);
      Alert.alert(
        "Export Failed", 
        error.message || "Failed to export data. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Get unique departments and roles for filter options
  const uniqueDepartments = [...new Set(employees.map(emp => emp.department).filter(Boolean))].filter(dept => dept && dept.trim() !== '') as string[];
  const uniqueRoles = [...new Set(employees.map(emp => emp.role).filter(Boolean))].filter(role => role && role.trim() !== '') as string[];

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
            <Text style={styles.headerTitle}>Employee Management</Text>
            <Text style={styles.headerSubtitle}>Manage your team members</Text>
          </Animated.View>
          
          <View style={styles.headerActionGroup}>
            <TouchableOpacity 
              style={styles.headerIconButton}
              onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons name="filter-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIconButton}
              onPress={() => setExportMenuVisible((prev) => !prev)}
            >
              <Ionicons name="download-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {exportMenuVisible && (
          <View style={styles.exportMenuContainer}>
            <TouchableOpacity style={styles.exportMenuButton} onPress={() => handleExportAction("csv")}>
              <Ionicons name="document-text-outline" size={18} color="#1F2937" />
              <Text style={styles.exportMenuText}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportMenuButton} onPress={() => handleExportAction("pdf")}>
              <Ionicons name="document-outline" size={18} color="#1F2937" />
              <Text style={styles.exportMenuText}>Export PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportMenuButton} onPress={() => handleExportAction("bulk")}>
              <Ionicons name="cloud-upload-outline" size={18} color="#1F2937" />
              <Text style={styles.exportMenuText}>Bulk Upload</Text>
            </TouchableOpacity>
          </View>
        )}
        
        
      </View>
      
      <View style={styles.contentContainer}>
        {/* Search and Filters */}
        <Animated.View 
          style={[
            styles.searchAddContainer,
            { opacity: searchBarOpacity, transform: [{ translateY: searchBarTranslateY }] }
          ]}
        >
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.searchInputWrapper}
              contentContainerStyle={styles.searchInputContent}
            >
              <TextInput
                placeholder="Search by name, ID, or email..."
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </ScrollView>
          </View>
          
          <TouchableOpacity
            style={styles.filterButtonCompact}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="funnel-outline" size={20} color="#6b7280" />
            <Text style={styles.filterButtonText}>
              {filters.department || filters.role ? "Filtered" : "All"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setEditEmployee(null);
              resetForm();
              const today = new Date();
              setJoiningDate(today);
              setForm(prev => ({ ...prev, resignation_date: formatDate(today) }));
              setModalVisible(true);
            }}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </Animated.View>

        {/* 👥 Employee List */}
        {loading && employees.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
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
            data={getFilteredEmployees()}
            keyExtractor={(item) => item.user_id?.toString() || item.id || item.employee_id}
            onScroll={onScroll}
            scrollEventThrottle={scrollEventThrottle}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            contentContainerStyle={{
              paddingBottom: tabBarVisible ? tabBarHeight + 20 : 100,
            }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {searchQuery.trim() !== '' ? 'No matching employees found' : 'No employees added yet'}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => {
                  setEditEmployee(null);
                  resetForm();
                  setModalVisible(true);
                }}
              >
                <Text style={styles.emptyButtonText}>Add Employee</Text>
              </TouchableOpacity>
            </View>
          }
          ListHeaderComponent={
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              key="table-header"
              ref={(ref) => { scrollViewRefs.current['header'] = ref; }}
              onScroll={(e) => handleScroll(e, 'header')}
              scrollEventThrottle={16}
            >
              <View style={styles.tableHeader}>
                <View style={[styles.tableHeaderCell, { width: 60 }]}>
                  <Text style={styles.tableHeaderText}>Photo</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 100 }]}>
                  <Text style={styles.tableHeaderText}>Emp ID</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 140 }]}>
                  <Text style={styles.tableHeaderText}>Name</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 200 }]}>
                  <Text style={styles.tableHeaderText}>Email</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 120 }]}>
                  <Text style={styles.tableHeaderText}>Department</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 120 }]}>
                  <Text style={styles.tableHeaderText}>Role</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 80 }]}>
                  <Text style={styles.tableHeaderText}>Status</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 140 }]}>
                  <Text style={styles.tableHeaderText}>Actions</Text>
                </View>
              </View>
            </ScrollView>
          }
          renderItem={({ item }) => {
            const rowId = `row-${item.user_id || item.employee_id}`;
            return (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                key={item.user_id?.toString() || item.id || item.employee_id}
                ref={(ref) => { scrollViewRefs.current[rowId] = ref; }}
                onScroll={(e) => handleScroll(e, rowId)}
                scrollEventThrottle={16}
              >
                <View style={styles.tableRow}>
                {/* Photo */}
                <View style={[styles.tableCell, { width: 60 }]}>
                  <TouchableOpacity
                    onPress={() => handlePhotoPress(getProfilePhotoUrl(item.profile_photo), item.name)}
                    activeOpacity={getProfilePhotoUrl(item.profile_photo) ? 0.7 : 1}
                  >
                    {getProfilePhotoUrl(item.profile_photo) ? (
                      <Image
                        source={{ uri: getProfilePhotoUrl(item.profile_photo)! }}
                        style={styles.tableAvatar}
                        onError={(error) => {
                          console.log('❌ Failed to load profile photo:', item.profile_photo, error.nativeEvent.error);
                        }}
                      />
                    ) : (
                      <View style={styles.tableAvatarPlaceholder}>
                        <Text style={styles.tableAvatarText}>
                          {item.name?.charAt(0).toUpperCase() || "?"}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Employee ID */}
                <View style={[styles.tableCell, { width: 100 }]}>
                  <Text style={styles.tableCellTextBold} numberOfLines={1}>
                    {item.employee_id || "N/A"}
                  </Text>
                </View>

                {/* Name */}
                <View style={[styles.tableCell, { width: 140 }]}>
                  <Text style={styles.tableCellText} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

                {/* Email */}
                <View style={[styles.tableCell, { width: 200 }]}>
                  <Text style={styles.tableCellTextSmall} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>

                {/* Department */}
                <View style={[styles.tableCell, { width: 120 }]}>
                  <Text style={styles.tableCellText} numberOfLines={1}>
                    {item.department || "N/A"}
                  </Text>
                </View>

                {/* Role */}
                <View style={[styles.tableCell, { width: 120 }]}>
                  <View style={[styles.roleBadge, getRoleBadgeColor(item.role)]}>
                    <Text style={[styles.roleBadgeText, { color: getRoleBadgeColor(item.role).color }]}>
                      {item.role || "Employee"}
                    </Text>
                  </View>
                </View>

                {/* Status */}
                <View style={[styles.tableCell, { width: 80 }]}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.is_active ? '#d1fae5' : '#fee2e2' }
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      { color: item.is_active ? '#065f46' : '#991b1b' }
                    ]}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={[styles.tableCell, { width: 140, flexDirection: 'row', gap: 6 }]}>
                  <TouchableOpacity
                    onPress={() => handleView(item)}
                    style={styles.actionIconButton}
                  >
                    <Ionicons name="eye-outline" size={16} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleEdit(item)}
                    style={styles.actionIconButton}
                  >
                    <Ionicons name="create-outline" size={16} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.user_id?.toString() || item.id)}
                    style={styles.actionIconButton}
                  >
                    <Ionicons name="trash-outline" size={16} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleToggleStatus(item)}
                    style={[
                      styles.actionIconButton,
                      { backgroundColor: item.is_active ? '#fee2e2' : '#d1fae5' }
                    ]}
                  >
                    <Ionicons 
                      name={item.is_active ? "close-circle-outline" : "checkmark-circle-outline"} 
                      size={16} 
                      color={item.is_active ? "#991b1b" : "#065f46"} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
            );
          }}
          />
        </View>
        )}

        {/* 🧾 Add / Edit Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editEmployee ? "Edit Employee" : "Add New Employee"}
              </Text>

              <TouchableOpacity onPress={openImagePicker} style={styles.imagePicker}>
                {form.profile_photo ? (
                  <Image source={{ uri: form.profile_photo as string }} style={styles.imagePreview} />
                ) : (
                  <Text style={styles.imagePickerText}>Select Photo</Text>
                )}
              </TouchableOpacity>

              {/* Employee ID */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Employee ID *</Text>
                <TextInput
                  placeholder="Employee ID"
                  style={styles.input}
                  value={form.employee_id}
                  onChangeText={(text) => setForm({ ...form, employee_id: text })}
                />
              </View>

              {/* Name */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Name *</Text>
                <TextInput
                  placeholder="Full Name"
                  style={styles.input}
                  value={form.name}
                  onChangeText={(text) => setForm({ ...form, name: text })}
                />
              </View>

              {/* Email */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Email *</Text>
                <TextInput
                  placeholder="Email Address"
                  style={[styles.input, validationErrors.email && styles.inputError]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(text) => {
                    setForm({ ...form, email: text });
                    validateField('email', text);
                  }}
                  onBlur={() => validateField('email', form.email || '')}
                />
                {validationErrors.email && (
                  <Text style={styles.errorText}>{validationErrors.email}</Text>
                )}
              </View>


              {/* Department */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Department *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.department}
                    style={styles.picker}
                    onValueChange={(itemValue) => setForm({ ...form, department: itemValue })}
                  >
                    <Picker.Item label="Select Department" value="" />
                    <Picker.Item label="Engineering" value="Engineering" />
                    <Picker.Item label="Marketing" value="Marketing" />
                    <Picker.Item label="HR" value="HR" />
                    <Picker.Item label="Finance" value="Finance" />
                    <Picker.Item label="Operations" value="Operations" />
                    <Picker.Item label="Design" value="Design" />
                  </Picker>
                </View>
              </View>

              {/* Role */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Role *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.role}
                    style={styles.picker}
                    onValueChange={(itemValue) => setForm({ ...form, role: itemValue })}
                  >
                    <Picker.Item label="Select Role" value="" />
                    <Picker.Item label="Admin" value="Admin" />
                    <Picker.Item label="HR" value="HR" />
                    <Picker.Item label="Manager" value="Manager" />
                    <Picker.Item label="Team Lead" value="Team Lead" />
                    <Picker.Item label="Employee" value="Employee" />
                  </Picker>
                </View>
              </View>

              {/* Designation */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Designation</Text>
                <TextInput
                  placeholder="Job Designation"
                  style={styles.input}
                  value={form.designation}
                  onChangeText={(text) => setForm({ ...form, designation: text })}
                />
              </View>

              {/* Joining Date - Only show when adding new employee */}
              {!editEmployee && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Joining Date</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    <Text style={styles.datePickerText}>
                      {form.resignation_date || formatDate(joiningDate)}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6b7280" />
                  </TouchableOpacity>
                  
                  {showDatePicker && (
                    <DateTimePicker
                      value={joiningDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </View>
              )}

              {/* Country Code & Phone */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCodePicker}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    placeholder="9876543210"
                    style={[styles.phoneInput, validationErrors.phone && styles.inputError]}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={form.phone}
                    onChangeText={(text) => {
                      // Only allow digits
                      const cleaned = text.replace(/\D/g, '');
                      setForm({ ...form, phone: cleaned });
                      validateField('phone', cleaned);
                    }}
                    onBlur={() => validateField('phone', form.phone || '')}
                  />
                </View>
                {validationErrors.phone && (
                  <Text style={styles.errorText}>{validationErrors.phone}</Text>
                )}
              </View>

              {/* Address */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Address</Text>
                <TextInput
                  placeholder="Full Address"
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={3}
                  value={form.address}
                  onChangeText={(text) => setForm({ ...form, address: text })}
                />
              </View>

              {/* PAN Card */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>PAN Card *</Text>
                <TextInput
                  placeholder="e.g., ABCDE1234F"
                  style={[styles.input, validationErrors.pan_card && styles.inputError]}
                  autoCapitalize="characters"
                  maxLength={10}
                  value={form.pan_card}
                  onChangeText={(text) => {
                    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setForm({ ...form, pan_card: cleaned });
                    validateField('pan_card', cleaned);
                  }}
                  onBlur={() => validateField('pan_card', form.pan_card || '')}
                />
                {validationErrors.pan_card && (
                  <Text style={styles.errorText}>{validationErrors.pan_card}</Text>
                )}
              </View>

              {/* Aadhar Card */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Aadhar Card *</Text>
                <TextInput
                  placeholder="e.g., 123456789012"
                  style={[styles.input, validationErrors.aadhar_card && styles.inputError]}
                  keyboardType="number-pad"
                  maxLength={12}
                  value={form.aadhar_card}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/\D/g, '');
                    setForm({ ...form, aadhar_card: cleaned });
                    validateField('aadhar_card', cleaned);
                  }}
                  onBlur={() => validateField('aadhar_card', form.aadhar_card || '')}
                />
                {validationErrors.aadhar_card && (
                  <Text style={styles.errorText}>{validationErrors.aadhar_card}</Text>
                )}
              </View>

              {/* Shift */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Shift *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.shift_type}
                    style={styles.picker}
                    onValueChange={(itemValue) => setForm({ ...form, shift_type: itemValue })}
                  >
                    <Picker.Item label="Select Shift" value="" />
                    <Picker.Item label="Day Shift" value="Day Shift" />
                    <Picker.Item label="Night Shift" value="Night Shift" />
                    <Picker.Item label="Rotational" value="Rotational" />
                  </Picker>
                </View>
              </View>

              {/* Gender */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <View style={styles.radioContainer}>
                  <TouchableOpacity 
                    style={styles.radioOption}
                    onPress={() => setForm({ ...form, gender: "Male" })}
                  >
                    <View style={[styles.radioCircle, form.gender === "Male" && styles.radioSelected]} />
                    <Text style={styles.radioText}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.radioOption}
                    onPress={() => setForm({ ...form, gender: "Female" })}
                  >
                    <View style={[styles.radioCircle, form.gender === "Female" && styles.radioSelected]} />
                    <Text style={styles.radioText}>Female</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.radioOption}
                    onPress={() => setForm({ ...form, gender: "Other" })}
                  >
                    <View style={[styles.radioCircle, form.gender === "Other" && styles.radioSelected]} />
                    <Text style={styles.radioText}>Other</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Employee Type */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Employee Type *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.employee_type}
                    style={styles.picker}
                    onValueChange={(itemValue) => setForm({ ...form, employee_type: itemValue })}
                  >
                    <Picker.Item label="Select Employee Type" value="" />
                    <Picker.Item label="Full-time Employee Type" value="Full-time Employee Type" />
                    <Picker.Item label="Part-time Employee Type" value="Part-time Employee Type" />
                    <Picker.Item label="Contract Employee Type" value="Contract Employee Type" />
                    <Picker.Item label="Intern Employee Type" value="Intern Employee Type" />
                  </Picker>
                </View>
              </View>

              {/* Date of Resignation - Only show when editing */}
              {editEmployee && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Date of Resignation (Optional)</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    <Text style={styles.datePickerText}>
                      {form.resignation_date || "Not Set"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6b7280" />
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



              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#ccc" }]}
                  onPress={resetForm}
                >
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#4CAF50" }]}
                  onPress={handleSave}
                >
                  <Text style={{ color: "#fff" }}>
                    {editEmployee ? "Update" : "Create"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* 🔍 Professional Filter Modal */}
        <Modal visible={filterModalVisible} animationType="slide" transparent>
          <View style={styles.filterModalContainer}>
            <View style={styles.filterModalContent}>
              {/* Filter Header */}
              <View style={styles.filterHeader}>
                <View style={styles.filterHeaderLeft}>
                  <View style={styles.filterIconContainer}>
                    <Ionicons name="funnel" size={24} color="#4A90E2" />
                  </View>
                  <View>
                    <Text style={styles.filterTitle}>Filter & Sort</Text>
                    <Text style={styles.filterSubtitle}>Customize your employee view</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.filterCloseButton}
                  onPress={() => setFilterModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
                {/* Department Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Department</Text>
                  <View style={styles.filterOptionsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        filters.department === '' && styles.filterOptionActive
                      ]}
                      onPress={() => setFilters({...filters, department: ''})}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filters.department === '' && styles.filterOptionTextActive
                      ]}>All Departments</Text>
                    </TouchableOpacity>
                    {uniqueDepartments.map((dept, index) => (
                      <TouchableOpacity
                        key={`dept-${index}-${dept}`}
                        style={[
                          styles.filterOption,
                          filters.department === dept && styles.filterOptionActive
                        ]}
                        onPress={() => setFilters({...filters, department: dept})}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          filters.department === dept && styles.filterOptionTextActive
                        ]}>{dept}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Role Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Role</Text>
                  <View style={styles.filterOptionsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        filters.role === '' && styles.filterOptionActive
                      ]}
                      onPress={() => setFilters({...filters, role: ''})}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filters.role === '' && styles.filterOptionTextActive
                      ]}>Filtered</Text>
                    </TouchableOpacity>
                    {uniqueRoles.map((role, index) => (
                      <TouchableOpacity
                        key={`role-${index}-${role}`}
                        style={[
                          styles.filterOption,
                          filters.role === role && styles.filterOptionActive
                        ]}
                        onPress={() => setFilters({...filters, role: role})}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          filters.role === role && styles.filterOptionTextActive
                        ]}>{role}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Sort Options */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Sort By</Text>
                  <View style={styles.sortContainer}>
                    {[
                      { key: 'name', label: 'Name', icon: 'person-outline' },
                      { key: 'department', label: 'Department', icon: 'business-outline' },
                      { key: 'role', label: 'Role', icon: 'briefcase-outline' },
                      { key: 'email', label: 'Email', icon: 'mail-outline' }
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.sortOption,
                          filters.sortBy === option.key && styles.sortOptionActive
                        ]}
                        onPress={() => setFilters({...filters, sortBy: option.key})}
                      >
                        <Ionicons 
                          name={option.icon as any} 
                          size={20} 
                          color={filters.sortBy === option.key ? '#4A90E2' : '#6b7280'} 
                        />
                        <Text style={[
                          styles.sortOptionText,
                          filters.sortBy === option.key && styles.sortOptionTextActive
                        ]}>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Sort Order */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Sort Order</Text>
                  <View style={styles.sortOrderContainer}>
                    <TouchableOpacity
                      style={[
                        styles.sortOrderOption,
                        filters.sortOrder === 'asc' && styles.sortOrderOptionActive
                      ]}
                      onPress={() => setFilters({...filters, sortOrder: 'asc'})}
                    >
                      <Ionicons 
                        name="arrow-up" 
                        size={20} 
                        color={filters.sortOrder === 'asc' ? '#4A90E2' : '#6b7280'} 
                      />
                      <Text style={[
                        styles.sortOrderText,
                        filters.sortOrder === 'asc' && styles.sortOrderTextActive
                      ]}>Ascending</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.sortOrderOption,
                        filters.sortOrder === 'desc' && styles.sortOrderOptionActive
                      ]}
                      onPress={() => setFilters({...filters, sortOrder: 'desc'})}
                    >
                      <Ionicons 
                        name="arrow-down" 
                        size={20} 
                        color={filters.sortOrder === 'desc' ? '#4A90E2' : '#6b7280'} 
                      />
                      <Text style={[
                        styles.sortOrderText,
                        filters.sortOrder === 'desc' && styles.sortOrderTextActive
                      ]}>Descending</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              {/* Filter Actions */}
              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={resetFilters}
                >
                  <Ionicons name="refresh-outline" size={20} color="#6b7280" />
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={applyFilters}
                >
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 👁️ View Employee Profile Modal */}
        <Modal visible={viewModalVisible} animationType="fade" transparent>
          <View style={styles.viewModalOverlay}>
            <View style={styles.viewModalContent}>
              {/* Header */}
              <View style={styles.viewModalHeader}>
                <View>
                  <Text style={styles.viewModalTitle}>Employee Profile</Text>
                  <Text style={styles.viewModalSubtitle}>Quick profile preview</Text>
                </View>
                <TouchableOpacity
                  style={styles.viewModalCloseButton}
                  onPress={() => setViewModalVisible(false)}
                >
                  <Ionicons name="close-circle" size={32} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Photo and Name */}
                <View style={styles.viewProfileSection}>
                  {viewEmployee?.profile_photo ? (
                    <Image
                      source={{ uri: viewEmployee.profile_photo }}
                      style={styles.viewProfilePhoto}
                    />
                  ) : (
                    <View style={styles.viewProfilePhotoPlaceholder}>
                      <Text style={styles.viewProfilePhotoText}>
                        {viewEmployee?.name?.charAt(0).toUpperCase() || "?"}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.viewProfileName}>{viewEmployee?.name}</Text>
                  <Text style={styles.viewProfileDesignation}>
                    {viewEmployee?.designation || "Employee"}
                  </Text>
                  <View style={styles.viewStatusBadge}>
                    <Text style={styles.viewStatusText}>
                      {viewEmployee?.is_verified ? "active" : "inactive"}
                    </Text>
                  </View>
                </View>

                {/* Employee Details */}
                <View style={styles.viewDetailsSection}>
                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailLabel}>Employee ID</Text>
                    <Text style={styles.viewDetailValue}>
                      {viewEmployee?.employee_id || "N/A"}
                    </Text>
                  </View>

                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailLabel}>Email</Text>
                    <Text style={styles.viewDetailValue}>
                      {viewEmployee?.email}
                    </Text>
                  </View>

                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailLabel}>Department</Text>
                    <Text style={styles.viewDetailValue}>
                      {viewEmployee?.department || "N/A"}
                    </Text>
                  </View>

                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailLabel}>Role</Text>
                    <Text style={styles.viewDetailValue}>
                      {viewEmployee?.role || "Employee"}
                    </Text>
                  </View>

                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailLabel}>Phone</Text>
                    <Text style={styles.viewDetailValue}>
                      {viewEmployee?.phone || "-"}
                    </Text>
                  </View>

                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailLabel}>Gender</Text>
                    <Text style={styles.viewDetailValue}>
                      {viewEmployee?.gender || "-"}
                    </Text>
                  </View>

                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailLabel}>Employee Type</Text>
                    <Text style={styles.viewDetailValue}>
                      {viewEmployee?.employee_type || "-"}
                    </Text>
                  </View>

                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailLabel}>Resignation Date</Text>
                    <Text style={styles.viewDetailValue}>
                      {viewEmployee?.resignation_date || "-"}
                    </Text>
                  </View>

                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailLabel}>PAN Card</Text>
                    <Text style={styles.viewDetailValue}>
                      {viewEmployee?.pan_card || "-"}
                    </Text>
                  </View>

                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailLabel}>Aadhar Card</Text>
                    <Text style={styles.viewDetailValue}>
                      {viewEmployee?.aadhar_card || "-"}
                    </Text>
                  </View>

                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailLabel}>Shift</Text>
                    <Text style={styles.viewDetailValue}>
                      {viewEmployee?.shift_type || "-"}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* 📸 Full Screen Photo Modal */}
        <Modal
          visible={photoModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPhotoModalVisible(false)}
        >
          <View style={styles.photoModalOverlay}>
            <TouchableOpacity
              style={styles.photoModalCloseArea}
              activeOpacity={1}
              onPress={() => setPhotoModalVisible(false)}
            >
              <View style={styles.photoModalHeader}>
                <Text style={styles.photoModalTitle}>{selectedPhoto?.name}</Text>
                <TouchableOpacity
                  style={styles.photoModalCloseButton}
                  onPress={() => setPhotoModalVisible(false)}
                >
                  <Ionicons name="close-circle" size={36} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.photoModalContent}>
                {selectedPhoto?.uri ? (
                  <Image
                    source={{ uri: selectedPhoto.uri }}
                    style={styles.photoModalImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.photoModalPlaceholder}>
                    <Ionicons name="image-outline" size={80} color="#fff" />
                    <Text style={styles.photoModalPlaceholderText}>No photo available</Text>
                  </View>
                )}
              </View>

              <Text style={styles.photoModalHint}>Tap anywhere to close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default EmployeeManagement;

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
  headerActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  exportMenuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 12,
  },
  exportMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 3,
    borderRadius: 30,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 9,
  },
  exportMenuText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
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
  searchAddContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchInputContent: {
    flexGrow: 1,
  },
  searchInput: {
    minWidth: 250,
    height: 48,
    fontSize: 15,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  container: {
    flex: 1,
  },
  // Table Styles
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 2,
    minWidth: 960, // Total width of all columns (60+100+140+200+120+120+80+140)
  },
  tableHeaderCell: {
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'center',
    minHeight: 54,
    minWidth: 960, // Total width of all columns
  },
  tableCell: {
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tableCellText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '400',
  },
  tableCellTextBold: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  tableCellTextSmall: {
    fontSize: 12,
    color: '#6b7280',
  },
  tableAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
  },
  tableAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    color: '#065f46',
    fontSize: 11,
    fontWeight: '600',
  },
  actionIconButton: {
    width: 28,
    height: 28,
    borderRadius: 5,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#00000099",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    margin: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  imagePicker: {
    alignSelf: "center",
    marginBottom: 10,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePickerText: { color: "#555" },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 10,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
  },
  scrollHintText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  // Filter Modal Styles
  filterModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  filterModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  filterSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  filterCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  filterOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: 'white',
  },
  sortContainer: {
    gap: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    marginBottom: 8,
  },
  sortOptionActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#4A90E2',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  sortOrderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  sortOrderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  sortOrderOptionActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#4A90E2',
  },
  sortOrderText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    fontWeight: '500',
  },
  sortOrderTextActive: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  resetButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
    marginLeft: 6,
  },
  applyButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#4A90E2',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  applyButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  // View Modal Styles
  viewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  viewModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  viewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  viewModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  viewModalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  viewModalCloseButton: {
    padding: 4,
  },
  viewProfileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  viewProfilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    backgroundColor: '#e5e7eb',
  },
  viewProfilePhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewProfilePhotoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  viewProfileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  viewProfileDesignation: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 12,
  },
  viewStatusBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewStatusText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  viewDetailsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  viewDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  viewDetailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  viewDetailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  // New Form Field Styles
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    gap: 10,
  },
  datePickerText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodePicker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
  },
  countryCodeText: {
    fontSize: 14,
    color: '#374151',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  radioSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  radioText: {
    fontSize: 14,
    color: '#374151',
  },
  // Photo Modal Styles
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  photoModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  photoModalCloseButton: {
    padding: 8,
  },
  photoModalContent: {
    width: '100%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalImage: {
    width: '90%',
    height: '100%',
    borderRadius: 12,
  },
  photoModalPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalPlaceholderText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    opacity: 0.7,
  },
  photoModalHint: {
    position: 'absolute',
    bottom: 50,
    color: '#fff',
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
});
