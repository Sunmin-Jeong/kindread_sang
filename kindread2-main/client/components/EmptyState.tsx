import React from "react";
import { View, StyleSheet, Image } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

type EmptyStateType = "feed" | "search" | "shelf";

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  message?: string;
}

const defaultContent: Record<EmptyStateType, { title: string; message: string }> = {
  feed: {
    title: "No Bookmarks Yet",
    message: "Be the first to share your thoughts on a book",
  },
  search: {
    title: "Discover Books",
    message: "Search for books to add to your bookmarks",
  },
  shelf: {
    title: "Your Shelf is Empty",
    message: "Start adding bookmarks to build your collection",
  },
};

const images: Record<EmptyStateType, any> = {
  feed: require("../../assets/images/empty-feed.png"),
  search: require("../../assets/images/empty-search.png"),
  shelf: require("../../assets/images/empty-shelf.png"),
};

export function EmptyState({ type, title, message }: EmptyStateProps) {
  const { theme } = useTheme();
  const content = defaultContent[type];

  return (
    <View style={styles.container}>
      <Image
        source={images[type]}
        style={styles.image}
        resizeMode="contain"
      />
      <ThemedText type="h4" serif style={styles.title}>
        {title || content.title}
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.message, { color: theme.textSecondary }]}
      >
        {message || content.message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing["5xl"],
  },
  image: {
    width: 180,
    height: 180,
    marginBottom: Spacing.xl,
    opacity: 0.8,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    textAlign: "center",
  },
});
