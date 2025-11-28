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
    Easing,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
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

interface Task {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in-progress" | "review" | "completed" | "cancelled";
  assignedTo: string[];
  assignedToName?: string; // Name of the person assigned to
  assignedBy?: string; // Name of the person who created the task
  assignedByRole?: string; // Role of the person who created the task
  deadline: string;
  createdAt: string;
  updatedAt: string;
  assigned_by?: number; // User ID of the person who created the task
}

// 🎨 Styles
const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#39549fff",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
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
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    position: "relative",
  },
  statsIcon: {
    position: "absolute",
    top: 70,
    right: 10,
    opacity: 0.8,
  },
  cardLabel: { 
    fontSize: 12, 
    color: "#fff",
    marginBottom: 8,
    fontWeight: "500",
    opacity: 0.9,
  },
  cardValue: { 
    fontSize: 24, 
    fontWeight: "bold", 
    color: "#fff",
    marginBottom: 4,
  },
  filterRow: { marginBottom: 10 },
  search: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
  },
  filterButtons: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  statusDropdownWrapper: {
    position: 'relative',
  },
  statusDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 120,
    height: 44,
  },
  statusDropdownText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  statusDropdownList: {
    position: 'absolute',
    top: 48,
    right: 0,
    minWidth: 180,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    overflow: 'hidden',
    zIndex: 1000,
  },
  statusDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusDropdownOptionActive: {
    backgroundColor: '#F0FDF4',
    borderBottomColor: '#D1FAE5',
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
  chip: { margin: 3 },
  taskCard: { marginVertical: 6, borderRadius: 10 },
  description: { marginTop: 4, color: "#555" },
  deadline: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  statusRow: { flexDirection: "row", marginTop: 6 },
  statusChip: { backgroundColor: "#E5E7EB" },
  statusDot: { width: 12, height: 12, borderRadius: 6, margin: 10 },
  noTasks: { textAlign: "center", color: "#6b7280", marginTop: 20 },
  fab: {
    position: "absolute",
    bottom: 30, // Default bottom position, will be overridden with inline style
    right: 20,
    backgroundColor: "#7C3AED",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  fullScreenFormContainer: {
    flex: 1,
    backgroundColor: "#7c3aed",
  },
  fullScreenCard: {
    flex: 1,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 1,
    padding: 4,
  },
  closeButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  progressContainer: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#f9fafb",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e5e7eb",
  },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 4,
  },
  formContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f9fafb",
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 8,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  fieldIcon: {
    marginRight: 6,
  },
  required: {
    color: "#ef4444",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#111827",
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  rowContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    backgroundColor: "#fff",
    position: "relative",
  },
  picker: {
    height: 50,
    color: "#111827",
  },
  priorityIndicator: {
    position: "absolute",
    right: 12,
    top: "50%",
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: -6,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    height: 50,
  },
  dateInputText: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  actionButtons: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Extra padding for iOS home indicator
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 12,
    backgroundColor: "#fff",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  createButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  createButtonDisabled: {
    backgroundColor: "#a78bfa",
    elevation: 0,
    shadowOpacity: 0,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Options Modal Styles
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  optionsContent: {
    flex: 1,
    padding: 16,
  },
  optionCard: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 8,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionColumn: {
    flexDirection: "column",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
    marginBottom: 8,
  },
  optionButtonActive: {
    backgroundColor: "#3B82F6",
  },
  optionButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginLeft: 6,
  },
  optionButtonTextActive: {
    color: "#fff",
  },
  optionListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionListItemActive: {
    backgroundColor: "#F0FDF4",
  },
  optionListItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionListItemText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 12,
    flex: 1,
  },
  optionListItemTextActive: {
    color: "#059669",
    fontWeight: "500",
  },
  optionBadge: {
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  optionBadgeText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickActionButton: {
    width: "48%",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quickActionText: {
    fontSize: 12,
    color: "#374151",
    marginTop: 6,
    fontWeight: "500",
  },
  optionsFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  applyButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Task Management Header Styles
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  taskHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  taskHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  taskHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewModeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  // Search and Filter Styles
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    height: "100%",
  },
  filterDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    minWidth: 120,
    justifyContent: "space-between",
  },
  filterDropdownText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  // Table Styles
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableContainer: {
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#fff",
    minHeight: 60,
  },
  tableRowEven: {
    backgroundColor: "#FAFAFA",
  },
  tableCell: {
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    minHeight: 44,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  taskDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  assignedToContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  assignedToText: {
    fontSize: 12,
    color: "#374151",
    marginLeft: 6,
    flex: 1,
    flexShrink: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    textTransform: "capitalize",
  },
  deadlineContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  deadlineText: {
    fontSize: 12,
    color: "#374151",
    marginLeft: 6,
    flex: 1,
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
    flexShrink: 1,
    textAlign: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#6B7280",
    marginRight: 4,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  viewButtonText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginRight: 4,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  editButtonText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginLeft: 4,
  },
  passButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  passButtonText: {
    fontSize: 12,
    color: "#8B5CF6",
    fontWeight: "500",
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EF4444",
  },
  deleteButtonText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
    marginLeft: 4,
  },
  // Pass Task Modal Styles
  passModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  passModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: "90%",
    maxWidth: 600,
    minHeight: 400,
    maxHeight: "80%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  // Empty State Styles
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  // Horizontal Scroll Styles
  horizontalScrollContainer: {
    flex: 1,
  },
  tableWrapper: {
    minWidth: 1260, // Minimum width to ensure all columns are visible (increased for new column)
  },
  // Column Width Styles
  taskColumn: {
    width: 200,
  },
  assignedByColumn: {
    width: 180,
  },
  assignedToColumn: {
    width: 160,
  },
  priorityColumn: {
    width: 100,
  },
  deadlineColumn: {
    width: 120,
  },
  statusColumn: {
    width: 120,
  },
  actionsColumn: {
    width: 380,
  },
  // Card View Styles
  cardViewContainer: {
    flex: 1,
    paddingBottom: 16,
    paddingTop: 4,
  },
  taskCardWrapper: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'visible',
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'visible',
  },
  taskCardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  taskCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 22,
  },
  taskCardDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  taskCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  taskCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskCardMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  taskCardBody: {
    padding: 16,
    paddingTop: 12,
  },
  taskCardInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  taskCardInfoItem: {
    width: '50%',
    marginBottom: 12,
    paddingRight: 8,
  },
  taskCardInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  taskCardInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  taskCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  taskCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  taskCardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  taskCardActionButtonText: {
    fontSize: 12,
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
  statusDropdownContainer: {
    position: 'relative',
    zIndex: 1000,
    minWidth: 110,
  },
  statusDropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  statusDropdownMenu: {
    position: 'absolute',
    top: '100%',
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 15,
    overflow: 'hidden',
    zIndex: 2001,
  },
  statusDropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
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
  viewToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewToggleButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  // Task Detail Modal Styles
  taskDetailContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  taskDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  taskDetailHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskDetailIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  taskDetailTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  taskDetailId: {
    fontSize: 14,
    color: "#6B7280",
  },
  taskDetailCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  taskDetailTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingHorizontal: 20,
  },
  taskDetailTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  taskDetailTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#8B5CF6",
  },
  taskDetailTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  taskDetailTabTextActive: {
    color: "#8B5CF6",
    fontWeight: "600",
  },
  taskDetailContent: {
    flex: 1,
  },
  taskDetailDetailsTab: {
    padding: 20,
  },
  taskDetailSection: {
    marginBottom: 24,
  },
  taskDetailSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  taskDetailSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 8,
  },
  taskDetailDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  taskDetailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  taskDetailGridItem: {
    width: "50%",
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  taskDetailFieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  taskDetailFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  taskDetailFieldValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  taskDetailPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  taskDetailPriorityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    textTransform: "capitalize",
  },
  taskDetailStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  taskDetailStatusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
    marginRight: 6,
  },
  taskDetailStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  taskDetailTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  taskDetailTag: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  taskDetailTagText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  taskDetailActivityTab: {
    padding: 20,
  },
  taskDetailActivityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  taskDetailActivityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EBF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  taskDetailActivityContent: {
    flex: 1,
  },
  taskDetailActivityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  taskDetailActivityTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  taskDetailActivityCenter: {
    alignItems: "center",
    paddingVertical: 40,
  },
  taskDetailActivityCenterIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  taskDetailActivityCenterText: {
    fontSize: 14,
    color: "#6B7280",
  },
  taskDetailCommentsTab: {
    padding: 20,
  },
  taskDetailCommentInput: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 24,
    gap: 12,
  },
  taskDetailCommentTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    maxHeight: 100,
  },
  taskDetailCommentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  taskDetailCommentButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  taskDetailNoComments: {
    alignItems: "center",
    paddingVertical: 40,
  },
  taskDetailNoCommentsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  taskDetailNoCommentsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  taskDetailNoCommentsSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  // Export Modal Styles
  exportModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  exportModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 480,
    height: "auto",
    maxHeight: "90%",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    overflow: 'hidden',
  },
  exportModalHeader: {
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  exportModalIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  exportModalHeaderText: {
    flex: 1,
    paddingRight: 40,
  },
  exportModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  exportModalSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.95)",
    lineHeight: 16,
  },
  exportModalCloseButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  exportModalBody: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    maxHeight: 450,
  },
  exportSection: {
    marginBottom: 16,
  },
  exportSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  exportSectionIcon: {
    marginRight: 6,
  },
  exportSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    letterSpacing: 0.2,
  },
  exportFormatButtons: {
    flexDirection: "row",
    gap: 10,
  },
  exportFormatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    minHeight: 52,
  },
  exportFormatButtonActive: {
    borderColor: "#10B981",
    backgroundColor: "#ECFDF5",
  },
  exportFormatButtonIcon: {
    marginRight: 6,
  },
  exportFormatButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  exportFormatButtonTextActive: {
    color: "#10B981",
  },
  exportDropdown: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  exportDropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  exportDropdownText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
    flex: 1,
  },
  exportDropdownList: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    maxHeight: 160,
  },
  exportDropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#fff",
  },
  exportDropdownOptionLast: {
    borderBottomWidth: 0,
  },
  exportDropdownOptionText: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
  },
  exportSummaryBox: {
    backgroundColor: "#D1FAE5",
    borderRadius: 10,
    padding: 12,
    marginTop: 2,
  },
  exportSummaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#065F46",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  exportSummaryItem: {
    flexDirection: "row",
    marginBottom: 3,
  },
  exportSummaryLabel: {
    fontSize: 12,
    color: "#047857",
    fontWeight: "500",
  },
  exportSummaryValue: {
    fontSize: 12,
    color: "#065F46",
    marginLeft: 4,
    fontWeight: "600",
  },
  exportModalFooter: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 26 : 18,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 10,
    backgroundColor: "#fff",
  },
  exportCancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  exportCancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  exportConfirmButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#10B981",
    elevation: 3,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    gap: 6,
    minHeight: 48,
  },
  exportConfirmButtonDisabled: {
    backgroundColor: "#9CA3AF",
    elevation: 0,
    shadowOpacity: 0,
  },
  exportConfirmButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
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
  
  // Animation values for header elements
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  
  // Tab bar visibility with auto-hide on scroll
  const { onScroll, scrollEventThrottle, tabBarHeight, tabBarVisible } = useAutoHideTabBarOnScroll({
    threshold: 16,
    overscrollMargin: 50,
  });
  
  // Pass task modal state
  const [passTaskModalVisible, setPassTaskModalVisible] = useState(false);
  const [taskToPass, setTaskToPass] = useState<Task | null>(null);
  const [passTaskData, setPassTaskData] = useState({
    assignee: "",
    reason: "",
  });
  
  // Status dropdown state
  const [statusDropdownTaskId, setStatusDropdownTaskId] = useState<string | null>(null);
  
  // View mode state
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [exportDateRange, setExportDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [exportUserFilter, setExportUserFilter] = useState<'all' | string>('all');
  const [customDateStart, setCustomDateStart] = useState<Date>(new Date());
  const [customDateEnd, setCustomDateEnd] = useState<Date>(new Date());
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<'start' | 'end' | null>(null);
  const [dateRangeDropdownOpen, setDateRangeDropdownOpen] = useState(false);
  const [userFilterDropdownOpen, setUserFilterDropdownOpen] = useState(false);
  
  // Animation values for form elements
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

  // State for employees from backend
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
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // ✅ Toast / Alert message (Expo-safe)
  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Task Manager", message);
    }
  };

  // Keyboard listeners for adjusting UI when keyboard appears/disappears
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Form field validation
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    let isValid = true;
    
    if (!newTask.title.trim()) {
      errors.title = "Title is required";
      isValid = false;
    }
    
    if (!newTask.description.trim()) {
      errors.description = "Description is required";
      isValid = false;
    }
    
    if (!newTask.deadline) {
      errors.deadline = "Please select a deadline";
      isValid = false;
    }
    
    if (!newTask.assignedTo) {
      errors.assignedTo = "Please assign to someone";
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  };

  // Calculate form completion progress
  const calculateProgress = () => {
    const fields = ['title', 'description', 'deadline', 'assignedTo', 'department', 'employeeId'];
    const filledFields = fields.filter(field => !!newTask[field as keyof typeof newTask]);
    const progress = filledFields.length / fields.length;
    setFormProgress(progress);
  };

  // Update form field with animation
  const updateField = (field: string, value: string) => {
    setNewTask(prev => ({ ...prev, [field]: value }));
    setTimeout(() => calculateProgress(), 100);
  };

  // Animate form elements when modal opens
  const animateFormElements = () => {
    // Reset animations
    formScaleY.setValue(0.9);
    formOpacity.setValue(0);
    titleInputAnim.setValue(0);
    descInputAnim.setValue(0);
    priorityInputAnim.setValue(0);
    deadlineInputAnim.setValue(0);
    assignInputAnim.setValue(0);
    deptInputAnim.setValue(0);
    
    // Start animations in sequence
    Animated.sequence([
      // First animate the modal container
      Animated.parallel([
        Animated.timing(formScaleY, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.7)),
        }),
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Then animate each form field in sequence
      Animated.stagger(50, [
        Animated.timing(titleInputAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(descInputAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(priorityInputAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(deadlineInputAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(assignInputAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(deptInputAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
    ]).start();
  };

  // ✅ Load Tasks from backend
  const loadTasks = async () => {
    try {
      console.log("📥 Loading tasks from backend...");
      const backendTasks = await apiService.getMyTasks();
      
      console.log("📊 Raw backend tasks:", backendTasks);
      console.log("👥 Available employees:", employees.length);
      
      // Get fresh employee list if needed
      let employeeList = employees;
      if (employees.length === 0) {
        console.log("⚠️ No employees in state, fetching...");
        const freshEmployees = await apiService.getEmployees();
        const transformedEmployees = freshEmployees.map((emp: any) => ({
          id: emp.user_id?.toString() || emp.id,
          name: emp.name,
          email: emp.email,
          employee_id: emp.employee_id,
          department: emp.department,
          role: emp.role || emp.department,
          user_id: emp.user_id,
        }));
        employeeList = transformedEmployees;
        setEmployees(transformedEmployees);
        console.log(`✅ Fetched ${transformedEmployees.length} employees`);
      }
      
      console.log("👥 Employee list for mapping:", employeeList.map(e => ({
        user_id: e.user_id,
        name: e.name,
        role: e.role,
        department: e.department
      })));
      
      // Transform backend tasks to frontend format
      const transformedTasks: Task[] = backendTasks.map((task: any) => {
        console.log(`🔍 Processing task ${task.task_id}:`, {
          title: task.title,
          assigned_to: task.assigned_to,
          assigned_by: task.assigned_by,
        });
        
        // Find assigned to employee name
        const assignedToEmployee = employeeList.find(emp => emp.user_id === task.assigned_to);
        console.log(`👤 Assigned To (ID: ${task.assigned_to}):`, assignedToEmployee ? {
          name: assignedToEmployee.name,
          email: assignedToEmployee.email
        } : 'NOT FOUND');
        
        // Find assigned by employee name
        const assignedByEmployee = employeeList.find(emp => emp.user_id === task.assigned_by);
        console.log(`👤 Assigned By (ID: ${task.assigned_by}):`, assignedByEmployee ? {
          name: assignedByEmployee.name,
          role: assignedByEmployee.role,
          department: assignedByEmployee.department
        } : 'NOT FOUND');
        
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
          assigned_by: task.assigned_by, // Store the creator's user ID
        };
      });
      
      setTasks(transformedTasks);
      console.log(`✅ Loaded ${transformedTasks.length} tasks with employee names`);
      console.log("📋 Sample task:", transformedTasks[0]);
    } catch (error) {
      console.error("❌ Error loading tasks:", error);
      showToast("Failed to load tasks");
    }
  };

  // Map backend status to frontend status
  const mapBackendStatus = (backendStatus: string): Task["status"] => {
    const statusMap: { [key: string]: Task["status"] } = {
      "Pending": "todo",
      "In Progress": "in-progress",
      "Completed": "completed",
      "Cancelled": "cancelled",
    };
    return statusMap[backendStatus] || "todo";
  };

  // Map frontend status to backend status
  const mapFrontendStatus = (frontendStatus: Task["status"]): string => {
    const statusMap: { [key: string]: string } = {
      "todo": "Pending",
      "in-progress": "In Progress",
      "review": "In Progress",
      "completed": "Completed",
      "cancelled": "Cancelled",
    };
    return statusMap[frontendStatus] || "Pending";
  };

  // Load employees from backend
  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      console.log("📥 Loading employees from backend...");
      const backendEmployees = await apiService.getEmployees();
      
      // Transform to dropdown format with all needed fields
      const transformedEmployees = backendEmployees.map((emp: any) => ({
        id: emp.user_id?.toString() || emp.id,
        name: emp.name,
        email: emp.email,
        employee_id: emp.employee_id,
        department: emp.department,
        role: emp.role || emp.department,
        user_id: emp.user_id,
      }));
      
      setEmployees(transformedEmployees);
      console.log(`✅ Loaded ${transformedEmployees.length} employees`);
    } catch (error) {
      console.error("❌ Error loading employees:", error);
      showToast("Failed to load employees");
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Handle employee selection and auto-fill department and employee ID
  const handleEmployeeSelect = (email: string) => {
    updateField('assignedTo', email);
    
    // Find selected employee and auto-fill department and employee ID
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
    // Load employees first, then tasks (so we can map names)
    const loadData = async () => {
      await loadEmployees();
      // Small delay to ensure employees state is updated
      setTimeout(() => {
        loadTasks();
      }, 100);
    };
    
    loadData();
    
    // Animate header elements
    Animated.sequence([
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
      ]),
      Animated.timing(statsOpacity, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Reload tasks when employees list changes
  useEffect(() => {
    if (employees.length > 0 && tasks.length > 0) {
      console.log("🔄 Employees loaded, reloading tasks to map names...");
      loadTasks();
    }
  }, [employees.length]);

  // ✅ Refresh tasks after changes
  const refreshTasks = async () => {
    await loadTasks();
  };

  // Handle modal visibility with animations
  const openTaskModal = () => {
    setModalVisible(true);
    setTimeout(() => {
      animateFormElements();
      setFormProgress(0);
      setFormErrors({});
      // Hide tab bar when form is open
      if (Platform.OS === 'ios') {
        setStatusBarStyle('light');
      }
    }, 100);
  };

  // Handle closing the form
  const closeTaskForm = () => {
    Keyboard.dismiss();
    setModalVisible(false);
    setNewTask({ title: "", description: "", priority: "medium", deadline: "", assignedTo: "", department: "", employeeId: "" });
    setShowDatePicker(false);
    // Reset status bar
    if (Platform.OS === 'ios') {
      setStatusBarStyle('dark');
    }
  };

  // Handle opening pass task modal
  const openPassTaskModal = (task: Task) => {
    console.log("🔵 Opening Pass Task Modal for task:", task.title);
    setTaskToPass(task);
    setPassTaskData({ assignee: "", reason: "" });
    setPassTaskModalVisible(true);
    console.log("✅ Pass Task Modal state set to true");
  };

  // Handle closing pass task modal
  const closePassTaskModal = () => {
    setPassTaskModalVisible(false);
    setTaskToPass(null);
    setPassTaskData({ assignee: "", reason: "" });
  };

  // Handle passing task to another user
  const handlePassTask = async () => {
    if (!taskToPass) return;
    
    if (!passTaskData.assignee) {
      showToast("Please select an assignee");
      return;
    }
    
    if (!passTaskData.reason.trim()) {
      showToast("Please provide a reason for passing the task");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Find the selected employee to get their user_id
      const selectedEmployee = employees.find(emp => emp.email === passTaskData.assignee);
      if (!selectedEmployee || !selectedEmployee.user_id) {
        throw new Error("Selected employee not found or missing user ID");
      }
      
      // Update task with new assignee
      await apiService.updateTaskStatus(parseInt(taskToPass.id), {
        status: "Pending", // Reset to pending when passed
        resume_reason: `Task passed to ${selectedEmployee.name}. Reason: ${passTaskData.reason}`,
      });
      
      showToast("✅ Task passed successfully");
      closePassTaskModal();
      await refreshTasks();
    } catch (error: any) {
      console.error("❌ Error passing task:", error);
      showToast(error.message || "Failed to pass task");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle date selection
  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      // Format date as YYYY-MM-DD for backend
      const formattedDate = date.toISOString().split('T')[0];
      updateField('deadline', formattedDate);
    }
  };

  // Show date picker
  const handleDatePickerPress = () => {
    Keyboard.dismiss();
    setShowDatePicker(true);
  };

  // Open task detail modal
  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setActiveDetailTab("details");
    setTaskDetailModalVisible(true);
  };

  // Close task detail modal
  const closeTaskDetail = () => {
    setTaskDetailModalVisible(false);
    setSelectedTask(null);
  };

  // ✅ Create new task with backend integration
  const createTask = async () => {
    Keyboard.dismiss();
    
    // Validate form
    if (!validateForm()) {
      // Animate button to indicate error
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      return;
    }

    // Show loading state
    setIsSubmitting(true);

    try {
      // Find the selected employee to get their user_id
      const selectedEmployee = employees.find(emp => emp.email === newTask.assignedTo);
      if (!selectedEmployee || !selectedEmployee.user_id) {
        throw new Error("Selected employee not found or missing user ID");
      }

      // Get current user's ID (assigned_by)
      // Try user_id first, fallback to parsing id if needed
      let currentUserId = user?.user_id;
      if (!currentUserId && user?.id) {
        // Try to parse id as number if user_id is not set
        currentUserId = parseInt(user.id);
      }
      
      if (!currentUserId || isNaN(currentUserId)) {
        console.error("❌ User data:", user);
        throw new Error("Current user ID not found. Please log out and log in again.");
      }
      
      console.log("✅ Current user ID:", currentUserId);

      // Map priority to backend format
      const priorityMap: { [key: string]: "Low" | "Medium" | "High" | "Urgent" } = {
        "low": "Low",
        "medium": "Medium",
        "high": "High",
        "urgent": "Urgent",
      };

      const taskData = {
        title: newTask.title,
        description: newTask.description,
        due_date: newTask.deadline,
        priority: priorityMap[newTask.priority],
        assigned_to: selectedEmployee.user_id,
        assigned_by: currentUserId,
      };

      console.log("📤 Creating task:", taskData);
      await apiService.createTask(taskData);

      // Success animation
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      showToast("✅ Task created successfully");
      setNewTask({ title: "", description: "", priority: "medium", deadline: "", assignedTo: "", department: "", employeeId: "" });
      
      // Refresh tasks from backend
      await refreshTasks();
      
      // Delay closing modal for better UX
      setTimeout(() => {
        setModalVisible(false);
        setIsSubmitting(false);
      }, 500);
    } catch (error: any) {
      console.error("❌ Error creating task:", error);
      setIsSubmitting(false);
      showToast(error.message || "Failed to create task. Please try again.");
    }
  };

  // ✅ Update task status with backend integration
  const updateTaskStatus = async (id: string, newStatus: Task["status"]) => {
    try {
      const backendStatus = mapFrontendStatus(newStatus);
      
      console.log("📤 Updating task status:", { id, newStatus, backendStatus });
      
      await apiService.updateTaskStatus(parseInt(id), {
        status: backendStatus as any,
      });
      
      // Refresh tasks from backend
      await refreshTasks();
      
      showToast(`Status updated → ${formatStatusLabel(newStatus)}`);
    } catch (error: any) {
      console.error("❌ Error updating task status:", error);
      showToast(error.message || "Failed to update task status");
    }
  };

  // ✅ Delete task with backend integration
  const deleteTask = async (id: string) => {
    try {
      Alert.alert(
        "Delete Task",
        "Are you sure you want to delete this task?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                console.log("🗑️ Deleting task:", id);
                await apiService.deleteTask(parseInt(id));
                
                // Refresh tasks from backend
                await refreshTasks();
                
                showToast("✅ Task deleted successfully");
              } catch (error: any) {
                console.error("❌ Error deleting task:", error);
                showToast(error.message || "Failed to delete task");
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("❌ Error deleting task:", error);
      showToast(error.message || "Failed to delete task");
    }
  };

  // ✅ Filtered tasks
  const filteredTasks = tasks.filter(
    (t) =>
      (filter === "all" || t.status === filter) &&
      (t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ✅ Priority color
  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "low":
        return "#16a34a";
      case "medium":
        return "#eab308";
      case "high":
        return "#f97316";
      case "urgent":
        return "#dc2626";
      default:
        return "#6b7280";
    }
  };

  // Calculate task stats
  const totalTasks = tasks.length;
  const todoCount = tasks.filter(t => t.status === "todo").length;
  const inProgressCount = tasks.filter(t => t.status === "in-progress").length;
  const completedCount = tasks.filter(t => t.status === "completed").length;
  const overdueCount = tasks.filter((t) => {
    if (!t.deadline) return false;
    const deadlineDate = new Date(t.deadline);
    const today = new Date();
    return deadlineDate < today && t.status !== "completed";
  }).length;

  const taskStatCards = [
    {
      label: "Total Tasks",
      value: totalTasks,
      icon: "list",
      colors: ["#4F46E5", "#7C3AED"] as const,
    },
    {
      label: "In Progress",
      value: inProgressCount,
      icon: "time",
      colors: ["#0EA5E9", "#2563EB"] as const,
    },
    {
      label: "Completed",
      value: completedCount,
      icon: "checkmark-circle",
      colors: ["#10B981", "#059669"] as const,
    },
    {
      label: "Overdue",
      value: overdueCount,
      icon: "alert-circle",
      colors: ["#F43F5E", "#EF4444"] as const,
    },
  ];

  const statusFilterOptions: { label: string; value: "all" | Task["status"] }[] = [
    { label: "All Status", value: "all" },
    { label: "To Do", value: "todo" },
    { label: "In Progress", value: "in-progress" },
    { label: "Review", value: "review" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const formatStatusLabel = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return "To Do";
      case "in-progress":
        return "In Progress";
      case "review":
        return "Review";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const cycleTaskStatus = (current: Task["status"]) => {
    const order: Task["status"][] = ["todo", "in-progress", "review", "completed", "cancelled"];
    const currentIndex = order.indexOf(current);
    const nextIndex = (currentIndex + 1) % order.length;
    return order[nextIndex];
  };

  // Get filtered tasks for export based on date range and user filter
  const getExportFilteredTasks = () => {
    let tasksToExport = [...filteredTasks];
    
    // Apply date range filter
    if (exportDateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      tasksToExport = tasksToExport.filter(task => {
        const taskDate = new Date(task.createdAt);
        
        switch (exportDateRange) {
          case 'today':
            return taskDate >= today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return taskDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return taskDate >= monthAgo;
          case 'custom':
            return taskDate >= customDateStart && taskDate <= customDateEnd;
          default:
            return true;
        }
      });
    }
    
    // Apply user filter
    if (exportUserFilter !== 'all') {
      tasksToExport = tasksToExport.filter(task => 
        task.assignedTo.includes(exportUserFilter)
      );
    }
    
    return tasksToExport;
  };

  // Export tasks to CSV
  const exportTasksToCSV = async () => {
    try {
      setIsExporting(true);
      
      console.log("📤 Starting CSV export...");
      console.log("FileSystem available:", !!FileSystem);
      
      const tasksToExport = getExportFilteredTasks();
      console.log(`📊 Exporting ${tasksToExport.length} tasks`);

      // Prepare CSV content
      const headers = ["Task ID", "Title", "Description", "Priority", "Status", "Assigned To", "Deadline", "Created At"];
      const csvRows = [headers.join(",")];

      tasksToExport.forEach(task => {
        const row = [
          task.id,
          `"${task.title.replace(/"/g, '""')}"`, // Escape quotes
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

      // Try FileSystem approach first (if available)
      if (FileSystem && (FileSystem as any).documentDirectory) {
        try {
          console.log("✅ Using FileSystem approach");
          const directory = (FileSystem as any).documentDirectory;
          console.log("📁 Directory:", directory);
          
          // Create file path
          const fileName = `tasks_export_${new Date().toISOString().split('T')[0]}.csv`;
          const fileUri = `${directory}${fileName}`;
          
          console.log(`💾 Writing to: ${fileUri}`);

          // Write to file
          await (FileSystem as any).writeAsStringAsync(fileUri, csvContent, {
            encoding: (FileSystem as any).EncodingType?.UTF8,
          });

          console.log("✅ File written successfully");

          // Check if Sharing is available
          if (Sharing && typeof Sharing.isAvailableAsync === 'function') {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              // Share the file
              await Sharing.shareAsync(fileUri, {
                mimeType: 'text/csv',
                dialogTitle: 'Export Tasks',
                UTI: 'public.comma-separated-values-text',
              });
              console.log("✅ Share dialog opened");
              showToast(`✅ Exported ${tasksToExport.length} tasks`);
              setExportModalVisible(false);
              return;
            }
          }
        } catch (fsError) {
          console.error("FileSystem approach failed:", fsError);
        }
      }

      // Fallback to React Native Share API with text content
      console.log("📱 Using fallback Share API");
      console.log("Share API available:", typeof Share?.share);
      
      if (!Share || typeof Share.share !== 'function') {
        console.error("❌ Share API not available");
        showToast("Export not available. Please restart the app.");
        return;
      }

      try {
        const result = await Share.share({
          message: csvContent,
          title: `Task Export - ${new Date().toLocaleDateString()}`,
        });

        console.log("Share result:", result);

        if (result.action === Share.sharedAction) {
          if (result.activityType) {
            console.log("Shared with activity:", result.activityType);
          }
          showToast(`✅ Exported ${tasksToExport.length} tasks`);
          setExportModalVisible(false);
        } else if (result.action === Share.dismissedAction) {
          console.log("Share dismissed");
          showToast("Export cancelled");
        }
      } catch (shareError: any) {
        console.error("Share API failed:", shareError);
        console.error("Share error details:", {
          message: shareError.message,
          name: shareError.name,
          stack: shareError.stack
        });
        // Last resort: show content in alert
        Alert.alert(
          "Export Data",
          "Copy this CSV content:",
          [
            { text: "OK", onPress: () => console.log("CSV Content:", csvContent) }
          ]
        );
        showToast("CSV content logged to console");
      }

    } catch (error: any) {
      console.error("❌ Error exporting tasks:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      showToast(`Failed to export: ${error.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Export tasks to PDF (HTML-based)
  const exportTasksToPDF = async () => {
    try {
      setIsExporting(true);
      
      console.log("📤 Starting PDF/HTML export...");
      console.log("FileSystem available:", !!FileSystem);
      
      const tasksToExport = getExportFilteredTasks();
      console.log(`📊 Exporting ${tasksToExport.length} tasks as HTML report`);
      
      // Create HTML content for PDF
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      padding: 40px;
      background: #fff;
      color: #111827;
    }
    .header {
      border-bottom: 3px solid #10B981;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 32px;
      color: #111827;
      margin-bottom: 8px;
    }
    .header .subtitle {
      font-size: 14px;
      color: #6B7280;
    }
    .meta-info {
      background: #F3F4F6;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .meta-info .row {
      display: flex;
      margin-bottom: 8px;
    }
    .meta-info .label {
      font-weight: 600;
      color: #374151;
      min-width: 120px;
    }
    .meta-info .value {
      color: #6B7280;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #F9FAFB;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #10B981;
    }
    .stat-card .label {
      font-size: 12px;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .stat-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #111827;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    thead {
      background: #F9FAFB;
    }
    th {
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #E5E7EB;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #F3F4F6;
      font-size: 14px;
      color: #374151;
    }
    tr:hover {
      background: #F9FAFB;
    }
    .priority {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      text-transform: capitalize;
    }
    .priority-low { background: #16a34a; }
    .priority-medium { background: #eab308; }
    .priority-high { background: #f97316; }
    .priority-urgent { background: #dc2626; }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
    }
    .status-todo { background: #9CA3AF; }
    .status-in-progress { background: #3B82F6; }
    .status-review { background: #8B5CF6; }
    .status-completed { background: #10B981; }
    .status-cancelled { background: #EF4444; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      font-size: 12px;
      color: #9CA3AF;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Task Report</h1>
    <div class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}</div>
  </div>

  <div class="meta-info">
    <div class="row">
      <div class="label">Date Range:</div>
      <div class="value">${getDateRangeLabel()}</div>
    </div>
    <div class="row">
      <div class="label">User Filter:</div>
      <div class="value">${getUserFilterLabel()}</div>
    </div>
    <div class="row">
      <div class="label">Total Tasks:</div>
      <div class="value">${tasksToExport.length}</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="label">Total</div>
      <div class="value">${tasksToExport.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">Completed</div>
      <div class="value">${tasksToExport.filter(t => t.status === 'completed').length}</div>
    </div>
    <div class="stat-card">
      <div class="label">In Progress</div>
      <div class="value">${tasksToExport.filter(t => t.status === 'in-progress').length}</div>
    </div>
    <div class="stat-card">
      <div class="label">Pending</div>
      <div class="value">${tasksToExport.filter(t => t.status === 'todo').length}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Title</th>
        <th>Priority</th>
        <th>Status</th>
        <th>Assigned To</th>
        <th>Deadline</th>
      </tr>
    </thead>
    <tbody>
      ${tasksToExport.map(task => `
        <tr>
          <td>#${task.id}</td>
          <td><strong>${task.title}</strong><br><small style="color: #9CA3AF;">${task.description}</small></td>
          <td><span class="priority priority-${task.priority}">${task.priority}</span></td>
          <td><span class="status status-${task.status}">${formatStatusLabel(task.status)}</span></td>
          <td>${task.assignedTo.length > 0 ? task.assignedTo[0] : 'Unassigned'}</td>
          <td>${task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Task Management System • Generated by Task Manager App</p>
  </div>
</body>
</html>
      `;

      // Create a simplified text version for sharing
      const textReport = `
TASK REPORT
Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Date Range: ${getDateRangeLabel()}
User Filter: ${getUserFilterLabel()}
Total Tasks: ${tasksToExport.length}

TASKS:
${tasksToExport.map((task, index) => `
${index + 1}. ${task.title}
   ID: #${task.id}
   Description: ${task.description}
   Priority: ${task.priority}
   Status: ${formatStatusLabel(task.status)}
   Assigned To: ${task.assignedTo.length > 0 ? task.assignedTo[0] : 'Unassigned'}
   Deadline: ${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'Not set'}
`).join('\n')}
      `.trim();

      // Try FileSystem approach first (if available)
      if (FileSystem && (FileSystem as any).documentDirectory) {
        try {
          console.log("✅ Using FileSystem approach");
          const directory = (FileSystem as any).documentDirectory;
          console.log("📁 Directory:", directory);
          
          // Create file path
          const fileName = `task_report_${new Date().toISOString().split('T')[0]}.html`;
          const fileUri = `${directory}${fileName}`;
          
          console.log(`💾 Writing HTML to: ${fileUri}`);

          // Write to file
          await (FileSystem as any).writeAsStringAsync(fileUri, htmlContent, {
            encoding: (FileSystem as any).EncodingType?.UTF8,
          });

          console.log("✅ HTML file written successfully");

          // Check if Sharing is available
          if (Sharing && typeof Sharing.isAvailableAsync === 'function') {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              // Share the file
              await Sharing.shareAsync(fileUri, {
                mimeType: 'text/html',
                dialogTitle: 'Export Task Report',
                UTI: 'public.html',
              });
              console.log("✅ Share dialog opened");
              showToast(`✅ Exported ${tasksToExport.length} tasks as HTML report`);
              setExportModalVisible(false);
              return;
            }
          }
        } catch (fsError) {
          console.error("FileSystem approach failed:", fsError);
        }
      }

      // Fallback to React Native Share API
      console.log("📱 Using fallback Share API");
      console.log("Share API available:", typeof Share?.share);
      
      if (!Share || typeof Share.share !== 'function') {
        console.error("❌ Share API not available");
        showToast("Export not available. Please restart the app.");
        return;
      }

      try {
        const result = await Share.share({
          message: textReport,
          title: `Task Report - ${new Date().toLocaleDateString()}`,
        });

        console.log("Share result:", result);

        if (result.action === Share.sharedAction) {
          if (result.activityType) {
            console.log("Shared with activity:", result.activityType);
          }
          showToast(`✅ Exported ${tasksToExport.length} tasks`);
          setExportModalVisible(false);
        } else if (result.action === Share.dismissedAction) {
          console.log("Share dismissed");
          showToast("Export cancelled");
        }
      } catch (shareError: any) {
        console.error("Share API failed:", shareError);
        console.error("Share error details:", {
          message: shareError.message,
          name: shareError.name,
          stack: shareError.stack
        });
        // Last resort: show content in alert
        Alert.alert(
          "Export Report",
          "Report generated. Check console for content.",
          [
            { text: "OK", onPress: () => console.log("Report Content:", textReport) }
          ]
        );
        showToast("Report content logged to console");
      }

    } catch (error: any) {
      console.error("❌ Error exporting to PDF:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      showToast(`Failed to export: ${error.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle export button click
  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportTasksToCSV();
    } else {
      exportTasksToPDF();
    }
  };

  // Open export modal
  const openExportModal = () => {
    setExportModalVisible(true);
    setDateRangeDropdownOpen(false);
    setUserFilterDropdownOpen(false);
  };

  // Close export modal
  const closeExportModal = () => {
    setExportModalVisible(false);
    setDateRangeDropdownOpen(false);
    setUserFilterDropdownOpen(false);
  };

  // Get date range label
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

  // Get user filter label
  const getUserFilterLabel = () => {
    if (exportUserFilter === 'all') return 'All Users';
    const employee = employees.find(emp => emp.email === exportUserFilter);
    return employee ? employee.name : exportUserFilter;
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return "#9CA3AF";
      case "in-progress":
        return "#3B82F6";
      case "review":
        return "#8B5CF6";
      case "completed":
        return "#10B981";
      case "cancelled":
        return "#EF4444";
      default:
        return "#6b7280";
    }
  };
  
  const activeStatusOption = statusFilterOptions.find((opt) => opt.value === filter);

  const toggleStatusDropdown = () => setStatusDropdownOpen((prev) => !prev);

  const handleStatusSelect = (value: "all" | Task["status"]) => {
    setFilter(value);
    setStatusDropdownOpen(false);
  };

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
            <Text style={styles.headerTitle}>Task Management</Text>
            <Text style={styles.headerSubtitle}>Organize and track your team's tasks</Text>
          </Animated.View>
        </View>
        
        {/* Stats Cards */}
        <Animated.View style={[styles.statsRow, { opacity: statsOpacity }]}>
          {taskStatCards.map((card, index) => (
            <LinearGradient
              key={index}
              colors={card.colors}
              style={styles.statsCard}
            >
              <Text style={styles.cardLabel}>{card.label}</Text>
              <Text style={styles.cardValue}>{card.value}</Text>
              <Ionicons name={card.icon as any} size={24} color="#fff" style={styles.statsIcon} />
            </LinearGradient>
          ))}
        </Animated.View>
      </View>
      
      <View style={styles.contentContainer}>
        {/* Task Management Header */}
        <View style={styles.taskHeader}>
          <View style={styles.taskHeaderLeft}>
            <View style={styles.taskHeaderIcon}>
              <Ionicons name="briefcase" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.taskHeaderTitle}>Task Management</Text>
          </View>
          <View style={styles.taskHeaderRight}>
            <TouchableOpacity 
              style={styles.viewModeButton}
              onPress={openExportModal}
              disabled={filteredTasks.length === 0}
            >
              <Ionicons name="download" size={20} color={filteredTasks.length === 0 ? "#D1D5DB" : "#8B5CF6"} />
            </TouchableOpacity>
            <View style={styles.viewToggleContainer}>
              <TouchableOpacity 
                style={[styles.viewToggleButton, viewMode === 'card' && styles.viewToggleButtonActive]}
                onPress={() => setViewMode('card')}
              >
                <Ionicons name="grid" size={18} color={viewMode === 'card' ? "#fff" : "#6B7280"} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewToggleButton, viewMode === 'table' && styles.viewToggleButtonActive]}
                onPress={() => setViewMode('table')}
              >
                <Ionicons name="list" size={18} color={viewMode === 'table' ? "#fff" : "#6B7280"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Search and Filter Row */}
        <View style={styles.searchFilterRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tasks..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.statusDropdownWrapper}>
            <TouchableOpacity
              style={styles.statusDropdownTrigger}
              activeOpacity={0.7}
              onPress={toggleStatusDropdown}
            >
              <Text style={styles.statusDropdownText}>{activeStatusOption?.label ?? "All Status"}</Text>
              <Ionicons
                name={statusDropdownOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color="#9CA3AF"
              />
            </TouchableOpacity>
            {statusDropdownOpen && (
              <ScrollView 
                style={styles.statusDropdownList}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={false}
              >
                {statusFilterOptions.map((option, index) => {
                  const isActive = option.value === filter;
                  const statusColor = option.value === "all" ? "#6B7280" : getStatusColor(option.value as Task["status"]);
                  
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.statusDropdownOption, 
                        isActive && styles.statusDropdownOptionActive,
                        index === statusFilterOptions.length - 1 && { borderBottomWidth: 0 }
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleStatusSelect(option.value)}
                    >
                      {/* Status Dot */}
                      <View style={[styles.statusDot, { backgroundColor: statusColor, width: 8, height: 8, borderRadius: 4, marginRight: 8 }]} />
                      <Text
                        style={[
                          styles.statusDropdownOptionText,
                          isActive && styles.statusDropdownOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {/* Checkmark for active */}
                      {isActive && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color="#10B981"
                          style={styles.statusDropdownOptionCheck}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Backdrop for status dropdown */}
        {statusDropdownTaskId && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onPress={() => setStatusDropdownTaskId(null)}
            activeOpacity={1}
          />
        )}

        {/* Card View */}
        {viewMode === 'card' ? (
          <ScrollView 
            style={styles.cardViewContainer}
            onScroll={onScroll}
            scrollEventThrottle={scrollEventThrottle}
            showsVerticalScrollIndicator={false}
          >
            {filteredTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="clipboard-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No tasks found</Text>
                <Text style={styles.emptyStateSubtext}>Create a new task to get started</Text>
              </View>
            ) : (
              filteredTasks.map((item, index) => (
                <View 
                  key={item.id} 
                  style={[
                    styles.taskCardWrapper,
                    statusDropdownTaskId === item.id && { zIndex: 1000 + index }
                  ]}
                >
                  {/* Card Header */}
                  <View style={styles.taskCardHeader}>
                    <View style={styles.taskCardHeaderLeft}>
                      <Text style={styles.taskCardTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.taskCardDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                      <View style={styles.taskCardMetaRow}>
                        <View style={styles.taskCardMetaItem}>
                          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                          <Text style={styles.taskCardMetaText}>
                            {item.deadline 
                              ? new Date(item.deadline).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric'
                                })
                              : "No deadline"
                            }
                          </Text>
                        </View>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority), paddingHorizontal: 10, paddingVertical: 4 }]}>
                          <Text style={[styles.priorityText, { fontSize: 10 }]}>{item.priority}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={[
                      styles.statusDropdownContainer,
                      statusDropdownTaskId === item.id && { zIndex: 2000 }
                    ]}>
                      <TouchableOpacity 
                        style={[
                          styles.statusBadge, 
                          { 
                            backgroundColor: getStatusColor(item.status), 
                            minWidth: 110,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                          }
                        ]}
                        onPress={() => setStatusDropdownTaskId(statusDropdownTaskId === item.id ? null : item.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.statusIndicator} />
                        <Text style={[styles.statusText, { fontSize: 11 }]} numberOfLines={1}>
                          {formatStatusLabel(item.status)}
                        </Text>
                        <Ionicons 
                          name={statusDropdownTaskId === item.id ? "chevron-up" : "chevron-down"} 
                          size={12} 
                          color="#fff" 
                          style={{ marginLeft: 4 }} 
                        />
                      </TouchableOpacity>
                      
                      {/* Status Dropdown Menu */}
                      {statusDropdownTaskId === item.id && (
                        <View style={[
                          styles.statusDropdownMenu,
                          { 
                            right: 0,
                            minWidth: 180,
                          }
                        ]}>
                          {[
                            { value: 'todo', label: 'To Do', color: '#9CA3AF', icon: 'ellipse-outline' },
                            { value: 'in-progress', label: 'In Progress', color: '#3B82F6', icon: 'time-outline' },
                            { value: 'review', label: 'Review', color: '#8B5CF6', icon: 'eye-outline' },
                            { value: 'completed', label: 'Completed', color: '#10B981', icon: 'checkmark-circle' },
                            { value: 'cancelled', label: 'Cancelled', color: '#EF4444', icon: 'close-circle' },
                          ].map((statusOption, idx) => {
                            const isActive = item.status === statusOption.value;
                            return (
                              <TouchableOpacity
                                key={statusOption.value}
                                style={[
                                  styles.statusDropdownMenuItem,
                                  idx === 4 && styles.statusDropdownMenuItemLast,
                                  isActive && styles.statusDropdownMenuItemActive,
                                ]}
                                onPress={() => {
                                  updateTaskStatus(item.id, statusOption.value as Task["status"]);
                                  setStatusDropdownTaskId(null);
                                }}
                                activeOpacity={0.7}
                              >
                                <View style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: 5,
                                  backgroundColor: statusOption.color,
                                }} />
                                <Text style={[
                                  styles.statusDropdownMenuItemText,
                                  isActive && styles.statusDropdownMenuItemTextActive,
                                ]}>
                                  {statusOption.label}
                                </Text>
                                {isActive && (
                                  <Ionicons name="checkmark" size={18} color={statusOption.color} />
                                )}
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="person-circle" size={16} color="#8B5CF6" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.taskCardInfoValue} numberOfLines={1}>
                              {item.assignedBy || "Unknown"}
                            </Text>
                            <Text style={[styles.taskCardMetaText, { fontSize: 10 }]} numberOfLines={1}>
                              {item.assignedByRole || "N/A"}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.taskCardInfoItem}>
                        <Text style={styles.taskCardInfoLabel}>Assigned To</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="person" size={16} color="#6B7280" />
                          <Text style={styles.taskCardInfoValue} numberOfLines={1}>
                            {item.assignedToName || "Unknown"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Card Footer */}
                  <View style={styles.taskCardFooter}>
                    <View style={styles.taskCardActions}>
                      <TouchableOpacity 
                        style={styles.taskCardActionButton}
                        onPress={() => openTaskDetail(item)}
                      >
                        <Ionicons name="eye-outline" size={16} color="#6B7280" />
                        <Text style={styles.taskCardActionButtonText}>View</Text>
                      </TouchableOpacity>
                      
                      {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager') && (
                        <TouchableOpacity 
                          style={[styles.taskCardActionButton, styles.taskCardPassButton]}
                          onPress={() => openPassTaskModal(item)}
                        >
                          <Ionicons name="git-branch-outline" size={16} color="#8B5CF6" />
                          <Text style={[styles.taskCardActionButtonText, styles.taskCardPassButtonText]}>Pass</Text>
                        </TouchableOpacity>
                      )}
                      
                      {item.assigned_by && user?.user_id && item.assigned_by === user.user_id && (
                        <TouchableOpacity 
                          style={[styles.taskCardActionButton, styles.taskCardDeleteButton]}
                          onPress={() => deleteTask(item.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          <Text style={[styles.taskCardActionButtonText, styles.taskCardDeleteButtonText]}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          /* Table View */
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScrollContainer}
          >
          <View style={styles.tableWrapper}>
            {/* Task Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.taskColumn]}>Task</Text>
              <Text style={[styles.tableHeaderText, styles.assignedByColumn]}>Assigned By</Text>
              <Text style={[styles.tableHeaderText, styles.assignedToColumn]}>Assigned To</Text>
              <Text style={[styles.tableHeaderText, styles.priorityColumn]}>Priority</Text>
              <Text style={[styles.tableHeaderText, styles.deadlineColumn]}>Deadline</Text>
              <Text style={[styles.tableHeaderText, styles.statusColumn]}>Status</Text>
              <Text style={[styles.tableHeaderText, styles.actionsColumn]}>Actions</Text>
            </View>

            {/* Task List */}
            {filteredTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="clipboard-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No tasks found</Text>
                <Text style={styles.emptyStateSubtext}>Create a new task to get started</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.tableContainer}
                onScroll={onScroll}
                scrollEventThrottle={scrollEventThrottle}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {filteredTasks.map((item, index) => (
                  <View key={item.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                    <View style={[styles.tableCell, styles.taskColumn]}>
                      <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.taskDescription} numberOfLines={1}>{item.description}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.assignedByColumn]}>
                      <View style={styles.assignedToContainer}>
                        <Ionicons name="person-circle" size={16} color="#8B5CF6" />
                        <View style={{ marginLeft: 6, flex: 1 }}>
                          <Text style={[styles.assignedToText, { fontWeight: '600', color: '#111827' }]} numberOfLines={1}>
                            {item.assignedBy || "Unknown"}
                          </Text>
                          <Text style={[styles.taskDescription, { fontSize: 10 }]} numberOfLines={1}>
                            {item.assignedByRole || "N/A"}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.tableCell, styles.assignedToColumn]}>
                      <View style={styles.assignedToContainer}>
                        <Ionicons name="person" size={16} color="#6B7280" />
                        <Text style={styles.assignedToText} numberOfLines={1}>
                          {item.assignedToName || item.assignedTo[0] || "Unknown"}
                        </Text>
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
                        <Text style={styles.deadlineText} numberOfLines={1}>
                          {item.deadline 
                            ? new Date(item.deadline).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })
                            : "Not set"
                          }
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.tableCell, styles.statusColumn]}>
                      <View style={{ position: 'relative', zIndex: statusDropdownTaskId === item.id ? 1000 : 1 }}>
                        <TouchableOpacity 
                          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
                          onPress={() => setStatusDropdownTaskId(statusDropdownTaskId === item.id ? null : item.id)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.statusIndicator} />
                          <Text style={styles.statusText} numberOfLines={1}>{formatStatusLabel(item.status)}</Text>
                          <Ionicons 
                            name={statusDropdownTaskId === item.id ? "chevron-up" : "chevron-down"} 
                            size={14} 
                            color="#fff" 
                            style={{ marginLeft: 4 }} 
                          />
                        </TouchableOpacity>
                        
                        {/* Status Dropdown */}
                        {statusDropdownTaskId === item.id && (
                          <View style={{
                            position: 'absolute',
                            top: 38,
                            left: -10,
                            backgroundColor: '#fff',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            shadowColor: '#000',
                            shadowOpacity: 0.15,
                            shadowRadius: 12,
                            shadowOffset: { width: 0, height: 4 },
                            elevation: 10,
                            zIndex: 1001,
                            minWidth: 200,
                            overflow: 'hidden',
                          }}>
                            {[
                              { value: 'todo', label: 'To Do', color: '#9CA3AF', icon: 'ellipse-outline' },
                              { value: 'in-progress', label: 'In Progress', color: '#3B82F6', icon: 'time-outline' },
                              { value: 'review', label: 'Review', color: '#8B5CF6', icon: 'eye-outline' },
                              { value: 'completed', label: 'Completed', color: '#10B981', icon: 'checkmark-circle' },
                              { value: 'cancelled', label: 'Cancelled', color: '#EF4444', icon: 'close-circle' },
                            ].map((statusOption, idx) => {
                              const isActive = item.status === statusOption.value;
                              return (
                                <TouchableOpacity
                                  key={statusOption.value}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: 11,
                                    paddingHorizontal: 14,
                                    borderBottomWidth: idx < 4 ? 1 : 0,
                                    borderBottomColor: '#F3F4F6',
                                    backgroundColor: isActive ? '#F9FAFB' : '#fff',
                                  }}
                                  onPress={() => {
                                    updateTaskStatus(item.id, statusOption.value as Task["status"]);
                                    setStatusDropdownTaskId(null);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <View style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 5,
                                    backgroundColor: statusOption.color,
                                    marginRight: 10,
                                  }} />
                                  <Text style={{
                                    fontSize: 13,
                                    color: isActive ? '#111827' : '#374151',
                                    fontWeight: isActive ? '600' : '500',
                                    flex: 1,
                                  }}>
                                    {statusOption.label}
                                  </Text>
                                  {isActive ? (
                                    <Ionicons name="checkmark" size={18} color={statusOption.color} style={{ marginLeft: 8 }} />
                                  ) : (
                                    <Ionicons name={statusOption.icon as any} size={16} color={statusOption.color} style={{ marginLeft: 8, opacity: 0.6 }} />
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={[styles.tableCell, styles.actionsColumn]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity 
                          style={styles.viewButton}
                          onPress={() => openTaskDetail(item)}
                        >
                          <Text style={styles.viewButtonText}>View</Text>
                          <Ionicons name="chevron-forward" size={14} color="#6B7280" />
                        </TouchableOpacity>
                        {/* Only show Pass button for admin, hr, and manager */}
                        {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager') && (
                          <TouchableOpacity 
                            style={styles.passButton}
                            onPress={() => openPassTaskModal(item)}
                          >
                            <Ionicons name="git-branch-outline" size={16} color="#8B5CF6" />
                            <Text style={styles.passButtonText}>Pass</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          style={styles.editButton}
                          onPress={() => openTaskDetail(item)}
                        >
                          <Ionicons name="create-outline" size={16} color="#6B7280" />
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                        {/* Only show delete button if current user created this task */}
                        {item.assigned_by && user?.user_id && item.assigned_by === user.user_id && (
                          <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={() => deleteTask(item.id)}
                          >
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
      </View>

      {/* ➕ Add Task Button */}
      <FAB
        icon="plus"
        color="white"
        style={[styles.fab, { bottom: tabBarVisible ? tabBarHeight + 16 : 30 }]}
        onPress={openTaskModal}
      />

      {/* 🆕 Full Screen Form for New Task */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.fullScreenFormContainer} edges={['top']}>
          <StatusBar style="light" />
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <Animated.View 
              style={[
                styles.fullScreenCard,
                { 
                  opacity: formOpacity,
                  transform: [{ translateY: formScaleY.interpolate({
                    inputRange: [0.9, 1],
                    outputRange: [50, 0]
                  }) }]
                }
              ]}
            >
            {/* Header with Gradient Background */}
            <LinearGradient
              colors={['#7c3aed', '#6d28d9']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.modalHeader}
            >
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={closeTaskForm}
                activeOpacity={0.7}
              >
                <View style={styles.closeButtonInner}>
                  <Ionicons name="close" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
              
              <View style={styles.modalTitleContainer}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="add-outline" size={24} color="#fff" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Create New Task</Text>
                  <Text style={styles.modalSubtitle}>Assign a new task to team members</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Form Progress Indicator */}
            <View style={styles.progressContainer}>
              <ProgressBar 
                progress={formProgress} 
                color="#7c3aed" 
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>
                {Math.round(formProgress * 100)}% completed
              </Text>
            </View>

            <ScrollView 
              style={styles.formContainer} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Task Title */}
              <Animated.View 
                style={[
                  styles.fieldContainer,
                  { 
                    opacity: titleInputAnim,
                    transform: [{ translateY: titleInputAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })}]
                  }
                ]}
              >
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="document-text" size={18} color="#7c3aed" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>
                    Task Title <Text style={styles.required}>*</Text>
                  </Text>
                </View>
                <View>
                  <TextInput
                    placeholder="Enter task title"
                    style={[styles.input, formErrors.title ? styles.inputError : null]}
                    value={newTask.title}
                    onChangeText={(t) => updateField('title', t)}
                    placeholderTextColor="#9ca3af"
                  />
                  {formErrors.title ? (
                    <Text style={styles.errorText}>{formErrors.title}</Text>
                  ) : null}
                </View>
              </Animated.View>

              {/* Description */}
              <Animated.View 
                style={[
                  styles.fieldContainer,
                  { 
                    opacity: descInputAnim,
                    transform: [{ translateY: descInputAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })}]
                  }
                ]}
              >
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="document-text" size={18} color="#7c3aed" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>
                    Description <Text style={styles.required}>*</Text>
                  </Text>
                </View>
                <View>
                  <TextInput
                    placeholder="Enter task description"
                    style={[styles.input, styles.textArea, formErrors.description ? styles.inputError : null]}
                    value={newTask.description}
                    multiline
                    numberOfLines={4}
                    onChangeText={(t) => updateField('description', t)}
                    placeholderTextColor="#9ca3af"
                  />
                  {formErrors.description ? (
                    <Text style={styles.errorText}>{formErrors.description}</Text>
                  ) : null}
                </View>
              </Animated.View>

              {/* Priority and Deadline Row */}
              <View style={styles.rowContainer}>
                {/* Priority */}
                <Animated.View 
                  style={[
                    styles.fieldContainer, 
                    { flex: 1, marginRight: 8 },
                    { 
                      opacity: priorityInputAnim,
                      transform: [{ translateY: priorityInputAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })}]
                    }
                  ]}
                >
                  <View style={styles.fieldLabelRow}>
                    <Ionicons name="time-outline" size={18} color="#7c3aed" style={styles.fieldIcon} />
                    <Text style={styles.fieldLabel}>Priority</Text>
                  </View>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newTask.priority}
                      onValueChange={(value) => updateField('priority', value)}
                      style={styles.picker}
                      dropdownIconColor="#7c3aed"
                    >
                      <Picker.Item label="Low" value="low" />
                      <Picker.Item label="Medium" value="medium" />
                      <Picker.Item label="High" value="high" />
                      <Picker.Item label="Urgent" value="urgent" />
                    </Picker>
                    <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(newTask.priority) }]} />
                  </View>
                </Animated.View>

                {/* Deadline */}
                <Animated.View 
                  style={[
                    styles.fieldContainer, 
                    { flex: 1, marginLeft: 8 },
                    { 
                      opacity: deadlineInputAnim,
                      transform: [{ translateY: deadlineInputAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })}]
                    }
                  ]}
                >
                  <View style={styles.fieldLabelRow}>
                    <Ionicons name="calendar-outline" size={18} color="#7c3aed" style={styles.fieldIcon} />
                    <Text style={styles.fieldLabel}>
                      Deadline <Text style={styles.required}>*</Text>
                    </Text>
                  </View>
                  <View>
                    <TouchableOpacity 
                      style={[styles.dateInput, formErrors.deadline ? styles.inputError : null]}
                      activeOpacity={0.7}
                      onPress={handleDatePickerPress}
                    >
                      <Text style={[styles.dateInputText, !newTask.deadline && { color: '#9ca3af' }]}>
                        {newTask.deadline 
                          ? new Date(newTask.deadline).toLocaleDateString('en-US', { 
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric'
                            })
                          : 'dd / mm / yyyy'
                        }
                      </Text>
                      <Ionicons name="calendar-outline" size={20} color="#7c3aed" />
                    </TouchableOpacity>
                    {formErrors.deadline ? (
                      <Text style={styles.errorText}>{formErrors.deadline}</Text>
                    ) : null}
                  </View>
                </Animated.View>
              </View>

              {/* Date Picker Modal */}
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date()}
                  textColor="#7c3aed"
                />
              )}

              {/* Assign To */}
              <Animated.View 
                style={[
                  styles.fieldContainer,
                  { 
                    opacity: assignInputAnim,
                    transform: [{ translateY: assignInputAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })}]
                  }
                ]}
              >
                <View style={styles.fieldLabelRow}>
                  <Ionicons name="person-outline" size={18} color="#7c3aed" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>
                    Assign To <Text style={styles.required}>*</Text>
                  </Text>
                </View>
                <View>
                  <View style={[styles.pickerContainer, formErrors.assignedTo ? styles.inputError : null]}>
                    {loadingEmployees ? (
                      <View style={{ padding: 15, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#7c3aed" />
                      </View>
                    ) : (
                      <Picker
                        selectedValue={newTask.assignedTo}
                        onValueChange={handleEmployeeSelect}
                        style={styles.picker}
                        dropdownIconColor="#7c3aed"
                        enabled={!loadingEmployees}
                      >
                        <Picker.Item label="Select employee" value="" />
                        {employees.map((emp) => (
                          <Picker.Item 
                            key={emp.id} 
                            label={`${emp.name} • ${emp.department || 'N/A'} (${emp.employee_id})`} 
                            value={emp.email} 
                          />
                        ))}
                      </Picker>
                    )}
                  </View>
                  {formErrors.assignedTo ? (
                    <Text style={styles.errorText}>{formErrors.assignedTo}</Text>
                  ) : null}
                  {employees.length === 0 && !loadingEmployees && (
                    <Text style={[styles.errorText, { color: '#6b7280' }]}>
                      No employees found. Please add employees first.
                    </Text>
                  )}
                </View>
              </Animated.View>

              {/* Department and Employee ID Row */}
              <View style={styles.rowContainer}>
                {/* Department */}
                <Animated.View 
                  style={[
                    styles.fieldContainer, 
                    { flex: 1, marginRight: 8 },
                    { 
                      opacity: deptInputAnim,
                      transform: [{ translateY: deptInputAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })}]
                    }
                  ]}
                >
                  <View style={styles.fieldLabelRow}>
                    <Ionicons name="business-outline" size={18} color="#7c3aed" style={styles.fieldIcon} />
                    <Text style={styles.fieldLabel}>Department</Text>
                  </View>
                  <TextInput
                    placeholder="Auto-filled"
                    style={[styles.input, { backgroundColor: '#f9fafb', color: '#6b7280' }]}
                    value={newTask.department}
                    editable={false}
                    placeholderTextColor="#9ca3af"
                  />
                </Animated.View>

                {/* Employee ID */}
                <Animated.View 
                  style={[
                    styles.fieldContainer, 
                    { flex: 1, marginLeft: 8 },
                    { 
                      opacity: deptInputAnim,
                      transform: [{ translateY: deptInputAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })}]
                    }
                  ]}
                >
                  <View style={styles.fieldLabelRow}>
                    <Ionicons name="id-card-outline" size={18} color="#7c3aed" style={styles.fieldIcon} />
                    <Text style={styles.fieldLabel}>Employee ID</Text>
                  </View>
                  <TextInput
                    placeholder="Auto-filled"
                    style={[styles.input, { backgroundColor: '#f9fafb', color: '#6b7280' }]}
                    value={newTask.employeeId}
                    editable={false}
                    placeholderTextColor="#9ca3af"
                  />
                </Animated.View>
              </View>
              
              {/* Extra space at bottom for keyboard */}
              {keyboardVisible && <View style={{ height: 100 }} />}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={closeTaskForm}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <Animated.View style={{ flex: 1, transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity 
                  style={[styles.createButton, isSubmitting ? styles.createButtonDisabled : null]}
                  onPress={createTask}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.createButtonText}>Create Task</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>

    {/* Task Detail Modal */}
    <Modal 
      visible={taskDetailModalVisible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={closeTaskDetail}
    >
      <SafeAreaView style={styles.taskDetailContainer}>
        {selectedTask && (
          <>
            {/* Header */}
            <View style={styles.taskDetailHeader}>
              <View style={styles.taskDetailHeaderLeft}>
                <View style={styles.taskDetailIcon}>
                  <Ionicons name="document-text" size={24} color="#8B5CF6" />
                </View>
                <View>
                  <Text style={styles.taskDetailTitle}>{selectedTask.title}</Text>
                  <Text style={styles.taskDetailId}>Task ID: {selectedTask.id}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.taskDetailCloseButton} onPress={closeTaskDetail}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.taskDetailTabs}>
              <TouchableOpacity 
                style={[styles.taskDetailTab, activeDetailTab === "details" && styles.taskDetailTabActive]}
                onPress={() => setActiveDetailTab("details")}
              >
                <Text style={[styles.taskDetailTabText, activeDetailTab === "details" && styles.taskDetailTabTextActive]}>
                  Details
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.taskDetailTab, activeDetailTab === "activity" && styles.taskDetailTabActive]}
                onPress={() => setActiveDetailTab("activity")}
              >
                <Text style={[styles.taskDetailTabText, activeDetailTab === "activity" && styles.taskDetailTabTextActive]}>
                  Activity
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.taskDetailTab, activeDetailTab === "comments" && styles.taskDetailTabActive]}
                onPress={() => setActiveDetailTab("comments")}
              >
                <Text style={[styles.taskDetailTabText, activeDetailTab === "comments" && styles.taskDetailTabTextActive]}>
                  Comments
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.taskDetailContent}>
              {activeDetailTab === "details" && (
                <View style={styles.taskDetailDetailsTab}>
                  {/* Description */}
                  <View style={styles.taskDetailSection}>
                    <View style={styles.taskDetailSectionHeader}>
                      <Ionicons name="document-text" size={20} color="#8B5CF6" />
                      <Text style={styles.taskDetailSectionTitle}>Description</Text>
                    </View>
                    <Text style={styles.taskDetailDescription}>{selectedTask.description}</Text>
                  </View>

                  {/* Details Grid */}
                  <View style={styles.taskDetailGrid}>
                    <View style={styles.taskDetailGridItem}>
                      <View style={styles.taskDetailFieldHeader}>
                        <Ionicons name="person-circle" size={16} color="#8B5CF6" />
                        <Text style={styles.taskDetailFieldLabel}>Assigned By</Text>
                      </View>
                      <Text style={styles.taskDetailFieldValue}>
                        {selectedTask.assignedBy || "Unknown"}
                      </Text>
                      <Text style={[styles.taskDescription, { fontSize: 12, marginTop: 2 }]}>
                        {selectedTask.assignedByRole || "N/A"}
                      </Text>
                    </View>

                    <View style={styles.taskDetailGridItem}>
                      <View style={styles.taskDetailFieldHeader}>
                        <Ionicons name="person" size={16} color="#8B5CF6" />
                        <Text style={styles.taskDetailFieldLabel}>Assigned To</Text>
                      </View>
                      <Text style={styles.taskDetailFieldValue}>
                        {selectedTask.assignedToName || selectedTask.assignedTo[0] || "Unknown"}
                      </Text>
                    </View>

                    <View style={styles.taskDetailGridItem}>
                      <View style={styles.taskDetailFieldHeader}>
                        <Ionicons name="alert-circle" size={16} color="#8B5CF6" />
                        <Text style={styles.taskDetailFieldLabel}>Priority</Text>
                      </View>
                      <View style={[styles.taskDetailPriorityBadge, { backgroundColor: getPriorityColor(selectedTask.priority) }]}>
                        <Text style={styles.taskDetailPriorityText}>{selectedTask.priority}</Text>
                      </View>
                    </View>

                    <View style={styles.taskDetailGridItem}>
                      <View style={styles.taskDetailFieldHeader}>
                        <Ionicons name="calendar" size={16} color="#8B5CF6" />
                        <Text style={styles.taskDetailFieldLabel}>Deadline</Text>
                      </View>
                      <Text style={styles.taskDetailFieldValue}>
                        {selectedTask.deadline 
                          ? new Date(selectedTask.deadline).toLocaleDateString('en-US', { 
                              weekday: 'short',
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })
                          : "Not set"
                        }
                      </Text>
                    </View>

                    <View style={styles.taskDetailGridItem}>
                      <View style={styles.taskDetailFieldHeader}>
                        <Ionicons name="flag" size={16} color="#8B5CF6" />
                        <Text style={styles.taskDetailFieldLabel}>Status</Text>
                      </View>
                      <View style={[styles.taskDetailStatusBadge, { backgroundColor: getStatusColor(selectedTask.status) }]}>
                        <View style={styles.taskDetailStatusIndicator} />
                        <Text style={styles.taskDetailStatusText}>{formatStatusLabel(selectedTask.status)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Tags */}
                  <View style={styles.taskDetailSection}>
                    <View style={styles.taskDetailSectionHeader}>
                      <Ionicons name="pricetag" size={20} color="#8B5CF6" />
                      <Text style={styles.taskDetailSectionTitle}>Tags</Text>
                    </View>
                    <View style={styles.taskDetailTags}>
                      <View style={styles.taskDetailTag}>
                        <Text style={styles.taskDetailTagText}>Documentation</Text>
                      </View>
                      <View style={styles.taskDetailTag}>
                        <Text style={styles.taskDetailTagText}>Project</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {activeDetailTab === "activity" && (
                <View style={styles.taskDetailActivityTab}>
                  <View style={styles.taskDetailActivityItem}>
                    <View style={styles.taskDetailActivityIcon}>
                      <Ionicons name="play-circle" size={24} color="#3B82F6" />
                    </View>
                    <View style={styles.taskDetailActivityContent}>
                      <Text style={styles.taskDetailActivityTitle}>Task Created</Text>
                      <Text style={styles.taskDetailActivityTime}>Nov 18, 2025 10:11</Text>
                    </View>
                  </View>
                  
                  <View style={styles.taskDetailActivityCenter}>
                    <View style={styles.taskDetailActivityCenterIcon}>
                      <Ionicons name="time" size={32} color="#9CA3AF" />
                    </View>
                    <Text style={styles.taskDetailActivityCenterText}>Task is in progress</Text>
                  </View>
                </View>
              )}

              {activeDetailTab === "comments" && (
                <View style={styles.taskDetailCommentsTab}>
                  <View style={styles.taskDetailCommentInput}>
                    <TextInput
                      style={styles.taskDetailCommentTextInput}
                      placeholder="Add a comment..."
                      multiline
                    />
                    <TouchableOpacity style={styles.taskDetailCommentButton}>
                      <Ionicons name="send" size={16} color="#fff" />
                      <Text style={styles.taskDetailCommentButtonText}>Post</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.taskDetailNoComments}>
                    <View style={styles.taskDetailNoCommentsIcon}>
                      <Ionicons name="chatbubble" size={32} color="#C7A2FE" />
                    </View>
                    <Text style={styles.taskDetailNoCommentsTitle}>No comments yet</Text>
                    <Text style={styles.taskDetailNoCommentsSubtitle}>Be the first to comment on this task</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>

      {/* Export Modal */}
      <Modal 
        visible={exportModalVisible} 
        animationType="fade" 
        transparent={true}
        onRequestClose={closeExportModal}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.exportModalOverlay}
          onPress={closeExportModal}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.exportModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.exportModalHeader}>
              <View style={styles.exportModalIcon}>
                <Ionicons name="download" size={28} color="#fff" />
              </View>
              <View style={styles.exportModalHeaderText}>
                <Text style={styles.exportModalTitle}>Export Task Report</Text>
                <Text style={styles.exportModalSubtitle}>Generate and download reports</Text>
              </View>
              <TouchableOpacity 
                style={styles.exportModalCloseButton}
                onPress={closeExportModal}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.exportModalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Export Format */}
              <View style={styles.exportSection}>
                <View style={styles.exportSectionHeader}>
                  <Ionicons name="document" size={18} color="#10B981" style={styles.exportSectionIcon} />
                  <Text style={styles.exportSectionTitle}>Export Format</Text>
                </View>
                <View style={styles.exportFormatButtons}>
                  <TouchableOpacity 
                    style={[
                      styles.exportFormatButton,
                      exportFormat === 'pdf' && styles.exportFormatButtonActive
                    ]}
                    onPress={() => setExportFormat('pdf')}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name="document-text" 
                      size={20} 
                      color={exportFormat === 'pdf' ? "#10B981" : "#6B7280"}
                      style={styles.exportFormatButtonIcon}
                    />
                    <Text style={[
                      styles.exportFormatButtonText,
                      exportFormat === 'pdf' && styles.exportFormatButtonTextActive
                    ]}>
                      PDF Report
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.exportFormatButton,
                      exportFormat === 'csv' && styles.exportFormatButtonActive
                    ]}
                    onPress={() => setExportFormat('csv')}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name="grid" 
                      size={20} 
                      color={exportFormat === 'csv' ? "#10B981" : "#6B7280"}
                      style={styles.exportFormatButtonIcon}
                    />
                    <Text style={[
                      styles.exportFormatButtonText,
                      exportFormat === 'csv' && styles.exportFormatButtonTextActive
                    ]}>
                      CSV Data
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date Range */}
              <View style={styles.exportSection}>
                <View style={styles.exportSectionHeader}>
                  <Ionicons name="calendar" size={18} color="#10B981" style={styles.exportSectionIcon} />
                  <Text style={styles.exportSectionTitle}>Date Range</Text>
                </View>
                <View style={styles.exportDropdown}>
                  <TouchableOpacity 
                    style={styles.exportDropdownTrigger}
                    onPress={() => {
                      setDateRangeDropdownOpen(!dateRangeDropdownOpen);
                      setUserFilterDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.exportDropdownText}>{getDateRangeLabel()}</Text>
                    <Ionicons 
                      name={dateRangeDropdownOpen ? "chevron-up" : "chevron-down"} 
                      size={18} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>
                  {dateRangeDropdownOpen && (
                    <ScrollView 
                      style={styles.exportDropdownList}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                    >
                      {[
                        { label: 'All Time', value: 'all' },
                        { label: 'Today', value: 'today' },
                        { label: 'Last 7 Days', value: 'week' },
                        { label: 'Last 30 Days', value: 'month' },
                      ].map((option, index, array) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.exportDropdownOption,
                            exportDateRange === option.value && { backgroundColor: '#F0FDF4' },
                            index === array.length - 1 && styles.exportDropdownOptionLast
                          ]}
                          onPress={() => {
                            setExportDateRange(option.value as any);
                            setDateRangeDropdownOpen(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.exportDropdownOptionText,
                            exportDateRange === option.value && { color: '#10B981', fontWeight: '600' }
                          ]}>
                            {option.label}
                          </Text>
                          {exportDateRange === option.value && (
                            <Ionicons name="checkmark" size={18} color="#10B981" style={{ marginLeft: 'auto' }} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>

              {/* User Filter */}
              <View style={styles.exportSection}>
                <View style={styles.exportSectionHeader}>
                  <Ionicons name="person" size={18} color="#10B981" style={styles.exportSectionIcon} />
                  <Text style={styles.exportSectionTitle}>User Filter</Text>
                </View>
                <View style={styles.exportDropdown}>
                  <TouchableOpacity 
                    style={styles.exportDropdownTrigger}
                    onPress={() => {
                      setUserFilterDropdownOpen(!userFilterDropdownOpen);
                      setDateRangeDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.exportDropdownText} numberOfLines={1}>{getUserFilterLabel()}</Text>
                    <Ionicons 
                      name={userFilterDropdownOpen ? "chevron-up" : "chevron-down"} 
                      size={18} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>
                  {userFilterDropdownOpen && (
                    <ScrollView 
                      style={styles.exportDropdownList}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                    >
                      <TouchableOpacity
                        style={[
                          styles.exportDropdownOption,
                          exportUserFilter === 'all' && { backgroundColor: '#F0FDF4' }
                        ]}
                        onPress={() => {
                          setExportUserFilter('all');
                          setUserFilterDropdownOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.exportDropdownOptionText,
                          exportUserFilter === 'all' && { color: '#10B981', fontWeight: '600' }
                        ]}>
                          All Users
                        </Text>
                        {exportUserFilter === 'all' && (
                          <Ionicons name="checkmark" size={18} color="#10B981" style={{ marginLeft: 'auto' }} />
                        )}
                      </TouchableOpacity>
                      {employees.slice(0, 5).map((emp, index) => (
                        <TouchableOpacity
                          key={emp.id}
                          style={[
                            styles.exportDropdownOption,
                            exportUserFilter === emp.email && { backgroundColor: '#F0FDF4' },
                            index === Math.min(4, employees.length - 1) && styles.exportDropdownOptionLast
                          ]}
                          onPress={() => {
                            setExportUserFilter(emp.email);
                            setUserFilterDropdownOpen(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.exportDropdownOptionText,
                            exportUserFilter === emp.email && { color: '#10B981', fontWeight: '600' }
                          ]} numberOfLines={1}>
                            {emp.name}
                          </Text>
                          {exportUserFilter === emp.email && (
                            <Ionicons name="checkmark" size={18} color="#10B981" style={{ marginLeft: 'auto' }} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>

              {/* Export Summary */}
              <View style={styles.exportSummaryBox}>
                <Text style={styles.exportSummaryTitle}>Export Summary</Text>
                <View style={styles.exportSummaryItem}>
                  <Text style={styles.exportSummaryLabel}>• Format:</Text>
                  <Text style={styles.exportSummaryValue}>{exportFormat.toUpperCase()}</Text>
                </View>
                <View style={styles.exportSummaryItem}>
                  <Text style={styles.exportSummaryLabel}>• Date Range:</Text>
                  <Text style={styles.exportSummaryValue}>{getDateRangeLabel()}</Text>
                </View>
                <View style={styles.exportSummaryItem}>
                  <Text style={styles.exportSummaryLabel}>• User Filter:</Text>
                  <Text style={styles.exportSummaryValue}>{getUserFilterLabel()}</Text>
                </View>
                <View style={styles.exportSummaryItem}>
                  <Text style={styles.exportSummaryLabel}>• Total Tasks:</Text>
                  <Text style={styles.exportSummaryValue}>{getExportFilteredTasks().length}</Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.exportModalFooter}>
              <TouchableOpacity 
                style={styles.exportCancelButton}
                onPress={closeExportModal}
                disabled={isExporting}
              >
                <Text style={styles.exportCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.exportConfirmButton,
                  isExporting && styles.exportConfirmButtonDisabled
                ]}
                onPress={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download" size={20} color="#fff" />
                    <Text style={styles.exportConfirmButtonText}>
                      Export {exportFormat.toUpperCase()}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Pass Task Modal */}
      <Modal 
        visible={passTaskModalVisible} 
        animationType="slide" 
        transparent={true}
        onRequestClose={closePassTaskModal}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.passModalOverlay}
          onPress={closePassTaskModal}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.passModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
            {/* Header */}
            <View style={{ 
              backgroundColor: '#fff',
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6',
            }}>
              <TouchableOpacity 
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  zIndex: 1,
                  padding: 4,
                }}
                onPress={closePassTaskModal}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  backgroundColor: '#8B5CF6',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}>
                  <Ionicons name="git-branch" size={32} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 }}>
                    Pass Task
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6B7280' }}>
                    Reassign this task to a lower hierarchy member
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 0 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Select Assignee */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Ionicons name="person" size={20} color="#8B5CF6" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                    Select Assignee
                  </Text>
                </View>
                <View style={{ 
                  borderWidth: 2, 
                  borderColor: '#3B82F6', 
                  borderRadius: 12, 
                  backgroundColor: '#fff',
                  overflow: 'hidden'
                }}>
                  {loadingEmployees ? (
                    <View style={{ padding: 15, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#8B5CF6" />
                    </View>
                  ) : (
                    <Picker
                      selectedValue={passTaskData.assignee}
                      onValueChange={(value) => setPassTaskData(prev => ({ ...prev, assignee: value }))}
                      style={{ height: 56, color: '#111827' }}
                      dropdownIconColor="#6B7280"
                      enabled={!loadingEmployees}
                    >
                      <Picker.Item label="Select employee" value="" />
                      {employees
                        .filter(emp => {
                          // Filter based on hierarchy: show only lower hierarchy members
                          const currentRole = user?.role?.toLowerCase();
                          const empRole = emp.department?.toLowerCase(); // Assuming department contains role info
                          
                          if (currentRole === 'admin') {
                            // Admin can pass to anyone
                            return true;
                          } else if (currentRole === 'hr' || currentRole === 'manager') {
                            // HR/Manager can pass to team_lead and employee
                            return emp.email !== user?.email; // Don't show current user
                          }
                          return false;
                        })
                        .map((emp) => (
                          <Picker.Item 
                            key={emp.id} 
                            label={`${emp.name} • ${emp.department || 'N/A'} (${emp.employee_id})`} 
                            value={emp.email} 
                          />
                        ))}
                    </Picker>
                  )}
                </View>
              </View>

              {/* Reason / Notes */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Ionicons name="document-text" size={20} color="#8B5CF6" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                    Reason / Notes
                  </Text>
                </View>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 15,
                    backgroundColor: '#fff',
                    color: '#111827',
                    height: 120,
                    textAlignVertical: 'top',
                  }}
                  placeholder="Add context about why you're passing the task or partial progress made"
                  placeholderTextColor="#9CA3AF"
                  value={passTaskData.reason}
                  onChangeText={(value) => setPassTaskData(prev => ({ ...prev, reason: value }))}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={{ 
              flexDirection: 'row', 
              padding: 20, 
              paddingTop: 16,
              paddingBottom: Platform.OS === 'ios' ? 30 : 20,
              borderTopWidth: 1,
              borderTopColor: '#F3F4F6',
              gap: 12,
              backgroundColor: '#fff',
            }}>
              <TouchableOpacity 
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  backgroundColor: '#fff',
                  alignItems: 'center',
                }}
                onPress={closePassTaskModal}
                disabled={isSubmitting}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#6B7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  borderRadius: 12,
                  backgroundColor: isSubmitting ? '#A78BFA' : '#8B5CF6',
                  alignItems: 'center',
                  elevation: 2,
                  shadowColor: '#8B5CF6',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                }}
                onPress={handlePassTask}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Pass Task</Text>
                )}
              </TouchableOpacity>
            </View>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
