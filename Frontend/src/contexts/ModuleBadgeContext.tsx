/**
 * 🔔 Module Badge Context
 * Manages section-wise notification badge counts for each module
 * Badges are separate per module and reset when the user views the related screen
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";

// Module types that can have badges
export type ModuleType =
  | "leaves"
  | "wfh"
  | "tasks"
  | "chat"
  | "attendance"
  | "employees"
  | "hiring"
  | "reports"
  | "shifts"
  | "teams"
  | "home";

// Badge counts per module
export interface ModuleBadgeCounts {
  leaves: number;
  wfh: number;
  tasks: number;
  chat: number;
  attendance: number;
  employees: number;
  hiring: number;
  reports: number;
  shifts: number;
  teams: number;
  home: number;
}

// Event types that can trigger badge updates
export type BadgeEventType =
  | "leave_request_submitted"
  | "leave_request_approved"
  | "leave_request_rejected"
  | "wfh_request_submitted"
  | "wfh_request_approved"
  | "wfh_request_rejected"
  | "task_assigned"
  | "task_updated"
  | "task_completed"
  | "chat_message_received"
  | "attendance_action"
  | "employee_added"
  | "hiring_candidate_added"
  | "shift_updated";

interface ModuleBadgeContextType {
  badges: ModuleBadgeCounts;
  totalUnread: number;
  incrementBadge: (module: ModuleType, count?: number) => void;
  decrementBadge: (module: ModuleType, count?: number) => void;
  resetBadge: (module: ModuleType) => void;
  resetAllBadges: () => void;
  setBadgeCount: (module: ModuleType, count: number) => void;
  handleBadgeEvent: (eventType: BadgeEventType, metadata?: any) => void;
  refreshBadgesFromAPI: () => Promise<void>;
}

const defaultBadges: ModuleBadgeCounts = {
  leaves: 0,
  wfh: 0,
  tasks: 0,
  chat: 0,
  attendance: 0,
  employees: 0,
  hiring: 0,
  reports: 0,
  shifts: 0,
  teams: 0,
  home: 0,
};

const ModuleBadgeContext = createContext<ModuleBadgeContextType | undefined>(undefined);

const STORAGE_KEY = "module_badges";

export const ModuleBadgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<ModuleBadgeCounts>(defaultBadges);

  // Load badges from storage on mount
  useEffect(() => {
    if (!user) return;
    loadBadgesFromStorage();
  }, [user]);

  // Save badges to storage whenever they change
  useEffect(() => {
    if (user) {
      saveBadgesToStorage();
    }
  }, [badges, user]);

  const loadBadgesFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${user?.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setBadges({ ...defaultBadges, ...parsed });
      }
    } catch (error) {
      console.log("⚠️ Error loading badges:", error);
    }
  };

  const saveBadgesToStorage = async () => {
    try {
      await AsyncStorage.setItem(`${STORAGE_KEY}_${user?.id}`, JSON.stringify(badges));
    } catch (error) {
      console.log("⚠️ Error saving badges:", error);
    }
  };

  // Calculate total unread count
  const totalUnread = Object.values(badges).reduce((sum, count) => sum + count, 0);

  // Increment badge count for a module
  const incrementBadge = useCallback((module: ModuleType, count: number = 1) => {
    setBadges(prev => ({
      ...prev,
      [module]: prev[module] + count,
    }));
  }, []);

  // Decrement badge count for a module
  const decrementBadge = useCallback((module: ModuleType, count: number = 1) => {
    setBadges(prev => ({
      ...prev,
      [module]: Math.max(0, prev[module] - count),
    }));
  }, []);

  // Reset badge count for a module (when user views the screen)
  const resetBadge = useCallback((module: ModuleType) => {
    setBadges(prev => ({
      ...prev,
      [module]: 0,
    }));
  }, []);

  // Reset all badges
  const resetAllBadges = useCallback(() => {
    setBadges(defaultBadges);
  }, []);

  // Set specific badge count
  const setBadgeCount = useCallback((module: ModuleType, count: number) => {
    setBadges(prev => ({
      ...prev,
      [module]: Math.max(0, count),
    }));
  }, []);

  // Handle badge events from various parts of the app
  const handleBadgeEvent = useCallback((eventType: BadgeEventType, metadata?: any) => {
    const userRole = user?.role?.toLowerCase() || "employee";

    switch (eventType) {
      // Leave events
      case "leave_request_submitted":
        // Increment for approvers (admin, hr, manager)
        if (["admin", "hr", "manager"].includes(userRole)) {
          incrementBadge("leaves");
        }
        break;
      case "leave_request_approved":
      case "leave_request_rejected":
        // Increment for the employee who submitted
        if (metadata?.employeeId === user?.id || metadata?.employeeId === (user as any)?.employee_id) {
          incrementBadge("leaves");
        }
        break;

      // WFH events
      case "wfh_request_submitted":
        if (["admin", "hr", "manager"].includes(userRole)) {
          incrementBadge("wfh");
        }
        break;
      case "wfh_request_approved":
      case "wfh_request_rejected":
        if (metadata?.employeeId === user?.id || metadata?.employeeId === (user as any)?.employee_id) {
          incrementBadge("wfh");
        }
        break;

      // Task events
      case "task_assigned":
        if ((metadata?.assignedTo === user?.id || metadata?.assignedTo === user?.user_id) &&
          (metadata?.assignedBy !== user?.id && metadata?.assignedBy !== user?.user_id)) {
          incrementBadge("tasks");
        }
        break;
      case "task_updated":
      case "task_completed":
        // Only increment if I'm the assigned user AND not the creator
        if ((metadata?.assignedTo === user?.id || metadata?.assignedTo === user?.user_id) &&
          (metadata?.assignedBy !== user?.id && metadata?.assignedBy !== user?.user_id)) {
          incrementBadge("tasks");
        }
        break;

      // Chat events
      case "chat_message_received":
        incrementBadge("chat");
        break;

      // Attendance events
      case "attendance_action":
        if (["admin", "hr", "manager"].includes(userRole)) {
          incrementBadge("attendance");
        }
        break;

      // Employee events
      case "employee_added":
        if (["admin", "hr"].includes(userRole)) {
          incrementBadge("employees");
        }
        break;

      // Hiring events
      case "hiring_candidate_added":
        if (["admin", "hr"].includes(userRole)) {
          incrementBadge("hiring");
        }
        break;

      // Shift events
      case "shift_updated":
        if (["team_lead", "employee"].includes(userRole)) {
          incrementBadge("shifts");
        }
        break;

      default:
        break;
    }
  }, [user, incrementBadge]);

  // Refresh badges from API (for initial load and pull-to-refresh)
  const refreshBadgesFromAPI = useCallback(async () => {
    if (!user) return;

    const userRole = user.role?.toLowerCase() || "employee";
    const newBadges: Partial<ModuleBadgeCounts> = {};

    try {
      // Import apiService dynamically to avoid circular dependencies
      const { apiService } = await import("../lib/api");

      // Fetch pending tasks for the user
      try {
        const tasks = await apiService.getMyTasks();
        const pendingTasks = Array.isArray(tasks)
          ? tasks.filter((t: any) => {
            const isAssignedToMe = (t.assigned_to === user?.id || t.assigned_to === user?.user_id);
            const isCreatedByMe = (t.assigned_by === user?.id || t.assigned_by === user?.user_id);
            const isPending = ["Pending", "In Progress", "todo", "in_progress", "in-progress"].includes(t.status);
            return isAssignedToMe && !isCreatedByMe && isPending;
          }).length
          : 0;
        if (pendingTasks > 0) newBadges.tasks = pendingTasks;
      } catch (e) {
        console.log("Could not fetch tasks for badges:", e);
      }

      // For approvers - fetch pending leave requests
      if (["admin", "hr", "manager"].includes(userRole)) {
        try {
          const teamLeaves = await apiService.getTeamLeaves(1, 100, "Pending");
          if (teamLeaves.total > 0) newBadges.leaves = teamLeaves.total;
        } catch (e) {
          console.log("Could not fetch pending leaves for badges:", e);
        }
      }

      // For admin/hr - fetch pending hiring candidates
      if (["admin", "hr"].includes(userRole)) {
        try {
          const candidates = await apiService.getCandidates(undefined, "Applied");
          const pendingCandidates = Array.isArray(candidates) ? candidates.length : 0;
          if (pendingCandidates > 0) newBadges.hiring = pendingCandidates;
        } catch (e) {
          console.log("Could not fetch pending candidates for badges:", e);
        }
      }

      // Fetch unread chat count
      try {
        const sessions = await apiService.getChatSessions();
        const unreadCount = sessions.reduce((sum: number, chat: any) => sum + (chat.unread_count || 0), 0);
        if (unreadCount > 0) newBadges.chat = unreadCount;
      } catch (e) {
        console.log("Could not fetch chat badges:", e);
      }

      // Update badges with fetched data
      setBadges(prev => ({
        ...prev,
        ...newBadges,
      }));

    } catch (error) {
      console.log("Error refreshing badges from API:", error);
    }
  }, [user]);

  return (
    <ModuleBadgeContext.Provider
      value={{
        badges,
        totalUnread,
        incrementBadge,
        decrementBadge,
        resetBadge,
        resetAllBadges,
        setBadgeCount,
        handleBadgeEvent,
        refreshBadgesFromAPI,
      }}
    >
      {children}
    </ModuleBadgeContext.Provider>
  );
};

/**
 * Hook to use module badges
 */
export const useModuleBadges = () => {
  const context = useContext(ModuleBadgeContext);
  if (!context) {
    throw new Error("useModuleBadges must be used within a ModuleBadgeProvider");
  }
  return context;
};

/**
 * Hook to automatically reset badge when screen is focused
 */
export const useResetBadgeOnFocus = (module: ModuleType) => {
  const { resetBadge } = useModuleBadges();

  // This hook should be used with useFocusEffect from @react-navigation/native
  // Example usage in a screen:
  // useFocusEffect(useCallback(() => { resetBadge('leaves'); }, [resetBadge]));

  return useCallback(() => {
    resetBadge(module);
  }, [module, resetBadge]);
};
