import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Flame, TrendingUp } from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { COLORS } from "@/constants/colors";
import { FONTS } from "@/constants/fonts";

interface StreakBarProps {
  streakDays: number;
  booksThisMonth: number;
  onStreakPress?: () => void;
  onBooksPress?: () => void;
}

export function StreakBar({ streakDays, booksThisMonth, onStreakPress, onBooksPress }: StreakBarProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      <Pressable style={styles.stat} onPress={onStreakPress} hitSlop={6}>
        <Flame size={16} color="#E8590C" strokeWidth={2} />
        <ThemedText style={[styles.number, { color: theme.text }]}>
          {streakDays}
        </ThemedText>
        <ThemedText style={[styles.label, { color: theme.textTertiary }]}>
          day streak
        </ThemedText>
      </Pressable>
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <Pressable style={styles.stat} onPress={onBooksPress} hitSlop={6}>
        <TrendingUp size={16} color={COLORS.green} strokeWidth={2} />
        <ThemedText style={[styles.number, { color: theme.text }]}>
          {booksThisMonth}
        </ThemedText>
        <ThemedText style={[styles.label, { color: theme.textTertiary }]}>
          books this month
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.75,
    gap: Spacing.lg,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  number: {
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
  divider: {
    width: 1,
    height: 16,
  },
});
