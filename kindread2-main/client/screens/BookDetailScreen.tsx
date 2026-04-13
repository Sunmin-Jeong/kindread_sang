import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { BookmarkCard } from "@/components/BookmarkCard";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BookCover, Shadows } from "@/constants/theme";
import { getBookBookmarks } from "@/lib/storage";
import type { Bookmark, Book } from "@/types";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type BookDetailRouteProp = RouteProp<RootStackParamList, "BookDetail">;

export default function BookDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<BookDetailRouteProp>();

  const { book } = route.params;
  const [relatedBookmarks, setRelatedBookmarks] = useState<Bookmark[]>([]);

  const loadRelatedBookmarks = useCallback(async () => {
    try {
      const bookmarks = await getBookBookmarks(book.id);
      setRelatedBookmarks(bookmarks);
    } catch (error) {
      console.error("Error loading related bookmarks:", error);
    }
  }, [book.id]);

  useFocusEffect(
    useCallback(() => {
      loadRelatedBookmarks();
    }, [loadRelatedBookmarks])
  );

  const handleWriteBookmark = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate("CreateBookmark", { book: book as Book });
  };

  const handleBookmarkPress = (bookmark: Bookmark) => {
    navigation.navigate("BookmarkDetail", { bookmark });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        entering={FadeInUp.duration(400)}
        style={styles.bookHeader}
      >
        <View style={styles.coverContainer}>
          {book.coverUrl ? (
            <Image
              source={{ uri: book.coverUrl }}
              style={[styles.cover, { borderColor: theme.border, ...Shadows.cardHover }]}
              contentFit="cover"
              transition={300}
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
                type="body"
                serif
                style={{ color: theme.textSecondary, textAlign: "center" }}
              >
                {book.title}
              </ThemedText>
            </View>
          )}
        </View>

        <ThemedText type="h3" serif style={styles.title}>
          {book.title}
        </ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          {book.author}
        </ThemedText>

        {book.publisher || book.publishedDate ? (
          <ThemedText
            type="small"
            style={[styles.metadata, { color: theme.textSecondary }]}
          >
            {[book.publisher, book.publishedDate].filter(Boolean).join(" • ")}
          </ThemedText>
        ) : null}

        <Button onPress={handleWriteBookmark} style={styles.writeButton}>
          Add a Bookmark
        </Button>
      </Animated.View>

      {book.description ? (
        <View style={styles.section}>
          <ThemedText
            type="small"
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            ABOUT THIS BOOK
          </ThemedText>
          <ThemedText type="body" style={{ lineHeight: 26 }}>
            {book.description}
          </ThemedText>
        </View>
      ) : null}

      {relatedBookmarks.length > 0 ? (
        <View style={styles.section}>
          <ThemedText
            type="small"
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            BOOKMARKS ({relatedBookmarks.length})
          </ThemedText>
          {relatedBookmarks.map((bookmark, index) => (
            <Animated.View
              key={bookmark.id}
              entering={FadeInUp.delay(index * 50).duration(300)}
            >
              <BookmarkCard
                bookmark={bookmark}
                onPress={() => handleBookmarkPress(bookmark)}
                onCommentPress={() => navigation.navigate("BookmarkDetail", { bookmark, focusComment: true })}
              />
            </Animated.View>
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <ThemedText
            type="small"
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            BOOKMARKS
          </ThemedText>
          <View style={[styles.emptyBookmarks, { borderColor: theme.border }]}>
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, textAlign: "center" }}
            >
              No bookmarks yet for this book.
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}
            >
              Be the first to share your thoughts!
            </ThemedText>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  bookHeader: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  coverContainer: {
    marginBottom: Spacing.xl,
  },
  cover: {
    width: BookCover.xlarge.width,
    height: BookCover.xlarge.height,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  placeholderCover: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  metadata: {
    marginTop: Spacing.sm,
  },
  writeButton: {
    marginTop: Spacing.xl,
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  emptyBookmarks: {
    paddingVertical: Spacing["3xl"],
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
});
