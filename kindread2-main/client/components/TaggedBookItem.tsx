import React from "react";
import { View, StyleSheet, Pressable, TextInput, Platform } from "react-native";
import { Image } from "expo-image";
import { X } from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, IconSize } from "@/constants/theme";
import type { Book, ProgressType } from "@/types";

interface TaggedBookItemProps {
  book: Book;
  progressValue?: string;
  progressType?: ProgressType;
  totalPages?: string;
  onProgressValueChange?: (value: string) => void;
  onProgressTypeChange?: (type: ProgressType) => void;
  onTotalPagesChange?: (value: string) => void;
  onRemove?: () => void;
}

export function TaggedBookItem({
  book,
  progressValue,
  progressType = 'page',
  totalPages,
  onProgressValueChange,
  onProgressTypeChange,
  onTotalPagesChange,
  onRemove,
}: TaggedBookItemProps) {
  const { theme } = useTheme();
  
  const numericValue = parseInt(progressValue || '0', 10) || 0;
  const numericTotalPages = parseInt(totalPages || '0', 10) || book.totalPages || 0;
  
  const progressPercent = progressType === 'percent' 
    ? Math.min(numericValue, 100) 
    : numericTotalPages > 0 
      ? Math.min((numericValue / numericTotalPages) * 100, 100)
      : 0;

  const showTotalPagesInput = progressType === 'page' && !book.totalPages;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
      ]}
    >
      <View style={styles.bookInfo}>
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
              { backgroundColor: theme.backgroundTertiary, borderColor: theme.border },
            ]}
          />
        )}
        <View style={styles.bookDetails}>
          <ThemedText type="small" serif numberOfLines={1} style={styles.title}>
            {book.title}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary }}
            numberOfLines={1}
          >
            {book.author}
          </ThemedText>
        </View>
        <Pressable
          onPress={onRemove}
          style={({ pressed }) => [
            styles.removeButton,
            { opacity: pressed ? 0.5 : 1 },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={IconSize.sm} color={theme.textSecondary} strokeWidth={1.5} />
        </Pressable>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressToggle}>
          <Pressable
            onPress={() => onProgressTypeChange?.('page')}
            style={[
              styles.toggleOption,
              progressType === 'page' && { backgroundColor: theme.accent },
            ]}
          >
            <ThemedText
              type="caption"
              style={[
                styles.toggleText,
                { color: progressType === 'page' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Page #
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => onProgressTypeChange?.('percent')}
            style={[
              styles.toggleOption,
              progressType === 'percent' && { backgroundColor: theme.accent },
            ]}
          >
            <ThemedText
              type="caption"
              style={[
                styles.toggleText,
                { color: progressType === 'percent' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              %
            </ThemedText>
          </Pressable>
        </View>
        
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={progressValue}
            onChangeText={onProgressValueChange}
            placeholder={progressType === 'page' ? "e.g. 42" : "e.g. 25"}
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
          />
          {progressType === 'percent' ? (
            <ThemedText type="caption" style={[styles.suffix, { color: theme.textSecondary }]}>
              %
            </ThemedText>
          ) : null}
        </View>
      </View>

      {showTotalPagesInput ? (
        <View style={styles.totalPagesSection}>
          <ThemedText type="caption" style={[styles.totalPagesLabel, { color: theme.textSecondary }]}>
            Total pages:
          </ThemedText>
          <TextInput
            style={[
              styles.totalPagesInput,
              {
                backgroundColor: theme.surface,
                borderColor: theme.accent,
                color: theme.text,
              },
            ]}
            value={totalPages}
            onChangeText={onTotalPagesChange}
            placeholder="e.g. 320"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
          />
        </View>
      ) : null}

      {numericValue > 0 && (progressType === 'percent' || numericTotalPages > 0) ? (
        <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressBar,
              { width: `${progressPercent}%`, backgroundColor: theme.accent },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
  },
  bookInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  cover: {
    width: 36,
    height: 54,
    borderRadius: BorderRadius.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  placeholderCover: {},
  bookDetails: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  title: {
    fontWeight: "500",
    marginBottom: 2,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  progressToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  toggleOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: "600",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm,
    fontSize: 14,
    textAlignVertical: "center",
  },
  suffix: {
    marginLeft: 4,
    fontWeight: "500",
  },
  totalPagesSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  totalPagesLabel: {
    fontSize: 12,
  },
  totalPagesInput: {
    flex: 1,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    fontSize: 14,
    textAlignVertical: "center",
  },
  progressBarContainer: {
    height: 3,
    borderRadius: 2,
    marginTop: Spacing.sm,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
});
