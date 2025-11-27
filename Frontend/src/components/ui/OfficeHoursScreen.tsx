// OfficeHoursScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

type OfficeTiming = {
  id: string;
  department: string | null;
  start_time: string;
  end_time: string;
  check_in_grace_minutes: number;
  check_out_grace_minutes: number;
};

const OfficeHoursScreen = () => {
  const [officeFormLoading, setOfficeFormLoading] = useState(false);

  const [globalTimingForm, setGlobalTimingForm] = useState({
    startTime: "09:30",
    endTime: "18:30",
    checkInGrace: 15,
    checkOutGrace: 10,
  });

  const [departmentTimingForm, setDepartmentTimingForm] = useState({
    department: "",
    startTime: "09:30",
    endTime: "18:30",
    checkInGrace: 15,
    checkOutGrace: 10,
  });

  const [departments] = useState([
    "Engineering",
    "HR",
    "Sales",
    "Support",
    "Operations",
  ]);

  const [officeTimings, setOfficeTimings] = useState<OfficeTiming[]>([
    {
      id: "global",
      department: null,
      start_time: "09:30",
      end_time: "18:30",
      check_in_grace_minutes: 15,
      check_out_grace_minutes: 10,
    },
  ]);

  const handleGlobalTimingSave = () => {
    setOfficeFormLoading(true);

    setOfficeTimings((prev) => {
      const existingIndex = prev.findIndex((t) => !t.department);
      const updatedEntry = {
        id: "global",
        department: null,
        start_time: globalTimingForm.startTime,
        end_time: globalTimingForm.endTime,
        check_in_grace_minutes: globalTimingForm.checkInGrace,
        check_out_grace_minutes: globalTimingForm.checkOutGrace,
      };

      if (existingIndex !== -1) {
        const copy = [...prev];
        copy[existingIndex] = updatedEntry;
        return copy;
      }
      return [...prev, updatedEntry];
    });

    setOfficeFormLoading(false);
    Alert.alert("Saved", "Global office hours updated.");
  };

  const handleDepartmentTimingSave = () => {
    if (!departmentTimingForm.department.trim()) return;

    setOfficeFormLoading(true);

    setOfficeTimings((prev) => {
      const existingIndex = prev.findIndex(
        (t) =>
          (t.department || "").toLowerCase() ===
          departmentTimingForm.department.trim().toLowerCase()
      );

      const newEntry = {
        id: departmentTimingForm.department.trim(),
        department: departmentTimingForm.department.trim(),
        start_time: departmentTimingForm.startTime,
        end_time: departmentTimingForm.endTime,
        check_in_grace_minutes: departmentTimingForm.checkInGrace,
        check_out_grace_minutes: departmentTimingForm.checkOutGrace,
      };

      if (existingIndex !== -1) {
        const copy = [...prev];
        copy[existingIndex] = newEntry;
        return copy;
      }
      return [...prev, newEntry];
    });

    setOfficeFormLoading(false);
    Alert.alert("Saved", "Department office hours updated.");
  };

  const handleDepartmentTimingEdit = (timing: OfficeTiming | undefined) => {
    if (!timing) return;
    setDepartmentTimingForm({
      department: timing.department || "",
      startTime: (timing.start_time || "").slice(0, 5),
      endTime: (timing.end_time || "").slice(0, 5),
      checkInGrace: timing.check_in_grace_minutes ?? 0,
      checkOutGrace: timing.check_out_grace_minutes ?? 0,
    });
  };

  const handleDepartmentTimingDelete = (timing: OfficeTiming) => {
    Alert.alert(
      "Remove Timing",
      `Remove office hours for ${timing.department}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setOfficeFormLoading(true);
            setOfficeTimings((prev) =>
              prev.filter((t) => t.id !== timing.id)
            );
            setOfficeFormLoading(false);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Global Office Hours */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Global Office Hours</Text>
        <Text style={styles.cardDescription}>
          Default schedule applied to every department unless specifically
          overridden.
        </Text>

        <View style={styles.grid}>
          <View style={styles.field}>
            <Text style={styles.label}>Start Time</Text>
            <TextInput
              placeholder="HH:MM"
              value={globalTimingForm.startTime}
              onChangeText={(text) =>
                setGlobalTimingForm((prev) => ({ ...prev, startTime: text }))
              }
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>End Time</Text>
            <TextInput
              placeholder="HH:MM"
              value={globalTimingForm.endTime}
              onChangeText={(text) =>
                setGlobalTimingForm((prev) => ({ ...prev, endTime: text }))
              }
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Check-in Grace (minutes)</Text>
            <TextInput
              keyboardType="numeric"
              value={String(globalTimingForm.checkInGrace)}
              onChangeText={(text) =>
                setGlobalTimingForm((prev) => ({
                  ...prev,
                  checkInGrace: Number(text) || 0,
                }))
              }
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Check-out Grace (minutes)</Text>
            <TextInput
              keyboardType="numeric"
              value={String(globalTimingForm.checkOutGrace)}
              onChangeText={(text) =>
                setGlobalTimingForm((prev) => ({
                  ...prev,
                  checkOutGrace: Number(text) || 0,
                }))
              }
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.actionsRight}>
          <TouchableOpacity
            onPress={handleGlobalTimingSave}
            disabled={officeFormLoading}
            style={[
              styles.buttonPrimary,
              officeFormLoading && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonPrimaryText}>
              {officeFormLoading ? "Saving..." : "Save Global Settings"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Department-specific Office Hours */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Department-specific Office Hours</Text>
        <Text style={styles.cardDescription}>
          Override the global schedule for particular departments.
        </Text>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.label}>Department</Text>
          <TextInput
            placeholder="e.g., Engineering"
            value={departmentTimingForm.department}
            onChangeText={(text) =>
              setDepartmentTimingForm((prev) => ({
                ...prev,
                department: text,
              }))
            }
            style={styles.input}
          />

          {departments.length > 0 && (
            <View style={styles.departmentChips}>
              {departments.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={styles.chip}
                  onPress={() => {
                    const existing = officeTimings.find(
                      (entry) =>
                        (entry.department || "").toLowerCase() ===
                        dept.toLowerCase()
                    );
                    if (existing) {
                      handleDepartmentTimingEdit(existing);
                    } else {
                      setDepartmentTimingForm((prev) => ({
                        ...prev,
                        department: dept,
                      }));
                    }
                  }}
                >
                  <Text style={styles.chipText}>{dept}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.grid}>
          <View style={styles.field}>
            <Text style={styles.label}>Start Time</Text>
            <TextInput
              placeholder="HH:MM"
              value={departmentTimingForm.startTime}
              onChangeText={(text) =>
                setDepartmentTimingForm((prev) => ({
                  ...prev,
                  startTime: text,
                }))
              }
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>End Time</Text>
            <TextInput
              placeholder="HH:MM"
              value={departmentTimingForm.endTime}
              onChangeText={(text) =>
                setDepartmentTimingForm((prev) => ({
                  ...prev,
                  endTime: text,
                }))
              }
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Check-in Grace (minutes)</Text>
            <TextInput
              keyboardType="numeric"
              value={String(departmentTimingForm.checkInGrace)}
              onChangeText={(text) =>
                setDepartmentTimingForm((prev) => ({
                  ...prev,
                  checkInGrace: Number(text) || 0,
                }))
              }
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Check-out Grace (minutes)</Text>
            <TextInput
              keyboardType="numeric"
              value={String(departmentTimingForm.checkOutGrace)}
              onChangeText={(text) =>
                setDepartmentTimingForm((prev) => ({
                  ...prev,
                  checkOutGrace: Number(text) || 0,
                }))
              }
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.actionsRightRow}>
          <TouchableOpacity
            style={styles.buttonOutline}
            onPress={() =>
              setDepartmentTimingForm({
                department: "",
                startTime: globalTimingForm.startTime,
                endTime: globalTimingForm.endTime,
                checkInGrace: globalTimingForm.checkInGrace,
                checkOutGrace: globalTimingForm.checkOutGrace,
              })
            }
          >
            <Text style={styles.buttonOutlineText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDepartmentTimingSave}
            disabled={
              officeFormLoading || !departmentTimingForm.department.trim()
            }
            style={[
              styles.buttonPrimary,
              (officeFormLoading ||
                !departmentTimingForm.department.trim()) &&
                styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonPrimaryText}>
              {officeFormLoading ? "Saving..." : "Save Department Timing"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Configured Schedules */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Configured Schedules</Text>
        <Text style={styles.cardDescription}>
          Overview of current global and department-specific office timings.
        </Text>

        {officeTimings.length > 0 ? (
          <View style={{ marginTop: 16 }}>
            {officeTimings.map((timing) => {
              const isGlobalTiming = !timing.department;
              return (
                <View key={timing.id} style={styles.rowCard}>
                  <Text style={styles.rowTarget}>
                    {isGlobalTiming ? "All Departments" : timing.department}
                  </Text>

                  <View style={styles.rowDetails}>
                    <Text style={styles.rowText}>
                      Start: {(timing.start_time || "").slice(0, 5)}
                    </Text>
                    <Text style={styles.rowText}>
                      End: {(timing.end_time || "").slice(0, 5)}
                    </Text>
                    <Text style={styles.rowText}>
                      Check-in Grace: {timing.check_in_grace_minutes} mins
                    </Text>
                    <Text style={styles.rowText}>
                      Check-out Grace: {timing.check_out_grace_minutes} mins
                    </Text>
                  </View>

                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      style={styles.buttonSmallOutline}
                      onPress={() => handleDepartmentTimingEdit(timing)}
                    >
                      <Text style={styles.buttonOutlineText}>Edit</Text>
                    </TouchableOpacity>

                    {!isGlobalTiming && (
                      <TouchableOpacity
                        style={styles.buttonSmallGhost}
                        onPress={() => handleDepartmentTimingDelete(timing)}
                        disabled={officeFormLoading}
                      >
                        <Text style={styles.buttonDestructiveText}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No office timings configured yet.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default OfficeHoursScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F3F4F6",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: "#6B7280",
  },
  grid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  field: {
    width: "48%",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: "#FFFFFF",
  },
  actionsRight: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  actionsRightRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  buttonPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },
  buttonPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonOutline: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginRight: 8,
  },
  buttonOutlineText: {
    color: "#111827",
    fontWeight: "500",
    fontSize: 14,
  },
  buttonSmallOutline: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginRight: 8,
  },
  buttonSmallGhost: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  buttonDestructiveText: {
    color: "#DC2626",
    fontWeight: "500",
    fontSize: 14,
  },
  departmentChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginRight: 6,
    marginBottom: 6,
  },
  chipText: {
    fontSize: 12,
    color: "#111827",
  },
  rowCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#F9FAFB",
  },
  rowTarget: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  rowDetails: {
    marginBottom: 8,
  },
  rowText: {
    fontSize: 13,
    color: "#4B5563",
  },
  rowActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  emptyState: {
    marginTop: 16,
    padding: 16,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
});
