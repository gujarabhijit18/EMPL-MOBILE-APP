import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState, useEffect } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
    Alert,
    Platform,
    Animated,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useModuleBadges } from "../../contexts/ModuleBadgeContext";
import { apiService, ChatUser, ChatSession } from "../../lib/api";
import { handleApiError } from "../../utils/errorHandler";

const { width } = Dimensions.get('window');

interface ChatItem {
    id: string;
    type: 'private' | 'group';
    name: string;
    lastMessage: string;
    time: string;
    unread: number;
    avatar: string | null;
    online: boolean;
    onlineCount?: number;
    totalMembers?: number;
    participantId?: number;
    isMuted?: boolean;
    isPinned?: boolean;
    lastMessageAt?: Date;
}

type ChatFilter = 'all' | 'unread' | 'groups' | 'dms';

const PRIMARY_COLOR = "#111827";
const ACCENT_COLOR = "#3b82f6";
const HEADER_TEXT_COLOR = "#111827";
const BACKGROUND_COLOR = "#f8fafc";
const TEXT_COLOR = "#111827";
const SUBTEXT_COLOR = "#64748b";
const BORDER_COLOR = "#e2e8f0";

const ChatListScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useAuth();
    const { resetBadge } = useModuleBadges();
    const [chats, setChats] = useState<ChatItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [eligibleUsers, setEligibleUsers] = useState<ChatUser[]>([]);
    const [userMap, setUserMap] = useState<Record<number, ChatUser>>({});
    const [chatFilter, setChatFilter] = useState<ChatFilter>('all');
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    // Reset badge when screen is focused
    useFocusEffect(
        useCallback(() => {
            resetBadge("chat");
        }, [resetBadge])
    );

    // New Chat Modal State
    const [newChatModalVisible, setNewChatModalVisible] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState("");

    // Group Chat State
    const [groupName, setGroupName] = useState("");
    const [groupDescription, setGroupDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Fetch chats and users from backend
    const fetchAllData = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);

            // 1. Fetch eligible users first to build the map
            const users = await apiService.getChatEligibleUsers();
            setEligibleUsers(users);

            const map: Record<number, ChatUser> = {};
            users.forEach(u => {
                map[u.user_id] = u;
            });
            setUserMap(map);

            // 2. Fetch chat sessions
            const sessionsData = await apiService.getChatSessions();

            // Transform API response to ChatItem interface
            const transformedChats: ChatItem[] = sessionsData.map((session: ChatSession) => {
                const isGroup = session.chat_type === 'group';
                let displayName = session.name || "Unknown Chat";
                let avatarPhoto = null;
                let otherUserId: number | undefined;

                if (!isGroup) {
                    // Find the other participant
                    const otherMember = session.members.find(m => m.user_id !== user?.user_id);
                    if (otherMember) {
                        otherUserId = otherMember.user_id;
                        const otherUser = map[otherMember.user_id];
                        if (otherUser) {
                            displayName = otherUser.name;
                            avatarPhoto = otherUser.profile_photo || null;
                        }
                    }
                } else {
                    // For groups, we could use first member's photo or a group icon
                    const firstOtherMember = session.members.find(m => m.user_id !== user?.user_id);
                    if (firstOtherMember && map[firstOtherMember.user_id]) {
                        avatarPhoto = map[firstOtherMember.user_id].profile_photo || null;
                    }
                }

                return {
                    id: session.chat_id,
                    type: session.chat_type,
                    name: displayName,
                    lastMessage: "Tap to see messages", // Not provided in sessions list
                    time: session.last_message_at
                        ? new Date(session.last_message_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        })
                        : "",
                    unread: 0, // Not provided in sessions list
                    avatar: avatarPhoto,
                    online: false, // Online status requires single-user fetch
                    totalMembers: session.member_count,
                    participantId: otherUserId,
                    isMuted: false,
                };
            });

            // 3. Fetch online status for private chats
            const chatsWithOnlineStatus = await Promise.all(transformedChats.map(async (chat) => {
                if (chat.type === 'private' && chat.participantId) {
                    try {
                        const statusResponse = await apiService.getOnlineStatus(chat.participantId);
                        return { ...chat, online: statusResponse.is_online };
                    } catch (err) {
                        return { ...chat, online: false };
                    }
                }
                return chat;
            }));

            setChats(chatsWithOnlineStatus);
        } catch (err: any) {
            console.error("Failed to fetch chats:", err);
            const errorMsg = await handleApiError(err, navigation);
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [navigation, user?.user_id]);

    // Handle openGroupModal from params
    useEffect(() => {
        if (route.params?.openGroupModal) {
            setNewChatModalVisible(true);
            // Clear the param
            navigation.setParams({ openGroupModal: undefined });
        }
    }, [route.params?.openGroupModal]);

    // Refresh everything on screen focus
    useFocusEffect(
        useCallback(() => {
            fetchAllData();
        }, [fetchAllData])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchAllData();
        setRefreshing(false);
    }, [fetchAllData]);

    const toggleSelection = (userId: number) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
        }
        setSelectedUserIds(newSet);
    };

    const handleCreateChat = async () => {
        const selectedIds = Array.from(selectedUserIds);
        if (selectedIds.length === 0) {
            Alert.alert("Select User", "Please select at least one user.");
            return;
        }

        const isGroup = selectedIds.length > 1;

        // Check group creation permission (Assuming simplified roles or handling it in backend)
        const canCreateGroup = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager';
        if (isGroup && !canCreateGroup) {
            Alert.alert(
                "Permission Denied",
                "Your role doesn't have permission to create group chats."
            );
            return;
        }

        if (isGroup && !groupName.trim()) {
            Alert.alert("Group Name", "Please enter a group name for the group chat.");
            return;
        }

        try {
            setIsCreating(true);
            let finalChatId: string;
            let finalName: string;
            let finalAvatar: string | null = null;

            if (isGroup) {
                // Add current user to member IDs if not already there
                const memberIds = [...selectedIds];
                if (user?.user_id && !memberIds.includes(user.user_id)) {
                    memberIds.push(user.user_id);
                }
                const res = await apiService.createGroupChat(groupName, memberIds);
                finalChatId = res.group_id;
                finalName = groupName;
            } else {
                const res = await apiService.getOrCreatePrivateChat(selectedIds[0]);
                finalChatId = res.chat_id;
                const otherUser = userMap[selectedIds[0]];
                finalName = otherUser?.name || "Chat";
                finalAvatar = otherUser?.profile_photo || null;
            }

            setNewChatModalVisible(false);
            setSelectedUserIds(new Set());
            setGroupName("");
            setGroupDescription("");
            setUserSearchQuery("");

            // Navigate to chat room
            navigation.navigate("ChatRoom", {
                chatId: finalChatId,
                name: finalName,
                avatar: finalAvatar,
                chatType: isGroup ? 'group' : 'private',
            });
        } catch (err: any) {
            console.error("Failed to create chat:", err);
            Alert.alert("Error", "Failed to create chat. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    const openNewChatModal = () => {
        setNewChatModalVisible(true);
    };

    const canCreateGroup = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager';

    const getFilteredChats = () => {
        let filtered = chats.filter(chat =>
            chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
        );

        switch (chatFilter) {
            case 'unread':
                return filtered.filter(chat => chat.unread > 0);
            case 'groups':
                return filtered.filter(chat => chat.type === 'group');
            case 'dms':
                return filtered.filter(chat => chat.type === 'private');
            default:
                return filtered;
        }
    };

    const filteredChats = getFilteredChats();

    const filteredUsers = eligibleUsers.filter(u =>
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    );

    const handleMarkAsRead = async (chat: ChatItem) => {
        // Implementation pending if specific sessions-read API exists
    };

    const handleChatOptions = (chat: ChatItem) => {
        Alert.alert(
            "Chat Options",
            `Options for ${chat.name}`,
            [
                {
                    text: "Clear Chat",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await apiService.clearChat(chat.type, chat.id);
                            await fetchAllData();
                        } catch (err: any) {
                            Alert.alert("Error", "Failed to clear chat");
                        } finally {
                            setLoading(false);
                        }
                    }
                },
                {
                    text: "Cancel",
                    style: "cancel"
                }
            ],
            { cancelable: true }
        );
    };

    const renderChatItem = ({ item }: { item: ChatItem }) => (
        <View style={styles.chatRow}>
            <TouchableOpacity
                style={styles.chatMainTouchable}
                activeOpacity={0.6}
                onPress={() => navigation.navigate("ChatRoom", {
                    chatId: item.id,
                    name: item.name,
                    avatar: item.avatar,
                    chatType: item.type,
                    participantId: item.participantId
                })}
                onLongPress={() => handleChatOptions(item)}
                delayLongPress={500}
            >
                <View style={styles.avatarContainer}>
                    {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.avatar} />
                    ) : (
                        <LinearGradient
                            colors={["#3b82f6", "#2563eb"]}
                            style={styles.avatarPlaceholder}
                        >
                            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                        </LinearGradient>
                    )}
                    {/* Online Status Indicator (only for DMs) */}
                    {item.type === 'private' && (
                        <View style={[
                            styles.onlineIndicator,
                            { backgroundColor: item.online ? '#10b981' : '#d1d5db' }
                        ]} />
                    )}
                </View>
                <View style={styles.chatContent}>
                    <View style={styles.chatHeader}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.chatNameRow}>
                                <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
                                {item.isMuted && (
                                    <Ionicons name="volume-mute" size={14} color={SUBTEXT_COLOR} style={{ marginLeft: 6 }} />
                                )}
                            </View>
                            {item.type === 'group' && (
                                <Text style={styles.groupMemberCount}>
                                    {item.totalMembers} members
                                </Text>
                            )}
                        </View>
                        <Text style={[styles.chatTime, item.unread > 0 && styles.chatTimeUnread]}>
                            {item.time}
                        </Text>
                    </View>
                    <View style={styles.chatFooter}>
                        <Text
                            style={[styles.lastMessage, item.unread > 0 && styles.lastMessageUnread]}
                            numberOfLines={1}
                        >
                            {item.lastMessage}
                        </Text>
                        {item.unread > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>{item.unread > 99 ? '99+' : item.unread}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.optionsButton}
                onPress={() => handleChatOptions(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="ellipsis-vertical" size={20} color={SUBTEXT_COLOR} />
            </TouchableOpacity>
        </View>
    );

    const renderUserItem = ({ item }: { item: ChatUser }) => {
        const id = item.user_id;
        const isSelected = selectedUserIds.has(id);

        return (
            <TouchableOpacity
                style={[
                    styles.userItem,
                    isSelected && styles.selectedUserItem,
                ]}
                onPress={() => toggleSelection(id)}
                activeOpacity={0.7}
            >
                <View style={styles.userAvatarWrapper}>
                    {item.profile_photo ? (
                        <Image source={{ uri: item.profile_photo }} style={styles.userAvatarImage} />
                    ) : (
                        <View style={[styles.userAvatarPlaceholder, { backgroundColor: isSelected ? "#3b82f6" : "#f1f5f9" }]}>
                            <Text style={[styles.userAvatarText, isSelected && { color: '#fff' }]}>
                                {item.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.userInfo}>
                    <Text style={[styles.userName, isSelected && styles.selectedUserName]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={styles.userRole} numberOfLines={1}>
                        {item.role}
                    </Text>
                </View>

                {isSelected ? (
                    <Ionicons name="checkbox" size={24} color="#3b82f6" />
                ) : (
                    <Ionicons name="square-outline" size={24} color="#e2e8f0" />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: "#fff" }]} edges={['top']}>
            <StatusBar style="dark" backgroundColor="#fff" translucent={false} />

            {/* Enhanced Header */}
            <View style={styles.headerContainer}>
                <View style={styles.headerContent}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={22} color="#111827" />
                        </TouchableOpacity>

                        <View style={styles.headerLeft}>
                            <Text style={styles.headerTitle}>Chats</Text>
                            <Text style={styles.headerSubtitle}>
                                {filteredChats.length} {filteredChats.length === 1 ? 'chat' : 'chats'}
                            </Text>
                        </View>

                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                style={styles.headerIconButton}
                                onPress={() => setShowFilterMenu(!showFilterMenu)}
                            >
                                <Ionicons name="funnel" size={20} color="#111827" />
                                {chatFilter !== 'all' && <View style={styles.filterBadge} />}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Filter Menu */}
                    {showFilterMenu && (
                        <View style={styles.filterMenu}>
                            {(['all', 'unread', 'groups', 'dms'] as ChatFilter[]).map((filter) => (
                                <TouchableOpacity
                                    key={filter}
                                    style={[
                                        styles.filterOption,
                                        chatFilter === filter && styles.filterOptionActive,
                                    ]}
                                    onPress={() => {
                                        setChatFilter(filter);
                                        setShowFilterMenu(false);
                                    }}
                                >
                                    <Ionicons
                                        name={
                                            filter === 'all' ? 'chatbubbles' :
                                            filter === 'unread' ? 'notifications' :
                                            filter === 'groups' ? 'people' :
                                            'person'
                                        }
                                        size={16}
                                        color={chatFilter === filter ? '#3b82f6' : '#64748b'}
                                    />
                                    <Text style={[
                                        styles.filterOptionText,
                                        chatFilter === filter && styles.filterOptionTextActive,
                                    ]}>
                                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchWrapper}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={18} color="#94a3b8" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search conversations..."
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={18} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>
                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#3b82f6" />
                    </View>
                ) : error ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={filteredChats}
                        renderItem={renderChatItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#3b82f6"
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconContainer}>
                                    <Ionicons name="chatbubbles-outline" size={40} color="#94a3b8" />
                                </View>
                                <Text style={styles.emptyText}>No conversations found</Text>
                                <Text style={styles.emptySubtext}>Start a new chat to begin messaging</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.9}
                onPress={() => setNewChatModalVisible(true)}
            >
                <LinearGradient
                    colors={["#3b82f6", "#2563eb"]}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={32} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>

            {/* New Chat Modal */}
            <Modal
                visible={newChatModalVisible}
                animationType="slide"
                onRequestClose={() => setNewChatModalVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            onPress={() => {
                                setNewChatModalVisible(false);
                                setSelectedUserIds(new Set());
                                setGroupName("");
                                setGroupDescription("");
                                setUserSearchQuery("");
                            }}
                        >
                            <Text style={styles.modalCancelButton}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {selectedUserIds.size > 1 ? "New Group" : "New Chat"}
                        </Text>
                        <TouchableOpacity
                            onPress={handleCreateChat}
                            disabled={selectedUserIds.size === 0 || isCreating}
                        >
                            {isCreating ? (
                                <ActivityIndicator size="small" color="#3b82f6" />
                            ) : (
                                <Text style={[styles.modalDoneButton, selectedUserIds.size === 0 && styles.disabledButton]}>
                                    {selectedUserIds.size > 1 ? "Create" : "Start"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Group Inputs */}
                    {selectedUserIds.size > 1 && canCreateGroup && (
                        <View style={styles.groupInputSection}>
                            <View style={styles.groupInputWrapper}>
                                <View style={styles.groupIconPlaceholder}>
                                    <Ionicons name="camera" size={24} color="#94a3b8" />
                                </View>
                                <View style={{ flex: 1, gap: 12 }}>
                                    <TextInput
                                        style={styles.groupNameInput}
                                        placeholder="Group Name"
                                        value={groupName}
                                        onChangeText={setGroupName}
                                        placeholderTextColor="#94a3b8"
                                    />
                                    <View style={styles.groupInputDivider} />
                                    <TextInput
                                        style={styles.groupDescInput}
                                        placeholder="Group Description (optional)"
                                        value={groupDescription}
                                        onChangeText={setGroupDescription}
                                        placeholderTextColor="#94a3b8"
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    <View style={styles.modalSearchWrapper}>
                        <View style={styles.modalSearchContainer}>
                            <Ionicons name="search-outline" size={18} color="#94a3b8" />
                            <TextInput
                                style={styles.modalSearchInput}
                                placeholder="Search people..."
                                placeholderTextColor="#94a3b8"
                                value={userSearchQuery}
                                onChangeText={setUserSearchQuery}
                            />
                        </View>
                    </View>

                    <FlatList
                        data={filteredUsers}
                        renderItem={renderUserItem}
                        keyExtractor={(item) => item.user_id.toString()}
                        contentContainerStyle={styles.userListContent}
                    />
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    headerContainer: {
        paddingTop: 8,
        paddingBottom: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    headerContent: {
        paddingHorizontal: 20,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#f8fafc",
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "900",
        color: "#111827",
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 12,
        color: "#94a3b8",
        fontWeight: "500",
        marginTop: 2,
    },
    headerIconButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#f8fafc",
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "#e2e8f0",
        position: 'relative',
    },
    filterBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3b82f6',
    },
    filterMenu: {
        marginTop: 12,
        paddingVertical: 8,
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        overflow: 'hidden',
    },
    filterOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    filterOptionActive: {
        backgroundColor: "#f0f7ff",
    },
    filterOptionText: {
        fontSize: 14,
        color: "#64748b",
        fontWeight: "500",
    },
    filterOptionTextActive: {
        color: "#3b82f6",
        fontWeight: "700",
    },
    searchWrapper: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: "#fff",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 44,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: "#111827",
        fontWeight: "500",
    },
    contentContainer: {
        flex: 1,
        backgroundColor: "#fff",
    },
    listContent: {
        paddingBottom: 100,
    },
    chatRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    chatMainTouchable: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    avatarContainer: {
        marginRight: 16,
        position: 'relative',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 18,
        backgroundColor: "#f1f5f9",
    },
    avatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    avatarText: {
        fontSize: 20,
        fontWeight: "800",
        color: "#fff",
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2.5,
        borderColor: '#fff',
    },
    chatContent: {
        flex: 1,
        gap: 4,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    chatName: {
        fontSize: 17,
        fontWeight: "800",
        color: "#111827",
        letterSpacing: -0.3,
        flex: 1,
    },
    chatTime: {
        fontSize: 12,
        color: "#94a3b8",
        fontWeight: "500",
        marginLeft: 8,
    },
    chatTimeUnread: {
        color: "#3b82f6",
        fontWeight: "700",
    },
    chatFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    lastMessage: {
        fontSize: 14,
        color: "#64748b",
        fontWeight: "400",
        flex: 1,
    },
    lastMessageUnread: {
        color: "#111827",
        fontWeight: "700",
    },
    unreadBadge: {
        backgroundColor: "#3b82f6",
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "800",
    },
    optionsButton: {
        padding: 8,
        marginLeft: 4,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: "#3b82f6",
        shadowColor: "#3b82f6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    fabGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        paddingTop: 100,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: "#f8fafc",
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "800",
        color: "#111827",
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: "#64748b",
        textAlign: 'center',
        lineHeight: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        gap: 16,
    },
    errorText: {
        color: "#64748b",
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: "#111827",
        borderRadius: 12,
    },
    retryButtonText: {
        color: "#fff",
        fontWeight: "700",
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: "#fff",
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    modalCancelButton: {
        fontSize: 16,
        color: "#64748b",
        fontWeight: "600",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#111827",
    },
    modalDoneButton: {
        fontSize: 16,
        color: "#3b82f6",
        fontWeight: "800",
    },
    groupInputSection: {
        padding: 20,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    groupInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    groupIconPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 20,
        backgroundColor: "#f8fafc",
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderStyle: 'dashed',
    },
    groupNameInput: {
        fontSize: 17,
        fontWeight: "700",
        color: "#111827",
        padding: 0,
    },
    groupDescInput: {
        fontSize: 14,
        color: "#64748b",
        padding: 0,
    },
    groupInputDivider: {
        height: 1,
        backgroundColor: "#f1f5f9",
    },
    modalSearchWrapper: {
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    modalSearchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    modalSearchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: "#111827",
    },
    userListContent: {
        paddingHorizontal: 20,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
        borderRadius: 12,
        paddingHorizontal: 8,
    },
    selectedUserItem: {
        backgroundColor: "#f0f7ff",
    },
    userAvatarWrapper: {
        position: 'relative',
    },
    userAvatarImage: {
        width: 44,
        height: 44,
        borderRadius: 14,
    },
    userAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: "#f1f5f9",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    userAvatarText: {
        fontSize: 18,
        fontWeight: "800",
        color: "#64748b",
    },
    userInfo: {
        flex: 1,
        gap: 2,
    },
    userName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
    },
    selectedUserName: {
        color: "#3b82f6",
    },
    userRole: {
        fontSize: 13,
        color: "#64748b",
    },
    groupMemberCount: {
        fontSize: 12,
        color: "#3b82f6",
        fontWeight: "600",
        marginTop: 2,
    },
    disabledButton: {
        opacity: 0.4,
    },
    permissionWarningContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#FEE2E2",
        borderLeftWidth: 4,
        borderLeftColor: "#EF4444",
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 8,
    },
    permissionWarningText: {
        fontSize: 14,
        color: "#DC2626",
        fontWeight: "500",
        flex: 1,
    },
});

export default ChatListScreen;
