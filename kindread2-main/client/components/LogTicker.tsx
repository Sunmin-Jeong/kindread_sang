import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Heart, BookOpen } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { toggleLike, getBookmarkEngagement } from "@/lib/storage";
import type { Bookmark } from "@/types";

interface LogTickerProps {
  bookmark: Bookmark;
  onPress?: () => void;
  onRefresh?: () => void;
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}w`;
}

export function LogTicker({ bookmark, onPress, onRefresh }: LogTickerProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const loadEngagement = useCallback(async () => {
    const engagement = await getBookmarkEngagement(bookmark.id, user?.id);
    setLiked(engagement.isLikedByUser);
    setLikesCount(engagement.likesCount);
  }, [bookmark.id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadEngagement();
    }, [loadEngagement])
  );

  const handleLike = async () => {
    if (!user?.id) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    const result = await toggleLike(bookmark.id, user.id);
    setLiked(result.liked);
    setLikesCount(result.count);
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate("BookmarkDetail", { bookmark });
    }
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

  const getProgressLabel = () => {
    if (bookmark.progressType === 'percent' && bookmark.pageNumber) {
      if (bookmark.percentageDelta && bookmark.percentageDelta > 0) {
        return `+${bookmark.percentageDelta}%`;
      }
      return `${bookmark.pageNumber}%`;
    }
    if (bookmark.pagesRead && bookmark.pagesRead > 0 && bookmark.pageNumber) {
      return `pp. ${pageRangeStart}-${bookmark.pageNumber}`;
    }
    if (bookmark.pageNumber) {
      return `p. ${bookmark.pageNumber}`;
    }
    return null;
  };

  const progressLabel = getProgressLabel();

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <View style={[styles.ticker, { backgroundColor: theme.surface }]}>
        {bookmark.book?.coverUrl ? (
          <Image
            source={{ uri: bookmark.book.coverUrl }}
            style={[styles.bookCover, { borderColor: theme.border }]}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.bookCoverPlaceholder, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <BookOpen size={16} color={theme.textTertiary} strokeWidth={1.5} />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.topRow}>
            <ThemedText style={[styles.username, { color: theme.text }]} numberOfLines={1}>
              {bookmark.username}
            </ThemedText>
            <ThemedText style={[styles.time, { color: theme.textTertiary }]}>
              {formatTimeAgo(bookmark.createdAt)}
            </ThemedText>
          </View>

          <ThemedText style={[styles.bookTitle, { color: theme.textSecondary }]} numberOfLines={1} serif>
            {bookmark.book?.title || "a book"}
          </ThemedText>

          {progressPercent !== null ? (
            <View style={styles.progressRow}>
              <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, progressPercent)}%`,
                      backgroundColor: theme.accent,
                    },
                  ]}
                />
              </View>
              {progressLabel ? (
                <ThemedText style={[styles.progressLabel, { color: theme.textTertiary }]}>
                  {progressLabel}
                </ThemedText>
              ) : null}
            </View>
          ) : progressLabel ? (
            <ThemedText style={[styles.progressLabel, { color: theme.textTertiary }]}>
              {progressLabel}
            </ThemedText>
          ) : null}

          {bookmark.textContent ? (
            <ThemedText style={[styles.noteText, { color: theme.textSecondary }]} numberOfLines={1}>
              {bookmark.textContent}
            </ThemedText>
          ) : null}

          {bookmark.clubName ? (
            <ThemedText style={[styles.clubBadge, { color: theme.textTertiary }]} numberOfLines={1}>
              {bookmark.clubName}
            </ThemedText>
          ) : null}
        </View>

        <Pressable onPress={handleLike} hitSlop={12} style={styles.likeButton}>
          <Heart
            size={16}
            color={liked ? "#E53935" : theme.textTertiary}
            fill={liked ? "#E53935" : "transparent"}
            strokeWidth={1.5}
          />
          {likesCount > 0 ? (
            <ThemedText style={[styles.likeCount, { color: theme.textTertiary }]}>
              {likesCount}
            </ThemedText>
          ) : null}
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {},
  ticker: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    gap: 12,
  },
  bookCover: {
    width: 40,
    height: 60,
    borderRadius: 3,
    borderWidth: 0.75,
  },
  bookCoverPlaceholder: {
    width: 40,
    height: 60,
    borderRadius: 3,
    borderWidth: 0.75,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  username: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  time: {
    fontSize: 11,
    marginLeft: 8,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "500",
    minWidth: 50,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  clubBadge: {
    fontSize: 11,
    marginTop: 1,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 8,
    paddingTop: 4,
  },
  likeCount: {
    fontSize: 12,
  },
});
