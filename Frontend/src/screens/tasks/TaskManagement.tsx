// 📂 src/screens/tasks/TaskManagement.tsx
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from "@react-navigation/native";
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { setStatusBarStyle, StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View
} from "react-native";
import {
    FAB,
    ProgressBar
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { apiService } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";

const { width } = Dimensions.get('window');

interface Task {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in-progress" | "review" | "completed" | "cancelled";
  assignedTo: string[];
  assignedToName?: string;
  assignedBy?: string;
  assignedByRole?: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  assigned_by?: number;
  assigned_to?: number;
}


// 🎨 Modern Styles - Matching AdminDashboard & Reports Design
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8B5CF6', // Match header gradient for seamless status bar
  },
  // Header Gradient Styles
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerContent: {
    paddingHorizontal: 20,
    position: 'relative',
    zIndex: 1,
  },
  headerTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  headerTextSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  dateTimeContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontWeight: '600',
  },
  // Stats Overview Bar
  statsOverviewBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  miniStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  miniStatLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },

  // Main Content Area
  scrollView: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
  },
  // Section Header Card
  sectionHeaderCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderGradient: {
    padding: 16,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionHeaderIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionHeaderTextContainer: {
    flex: 1,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: 0.2,
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },
  // Search and Filter Row
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    height: '100%',
    fontWeight: '500',
  },
  // Status Dropdown
  statusDropdownWrapper: {
    position: 'relative',
    zIndex: 100,
  },
  statusDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minWidth: 140,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statusDropdownText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  statusDropdownList: {
    position: 'absolute',
    top: 54,
    right: 0,
    minWidth: 200,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    overflow: 'hidden',
    zIndex: 1000,
    maxHeight: 280,
  },
  statusDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusDropdownOptionActive: {
    backgroundColor: '#F0FDF4',
  },
  statusDropdownOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  statusDropdownOptionTextActive: {
    color: '#10B981',
    fontWeight: '600',
  },
  statusDropdownOptionCheck: {
    marginRight: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // View Toggle
  viewToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  viewToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  // Action Buttons Row
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  // Card View Styles
  cardViewContainer: {
    flex: 1,
    paddingBottom: 16,
    zIndex: 1,
  },
  taskCardWrapper: {
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    zIndex: 10,
  },
  taskCardHeaderLeft: {
    flex: 1,
    marginRight: 14,
  },
  taskCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  taskCardDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 10,
  },
  taskCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  taskCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  taskCardMetaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  taskCardBody: {
    padding: 18,
    paddingTop: 14,
    backgroundColor: '#fafbfc',
  },
  taskCardInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  taskCardInfoItem: {
    width: '50%',
    marginBottom: 14,
    paddingRight: 10,
  },
  taskCardInfoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  taskCardInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  taskCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  taskCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  taskCardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  taskCardActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  taskCardPassButton: {
    backgroundColor: '#F3E8FF',
    borderColor: '#E9D5FF',
  },
  taskCardPassButtonText: {
    color: '#8B5CF6',
  },
  taskCardDeleteButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  taskCardDeleteButtonText: {
    color: '#EF4444',
  },

  // Status Badge & Dropdown
  statusDropdownContainer: {
    position: 'relative',
    minWidth: 120,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 110,
  },
  statusIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  statusDropdownMenu: {
    position: 'absolute',
    top: 44,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
    minWidth: 180,
  },
  statusDropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  statusDropdownMenuItemLast: {
    borderBottomWidth: 0,
  },
  statusDropdownMenuItemActive: {
    backgroundColor: '#F9FAFB',
  },
  statusDropdownMenuItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  statusDropdownMenuItemTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  // Priority Badge
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 8,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#8B5CF6',
    elevation: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },

  // Table View Styles
  horizontalScrollContainer: {
    flex: 1,
  },
  tableWrapper: {
    minWidth: 1300,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    borderRadius: 12,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableContainer: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
    minHeight: 70,
  },
  tableRowEven: {
    backgroundColor: '#FAFBFC',
  },
  tableCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 50,
  },
  taskColumn: { width: 220 },
  assignedByColumn: { width: 180 },
  assignedToColumn: { width: 160 },
  priorityColumn: { width: 100 },
  deadlineColumn: { width: 130 },
  statusColumn: { width: 130 },
  actionsColumn: { width: 380 },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  assignedToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignedToText: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineText: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  // Action Buttons
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginRight: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginLeft: 4,
  },
  passButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  passButtonText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreenFormContainer: {
    flex: 1,
    backgroundColor: '#8B5CF6',
  },
  fullScreenCard: {
    flex: 1,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  closeButton: {
    position: 'absolute',
    top: 22,
    right: 22,
    zIndex: 1,
    padding: 4,
  },
  closeButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  progressContainer: {
    padding: 18,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#f9fafb',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 6,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    padding: 22,
    backgroundColor: '#f9fafb',
  },
  fieldContainer: {
    marginBottom: 22,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  fieldIcon: {
    marginRight: 8,
  },
  required: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111827',
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  rowContainer: {
    flexDirection: 'row',
    marginBottom: 22,
  },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 14,
    backgroundColor: '#fff',
    position: 'relative',
    overflow: 'hidden',
  },
  picker: {
    height: 54,
    color: '#111827',
  },
  priorityIndicator: {
    position: 'absolute',
    right: 14,
    top: '50%',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: -7,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    height: 54,
  },
  dateInputText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 22,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 14,
    backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b7280',
  },
  createButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  createButtonDisabled: {
    backgroundColor: '#a78bfa',
    elevation: 0,
    shadowOpacity: 0,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Task Detail Modal Styles
  taskDetailContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  taskDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  taskDetailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskDetailIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  taskDetailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  taskDetailId: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  taskDetailCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskDetailTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 22,
    backgroundColor: '#fff',
  },
  taskDetailTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  taskDetailTabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#8B5CF6',
  },
  taskDetailTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  taskDetailTabTextActive: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  taskDetailContent: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  taskDetailDetailsTab: {
    padding: 22,
  },
  taskDetailSection: {
    marginBottom: 26,
  },
  taskDetailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  taskDetailSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 10,
    letterSpacing: 0.2,
  },
  taskDetailDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  taskDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  taskDetailGridItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 18,
  },
  taskDetailFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskDetailFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 8,
  },
  taskDetailFieldValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  taskDetailPriorityBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  taskDetailPriorityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskDetailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  taskDetailStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  taskDetailStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  taskDetailTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  taskDetailTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  taskDetailTagText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  taskDetailActivityTab: {
    padding: 22,
  },
  taskDetailActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  taskDetailActivityIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  taskDetailActivityContent: {
    flex: 1,
  },
  taskDetailActivityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  taskDetailActivityTime: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  taskDetailActivityCenter: {
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 8,
  },
  taskDetailActivityCenterIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  taskDetailActivityCenterText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  taskDetailCommentsTab: {
    padding: 22,
  },
  taskDetailCommentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 26,
    gap: 14,
  },
  taskDetailCommentTextInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    maxHeight: 110,
    backgroundColor: '#fff',
  },
  taskDetailCommentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  taskDetailCommentButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  taskDetailNoComments: {
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  taskDetailNoCommentsIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  taskDetailNoCommentsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
  },
  taskDetailNoCommentsSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Export Modal Styles
  exportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  exportModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    overflow: 'hidden',
  },
  exportModalHeader: {
    backgroundColor: '#10B981',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  exportModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exportModalHeaderText: {
    flex: 1,
    paddingRight: 44,
  },
  exportModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  exportModalSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
    fontWeight: '500',
  },
  exportModalCloseButton: {
    position: 'absolute',
    top: 22,
    right: 22,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportModalBody: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    maxHeight: 450,
  },
  exportSection: {
    marginBottom: 18,
  },
  exportSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  exportSectionIcon: {
    marginRight: 8,
  },
  exportSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.2,
  },
  exportFormatButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exportFormatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    minHeight: 56,
  },
  exportFormatButtonActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  exportFormatButtonIcon: {
    marginRight: 8,
  },
  exportFormatButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  exportFormatButtonTextActive: {
    color: '#10B981',
  },
  exportDropdown: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  exportDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  exportDropdownText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
  },
  exportDropdownList: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    maxHeight: 180,
  },
  exportDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  exportDropdownOptionLast: {
    borderBottomWidth: 0,
  },
  exportDropdownOptionText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    fontWeight: '500',
  },
  exportSummaryBox: {
    backgroundColor: '#D1FAE5',
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
  },
  exportSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  exportSummaryItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  exportSummaryLabel: {
    fontSize: 13,
    color: '#047857',
    fontWeight: '600',
  },
  exportSummaryValue: {
    fontSize: 13,
    color: '#065F46',
    marginLeft: 6,
    fontWeight: '700',
  },
  exportModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
    backgroundColor: '#fff',
  },
  exportCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  exportCancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  exportConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#10B981',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    gap: 8,
    minHeight: 52,
  },
  exportConfirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
    elevation: 0,
    shadowOpacity: 0,
  },
  exportConfirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Pass Task Modal Styles
  passModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  passModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 600,
    minHeight: 420,
    maxHeight: '85%',
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    overflow: 'hidden',
  },
  passModalHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 26,
    paddingTop: 26,
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  passModalIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },
  passModalTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  passModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  passModalBody: {
    flex: 1,
    paddingHorizontal: 26,
    paddingVertical: 22,
  },
  passModalFieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  passModalFieldLabelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 10,
  },
  passModalPicker: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderRadius: 14,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  passModalTextArea: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#111827',
    height: 130,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  passModalFooter: {
    flexDirection: 'row',
    padding: 22,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 32 : 22,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 14,
    backgroundColor: '#fff',
  },
  passModalCancelButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  passModalCancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  passModalSubmitButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  passModalSubmitButtonDisabled: {
    backgroundColor: '#A78BFA',
    elevation: 0,
    shadowOpacity: 0,
  },
  passModalSubmitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
});


