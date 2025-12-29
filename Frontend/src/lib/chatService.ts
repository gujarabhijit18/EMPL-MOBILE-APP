import { apiService, Employee } from "./api";
import { UserRole } from "../contexts/AuthContext";

export interface ChatMessage {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
    isRead: boolean;
}

export interface ChatSession {
    id: string;
    participants: Employee[];
    lastMessage?: ChatMessage;
    unreadCount?: number;
    isGroup: boolean;
    groupName?: string;
    groupImage?: string;
}

class ChatService {
    // Mock data for now
    private chats: ChatSession[] = [];

    /**
     * Determine if a user can create group chats
     * Only Admin, HR, and Manager roles are allowed
     */
    canCreateGroupChat(myRole: UserRole): boolean {
        const myRoleLower = (myRole || "employee").toLowerCase();
        const allowedRoles = ["admin", "hr", "manager"];
        return allowedRoles.includes(myRoleLower);
    }

    /**
     * Determine if a user can chat with another user based on roles and departments
     * 
     * Rules:
     * - Admin: Can chat with HR, Manager, Team Lead, and Employee across all departments
     * - HR: Can chat with Admin (all depts), HR (all depts), Manager/Team Lead/Employee (own dept only)
     * - Manager: Can chat with Managers (all depts), Admin/HR (own dept), Team Lead/Employee (own dept)
     * - Team Lead: Can chat with Admin, HR/Manager/Team Lead/Employee (own dept only)
     * - Employee: Can chat with Admin, HR/Manager/Team Lead/Employee (own dept only)
     */
    canChatWith(
        myRole: UserRole,
        myDept: string | undefined,
        targetRole: string | undefined,
        targetDept: string | undefined
    ): boolean {
        const myRoleLower = (myRole || "employee").toLowerCase();
        const targetRoleLower = (targetRole || "employee").toLowerCase();

        // Admin can chat with anyone
        if (myRoleLower === "admin") {
            return true;
        }

        // HR can chat with:
        // - Admin (all departments)
        // - HR (all departments)
        // - Manager, Team Lead, Employee (own department only)
        if (myRoleLower === "hr") {
            if (targetRoleLower === "admin" || targetRoleLower === "hr") {
                return true;
            }
            // Manager, Team Lead, Employee - own dept only
            if (targetDept === myDept) {
                return true;
            }
            return false;
        }

        // Manager can chat with:
        // - Managers (all departments)
        // - Admin and HR (own department only)
        // - Team Lead and Employee (own department only)
        if (myRoleLower === "manager") {
            if (targetRoleLower === "manager") {
                return true; // Can chat with managers from all departments
            }
            // Admin, HR, Team Lead, Employee - own dept only
            if (targetDept === myDept) {
                return true;
            }
            return false;
        }

        // Team Lead can chat with:
        // - Admin (all departments)
        // - HR, Manager, Team Lead, Employee (own department only)
        if (myRoleLower === "team_lead") {
            if (targetRoleLower === "admin") {
                return true;
            }
            // HR, Manager, Team Lead, Employee - own dept only
            if (targetDept === myDept) {
                return true;
            }
            return false;
        }

        // Employee can chat with:
        // - Admin (all departments)
        // - HR, Manager, Team Lead, Employee (own department only)
        if (myRoleLower === "employee") {
            if (targetRoleLower === "admin") {
                return true;
            }
            // HR, Manager, Team Lead, Employee - own dept only
            if (targetDept === myDept) {
                return true;
            }
            return false;
        }

        return false;
    }

    /**
     * Get all contacts that the current user can chat with
     * Filters based on role-based permissions
     */
    async getContactsForUser(currentUser: any): Promise<Employee[]> {
        try {
            const allEmployees = await apiService.getEmployees();

            return allEmployees.filter(emp =>
                this.canChatWith(
                    currentUser.role as UserRole,
                    currentUser.department,
                    emp.role,
                    emp.department
                ) && emp.id !== (currentUser.id || currentUser.user_id)?.toString() // Exclude self
            );
        } catch (error) {
            console.error("Failed to fetch chat contacts", error);
            return [];
        }
    }

    /**
     * Filter a list of employees based on chat permissions
     * Used for group chat member selection
     */
    filterPermittedUsers(
        currentUser: any,
        employees: Employee[]
    ): Employee[] {
        return employees.filter(emp =>
            this.canChatWith(
                currentUser.role as UserRole,
                currentUser.department,
                emp.role,
                emp.department
            ) && emp.id !== (currentUser.id || currentUser.user_id)?.toString()
        );
    }

    // Placeholder for creating a chat
    async createChat(participantIds: string[], isGroup: boolean = false, groupName?: string): Promise<ChatSession> {
        // In a real app, this would call the backend
        return {
            id: Math.random().toString(36).substr(2, 9),
            participants: [], // In real app, resolved from IDs
            isGroup,
            groupName,
            unreadCount: 0
        };
    }
}

export const chatService = new ChatService();
