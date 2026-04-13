import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform, ScrollView, Share, Alert, Dimensions } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Heart, MessageCircle, Share2, MoreHorizontal, Pencil, Trash2, Star, BookOpen } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { deleteBookmark } from "@/lib/storage";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { COLORS } from "@/constants/colors";
import { FONTS } from "@/constants/fonts";
import { toggleLike, getBookmarkEngagement } from "@/lib/storage";
import { BottomActionSheet } from "@/components/BottomActionSheet";
import { ImageViewer } from "@/components/ImageViewer";
import type { Bookmark } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CAROUSEL_IMAGE_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

interface BookmarkCardProps {
  bookmark: Bookmark;
  onPress?: () => void;
  onCommentPress?: () => void;
  onRefresh?: () => void;
  showClubBadge?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function StarRating({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={starStyles.container}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          color={i <= rating ? COLORS.amber : '#E5E5E5'}
          fill={i <= rating ? COLORS.amber : "transparent"}
          strokeWidth={1.5}
        />
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 1,
  },
});

function getRatingWord(rating: number): string {
  switch (rating) {
    case 5: return "Obsessed";
    case 4: return "Loved it";
    case 3: return "Good read";
    case 2: return "Meh";
    case 1: return "Not for me";
    default: return "";
  }
}

