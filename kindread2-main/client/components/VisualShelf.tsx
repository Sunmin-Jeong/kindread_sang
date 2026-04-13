import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BookCover } from "@/constants/theme";
import type { Book } from "@/types";

interface VisualShelfProps {
  books: Book[];
  onBookPress?: (book: Book) => void;
  title?: string;
}

export function VisualShelf({ books, onBookPress, title }: VisualShelfProps) {
  const { theme } = useTheme();

  const handleBookPress = (book: Book) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onBookPress?.(book);
  };

  if (books.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {title ? (
        <ThemedText type="small" style={[styles.title, { color: theme.textSecondary }]}>
          {title}
        </ThemedText>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {books.map((book) => (
          <Pressable
            key={book.id}
            onPress={() => handleBookPress(book)}
            style={({ pressed }) => [
              styles.bookItem,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            {book.coverUrl ? (
              <Image
                source={{ uri: book.coverUrl }}
                style={[styles.cover, { borderColor: theme.border }]}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View
                style={[
                  styles.cover,
                  styles.placeholderCover,
                  { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                ]}
              >
                <ThemedText
                  type="caption"
                  serif
                  style={{ color: theme.textSecondary, textAlign: "center" }}
                  numberOfLines={2}
                >
                  {book.title}
                </ThemedText>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  scrollContent: {
    paddingRight: Spacing.lg,
  },
  bookItem: {
    marginRight: Spacing.md,
  },
  cover: {
    width: BookCover.medium.width,
    height: BookCover.medium.height,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  placeholderCover: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xs,
  },
});
