// 📂 src/navigation/MainNavigator.tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { useAuth } from "../contexts/AuthContext";

// Dashboard
import RoleDashboard from "../screens/dashboard/RoleDashboard";

// Screens
import AttendanceWrapper from "../screens/attendance/AttendanceWrapper";
import AttendanceRecordsScreen from "../screens/attendance/AttendanceRecordsScreen";
import DepartmentManagement from "../screens/departments/DepartmentManagement";
import EmployeeManagement from "../screens/employees/EmployeeManagement";
import LeaveManagement from "../screens/leaves/LeaveManagement";
import Profile from "../screens/profile/Profile";
import RecentActivities from "../screens/activities/RecentActivities";
import Reports from "../screens/reports/Reports";
import Settings from "../screens/settings/SettingsPage";
import ShiftScheduleManagement from "../screens/shifts/ShiftScheduleManagement";
import TeamShifts from "../screens/shifts/TeamShifts";
import TaskManagement from "../screens/tasks/TaskManagement";
import TeamManagement from "../screens/teams/TeamManagement";

// Hiring Module
import HiringHub from "../screens/hiring/HiringHub";
import JobManagement from "../screens/hiring/JobManagement";
import CandidateManagement from "../screens/hiring/CandidateManagement";
import InterviewSchedule from "../screens/hiring/InterviewSchedule";
import InterviewFeedback from "../screens/hiring/InterviewFeedback";
import OfferManagement from "../screens/hiring/OfferManagement";
import HiringAnalytics from "../screens/hiring/HiringAnalytics";

// Payroll Module
import PayrollHub from "../screens/payroll/PayrollHub";
import PayrollDashboard from "../screens/payroll/PayrollDashboard";
import SalaryStructure from "../screens/payroll/SalaryStructure";
import PayrollCalculation from "../screens/payroll/PayrollCalculation";
import PayrollApproval from "../screens/payroll/PayrollApproval";
import PayslipManagement from "../screens/payroll/PayslipManagement";
import SalaryDisbursement from "../screens/payroll/SalaryDisbursement";
import MyPayslips from "../screens/payroll/MyPayslips";

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
  AttendanceRecords: undefined;
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
  // Hiring Module Routes
  JobManagement: undefined;
  CandidateManagement: undefined;
  InterviewSchedule: undefined;
  InterviewFeedback: undefined;
  OfferManagement: undefined;
  HiringAnalytics: undefined;
  // Payroll Module Routes
  Payroll: undefined;
  PayrollDashboard: undefined;
  SalaryStructure: undefined;
  PayrollCalculation: undefined;
  PayrollApproval: undefined;
  PayslipManagement: undefined;
  SalaryDisbursement: undefined;
  MyPayslips: undefined;
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

      {/* Attendance Records */}
      <Stack.Screen
        name="AttendanceRecords"
        component={AttendanceRecordsScreen}
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
        component={HiringHub}
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

      {/* Hiring Module Screens */}
      <Stack.Screen name="JobManagement" component={JobManagement} options={{ headerShown: false }} />
      <Stack.Screen name="CandidateManagement" component={CandidateManagement} options={{ headerShown: false }} />
      <Stack.Screen name="InterviewSchedule" component={InterviewSchedule} options={{ headerShown: false }} />
      <Stack.Screen name="InterviewFeedback" component={InterviewFeedback} options={{ headerShown: false }} />
      <Stack.Screen name="OfferManagement" component={OfferManagement} options={{ headerShown: false }} />
      <Stack.Screen name="HiringAnalytics" component={HiringAnalytics} options={{ headerShown: false }} />

      {/* Payroll Module Screens */}
      <Stack.Screen name="Payroll" component={PayrollHub} options={{ headerShown: false }} />
      <Stack.Screen name="PayrollDashboard" component={PayrollDashboard} options={{ headerShown: false }} />
      <Stack.Screen name="SalaryStructure" component={SalaryStructure} options={{ headerShown: false }} />
      <Stack.Screen name="PayrollCalculation" component={PayrollCalculation} options={{ headerShown: false }} />
      <Stack.Screen name="PayrollApproval" component={PayrollApproval} options={{ headerShown: false }} />
      <Stack.Screen name="PayslipManagement" component={PayslipManagement} options={{ headerShown: false }} />
      <Stack.Screen name="SalaryDisbursement" component={SalaryDisbursement} options={{ headerShown: false }} />
      <Stack.Screen name="MyPayslips" component={MyPayslips} options={{ headerShown: false }} />

      {/* WFH Module */}
      <Stack.Screen name="WfhApply" component={WfhApplyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WfhHistory" component={WfhHistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WfhRequests" component={WfhRequestsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
