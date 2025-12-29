import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LeaveRequestResponse } from '../lib/api';
import { formatIST, getDayMonthIST } from '../utils/dateTime';
import { parseISO } from 'date-fns';
import { mapLeaveTypeToAPI, normalizeLeaveType } from '../utils/leaveTypeMapper';

interface EditLeaveModalProps {
  visible: boolean;
  leave: LeaveRequestResponse | null;
  onClose: () => void;
  onUpdate: (updatedData: {
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
  }) => Promise<void>;
  loading: boolean;
  getTypeColor: (type: string) => string;
}

type LeaveType = "Annual Leave" | "Sick Leave" | "Casual Leave" | "Maternity Leave" | "Paternity Leave" | "Unpaid Leave";

export const EditLeaveModal: React.FC<EditLeaveModalProps> = ({
  visible,
  leave,
  onClose,
  onUpdate,
  loading,
  getTypeColor,
}) => {
  const [form, setForm] = useState({
    type: "Annual Leave" as LeaveType,
    startDate: new Date(),
    endDate: new Date(),
    reason: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<"startDate" | "endDate">("startDate");
  const [tempDate, setTempDate] = useState(new Date());
  const [showLeaveTypeDropdown, setShowLeaveTypeDropdown] = useState(false);

  useEffect(() => {
    if (leave && visible) {
      setForm({
        type: normalizeLeaveType(leave.leave_type || 'casual') as LeaveType, // Normalize API format to display format
        startDate: typeof leave.start_date === 'string' ? parseISO(leave.start_date) : leave.start_date,
        endDate: typeof leave.end_date === 'string' ? parseISO(leave.end_date) : leave.end_date,
        reason: leave.reason || "",
      });
    }
  }, [leave, visible]);

  const openDatePicker = (field: "startDate" | "endDate") => {
    setDatePickerField(field);
    setTempDate(form[field]);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === "android") {
        setForm({ ...form, [datePickerField]: selectedDate });
      }
    }
  };

  const confirmIOSDate = () => {
    setForm({ ...form, [datePickerField]: tempDate });
    setShowDatePicker(false);
  };

  const handleSubmit = async () => {
    if (!form.reason.trim()) {
      Alert.alert("Required", "Please enter a reason for leave.");
      return;
    }

    try {
      await onUpdate({
        leave_type: mapLeaveTypeToAPI(form.type), // Convert display type to API value
        start_date: formatIST(form.startDate, "yyyy-MM-dd"),
        end_date: formatIST(form.endDate, "yyyy-MM-dd"),
        reason: form.reason,
      });
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update leave request.");
    }
  };

  const leaveTypes: LeaveType[] = [
    "Annual Leave",
    "Sick Leave",
    "Casual Leave",
    "Maternity Leave",
    "Paternity Leave",
    "Unpaid Leave",
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={["#8b5cf6", "#a78bfa"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitle}>
              <Ionicons name="pencil-outline" size={24} color="#fff" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.headerTitleText}>Edit Leave Request</Text>
                <Text style={styles.headerSubtitleText}>Update your leave details</Text>
              </View>
            </View>
            <View style={{ width: 28 }} />
          </View>
        </LinearGradient>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Leave Info Card */}
          {leave && (
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Text style={styles.infoCardTitle}>Current Leave Details</Text>
              </View>
              <View style={styles.infoCardContent}>
                <View style={styles.infoRow}>
                  <View style={styles.infoLabel}>
                    <Ionicons name="bookmark" size={16} color="#7c3aed" />
                    <Text style={styles.infoLabelText}>Type</Text>
                  </View>
                  <View
                    style={[
                      styles.infoBadge,
                      { backgroundColor: getTypeColor(normalizeLeaveType(leave.leave_type || 'casual')) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.infoBadgeText,
                        { color: getTypeColor(normalizeLeaveType(leave.leave_type || 'casual')) },
                      ]}
                    >
                      {normalizeLeaveType(leave.leave_type || 'casual')}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoLabel}>
                    <Ionicons name="calendar" size={16} color="#7c3aed" />
                    <Text style={styles.infoLabelText}>Duration</Text>
                  </View>
                  <Text style={styles.infoValue}>
                    {getDayMonthIST(leave.start_date)} - {getDayMonthIST(leave.end_date)}
                  </Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoLabel}>
                    <Ionicons name="time" size={16} color="#7c3aed" />
                    <Text style={styles.infoLabelText}>Days</Text>
                  </View>
                  <Text style={styles.infoValue}>{leave.days || 1} days</Text>
                </View>
              </View>
            </View>
          )}

          {/* Edit Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Update Leave Details</Text>

            {/* Leave Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                <Ionicons name="bookmark-outline" size={14} color="#7c3aed" /> Leave Type
              </Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowLeaveTypeDropdown(!showLeaveTypeDropdown)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View
                    style={[
                      styles.leaveTypeDot,
                      { backgroundColor: getTypeColor(form.type) },
                    ]}
                  />
                  <Text style={styles.selectInputText}>{form.type}</Text>
                </View>
                <Ionicons
                  name={showLeaveTypeDropdown ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
              {showLeaveTypeDropdown && (
                <View style={styles.dropdownList}>
                  {leaveTypes.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownItem,
                        form.type === option && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setForm({ ...form, type: option });
                        setShowLeaveTypeDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.dropdownItemDot,
                          { backgroundColor: getTypeColor(option) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.dropdownItemText,
                          form.type === option && styles.dropdownItemTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Start Date */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                <Ionicons name="calendar-outline" size={14} color="#7c3aed" /> Start Date
              </Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => openDatePicker("startDate")}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar" size={18} color="#7c3aed" />
                <Text style={styles.dateInputText}>
                  {formatIST(form.startDate, "MMM dd, yyyy")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* End Date */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                <Ionicons name="calendar-outline" size={14} color="#7c3aed" /> End Date
              </Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => openDatePicker("endDate")}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar" size={18} color="#7c3aed" />
                <Text style={styles.dateInputText}>
                  {formatIST(form.endDate, "MMM dd, yyyy")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Reason */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                <Ionicons name="document-text-outline" size={14} color="#7c3aed" /> Reason
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe the reason for your leave request..."
                placeholderTextColor="#9ca3af"
                value={form.reason}
                onChangeText={(text) => setForm({ ...form, reason: text })}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={18} color="#64748b" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#7c3aed", "#6d28d9"]}
              style={styles.updateButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="pencil" size={18} color="#fff" />
                  <Text style={styles.updateButtonText}>Update Request</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
            />
            {Platform.OS === "ios" && (
              <View style={styles.datePickerFooter}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerButton}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmIOSDate}>
                  <Text style={styles.datePickerButtonConfirm}>Confirm</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitleText: {
    fontSize: 12,
    color: '#e9d5ff',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardHeader: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  infoCardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  infoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  infoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectInputText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  leaveTypeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#f5f3ff',
  },
  dropdownItemDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  dropdownItemTextActive: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  dateInputText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  updateButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  updateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  datePickerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  datePickerButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  datePickerButtonConfirm: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
