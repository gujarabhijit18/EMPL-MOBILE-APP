import React, { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Card } from "react-native-paper";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
}

const Notifications = () => {
  const navigation = useNavigation();
  
  // Animation values for header elements
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  
  // Animate header elements on component mount
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
    ]).start();
  }, []);

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "New Employee Joined",
      message: "John Doe has joined the Engineering department",
      type: "success",
      timestamp: "2 minutes ago",
      read: false,
      priority: "high",
    },
    {
      id: "2",
      title: "Leave Request Pending",
      message: "Jane Smith has submitted a leave request for approval",
      type: "warning",
      timestamp: "15 minutes ago",
      read: false,
      priority: "medium",
    },
    {
      id: "3",
      title: "Task Completed",
      message: "Project Alpha milestone has been completed by the team",
      type: "success",
      timestamp: "1 hour ago",
      read: true,
      priority: "low",
    },
    {
      id: "4",
      title: "System Maintenance",
      message: "Scheduled maintenance will occur tonight at 11 PM",
      type: "info",
      timestamp: "2 hours ago",
      read: false,
      priority: "medium",
    },
    {
      id: "5",
      title: "Attendance Alert",
      message: "3 employees are late today",
      type: "error",
      timestamp: "3 hours ago",
      read: true,
      priority: "high",
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'alert-circle';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      case 'info':
      default:
        return '#3b82f6';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification
      ]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={[
          styles.notificationIcon,
          { backgroundColor: getNotificationColor(item.type) }
        ]}>
          <Ionicons 
            name={getNotificationIcon(item.type) as any} 
            size={20} 
            color="#fff" 
          />
        </View>
        
        <View style={styles.notificationText}>
          <View style={styles.notificationHeader}>
            <Text style={[
              styles.notificationTitle,
              !item.read && styles.unreadTitle
            ]}>
              {item.title}
            </Text>
            {item.priority === 'high' && (
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityText}>HIGH</Text>
              </View>
            )}
          </View>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          <Text style={styles.notificationTime}>{item.timestamp}</Text>
        </View>
        
        {!item.read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <StatusBar style="light" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Animated.View 
            style={[
              styles.headerTextContainer,
              { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }
            ]}
          >
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {unreadCount} unread notifications
            </Text>
          </Animated.View>
          
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={markAllAsRead}
          >
            <Ionicons name="checkmark-done" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filter === 'all' && styles.activeFilterTab
            ]}
            onPress={() => setFilter('all')}
          >
            <Text style={[
              styles.filterText,
              filter === 'all' && styles.activeFilterText
            ]}>
              All ({notifications.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterTab,
              filter === 'unread' && styles.activeFilterTab
            ]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[
              styles.filterText,
              filter === 'unread' && styles.activeFilterText
            ]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notifications List */}
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off" size={64} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'unread' 
                  ? "All caught up! No unread notifications."
                  : "You don't have any notifications yet."
                }
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  header: {
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 30,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#a5b4fc",
    opacity: 0.9,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
    paddingTop: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#1e3a8a',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeFilterText: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    backgroundColor: '#fafbff',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    position: 'relative',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  priorityBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
