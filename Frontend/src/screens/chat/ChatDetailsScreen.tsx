import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    FlatList,
    TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { apiService, Employee } from "../../lib/api";

const PRIMARY_COLOR = "#3b82f6";
const BACKGROUND_COLOR = "#fff";
const SECONDARY_BACKGROUND = "#f8fafc";
const BORDER_COLOR = "#e2e8f0";
const TEXT_COLOR = "#111827";
const SUBTEXT_COLOR = "#64748b";

interface ChatDetailsParams {
    chatId: string;
    name: string;
    avatar?: string;
    chatType: 'private' | 'group';
}

const ChatDetailsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { chatId, name: initialName, avatar: initialAvatar, chatType } = route.params as ChatDetailsParams;
    const isGroup = chatType === 'group';
    const { user } = useAuth();

    const [chatInfo, setChatInfo] = useState({
        name: initialName,
        avatar: initialAvatar,
        createdById: null as number | null
    });
    const [participants, setParticipants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userMap, setUserMap] = useState<Record<number, any>>({});
    const [participantsWithStatus, setParticipantsWithStatus] = useState<any[]>([]);

    // Add Member Modal State
    const [isAddMemberVisible, setIsAddMemberVisible] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [addingMember, setAddingMember] = useState(false);

    useEffect(() => {
        fetchChatDetails();
    }, [chatId]);

    // Refresh online status every 5 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            if (participantsWithStatus.length > 0) {
                const updatedParticipants = await Promise.all(
                    participantsWithStatus.map(async (p: any) => {
                        try {
                            const statusResponse = await apiService.getOnlineStatus(p.user_id);
                            return { ...p, is_online: statusResponse.is_online };
                        } catch (err) {
                            return { ...p, is_online: false };
                        }
                    })
                );
                setParticipantsWithStatus(updatedParticipants);
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [participantsWithStatus.length]);

    const fetchChatDetails = async () => {
        try {
            setLoading(true);

            // 1. Fetch eligible users to resolve participant details
            const users = await apiService.getChatEligibleUsers();
            const map: Record<number, any> = {};
            users.forEach(u => { map[u.user_id] = u; });
            setUserMap(map);

            // 2. Find the current session to get member list
            const sessions = await apiService.getChatSessions();
            const session = sessions.find(s => s.chat_id === chatId);

            if (session) {
                const sessionMembers = session.members.map(m => ({
                    ...m,
                    ...(map[m.user_id] || { name: `User ${m.user_id}` })
                }));

                // Get avatar
                let avatarPhoto = initialAvatar;
                if (!isGroup) {
                    const otherMember = sessionMembers.find(m => m.user_id !== user?.user_id);
                    avatarPhoto = otherMember?.profile_photo || initialAvatar;
                }

                setChatInfo({
                    name: session.name || (isGroup ? "Group Chat" : initialName),
                    avatar: avatarPhoto,
                    createdById: session.created_by_id
                });
                setParticipants(sessionMembers);

                // Fetch online status for all participants
                const participantsWithOnlineStatus = await Promise.all(
                    sessionMembers.map(async (p: any) => {
                        try {
                            const statusResponse = await apiService.getOnlineStatus(p.user_id);
                            return { ...p, is_online: statusResponse.is_online };
                        } catch (err) {
                            return { ...p, is_online: false };
                        }
                    })
                );
                setParticipantsWithStatus(participantsWithOnlineStatus);
            }
        } catch (error) {
            console.error("Failed to fetch chat details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        Alert.alert(
            "Remove Member",
            "Are you sure you want to remove this member?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await apiService.removeGroupMember(chatId, parseInt(memberId));
                            Alert.alert("Success", "Member removed");
                            fetchChatDetails(); // Refresh list
                        } catch (error: any) {
                            Alert.alert("Error", error.message || "Failed to remove member");
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteGroup = async () => {
        Alert.alert(
            "Delete Group",
            "Are you sure you want to delete this group? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await apiService.clearChat(chatType, chatId);
                            navigation.navigate('ChatList' as never);
                        } catch (error: any) {
                            Alert.alert("Error", error.message || "Failed to delete group");
                        }
                    }
                }
            ]
        );
    };

    // Removed toggleMute as it is no longer used

    const openAddMemberModal = async () => {
        setIsAddMemberVisible(true);
        try {
            const users = await apiService.getChatEligibleUsers();
            // Filter out existing participants
            const participantIds = new Set(participants.map((p: any) => p.user_id));
            const availableUsers = users.filter(e => !participantIds.has(e.user_id));
            setAllUsers(availableUsers);
        } catch (error) {
            Alert.alert("Error", "Failed to load users");
        }
    };

    const addUserToGroup = async (userId: number) => {
        try {
            setAddingMember(true);
            await apiService.addGroupMember(chatId, userId);
            Alert.alert("Success", "Member added successfully");
            setIsAddMemberVisible(false);
            fetchChatDetails();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to add member");
        } finally {
            setAddingMember(false);
        }
    };

    const filteredEmployees = allUsers.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const { name, avatar, createdById } = chatInfo;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" backgroundColor="#fff" translucent={false} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color={TEXT_COLOR} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isGroup ? "Group Info" : "Contact Info"}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : "?"}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.nameText}>{name}</Text>
                    <Text style={styles.numberText}>
                        {isGroup ? `${participants.length} members` : "Available on Staffly"}
                    </Text>
                </View>

                {/* Participants Section (Group Only) */}
                {isGroup && (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>{participants.length} Participants</Text>

                        {/* Add Member Action Row - Only for Creator */}
                        {createdById === user?.user_id && (
                            <TouchableOpacity onPress={openAddMemberModal} style={styles.addParticipantBtn}>
                                <View style={styles.addMemberIconContainer}>
                                    <View style={styles.addIconCircle}>
                                        <Ionicons name="add" size={24} color="#fff" />
                                    </View>
                                </View>
                                <Text style={styles.addMemberLabel}>Add Participants</Text>
                            </TouchableOpacity>
                        )}

                        {participantsWithStatus.map((p: any) => (
                            <View key={p.user_id} style={styles.participantRow}>
                                <View style={styles.participantAvatar}>
                                    {p.profile_photo ? (
                                        <Image source={{ uri: p.profile_photo }} style={styles.smallAvatar} />
                                    ) : (
                                        <View style={styles.smallAvatarPlaceholder}>
                                            <Text style={styles.smallAvatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.participantInfo}>
                                    <Text style={styles.participantName}>
                                        {p.user_id === user?.user_id ? "You" : p.name}
                                    </Text>
                                    <Text style={styles.participantRole}>
                                        {p.role || "Member"}
                                    </Text>
                                </View>

                                <View style={styles.rowActions}>
                                    {p.is_online && (
                                        <View style={styles.onlineBadge}>
                                            <View style={styles.onlineDot} />
                                            <Text style={styles.onlineText}>Online</Text>
                                        </View>
                                    )}
                                    {createdById === user?.user_id && p.user_id !== user?.user_id && (
                                        <TouchableOpacity
                                            onPress={() => handleRemoveMember(p.user_id)}
                                            style={styles.moreButton}
                                        >
                                            <Ionicons name="ellipsis-vertical" size={18} color={SUBTEXT_COLOR} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Delete Group Section (Only for Creator) */}
                {isGroup && createdById === user?.user_id && (
                    <View style={[styles.section, { marginTop: 20 }]}>
                        <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteGroup}>
                            <Ionicons name="trash-outline" size={20} color="#ef4444" style={{ marginRight: 10 }} />
                            <Text style={styles.dangerText}>Delete Group</Text>
                        </TouchableOpacity>
                    </View>
                )}


                <View style={{ height: 40 }} />
            </ScrollView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isAddMemberVisible}
                onRequestClose={() => setIsAddMemberVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Participants</Text>
                            <TouchableOpacity onPress={() => setIsAddMemberVisible(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search employees..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />

                        <FlatList
                            data={filteredEmployees}
                            keyExtractor={(item) => item.user_id?.toString() || Math.random().toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.employeeItem}
                                    onPress={() => addUserToGroup(item.user_id!)}
                                    disabled={addingMember}
                                >
                                    <View style={styles.employeeAvatarPlaceholder}>
                                        <Text style={styles.employeeAvatarText}>
                                            {item.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.employeeInfo}>
                                        <Text style={styles.employeeName}>{item.name}</Text>
                                        <Text style={styles.employeeRole}>{item.role} • {item.department}</Text>
                                    </View>
                                    {addingMember && <ActivityIndicator size="small" color="#0d9488" />}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>No employees found</Text>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        height: 64,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.3,
    },
    content: {
        paddingBottom: 40,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 32,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 32,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    avatarText: {
        fontSize: 36,
        fontWeight: '800',
        color: '#64748b',
    },
    nameText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    numberText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: "500",
    },
    section: {
        backgroundColor: '#fff',
        paddingVertical: 12,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '800',
        color: '#94a3b8',
        paddingHorizontal: 20,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    participantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    addParticipantBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    addMemberIconContainer: {
        marginRight: 12,
    },
    addIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addMemberLabel: {
        fontSize: 16,
        color: '#3b82f6',
        fontWeight: '700',
    },
    participantAvatar: {
        marginRight: 12,
    },
    smallAvatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
    },
    smallAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    smallAvatarText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#64748b',
    },
    participantInfo: {
        flex: 1,
    },
    participantName: {
        fontSize: 15,
        fontWeight: "700",
        color: '#111827',
    },
    participantRole: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 1,
    },
    rowActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    onlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 8,
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22c55e',
        marginRight: 4,
    },
    onlineText: {
        fontSize: 11,
        color: '#16a34a',
        fontWeight: '700',
    },
    moreButton: {
        padding: 4,
    },
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 12,
        backgroundColor: "#fef2f2",
        borderWidth: 1,
        borderColor: "#fee2e2",
    },
    dangerText: {
        color: '#ef4444',
        fontSize: 15,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '85%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
    },
    searchInput: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 14,
        margin: 20,
        fontSize: 15,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        color: "#111827",
    },
    employeeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    employeeAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    employeeAvatarText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#64748b',
    },
    employeeInfo: {
        flex: 1,
    },
    employeeName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
    },
    employeeRole: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#94a3b8',
        fontSize: 15,
    },
});

export default ChatDetailsScreen;
