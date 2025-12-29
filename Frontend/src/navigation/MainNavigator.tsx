// 📂 src/navigation/MainNavigator.tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { useAuth } from "../contexts/AuthContext";

// Dashboard
import RoleDashboard from "../screens/dashboard/RoleDashboard";

// Screens
import AttendanceWrapper from "../screens/attendance/AttendanceWrapper";
import DepartmentManagement from "../screens/departments/DepartmentManagement";
import EmployeeManagement from "../screens/employees/EmployeeManagement";
import HiringManagement from "../screens/hiring/HiringManagement";
import LeaveManagement from "../screens/leaves/LeaveManagement";
import Profile from "../screens/profile/Profile";
import RecentActivities from "../screens/activities/RecentActivities";
import Reports from "../screens/reports/Reports";
import Settings from "../screens/settings/SettingsPage";
import ShiftScheduleManagement from "../screens/shifts/ShiftScheduleManagement";
import TeamShifts from "../screens/shifts/TeamShifts";
import TaskManagement from "../screens/tasks/TaskManagement";
import TeamManagement from "../screens/teams/TeamManagement";

// Role-specific home dashboards (for detailed view)
import AdminDashboard from "../screens/admin/AdminDashboard";
import EmployeeDashboard from "../screens/employee/EmployeeDashboard";
import HRDashboard from "../screens/hr/HRDashboard";
import ManagerDashboard from "../screens/manager/ManagerDashboard";
import TeamLeadDashboard from "../screens/team_lead/TeamLeadDashboard";
import ChatListScreen from "../screens/chat/ChatListScreen";
import ChatRoomScreen from "../screens/chat/ChatRoomScreen";
import NewChatScreen from "../screens/chat/NewChatScreen";
import WfhApplyScreen from "../screens/wfh/WfhApplyScreen";
import WfhHistoryScreen from "../screens/wfh/WfhHistoryScreen";
import WfhRequestsScreen from "../screens/wfh/WfhRequestsScreen";

export type MainStackParamList = {
  Dashboard: undefined;
  HomeDashboard: undefined;
  Attendance: undefined;
  Leaves: undefined;
  Tasks: undefined;
  Employees: undefined;
  Departments: undefined;
  Hiring: undefined;
  Reports: undefined;
  RecentActivities: undefined;
  Shifts: undefined;
  Teams: undefined;
  TeamShifts: undefined;
  Profile: undefined;
  Settings: undefined;
  HelpSupport: undefined;
  ChatList: undefined;
  ChatRoom: { chatId: string; name: string };
  ChatDetails: { chatId: string; name: string; avatar?: string; isGroup: boolean };
  NewChat: undefined;
  WfhApply: undefined;
  WfhHistory: undefined;
  WfhRequests: undefined;
};

import HelpSupportScreen from "../screens/help/HelpSupportScreen";
import ChatDetailsScreen from "../screens/chat/ChatDetailsScreen";

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  const { user } = useAuth();
  const role = user?.role || "employee";

  // Get the appropriate home dashboard based on role
  const getHomeDashboard = () => {
    switch (role) {
      case "admin":
        return AdminDashboard;
      case "hr":
        return HRDashboard;
      case "manager":
        return ManagerDashboard;
      case "team_lead":
        return TeamLeadDashboard;
      default:
        return EmployeeDashboard;
    }
  };

  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
        gestureDirection: "horizontal",
      }}
    >
      {/* Main Dashboard with Feature Grid */}
      <Stack.Screen name="Dashboard" component={RoleDashboard} />

      {/* Role-specific Home Dashboard */}
      <Stack.Screen
        name="HomeDashboard"
        component={getHomeDashboard()}
        options={{ headerShown: false }}
      />

      {/* Attendance */}
      <Stack.Screen
        name="Attendance"
        component={AttendanceWrapper}
        options={{ headerShown: false }}
      />

      {/* Leaves */}
      <Stack.Screen
        name="Leaves"
        component={LeaveManagement}
        options={{ headerShown: false }}
      />

      {/* Tasks */}
      <Stack.Screen
        name="Tasks"
        component={TaskManagement}
        options={{ headerShown: false }}
      />

      {/* Employees - Admin/HR only */}
      <Stack.Screen
        name="Employees"
        component={EmployeeManagement}
        options={{ headerShown: false }}
      />

      {/* Departments - Admin only */}
      <Stack.Screen
        name="Departments"
        component={DepartmentManagement}
        options={{ headerShown: false }}
      />

      {/* Hiring - Admin/HR only */}
      <Stack.Screen
        name="Hiring"
        component={HiringManagement}
        options={{ headerShown: false }}
      />

      {/* Reports */}
      <Stack.Screen
        name="Reports"
        component={Reports}
        options={{ headerShown: false }}
      />

      {/* Recent Activities */}
      <Stack.Screen
        name="RecentActivities"
        component={RecentActivities}
        options={{ headerShown: false }}
      />

      {/* Shifts - Manager only */}
      <Stack.Screen
        name="Shifts"
        component={ShiftScheduleManagement}
        options={{ headerShown: false }}
      />

      {/* Teams - Manager/Team Lead */}
      <Stack.Screen
        name="Teams"
        component={TeamManagement}
        options={{ headerShown: false }}
      />

      {/* Team Shifts - Team Lead/Employee */}
      <Stack.Screen
        name="TeamShifts"
        component={TeamShifts}
        options={{ headerShown: false }}
      />

      {/* Profile */}
      <Stack.Screen
        name="Profile"
        component={Profile}
        options={{ headerShown: false }}
      />

      {/* Settings */}
      <Stack.Screen
        name="Settings"
        component={Settings}
        options={{ headerShown: false }}
      />

      {/* Help & Support */}
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{ headerShown: false }}
      />

      {/* Chat Feature */}
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NewChat"
        component={NewChatScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChatDetails"
        component={ChatDetailsScreen}
        options={{ headerShown: false }}
      />

      {/* WFH Module */}
      <Stack.Screen name="WfhApply" component={WfhApplyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WfhHistory" component={WfhHistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WfhRequests" component={WfhRequestsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
