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
import { supabase } from "@/lib/supabase";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface LoginScreenProps {
  onSwitchToSignup: () => void;
}

export default function LoginScreen({ onSwitchToSignup }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert("Login Failed", error.message);
        return;
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Login error:", error);
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
          paddingTop: insets.top + Spacing["4xl"],
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
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
          Welcome back, reader
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
          EMAIL
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
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={theme.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
        />

        <ThemedText
          type="small"
          style={[styles.label, { color: theme.textSecondary }]}
        >
          PASSWORD
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
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <Button
          onPress={handleLogin}
          disabled={isLoading || !email.trim() || !password.trim()}
          style={styles.button}
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </Button>

        <View style={styles.switchContainer}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            New to Kindread?{" "}
          </ThemedText>
          <Pressable onPress={onSwitchToSignup}>
            <ThemedText type="body" style={{ color: theme.accent, fontWeight: "600" }}>
              Create Account
            </ThemedText>
          </Pressable>
        </View>
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
    marginBottom: Spacing["3xl"],
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
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
    marginBottom: Spacing["2xl"],
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
    marginBottom: Spacing.lg,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      },
    }),
  },
  button: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  illustration: {
    width: 160,
    height: 160,
    opacity: 0.5,
  },
});
