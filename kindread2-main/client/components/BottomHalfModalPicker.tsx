import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Check } from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.5;

interface PickerOption {
  value: string;
  label: string;
}

interface BottomHalfModalPickerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: PickerOption[];
  selectedValue?: string;
  selectedValues?: string[];
  onSelect: (value: string) => void;
  multiSelect?: boolean;
}

export function BottomHalfModalPicker({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  selectedValues = [],
  onSelect,
  multiSelect = false,
}: BottomHalfModalPickerProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const isSelected = (value: string) => {
    if (multiSelect) {
      return selectedValues.includes(value);
    }
    return selectedValue === value;
  };

  const handleSelect = (value: string) => {
    onSelect(value);
    if (!multiSelect) {
      onClose();
    }
  };

  const renderItem = ({ item }: { item: PickerOption }) => {
    const selected = isSelected(item.value);
    return (
      <Pressable
        style={[
          styles.option,
          selected && { backgroundColor: theme.accent + "15" },
        ]}
        onPress={() => handleSelect(item.value)}
      >
        <ThemedText
          style={[
            styles.optionText,
            selected && { color: theme.accent, fontWeight: "600" },
          ]}
        >
          {item.label}
        </ThemedText>
        {selected ? (
          <Check size={20} color={theme.accent} strokeWidth={2} />
        ) : null}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.modal,
            {
              backgroundColor: "#F9F7F2",
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <Pressable
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
              hitSlop={8}
            >
              <X size={18} color={theme.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
          />
          {multiSelect ? (
            <View style={styles.footer}>
              <Pressable
                style={[styles.doneButton, { backgroundColor: theme.accent }]}
                onPress={onClose}
              >
                <ThemedText style={styles.doneButtonText}>Done</ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modal: {
    height: MODAL_HEIGHT,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    position: "absolute",
    right: Spacing.lg,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingVertical: Spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  optionText: {
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  doneButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
