import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Easing, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Add imports for better UI
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Button, Chip, TextInput as PaperTextInput, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_CONFIG } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { useModuleBadges } from '../../contexts/ModuleBadgeContext';

// Import tab bar visibility
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAutoHideTabBarOnScroll } from '../../navigation/tabBarVisibility';
import { formatDateIST, formatTimeIST } from '../../utils/dateTime';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Shift {
  shift_id: number;
  name: string;
  start_time: string;
  end_time: string;
  department: string;
  description: string;
  is_active: boolean;
}

interface ShiftOverview {
  shift_id: number;
  name: string;
  start_time: string;
  end_time: string;
  description: string;
  department?: string;
  is_active?: boolean;
}

interface UserSummary {
  user_id: number;
  name: string;
  email?: string;
  employee_id: string;
  designation: string;
  department?: string;
}

interface ShiftAssignment {
  assignment_id: number;
  user_id: number;
  shift_id: number;
  assignment_date: string;
  user: UserSummary;
  notes?: string;
  is_reassigned: boolean;
  assigned_by?: number;
  created_at?: string;
  updated_at?: string;
  shift?: Shift;
}

interface ShiftScheduleEntry {
  shift: ShiftOverview;
  assignments: ShiftAssignment[];
  total_assigned: number;
}

interface DailySchedule {
  department: string;
  date: string;
  shifts: ShiftScheduleEntry[];
  users_on_leave: UserSummary[];
  unassigned_users: UserSummary[];
}

interface WeeklyShiftAssignment {
  assignment_id: number;
  user_id?: number;
  user: {
    name: string;
    designation: string;
  };
}

interface WeeklyShiftEntry {
  shift: ShiftOverview;
  assignments: WeeklyShiftAssignment[];
  total_assigned: number;
}

interface WeeklyScheduleDay {
  date: string;
  department: string;
  shifts: WeeklyShiftEntry[];
  users_on_leave: UserSummary[];
  unassigned_users: UserSummary[];
}

interface WeeklySchedule {
  department: string;
  start_date: string;
  end_date: string;
  days: WeeklyScheduleDay[];
}

// Shift color themes for visual variety
const SHIFT_COLORS = [
  { primary: '#6366f1', secondary: '#818cf8', gradient: ['#6366f1', '#8b5cf6'] },
  { primary: '#10b981', secondary: '#34d399', gradient: ['#10b981', '#059669'] },
  { primary: '#f59e0b', secondary: '#fbbf24', gradient: ['#f59e0b', '#d97706'] },
  { primary: '#ec4899', secondary: '#f472b6', gradient: ['#ec4899', '#db2777'] },
  { primary: '#3b82f6', secondary: '#60a5fa', gradient: ['#3b82f6', '#2563eb'] },
  { primary: '#8b5cf6', secondary: '#a78bfa', gradient: ['#8b5cf6', '#7c3aed'] },
];

const getShiftColor = (index: number) => SHIFT_COLORS[index % SHIFT_COLORS.length];


