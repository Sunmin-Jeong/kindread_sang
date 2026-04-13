import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { joinClub } from "@/lib/club-storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type JoinClubRouteProp = RouteProp<RootStackParamList, "JoinClub">;

interface QuestionAnswer {
  question: string;
  answer: string;
}

export default function JoinClubScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<JoinClubRouteProp>();

  const { clubId, clubName, joinQuestions } = route.params;

  const [answers, setAnswers] = useState<string[]>(
    joinQuestions.map(() => "")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswerChange = (index: number, text: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = text;
    setAnswers(newAnswers);
  };

  const hasQuestions = joinQuestions.length > 0;

  const handleSubmit = async () => {
    if (!user?.id) return;

    if (hasQuestions) {
      const emptyAnswers = answers.filter((a) => a.trim() === "");
      if (emptyAnswers.length > 0) {
        Alert.alert("Missing Answers", "Please answer all questions before submitting.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const questionAnswers: QuestionAnswer[] = hasQuestions 
        ? joinQuestions.map((q, i) => ({
            question: q,
            answer: answers[i].trim(),
          }))
        : [];

      const result = await joinClub(clubId, user.id, false, questionAnswers);

      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert(
          "Application Submitted",
          "Your request is pending approval. The club host will review your answers.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to submit application.");
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="h2" style={styles.title}>
          Join {clubName}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          {hasQuestions 
            ? "Please answer the following questions to apply for membership."
            : "This club requires host approval. Submit your application to join."}
        </ThemedText>
      </View>

      {hasQuestions ? joinQuestions.map((question, index) => (
        <View key={index} style={styles.questionContainer}>
          <ThemedText style={[styles.questionNumber, { color: theme.textSecondary }]}>
            Question {index + 1}
          </ThemedText>
          <ThemedText style={styles.questionText}>{question}</ThemedText>
          <TextInput
            value={answers[index]}
            onChangeText={(text) => handleAnswerChange(index, text)}
            placeholder="Type your answer..."
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            multiline
            textAlignVertical="top"
          />
        </View>
      )) : null}

      <View style={styles.buttonContainer}>
        <Button onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </Button>
        <Pressable onPress={() => navigation.goBack()} style={styles.cancelButton}>
          <ThemedText style={[styles.cancelText, { color: theme.textSecondary }]}>
            Cancel
          </ThemedText>
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  questionContainer: {
    marginBottom: Spacing.lg,
  },
  questionNumber: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  questionText: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  input: {
    fontSize: 13,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 80,
    lineHeight: 18,
  },
  buttonContainer: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  cancelButton: {
    marginTop: Spacing.sm,
    alignItems: "center",
    padding: Spacing.md,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
