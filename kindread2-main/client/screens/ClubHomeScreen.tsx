import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  Platform,
  ImageBackground,
  Dimensions,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import {
  Globe,
  MapPin,
  Users,
  Calendar,
  Plus,
  Clock,
  Video,
  AlertCircle,
  Settings,
  BookOpen,
  X,
  PartyPopper,
  ArrowLeft,
} from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BookmarkCard } from "@/components/BookmarkCard";
import { LogTicker } from "@/components/LogTicker";
import { Button } from "@/components/Button";
import { FAB } from "@/components/FAB";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { Club, ClubMember, ClubMeetup, Bookmark, ClubRole, ClubBook, ClubVote } from "@/types";
import {
  getClub,
  getClubMembers,
  getClubMeetups,
  getClubBookmarks,
  getClubBooks,
  getUserMembership,
  getPendingApplication,
  joinClub,
  canUserJoinClub,
  getClubVotes,
  toggleVoteResponse,
  addClubVoteCandidate,
} from "@/lib/club-storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COVER_HEIGHT = 220;

type TabType = "feed" | "sessions" | "members" | "vote";

const TABS: { key: TabType; label: string }[] = [
  { key: "feed", label: "Feed" },
  { key: "sessions", label: "Sessions" },
  { key: "members", label: "Members" },
  { key: "vote", label: "Vote" },
];

