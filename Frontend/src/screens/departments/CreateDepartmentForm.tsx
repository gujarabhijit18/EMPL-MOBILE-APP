import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService, DepartmentCreate, DepartmentManager, DepartmentResponse, DepartmentUpdate } from '../../lib/api';
import { useAutoHideTabBarOnScroll } from '../../navigation/tabBarVisibility';

interface FormData {
  name: string;
  code: string;
  manager_id: number | null;
  description: string;
  status: 'active' | 'inactive';
  employee_count: number;
  budget: number;
  location: string;
}

const CreateDepartmentForm = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { department?: DepartmentResponse; managers?: DepartmentManager[] } | undefined;
  const editDepartment = params?.department;
  const passedManagers = params?.managers;
  const isEditMode = !!editDepartment;
  const { onScroll, scrollEventThrottle, tabBarHeight } = useAutoHideTabBarOnScroll();

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  const [managers, setManagers] = useState<DepartmentManager[]>(passedManagers || []);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: editDepartment?.name || '',
    code: editDepartment?.code || '',
    manager_id: editDepartment?.manager_id || null,
    description: editDepartment?.description || '',
    status: (editDepartment?.status as 'active' | 'inactive') || 'active',
    employee_count: editDepartment?.employee_count || 0,
    budget: editDepartment?.budget || 0,
    location: editDepartment?.location || '',
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    { title: 'Basic Info', icon: 'information-circle-outline' },
    { title: 'Management', icon: 'people-outline' },
    { title: 'Details', icon: 'document-text-outline' },
  ];

  useEffect(() => {
    if (!passedManagers || passedManagers.length === 0) {
      apiService.getDepartmentManagers().then(setManagers).catch(console.error);
    }
  }, [passedManagers]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(headerTranslateY, { toValue: 0, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.back(1.2)) }),
      Animated.timing(formOpacity, { toValue: 1, duration: 1000, delay: 300, useNativeDriver: true }),
      Animated.timing(formTranslateY, { toValue: 0, duration: 1000, delay: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
    const progress = ((currentStep + 1) / steps.length) * 100;
    Animated.timing(progressWidth, { toValue: progress, duration: 500, useNativeDriver: false, easing: Easing.out(Easing.cubic) }).start();
  }, [currentStep]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 0) {
      if (!form.name.trim()) newErrors.name = 'Department name is required';
      if (!form.code.trim()) newErrors.code = 'Department code is required';
      if (form.code.length > 5) newErrors.code = 'Code must be 5 characters or less';
    }
    // Manager is optional - no validation required for step 1
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
      else handleSubmit();
    }
  };

  const prevStep = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    setSubmitting(true);
    try {
      const data = {
        name: form.name,
        code: form.code.toUpperCase(),
        manager_id: form.manager_id || undefined,
        description: form.description || undefined,
        status: form.status,
        employee_count: form.employee_count,
        budget: form.budget,
        location: form.location || undefined,
      };
      if (isEditMode && editDepartment) {
        await apiService.updateDepartment(editDepartment.id, data as DepartmentUpdate);
        Alert.alert('Success', 'Department updated successfully!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await apiService.createDepartment(data as DepartmentCreate);
        Alert.alert('Success', 'Department created successfully!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save department');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepSubtitle}>Let's start with the department basics</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}><Ionicons name="business-outline" size={16} color="#667eea" /> Department Name *</Text>
        <TextInput style={[styles.input, errors.name && styles.inputError]} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="Enter department name" placeholderTextColor="#9ca3af" />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}><Ionicons name="code-outline" size={16} color="#667eea" /> Department Code *</Text>
        <TextInput style={[styles.input, errors.code && styles.inputError]} value={form.code} onChangeText={(t) => setForm({ ...form, code: t.toUpperCase() })} placeholder="e.g., ENG, MKT" placeholderTextColor="#9ca3af" maxLength={5} />
        {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}><Ionicons name="toggle-outline" size={16} color="#667eea" /> Status</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={form.status} onValueChange={(v) => setForm({ ...form, status: v as 'active' | 'inactive' })} style={styles.picker}>
            <Picker.Item label="Active" value="active" />
            <Picker.Item label="Inactive" value="inactive" />
          </Picker>
        </View>
      </View>
    </View>
  );

  const [managerSearch, setManagerSearch] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  
  const filteredManagers = managers.filter(m => 
    m.name.toLowerCase().includes(managerSearch.toLowerCase()) ||
    m.role.toLowerCase().includes(managerSearch.toLowerCase()) ||
    (m.department && m.department.toLowerCase().includes(managerSearch.toLowerCase()))
  );

  const selectedManager = managers.find(m => m.id === form.manager_id);

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Management & Team</Text>
      <Text style={styles.stepSubtitle}>Assign manager and set team size</Text>
      
      {/* Manager Selection with Search */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}><Ionicons name="person-outline" size={16} color="#667eea" /> Department Manager (Optional)</Text>
        
        {/* Selected Manager Display */}
        {selectedManager ? (
          <View style={styles.selectedManagerCard}>
            <View style={styles.selectedManagerAvatar}>
              <Ionicons name="person" size={24} color="#667eea" />
            </View>
            <View style={styles.selectedManagerInfo}>
              <Text style={styles.selectedManagerName}>{selectedManager.name}</Text>
              <Text style={styles.selectedManagerRole}>{selectedManager.role} {selectedManager.department ? `• ${selectedManager.department}` : ''}</Text>
            </View>
            <TouchableOpacity style={styles.clearManagerButton} onPress={() => setForm({ ...form, manager_id: null })}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.managerSelectButton} onPress={() => setShowManagerDropdown(!showManagerDropdown)}>
            <Ionicons name="person-add-outline" size={20} color="#667eea" />
            <Text style={styles.managerSelectButtonText}>Select a Manager</Text>
            <Ionicons name={showManagerDropdown ? "chevron-up" : "chevron-down"} size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
        
        {/* Manager Dropdown */}
        {showManagerDropdown && !selectedManager && (
          <View style={styles.managerDropdown}>
            <View style={styles.managerSearchContainer}>
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                style={styles.managerSearchInput}
                placeholder="Search managers..."
                placeholderTextColor="#9ca3af"
                value={managerSearch}
                onChangeText={setManagerSearch}
              />
            </View>
            <ScrollView style={styles.managerList} nestedScrollEnabled>
              {filteredManagers.length === 0 ? (
                <View style={styles.noManagersFound}>
                  <Ionicons name="person-outline" size={32} color="#d1d5db" />
                  <Text style={styles.noManagersText}>No managers found</Text>
                </View>
              ) : (
                filteredManagers.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.managerOption}
                    onPress={() => {
                      setForm({ ...form, manager_id: m.id });
                      setShowManagerDropdown(false);
                      setManagerSearch('');
                    }}
                  >
                    <View style={styles.managerOptionAvatar}>
                      <Text style={styles.managerOptionAvatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.managerOptionInfo}>
                      <Text style={styles.managerOptionName}>{m.name}</Text>
                      <Text style={styles.managerOptionRole}>{m.role} {m.department ? `• ${m.department}` : ''}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}><Ionicons name="people-outline" size={16} color="#667eea" /> Number of Employees</Text>
        <View style={styles.numberInputContainer}>
          <TextInput style={styles.numberInput} value={String(form.employee_count)} onChangeText={(t) => setForm({ ...form, employee_count: parseInt(t) || 0 })} keyboardType="numeric" placeholder="0" />
          <View style={styles.numberButtons}>
            <TouchableOpacity style={styles.numberButton} onPress={() => setForm({ ...form, employee_count: form.employee_count + 1 })}><Ionicons name="add" size={16} color="#667eea" /></TouchableOpacity>
            <TouchableOpacity style={styles.numberButton} onPress={() => setForm({ ...form, employee_count: Math.max(0, form.employee_count - 1) })}><Ionicons name="remove" size={16} color="#667eea" /></TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}><Ionicons name="cash-outline" size={16} color="#667eea" /> Annual Budget (₹)</Text>
        <View style={styles.numberInputContainer}>
          <TextInput style={styles.numberInput} value={String(form.budget)} onChangeText={(t) => setForm({ ...form, budget: parseInt(t) || 0 })} keyboardType="numeric" placeholder="0" />
          <View style={styles.numberButtons}>
            <TouchableOpacity style={styles.numberButton} onPress={() => setForm({ ...form, budget: form.budget + 100000 })}><Ionicons name="add" size={16} color="#667eea" /></TouchableOpacity>
            <TouchableOpacity style={styles.numberButton} onPress={() => setForm({ ...form, budget: Math.max(0, form.budget - 100000) })}><Ionicons name="remove" size={16} color="#667eea" /></TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Additional Details</Text>
      <Text style={styles.stepSubtitle}>Complete the department information</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}><Ionicons name="location-outline" size={16} color="#667eea" /> Location</Text>
        <TextInput style={styles.input} value={form.location} onChangeText={(t) => setForm({ ...form, location: t })} placeholder="e.g., Building A, Floor 3" placeholderTextColor="#9ca3af" />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}><Ionicons name="document-text-outline" size={16} color="#667eea" /> Description</Text>
        <TextInput style={[styles.input, styles.textArea]} value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} placeholder="Brief description..." placeholderTextColor="#9ca3af" multiline numberOfLines={4} textAlignVertical="top" />
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Department Summary</Text>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Name:</Text><Text style={styles.summaryValue}>{form.name || 'Not specified'}</Text></View>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Code:</Text><Text style={styles.summaryValue}>{form.code || 'Not specified'}</Text></View>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Manager:</Text><Text style={styles.summaryValue}>{managers.find(m => m.id === form.manager_id)?.name || 'Not selected'}</Text></View>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Employees:</Text><Text style={styles.summaryValue}>{form.employee_count}</Text></View>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Budget:</Text><Text style={styles.summaryValue}>₹{form.budget.toLocaleString()}</Text></View>
      </View>
    </View>
  );

  const renderStepContent = () => {
    if (currentStep === 0) return renderStep0();
    if (currentStep === 1) return renderStep1();
    return renderStep2();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <LinearGradient colors={['#667eea', '#764ba2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <Animated.View style={[styles.headerContent, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{isEditMode ? 'Edit Department' : 'Create Department'}</Text>
              <Text style={styles.headerSubtitle}>Step {currentStep + 1} of {steps.length}</Text>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, { width: progressWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(((currentStep + 1) / steps.length) * 100)}%</Text>
          </View>
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepIndicator}>
                <View style={[styles.stepCircle, index <= currentStep && styles.stepCircleActive]}>
                  <Ionicons name={step.icon as any} size={16} color={index <= currentStep ? '#667eea' : '#a5b4fc'} />
                </View>
                <Text style={[styles.stepLabel, index <= currentStep && styles.stepLabelActive]}>{step.title}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </LinearGradient>
      <Animated.View style={[styles.formContainer, { opacity: formOpacity, transform: [{ translateY: formTranslateY }] }]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + tabBarHeight }]} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={scrollEventThrottle}>
          {renderStepContent()}
        </ScrollView>
        <LinearGradient colors={['rgba(255,255,255,0.9)', '#ffffff']} style={styles.navigationContainer}>
          <View style={styles.navigationButtons}>
            {currentStep > 0 && (
              <TouchableOpacity style={styles.prevButton} onPress={prevStep} disabled={submitting}>
                <Ionicons name="chevron-back" size={20} color="#667eea" />
                <Text style={styles.prevButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            <LinearGradient colors={['#667eea', '#764ba2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.nextButton, currentStep === 0 && styles.nextButtonFull]}>
              <TouchableOpacity style={styles.nextButtonInner} onPress={nextStep} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#ffffff" size="small" /> : (
                  <>
                    <Text style={styles.nextButtonText}>{currentStep === steps.length - 1 ? (isEditMode ? 'Update' : 'Create') : 'Next'}</Text>
                    <Ionicons name={currentStep === steps.length - 1 ? "checkmark" : "chevron-forward"} size={20} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </LinearGradient>
      </Animated.View>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 20 },
  headerContent: { gap: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressBar: { flex: 1, height: 6, backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#ffffff', borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '600', color: '#ffffff', minWidth: 35 },
  stepsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  stepIndicator: { alignItems: 'center', gap: 8 },
  stepCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.3)', justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: '#ffffff' },
  stepLabel: { fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' },
  stepLabelActive: { color: '#ffffff', fontWeight: '600' },
  formContainer: { flex: 1, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, overflow: 'hidden' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  stepContent: { gap: 24 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: '#1f2937', textAlign: 'center' },
  stepSubtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 8 },
  inputGroup: { gap: 8 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, fontSize: 16, color: '#1f2937', backgroundColor: '#ffffff' },
  inputError: { borderColor: '#ef4444' },
  textArea: { height: 100, textAlignVertical: 'top' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  pickerContainer: { borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#ffffff' },
  picker: { height: 54, color: '#1f2937' },
  numberInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#ffffff' },
  numberInput: { flex: 1, padding: 16, fontSize: 16, color: '#1f2937' },
  numberButtons: { flexDirection: 'column' },
  numberButton: { width: 40, height: 27, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#e5e7eb' },
  summaryCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 8 },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  summaryLabel: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  summaryValue: { fontSize: 14, color: '#1f2937', fontWeight: '600' },
  navigationContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 16, paddingBottom: 24, paddingHorizontal: 24 },
  navigationButtons: { flexDirection: 'row', gap: 12 },
  prevButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: '#667eea', backgroundColor: '#ffffff', gap: 8 },
  prevButtonText: { fontSize: 16, fontWeight: '600', color: '#667eea' },
  nextButton: { flex: 2, borderRadius: 12 },
  nextButtonFull: { flex: 1 },
  nextButtonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  nextButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  // Manager Selection Styles
  selectedManagerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f9ff', borderWidth: 2, borderColor: '#667eea', borderRadius: 12, padding: 12, gap: 12 },
  selectedManagerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center' },
  selectedManagerInfo: { flex: 1 },
  selectedManagerName: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  selectedManagerRole: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  clearManagerButton: { padding: 4 },
  managerSelectButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, gap: 12, backgroundColor: '#ffffff' },
  managerSelectButtonText: { flex: 1, fontSize: 16, color: '#9ca3af' },
  managerDropdown: { borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#ffffff', marginTop: 8, overflow: 'hidden' },
  managerSearchContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 8 },
  managerSearchInput: { flex: 1, fontSize: 15, color: '#1f2937' },
  managerList: { maxHeight: 200 },
  noManagersFound: { alignItems: 'center', padding: 24, gap: 8 },
  noManagersText: { fontSize: 14, color: '#9ca3af' },
  managerOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  managerOptionAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#667eea', justifyContent: 'center', alignItems: 'center' },
  managerOptionAvatarText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  managerOptionInfo: { flex: 1 },
  managerOptionName: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  managerOptionRole: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});

export default CreateDepartmentForm;
