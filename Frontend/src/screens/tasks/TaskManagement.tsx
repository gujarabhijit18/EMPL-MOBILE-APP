// 📂 src/screens/tasks/TaskManagement.tsx
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { setStatusBarStyle, StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
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
import { useModuleBadges } from "../../contexts/ModuleBadgeContext";
import { apiService } from "../../lib/api";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";
import { formatDateIST, formatTimeIST, formatDateTimeIST, getDayMonthIST, formatDateShortIST, formatChatTimestamp } from "../../utils/dateTime";

const { width } = Dimensions.get('window');

interface Task {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in-progress" | "completed" | "cancelled";
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
  // Kanban Board Styles
  kanbanContainer: {
    flex: 1,
    paddingBottom: 16,
    zIndex: 1,
    backgroundColor: '#f8fafc',
  },
  kanbanScroll: {
    flex: 1,
  },
  // Kanban Status Button Styles
  kanbanStatusButton: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  kanbanStatusButtonActive: {
    borderColor: '#8B5CF6',
    shadowOpacity: 0.1,
    elevation: 4,
  },
  kanbanStatusButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  kanbanStatusButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.2,
  },
  kanbanStatusButtonSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  kanbanStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 36,
    alignItems: 'center',
  },
  kanbanStatusBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  kanbanExpandedHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kanbanExpandedHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  kanbanExpandedHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  kanbanExpandedHeaderSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  kanbanTaskListItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kanbanTaskListItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 20,
  },
  kanbanTaskListItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  kanbanTaskListItemMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  kanbanTaskListItemMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  kanbanEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  kanbanEmptyStateIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kanbanEmptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  kanbanEmptyStateSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  kanbanColumn: {
    width: 320,
    marginRight: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kanbanColumnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  kanbanColumnTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kanbanColumnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  kanbanColumnTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.2,
  },
  kanbanColumnCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  kanbanColumnContent: {
    padding: 12,
    gap: 12,
  },
  kanbanTaskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kanbanTaskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 20,
  },
  kanbanTaskDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 16,
  },
  kanbanTaskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kanbanTaskDeadline: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  kanbanTaskPriority: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  kanbanTaskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kanbanTaskAssignee: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  kanbanTaskActions: {
    flexDirection: 'row',
    gap: 6,
  },
  kanbanTaskActionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'space-between',
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
  taskCardReassignButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  taskCardReassignButtonText: {
    color: '#D97706',
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
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  closeButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  modalIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
    lineHeight: 32,
  },
  modalSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: 2,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.2,
    flex: 1,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  fieldIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
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
  warningText: {
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  characterCounter: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
    marginLeft: 'auto',
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
    color: '#374151',
    lineHeight: 24,
    fontWeight: '500',
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
    padding: 0,
    backgroundColor: '#f8fafc',
  },
  taskDetailActivityTimeline: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  taskDetailActivityTimelineConnector: {
    position: 'absolute',
    left: 27,
    top: 48,
    bottom: 0,
    width: 2,
    backgroundColor: '#e5e7eb',
  },
  taskDetailActivityItem: {
    flexDirection: 'row',
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  taskDetailActivityIconWrapper: {
    width: 56,
    alignItems: 'center',
    marginRight: 12,
  },
  taskDetailActivityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 2,
  },
  taskDetailActivityContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  taskDetailActivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  taskDetailActivityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.1,
    flex: 1,
  },
  taskDetailActivityTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    marginLeft: 8,
  },
  taskDetailActivityUser: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  taskDetailActivityDescription: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 6,
  },
  taskDetailActivityStatusChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  taskDetailActivityStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  taskDetailActivityStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  taskDetailActivityStatusArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
    marginHorizontal: 2,
  },
  taskDetailActivityPassedInfo: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  taskDetailActivityPassedFrom: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '700',
    marginBottom: 3,
  },
  taskDetailActivityPassedTo: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
  taskDetailActivityCenter: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 14,
    marginTop: 8,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  taskDetailActivityCenterIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  taskDetailActivityCenterText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  taskDetailActivityCenterSubtext: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  taskDetailCommentsTab: {
    flex: 1,
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
  },
  chatWallpaperBackground: {
    flex: 1,
  },
  commentsListContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  commentBubbleWrapper: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  commentBubbleWrapperOwn: {
    justifyContent: 'flex-end',
  },
  commentBubbleWrapperOther: {
    justifyContent: 'flex-start',
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    fontWeight: '700',
    fontSize: 14,
    color: '#fff',
  },
  commentAvatarOwn: {
    backgroundColor: '#10B981',
    marginLeft: 10,
    marginRight: 0,
  },
  commentAvatarOther: {
    backgroundColor: '#8B5CF6',
    marginRight: 10,
    marginLeft: 0,
  },
  commentBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  commentBubbleOwn: {
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 4,
  },
  commentBubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commentBubbleSelected: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    justifyContent: 'space-between',
  },
  commentUserName: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 8,
  },
  commentUserNameOwn: {
    color: 'rgba(255,255,255,0.95)',
  },
  commentUserNameOther: {
    color: '#111827',
  },
  commentTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  commentTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  commentTimeOther: {
    color: '#9CA3AF',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  commentTextOwn: {
    color: '#fff',
  },
  commentTextOther: {
    color: '#374151',
  },
  commentDeleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  dateSeparatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667781',
    backgroundColor: '#E9EDEF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskDetailCommentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  taskDetailCommentTextInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    color: '#111827',
    fontWeight: '500',
    fontSize: 14,
    maxHeight: 100,
  },
  taskDetailCommentButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  taskDetailCommentButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  taskDetailCommentButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  taskDetailNoComments: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  taskDetailNoCommentsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  taskDetailNoCommentsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  taskDetailNoCommentsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Enhanced comment styles
  commentAttachmentContainer: {
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commentAttachmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAttachmentName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  commentAttachmentType: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  emojiPickerContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 12,
    maxHeight: 120,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  commentActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  commentTextInputEnhanced: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    color: '#111827',
    fontWeight: '500',
    fontSize: 14,
    maxHeight: 100,
  },
  commentSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(15, 23, 42, 0.75)', // Deeper, more sophisticated overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  passModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 32, // More rounded for modern look
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    overflow: 'hidden',
  },
  passModalHeader: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 28,
  },
  passModalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },
  passModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  passModalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  passModalBody: {
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 10,
  },
  passModalFieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  passModalFieldLabelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  passModalPicker: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    height: 56,
    justifyContent: 'center',
  },
  passModalTextArea: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    backgroundColor: '#F8FAFC',
    color: '#1E293B',
    height: 140,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  passModalFooter: {
    flexDirection: 'row',
    padding: 28,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  passModalCancelButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passModalCancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  passModalSubmitButton: {
    flex: 2, // Submit button slightly larger
    height: 54,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  passModalSubmitButtonDisabled: {
    backgroundColor: '#CBD5E1',
    elevation: 0,
    shadowOpacity: 0,
  },
  passModalSubmitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  // Custom Dropdown Styles - Matching Reports Screen
  customDropdownContainer: {
    flex: 1,
  },
  customDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 54,
  },
  customDropdownTriggerError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  customDropdownTriggerActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#f9f5ff',
  },
  customDropdownTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  customDropdownTriggerText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  customDropdownTriggerPlaceholder: {
    color: '#9ca3af',
  },
  customDropdownTriggerSelf: {
    color: '#10B981',
    fontWeight: '600',
  },
  // Dropdown Overlay & Popup
  customDropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  customDropdownPopup: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    maxHeight: 320,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
    zIndex: 1000,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  customDropdownOption: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
    minHeight: 50,
    backgroundColor: '#fff',
  },
  customDropdownOptionSelected: {
    backgroundColor: '#f3e8ff',
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
    paddingLeft: 11,
  },
  customDropdownOptionSelf: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    paddingLeft: 11,
  },
  customDropdownOptionContent: {
    flex: 1,
  },
  customDropdownOptionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customDropdownOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  customDropdownOptionTextActive: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  customDropdownOptionTextSelf: {
    color: '#10B981',
    fontWeight: '700',
  },
  customDropdownSelfBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  customDropdownSelfBadgeText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  customDropdownOptionMeta: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '400',
    marginTop: 2,
  },
  customDropdownOptionMetaSelf: {
    color: '#6b7280',
  },
  customDropdownEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customDropdownEmptyText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 12,
  },
});

// Custom Employee Dropdown Component - Matching Reports Screen Style
interface CustomEmployeeDropdownProps {
  selectedValue: string;
  onSelect: (value: string) => void;
  employees: Array<{
    id: string;
    name: string;
    email: string;
    employee_id: string;
    department?: string;
    role?: string;
    user_id?: number;
  }>;
  loading: boolean;
  error?: string;
  currentUserEmail?: string;
}

function CustomEmployeeDropdown({ selectedValue, onSelect, employees, loading, error, currentUserEmail }: CustomEmployeeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-20)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const itemAnimations = useRef(employees.map(() => new Animated.Value(0))).current;

  const selectedEmployee = employees.find(emp => emp.email === selectedValue);
  const isAssignedToSelf = selectedValue === currentUserEmail && currentUserEmail;

  const handleOpen = () => {
    setIsOpen(true);

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.bezier(0.34, 1.56, 0.64, 1)),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.bezier(0.34, 1.56, 0.64, 1)),
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    itemAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 350,
        delay: 80 + index * 25,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: -20,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOpen(false);
      itemAnimations.forEach(anim => anim.setValue(0));
    });
  };

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  const handleSelect = (email: string) => {
    onSelect(email);
    handleClose();
  };

  return (
    <>
      <View style={styles.customDropdownContainer}>
        <TouchableOpacity
          style={[
            styles.customDropdownTrigger,
            error && styles.customDropdownTriggerError,
            isOpen && styles.customDropdownTriggerActive,
          ]}
          onPress={() => !loading && handleOpen()}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <>
              <View style={styles.customDropdownTriggerContent}>
                <Ionicons
                  name={isAssignedToSelf ? "person-circle" : "person-outline"}
                  size={16}
                  color={isAssignedToSelf ? "#10B981" : "#8B5CF6"}
                />
                <Text
                  style={[
                    styles.customDropdownTriggerText,
                    !selectedValue && styles.customDropdownTriggerPlaceholder,
                    isAssignedToSelf && styles.customDropdownTriggerSelf,
                  ]}
                  numberOfLines={1}
                >
                  {isAssignedToSelf
                    ? `${selectedEmployee?.name} (Self)`
                    : selectedEmployee
                      ? selectedEmployee.name
                      : 'Select employee'}
                </Text>
              </View>
              <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                <Ionicons name="chevron-down" size={18} color="#8B5CF6" />
              </Animated.View>
            </>
          )}
        </TouchableOpacity>
      </View>

      {isOpen && (
        <Modal
          visible={isOpen}
          transparent={true}
          animationType="none"
          onRequestClose={handleClose}
        >
          <TouchableOpacity
            style={styles.customDropdownOverlay}
            activeOpacity={1}
            onPress={handleClose}
          >
            <Animated.View
              style={[
                styles.customDropdownPopup,
                {
                  opacity: opacityAnim,
                  transform: [
                    { scale: scaleAnim },
                    { translateY: translateYAnim }
                  ]
                }
              ]}
            >
              <ScrollView
                scrollEnabled={employees.length > 6}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {employees.length === 0 ? (
                  <View style={styles.customDropdownEmpty}>
                    <Ionicons name="person-outline" size={32} color="#D1D5DB" />
                    <Text style={styles.customDropdownEmptyText}>No employees available</Text>
                  </View>
                ) : (
                  employees.map((emp, index) => {
                    const isSelf = emp.email === currentUserEmail;
                    return (
                      <Animated.View
                        key={`${emp.id}-${index}`}
                        style={{
                          opacity: itemAnimations[index],
                          transform: [
                            {
                              translateY: itemAnimations[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: [15, 0]
                              })
                            }
                          ]
                        }}
                      >
                        <TouchableOpacity
                          style={[
                            styles.customDropdownOption,
                            selectedValue === emp.email && styles.customDropdownOptionSelected,
                            isSelf && styles.customDropdownOptionSelf,
                          ]}
                          onPress={() => handleSelect(emp.email)}
                          activeOpacity={0.6}
                        >
                          <View style={styles.customDropdownOptionContent}>
                            <View style={styles.customDropdownOptionNameRow}>
                              <Text style={[
                                styles.customDropdownOptionText,
                                selectedValue === emp.email && styles.customDropdownOptionTextActive,
                                isSelf && styles.customDropdownOptionTextSelf,
                              ]}>
                                {emp.name}
                              </Text>
                              {isSelf && (
                                <View style={styles.customDropdownSelfBadge}>
                                  <Text style={styles.customDropdownSelfBadgeText}>Self</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[
                              styles.customDropdownOptionMeta,
                              isSelf && styles.customDropdownOptionMetaSelf,
                            ]}>
                              {emp.role || 'N/A'} • {emp.department || 'N/A'}
                            </Text>
                          </View>
                          {selectedValue === emp.email && (
                            <Animated.View style={{
                              transform: [{
                                scale: itemAnimations[index].interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.5, 1.1]
                                })
                              }]
                            }}>
                              <Ionicons
                                name="checkmark"
                                size={18}
                                color={isSelf ? "#10B981" : "#8B5CF6"}
                              />
                            </Animated.View>
                          )}
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })
                )}
              </ScrollView>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

