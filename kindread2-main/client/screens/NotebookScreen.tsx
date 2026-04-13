import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  Pressable,
  Platform,
  Alert,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Settings, MapPin, Globe, Plus, Bell, ChevronRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { BookmarkCard } from "@/components/BookmarkCard";
import { EmptyState } from "@/components/EmptyState";
import { FAB } from "@/components/FAB";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { getUserBookmarks, getRecentBooks } from "@/lib/storage";
import { getUserClubs, getUnreadNotificationCount } from "@/lib/club-storage";
import { getFollowCounts, getFollowers, getFollowing } from "@/lib/follows-storage";
import type { Bookmark, Book, Club, FollowProfile } from "@/types";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Image } from "expo-image";
import { COLORS } from "@/constants/colors";
import { ProfileTypography } from "@/constants/typography";
import { FONTS } from "@/constants/fonts";

type ProfileTab = "reading" | "posts" | "clubs" | "stats";

export default function NotebookScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("reading");
  const [unreadCount, setUnreadCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState<FollowProfile[]>([]);
  const [followingList, setFollowingList] = useState<FollowProfile[]>([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [booksData, bookmarksData, clubsData, unread, followCounts] = await Promise.all([
        getRecentBooks(user.id),
        getUserBookmarks(user.id),
        getUserClubs(user.id),
        user.id ? getUnreadNotificationCount(user.id) : Promise.resolve(0),
        user.id ? getFollowCounts(user.id) : Promise.resolve({ followers: 0, following: 0 }),
      ]);
      setRecentBooks(booksData);
      setBookmarks(bookmarksData);
      setMyClubs(clubsData);
      setUnreadCount(unread);
      setFollowerCount(followCounts.followers);
      setFollowingCount(followCounts.following);
    } catch (error) {
      console.error("Error loading notebook data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          await signOut();
        },
      },
    ]);
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const hasLocation = profile?.city || profile?.country;
  const locationText = [profile?.city, profile?.country].filter(Boolean).join(", ");
  const hasLanguages = profile?.languages && profile.languages.length > 0;

  const streakDays = useMemo(() => {
    if (!user?.id) return 0;
    const userBookmarks = bookmarks.filter((b) => b.userId === user.id);
    const daySet = new Set(
      userBookmarks.map((b) => {
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
  }, [bookmarks, user?.id]);

  const booksRead = useMemo(() => {
    const bookIds = new Set(bookmarks.filter((b) => b.book?.id).map((b) => b.book!.id));
    return bookIds.size;
  }, [bookmarks]);

  const TABS: { key: ProfileTab; label: string }[] = [
    { key: "reading", label: "Reading" },
    { key: "posts", label: "Posts" },
    { key: "clubs", label: "Clubs" },
    { key: "stats", label: "Stats" },
  ];

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: COLORS.line, backgroundColor: COLORS.card }]}>
        <View style={{ flex: 1 }} />
        <ThemedText style={ProfileTypography.navTitle}>Profile</ThemedText>
        <View style={[styles.topBarActions, { flex: 1, justifyContent: "flex-end" }]}>
          <Pressable
            style={styles.topBarIcon}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Bell size={20} color={COLORS.text} strokeWidth={1.5} />
            {unreadCount > 0 ? <View style={styles.bellBadge} /> : null}
          </Pressable>
          <Pressable
            style={styles.topBarIcon}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <Settings size={20} color={COLORS.text} strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 72 + Spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.green}
            colors={[COLORS.green]}
          />
        }
      >
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: COLORS.green }]}>
            <ThemedText style={styles.avatarText}>
              {getInitials(profile?.username || "Re")}
            </ThemedText>
          </View>

          <ThemedText style={ProfileTypography.displayName}>
            {profile?.username || "Reader"}
          </ThemedText>
          <ThemedText style={ProfileTypography.handle}>
            @{(profile?.username || "reader").toLowerCase().replace(/\s/g, "")}
          </ThemedText>

          <Pressable
            style={[styles.editButton, { borderColor: COLORS.line }]}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("EditProfile");
            }}
          >
            <ThemedText style={ProfileTypography.editButton}>Edit Profile</ThemedText>
          </Pressable>

          {profile?.bio ? (
            <ThemedText style={ProfileTypography.bio} numberOfLines={2}>
              {profile.bio}
            </ThemedText>
          ) : null}

          {hasLocation || hasLanguages ? (
            <View style={styles.pillsRow}>
              {hasLocation ? (
                <View style={[styles.pill, { borderColor: COLORS.line }]}>
                  <MapPin size={11} color={COLORS.muted} strokeWidth={1.5} />
                  <ThemedText style={styles.pillText}>{locationText}</ThemedText>
                </View>
              ) : null}
              {hasLanguages ? (
                <View style={[styles.pill, { borderColor: COLORS.line }]}>
                  <Globe size={11} color={COLORS.muted} strokeWidth={1.5} />
                  <ThemedText style={styles.pillText}>
                    {(profile?.languages ?? []).join(" · ")}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.statsRow, { borderColor: COLORS.line }]}>
            <View style={styles.statCol}>
              <ThemedText style={ProfileTypography.statValue}>{String(booksRead)}</ThemedText>
              <ThemedText style={ProfileTypography.statLabel}>Books</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: COLORS.line }]} />
            <View style={styles.statCol}>
              <ThemedText style={ProfileTypography.statValue}>{`${streakDays}d`}</ThemedText>
              <ThemedText style={ProfileTypography.statLabel}>Streak</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: COLORS.line }]} />
            <Pressable
              style={styles.statCol}
              onPress={async () => {
                const list = await getFollowing(user!.id);
                setFollowingList(list);
                setShowFollowingModal(true);
              }}
            >
              <ThemedText style={ProfileTypography.statValue}>{String(followingCount)}</ThemedText>
              <ThemedText style={ProfileTypography.statLabel}>Following</ThemedText>
            </Pressable>
            <View style={[styles.statDivider, { backgroundColor: COLORS.line }]} />
            <Pressable
              style={styles.statCol}
              onPress={async () => {
                const list = await getFollowers(user!.id);
                setFollowersList(list);
                setShowFollowersModal(true);
              }}
            >
              <ThemedText style={ProfileTypography.statValue}>{String(followerCount)}</ThemedText>
              <ThemedText style={ProfileTypography.statLabel}>Followers</ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={[styles.tabBar, { borderBottomColor: COLORS.line }]}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab.key);
                }}
                style={[styles.tab, isActive && { borderBottomColor: COLORS.text }]}
              >
                <ThemedText
                  style={isActive ? ProfileTypography.tabActive : ProfileTypography.tab}
                >
                  {tab.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {activeTab === "reading" ? (
          <View style={styles.tabContent}>
            {recentBooks.length > 0 ? (
              <>
                <ThemedText style={ProfileTypography.sectionLabel}>RECENTLY TAGGED</ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginLeft: -Spacing.xl }}
                  contentContainerStyle={{ paddingLeft: Spacing.xl, paddingRight: Spacing.sm }}
                >
                  <View style={styles.bookShelf}>
                    {recentBooks.slice(0, 10).map((book) => (
                      <Pressable
                        key={book.id}
                        style={styles.bookCoverWrap}
                        onPress={() => navigation.navigate("BookDetail", { book })}
                      >
                        {book.coverUrl ? (
                          <Image
                            source={{ uri: book.coverUrl }}
                            style={styles.bookCover}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.bookCover, styles.bookCoverPlaceholder]}>
                            <ThemedText style={styles.bookCoverInitial}>
                              {book.title?.slice(0, 1) || "?"}
                            </ThemedText>
                          </View>
                        )}
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </>
            ) : null}

            <View style={{ marginTop: Spacing.xl }}>
              <ThemedText style={ProfileTypography.sectionLabel}>LAST 7 DAYS</ThemedText>
              <View style={styles.weekRow}>
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - i));
                  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                  const hasPost = bookmarks.some((b) => {
                    const bd = new Date(b.createdAt);
                    return (
                      `${bd.getFullYear()}-${bd.getMonth()}-${bd.getDate()}` === key &&
                      b.userId === user?.id
                    );
                  });
                  const dayLabel = ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
                  return (
                    <View key={i} style={styles.weekDayCol}>
                      <View
                        style={[
                          styles.weekDot,
                          { backgroundColor: hasPost ? COLORS.green : "#E5E5EA" },
                        ]}
                      />
                      <ThemedText style={[styles.weekDayLabel, { color: COLORS.muted }]}>
                        {dayLabel}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>

            {recentBooks.length === 0 && bookmarks.length === 0 && !isLoading ? (
              <EmptyState type="shelf" />
            ) : null}
          </View>
        ) : null}

        {activeTab === "posts" ? (
          <View>
            {bookmarks.length === 0 && !isLoading ? (
              <View style={styles.tabContent}>
                <EmptyState
                  type="shelf"
                  title="No posts yet"
                  message="Your bookmarks will appear here."
                />
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
                  onRefresh={loadData}
                />
              ))
            )}
          </View>
        ) : null}

        {activeTab === "clubs" ? (
          <View style={styles.tabContent}>
            <View style={styles.clubsHeaderRow}>
              <ThemedText style={ProfileTypography.sectionLabel}>MY SESSIONS & CLUBS</ThemedText>
              <Pressable
                style={styles.createClubBtn}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("CreateClubFlow");
                }}
              >
                <Plus size={13} color={COLORS.green} strokeWidth={2} />
                <ThemedText style={[styles.createClubText, { color: COLORS.green }]}>Create</ThemedText>
              </Pressable>
            </View>

            {myClubs.length > 0 ? (
              myClubs.map((club) => {
                const isSession = club.type === "session";
                return (
                  <Pressable
                    key={club.id}
                    style={[styles.clubRow, { borderBottomColor: COLORS.line }]}
                    onPress={() => {
                      if (Platform.OS !== "web")
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (isSession) {
                        navigation.navigate("SessionDetail", { clubId: club.id });
                      } else {
                        navigation.navigate("ClubHome", { clubId: club.id });
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.clubAvatar,
                        { backgroundColor: isSession ? COLORS.blueDim : COLORS.greenDim },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.clubAvatarText,
                          { color: isSession ? COLORS.blue : COLORS.green },
                        ]}
                      >
                        {club.name.slice(0, 1).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.clubRowInfo}>
                      <ThemedText style={[styles.clubRowName, { color: COLORS.text }]} numberOfLines={1}>
                        {club.name}
                      </ThemedText>
                      <View style={styles.clubRowMeta}>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: isSession ? COLORS.blueDim : COLORS.greenDim },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.typeBadgeText,
                              { color: isSession ? COLORS.blue : COLORS.green },
                            ]}
                          >
                            {isSession ? "Session" : "Club"}
                          </ThemedText>
                        </View>
                        <ThemedText style={[styles.clubRowSubtext, { color: COLORS.muted }]}>
                          {club.memberCount || 0} members
                        </ThemedText>
                      </View>
                    </View>
                    <ChevronRight size={16} color={COLORS.muted} strokeWidth={1.5} />
                  </Pressable>
                );
              })
            ) : (
              <EmptyState
                type="search"
                title="No clubs yet"
                message="Join or create a book club to connect with other readers."
              />
            )}

            <Pressable
              style={[styles.viewAllClubs, { borderColor: COLORS.line }]}
              onPress={() => navigation.navigate("ClubsList")}
            >
              <ThemedText style={[styles.viewAllText, { color: COLORS.green }]}>
                Browse all sessions & clubs
              </ThemedText>
              <ChevronRight size={14} color={COLORS.green} strokeWidth={1.5} />
            </Pressable>
          </View>
        ) : null}

        {activeTab === "stats" ? (
          <View style={styles.tabContent}>
            {(() => {
              const now = new Date();
              const thisMonth = now.getMonth();
              const thisYear = now.getFullYear();
              const booksThisMonth = new Set(
                bookmarks
                  .filter((b) => {
                    const d = new Date(b.createdAt);
                    return d.getMonth() === thisMonth && d.getFullYear() === thisYear && b.book;
                  })
                  .map((b) => b.book?.id)
              ).size;
              const postsThisMonth = bookmarks.filter((b) => {
                const d = new Date(b.createdAt);
                return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
              }).length;

              return (
                <>
                  <ThemedText style={ProfileTypography.sectionLabel}>THIS MONTH</ThemedText>
                  <View style={styles.statsGrid}>
                    {[
                      { label: "Books", value: String(booksThisMonth) },
                      { label: "Posts", value: String(postsThisMonth) },
                      { label: "Streak", value: `${streakDays}d` },
                      { label: "Total Books", value: String(booksRead) },
                    ].map((s) => (
                      <View
                        key={s.label}
                        style={[styles.statCard, { borderColor: COLORS.line, backgroundColor: COLORS.bg }]}
                      >
                        <ThemedText style={styles.statCardValue}>{s.value}</ThemedText>
                        <ThemedText style={[styles.statCardLabel, { color: COLORS.muted }]}>
                          {s.label}
                        </ThemedText>
                      </View>
                    ))}
                  </View>

                  <View style={{ marginTop: Spacing.xl }}>
                    <ThemedText style={ProfileTypography.sectionLabel}>ACTIVITY</ThemedText>
                    <View style={[styles.activityRow, { borderColor: COLORS.line }]}>
                      <ThemedText style={[styles.activityItem, { color: COLORS.sub }]}>
                        {bookmarks.filter((b) => b.postType === "log").length} progress logs
                      </ThemedText>
                      <View style={[styles.actDivider, { backgroundColor: COLORS.line }]} />
                      <ThemedText style={[styles.activityItem, { color: COLORS.sub }]}>
                        {bookmarks.filter((b) => b.postType === "review").length} reviews
                      </ThemedText>
                    </View>
                  </View>

                  <Pressable
                    style={[styles.signOutRow, { borderColor: COLORS.line }]}
                    onPress={handleSignOut}
                  >
                    <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
                  </Pressable>
                </>
              );
            })()}
          </View>
        ) : null}
      </ScrollView>

      <FAB
        onPress={() => navigation.navigate("CreateBookmark")}
        icon="edit"
        bottom={tabBarHeight}
      />

      {/* Followers modal */}
      <Modal
        visible={showFollowersModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFollowersModal(false)}
      >
        <View style={[modalStyles.container, { backgroundColor: COLORS.card }]}>
          <View style={[modalStyles.header, { borderBottomColor: COLORS.line }]}>
            <ThemedText style={[modalStyles.title, { color: COLORS.text }]}>Followers</ThemedText>
            <Pressable onPress={() => setShowFollowersModal(false)}>
              <ThemedText style={[modalStyles.doneText, { color: COLORS.green }]}>Done</ThemedText>
            </Pressable>
          </View>
          <FlatList
            data={followersList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[modalStyles.row, { borderBottomColor: COLORS.line }]}
                onPress={() => {
                  setShowFollowersModal(false);
                  navigation.navigate("UserProfile", { userId: item.id });
                }}
              >
                <View style={[modalStyles.avatar, { backgroundColor: COLORS.green }]}>
                  <ThemedText style={modalStyles.avatarText}>
                    {item.username.slice(0, 2).toUpperCase()}
                  </ThemedText>
                </View>
                <ThemedText style={[modalStyles.username, { color: COLORS.text }]}>{item.username}</ThemedText>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={modalStyles.empty}>
                <ThemedText style={{ color: COLORS.muted }}>No followers yet</ThemedText>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Following modal */}
      <Modal
        visible={showFollowingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFollowingModal(false)}
      >
        <View style={[modalStyles.container, { backgroundColor: COLORS.card }]}>
          <View style={[modalStyles.header, { borderBottomColor: COLORS.line }]}>
            <ThemedText style={[modalStyles.title, { color: COLORS.text }]}>Following</ThemedText>
            <Pressable onPress={() => setShowFollowingModal(false)}>
              <ThemedText style={[modalStyles.doneText, { color: COLORS.green }]}>Done</ThemedText>
            </Pressable>
          </View>
          <FlatList
            data={followingList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[modalStyles.row, { borderBottomColor: COLORS.line }]}
                onPress={() => {
                  setShowFollowingModal(false);
                  navigation.navigate("UserProfile", { userId: item.id });
                }}
              >
                <View style={[modalStyles.avatar, { backgroundColor: COLORS.green }]}>
                  <ThemedText style={modalStyles.avatarText}>
                    {item.username.slice(0, 2).toUpperCase()}
                  </ThemedText>
                </View>
                <ThemedText style={[modalStyles.username, { color: COLORS.text }]}>{item.username}</ThemedText>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={modalStyles.empty}>
                <ThemedText style={{ color: COLORS.muted }}>Not following anyone yet</ThemedText>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
    backgroundColor: COLORS.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  topBarIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    backgroundColor: COLORS.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.line,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontFamily: FONTS.semibold,
    color: "#FFFFFF",
    fontSize: 24,
  },
  editButton: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 7,
    marginBottom: Spacing.md,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  statsRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    marginTop: Spacing.sm,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  statDivider: {
    width: 1,
    alignSelf: "stretch",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.xl,
    backgroundColor: COLORS.card,
  },
  tab: {
    paddingVertical: 10,
    marginRight: Spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  bookShelf: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  bookCoverWrap: {
    borderRadius: 5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  bookCover: {
    width: 64,
    height: 90,
    borderRadius: 5,
  },
  bookCoverPlaceholder: {
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  bookCoverInitial: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.muted,
  },
  weekRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  weekDayCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  weekDayLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  clubsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  createClubBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  createClubText: {
    fontSize: 13,
    fontWeight: "600",
  },
  clubRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  clubAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  clubAvatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  clubRowInfo: {
    flex: 1,
  },
  clubRowName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  clubRowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  clubRowSubtext: {
    fontSize: 12,
  },
  viewAllClubs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: Spacing.md,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.lg,
    alignItems: "center",
  },
  statCardValue: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 2,
  },
  statCardLabel: {
    fontSize: 12,
  },
  activityRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  activityItem: {
    flex: 1,
    textAlign: "center",
    paddingVertical: Spacing.md,
    fontSize: 13,
    fontWeight: "500",
  },
  actDivider: {
    width: 1,
  },
  signOutRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.lg,
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
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
  doneText: { fontSize: 14, fontWeight: "600" },
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
  avatarText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  username: { fontSize: 15, fontWeight: "500" },
  empty: { padding: 40, alignItems: "center" },
});
