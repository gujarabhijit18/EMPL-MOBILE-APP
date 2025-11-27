import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
  DrawerNavigationProp,
} from "@react-navigation/drawer";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { Avatar, Button, Menu, Divider } from "react-native-paper";
import Icon from "react-native-vector-icons/Ionicons";
import { DrawerContentComponentProps } from "@react-navigation/drawer";

// Real Screens
import AdminDashboard from "../../screens/admin/AdminDashboard";
import AttendanceWrapper from "../../screens/attendance/AttendanceWrapper";
import LeaveManagement from "../../screens/leaves/LeaveManagement";
import EmployeeManagement from "../../screens/employees/EmployeeManagement";
import TaskManagement from "../../screens/tasks/TaskManagement";
import DepartmentManagement from "../../screens/departments/DepartmentManagement";
import Reports from "../../screens/reports/Reports";

const Drawer = createDrawerNavigator();

const MainLayout = () => {
  const [language, setLanguage] = useState("en");

  const user = {
    name: "John Doe",
    role: "Admin",
    email: "john@shekru.com",
    profilePhoto: "",
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => console.log("User Logged Out") },
    ]);
  };

  return (
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="AdminDashboard"
        drawerContent={(props: DrawerContentComponentProps) => (
          <CustomDrawerContent {...props} user={user} onLogout={handleLogout} />
        )}
        screenOptions={{
          header: ({ navigation }: { navigation: DrawerNavigationProp<any> }) => (
            <CustomHeader
              navigation={navigation}
              user={user}
              language={language}
              setLanguage={setLanguage}
            />
          ),
          drawerActiveTintColor: "#2563EB",
          drawerInactiveTintColor: "#6B7280",
        }}
      >
        {/* Home → Admin Dashboard */}
        <Drawer.Screen name="AdminDashboard" component={AdminDashboard} />
        {/* Exact route names required by Quick Actions */}
        <Drawer.Screen name="AttendanceManager" component={AttendanceWrapper} />
        <Drawer.Screen name="LeaveManagement" component={LeaveManagement} />
        <Drawer.Screen name="EmployeeManagement" component={EmployeeManagement} />
        <Drawer.Screen name="TaskManagement" component={TaskManagement} />
        <Drawer.Screen name="DepartmentManagement" component={DepartmentManagement} />
        <Drawer.Screen name="Reports" component={Reports} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
};

export default MainLayout;

//
// Custom Header
//
const CustomHeader = ({ navigation, user, language, setLanguage }: any) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "hi" : language === "hi" ? "mr" : "en");
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
        <Icon name="menu" size={28} color="#2563EB" />
      </TouchableOpacity>

      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={styles.logoTitle}>Shekru Labs</Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Button
          icon="earth"
          textColor="#2563EB"
          compact
          onPress={toggleLanguage}
        >
          {language.toUpperCase()}
        </Button>

        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity onPress={() => setMenuVisible(true)}>
              <Avatar.Image
                size={36}
                source={
                  user.profilePhoto
                    ? { uri: user.profilePhoto }
                    : require("../assets/avatar.png") // works in Expo assets folder
                }
              />
            </TouchableOpacity>
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate("Profile");
            }}
            title="Profile"
            leadingIcon="account-outline"
          />
          <Divider />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              Alert.alert("Settings", "Settings page coming soon!");
            }}
            title="Settings"
            leadingIcon="cog-outline"
          />
          <Divider />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              Alert.alert("Logout", "You have been logged out.");
            }}
            title="Logout"
            leadingIcon="logout"
          />
        </Menu>
      </View>
    </View>
  );
};

//
// Custom Drawer
//
const CustomDrawerContent = ({ user, onLogout, ...props }: any) => {
  const navigation = useNavigation<any>();

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.userBox}>
        <Avatar.Text
          size={50}
          label={user.name[0]}
          style={{ backgroundColor: "#2563EB" }}
        />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userRole}>{user.role.toUpperCase()}</Text>
        </View>
      </View>

      <Divider style={{ marginVertical: 10 }} />

      {props.state.routeNames.map((name: string, i: number) => (
        <DrawerItem
          key={i}
          label={name}
          icon={({ color, size }) => (
            <Icon name={getIconForScreen(name)} color={color} size={size} />
          )}
          focused={props.state.index === i}
          onPress={() => navigation.navigate(name)}
        />
      ))}

      <Divider style={{ marginVertical: 10 }} />

      <DrawerItem
        label="Logout"
        icon={({ color }) => (
          <Icon name="log-out-outline" color={color} size={22} />
        )}
        onPress={onLogout}
      />
    </DrawerContentScrollView>
  );
};

//
// Icon Mapper
//
const getIconForScreen = (screen: string) => {
  switch (screen) {
    case "AdminDashboard":
      return "home-outline";
    case "AttendanceManager":
      return "time-outline";
    case "LeaveManagement":
      return "calendar-outline";
    case "TaskManagement":
      return "list-outline";
    case "EmployeeManagement":
      return "people-outline";
    case "Reports":
      return "bar-chart-outline";
    default:
      return "ellipse-outline";
  }
};

//
// Styles
//
const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoCircle: {
    backgroundColor: "#2563EB",
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  logoText: { color: "white", fontWeight: "bold" },
  logoTitle: {
    fontWeight: "bold",
    color: "#111827",
    fontSize: 16,
  },
  userBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  userName: {
    fontWeight: "bold",
    color: "#111827",
  },
  userRole: {
    color: "#6B7280",
    fontSize: 12,
  },
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: { fontSize: 18, fontWeight: "600", color: "#111827" },
});
