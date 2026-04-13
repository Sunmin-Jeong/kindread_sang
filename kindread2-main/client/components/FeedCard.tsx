import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { Heart, MessageCircle } from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { COLORS } from "@/constants/colors";
import { FeedTypography } from "@/constants/typography";
import { FONTS } from "@/constants/fonts";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function formatFeedTimestamp(dateString: string) {
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
}

type FeedCardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  animatedStyle?: object;
};

/** Shell: padding, border, surface colors from design tokens (light) + theme (dark). */
export function FeedCard({
  children,
  onPress,
  onPressIn,
  onPressOut,
  animatedStyle,
}: FeedCardProps) {
  const { theme, isDark } = useTheme();
  const bg = isDark ? theme.surface : COLORS.card;
  const border = isDark ? theme.border : COLORS.line;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.shell, { backgroundColor: bg, borderBottomColor: border }, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

type FeedCardHeaderProps = {
  username?: string | null;
  displayHandle: string;
  createdAt: string;
  showFlame?: boolean;
  onAvatarPress: () => void;
  /** e.g. progress pill (ProgressCard) */
  trailing?: React.ReactNode;
};

export function FeedCardHeader({
  username,
  displayHandle,
  createdAt,
  showFlame = false,
  onAvatarPress,
  trailing,
}: FeedCardHeaderProps) {
  const { theme, isDark } = useTheme();
  const nameColor = isDark ? theme.text : COLORS.text;
  const handleColor = isDark ? theme.textTertiary : COLORS.sub;
  const timeColor = isDark ? theme.textTertiary : COLORS.muted;

  return (
    <View style={styles.headerRow}>
      <Pressable
        style={styles.avatarRow}
        onPress={(e) => {
          e.stopPropagation();
          onAvatarPress();
        }}
        hitSlop={4}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: COLORS.green }]}>
            <ThemedText style={[styles.avatarText, { color: "#FFFFFF" }]}>
              {(username || "?").slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          {showFlame ? (
            <View style={[styles.flameBadge, { borderColor: COLORS.line }]}>
              <ThemedText style={styles.flameEmoji}>{"\uD83D\uDD25"}</ThemedText>
            </View>
          ) : null}
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <ThemedText style={[FeedTypography.username, { color: nameColor }]}>{username}</ThemedText>
            <ThemedText style={[FeedTypography.handle, { color: handleColor }]}>{displayHandle}</ThemedText>
          </View>
          <ThemedText style={[FeedTypography.timestamp, { color: timeColor }]}>
            {formatFeedTimestamp(createdAt)}
          </ThemedText>
        </View>
      </Pressable>
      {trailing}
    </View>
  );
}

type FeedCardActionsProps = {
  liked: boolean;
  likesCount: number;
  commentsCount: number;
  onLike: () => void;
  onComment: () => void;
};

export function FeedCardActions({
  liked,
  likesCount,
  commentsCount,
  onLike,
  onComment,
}: FeedCardActionsProps) {
  const { theme, isDark } = useTheme();
  const iconMuted = isDark ? theme.textTertiary : COLORS.muted;
  const countColor = isDark ? theme.textTertiary : COLORS.muted;

  return (
    <View style={styles.actions}>
      <Pressable onPress={onLike} style={styles.actionButton} hitSlop={8}>
        <Heart
          size={16}
          color={liked ? "#E74C3C" : iconMuted}
          fill={liked ? "#E74C3C" : "none"}
          strokeWidth={1.5}
        />
        {likesCount > 0 ? (
          <ThemedText style={[FeedTypography.actionCount, { color: countColor }]}>{likesCount}</ThemedText>
        ) : null}
      </Pressable>
      <Pressable onPress={onComment} style={styles.actionButton} hitSlop={8}>
        <MessageCircle size={16} color={iconMuted} strokeWidth={1.5} />
        {commentsCount > 0 ? (
          <ThemedText style={[FeedTypography.actionCount, { color: countColor }]}>{commentsCount}</ThemedText>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
  },
  flameBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  flameEmoji: {
    fontSize: 8,
    lineHeight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingVertical: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
});
