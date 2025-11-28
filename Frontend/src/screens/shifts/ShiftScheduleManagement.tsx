import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Add imports for better UI
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Button, Chip, TextInput as PaperTextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import tab bar visibility
import { useNavigation } from '@react-navigation/native';
import { useAutoHideTabBarOnScroll } from '../../navigation/tabBarVisibility';

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
  employee_id: string;
  designation: string;
}

interface ShiftAssignment {
  assignment_id: number;
  user_id: number;
  shift_id: number;
  assignment_date: string;
  user: UserSummary;
  notes: string;
  is_reassigned: boolean;
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

export default function ShiftScheduleManagement() {
  // Tab bar visibility hook
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();
  const navigation = useNavigation<any>();
  const { isDarkMode, colors } = useTheme();

  // Animation values for header elements
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;

  // Dummy data for demonstration
  const [shifts, setShifts] = useState<Shift[]>([
    { shift_id: 1, name: 'Morning Shift', start_time: '09:00', end_time: '17:00', department: 'Sales', description: '9 AM to 5 PM', is_active: true },
    { shift_id: 2, name: 'Evening Shift', start_time: '14:00', end_time: '22:00', department: 'Support', description: '2 PM to 10 PM', is_active: true },
  ]);
  const [schedule, setSchedule] = useState<DailySchedule>({
    department: 'Sales',
    date: new Date().toISOString().split('T')[0],
    shifts: [
      {
        shift: { shift_id: 1, name: 'Morning Shift', start_time: '09:00', end_time: '17:00', description: '9 AM to 5 PM', is_active: true },
        assignments: [
          { assignment_id: 1, user_id: 101, shift_id: 1, assignment_date: new Date().toISOString().split('T')[0], user: { user_id: 101, name: 'Alice', employee_id: 'E001', designation: 'Sales Rep' }, notes: 'Office', is_reassigned: false }
        ],
        total_assigned: 1
      },
      {
        shift: { shift_id: 2, name: 'Evening Shift', start_time: '14:00', end_time: '22:00', description: '2 PM to 10 PM', is_active: true },
        assignments: [],
        total_assigned: 0
      }
    ],
    users_on_leave: [],
    unassigned_users: [
      { user_id: 102, name: 'Bob', employee_id: 'E002', designation: 'Sales Rep' }
    ]
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('daily');
  const [selectedDailyTab, setSelectedDailyTab] = useState<'schedule' | 'leave' | 'unassigned'>('schedule');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weekStartDate, setWeekStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekEndDate, setWeekEndDate] = useState(new Date(new Date().setDate(new Date().getDate()+6)).toISOString().split('T')[0]);
  const [showWeekStartPicker, setShowWeekStartPicker] = useState(false);
  const [showWeekEndPicker, setShowWeekEndPicker] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
    department: 'General',
    start_date: weekStartDate,
    end_date: weekEndDate,
    days: []
  });
  
  const [isShiftModalVisible, setShiftModalVisible] = useState(false);
  const [isEditShiftModalVisible, setEditShiftModalVisible] = useState(false);
  const [isAssignModalVisible, setAssignModalVisible] = useState(false);
  const [isReassignModalVisible, setReassignModalVisible] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<ShiftAssignment | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Form data
  const [shiftFormData, setShiftFormData] = useState({ name: '', start_time: '09:00', end_time: '18:00', description: '', is_active: true });
  const [assignFormData, setAssignFormData] = useState({ shift_id: 0, assignment_date: selectedDate, notes: '' });

  // When date changes, update schedule (for demo, just update date)
  useEffect(() => {
    setSchedule(prev => ({ ...prev, date: selectedDate }));
  }, [selectedDate]);

