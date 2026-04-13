import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BookCover } from "@/constants/theme";
import type { Book } from "@/types";

interface BookCardProps {
  book: Book;
  onPress?: () => void;
  size?: "small" | "medium" | "large";
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function BookCard({ book, onPress, size = "large" }: BookCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const coverSize = BookCover[size];
  const showPlaceholder = !book.coverUrl || imageError;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, { width: coverSize.width }, animatedStyle]}
    >
      {showPlaceholder ? (
        <View
          style={[
            styles.cover,
            styles.placeholderCover,
            {
              width: coverSize.width,
              height: coverSize.height,
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          <ThemedText
            type="caption"
            serif
            style={{ color: theme.textSecondary, textAlign: "center" }}
            numberOfLines={3}
          >
            {book.title}
          </ThemedText>
        </View>
      ) : (
        <View style={{ position: "relative" }}>
          {imageLoading ? (
            <View
              style={[
                styles.cover,
                styles.placeholderCover,
                {
                  width: coverSize.width,
                  height: coverSize.height,
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                  position: "absolute",
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary }}
              >
                Loading...
              </ThemedText>
            </View>
          ) : null}
          <Image
            source={{ uri: book.coverUrl! }}
            style={[
              styles.cover,
              {
                width: coverSize.width,
                height: coverSize.height,
                borderColor: theme.border,
                opacity: imageLoading ? 0 : 1,
              },
            ]}
            contentFit="cover"
            transition={200}
            onError={handleImageError}
            onLoad={handleImageLoad}
            cachePolicy="memory-disk"
            recyclingKey={book.id}
          />
        </View>
      )}

      <ThemedText
        type="small"
        serif
        style={styles.title}
        numberOfLines={2}
      >
        {book.title}
      </ThemedText>
      <ThemedText
        type="caption"
        style={{ color: theme.textSecondary }}
        numberOfLines={1}
      >
        {book.author}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: Spacing.lg,
  },
  cover: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  placeholderCover: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
  },
  title: {
    fontWeight: "500",
    marginBottom: 2,
  },
});
