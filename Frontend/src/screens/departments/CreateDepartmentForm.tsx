import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { useAutoHideTabBarOnScroll } from '../../navigation/tabBarVisibility';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Department {
  id?: string;
  name: string;
  code: string;
  managerId: string;
  description: string;
  status: 'active' | 'inactive';
  employeeCount: number;
  budget: number;
  location: string;
}

const CreateDepartmentForm = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const editDepartment = (route.params as any)?.department;
  const isEditMode = !!editDepartment;
  const { onScroll, scrollEventThrottle, tabBarHeight } = useAutoHideTabBarOnScroll();

  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  // Form state
  const [form, setForm] = useState<Department>({
    name: editDepartment?.name || '',
    code: editDepartment?.code || '',
    managerId: editDepartment?.managerId || '',
    description: editDepartment?.description || '',
    status: editDepartment?.status || 'active',
    employeeCount: editDepartment?.employeeCount || 0,
    budget: editDepartment?.budget || 0,
    location: editDepartment?.location || '',
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const managers = [
    { id: 'manager1', name: 'John Smith' },
    { id: 'manager2', name: 'Sarah Johnson' },
    { id: 'manager3', name: 'Michael Chen' },
    { id: 'manager4', name: 'Emma Wilson' },
  ];

  const steps = [
    { title: 'Basic Info', icon: 'information-circle-outline' },
    { title: 'Management', icon: 'people-outline' },
    { title: 'Details', icon: 'document-text-outline' },
  ];

  // Animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    updateProgress();
  }, [currentStep]);

  const updateProgress = () => {
    const progress = ((currentStep + 1) / steps.length) * 100;
    Animated.timing(progressWidth, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0:
        if (!form.name.trim()) newErrors.name = 'Department name is required';
        if (!form.code.trim()) newErrors.code = 'Department code is required';
        if (form.code.length > 5) newErrors.code = 'Code must be 5 characters or less';
        break;
      case 1:
        if (!form.managerId) newErrors.managerId = 'Please select a manager';
        break;
      case 2:
        if (!form.location.trim()) newErrors.location = 'Location is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      Alert.alert(
        'Success',
        `Department ${isEditMode ? 'updated' : 'created'} successfully!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Basic Information</Text>
            <Text style={styles.stepSubtitle}>Let's start with the department basics</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="business-outline" size={16} color="#667eea" /> Department Name *
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  value={form.name}
                  onChangeText={(text) => setForm({ ...form, name: text })}
                  placeholder="Enter department name"
                  placeholderTextColor="#9ca3af"
                />
                {form.name && !errors.name && (
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" style={styles.inputIcon} />
                )}
              </View>
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="code-outline" size={16} color="#667eea" /> Department Code *
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, styles.codeInput, errors.code && styles.inputError]}
                  value={form.code}
                  onChangeText={(text) => setForm({ ...form, code: text.toUpperCase() })}
                  placeholder="e.g., ENG, MKT, HR"
                  placeholderTextColor="#9ca3af"
                  maxLength={5}
                />
                {form.code && !errors.code && (
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" style={styles.inputIcon} />
                )}
              </View>
              {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="toggle-outline" size={16} color="#667eea" /> Status
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.status}
                  onValueChange={(value) => setForm({ ...form, status: value as 'active' | 'inactive' })}
                  style={styles.picker}
                >
                  <Picker.Item label="Active" value="active" />
                  <Picker.Item label="Inactive" value="inactive" />
                </Picker>
                <Ionicons name="chevron-down" size={20} color="#6b7280" style={styles.pickerIcon} />
              </View>
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Management & Team</Text>
            <Text style={styles.stepSubtitle}>Assign manager and set team size</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="person-outline" size={16} color="#667eea" /> Department Manager *
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.managerId}
                  onValueChange={(value) => setForm({ ...form, managerId: value })}
                  style={[styles.picker, errors.managerId && styles.inputError]}
                >
                  <Picker.Item label="Select Manager" value="" />
                  {managers.map((manager) => (
                    <Picker.Item key={manager.id} label={manager.name} value={manager.id} />
                  ))}
                </Picker>
                <Ionicons name="chevron-down" size={20} color="#6b7280" style={styles.pickerIcon} />
              </View>
              {errors.managerId && <Text style={styles.errorText}>{errors.managerId}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="people-outline" size={16} color="#667eea" /> Number of Employees
              </Text>
              <View style={styles.numberInputContainer}>
                <TextInput
                  style={styles.numberInput}
                  value={String(form.employeeCount)}
                  onChangeText={(text) => setForm({ ...form, employeeCount: parseInt(text) || 0 })}
                  keyboardType="numeric"
                  placeholder="0"
                />
                <View style={styles.numberButtons}>
                  <TouchableOpacity
                    style={styles.numberButton}
                    onPress={() => setForm({ ...form, employeeCount: form.employeeCount + 1 })}
                  >
                    <Ionicons name="add" size={16} color="#667eea" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.numberButton}
                    onPress={() => setForm({ ...form, employeeCount: Math.max(0, form.employeeCount - 1) })}
                  >
                    <Ionicons name="remove" size={16} color="#667eea" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="cash-outline" size={16} color="#667eea" /> Annual Budget (₹)
              </Text>
              <View style={styles.numberInputContainer}>
                <TextInput
                  style={styles.numberInput}
                  value={String(form.budget)}
                  onChangeText={(text) => setForm({ ...form, budget: parseInt(text) || 0 })}
                  keyboardType="numeric"
                  placeholder="0"
                />
                <View style={styles.numberButtons}>
                  <TouchableOpacity
                    style={styles.numberButton}
                    onPress={() => setForm({ ...form, budget: form.budget + 100000 })}
                  >
                    <Ionicons name="add" size={16} color="#667eea" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.numberButton}
                    onPress={() => setForm({ ...form, budget: Math.max(0, form.budget - 100000) })}
                  >
                    <Ionicons name="remove" size={16} color="#667eea" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Additional Details</Text>
            <Text style={styles.stepSubtitle}>Complete the department information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="location-outline" size={16} color="#667eea" /> Location *
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, errors.location && styles.inputError]}
                  value={form.location}
                  onChangeText={(text) => setForm({ ...form, location: text })}
                  placeholder="e.g., Building A, Floor 3"
                  placeholderTextColor="#9ca3af"
                />
                {form.location && !errors.location && (
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" style={styles.inputIcon} />
                )}
              </View>
              {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="document-text-outline" size={16} color="#667eea" /> Description
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                placeholder="Brief description of the department's responsibilities..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Department Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Name:</Text>
                <Text style={styles.summaryValue}>{form.name || 'Not specified'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Code:</Text>
                <Text style={styles.summaryValue}>{form.code || 'Not specified'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Manager:</Text>
                <Text style={styles.summaryValue}>
                  {managers.find(m => m.id === form.managerId)?.name || 'Not selected'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Employees:</Text>
                <Text style={styles.summaryValue}>{form.employeeCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Budget:</Text>
                <Text style={styles.summaryValue}>₹{form.budget.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }]
            }
          ]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>
                {isEditMode ? 'Edit Department' : 'Create Department'}
              </Text>
              <Text style={styles.headerSubtitle}>
                Step {currentStep + 1} of {steps.length}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressWidth.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(((currentStep + 1) / steps.length) * 100)}%</Text>
          </View>

          {/* Steps Indicator */}
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepIndicator}>
                <View
                  style={[
                    styles.stepCircle,
                    index <= currentStep && styles.stepCircleActive,
                  ]}
                >
                  <Ionicons
                    name={step.icon as any}
                    size={16}
                    color={index <= currentStep ? '#ffffff' : '#a5b4fc'}
                  />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    index <= currentStep && styles.stepLabelActive,
                  ]}
                >
                  {step.title}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Form Content */}
      <Animated.View
        style={[
          styles.formContainer,
          {
            opacity: formOpacity,
            transform: [{ translateY: formTranslateY }]
          }
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + tabBarHeight }]}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          {renderStepContent()}
        </ScrollView>

        {/* Navigation Buttons */}
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', '#ffffff']}
          style={styles.navigationContainer}
        >
          <View style={styles.navigationButtons}>
            {currentStep > 0 && (
              <TouchableOpacity style={styles.prevButton} onPress={prevStep}>
                <Ionicons name="chevron-back" size={20} color="#667eea" />
                <Text style={styles.prevButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.nextButton, currentStep === 0 && styles.nextButtonFull]}
            >
              <TouchableOpacity style={styles.nextButtonInner} onPress={nextStep}>
                <Text style={styles.nextButtonText}>
                  {currentStep === steps.length - 1 
                    ? (isEditMode ? 'Update Department' : 'Create Department')
                    : 'Next Step'
                  }
                </Text>
                <Ionicons 
                  name={currentStep === steps.length - 1 ? "checkmark" : "chevron-forward"} 
                  size={20} 
                  color="#ffffff" 
                />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </LinearGradient>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 20,
  },
  headerContent: {
    gap: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    minWidth: 35,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepIndicator: {
    alignItems: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#ffffff',
  },
  stepLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  stepContent: {
    gap: 24,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
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
  inputError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
    top: 16,
  },
  codeInput: {
    textTransform: 'uppercase',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  pickerContainer: {
    position: 'relative',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  picker: {
    height: 54,
    color: '#1f2937',
  },
  pickerIcon: {
    position: 'absolute',
    right: 12,
    top: 17,
    pointerEvents: 'none',
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  numberInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  numberButtons: {
    flexDirection: 'column',
  },
  numberButton: {
    width: 40,
    height: 27,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  prevButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#667eea',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  nextButton: {
    flex: 2,
    borderRadius: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default CreateDepartmentForm;
