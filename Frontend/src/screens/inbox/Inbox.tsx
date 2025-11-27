import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons"; // ✅ Expo-safe Ionicons
import { format } from "date-fns";
import { Avatar, Card, Button, Chip } from "react-native-paper";

// ✅ Message Interface
interface Message {
  id: string;
  from: string;
  subject: string;
  content: string;
  timestamp: Date;
  read: boolean;
  starred: boolean;
  type: "message" | "notification" | "alert" | "announcement";
  priority: "low" | "medium" | "high";
  attachments?: string[];
}

export default function Inbox() {
  const [filter, setFilter] = useState<"all" | "unread" | "starred" | "alerts">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Message | null>(null);

  // ✅ Mock local messages (offline)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      from: "HR Department",
      subject: "New Employee Onboarding Request",
      content:
        "We have 3 new employees joining next Monday. Please review their access permissions and setup.",
      timestamp: new Date(2025, 10, 3, 10, 30),
      read: false,
      starred: true,
      type: "message",
      priority: "high",
      attachments: ["onboarding_checklist.pdf"],
    },
    {
      id: "2",
      from: "System",
      subject: "Monthly Performance Report Available",
      content:
        "The monthly performance report for October is ready with key highlights and trends.",
      timestamp: new Date(2025, 10, 2, 8, 0),
      read: true,
      starred: false,
      type: "notification",
      priority: "medium",
    },
    {
      id: "3",
      from: "Manager - Sales",
      subject: "Leave Policy Clarification",
      content: "Need clarification on new leave policy for team leads.",
      timestamp: new Date(2025, 9, 29, 14, 30),
      read: true,
      starred: false,
      type: "message",
      priority: "low",
    },
    {
      id: "4",
      from: "System",
      subject: "Security Alert: Failed Login Attempts",
      content:
        "Detected 5 failed login attempts for user EMP456. The account has been locked for security.",
      timestamp: new Date(2025, 9, 28, 11, 15),
      read: false,
      starred: false,
      type: "alert",
      priority: "high",
    },
  ]);

  // ✅ Filters
  const filtered = messages.filter((msg) => {
    const q = search.toLowerCase();
    const matches =
      msg.subject.toLowerCase().includes(q) ||
      msg.from.toLowerCase().includes(q) ||
      msg.content.toLowerCase().includes(q);

    if (filter === "unread") return matches && !msg.read;
    if (filter === "starred") return matches && msg.starred;
    if (filter === "alerts") return matches && msg.type === "alert";
    return matches;
  });

  // ✅ Message Actions
  const markAsRead = (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  };

  const toggleStar = (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)));
  };

  const deleteMessage = (id: string) => {
    Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setMessages((prev) => prev.filter((m) => m.id !== id));
          setSelected(null);
        },
      },
    ]);
  };

  const archiveMessage = (id: string) => {
    Alert.alert("Archived", "Message moved to archive.");
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setSelected(null);
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top']}>
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Inbox ({unreadCount} new)</Text>

      {/* 🔍 Search Bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search messages..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* 🗂️ Filter Tabs */}
      <View style={styles.tabs}>
        {["all", "unread", "starred", "alerts"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setFilter(tab as any)}
            style={[styles.tab, filter === tab && { backgroundColor: "#4F46E5" }]}
          >
            <Text style={[styles.tabText, filter === tab && { color: "white" }]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 📬 Message List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={{ marginVertical: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              setSelected(item);
              markAsRead(item.id);
            }}
            style={[
              styles.messageCard,
              selected?.id === item.id && { backgroundColor: "#E0E7FF" },
            ]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text
                style={[
                  styles.messageFrom,
                  !item.read && { fontWeight: "700", color: "#111" },
                ]}
              >
                {item.from}
              </Text>
              <TouchableOpacity onPress={() => toggleStar(item.id)}>
                <Ionicons
                  name={item.starred ? "star" : "star-outline"}
                  size={18}
                  color={item.starred ? "#FACC15" : "#999"}
                />
              </TouchableOpacity>
            </View>
            <Text numberOfLines={1} style={styles.subject}>
              {item.subject}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.time}>{format(item.timestamp, "MMM dd, HH:mm")}</Text>
              <Chip
                compact
                style={[
                  styles.priorityChip,
                  {
                    backgroundColor:
                      item.priority === "high"
                        ? "#FCA5A5"
                        : item.priority === "medium"
                        ? "#FCD34D"
                        : "#E5E7EB",
                  },
                ]}
              >
                {item.priority}
              </Chip>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* 📨 Message Details */}
      {selected && (
        <Card style={styles.detailsCard}>
          <Card.Title
            title={selected.subject}
            subtitle={`${selected.from} • ${format(selected.timestamp, "MMM dd, yyyy HH:mm")}`}
            left={(props) => <Avatar.Text {...props} label={selected.from.charAt(0)} />}
            right={() => (
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Button mode="outlined" compact onPress={() => archiveMessage(selected.id)}>
                  Archive
                </Button>
                <Button mode="contained" compact onPress={() => deleteMessage(selected.id)}>
                  Delete
                </Button>
              </View>
            )}
          />
          <Card.Content>
            <Text style={styles.messageBody}>{selected.content}</Text>

            {selected.attachments && selected.attachments.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.attachTitle}>Attachments:</Text>
                {selected.attachments.map((att, i) => (
                  <View key={i} style={styles.attachRow}>
                    <Ionicons name="attach" size={16} color="#111" />
                    <Text style={styles.attachText}>{att}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F9FAFB" },
  header: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 10 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, height: 40 },
  tabs: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 2,
  },
  tabText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  messageCard: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1,
  },
  messageFrom: { fontSize: 14, color: "#374151" },
  subject: { fontSize: 13, color: "#6B7280", marginVertical: 3 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  time: { fontSize: 11, color: "#9CA3AF" },
  priorityChip: { height: 22 },
  detailsCard: { marginTop: 12, borderRadius: 12 },
  messageBody: { fontSize: 14, color: "#111", marginTop: 10, lineHeight: 20 },
  attachTitle: { fontWeight: "600", marginTop: 10, marginBottom: 4 },
  attachRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  attachText: { fontSize: 13, color: "#1F2937", marginLeft: 4 },
});
