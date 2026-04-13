import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Heart, MessageCircle, Users, Bell, CheckCheck } from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  getNotifications,
  markAllNotificationsAsRead,
} from "@/lib/club-storage";
import type { Notification } from "@/types";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const GREEN = "#2A7A52";
const BORDER = "#EBEBEB";
const MUTED = "#888888";

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}d`;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "like":
      return <Heart size={16} color="#EF4444" fill="#EF4444" strokeWidth={1.5} />;
    case "comment":
      return <MessageCircle size={16} color={GREEN} strokeWidth={1.5} />;
    case "session_join":
    case "new_member":
    case "join_request":
    case "join_approved":
    case "join_rejected":
      return <Users size={16} color="#7C3AED" strokeWidth={1.5} />;
    default:
      return <Bell size={16} color={MUTED} strokeWidth={1.5} />;
  }
}

function getNotificationText(n: Notification): string {
  const actor = n.actorUsername || n.data?.username || "Someone";
  switch (n.type) {
    case "like":
      return `${actor} liked your post`;
    case "comment":
      return `${actor} commented on your post`;
    case "session_join":
      return `${actor} joined ${n.data?.clubName || "your session"}`;
    case "join_request":
      return `${actor} wants to join ${n.data?.clubName || "your club"}`;
    case "join_approved":
      return `You were approved to join ${n.data?.clubName || "a club"}`;
    case "join_rejected":
      return `Your request to join ${n.data?.clubName || "a club"} was declined`;
    case "new_member":
      return `${actor} joined ${n.data?.clubName || "your club"}`;
    default:
      return n.title || n.message || "New notification";
  }
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getNotifications(user.id);
      setNotifications(data);
      await markAllNotificationsAsRead(user.id);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = (notification: Notification) => {
    if (notification.type === "like" || notification.type === "comment") {
      if (notification.bookmarkId) {
        const bookmark = { id: notification.bookmarkId } as any;
        navigation.navigate("BookmarkDetail", { bookmark });
      }
    } else if (notification.type === "join_approved" && notification.data.clubId) {
      navigation.navigate("ClubHome", { clubId: notification.data.clubId, showWelcome: true });
    } else if (
      (notification.type === "join_request" || notification.type === "session_join") &&
      notification.data.clubId
    ) {
      navigation.navigate("ClubManagement", { clubId: notification.data.clubId });
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const isUnread = !item.read;
    return (
      <Pressable
        style={[
          styles.notifRow,
          { borderBottomColor: BORDER },
          isUnread && { backgroundColor: "#F0FAF5" },
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: item.type === "like" ? "#FEF2F2" : item.type === "comment" ? "#F0FAF5" : "#F3F0FF" },
          ]}
        >
          {getNotificationIcon(item.type)}
        </View>
        <View style={styles.notifContent}>
          <ThemedText style={[styles.notifText, { color: theme.text }]} numberOfLines={2}>
            {getNotificationText(item)}
          </ThemedText>
          <ThemedText style={[styles.notifTime, { color: MUTED }]}>
            {timeAgo(item.createdAt)}
          </ThemedText>
        </View>
        {isUnread ? <View style={styles.unreadDot} /> : null}
      </Pressable>
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4, borderBottomColor: BORDER }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.topBtn} hitSlop={8}>
          <ChevronLeft size={22} color={theme.text} strokeWidth={2} />
        </Pressable>
        <ThemedText style={[styles.topBarTitle, { color: theme.text }]}>Notifications</ThemedText>
        {unreadCount > 0 ? (
          <Pressable
            style={styles.markReadBtn}
            onPress={async () => {
              if (user?.id) {
                await markAllNotificationsAsRead(user.id);
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              }
            }}
          >
            <CheckCheck size={18} color={GREEN} strokeWidth={1.5} />
          </Pressable>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={GREEN} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={GREEN}
              colors={[GREEN]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Bell size={40} color={MUTED} strokeWidth={1} />
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
                All caught up
              </ThemedText>
              <ThemedText style={[styles.emptySubtitle, { color: MUTED }]}>
                Your notifications will appear here
              </ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topBtn: { padding: 4 },
  topBarTitle: { fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  markReadBtn: { padding: 4 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: { flex: 1, gap: 2 },
  notifText: { fontSize: 14, lineHeight: 20 },
  notifTime: { fontSize: 12 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2A7A52",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
