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

interface SignupScreenProps {
  onSwitchToLogin: () => void;
}

export default function SignupScreen({ onSwitchToLogin }: SignupScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!username.trim()) {
      Alert.alert("Missing Name", "Please enter your name.");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            username: username.trim(),
          },
        },
      });

      if (error) {
        // Handle duplicate email error
        if (error.message?.includes("already registered") || 
            (error as any).code === "23505" ||
            error.message?.includes("User already registered")) {
          Alert.alert("Email Already in Use", "This email is already registered. Please sign in or use a different email.");
        } else {
          Alert.alert("Sign Up Failed", error.message);
        }
        return;
      }


      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (data.session === null && data.user) {
        Alert.alert(
          "Check Your Email",
          "We sent you a confirmation link. Please check your email to complete signup."
        );
      }
    } catch (error) {
      console.error("Signup error:", error);
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
          Join Kindread
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Start sharing your literary bookmarks
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
          YOUR NAME
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
          placeholder="How should we call you?"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="name"
        />

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
          placeholder="At least 6 characters"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={handleSignup}
        />

        <Button
          onPress={handleSignup}
          disabled={isLoading || !username.trim() || !email.trim() || password.length < 6}
          style={styles.button}
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>

        <View style={styles.switchContainer}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Already have an account?{" "}
          </ThemedText>
          <Pressable onPress={onSwitchToLogin}>
            <ThemedText type="body" style={{ color: theme.accent, fontWeight: "600" }}>
              Sign In
            </ThemedText>
          </Pressable>
        </View>
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
});
