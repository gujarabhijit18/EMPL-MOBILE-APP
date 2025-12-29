import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LeaveRequestResponse } from '../lib/api';
import { formatDateIST, getDayMonthIST } from '../utils/dateTime';
import { normalizeLeaveType } from '../utils/leaveTypeMapper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LeaveHistoryCardProps {
  leave: LeaveRequestResponse;
  onEdit?: (leave: LeaveRequestResponse) => void;
  onDelete?: (leaveId: number) => void;
  getTypeColor: (type: string) => string;
  getStatusColor: (status: string) => string;
}

const getStatusIcon = (status: string): any => {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'checkmark-circle';
    case 'rejected':
      return 'close-circle';
    case 'pending':
      return 'time-outline';
    case 'cancelled':
      return 'ban';
    default:
      return 'help-circle';
  }
};

const getStatusIconColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'approved':
      return '#10b981';
    case 'rejected':
      return '#ef4444';
    case 'pending':
      return '#f59e0b';
    case 'cancelled':
      return '#6b7280';
    default:
      return '#9ca3af';
  }
};

export const LeaveHistoryCard: React.FC<LeaveHistoryCardProps> = ({
  leave,
  onEdit,
  onDelete,
  getTypeColor,
  getStatusColor,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const isPending = leave.status === 'Pending';
  const displayLeaveType = normalizeLeaveType(leave.leave_type || '');

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.card,
          isPending && styles.cardPending,
        ]}
      >
        {/* Left Color Bar */}
        <View
          style={[
            styles.colorBar,
            { backgroundColor: getTypeColor(displayLeaveType) },
          ]}
        />

        {/* Main Content */}
        <View style={styles.cardContent}>
          {/* Header Row: Type & Status */}
          <View style={styles.headerRow}>
            <View style={styles.typeSection}>
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor: getTypeColor(displayLeaveType) + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeBadgeText,
                    { color: getTypeColor(displayLeaveType) },
                  ]}
                >
                  {displayLeaveType}
                </Text>
              </View>
            </View>

            <View style={styles.statusSection}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(leave.status) },
                ]}
              >
                <Ionicons
                  name={getStatusIcon(leave.status)}
                  size={14}
                  color="#fff"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.statusBadgeText}>{leave.status}</Text>
              </View>
            </View>
          </View>

          {/* Date Range */}
          <View style={styles.dateSection}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>From</Text>
              <Text style={styles.dateValue}>
                {getDayMonthIST(leave.start_date)}
              </Text>
            </View>

            <View style={styles.dateConnector}>
              <View style={styles.connectorLine} />
              <Ionicons name="arrow-forward" size={16} color="#cbd5e1" />
              <View style={styles.connectorLine} />
            </View>

            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>To</Text>
              <Text style={styles.dateValue}>
                {formatDateIST(leave.end_date)}
              </Text>
            </View>

            <View style={styles.daysSection}>
              <Text style={styles.daysLabel}>Days</Text>
              <Text style={styles.daysValue}>{leave.days || 1}</Text>
            </View>
          </View>

          {/* Reason */}
          {leave.reason && (
            <View style={styles.reasonSection}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText} numberOfLines={2}>
                {leave.reason}
              </Text>
            </View>
          )}

          {/* Action Buttons - Only for Pending */}
          {isPending && (onEdit || onDelete) && (
            <View style={styles.actionRow}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => onEdit(leave)}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pencil" size={16} color="#7c3aed" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}

              {onDelete && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => onDelete(leave.leave_id)}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 12,
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPending: {
    borderColor: '#fcd34d',
    borderWidth: 1.5,
    backgroundColor: '#fffbeb',
  },
  colorBar: {
    width: 5,
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },

  // Header Row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeSection: {
    flex: 1,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusSection: {
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // Date Section
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 3,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  dateConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 6,
    gap: 4,
  },
  connectorLine: {
    width: 8,
    height: 1,
    backgroundColor: '#cbd5e1',
  },
  daysSection: {
    marginLeft: 8,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
    alignItems: 'center',
  },
  daysLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 3,
    fontWeight: '500',
  },
  daysValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7c3aed',
  },

  // Reason Section
  reasonSection: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    gap: 6,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7c3aed',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
});
