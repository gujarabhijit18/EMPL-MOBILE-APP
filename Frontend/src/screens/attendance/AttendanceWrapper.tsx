import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AttendanceManager from './AttendanceManager';
import AttendancePage from './AttendancePage';

// Wrapper component to handle role-based attendance routing
const AttendanceWrapper: React.FC = () => {
  const { user } = useAuth();

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
