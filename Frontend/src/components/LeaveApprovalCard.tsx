import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { LeaveRequestResponse } from '../lib/api';
import { formatDateIST } from '../utils/dateTime';
import { API_CONFIG } from '../config/api';
import { normalizeLeaveType } from '../utils/leaveTypeMapper';

interface LeaveApprovalCardProps {
  leave: LeaveRequestResponse;
  onApprove: (leaveId: number) => void;
  onDecline: (leaveId: number) => void;
  getTypeColor: (type: string) => string;
  getStatusColor: (status: string) => string;
}

export const LeaveApprovalCard: React.FC<LeaveApprovalCardProps> = ({
  leave,
  onApprove,
  onDecline,
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

  // Parse dates
  const startDate = typeof leave.start_date === 'string'
    ? new Date(leave.start_date)
    : leave.start_date;
  const endDate = typeof leave.end_date === 'string'
    ? new Date(leave.end_date)
    : leave.end_date;
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  // Get department
  const department = leave.user?.department || leave.department || 'Engineering';

  // Get profile photo
  const profilePhoto = leave.user?.profile_photo || leave.profile_photo;
  const isValidPhoto =
    profilePhoto &&
    typeof profilePhoto === 'string' &&
    profilePhoto.trim() !== '' &&
    profilePhoto !== 'null' &&
    profilePhoto !== 'undefined' &&
    (profilePhoto.startsWith('/') || profilePhoto.startsWith('http'));
  const photoUri = isValidPhoto
    ? profilePhoto.startsWith('http')
      ? profilePhoto
      : `${API_CONFIG.getApiBaseUrl()}${profilePhoto.startsWith('/') ? '' : '/'}${profilePhoto}`
    : null;

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.card, isPending && styles.cardPending]}>
        {/* Header: User Info & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.userSection}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.userAvatar} />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <Text style={styles.userAvatarText}>
                  {(leave.user?.name || leave.name || 'E').charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {leave.user?.name || leave.name || 'Unknown User'}
              </Text>
              <Text style={styles.userDept}>{department}</Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(leave.status) },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={12}
              color="#fff"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.statusText}>{leave.status}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Content: Leave Details */}
        <View style={styles.cardContent}>
          {/* Leave Type & Days */}
          <View style={styles.metaRow}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: getTypeColor(displayLeaveType) + '20',
                },
              ]}
            >
              <View
                style={[
                  styles.typeDot,
                  { backgroundColor: getTypeColor(displayLeaveType) },
                ]}
              />
              <Text
                style={[
                  styles.typeText,
                  { color: getTypeColor(displayLeaveType) },
                ]}
              >
                {displayLeaveType}
              </Text>
            </View>
            <Text style={styles.daysText}>{leave.days || daysDiff} Days</Text>
          </View>

          {/* Date Range */}
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>From</Text>
              <Text style={styles.dateValue}>{formatDateIST(startDate)}</Text>
              <Text style={styles.dayName}>{format(startDate, 'EEE')}</Text>
            </View>

            <View style={styles.dateConnector}>
              <View style={styles.connectorLine} />
              <Ionicons name="arrow-forward" size={14} color="#cbd5e1" />
              <View style={styles.connectorLine} />
            </View>

            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>To</Text>
              <Text style={styles.dateValue}>{formatDateIST(endDate)}</Text>
              <Text style={styles.dayName}>{format(endDate, 'EEE')}</Text>
            </View>
          </View>

          {/* Reason */}
          {leave.reason && (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason</Text>
              <Text style={styles.reasonText} numberOfLines={2}>
                {leave.reason}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => onDecline(leave.leave_id)}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={18} color="#ef4444" />
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => onApprove(leave.leave_id)}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7c3aed', '#6d28d9']}
                style={styles.approveBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.approveBtnText}>Approve</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
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

  // Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  userDept: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },

  // Content
  cardContent: {
    padding: 12,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  daysText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },

  // Date Range
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginBottom: 2,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  dayName: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  dateConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  connectorLine: {
    width: 6,
    height: 1,
    backgroundColor: '#cbd5e1',
  },

  // Reason
  reasonBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
  },
  reasonLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginBottom: 4,
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  declineBtn: {
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
  declineBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  approveBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  approveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
