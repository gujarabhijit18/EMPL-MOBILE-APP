import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type OfficeTiming = {
  id: string;
  department: string | null;
  start_time: string;
  end_time: string;
  check_in_grace_minutes: number;
  check_out_grace_minutes: number;
};

const { width } = Dimensions.get("window");

const OfficeHoursScreen = () => {
  const [officeFormLoading, setOfficeFormLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<"global" | "department" | "schedules">("global");

  const [globalTimingForm, setGlobalTimingForm] = useState({
    startTime: "10:00",
    endTime: "19:00",
    checkInGrace: 15,
    checkOutGrace: 15,
  });

  const [departmentTimingForm, setDepartmentTimingForm] = useState({
    department: "",
    startTime: "10:00",
    endTime: "19:00",
    checkInGrace: 15,
    checkOutGrace: 15,
  });

  const [departments] = useState([
    "Engineering",
    "Finance",
    "HR",
    "Marketing",
    "Operations",
    "Sales",
  ]);

  const [officeTimings, setOfficeTimings] = useState<OfficeTiming[]>([]);

  // Load office timings from backend on component mount
  useEffect(() => {
    loadOfficeTimings();
  }, []);

  const loadOfficeTimings = async () => {
    try {
      setIsLoadingData(true);
      const { apiService } = await import("../../lib/api");
      
      const timings = await apiService.getOfficeTimings();
      console.log("📥 Loaded office timings:", timings);
      
      if (timings && timings.length > 0) {
        setOfficeTimings(timings.map((t: any) => ({
          id: t.id.toString(),
          department: t.department || null,
          start_time: t.start_time,
          end_time: t.end_time,
          check_in_grace_minutes: t.check_in_grace_minutes,
          check_out_grace_minutes: t.check_out_grace_minutes,
        })));

        // Set global timing form from loaded data
        const globalTiming = timings.find((t: any) => !t.department);
        if (globalTiming) {
          setGlobalTimingForm({
            startTime: (globalTiming.start_time || "").slice(0, 5),
            endTime: (globalTiming.end_time || "").slice(0, 5),
            checkInGrace: globalTiming.check_in_grace_minutes ?? 15,
            checkOutGrace: globalTiming.check_out_grace_minutes ?? 15,
          });
        }
      } else {
        // No timings found, use defaults
        setOfficeTimings([
          {
            id: "global",
            department: null,
            start_time: "10:00",
            end_time: "19:00",
            check_in_grace_minutes: 15,
            check_out_grace_minutes: 15,
          },
        ]);
      }
    } catch (error: any) {
      console.error("❌ Error loading office timings:", error);
      // Use default values on error
      setOfficeTimings([
        {
          id: "global",
          department: null,
          start_time: "10:00",
          end_time: "19:00",
          check_in_grace_minutes: 15,
          check_out_grace_minutes: 15,
        },
      ]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleGlobalTimingSave = async () => {
    try {
      setOfficeFormLoading(true);
      
      // Import API service
      const { apiService } = await import("../../lib/api");
      
      // Save to backend
      const response = await apiService.upsertOfficeTiming({
        department: null,
        start_time: globalTimingForm.startTime,
        end_time: globalTimingForm.endTime,
        check_in_grace_minutes: globalTimingForm.checkInGrace,
        check_out_grace_minutes: globalTimingForm.checkOutGrace,
      });

      // Update local state
      setOfficeTimings((prev) => {
        const existingIndex = prev.findIndex((t) => !t.department);
        const updatedEntry = {
          id: response.id.toString(),
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

      Alert.alert("✅ Saved", "Global office hours updated successfully. All employees will use these timings for check-in/check-out validation.");
    } catch (error: any) {
      Alert.alert("❌ Error", error.message || "Failed to save global office hours");
      console.error("Error saving global timing:", error);
    } finally {
      setOfficeFormLoading(false);
    }
  };

  const handleDepartmentTimingSave = async () => {
    if (!departmentTimingForm.department.trim()) {
      Alert.alert("⚠️ Required", "Please select or enter a department name");
      return;
    }

    try {
      setOfficeFormLoading(true);
      
      // Import API service
      const { apiService } = await import("../../lib/api");
      
      // Save to backend
      const response = await apiService.upsertOfficeTiming({
        department: departmentTimingForm.department.trim(),
        start_time: departmentTimingForm.startTime,
        end_time: departmentTimingForm.endTime,
        check_in_grace_minutes: departmentTimingForm.checkInGrace,
        check_out_grace_minutes: departmentTimingForm.checkOutGrace,
      });

      // Update local state
      setOfficeTimings((prev) => {
        const existingIndex = prev.findIndex(
          (t) =>
            (t.department || "").toLowerCase() ===
            departmentTimingForm.department.trim().toLowerCase()
        );

        const newEntry = {
          id: response.id.toString(),
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

      Alert.alert("✅ Saved", `Office hours for ${departmentTimingForm.department} updated successfully. Employees in this department will use these timings for check-in/check-out validation.`);
    } catch (error: any) {
      Alert.alert("❌ Error", error.message || "Failed to save department office hours");
      console.error("Error saving department timing:", error);
    } finally {
      setOfficeFormLoading(false);
    }
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
          onPress: async () => {
            try {
              setOfficeFormLoading(true);
              const { apiService } = await import("../../lib/api");
              
              // Delete from backend
              await apiService.deleteOfficeTiming(parseInt(timing.id));
              
              // Update local state
              setOfficeTimings((prev) =>
                prev.filter((t) => t.id !== timing.id)
              );
              
              Alert.alert("✅ Deleted", `Office hours for ${timing.department} have been removed.`);
            } catch (error: any) {
              Alert.alert("❌ Error", error.message || "Failed to delete office hours");
              console.error("Error deleting timing:", error);
            } finally {
              setOfficeFormLoading(false);
            }
          },
        },
      ]
    );
  };

  const globalTiming = officeTimings.find((t) => !t.department);
  const departmentTimings = officeTimings.filter((t) => t.department);
  const departmentCount = departmentTimings.length;
  const totalRules = officeTimings.length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Quick Stats */}
      <View style={styles.quickStatsContainer}>
        <View style={styles.quickStat}>
          <LinearGradient colors={["#3b82f6", "#1e40af"]} style={styles.quickStatGradient}>
            <View style={styles.quickStatIconBg}>
              <Ionicons name="play-circle-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.quickStatLabel}>Default Start</Text>
            <Text style={styles.quickStatValue}>{globalTiming?.start_time || "10:00"}</Text>
          </LinearGradient>
        </View>

        <View style={styles.quickStat}>
          <LinearGradient colors={["#10b981", "#047857"]} style={styles.quickStatGradient}>
            <View style={styles.quickStatIconBg}>
              <Ionicons name="stop-circle-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.quickStatLabel}>Default End</Text>
            <Text style={styles.quickStatValue}>{globalTiming?.end_time || "19:00"}</Text>
          </LinearGradient>
        </View>

        <View style={styles.quickStat}>
          <LinearGradient colors={["#f59e0b", "#b45309"]} style={styles.quickStatGradient}>
            <View style={styles.quickStatIconBg}>
              <Ionicons name="hourglass-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.quickStatLabel}>Check-in Grace</Text>
            <Text style={styles.quickStatValue}>{globalTiming?.check_in_grace_minutes || 15} mins</Text>
          </LinearGradient>
        </View>

        <View style={styles.quickStat}>
          <LinearGradient colors={["#ec4899", "#be185d"]} style={styles.quickStatGradient}>
            <View style={styles.quickStatIconBg}>
              <Ionicons name="alert-circle-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.quickStatLabel}>Overrides</Text>
            <Text style={styles.quickStatValue}>{departmentCount}</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "global" && styles.tabActive]}
          onPress={() => setActiveTab("global")}
        >
          <Ionicons name="globe-outline" size={18} color={activeTab === "global" ? "#fff" : "#3b82f6"} />
          <Text style={[styles.tabText, activeTab === "global" && styles.tabTextActive]}>Global</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "department" && styles.tabActive]}
          onPress={() => setActiveTab("department")}
        >
          <Ionicons name="business-outline" size={18} color={activeTab === "department" ? "#fff" : "#3b82f6"} />
          <Text style={[styles.tabText, activeTab === "department" && styles.tabTextActive]}>Departments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "schedules" && styles.tabActive]}
          onPress={() => setActiveTab("schedules")}
        >
          <Ionicons name="list-outline" size={18} color={activeTab === "schedules" ? "#fff" : "#3b82f6"} />
          <Text style={[styles.tabText, activeTab === "schedules" && styles.tabTextActive]}>Schedules</Text>
        </TouchableOpacity>
      </View>

      {/* Global Office Hours Tab */}
      {activeTab === "global" && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="globe-outline" size={20} color="#fff" />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Global Office Hours</Text>
              <Text style={styles.cardDescription}>Default schedule applied to every department unless specifically overridden.</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.grid}>
            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldIconBg}>
                  <Ionicons name="play-circle-outline" size={14} color="#3b82f6" />
                </View>
                <Text style={styles.label}>Start Time</Text>
              </View>
              <TextInput
                placeholder="HH:MM"
                placeholderTextColor="#d1d5db"
                value={globalTimingForm.startTime}
                onChangeText={(text) =>
                  setGlobalTimingForm((prev) => ({ ...prev, startTime: text }))
                }
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldIconBg}>
                  <Ionicons name="stop-circle-outline" size={14} color="#10b981" />
                </View>
                <Text style={styles.label}>End Time</Text>
              </View>
              <TextInput
                placeholder="HH:MM"
                placeholderTextColor="#d1d5db"
                value={globalTimingForm.endTime}
                onChangeText={(text) =>
                  setGlobalTimingForm((prev) => ({ ...prev, endTime: text }))
                }
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldIconBg}>
                  <Ionicons name="hourglass-outline" size={14} color="#f59e0b" />
                </View>
                <Text style={styles.label}>Check-in Grace</Text>
              </View>
              <TextInput
                placeholder="mins"
                placeholderTextColor="#d1d5db"
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
              <View style={styles.fieldHeader}>
                <View style={styles.fieldIconBg}>
                  <Ionicons name="alert-circle-outline" size={14} color="#ec4899" />
                </View>
                <Text style={styles.label}>Check-out Grace</Text>
              </View>
              <TextInput
                placeholder="mins"
                placeholderTextColor="#d1d5db"
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
              style={[styles.buttonPrimary, officeFormLoading && styles.buttonDisabled]}
            >
              <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.buttonGradient}>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={styles.buttonPrimaryText}>{officeFormLoading ? "Saving..." : "Save Settings"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Department-specific Office Hours Tab */}
      {activeTab === "department" && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: "#8b5cf6" }]}>
              <Ionicons name="business-outline" size={20} color="#fff" />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Department Overrides</Text>
              <Text style={styles.cardDescription}>Override the global schedule for particular departments or create new ones.</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.departmentSection}>
            <View style={styles.fieldHeader}>
              <View style={styles.fieldIconBg}>
                <Ionicons name="folder-outline" size={14} color="#8b5cf6" />
              </View>
              <Text style={styles.label}>Select Department</Text>
            </View>
            <TextInput
              placeholder="Type or select a department"
              placeholderTextColor="#d1d5db"
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
              <>
                <Text style={styles.chipsLabel}>Quick Select:</Text>
                <View style={styles.departmentChips}>
                  {departments.map((dept) => {
                    const isConfigured = officeTimings.some(
                      (entry) =>
                        (entry.department || "").toLowerCase() ===
                        dept.toLowerCase()
                    );
                    return (
                      <TouchableOpacity
                        key={dept}
                        style={[styles.chip, isConfigured && styles.chipActive]}
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
                        <Text style={[styles.chipText, isConfigured && styles.chipTextActive]}>
                          {dept}
                        </Text>
                        {isConfigured && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          <View style={styles.sectionDivider} />

          <View style={styles.timingSection}>
            <Text style={styles.sectionTitle}>Timing Configuration</Text>
            <View style={styles.grid}>
              <View style={styles.field}>
                <View style={styles.fieldHeader}>
                  <View style={styles.fieldIconBg}>
                    <Ionicons name="play-circle-outline" size={14} color="#3b82f6" />
                  </View>
                  <Text style={styles.label}>Start Time</Text>
                </View>
                <TextInput
                  placeholder="HH:MM"
                  placeholderTextColor="#d1d5db"
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
                <View style={styles.fieldHeader}>
                  <View style={styles.fieldIconBg}>
                    <Ionicons name="stop-circle-outline" size={14} color="#10b981" />
                  </View>
                  <Text style={styles.label}>End Time</Text>
                </View>
                <TextInput
                  placeholder="HH:MM"
                  placeholderTextColor="#d1d5db"
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
                <View style={styles.fieldHeader}>
                  <View style={styles.fieldIconBg}>
                    <Ionicons name="hourglass-outline" size={14} color="#f59e0b" />
                  </View>
                  <Text style={styles.label}>Check-in Grace</Text>
                </View>
                <TextInput
                  placeholder="mins"
                  placeholderTextColor="#d1d5db"
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
                <View style={styles.fieldHeader}>
                  <View style={styles.fieldIconBg}>
                    <Ionicons name="alert-circle-outline" size={14} color="#ec4899" />
                  </View>
                  <Text style={styles.label}>Check-out Grace</Text>
                </View>
                <TextInput
                  placeholder="mins"
                  placeholderTextColor="#d1d5db"
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
          </View>

          <View style={styles.departmentActionsRow}>
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
              <Ionicons name="refresh-outline" size={16} color="#6b7280" />
              <Text style={styles.buttonOutlineText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDepartmentTimingSave}
              disabled={officeFormLoading || !departmentTimingForm.department.trim()}
              style={[styles.buttonPrimary, (officeFormLoading || !departmentTimingForm.department.trim()) && styles.buttonDisabled]}
            >
              <LinearGradient colors={["#8b5cf6", "#7c3aed"]} style={styles.buttonGradient}>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={styles.buttonPrimaryText}>{officeFormLoading ? "Saving..." : "Save Timing"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Configured Schedules Tab */}
      {activeTab === "schedules" && (
        <View style={styles.card}>
          <View style={[styles.cardHeader, { justifyContent: "space-between" }]}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", flex: 1 }}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: "#10b981" }]}>
                <Ionicons name="list-outline" size={20} color="#fff" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Configured Schedules</Text>
                <Text style={styles.cardDescription}>Overview of current global and department-specific office timings.</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={loadOfficeTimings}
              disabled={isLoadingData}
              style={{ marginLeft: 12 }}
            >
              <View style={styles.refreshButton}>
                <Ionicons name="refresh-outline" size={18} color="#10b981" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {officeTimings.length > 0 ? (
            <View style={styles.schedulesContainer}>
              {officeTimings.map((timing, index) => {
                const isGlobalTiming = !timing.department;
                return (
                  <View key={timing.id} style={styles.scheduleCard}>
                    <View style={styles.scheduleHeader}>
                      <View style={[styles.scheduleBadge, isGlobalTiming && styles.scheduleBadgeGlobal]}>
                        <Ionicons name={isGlobalTiming ? "globe-outline" : "business-outline"} size={16} color="#fff" />
                      </View>
                      <View style={styles.scheduleTitle}>
                        <Text style={styles.scheduleTarget}>
                          {isGlobalTiming ? "GLOBAL SCHEDULE" : "DEPARTMENT OVERRIDE"}
                        </Text>
                        <Text style={styles.scheduleName}>
                          {isGlobalTiming ? "All Departments" : timing.department}
                        </Text>
                      </View>
                      <View style={styles.scheduleActions}>
                        {!isGlobalTiming && (
                          <TouchableOpacity
                            style={styles.scheduleActionBtn}
                            onPress={() => handleDepartmentTimingDelete(timing)}
                            disabled={officeFormLoading}
                          >
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={styles.scheduleDetails}>
                      <View style={styles.scheduleDetailRow}>
                        <View style={styles.detailItem}>
                          <Ionicons name="play-circle-outline" size={14} color="#3b82f6" />
                          <Text style={styles.detailLabel}>Start</Text>
                          <Text style={styles.detailValue}>{(timing.start_time || "").slice(0, 5)}</Text>
                        </View>

                        <View style={styles.detailDivider} />

                        <View style={styles.detailItem}>
                          <Ionicons name="stop-circle-outline" size={14} color="#10b981" />
                          <Text style={styles.detailLabel}>End</Text>
                          <Text style={styles.detailValue}>{(timing.end_time || "").slice(0, 5)}</Text>
                        </View>

                        <View style={styles.detailDivider} />

                        <View style={styles.detailItem}>
                          <Ionicons name="hourglass-outline" size={14} color="#f59e0b" />
                          <Text style={styles.detailLabel}>Grace In</Text>
                          <Text style={styles.detailValue}>{timing.check_in_grace_minutes}m</Text>
                        </View>

                        <View style={styles.detailDivider} />

                        <View style={styles.detailItem}>
                          <Ionicons name="alert-circle-outline" size={14} color="#ec4899" />
                          <Text style={styles.detailLabel}>Grace Out</Text>
                          <Text style={styles.detailValue}>{timing.check_out_grace_minutes}m</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No office timings configured yet.</Text>
              <Text style={styles.emptyStateSubtext}>Create a global schedule to get started.</Text>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

export default OfficeHoursScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Header Card
  headerCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
    lineHeight: 22,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  statBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 44,
    alignItems: "center",
  },
  statBadgeText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  // Quick Stats
  quickStatsContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickStat: {
    width: "48%",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 10,
  },
  quickStatGradient: {
    padding: 11,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  quickStatIconBg: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  quickStatLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    textAlign: "center",
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: "#3b82f6",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  cardDescription: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 14,
  },

  // Grid & Fields
  grid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  field: {
    width: "48%",
    marginBottom: 0,
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  fieldIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#f9fafb",
    fontWeight: "500",
  },

  // Buttons
  actionsRight: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  actionsRightRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
  },
  departmentActionsRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  buttonPrimary: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 8,
  },
  buttonPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonOutline: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  buttonOutlineText: {
    color: "#6b7280",
    fontWeight: "600",
    fontSize: 13,
  },

  // Department Section
  departmentSection: {
    marginBottom: 14,
  },
  chipsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    marginTop: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  departmentChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 6,
  },
  chipActive: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  chipText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#fff",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 14,
  },
  timingSection: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  schedulesContainer: {
    marginTop: 12,
  },

  // Schedule Cards
  scheduleCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  scheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  scheduleBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  scheduleBadgeGlobal: {
    backgroundColor: "#10b981",
  },
  scheduleTitle: {
    flex: 1,
  },
  scheduleTarget: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  scheduleName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  scheduleActions: {
    flexDirection: "row",
    gap: 8,
  },
  scheduleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  scheduleDetails: {
    backgroundColor: "#f9fafb",
    borderRadius: 11,
    padding: 12,
  },
  scheduleDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  detailLabel: {
    fontSize: 10,
    color: "#9ca3af",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  detailDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 8,
  },

  // Empty State
  emptyState: {
    marginTop: 32,
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 6,
  },
});
