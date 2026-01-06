/**
 * 🔔 Badge Reset Hook
 * Automatically resets module badge when screen is focused
 */
import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useModuleBadges, ModuleType } from "../contexts/ModuleBadgeContext";

/**
 * Hook to automatically reset a module's badge when the screen is focused
 * @param module - The module type to reset badge for
 * @param enabled - Whether the reset should be enabled (default: true)
 */
export const useBadgeReset = (module: ModuleType, enabled: boolean = true) => {
  const { resetBadge, badges } = useModuleBadges();

  useFocusEffect(
    useCallback(() => {
      if (enabled && badges[module] > 0) {
        // Small delay to ensure the screen is visible before resetting
        const timer = setTimeout(() => {
          resetBadge(module);
        }, 300);

        return () => clearTimeout(timer);
      }
    }, [enabled, module, resetBadge, badges])
  );

  return {
    currentCount: badges[module],
    resetBadge: () => resetBadge(module),
  };
};

/**
 * Hook to get badge count for a specific module
 * @param module - The module type to get badge count for
 */
export const useBadgeCount = (module: ModuleType) => {
  const { badges } = useModuleBadges();
  return badges[module];
};

/**
 * Hook to get all badge counts
 */
export const useAllBadgeCounts = () => {
  const { badges, totalUnread } = useModuleBadges();
  return { badges, totalUnread };
};

/**
 * Map route names to module types
 */
export const routeToModule: Record<string, ModuleType> = {
  // Tab routes
  "Home": "home",
  "HomeDashboard": "home",
  "Attendance": "attendance",
  "Leaves": "leaves",
  "Tasks": "tasks",
  "TeamShifts": "shifts",
  "Employees": "employees",
  "Departments": "employees",
  "Hiring": "hiring",
  "Shifts": "shifts",
  "Teams": "teams",
  "Reports": "reports",

  // Stack routes
  "ChatList": "chat",
  "ChatRoom": "chat",
  "LeaveManagement": "leaves",
  "TaskManagement": "tasks",
  "AttendanceWrapper": "attendance",
  "EmployeeManagement": "employees",
  "HiringManagement": "hiring",
  "ShiftScheduleManagement": "shifts",
  "TeamManagement": "teams",
  "Payroll": "payroll",
};

/**
 * Get module type from route name
 */
export const getModuleFromRoute = (routeName: string): ModuleType | null => {
  return routeToModule[routeName] || null;
};
