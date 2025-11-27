import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useAutoHideTabBarOnScroll } from '../../navigation/tabBarVisibility';
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';

export default function TeamShifts() {
  const navigation = useNavigation();
  const { onScroll, scrollEventThrottle, tabBarHeight } = useAutoHideTabBarOnScroll({
    threshold: 16,
    overscrollMargin: 50,
  });
  // Sample schedule data (static for Expo demo)
  const [schedule] = useState(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const shifts = {
      morning: { name: 'Morning Shift', start_time: '09:00', end_time: '17:00' },
      evening: { name: 'Evening Shift', start_time: '17:00', end_time: '21:00' }
    };

    return {
      user: { user_id: 1, name: 'John Doe', email: 'john.doe@example.com',
              employee_id: 'EMP123', department: 'Sales', designation: 'Manager' },
      assignments: [
        { assignment_id: 1, assignment_date: format(yesterday, 'yyyy-MM-dd'), shift: shifts.morning, notes: 'Finish report' },
        { assignment_id: 2, assignment_date: format(today,     'yyyy-MM-dd'), shift: shifts.evening, notes: 'Team meeting' },
        { assignment_id: 3, assignment_date: format(tomorrow,  'yyyy-MM-dd'), shift: shifts.morning, notes: 'Prepare slides' }
      ],
      upcoming_shifts: [
        { assignment_id: 3, assignment_date: format(tomorrow, 'yyyy-MM-dd'), shift: shifts.morning, notes: 'Prepare slides' }
      ],
      past_shifts: [
        { assignment_id: 1, assignment_date: format(yesterday, 'yyyy-MM-dd'), shift: shifts.morning, notes: 'Finish report' }
      ]
    };
  });

  // State for view mode and current date
  const [viewMode, setViewMode] = useState('week');     // 'week' or 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTab, setSelectedTab] = useState('calendar'); // 'calendar', 'upcoming', 'past'

  // Navigate prev/next week or month
  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, direction === 'next' ? 7 : -7));
    } else {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      setCurrentDate(newDate);
    }
  };

  const getDaysBetween = (startDate: Date, endDate: Date) => {
    const days: Date[] = [];
    let cursor = new Date(startDate);
    while (cursor <= endDate) {
      days.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    return days;
  };

  // Get dates in the week or month of currentDate
  const getWeekDays = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return getDaysBetween(weekStart, weekEnd);
  };
  const getMonthDays = () => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return getDaysBetween(monthStart, monthEnd);
  };

  // Find assignment by date
  const getAssignmentForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedule.assignments.find(a => a.assignment_date === dateStr);
  };

  // Determine status text (Past, Today, Upcoming)
  const getStatusText = (assignment: { assignment_date: string }) => {
    if (!assignment) return '';
    const assignmentDate = new Date(assignment.assignment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    assignmentDate.setHours(0, 0, 0, 0);
    if (assignmentDate < today) return 'Past';
    if (assignmentDate.getTime() === today.getTime()) return 'Today';
    return 'Upcoming';
  };

  // Calculate day cell width for 7-column grid
  const windowWidth = Dimensions.get('window').width;
  const dayBoxWidth = windowWidth / 7;

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <StatusBar style="light" />
      <View style={styles.headerArea}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => (navigation as any).goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Shift Management</Text>
            <Text style={styles.headerSubtitle}>Plan, track and view team shifts</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={[styles.contentContainer, { paddingBottom: tabBarHeight + 16 }]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={20} />
            <Text style={{ marginLeft: 4 }}>Schedule View</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={[styles.button, viewMode === 'week' && styles.buttonActive]}
              onPress={() => setViewMode('week')}
            >
              <Text style={[styles.buttonText, viewMode === 'week' && styles.buttonTextActive]}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, viewMode === 'month' && styles.buttonActive]}
              onPress={() => setViewMode('month')}
            >
              <Text style={[styles.buttonText, viewMode === 'month' && styles.buttonTextActive]}>Month</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.cardRow, { marginTop: 12 }]}>
          <TouchableOpacity style={styles.navButton} onPress={() => navigateDate('prev')}>
            <Ionicons name="chevron-back-outline" size={18} color="#1F2937" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.dateDisplay}>
              {viewMode === 'week'
                ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM dd')}`
                : format(currentDate, 'MMMM yyyy')}
            </Text>
            <TouchableOpacity onPress={() => setCurrentDate(new Date())}>
              <Text style={styles.todayButton}>Today</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.navButton} onPress={() => navigateDate('next')}>
            <Ionicons name="chevron-forward-outline" size={18} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'calendar' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('calendar')}
        >
          <View style={styles.tabInner}>
            <Ionicons name="calendar-outline" size={16} color={selectedTab === 'calendar' ? '#1E40AF' : '#6B7280'} />
            <Text style={[styles.tabButtonText, selectedTab === 'calendar' && styles.tabButtonTextActive]}>Calendar</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'upcoming' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('upcoming')}
        >
          <View style={styles.tabInner}>
            <Ionicons name="trending-up" size={16} color={selectedTab === 'upcoming' ? '#1E40AF' : '#6B7280'} />
            <Text style={[styles.tabButtonText, selectedTab === 'upcoming' && styles.tabButtonTextActive]}>Upcoming</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'past' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('past')}
        >
          <View style={styles.tabInner}>
            <Ionicons name="time-outline" size={16} color={selectedTab === 'past' ? '#1E40AF' : '#6B7280'} />
            <Text style={[styles.tabButtonText, selectedTab === 'past' && styles.tabButtonTextActive]}>Past</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Calendar Tab */}
      {selectedTab === 'calendar' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Calendar View</Text>
          <Text style={styles.cardDesc}>{viewMode === 'week' ? 'Weekly shift schedule' : 'Monthly shift schedule'}</Text>
          {viewMode === 'week' ? (
            <View style={styles.calendarRow}>
              {getWeekDays().map(day => {
                const assignment = getAssignmentForDate(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <View
                    key={day.toISOString()}
                    style={[styles.dayBox, isToday && styles.todayBox, { width: dayBoxWidth }]}
                  >
                    <Text style={styles.dayName}>{format(day, 'EEE')}</Text>
                    <Text style={styles.dayDate}>{format(day, 'MMM dd')}</Text>
                    {assignment ? (
                      <>
                        <Text style={styles.shiftName}>{assignment.shift.name}</Text>
                        <Text style={styles.shiftTime}>{assignment.shift.start_time} - {assignment.shift.end_time}</Text>
                        <Text style={[
                          styles.badge,
                          getStatusText(assignment) === 'Past' ? styles.badgePast :
                          getStatusText(assignment) === 'Today' ? styles.badgeToday :
                          styles.badgeUpcoming
                        ]}>
                          {getStatusText(assignment)}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.noShift}>No shift</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View>
              <View style={styles.headingRow}>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
                  <Text key={day} style={[styles.dayName, { width: dayBoxWidth }]}>{day}</Text>
                ))}
              </View>
              <View style={styles.calendarRow}>
                {getMonthDays().map(day => {
                  const assignment = getAssignmentForDate(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <View
                      key={day.toISOString()}
                      style={[styles.dayBox, isToday && styles.todayBox, { width: dayBoxWidth, minHeight: 80 }]}
                    >
                      <Text style={styles.dayDateOnly}>{format(day, 'd')}</Text>
                      {assignment && (
                        <>
                          <Text style={styles.shiftName}>{assignment.shift.name}</Text>
                          <Text style={styles.shiftTime}>{assignment.shift.start_time} - {assignment.shift.end_time}</Text>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Upcoming Tab */}
      {selectedTab === 'upcoming' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upcoming Shifts</Text>
          <Text style={styles.cardDesc}>Your scheduled shifts in the future</Text>
          {schedule.upcoming_shifts.length > 0 ? (
            <View>
              <View style={styles.headingRow}>
                <Text style={styles.tableCell}>Date</Text>
                <Text style={styles.tableCell}>Shift</Text>
                <Text style={styles.tableCell}>Time</Text>
                <Text style={styles.tableCell}>Notes</Text>
                <Text style={styles.tableCell}>Status</Text>
              </View>
              {schedule.upcoming_shifts.map((assignment) => (
                <View key={assignment.assignment_id} style={styles.tableRow}>
                  <Text style={styles.tableCell}>
                    {format(new Date(assignment.assignment_date), 'MMM dd, yyyy')}
                  </Text>
                  <Text style={styles.tableCell}>{assignment.shift.name}</Text>
                  <Text style={styles.tableCell}>
                    {assignment.shift.start_time} - {assignment.shift.end_time}
                  </Text>
                  <Text style={styles.tableCell}>{assignment.notes || '-'}</Text>
                  <Text style={[
                    styles.badge,
                    getStatusText(assignment) === 'Past' ? styles.badgePast :
                    getStatusText(assignment) === 'Today' ? styles.badgeToday :
                    styles.badgeUpcoming
                  ]}>
                    {getStatusText(assignment)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noShift}>No upcoming shifts scheduled</Text>
          )}
        </View>
      )}

      {/* Past Tab */}
      {selectedTab === 'past' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Past Shifts</Text>
          <Text style={styles.cardDesc}>Your completed shift assignments</Text>
          {schedule.past_shifts.length > 0 ? (
            <View>
              <View style={styles.headingRow}>
                <Text style={styles.tableCell}>Date</Text>
                <Text style={styles.tableCell}>Shift</Text>
                <Text style={styles.tableCell}>Time</Text>
                <Text style={styles.tableCell}>Notes</Text>
              </View>
              {schedule.past_shifts.map((assignment) => (
                <View key={assignment.assignment_id} style={styles.tableRow}>
                  <Text style={styles.tableCell}>
                    {format(new Date(assignment.assignment_date), 'MMM dd, yyyy')}
                  </Text>
                  <Text style={styles.tableCell}>{assignment.shift.name}</Text>
                  <Text style={styles.tableCell}>
                    {assignment.shift.start_time} - {assignment.shift.end_time}
                  </Text>
                  <Text style={styles.tableCell}>{assignment.notes || '-'}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noShift}>No past shifts found</Text>
          )}
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#39549fff'
  },
  headerArea: {
    backgroundColor: '#39549fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  headerIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTextContainer: {
    flex: 1,
    paddingHorizontal: 16
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#a5b4fc'
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -10
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#000'
  },
  subtitle: {
    color: '#666',
    marginBottom: 12
  },
  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#FFFFFF'
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  cardDesc: {
    color: '#6B7280',
    marginBottom: 8
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginLeft: 8,
    backgroundColor: '#F9FAFB'
  },
  buttonActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF'
  },
  buttonText: {
    fontWeight: '600',
    color: '#374151'
  },
  buttonTextActive: {
    color: '#FFFFFF'
  },
  navButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 6,
    marginHorizontal: 8
  },
  dateDisplay: {
    fontSize: 18,
    fontWeight: '600'
  },
  todayButton: {
    marginTop: 4,
    fontSize: 12,
    color: '#2563EB',
    textDecorationLine: 'underline'
  },
  tabs: {
    flexDirection: 'row',
    marginVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8
  },
  tabButtonActive: {
    backgroundColor: '#EEF2FF'
  },
  tabButtonText: {
    fontSize: 14,
    color: '#374151'
  },
  tabButtonTextActive: {
    color: '#1E40AF'
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  headingRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 6
  },
  tableCell: {
    flex: 1,
    textAlign: 'center'
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
  },
  dayBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
    margin: 2,
    backgroundColor: '#FFFFFF'
  },
  todayBox: {
    backgroundColor: '#E0F2FE'
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center'
  },
  dayDate: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4
  },
  dayDateOnly: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2
  },
  shiftName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center'
  },
  shiftTime: {
    fontSize: 11,
    color: '#6B7280'
  },
  noShift: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 4
  },
  badge: {
    marginTop: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    textAlign: 'center'
  },
  badgePast: {
    backgroundColor: '#DDD',
    color: '#000'
  },
  badgeToday: {
    backgroundColor: '#3B82F6',
    color: '#FFF'
  },
  badgeUpcoming: {
    backgroundColor: '#9CA3AF',
    color: '#FFF'
  }
});