export default function ShiftScheduleManagement() {
  // Tab bar visibility hook
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { resetBadge } = useModuleBadges();
  const API_BASE_URL = API_CONFIG.getApiBaseUrl();
  const isAdmin = (user?.role as string | undefined)?.toString().toUpperCase() === 'ADMIN';
  const userDepartment = user?.department;

  // Reset badge when screen is focused
  useFocusEffect(
    useCallback(() => {
      resetBadge("shifts");
    }, [resetBadge])
  );

  // Animation values (simplified - no effects)
  const cardAnimations = useRef<Animated.Value[]>([]).current;

  // API-driven data
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('daily');
  const [selectedDailyTab, setSelectedDailyTab] = useState<'schedule' | 'leave' | 'unassigned'>('schedule');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weekStartDate, setWeekStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekEndDate, setWeekEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 6)).toISOString().split('T')[0]);
  const [showWeekStartPicker, setShowWeekStartPicker] = useState(false);
  const [showWeekEndPicker, setShowWeekEndPicker] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(null);

  const [isShiftModalVisible, setShiftModalVisible] = useState(false);
  const [isEditShiftModalVisible, setEditShiftModalVisible] = useState(false);
  const [isAssignModalVisible, setAssignModalVisible] = useState(false);
  const [isReassignModalVisible, setReassignModalVisible] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<ShiftAssignment | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [shiftFormData, setShiftFormData] = useState({ name: '', start_time: '09:00', end_time: '18:00', description: '', is_active: true });
  const [assignFormData, setAssignFormData] = useState({ shift_id: 0, assignment_date: selectedDate, notes: '' });


  // --- API Helpers ---
  const buildHeaders = async (isJson: boolean = true) => {
    const token = await AsyncStorage.getItem('token');
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (isJson) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const headers = await buildHeaders(options.body !== undefined);
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const message = data?.detail || data?.message || 'Something went wrong';
      throw new Error(message);
    }
    return data;
  };

  const handleError = (message: string) => {
    setError(message);
    Alert.alert('Shift Management', message);
  };




  // Functions
  const openEditModal = (shift: Shift) => {
    setSelectedShift(shift);
    setShiftFormData({ name: shift.name, start_time: shift.start_time, end_time: shift.end_time, description: shift.description, is_active: shift.is_active });
    setEditShiftModalVisible(true);
  };
  
  const resetShiftForm = () => {
    setShiftFormData({ name: '', start_time: '09:00', end_time: '18:00', description: '', is_active: true });
    setSelectedShift(null);
  };

  const loadShifts = async () => {
    try {
      setLoading(true);
      const data: Shift[] = await apiFetch('/shift');
      setShifts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      handleError(err.message || 'Unable to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const loadDailySchedule = async (dateStr: string = selectedDate) => {
    try {
      setScheduleLoading(true);
      const deptParam = isAdmin && userDepartment ? `&department=${encodeURIComponent(userDepartment)}` : '';
      const data: DailySchedule = await apiFetch(`/shift/schedule/department?schedule_date=${dateStr}${deptParam}`);
      setSchedule(data);
    } catch (err: any) {
      setSchedule(null);
      handleError(err.message || 'Unable to load daily schedule');
    } finally {
      setScheduleLoading(false);
    }
  };

  const loadWeeklySchedule = async (start: string = weekStartDate, end: string = weekEndDate) => {
    try {
      setWeeklyLoading(true);
      const deptParam = isAdmin && userDepartment ? `&department=${encodeURIComponent(userDepartment)}` : '';
      const data: WeeklySchedule = await apiFetch(`/shift/schedule/department/week?start_date=${start}&end_date=${end}${deptParam}`);
      setWeeklySchedule(data);
    } catch (err: any) {
      setWeeklySchedule(null);
      handleError(err.message || 'Unable to load weekly schedule');
    } finally {
      setWeeklyLoading(false);
    }
  };


  const handleCreateShift = async () => {
    try {
      setSaving(true);
      await apiFetch('/shift', {
        method: 'POST',
        body: JSON.stringify(shiftFormData),
      });
      setShiftModalVisible(false);
      resetShiftForm();
      await loadShifts();
      await loadDailySchedule();
      await loadWeeklySchedule();
    } catch (err: any) {
      handleError(err.message || 'Failed to create shift');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateShift = async () => {
    if (!selectedShift) return;
    try {
      setSaving(true);
      await apiFetch(`/shift/${selectedShift.shift_id}`, {
        method: 'PUT',
        body: JSON.stringify(shiftFormData),
      });
      setEditShiftModalVisible(false);
      resetShiftForm();
      await loadShifts();
      await loadDailySchedule();
      await loadWeeklySchedule();
    } catch (err: any) {
      handleError(err.message || 'Failed to update shift');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShift = (shiftId: number) => {
    Alert.alert('Delete shift', 'Are you sure you want to delete this shift?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteShiftConfirm(shiftId) },
    ]);
  };

  const deleteShiftConfirm = async (shiftId: number) => {
    try {
      setSaving(true);
      await apiFetch(`/shift/${shiftId}`, { method: 'DELETE' });
      await loadShifts();
      await loadDailySchedule();
      await loadWeeklySchedule();
    } catch (err: any) {
      handleError(err.message || 'Failed to delete shift');
    } finally {
      setSaving(false);
    }
  };


  const handleAssignShift = async () => {
    if (!assignFormData.shift_id || selectedUsers.length === 0) {
      handleError('Select a shift and at least one user');
      return;
    }
    try {
      setSaving(true);
      const payloadDate = assignFormData.assignment_date || selectedDate;
      if (selectedUsers.length > 1) {
        await apiFetch('/shift/assignment/bulk', {
          method: 'POST',
          body: JSON.stringify({
            user_ids: selectedUsers,
            shift_id: assignFormData.shift_id,
            assignment_date: payloadDate,
            notes: assignFormData.notes,
          }),
        });
      } else {
        await apiFetch('/shift/assignment', {
          method: 'POST',
          body: JSON.stringify({
            user_id: selectedUsers[0],
            shift_id: assignFormData.shift_id,
            assignment_date: payloadDate,
            notes: assignFormData.notes,
          }),
        });
      }
      setAssignModalVisible(false);
      setSelectedUsers([]);
      await loadDailySchedule(payloadDate);
      await loadWeeklySchedule();
    } catch (err: any) {
      handleError(err.message || 'Failed to assign shift');
    } finally {
      setSaving(false);
    }
  };

  const handleReassignShift = () => {
    setReassignModalVisible(false);
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    try {
      setSaving(true);
      await apiFetch(`/shift/assignment/${assignmentId}`, { method: 'DELETE' });
      await loadDailySchedule();
      await loadWeeklySchedule();
    } catch (err: any) {
      handleError(err.message || 'Failed to delete assignment');
    } finally {
      setSaving(false);
    }
  };


  const timeStringToDate = (time: string) => {
    const [h, m] = time.split(':').map(v => parseInt(v));
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  const formatTimeDisplay = (time: string) => {
    const d = timeStringToDate(time);
    return formatTimeIST(d);
  };

  const getAvailableUsers = () => {
    if (!schedule) return [];
    const assignedUserIds = new Set(schedule.shifts.flatMap(s => s.assignments.map(a => a.user_id)));
    return schedule.unassigned_users.filter(u => !assignedUserIds.has(u.user_id));
  };

  const handleLoadSchedule = () => {
    const base = new Date(selectedDate);
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    setWeekStartDate(startStr);
    setWeekEndDate(endStr);
    loadShifts();
    loadDailySchedule(selectedDate);
  };

  const setThisWeekRange = () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    setWeekStartDate(format(start, 'yyyy-MM-dd'));
    setWeekEndDate(format(end, 'yyyy-MM-dd'));
  };

  const setNextWeekRange = () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    setWeekStartDate(format(start, 'yyyy-MM-dd'));
    setWeekEndDate(format(end, 'yyyy-MM-dd'));
  };

  useEffect(() => {
    setThisWeekRange();
    loadShifts();
    loadDailySchedule(selectedDate);
  }, []);

  useEffect(() => {
    loadDailySchedule(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    setAssignFormData(prev => ({ ...prev, assignment_date: selectedDate }));
  }, [selectedDate]);

  useEffect(() => {
    if (weekStartDate && weekEndDate) {
      loadWeeklySchedule(weekStartDate, weekEndDate);
    }
  }, [weekStartDate, weekEndDate]);

  const totalAssigned = schedule ? schedule.shifts.reduce((acc, s) => acc + s.total_assigned, 0) : 0;
  const unassignedCount = schedule?.unassigned_users?.length ?? 0;
  const activeShiftCount = shifts.filter(s => s.is_active).length;
  const onLeaveCount = schedule?.users_on_leave?.length ?? 0;


  // Render stat card component
  const renderStatCard = (icon: string, value: number, label: string, color: string, bgColor: string) => (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={[styles.statIconWrapper, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={20} color="#fff" />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" backgroundColor="#6366f1" translucent={false} />

      {/* Simple Header */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          {/* Top Navigation Row */}
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>Shift Management</Text>
              <Text style={styles.headerSubtitle}>Coordinate team schedules</Text>
            </View>

            <TouchableOpacity style={styles.addButtonHeader} onPress={() => setShiftModalVisible(true)} activeOpacity={0.8}>
              <View style={styles.addButtonSimple}>
                <Ionicons name="add" size={24} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Stats Cards Row */}
          <View style={styles.statsRow}>
            {renderStatCard('layers-outline', shifts.length, 'Total', '#6366f1', 'rgba(99, 102, 241, 0.15)')}
            {renderStatCard('checkmark-circle', activeShiftCount, 'Active', '#10b981', 'rgba(16, 185, 129, 0.15)')}
            {renderStatCard('people', totalAssigned, 'Assigned', '#3b82f6', 'rgba(59, 130, 246, 0.15)')}
            {renderStatCard('alert-circle', unassignedCount, 'Pending', '#f59e0b', 'rgba(245, 158, 11, 0.15)')}
          </View>
        </View>
      </LinearGradient>


      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: Math.max(40, tabBarVisible ? tabBarHeight + 32 : 40) }}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >
        {/* View Mode Toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleWrapper}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'daily' && styles.toggleButtonActive]}
              onPress={() => setViewMode('daily')}
              activeOpacity={0.9}
            >
              {viewMode === 'daily' ? (
                <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.toggleGradient}>
                  <Ionicons name="today" size={18} color="#fff" />
                  <Text style={styles.toggleTextActive}>Daily View</Text>
                </LinearGradient>
              ) : (
                <View style={styles.toggleInactive}>
                  <Ionicons name="today-outline" size={18} color="#64748b" />
                  <Text style={styles.toggleText}>Daily View</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'weekly' && styles.toggleButtonActive]}
              onPress={() => setViewMode('weekly')}
              activeOpacity={0.9}
            >
              {viewMode === 'weekly' ? (
                <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.toggleGradient}>
                  <Ionicons name="calendar" size={18} color="#fff" />
                  <Text style={styles.toggleTextActive}>Weekly View</Text>
                </LinearGradient>
              ) : (
                <View style={styles.toggleInactive}>
                  <Ionicons name="calendar-outline" size={18} color="#64748b" />
                  <Text style={styles.toggleText}>Weekly View</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>


        {/* Daily View Content */}
        {viewMode === 'daily' && (
          <View>
            {/* Date Picker Card */}
            <View style={styles.dateCard}>
              <View style={styles.dateCardHeader}>
                <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.dateIconBadge}>
                  <Ionicons name="calendar" size={22} color="#fff" />
                </LinearGradient>
                <View style={styles.dateCardTitleSection}>
                  <Text style={styles.dateCardTitle}>Select Date</Text>
                  <Text style={styles.dateCardSubtitle}>View schedule for a specific day</Text>
                </View>
              </View>

              <View style={styles.dateInputRow}>
                <TouchableOpacity style={styles.dateInputWrapper} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                  <Ionicons name="calendar-outline" size={20} color="#6366f1" />
                  <Text style={styles.dateInputText}>{formatDateIST(selectedDate)}</Text>
                  <Ionicons name="chevron-down" size={18} color="#94a3b8" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.loadButton} onPress={handleLoadSchedule} activeOpacity={0.85}>
                  <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.loadButtonGradient}>
                    <Ionicons name="refresh" size={18} color="#fff" />
                    <Text style={styles.loadButtonText}>Load</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={new Date(selectedDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (date) setSelectedDate(format(date, 'yyyy-MM-dd'));
                  }}
                />
              )}
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                {[
                  { key: 'schedule', label: 'Shift Schedule', icon: 'time' },
                  { key: 'leave', label: 'On Leave', icon: 'airplane' },
                  { key: 'unassigned', label: 'Unassigned', icon: 'person-add' },
                ].map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabItem, selectedDailyTab === tab.key && styles.tabItemActive]}
                    onPress={() => setSelectedDailyTab(tab.key as any)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={(selectedDailyTab === tab.key ? tab.icon : `${tab.icon}-outline`) as any} size={16} color={selectedDailyTab === tab.key ? '#fff' : '#64748b'} />
                    <Text style={[styles.tabText, selectedDailyTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>


            {/* Schedule Tab Content */}
            {selectedDailyTab === 'schedule' && (
              <View>
                {scheduleLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Loading schedule...</Text>
                  </View>
                )}

                {!schedule && !scheduleLoading && (
                  <View style={styles.emptyStateCard}>
                    <LinearGradient colors={['#f8fafc', '#f1f5f9']} style={styles.emptyStateGradient}>
                      <View style={styles.emptyIconCircle}>
                        <Ionicons name="cloud-offline-outline" size={32} color="#94a3b8" />
                      </View>
                      <Text style={styles.emptyTitle}>No Schedule Loaded</Text>
                      <Text style={styles.emptySubtitle}>Select a date and tap Load to view the schedule</Text>
                    </LinearGradient>
                  </View>
                )}

                {schedule && !scheduleLoading && schedule.shifts.length === 0 && (
                  <View style={styles.emptyStateCard}>
                    <LinearGradient colors={['#f8fafc', '#f1f5f9']} style={styles.emptyStateGradient}>
                      <View style={styles.emptyIconCircle}>
                        <Ionicons name="time-outline" size={32} color="#94a3b8" />
                      </View>
                      <Text style={styles.emptyTitle}>No Shifts Scheduled</Text>
                      <Text style={styles.emptySubtitle}>Create or assign shifts for this date</Text>
                    </LinearGradient>
                  </View>
                )}

                {/* Shift Cards */}
                {schedule && schedule.shifts.map((entry, index) => {
                  const colorTheme = getShiftColor(index);
                  return (
                    <View key={entry.shift.shift_id} style={styles.shiftCard}>
                      {/* Shift Header */}
                      <LinearGradient colors={[`${colorTheme.primary}10`, `${colorTheme.secondary}08`]} style={styles.shiftCardHeader}>
                        <View style={styles.shiftHeaderLeft}>
                          <LinearGradient colors={colorTheme.gradient as [string, string]} style={styles.shiftIconBadge}>
                            <Ionicons name="time" size={22} color="#fff" />
                          </LinearGradient>
                          <View style={styles.shiftInfo}>
                            <Text style={styles.shiftName}>{entry.shift.name}</Text>
                            <View style={styles.shiftTimeRow}>
                              <Ionicons name="time-outline" size={14} color="#64748b" />
                              <Text style={styles.shiftTime}>{formatTimeDisplay(entry.shift.start_time)} - {formatTimeDisplay(entry.shift.end_time)}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={[styles.departmentBadge, { backgroundColor: `${colorTheme.primary}15` }]}>
                          <Text style={[styles.departmentText, { color: colorTheme.primary }]}>{entry.shift.department || 'All'}</Text>
                        </View>
                      </LinearGradient>


                      {/* Team Members Section */}
                      <View style={styles.teamSection}>
                        <View style={styles.teamHeader}>
                          <View style={styles.teamCountBadge}>
                            <Ionicons name="people" size={16} color="#3b82f6" />
                            <Text style={styles.teamCountText}>{entry.total_assigned} Team Members</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.assignButton}
                            onPress={() => {
                              setAssignFormData({ shift_id: entry.shift.shift_id, assignment_date: selectedDate, notes: '' });
                              setAssignModalVisible(true);
                            }}
                            activeOpacity={0.85}
                          >
                            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.assignButtonGradient}>
                              <Ionicons name="person-add" size={16} color="#fff" />
                              <Text style={styles.assignButtonText}>Assign</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>

                        {/* Assignments List */}
                        {entry.assignments.length > 0 ? (
                          entry.assignments.map((a, aIndex) => (
                            <View key={a.assignment_id} style={styles.assignmentCard}>
                              <View style={styles.assignmentLeft}>
                                <LinearGradient colors={getShiftColor(aIndex).gradient as [string, string]} style={styles.avatarCircle}>
                                  <Text style={styles.avatarText}>{a.user?.name?.charAt(0) || 'U'}</Text>
                                </LinearGradient>
                                <View style={styles.assignmentInfo}>
                                  <Text style={styles.assignmentName}>{a.user?.name || 'User'}</Text>
                                  <Text style={styles.assignmentRole}>{a.user?.designation || a.user?.department || '-'}</Text>
                                </View>
                              </View>
                              <View style={styles.assignmentActions}>
                                <TouchableOpacity style={[styles.actionButton, styles.swapButton]} onPress={() => { setSelectedAssignment(a); setReassignModalVisible(true); }} activeOpacity={0.7}>
                                  <Ionicons name="swap-horizontal" size={18} color="#3b82f6" />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteAssignment(a.assignment_id)} activeOpacity={0.7}>
                                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))
                        ) : (
                          <View style={styles.noAssignments}>
                            <Ionicons name="person-add-outline" size={24} color="#cbd5e1" />
                            <Text style={styles.noAssignmentsText}>No team members assigned</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}


            {/* Leave Tab Content */}
            {selectedDailyTab === 'leave' && (
              <View style={styles.contentCard}>
                <View style={styles.contentCardHeader}>
                  <View style={[styles.contentIconBadge, { backgroundColor: '#fef3c7' }]}>
                    <Ionicons name="airplane" size={20} color="#f59e0b" />
                  </View>
                  <Text style={styles.contentCardTitle}>Users on Leave</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{onLeaveCount}</Text>
                  </View>
                </View>
                {schedule?.users_on_leave?.length ? (
                  schedule.users_on_leave.map((user, index) => (
                    <View key={user.user_id} style={styles.userRow}>
                      <View style={styles.userRowLeft}>
                        <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.userAvatar}>
                          <Text style={styles.userAvatarText}>{user.name?.charAt(0) || 'U'}</Text>
                        </LinearGradient>
                        <View>
                          <Text style={styles.userName}>{user.name}</Text>
                          <Text style={styles.userDesignation}>{user.designation || '-'}</Text>
                        </View>
                      </View>
                      <View style={styles.leaveBadge}>
                        <Ionicons name="airplane" size={12} color="#f59e0b" />
                        <Text style={styles.leaveBadgeText}>On Leave</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyContent}>
                    <Ionicons name="checkmark-circle" size={40} color="#10b981" />
                    <Text style={styles.emptyContentTitle}>All Present</Text>
                    <Text style={styles.emptyContentSubtitle}>No users on leave for this date</Text>
                  </View>
                )}
              </View>
            )}

            {/* Unassigned Tab Content */}
            {selectedDailyTab === 'unassigned' && (
              <View style={styles.contentCard}>
                <View style={styles.contentCardHeader}>
                  <View style={[styles.contentIconBadge, { backgroundColor: '#dbeafe' }]}>
                    <Ionicons name="person-add" size={20} color="#3b82f6" />
                  </View>
                  <Text style={styles.contentCardTitle}>Unassigned Users</Text>
                  <View style={[styles.countBadge, { backgroundColor: '#dbeafe' }]}>
                    <Text style={[styles.countBadgeText, { color: '#3b82f6' }]}>{unassignedCount}</Text>
                  </View>
                </View>
                {schedule?.unassigned_users?.length ? (
                  schedule.unassigned_users.map((user, index) => (
                    <View key={user.user_id} style={styles.userRow}>
                      <View style={styles.userRowLeft}>
                        <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.userAvatar}>
                          <Text style={styles.userAvatarText}>{user.name?.charAt(0) || 'U'}</Text>
                        </LinearGradient>
                        <View>
                          <Text style={styles.userName}>{user.name}</Text>
                          <Text style={styles.userDesignation}>{user.designation || '-'}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.quickAssignButton}
                        onPress={() => {
                          setSelectedUsers([user.user_id]);
                          setAssignFormData(prev => ({ ...prev, shift_id: shifts[0]?.shift_id || 0, assignment_date: selectedDate }));
                          setAssignModalVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add-circle" size={14} color="#fff" />
                        <Text style={styles.quickAssignText}>Assign</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyContent}>
                    <Ionicons name="checkmark-done-circle" size={40} color="#10b981" />
                    <Text style={styles.emptyContentTitle}>All Assigned</Text>
                    <Text style={styles.emptyContentSubtitle}>Every user has been assigned to a shift</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}


        {/* Weekly View Content */}
        {viewMode === 'weekly' && (
          <View>
            {/* Week Range Selector */}
            <View style={styles.dateCard}>
              <View style={styles.dateCardHeader}>
                <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.dateIconBadge}>
                  <Ionicons name="calendar" size={22} color="#fff" />
                </LinearGradient>
                <View style={styles.dateCardTitleSection}>
                  <Text style={styles.dateCardTitle}>Week Range</Text>
                  <Text style={styles.dateCardSubtitle}>Select start and end dates</Text>
                </View>
              </View>

              <View style={styles.weekRangeRow}>
                <TouchableOpacity style={styles.weekDateInput} onPress={() => setShowWeekStartPicker(true)} activeOpacity={0.8}>
                  <Text style={styles.weekDateLabel}>Start</Text>
                  <Text style={styles.weekDateValue}>{formatDateIST(weekStartDate)}</Text>
                </TouchableOpacity>
                <View style={styles.weekRangeDivider}>
                  <Ionicons name="arrow-forward" size={20} color="#94a3b8" />
                </View>
                <TouchableOpacity style={styles.weekDateInput} onPress={() => setShowWeekEndPicker(true)} activeOpacity={0.8}>
                  <Text style={styles.weekDateLabel}>End</Text>
                  <Text style={styles.weekDateValue}>{formatDateIST(weekEndDate)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickWeekButtons}>
                <TouchableOpacity style={styles.quickWeekButton} onPress={setThisWeekRange} activeOpacity={0.8}>
                  <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.quickWeekGradient}>
                    <Text style={styles.quickWeekText}>This Week</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickWeekButton, styles.quickWeekOutline]} onPress={setNextWeekRange} activeOpacity={0.8}>
                  <Text style={styles.quickWeekOutlineText}>Next Week</Text>
                </TouchableOpacity>
              </View>

              {showWeekStartPicker && (
                <DateTimePicker value={new Date(weekStartDate)} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  onChange={(event, date) => { if (Platform.OS === 'android') setShowWeekStartPicker(false); if (date) setWeekStartDate(format(date, 'yyyy-MM-dd')); }} />
              )}
              {showWeekEndPicker && (
                <DateTimePicker value={new Date(weekEndDate)} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  onChange={(event, date) => { if (Platform.OS === 'android') setShowWeekEndPicker(false); if (date) setWeekEndDate(format(date, 'yyyy-MM-dd')); }} />
              )}
            </View>

            {weeklyLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.loadingText}>Loading weekly schedule...</Text>
              </View>
            )}

            {!weeklyLoading && !weeklySchedule && (
              <View style={styles.emptyStateCard}>
                <LinearGradient colors={['#f8fafc', '#f1f5f9']} style={styles.emptyStateGradient}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="calendar-outline" size={32} color="#94a3b8" />
                  </View>
                  <Text style={styles.emptyTitle}>Select Week Range</Text>
                  <Text style={styles.emptySubtitle}>Choose dates to view weekly coverage</Text>
                </LinearGradient>
              </View>
            )}


            {/* Weekly Schedule Days */}
            {!weeklyLoading && weeklySchedule && (
              <View style={styles.weeklyContainer}>
                {weeklySchedule.days.map((day, dayIndex) => (
                  <View key={day.date} style={styles.weekDayCard}>
                    <LinearGradient colors={['#f8fafc', '#fff']} style={styles.weekDayHeader}>
                      <View style={styles.weekDayInfo}>
                        <Text style={styles.weekDayName}>{format(new Date(day.date), 'EEEE')}</Text>
                        <Text style={styles.weekDayDate}>{formatDateIST(day.date)}</Text>
                      </View>
                      <View style={[styles.departmentBadge, { backgroundColor: '#e0e7ff' }]}>
                        <Text style={[styles.departmentText, { color: '#4f46e5' }]}>{day.department}</Text>
                      </View>
                    </LinearGradient>

                    {day.shifts.length > 0 ? (
                      day.shifts.map((shiftEntry, sIndex) => (
                        <View key={shiftEntry.shift.shift_id} style={styles.weekShiftItem}>
                          <View style={styles.weekShiftHeader}>
                            <View style={styles.weekShiftInfo}>
                              <Text style={styles.weekShiftName}>{shiftEntry.shift.name}</Text>
                              <Text style={styles.weekShiftTime}>{formatTimeDisplay(shiftEntry.shift.start_time)} - {formatTimeDisplay(shiftEntry.shift.end_time)}</Text>
                            </View>
                            <View style={styles.weekAssignedBadge}>
                              <Ionicons name="people" size={12} color="#6366f1" />
                              <Text style={styles.weekAssignedText}>{shiftEntry.total_assigned}</Text>
                            </View>
                          </View>
                          {shiftEntry.assignments.slice(0, 3).map((a, aIndex) => (
                            <View key={a.assignment_id} style={styles.weekAssignmentRow}>
                              <Text style={styles.weekAssignmentName}>{a.user?.name || 'User'}</Text>
                              <Text style={styles.weekAssignmentRole}>{a.user?.designation || '-'}</Text>
                            </View>
                          ))}
                          {shiftEntry.assignments.length > 3 && (
                            <Text style={styles.moreAssignments}>+{shiftEntry.assignments.length - 3} more</Text>
                          )}
                        </View>
                      ))
                    ) : (
                      <View style={styles.noShiftsPlanned}>
                        <Ionicons name="calendar-outline" size={20} color="#cbd5e1" />
                        <Text style={styles.noShiftsText}>No shifts planned</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}


        {/* All Shifts Section */}
        <View style={styles.allShiftsSection}>
          <View style={styles.sectionHeaderCard}>
            <LinearGradient colors={['#eef2ff', '#e0e7ff']} style={styles.sectionHeaderGradient}>
              <View style={styles.sectionHeaderLeft}>
                <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.sectionIconBadge}>
                  <Ionicons name="layers" size={22} color="#fff" />
                </LinearGradient>
                <View style={styles.sectionTitleGroup}>
                  <Text style={styles.sectionTitle}>All Shifts</Text>
                  <Text style={styles.sectionSubtitle}>{shifts.length} shifts configured</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.refreshButton} onPress={handleLoadSchedule} activeOpacity={0.8}>
                <Ionicons name="refresh" size={18} color="#6366f1" />
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Loading shifts...</Text>
            </View>
          ) : shifts.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <LinearGradient colors={['#f8fafc', '#f1f5f9']} style={styles.emptyStateGradient}>
                <View style={[styles.emptyIconCircle, { width: 80, height: 80, borderRadius: 40 }]}>
                  <Ionicons name="time-outline" size={40} color="#94a3b8" />
                </View>
                <Text style={styles.emptyTitle}>No Shifts Created</Text>
                <Text style={styles.emptySubtitle}>Create your first shift to start managing schedules</Text>
                <TouchableOpacity style={styles.createFirstButton} onPress={() => setShiftModalVisible(true)} activeOpacity={0.85}>
                  <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.createFirstGradient}>
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.createFirstText}>Create First Shift</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.shiftsGrid}>
              {shifts.map((shift, index) => {
                const colorTheme = getShiftColor(index);
                return (
                  <View key={shift.shift_id} style={styles.shiftListCard}>
                    <LinearGradient colors={[`${colorTheme.primary}08`, `${colorTheme.secondary}05`]} style={styles.shiftListGradient}>
                      <View style={styles.shiftListHeader}>
                        <LinearGradient colors={shift.is_active ? colorTheme.gradient as [string, string] : ['#9ca3af', '#6b7280']} style={styles.shiftListIcon}>
                          <Ionicons name="time" size={20} color="#fff" />
                        </LinearGradient>
                        <View style={styles.shiftListInfo}>
                          <Text style={styles.shiftListName}>{shift.name}</Text>
                          <View style={styles.shiftListTimeRow}>
                            <Ionicons name="time-outline" size={12} color="#64748b" />
                            <Text style={styles.shiftListTime}>{shift.start_time} - {shift.end_time}</Text>
                          </View>
                        </View>
                        <View style={styles.shiftListBadges}>
                          <View style={[styles.deptBadgeSmall, { backgroundColor: `${colorTheme.primary}15` }]}>
                            <Text style={[styles.deptBadgeText, { color: colorTheme.primary }]}>{shift.department}</Text>
                          </View>
                          <View style={[styles.statusIndicator, { backgroundColor: shift.is_active ? '#dcfce7' : '#f3f4f6' }]}>
                            <View style={[styles.statusDot, { backgroundColor: shift.is_active ? '#22c55e' : '#9ca3af' }]} />
                            <Text style={[styles.statusText, { color: shift.is_active ? '#15803d' : '#6b7280' }]}>{shift.is_active ? 'Active' : 'Inactive'}</Text>
                          </View>
                        </View>
                      </View>


                      {shift.description && (
                        <View style={styles.shiftDescription}>
                          <Text style={styles.shiftDescriptionText}>{shift.description}</Text>
                        </View>
                      )}

                      <View style={styles.shiftListActions}>
                        <TouchableOpacity style={[styles.shiftActionBtn, styles.editBtn]} onPress={() => openEditModal(shift)} activeOpacity={0.8}>
                          <Ionicons name="create-outline" size={18} color="#6366f1" />
                          <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.shiftActionBtn, styles.deleteBtn]} onPress={() => handleDeleteShift(shift.shift_id)} activeOpacity={0.8}>
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                          <Text style={styles.deleteBtnText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>


      {/* Create Shift Modal */}
      <Modal visible={isShiftModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalIconCircle}>
                  <Ionicons name="add-circle" size={28} color="#6366f1" />
                </View>
                <Text style={styles.modalTitle}>Create New Shift</Text>
                <Text style={styles.modalSubtitle}>Define a new shift for your team</Text>
              </View>
            </LinearGradient>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Shift Name *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="text" size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g., Morning Shift"
                    placeholderTextColor="#94a3b8"
                    value={shiftFormData.name}
                    onChangeText={text => setShiftFormData({ ...shiftFormData, name: text })}
                  />
                </View>
              </View>

              <View style={styles.timeInputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Start Time *</Text>
                  <TouchableOpacity style={styles.timeInputWrapper} onPress={() => setShowStartTimePicker(true)} activeOpacity={0.8}>
                    <Ionicons name="time" size={20} color="#6366f1" />
                    <Text style={styles.timeInputText}>{formatTimeDisplay(shiftFormData.start_time)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>End Time *</Text>
                  <TouchableOpacity style={styles.timeInputWrapper} onPress={() => setShowEndTimePicker(true)} activeOpacity={0.8}>
                    <Ionicons name="time" size={20} color="#6366f1" />
                    <Text style={styles.timeInputText}>{formatTimeDisplay(shiftFormData.end_time)}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showStartTimePicker && (
                <DateTimePicker value={timeStringToDate(shiftFormData.start_time)} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                  onChange={(event, date) => { if (Platform.OS === 'android') setShowStartTimePicker(false); if (date) setShiftFormData({ ...shiftFormData, start_time: format(date, 'HH:mm') }); }} />
              )}
              {showEndTimePicker && (
                <DateTimePicker value={timeStringToDate(shiftFormData.end_time)} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                  onChange={(event, date) => { if (Platform.OS === 'android') setShowEndTimePicker(false); if (date) setShiftFormData({ ...shiftFormData, end_time: format(date, 'HH:mm') }); }} />
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <View style={[styles.inputWrapper, { alignItems: 'flex-start', paddingVertical: 12 }]}>
                  <Ionicons name="document-text" size={20} color="#94a3b8" style={[styles.inputIcon, { marginTop: 2 }]} />
                  <TextInput
                    style={[styles.modalInput, { minHeight: 80, textAlignVertical: 'top' }]}
                    placeholder="Optional description"
                    placeholderTextColor="#94a3b8"
                    value={shiftFormData.description}
                    onChangeText={text => setShiftFormData({ ...shiftFormData, description: text })}
                    multiline
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShiftModalVisible(false); resetShiftForm(); }} activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleCreateShift} disabled={saving} activeOpacity={0.85}>
                <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.submitGradient}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.submitButtonText}>Create Shift</Text></>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Edit Shift Modal */}
      <Modal visible={isEditShiftModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalIconCircle}>
                  <Ionicons name="create" size={28} color="#8b5cf6" />
                </View>
                <Text style={styles.modalTitle}>Edit Shift</Text>
                <Text style={styles.modalSubtitle}>Update shift details</Text>
              </View>
            </LinearGradient>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Shift Name *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="text" size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput style={styles.modalInput} placeholder="Shift Name" placeholderTextColor="#94a3b8" value={shiftFormData.name} onChangeText={text => setShiftFormData({ ...shiftFormData, name: text })} />
                </View>
              </View>

              <View style={styles.timeInputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Start Time</Text>
                  <TouchableOpacity style={styles.timeInputWrapper} onPress={() => setShowStartTimePicker(true)} activeOpacity={0.8}>
                    <Ionicons name="time" size={20} color="#8b5cf6" />
                    <Text style={styles.timeInputText}>{formatTimeDisplay(shiftFormData.start_time)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>End Time</Text>
                  <TouchableOpacity style={styles.timeInputWrapper} onPress={() => setShowEndTimePicker(true)} activeOpacity={0.8}>
                    <Ionicons name="time" size={20} color="#8b5cf6" />
                    <Text style={styles.timeInputText}>{formatTimeDisplay(shiftFormData.end_time)}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <View style={[styles.inputWrapper, { alignItems: 'flex-start', paddingVertical: 12 }]}>
                  <Ionicons name="document-text" size={20} color="#94a3b8" style={[styles.inputIcon, { marginTop: 2 }]} />
                  <TextInput style={[styles.modalInput, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="Description" placeholderTextColor="#94a3b8" value={shiftFormData.description} onChangeText={text => setShiftFormData({ ...shiftFormData, description: text })} multiline />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setEditShiftModalVisible(false); resetShiftForm(); }} activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleUpdateShift} disabled={saving} activeOpacity={0.85}>
                <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.submitGradient}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.submitButtonText}>Update</Text></>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Assign Users Modal */}
      <Modal visible={isAssignModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalIconCircle}>
                  <Ionicons name="people" size={28} color="#3b82f6" />
                </View>
                <Text style={styles.modalTitle}>Assign Users</Text>
                <Text style={styles.modalSubtitle}>Select team members for this shift</Text>
              </View>
            </LinearGradient>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Shift</Text>
                <View style={styles.shiftSelectList}>
                  {shifts.map((shift, index) => (
                    <TouchableOpacity
                      key={shift.shift_id}
                      style={[styles.shiftSelectItem, assignFormData.shift_id === shift.shift_id && styles.shiftSelectItemActive]}
                      onPress={() => setAssignFormData({ ...assignFormData, shift_id: shift.shift_id })}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.shiftSelectIcon, { backgroundColor: assignFormData.shift_id === shift.shift_id ? '#3b82f6' : '#f1f5f9' }]}>
                        <Ionicons name="time" size={16} color={assignFormData.shift_id === shift.shift_id ? '#fff' : '#64748b'} />
                      </View>
                      <View style={styles.shiftSelectInfo}>
                        <Text style={[styles.shiftSelectName, assignFormData.shift_id === shift.shift_id && { color: '#3b82f6' }]}>{shift.name}</Text>
                        <Text style={styles.shiftSelectTime}>{shift.start_time} - {shift.end_time}</Text>
                      </View>
                      {assignFormData.shift_id === shift.shift_id && <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Assignment Date</Text>
                <TouchableOpacity style={styles.dateSelectButton} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                  <Ionicons name="calendar" size={20} color="#3b82f6" />
                  <Text style={styles.dateSelectText}>{formatDateIST(assignFormData.assignment_date)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Available Users ({getAvailableUsers().length})</Text>
                <View style={styles.userSelectList}>
                  {getAvailableUsers().map((user, index) => (
                    <TouchableOpacity
                      key={user.user_id}
                      style={[styles.userSelectItem, selectedUsers.includes(user.user_id) && styles.userSelectItemActive]}
                      onPress={() => {
                        if (selectedUsers.includes(user.user_id)) {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.user_id));
                        } else {
                          setSelectedUsers([...selectedUsers, user.user_id]);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={selectedUsers.includes(user.user_id) ? ['#3b82f6', '#2563eb'] : ['#e2e8f0', '#cbd5e1']} style={styles.userSelectAvatar}>
                        <Text style={[styles.userSelectAvatarText, { color: selectedUsers.includes(user.user_id) ? '#fff' : '#64748b' }]}>{user.name?.charAt(0) || 'U'}</Text>
                      </LinearGradient>
                      <View style={styles.userSelectInfo}>
                        <Text style={[styles.userSelectName, selectedUsers.includes(user.user_id) && { color: '#3b82f6' }]}>{user.name}</Text>
                        <Text style={styles.userSelectRole}>{user.designation || '-'}</Text>
                      </View>
                      <View style={[styles.userSelectCheck, selectedUsers.includes(user.user_id) && styles.userSelectCheckActive]}>
                        {selectedUsers.includes(user.user_id) && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setAssignModalVisible(false); setSelectedUsers([]); }} activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleAssignShift} disabled={selectedUsers.length === 0 || saving} activeOpacity={0.85}>
                <LinearGradient colors={selectedUsers.length > 0 ? ['#3b82f6', '#2563eb'] : ['#94a3b8', '#64748b']} style={styles.submitGradient}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.submitButtonText}>Assign ({selectedUsers.length})</Text></>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Reassign Modal */}
      <Modal visible={isReassignModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: SCREEN_HEIGHT * 0.5 }]}>
            <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalIconCircle}>
                  <Ionicons name="swap-horizontal" size={28} color="#f59e0b" />
                </View>
                <Text style={styles.modalTitle}>Reassign User</Text>
                <Text style={styles.modalSubtitle}>{selectedAssignment?.user?.name || 'User'}</Text>
              </View>
            </LinearGradient>

            <View style={styles.modalBody}>
              <View style={styles.reassignInfo}>
                <Ionicons name="information-circle" size={24} color="#f59e0b" />
                <Text style={styles.reassignInfoText}>Reassignment feature coming soon. You can delete the current assignment and create a new one.</Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.submitButton, { flex: 1 }]} onPress={() => setReassignModalVisible(false)} activeOpacity={0.85}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.submitGradient}>
                  <Text style={styles.submitButtonText}>Close</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  // Base Layout
  safeArea: { flex: 1, backgroundColor: '#6366f1' },
  scrollView: { flex: 1, backgroundColor: '#f8fafc' },

  // Header Styles - Simple
  header: {
    paddingTop: 12,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: { paddingHorizontal: 20 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  navButton: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  titleContainer: { flex: 1, paddingHorizontal: 16 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  addButtonHeader: { width: 44, height: 44, borderRadius: 12 },
  addButtonSimple: {
    width: '100%', height: '100%',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18, padding: 12,
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: 12, marginHorizontal: 3,
  },
  statIconWrapper: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },


  // Toggle Styles
  toggleContainer: { marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  toggleWrapper: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 16, padding: 5,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  toggleButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  toggleButtonActive: {},
  toggleGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, gap: 6,
  },
  toggleInactive: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 16, gap: 6,
  },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Date Card
  dateCard: {
    marginHorizontal: 16, marginVertical: 12,
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  dateCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dateIconBadge: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  dateCardTitleSection: { marginLeft: 14, flex: 1 },
  dateCardTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  dateCardSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateInputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0', gap: 10,
  },
  dateInputText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  loadButton: { borderRadius: 12, overflow: 'hidden' },
  loadButtonGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 6,
  },
  loadButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },


  // Tab Styles
  tabContainer: { marginHorizontal: 16, marginBottom: 12 },
  tabScroll: { gap: 8 },
  tabItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', gap: 6,
  },
  tabItemActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#fff' },

  // Loading & Empty States
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '500' },
  emptyStateCard: { marginHorizontal: 16, marginVertical: 12, borderRadius: 20, overflow: 'hidden' },
  emptyStateGradient: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: '#e2e8f0',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center' },

  // Shift Card
  shiftCard: {
    marginHorizontal: 16, marginVertical: 8,
    backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    overflow: 'hidden',
  },
  shiftCardHeader: { padding: 16 },
  shiftHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  shiftIconBadge: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  shiftInfo: { marginLeft: 14, flex: 1 },
  shiftName: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  shiftTimeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  shiftTime: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  departmentBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  departmentText: { fontSize: 12, fontWeight: '700' },


  // Team Section
  teamSection: { padding: 16, paddingTop: 0 },
  teamHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  teamCountBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6,
  },
  teamCountText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  assignButton: { borderRadius: 10, overflow: 'hidden' },
  assignButtonGradient: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, gap: 6,
  },
  assignButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Assignment Card
  assignmentCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  assignmentLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarCircle: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  assignmentInfo: { marginLeft: 12, flex: 1 },
  assignmentName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  assignmentRole: { fontSize: 12, color: '#64748b', marginTop: 2 },
  assignmentActions: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  swapButton: { backgroundColor: '#eff6ff' },
  deleteButton: { backgroundColor: '#fef2f2' },
  noAssignments: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  noAssignmentsText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },


  // Content Card (Leave/Unassigned tabs)
  contentCard: {
    marginHorizontal: 16, marginVertical: 8,
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  contentCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  contentIconBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  contentCardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginLeft: 12, flex: 1 },
  countBadge: {
    backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  countBadgeText: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },
  userRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  userRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userAvatar: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  userName: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginLeft: 12 },
  userDesignation: { fontSize: 12, color: '#64748b', marginLeft: 12, marginTop: 2 },
  leaveBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 4,
  },
  leaveBadgeText: { fontSize: 11, fontWeight: '600', color: '#f59e0b' },
  quickAssignButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4,
  },
  quickAssignText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyContent: { alignItems: 'center', paddingVertical: 32 },
  emptyContentTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 12 },
  emptyContentSubtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },


  // Weekly View Styles
  weekRangeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  weekDateInput: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center',
  },
  weekDateLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', textTransform: 'uppercase' },
  weekDateValue: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 4 },
  weekRangeDivider: { paddingHorizontal: 12 },
  quickWeekButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  quickWeekButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  quickWeekGradient: { paddingVertical: 12, alignItems: 'center' },
  quickWeekText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  quickWeekOutline: { borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  quickWeekOutlineText: { color: '#64748b', fontSize: 14, fontWeight: '600', paddingVertical: 12, textAlign: 'center' },

  weeklyContainer: { paddingHorizontal: 16, gap: 12 },
  weekDayCard: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  weekDayHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  weekDayInfo: {},
  weekDayName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  weekDayDate: { fontSize: 12, color: '#64748b', marginTop: 2 },
  weekShiftItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  weekShiftHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekShiftInfo: {},
  weekShiftName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  weekShiftTime: { fontSize: 12, color: '#64748b', marginTop: 2 },
  weekAssignedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4,
  },
  weekAssignedText: { fontSize: 12, fontWeight: '600', color: '#6366f1' },
  weekAssignmentRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, paddingLeft: 8,
  },
  weekAssignmentName: { fontSize: 13, fontWeight: '500', color: '#374151' },
  weekAssignmentRole: { fontSize: 11, color: '#94a3b8' },
  moreAssignments: { fontSize: 12, color: '#6366f1', fontWeight: '600', marginTop: 8, paddingLeft: 8 },
  noShiftsPlanned: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  noShiftsText: { fontSize: 13, color: '#94a3b8' },


  // All Shifts Section
  allShiftsSection: { marginTop: 16, marginBottom: 24 },
  sectionHeaderCard: { marginHorizontal: 16, borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
  sectionHeaderGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionIconBadge: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionTitleGroup: { marginLeft: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  sectionSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  refreshButton: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },

  shiftsGrid: { paddingHorizontal: 16, gap: 12 },
  shiftListCard: { borderRadius: 18, overflow: 'hidden' },
  shiftListGradient: { padding: 16 },
  shiftListHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  shiftListIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  shiftListInfo: { marginLeft: 12, flex: 1 },
  shiftListName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  shiftListTimeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  shiftListTime: { fontSize: 12, color: '#64748b' },
  shiftListBadges: { alignItems: 'flex-end', gap: 6 },
  deptBadgeSmall: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  deptBadgeText: { fontSize: 11, fontWeight: '700' },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  shiftDescription: {
    marginTop: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#6366f1',
  },
  shiftDescriptionText: { fontSize: 13, color: '#64748b', fontStyle: 'italic' },
  shiftListActions: { flexDirection: 'row', marginTop: 16, gap: 10 },
  shiftActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12, gap: 6, borderWidth: 1.5,
  },
  editBtn: { backgroundColor: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.2)' },
  editBtnText: { color: '#6366f1', fontSize: 14, fontWeight: '700' },
  deleteBtn: { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
  createFirstButton: { marginTop: 20, borderRadius: 14, overflow: 'hidden' },
  createFirstGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, gap: 8 },
  createFirstText: { color: '#fff', fontSize: 15, fontWeight: '700' },


  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.85,
    overflow: 'hidden',
  },
  modalHeader: { paddingTop: 24, paddingBottom: 20, paddingHorizontal: 24 },
  modalHeaderContent: { alignItems: 'center' },
  modalIconCircle: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  modalSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  modalBody: { padding: 24, maxHeight: SCREEN_HEIGHT * 0.5 },
  modalFooter: {
    flexDirection: 'row', padding: 20, gap: 12,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  cancelButton: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#f1f5f9', alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  submitButton: { flex: 1.5, borderRadius: 12, overflow: 'hidden' },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 8,
  },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Input Styles
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  inputIcon: { marginRight: 10 },
  modalInput: { flex: 1, fontSize: 15, color: '#1e293b', paddingVertical: 14 },
  timeInputRow: { flexDirection: 'row', gap: 12 },
  timeInputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0', gap: 10,
  },
  timeInputText: { fontSize: 15, fontWeight: '600', color: '#1e293b' },


  // Assign Modal Specific
  shiftSelectList: { gap: 8 },
  shiftSelectItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  shiftSelectItemActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  shiftSelectIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  shiftSelectInfo: { marginLeft: 12, flex: 1 },
  shiftSelectName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  shiftSelectTime: { fontSize: 12, color: '#64748b', marginTop: 2 },
  dateSelectButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0', gap: 10,
  },
  dateSelectText: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  userSelectList: { gap: 8 },
  userSelectItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  userSelectItemActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  userSelectAvatar: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  userSelectAvatarText: { fontSize: 15, fontWeight: '700' },
  userSelectInfo: { marginLeft: 12, flex: 1 },
  userSelectName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  userSelectRole: { fontSize: 12, color: '#64748b', marginTop: 2 },
  userSelectCheck: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center',
  },
  userSelectCheckActive: { backgroundColor: '#3b82f6' },

  // Reassign Modal
  reassignInfo: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fef3c7', borderRadius: 12, padding: 16, gap: 12,
  },
  reassignInfoText: { flex: 1, fontSize: 14, color: '#92400e', lineHeight: 20 },
});
