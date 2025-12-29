import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState, useMemo } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
    SectionList
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { apiService, ChatUser } from "../../lib/api";

const PRIMARY_COLOR = "#fff";
const ACCENT_BLUE = "#3b82f6";
const TEXT_COLOR = "#111827";
const SUBTEXT_COLOR = "#64748b";
const BORDER_COLOR = "#e2e8f0";
const BACKGROUND_COLOR = "#f8fafc";

const NewChatScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const contacts = await apiService.getChatEligibleUsers();
            setUsers(contacts);
        } catch (error) {
            console.error("Failed to load contacts:", error);
            Alert.alert("Error", "Failed to load contacts");
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        const lowerQ = searchQuery.toLowerCase();
        return users.filter(u =>
            u.name.toLowerCase().includes(lowerQ) ||
            u.role?.toLowerCase().includes(lowerQ)
        );
    }, [users, searchQuery]);

    const handleCreateDirectChat = async (selectedUser: ChatUser) => {
        try {
            const userId = selectedUser.user_id;
            const res = await apiService.getOrCreatePrivateChat(userId);

            // Navigate to chat room
            navigation.navigate("ChatRoom", {
                chatId: res.chat_id,
                name: selectedUser.name,
                avatar: selectedUser.profile_photo || null,
                chatType: 'private',
                participantId: selectedUser.user_id,
            });
        } catch (error: any) {
            console.error("Failed to create chat:", error);
            Alert.alert("Error", error.message || "Failed to create chat");
        }
    };

    // Check if user can create group chats
    const canCreateGroup = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager';

    const sections = canCreateGroup ? [
        {
            title: "Actions",
            data: [{ id: 'new_group', name: 'New Group', icon: 'people' }]
        },
        {
            title: "Contacts on App",
            data: filteredUsers
        }
    ] : [
        {
            title: "Contacts on App",
            data: filteredUsers
        }
    ];

    const renderItem = ({ item }: { item: any }) => {
        if (item.id === 'new_group') {
            return (
                <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => navigation.navigate("ChatList", { openGroupModal: true })}
                >
                    <View style={styles.actionIconContainer}>
                        <View style={styles.actionIconCircle}>
                            <Ionicons name="people" size={24} color="#fff" />
                        </View>
                    </View>
                    <Text style={styles.actionText}>New group</Text>
                </TouchableOpacity>
            );
        }

        const userItem = item as ChatUser;
        return (
            <TouchableOpacity
                style={styles.userItem}
                onPress={() => handleCreateDirectChat(userItem)}
                activeOpacity={0.7}
            >
                <View style={styles.avatarContainer}>
                    {userItem.profile_photo ? (
                        <Image source={{ uri: userItem.profile_photo }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{userItem.name.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{userItem.name}</Text>
                    <Text style={styles.userStatus} numberOfLines={1}>{userItem.role || "Employee"}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" backgroundColor="#fff" />
            <SafeAreaView style={{ backgroundColor: "#fff" }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color={TEXT_COLOR} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Select Contact</Text>
                    <Text style={styles.headerSubtitle}>{users.length} contacts</Text>
                </View>
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={styles.headerAction}>
                    <Ionicons name="search-outline" size={22} color={TEXT_COLOR} />
                </TouchableOpacity>
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                </View>
            ) : (
                <SectionList
                    sections={sections as any}
                    keyExtractor={(item: any, index) => item.user_id?.toString() || item.id || index.toString()}
                    renderItem={renderItem}
                    renderSectionHeader={({ section: { title } }) => (
                        title === "Actions" ? null : (
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionHeaderText}>{title}</Text>
                            </View>
                        )
                    )}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 64,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTitleContainer: {
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: "#111827",
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 12,
        color: "#64748b",
        fontWeight: "500",
        marginTop: 1,
    },
    headerAction: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    listContent: {
        paddingBottom: 20,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: "#f8fafc",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    sectionHeaderText: {
        fontSize: 12,
        fontWeight: "800",
        color: "#94a3b8",
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    actionItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    actionIconContainer: {
        marginRight: 16,
    },
    actionIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "#3b82f6",
        alignItems: "center",
        justifyContent: "center",
    },
    actionText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#3b82f6",
    },
    userItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "#f1f5f9",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    avatarText: {
        fontSize: 18,
        fontWeight: "800",
        color: "#64748b",
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 2,
    },
    userStatus: {
        fontSize: 13,
        color: "#64748b",
    },
});

export default NewChatScreen;
