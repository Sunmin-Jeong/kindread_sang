import React, { useCallback, useState, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  RefreshControl,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Users, Calendar } from "lucide-react-native";
import { Image } from "expo-image";

import { ProgressCard } from "@/components/ProgressCard";
import { ReviewCard } from "@/components/ReviewCard";
import { StreakBar } from "@/components/StreakBar";
import { EmptyState } from "@/components/EmptyState";
import { PostFABMenu } from "@/components/PostFABMenu";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { COLORS } from "@/constants/colors";
import { FONTS } from "@/constants/fonts";
import { getPublicBookmarks, getBookmarksByUserIds } from "@/lib/storage";
import { getFollowedUserIds } from "@/lib/follows-storage";
import { getUserClubs } from "@/lib/club-storage";
import type { Bookmark, Club } from "@/types";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type FeedTab = "all" | "friends";

const GREEN = COLORS.green;
const PURPLE = COLORS.greenDark;
const PURPLE_BG = COLORS.greenDim;
const BORDER = COLORS.line;
const MUTED = COLORS.sub;

function daysUntil(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "Past";
  if (diff === 0) return "Today";
  return `D-${diff}`;
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>([]);
  const [friendsBookmarks, setFriendsBookmarks] = useState<Bookmark[]>([]);
  const [mySessions, setMySessions] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedTab, setFeedTab] = useState<FeedTab>("all");

  const computeStreak = useCallback((userBookmarksList: Bookmark[]) => {
    const daySet = new Set(
      userBookmarksList.map((b) => {
        const d = new Date(b.createdAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (daySet.has(key)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  }, []);

  const streakData = useMemo(() => {
    if (!user?.id) return { streakDays: 0, booksThisMonth: 0 };
    const userBookmarks = allBookmarks.filter((b) => b.userId === user.id);
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const booksThisMonth = new Set(
      userBookmarks
        .filter((b) => {
          const d = new Date(b.createdAt);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear && b.book;
        })
        .map((b) => b.book?.id)
    ).size;
    return { streakDays: computeStreak(userBookmarks), booksThisMonth };
  }, [allBookmarks, user?.id, computeStreak]);

  const userStreakMap = useMemo(() => {
    const grouped: Record<string, Bookmark[]> = {};
    allBookmarks.forEach((b) => {
      if (!grouped[b.userId]) grouped[b.userId] = [];
      grouped[b.userId].push(b);
    });
    const map: Record<string, number> = {};
    Object.entries(grouped).forEach(([uid, bms]) => {
      map[uid] = computeStreak(bms);
    });
    return map;
  }, [allBookmarks, computeStreak]);

  const loadData = useCallback(async () => {
    try {
      const [allData, clubsData] = await Promise.all([
        getPublicBookmarks(),
        user?.id ? getUserClubs(user.id) : Promise.resolve([]),
      ]);
      setAllBookmarks(allData);
      setMySessions(clubsData.filter((c) => c.type === "session"));

      if (user?.id) {
        const followedIds = await getFollowedUserIds(user.id);
        if (followedIds.length > 0) {
          const friendsData = await getBookmarksByUserIds(followedIds);
          setFriendsBookmarks(friendsData);
        } else {
          setFriendsBookmarks([]);
        }
      }
    } catch (error) {
      console.error("Error loading feed:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const displayedBookmarks = feedTab === "friends" ? friendsBookmarks : allBookmarks;

  const renderSessionsStrip = () => {
    if (mySessions.length === 0) return null;
    return (
      <View style={styles.sessionsSection}>
        <View style={styles.sessionsTitleRow}>
          <ThemedText style={styles.sectionLabel}>YOUR SESSIONS</ThemedText>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sessionsStrip}
        >
          {mySessions.map((session) => (
            <Pressable
              key={session.id}
              style={[styles.sessionCard, { borderColor: BORDER }]}
              onPress={() => navigation.navigate("SessionDetail", { clubId: session.id })}
            >
              {session.imageUrl ? (
                <Image
                  source={{ uri: session.imageUrl }}
                  style={styles.sessionCover}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.sessionCover, styles.sessionCoverPlaceholder, { backgroundColor: PURPLE_BG }]}>
                  <ThemedText style={[styles.sessionCoverInitial, { color: PURPLE }]}>
                    {session.name.slice(0, 1).toUpperCase()}
                  </ThemedText>
                </View>
              )}
              <View style={styles.sessionCardInfo}>
                <ThemedText style={styles.sessionCardName} numberOfLines={2}>
                  {session.name}
                </ThemedText>
                {session.meetDate ? (
                  <View style={styles.sessionCardMeta}>
                    <Calendar size={10} color={PURPLE} strokeWidth={1.5} />
                    <ThemedText style={[styles.sessionCardDate, { color: PURPLE }]}>
                      {daysUntil(session.meetDate)}
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.sessionCardMeta}>
                    <Users size={10} color={MUTED} strokeWidth={1.5} />
                    <ThemedText style={[styles.sessionCardDate, { color: MUTED }]}>
                      {session.memberCount || 0} members
                    </ThemedText>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderFeedTabs = () => (
    <View style={[styles.feedTabBar, { borderBottomColor: BORDER }]}>
      {(["all", "friends"] as FeedTab[]).map((tab) => {
        const isActive = feedTab === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => setFeedTab(tab)}
            style={[styles.feedTab, isActive && { borderBottomColor: COLORS.green }]}
          >
            <ThemedText
              style={[
                styles.feedTabText,
                { color: isActive ? COLORS.text : COLORS.muted },
                isActive && styles.feedTabTextActive,
              ]}
            >
              {tab === "all" ? "All" : "Friends"}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );

  const renderHeader = () => (
    <View>
      <StreakBar
        streakDays={streakData.streakDays}
        booksThisMonth={streakData.booksThisMonth}
        onStreakPress={() =>
          navigation.navigate("StreakStats", { streakDays: streakData.streakDays })
        }
        onBooksPress={() =>
          navigation.navigate("BooksThisMonth", { booksThisMonth: streakData.booksThisMonth })
        }
      />
      {renderSessionsStrip()}
      {renderFeedTabs()}
    </View>
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Bookmark; index: number }) => {
      const streak = userStreakMap[item.userId] || 0;
      const CardComponent = item.postType === "review" ? ReviewCard : ProgressCard;
      return (
        <Animated.View entering={FadeInUp.delay(index * 20).duration(200)}>
          <CardComponent
            bookmark={item}
            onPress={() => navigation.navigate("BookmarkDetail", { bookmark: item })}
            onCommentPress={() =>
              navigation.navigate("BookmarkDetail", { bookmark: item, focusComment: true })
            }
            onRefresh={loadData}
            userStreakDays={streak}
          />
        </Animated.View>
      );
    },
    [loadData, userStreakMap, navigation]
  );

  const renderEmpty = () => {
    if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color={GREEN} />;
    if (feedTab === "friends") {
      return (
        <View style={styles.emptyFriends}>
          <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
            Follow readers to see their posts
          </ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: MUTED }]}>
            Discover readers in the Explore tab
          </ThemedText>
        </View>
      );
    }
    return <EmptyState type="feed" />;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.sm,
            paddingBottom: tabBarHeight + Spacing.xl + 72,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={displayedBookmarks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      <PostFABMenu bottom={tabBarHeight} onSuccess={loadData} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  content: { flexGrow: 1 },
  sessionsSection: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  sessionsTitleRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: FONTS.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: COLORS.sub,
  },
  sessionsStrip: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },
  sessionCard: {
    width: 120,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  sessionCover: {
    width: 120,
    height: 76,
  },
  sessionCoverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCoverInitial: {
    fontFamily: FONTS.bold,
    fontSize: 24,
  },
  sessionCardInfo: {
    padding: 8,
    gap: 4,
  },
  sessionCardName: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
  sessionCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  sessionCardDate: {
    fontFamily: FONTS.medium,
    fontSize: 10,
  },
  feedTabBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.75,
    marginTop: 4,
  },
  feedTab: {
    paddingVertical: Spacing.sm,
    marginRight: Spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  feedTabText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
  },
  feedTabTextActive: {
    fontFamily: FONTS.semibold,
  },
  emptyFriends: {
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 16,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
