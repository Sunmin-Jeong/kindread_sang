import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform, ScrollView, Share, Alert, Dimensions } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { BookOpen, Pencil, Trash2 } from "lucide-react-native";
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
import { FeedCard, FeedCardHeader, FeedCardActions } from "@/components/FeedCard";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { COLORS } from "@/constants/colors";
import { FeedTypography } from "@/constants/typography";
import { toggleLike, getBookmarkEngagement } from "@/lib/storage";
import { BottomActionSheet } from "@/components/BottomActionSheet";
import { ImageViewer } from "@/components/ImageViewer";
import type { Bookmark } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CAROUSEL_IMAGE_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

interface ProgressCardProps {
  bookmark: Bookmark;
  onPress?: () => void;
  onCommentPress?: () => void;
  onRefresh?: () => void;
  userStreakDays?: number;
}

export function ProgressCard({ bookmark, onPress, onCommentPress, onRefresh, userStreakDays = 0 }: ProgressCardProps) {
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

  const loadEngagement = useCallback(async () => {
    const engagement = await getBookmarkEngagement(bookmark.id, user?.id);
    setLiked(engagement.isLikedByUser);
    setLikesCount(engagement.likesCount);
    setCommentsCount(engagement.commentsCount);
  }, [bookmark.id, user?.id]);

  useFocusEffect(useCallback(() => { loadEngagement(); }, [loadEngagement]));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => { scale.value = withSpring(0.99, { damping: 15, stiffness: 200 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 15, stiffness: 200 }); };

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const handleLike = async () => {
    if (!user?.id) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked(!liked);
    setLikesCount(prev => liked ? Math.max(0, prev - 1) : prev + 1);
    const result = await toggleLike(bookmark.id, user.id);
    setLiked(result.liked);
    setLikesCount(result.count);
  };

  const handleComment = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCommentPress?.();
  };

  const handleShare = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const bookTitle = bookmark.book?.title || "a book";
    const message = `"${bookmark.textContent.slice(0, 200)}${bookmark.textContent.length > 200 ? '...' : ''}" - from ${bookTitle}`;
    try { await Share.share({ message, title: `Bookmark from ${bookTitle}` }); } catch (e) {}
  };

  const handleEdit = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("EditBookmark", { bookmark });
  };

  const handleDelete = () => {
    Alert.alert("Delete Bookmark", "Are you sure you want to delete this bookmark?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            const success = await deleteBookmark(bookmark.id);
            if (success) {
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onRefresh?.();
            }
          } catch (e) { Alert.alert("Error", "Failed to delete bookmark."); }
        },
      },
    ]);
  };

  const getActionSheetActions = () => {
    if (!isOwnBookmark) return [{ label: "Share", onPress: handleShare }];
    return [
      { label: "Edit", onPress: handleEdit, icon: <Pencil size={20} color={theme.text} strokeWidth={1.5} /> },
      { label: "Delete", onPress: handleDelete, destructive: true, icon: <Trash2 size={20} color="#DC2626" strokeWidth={1.5} /> },
    ];
  };

  const hasImages = Array.isArray(bookmark.images) && bookmark.images.length > 0;
  const hasQuote = bookmark.quoteText && bookmark.quoteText.trim().length > 0;
  const hasTextContent = bookmark.textContent && bookmark.textContent.trim().length > 0;
  const displayHandle = bookmark.username ? `@${bookmark.username.toLowerCase().replace(/\s+/g, '_')}` : '';
  const showFlame = userStreakDays >= 3;

  const progressPercent = (() => {
    if (bookmark.progressType === 'percent' && bookmark.pageNumber) return bookmark.pageNumber;
    if (bookmark.pageNumber && bookmark.book?.totalPages) return Math.min(100, Math.round((bookmark.pageNumber / bookmark.book.totalPages) * 100));
    return null;
  })();

  const pageRangeStart = bookmark.pagesRead && bookmark.pageNumber ? Math.max(1, bookmark.pageNumber - bookmark.pagesRead) : null;

  const getProgressPillLabel = () => {
    if (bookmark.progressType === 'percent' && bookmark.pageNumber) return null;
    if (bookmark.pagesRead && bookmark.pagesRead > 0 && bookmark.pageNumber) return `p.${pageRangeStart}\u2013${bookmark.pageNumber}`;
    if (bookmark.pageNumber) return `p.${bookmark.pageNumber}`;
    return null;
  };

  const pillLabel = getProgressPillLabel();
  const percentLabel = progressPercent !== null ? `${progressPercent}%` : null;

  const progressBarLabel = (() => {
    const parts: string[] = [];
    if (progressPercent !== null) parts.push(`${progressPercent}%`);
    if (bookmark.pageNumber && bookmark.book?.totalPages) {
      parts.push(`p.${bookmark.pageNumber} of ${bookmark.book.totalPages}p`);
    } else if (bookmark.pageNumber) {
      parts.push(`p.${bookmark.pageNumber}`);
    }
    return parts.length > 0 ? parts.join(" \u00B7 ") : null;
  })();

  const onAvatarPress = () => {
    if (user?.id === bookmark.userId) {
      navigation.getParent<any>()?.navigate("NotebookTab");
    } else {
      navigation.navigate("UserProfile", { userId: bookmark.userId });
    }
  };

  const progressTrailing =
    pillLabel || percentLabel ? (
      <View style={styles.progressPill}>
        {pillLabel ? <ThemedText style={[FeedTypography.progressPill, { color: theme.text }]}>{pillLabel}</ThemedText> : null}
        {percentLabel ? <ThemedText style={[FeedTypography.progressPercent, { color: theme.textTertiary }]}>{percentLabel}</ThemedText> : null}
      </View>
    ) : null;

  return (
    <FeedCard
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      animatedStyle={animatedStyle}
    >
      <FeedCardHeader
        username={bookmark.username}
        displayHandle={displayHandle}
        createdAt={bookmark.createdAt}
        showFlame={showFlame}
        onAvatarPress={onAvatarPress}
        trailing={progressTrailing}
      />

      {hasQuote ? (
        <View style={styles.quoteBlock}>
          <ThemedText style={FeedTypography.quote} serif numberOfLines={4}>
            {bookmark.quoteText}
          </ThemedText>
        </View>
      ) : null}

      {hasTextContent ? (
        <View style={styles.noteContainer}>
          <ThemedText style={[FeedTypography.body, { color: theme.text }]} numberOfLines={3}>
            {bookmark.textContent}
          </ThemedText>
        </View>
      ) : null}

      {hasImages ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll} pagingEnabled={bookmark.images!.length > 1} decelerationRate="fast" snapToInterval={CAROUSEL_IMAGE_WIDTH + Spacing.sm}>
          {bookmark.images!.map((imageUrl, index) => (
            <Pressable key={index} onPress={() => setSelectedImageIndex(index)}>
              <Image source={{ uri: imageUrl }} style={[styles.postImage, { borderColor: theme.border }, index < bookmark.images!.length - 1 ? { marginRight: Spacing.sm } : undefined]} contentFit="cover" transition={200} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {bookmark.book ? (
        <View style={styles.bookRow}>
          {bookmark.book.coverUrl ? (
            <Image source={{ uri: bookmark.book.coverUrl }} style={[styles.bookCover, { borderColor: theme.border }]} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.bookCoverPlaceholder, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
              <BookOpen size={14} color={theme.textTertiary} strokeWidth={1.5} />
            </View>
          )}
          <View style={styles.bookInfo}>
            <ThemedText style={[FeedTypography.bookTitle, { color: theme.text }]} numberOfLines={1}>{bookmark.book.title}</ThemedText>
            {bookmark.book.author ? <ThemedText style={[FeedTypography.bookMeta, { color: theme.textTertiary }]} numberOfLines={1}>{bookmark.book.author}</ThemedText> : null}
            {progressPercent !== null ? (
              <View style={styles.progressBarWrapper}>
                <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(100, progressPercent)}%`, backgroundColor: COLORS.green }]} />
                </View>
              </View>
            ) : null}
            {progressBarLabel ? <ThemedText style={[FeedTypography.bookMeta, { color: theme.textTertiary }]}>{progressBarLabel}</ThemedText> : null}
          </View>
        </View>
      ) : null}

      <FeedCardActions
        liked={liked}
        likesCount={likesCount}
        commentsCount={commentsCount}
        onLike={handleLike}
        onComment={handleComment}
      />

      <BottomActionSheet visible={showActionSheet} onClose={() => setShowActionSheet(false)} actions={getActionSheetActions()} />
      <ImageViewer visible={selectedImageIndex !== null} images={bookmark.images || []} initialIndex={selectedImageIndex ?? 0} onClose={() => setSelectedImageIndex(null)} />
    </FeedCard>
  );
}

const styles = StyleSheet.create({
  progressPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 2,
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
  noteContainer: {
    marginBottom: Spacing.sm,
  },
  imagesScroll: {
    marginBottom: Spacing.sm,
  },
  postImage: {
    width: CAROUSEL_IMAGE_WIDTH,
    height: 180,
    borderRadius: 4,
    borderWidth: 0.75,
  },
  bookRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: Spacing.xs,
  },
  bookCover: {
    width: 52,
    height: 74,
    borderRadius: 4,
    borderWidth: 0.75,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  bookCoverPlaceholder: {
    width: 52,
    height: 74,
    borderRadius: 4,
    borderWidth: 0.75,
    alignItems: "center",
    justifyContent: "center",
  },
  bookInfo: {
    flex: 1,
    gap: 1,
  },
  progressBarWrapper: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 2,
    borderRadius: 1,
  },
});
