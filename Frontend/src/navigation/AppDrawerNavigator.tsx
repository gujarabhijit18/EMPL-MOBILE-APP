import React from "react";
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

// Screens (these must already be defined in your src/screens directory)
import AdminDashboard from '../screens/admin/AdminDashboard';
import AttendanceWrapper from '../screens/attendance/AttendanceWrapper';
import LeaveManagement from '../screens/leaves/LeaveManagement';
import TaskManagement from '../screens/tasks/TaskManagement';
import EmployeeManagement from '../screens/employees/EmployeeManagement';
import DepartmentManagement from '../screens/departments/DepartmentManagement';
import Reports from '../screens/reports/Reports';

const Drawer = createDrawerNavigator();

export default function AppDrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: '#2563eb',
        drawerLabelStyle: { fontWeight: 'bold' },
      }}
    >
      <Drawer.Screen
        name="Home"
        component={AdminDashboard}
        options={{
          drawerLabel: 'Home',
          drawerIcon: ({ color, size }) => (<Ionicons name="home" color={color} size={size} />),
        }}
      />
      <Drawer.Screen
        name="AttendanceManager"
        component={AttendanceWrapper}
        options={{
          drawerLabel: 'Attendance',
          drawerIcon: ({ color, size }) => (<Ionicons name="calendar" color={color} size={size} />),
        }}
      />
      <Drawer.Screen
        name="LeaveManagement"
        component={LeaveManagement}
        options={{
          drawerLabel: 'Leaves',
          drawerIcon: ({ color, size }) => (<Ionicons name="checkmark-circle" color={color} size={size} />),
        }}
      />
      <Drawer.Screen
        name="TaskManagement"
        component={TaskManagement}
        options={{
          drawerLabel: 'Tasks',
          drawerIcon: ({ color, size }) => (<Ionicons name="clipboard" color={color} size={size} />),
        }}
      />
      <Drawer.Screen
        name="EmployeeManagement"
        component={EmployeeManagement}
        options={{
          drawerLabel: 'Employees',
          drawerIcon: ({ color, size }) => (<Ionicons name="people" color={color} size={size} />),
        }}
      />
      <Drawer.Screen
        name="DepartmentManagement"
        component={DepartmentManagement}
        options={{
          drawerLabel: 'Departments',
          drawerIcon: ({ color, size }) => (<Ionicons name="business" color={color} size={size} />),
        }}
      />
      <Drawer.Screen
        name="Reports"
        component={Reports}
        options={{
          drawerLabel: 'Reports',
          drawerIcon: ({ color, size }) => (<Ionicons name="document-text" color={color} size={size} />),
        }}
      />
    </Drawer.Navigator>
  );
}
