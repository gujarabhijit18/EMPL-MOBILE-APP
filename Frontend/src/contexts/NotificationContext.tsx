import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { useAuth } from "./AuthContext";

// Safe notification import - handle Expo Go limitations
// NOTE: Expo Go SDK 53+ removed Push Notification support. 
// We disable this to prevent crashes. Use a Development Build for Push Notifications.
let Notifications: any = null;
/*
try {
  Notifications = require("expo-notifications");
} catch (error) {
  console.log("⚠️ expo-notifications not available (Expo Go limitation)");
}
*/

/**
 * 🔔 Notification Type Definition
 */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "leave" | "task" | "info" | "warning";
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: {
    leaveId?: string;
    taskId?: string;
    requesterId?: string;
    requesterName?: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "userId" | "createdAt" | "read">) => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

/**
 * 🌐 Create Notification Context
 */
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * 🔔 Notification Provider (Expo Compatible)
 * ✅ Works fully in Expo Go (Android, iOS, Web)
 * ✅ Local storage with AsyncStorage
 * ✅ Expo Notifications + Expo Audio for sound
 */
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  /**
   * 🧠 Load saved notifications from AsyncStorage
   */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(`notifications_${user.id}`);
        if (saved) setNotifications(JSON.parse(saved));
      } catch (error) {
        console.log("⚠️ Error loading notifications:", error);
      }
    })();
  }, [user]);

  /**
   * 💾 Persist notifications to AsyncStorage
   */
  useEffect(() => {
    if (user) {
      AsyncStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications)).catch(console.error);
    }
  }, [notifications, user]);

  /**
   * 🔧 Configure Expo Notifications (Safe for Expo Go)
   * ⚠️ Note: Full push notification functionality requires a development build.
   * Local notifications work in Expo Go for SDK < 53, but remote notifications require dev build.
   */
  useEffect(() => {
    if (!Notifications) {
      console.log("📱 Notifications disabled (Expo Go limitation)");
      return;
    }

    (async () => {
      try {
        await Notifications.requestPermissionsAsync();

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      } catch (error) {
        console.log("⚠️ Notification permissions error (may require dev build):", error);
      }
    })();
  }, []);

  /**
   * 🔉 Play Sound (optional)
   * Note: Sound playback is disabled. To enable, add notification.mp3 to src/assets/ and uncomment the code below.
   * You'll also need to import AudioPlayer from expo-audio and use useRef to store the player instance.
   */
  const playSound = async () => {
    // Sound playback is optional and currently disabled
    // To enable: Add notification.mp3 to src/assets/ and implement audio playback using expo-audio
  };

  /**
   * ➕ Add new notification (Safe for Expo Go)
   */
  const addNotification = async (
    notification: Omit<Notification, "id" | "userId" | "createdAt" | "read">
  ) => {
    if (!user) return;

    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      userId: user.id,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);

    // 🔊 Play sound (optional)
    await playSound();

    // 📱 Show local notification via Expo (if available)
    if (Notifications) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.message,
            sound: "default",
          },
          trigger: null, // show immediately
        });
      } catch (error) {
        console.log("⚠️ Could not show notification (Expo Go limitation):", error);
      }
    } else {
      console.log("📱 Notification stored locally (Expo Go - no push notifications)");
    }
  };

  /**
   * ✅ Mark single as read
   */
  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  /**
   * ✅ Mark all as read
   */
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  /**
   * 🗑️ Clear one notification
   */
  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  /**
   * 🧹 Clear all notifications
   */
  const clearAll = async () => {
    setNotifications([]);
    if (user) await AsyncStorage.removeItem(`notifications_${user.id}`);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * 🧩 Custom Hook: useNotifications()
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationProvider");
  return context;
};