  // Animate header on mount
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
    ]).start();
  }, []);

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
  const handleCreateShift = () => {
    // Add the new shift to state
    const newShift = { ...shiftFormData, shift_id: Date.now(), department: 'General' };
    setShifts([...shifts, newShift]);
    setShiftModalVisible(false);
    resetShiftForm();
  };
  const handleUpdateShift = () => {
    if (selectedShift) {
      const updated = shifts.map(s => s.shift_id === selectedShift.shift_id ? { ...s, ...shiftFormData } : s);
      setShifts(updated);
    }
    setEditShiftModalVisible(false);
    resetShiftForm();
  };
  const handleDeleteShift = (shiftId: number) => {
    setShifts(shifts.filter(s => s.shift_id !== shiftId));
  };
  const handleAssignShift = () => {
    // For demo, just close modal and reset selection
    setAssignModalVisible(false);
    setSelectedUsers([]);
  };
  const handleReassignShift = () => {
    // For demo, just close modal
    setReassignModalVisible(false);
  };
  const handleDeleteAssignment = (assignmentId: number) => {
    // Remove assignment from schedule
    const newShifts = schedule.shifts.map(s => {
      if (s.assignments.some(a => a.assignment_id === assignmentId)) {
        return {
          ...s,
          assignments: s.assignments.filter(a => a.assignment_id !== assignmentId),
          total_assigned: s.total_assigned - 1
        };
      }
      return s;
    });
    setSchedule(prev => ({ ...prev, shifts: newShifts }));
  };
  const timeStringToDate = (time: string) => {
    const [h, m] = time.split(':').map(v => parseInt(v));
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };
  const formatTimeDisplay = (time: string) => {
    const d = timeStringToDate(time);
    return format(d, 'hh : mm a');
  };
  const getAvailableUsers = () => {
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
    setWeeklySchedule(prev => ({ ...prev, start_date: startStr, end_date: endStr }));
    setSchedule(prev => ({ ...prev, date: selectedDate }));
  };
  const buildWeekDays = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const days: WeeklyScheduleDay[] = [];
    const d = new Date(start);
    while (d <= end) {
      days.push({ date: format(d, 'yyyy-MM-dd'), shifts: [], users_on_leave: [], unassigned_users: [] });
      d.setDate(d.getDate() + 1);
    }
    return days;
  };
  useEffect(() => {
    const days = buildWeekDays(weekStartDate, weekEndDate);
    setWeeklySchedule(prev => ({ ...prev, start_date: weekStartDate, end_date: weekEndDate, days }));
  }, [weekStartDate, weekEndDate]);
  const handleLoadWeeklySchedule = () => {
    const days = buildWeekDays(weekStartDate, weekEndDate);
    setWeeklySchedule(prev => ({ ...prev, start_date: weekStartDate, end_date: weekEndDate, days }));
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

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
      <StatusBar style="light" />

      {/* Enhanced Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#39549fff', '#39549fff']}
          style={styles.headerGradient}
        >
          <Animated.View 
            style={[
              styles.headerTitleRow,
              { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }
            ]}
          >
            <TouchableOpacity 
              style={styles.backButtonCompact} 
              onPress={() => navigation.goBack()} 
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerTextContainer}>
              <Animated.Text 
                style={[
                  styles.headerTitle,
                  { opacity: headerOpacity }
                ]}
              >
                Shift Management
              </Animated.Text>
              <Animated.Text 
                style={[
                  styles.headerSubtitle,
                  { opacity: headerOpacity }
                ]}
              >
                Manage team schedules & shifts
              </Animated.Text>
            </View>
            
            <Animated.View 
              style={[
                styles.headerActionContainer,
                { opacity: headerOpacity }
              ]}
            >
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => setShiftModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: Math.max(32, tabBarVisible ? tabBarHeight + 24 : 32) }} 
        onScroll={onScroll} 
        scrollEventThrottle={scrollEventThrottle} 
        showsVerticalScrollIndicator={false}
      >

        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity 
            style={[styles.modeButton, viewMode === 'daily' && styles.modeButtonActive]} 
            onPress={() => setViewMode('daily')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeButtonText, viewMode === 'daily' && styles.modeButtonTextActive]}>Daily</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeButton, viewMode === 'weekly' && styles.modeButtonActive]} 
            onPress={() => setViewMode('weekly')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeButtonText, viewMode === 'weekly' && styles.modeButtonTextActive]}>Weekly</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Schedule View */}
        {viewMode === 'daily' && (
          <View>
            {/* Date Selector */}
            <View style={styles.dateSelector}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="calendar-outline" size={18} color="#1f2937" />
                <Text style={styles.sectionLabel}>Select Date</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <PaperTextInput
                    value={format(new Date(selectedDate), 'dd/MM/yyyy')}
                    editable={false}
                    mode="outlined"
                    right={<PaperTextInput.Icon icon="calendar" onPress={() => setShowDatePicker(true)} />}
                  />
                </View>
                <Button mode="contained" onPress={handleLoadSchedule} compact>
                  Load Schedule
                </Button>
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
            <View style={styles.sectionTabs}>
              <TouchableOpacity
                style={[styles.tabButton, selectedDailyTab === 'schedule' && styles.tabButtonActive]}
                onPress={() => setSelectedDailyTab('schedule')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabButtonText, selectedDailyTab === 'schedule' && styles.tabButtonTextActive]}>Shift Schedule</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, selectedDailyTab === 'leave' && styles.tabButtonActive]}
                onPress={() => setSelectedDailyTab('leave')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabButtonText, selectedDailyTab === 'leave' && styles.tabButtonTextActive]}>On Leave</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, selectedDailyTab === 'unassigned' && styles.tabButtonActive]}
                onPress={() => setSelectedDailyTab('unassigned')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabButtonText, selectedDailyTab === 'unassigned' && styles.tabButtonTextActive]}>Unassigned Users</Text>
              </TouchableOpacity>
            </View>
            {selectedDailyTab === 'schedule' && (
              <></>
            )}
            {selectedDailyTab === 'leave' && (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="alert-outline" size={18} color="#f59e0b" />
                    <Text style={styles.cardTitle}>Users on Leave</Text>
                  </View>
                </View>
                {schedule.users_on_leave.length > 0 ? (
                  schedule.users_on_leave.map(user => (
                    <View key={user.user_id} style={styles.row}>
                      <Text>{user.name}</Text>
                      <Chip mode="outlined">On Leave</Chip>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name="checkmark-circle-outline" size={24} color="#9ca3af" />
                    </View>
                    <Text style={styles.emptyStateText}>No users on leave</Text>
                    <Text style={styles.emptyStateSub}>All set for this date</Text>
                  </View>
                )}
              </View>
            )}
            {selectedDailyTab === 'unassigned' && (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="people-outline" size={18} color="#10b981" />
                    <Text style={styles.cardTitle}>Unassigned Users</Text>
                  </View>
                </View>
                {schedule.unassigned_users.length > 0 ? (
                  schedule.unassigned_users.map(user => (
                    <View key={user.user_id} style={styles.row}>
                      <Text>{user.name}</Text>
                      <Button mode="contained-tonal" onPress={() => { setSelectedUsers([user.user_id]); setAssignModalVisible(true); }}>Assign</Button>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name="happy-outline" size={24} color="#9ca3af" />
                    </View>
                    <Text style={styles.emptyStateText}>All users are assigned</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Weekly Schedule View */}
        {viewMode === 'weekly' && weeklySchedule && (
          <View>
            <View style={styles.dateSelector}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="calendar-outline" size={18} color="#2563eb" />
                <Text style={styles.sectionLabel}>Select Week Range</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <PaperTextInput
                    label="Start"
                    value={format(new Date(weekStartDate), 'dd/MM/yyyy')}
                    editable={false}
                    mode="outlined"
                    right={<PaperTextInput.Icon icon="calendar" onPress={() => setShowWeekStartPicker(true)} />}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PaperTextInput
                    label="End"
                    value={format(new Date(weekEndDate), 'dd/MM/yyyy')}
                    editable={false}
                    mode="outlined"
                    right={<PaperTextInput.Icon icon="calendar" onPress={() => setShowWeekEndPicker(true)} />}
                  />
                </View>
              </View>
              {showWeekStartPicker && (
                <DateTimePicker
                  value={new Date(weekStartDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') setShowWeekStartPicker(false);
                    if (date) setWeekStartDate(format(date, 'yyyy-MM-dd'));
                  }}
                />
              )}
              {showWeekEndPicker && (
                <DateTimePicker
                  value={new Date(weekEndDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') setShowWeekEndPicker(false);
                    if (date) setWeekEndDate(format(date, 'yyyy-MM-dd'));
                  }}
                />
              )}
            </View>
           
          </View>
        )}
        {/* All Shifts List */}
        <View style={styles.shiftsContainer}>
          <View style={styles.highlightCard}>
            <LinearGradient
              colors={["#eef2ff", "#e0e7ff"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardHeaderGradient}
            >
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={styles.headerIconBadgeLg}>
                    <Ionicons name="time-outline" size={20} color="#fff" />
                  </View>
                  <View style={styles.headerTextGroup}>
                    <Text style={styles.cardHeaderTitle}>All Shifts ({shifts.length})</Text>
                    <Text style={styles.cardSubtitle}>View and manage all shifts for your department</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.refreshBtn} onPress={handleLoadSchedule} activeOpacity={0.85}>
                  <Ionicons name="refresh" size={18} color="#2563eb" />
                  <Text style={styles.refreshBtnText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {shifts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyClockIconCircle}>
                  <Ionicons name="time-outline" size={28} color="#9ca3af" />
                </View>
                <Text style={styles.emptyStateText}>No shifts created yet</Text>
                <Text style={styles.emptyStateSub}>Create your first shift to get started</Text>
              </View>
            ) : (
              <View style={{ padding: 12 }}>
                {shifts.map((shift) => (
                  <View key={shift.shift_id} style={styles.card}>
                    <View style={styles.sectionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="time-outline" size={18} color="#2563eb" />
                        <Text style={styles.cardTitle}>{shift.name}</Text>
                      </View>
                      <Chip mode="outlined">{shift.department}</Chip>
                    </View>
                    <Text style={styles.cardMeta}>{shift.start_time} - {shift.end_time}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                      <Button mode="contained-tonal" onPress={() => openEditModal(shift)}>Edit</Button>
                      <Button mode="outlined" onPress={() => handleDeleteShift(shift.shift_id)}>Delete</Button>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Create Shift Modal */}
      <Modal visible={isShiftModalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create New Shift</Text>
          <Text style={styles.modalSubtitle}>Define a new shift for your department</Text>

          <PaperTextInput
            label="Shift Name *"
            placeholder="e.g., Morning Shift, Evening Shift"
            value={shiftFormData.name}
            onChangeText={text => setShiftFormData({ ...shiftFormData, name: text })}
            mode="outlined"
            style={{ marginTop: 8 }}
          />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <PaperTextInput
                label="Start Time *"
                value={formatTimeDisplay(shiftFormData.start_time)}
                editable={false}
                mode="outlined"
                right={<PaperTextInput.Icon icon="clock" onPress={() => setShowStartTimePicker(true)} />}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PaperTextInput
                label="End Time *"
                value={formatTimeDisplay(shiftFormData.end_time)}
                editable={false}
                mode="outlined"
                right={<PaperTextInput.Icon icon="clock" onPress={() => setShowEndTimePicker(true)} />}
              />
            </View>
          </View>
          {showStartTimePicker && (
            <DateTimePicker
              value={timeStringToDate(shiftFormData.start_time)}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
              onChange={(event, date) => {
                if (Platform.OS === 'android') setShowStartTimePicker(false);
                if (date) {
                  const hh = format(date, 'HH');
                  const mm = format(date, 'mm');
                  setShiftFormData({ ...shiftFormData, start_time: `${hh}:${mm}` });
                }
              }}
            />
          )}
          {showEndTimePicker && (
            <DateTimePicker
              value={timeStringToDate(shiftFormData.end_time)}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
              onChange={(event, date) => {
                if (Platform.OS === 'android') setShowEndTimePicker(false);
                if (date) {
                  const hh = format(date, 'HH');
                  const mm = format(date, 'mm');
                  setShiftFormData({ ...shiftFormData, end_time: `${hh}:${mm}` });
                }
              }}
            />
          )}

          <PaperTextInput
            label="Description"
            placeholder="Optional description"
            value={shiftFormData.description}
            onChangeText={text => setShiftFormData({ ...shiftFormData, description: text })}
            mode="outlined"
            style={{ marginTop: 12 }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <Button mode="outlined" onPress={() => { setShiftModalVisible(false); resetShiftForm(); }}>Cancel</Button>
            <Button mode="contained" onPress={handleCreateShift}>Create Shift</Button>
          </View>
        </View>
      </Modal>

      {/* Edit Shift Modal */}
      <Modal visible={isEditShiftModalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Shift</Text>
          <TextInput
            placeholder="Shift Name"
            value={shiftFormData.name}
            onChangeText={text => setShiftFormData({ ...shiftFormData, name: text })}
            style={styles.input}
          />
          <TextInput
            placeholder="Start Time (HH:MM)"
            value={shiftFormData.start_time}
            onChangeText={text => setShiftFormData({ ...shiftFormData, start_time: text })}
            style={styles.input}
          />
          <TextInput
            placeholder="End Time (HH:MM)"
            value={shiftFormData.end_time}
            onChangeText={text => setShiftFormData({ ...shiftFormData, end_time: text })}
            style={styles.input}
          />
          <TextInput
            placeholder="Description"
            value={shiftFormData.description}
            onChangeText={text => setShiftFormData({ ...shiftFormData, description: text })}
            style={styles.input}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Button mode="outlined" onPress={() => { setEditShiftModalVisible(false); resetShiftForm(); }}>Cancel</Button>
            <Button mode="contained" onPress={handleUpdateShift}>Update</Button>
          </View>
        </View>
      </Modal>

      {/* Assign Users Modal */}
      <Modal visible={isAssignModalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <Text>Assign Users to Shift</Text>
          {/* Shift and Date Selection */}
          <TextInput
            placeholder="Shift ID"
            value={assignFormData.shift_id.toString()}
            onChangeText={text => setAssignFormData({ ...assignFormData, shift_id: parseInt(text) })}
            style={styles.input}
          />
          <TextInput
            placeholder="Date (YYYY-MM-DD)"
            value={assignFormData.assignment_date}
            onChangeText={text => setAssignFormData({ ...assignFormData, assignment_date: text })}
            style={styles.input}
          />
          {/* Available Users List */}
          {getAvailableUsers().map(user => (
            <View key={user.user_id} style={styles.row}>
              <Text>{user.name}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (selectedUsers.includes(user.user_id)) {
                    setSelectedUsers(selectedUsers.filter(id => id !== user.user_id));
                  } else {
                    setSelectedUsers([...selectedUsers, user.user_id]);
                  }
                }}
                style={styles.selectButton}
              >
                <Text>{selectedUsers.includes(user.user_id) ? 'Selected' : 'Select'}</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Button mode="outlined" onPress={() => setAssignModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleAssignShift} disabled={selectedUsers.length === 0}>{`Assign ${selectedUsers.length}`}</Button>
          </View>
        </View>
      </Modal>

      {/* Reassign Modal */}
      <Modal visible={isReassignModalVisible} animationType="slide">
        <View style={styles.modalContent}>
          {selectedAssignment && (
            <Text>{`Reassign ${selectedAssignment.user.name}`}</Text>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Button mode="contained" onPress={() => setReassignModalVisible(false)}>Close</Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: { flex: 1, backgroundColor: '#39549fff' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerGradient: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSubtitle: { color: '#d1fae5', fontSize: 12, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerActionContainer: {
    alignItems: 'center',
  },
  backButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginRight: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  createButtonText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  modeSelector: { flexDirection: 'row', justifyContent: 'center', marginVertical: 16, backgroundColor: '#fff', borderRadius: 12, padding: 4, elevation: 2 },
  modeButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  modeButtonActive: { backgroundColor: '#2563eb' },
  modeButtonText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  modeButtonTextActive: { color: '#fff' },
  dateSelector: { marginVertical: 10, padding: 16, backgroundColor: '#fff', borderRadius: 12, elevation: 2 },
  sectionLabel: { marginLeft: 8, fontSize: 14, color: '#111827', fontWeight: '600' },
  sectionTabs: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#2563eb' },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  tabButtonTextActive: { color: '#fff' },
  card: { padding: 16, marginVertical: 8, backgroundColor: '#fff', borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  cardMeta: { fontSize: 12, color: '#6b7280' },
  assignment: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4, padding: 8, backgroundColor: '#f3f4f6', borderRadius: 8 },
  assignmentText: { fontSize: 14, color: '#111827' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginVertical: 8, borderRadius: 8, backgroundColor: '#fff' },
  modalContent: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1f2937' },
  modalSubtitle: { fontSize: 12, color: '#6b7280', marginTop: -8, marginBottom: 8 },
  selectButton: { padding: 8, backgroundColor: '#e5e7eb', borderRadius: 6 },
  shiftsContainer: { marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginLeft: 8 },
  countChip: { alignSelf: 'flex-start' },
  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyStateText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  emptyStateSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  iconButton: { paddingHorizontal: 8, paddingVertical: 6, marginRight: 8 },
  highlightCard: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginTop: 8, elevation: 2 },
  cardHeaderGradient: { padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIconBadgeLg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  headerTextGroup: { marginLeft: 10 },
  cardHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cardSubtitle: { fontSize: 12, color: '#6b7280' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  refreshBtnText: { marginLeft: 6, color: '#2563eb', fontSize: 13, fontWeight: '600' },
  emptyClockIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 8 },
});
