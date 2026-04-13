import React from "react";
import { ActionSheetIOS, Platform, View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ActionItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface BottomActionSheetProps {
  visible: boolean;
  onClose: () => void;
  actions: ActionItem[];
}

export function BottomActionSheet({ visible, onClose, actions }: BottomActionSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  React.useEffect(() => {
    if (!visible) return;

    if (Platform.OS === "ios") {
      const options = [...actions.map(a => a.label), "Cancel"];
      const destructiveIndex = actions.findIndex(a => a.destructive);
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex < actions.length) {
            actions[buttonIndex].onPress();
          }
          onClose();
        }
      );
    }
  }, [visible, actions, onClose]);

  if (Platform.OS === "ios") {
    return null;
  }

  if (!visible) return null;

  const handleAction = (action: ActionItem) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
    action.onPress();
  };

  return (
    <View style={[styles.overlay, { backgroundColor: "rgba(0, 0, 0, 0.3)" }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + Spacing.sm }]}>
        {actions.map((action, index) => (
          <Pressable
            key={index}
            onPress={() => handleAction(action)}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" }
            ]}
          >
            <ThemedText style={[styles.actionText, { color: action.destructive ? "#DC2626" : theme.text }]}>
              {action.label}
            </ThemedText>
          </Pressable>
        ))}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.cancelButton,
            { backgroundColor: pressed ? theme.backgroundSecondary : theme.backgroundRoot }
          ]}
        >
          <ThemedText style={[styles.cancelText, { color: theme.textSecondary }]}>
            Cancel
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  actionButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  actionText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  cancelButton: {
    marginTop: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