export function BookmarkCard({ bookmark, onPress, onCommentPress, onRefresh, showClubBadge = true }: BookmarkCardProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scale = useSharedValue(1);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const isOwnBookmark = user?.id === bookmark.userId;
  const isReview = bookmark.postType === 'review';

  const loadEngagement = useCallback(async () => {
    const engagement = await getBookmarkEngagement(bookmark.id, user?.id);
    setLiked(engagement.isLikedByUser);
    setLikesCount(engagement.likesCount);
    setCommentsCount(engagement.commentsCount);
  }, [bookmark.id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadEngagement();
    }, [loadEngagement])
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.99, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const handleLike = async () => {
    if (!user?.id) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLiked(!liked);
    setLikesCount(prev => liked ? Math.max(0, prev - 1) : prev + 1);
    const result = await toggleLike(bookmark.id, user.id);
    setLiked(result.liked);
    setLikesCount(result.count);
  };

  const handleComment = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onCommentPress?.();
  };

  const handleShare = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const bookTitle = bookmark.book?.title || "a book";
    const message = `"${bookmark.textContent.slice(0, 200)}${bookmark.textContent.length > 200 ? '...' : ''}" - from ${bookTitle}`;
    try {
      await Share.share({ message, title: `Bookmark from ${bookTitle}` });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleEdit = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate("EditBookmark", { bookmark });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Bookmark",
      "Are you sure you want to delete this bookmark?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await deleteBookmark(bookmark.id);
              if (success) {
                if (Platform.OS !== "web") {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                onRefresh?.();
              }
            } catch (error) {
              console.error("Error deleting bookmark:", error);
              Alert.alert("Error", "Failed to delete bookmark.");
            }
          },
        },
      ]
    );
  };

  const handleMoreOptions = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowActionSheet(true);
  };

  const getActionSheetActions = () => {
    if (!isOwnBookmark) {
      return [{ label: "Share", onPress: handleShare }];
    }
    return [
      { label: "Edit", onPress: handleEdit, icon: <Pencil size={20} color={theme.text} strokeWidth={1.5} /> },
      { label: "Delete", onPress: handleDelete, destructive: true, icon: <Trash2 size={20} color="#DC2626" strokeWidth={1.5} /> },
    ];
  };

  const handleImagePress = (index: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedImageIndex(index);
  };

  const hasImages = Array.isArray(bookmark.images) && bookmark.images.length > 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const progressPercent = (() => {
    if (bookmark.progressType === 'percent' && bookmark.pageNumber) {
      return bookmark.pageNumber;
    }
    if (bookmark.pageNumber && bookmark.book?.totalPages) {
      return Math.min(100, Math.round((bookmark.pageNumber / bookmark.book.totalPages) * 100));
    }
    return null;
  })();

  const pageRangeStart = (() => {
    if (bookmark.pagesRead && bookmark.pageNumber) {
      return Math.max(1, bookmark.pageNumber - bookmark.pagesRead);
    }
    return null;
  })();

  const getPageRangeLabel = () => {
    if (bookmark.progressType === 'percent' && bookmark.pageNumber) {
      return null;
    }
    if (bookmark.pagesRead && bookmark.pagesRead > 0 && bookmark.pageNumber) {
      return `p.${pageRangeStart}-${bookmark.pageNumber}`;
    }
    if (bookmark.pageNumber) {
      return `p.${bookmark.pageNumber}`;
    }
    return null;
  };

  const getPercentLabel = () => {
    if (progressPercent !== null) return `${progressPercent}%`;
    return null;
  };

  const pageRangeLabel = getPageRangeLabel();
  const percentLabel = getPercentLabel();
  const hasQuote = bookmark.quoteText && bookmark.quoteText.trim().length > 0;
  const hasTextContent = bookmark.textContent && bookmark.textContent.trim().length > 0;

  const readingDays = (() => {
    if (!bookmark.createdAt) return null;
    const created = new Date(bookmark.createdAt);
    const now = new Date();
    const days = Math.max(1, Math.floor((now.getTime() - created.getTime()) / 86400000));
    return days;
  })();

  const displayHandle = bookmark.username ? `@${bookmark.username.toLowerCase().replace(/\s+/g, '_')}` : '';

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderBottomColor: theme.border },
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.avatarRow}
          onPress={(e) => {
            e.stopPropagation();
            if (user?.id === bookmark.userId) {
              navigation.getParent<any>()?.navigate("NotebookTab");
            } else {
              navigation.navigate("UserProfile", { userId: bookmark.userId });
            }
          }}
          hitSlop={4}
        >
          <View style={[styles.avatar, { backgroundColor: COLORS.green }]}>
            <ThemedText style={styles.avatarText}>
              {(bookmark.username || '?').slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <ThemedText style={[styles.username, { color: theme.text }]}>
                {bookmark.username}
              </ThemedText>
              <ThemedText style={[styles.handle, { color: theme.textTertiary }]}>
                {displayHandle}
              </ThemedText>
            </View>
            <ThemedText style={[styles.timestamp, { color: theme.textTertiary }]}>
              {formatDate(bookmark.createdAt)}
            </ThemedText>
          </View>
        </Pressable>
        {pageRangeLabel || percentLabel ? (
          <View style={styles.pageRangeRight}>
            {pageRangeLabel ? (
              <ThemedText style={[styles.pageRangeText, { color: theme.text }]}>
                {pageRangeLabel}
              </ThemedText>
            ) : null}
            {percentLabel ? (
              <ThemedText style={[styles.percentText, { color: theme.textTertiary }]}>
                {percentLabel}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </View>

      {progressPercent !== null ? (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, progressPercent)}%`, backgroundColor: COLORS.green },
              ]}
            />
          </View>
        </View>
      ) : null}

      {isReview && bookmark.book ? (
        <View style={styles.bookSection}>
          {bookmark.book.coverUrl ? (
            <Image
              source={{ uri: bookmark.book.coverUrl }}
              style={[styles.bookCover, { borderColor: theme.border }]}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.bookCoverPlaceholder, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
              <BookOpen size={16} color={theme.textTertiary} strokeWidth={1.5} />
            </View>
          )}
          <View style={styles.bookMeta}>
            <ThemedText style={[styles.bookTitle, { color: theme.text }]} numberOfLines={1} serif>
              {bookmark.book.title}
            </ThemedText>
            {bookmark.book.author ? (
              <ThemedText style={[styles.bookAuthor, { color: theme.textTertiary }]} numberOfLines={1}>
                {bookmark.book.author}
              </ThemedText>
            ) : null}
            {bookmark.rating && bookmark.rating > 0 ? (
              <View style={styles.ratingRow}>
                <StarRating rating={bookmark.rating} />
                <ThemedText style={[styles.ratingWord, { color: theme.text }]}>
                  {getRatingWord(bookmark.rating)}
                </ThemedText>
              </View>
            ) : null}
            <View style={styles.statsRow}>
              {readingDays !== null && readingDays > 1 ? (
                <ThemedText style={[styles.statText, { color: theme.textTertiary }]}>
                  {readingDays} days
                </ThemedText>
              ) : null}
              {bookmark.book.totalPages ? (
                <ThemedText style={[styles.statText, { color: theme.textTertiary }]}>
                  {readingDays !== null && readingDays > 1 ? ' \u00B7 ' : ''}{bookmark.book.totalPages}p
                </ThemedText>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {!isReview && bookmark.book ? (
        <View style={styles.progressBookRow}>
          {bookmark.book.coverUrl ? (
            <Image
              source={{ uri: bookmark.book.coverUrl }}
              style={[styles.progressBookCover, { borderColor: theme.border }]}
              contentFit="cover"
              transition={200}
            />
          ) : null}
          <View style={styles.progressBookContent}>
            {hasQuote ? (
              <View style={styles.quoteBlock}>
                <ThemedText style={[styles.quoteText, { color: theme.textSecondary }]} serif numberOfLines={4}>
                  {bookmark.quoteText}
                </ThemedText>
              </View>
            ) : null}
            {hasTextContent && !hasQuote ? (
              <ThemedText style={[styles.bodyText, { color: theme.text }]} numberOfLines={3}>
                {bookmark.textContent}
              </ThemedText>
            ) : null}
            <ThemedText style={[styles.progressBookTitle, { color: theme.textTertiary }]} numberOfLines={1}>
              {bookmark.book.title}
            </ThemedText>
          </View>
        </View>
      ) : null}

      {isReview ? (
        <>
          {hasQuote ? (
            <View style={styles.quoteBlock}>
              <ThemedText style={[styles.quoteText, { color: theme.textSecondary }]} serif numberOfLines={4}>
                {bookmark.quoteText}
              </ThemedText>
            </View>
          ) : null}
          {hasTextContent ? (
            <View style={styles.textContainer}>
              <ThemedText style={[styles.bodyText, { color: theme.text }]} numberOfLines={6}>
                {bookmark.textContent}
              </ThemedText>
            </View>
          ) : null}
        </>
      ) : null}

      {hasImages ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imagesScroll}
          contentContainerStyle={styles.imagesContainer}
          pagingEnabled={bookmark.images!.length > 1}
          decelerationRate="fast"
          snapToInterval={CAROUSEL_IMAGE_WIDTH + Spacing.sm}
        >
          {bookmark.images!.map((imageUrl, index) => (
            <Pressable key={index} onPress={() => handleImagePress(index)}>
              <Image
                source={{ uri: imageUrl }}
                style={[
                  styles.postImage,
                  { borderColor: theme.border },
                  index < bookmark.images!.length - 1 && { marginRight: Spacing.sm },
                ]}
                contentFit="cover"
                transition={200}
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={handleLike} style={styles.actionButton} hitSlop={8}>
          <Heart
            size={16}
            color={liked ? "#E74C3C" : theme.textTertiary}
            fill={liked ? "#E74C3C" : "none"}
            strokeWidth={1.5}
          />
          {likesCount > 0 ? (
            <ThemedText style={[styles.actionCount, { color: theme.textTertiary }]}>
              {likesCount}
            </ThemedText>
          ) : null}
        </Pressable>
        <Pressable onPress={handleComment} style={styles.actionButton} hitSlop={8}>
          <MessageCircle size={16} color={theme.textTertiary} strokeWidth={1.5} />
          {commentsCount > 0 ? (
            <ThemedText style={[styles.actionCount, { color: theme.textTertiary }]}>
              {commentsCount}
            </ThemedText>
          ) : null}
        </Pressable>
      </View>

      <BottomActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        actions={getActionSheetActions()}
      />

      <ImageViewer
        visible={selectedImageIndex !== null}
        images={bookmark.images || []}
        initialIndex={selectedImageIndex ?? 0}
        onClose={() => setSelectedImageIndex(null)}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 0,
    borderBottomWidth: 0.75,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontFamily: FONTS.semibold,
    color: "#FFFFFF",
    fontSize: 13,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  username: {
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  handle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
  },
  timestamp: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 1,
  },
  pageRangeRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 2,
  },
  pageRangeText: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
  },
  percentText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.sub,
  },
  progressBarContainer: {
    marginBottom: Spacing.md,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  bookSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
    gap: 12,
  },
  bookCover: {
    width: 50,
    height: 75,
    borderRadius: 3,
    borderWidth: 0.75,
  },
  bookCoverPlaceholder: {
    width: 50,
    height: 75,
    borderRadius: 3,
    borderWidth: 0.75,
    alignItems: "center",
    justifyContent: "center",
  },
  bookMeta: {
    flex: 1,
    gap: 2,
  },
  bookTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  bookAuthor: {
    fontFamily: FONTS.regular,
    fontSize: 13,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  ratingWord: {
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
  progressBookRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: Spacing.sm,
  },
  progressBookCover: {
    width: 44,
    height: 66,
    borderRadius: 3,
    borderWidth: 0.75,
  },
  progressBookContent: {
    flex: 1,
  },
  progressBookTitle: {
    fontSize: 13,
    marginTop: 4,
  },
  quoteBlock: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.green,
    backgroundColor: COLORS.quoteBg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    marginBottom: Spacing.sm,
  },
  quoteText: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    lineHeight: 26,
  },
  textContainer: {
    marginBottom: Spacing.sm,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  imagesScroll: {
    marginBottom: Spacing.sm,
  },
  imagesContainer: {
    paddingLeft: 0,
  },
  postImage: {
    width: CAROUSEL_IMAGE_WIDTH,
    height: 180,
    borderRadius: 4,
    borderWidth: 0.75,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: Spacing.xl,
    paddingVertical: 2,
  },
  actionCount: {
    fontSize: 12,
    marginLeft: 4,
  },
});
