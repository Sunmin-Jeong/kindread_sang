import React from "react";
import { StyleSheet, Pressable, Platform } from "react-native";
import { Plus, Pencil } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, Shadows, IconSize } from "@/constants/theme";

type FABIcon = "plus" | "edit";

interface FABProps {
  onPress: () => void;
  icon?: FABIcon;
  bottom?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const iconMap = {
  plus: Plus,
  edit: Pencil,
};

export function FAB({ onPress, icon = "plus", bottom = 0 }: FABProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  const IconComponent = iconMap[icon] || Plus;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.fab,
        {
          backgroundColor: '#0F0F0F',
          bottom: bottom + Spacing.lg,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
          elevation: 8,
        },
        animatedStyle,
      ]}
    >
      <IconComponent size={IconSize.lg} color="#FFFFFF" strokeWidth={2} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
});
