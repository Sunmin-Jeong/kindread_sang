import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, useFocusEffect, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Users, Calendar, MapPin, Monitor, Timer } from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  getClub,
  getClubMembers,
  getClubBookmarks,
  getUserMembership,
  joinClub,
} from "@/lib/club-storage";
import type { Club, ClubMember, Bookmark } from "@/types";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "SessionDetail">;
type Tab = "feed" | "progress" | "members";

const PURPLE = "#7C3AED";
const PURPLE_BG = "#F3F0FF";
const GREEN = "#2A7A52";
const GREEN_BG = "#E8F3ED";
const BORDER = "#EBEBEB";
const MUTED = "#777777";

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysUntil(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "Passed";
  if (diff === 0) return "Today";
  return `D-${diff}`;
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function formatLabel(format?: string): { icon: string; label: string } {
  switch (format) {
    case "offline": return { icon: "📍", label: "Offline" };
    case "read_along": return { icon: "📖", label: "Read-along" };
    default: return { icon: "🖥", label: "Online" };
  }
}

function getProgressPct(bookmark: Bookmark): number {
  if (!bookmark.pageNumber) return 0;
  if (bookmark.progressType === "percent") return Math.min(bookmark.pageNumber, 100);
  if (bookmark.book?.totalPages) return Math.min(Math.round((bookmark.pageNumber / bookmark.book.totalPages) * 100), 100);
  return 0;
}

export default function SessionDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { clubId } = route.params;

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [membership, setMembership] = useState<ClubMember | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const loadData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const [clubData, membersData, bookmarksData] = await Promise.all([
        getClub(clubId),
        getClubMembers(clubId),
        getClubBookmarks(clubId),
      ]);
      setClub(clubData);
      setMembers(membersData);
      setBookmarks(bookmarksData);
      if (user?.id) {
        const mem = await getUserMembership(clubId, user.id);
        setMembership(mem);
      }
    } catch (e) {
      console.error("SessionDetail error:", e);
    } finally {
      setLoading(false);
    }
  }, [clubId, user?.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleJoin = async () => {
    if (!user?.id) return;
    setJoining(true);
    try {
      const result = await joinClub(clubId, user.id, true);
      if (result.success) {
        loadData();
      } else {
        Alert.alert("Error", result.error || "Could not join session");
      }
    } finally {
      setJoining(false);
    }
  };

  const fmt = formatLabel(club?.format);
  const isMember = !!membership;
  const host = members.find((m) => m.role === "host");

  // Progress: latest page per member (for this book)
  const memberProgress = (() => {
    if (!club?.bookId) return [];
    const latestByUser = new Map<string, Bookmark>();
    for (const bm of bookmarks) {
      if (bm.book?.id !== club.bookId) continue;
      const prev = latestByUser.get(bm.userId);
      if (!prev || new Date(bm.createdAt) > new Date(prev.createdAt)) {
        latestByUser.set(bm.userId, bm);
      }
    }
    return members.map((m) => {
      const bm = latestByUser.get(m.userId);
      return { member: m, pct: bm ? getProgressPct(bm) : 0 };
    }).sort((a, b) => b.pct - a.pct);
  })();

  const renderFeedItem = ({ item }: { item: Bookmark }) => {
    return (
      <Pressable
        style={[styles.feedItem, { borderBottomColor: BORDER }]}
        onPress={() => navigation.navigate("BookmarkDetail", { bookmark: item })}
      >
        <View style={styles.feedHeader}>
          <Pressable
            style={[styles.feedAvatar, { backgroundColor: "#E8E8E8" }]}
            onPress={(e) => { e.stopPropagation(); navigation.navigate("UserProfile", { userId: item.userId }); }}
          >
            <ThemedText style={styles.feedAvatarText}>{item.username.slice(0, 2).toUpperCase()}</ThemedText>
          </Pressable>
          <Pressable
            style={{ flex: 1 }}
            onPress={(e) => { e.stopPropagation(); navigation.navigate("UserProfile", { userId: item.userId }); }}
          >
            <ThemedText style={[styles.feedUsername, { color: theme.text }]}>{item.username}</ThemedText>
            <ThemedText style={[styles.feedTime, { color: MUTED }]}>{timeAgo(item.createdAt)}</ThemedText>
          </Pressable>
          {item.pageNumber ? (
            <View style={[styles.pageBadge, { backgroundColor: "#F5F5F5" }]}>
              <ThemedText style={[styles.pageBadgeText, { color: MUTED }]}>p.{item.pageNumber}</ThemedText>
            </View>
          ) : null}
        </View>
        {item.quoteText ? (
          <ThemedText style={[styles.feedQuote, { color: GREEN }]} serif numberOfLines={3}>"{item.quoteText}"</ThemedText>
        ) : null}
        {item.textContent && !item.quoteText ? (
          <ThemedText style={[styles.feedText, { color: theme.text }]} numberOfLines={4}>{item.textContent}</ThemedText>
        ) : null}
        {item.textContent && item.quoteText ? (
          <ThemedText style={[styles.feedText, { color: theme.text }]} numberOfLines={3}>{item.textContent}</ThemedText>
        ) : null}
      </Pressable>
    );
  };

  const renderProgressItem = ({ item }: { item: { member: ClubMember; pct: number } }) => (
    <Pressable
      style={[styles.progressRow, { borderBottomColor: BORDER }]}
      onPress={() => navigation.navigate("UserProfile", { userId: item.member.userId })}
    >
      <View style={[styles.progressAvatar, { backgroundColor: item.member.userId === user?.id ? PURPLE_BG : "#E8E8E8" }]}>
        <ThemedText style={[styles.progressAvatarText, { color: item.member.userId === user?.id ? PURPLE : theme.text }]}>
          {item.member.username.slice(0, 2).toUpperCase()}
        </ThemedText>
      </View>
      <ThemedText style={[styles.progressName, { color: theme.text }]} numberOfLines={1}>{item.member.username}</ThemedText>
      <View style={[styles.progressBarBg, { backgroundColor: BORDER }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${item.pct}%`,
              backgroundColor: item.member.userId === user?.id ? PURPLE : GREEN,
            },
          ]}
        />
      </View>
      <ThemedText style={[styles.progressPct, { color: item.member.userId === user?.id ? PURPLE : MUTED }]}>
        {item.pct}%
      </ThemedText>
    </Pressable>
  );

  const renderMemberItem = ({ item }: { item: ClubMember }) => (
    <Pressable
      style={[styles.memberRow, { borderBottomColor: BORDER }]}
      onPress={() => navigation.navigate("UserProfile", { userId: item.userId })}
    >
      <View style={[styles.memberAvatar, { backgroundColor: "#E8E8E8" }]}>
        <ThemedText style={styles.memberAvatarText}>{item.username.slice(0, 2).toUpperCase()}</ThemedText>
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.memberName, { color: theme.text }]}>{item.username}</ThemedText>
      </View>
      {item.role === "host" ? (
        <View style={[styles.roleBadge, { backgroundColor: PURPLE_BG }]}>
          <ThemedText style={[styles.roleText, { color: PURPLE }]}>Host</ThemedText>
        </View>
      ) : null}
    </Pressable>
  );

  if (loading) {
    return (
      <View style={[styles.root, styles.loader, { backgroundColor: "#FFFFFF" }]}>
        <ActivityIndicator color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: "#FFFFFF" }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top, borderBottomColor: BORDER }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.topBtn} hitSlop={8}>
          <ChevronLeft size={22} color={theme.text} strokeWidth={2} />
        </Pressable>
        <ThemedText style={[styles.topBarTitle, { color: theme.text }]} numberOfLines={1}>Session</ThemedText>
        <Pressable style={styles.inviteBtn}>
          <ThemedText style={[styles.inviteBtnText, { color: GREEN }]}>Invite</ThemedText>
        </Pressable>
      </View>

      {/* Book hero */}
      <View style={[styles.hero, { borderBottomColor: BORDER }]}>
        <View style={styles.heroLeft}>
          {club?.imageUrl ? (
            <Image source={{ uri: club.imageUrl }} style={styles.bookCover} contentFit="cover" />
          ) : (
            <View style={[styles.bookCoverPlaceholder, { backgroundColor: "#F0F0F0" }]}>
              <ThemedText style={{ fontSize: 28 }}>📚</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.heroRight}>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.badge, { backgroundColor: PURPLE_BG }]}>
              <ThemedText style={[styles.badgeText, { color: PURPLE }]}>Session</ThemedText>
            </View>
            <View style={[styles.badge, { backgroundColor: "#F5F5F5" }]}>
              <ThemedText style={styles.badgeMuted}>{fmt.icon} {fmt.label}</ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.heroTitle, { color: theme.text }]} numberOfLines={2}>{club?.name}</ThemedText>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Users size={12} color={MUTED} strokeWidth={1.5} />
              <ThemedText style={[styles.heroStatText, { color: MUTED }]}>{club?.memberCount || members.length}</ThemedText>
            </View>
            {club?.meetDate ? (
              <View style={styles.heroStat}>
                <Calendar size={12} color={MUTED} strokeWidth={1.5} />
                <ThemedText style={[styles.heroStatText, { color: PURPLE }]}>{daysUntil(club.meetDate)}</ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Info rows */}
      {(club?.meetDate || club?.location || club?.link || club?.deadline) ? (
        <View style={[styles.infoRows, { borderBottomColor: BORDER }]}>
          {club.meetDate ? (
            <View style={styles.infoRow}>
              <Calendar size={14} color={MUTED} strokeWidth={1.5} />
              <ThemedText style={[styles.infoText, { color: theme.text }]}>{formatDate(club.meetDate)}</ThemedText>
            </View>
          ) : null}
          {club.location ? (
            <View style={styles.infoRow}>
              <MapPin size={14} color={MUTED} strokeWidth={1.5} />
              <ThemedText style={[styles.infoText, { color: theme.text }]}>{club.location}</ThemedText>
            </View>
          ) : null}
          {club.link ? (
            <View style={styles.infoRow}>
              <Monitor size={14} color={MUTED} strokeWidth={1.5} />
              <ThemedText style={[styles.infoText, { color: GREEN }]} numberOfLines={1}>{club.link}</ThemedText>
            </View>
          ) : null}
          {club.deadline ? (
            <View style={styles.infoRow}>
              <Timer size={14} color={MUTED} strokeWidth={1.5} />
              <ThemedText style={[styles.infoText, { color: theme.text }]}>Deadline: {formatDate(club.deadline)}</ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: BORDER }]}>
        {(["feed", "progress", "members"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabItem, activeTab === t && { borderBottomColor: PURPLE }]}
            onPress={() => setActiveTab(t)}
          >
            <ThemedText
              style={[styles.tabText, { color: activeTab === t ? PURPLE : MUTED }, activeTab === t && styles.tabTextActive]}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === "feed" ? (
          <FlatList
            data={bookmarks}
            renderItem={renderFeedItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <ThemedText style={[styles.emptyText, { color: MUTED }]}>No posts yet. Start reading!</ThemedText>
              </View>
            }
          />
        ) : null}
        {activeTab === "progress" ? (
          <FlatList
            data={memberProgress}
            renderItem={renderProgressItem}
            keyExtractor={(item) => item.member.id}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <ThemedText style={[styles.sectionLabel, { paddingHorizontal: 20, paddingTop: 16 }]}>MEMBER PROGRESS</ThemedText>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <ThemedText style={[styles.emptyText, { color: MUTED }]}>No progress logged yet.</ThemedText>
              </View>
            }
          />
        ) : null}
        {activeTab === "members" ? (
          <FlatList
            data={members}
            renderItem={renderMemberItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        ) : null}
      </View>

      {/* Fixed bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8, borderTopColor: BORDER }]}>
        {isMember ? (
          <Pressable
            style={[styles.bottomBtn, { backgroundColor: PURPLE }]}
            onPress={() => navigation.navigate("CreateBookmark", { clubId })}
          >
            <ThemedText style={styles.bottomBtnText}>Log today's reading</ThemedText>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.bottomBtn, { backgroundColor: PURPLE }]}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? <ActivityIndicator color="#FFFFFF" /> : (
              <ThemedText style={styles.bottomBtnText}>Join this session</ThemedText>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topBtn: { padding: 4 },
  topBarTitle: { fontSize: 16, fontWeight: "600", flex: 1, textAlign: "center" },
  inviteBtn: { padding: 4 },
  inviteBtnText: { fontSize: 14, fontWeight: "600" },
  hero: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
  },
  heroLeft: {},
  bookCover: { width: 76, height: 108, borderRadius: 6 },
  bookCoverPlaceholder: {
    width: 76,
    height: 108,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  heroRight: { flex: 1, gap: 6 },
  heroBadgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  badgeMuted: { fontSize: 11, color: "#555" },
  heroTitle: { fontSize: 17, fontWeight: "700", lineHeight: 23 },
  heroStats: { flexDirection: "row", gap: 12 },
  heroStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroStatText: { fontSize: 12 },
  infoRows: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontSize: 13 },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tabItem: {
    paddingVertical: 10,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 13, fontWeight: "400" },
  tabTextActive: { fontWeight: "600" },
  feedItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  feedHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  feedAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  feedAvatarText: { fontSize: 10, fontWeight: "600" },
  feedUsername: { fontSize: 13, fontWeight: "600" },
  feedTime: { fontSize: 11 },
  pageBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  pageBadgeText: { fontSize: 11, fontWeight: "500" },
  feedQuote: { fontSize: 14, lineHeight: 21 },
  feedText: { fontSize: 14, lineHeight: 21 },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  progressAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  progressAvatarText: { fontSize: 10, fontWeight: "600" },
  progressName: { width: 80, fontSize: 13 },
  progressBarBg: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  progressBarFill: { height: 4, borderRadius: 2 },
  progressPct: { width: 34, fontSize: 12, fontWeight: "600", textAlign: "right" },
  sectionLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, color: "#999999", marginBottom: 8 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontSize: 12, fontWeight: "600" },
  memberName: { fontSize: 14, fontWeight: "500" },
  roleBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { fontSize: 11, fontWeight: "600" },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 14, textAlign: "center" },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  bottomBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
});
