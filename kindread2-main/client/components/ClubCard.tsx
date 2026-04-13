import React from "react";
import { View, StyleSheet, Pressable, ImageBackground, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Users, Globe, MapPin } from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { Club } from "@/types";

interface ClubCardProps {
  club: Club;
  onPress: () => void;
  variant?: "compact" | "full";
}

export function ClubCard({ club, onPress, variant = "full" }: ClubCardProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const getMeetingModeIcon = () => {
    switch (club.meetingMode) {
      case "online":
        return <Globe size={12} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />;
      case "offline":
        return <MapPin size={12} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />;
      default:
        return <Users size={12} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />;
    }
  };

  if (variant === "compact") {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.compactContainer,
          { opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <ImageBackground
          source={{ uri: club.imageUrl || "https://picsum.photos/200/200" }}
          style={styles.compactImage}
          imageStyle={styles.compactImageStyle}
        >
          <View style={styles.compactGradient}>
            <ThemedText style={styles.compactName} numberOfLines={2}>
              {club.name}
            </ThemedText>
            <View style={styles.compactMeta}>
              <Users size={10} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />
              <ThemedText style={styles.compactMetaText}>
                {club.memberCount}
              </ThemedText>
            </View>
          </View>
        </ImageBackground>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.95 : 1 },
      ]}
    >
      <ImageBackground
        source={{ uri: club.imageUrl || "https://picsum.photos/400/200" }}
        style={styles.coverImage}
        imageStyle={styles.coverImageStyle}
      >
        <View style={styles.coverGradient}>
          <ThemedText style={styles.clubName} numberOfLines={1}>
            {club.name}
          </ThemedText>
          <View style={styles.clubMeta}>
            {getMeetingModeIcon()}
            <ThemedText style={styles.metaText}>
              {club.meetingMode === "offline" && club.city
                ? club.city
                : club.meetingMode.charAt(0).toUpperCase() + club.meetingMode.slice(1)}
            </ThemedText>
            <View style={styles.metaDot} />
            <Users size={12} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />
            <ThemedText style={styles.metaText}>
              {club.memberCount} members
            </ThemedText>
          </View>
        </View>
      </ImageBackground>
      {club.description ? (
        <View style={styles.descriptionContainer}>
          <ThemedText
            style={[styles.description, { color: theme.textSecondary }]}
            numberOfLines={2}
          >
            {club.description}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  coverImage: {
    height: 120,
    width: "100%",
  },
  coverImageStyle: {
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
  },
  coverGradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  clubName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Pretendard-Bold",
  },
  clubMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginHorizontal: 2,
  },
  descriptionContainer: {
    padding: Spacing.md,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  compactContainer: {
    width: 120,
    height: 120,
    marginRight: Spacing.sm,
  },
  compactImage: {
    flex: 1,
  },
  compactImageStyle: {
    borderRadius: BorderRadius.md,
  },
  compactGradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: BorderRadius.md,
  },
  compactName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 16,
  },
  compactMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  compactMetaText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
  },
});