export default function TaskManagement() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { resetBadge } = useModuleBadges();
  const [tasks, setTasks] = useState<Task[]>([]);

  // Reset badge when screen is focused
  useFocusEffect(
    useCallback(() => {
      resetBadge("tasks");
    }, [resetBadge])
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [taskDetailModalVisible, setTaskDetailModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"details" | "activity" | "comments">("details");
  const [filter, setFilter] = useState<"all" | Task["status"]>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
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

  // Reassign task modal state
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [taskToReassign, setTaskToReassign] = useState<Task | null>(null);
  const [reassignData, setReassignData] = useState({ description: "", deadline: "" });
  const [reassignHistory, setReassignHistory] = useState<Map<string, any>>(new Map());
  const [showReassignDatePicker, setShowReassignDatePicker] = useState(false);
  const [reassignSelectedDate, setReassignSelectedDate] = useState<Date>(new Date());

  // Status dropdown state
  const [statusDropdownTaskId, setStatusDropdownTaskId] = useState<string | null>(null);

  // View mode state
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Kanban expanded state
  const [expandedKanbanStatus, setExpandedKanbanStatus] = useState<Task["status"] | null>(null);

  // Expanded card state for list view
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Task Activity/History state
  const [taskActivity, setTaskActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Task Comments state (stored locally since backend doesn't have comments API)
  // Task Comments state (from backend API)
  const [taskComments, setTaskComments] = useState<Array<{ id: number; task_id: number; user_id: number; message: string; created_at: string; user_name: string; attachment?: { type: 'file' | 'pdf' | 'image'; name: string; url: string } }>>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    type: 'file' | 'pdf' | 'image';
    name: string;
    uri: string;
    size?: number;
    mimeType?: string;
  } | null>(null);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<number | null>(null);

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

  // Helper function to format date and time in IST (DD-MM-YYYY hh:mm A)
  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Unknown date";
    return formatDateTimeIST(dateString);
  };

  // Helper function to format time only in IST (hh:mm A)
  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    return formatTimeIST(dateString);
  };

  // Helper function to format chat message timestamp like WhatsApp
  // Shows only time since date is shown in separator
  const formatChatMessageTime = (dateString: string) => {
    if (!dateString) return "";
    return formatTimeIST(dateString);
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
    return validateTaskForm();
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
      "Pending": "todo", "In Progress": "in-progress", "Completed": "completed", "Cancelled": "cancelled",
    };
    return statusMap[backendStatus] || "todo";
  };

  const mapFrontendStatus = (frontendStatus: Task["status"]): string => {
    const statusMap: { [key: string]: string } = {
      "todo": "Pending", "in-progress": "In Progress", "completed": "Completed", "cancelled": "Cancelled",
    };
    return statusMap[frontendStatus] || "Pending";
  };

  const loadTasks = async (retryCount = 0) => {
    try {
      const userRole = user?.role?.toLowerCase();
      // Admin, HR, and Manager see all tasks in their scope (Global/Department)
      // Employee and Team Lead see only tasks they created or are assigned to
      let backendTasks: any[] = [];
      if (userRole === 'admin' || userRole === 'hr' || userRole === 'manager') {
        console.log("📥 Fetching all tasks for management role:", userRole);
        backendTasks = await apiService.getAllTasks();
      } else {
        console.log("📥 Fetching personal tasks for role:", userRole);
        backendTasks = await apiService.getMyTasks();
      }

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

      console.log("📊 Raw backend tasks:", backendTasks);
      
      const transformedTasks: Task[] = backendTasks
        .map((task: any) => {
          // Handle both task_id and id fields
          const taskId = task.task_id || task.id;
          
          if (!taskId) {
            console.warn("⚠️ Task missing ID:", task);
            return null;
          }

          const assignedToEmployee = allEmployeesList.find(emp => emp.user_id === task.assigned_to);
          const assignedByEmployee = allEmployeesList.find(emp => emp.user_id === task.assigned_by);
          
          return {
            id: taskId.toString(),
            title: task.title || "Untitled",
            description: task.description || "",
            priority: (task.priority || "medium").toLowerCase() as "low" | "medium" | "high" | "urgent",
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
          } as Task;
        })
        .filter((task): task is Task => task !== null);
      
      console.log("✅ Transformed tasks:", transformedTasks);
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

      // Filter employees based on role - STRICT ROLE-BASED ASSIGNMENT
      const userRole = user?.role?.toLowerCase();
      const userDepartment = user?.department;
      const currentUserId = user?.user_id;

      console.log(`📋 Loading employees for role: ${userRole}, department: ${userDepartment}`);

      if (userRole === 'admin') {
        // Admin can assign tasks to ALL roles (including self)
        console.log("👤 Admin: Showing all employees (Full Access)");
        // No filtering needed - Admin sees everyone
      } else if (userRole === 'hr') {
        // HR can assign to: Self, Manager, TeamLead, Employee (own department only) - NOT other HR
        console.log("👤 HR: Filtering for own department (Manager, TeamLead, Employee - NOT other HR)");
        transformedEmployees = transformedEmployees.filter((emp: any) => {
          // Include self
          if (emp.user_id === currentUserId || emp.email === user?.email) {
            return true;
          }
          // Include only same department
          if (emp.department?.toLowerCase() !== userDepartment?.toLowerCase()) {
            return false;
          }
          // Include Manager, TeamLead, Employee roles - EXCLUDE other HR
          const empRole = emp.role?.toLowerCase();
          return empRole === 'manager' || empRole === 'team_lead' || empRole === 'teamlead' || empRole === 'employee';
        });
      } else if (userRole === 'manager') {
        // Manager can assign to: Self, TeamLead, Employee (own department only) - NOT other Manager
        console.log("👤 Manager: Filtering for own department (TeamLead, Employee - NOT other Manager)");
        transformedEmployees = transformedEmployees.filter((emp: any) => {
          // Include self
          if (emp.user_id === currentUserId || emp.email === user?.email) {
            return true;
          }
          // Include only same department
          if (emp.department?.toLowerCase() !== userDepartment?.toLowerCase()) {
            return false;
          }
          // Include TeamLead, Employee roles - EXCLUDE other Manager
          const empRole = emp.role?.toLowerCase();
          return empRole === 'team_lead' || empRole === 'teamlead' || empRole === 'employee';
        });
      } else if (userRole === 'team_lead' || userRole === 'teamlead') {
        // TeamLead can pass to: Self and Employees (same department)
        console.log("👤 TeamLead: Filtering for Employees in own department");
        transformedEmployees = transformedEmployees.filter((emp: any) => {
          if (emp.user_id === currentUserId || emp.email === user?.email) return true;
          if (emp.department?.toLowerCase() !== userDepartment?.toLowerCase()) return false;
          return emp.role?.toLowerCase() === 'employee';
        });
      } else if (userRole === 'employee') {
        // Employee can assign to: Self only
        console.log("👤 Employee: Filtering for self only");
        transformedEmployees = transformedEmployees.filter(
          (emp: any) => emp.user_id === currentUserId || emp.email === user?.email
        );
      }

      console.log(`✅ Filtered employees count: ${transformedEmployees.length}`);
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

  const openReassignModal = (task: Task) => {
    setTaskToReassign(task);
    setReassignData({ description: "", deadline: "" });
    setReassignSelectedDate(new Date());
    setShowReassignDatePicker(false);
    setReassignModalVisible(true);
  };

  const closeReassignModal = () => {
    setReassignModalVisible(false);
    setTaskToReassign(null);
    setReassignData({ description: "", deadline: "" });
    setShowReassignDatePicker(false);
  };

  const handlePassTask = async () => {
    if (!taskToPass) return;

    // Validate fields
    const errors: { [key: string]: string } = {};
    if (!passTaskData.assignee) errors.assignee = "Please select a team member";
    if (!passTaskData.reason.trim()) errors.reason = "Please provide a transfer note";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormErrors({}); // Clear errors

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

  const handleReassignTask = async () => {
    const task = taskToReassign;
    if (!task) return;

    const errors: { [key: string]: string } = {};
    if (!reassignData.description.trim()) errors.reassignDescription = "Please provide a description";
    if (!reassignData.deadline) errors.reassignDeadline = "Please set a new deadline";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormErrors({});

      await apiService.reassignTask(parseInt(task.id), {
        description: reassignData.description,
        due_date: reassignData.deadline,
        status: "Pending"
      });

      showToast("✅ Task reactivated successfully");
      closeReassignModal();
      await loadTasks();
    } catch (error: any) {
      console.error("Error reassigning task:", error);
      showToast(error.message || "Failed to reactivate task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeTaskStatus = async (newStatus: Task["status"]) => {
    if (!selectedTask) return;

    // All users can change status
    // Confirm before cancelling
    if (newStatus === 'cancelled') {
      Alert.alert(
        "Cancel Task",
        "Are you sure you want to cancel this task? This action cannot be undone.",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes, Cancel Task",
            style: "destructive",
            onPress: async () => {
              try {
                setIsSubmitting(true);
                const backendStatus = mapFrontendStatus(newStatus) as "Pending" | "In Progress" | "Completed" | "Cancelled";
                await apiService.updateTaskStatus(parseInt(selectedTask.id), {
                  status: backendStatus,
                });
                showToast("✅ Task cancelled successfully");
                closeTaskDetail();
                await loadTasks();
              } catch (error: any) {
                console.error("Error cancelling task:", error);
                showToast(error.message || "Failed to cancel task");
              } finally {
                setIsSubmitting(false);
              }
            },
          },
        ]
      );
    } else {
      // For other status changes
      try {
        setIsSubmitting(true);
        const backendStatus = mapFrontendStatus(newStatus) as "Pending" | "In Progress" | "Completed" | "Cancelled";
        await apiService.updateTaskStatus(parseInt(selectedTask.id), {
          status: backendStatus,
        });
        showToast(`✅ Task status updated to ${formatStatusLabel(newStatus)}`);
        closeTaskDetail();
        await loadTasks();
      } catch (error: any) {
        console.error("Error updating task status:", error);
        showToast(error.message || "Failed to update task status");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      updateField('deadline', date.toISOString().split('T')[0]);
    }
  };

  const onReassignDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowReassignDatePicker(false);
    if (date) {
      setReassignSelectedDate(date);
      setReassignData(prev => ({ ...prev, deadline: date.toISOString().split('T')[0] }));
    }
  };

  const handleReassignDatePickerPress = () => {
    Keyboard.dismiss();
    setShowReassignDatePicker(true);
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
    setSelectedCommentId(null);
  };

  const handlePostComment = async () => {
    if (!selectedTask || (!newComment.trim() && !selectedAttachment)) return;

    setPostingComment(true);
    try {
      // Prepare comment data - only use text if user typed something
      const commentText = newComment.trim();

      console.log("📤 Posting comment:", {
        taskId: selectedTask.id,
        hasMessage: !!commentText,
        hasAttachment: !!selectedAttachment,
        attachmentName: selectedAttachment?.name,
        attachmentType: selectedAttachment?.type,
      });

      let newCommentData;

      if (selectedAttachment) {
        console.log("📤 Sending with attachment:", selectedAttachment);
        // Post comment with attachment to backend API
        newCommentData = await apiService.addTaskCommentWithAttachment(
          parseInt(selectedTask.id),
          commentText,
          selectedAttachment
        );
      } else {
        console.log("📤 Sending text-only comment");
        // Post text-only comment
        newCommentData = await apiService.addTaskComment(
          parseInt(selectedTask.id),
          commentText
        );
      }

      console.log("✅ Comment posted successfully:", newCommentData);

      // Add the new comment to the list
      setTaskComments(prev => [...prev, newCommentData]);
      setNewComment("");
      setSelectedAttachment(null);
      setShowEmojiPicker(false);
      showToast("✅ Message sent");
    } catch (error: any) {
      console.error("❌ Error posting comment:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        response: error.response,
      });
      showToast(error.message || "Failed to send message");
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

  // Enhanced validation with business rules
  const validateTaskForm = () => {
    const errors: { [key: string]: string } = {};
    
    // Title validation - minimum 5 characters
    if (!newTask.title.trim()) {
      errors.title = "Task title is required.";
    } else if (newTask.title.trim().length < 5) {
      errors.title = "Title must be at least 5 characters long.";
    } else if (newTask.title.trim().length > 100) {
      errors.title = "Title cannot exceed 100 characters.";
    }

    // Description validation - minimum 10 characters
    if (!newTask.description.trim()) {
      errors.description = "Task description is required.";
    } else if (newTask.description.trim().length < 10) {
      errors.description = "Description must be at least 10 characters long.";
    } else if (newTask.description.trim().length > 500) {
      errors.description = "Description cannot exceed 500 characters.";
    }

    // Deadline validation
    if (!newTask.deadline) {
      errors.deadline = "Please select a deadline.";
    } else {
      const deadlineDate = new Date(newTask.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      deadlineDate.setHours(0, 0, 0, 0);
      
      if (deadlineDate < today) {
        errors.deadline = "Deadline cannot be in the past.";
      }
      
      // Maximum 1 year in future
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      if (deadlineDate > maxDate) {
        errors.deadline = "Deadline cannot be more than 1 year in the future.";
      }
    }

    // Assignment validation
    if (!newTask.assignedTo) {
      errors.assignedTo = "Please assign the task to someone.";
    }

    // Priority validation
    if (!["low", "medium", "high", "urgent"].includes(newTask.priority)) {
      errors.priority = "Please select a valid priority level.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enhanced task analytics
  const getTaskAnalytics = () => {
    const analytics = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      overdue: tasks.filter(t => {
        if (t.status === 'completed' || t.status === 'cancelled') return false;
        const deadline = new Date(t.deadline);
        const today = new Date();
        return deadline < today;
      }).length,
      highPriority: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
      assignedToMe: tasks.filter(t => t.assignedTo.includes(user?.email || '')).length,
      createdByMe: tasks.filter(t => t.assigned_by === user?.user_id).length,
    };

    return analytics;
  };

  // Enhanced task filtering
  const getFilteredTasks = () => {
    let filtered = tasks;

    // Apply status filter
    if (filter !== "all") {
      filtered = filtered.filter(task => task.status === filter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.assignedToName?.toLowerCase().includes(query) ||
        task.assignedBy?.toLowerCase().includes(query) ||
        task.priority.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  // Helper function to construct full URL
  const getFullAttachmentUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${apiService.getBaseUrl()}${url}`;
  };

  // View attachment - opens PDF/document on device
  const handleViewAttachment = async (attachment: any) => {
    if (!attachment || !attachment.url) {
      showToast("Invalid attachment");
      return;
    }

    try {
      const fileName = attachment.name || `document_${Date.now()}`;
      const fullUrl = getFullAttachmentUrl(attachment.url);

      // For local file URIs, open directly
      if (fullUrl.startsWith('file://')) {
        const fileExists = await FileSystem.getInfoAsync(fullUrl);
        if (fileExists.exists) {
          // Use Sharing to open the file with default app
          await Sharing.shareAsync(fullUrl, {
            mimeType: attachment.mimeType || 'application/octet-stream',
            UTI: attachment.type === 'pdf' ? 'com.adobe.pdf' : 'public.item',
          });
          showToast(`📂 Opening ${fileName}...`);
        } else {
          showToast("File not found on device");
        }
        return;
      }

      // For remote URLs, download to cache and open
      const cacheDir = (FileSystem as any).cacheDirectory;
      if (!cacheDir) {
        showToast("Cannot access device storage");
        return;
      }

      showToast("📥 Downloading document...");

      // Create unique filename to avoid conflicts
      const timestamp = Date.now();
      const fileUri = `${cacheDir}${timestamp}_${fileName}`;

      console.log("📥 Downloading from:", fullUrl);
      console.log("💾 Saving to:", fileUri);

      // Download the file
      const downloadResult = await FileSystem.downloadAsync(fullUrl, fileUri);

      console.log("✅ Download result:", downloadResult);

      if (downloadResult.status === 200) {
        // File downloaded successfully - open it
        console.log("📂 Opening file:", downloadResult.uri);
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: attachment.mimeType || 'application/octet-stream',
          UTI: attachment.type === 'pdf' ? 'com.adobe.pdf' : 'public.item',
        });
        showToast(`📂 Opening ${fileName}...`);
      } else {
        showToast(`Failed to download file (Status: ${downloadResult.status})`);
      }
    } catch (error: any) {
      console.error("Error viewing attachment:", error);

      if (error.message?.includes('Network')) {
        showToast("Network error - check your connection");
      } else if (error.message?.includes('Permission')) {
        showToast("Permission denied - cannot access storage");
      } else if (error.message?.includes('404')) {
        showToast("File not found on server");
      } else {
        showToast(error.message || "Failed to open attachment");
      }
    }
  };

  // Download attachment - saves to device downloads
  const handleDownloadAttachment = async (attachment: any) => {
    if (!attachment || !attachment.url) {
      showToast("Invalid attachment");
      return;
    }

    try {
      const fileName = attachment.name || `attachment_${Date.now()}`;
      const fullUrl = getFullAttachmentUrl(attachment.url);

      // For local file URIs, directly share them
      if (fullUrl.startsWith('file://')) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fullUrl, {
            mimeType: attachment.mimeType || 'application/octet-stream',
            dialogTitle: `Share ${fileName}`,
          });
          showToast(`✅ ${fileName} ready to share`);
        } else {
          showToast("Sharing not available on this device");
        }
        return;
      }

      // For remote URLs, download first
      const cacheDir = (FileSystem as any).cacheDirectory;
      if (!cacheDir) {
        showToast("Cannot access device storage");
        return;
      }

      showToast("📥 Downloading...");

      // Create unique filename to avoid conflicts
      const timestamp = Date.now();
      const fileUri = `${cacheDir}${timestamp}_${fileName}`;

      console.log("📥 Downloading from:", fullUrl);
      console.log("💾 Saving to:", fileUri);

      // Download the file
      const downloadResult = await FileSystem.downloadAsync(fullUrl, fileUri);

      console.log("✅ Download result:", downloadResult);

      if (downloadResult.status === 200) {
        // File downloaded successfully - share it
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: attachment.mimeType || 'application/octet-stream',
            dialogTitle: `Download ${fileName}`,
            UTI: attachment.type === 'pdf' ? 'com.adobe.pdf' : 'public.item',
          });
          showToast(`✅ ${fileName} downloaded successfully`);
        } else {
          showToast(`✅ ${fileName} saved to device`);
        }
      } else {
        showToast(`Failed to download file (Status: ${downloadResult.status})`);
      }
    } catch (error: any) {
      console.error("Error downloading attachment:", error);

      if (error.message?.includes('Network')) {
        showToast("Network error - check your connection");
      } else if (error.message?.includes('Permission')) {
        showToast("Permission denied - cannot access storage");
      } else if (error.message?.includes('404')) {
        showToast("File not found on server");
      } else {
        showToast(error.message || "Failed to download attachment");
      }
    }
  };

  const emojis = ['😀', '😂', '😍', '🤔', '😢', '😡', '👍', '👎', '🎉', '🔥', '💯', '✨', '🚀', '💪', '🙏', '❤️', '😎', '🤗', '😴', '🤮'];

  const handleAddEmoji = (emoji: string) => {
    setNewComment(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handlePickImage = async () => {
    try {
      setAttachmentLoading(true);

      console.log("📸 Opening image picker...");

      // Request camera roll permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission to access camera roll is required');
        setAttachmentLoading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log("📸 Image picker result:", result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.uri.split('/').pop() || 'image.jpg';

        console.log("📸 Selected image:", {
          name: fileName,
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        });

        // Get file size
        let fileSize = 0;
        try {
          const fileInfo = await FileSystem.getInfoAsync(asset.uri);
          if (fileInfo.exists && 'size' in fileInfo) {
            fileSize = (fileInfo as any).size || 0;
          }
        } catch (e) {
          console.log("Could not get file size:", e);
        }

        console.log("📸 Image details:", {
          name: fileName,
          size: fileSize,
          mimeType: 'image/jpeg',
        });

        setSelectedAttachment({
          type: 'image',
          name: fileName,
          uri: asset.uri,
          size: fileSize,
          mimeType: 'image/jpeg',
        });
        showToast('📸 Image attached');
      } else {
        console.log("📸 Image picker cancelled");
      }
    } catch (error: any) {
      console.error("❌ Error picking image:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
      showToast('Failed to pick image');
    } finally {
      setAttachmentLoading(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      setAttachmentLoading(true);

      console.log("📄 Opening document picker...");

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'application/zip'],
        copyToCacheDirectory: true,
      });

      console.log("📄 Document picker result:", result);

      // Check if user cancelled
      if (result.canceled) {
        console.log("📄 Document picker cancelled by user");
        setAttachmentLoading(false);
        return;
      }

      // Check if we have assets
      if (!result.assets || result.assets.length === 0) {
        console.log("📄 No assets selected");
        showToast('No document selected');
        setAttachmentLoading(false);
        return;
      }

      const asset = result.assets[0];
      console.log("📄 Selected asset:", {
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType,
        size: asset.size,
      });

      const fileName = asset.name || 'document';
      const isPDF = fileName.toLowerCase().endsWith('.pdf');

      // Get file size if not provided
      let fileSize = asset.size || 0;
      if (!fileSize) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(asset.uri);
          if (fileInfo.exists && 'size' in fileInfo) {
            fileSize = (fileInfo as any).size || 0;
          }
        } catch (e) {
          console.log("Could not get file size:", e);
        }
      }

      console.log("📄 File details:", {
        name: fileName,
        type: isPDF ? 'pdf' : 'file',
        size: fileSize,
        mimeType: asset.mimeType,
      });

      setSelectedAttachment({
        type: isPDF ? 'pdf' : 'file',
        name: fileName,
        uri: asset.uri,
        size: fileSize,
        mimeType: asset.mimeType,
      });
      showToast(`📄 ${isPDF ? 'PDF' : 'File'} attached`);
    } catch (error: any) {
      console.error("❌ Error picking document:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
      showToast('Failed to pick document');
    } finally {
      setAttachmentLoading(false);
    }
  };

  const handleAttachFile = async () => {
    try {
      Alert.alert(
        "Attach File",
        "Choose what you want to attach",
        [
          {
            text: "📸 Photo from Gallery",
            onPress: handlePickImage,
          },
          {
            text: "📄 Document/PDF",
            onPress: handlePickDocument,
          },
          {
            text: "Cancel",
            style: "cancel",
          }
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.log("Error in attachment menu:", error);
      showToast("Failed to open attachment menu");
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getActivityIcon = (action: string) => {
    switch (action?.toLowerCase()) {
      case "created": return { name: "add-circle", color: "#fff", bgColor: "#10B981" };
      case "status_changed": return { name: "swap-horizontal", color: "#fff", bgColor: "#F97316" };
      case "passed": return { name: "git-branch", color: "#fff", bgColor: "#8B5CF6" };
      case "updated": return { name: "create", color: "#fff", bgColor: "#3B82F6" };
      case "completed": return { name: "checkmark-circle", color: "#fff", bgColor: "#10B981" };
      default: return { name: "ellipse", color: "#fff", bgColor: "#6B7280" };
    }
  };

  const getActivityTitle = (action: string) => {
    switch (action?.toLowerCase()) {
      case "created": return "Task Created";
      case "status_changed": return "Status Updated";
      case "passed": return "Task Passed";
      case "updated": return "Task Updated";
      case "completed": return "Task Completed";
      default: return "Activity";
    }
  };

  // Helper to format backend status to readable format
  // Map backend status to frontend status enum
  const normalizeStatus = (status: string | undefined): Task["status"] => {
    if (!status) return "todo";
    const normalized = status.toLowerCase().replace(/[_\s]/g, "").replace("taskstatus", "");

    if (normalized.includes("pending") || normalized.includes("todo")) return "todo";
    if (normalized.includes("inprogress") || normalized.includes("progress")) return "in-progress";
    if (normalized.includes("completed") || normalized.includes("done")) return "completed";
    if (normalized.includes("cancelled") || normalized.includes("cancel")) return "cancelled";

    return "todo";
  };

  // Format status for display with proper labels
  const formatStatusForDisplay = (status: Task["status"]): string => {
    switch (status) {
      case "todo": return "To Do";
      case "in-progress": return "In Progress";
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      default: return "Unknown";
    }
  };

  // Get status color and styling
  const getStatusStyle = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return { bgColor: "#FEF3C7", textColor: "#92400E", borderColor: "#FCD34D", icon: "ellipse", accentColor: "#F59E0B" };
      case "in-progress":
        return { bgColor: "#DBEAFE", textColor: "#1E40AF", borderColor: "#93C5FD", icon: "sync", accentColor: "#3B82F6" };
      case "completed":
        return { bgColor: "#DCFCE7", textColor: "#166534", borderColor: "#86EFAC", icon: "checkmark-circle", accentColor: "#10B981" };
      case "cancelled":
        return { bgColor: "#FEE2E2", textColor: "#991B1B", borderColor: "#FECACA", icon: "close-circle", accentColor: "#EF4444" };
      default:
        return { bgColor: "#F3F4F6", textColor: "#374151", borderColor: "#E5E7EB", icon: "ellipse", accentColor: "#6B7280" };
    }
  };

  const formatActivityDescription = (activity: any) => {
    const action = activity.action?.toLowerCase();
    const details = activity.details || {};

    switch (action) {
      case "created":
        const createdStatus = normalizeStatus(details.status);
        return {
          type: "created",
          status: createdStatus,
          message: `Task was created and set to ${formatStatusForDisplay(createdStatus)}`
        };
      case "status_changed":
        // Backend uses "from" and "to" keys
        const oldStatus = normalizeStatus(details.from || details.old_status || details.from_status);
        const newStatus = normalizeStatus(details.to || details.new_status || details.to_status || details.status);
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

  // Helper function to get user name by ID from employees list
  const getUserNameById = (userId: number | undefined): string => {
    if (!userId) return "Unknown";
    const employee = employees.find(emp => emp.user_id === userId);
    return employee?.name || `User #${userId}`;
  };

  const createTask = async () => {
    Keyboard.dismiss();
    
    // Enhanced validation with detailed error messages
    if (!validateTaskForm()) {
      // Show validation errors with animation
      Animated.sequence([
        Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      
      // Show first validation error
      const firstError = Object.values(formErrors)[0];
      if (firstError) {
        showToast(firstError);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedEmployee = employees.find(emp => emp.email === newTask.assignedTo);
      if (!selectedEmployee || !selectedEmployee.user_id) {
        throw new Error("Selected employee not found. Please refresh and try again.");
      }

      let currentUserId = user?.user_id;
      if (!currentUserId && user?.id) currentUserId = parseInt(user.id);
      if (!currentUserId || isNaN(currentUserId)) {
        throw new Error("Authentication error. Please log out and log back in.");
      }

      const priorityMap: { [key: string]: "Low" | "Medium" | "High" | "Urgent" } = {
        "low": "Low", "medium": "Medium", "high": "High", "urgent": "Urgent",
      };

      // Calculate task duration for analytics
      const deadlineDate = new Date(newTask.deadline);
      const today = new Date();
      const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (isEditMode && editingTaskId) {
        // Update existing task
        await apiService.updateTask(parseInt(editingTaskId), {
          title: newTask.title.trim(),
          description: newTask.description.trim(),
          due_date: newTask.deadline,
          priority: priorityMap[newTask.priority],
          assigned_to: selectedEmployee.user_id,
        });

        Animated.sequence([
          Animated.timing(buttonScale, { toValue: 1.1, duration: 200, useNativeDriver: true }),
          Animated.timing(buttonScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();

        showToast(`✅ Task updated successfully${daysUntilDeadline <= 3 ? ' (Urgent deadline!)' : ''}`);
      } else {
        // Create new task
        await apiService.createTask({
          title: newTask.title.trim(),
          description: newTask.description.trim(),
          due_date: newTask.deadline,
          priority: priorityMap[newTask.priority],
          assigned_to: selectedEmployee.user_id,
          assigned_by: currentUserId,
        });

        Animated.sequence([
          Animated.timing(buttonScale, { toValue: 1.1, duration: 200, useNativeDriver: true }),
          Animated.timing(buttonScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();

        showToast(`✅ Task created successfully${daysUntilDeadline <= 3 ? ' (Urgent deadline!)' : ''}`);
      }

      // Reset form
      setNewTask({ title: "", description: "", priority: "medium", deadline: "", assignedTo: "", department: "", employeeId: "" });
      setFormErrors({});
      setIsEditMode(false);
      setEditingTaskId(null);
      
      // Reload tasks and close modal
      await loadTasks();
      setTimeout(() => { 
        setModalVisible(false); 
        setIsSubmitting(false); 
      }, 500);
    } catch (error: any) {
      console.error("Error creating/updating task:", error);
      setIsSubmitting(false);
      
      // Enhanced error handling
      let errorMessage = error.message || `Failed to ${isEditMode ? 'update' : 'create'} task`;
      
      // Handle specific error cases
      if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        errorMessage = "A task with this title already exists. Please use a different title.";
      } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
        errorMessage = "You don't have permission to assign tasks to this employee.";
      } else if (error.message?.includes('network') || error.message?.includes('connection')) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      
      showToast(errorMessage);
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


  // Status order for sorting: To-Do → In-Progress → Completed → Cancelled
  const statusOrder: { [key: string]: number } = {
    "todo": 0,
    "in-progress": 1,
    "completed": 2,
    "cancelled": 3,
  };

  // Helper to get available statuses based on current status and user role (Sequential Flow)
  const getFilteredStatuses = (currentStatus: Task["status"], isTaskCreator: boolean): Task["status"][] => {
    const internalFlowOrder: Record<string, number> = {
      'todo': 1,
      'in-progress': 2,
      'completed': 3,
      'cancelled': 4
    };

    const allOptions: Task["status"][] = isTaskCreator
      ? ['todo', 'in-progress', 'completed', 'cancelled']
      : ['todo', 'in-progress', 'completed'];

    return allOptions.filter(s => {
      // Always show current status
      if (s === currentStatus) return true;

      // If task is in a final state (Completed/Cancelled), no further moves allowed
      if (currentStatus === 'completed' || currentStatus === 'cancelled') return false;

      // Creators can cancel anytime if not in final state
      if (s === 'cancelled') return isTaskCreator;

      // Otherwise, status can only move strictly forward
      return internalFlowOrder[s] > internalFlowOrder[currentStatus];
    });
  };

  // Common search filter applied to all views
  const tasksFilteredBySearch = getFilteredTasks();

  // Enhanced task analytics
  const analytics = getTaskAnalytics();

  // Filtered and sorted tasks for the List/Table view (includes status filter)
  const filteredTasks = tasksFilteredBySearch
    .filter(t => filter === "all" || t.status === filter)
    .sort((a, b) => {
      // First sort by status order
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Then sort by deadline (earliest first), tasks without deadline go last
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  // Task Card Item Component - For List View with Expand/Collapse
  const TaskCardItem = ({ task, isExpanded, onToggleExpand }: { task: Task; isExpanded: boolean; onToggleExpand: () => void }) => {
    const userRole = user?.role?.toLowerCase();
    const isAssignedTo = task.assigned_to === user?.user_id;
    const isCreator = task.assigned_by === user?.user_id;

    // Check if deadline has passed
    const isDeadlinePassed = task.deadline && new Date(task.deadline) < new Date();

    // Disable operations if deadline has passed
    const canPerformOperations = !isDeadlinePassed;

    const showPassButton = isAssignedTo &&
      (userRole === 'admin' || userRole === 'hr' || userRole === 'manager' || userRole === 'team_lead' || userRole === 'teamlead') &&
      task.status !== 'cancelled' &&
      canPerformOperations;
    const showReassignButton = isCreator && (task.status === 'cancelled' || task.status === 'completed') && canPerformOperations;

    return (
      <TouchableOpacity
        onPress={onToggleExpand}
        activeOpacity={0.9}
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#E5E7EB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Collapsed View - Always Visible */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4, lineHeight: 22 }} numberOfLines={2}>{task.title}</Text>
              <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 18 }} numberOfLines={2}>{task.description}</Text>
            </View>
            <View style={{ flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              {isDeadlinePassed && (
                <View style={{
                  backgroundColor: '#FEE2E2',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  minWidth: 70,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#FECACA',
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626', textTransform: 'uppercase', letterSpacing: 0.5 }}>Overdue</Text>
                </View>
              )}
              <View style={{
                backgroundColor: getPriorityColor(task.priority),
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                minWidth: 70,
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'capitalize' }}>{task.priority}</Text>
              </View>
            </View>
          </View>

          {/* Quick Summary Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="person" size={14} color="#3B82F6" />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827', flex: 1 }} numberOfLines={1}>{task.assignedToName || task.assignedTo[0] || "Unknown"}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="calendar" size={14} color="#D97706" />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827' }}>{task.deadline ? formatDateShortIST(task.deadline) : "No date"}</Text>
            </View>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
          </View>
        </View>

        {/* Expanded View */}
        {isExpanded && (
          <>
            {/* Divider */}
            <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />

            {/* Full Details Grid */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fafbfc' }}>
              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
                {/* Assigned By */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Assigned By</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="person-circle" size={16} color="#8B5CF6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }} numberOfLines={1}>{task.assignedBy || "Unknown"}</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }} numberOfLines={1}>{task.assignedByRole || "N/A"}</Text>
                    </View>
                  </View>
                </View>

                {/* Assigned To */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Assigned To</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="person" size={16} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }} numberOfLines={1}>{task.assignedToName || task.assignedTo[0] || "Unknown"}</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>Current</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 16 }}>
                {/* Deadline */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Deadline</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="calendar" size={16} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }} numberOfLines={1}>{task.deadline ? formatDateShortIST(task.deadline) : "Not set"}</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>Due date</Text>
                    </View>
                  </View>
                </View>

                {/* Status */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Status</Text>
                  <View style={{
                    backgroundColor: getStatusColor(task.status),
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    opacity: task.status === 'cancelled' ? 0.6 : 1,
                  }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff', textTransform: 'capitalize' }}>{formatStatusLabel(task.status)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Actions Footer */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* View Button - Always Available */}
              <TouchableOpacity style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#F9FAFB',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                justifyContent: 'center',
                alignItems: 'center',
              }} onPress={() => openTaskDetail(task)}>
                <Ionicons name="eye-outline" size={18} color="#6B7280" />
              </TouchableOpacity>

              {/* Pass Button - Only if conditions met and not overdue */}
              {showPassButton && canPerformOperations && (
                <TouchableOpacity style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#F3E8FF',
                  borderWidth: 1,
                  borderColor: '#E9D5FF',
                  justifyContent: 'center',
                  alignItems: 'center',
                }} onPress={() => openPassTaskModal(task)}>
                  <Ionicons name="git-branch-outline" size={18} color="#8B5CF6" />
                </TouchableOpacity>
              )}

              {/* Reassign Button - Only if conditions met and not overdue */}
              {showReassignButton && canPerformOperations && (
                <TouchableOpacity style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#FEF3C7',
                  borderWidth: 1,
                  borderColor: '#FCD34D',
                  justifyContent: 'center',
                  alignItems: 'center',
                }} onPress={() => openReassignModal(task)}>
                  <Ionicons name="refresh-outline" size={18} color="#D97706" />
                </TouchableOpacity>
              )}

              {/* Status Change Button - Only if not overdue */}
              {(isCreator || isAssignedTo) && canPerformOperations && (
                <TouchableOpacity
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#EFF6FF',
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setStatusDropdownTaskId(statusDropdownTaskId === task.id ? null : task.id);
                  }}
                >
                  <Ionicons name="swap-vertical" size={18} color="#3B82F6" />
                </TouchableOpacity>
              )}

              {/* Edit Button - Only for task creator and not overdue */}
              {task.assigned_by && user?.user_id && task.assigned_by === user.user_id && canPerformOperations && (
                <TouchableOpacity
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#F9FAFB',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => openEditTaskModal(task)}
                >
                  <Ionicons name="create-outline" size={18} color="#6B7280" />
                </TouchableOpacity>
              )}

              {/* Delete Button - Always available for task creator */}
              {task.assigned_by && user?.user_id && task.assigned_by === user.user_id && (
                <TouchableOpacity
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#FEE2E2',
                    borderWidth: 1,
                    borderColor: '#FECACA',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => deleteTask(task.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>

            {/* Status Dropdown Menu */}
            {statusDropdownTaskId === task.id && (isCreator || isAssignedTo) && canPerformOperations && (
              <View style={{
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1.5,
                borderTopColor: '#E5E7EB',
                gap: 8,
              }}>
                {getFilteredStatuses(task.status, isCreator).map((status) => {
                  const statusColor = getStatusColor(status);
                  const isCurrentStatus = task.status === status;

                  return (
                    <TouchableOpacity
                      key={status}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: isCurrentStatus ? `${statusColor}20` : '#F9FAFB',
                        borderWidth: isCurrentStatus ? 2 : 1.5,
                        borderColor: isCurrentStatus ? statusColor : '#E5E7EB',
                      }}
                      onPress={async () => {
                        try {
                          setIsSubmitting(true);
                          const backendStatus = mapFrontendStatus(status) as "Pending" | "In Progress" | "Completed" | "Cancelled";
                          await apiService.updateTaskStatus(parseInt(task.id), {
                            status: backendStatus,
                          });
                          showToast(`✅ Status updated to ${formatStatusLabel(status)}`);
                          await loadTasks();
                          setStatusDropdownTaskId(null);
                        } catch (error: any) {
                          console.error("Error updating task status:", error);
                          showToast(error.message || "Failed to update task status");
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting}
                      activeOpacity={0.6}
                    >
                      {/* Status Dot */}
                      <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: statusColor,
                        marginRight: 10,
                      }} />

                      {/* Status Label */}
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: isCurrentStatus ? statusColor : '#374151',
                        flex: 1,
                        letterSpacing: 0.3,
                      }}>
                        {formatStatusLabel(status)}
                      </Text>

                      {/* Checkmark for current status */}
                      {isCurrentStatus && (
                        <View style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: statusColor,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </TouchableOpacity>
    );
  };

  // Kanban Task Card Component
  const KanbanTaskCard = ({ task, onPress, onStatusChange, isDropdownOpen }: { task: Task; onPress: () => void; onStatusChange: () => void; isDropdownOpen: boolean }) => {
    const isTaskCreator = task.assigned_by === user?.user_id;
    const isAssignedUser = task.assigned_to === user?.user_id;

    // Check if deadline has passed
    const isDeadlinePassed = task.deadline && new Date(task.deadline) < new Date();

    // Disable operations if deadline has passed
    const canPerformOperations = !isDeadlinePassed;
    const canChangeStatus = canPerformOperations && (isTaskCreator || isAssignedUser);

    const getAvailableStatuses = (): Task["status"][] => {
      // Task creator can change to any status including cancelled
      if (isTaskCreator) {
        return ['todo', 'in-progress', 'completed', 'cancelled'];
      }
      // Other users can change to all statuses except cancelled
      return ['todo', 'in-progress', 'completed'];
    };

    const handleQuickStatusChange = async (newStatus: Task["status"]) => {
      try {
        setIsSubmitting(true);
        const backendStatus = mapFrontendStatus(newStatus) as "Pending" | "In Progress" | "Completed" | "Cancelled";
        await apiService.updateTaskStatus(parseInt(task.id), {
          status: backendStatus,
        });
        showToast(`✅ Status updated to ${formatStatusLabel(newStatus)}`);
        await loadTasks();
        setStatusDropdownTaskId(null);
      } catch (error: any) {
        console.error("Error updating task status:", error);
        showToast(error.message || "Failed to update task status");
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <View style={styles.kanbanTaskCard}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flex: 1 }}>
          <Text style={styles.kanbanTaskTitle} numberOfLines={2}>{task.title}</Text>
          <Text style={styles.kanbanTaskDescription} numberOfLines={2}>{task.description}</Text>

          <View style={styles.kanbanTaskMeta}>
            <Text style={styles.kanbanTaskDeadline}>{task.deadline ? getDayMonthIST(task.deadline) : "No deadline"}</Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {/* Overdue Badge */}
              {isDeadlinePassed && (
                <View style={{
                  backgroundColor: '#FEE2E2',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#FECACA',
                }}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: '#DC2626',
                    textTransform: 'uppercase',
                  }}>Overdue</Text>
                </View>
              )}
              {/* Priority Badge */}
              <View style={[{ backgroundColor: getPriorityColor(task.priority) }, { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }]}>
                <Text style={styles.kanbanTaskPriority}>{task.priority}</Text>
              </View>
            </View>
          </View>

          <View style={styles.kanbanTaskFooter}>
            <Text style={styles.kanbanTaskAssignee} numberOfLines={1}>{task.assignedToName || task.assignedTo?.[0] || "Unassigned"}</Text>
            <View style={styles.kanbanTaskActions}>
              {/* Status Change Button - Only if not overdue and user has permission */}
              {canChangeStatus && (
                <TouchableOpacity
                  style={[
                    styles.kanbanTaskActionButton,
                    isDropdownOpen && { backgroundColor: '#8B5CF6' }
                  ]}
                  onPress={onStatusChange}
                >
                  <Ionicons name="swap-vertical" size={14} color={isDropdownOpen ? "#fff" : "#6B7280"} />
                </TouchableOpacity>
              )}
              {/* Edit Button - Only for task creator and not overdue */}
              {isTaskCreator && canPerformOperations && (
                <TouchableOpacity
                  style={styles.kanbanTaskActionButton}
                  onPress={() => openEditTaskModal(task)}
                >
                  <Ionicons name="pencil" size={14} color="#6B7280" />
                </TouchableOpacity>
              )}
              {/* Delete Button - Only for task creator (always available) */}
              {isTaskCreator && (
                <TouchableOpacity
                  style={[
                    styles.kanbanTaskActionButton,
                    { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }
                  ]}
                  onPress={() => deleteTask(task.id)}
                >
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Status Dropdown Menu - Show when dropdown is open and can change status */}
        {isDropdownOpen && canChangeStatus && (
          <View style={{
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1.5,
            borderTopColor: '#E5E7EB',
            gap: 8,
          }}>
            {getAvailableStatuses().map((status) => {
              const statusColor = getStatusColor(status);
              const isCurrentStatus = task.status === status;

              return (
                <TouchableOpacity
                  key={status}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: isCurrentStatus ? `${statusColor}20` : '#F9FAFB',
                    borderWidth: isCurrentStatus ? 2 : 1.5,
                    borderColor: isCurrentStatus ? statusColor : '#E5E7EB',
                  }}
                  onPress={() => handleQuickStatusChange(status)}
                  disabled={isSubmitting}
                  activeOpacity={0.6}
                >
                  {/* Status Dot */}
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: statusColor,
                    marginRight: 10,
                  }} />

                  {/* Status Label */}
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: isCurrentStatus ? statusColor : '#374151',
                    flex: 1,
                    letterSpacing: 0.3,
                  }}>
                    {formatStatusLabel(status)}
                  </Text>

                  {/* Checkmark for current status */}
                  {isCurrentStatus && (
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: statusColor,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

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
      case "completed": return "#10B981";
      case "cancelled": return "#EF4444";
      default: return "#6b7280";
    }
  };

  const formatStatusLabel = (status: Task["status"]) => {
    switch (status) {
      case "todo": return "Todo";
      case "in-progress": return "In Progress";
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  // Kanban helper functions
  const getTasksByStatus = (status: Task["status"]) => {
    return tasksFilteredBySearch.filter(t => t.status === status);
  };

  const getStatusCountBadgeColor = (status: Task["status"]) => {
    switch (status) {
      case "todo": return { bg: "#F3F4F6", text: "#6B7280" };
      case "in-progress": return { bg: "#DBEAFE", text: "#1E40AF" };
      case "completed": return { bg: "#DCFCE7", text: "#166534" };
      case "cancelled": return { bg: "#FEE2E2", text: "#991B1B" };
      default: return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  // Stats - Use analytics for comprehensive task metrics
  const totalTasks = analytics.total;
  const todoCount = analytics.todo;
  const inProgressCount = analytics.inProgress;
  const completedCount = analytics.completed;
  const overdueCount = analytics.overdue;
  const highPriorityCount = analytics.highPriority;
  const assignedToMeCount = analytics.assignedToMe;

  const statusFilterOptions: { label: string; value: "all" | Task["status"] }[] = [
    { label: "All Status", value: "all" },
    { label: "Todo", value: "todo" },
    { label: "In Progress", value: "in-progress" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
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
      case 'custom': return `${formatDateIST(customDateStart)} - ${formatDateIST(customDateEnd)}`;
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
          task.deadline ? formatDateIST(task.deadline) : "Not set",
          formatDateIST(task.createdAt)
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
        const result = await Share.share({ message: csvContent, title: `Task Export - ${formatDateIST(new Date())}` });
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
      const textReport = `TASK REPORT\nGenerated: ${formatDateIST(new Date())}\nTotal Tasks: ${tasksToExport.length}\n\n${tasksToExport.map((task, i) => `${i + 1}. ${task.title}\n   Priority: ${task.priority} | Status: ${formatStatusLabel(task.status)}\n   Deadline: ${task.deadline ? formatDateIST(task.deadline) : 'Not set'}`).join('\n\n')}`;

      if (Share && typeof Share.share === 'function') {
        const result = await Share.share({ message: textReport, title: `Task Report - ${formatDateIST(new Date())}` });
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
                <Text style={styles.timeText}>{formatTimeIST(currentTime)}</Text>
                <Text style={styles.dateText}>{getDayMonthIST(currentTime)}</Text>
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
                    <Ionicons name={viewMode === 'kanban' ? 'layers' : 'list'} size={22} color="#fff" />
                  </View>
                  <View style={styles.sectionHeaderTextContainer}>
                    <Text style={styles.sectionHeaderTitle}>Task Management</Text>
                    <Text style={styles.sectionHeaderSubtitle}>{viewMode === 'kanban' ? `${totalTasks} tasks • Status Board` : `${filteredTasks.length} tasks • ${filter === 'all' ? 'All Status' : formatStatusLabel(filter)}`}</Text>
                  </View>
                </View>
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity style={styles.exportButton} onPress={openExportModal} disabled={filteredTasks.length === 0}>
                    <Ionicons name="download-outline" size={20} color={filteredTasks.length === 0 ? "#D1D5DB" : "#8B5CF6"} />
                  </TouchableOpacity>
                  <View style={styles.viewToggleContainer}>
                    <TouchableOpacity style={[styles.viewToggleButton, viewMode === 'kanban' && styles.viewToggleButtonActive]} onPress={() => setViewMode('kanban')} activeOpacity={0.7}>
                      <Ionicons name="layers" size={18} color={viewMode === 'kanban' ? "#fff" : "#6B7280"} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.viewToggleButton, viewMode === 'table' && styles.viewToggleButtonActive]} onPress={() => setViewMode('table')} activeOpacity={0.7}>
                      <Ionicons name="list" size={18} color={viewMode === 'table' ? "#fff" : "#6B7280"} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Search and Filter Row */}
          <View style={styles.searchFilterRow}>
            {/* Search Container ALWAYS visible */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search tasks..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Status Dropdown - ONLY for List/Table View */}
            {viewMode === 'table' && (
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
            )}
          </View>


          {/* Enhanced Kanban Status Board View */}
          {viewMode === 'kanban' ? (
            <ScrollView style={styles.kanbanContainer} showsVerticalScrollIndicator={false}>
              {/* Kanban Header */}
              <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', letterSpacing: 0.2 }}>Status Board</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2, fontWeight: '500' }}>{tasksFilteredBySearch.length} {tasksFilteredBySearch.length === 1 ? 'task' : 'tasks'}</Text>
                </View>
              </View>

              {tasksFilteredBySearch.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIcon}>
                    <Ionicons name="clipboard-outline" size={40} color="#9CA3AF" />
                  </View>
                  <Text style={styles.emptyStateText}>{searchQuery ? "No matching tasks" : "No tasks found"}</Text>
                  <Text style={styles.emptyStateSubtext}>{searchQuery ? "Try a different search term" : "Create a new task to get started"}</Text>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>

                  {[
                    { status: 'todo' as Task["status"], label: 'To-Do', icon: 'square-outline' as any, color: '#9CA3AF' },
                    { status: 'in-progress' as Task["status"], label: 'In Progress', icon: 'play-circle' as any, color: '#3B82F6' },
                    { status: 'completed' as Task["status"], label: 'Completed', icon: 'checkmark-circle' as any, color: '#10B981' },
                    { status: 'cancelled' as Task["status"], label: 'Cancelled', icon: 'close-circle' as any, color: '#EF4444' },
                  ].map((item) => {
                    const statusTasks = getTasksByStatus(item.status);
                    const count = statusTasks.length;
                    const isExpanded = expandedKanbanStatus === item.status;
                    const badgeColor = getStatusCountBadgeColor(item.status);

                    return (
                      <View key={item.status} style={{ gap: 8 }}>
                        {/* Status Button */}
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#fff',
                            borderRadius: 12,
                            padding: 12,
                            borderWidth: 2,
                            borderColor: isExpanded ? item.color : '#E5E7EB',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isExpanded ? 0.1 : 0.04,
                            shadowRadius: 8,
                            elevation: isExpanded ? 4 : 1,
                          }}
                          onPress={() => setExpandedKanbanStatus(isExpanded ? null : item.status)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${item.color}15`, justifyContent: 'center', alignItems: 'center' }}>
                              <Ionicons name={item.icon} size={18} color={item.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', letterSpacing: 0.2 }}>{item.label}</Text>
                              <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 1 }}>{count} {count === 1 ? 'task' : 'tasks'}</Text>
                            </View>
                          </View>
                          <View style={{ backgroundColor: badgeColor.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 32, alignItems: 'center' }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: badgeColor.text }}>{count}</Text>
                          </View>
                        </TouchableOpacity>


                        {/* Expanded Task List */}
                        {isExpanded && (
                          <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                            {count === 0 ? (
                              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                                  <Ionicons name="document-outline" size={24} color="#9CA3AF" />
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280' }}>No tasks</Text>
                                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>No tasks in this status</Text>
                              </View>
                            ) : (
                              statusTasks.map((task, index) => {

                                const userRole = user?.role?.toLowerCase();
                                const isAssignedTo = task.assigned_to === user?.user_id;
                                const isCreator = task.assigned_by === user?.user_id;

                                // Check if deadline has passed
                                const isDeadlinePassed = task.deadline && new Date(task.deadline) < new Date();

                                // Disable operations if deadline has passed
                                const canPerformOperations = !isDeadlinePassed;

                                const showPassButton = isAssignedTo &&
                                  (userRole === 'admin' || userRole === 'hr' || userRole === 'manager' || userRole === 'team_lead' || userRole === 'teamlead') &&
                                  task.status !== 'cancelled' &&
                                  canPerformOperations;
                                const showReassignButton = isCreator && (task.status === 'cancelled' || task.status === 'completed') && canPerformOperations;

                                return (
                                  <View
                                    key={task.id}
                                    style={{
                                      paddingHorizontal: 16,
                                      paddingVertical: 14,
                                      borderBottomWidth: index < statusTasks.length - 1 ? 1.5 : 0,
                                      borderBottomColor: '#F3F4F6',
                                    }}
                                  >
                                    <View style={{
                                      backgroundColor: '#fff',
                                      borderRadius: 14,
                                      padding: 12,
                                      borderWidth: 1,
                                      borderColor: '#E5E7EB',
                                      shadowColor: '#000',
                                      shadowOffset: { width: 0, height: 2 },
                                      shadowOpacity: 0.04,
                                      shadowRadius: 6,
                                      elevation: 2,
                                    }}>
                                      <TouchableOpacity
                                        onPress={() => openTaskDetail(task)}
                                        activeOpacity={0.7}
                                      >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8, lineHeight: 22 }} numberOfLines={2}>{task.title}</Text>
                                          <View style={{ backgroundColor: `${getPriorityColor(task.priority)}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                            <Text style={{ fontSize: 10, fontWeight: '800', color: getPriorityColor(task.priority), textTransform: 'uppercase' }}>{task.priority}</Text>
                                          </View>
                                        </View>

                                        <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 18 }} numberOfLines={2}>{task.description}</Text>

                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                                          {isDeadlinePassed && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#FEE2E2' }}>
                                              <Ionicons name="alert-circle" size={12} color="#EF4444" />
                                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444' }}>OVERDUE</Text>
                                            </View>
                                          )}
                                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#F1F5F9' }}>
                                            <Ionicons name="person-outline" size={12} color="#64748B" />
                                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#64748B' }} numberOfLines={1}>{task.assignedToName || 'Unassigned'}</Text>
                                          </View>
                                          {task.deadline && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#FEF3C7' }}>
                                              <Ionicons name="calendar-outline" size={12} color="#D97706" />
                                              <Text style={{ fontSize: 10, fontWeight: '600', color: '#D97706' }}>{formatDateShortIST(task.deadline)}</Text>
                                            </View>
                                          )}
                                        </View>
                                      </TouchableOpacity>

                                      {/* Enhanced Action Bar */}
                                      <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 8,
                                        paddingTop: 12,
                                        borderTopWidth: 1,
                                        borderTopColor: '#F3F4F6'
                                      }}>
                                        {/* View Button */}
                                        <TouchableOpacity
                                          style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
                                          onPress={() => openTaskDetail(task)}
                                          activeOpacity={0.6}
                                        >
                                          <Ionicons name="eye-outline" size={16} color="#475569" />
                                        </TouchableOpacity>

                                        {/* Change Status Button */}
                                        {(isCreator || isAssignedTo) && canPerformOperations && (
                                          <TouchableOpacity
                                            style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' }}
                                            onPress={() => setStatusDropdownTaskId(statusDropdownTaskId === task.id ? null : task.id)}
                                            activeOpacity={0.6}
                                          >
                                            <Ionicons name="swap-vertical" size={16} color="#0284C7" />
                                          </TouchableOpacity>
                                        )}

                                        {/* Pass Button */}
                                        {showPassButton && (
                                          <TouchableOpacity
                                            style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center' }}
                                            onPress={() => openPassTaskModal(task)}
                                            activeOpacity={0.6}
                                          >
                                            <Ionicons name="paper-plane-outline" size={16} color="#9333EA" />
                                          </TouchableOpacity>
                                        )}

                                        {/* Reassign Button */}
                                        {showReassignButton && (
                                          <TouchableOpacity
                                            style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' }}
                                            onPress={() => openReassignModal(task)}
                                            activeOpacity={0.6}
                                          >
                                            <Ionicons name="sync-outline" size={16} color="#D97706" />
                                          </TouchableOpacity>
                                        )}

                                        <View style={{ flex: 1 }} />

                                        {/* Edit Button */}
                                        {isCreator && canPerformOperations && (
                                          <TouchableOpacity
                                            style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}
                                            onPress={() => openEditTaskModal(task)}
                                            activeOpacity={0.6}
                                          >
                                            <Ionicons name="create-outline" size={16} color="#64748B" />
                                          </TouchableOpacity>
                                        )}

                                        {/* Delete Button */}
                                        {isCreator && (
                                          <TouchableOpacity
                                            style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' }}
                                            onPress={() => deleteTask(task.id)}
                                            activeOpacity={0.6}
                                          >
                                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                          </TouchableOpacity>
                                        )}
                                      </View>

                                      {/* Status Change Dropdown Menu */}
                                      {statusDropdownTaskId === task.id && (isCreator || isAssignedTo) && canPerformOperations && (
                                        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1.5, borderTopColor: '#E5E7EB', gap: 8 }}>
                                          {getFilteredStatuses(task.status, isCreator).map((status) => {
                                            const statusColor = getStatusColor(status);
                                            const isCurrentStatus = task.status === status;
                                            return (
                                              <TouchableOpacity
                                                key={status}
                                                style={{
                                                  flexDirection: 'row',
                                                  alignItems: 'center',
                                                  paddingHorizontal: 12,
                                                  paddingVertical: 10,
                                                  borderRadius: 10,
                                                  backgroundColor: isCurrentStatus ? `${statusColor}20` : '#F9FAFB',
                                                  borderWidth: isCurrentStatus ? 2 : 1.5,
                                                  borderColor: isCurrentStatus ? statusColor : '#E5E7EB',
                                                }}
                                                onPress={async () => {
                                                  try {
                                                    setIsSubmitting(true);
                                                    const backendStatus = mapFrontendStatus(status) as any;
                                                    await apiService.updateTaskStatus(parseInt(task.id), { status: backendStatus });
                                                    showToast(`✅ Status updated to ${formatStatusLabel(status)}`);
                                                    await loadTasks();
                                                    setStatusDropdownTaskId(null);
                                                  } catch (error: any) {
                                                    showToast(error.message || "Failed to update status");
                                                  } finally {
                                                    setIsSubmitting(false);
                                                  }
                                                }}
                                                disabled={isSubmitting}
                                                activeOpacity={0.6}
                                              >
                                                <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: `${statusColor}15`, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                                                  <Ionicons name={status === 'todo' ? 'square-outline' : status === 'in-progress' ? 'play-circle' : status === 'completed' ? 'checkmark-circle' : 'close-circle'} size={14} color={statusColor} />
                                                </View>
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: isCurrentStatus ? statusColor : '#374151', flex: 1 }}>{formatStatusLabel(status)}</Text>
                                                {isCurrentStatus && <Ionicons name="checkmark" size={16} color={statusColor} />}
                                              </TouchableOpacity>
                                            );
                                          })}
                                        </View>
                                      )}
                                    </View>
                                  </View>
                                );
                              })
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          ) : (

            /* Table/List View - Enhanced Card Layout */
            <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
              {/* List View Header */}
              <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', letterSpacing: 0.2 }}>Task List</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2, fontWeight: '500' }}>{filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}</Text>
                </View>
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
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 12, gap: 12 }}>
                    {filteredTasks.map((item) => (
                      <TaskCardItem
                        key={item.id}
                        task={item}
                        isExpanded={expandedCardId === item.id}
                        onToggleExpand={() => setExpandedCardId(expandedCardId === item.id ? null : item.id)}
                      />
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
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
              <LinearGradient colors={isEditMode ? ['#10B981', '#059669'] : ['#8B5CF6', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <View style={styles.modalIconContainer}>
                    <Ionicons name={isEditMode ? "create-outline" : "add-outline"} size={28} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{isEditMode ? "Edit Task" : "Create New Task"}</Text>
                    <Text style={styles.modalSubtitle}>{isEditMode ? "Update task details" : "Assign a new task to team members"}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={closeTaskForm} activeOpacity={0.7}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
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
                    <Text style={[styles.characterCounter, newTask.title.length > 100 && { color: '#ef4444' }]}>
                      {newTask.title.length}/100
                    </Text>
                  </View>
                  <TextInput 
                    placeholder="Enter task title (5-100 characters)" 
                    style={[styles.input, formErrors.title && styles.inputError]} 
                    value={newTask.title} 
                    onChangeText={(t) => updateField('title', t)} 
                    placeholderTextColor="#9ca3af"
                    maxLength={100}
                  />
                  {formErrors.title && <Text style={styles.errorText}>{formErrors.title}</Text>}
                  {!formErrors.title && newTask.title.length > 0 && newTask.title.length < 5 && (
                    <Text style={styles.warningText}>Minimum 5 characters required</Text>
                  )}
                </Animated.View>

                {/* Description */}
                <Animated.View style={[styles.fieldContainer, { opacity: descInputAnim, transform: [{ translateY: descInputAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                  <View style={styles.fieldLabelRow}>
                    <Ionicons name="document-text" size={18} color="#8B5CF6" style={styles.fieldIcon} />
                    <Text style={styles.fieldLabel}>Description <Text style={styles.required}>*</Text></Text>
                    <Text style={[styles.characterCounter, newTask.description.length > 500 && { color: '#ef4444' }]}>
                      {newTask.description.length}/500
                    </Text>
                  </View>
                  <TextInput 
                    placeholder="Enter detailed task description (10-500 characters)" 
                    style={[styles.input, styles.textArea, formErrors.description && styles.inputError]} 
                    value={newTask.description} 
                    multiline 
                    numberOfLines={4} 
                    onChangeText={(t) => updateField('description', t)} 
                    placeholderTextColor="#9ca3af"
                    maxLength={500}
                  />
                  {formErrors.description && <Text style={styles.errorText}>{formErrors.description}</Text>}
                  {!formErrors.description && newTask.description.length > 0 && newTask.description.length < 10 && (
                    <Text style={styles.warningText}>Minimum 10 characters required</Text>
                  )}
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
                      <Text style={[styles.dateInputText, !newTask.deadline && { color: '#9ca3af' }]}>{newTask.deadline ? formatDateIST(newTask.deadline) : 'dd-mm-yyyy'}</Text>
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
                  <CustomEmployeeDropdown
                    selectedValue={newTask.assignedTo}
                    onSelect={handleEmployeeSelect}
                    employees={employees}
                    loading={loadingEmployees}
                    error={formErrors.assignedTo}
                    currentUserEmail={user?.email}
                  />
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
      </Modal >


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
                <TouchableOpacity style={[styles.taskDetailTab, activeDetailTab === "details" && styles.taskDetailTabActive]} onPress={() => { setActiveDetailTab("details"); setSelectedCommentId(null); }}>
                  <Text style={[styles.taskDetailTabText, activeDetailTab === "details" && styles.taskDetailTabTextActive]}>Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.taskDetailTab, activeDetailTab === "activity" && styles.taskDetailTabActive]} onPress={() => { setActiveDetailTab("activity"); setSelectedCommentId(null); }}>
                  <Text style={[styles.taskDetailTabText, activeDetailTab === "activity" && styles.taskDetailTabTextActive]}>Activity</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.taskDetailTab, activeDetailTab === "comments" && styles.taskDetailTabActive]} onPress={() => setActiveDetailTab("comments")}>
                  <Text style={[styles.taskDetailTabText, activeDetailTab === "comments" && styles.taskDetailTabTextActive]}>Comments</Text>
                </TouchableOpacity>
              </View>

              {/* Details and Activity tabs in ScrollView */}
              {activeDetailTab !== "comments" && (
                <ScrollView style={styles.taskDetailContent}>
                  {activeDetailTab === "details" && (
                    <View style={styles.taskDetailDetailsTab}>
                      {/* Description Section */}
                      <View style={styles.taskDetailSection}>
                        <View style={styles.taskDetailSectionHeader}>
                          <Ionicons name="document-text" size={22} color="#8B5CF6" />
                          <Text style={styles.taskDetailSectionTitle}>Description</Text>
                        </View>
                        <View style={{
                          backgroundColor: '#f9fafb',
                          borderWidth: 1.5,
                          borderColor: '#e5e7eb',
                          borderRadius: 14,
                          padding: 16,
                          borderLeftWidth: 4,
                          borderLeftColor: '#8B5CF6',
                        }}>
                          <Text style={styles.taskDetailDescription}>{selectedTask.description}</Text>
                        </View>
                      </View>

                      {/* Task Details Table */}
                      <View style={styles.taskDetailSection}>
                        <View style={styles.taskDetailSectionHeader}>
                          <Ionicons name="information-circle" size={22} color="#8B5CF6" />
                          <Text style={styles.taskDetailSectionTitle}>Task Details</Text>
                        </View>

                        {/* Table Header */}
                        <View style={{
                          flexDirection: 'row',
                          backgroundColor: '#F3F4F6',
                          borderRadius: 12,
                          overflow: 'hidden',
                          marginBottom: 2,
                        }}>
                          <View style={{ flex: 0.4, paddingHorizontal: 14, paddingVertical: 12, borderRightWidth: 1, borderRightColor: '#E5E7EB' }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Field</Text>
                          </View>
                          <View style={{ flex: 0.6, paddingHorizontal: 14, paddingVertical: 12 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Value</Text>
                          </View>
                        </View>

                        {/* Table Rows */}
                        {[
                          { icon: 'person-circle', label: 'Assigned By', value: selectedTask.assignedBy || 'Unknown', color: '#8B5CF6' },
                          { icon: 'person', label: 'Assigned To', value: selectedTask.assignedToName || selectedTask.assignedTo[0] || 'Unknown', color: '#3B82F6' },
                          { icon: 'flag', label: 'Priority', value: selectedTask.priority, color: getPriorityColor(selectedTask.priority), isBadge: true },
                          { icon: 'calendar', label: 'Deadline', value: selectedTask.deadline ? formatDateIST(selectedTask.deadline) : 'Not set', color: '#D97706' },
                          { icon: 'checkmark-circle', label: 'Status', value: formatStatusLabel(selectedTask.status), color: getStatusColor(selectedTask.status), isBadge: true },
                          { icon: 'time', label: 'Created', value: selectedTask.createdAt ? formatDateTimeIST(selectedTask.createdAt) : 'Unknown', color: '#10B981' },
                          { icon: 'refresh', label: 'Last Updated', value: selectedTask.updatedAt ? formatDateTimeIST(selectedTask.updatedAt) : 'Not updated', color: '#F59E0B' },
                        ].map((item, index) => (
                          <View key={index} style={{
                            flexDirection: 'row',
                            backgroundColor: index % 2 === 0 ? '#fff' : '#F9FAFB',
                            borderBottomWidth: index < 6 ? 1 : 0,
                            borderBottomColor: '#E5E7EB',
                            borderBottomLeftRadius: index === 6 ? 12 : 0,
                            borderBottomRightRadius: index === 6 ? 12 : 0,
                          }}>
                            <View style={{ flex: 0.4, paddingHorizontal: 14, paddingVertical: 14, borderRightWidth: 1, borderRightColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${item.color}15`, justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name={item.icon as any} size={16} color={item.color} />
                              </View>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{item.label}</Text>
                            </View>
                            <View style={{ flex: 0.6, paddingHorizontal: 14, paddingVertical: 14, justifyContent: 'center' }}>
                              {item.isBadge ? (
                                <View style={{
                                  backgroundColor: item.color,
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                  borderRadius: 8,
                                  alignSelf: 'flex-start',
                                }}>
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff', textTransform: 'capitalize' }}>{item.value}</Text>
                                </View>
                              ) : (
                                <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', lineHeight: 18 }}>{item.value}</Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>

                      {/* Reactivation/Reassignment Details Section */}
                      {reassignHistory.has(selectedTask.id) && (
                        <View style={styles.taskDetailSection}>
                          <View style={styles.taskDetailSectionHeader}>
                            <Ionicons name="refresh-circle" size={22} color="#10B981" />
                            <Text style={styles.taskDetailSectionTitle}>Reactivation Details</Text>
                          </View>
                          {(() => {
                            const reactivationData = reassignHistory.get(selectedTask.id);
                            return (
                              <View style={{
                                backgroundColor: '#ECFDF5',
                                padding: 14,
                                borderRadius: 12,
                                borderLeftWidth: 4,
                                borderLeftColor: '#10B981',
                                gap: 10,
                              }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <Ionicons name="person-circle" size={16} color="#10B981" />
                                  <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Reactivated By</Text>
                                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 }}>{reactivationData.reassignedBy}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <Ionicons name="calendar" size={16} color="#10B981" />
                                  <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Reactivated At</Text>
                                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 }}>
                                    {reactivationData.reassignedAt instanceof Date
                                      ? reactivationData.reassignedAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
                                      : new Date(reactivationData.reassignedAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}
                                  </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <Ionicons name="person" size={16} color="#10B981" />
                                  <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Assigned To</Text>
                                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 }}>{reactivationData.reassignedTo}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                                  <Ionicons name="document-text" size={16} color="#10B981" style={{ marginTop: 2 }} />
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 4 }}>Reactivation Reason</Text>
                                    <Text style={{ fontSize: 13, color: '#111827', lineHeight: 18 }}>{reactivationData.description}</Text>
                                  </View>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                  <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Previous Status</Text>
                                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', flex: 1, textTransform: 'capitalize' }}>{reactivationData.previousStatus}</Text>
                                </View>
                              </View>
                            );
                          })()}
                        </View>
                      )}

                      {/* Passing History Section */}
                      {taskActivity && taskActivity.filter((a: any) => a.action?.toLowerCase() === 'passed').length > 0 && (
                        <View style={styles.taskDetailSection}>
                          <View style={styles.taskDetailSectionHeader}>
                            <Ionicons name="git-branch" size={22} color="#8B5CF6" />
                            <Text style={styles.taskDetailSectionTitle}>Passing History</Text>
                          </View>
                          <View style={{ gap: 10 }}>
                            {taskActivity
                              .filter((a: any) => a.action?.toLowerCase() === 'passed')
                              .map((activity: any, idx: number) => {
                                const details = activity.details || {};
                                return (
                                  <View key={idx} style={{
                                    backgroundColor: '#F9FAFB',
                                    padding: 12,
                                    borderRadius: 10,
                                    borderLeftWidth: 3,
                                    borderLeftColor: '#8B5CF6',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 10,
                                  }}>
                                    <Ionicons name="git-branch" size={16} color="#8B5CF6" />
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
                                        {details.from_name || getUserNameById(details.from)} → {details.to_name || getUserNameById(details.to)}
                                      </Text>
                                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                                        {formatDateTime(activity.created_at)}
                                      </Text>
                                      {details.note && (
                                        <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4, fontStyle: 'italic' }}>
                                          Note: {details.note}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                );
                              })}
                          </View>
                        </View>
                      )}

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
                          <Text style={styles.taskDetailActivityCenterText}>Loading activity...</Text>
                          <Text style={styles.taskDetailActivityCenterSubtext}>Fetching task history</Text>
                        </View>
                      ) : taskActivity.length > 0 ? (
                        <ScrollView showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
                          <View style={styles.taskDetailActivityTimeline}>
                            {/* Timeline connector line */}
                            {taskActivity.length > 1 && (
                              <View style={styles.taskDetailActivityTimelineConnector} />
                            )}

                            {taskActivity.map((activity, index) => {
                              const icon = getActivityIcon(activity.action);
                              const activityTitle = getActivityTitle(activity.action);
                              const description = formatActivityDescription(activity);
                              const userName = getActivityUserName(activity);
                              const isLast = index === taskActivity.length - 1;

                              return (
                                <View key={activity.id || index} style={styles.taskDetailActivityItem}>
                                  {/* Icon wrapper with timeline dot */}
                                  <View style={styles.taskDetailActivityIconWrapper}>
                                    <View style={[styles.taskDetailActivityIcon, { backgroundColor: icon.bgColor }]}>
                                      <Ionicons name={icon.name as any} size={28} color={icon.color} />
                                    </View>
                                  </View>

                                  {/* Content card */}
                                  <View style={[styles.taskDetailActivityContent, { marginBottom: isLast ? 0 : 0 }]}>
                                    {/* Header with title and time */}
                                    <View style={styles.taskDetailActivityHeader}>
                                      <Text style={styles.taskDetailActivityTitle}>
                                        {activityTitle}
                                      </Text>
                                      <Text style={styles.taskDetailActivityTime}>
                                        {formatDateTime(activity.created_at)}
                                      </Text>
                                    </View>

                                    {/* User info - compact */}
                                    <Text style={styles.taskDetailActivityUser}>
                                      <Ionicons name="person-circle" size={11} color="#8B5CF6" /> {userName}
                                    </Text>

                                    {/* Status change with compact styling */}
                                    {typeof description === 'object' && description.type === 'status_change' ? (
                                      <View style={styles.taskDetailActivityStatusChange}>
                                        {/* From Status Badge */}
                                        <View style={[
                                          styles.taskDetailActivityStatusBadge,
                                          {
                                            backgroundColor: getStatusStyle(description.from).bgColor,
                                            borderColor: getStatusStyle(description.from).borderColor,
                                          }
                                        ]}>
                                          <Ionicons
                                            name={getStatusStyle(description.from).icon as any}
                                            size={12}
                                            color={getStatusStyle(description.from).accentColor}
                                          />
                                          <Text style={[
                                            styles.taskDetailActivityStatusBadgeText,
                                            { color: getStatusStyle(description.from).textColor }
                                          ]}>
                                            {formatStatusForDisplay(description.from)}
                                          </Text>
                                        </View>

                                        {/* Arrow */}
                                        <Text style={styles.taskDetailActivityStatusArrow}>→</Text>

                                        {/* To Status Badge */}
                                        <View style={[
                                          styles.taskDetailActivityStatusBadge,
                                          {
                                            backgroundColor: getStatusStyle(description.to).bgColor,
                                            borderColor: getStatusStyle(description.to).borderColor,
                                          }
                                        ]}>
                                          <Ionicons
                                            name={getStatusStyle(description.to).icon as any}
                                            size={12}
                                            color={getStatusStyle(description.to).accentColor}
                                          />
                                          <Text style={[
                                            styles.taskDetailActivityStatusBadgeText,
                                            { color: getStatusStyle(description.to).textColor }
                                          ]}>
                                            {formatStatusForDisplay(description.to)}
                                          </Text>
                                        </View>
                                      </View>
                                    ) : typeof description === 'object' && description.type === 'created' ? (
                                      <View style={[styles.taskDetailActivityStatusChange, { borderLeftColor: '#10B981' }]}>
                                        <Ionicons name="sparkles" size={14} color="#10B981" />
                                        <Text style={{ fontSize: 12, color: '#374151', fontWeight: '500', flex: 1 }}>
                                          {description.message}
                                        </Text>
                                        <View style={[
                                          styles.taskDetailActivityStatusBadge,
                                          {
                                            backgroundColor: getStatusStyle(description.status).bgColor,
                                            borderColor: getStatusStyle(description.status).borderColor,
                                          }
                                        ]}>
                                          <Ionicons
                                            name={getStatusStyle(description.status).icon as any}
                                            size={11}
                                            color={getStatusStyle(description.status).accentColor}
                                          />
                                          <Text style={[
                                            styles.taskDetailActivityStatusBadgeText,
                                            { color: getStatusStyle(description.status).textColor, fontSize: 11 }
                                          ]}>
                                            {formatStatusForDisplay(description.status)}
                                          </Text>
                                        </View>
                                      </View>
                                    ) : typeof description === 'object' && description.type === 'passed' ? (
                                      <View style={styles.taskDetailActivityPassedInfo}>
                                        <Text style={styles.taskDetailActivityPassedFrom}>
                                          📤 Passed from: {description.from}
                                        </Text>
                                        <Text style={styles.taskDetailActivityPassedTo}>
                                          📥 Passed to: {description.to}
                                        </Text>
                                      </View>
                                    ) : (
                                      <Text style={styles.taskDetailActivityDescription}>
                                        {description as string}
                                      </Text>
                                    )}
                                    {/* Additional note if available */}
                                    {activity.details?.note && (
                                      <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                                        <Text style={{ fontSize: 11, color: '#6B7280', fontStyle: 'italic' }}>
                                          💬 {activity.details.note}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        </ScrollView>
                      ) : (
                        <View style={styles.taskDetailActivityCenter}>
                          <View style={styles.taskDetailActivityCenterIcon}>
                            <Ionicons name="time" size={32} color="#8B5CF6" />
                          </View>
                          <Text style={styles.taskDetailActivityCenterText}>No activity yet</Text>
                          <Text style={styles.taskDetailActivityCenterSubtext}>Task created on {formatDateTime(selectedTask?.createdAt)}</Text>
                        </View>)}
                    </View>
                  )}
                </ScrollView>
              )}

              {/* Comments tab outside ScrollView for proper layout */}
              {activeDetailTab === "comments" && (
                <View style={styles.taskDetailCommentsTab}>
                  <LinearGradient
                    colors={['#FED7AA', '#FECACA', '#FED7AA', '#FDBA74']}
                    locations={[0, 0.3, 0.7, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.chatWallpaperBackground}
                  >
                    {/* Loading state */}
                    {loadingComments ? (
                      <View style={styles.taskDetailActivityCenter}>
                        <ActivityIndicator size="large" color="#8B5CF6" />
                        <Text style={[styles.taskDetailActivityCenterText, { marginTop: 12 }]}>Loading comments...</Text>
                      </View>
                    ) : (
                      <>
                        {/* Comments List - Modern WhatsApp style */}
                        {taskComments.length > 0 ? (
                          <ScrollView style={styles.commentsListContainer} showsVerticalScrollIndicator={false}>
                            {taskComments.map((comment, index) => {
                              const isCurrentUser = comment.user_id === user?.user_id;

                              // Check if we need to show date separator
                              const showDateSeparator = index === 0 ||
                                formatChatTimestamp(comment.created_at) !== formatChatTimestamp(taskComments[index - 1].created_at);

                              return (
                                <View key={comment.id}>
                                  {/* Date Separator - WhatsApp style */}
                                  {showDateSeparator && (
                                    <View style={styles.dateSeparatorContainer}>
                                      <Text style={styles.dateSeparatorText}>
                                        {formatChatTimestamp(comment.created_at)}
                                      </Text>
                                    </View>
                                  )}

                                  <View
                                    style={[
                                      styles.commentBubbleWrapper,
                                      isCurrentUser ? styles.commentBubbleWrapperOwn : styles.commentBubbleWrapperOther,
                                    ]}
                                  >
                                    {/* Avatar for other users */}
                                    {!isCurrentUser && (
                                      <View style={[styles.commentAvatar, styles.commentAvatarOther]}>
                                        <Text>{(comment.user_name || "U").charAt(0).toUpperCase()}</Text>
                                      </View>
                                    )}

                                    {/* Message bubble with modern design */}
                                    <TouchableOpacity
                                      activeOpacity={0.8}
                                      onPress={() => setSelectedCommentId(selectedCommentId === comment.id ? null : comment.id)}
                                      style={[
                                        styles.commentBubble,
                                        isCurrentUser ? styles.commentBubbleOwn : styles.commentBubbleOther,
                                        selectedCommentId === comment.id && styles.commentBubbleSelected,
                                      ]}>
                                      {/* User name and time header */}
                                      <View style={styles.commentHeader}>
                                        <Text style={[
                                          styles.commentUserName,
                                          isCurrentUser ? styles.commentUserNameOwn : styles.commentUserNameOther,
                                        ]}>
                                          {isCurrentUser ? 'You' : comment.user_name}
                                        </Text>
                                        <Text style={[
                                          styles.commentTime,
                                          isCurrentUser ? styles.commentTimeOwn : styles.commentTimeOther,
                                        ]}>
                                          {formatChatMessageTime(comment.created_at)}
                                        </Text>
                                      </View>

                                      {/* Attachment Preview */}
                                      {comment.attachment && (
                                        <>
                                          {comment.attachment.type === 'image' ? (
                                            // Image Thumbnail with View & Download
                                            <View style={{
                                              marginBottom: 8,
                                              borderRadius: 10,
                                              overflow: 'hidden',
                                              backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.15)' : '#F3F4F6',
                                            }}>
                                              <Image
                                                source={{ uri: comment.attachment.url.startsWith('http') ? comment.attachment.url : `${apiService.getBaseUrl()}${comment.attachment.url}` }}
                                                style={{
                                                  width: 200,
                                                  height: 150,
                                                  backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                                                }}
                                                resizeMode="cover"
                                                onError={(error) => {
                                                  console.error("Image load error:", error);
                                                }}
                                              />
                                              {/* Action Buttons Overlay */}
                                              <View style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                backgroundColor: 'rgba(0,0,0,0.3)',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                flexDirection: 'row',
                                                gap: 8,
                                                opacity: 0.9,
                                              }}>
                                                {/* View Button */}
                                                <TouchableOpacity
                                                  onPress={() => handleViewAttachment(comment.attachment)}
                                                  style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 10,
                                                    backgroundColor: 'rgba(139, 92, 246, 0.9)',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    shadowColor: '#000',
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: 0.4,
                                                    shadowRadius: 4,
                                                    elevation: 4,
                                                  }}>
                                                  <Ionicons name="eye" size={20} color="#fff" />
                                                </TouchableOpacity>

                                                {/* Download Button */}
                                                <TouchableOpacity
                                                  onPress={() => handleDownloadAttachment(comment.attachment)}
                                                  style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 10,
                                                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    shadowColor: '#000',
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: 0.4,
                                                    shadowRadius: 4,
                                                    elevation: 4,
                                                  }}>
                                                  <Ionicons name="download" size={20} color="#fff" />
                                                </TouchableOpacity>
                                              </View>
                                            </View>
                                          ) : (
                                            // File/PDF Preview - Enhanced with View & Download
                                            <View style={{
                                              marginBottom: 8,
                                              borderRadius: 10,
                                              overflow: 'hidden',
                                              backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.15)' : '#F3F4F6',
                                              padding: 12,
                                              borderWidth: 1,
                                              borderColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#E5E7EB',
                                            }}>
                                              {/* File Info Row */}
                                              <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                                marginBottom: 10,
                                              }}>
                                                <View style={{
                                                  width: 48,
                                                  height: 48,
                                                  borderRadius: 10,
                                                  backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.25)' : (comment.attachment.type === 'pdf' ? '#FEE2E2' : '#E0F2FE'),
                                                  justifyContent: 'center',
                                                  alignItems: 'center',
                                                  flexShrink: 0,
                                                }}>
                                                  <Ionicons
                                                    name={
                                                      comment.attachment.type === 'pdf' ? 'document-text' :
                                                        'document-attach'
                                                    }
                                                    size={24}
                                                    color={isCurrentUser ? '#fff' : (comment.attachment.type === 'pdf' ? '#EF4444' : '#3B82F6')}
                                                  />
                                                </View>
                                                <View style={{ flex: 1, minWidth: 0 }}>
                                                  <Text style={{
                                                    fontSize: 12,
                                                    fontWeight: '700',
                                                    color: isCurrentUser ? '#fff' : '#111827',
                                                    marginBottom: 3,
                                                  }} numberOfLines={1}>
                                                    {comment.attachment.name}
                                                  </Text>
                                                  <Text style={{
                                                    fontSize: 10,
                                                    color: isCurrentUser ? 'rgba(255,255,255,0.75)' : '#6B7280',
                                                    fontWeight: '600',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.3,
                                                  }}>
                                                    {comment.attachment.type.toUpperCase()}
                                                  </Text>
                                                </View>
                                              </View>

                                              {/* Action Buttons Row */}
                                              <View style={{
                                                flexDirection: 'row',
                                                gap: 8,
                                              }}>
                                                {/* View Button */}
                                                <TouchableOpacity
                                                  onPress={() => handleViewAttachment(comment.attachment)}
                                                  style={{
                                                    flex: 1,
                                                    paddingVertical: 10,
                                                    paddingHorizontal: 12,
                                                    borderRadius: 8,
                                                    backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.25)' : '#8B5CF6',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    borderWidth: 1,
                                                    borderColor: isCurrentUser ? 'rgba(255,255,255,0.3)' : '#7C3AED',
                                                    flexDirection: 'row',
                                                    gap: 6,
                                                  }}>
                                                  <Ionicons name="eye" size={16} color={isCurrentUser ? '#fff' : '#fff'} />
                                                  <Text style={{
                                                    fontSize: 12,
                                                    fontWeight: '600',
                                                    color: '#fff',
                                                  }}>
                                                    View
                                                  </Text>
                                                </TouchableOpacity>

                                                {/* Download Button */}
                                                <TouchableOpacity
                                                  onPress={() => handleDownloadAttachment(comment.attachment)}
                                                  style={{
                                                    flex: 1,
                                                    paddingVertical: 10,
                                                    paddingHorizontal: 12,
                                                    borderRadius: 8,
                                                    backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.15)' : '#fff',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    borderWidth: 1,
                                                    borderColor: isCurrentUser ? 'rgba(255,255,255,0.3)' : '#E5E7EB',
                                                    flexDirection: 'row',
                                                    gap: 6,
                                                  }}>
                                                  <Ionicons name="download" size={16} color={isCurrentUser ? '#fff' : '#8B5CF6'} />
                                                  <Text style={{
                                                    fontSize: 12,
                                                    fontWeight: '600',
                                                    color: isCurrentUser ? '#fff' : '#8B5CF6',
                                                  }}>
                                                    Download
                                                  </Text>
                                                </TouchableOpacity>
                                              </View>
                                            </View>
                                          )}
                                        </>
                                      )}

                                      {/* Message text - only show if not empty */}
                                      {comment.message && comment.message.trim() && (
                                        <Text style={[
                                          styles.commentText,
                                          isCurrentUser ? styles.commentTextOwn : styles.commentTextOther,
                                        ]}>
                                          {comment.message}
                                        </Text>
                                      )}

                                      {/* Delete button for own comments - only show when selected */}
                                      {isCurrentUser && selectedCommentId === comment.id && (
                                        <TouchableOpacity
                                          onPress={() => {
                                            handleDeleteComment(comment.id);
                                            setSelectedCommentId(null);
                                          }}
                                          style={styles.commentDeleteButton}
                                        >
                                          <Ionicons name="trash-outline" size={16} color="#fff" />
                                        </TouchableOpacity>
                                      )}
                                    </TouchableOpacity>

                                    {/* Avatar for current user */}
                                    {isCurrentUser && (
                                      <View style={[styles.commentAvatar, styles.commentAvatarOwn]}>
                                        <Text>{(user?.name || "Y").charAt(0).toUpperCase()}</Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              );
                            })}
                            <View style={{ height: 8 }} />
                          </ScrollView>
                        ) : (
                          <View style={styles.taskDetailNoComments}>
                            <View style={styles.taskDetailNoCommentsIcon}>
                              <Ionicons name="chatbubbles-outline" size={40} color="#8B5CF6" />
                            </View>
                            <Text style={styles.taskDetailNoCommentsTitle}>No comments yet</Text>
                            <Text style={styles.taskDetailNoCommentsSubtitle}>Start a conversation about this task</Text>
                          </View>
                        )}
                      </>
                    )}
                  </LinearGradient>

                  {/* Controls outside wallpaper */}
                  {!loadingComments && (
                    <>
                      {/* Emoji Picker - Modern Popup */}
                      {showEmojiPicker && (
                        <View style={{
                          backgroundColor: '#fff',
                          borderTopWidth: 1,
                          borderTopColor: '#E5E7EB',
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          maxHeight: 120,
                        }}>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8 }}
                          >
                            {emojis.map((emoji, idx) => (
                              <TouchableOpacity
                                key={idx}
                                onPress={() => handleAddEmoji(emoji)}
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 10,
                                  backgroundColor: '#F9FAFB',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  borderWidth: 1,
                                  borderColor: '#E5E7EB',
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={{ fontSize: 24 }}>{emoji}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}

                      {/* Attachment Preview */}
                      {selectedAttachment && (
                        <View style={{
                          backgroundColor: '#F9FAFB',
                          borderTopWidth: 1,
                          borderTopColor: '#E5E7EB',
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                        }}>
                          {selectedAttachment.type === 'image' ? (
                            // Image Preview
                            <View style={{
                              borderRadius: 12,
                              overflow: 'hidden',
                              backgroundColor: '#fff',
                              borderWidth: 1,
                              borderColor: '#E5E7EB',
                              marginBottom: 10,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.08,
                              shadowRadius: 4,
                              elevation: 2,
                            }}>
                              <Image
                                source={{ uri: selectedAttachment.uri }}
                                style={{
                                  width: '100%',
                                  height: 200,
                                  backgroundColor: '#F3F4F6',
                                }}
                                resizeMode="cover"
                                onError={(error) => {
                                  console.error("Image preview error:", error);
                                }}
                              />
                              <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                backgroundColor: '#fff',
                                borderTopWidth: 1,
                                borderTopColor: '#F3F4F6',
                              }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{
                                    fontSize: 13,
                                    fontWeight: '700',
                                    color: '#111827',
                                    marginBottom: 2,
                                  }} numberOfLines={1}>
                                    {selectedAttachment.name}
                                  </Text>
                                  <Text style={{
                                    fontSize: 11,
                                    color: '#6B7280',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.3,
                                  }}>
                                    📸 {formatFileSize(selectedAttachment.size)} • Ready to send
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  onPress={() => setSelectedAttachment(null)}
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    backgroundColor: '#FEE2E2',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginLeft: 10,
                                    borderWidth: 1,
                                    borderColor: '#FECACA',
                                  }}
                                >
                                  <Ionicons name="close" size={20} color="#EF4444" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            // File/PDF Preview - Enhanced
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 12,
                              backgroundColor: '#fff',
                              borderRadius: 12,
                              padding: 14,
                              borderWidth: 1,
                              borderColor: '#E5E7EB',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.08,
                              shadowRadius: 4,
                              elevation: 2,
                            }}>
                              <View style={{
                                width: 56,
                                height: 56,
                                borderRadius: 12,
                                backgroundColor: selectedAttachment.type === 'pdf' ? '#FEE2E2' : '#E0F2FE',
                                justifyContent: 'center',
                                alignItems: 'center',
                                flexShrink: 0,
                              }}>
                                <Ionicons
                                  name={selectedAttachment.type === 'pdf' ? 'document-text' : 'document-attach'}
                                  size={28}
                                  color={selectedAttachment.type === 'pdf' ? '#EF4444' : '#3B82F6'}
                                />
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={{
                                  fontSize: 13,
                                  fontWeight: '700',
                                  color: '#111827',
                                  marginBottom: 4,
                                }} numberOfLines={1}>
                                  {selectedAttachment.name}
                                </Text>
                                <Text style={{
                                  fontSize: 11,
                                  color: '#6B7280',
                                  fontWeight: '600',
                                  marginBottom: 2,
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.3,
                                }}>
                                  {selectedAttachment.type.toUpperCase()} • {formatFileSize(selectedAttachment.size)}
                                </Text>
                                <Text style={{
                                  fontSize: 10,
                                  color: '#10B981',
                                  fontWeight: '700',
                                  letterSpacing: 0.2,
                                }}>
                                  ✓ Ready to send
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => setSelectedAttachment(null)}
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 10,
                                  backgroundColor: '#FEE2E2',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  borderWidth: 1,
                                  borderColor: '#FECACA',
                                  flexShrink: 0,
                                }}
                              >
                                <Ionicons name="close" size={20} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Comment input at bottom - Enhanced WhatsApp style */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        gap: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        backgroundColor: '#fff',
                        borderTopWidth: 1,
                        borderTopColor: '#E5E7EB',
                      }}>
                        {/* Emoji Button */}
                        <TouchableOpacity
                          onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: showEmojiPicker ? '#F3E8FF' : '#F9FAFB',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: showEmojiPicker ? '#E9D5FF' : '#E5E7EB',
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={{ fontSize: 20 }}>😊</Text>
                        </TouchableOpacity>

                        {/* Text Input */}
                        <TextInput
                          style={{
                            flex: 1,
                            borderWidth: 1.5,
                            borderColor: '#E5E7EB',
                            borderRadius: 24,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            backgroundColor: '#f9fafb',
                            color: '#111827',
                            fontWeight: '500',
                            fontSize: 14,
                            maxHeight: 100,
                          }}
                          placeholder="Type message..."
                          placeholderTextColor="#9CA3AF"
                          multiline
                          value={newComment}
                          onChangeText={setNewComment}
                          editable={!postingComment}
                        />

                        {/* Attachment Button */}
                        <TouchableOpacity
                          onPress={handleAttachFile}
                          disabled={attachmentLoading}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: selectedAttachment ? '#FEF3C7' : '#F9FAFB',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: selectedAttachment ? '#FCD34D' : '#E5E7EB',
                            opacity: attachmentLoading ? 0.6 : 1,
                          }}
                          activeOpacity={0.7}
                        >
                          {attachmentLoading ? (
                            <ActivityIndicator size="small" color="#8B5CF6" />
                          ) : (
                            <Ionicons
                              name="attach"
                              size={20}
                              color={selectedAttachment ? '#D97706' : '#6B7280'}
                            />
                          )}
                        </TouchableOpacity>

                        {/* Send Button */}
                        <TouchableOpacity
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: (newComment.trim() || selectedAttachment) && !postingComment ? '#8B5CF6' : '#D1D5DB',
                            justifyContent: 'center',
                            alignItems: 'center',
                            shadowColor: '#8B5CF6',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: (newComment.trim() || selectedAttachment) && !postingComment ? 0.3 : 0,
                            shadowRadius: 4,
                            elevation: (newComment.trim() || selectedAttachment) && !postingComment ? 3 : 0,
                          }}
                          onPress={handlePostComment}
                          disabled={(!newComment.trim() && !selectedAttachment) || postingComment}
                          activeOpacity={0.8}
                        >
                          {postingComment ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Ionicons name="send" size={18} color="#fff" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}
            </>
          )}
        </SafeAreaView>
      </Modal >


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
      </Modal >


      {/* Reassign Task Modal - Premium Design */}
      <Modal visible={reassignModalVisible} animationType="slide" transparent onRequestClose={closeReassignModal}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
            {/* Premium Header with Gradient */}
            <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.passModalHeader}>
              <TouchableOpacity style={{ position: 'absolute', top: 16, right: 16, zIndex: 1, padding: 4 }} onPress={closeReassignModal} activeOpacity={0.7}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="close" size={24} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 50 }}>
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                  <Ionicons name="refresh-circle" size={32} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4, letterSpacing: 0.3 }}>Reactivate Task</Text>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>Resume this task with updated details</Text>
                </View>
              </View>
            </LinearGradient>

            <ScrollView
              style={{ flex: 1, backgroundColor: '#f9fafb' }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={true}
              nestedScrollEnabled={true}
            >
              {/* Task Preview Card */}
              {taskToReassign && (
                <View style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="document-text" size={24} color="#10B981" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 }}>{taskToReassign.title}</Text>
                      <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Task ID: #{taskToReassign.id}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 12 }}>{taskToReassign.description}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 4 }}>CURRENT STATUS</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: taskToReassign.status === 'completed' ? '#10B981' : '#EF4444' }} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', textTransform: 'capitalize' }}>{formatStatusLabel(taskToReassign.status)}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 4 }}>ASSIGNED TO</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>{taskToReassign.assignedToName || taskToReassign.assignedTo[0] || 'Unknown'}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Assignee Info - Auto Selected */}
              {taskToReassign && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12, letterSpacing: 0.2 }}>Assigned To</Text>
                  <View style={{ backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, borderWidth: 2, borderColor: '#10B981', flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="person" size={22} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600', marginBottom: 2 }}>SAME ASSIGNEE</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{taskToReassign.assignedToName || taskToReassign.assignedTo[0] || 'Unknown'}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  </View>
                </View>
              )}

              {/* Description Input */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="document-text" size={18} color="#10B981" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', letterSpacing: 0.2 }}>Reactivation Details</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444', marginLeft: 4 }}>*</Text>
                </View>
                <TextInput
                  style={{
                    borderWidth: 1.5,
                    borderColor: formErrors.reassignDescription ? '#EF4444' : '#10B981',
                    borderRadius: 14,
                    padding: 14,
                    fontSize: 15,
                    backgroundColor: '#fff',
                    color: '#111827',
                    minHeight: 120,
                    textAlignVertical: 'top',
                    fontWeight: '500'
                  }}
                  placeholder="Describe why you're reactivating this task and any updates..."
                  placeholderTextColor="#9CA3AF"
                  value={reassignData.description}
                  onChangeText={(value) => setReassignData(prev => ({ ...prev, description: value }))}
                  multiline
                  numberOfLines={5}
                />
                {formErrors.reassignDescription && <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 6, fontWeight: '600', marginLeft: 4 }}>{formErrors.reassignDescription}</Text>}
              </View>

              {/* Deadline Date Picker - Mandatory */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="calendar" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', letterSpacing: 0.2 }}>New Deadline</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444', marginLeft: 8 }}>*</Text>
                </View>
                <TouchableOpacity
                  style={{
                    borderWidth: 1.5,
                    borderColor: formErrors.reassignDeadline ? '#EF4444' : (reassignData.deadline ? '#10B981' : '#E5E7EB'),
                    borderRadius: 14,
                    padding: 14,
                    backgroundColor: '#fff',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onPress={handleReassignDatePickerPress}
                >
                  <Text style={{ fontSize: 15, color: reassignData.deadline ? '#111827' : '#9CA3AF', fontWeight: '500' }}>
                    {reassignData.deadline || 'Select new deadline date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={reassignData.deadline ? '#10B981' : '#9CA3AF'} />
                </TouchableOpacity>
                {formErrors.reassignDeadline && (
                  <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 6, fontWeight: '600', marginLeft: 4 }}>
                    {formErrors.reassignDeadline}
                  </Text>
                )}
                {reassignData.deadline && (
                  <TouchableOpacity
                    style={{ marginTop: 8, alignSelf: 'flex-start' }}
                    onPress={() => setReassignData(prev => ({ ...prev, deadline: "" }))}
                  >
                    <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>Clear deadline</Text>
                  </TouchableOpacity>
                )}
                {showReassignDatePicker && (
                  <DateTimePicker
                    value={reassignSelectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onReassignDateChange}
                    minimumDate={new Date()}
                    textColor="#10B981"
                  />
                )}
              </View>

              {/* Info Box - Premium Style */}
              <View style={{ backgroundColor: '#ECFDF5', padding: 14, borderRadius: 14, borderLeftWidth: 4, borderLeftColor: '#10B981', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Ionicons name="information-circle" size={20} color="#10B981" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#065F46', marginBottom: 4 }}>Task Reactivation</Text>
                    <Text style={{ fontSize: 12, color: '#047857', lineHeight: 18 }}>This task will be reactivated from "{formatStatusLabel(taskToReassign?.status || 'cancelled')}" to "Pending" status and remain assigned to the same team member.</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Premium Footer */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 28 : 20, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 12, backgroundColor: '#fff' }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', minHeight: 52 }} onPress={closeReassignModal} disabled={isSubmitting}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 16,
                  borderRadius: 14,
                  backgroundColor: (!reassignData.description.trim() || !reassignData.deadline) ? '#D1D5DB' : '#10B981',
                  elevation: (!reassignData.description.trim() || !reassignData.deadline) ? 0 : 4,
                  shadowColor: '#10B981',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: (!reassignData.description.trim() || !reassignData.deadline) ? 0 : 0.35,
                  shadowRadius: 8,
                  gap: 8,
                  minHeight: 52
                }}
                onPress={handleReassignTask}
                disabled={isSubmitting || !reassignData.description.trim() || !reassignData.deadline}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="refresh-circle" size={20} color="#fff" />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 }}>Reactivate</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Pass Task Modal - Full Screen Premium Design */}
      <Modal visible={passTaskModalVisible} animationType="slide" transparent={true} onRequestClose={closePassTaskModal}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            {/* Premium Header with Gradient */}
            <LinearGradient colors={['#8B5CF6', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.passModalHeader}>
              <TouchableOpacity style={{ position: 'absolute', top: 16, right: 16, zIndex: 1, padding: 4 }} onPress={closePassTaskModal} activeOpacity={0.7}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="close" size={24} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 50 }}>
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                  <Ionicons name="paper-plane" size={32} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4, letterSpacing: 0.3 }}>Pass Task</Text>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>Transfer ownership to a team member</Text>
                </View>
              </View>
            </LinearGradient>

            <ScrollView
              style={{ flex: 1, backgroundColor: '#f9fafb' }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Task Summary Card */}
              {taskToPass && (
                <View style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="document-text" size={24} color="#8B5CF6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 }}>{taskToPass.title}</Text>
                      <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Task ID: #{taskToPass.id}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 20 }}>{taskToPass.description}</Text>
                </View>
              )}

              {/* Assignee Selection */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="person" size={18} color="#8B5CF6" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', letterSpacing: 0.2 }}>New Assignee</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444', marginLeft: 4 }}>*</Text>
                </View>
                <View style={{ borderWidth: 1.5, borderColor: formErrors.assignee ? '#EF4444' : '#E5E7EB', borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden' }}>
                  {loadingEmployees ? (
                    <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator size="small" color="#8B5CF6" /></View>
                  ) : (
                    <Picker
                      selectedValue={passTaskData.assignee}
                      onValueChange={(value) => setPassTaskData(prev => ({ ...prev, assignee: value }))}
                      style={{ height: 56, width: '100%', color: '#111827' }}
                      dropdownIconColor="#8B5CF6"
                    >
                      <Picker.Item label="Select a team member..." value="" color="#9CA3AF" />
                      {employees.length === 0 ? (
                        <Picker.Item label="No eligible team members found" value="" color="#9CA3AF" />
                      ) : (
                        employees
                          .filter(emp => emp.user_id !== user?.user_id && emp.email !== user?.email)
                          .map((emp) => (
                            <Picker.Item key={emp.id} label={`${emp.name} • ${emp.role || emp.department || 'Team Member'}`} value={emp.email} color="#111827" />
                          ))
                      )}
                    </Picker>
                  )}
                </View>
                {formErrors.assignee && <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 6, fontWeight: '600', marginLeft: 4 }}>{formErrors.assignee}</Text>}
              </View>

              {/* Transfer Note */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#8B5CF6" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', letterSpacing: 0.2 }}>Transfer Note</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444', marginLeft: 4 }}>*</Text>
                </View>
                <TextInput
                  style={{
                    borderWidth: 1.5,
                    borderColor: formErrors.reason ? '#EF4444' : '#E5E7EB',
                    borderRadius: 14,
                    padding: 14,
                    fontSize: 15,
                    backgroundColor: '#fff',
                    color: '#111827',
                    minHeight: 120,
                    textAlignVertical: 'top',
                    fontWeight: '500'
                  }}
                  placeholder="Share context about why you're passing this task..."
                  placeholderTextColor="#9CA3AF"
                  value={passTaskData.reason}
                  onChangeText={(value) => setPassTaskData(prev => ({ ...prev, reason: value }))}
                  multiline
                  numberOfLines={5}
                />
                {formErrors.reason && <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 6, fontWeight: '600', marginLeft: 4 }}>{formErrors.reason}</Text>}
              </View>

              {/* Info Box */}
              <View style={{ backgroundColor: '#F5F3FF', padding: 14, borderRadius: 14, borderLeftWidth: 4, borderLeftColor: '#8B5CF6' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Ionicons name="information-circle" size={20} color="#8B5CF6" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#5B21B6', marginBottom: 4 }}>Wait for confirmation</Text>
                    <Text style={{ fontSize: 12, color: '#6D28D9', lineHeight: 18 }}>Once you pass this task, it will be moved to the selected member's task list. You will still be able to track its progress.</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Premium Footer */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 28 : 20, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 12, backgroundColor: '#fff' }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', minHeight: 52 }} onPress={closePassTaskModal} disabled={isSubmitting}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 2,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 16,
                  borderRadius: 14,
                  backgroundColor: (!passTaskData.assignee || !passTaskData.reason.trim()) ? '#D1D5DB' : '#8B5CF6',
                  elevation: (!passTaskData.assignee || !passTaskData.reason.trim()) ? 0 : 4,
                  shadowColor: '#8B5CF6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: (!passTaskData.assignee || !passTaskData.reason.trim()) ? 0 : 0.35,
                  shadowRadius: 8,
                  gap: 8,
                  minHeight: 52
                }}
                onPress={handlePassTask}
                disabled={isSubmitting || !passTaskData.assignee || !passTaskData.reason.trim()}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 }}>Confirm Pass</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
