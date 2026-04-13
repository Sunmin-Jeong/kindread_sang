import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Keyboard,
  Platform,
  ScrollView,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Search, Plus, MapPin, Users } from "lucide-react-native";
import { TextInput } from "react-native";

import { SearchBookCard } from "@/components/SearchBookCard";
import { ClubCard } from "@/components/ClubCard";
import { ReaderCard } from "@/components/ReaderCard";
import { EmptyState } from "@/components/EmptyState";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { searchBooks } from "@/lib/books-api";
import { getAllClubs, rankClubs } from "@/lib/club-storage";
import {
  getReadersOnSameBooks,
  getFriendsOfFriends,
  getActiveThisWeek,
  getGlobalReaders,
  getNearYouReaders,
  getTopBookedBooks,
  getReadersByBookId,
  type DiscoverReader,
} from "@/lib/readers-storage";
import { followUser, unfollowUser, getFollowedUserIds } from "@/lib/follows-storage";
import type { BookSearchResult, Club } from "@/types";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type DiscoverTab = "books" | "readers" | "clubs";

const NUM_COLUMNS = 3;
const HORIZONTAL_PADDING = Spacing.xl * 2;
const COLUMN_GAP = Spacing.sm;

const GREEN = "#2A7A52";
const TEXT = "#0A0A0A";
const TEXT_2 = "#444444";
const TEXT_3 = "#888888";
const BORDER = "#EBEBEB";
const SURFACE = "#F7F7F7";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width: screenWidth } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<DiscoverTab>("books");
  const [query, setQuery] = useState("");
  const [bookResults, setBookResults] = useState<BookSearchResult[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [isLoadingClubs, setIsLoadingClubs] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Readers tab state
  const [isLoadingReaders, setIsLoadingReaders] = useState(false);
  const [readersLoaded, setReadersLoaded] = useState(false);
  const [sameBooksReaders, setSameBooksReaders] = useState<DiscoverReader[]>([]);
  const [fallbackBookReaders, setFallbackBookReaders] = useState<Array<{ bookId: string; readers: DiscoverReader[] }>>([]);
  const [friendsOfFriends, setFriendsOfFriends] = useState<DiscoverReader[]>([]);
  const [activeThisWeek, setActiveThisWeek] = useState<DiscoverReader[]>([]);
  const [globalReaders, setGlobalReaders] = useState<DiscoverReader[]>([]);
  const [nearYouReaders, setNearYouReaders] = useState<DiscoverReader[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());

  const availableWidth = screenWidth - HORIZONTAL_PADDING;
  const totalGapWidth = COLUMN_GAP * (NUM_COLUMNS - 1);
  const cardWidth = Math.floor((availableWidth - totalGapWidth) / NUM_COLUMNS);

  useEffect(() => {
    if (activeTab === "clubs") {
      loadClubs();
    } else if (activeTab === "readers" && !readersLoaded) {
      loadReaders();
    }
  }, [activeTab]);

  const loadClubs = async () => {
    if (clubs.length > 0) return;
    setIsLoadingClubs(true);
    try {
      const allClubs = await getAllClubs();
      const ranked = rankClubs(allClubs, profile?.languages, profile?.city, profile?.country);
      setClubs(ranked);
      setFilteredClubs(ranked);
    } catch (error) {
      console.error("Error loading clubs:", error);
    } finally {
      setIsLoadingClubs(false);
    }
  };

  const loadReaders = async () => {
    if (!user?.id) return;
    setIsLoadingReaders(true);
    try {
      const [followed, same, fof, active, global] = await Promise.all([
        getFollowedUserIds(user.id).catch(() => [] as string[]),
        getReadersOnSameBooks(user.id).catch(() => [] as DiscoverReader[]),
        getFriendsOfFriends(user.id).catch(() => [] as DiscoverReader[]),
        getActiveThisWeek(user.id).catch(() => [] as DiscoverReader[]),
        getGlobalReaders(user.id).catch(() => [] as DiscoverReader[]),
      ]);

      setFollowedIds(new Set(followed));
      setFriendsOfFriends(fof);
      setActiveThisWeek(active);
      setGlobalReaders(global);

      if (same.length > 0) {
        setSameBooksReaders(same);
      } else {
        // Fallback: top 3 most bookmarked books
        const topBookIds = await getTopBookedBooks(3).catch(() => [] as string[]);
        const fallback = await Promise.all(
          topBookIds.map(async (bookId) => ({
            bookId,
            readers: await getReadersByBookId(bookId, user.id).catch(() => [] as DiscoverReader[]),
          }))
        );
        setFallbackBookReaders(fallback.filter((f) => f.readers.length > 0));
      }

      if (profile?.city) {
        const near = await getNearYouReaders(user.id, profile.city).catch(() => [] as DiscoverReader[]);
        setNearYouReaders(near);
      }
    } catch (e) {
      console.error("loadReaders error:", e);
    } finally {
      setIsLoadingReaders(false);
      setReadersLoaded(true);
    }
  };

  const handleFollowToggle = async (targetId: string) => {
    if (!user?.id || followLoading.has(targetId)) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setFollowLoading((prev) => new Set(prev).add(targetId));
    const isNowFollowing = followedIds.has(targetId);

    // Optimistic update
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (isNowFollowing) next.delete(targetId);
      else next.add(targetId);
      return next;
    });

    const ok = isNowFollowing
      ? await unfollowUser(user.id, targetId)
      : await followUser(user.id, targetId);

    if (!ok) {
      // Revert on failure
      setFollowedIds((prev) => {
        const next = new Set(prev);
        if (isNowFollowing) next.add(targetId);
        else next.delete(targetId);
        return next;
      });
    }

    setFollowLoading((prev) => {
      const next = new Set(prev);
      next.delete(targetId);
      return next;
    });
  };

  const handleTabChange = (tab: DiscoverTab) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveTab(tab);
    setQuery("");
    setBookResults([]);
    setHasSearched(false);
  };

  const handleSearch = useCallback(
    async (text: string) => {
      setQuery(text);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

      const trimmed = text.trim().replace(/\s+/g, " ");

      if (activeTab === "clubs") {
        if (trimmed.length < 1) {
          setFilteredClubs(clubs);
          return;
        }
        const filtered = clubs.filter(
          (c) =>
            c.name.toLowerCase().includes(trimmed.toLowerCase()) ||
            c.description?.toLowerCase().includes(trimmed.toLowerCase())
        );
        setFilteredClubs(filtered);
        return;
      }

      if (trimmed.length < 2) {
        setBookResults([]);
        setHasSearched(false);
        return;
      }

      searchTimeoutRef.current = setTimeout(async () => {
        setIsLoadingBooks(true);
        setHasSearched(true);
        try {
          const books = await searchBooks(trimmed);
          setBookResults(books);
        } catch (error) {
          console.error("Search error:", error);
          setBookResults([]);
        } finally {
          setIsLoadingBooks(false);
        }
      }, 300);
    },
    [activeTab, clubs]
  );

  const handleBookPress = useCallback(
    (book: BookSearchResult) => {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Keyboard.dismiss();
      navigation.navigate("BookDetail", { book });
    },
    [navigation]
  );

  const handleClubPress = useCallback(
    (club: Club) => {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Keyboard.dismiss();
      if (club.type === "session") {
        navigation.navigate("SessionDetail", { clubId: club.id });
      } else {
        navigation.navigate("ClubHome", { clubId: club.id });
      }
    },
    [navigation]
  );

  const renderBookItem = useCallback(
    ({ item }: { item: BookSearchResult }) => (
      <SearchBookCard book={item} onPress={() => handleBookPress(item)} width={cardWidth} />
    ),
    [handleBookPress, cardWidth]
  );

  const renderClubItem = useCallback(
    ({ item }: { item: Club }) => (
      <ClubCard club={item} onPress={() => handleClubPress(item)} />
    ),
    [handleClubPress]
  );

  const TABS: { key: DiscoverTab; label: string }[] = [
    { key: "books", label: "Books" },
    { key: "readers", label: "Readers" },
    { key: "clubs", label: "Sessions & Clubs" },
  ];

  const renderBooksContent = () => {
    if (isLoadingBooks) {
      return (
        <View style={styles.shimmerContainer}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.shimmerCard, { backgroundColor: SURFACE }]} />
          ))}
        </View>
      );
    }
    if (!hasSearched) {
      return (
        <View style={styles.emptyHint}>
          <ThemedText style={styles.emptyHintText}>
            Search by title, author, or ISBN to find books
          </ThemedText>
        </View>
      );
    }
    if (bookResults.length === 0) {
      return (
        <EmptyState
          type="search"
          title="No books found"
          message="Try a different title or author name."
        />
      );
    }
    return (
      <FlatList
        key="books-grid"
        style={styles.list}
        contentContainerStyle={[
          styles.gridContent,
          { paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={bookResults}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        initialNumToRender={9}
        maxToRenderPerBatch={12}
      />
    );
  };

  const renderReaderCard = (reader: DiscoverReader, badge?: string) => (
    <ReaderCard
      key={reader.id}
      reader={reader}
      isFollowing={followedIds.has(reader.id)}
      isFollowLoading={followLoading.has(reader.id)}
      onFollowPress={() => handleFollowToggle(reader.id)}
      onPress={() => navigation.navigate("UserProfile", { userId: reader.id })}
      badge={badge}
    />
  );

  const renderReadersContent = () => {
    if (isLoadingReaders) {
      return (
        <View style={styles.readersLoader}>
          <ActivityIndicator color={GREEN} size="large" />
        </View>
      );
    }

    const allEmpty =
      sameBooksReaders.length === 0 &&
      fallbackBookReaders.length === 0 &&
      friendsOfFriends.length === 0 &&
      activeThisWeek.length === 0 &&
      globalReaders.length === 0;

    if (allEmpty && readersLoaded) {
      return (
        <View style={styles.readersLoader}>
          <ThemedText style={[styles.emptyHintText, { color: TEXT_3 }]}>
            Be one of the first readers on Kindread
          </ThemedText>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: tabBarHeight + Spacing.xl + 40, paddingTop: Spacing.md }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Near you — only if user has a city */}
        {profile?.city && nearYouReaders.length > 0 ? (
          <View style={styles.readerSection}>
            <View style={styles.readerSectionHeader}>
              <MapPin size={13} color={TEXT_3} strokeWidth={1.5} />
              <ThemedText style={styles.sectionLabel}>NEAR YOU IN {profile.city.toUpperCase()}</ThemedText>
            </View>
            {nearYouReaders.map((r) => renderReaderCard(r))}
          </View>
        ) : null}

        {/* Section 1: Reading same books OR fallback */}
        {sameBooksReaders.length > 0 ? (
          <View style={styles.readerSection}>
            <View style={styles.readerSectionHeader}>
              <ThemedText style={styles.sectionLabel}>READING THE SAME BOOKS AS YOU</ThemedText>
            </View>
            {sameBooksReaders.map((r) =>
              renderReaderCard(
                r,
                r.sharedBooks && r.sharedBooks > 1 ? `${r.sharedBooks} books` : undefined
              )
            )}
          </View>
        ) : fallbackBookReaders.length > 0 ? (
          <View style={styles.readerSection}>
            <View style={styles.readerSectionHeader}>
              <ThemedText style={styles.sectionLabel}>READERS WHO LOVED THESE BOOKS</ThemedText>
            </View>
            {fallbackBookReaders.map(({ bookId, readers }) => (
              <View key={bookId} style={{ marginBottom: 10 }}>
                {readers.slice(0, 3).map((r) => renderReaderCard(r))}
              </View>
            ))}
          </View>
        ) : null}

        {/* Section 2: Friends of friends */}
        {friendsOfFriends.length > 0 ? (
          <View style={styles.readerSection}>
            <View style={styles.readerSectionHeader}>
              <ThemedText style={styles.sectionLabel}>READERS YOU MIGHT KNOW</ThemedText>
            </View>
            {friendsOfFriends.map((r) =>
              renderReaderCard(
                r,
                r.mutualCount && r.mutualCount > 1 ? `${r.mutualCount} mutual` : "1 mutual"
              )
            )}
          </View>
        ) : null}

        {/* Section 3: Active this week */}
        {activeThisWeek.length > 0 ? (
          <View style={styles.readerSection}>
            <View style={styles.readerSectionHeader}>
              <ThemedText style={styles.sectionLabel}>ACTIVE THIS WEEK</ThemedText>
            </View>
            {activeThisWeek.map((r) => renderReaderCard(r))}
          </View>
        ) : null}

        {/* Section 4: Global readers */}
        {globalReaders.length > 0 ? (
          <View style={styles.readerSection}>
            <View style={styles.readerSectionHeader}>
              <ThemedText style={styles.sectionLabel}>GLOBAL READERS</ThemedText>
            </View>
            {globalReaders.map((r) => renderReaderCard(r))}
          </View>
        ) : null}
      </ScrollView>
    );
  };

  const renderClubsContent = () => {
    if (isLoadingClubs) {
      return (
        <View style={styles.shimmerList}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.shimmerRow, { backgroundColor: SURFACE }]} />
          ))}
        </View>
      );
    }
    const data = filteredClubs;
    return (
      <>
        <FlatList
          key="clubs-list"
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + Spacing.xl + 80 },
          ]}
          scrollIndicatorInsets={{ bottom: insets.bottom }}
          data={data}
          renderItem={renderClubItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Pressable
              style={[styles.startSessionBtn, { borderColor: "#7C3AED", backgroundColor: "#F3F0FF" }]}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate("CreateClubFlow");
              }}
            >
              <Plus size={16} color="#7C3AED" strokeWidth={2} />
              <ThemedText style={[styles.startSessionText, { color: "#7C3AED" }]}>
                Start a reading session
              </ThemedText>
            </Pressable>
          }
          ListEmptyComponent={
            <EmptyState
              type="search"
              title="No sessions or clubs"
              message="Be the first to create one!"
            />
          }
        />
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: "#FFFFFF" }]}>
      <View style={[styles.topSection, { paddingTop: insets.top + Spacing.md }]}>
        <ThemedText style={styles.screenTitle}>Discover</ThemedText>

        <View style={styles.searchBarContainer}>
          <Search size={16} color={TEXT_3} strokeWidth={1.5} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleSearch}
            placeholder={
              activeTab === "books"
                ? "Search books by title, author, ISBN..."
                : activeTab === "clubs"
                ? "Search sessions & clubs..."
                : "Search readers..."
            }
            placeholderTextColor={TEXT_3}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => handleTabChange(tab.key)}
                style={[styles.tab, isActive && styles.tabActive]}
              >
                <ThemedText
                  style={[
                    styles.tabText,
                    { color: isActive ? TEXT : TEXT_3 },
                    isActive && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === "books" ? renderBooksContent() : null}
        {activeTab === "readers" ? renderReadersContent() : null}
        {activeTab === "clubs" ? renderClubsContent() : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 0,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "600",
    fontFamily: Platform.select({
      ios: "Pretendard-SemiBold",
      android: "Pretendard-SemiBold",
      web: "Pretendard-SemiBold, sans-serif",
      default: "Pretendard-SemiBold",
    }),
    color: "#0A0A0A",
    marginBottom: Spacing.md,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: Spacing.md,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0A0A0A",
    fontFamily: "Inter",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 0,
  },
  tab: {
    paddingVertical: 10,
    marginRight: Spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#0A0A0A",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "400",
  },
  tabTextActive: {
    fontWeight: "600",
    color: "#0A0A0A",
  },
  content: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    flexGrow: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    flexGrow: 1,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  shimmerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  shimmerCard: {
    width: 100,
    height: 150,
    borderRadius: 8,
  },
  shimmerList: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  shimmerRow: {
    height: 80,
    borderRadius: 12,
  },
  emptyHint: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
  },
  emptyHintText: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 22,
  },
  sectionBlock: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#888888",
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  readerPlaceholder: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  readerPlaceholderText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  startSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: Spacing.md,
  },
  startSessionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  readersLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  readerSection: {
    marginBottom: Spacing.xl,
  },
  readerSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: Spacing.md,
  },
});
