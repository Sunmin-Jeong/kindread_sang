import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Image,
  Alert,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { signIn } = useAuth();

  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!username.trim()) {
      Alert.alert("Enter Your Name", "Please enter your name to continue.");
      return;
    }

    setIsLoading(true);

    try {
      await signIn(username);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing["5xl"],
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <Animated.View
        entering={FadeInUp.duration(600)}
        style={styles.header}
      >
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <ThemedText type="h1" serif style={styles.title}>
          Kindread
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Share your literary bookmarks
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).duration(600)}
        style={styles.form}
      >
        <ThemedText
          type="small"
          style={[styles.label, { color: theme.textSecondary }]}
        >
          WHAT SHOULD WE CALL YOU?
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.text,
              ...Shadows.card,
            },
          ]}
          value={username}
          onChangeText={setUsername}
          placeholder="Your name"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />

        <Button
          onPress={handleContinue}
          disabled={isLoading || !username.trim()}
          style={styles.button}
        >
          {isLoading ? "Getting Started..." : "Start Reading"}
        </Button>

        <ThemedText
          type="caption"
          style={[styles.disclaimer, { color: theme.textSecondary }]}
        >
          Your reading journey begins here. All your bookmarks are saved to your account.
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(600).duration(600)}
        style={styles.footer}
      >
        <Image
          source={require("../../assets/images/empty-feed.png")}
          style={styles.illustration}
          resizeMode="contain"
        />
      </Animated.View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["5xl"],
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
    fontFamily: Platform.select({
      ios: "Pretendard-Bold",
      android: "Pretendard-Bold",
      default: undefined,
    }),
  },
  subtitle: {
    textAlign: "center",
  },
  form: {
    marginBottom: Spacing["3xl"],
  },
  label: {
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    marginBottom: Spacing.xl,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      },
    }),
  },
  button: {
    marginBottom: Spacing.lg,
  },
  disclaimer: {
    textAlign: "center",
    lineHeight: 18,
  },
  footer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  illustration: {
    width: 200,
    height: 200,
    opacity: 0.6,
  },
});
