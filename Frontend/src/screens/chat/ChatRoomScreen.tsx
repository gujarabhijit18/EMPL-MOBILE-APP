import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert,
    RefreshControl,
    ActivityIndicator,
    ImageBackground,
    Platform,
    KeyboardAvoidingView,
    Modal,
    Image,
    Pressable,
    Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from "../../contexts/AuthContext";
import { apiService, ChatMessage } from "../../lib/api";
import { handleApiError } from "../../utils/errorHandler";
import { formatTimeIST, formatIST, isToday, isYesterday, formatDateIST } from "../../utils/dateTime";

const PRIMARY_COLOR = "#fff";
const BACKGROUND_COLOR = "#f8fafc";
const TEXT_COLOR = "#111827";
const SUBTEXT_COLOR = "#64748b";
const BORDER_COLOR = "#e2e8f0";
const ACCENT_BLUE = "#3b82f6";

const ChatRoomScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { chatId, name, avatar, chatType, participantId } = route.params;
    const isGroup = chatType === 'group';
    const { user } = useAuth();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [otherUserName, setOtherUserName] = useState("");
    const [isOnline, setIsOnline] = useState(false);
    const [otherParticipantId, setOtherParticipantId] = useState<number | null>(participantId || null);

    // Synchronize participantId from params if it changes
    useEffect(() => {
        if (participantId && !isGroup) {
            setOtherParticipantId(participantId);
        }
    }, [participantId, isGroup]);

    const [participants, setParticipants] = useState<any[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [onlineCount, setOnlineCount] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    // UI States
    const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
    const [attachMenuVisible, setAttachMenuVisible] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
    const insets = useSafeAreaInsets();
    const [currentDay, setCurrentDay] = useState(new Date().toDateString());

    // Group messages by date with WhatsApp logic
    const chatData = useMemo(() => {
        const data: any[] = [];
        let lastDateHeader = "";

        messages.forEach((msg, idx) => {
            const date = new Date(msg.timestamp * 1000);
            let dateHeader = "";

            if (isToday(date)) {
                dateHeader = "Today";
            } else if (isYesterday(date)) {
                dateHeader = "Yesterday";
            } else {
                dateHeader = formatIST(date, "dd MMM yyyy");
            }

            if (dateHeader !== lastDateHeader) {
                data.push({
                    id: `date-header-${dateHeader}-${msg.timestamp}`,
                    type: 'header',
                    date: dateHeader
                });
                lastDateHeader = dateHeader;
            }

            const isLastFromUser = messages[idx + 1]?.sender_id !== msg.sender_id ||
                (messages[idx + 1] && formatDateIST(new Date(messages[idx + 1].timestamp * 1000)) !== formatDateIST(date));

            data.push({
                ...msg,
                type: 'message',
                isLastFromUser
            });
        });

        return data.reverse();
    }, [messages, currentDay]);

    // Auto-update sections at midnight IST
    useEffect(() => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setHours(24, 0, 0, 0);
        const msUntilMidnight = tomorrow.getTime() - now.getTime();

        const timer = setTimeout(() => {
            setCurrentDay(new Date().toDateString());
        }, msUntilMidnight + 1000);

        return () => clearTimeout(timer);
    }, [currentDay]);

    // Common emojis grouped by category
    const emojiCategories = {
        'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴'],
        'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '💖', '💗', '💓', '💞', '💕'],
        'Objects': ['💬', '💭', '🗨️', '🗯️', '💤', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '🗨️', '🗯️', '💬', '👁️', '🗨️', '💬', '📱', '📞', '☎️', '📟', '📠', '🔋', '🔌', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💾', '💿', '📀', '🧮', '🎥', '🎬', '📺', '📷', '📸', '📹', '📼', '🔍', '🔎', '🕯️', '💡'],
        'Nature': ['🌍', '🌎', '🌏', '🌐', '🗺️', '🗾', '🧭', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🏟️', '🏛️', '🏗️', '🧱', '🪨', '🪵', '🛖', '🌿', '🌱', '🌾', '🌳', '🌲', '🌴', '🌵', '🎋', '🎍', '🌾', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'],
    };

    const inputRef = useRef<TextInput>(null);

    const toggleEmojiPicker = () => {
        if (emojiPickerVisible) {
            // Switch to keyboard
            setEmojiPickerVisible(false); // Hide picker FIRST
            setTimeout(() => {
                inputRef.current?.focus(); // Then focus input
            }, 100);
        } else {
            // Switch to emoji picker
            Keyboard.dismiss(); // Hide keyboard FIRST
            setTimeout(() => {
                setEmojiPickerVisible(true); // Then show picker
            }, 100);
        }
    };

    // Keyboard event listeners
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    // Fetch messages on mount
    useEffect(() => {
        fetchMessages();
    }, [chatId]);

    // Refresh online status every 3 seconds
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                if (isGroup && participants.length > 0) {
                    // For group chats, refresh all participants' online status
                    let onlineCounter = 0;
                    const updatedParticipants = await Promise.all(
                        participants.map(async (p: any) => {
                            try {
                                const statusResponse = await apiService.getOnlineStatus(p.user_id);
                                if (statusResponse.is_online) {
                                    onlineCounter++;
                                }
                                return { ...p, is_online: statusResponse.is_online };
                            } catch (err) {
                                return { ...p, is_online: false };
                            }
                        })
                    );
                    setParticipants(updatedParticipants);
                    setOnlineCount(onlineCounter);
                } else if (!isGroup && otherParticipantId) {
                    // For DMs, refresh single participant's online status
                    try {
                        const statusResponse = await apiService.getOnlineStatus(otherParticipantId);
                        setIsOnline(statusResponse.is_online);
                    } catch (err) {
                        setIsOnline(false);
                    }
                }
            } catch (err) {
                console.log("Error refreshing online status");
            }
        };

        // Initial fetch
        fetchStatus();

        // Setup interval
        const interval = setInterval(fetchStatus, 3000); // Faster refresh (3 seconds)

        return () => clearInterval(interval);
    }, [otherParticipantId, isGroup, participants.length]);

    // Typing Indicator Logic
    useEffect(() => {
        if (!chatId) return;

        const timer = setTimeout(() => {
            if (isTyping) {
                apiService.sendTypingIndicator(chatType, chatId, true);
            } else {
                apiService.sendTypingIndicator(chatType, chatId, false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [isTyping, chatId, chatType]);

    // Handle typing indicator when other user sends messages
    useEffect(() => {
        if (messages.length === 0) return;

        // Get the last message from the other user
        const lastOtherMessage = [...messages].reverse().find(m => m.sender_id !== user?.user_id);

        if (lastOtherMessage) {
            // Convert epoch timestamp to ms
            const messageTime = lastOtherMessage.timestamp * 1000;
            const now = Date.now();
            const timeDiff = now - messageTime;

            // If last message was within last 3 seconds, consider them as typing
            if (timeDiff < 3000) {
                setOtherUserTyping(true);
                const typingTimer = setTimeout(() => setOtherUserTyping(false), 3000);
                return () => clearTimeout(typingTimer);
            }
        }
    }, [messages, user?.user_id]);

    // Mark messages as read when chat is opened or focused
    useFocusEffect(
        useCallback(() => {
            markMessagesAsRead();
        }, [chatId])
    );

    const markMessagesAsRead = async () => {
        if (messages.length === 0) return;

        try {
            // Mark the latest message from others as read
            const lastOtherMessage = [...messages].reverse().find(m => m.sender_id !== user?.user_id);
            if (lastOtherMessage && !lastOtherMessage.read_by.includes(user?.user_id as number)) {
                await apiService.markChatMessageAsRead(chatType, chatId, lastOtherMessage.id);
                console.log('✅ Last message marked as read');
            }
        } catch (error) {
            console.error('Failed to mark messages as read:', error);
        }
    };

    const fetchMessages = async () => {
        try {
            setLoading(true);
            setError(null);
            const messagesData = await apiService.getChatMessages(chatType, chatId);

            // Backend returns messages. Check order.
            // If messagesData[0] is newer than last, it's newest first. Standardize to oldest -> newest.
            let orderedMessages = messagesData;
            if (messagesData.length > 1 && messagesData[0].timestamp > messagesData[messagesData.length - 1].timestamp) {
                orderedMessages = [...messagesData].reverse();
            }
            setMessages(orderedMessages);

            // Fetch participants from sessions
            try {
                const sessions = await apiService.getChatSessions();
                const currentSession = sessions.find(s => s.chat_id === chatId);

                if (currentSession && currentSession.members) {
                    setParticipants(currentSession.members);

                    if (isGroup) {
                        setOnlineCount(currentSession.member_count);
                    } else {
                        const otherMember = currentSession.members.find(m => m.user_id !== user?.user_id);
                        if (otherMember) {
                            setOtherParticipantId(otherMember.user_id);
                        }
                    }
                }
            } catch (err) {
                console.log("Could not fetch session details");
            }
        } catch (err: any) {
            console.error("Failed to fetch messages:", err);
            const errorMsg = await handleApiError(err, navigation);
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (text: string = inputText) => {
        const content = text.trim();
        if (!content) return;

        try {
            setSending(true);
            setInputText("");
            setIsTyping(false);

            // Send message to backend
            const newMessage = await apiService.sendChatMessage(chatType, chatId, content);

            // Add to messages list
            setMessages((prev) => [...prev, newMessage]);

            // Scroll visibility handled by inverted prop
        } catch (err: any) {
            console.error("Failed to send message:", err);
            setInputText(content); // Restore input on error
            Alert.alert("Error", "Failed to send message. Please try again.");
        } finally {
            setSending(false);
        }
    };

    const handlePickImage = async () => {
        setAttachMenuVisible(false);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled) {
                // Here we would upload the image. For now, let's just alert.
                // We need an API endpoint to upload chat media.
                Alert.alert("Feature", "Image selection successful. Upload logic pending backend support.");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to pick image");
        }
    };

    const handlePickDocument = async () => {
        setAttachMenuVisible(false);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                Alert.alert("Feature", "Document selection successful. Upload logic pending backend support.");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to pick document");
        }
    };

    const navigateToDetails = () => {
        navigation.navigate("ChatDetails", {
            chatId,
            name,
            avatar,
            chatType
        });
    };

    const insertEmoji = (emoji: string) => {
        setInputText(prev => prev + emoji);
    };

    const renderItem = ({ item }: { item: any }) => {
        if (item.type === 'header') {
            return (
                <View style={styles.dateHeader}>
                    <Text style={styles.dateHeaderText}>{item.date}</Text>
                </View>
            );
        }

        const isMe = item.sender_id === user?.user_id;
        const isLastFromUser = item.isLastFromUser;

        // Format IST time strictly in 12-hour AM/PM
        const date = new Date(item.timestamp * 1000);
        const timestamp = formatIST(date, 'h:mm a');

        return (
            <View style={[
                styles.messageRow,
                isMe ? styles.myMessageRow : styles.otherMessageRow,
                isLastFromUser && { marginBottom: 16 }
            ]}>
                <View style={[
                    styles.messageBubble,
                    isMe ? styles.myMessageBubble : styles.otherMessageBubble,
                ]}>
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                        {item.content}
                    </Text>
                    <View style={styles.metaContainer}>
                        <Text style={[styles.messageTime, isMe ? styles.myMessageTimeText : styles.otherMessageTimeText]}>
                            {timestamp}
                        </Text>
                        {isMe && (
                            <Ionicons
                                name={item.read_by.length > 1 ? "checkmark-done" : "checkmark"}
                                size={14}
                                color={item.read_by.length > 1 ? "#3b82f6" : "rgba(255,255,255,0.6)"}
                                style={{ marginLeft: 4 }}
                            />
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: "#fff" }]} edges={['top']}>
            <StatusBar style="dark" backgroundColor="#fff" translucent={false} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeftContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={22} color="#111827" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.headerProfileBtn} onPress={navigateToDetails}>
                        <View style={styles.avatar}>
                            {avatar ? (
                                <Image source={{ uri: avatar }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                            )}
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
                            {!isGroup && (
                                <View style={styles.statusRow}>
                                    <View style={[styles.statusDot, { backgroundColor: isOnline ? "#10b981" : "#94a3b8" }]} />
                                    <Text style={styles.headerSubtitle}>
                                        {otherUserTyping ? "typing..." : (isOnline ? "Online" : "Offline")}
                                    </Text>
                                </View>
                            )}
                            {isGroup && (
                                <Text style={styles.headerSubtitle}>
                                    {participants.length} members
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.headerAction}
                        onPress={() => setHeaderMenuVisible(true)}
                    >
                        <Ionicons name="ellipsis-vertical" size={20} color="#111827" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Header Menu Dropdown */}
            <Modal
                transparent={true}
                visible={headerMenuVisible}
                onRequestClose={() => setHeaderMenuVisible(false)}
                animationType="fade"
            >
                <Pressable style={styles.modalOverlay} onPress={() => setHeaderMenuVisible(false)}>
                    <View style={styles.dropdownMenu}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => {
                            setHeaderMenuVisible(false);
                            navigateToDetails();
                        }}>
                            <Text style={styles.menuItemText}>{isGroup ? "Group Info" : "View Contact"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => {
                            setHeaderMenuVisible(false);
                            Alert.alert(
                                "Clear Chat",
                                "Are you sure you want to clear this chat? Messages will be deleted for you only.",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    {
                                        text: "Clear",
                                        style: "destructive",
                                        onPress: async () => {
                                            try {
                                                await apiService.clearChat(chatType, chatId);
                                                setMessages([]); // Clear locally
                                                fetchMessages(); // Verify from backend
                                            } catch (error) {
                                                Alert.alert("Error", "Failed to clear chat");
                                            }
                                        }
                                    }
                                ]
                            );
                        }}>
                            <Text style={styles.menuItemText}>Clear chat</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            {/* Content Wrapper handling Keyboard */}
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: "#f8fafc" }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                <View style={styles.messagesBackground}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#3b82f6" />
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity style={styles.retryButton} onPress={fetchMessages}>
                                <Text style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={chatData}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={styles.messagesList}
                            inverted={true}
                            showsVerticalScrollIndicator={false}
                            ListHeaderComponent={<View style={{ height: 10 }} />}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <View style={styles.emptyIconCircle}>
                                        <Ionicons name="chatbubbles-outline" size={32} color="#94a3b8" />
                                    </View>
                                    <Text style={styles.emptyText}>No messages yet</Text>
                                    <Text style={styles.emptySubtext}>Send a message to start the conversation</Text>
                                </View>
                            }
                        />
                    )}
                </View>

                {/* Input Area */}
                <View style={[
                    styles.inputContainer,
                    { paddingBottom: keyboardVisible ? 0 : insets.bottom || 8 }
                ]}>
                    {/* Attachment Menu (if visible, show above) */}
                    {attachMenuVisible && (
                        <View style={styles.attachmentMenu}>
                            <TouchableOpacity style={styles.attachItem} onPress={handlePickDocument}>
                                <View style={[styles.attachIcon, { backgroundColor: '#5F66CD' }]}>
                                    <Ionicons name="document" size={24} color="#fff" />
                                </View>
                                <Text style={styles.attachLabel}>Document</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.attachItem} onPress={() => { setAttachMenuVisible(false); handlePickImage(); }}>
                                <View style={[styles.attachIcon, { backgroundColor: '#D3396D' }]}>
                                    <Ionicons name="camera" size={24} color="#fff" />
                                </View>
                                <Text style={styles.attachLabel}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.attachItem} onPress={() => { setAttachMenuVisible(false); handlePickImage(); }}>
                                <View style={[styles.attachIcon, { backgroundColor: '#AC44CF' }]}>
                                    <Ionicons name="image" size={24} color="#fff" />
                                </View>
                                <Text style={styles.attachLabel}>Gallery</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.inputWrapper}>
                        {/* Attach Button */}
                        <TouchableOpacity
                            style={styles.iconButtonLeft}
                            onPress={() => setAttachMenuVisible(!attachMenuVisible)}
                        >
                            <Ionicons
                                name="add-outline"
                                size={24}
                                color="#64748b"
                            />
                        </TouchableOpacity>

                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor="#94a3b8"
                            value={inputText}
                            onFocus={() => {
                                setEmojiPickerVisible(false);
                                setIsTyping(true);
                            }}
                            onBlur={() => setIsTyping(false)}
                            onChangeText={(t) => {
                                setInputText(t);
                                setIsTyping(t.length > 0);
                            }}
                            multiline
                        />

                        {/* Emoji Button */}
                        <TouchableOpacity style={styles.iconButtonRight} onPress={toggleEmojiPicker}>
                            <Ionicons
                                name={emojiPickerVisible ? "keypad-outline" : "happy-outline"}
                                size={24}
                                color="#64748b"
                            />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                        onPress={() => sendMessage()}
                        activeOpacity={0.8}
                        disabled={!inputText.trim() && !sending}
                    >
                        <LinearGradient
                            colors={["#3b82f6", "#2563eb"]}
                            style={styles.sendButtonGradient}
                        >
                            <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Emoji Picker Layout (Replacing Keyboard) */}
                {emojiPickerVisible && (
                    <View style={[styles.emojiPickerContainer, { height: 300 }]}>
                        <View style={styles.emojiPickerHeader}>
                            <Text style={styles.emojiPickerTitle}>Select Emoji</Text>
                            <TouchableOpacity onPress={() => { setEmojiPickerVisible(false); keyboardVisible ? null : inputRef.current?.focus(); }}>
                                <Ionicons name="close" size={24} color="#111827" />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={Object.entries(emojiCategories)}
                            keyExtractor={(item) => item[0]}
                            renderItem={({ item }) => {
                                const [category, emojis] = item;
                                return (
                                    <View style={styles.emojiCategory}>
                                        <Text style={styles.emojiCategoryTitle}>{category}</Text>
                                        <View style={styles.emojiGrid}>
                                            {emojis.map((emoji, idx) => (
                                                <TouchableOpacity
                                                    key={idx}
                                                    style={styles.emojiButton}
                                                    onPress={() => insertEmoji(emoji)}
                                                >
                                                    <Text style={styles.emojiText}>{emoji}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                );
                            }}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
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
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        height: 64,
    },
    headerLeftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#fff",
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    headerProfileBtn: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: "#f1f5f9",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 14,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: "800",
        color: "#64748b",
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: "#111827",
        letterSpacing: -0.3,
    },
    dateHeader: {
        alignSelf: 'center',
        backgroundColor: 'rgba(226, 232, 240, 0.8)',
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 10,
        marginVertical: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    dateHeaderText: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 1,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    headerSubtitle: {
        fontSize: 12,
        color: "#64748b",
        fontWeight: "500",
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerAction: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        alignItems: 'flex-end',
    },
    dropdownMenu: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 4,
        width: 180,
        marginTop: 64,
        marginRight: 16,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    menuItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    menuItemText: {
        fontSize: 15,
        color: '#111827',
        fontWeight: "500",
    },
    attachmentMenu: {
        position: 'absolute',
        bottom: 70,
        left: 12,
        right: 12,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: "#e2e8f0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    attachItem: {
        alignItems: 'center',
    },
    attachIcon: {
        width: 52,
        height: 52,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    attachLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: "600",
    },
    messagesBackground: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    messagesList: {
        padding: 16,
        paddingBottom: 20,
    },
    messageRow: {
        flexDirection: "row",
        marginBottom: 8,
        alignItems: "flex-end",
    },
    myMessageRow: {
        justifyContent: "flex-end",
    },
    otherMessageRow: {
        justifyContent: "flex-start",
    },
    messageBubble: {
        maxWidth: "82%",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    myMessageBubble: {
        backgroundColor: "#3b82f6",
        borderBottomRightRadius: 4,
    },
    otherMessageBubble: {
        backgroundColor: "#FFFFFF",
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: "400",
    },
    myMessageText: {
        color: "#fff",
    },
    otherMessageText: {
        color: "#111827",
    },
    metaContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginTop: 4,
        minWidth: 50,
    },
    messageTime: {
        fontSize: 10,
        fontWeight: "500",
    },
    myMessageTimeText: {
        color: "rgba(255,255,255,0.7)",
    },
    otherMessageTimeText: {
        color: "#94a3b8",
    },
    emptyContainer: {
        flex: 1,
        paddingTop: 100,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: "#fff",
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#e2e8f0",
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
    inputContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        gap: 12,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-end",
        backgroundColor: "#f8fafc",
        borderRadius: 22,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: "#111827",
        maxHeight: 120,
        paddingTop: 8,
        paddingBottom: 8,
        paddingHorizontal: 8,
        fontWeight: "500",
    },
    iconButtonLeft: {
        padding: 6,
    },
    iconButtonRight: {
        padding: 6,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: 'hidden',
    },
    sendButtonGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    emojiPickerContainer: {
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
    },
    emojiPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    emojiPickerTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
    },
    emojiCategory: {
        padding: 16,
    },
    emojiCategoryTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#64748b",
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    emojiButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiText: {
        fontSize: 24,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 30,
        gap: 16,
    },
    errorText: {
        fontSize: 15,
        color: "#64748b",
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
});

export default ChatRoomScreen;
