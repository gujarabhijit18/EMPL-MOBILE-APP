import React, { useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useModuleBadges } from '../../contexts/ModuleBadgeContext';
import AttendanceManager from './AttendanceManager';
import AttendancePage from './AttendancePage';

// Wrapper component to handle role-based attendance routing
const AttendanceWrapper: React.FC = () => {
  const { user } = useAuth();
  const { resetBadge } = useModuleBadges();

  // Reset badge when screen is focused
  useFocusEffect(
    useCallback(() => {
      resetBadge("attendance");
    }, [resetBadge])
  );

  // For HR and Manager roles, show AttendanceManager with toggle functionality
  if (user?.role === 'hr' || user?.role === 'manager') {
    return <AttendanceManager />;
  }

  // For Admin role, show AttendanceManager but in employee-only view
  if (user?.role === 'admin') {
    return <AttendanceManager />;
  }

  // For Employee, Team Lead, and other roles, show simple AttendancePage (self-attendance only)
  return <AttendancePage />;
};

export default AttendanceWrapper;
