import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons"; // Expo-compatible icons

// Mock Auth Context (Expo-safe, no API calls)
const useAuth = () => ({ user: { role: "admin" } });

interface TaskPermission {
  fromRole: string;
  toRoles: string[];
  enabled: boolean;
}

interface Holiday {
  id: string;
  date: Date;
  name: string;
  type: "public" | "company" | "optional";
  recurring: boolean;
}

/**
 * Access Control Screen
 * 100% Expo-compatible
 * Cross-platform (Android, iOS, Web)
 * No backend / no API integration
 */
export default function AccessControl() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"permissions" | "holidays" | "settings">(
    "permissions"
  );

  // Local state (mock data only)
  const [taskPermissions, setTaskPermissions] = useState<TaskPermission[]>([
    { fromRole: "admin", toRoles: ["hr", "manager"], enabled: true },
    { fromRole: "hr", toRoles: ["employee"], enabled: true },
    { fromRole: "employee", toRoles: [], enabled: false },
  ]);

  const [holidays, setHolidays] = useState<Holiday[]>([
    {
      id: "1",
      date: new Date(2025, 0, 1),
      name: "New Year's Day",
      type: "public",
      recurring: true,
    },
    {
      id: "2",
      date: new Date(2025, 0, 26),
      name: "Republic Day",
      type: "public",
      recurring: true,
    },
  ]);

  const [newHoliday, setNewHoliday] = useState({
    name: "",
    date: new Date(),
    type: "public",
    recurring: false,
  });

  const [systemSettings, setSystemSettings] = useState({
    allowSelfTaskAssignment: true,
    requireTaskApproval: false,
    autoApproveLeaves: false,
    maxConsecutiveLeaveDays: 15,
    minNoticePeriodDays: 2,
  });

  const roles = ["admin", "hr", "manager", "team_lead", "employee"];

  // Restrict to Admin only
  if (user.role !== "admin") {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={48} color="#777" />
        <Text style={styles.title}>Access Restricted</Text>
        <Text style={styles.subtitle}>
          Only Administrators can access this module.
        </Text>
      </View>
    );
  }

  // Toggle Permission
  const handleTogglePermission = (fromRole: string, toRole: string) => {
    setTaskPermissions((permissions) =>
      permissions.map((perm) => {
        if (perm.fromRole === fromRole) {
          const isEnabled = perm.toRoles.includes(toRole);
          return {
            ...perm,
            toRoles: isEnabled
              ? perm.toRoles.filter((r) => r !== toRole)
              : [...perm.toRoles, toRole],
          };
        }
        return perm;
      })
    );
    Alert.alert("Success", "Task permissions updated!");
  };

  // Add a new Holiday
  const handleAddHoliday = () => {
    if (!newHoliday.name.trim()) {
      Alert.alert("Error", "Please enter a holiday name");
      return;
    }

    const holiday: Holiday = {
      id: Date.now().toString(),
      date: newHoliday.date,
      name: newHoliday.name,
      type: newHoliday.type as Holiday["type"],
      recurring: newHoliday.recurring,
    };

    setHolidays([...holidays, holiday]);
    setNewHoliday({ name: "", date: new Date(), type: "public", recurring: false });
    Alert.alert("Success", "Holiday added successfully");
  };

  const handleDeleteHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
    Alert.alert("Deleted", "Holiday removed successfully");
  };

  const handleSettingChange = (key: string, value: any) => {
    setSystemSettings((prev) => ({ ...prev, [key]: value }));
    Alert.alert("Updated", "System setting changed");
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.container}>
        <ScrollView style={{ flex: 1 }}>
          <Text style={styles.header}>Access Control</Text>

          {/* Tabs */}
          <View style={styles.tabs}>
            {["permissions", "holidays", "settings"].map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setTab(item as any)}
                style={[styles.tab, tab === item && styles.activeTab]}
              >
                <Text style={[styles.tabText, tab === item && styles.activeTabText]}>
                  {item.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Permissions Tab */}
          {tab === "permissions" && (
            <View style={styles.section}>
              {taskPermissions.map((perm) => (
                <View key={perm.fromRole} style={styles.card}>
                  <Text style={styles.roleTitle}>{perm.fromRole.toUpperCase()}</Text>
                  <Text>Can assign tasks to:</Text>
                  <View style={styles.roleList}>
                    {roles
                      .filter((r) => r !== perm.fromRole)
                      .map((role) => {
                        const enabled = perm.toRoles.includes(role);
                        return (
                          <TouchableOpacity
                            key={role}
                            onPress={() => handleTogglePermission(perm.fromRole, role)}
                            style={[
                              styles.roleButton,
                              enabled && styles.roleButtonActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.roleButtonText,
                                enabled && styles.roleButtonTextActive,
                              ]}
                            >
                              {role}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Holidays Tab */}
          {tab === "holidays" && (
            <View style={styles.section}>
              <Text style={styles.subHeader}>Add New Holiday</Text>
              <TextInput
                style={styles.input}
                placeholder="Holiday Name"
                value={newHoliday.name}
                onChangeText={(text) => setNewHoliday({ ...newHoliday, name: text })}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddHoliday}>
                <Text style={styles.addButtonText}>Add Holiday</Text>
              </TouchableOpacity>

              <Text style={styles.subHeader}>Holiday List</Text>
              {holidays.map((h) => (
                <View key={h.id} style={styles.card}>
                  <Text style={styles.holidayName}>{h.name}</Text>
                  <Text style={styles.holidayDate}>{format(h.date, "MMM dd, yyyy")}</Text>
                  <Text>{h.type}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteHoliday(h.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={22} color="red" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Settings Tab */}
          {tab === "settings" && (
            <View style={styles.section}>
              <Text style={styles.subHeader}>System Settings</Text>
              {Object.entries(systemSettings).map(([key, value]) =>
                typeof value === "boolean" ? (
                  <View key={key} style={styles.settingRow}>
                    <Text>{key.replace(/([A-Z])/g, " $1")}</Text>
                    <Switch
                      value={value}
                      onValueChange={(val) => handleSettingChange(key, val)}
                    />
                  </View>
                ) : (
                  <View key={key} style={styles.settingRow}>
                    <Text>{key.replace(/([A-Z])/g, " $1")}</Text>
                    <TextInput
                      style={styles.inputSmall}
                      keyboardType="numeric"
                      value={String(value)}
                      onChangeText={(val) =>
                        handleSettingChange(key, parseInt(val) || 0)
                      }
                    />
                  </View>
                )
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// Styles (Expo-friendly)
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff", flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  header: { fontSize: 26, fontWeight: "bold", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginTop: 16, color: "#333" },
  subtitle: { fontSize: 14, color: "#666", marginTop: 8, textAlign: "center" },
  tabs: { flexDirection: "row", justifyContent: "space-around", marginBottom: 16 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  activeTab: { backgroundColor: "#2563EB" },
  tabText: { color: "#333" },
  activeTabText: { color: "#fff" },
  section: { marginBottom: 24 },
  card: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  roleTitle: { fontWeight: "bold", marginBottom: 6 },
  roleList: { flexDirection: "row", flexWrap: "wrap" },
  roleButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 6,
    margin: 3,
  },
  roleButtonActive: { backgroundColor: "#2563EB" },
  roleButtonText: { color: "#333" },
  roleButtonTextActive: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
  },
  addButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  subHeader: { fontSize: 18, fontWeight: "bold", marginVertical: 8 },
  holidayName: { fontWeight: "bold" },
  holidayDate: { color: "#666" },
  deleteButton: { position: "absolute", right: 10, top: 10 },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  inputSmall: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 4,
    width: 60,
    textAlign: "center",
  },
});
