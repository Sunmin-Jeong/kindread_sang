import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, useFocusEffect, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, MapPin, Globe } from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { BookmarkCard } from "@/components/BookmarkCard";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowCounts,
  getFollowers,
  getFollowing,
  getUserProfile,
} from "@/lib/follows-storage";
import { getUserBookmarks } from "@/lib/storage";
import type { Bookmark, FollowProfile } from "@/types";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "UserProfile">;

const GREEN = "#2A7A52";
const GREEN_BG = "#E8F3ED";
const BORDER = "#EBEBEB";
const MUTED = "#777777";
const TEXT = "#0A0A0A";

interface UserProfileData {
  id: string;
  username: string;
  bio?: string;
  city?: string;
  country?: string;
  languages?: string[];
}

function FollowListModal({
  visible,
  title,
  users,
  onClose,
  onUserPress,
}: {
  visible: boolean;
  title: string;
  users: FollowProfile[];
  onClose: () => void;
  onUserPress: (userId: string) => void;
}) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[modalStyles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[modalStyles.header, { borderBottomColor: BORDER }]}>
          <ThemedText style={[modalStyles.title, { color: theme.text }]}>{title}</ThemedText>
          <Pressable onPress={onClose} style={modalStyles.closeBtn}>
            <ThemedText style={[modalStyles.closeText, { color: GREEN }]}>Done</ThemedText>
          </Pressable>
        </View>
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={[modalStyles.row, { borderBottomColor: BORDER }]}
              onPress={() => { onClose(); onUserPress(item.id); }}
            >
              <View style={[modalStyles.avatar, { backgroundColor: GREEN_BG }]}>
                <ThemedText style={[modalStyles.avatarText, { color: GREEN }]}>
                  {item.username.slice(0, 2).toUpperCase()}
                </ThemedText>
              </View>
              <ThemedText style={[modalStyles.username, { color: theme.text }]}>{item.username}</ThemedText>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={modalStyles.empty}>
              <ThemedText style={[modalStyles.emptyText, { color: MUTED }]}>No users yet</ThemedText>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState<FollowProfile[]>([]);
  const [followingList, setFollowingList] = useState<FollowProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const isOwnProfile = user?.id === userId;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, bookmarksData, counts] = await Promise.all([
        getUserProfile(userId),
        getUserBookmarks(userId),
        getFollowCounts(userId),
      ]);
      setProfile(profileData);
      setBookmarks(bookmarksData.filter((b) => b.visibility === "public"));
      setFollowerCount(counts.followers);
      setFollowingCount(counts.following);

      if (user?.id && !isOwnProfile) {
        const followStatus = await isFollowing(user.id, userId);
        setFollowing(followStatus);
      }
    } catch (e) {
      console.error("UserProfile load error:", e);
    } finally {
      setLoading(false);
    }
  }, [userId, user?.id, isOwnProfile]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleFollowToggle = async () => {
    if (!user?.id) return;
    setFollowLoading(true);
    const wasFollowing = following;
    // Optimistic update
    setFollowing(!wasFollowing);
    setFollowerCount((c) => wasFollowing ? Math.max(0, c - 1) : c + 1);
    try {
      const ok = wasFollowing
        ? await unfollowUser(user.id, userId)
        : await followUser(user.id, userId);
      if (!ok) {
        // Revert on failure
        setFollowing(wasFollowing);
        setFollowerCount((c) => wasFollowing ? c + 1 : Math.max(0, c - 1));
      }
    } catch {
      setFollowing(wasFollowing);
      setFollowerCount((c) => wasFollowing ? c + 1 : Math.max(0, c - 1));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShowFollowers = async () => {
    const list = await getFollowers(userId);
    setFollowers(list);
    setShowFollowers(true);
  };

  const handleShowFollowing = async () => {
    const list = await getFollowing(userId);
    setFollowingList(list);
    setShowFollowing(true);
  };

  const navigateToUser = (uid: string) => {
    navigation.push("UserProfile", { userId: uid });
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.loader, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator color={GREEN} />
      </View>
    );
  }

  const username = profile?.username || "Reader";
  const initials = username.slice(0, 2).toUpperCase();
  const hasLocation = profile?.city || profile?.country;
  const locationText = [profile?.city, profile?.country].filter(Boolean).join(", ");
  const hasLanguages = profile?.languages && profile.languages.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4, borderBottomColor: BORDER }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.topBtn} hitSlop={8}>
          <ChevronLeft size={22} color={theme.text} strokeWidth={2} />
        </Pressable>
        <ThemedText style={[styles.topBarTitle, { color: theme.text }]} numberOfLines={1}>
          {username}
        </ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: GREEN }]}>
            <ThemedText style={styles.avatarText}>{initials}</ThemedText>
          </View>
          <ThemedText style={[styles.displayName, { color: theme.text }]}>{username}</ThemedText>
          <ThemedText style={[styles.handle, { color: MUTED }]}>
            @{username.toLowerCase().replace(/\s/g, "")}
          </ThemedText>

          {profile?.bio ? (
            <ThemedText style={[styles.bio, { color: theme.text }]}>{profile.bio}</ThemedText>
          ) : null}

          <View style={styles.pillsRow}>
            {hasLocation ? (
              <View style={[styles.pill, { borderColor: BORDER }]}>
                <MapPin size={11} color={MUTED} strokeWidth={1.5} />
                <ThemedText style={[styles.pillText, { color: MUTED }]}>{locationText}</ThemedText>
              </View>
            ) : null}
            {hasLanguages ? (
              <View style={[styles.pill, { borderColor: BORDER }]}>
                <Globe size={11} color={MUTED} strokeWidth={1.5} />
                <ThemedText style={[styles.pillText, { color: MUTED }]}>
                  {(profile?.languages ?? []).join(" · ")}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View style={[styles.statsRow, { borderColor: BORDER }]}>
            <View style={styles.statCol}>
              <ThemedText style={[styles.statValue, { color: theme.text }]}>{bookmarks.length}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: MUTED }]}>Posts</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: BORDER }]} />
            <Pressable style={styles.statCol} onPress={handleShowFollowers}>
              <ThemedText style={[styles.statValue, { color: theme.text }]}>{followerCount}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: MUTED }]}>Followers</ThemedText>
            </Pressable>
            <View style={[styles.statDivider, { backgroundColor: BORDER }]} />
            <Pressable style={styles.statCol} onPress={handleShowFollowing}>
              <ThemedText style={[styles.statValue, { color: theme.text }]}>{followingCount}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: MUTED }]}>Following</ThemedText>
            </Pressable>
          </View>

          {!isOwnProfile ? (
            <Pressable
              style={[
                styles.followBtn,
                following
                  ? { borderColor: BORDER, borderWidth: 1, backgroundColor: "transparent" }
                  : { backgroundColor: GREEN },
              ]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={following ? GREEN : "#fff"} />
              ) : (
                <ThemedText
                  style={[styles.followBtnText, { color: following ? TEXT : "#fff" }]}
                >
                  {following ? "Following" : "Follow"}
                </ThemedText>
              )}
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.postsHeader, { borderBottomColor: BORDER }]}>
          <ThemedText style={styles.sectionLabel}>POSTS</ThemedText>
        </View>

        {bookmarks.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={[styles.emptyText, { color: MUTED }]}>No public posts yet</ThemedText>
          </View>
        ) : (
          bookmarks.map((item) => (
            <BookmarkCard
              key={item.id}
              bookmark={item}
              onPress={() => navigation.navigate("BookmarkDetail", { bookmark: item })}
              onCommentPress={() =>
                navigation.navigate("BookmarkDetail", { bookmark: item, focusComment: true })
              }
            />
          ))
        )}
      </ScrollView>

      <FollowListModal
        visible={showFollowers}
        title="Followers"
        users={followers}
        onClose={() => setShowFollowers(false)}
        onUserPress={navigateToUser}
      />
      <FollowListModal
        visible={showFollowing}
        title="Following"
        users={followingList}
        onClose={() => setShowFollowing(false)}
        onUserPress={navigateToUser}
      />
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
  hero: { alignItems: "center", padding: 24, gap: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: { fontSize: 24, fontWeight: "700", color: "#fff" },
  displayName: { fontSize: 20, fontWeight: "700" },
  handle: { fontSize: 13, marginTop: -4 },
  bio: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 4, paddingHorizontal: 16 },
  pillsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontSize: 12 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 8,
    alignSelf: "stretch",
    gap: 0,
  },
  statCol: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, height: 32 },
  followBtn: {
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    marginTop: 4,
    minWidth: 140,
  },
  followBtnText: { fontSize: 14, fontWeight: "600" },
  postsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sectionLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, color: "#999" },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 14 },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: "700" },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 14, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "600" },
  username: { fontSize: 15, fontWeight: "500" },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 14 },
});
