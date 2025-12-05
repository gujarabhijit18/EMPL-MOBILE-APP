// 📂 src/screens/team/TeamManagement.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Card, Button, Avatar } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient"; // ✅ Expo-safe gradient import
import { Ionicons } from "@expo/vector-icons"; // ✅ Expo-safe icon import
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

// Import tab bar visibility
import { useAutoHideTabBarOnScroll } from '../../navigation/tabBarVisibility';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  status: "active" | "inactive";
}

interface Team {
  id: string;
  name: string;
  description: string;
  department: string;
  members: TeamMember[];
}

interface TeamMessage {
  id: string;
  teamId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  type: "message" | "update" | "announcement";
}

const TeamManagement: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([
    {
      id: "1",
      name: "Development Team Alpha",
      description: "Main development team for Product A",
      department: "Engineering",
      members: [
        {
          id: "101",
          name: "Alice Johnson",
          role: "Frontend Developer",
          email: "alice@company.com",
          status: "active",
        },
        {
          id: "102",
          name: "Bob Smith",
          role: "Backend Developer",
          email: "bob@company.com",
          status: "active",
        },
      ],
    },
  ]);
  const navigation = useNavigation<any>();

  const [selectedTab, setSelectedTab] = useState("teams");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isCreateModal, setIsCreateModal] = useState(false);
  const [isAddMemberModal, setIsAddMemberModal] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: "",
    department: "",
    description: "",
  });
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<TeamMessage[]>([
    {
      id: "1",
      teamId: "1",
      senderName: "Alice Johnson",
      message: "Completed feature implementation ✅",
      timestamp: new Date(),
      type: "update",
    },
  ]);

  // Tab bar visibility hook
  const { onScroll, scrollEventThrottle, tabBarVisible, tabBarHeight } = useAutoHideTabBarOnScroll();

  const availableEmployees: TeamMember[] = [
    { id: "201", name: "David Brown", role: "Designer", email: "david@company.com", status: "inactive" },
    { id: "202", name: "Emma Davis", role: "QA Tester", email: "emma@company.com", status: "inactive" },
  ];

  // 🧩 Create Team
  const handleCreateTeam = () => {
    if (!newTeam.name.trim() || !newTeam.department.trim()) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }
    const newT: Team = {
      id: Date.now().toString(),
      name: newTeam.name,
      department: newTeam.department,
      description: newTeam.description,
      members: [],
    };
    setTeams([...teams, newT]);
    setNewTeam({ name: "", department: "", description: "" });
    setIsCreateModal(false);
  };

  // ➕ Add Member
  const handleAddMember = (teamId: string, empId: string) => {
    const emp = availableEmployees.find((e) => e.id === empId);
    if (!emp) return;
    const updated = teams.map((t) =>
      t.id === teamId
        ? { ...t, members: [...t.members, { ...emp, status: "active" } as TeamMember] }
        : t
    );
    setTeams(updated);
    setIsAddMemberModal(false);
  };

  // 💬 Send Message
  const handleSendMessage = () => {
    if (!selectedTeam || !messageInput.trim()) return;
    const newMsg: TeamMessage = {
      id: Date.now().toString(),
      teamId: selectedTeam.id,
      senderName: "You",
      message: messageInput,
      timestamp: new Date(),
      type: "message",
    };
    setMessages([...messages, newMsg]);
    setMessageInput("");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#39549fff' }} edges={['top']}>
      <StatusBar style="dark" />
      <LinearGradient colors={["#39549fff", "#39549fff"]} style={styles.headerGradient}>
        <View style={styles.headerHeroRow}>
          <TouchableOpacity style={styles.backCircle} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" color="#fff" size={20} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Team Management</Text>
            <Text style={styles.headerSubtitle}>Manage teams, members & collaboration</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.contentArea}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: Math.max(32, tabBarVisible ? tabBarHeight + 24 : 32) }}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.cardArea} mode="elevated">
            <View style={styles.statsRow}>
              <StatCard icon="people" label="Total Teams" value={teams.length.toString()} />
              <StatCard
                icon="person-add"
                label="Total Members"
                value={teams.reduce((a, t) => a + t.members.length, 0).toString()}
              />
              <StatCard icon="analytics" label="Active Projects" value="5" />
              <StatCard icon="trending-up" label="Performance" value="92%" />
            </View>
            <View style={styles.tabs}>
              {["teams", "chat", "updates"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tab, selectedTab === t && styles.activeTab]}
                  onPress={() => setSelectedTab(t)}
                >
                  <Text style={[styles.tabText, selectedTab === t && styles.activeTabText]}>
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {selectedTab === 'teams' && (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>Your Teams</Text>
                <Button icon="plus" mode="contained" onPress={() => setIsCreateModal(true)}>
                  Create Team
                </Button>
              </View>

              {teams.map((team) => (
                <Card key={team.id} style={styles.teamCard}>
                  <Card.Title
                    title={team.name}
                    subtitle={team.department}
                    right={() => (
                      <Button compact mode="outlined" onPress={() => setIsAddMemberModal(true)}>
                        Add
                      </Button>
                    )}
                  />
                  <Card.Content>
                    <Text style={styles.desc}>{team.description}</Text>
                    <Text style={styles.memberLabel}>Members ({team.members.length})</Text>
                    {team.members.map((m) => (
                      <View key={m.id} style={styles.memberRow}>
                        <Avatar.Text size={32} label={m.name.charAt(0)} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={{ fontWeight: '600' }}>{m.name}</Text>
                          <Text style={{ color: '#6b7280', fontSize: 12 }}>{m.role}</Text>
                        </View>
                        <Button
                          mode="text"
                          textColor="#ef4444"
                          onPress={() =>
                            setTeams(
                              teams.map((t) =>
                                t.id === team.id
                                  ? { ...t, members: t.members.filter((mem) => mem.id !== m.id) }
                                  : t
                              )
                            )
                          }
                        >
                          Remove
                        </Button>
                      </View>
                    ))}
                    <Button mode="outlined" icon="forum" onPress={() => setSelectedTeam(team)}>
                      Open Chat
                    </Button>
                  </Card.Content>
                </Card>
              ))}
            </>
          )}

          {selectedTab === 'chat' && (
            <View style={styles.chatSection}>
              {selectedTeam ? (
                <Card style={styles.chatCard}>
                  <Card.Title title={`${selectedTeam.name} - Chat`} />
                  <Card.Content>
                    <FlatList
                      data={messages.filter((m) => m.teamId === selectedTeam.id)}
                      keyExtractor={(i) => i.id}
                      renderItem={({ item }) => (
                        <View
                          style={[
                            styles.messageBubble,
                            item.type === 'announcement' && styles.announcement,
                            item.type === 'update' && styles.update,
                          ]}
                        >
                          <Text style={styles.sender}>{item.senderName}</Text>
                          <Text>{item.message}</Text>
                          <Text style={styles.timestamp}>{item.timestamp.toLocaleTimeString()}</Text>
                        </View>
                      )}
                    />
                    <View style={styles.messageInputRow}>
                      <TextInput
                        placeholder="Type a message..."
                        style={styles.input}
                        value={messageInput}
                        onChangeText={setMessageInput}
                      />
                      <Button icon="send" mode="contained" onPress={handleSendMessage}>
                        Send
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              ) : (
                <Text style={{ textAlign: 'center', color: '#6b7280', marginTop: 20 }}>
                  Select a team from "Teams" tab to start chatting.
                </Text>
              )}
            </View>
          )}

          {selectedTab === 'updates' && (
            <Card style={{ margin: 10 }}>
              <Card.Title title="Recent Work Updates" />
              <Card.Content>
                {messages
                  .filter((m) => m.type === 'update')
                  .map((m) => (
                    <View key={m.id} style={styles.updateCard}>
                      <Text style={styles.sender}>{m.senderName}</Text>
                      <Text>{m.message}</Text>
                      <Text style={styles.timestamp}>{m.timestamp.toLocaleDateString()}</Text>
                    </View>
                  ))}
              </Card.Content>
            </Card>
          )}
        </ScrollView>
      </View>

      {/* 🏗 Create Team Modal */}
      <Modal visible={isCreateModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create New Team</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Team Name"
              value={newTeam.name}
              onChangeText={(t) => setNewTeam({ ...newTeam, name: t })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Department"
              value={newTeam.department}
              onChangeText={(t) => setNewTeam({ ...newTeam, department: t })}
            />
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="Description"
              multiline
              value={newTeam.description}
              onChangeText={(t) => setNewTeam({ ...newTeam, description: t })}
            />
            <View style={styles.modalButtons}>
              <Button onPress={() => setIsCreateModal(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleCreateTeam}>
                Create
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ➕ Add Member Modal */}
      <Modal visible={isAddMemberModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Team Member</Text>
            {availableEmployees.map((emp) => (
              <View key={emp.id} style={styles.memberSelectRow}>
                <View>
                  <Text style={{ fontWeight: "600" }}>{emp.name}</Text>
                  <Text style={{ fontSize: 12, color: "#6b7280" }}>{emp.role}</Text>
                </View>
                <Button onPress={() => handleAddMember(teams[0].id, emp.id)}>
                  Add
                </Button>
              </View>
            ))}
            <Button onPress={() => setIsAddMemberModal(false)}>Close</Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TeamManagement;

// 🧩 StatCard Component
const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <View style={styles.statCard}>
    <Ionicons name={icon as any} size={22} color="#2563eb" />
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

// 🎨 Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  headerGradient: {
    paddingVertical: 24,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  contentArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -20,
    paddingTop: 20,
  },
  cardArea: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    elevation: 4,
  },
  scrollWrapper: { flex: 1, marginTop: 16 },
  headerHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#e0f2fe',
    fontSize: 14,
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  createIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontWeight: '600',
    color: '#0f172a',
  },
  statsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", margin: 10 },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "47%",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
    elevation: 2,
    gap: 10,
  },
  statLabel: { fontSize: 12, color: "#6b7280" },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  tabs: { flexDirection: "row", justifyContent: "space-around", marginVertical: 10 },
  tab: { padding: 10 },
  activeTab: { borderBottomWidth: 2, borderColor: "#2563eb" },
  tabText: { fontSize: 14, color: "#6b7280" },
  activeTabText: { color: "#2563eb", fontWeight: "bold" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", margin: 10 },
  sectionTitle: { fontWeight: "600", fontSize: 16 },
  teamCard: { margin: 10, borderRadius: 12, elevation: 2 },
  desc: { color: "#6b7280", marginBottom: 8 },
  memberLabel: { fontWeight: "600", marginBottom: 5 },
  memberRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  chatSection: { padding: 10 },
  chatCard: { borderRadius: 12 },
  messageBubble: { backgroundColor: "#f3f4f6", borderRadius: 8, padding: 10, marginVertical: 4 },
  announcement: { backgroundColor: "#dbeafe" },
  update: { backgroundColor: "#dcfce7" },
  sender: { fontWeight: "bold", fontSize: 13 },
  timestamp: { fontSize: 10, color: "#9ca3af", marginTop: 2 },
  messageInputRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
  },
  updateCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
  },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center" },
  modalCard: { backgroundColor: "#fff", margin: 20, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 8,
    marginVertical: 5,
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  memberSelectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 8,
  },
});
