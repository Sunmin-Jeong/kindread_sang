import React from "react";
import { View, StyleSheet, Platform } from "react-native";

import { ThemedText } from "@/components/ThemedText";

interface HeaderTitleProps {
  title: string;
  showIcon?: boolean;
}

export function HeaderTitle({ title }: HeaderTitleProps) {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{title}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    fontFamily: Platform.select({
      ios: "Pretendard-SemiBold",
      android: "Pretendard-SemiBold",
      web: "Pretendard-SemiBold, sans-serif",
      default: "Pretendard-SemiBold",
    }),
  },
});
