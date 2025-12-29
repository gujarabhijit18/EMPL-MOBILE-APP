import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
    BottomTabBarProps,
    BottomTabNavigationOptions,
    createBottomTabNavigator
} from "@react-navigation/bottom-tabs";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect } from "react";
import {
    Animated,
    Easing,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// Screens
import { useAuth } from "../contexts/AuthContext";
import { useModuleBadges, ModuleType } from "../contexts/ModuleBadgeContext";
import AdminDashboard from "../screens/admin/AdminDashboard";
import AttendanceWrapper from "../screens/attendance/AttendanceWrapper";
import CreateDepartmentForm from "../screens/departments/CreateDepartmentForm";
import DepartmentManagement from "../screens/departments/DepartmentManagement";
import EmployeeDashboard from "../screens/employee/EmployeeDashboard";
import EmployeeManagement from "../screens/employees/EmployeeManagement";
import HiringManagement from "../screens/hiring/HiringManagement";
import HRDashboard from "../screens/hr/HRDashboard";
import LeaveManagement from "../screens/leaves/LeaveManagement";
import ManagerDashboard from "../screens/manager/ManagerDashboard";
import Profile from "../screens/profile/Profile";
import Reports from "../screens/reports/Reports";
import Settings from "../screens/settings/SettingsPage";
import ShiftScheduleManagement from "../screens/shifts/ShiftScheduleManagement";
import TeamShifts from "../screens/shifts/TeamShifts";
import TaskManagement from "../screens/tasks/TaskManagement";
import TeamLeadDashboard from "../screens/team_lead/TeamLeadDashboard";
import TeamMembersList from "../screens/team_lead/TeamMembersList";
import TeamManagement from "../screens/teams/TeamManagement";
import {
    TAB_BAR_HEIGHT,
    TabBarVisibilityContext,
} from "./tabBarVisibility";

export type TabParamList = {
  Home: undefined;
  Attendance: undefined;
  Leaves: undefined;
  Tasks: undefined;
  TeamShifts: undefined;
  Employees: undefined;
  Departments: undefined;
  Hiring: undefined;
  Shifts: undefined;
  Teams: undefined;
  TeamMembersList: undefined;
  Reports: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const DepartmentStack = createNativeStackNavigator();
const TeamLeadStack = createNativeStackNavigator();
const TAB_BAR_HIDE_TRANSLATE = TAB_BAR_HEIGHT + 36;
const ANIMATION_DURATION = 220;

// Map tab names to module types for badge system
const tabToModule: Record<string, ModuleType> = {
  "Home": "home",
  "Attendance": "attendance",
  "Leaves": "leaves",
  "Tasks": "tasks",
  "TeamShifts": "shifts",
  "Employees": "employees",
  "Hiring": "hiring",
  "Shifts": "shifts",
  "Teams": "teams",
  "Reports": "reports",
};

// Custom Tab Bar Component
type CustomTabBarProps = BottomTabBarProps & {
  state: TabNavigationState<ParamListBase>;
  descriptors: Record<string, { options: BottomTabNavigationOptions; navigation: any }>;
  navigation: any;
};

function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  // Get badge counts from context
  const { badges, resetBadge } = useModuleBadges();
  // Filter out hidden tabs first
  const visibleRoutes = state.routes.filter(
    route => route.name !== "Profile" && route.name !== "Settings"
  );
  
  return (
    <View style={styles.customTabBar}>
      {visibleRoutes.map((route, index) => {
        // Find the actual index in the original routes array
        const routeIndex = state.routes.findIndex(r => r.key === route.key);
        
        const { options } = descriptors[route.key];
        const isFocused = state.index === routeIndex;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
            // Reset badge when navigating to the tab
            const moduleType = tabToModule[route.name];
            if (moduleType) {
              resetBadge(moduleType);
            }
          }
        };

        // Get badge count for this tab from context
        const moduleType = tabToModule[route.name];
        const badgeCount = moduleType ? badges[moduleType] : 0;

        // Define icon and color based on route name
        let icon: React.ReactNode;
        const activeColor = "#2563eb";
        const inactiveColor = "#9ca3af";
        const iconSize = isFocused ? 26 : 24;
        const color = isFocused ? activeColor : inactiveColor;

        switch (route.name) {
          case "Home":
            icon = <Ionicons name="home" size={iconSize} color={color} />;
            break;
          case "Attendance":
            icon = <Ionicons name="calendar-outline" size={iconSize} color={color} />;
            break;
          case "Leaves":
            icon = <MaterialCommunityIcons name="notebook-outline" size={iconSize} color={color} />;
            break;
          case "Tasks":
            icon = <Ionicons name="list-outline" size={iconSize} color={color} />;
            break;
          case "Employees":
            icon = <Ionicons name="people-outline" size={iconSize} color={color} />;
            break;
          case "Departments":
            icon = <Ionicons name="business-outline" size={iconSize} color={color} />;
            break;
          case "Reports":
            icon = <Ionicons name="document-text-outline" size={iconSize} color={color} />;
            break;
          case "Shifts":
            icon = <Ionicons name="time-outline" size={iconSize} color={color} />;
            break;
          case "Teams":
            icon = <Ionicons name="people-outline" size={iconSize} color={color} />;
            break;
          default:
            icon = <Ionicons name="apps-outline" size={iconSize} color={color} />;
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel || `${route.name} Tab`}
            testID={`${route.name}-tab`}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              {icon}
              {badgeCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, { color }]}>
              {route.name}
            </Text>
            {isFocused && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const DepartmentStackNavigator = () => (
  <DepartmentStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <DepartmentStack.Screen
      name="DepartmentManagement"
      component={DepartmentManagement}
    />
    <DepartmentStack.Screen
      name="CreateDepartmentForm"
      component={CreateDepartmentForm}
    />
  </DepartmentStack.Navigator>
);

const TeamLeadStackNavigator = () => (
  <TeamLeadStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <TeamLeadStack.Screen
      name="TeamLeadDashboardScreen"
      component={TeamLeadDashboard}
    />
    <TeamLeadStack.Screen
      name="TeamMembersListScreen"
      component={TeamMembersList}
    />
  </TeamLeadStack.Navigator>
);

export default function TabNavigator() {
  const { user } = useAuth();
  const role = user?.role || "employee";
  // Admin role only sees Reports, other roles see their respective dashboards
  const HomeComponent =
    role === "admin"
      ? Reports // Admin goes directly to Reports
      : role === "hr"
      ? HRDashboard
      : role === "manager"
      ? ManagerDashboard
      : role === "team_lead"
      ? TeamLeadStackNavigator
      : EmployeeDashboard;

  // Get badge context for refreshing on mount
  const { refreshBadgesFromAPI } = useModuleBadges();

  // Refresh badges when tab navigator mounts
  useEffect(() => {
    refreshBadgesFromAPI();
  }, []);

  const canAccessEmployeesTab = role === "hr"; // Admin only sees Reports
  const translateY = React.useRef(new Animated.Value(0)).current;
  const isHidden = React.useRef(false);
  const [tabBarVisible, setTabBarVisible] = React.useState(true);

  const hideTabBar = React.useCallback(() => {
    if (isHidden.current) {
      return;
    }
    isHidden.current = true;
    setTabBarVisible(false);
    Animated.timing(translateY, {
      toValue: TAB_BAR_HIDE_TRANSLATE,
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const showTabBar = React.useCallback(() => {
    if (!isHidden.current) {
      return;
    }
    isHidden.current = false;
    setTabBarVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const contextValue = React.useMemo(
    () => ({
      hideTabBar,
      showTabBar,
      tabBarVisible,
      tabBarHeight: TAB_BAR_HEIGHT,
    }),
    [hideTabBar, showTabBar, tabBarVisible]
  );

  return (
    <TabBarVisibilityContext.Provider value={contextValue}>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#2563eb",
          tabBarLabelStyle: { fontWeight: "bold", fontSize: 11 },
          tabBarStyle: styles.tabBar,
          tabBarIcon: ({ color, size }) => {
            let iconName: string = "home";
            switch (route.name) {
              case "Home":
                iconName = "home";
                break;
              case "Attendance":
                iconName = "calendar";
                break;
              case "Leaves":
                iconName = "albums";
                break;
              case "Tasks":
                iconName = "clipboard";
                break;
              case "Employees":
                iconName = "people";
                break;
              case "Departments":
                iconName = "business";
                break;
              case "Hiring":
                iconName = "briefcase";
                break;
              case "Reports":
                iconName = "document-text";
                break;
              case "Shifts":
                iconName = "time";
                break;
              case "Teams":
                iconName = "people";
                break;
            }
            return <Ionicons name={iconName as any} size={size} color={color} />;
          },
        })}
        tabBar={(props) => (
          <Animated.View
            style={[
              styles.animatedTabBarContainer,
              { transform: [{ translateY }] },
            ]}
            pointerEvents={tabBarVisible ? "auto" : "none"}
          >
            <CustomTabBar {...props} />
          </Animated.View>
        )}
      >
        {/* Admin only sees Reports tab */}
        {role === "admin" ? (
          <Tab.Screen name="Reports" component={Reports} />
        ) : (
          <>
            <Tab.Screen name="Home" component={HomeComponent as any} />
            <Tab.Screen name="Attendance" component={AttendanceWrapper} />
            <Tab.Screen name="Leaves" component={LeaveManagement} />
            <Tab.Screen name="Tasks" component={TaskManagement} />
            {(role === "team_lead" || role === "employee") && (
              <Tab.Screen name="TeamShifts" component={TeamShifts} />
            )}
            {(role === "hr") && <Tab.Screen name="Employees" component={EmployeeManagement} />}
            {role === "hr" && (
              <Tab.Screen
                name="Hiring"
                component={HiringManagement}
              />
            )}
            {role === "manager" && <Tab.Screen name="Shifts" component={ShiftScheduleManagement} />}
            {role === "manager" && <Tab.Screen name="Teams" component={TeamManagement} />}
            {role !== "employee" && <Tab.Screen name="Reports" component={Reports} />}
          </>
        )}
        <Tab.Screen 
          name="Profile" 
          component={Profile} 
          options={{
            tabBarButton: () => null,
            tabBarStyle: { display: 'none' }
          }} 
        />
        <Tab.Screen 
          name="Settings" 
          component={Settings} 
          options={{
            tabBarButton: () => null,
            tabBarStyle: { display: 'none' }
          }} 
        />
      </Tab.Navigator>
    </TabBarVisibilityContext.Provider>
  );
}

const styles = StyleSheet.create({
  animatedTabBarContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  tabBar: {
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    height: 64,
    paddingBottom: 6,
    paddingTop: 8,
    backgroundColor: "white",
  },
  customTabBar: {
    flexDirection: "row",
    height: 65,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
    maxWidth: 55,
  },
  tabLabel: {
    fontSize: 8,
    marginTop: 2,
    fontWeight: "500",
    textAlign: "center",
    width: "100%",
    lineHeight: 10,
  },
  activeIndicator: {
    height: 3,
    width: "70%",
    backgroundColor: "#2563eb",
    borderRadius: 3,
    position: "absolute",
    bottom: 0,
  },
  iconContainer: {
    position: "relative",
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "white",
  },
  notificationText: {
    color: "white",
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 10,
  },
});
