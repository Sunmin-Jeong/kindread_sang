import React from "react";
import { View, TextInput, StyleSheet, Pressable, Platform } from "react-native";
import { Search, X } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, IconSize } from "@/constants/theme";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search books...",
  onClear,
  autoFocus = false,
}: SearchBarProps) {
  const { theme } = useTheme();

  const handleClear = () => {
    onChangeText("");
    onClear?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
    >
      <Search
        size={IconSize.sm}
        color={theme.textSecondary}
        strokeWidth={1.5}
        style={styles.searchIcon}
      />
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={handleClear}
          style={({ pressed }) => [
            styles.clearButton,
            { opacity: pressed ? 0.5 : 1 },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={IconSize.sm} color={theme.textSecondary} strokeWidth={1.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: BorderRadius.lg,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: "100%",
    ...Platform.select({
      web: {
        outlineStyle: "none",
      },
    }),
  },
  clearButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
});
