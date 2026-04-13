import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface LoadingIndicatorProps {
  message?: string;
  size?: "small" | "large";
}

export function LoadingIndicator({
  message,
  size = "large",
}: LoadingIndicatorProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={theme.accent} />
      {message ? (
        <ThemedText
          type="small"
          style={[styles.message, { color: theme.textSecondary }]}
        >
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
  },
  message: {
    marginTop: Spacing.md,
  },
});