export default function ClubHomeScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, "ClubHome">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { user, profile } = useAuth();

  const clubId = route.params?.clubId;

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [meetups, setMeetups] = useState<ClubMeetup[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [clubBooks, setClubBooks] = useState<ClubBook[]>([]);
  const [membership, setMembership] = useState<ClubMember | null>(null);
  const [hasPendingApplication, setHasPendingApplication] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("feed");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [votes, setVotes] = useState<ClubVote[]>([]);
  const [votingId, setVotingId] = useState<string | null>(null);

  const showWelcome = route.params?.showWelcome;

  const loadData = useCallback(async () => {
    if (!clubId) return;

    console.log("[ClubHomeScreen] Loading club data...");
    setIsLoading(true);
    try {
      const [clubData, membersData, meetupsData, bookmarksData, clubBooksData] = await Promise.all([
        getClub(clubId),
        getClubMembers(clubId),
        getClubMeetups(clubId),
        getClubBookmarks(clubId),
        getClubBooks(clubId),
      ]);
      console.log("[ClubHomeScreen] Data loaded successfully:", {
        club: clubData?.name,
        members: membersData.length,
        meetups: meetupsData.length,
        bookmarks: bookmarksData.length,
        books: clubBooksData.length,
      });

      setClub(clubData);
      setMembers(membersData);
      setMeetups(meetupsData);
      setBookmarks(bookmarksData);
      setClubBooks(clubBooksData);

      const votesData = await getClubVotes(clubId, user?.id);
      setVotes(votesData);

      if (user?.id) {
        const [userMembership, pendingApp] = await Promise.all([
          getUserMembership(clubId, user.id),
          getPendingApplication(clubId, user.id),
        ]);
        setMembership(userMembership);
        setHasPendingApplication(!!pendingApp);
      }

      if (clubData) {
        const { canJoin, reason } = await canUserJoinClub(clubData, profile?.country);
        if (!canJoin) {
          setJoinError(reason || null);
        }
      }
    } catch (error) {
      console.error("[ClubHomeScreen] Error loading club data:", error);
    } finally {
      console.log("[ClubHomeScreen] Loading complete");
      setIsLoading(false);
    }
  }, [clubId, user?.id, profile?.country]);

  // Refresh data when screen comes into focus (e.g., after creating a post)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (showWelcome && club && !isLoading) {
      setShowWelcomeModal(true);
    }
  }, [showWelcome, club, isLoading]);

  const handleJoinClub = async () => {
    if (!club || !user?.id) return;

    const { canJoin, reason } = await canUserJoinClub(club, profile?.country);
    if (!canJoin) {
      Alert.alert("Cannot Join", reason || "You cannot join this club.");
      return;
    }

    if (club.joinPolicy !== "auto") {
      navigation.navigate("JoinClub", {
        clubId: club.id,
        clubName: club.name,
        joinQuestions: club.joinQuestions || [],
      });
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinClub(clubId, user.id, club.joinPolicy === "auto");

      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        await loadData();

        if (club.joinPolicy === "auto") {
          setShowWelcomeModal(true);
        } else {
          Alert.alert("Application Submitted", "Your request is pending approval.");
          setHasPendingApplication(true);
        }
      } else {
        Alert.alert("Error", result.error || "Failed to join club.");
      }
    } catch (error) {
      console.error("Error joining club:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateBookmark = () => {
    navigation.navigate("CreateBookmark", { clubId });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatMeetupDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getMeetingModeIcon = () => {
    switch (club?.meetingMode) {
      case "online":
        return <Globe size={14} color={theme.textSecondary} strokeWidth={1.5} />;
      case "offline":
        return <MapPin size={14} color={theme.textSecondary} strokeWidth={1.5} />;
      case "hybrid":
        return <Users size={14} color={theme.textSecondary} strokeWidth={1.5} />;
      default:
        return null;
    }
  };

  const getMeetingModeLabel = () => {
    switch (club?.meetingMode) {
      case "online":
        return "Online";
      case "offline":
        return `Offline in ${club.city || club.country || "Local"}`;
      case "hybrid":
        return "Hybrid";
      default:
        return "";
    }
  };

  const getRoleBadgeColor = (role: ClubRole) => {
    switch (role) {
      case "host":
        return "#E74C3C";
      case "staff":
        return "#3498DB";
      default:
        return theme.textSecondary;
    }
  };

  const renderFeedItem = ({ item }: { item: Bookmark }) => {
    if (item.postType === 'log') {
      return (
        <LogTicker
          bookmark={item}
          onPress={() => navigation.navigate("BookmarkDetail", { bookmark: item })}
          onRefresh={loadData}
        />
      );
    }
    return (
      <BookmarkCard
        bookmark={item}
        onPress={() => navigation.navigate("BookmarkDetail", { bookmark: item })}
        onRefresh={loadData}
        showClubBadge={false}
      />
    );
  };

  const renderMeetupItem = ({ item }: { item: ClubMeetup }) => (
    <View style={[styles.meetupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.meetupHeader}>
        <View style={styles.meetupDate}>
          <Calendar size={14} color={theme.accent} strokeWidth={1.5} />
          <ThemedText style={[styles.meetupDateText, { color: theme.accent }]}>
            {formatMeetupDate(item.dateTime)}
          </ThemedText>
        </View>
        {item.isOnline ? (
          <View style={[styles.onlineBadge, { backgroundColor: "#3498DB20" }]}>
            <Video size={12} color="#3498DB" strokeWidth={1.5} />
            <ThemedText style={[styles.badgeText, { color: "#3498DB" }]}>
              Online
            </ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedText style={styles.meetupTitle}>{item.title}</ThemedText>
      {item.description ? (
        <ThemedText
          style={[styles.meetupDescription, { color: theme.textSecondary }]}
          numberOfLines={2}
        >
          {item.description}
        </ThemedText>
      ) : null}
      {item.location ? (
        <View style={styles.meetupLocation}>
          <MapPin size={12} color={theme.textSecondary} strokeWidth={1.5} />
          <ThemedText style={[styles.locationText, { color: theme.textSecondary }]}>
            {item.location}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );

  const renderMemberItem = ({ item }: { item: ClubMember }) => (
    <View style={[styles.memberRow, { borderBottomColor: theme.border }]}>
      <View style={styles.memberAvatar}>
        <ThemedText style={styles.avatarText}>
          {item.username.charAt(0).toUpperCase()}
        </ThemedText>
      </View>
      <View style={styles.memberInfo}>
        <ThemedText style={styles.memberName}>{item.username}</ThemedText>
        <ThemedText style={[styles.memberJoined, { color: theme.textSecondary }]}>
          Joined {formatDate(item.joinedAt)}
        </ThemedText>
      </View>
      {item.role !== "member" ? (
        <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.role) + "20" }]}>
          <ThemedText style={[styles.roleText, { color: getRoleBadgeColor(item.role) }]}>
            {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );

  const renderBookshelfItem = ({ item }: { item: ClubBook }) => (
    <Pressable
      style={[styles.bookshelfCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => navigation.navigate("BookDetail", { book: item.book })}
    >
      {item.book.coverUrl ? (
        <View style={styles.bookshelfCover}>
          <ImageBackground
            source={{ uri: item.book.coverUrl }}
            style={styles.bookshelfCoverImage}
            imageStyle={{ borderRadius: BorderRadius.sm }}
          />
        </View>
      ) : (
        <View style={[styles.bookshelfCover, styles.bookshelfPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
          <BookOpen size={24} color={theme.textSecondary} strokeWidth={1.5} />
        </View>
      )}
      <View style={styles.bookshelfInfo}>
        <ThemedText style={styles.bookshelfTitle} numberOfLines={2}>
          {item.book.title}
        </ThemedText>
        <ThemedText style={[styles.bookshelfAuthor, { color: theme.textSecondary }]} numberOfLines={1}>
          {item.book.author}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: item.status === "current" ? "#2D5A2720" : "#88888820" }]}>
          <ThemedText style={[styles.statusText, { color: item.status === "current" ? "#2D5A27" : theme.textSecondary }]}>
            {item.status === "current" ? "Currently Reading" : item.status === "upcoming" ? "Upcoming" : "Completed"}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => {
    let message = "";
    switch (activeTab) {
      case "feed":
        message = "No posts yet. Be the first to share!";
        break;
      case "sessions":
        message = "No sessions scheduled yet.";
        break;
      case "members":
        message = "No members yet.";
        break;
      default:
        message = "Nothing here yet.";
        break;
    }
    return (
      <View style={styles.emptyState}>
        <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
          {message}
        </ThemedText>
      </View>
    );
  };

  if (!club && !isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.errorContainer, { paddingTop: insets.top + Spacing.xl }]}>
          <ThemedText>Club not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const isMember = !!membership;
  const isStaff = membership?.role === "host" || membership?.role === "staff";
  const showJoinButton = !isMember && !hasPendingApplication && !joinError;
  const showPendingStatus = !isMember && hasPendingApplication;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ImageBackground
        source={{ uri: club?.imageUrl || "https://picsum.photos/800/400" }}
        style={styles.coverImage}
      >
        <View style={styles.coverGradient}>
          <View style={[styles.coverContent, { paddingTop: insets.top }]}>
            <View style={styles.coverTopRow}>
              <Pressable
                style={styles.backPill}
                onPress={() => navigation.goBack()}
              >
                <ArrowLeft size={16} color="#FFFFFF" strokeWidth={2} />
              </Pressable>
              {isStaff ? (
                <Pressable
                  style={styles.backPill}
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    navigation.navigate("ClubManagement", { clubId: club!.id });
                  }}
                >
                  <Settings size={16} color="#FFFFFF" strokeWidth={1.5} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.coverHeader}>
              <ThemedText style={styles.clubName}>{club?.name || "Loading..."}</ThemedText>
            </View>
            <View style={styles.clubMeta}>
              {getMeetingModeIcon()}
              <ThemedText style={styles.metaText}>{getMeetingModeLabel()}</ThemedText>
              <View style={styles.metaDot} />
              <Users size={14} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />
              <ThemedText style={styles.metaText}>
                {club?.memberCount || 0} members
              </ThemedText>
            </View>
          </View>
        </View>
      </ImageBackground>

      <View style={[styles.infoSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {club?.description ? (
          <ThemedText style={[styles.description, { color: theme.text }]} numberOfLines={3}>
            {club.description}
          </ThemedText>
        ) : null}
        <View style={styles.foundedRow}>
          <Clock size={12} color={theme.textSecondary} strokeWidth={1.5} />
          <ThemedText style={[styles.foundedText, { color: theme.textSecondary }]}>
            Founded on {club?.createdAt ? formatDate(club.createdAt) : "..."}
          </ThemedText>
        </View>
      </View>

      {joinError ? (
        <View style={[styles.warningBanner, { backgroundColor: "#FFF3CD", borderColor: "#856404" }]}>
          <AlertCircle size={16} color="#856404" strokeWidth={1.5} />
          <ThemedText style={[styles.warningText, { color: "#856404" }]}>
            {joinError}
          </ThemedText>
        </View>
      ) : null}

      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { borderBottomColor: theme.text },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <ThemedText
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? theme.text : theme.textSecondary },
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.tabContent}>
        {activeTab === "feed" ? (
          <FlatList
            data={bookmarks}
            renderItem={renderFeedItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 80 },
            ]}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        ) : null}

        {activeTab === "sessions" ? (
          <FlatList
            data={meetups}
            renderItem={renderMeetupItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 80 },
            ]}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        ) : null}

        {activeTab === "members" ? (
          <FlatList
            data={members}
            renderItem={renderMemberItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 80 },
            ]}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        ) : null}

        {activeTab === "vote" ? (
          <FlatList
            data={votes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <ThemedText style={[styles.voteSectionLabel, { color: theme.textSecondary }]}>
                VOTE FOR NEXT BOOK
              </ThemedText>
            }
            renderItem={({ item }: { item: ClubVote }) => {
              const maxVotes = Math.max(...votes.map((v) => v.voteCount), 1);
              const pct = Math.round((item.voteCount / maxVotes) * 100);
              return (
                <View style={[styles.voteCard, { borderColor: theme.border }]}>
                  <View style={styles.voteCardLeft}>
                    {item.book?.coverUrl ? (
                      <BookOpen size={20} color={theme.textSecondary} strokeWidth={1.5} />
                    ) : (
                      <BookOpen size={20} color={theme.textSecondary} strokeWidth={1.5} />
                    )}
                  </View>
                  <View style={styles.voteCardBody}>
                    <ThemedText style={[styles.voteBookTitle, { color: theme.text }]} numberOfLines={1}>
                      {item.book?.title || "Unknown"}
                    </ThemedText>
                    <ThemedText style={[styles.voteBookAuthor, { color: theme.textSecondary }]} numberOfLines={1}>
                      {item.book?.author || ""}
                    </ThemedText>
                    <View style={styles.voteBarWrap}>
                      <View style={[styles.voteBarBg, { backgroundColor: theme.border }]}>
                        <View
                          style={[
                            styles.voteBarFill,
                            {
                              width: `${pct}%`,
                              backgroundColor: item.userHasVoted ? theme.accent : theme.border,
                            },
                          ]}
                        />
                      </View>
                      <ThemedText style={[styles.voteCount, { color: theme.textSecondary }]}>
                        {item.voteCount}
                      </ThemedText>
                    </View>
                  </View>
                  <Pressable
                    style={[
                      styles.voteBtn,
                      {
                        borderColor: item.userHasVoted ? theme.accent : theme.border,
                        backgroundColor: item.userHasVoted ? theme.accent : "transparent",
                      },
                    ]}
                    disabled={votingId === item.id}
                    onPress={async () => {
                      if (!user?.id) return;
                      setVotingId(item.id);
                      const result = await toggleVoteResponse(item.id, user.id);
                      setVotes((prev) =>
                        prev.map((v) =>
                          v.id === item.id
                            ? { ...v, userHasVoted: result.voted, voteCount: v.voteCount + (result.voted ? 1 : -1) }
                            : v
                        )
                      );
                      setVotingId(null);
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.voteBtnText,
                        { color: item.userHasVoted ? "#FFFFFF" : theme.textSecondary },
                      ]}
                    >
                      {item.userHasVoted ? "Voted" : "Vote"}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <BookOpen size={36} color={theme.textSecondary} strokeWidth={1.5} />
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No book candidates yet.
                </ThemedText>
              </View>
            }
          />
        ) : null}
      </View>

      {showJoinButton ? (
        <View style={[styles.fabContainer, { bottom: insets.bottom + Spacing.lg }]}>
          <Button
            onPress={handleJoinClub}
            disabled={isJoining}
            style={styles.joinButton}
          >
            {isJoining ? "Joining..." : "Join Club"}
          </Button>
        </View>
      ) : null}

      {showPendingStatus ? (
        <View style={[styles.fabContainer, { bottom: insets.bottom + Spacing.lg }]}>
          <View style={[styles.pendingBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ThemedText style={[styles.pendingText, { color: theme.textSecondary }]}>
              Application Pending
            </ThemedText>
          </View>
        </View>
      ) : null}

      {isMember ? (
        <FAB onPress={handleCreateBookmark} icon="edit" bottom={insets.bottom} />
      ) : null}

      <Modal
        visible={showWelcomeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWelcomeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.welcomeModal, { backgroundColor: theme.surface }]}>
            <Pressable
              style={styles.welcomeCloseButton}
              onPress={() => setShowWelcomeModal(false)}
            >
              <X size={20} color={theme.textSecondary} strokeWidth={1.5} />
            </Pressable>

            <View style={styles.welcomeHeader}>
              <View style={[styles.welcomeIconContainer, { backgroundColor: `${theme.accent}20` }]}>
                <PartyPopper size={32} color={theme.accent} strokeWidth={1.5} />
              </View>
              <ThemedText style={styles.welcomeTitle}>Welcome to {club?.name}!</ThemedText>
              <ThemedText style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
                You're now a member of this club
              </ThemedText>
            </View>

            {club?.welcomeTemplate ? (
              <View style={[styles.welcomeTemplateBox, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                <ThemedText style={styles.welcomeTemplateLabel}>Message from the host:</ThemedText>
                <ThemedText style={styles.welcomeTemplateText}>{club.welcomeTemplate}</ThemedText>
              </View>
            ) : null}

            <Button
              onPress={() => setShowWelcomeModal(false)}
              style={styles.welcomeButton}
            >
              Start Exploring
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  coverImage: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
  },
  coverGradient: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  coverContent: {
    padding: Spacing.lg,
  },
  coverTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  backPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverHeader: {
    marginBottom: Spacing.xs,
  },
  manageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  clubName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Pretendard-Bold",
  },
  clubMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginHorizontal: 4,
  },
  infoSection: {
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  foundedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  foundedText: {
    fontSize: 12,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  warningText: {
    fontSize: 13,
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  tabTextActive: {
    fontWeight: "600",
  },
  tabContent: {
    flex: 1,
  },
  listContent: {
    paddingTop: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyText: {
    fontSize: 14,
  },
  meetupCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    ...Shadows.card,
  },
  meetupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  meetupDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  meetupDateText: {
    fontSize: 12,
    fontWeight: "600",
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  meetupTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  meetupDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  meetupLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2D5A27",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "500",
  },
  memberJoined: {
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
  },
  fabContainer: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: "center",
  },
  joinButton: {
    width: "100%",
  },
  pendingBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  pendingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.cardHover,
  },
  bookshelfCard: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    ...Shadows.card,
  },
  bookshelfCover: {
    width: 60,
    height: 90,
    marginRight: Spacing.md,
  },
  bookshelfCoverImage: {
    width: 60,
    height: 90,
  },
  bookshelfPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
  },
  bookshelfInfo: {
    flex: 1,
    justifyContent: "center",
  },
  bookshelfTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
    fontFamily: "Pretendard-Bold",
  },
  bookshelfAuthor: {
    fontSize: 13,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  welcomeModal: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  welcomeCloseButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.xs,
  },
  welcomeHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  welcomeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
    fontFamily: "Pretendard-Bold",
  },
  welcomeSubtitle: {
    fontSize: 13,
    textAlign: "center",
  },
  welcomeTemplateBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  welcomeTemplateLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  welcomeTemplateText: {
    fontSize: 14,
    lineHeight: 20,
  },
  welcomeButton: {
    marginTop: Spacing.sm,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    gap: 12,
  },
  voteSectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  voteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: Spacing.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 12,
  },
  voteCardLeft: { width: 24, alignItems: "center" },
  voteCardBody: { flex: 1, gap: 4 },
  voteBookTitle: { fontSize: 14, fontWeight: "600" },
  voteBookAuthor: { fontSize: 12 },
  voteBarWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  voteBarBg: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  voteBarFill: { height: 4, borderRadius: 2 },
  voteCount: { fontSize: 12, fontWeight: "600", width: 20, textAlign: "right" },
  voteBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  voteBtnText: { fontSize: 12, fontWeight: "600" },
});
