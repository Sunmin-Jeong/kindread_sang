import React from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { ThemedText } from "@/components/ThemedText";
import type { DiscoverReader } from "@/lib/readers-storage";

const GREEN = "#2A7A52";
const GREEN_BG = "#E8F3ED";
const BORDER = "#EBEBEB";
const MUTED = "#777777";
const TEXT = "#0A0A0A";
const SURFACE = "#F7F7F7";

interface Props {
  reader: DiscoverReader;
  isFollowing: boolean;
  isFollowLoading?: boolean;
  onFollowPress: () => void;
  onPress: () => void;
  badge?: string;
}

export function ReaderCard({
  reader,
  isFollowing,
  isFollowLoading,
  onFollowPress,
  onPress,
  badge,
}: Props) {
  const initials = reader.username.slice(0, 2).toUpperCase();

  return (
    <Pressable style={[styles.card, { borderColor: BORDER }]} onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: GREEN }]}>
          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <ThemedText style={[styles.username, { color: TEXT }]} numberOfLines={1}>
              {reader.username}
            </ThemedText>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: "#F3F0FF" }]}>
                <ThemedText style={[styles.badgeText, { color: "#7C3AED" }]}>{badge}</ThemedText>
              </View>
            ) : null}
          </View>

          {reader.bio ? (
            <ThemedText style={[styles.bio, { color: MUTED }]} numberOfLines={1}>
              {reader.bio}
            </ThemedText>
          ) : null}

          <ThemedText style={[styles.followers, { color: MUTED }]}>
            {reader.followerCount === 1
              ? "1 follower"
              : `${reader.followerCount} followers`}
          </ThemedText>
        </View>

        <View style={styles.rightCol}>
          {reader.currentBookCover ? (
            <Image
              source={{ uri: reader.currentBookCover }}
              style={styles.bookCover}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.bookCover, styles.bookCoverEmpty, { backgroundColor: SURFACE }]} />
          )}

          <Pressable
            style={[
              styles.followBtn,
              {
                backgroundColor: isFollowing ? "#FFFFFF" : GREEN,
                borderColor: isFollowing ? BORDER : GREEN,
              },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onFollowPress();
            }}
          >
            {isFollowLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? GREEN : "#FFFFFF"} />
            ) : (
              <ThemedText
                style={[styles.followBtnText, { color: isFollowing ? MUTED : "#FFFFFF" }]}
              >
                {isFollowing ? "Following" : "Follow"}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "nowrap",
  },
  username: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  bio: {
    fontSize: 12,
    lineHeight: 17,
  },
  followers: {
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  rightCol: {
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  bookCover: {
    width: 36,
    height: 52,
    borderRadius: 4,
  },
  bookCoverEmpty: {
    opacity: 0.5,
  },
  followBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 72,
    alignItems: "center",
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
