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
import { Spacing, BorderRadius } from "@/constants/theme";
import type { Book } from "@/types";

interface SearchBookCardProps {
  book: Book;
  onPress?: () => void;
  width: number;
}

const ASPECT_RATIO = 1.5;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SearchBookCard({ book, onPress, width }: SearchBookCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const coverHeight = Math.floor(width * ASPECT_RATIO);

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

  const showPlaceholder = !book.coverUrl || imageError;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, { width }, animatedStyle]}
    >
      {showPlaceholder ? (
        <View
          style={[
            styles.cover,
            styles.placeholderCover,
            {
              width,
              height: coverHeight,
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
                  width,
                  height: coverHeight,
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
                width,
                height: coverHeight,
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
        type="caption"
        serif
        style={styles.title}
        numberOfLines={2}
      >
        {book.title}
      </ThemedText>
      <ThemedText
        type="caption"
        style={{ color: theme.textSecondary, fontSize: 10 }}
        numberOfLines={1}
      >
        {book.author}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {},
  cover: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  placeholderCover: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xs,
  },
  title: {
    fontWeight: "500",
    marginBottom: 2,
  },
});