export default function TaskManagement() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isDarkMode, colors } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [taskDetailModalVisible, setTaskDetailModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"details" | "activity" | "comments">("details");
  const [filter, setFilter] = useState<"all" | Task["status"]>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [formProgress, setFormProgress] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  
  const { onScroll, scrollEventThrottle, tabBarHeight, tabBarVisible } = useAutoHideTabBarOnScroll({
    threshold: 16,
    overscrollMargin: 50,
  });
  
  // Pass task modal state
  const [passTaskModalVisible, setPassTaskModalVisible] = useState(false);
  const [taskToPass, setTaskToPass] = useState<Task | null>(null);
  const [passTaskData, setPassTaskData] = useState({ assignee: "", reason: "" });
  
  // Status dropdown state
  const [statusDropdownTaskId, setStatusDropdownTaskId] = useState<string | null>(null);
  
  // View mode state
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  
  // Task Activity/History state
  const [taskActivity, setTaskActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  
  // Task Comments state (stored locally since backend doesn't have comments API)
  // Task Comments state (from backend API)
  const [taskComments, setTaskComments] = useState<Array<{id: number; task_id: number; user_id: number; message: string; created_at: string; user_name: string}>>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [exportDateRange, setExportDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [exportUserFilter, setExportUserFilter] = useState<'all' | string>('all');
  const [customDateStart, setCustomDateStart] = useState<Date>(new Date());
  const [customDateEnd, setCustomDateEnd] = useState<Date>(new Date());
  const [dateRangeDropdownOpen, setDateRangeDropdownOpen] = useState(false);
  const [userFilterDropdownOpen, setUserFilterDropdownOpen] = useState(false);
  
  // Form animation values
  const formScaleY = useRef(new Animated.Value(0.9)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const titleInputAnim = useRef(new Animated.Value(0)).current;
  const descInputAnim = useRef(new Animated.Value(0)).current;
  const priorityInputAnim = useRef(new Animated.Value(0)).current;
  const deadlineInputAnim = useRef(new Animated.Value(0)).current;
  const assignInputAnim = useRef(new Animated.Value(0)).current;
  const deptInputAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as Task["priority"],
    deadline: "",
    assignedTo: "",
    department: "",
    employeeId: "",
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [employees, setEmployees] = useState<Array<{ 
    id: string; 
    name: string; 
    email: string;
    employee_id: string;
    department?: string;
    role?: string;
    user_id?: number;
  }>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Task Manager", message);
    }
  };

  // Helper function to format date and time properly in local timezone
  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      year: 'numeric' 
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    return `${dateStr} at ${timeStr}`;
  };

  // Helper function to format time only
  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };


  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    let isValid = true;
    if (!newTask.title.trim()) { errors.title = "Title is required"; isValid = false; }
    if (!newTask.description.trim()) { errors.description = "Description is required"; isValid = false; }
    if (!newTask.deadline) { errors.deadline = "Please select a deadline"; isValid = false; }
    if (!newTask.assignedTo) { errors.assignedTo = "Please assign to someone"; isValid = false; }
    setFormErrors(errors);
    return isValid;
  };

  const calculateProgress = () => {
    const fields = ['title', 'description', 'deadline', 'assignedTo', 'department', 'employeeId'];
    const filledFields = fields.filter(field => !!newTask[field as keyof typeof newTask]);
    setFormProgress(filledFields.length / fields.length);
  };

  const updateField = (field: string, value: string) => {
    setNewTask(prev => ({ ...prev, [field]: value }));
    setTimeout(() => calculateProgress(), 100);
  };

  const animateFormElements = () => {
    formScaleY.setValue(0.9);
    formOpacity.setValue(0);
    titleInputAnim.setValue(0);
    descInputAnim.setValue(0);
    priorityInputAnim.setValue(0);
    deadlineInputAnim.setValue(0);
    assignInputAnim.setValue(0);
    deptInputAnim.setValue(0);
    
    Animated.sequence([
      Animated.parallel([
        Animated.timing(formScaleY, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.back(1.7)) }),
        Animated.timing(formOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.stagger(50, [
        Animated.timing(titleInputAnim, { toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(descInputAnim, { toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(priorityInputAnim, { toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(deadlineInputAnim, { toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(assignInputAnim, { toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(deptInputAnim, { toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]),
    ]).start();
  };

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 800, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  const mapBackendStatus = (backendStatus: string): Task["status"] => {
    const statusMap: { [key: string]: Task["status"] } = {
      "Pending": "todo", "In Progress": "in-progress", "Review": "review", "Completed": "completed", "Cancelled": "cancelled",
    };
    return statusMap[backendStatus] || "todo";
  };

  const mapFrontendStatus = (frontendStatus: Task["status"]): string => {
    const statusMap: { [key: string]: string } = {
      "todo": "Pending", "in-progress": "In Progress", "review": "Review", "completed": "Completed", "cancelled": "Cancelled",
    };
    return statusMap[frontendStatus] || "Pending";
  };

  const loadTasks = async (retryCount = 0) => {
    try {
      // Admin sees all tasks from all departments, others see their own tasks
      const userRole = user?.role?.toLowerCase();
      const backendTasks = userRole === 'admin' 
        ? await apiService.getAllTasks()
        : await apiService.getMyTasks();
      
      // Try to fetch ALL employees for task display (to show assignedBy/assignedTo names)
      // This is separate from the filtered employee list used for assignment dropdown
      let allEmployeesList: any[] = [];
      try {
        const allEmployees = await apiService.getEmployees(true); // forReports=true to get all employees
        allEmployeesList = allEmployees.map((emp: any) => ({
          id: emp.user_id?.toString() || emp.id,
          name: emp.name,
          email: emp.email,
          employee_id: emp.employee_id,
          department: emp.department,
          role: emp.role || emp.department,
          user_id: emp.user_id,
        }));
      } catch (empError: any) {
        // If employees fail to load, continue with tasks but without employee names
        console.warn("Could not load employees for task display:", empError.message);
        // Use the already loaded employees list if available
        if (employees.length > 0) {
          allEmployeesList = employees;
        }
      }
      
      const transformedTasks: Task[] = backendTasks.map((task: any) => {
        const assignedToEmployee = allEmployeesList.find(emp => emp.user_id === task.assigned_to);
        const assignedByEmployee = allEmployeesList.find(emp => emp.user_id === task.assigned_by);
        return {
          id: task.task_id.toString(),
          title: task.title,
          description: task.description,
          priority: task.priority.toLowerCase() as "low" | "medium" | "high" | "urgent",
          status: mapBackendStatus(task.status),
          assignedTo: [assignedToEmployee?.email || user?.email || ""],
          assignedToName: assignedToEmployee?.name || `User #${task.assigned_to}`,
          assignedBy: assignedByEmployee?.name || `User #${task.assigned_by}`,
          assignedByRole: assignedByEmployee?.role || assignedByEmployee?.department || "N/A",
          deadline: task.due_date,
          createdAt: task.created_at,
          updatedAt: task.updated_at,
          assigned_by: task.assigned_by,
          assigned_to: task.assigned_to,
        };
      });
      setTasks(transformedTasks);
    } catch (error: any) {
      console.error("Error loading tasks:", error);
      // Retry on authentication error
      if (error.message?.includes('Not authenticated') && retryCount < 3) {
        console.log(`Retrying loadTasks... attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
        return loadTasks(retryCount + 1);
      }
      showToast("Failed to load tasks");
    }
  };

  const loadEmployees = async (retryCount = 0) => {
    try {
      setLoadingEmployees(true);
      const backendEmployees = await apiService.getEmployees();
      let transformedEmployees = backendEmployees.map((emp: any) => ({
        id: emp.user_id?.toString() || emp.id,
        name: emp.name,
        email: emp.email,
        employee_id: emp.employee_id,
        department: emp.department,
        role: emp.role || emp.department,
        user_id: emp.user_id,
      }));

      // Filter employees based on role
      const userRole = user?.role?.toLowerCase();
      const userDepartment = user?.department;
      
      if (userRole === 'employee') {
        // Employee can only assign tasks to themselves
        transformedEmployees = transformedEmployees.filter(
          (emp: any) => emp.user_id === user?.user_id || emp.email === user?.email
        );
      } else if (userRole === 'admin') {
        // Admin can assign tasks to ALL departments (HR, Manager, Team Lead, Employee)
        // No filtering needed - admin sees all employees
      } else if ((userRole === 'hr' || userRole === 'manager') && userDepartment) {
        // HR and Manager can assign to:
        // 1. Themselves
        // 2. Manager, Team Lead, and Employee in their department only
        transformedEmployees = transformedEmployees.filter(
          (emp: any) => {
            // Include self
            if (emp.user_id === user?.user_id || emp.email === user?.email) {
              return true;
            }
            // Include only employees from the same department
            return emp.department?.toLowerCase() === userDepartment.toLowerCase();
          }
        );
      }

      setEmployees(transformedEmployees);
    } catch (error: any) {
      console.error("Error loading employees:", error);
      // Retry on authentication error (token might not be ready yet on iOS)
      if (error.message?.includes('Not authenticated') && retryCount < 3) {
        console.log(`Retrying loadEmployees... attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
        return loadEmployees(retryCount + 1);
      }
      // Don't show toast for auth errors - tasks can still be displayed
      if (!error.message?.includes('Not authenticated')) {
        showToast("Failed to load employees");
      }
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleEmployeeSelect = (email: string) => {
    updateField('assignedTo', email);
    const selectedEmployee = employees.find(emp => emp.email === email);
    if (selectedEmployee) {
      setNewTask(prev => ({
        ...prev,
        assignedTo: email,
        department: selectedEmployee.department || '',
        employeeId: selectedEmployee.employee_id || '',
      }));
      setTimeout(() => calculateProgress(), 100);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadEmployees();
      setTimeout(async () => {
        await loadTasks();
        setLoading(false);
        startAnimations();
      }, 100);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (employees.length > 0 && tasks.length > 0) {
      loadTasks();
    }
  }, [employees.length]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every 60 seconds

    return () => clearInterval(timer);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };


  const openTaskModal = () => {
    setIsEditMode(false);
    setEditingTaskId(null);
    
    // Auto-select self for employee role
    const userRole = user?.role?.toLowerCase();
    if (userRole === 'employee' && user?.email) {
      const selfEmployee = employees.find(emp => emp.email === user.email || emp.user_id === user.user_id);
      if (selfEmployee) {
        setNewTask(prev => ({
          ...prev,
          assignedTo: selfEmployee.email,
          department: selfEmployee.department || '',
          employeeId: selfEmployee.employee_id || '',
        }));
      }
    }
    
    setModalVisible(true);
    setTimeout(() => {
      animateFormElements();
      setFormProgress(0);
      setFormErrors({});
      if (Platform.OS === 'ios') setStatusBarStyle('light');
    }, 100);
  };

  const openEditTaskModal = (task: Task) => {
    setIsEditMode(true);
    setEditingTaskId(task.id);
    setNewTask({
      title: task.title,
      description: task.description,
      priority: task.priority,
      deadline: task.deadline ? task.deadline.split('T')[0] : "",
      assignedTo: task.assignedToName || task.assignedTo?.[0] || "",
      department: "",
      employeeId: "",
    });
    if (task.deadline) {
      setSelectedDate(new Date(task.deadline));
    }
    setModalVisible(true);
    setTimeout(() => {
      animateFormElements();
      calculateProgress();
      setFormErrors({});
      if (Platform.OS === 'ios') setStatusBarStyle('light');
    }, 100);
  };

  const closeTaskForm = () => {
    Keyboard.dismiss();
    setModalVisible(false);
    setIsEditMode(false);
    setEditingTaskId(null);
    setNewTask({ title: "", description: "", priority: "medium", deadline: "", assignedTo: "", department: "", employeeId: "" });
    setShowDatePicker(false);
    if (Platform.OS === 'ios') setStatusBarStyle('dark');
  };

  const openPassTaskModal = (task: Task) => {
    setTaskToPass(task);
    setPassTaskData({ assignee: "", reason: "" });
    setPassTaskModalVisible(true);
  };

  const closePassTaskModal = () => {
    setPassTaskModalVisible(false);
    setTaskToPass(null);
    setPassTaskData({ assignee: "", reason: "" });
  };

  const handlePassTask = async () => {
    if (!taskToPass) return;
    if (!passTaskData.assignee) { showToast("Please select an assignee"); return; }
    if (!passTaskData.reason.trim()) { showToast("Please provide a reason"); return; }
    
    try {
      setIsSubmitting(true);
      const selectedEmployee = employees.find(emp => emp.email === passTaskData.assignee);
      if (!selectedEmployee || !selectedEmployee.user_id) throw new Error("Selected employee not found");
      
      // Use the proper pass task API endpoint
      await apiService.passTask(
        parseInt(taskToPass.id), 
        selectedEmployee.user_id, 
        passTaskData.reason
      );
      
      showToast("✅ Task passed successfully");
      closePassTaskModal();
      await loadTasks();
    } catch (error: any) {
      console.error("Error passing task:", error);
      showToast(error.message || "Failed to pass task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      updateField('deadline', date.toISOString().split('T')[0]);
    }
  };

  const handleDatePickerPress = () => {
    Keyboard.dismiss();
    setShowDatePicker(true);
  };

  const openTaskDetail = async (task: Task) => {
    setSelectedTask(task);
    setActiveDetailTab("details");
    setTaskDetailModalVisible(true);
    setNewComment("");
    setTaskComments([]);
    
    // Fetch task activity/history and comments
    fetchTaskActivity(parseInt(task.id));
    fetchTaskComments(parseInt(task.id));
  };

  const fetchTaskActivity = async (taskId: number) => {
    setLoadingActivity(true);
    try {
      const history = await apiService.getTaskHistory(taskId);
      setTaskActivity(Array.isArray(history) ? history : []);
    } catch (error) {
      console.log("Error fetching task activity:", error);
      setTaskActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  const fetchTaskComments = async (taskId: number) => {
    setLoadingComments(true);
    try {
      const comments = await apiService.getTaskComments(taskId);
      setTaskComments(Array.isArray(comments) ? comments : []);
    } catch (error) {
      console.log("Error fetching task comments:", error);
      setTaskComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const closeTaskDetail = () => {
    setTaskDetailModalVisible(false);
    setSelectedTask(null);
    setTaskActivity([]);
    setTaskComments([]);
    setNewComment("");
  };

  const handlePostComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    
    setPostingComment(true);
    try {
      // Post comment to backend API
      const newCommentData = await apiService.addTaskComment(
        parseInt(selectedTask.id),
        newComment.trim()
      );
      
      // Add the new comment to the list
      setTaskComments(prev => [...prev, newCommentData]);
      setNewComment("");
      showToast("Comment posted");
    } catch (error: any) {
      console.log("Error posting comment:", error);
      showToast(error.message || "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!selectedTask) return;
    
    Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiService.deleteTaskComment(parseInt(selectedTask.id), commentId);
            setTaskComments(prev => prev.filter(c => c.id !== commentId));
            showToast("Comment deleted");
          } catch (error: any) {
            console.log("Error deleting comment:", error);
            showToast(error.message || "Failed to delete comment");
          }
        },
      },
    ]);
  };

  const getActivityIcon = (action: string) => {
    switch (action?.toLowerCase()) {
      case "created": return { name: "add-circle", color: "#10B981", bgColor: "#ECFDF5" };
      case "status_changed": return { name: "sync", color: "#F97316", bgColor: "#FFF7ED" };
      case "passed": return { name: "git-branch", color: "#8B5CF6", bgColor: "#F3E8FF" };
      case "updated": return { name: "create", color: "#3B82F6", bgColor: "#EFF6FF" };
      case "completed": return { name: "checkmark-circle", color: "#10B981", bgColor: "#ECFDF5" };
      default: return { name: "ellipse", color: "#6B7280", bgColor: "#F3F4F6" };
    }
  };

  const getActivityTitle = (action: string) => {
    switch (action?.toLowerCase()) {
      case "created": return "Task Created";
      case "status_changed": return "Status Changed";
      case "passed": return "Task Passed";
      case "updated": return "Task Updated";
      case "completed": return "Task Completed";
      default: return "Activity";
    }
  };

  // Helper to format backend status to readable format
  const formatBackendStatus = (status: string | undefined): string => {
    if (!status) return "Unknown";
    // Handle enum format like "TaskStatus.PENDING" or just "Pending"
    const cleanStatus = status.replace("TaskStatus.", "").replace(/_/g, " ");
    // Capitalize first letter of each word
    return cleanStatus.split(" ").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(" ");
  };

  const formatActivityDescription = (activity: any) => {
    const action = activity.action?.toLowerCase();
    const details = activity.details || {};
    
    switch (action) {
      case "created":
        const createdStatus = formatBackendStatus(details.status);
        return `Task was created with status: ${createdStatus}`;
      case "status_changed":
        // Backend uses "from" and "to" keys
        const oldStatus = formatBackendStatus(details.from || details.old_status || details.from_status);
        const newStatus = formatBackendStatus(details.to || details.new_status || details.to_status || details.status);
        return { type: "status_change", from: oldStatus, to: newStatus };
      case "passed":
        return { type: "passed", from: details.from_name || "Someone", to: details.to_name || "Someone" };
      case "updated":
        // Show what was updated if available
        if (details.changes) {
          const changedFields = Object.keys(details.changes).join(", ");
          return `Updated: ${changedFields}`;
        }
        return "Task details were updated";
      case "completed":
        return "Task was marked as completed";
      default:
        return activity.action || "Activity recorded";
    }
  };

  const getActivityUserName = (activity: any) => {
    // Try to get user name from activity details or find from employees list
    const userId = activity.user_id;
    if (activity.details?.user_name) return activity.details.user_name;
    if (activity.details?.from_name && activity.action?.toLowerCase() === "passed") return activity.details.from_name;
    
    const employee = employees.find(emp => emp.user_id === userId);
    return employee?.name || `User #${userId}`;
  };

  const createTask = async () => {
    Keyboard.dismiss();
    if (!validateForm()) {
      Animated.sequence([
        Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedEmployee = employees.find(emp => emp.email === newTask.assignedTo);
      if (!selectedEmployee || !selectedEmployee.user_id) throw new Error("Selected employee not found");

      let currentUserId = user?.user_id;
      if (!currentUserId && user?.id) currentUserId = parseInt(user.id);
      if (!currentUserId || isNaN(currentUserId)) throw new Error("Current user ID not found");

      const priorityMap: { [key: string]: "Low" | "Medium" | "High" | "Urgent" } = {
        "low": "Low", "medium": "Medium", "high": "High", "urgent": "Urgent",
      };

      if (isEditMode && editingTaskId) {
        // Update existing task
        await apiService.updateTask(parseInt(editingTaskId), {
          title: newTask.title,
          description: newTask.description,
          due_date: newTask.deadline,
          priority: priorityMap[newTask.priority],
          assigned_to: selectedEmployee.user_id,
        });

        Animated.sequence([
          Animated.timing(buttonScale, { toValue: 1.1, duration: 200, useNativeDriver: true }),
          Animated.timing(buttonScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();

        showToast("✅ Task updated successfully");
      } else {
        // Create new task
        await apiService.createTask({
          title: newTask.title,
          description: newTask.description,
          due_date: newTask.deadline,
          priority: priorityMap[newTask.priority],
          assigned_to: selectedEmployee.user_id,
          assigned_by: currentUserId,
        });

        Animated.sequence([
          Animated.timing(buttonScale, { toValue: 1.1, duration: 200, useNativeDriver: true }),
          Animated.timing(buttonScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();

        showToast("✅ Task created successfully");
      }

      setNewTask({ title: "", description: "", priority: "medium", deadline: "", assignedTo: "", department: "", employeeId: "" });
      setIsEditMode(false);
      setEditingTaskId(null);
      await loadTasks();
      setTimeout(() => { setModalVisible(false); setIsSubmitting(false); }, 500);
    } catch (error: any) {
      console.error("Error creating/updating task:", error);
      setIsSubmitting(false);
      showToast(error.message || `Failed to ${isEditMode ? 'update' : 'create'} task`);
    }
  };

  const updateTaskStatus = async (id: string, newStatus: Task["status"]) => {
    try {
      await apiService.updateTaskStatus(parseInt(id), { status: mapFrontendStatus(newStatus) as any });
      await loadTasks();
      showToast(`Status updated → ${formatStatusLabel(newStatus)}`);
    } catch (error: any) {
      console.error("Error updating task status:", error);
      showToast(error.message || "Failed to update status");
    }
  };

  const deleteTask = async (id: string) => {
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiService.deleteTask(parseInt(id));
            await loadTasks();
            showToast("✅ Task deleted successfully");
          } catch (error: any) {
            console.error("Error deleting task:", error);
            showToast(error.message || "Failed to delete task");
          }
        },
      },
    ]);
  };


  // Filtered tasks
  const filteredTasks = tasks.filter(
    (t) => (filter === "all" || t.status === filter) &&
      (t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Helper functions
  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "low": return "#16a34a";
      case "medium": return "#eab308";
      case "high": return "#f97316";
      case "urgent": return "#dc2626";
      default: return "#6b7280";
    }
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "todo": return "#9CA3AF";
      case "in-progress": return "#3B82F6";
      case "review": return "#8B5CF6";
      case "completed": return "#10B981";
      case "cancelled": return "#EF4444";
      default: return "#6b7280";
    }
  };

  const formatStatusLabel = (status: Task["status"]) => {
    switch (status) {
      case "todo": return "Todo";
      case "in-progress": return "In Progress";
      case "review": return "Review";
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  // Stats
  const totalTasks = tasks.length;
  const todoCount = tasks.filter(t => t.status === "todo").length;
  const inProgressCount = tasks.filter(t => t.status === "in-progress").length;
  const completedCount = tasks.filter(t => t.status === "completed").length;
  const overdueCount = tasks.filter((t) => {
    if (!t.deadline) return false;
    return new Date(t.deadline) < new Date() && t.status !== "completed";
  }).length;

  const statusFilterOptions: { label: string; value: "all" | Task["status"] }[] = [
    { label: "All Status", value: "all" },
    { label: "Todo", value: "todo" },
    { label: "In Progress", value: "in-progress" },
    { label: "Review", value: "review" },
    { label: "Completed", value: "completed" },
  ];

  const activeStatusOption = statusFilterOptions.find((opt) => opt.value === filter);

  // Export functions
  const getExportFilteredTasks = () => {
    let tasksToExport = [...filteredTasks];
    if (exportDateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      tasksToExport = tasksToExport.filter(task => {
        const taskDate = new Date(task.createdAt);
        switch (exportDateRange) {
          case 'today': return taskDate >= today;
          case 'week': const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7); return taskDate >= weekAgo;
          case 'month': const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1); return taskDate >= monthAgo;
          case 'custom': return taskDate >= customDateStart && taskDate <= customDateEnd;
          default: return true;
        }
      });
    }
    if (exportUserFilter !== 'all') {
      tasksToExport = tasksToExport.filter(task => task.assignedTo.includes(exportUserFilter));
    }
    return tasksToExport;
  };

  const getDateRangeLabel = () => {
    switch (exportDateRange) {
      case 'all': return 'All Time';
      case 'today': return 'Today';
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case 'custom': return `${customDateStart.toLocaleDateString()} - ${customDateEnd.toLocaleDateString()}`;
      default: return 'All Time';
    }
  };

  const getUserFilterLabel = () => {
    if (exportUserFilter === 'all') return 'All Users';
    const employee = employees.find(emp => emp.email === exportUserFilter);
    return employee ? employee.name : exportUserFilter;
  };

  const exportTasksToCSV = async () => {
    try {
      setIsExporting(true);
      const tasksToExport = getExportFilteredTasks();
      const headers = ["Task ID", "Title", "Description", "Priority", "Status", "Assigned To", "Deadline", "Created At"];
      const csvRows = [headers.join(",")];
      tasksToExport.forEach(task => {
        const row = [
          task.id,
          `"${task.title.replace(/"/g, '""')}"`,
          `"${task.description.replace(/"/g, '""')}"`,
          task.priority,
          formatStatusLabel(task.status),
          task.assignedTo.length > 0 ? task.assignedTo[0] : "",
          task.deadline || "Not set",
          new Date(task.createdAt).toLocaleDateString('en-US')
        ];
        csvRows.push(row.join(","));
      });
      const csvContent = csvRows.join("\n");

      if (FileSystem && (FileSystem as any).documentDirectory) {
        try {
          const directory = (FileSystem as any).documentDirectory;
          const fileName = `tasks_export_${new Date().toISOString().split('T')[0]}.csv`;
          const fileUri = `${directory}${fileName}`;
          await (FileSystem as any).writeAsStringAsync(fileUri, csvContent, { encoding: (FileSystem as any).EncodingType?.UTF8 });
          if (Sharing && typeof Sharing.isAvailableAsync === 'function') {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Tasks', UTI: 'public.comma-separated-values-text' });
              showToast(`✅ Exported ${tasksToExport.length} tasks`);
              setExportModalVisible(false);
              return;
            }
          }
        } catch (fsError) { console.error("FileSystem approach failed:", fsError); }
      }

      if (Share && typeof Share.share === 'function') {
        const result = await Share.share({ message: csvContent, title: `Task Export - ${new Date().toLocaleDateString()}` });
        if (result.action === Share.sharedAction) {
          showToast(`✅ Exported ${tasksToExport.length} tasks`);
          setExportModalVisible(false);
        }
      }
    } catch (error: any) {
      console.error("Error exporting tasks:", error);
      showToast(`Failed to export: ${error.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportTasksToPDF = async () => {
    try {
      setIsExporting(true);
      const tasksToExport = getExportFilteredTasks();
      const textReport = `TASK REPORT\nGenerated: ${new Date().toLocaleDateString()}\nTotal Tasks: ${tasksToExport.length}\n\n${tasksToExport.map((task, i) => `${i + 1}. ${task.title}\n   Priority: ${task.priority} | Status: ${formatStatusLabel(task.status)}\n   Deadline: ${task.deadline || 'Not set'}`).join('\n\n')}`;

      if (Share && typeof Share.share === 'function') {
        const result = await Share.share({ message: textReport, title: `Task Report - ${new Date().toLocaleDateString()}` });
        if (result.action === Share.sharedAction) {
          showToast(`✅ Exported ${tasksToExport.length} tasks`);
          setExportModalVisible(false);
        }
      }
    } catch (error: any) {
      console.error("Error exporting to PDF:", error);
      showToast(`Failed to export: ${error.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    if (exportFormat === 'csv') exportTasksToCSV();
    else exportTasksToPDF();
  };

  const openExportModal = () => {
    setExportModalVisible(true);
    setDateRangeDropdownOpen(false);
    setUserFilterDropdownOpen(false);
  };

  const closeExportModal = () => {
    setExportModalVisible(false);
    setDateRangeDropdownOpen(false);
    setUserFilterDropdownOpen(false);
  };


  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" backgroundColor="#8B5CF6" translucent={false} />
        <LinearGradient colors={['#8B5CF6', '#7C3AED', '#6D28D9']} style={styles.headerGradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading Tasks...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" backgroundColor="#8B5CF6" translucent={false} />
      
      {/* Modern Header with Gradient */}
      <LinearGradient colors={['#8B5CF6', '#7C3AED', '#6D28D9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        {/* Background Pattern */}
        <View style={styles.headerPattern}>
          <View style={[styles.patternCircle, { top: -25, right: -25, width: 130, height: 130 }]} />
          <View style={[styles.patternCircle, { bottom: -35, left: -35, width: 160, height: 160 }]} />
          <View style={[styles.patternCircle, { top: 45, right: 70, width: 90, height: 90 }]} />
        </View>

        <Animated.View style={[styles.headerContent, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
          {/* Header Top Section */}
          <View style={styles.headerTopSection}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerTextSection}>
                <Text style={styles.headerTitle}>Task Management</Text>
                <Text style={styles.headerSubtitle}>Organize and track your team's tasks</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.dateTimeContainer}>
                <Text style={styles.timeText}>{currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
                <Text style={styles.dateText}>{currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              </View>
            </View>
          </View>

          {/* Stats Overview Bar */}
          <View style={styles.statsOverviewBar}>
            <View style={styles.miniStatItem}>
              <Ionicons name="list-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{totalTasks}</Text>
              <Text style={styles.miniStatLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{inProgressCount}</Text>
              <Text style={styles.miniStatLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{completedCount}</Text>
              <Text style={styles.miniStatLabel}>Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStatItem}>
              <Ionicons name="alert-circle-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.miniStatValue}>{overdueCount}</Text>
              <Text style={styles.miniStatLabel}>Overdue</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarVisible ? tabBarHeight + 100 : 100 }]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B5CF6']} />}
      >
        <Animated.View style={{ opacity: contentAnim, transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
          {/* Section Header Card */}
          <View style={styles.sectionHeaderCard}>
            <LinearGradient colors={['#F3E8FF', '#E9D5FF']} style={styles.sectionHeaderGradient}>
              <View style={styles.sectionHeaderContent}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.sectionHeaderIconBg, { backgroundColor: '#8B5CF6' }]}>
                    <Ionicons name="briefcase" size={22} color="#fff" />
                  </View>
                  <View style={styles.sectionHeaderTextContainer}>
                    <Text style={styles.sectionHeaderTitle}>Task Management</Text>
                    <Text style={styles.sectionHeaderSubtitle}>{filteredTasks.length} tasks • {filter === 'all' ? 'All Status' : formatStatusLabel(filter)}</Text>
                  </View>
                </View>
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity style={styles.exportButton} onPress={openExportModal} disabled={filteredTasks.length === 0}>
                    <Ionicons name="download-outline" size={20} color={filteredTasks.length === 0 ? "#D1D5DB" : "#8B5CF6"} />
                  </TouchableOpacity>
                  <View style={styles.viewToggleContainer}>
                    <TouchableOpacity style={[styles.viewToggleButton, viewMode === 'card' && styles.viewToggleButtonActive]} onPress={() => setViewMode('card')}>
                      <Ionicons name="grid" size={18} color={viewMode === 'card' ? "#fff" : "#6B7280"} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.viewToggleButton, viewMode === 'table' && styles.viewToggleButtonActive]} onPress={() => setViewMode('table')}>
                      <Ionicons name="list" size={18} color={viewMode === 'table' ? "#fff" : "#6B7280"} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Search and Filter Row */}
          <View style={styles.searchFilterRow}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput style={styles.searchInput} placeholder="Search tasks..." placeholderTextColor="#9CA3AF" value={searchQuery} onChangeText={setSearchQuery} />
            </View>
            <View style={styles.statusDropdownWrapper}>
              <TouchableOpacity style={styles.statusDropdownTrigger} activeOpacity={0.7} onPress={() => setStatusDropdownOpen(!statusDropdownOpen)}>
                <Text style={styles.statusDropdownText}>{activeStatusOption?.label ?? "All Status"}</Text>
                <Ionicons name={statusDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color="#9CA3AF" />
              </TouchableOpacity>
              {statusDropdownOpen && (
                <ScrollView style={styles.statusDropdownList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {statusFilterOptions.map((option, index) => {
                    const isActive = option.value === filter;
                    const statusColor = option.value === "all" ? "#6B7280" : getStatusColor(option.value as Task["status"]);
                    return (
                      <TouchableOpacity key={option.value} style={[styles.statusDropdownOption, isActive && styles.statusDropdownOptionActive, index === statusFilterOptions.length - 1 && { borderBottomWidth: 0 }]} activeOpacity={0.7} onPress={() => { setFilter(option.value); setStatusDropdownOpen(false); }}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusDropdownOptionText, isActive && styles.statusDropdownOptionTextActive]}>{option.label}</Text>
                        {isActive && <Ionicons name="checkmark" size={18} color="#10B981" style={styles.statusDropdownOptionCheck} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>


          {/* Card View */}
          {viewMode === 'card' ? (
            <View style={styles.cardViewContainer}>
              {filteredTasks.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIcon}>
                    <Ionicons name="clipboard-outline" size={40} color="#9CA3AF" />
                  </View>
                  <Text style={styles.emptyStateText}>No tasks found</Text>
                  <Text style={styles.emptyStateSubtext}>Create a new task to get started</Text>
                </View>
              ) : (
                <>
                  {/* Backdrop for closing dropdown */}
                  {statusDropdownTaskId && (
                    <TouchableOpacity 
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        zIndex: 9998,
                        backgroundColor: 'transparent',
                      }} 
                      onPress={() => setStatusDropdownTaskId(null)} 
                      activeOpacity={1} 
                    />
                  )}
                  {filteredTasks.map((item, index) => (
                    <View key={item.id} style={[styles.taskCardWrapper, statusDropdownTaskId === item.id && { zIndex: 9999, elevation: 999 }]}>
                      {/* Card Header */}
                      <View style={[styles.taskCardHeader, statusDropdownTaskId === item.id && { zIndex: 9999 }]}>
                        <View style={styles.taskCardHeaderLeft}>
                          <Text style={styles.taskCardTitle} numberOfLines={2}>{item.title}</Text>
                          <Text style={styles.taskCardDescription} numberOfLines={2}>{item.description}</Text>
                          <View style={styles.taskCardMetaRow}>
                            <View style={styles.taskCardMetaItem}>
                              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                              <Text style={styles.taskCardMetaText}>{item.deadline ? new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "No deadline"}</Text>
                            </View>
                            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                              <Text style={styles.priorityText}>{item.priority}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={[styles.statusDropdownContainer, statusDropdownTaskId === item.id && { zIndex: 10000 }]}>
                          <TouchableOpacity 
                            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]} 
                            onPress={() => setStatusDropdownTaskId(statusDropdownTaskId === item.id ? null : item.id)} 
                            activeOpacity={0.8}
                          >
                            <View style={styles.statusIndicator} />
                            <Text style={styles.statusText} numberOfLines={1}>{formatStatusLabel(item.status)}</Text>
                            <Ionicons name={statusDropdownTaskId === item.id ? "chevron-up" : "chevron-down"} size={14} color="#fff" style={{ marginLeft: 4 }} />
                          </TouchableOpacity>
                          
                          {statusDropdownTaskId === item.id && (
                            <View style={[styles.statusDropdownMenu, { zIndex: 10001 }]}>
                              {(() => {
                                // Define the workflow sequence
                                const workflowSequence = ['todo', 'in-progress', 'review', 'completed'];
                                const statusLabels: { [key: string]: string } = {
                                  'todo': 'Todo',
                                  'in-progress': 'In Progress',
                                  'review': 'Review',
                                  'completed': 'Completed',
                                };
                                const statusColors: { [key: string]: string } = {
                                  'todo': '#9CA3AF',
                                  'in-progress': '#3B82F6',
                                  'review': '#8B5CF6',
                                  'completed': '#10B981',
                                };
                                
                                // Get current status index
                                const currentStatusIndex = workflowSequence.indexOf(item.status);
                                
                                // Build available options based on current status
                                let availableOptions: Array<{ value: string; label: string; color: string }> = [];
                                
                                // Always show current status
                                availableOptions.push({
                                  value: item.status,
                                  label: statusLabels[item.status],
                                  color: statusColors[item.status],
                                });
                                
                                // Show next status in sequence if not at the end
                                if (currentStatusIndex < workflowSequence.length - 1) {
                                  const nextStatus = workflowSequence[currentStatusIndex + 1];
                                  availableOptions.push({
                                    value: nextStatus,
                                    label: statusLabels[nextStatus],
                                    color: statusColors[nextStatus],
                                  });
                                }
                                
                                // Add Cancelled option only if current user is the creator (assigned_by)
                                const isCreator = item.assigned_by === user?.user_id;
                                if (isCreator) {
                                  availableOptions.push({
                                    value: 'cancelled',
                                    label: 'Cancelled',
                                    color: '#EF4444',
                                  });
                                }
                                
                                return availableOptions;
                              })().map((statusOption, idx, arr) => {
                                const isActive = item.status === statusOption.value;
                                const isLast = idx === arr.length - 1;
                                return (
                                  <TouchableOpacity 
                                    key={statusOption.value} 
                                    style={[
                                      styles.statusDropdownMenuItem, 
                                      isLast && styles.statusDropdownMenuItemLast, 
                                      isActive && styles.statusDropdownMenuItemActive
                                    ]} 
                                    onPress={() => { 
                                      console.log('Status clicked:', statusOption.value);
                                      updateTaskStatus(item.id, statusOption.value as Task["status"]); 
                                      setStatusDropdownTaskId(null); 
                                    }} 
                                    activeOpacity={0.6}
                                  >
                                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: statusOption.color }} />
                                    <Text style={[styles.statusDropdownMenuItemText, isActive && styles.statusDropdownMenuItemTextActive]}>{statusOption.label}</Text>
                                    {isActive && <Ionicons name="checkmark" size={18} color={statusOption.color} />}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Card Body */}
                      <View style={styles.taskCardBody}>
                        <View style={styles.taskCardInfoGrid}>
                          <View style={styles.taskCardInfoItem}>
                            <Text style={styles.taskCardInfoLabel}>Assigned By</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Ionicons name="person-circle" size={18} color="#8B5CF6" />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.taskCardInfoValue} numberOfLines={1}>{item.assignedBy || "Unknown"}</Text>
                                <Text style={[styles.taskCardMetaText, { fontSize: 11 }]} numberOfLines={1}>{item.assignedByRole || "N/A"}</Text>
                              </View>
                            </View>
                          </View>
                          <View style={styles.taskCardInfoItem}>
                            <Text style={styles.taskCardInfoLabel}>Assigned To</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Ionicons name="person" size={18} color="#6B7280" />
                              <Text style={styles.taskCardInfoValue} numberOfLines={1}>{item.assignedToName || "Unknown"}</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Card Footer */}
                      <View style={styles.taskCardFooter}>
                        <View style={styles.taskCardActions}>
                          <TouchableOpacity style={styles.taskCardActionButton} onPress={() => openTaskDetail(item)}>
                            <Ionicons name="eye-outline" size={16} color="#6B7280" />
                            <Text style={styles.taskCardActionButtonText}>View</Text>
                          </TouchableOpacity>
                          {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager') && (
                            <TouchableOpacity style={[styles.taskCardActionButton, styles.taskCardPassButton]} onPress={() => openPassTaskModal(item)}>
                              <Ionicons name="git-branch-outline" size={16} color="#8B5CF6" />
                              <Text style={[styles.taskCardActionButtonText, styles.taskCardPassButtonText]}>Pass</Text>
                            </TouchableOpacity>
                          )}
                          {user?.role?.toLowerCase() === 'admin' && item.assigned_by && user?.user_id && item.assigned_by === user.user_id && (
                            <TouchableOpacity style={styles.taskCardActionButton} onPress={() => openEditTaskModal(item)}>
                              <Ionicons name="create-outline" size={16} color="#6B7280" />
                              <Text style={styles.taskCardActionButtonText}>Edit</Text>
                            </TouchableOpacity>
                          )}
                          {item.assigned_by && user?.user_id && item.assigned_by === user.user_id && (
                            <TouchableOpacity style={[styles.taskCardActionButton, styles.taskCardDeleteButton]} onPress={() => deleteTask(item.id)}>
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                              <Text style={[styles.taskCardActionButtonText, styles.taskCardDeleteButtonText]}>Delete</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          ) : (
            /* Table View */
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScrollContainer}>
              <View style={styles.tableWrapper}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, styles.taskColumn]}>Task</Text>
                  <Text style={[styles.tableHeaderText, styles.assignedByColumn]}>Assigned By</Text>
                  <Text style={[styles.tableHeaderText, styles.assignedToColumn]}>Assigned To</Text>
                  <Text style={[styles.tableHeaderText, styles.priorityColumn]}>Priority</Text>
                  <Text style={[styles.tableHeaderText, styles.deadlineColumn]}>Deadline</Text>
                  <Text style={[styles.tableHeaderText, styles.statusColumn]}>Status</Text>
                  <Text style={[styles.tableHeaderText, styles.actionsColumn]}>Actions</Text>
                </View>

                {filteredTasks.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyStateIcon}>
                      <Ionicons name="clipboard-outline" size={40} color="#9CA3AF" />
                    </View>
                    <Text style={styles.emptyStateText}>No tasks found</Text>
                    <Text style={styles.emptyStateSubtext}>Create a new task to get started</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.tableContainer} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {filteredTasks.map((item, index) => (
                      <View key={item.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                        <View style={[styles.tableCell, styles.taskColumn]}>
                          <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.taskDescription} numberOfLines={1}>{item.description}</Text>
                        </View>
                        <View style={[styles.tableCell, styles.assignedByColumn]}>
                          <View style={styles.assignedToContainer}>
                            <Ionicons name="person-circle" size={18} color="#8B5CF6" />
                            <View style={{ marginLeft: 8, flex: 1 }}>
                              <Text style={[styles.assignedToText, { fontWeight: '600', color: '#111827' }]} numberOfLines={1}>{item.assignedBy || "Unknown"}</Text>
                              <Text style={[styles.taskDescription, { fontSize: 11 }]} numberOfLines={1}>{item.assignedByRole || "N/A"}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={[styles.tableCell, styles.assignedToColumn]}>
                          <View style={styles.assignedToContainer}>
                            <Ionicons name="person" size={18} color="#6B7280" />
                            <Text style={styles.assignedToText} numberOfLines={1}>{item.assignedToName || item.assignedTo[0] || "Unknown"}</Text>
                          </View>
                        </View>
                        <View style={[styles.tableCell, styles.priorityColumn]}>
                          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                            <Text style={styles.priorityText}>{item.priority}</Text>
                          </View>
                        </View>
                        <View style={[styles.tableCell, styles.deadlineColumn]}>
                          <View style={styles.deadlineContainer}>
                            <Ionicons name="calendar" size={16} color="#6B7280" />
                            <Text style={styles.deadlineText} numberOfLines={1}>{item.deadline ? new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Not set"}</Text>
                          </View>
                        </View>
                        <View style={[styles.tableCell, styles.statusColumn]}>
                          <TouchableOpacity style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]} onPress={() => setStatusDropdownTaskId(statusDropdownTaskId === item.id ? null : item.id)} activeOpacity={0.8}>
                            <View style={styles.statusIndicator} />
                            <Text style={styles.statusText} numberOfLines={1}>{formatStatusLabel(item.status)}</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={[styles.tableCell, styles.actionsColumn]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity style={styles.viewButton} onPress={() => openTaskDetail(item)}>
                              <Text style={styles.viewButtonText}>View</Text>
                              <Ionicons name="chevron-forward" size={14} color="#6B7280" />
                            </TouchableOpacity>
                            {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager') && (
                              <TouchableOpacity style={styles.passButton} onPress={() => openPassTaskModal(item)}>
                                <Ionicons name="git-branch-outline" size={16} color="#8B5CF6" />
                                <Text style={styles.passButtonText}>Pass</Text>
                              </TouchableOpacity>
                            )}
                            {user?.role?.toLowerCase() === 'admin' && item.assigned_by && user?.user_id && item.assigned_by === user.user_id && (
                              <TouchableOpacity style={styles.editButton} onPress={() => openEditTaskModal(item)}>
                                <Ionicons name="create-outline" size={16} color="#6B7280" />
                                <Text style={styles.editButtonText}>Edit</Text>
                              </TouchableOpacity>
                            )}
                            {item.assigned_by && user?.user_id && item.assigned_by === user.user_id && (
                              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteTask(item.id)}>
                                <Ionicons name="trash-outline" size={16} color="#fff" />
                                <Text style={styles.deleteButtonText}>Delete</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </ScrollView>

      {/* FAB - All roles can create tasks */}
      <FAB icon="plus" color="white" style={[styles.fab, { bottom: tabBarVisible ? tabBarHeight + 20 : 30 }]} onPress={openTaskModal} />


      {/* Create Task Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.fullScreenFormContainer} edges={['top']}>
          <StatusBar style="light" backgroundColor="#8B5CF6" translucent={false} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <Animated.View style={[styles.fullScreenCard, { opacity: formOpacity, transform: [{ translateY: formScaleY.interpolate({ inputRange: [0.9, 1], outputRange: [50, 0] }) }] }]}>
              {/* Header */}
              <LinearGradient colors={isEditMode ? ['#10B981', '#059669'] : ['#8B5CF6', '#7C3AED']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.modalHeader}>
                <TouchableOpacity style={styles.closeButton} onPress={closeTaskForm} activeOpacity={0.7}>
                  <View style={styles.closeButtonInner}>
                    <Ionicons name="close" size={22} color="#fff" />
                  </View>
                </TouchableOpacity>
                <View style={styles.modalTitleContainer}>
                  <View style={styles.modalIconContainer}>
                    <Ionicons name={isEditMode ? "create-outline" : "add-outline"} size={26} color="#fff" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>{isEditMode ? "Edit Task" : "Create New Task"}</Text>
                    <Text style={styles.modalSubtitle}>{isEditMode ? "Update task details" : "Assign a new task to team members"}</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Progress */}
              <View style={styles.progressContainer}>
                <ProgressBar progress={formProgress} color="#8B5CF6" style={styles.progressBar} />
                <Text style={styles.progressText}>{Math.round(formProgress * 100)}% completed</Text>
              </View>

              <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Title */}
                <Animated.View style={[styles.fieldContainer, { opacity: titleInputAnim, transform: [{ translateY: titleInputAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                  <View style={styles.fieldLabelRow}>
                    <Ionicons name="document-text" size={18} color="#8B5CF6" style={styles.fieldIcon} />
                    <Text style={styles.fieldLabel}>Task Title <Text style={styles.required}>*</Text></Text>
                  </View>
                  <TextInput placeholder="Enter task title" style={[styles.input, formErrors.title && styles.inputError]} value={newTask.title} onChangeText={(t) => updateField('title', t)} placeholderTextColor="#9ca3af" />
                  {formErrors.title && <Text style={styles.errorText}>{formErrors.title}</Text>}
                </Animated.View>

                {/* Description */}
                <Animated.View style={[styles.fieldContainer, { opacity: descInputAnim, transform: [{ translateY: descInputAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                  <View style={styles.fieldLabelRow}>
                    <Ionicons name="document-text" size={18} color="#8B5CF6" style={styles.fieldIcon} />
                    <Text style={styles.fieldLabel}>Description <Text style={styles.required}>*</Text></Text>
                  </View>
                  <TextInput placeholder="Enter task description" style={[styles.input, styles.textArea, formErrors.description && styles.inputError]} value={newTask.description} multiline numberOfLines={4} onChangeText={(t) => updateField('description', t)} placeholderTextColor="#9ca3af" />
                  {formErrors.description && <Text style={styles.errorText}>{formErrors.description}</Text>}
                </Animated.View>

                {/* Priority and Deadline Row */}
                <View style={styles.rowContainer}>
                  <Animated.View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }, { opacity: priorityInputAnim, transform: [{ translateY: priorityInputAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                    <View style={styles.fieldLabelRow}>
                      <Ionicons name="flag-outline" size={18} color="#8B5CF6" style={styles.fieldIcon} />
                      <Text style={styles.fieldLabel}>Priority</Text>
                    </View>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={newTask.priority} onValueChange={(value) => updateField('priority', value)} style={styles.picker} dropdownIconColor="#8B5CF6">
                        <Picker.Item label="Low" value="low" />
                        <Picker.Item label="Medium" value="medium" />
                        <Picker.Item label="High" value="high" />
                        <Picker.Item label="Urgent" value="urgent" />
                      </Picker>
                      <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(newTask.priority) }]} />
                    </View>
                  </Animated.View>

                  <Animated.View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }, { opacity: deadlineInputAnim, transform: [{ translateY: deadlineInputAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                    <View style={styles.fieldLabelRow}>
                      <Ionicons name="calendar-outline" size={18} color="#8B5CF6" style={styles.fieldIcon} />
                      <Text style={styles.fieldLabel}>Deadline <Text style={styles.required}>*</Text></Text>
                    </View>
                    <TouchableOpacity style={[styles.dateInput, formErrors.deadline && styles.inputError]} activeOpacity={0.7} onPress={handleDatePickerPress}>
                      <Text style={[styles.dateInputText, !newTask.deadline && { color: '#9ca3af' }]}>{newTask.deadline ? new Date(newTask.deadline).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'dd / mm / yyyy'}</Text>
                      <Ionicons name="calendar-outline" size={20} color="#8B5CF6" />
                    </TouchableOpacity>
                    {formErrors.deadline && <Text style={styles.errorText}>{formErrors.deadline}</Text>}
                  </Animated.View>
                </View>

                {showDatePicker && <DateTimePicker value={selectedDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDateChange} minimumDate={new Date()} textColor="#8B5CF6" />}

                {/* Assign To */}
                <Animated.View style={[styles.fieldContainer, { opacity: assignInputAnim, transform: [{ translateY: assignInputAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                  <View style={styles.fieldLabelRow}>
                    <Ionicons name="person-outline" size={18} color="#8B5CF6" style={styles.fieldIcon} />
                    <Text style={styles.fieldLabel}>Assign To <Text style={styles.required}>*</Text></Text>
                  </View>
                  <View style={[styles.pickerContainer, formErrors.assignedTo && styles.inputError]}>
                    {loadingEmployees ? (
                      <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator size="small" color="#8B5CF6" /></View>
                    ) : (
                      <Picker selectedValue={newTask.assignedTo} onValueChange={handleEmployeeSelect} style={styles.picker} dropdownIconColor="#8B5CF6" enabled={!loadingEmployees}>
                        <Picker.Item label="Select employee" value="" />
                        {employees.map((emp) => <Picker.Item key={emp.id} label={`${emp.name} • ${emp.role || 'N/A'} (${emp.department || 'N/A'})`} value={emp.email} />)}
                      </Picker>
                    )}
                  </View>
                  {formErrors.assignedTo && <Text style={styles.errorText}>{formErrors.assignedTo}</Text>}
                </Animated.View>

                {/* Department and Employee ID Row */}
                <View style={styles.rowContainer}>
                  <Animated.View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }, { opacity: deptInputAnim, transform: [{ translateY: deptInputAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                    <View style={styles.fieldLabelRow}>
                      <Ionicons name="business-outline" size={18} color="#8B5CF6" style={styles.fieldIcon} />
                      <Text style={styles.fieldLabel}>Department</Text>
                    </View>
                    <TextInput placeholder="Auto-filled" style={[styles.input, { backgroundColor: '#f9fafb', color: '#6b7280' }]} value={newTask.department} editable={false} placeholderTextColor="#9ca3af" />
                  </Animated.View>

                  <Animated.View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }, { opacity: deptInputAnim, transform: [{ translateY: deptInputAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                    <View style={styles.fieldLabelRow}>
                      <Ionicons name="id-card-outline" size={18} color="#8B5CF6" style={styles.fieldIcon} />
                      <Text style={styles.fieldLabel}>Employee ID</Text>
                    </View>
                    <TextInput placeholder="Auto-filled" style={[styles.input, { backgroundColor: '#f9fafb', color: '#6b7280' }]} value={newTask.employeeId} editable={false} placeholderTextColor="#9ca3af" />
                  </Animated.View>
                </View>
                
                {keyboardVisible && <View style={{ height: 100 }} />}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeTaskForm} activeOpacity={0.7}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Animated.View style={{ flex: 1, transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity style={[styles.createButton, isSubmitting && styles.createButtonDisabled, isEditMode && { backgroundColor: '#10B981' }]} onPress={createTask} disabled={isSubmitting} activeOpacity={0.8}>
                    {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createButtonText}>{isEditMode ? "Update Task" : "Create Task"}</Text>}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>


      {/* Task Detail Modal */}
      <Modal visible={taskDetailModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeTaskDetail}>
        <SafeAreaView style={styles.taskDetailContainer}>
          {selectedTask && (
            <>
              <View style={styles.taskDetailHeader}>
                <View style={styles.taskDetailHeaderLeft}>
                  <View style={styles.taskDetailIcon}>
                    <Ionicons name="document-text" size={28} color="#8B5CF6" />
                  </View>
                  <View>
                    <Text style={styles.taskDetailTitle}>{selectedTask.title}</Text>
                    <Text style={styles.taskDetailId}>Task ID: #{selectedTask.id}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.taskDetailCloseButton} onPress={closeTaskDetail}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.taskDetailTabs}>
                <TouchableOpacity style={[styles.taskDetailTab, activeDetailTab === "details" && styles.taskDetailTabActive]} onPress={() => setActiveDetailTab("details")}>
                  <Text style={[styles.taskDetailTabText, activeDetailTab === "details" && styles.taskDetailTabTextActive]}>Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.taskDetailTab, activeDetailTab === "activity" && styles.taskDetailTabActive]} onPress={() => setActiveDetailTab("activity")}>
                  <Text style={[styles.taskDetailTabText, activeDetailTab === "activity" && styles.taskDetailTabTextActive]}>Activity</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.taskDetailTab, activeDetailTab === "comments" && styles.taskDetailTabActive]} onPress={() => setActiveDetailTab("comments")}>
                  <Text style={[styles.taskDetailTabText, activeDetailTab === "comments" && styles.taskDetailTabTextActive]}>Comments</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.taskDetailContent}>
                {activeDetailTab === "details" && (
                  <View style={styles.taskDetailDetailsTab}>
                    <View style={styles.taskDetailSection}>
                      <View style={styles.taskDetailSectionHeader}>
                        <Ionicons name="document-text" size={22} color="#8B5CF6" />
                        <Text style={styles.taskDetailSectionTitle}>Description</Text>
                      </View>
                      <Text style={styles.taskDetailDescription}>{selectedTask.description}</Text>
                    </View>

                    <View style={styles.taskDetailGrid}>
                      <View style={styles.taskDetailGridItem}>
                        <View style={styles.taskDetailFieldHeader}>
                          <Ionicons name="person-circle" size={18} color="#8B5CF6" />
                          <Text style={styles.taskDetailFieldLabel}>Assigned By</Text>
                        </View>
                        <Text style={styles.taskDetailFieldValue}>{selectedTask.assignedBy || "Unknown"}</Text>
                      </View>

                      <View style={styles.taskDetailGridItem}>
                        <View style={styles.taskDetailFieldHeader}>
                          <Ionicons name="person" size={18} color="#8B5CF6" />
                          <Text style={styles.taskDetailFieldLabel}>Assigned To</Text>
                        </View>
                        <Text style={styles.taskDetailFieldValue}>{selectedTask.assignedToName || selectedTask.assignedTo[0] || "Unknown"}</Text>
                      </View>

                      <View style={styles.taskDetailGridItem}>
                        <View style={styles.taskDetailFieldHeader}>
                          <Ionicons name="flag" size={18} color="#8B5CF6" />
                          <Text style={styles.taskDetailFieldLabel}>Priority</Text>
                        </View>
                        <View style={[styles.taskDetailPriorityBadge, { backgroundColor: getPriorityColor(selectedTask.priority) }]}>
                          <Text style={styles.taskDetailPriorityText}>{selectedTask.priority}</Text>
                        </View>
                      </View>

                      <View style={styles.taskDetailGridItem}>
                        <View style={styles.taskDetailFieldHeader}>
                          <Ionicons name="calendar" size={18} color="#8B5CF6" />
                          <Text style={styles.taskDetailFieldLabel}>Deadline</Text>
                        </View>
                        <Text style={styles.taskDetailFieldValue}>{selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : "Not set"}</Text>
                      </View>

                      <View style={styles.taskDetailGridItem}>
                        <View style={styles.taskDetailFieldHeader}>
                          <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
                          <Text style={styles.taskDetailFieldLabel}>Status</Text>
                        </View>
                        <View style={[styles.taskDetailStatusBadge, { backgroundColor: getStatusColor(selectedTask.status) }]}>
                          <View style={styles.taskDetailStatusIndicator} />
                          <Text style={styles.taskDetailStatusText}>{formatStatusLabel(selectedTask.status)}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.taskDetailSection}>
                      <View style={styles.taskDetailSectionHeader}>
                        <Ionicons name="pricetag" size={22} color="#8B5CF6" />
                        <Text style={styles.taskDetailSectionTitle}>Tags</Text>
                      </View>
                      <View style={styles.taskDetailTags}>
                        <View style={styles.taskDetailTag}><Text style={styles.taskDetailTagText}>Documentation</Text></View>
                        <View style={styles.taskDetailTag}><Text style={styles.taskDetailTagText}>Project</Text></View>
                      </View>
                    </View>
                  </View>
                )}

                {activeDetailTab === "activity" && (
                  <View style={styles.taskDetailActivityTab}>
                    {loadingActivity ? (
                      <View style={styles.taskDetailActivityCenter}>
                        <ActivityIndicator size="large" color="#8B5CF6" />
                        <Text style={[styles.taskDetailActivityCenterText, { marginTop: 12 }]}>Loading activity...</Text>
                      </View>
                    ) : taskActivity.length > 0 ? (
                      <>
                        {taskActivity.map((activity, index) => {
                          const icon = getActivityIcon(activity.action);
                          const activityTitle = getActivityTitle(activity.action);
                          const description = formatActivityDescription(activity);
                          const userName = getActivityUserName(activity);
                          
                          return (
                            <View key={activity.id || index} style={[styles.taskDetailActivityItem, { backgroundColor: '#fff', marginBottom: 12, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' }]}>
                              {/* Icon */}
                              <View style={[styles.taskDetailActivityIcon, { backgroundColor: icon.bgColor, borderRadius: 10 }]}>
                                <Ionicons name={icon.name as any} size={24} color={icon.color} />
                              </View>
                              
                              {/* Content */}
                              <View style={[styles.taskDetailActivityContent, { flex: 1 }]}>
                                <Text style={[styles.taskDetailActivityTitle, { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }]}>
                                  {activityTitle}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                  <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                                  <Text style={[styles.taskDetailActivityTime, { marginLeft: 4, fontSize: 13, color: '#6B7280' }]}>
                                    {formatDateTime(activity.created_at)}
                                  </Text>
                                </View>
                                
                                {/* Status change description with colored text */}
                                {typeof description === 'object' && description.type === 'status_change' ? (
                                  <Text style={{ fontSize: 14, color: '#374151' }}>
                                    Status changed from{' '}
                                    <Text style={{ fontWeight: '700', color: '#EF4444' }}>{description.from}</Text>
                                    {' '}to{' '}
                                    <Text style={{ fontWeight: '700', color: '#10B981' }}>{description.to}</Text>
                                  </Text>
                                ) : typeof description === 'object' && description.type === 'passed' ? (
                                  <Text style={{ fontSize: 14, color: '#374151' }}>
                                    Task passed from{' '}
                                    <Text style={{ fontWeight: '700', color: '#8B5CF6' }}>{description.from}</Text>
                                    {' '}to{' '}
                                    <Text style={{ fontWeight: '700', color: '#3B82F6' }}>{description.to}</Text>
                                  </Text>
                                ) : (
                                  <Text style={{ fontSize: 14, color: '#374151' }}>{description as string}</Text>
                                )}
                                
                                {activity.details?.note && (
                                  <Text style={{ fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginTop: 6 }}>
                                    Note: {activity.details.note}
                                  </Text>
                                )}
                              </View>
                              
                              {/* User name on right */}
                              <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <Ionicons name="person-outline" size={14} color="#9CA3AF" />
                                  <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 4, fontWeight: '500' }}>
                                    {userName}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        {/* Show at least the creation activity */}
                        <View style={[styles.taskDetailActivityItem, { backgroundColor: '#fff', marginBottom: 12, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' }]}>
                          <View style={[styles.taskDetailActivityIcon, { backgroundColor: '#ECFDF5', borderRadius: 10 }]}>
                            <Ionicons name="add-circle" size={24} color="#10B981" />
                          </View>
                          <View style={[styles.taskDetailActivityContent, { flex: 1 }]}>
                            <Text style={[styles.taskDetailActivityTitle, { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }]}>Task Created</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                              <Text style={{ marginLeft: 4, fontSize: 13, color: '#6B7280' }}>
                                {formatDateTime(selectedTask.createdAt)}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 14, color: '#374151' }}>Task was created and assigned</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="person-outline" size={14} color="#9CA3AF" />
                              <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 4, fontWeight: '500' }}>
                                {selectedTask.assignedBy || "System"}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.taskDetailActivityCenter}>
                          <View style={styles.taskDetailActivityCenterIcon}>
                            <Ionicons name="time" size={36} color="#9CA3AF" />
                          </View>
                          <Text style={styles.taskDetailActivityCenterText}>Task is currently {formatStatusLabel(selectedTask.status).toLowerCase()}</Text>
                        </View>
                      </>
                    )}
                  </View>
                )}

                {activeDetailTab === "comments" && (
                  <View style={styles.taskDetailCommentsTab}>
                    {/* Loading state */}
                    {loadingComments ? (
                      <View style={styles.taskDetailActivityCenter}>
                        <ActivityIndicator size="large" color="#8B5CF6" />
                        <Text style={[styles.taskDetailActivityCenterText, { marginTop: 12 }]}>Loading comments...</Text>
                      </View>
                    ) : (
                      <>
                        {/* Comments List - Chat style */}
                        {taskComments.length > 0 ? (
                          <View style={{ marginBottom: 16 }}>
                            {taskComments.map((comment) => {
                              const isCurrentUser = comment.user_id === user?.user_id;
                              return (
                                <View 
                                  key={comment.id} 
                                  style={[
                                    { 
                                      marginBottom: 12, 
                                      flexDirection: 'row',
                                      justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                                    }
                                  ]}
                                >
                                  {/* Avatar for other users */}
                                  {!isCurrentUser && (
                                    <View style={{ 
                                      width: 36, 
                                      height: 36, 
                                      borderRadius: 18, 
                                      backgroundColor: '#8B5CF6', 
                                      justifyContent: 'center', 
                                      alignItems: 'center',
                                      marginRight: 10,
                                    }}>
                                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                        {(comment.user_name || "U").charAt(0).toUpperCase()}
                                      </Text>
                                    </View>
                                  )}
                                  
                                  {/* Message bubble */}
                                  <View style={{ 
                                    maxWidth: '75%',
                                    backgroundColor: isCurrentUser ? '#8B5CF6' : '#fff',
                                    borderRadius: 16,
                                    borderTopLeftRadius: isCurrentUser ? 16 : 4,
                                    borderTopRightRadius: isCurrentUser ? 4 : 16,
                                    padding: 12,
                                    paddingHorizontal: 14,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.08,
                                    shadowRadius: 4,
                                    elevation: 2,
                                    borderWidth: isCurrentUser ? 0 : 1,
                                    borderColor: '#F3F4F6',
                                  }}>
                                    {/* User name and time */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                      <Text style={{ 
                                        fontSize: 13, 
                                        fontWeight: '700', 
                                        color: isCurrentUser ? 'rgba(255,255,255,0.9)' : '#111827',
                                      }}>
                                        {isCurrentUser ? 'You' : comment.user_name}
                                      </Text>
                                      <Text style={{ 
                                        fontSize: 11, 
                                        color: isCurrentUser ? 'rgba(255,255,255,0.7)' : '#9CA3AF',
                                        marginLeft: 8,
                                      }}>
                                        {formatTime(comment.created_at)}
                                      </Text>
                                    </View>
                                    
                                    {/* Message text */}
                                    <Text style={{ 
                                      fontSize: 14, 
                                      color: isCurrentUser ? '#fff' : '#374151',
                                      lineHeight: 20,
                                    }}>
                                      {comment.message}
                                    </Text>
                                    
                                    {/* Delete button for own comments */}
                                    {isCurrentUser && (
                                      <TouchableOpacity 
                                        onPress={() => handleDeleteComment(comment.id)}
                                        style={{ 
                                          position: 'absolute', 
                                          top: 8, 
                                          right: 8,
                                          padding: 4,
                                        }}
                                      >
                                        <Ionicons name="trash-outline" size={14} color="rgba(255,255,255,0.6)" />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                  
                                  {/* Avatar for current user */}
                                  {isCurrentUser && (
                                    <View style={{ 
                                      width: 36, 
                                      height: 36, 
                                      borderRadius: 18, 
                                      backgroundColor: '#10B981', 
                                      justifyContent: 'center', 
                                      alignItems: 'center',
                                      marginLeft: 10,
                                    }}>
                                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                        {(user?.name || "Y").charAt(0).toUpperCase()}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <View style={styles.taskDetailNoComments}>
                            <View style={styles.taskDetailNoCommentsIcon}>
                              <Ionicons name="chatbubbles" size={36} color="#C7A2FE" />
                            </View>
                            <Text style={styles.taskDetailNoCommentsTitle}>No comments yet</Text>
                            <Text style={styles.taskDetailNoCommentsSubtitle}>Start a conversation about this task</Text>
                          </View>
                        )}
                        
                        {/* Comment input at bottom */}
                        <View style={[styles.taskDetailCommentInput, { 
                          backgroundColor: '#fff', 
                          borderRadius: 16, 
                          padding: 12,
                          borderWidth: 1,
                          borderColor: '#E5E7EB',
                          marginTop: 8,
                        }]}>
                          <TextInput 
                            style={[styles.taskDetailCommentTextInput, { 
                              borderWidth: 0, 
                              backgroundColor: 'transparent',
                              paddingHorizontal: 0,
                            }]} 
                            placeholder="Type your message..." 
                            placeholderTextColor="#9CA3AF" 
                            multiline 
                            value={newComment}
                            onChangeText={setNewComment}
                            editable={!postingComment}
                          />
                          <TouchableOpacity 
                            style={[styles.taskDetailCommentButton, (!newComment.trim() || postingComment) && { opacity: 0.5 }]}
                            onPress={handlePostComment}
                            disabled={!newComment.trim() || postingComment}
                          >
                            {postingComment ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Ionicons name="send" size={20} color="#fff" />
                            )}
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>


      {/* Export Modal */}
      <Modal visible={exportModalVisible} animationType="fade" transparent onRequestClose={closeExportModal}>
        <TouchableOpacity activeOpacity={1} style={styles.exportModalOverlay} onPress={closeExportModal}>
          <TouchableOpacity activeOpacity={1} style={styles.exportModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.exportModalHeader}>
              <View style={styles.exportModalIcon}>
                <Ionicons name="download" size={30} color="#fff" />
              </View>
              <View style={styles.exportModalHeaderText}>
                <Text style={styles.exportModalTitle}>Export Task Report</Text>
                <Text style={styles.exportModalSubtitle}>Generate and download reports</Text>
              </View>
              <TouchableOpacity style={styles.exportModalCloseButton} onPress={closeExportModal}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.exportModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.exportSection}>
                <View style={styles.exportSectionHeader}>
                  <Ionicons name="document" size={18} color="#10B981" style={styles.exportSectionIcon} />
                  <Text style={styles.exportSectionTitle}>Export Format</Text>
                </View>
                <View style={styles.exportFormatButtons}>
                  <TouchableOpacity style={[styles.exportFormatButton, exportFormat === 'pdf' && styles.exportFormatButtonActive]} onPress={() => setExportFormat('pdf')} activeOpacity={0.7}>
                    <Ionicons name="document-text" size={22} color={exportFormat === 'pdf' ? "#10B981" : "#6B7280"} style={styles.exportFormatButtonIcon} />
                    <Text style={[styles.exportFormatButtonText, exportFormat === 'pdf' && styles.exportFormatButtonTextActive]}>PDF Report</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.exportFormatButton, exportFormat === 'csv' && styles.exportFormatButtonActive]} onPress={() => setExportFormat('csv')} activeOpacity={0.7}>
                    <Ionicons name="grid" size={22} color={exportFormat === 'csv' ? "#10B981" : "#6B7280"} style={styles.exportFormatButtonIcon} />
                    <Text style={[styles.exportFormatButtonText, exportFormat === 'csv' && styles.exportFormatButtonTextActive]}>CSV Data</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.exportSection}>
                <View style={styles.exportSectionHeader}>
                  <Ionicons name="calendar" size={18} color="#10B981" style={styles.exportSectionIcon} />
                  <Text style={styles.exportSectionTitle}>Date Range</Text>
                </View>
                <View style={styles.exportDropdown}>
                  <TouchableOpacity style={styles.exportDropdownTrigger} onPress={() => { setDateRangeDropdownOpen(!dateRangeDropdownOpen); setUserFilterDropdownOpen(false); }} activeOpacity={0.7}>
                    <Text style={styles.exportDropdownText}>{getDateRangeLabel()}</Text>
                    <Ionicons name={dateRangeDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                  {dateRangeDropdownOpen && (
                    <ScrollView style={styles.exportDropdownList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {[{ label: 'All Time', value: 'all' }, { label: 'Today', value: 'today' }, { label: 'Last 7 Days', value: 'week' }, { label: 'Last 30 Days', value: 'month' }].map((option, index, array) => (
                        <TouchableOpacity key={option.value} style={[styles.exportDropdownOption, exportDateRange === option.value && { backgroundColor: '#F0FDF4' }, index === array.length - 1 && styles.exportDropdownOptionLast]} onPress={() => { setExportDateRange(option.value as any); setDateRangeDropdownOpen(false); }} activeOpacity={0.7}>
                          <Text style={[styles.exportDropdownOptionText, exportDateRange === option.value && { color: '#10B981', fontWeight: '600' }]}>{option.label}</Text>
                          {exportDateRange === option.value && <Ionicons name="checkmark" size={18} color="#10B981" style={{ marginLeft: 'auto' }} />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>

              <View style={styles.exportSection}>
                <View style={styles.exportSectionHeader}>
                  <Ionicons name="person" size={18} color="#10B981" style={styles.exportSectionIcon} />
                  <Text style={styles.exportSectionTitle}>User Filter</Text>
                </View>
                <View style={styles.exportDropdown}>
                  <TouchableOpacity style={styles.exportDropdownTrigger} onPress={() => { setUserFilterDropdownOpen(!userFilterDropdownOpen); setDateRangeDropdownOpen(false); }} activeOpacity={0.7}>
                    <Text style={styles.exportDropdownText} numberOfLines={1}>{getUserFilterLabel()}</Text>
                    <Ionicons name={userFilterDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                  {userFilterDropdownOpen && (
                    <ScrollView style={styles.exportDropdownList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      <TouchableOpacity style={[styles.exportDropdownOption, exportUserFilter === 'all' && { backgroundColor: '#F0FDF4' }]} onPress={() => { setExportUserFilter('all'); setUserFilterDropdownOpen(false); }} activeOpacity={0.7}>
                        <Text style={[styles.exportDropdownOptionText, exportUserFilter === 'all' && { color: '#10B981', fontWeight: '600' }]}>All Users</Text>
                        {exportUserFilter === 'all' && <Ionicons name="checkmark" size={18} color="#10B981" style={{ marginLeft: 'auto' }} />}
                      </TouchableOpacity>
                      {employees.slice(0, 5).map((emp, index) => (
                        <TouchableOpacity key={emp.id} style={[styles.exportDropdownOption, exportUserFilter === emp.email && { backgroundColor: '#F0FDF4' }, index === Math.min(4, employees.length - 1) && styles.exportDropdownOptionLast]} onPress={() => { setExportUserFilter(emp.email); setUserFilterDropdownOpen(false); }} activeOpacity={0.7}>
                          <Text style={[styles.exportDropdownOptionText, exportUserFilter === emp.email && { color: '#10B981', fontWeight: '600' }]} numberOfLines={1}>{emp.name}</Text>
                          {exportUserFilter === emp.email && <Ionicons name="checkmark" size={18} color="#10B981" style={{ marginLeft: 'auto' }} />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>

              <View style={styles.exportSummaryBox}>
                <Text style={styles.exportSummaryTitle}>Export Summary</Text>
                <View style={styles.exportSummaryItem}><Text style={styles.exportSummaryLabel}>• Format:</Text><Text style={styles.exportSummaryValue}>{exportFormat.toUpperCase()}</Text></View>
                <View style={styles.exportSummaryItem}><Text style={styles.exportSummaryLabel}>• Date Range:</Text><Text style={styles.exportSummaryValue}>{getDateRangeLabel()}</Text></View>
                <View style={styles.exportSummaryItem}><Text style={styles.exportSummaryLabel}>• User Filter:</Text><Text style={styles.exportSummaryValue}>{getUserFilterLabel()}</Text></View>
                <View style={styles.exportSummaryItem}><Text style={styles.exportSummaryLabel}>• Total Tasks:</Text><Text style={styles.exportSummaryValue}>{getExportFilteredTasks().length}</Text></View>
              </View>
            </ScrollView>

            <View style={styles.exportModalFooter}>
              <TouchableOpacity style={styles.exportCancelButton} onPress={closeExportModal} disabled={isExporting}>
                <Text style={styles.exportCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.exportConfirmButton, isExporting && styles.exportConfirmButtonDisabled]} onPress={handleExport} disabled={isExporting}>
                {isExporting ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="download" size={20} color="#fff" />
                    <Text style={styles.exportConfirmButtonText}>Export {exportFormat.toUpperCase()}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>


      {/* Pass Task Modal */}
      <Modal visible={passTaskModalVisible} animationType="slide" transparent onRequestClose={closePassTaskModal}>
        <TouchableOpacity activeOpacity={1} style={styles.passModalOverlay} onPress={closePassTaskModal}>
          <TouchableOpacity activeOpacity={1} style={styles.passModalContent} onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
              {/* Header */}
              <View style={styles.passModalHeader}>
                <TouchableOpacity style={{ position: 'absolute', top: 22, right: 22, zIndex: 1, padding: 4 }} onPress={closePassTaskModal} activeOpacity={0.7}>
                  <Ionicons name="close" size={26} color="#6B7280" />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.passModalIconContainer}>
                    <Ionicons name="git-branch" size={34} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.passModalTitle}>Pass Task</Text>
                    <Text style={styles.passModalSubtitle}>Reassign this task to another team member</Text>
                  </View>
                </View>
              </View>

              <ScrollView style={styles.passModalBody} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ marginBottom: 22 }}>
                  <View style={styles.passModalFieldLabel}>
                    <Ionicons name="person" size={20} color="#8B5CF6" />
                    <Text style={styles.passModalFieldLabelText}>Select Assignee</Text>
                  </View>
                  <View style={styles.passModalPicker}>
                    {loadingEmployees ? (
                      <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator size="small" color="#8B5CF6" /></View>
                    ) : (
                      <Picker selectedValue={passTaskData.assignee} onValueChange={(value) => setPassTaskData(prev => ({ ...prev, assignee: value }))} style={{ height: 56, color: '#111827' }} dropdownIconColor="#6B7280" enabled={!loadingEmployees}>
                        <Picker.Item label="Select employee" value="" />
                        {employees.filter(emp => emp.email !== user?.email).map((emp) => <Picker.Item key={emp.id} label={`${emp.name} • ${emp.department || 'N/A'} (${emp.employee_id})`} value={emp.email} />)}
                      </Picker>
                    )}
                  </View>
                </View>

                <View style={{ marginBottom: 22 }}>
                  <View style={styles.passModalFieldLabel}>
                    <Ionicons name="document-text" size={20} color="#8B5CF6" />
                    <Text style={styles.passModalFieldLabelText}>Reason / Notes</Text>
                  </View>
                  <TextInput style={styles.passModalTextArea} placeholder="Add context about why you're passing the task..." placeholderTextColor="#9CA3AF" value={passTaskData.reason} onChangeText={(value) => setPassTaskData(prev => ({ ...prev, reason: value }))} multiline numberOfLines={4} />
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={styles.passModalFooter}>
                <TouchableOpacity style={styles.passModalCancelButton} onPress={closePassTaskModal} disabled={isSubmitting}>
                  <Text style={styles.passModalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.passModalSubmitButton, isSubmitting && styles.passModalSubmitButtonDisabled]} onPress={handlePassTask} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.passModalSubmitButtonText}>Pass Task</Text>}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
