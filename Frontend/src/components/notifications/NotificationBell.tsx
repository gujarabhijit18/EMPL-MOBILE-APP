import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { Badge, Button, Divider, useTheme } from "react-native-paper";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";

// ✅ Notification type definition
interface Notification {
  id: string;
  title: string;
  message: string;
  type: "task" | "leave" | "warning" | "info";
  read: boolean;
  createdAt: string;
  metadata?: any;
}

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);

  // ✅ Local notifications (no API)
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "Leave Approved",
      message: "Your leave request for 3 days has been approved ✅",
      type: "leave",
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "New Task Assigned",
      message: "A new task has been added to your list.",
      type: "task",
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "3",
      title: "Attendance Reminder",
      message: "Don’t forget to check in today!",
      type: "warning",
      read: true,
      createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const theme = useTheme();

  // ✅ Utility functions
  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "leave":
        return "calendar-outline";
      case "task":
        return "list-outline";
      case "warning":
        return "alert-circle-outline";
      default:
        return "information-circle-outline";
    }
  };

  const handlePress = (item: Notification) => {
    markAsRead(item.id);
    Alert.alert(item.title, item.message);
    setIsOpen(false);
  };

  return (
    <>
      {/* 🔔 Notification Bell Button */}
      <TouchableOpacity
        style={styles.bellButton}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Icon
          name="notifications-outline"
          size={26}
          color={theme.colors.primary}
        />
        {unreadCount > 0 && (
          <Badge style={styles.badge} size={16}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </TouchableOpacity>

      {/* 📱 Notification Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Icon name="notifications" size={20} color="#fff" />
                <Text style={styles.headerText}>Notifications</Text>
              </View>
              {unreadCount > 0 && (
                <Button
                  mode="text"
                  textColor="#fff"
                  onPress={markAllAsRead}
                  labelStyle={{ fontSize: 12 }}
                >
                  Mark All Read
                </Button>
              )}
            </View>

            {/* Notification List */}
            {notifications.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon
                  name="notifications-off-outline"
                  size={48}
                  color="#94A3B8"
                />
                <Text style={styles.emptyText}>You're all caught up!</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.notificationItem,
                      !item.read && styles.unreadNotification,
                    ]}
                    onPress={() => handlePress(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconBox}>
                      <Icon
                        name={getIcon(item.type)}
                        size={22}
                        color={item.read ? "#6B7280" : "#2563EB"}
                      />
                    </View>

                    <View style={styles.textBox}>
                      <Text
                        style={[
                          styles.title,
                          !item.read && { fontWeight: "bold" },
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.message} numberOfLines={2}>
                        {item.message}
                      </Text>
                      <Text style={styles.time}>
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => clearNotification(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon
                        name="close-outline"
                        size={18}
                        color="#EF4444"
                        style={{ marginLeft: 4 }}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <Divider />}
              />
            )}

            {/* Close Button */}
            <Button
              mode="contained-tonal"
              onPress={() => setIsOpen(false)}
              style={{ marginTop: 10, marginBottom: 8 }}
            >
              Close
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ✅ Styles
const styles = StyleSheet.create({
  bellButton: {
    padding: 6,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    backgroundColor: "#EF4444",
    color: "white",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "75%",
    paddingVertical: 8,
    paddingHorizontal: 10,
    elevation: 8,
  },
  header: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10,
    backgroundColor: "#fff",
  },
  unreadNotification: {
    backgroundColor: "#EFF6FF",
  },
  iconBox: {
    marginRight: 8,
    marginTop: 4,
  },
  textBox: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    color: "#111827",
  },
  message: {
    fontSize: 12,
    color: "#6B7280",
  },
  time: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
});
