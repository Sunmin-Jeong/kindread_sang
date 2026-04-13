import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
  ScrollView,
  Switch,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Calendar, MapPin, Video, Book, ChevronUp, ChevronDown } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows, IconSize, BookCover } from "@/constants/theme";
import { createMeetup, getClubBooks } from "@/lib/club-storage";
import type { ClubBook } from "@/types";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type CreateMeetupRouteProp = RouteProp<RootStackParamList, "CreateMeetup">;

export default function CreateMeetupScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<CreateMeetupRouteProp>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateTime, setDateTime] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string | undefined>();
  const [clubBooks, setClubBooks] = useState<ClubBook[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const clubId = route.params?.clubId;

  useEffect(() => {
    if (clubId) {
      loadClubBooks();
    }
  }, [clubId]);

  const loadClubBooks = async () => {
    if (!clubId) return;
    const books = await getClubBooks(clubId);
    setClubBooks(books);
  };

  const adjustDate = (days: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newDate = new Date(dateTime);
    newDate.setDate(newDate.getDate() + days);
    if (newDate > new Date()) {
      setDateTime(newDate);
    }
  };

  const adjustHour = (hours: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newDate = new Date(dateTime);
    newDate.setHours(newDate.getHours() + hours);
    setDateTime(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const canSave = () => {
    if (!title.trim()) return false;
    if (!isOnline && !location.trim()) return false;
    if (isOnline && !meetingUrl.trim()) return false;
    return true;
  };

  const handleSave = async () => {
    if (!user || !clubId) {
      Alert.alert("Error", "Unable to create meetup. Please try again.");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title for the meetup.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await createMeetup(
        clubId,
        title.trim(),
        description.trim(),
        dateTime,
        isOnline,
        location.trim() || undefined,
        meetingUrl.trim() || undefined,
        selectedBookId
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to create meetup");
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      navigation.goBack();
    } catch (error) {
      console.error("Error saving meetup:", error);
      Alert.alert("Error", "Failed to create meetup. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedBook = clubBooks.find(cb => cb.bookId === selectedBookId);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              ...Shadows.card,
            },
          ]}
        >
          <TextInput
            style={[styles.titleInput, { color: theme.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Meetup title"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              ...Shadows.card,
            },
          ]}
        >
          <TextInput
            style={[styles.descriptionInput, { color: theme.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="What will you discuss? (optional)"
            placeholderTextColor={theme.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </View>

        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          DATE & TIME
        </ThemedText>
        <View style={styles.dateTimeRow}>
          <View style={[styles.dateTimeButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable onPress={() => adjustDate(-1)} style={styles.adjustButton} hitSlop={8}>
              <ChevronDown size={16} color={theme.textSecondary} strokeWidth={2} />
            </Pressable>
            <View style={styles.dateTimeCenter}>
              <Calendar size={IconSize.sm} color={theme.textSecondary} strokeWidth={1.5} />
              <ThemedText style={styles.dateTimeText}>{formatDate(dateTime)}</ThemedText>
            </View>
            <Pressable onPress={() => adjustDate(1)} style={styles.adjustButton} hitSlop={8}>
              <ChevronUp size={16} color={theme.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>
          <View style={[styles.dateTimeButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable onPress={() => adjustHour(-1)} style={styles.adjustButton} hitSlop={8}>
              <ChevronDown size={16} color={theme.textSecondary} strokeWidth={2} />
            </Pressable>
            <ThemedText style={styles.dateTimeText}>{formatTime(dateTime)}</ThemedText>
            <Pressable onPress={() => adjustHour(1)} style={styles.adjustButton} hitSlop={8}>
              <ChevronUp size={16} color={theme.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          MEETING TYPE
        </ThemedText>
        <View style={[styles.meetingTypeRow, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.meetingTypeContent}>
            <Video size={IconSize.sm} color={isOnline ? theme.accent : theme.textSecondary} strokeWidth={1.5} />
            <ThemedText style={[styles.meetingTypeLabel, { color: theme.text }]}>
              Online Meeting
            </ThemedText>
          </View>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        {isOnline ? (
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                ...Shadows.card,
              },
            ]}
          >
            <TextInput
              style={[styles.singleLineInput, { color: theme.text }]}
              value={meetingUrl}
              onChangeText={setMeetingUrl}
              placeholder="Meeting URL (Zoom, Google Meet, etc.)"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        ) : (
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                ...Shadows.card,
              },
            ]}
          >
            <View style={styles.locationInputRow}>
              <MapPin size={IconSize.sm} color={theme.textSecondary} strokeWidth={1.5} />
              <TextInput
                style={[styles.locationInput, { color: theme.text }]}
                value={location}
                onChangeText={setLocation}
                placeholder="Location address"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          </View>
        )}

        {clubBooks.length > 0 ? (
          <>
            <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              LINK A BOOK (OPTIONAL)
            </ThemedText>
            <ThemedText type="caption" style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              The book status will update automatically based on the meetup date
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.booksScroll}
              contentContainerStyle={styles.booksContent}
            >
              {clubBooks.map((cb) => (
                <Pressable
                  key={cb.id}
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setSelectedBookId(selectedBookId === cb.bookId ? undefined : cb.bookId);
                  }}
                  style={[
                    styles.bookOption,
                    {
                      borderColor: selectedBookId === cb.bookId ? theme.accent : theme.border,
                      backgroundColor: selectedBookId === cb.bookId ? theme.accent + '10' : theme.surface,
                    },
                  ]}
                >
                  {cb.book.coverUrl ? (
                    <Image
                      source={{ uri: cb.book.coverUrl }}
                      style={styles.bookCover}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.bookCover, { backgroundColor: theme.backgroundSecondary }]}>
                      <Book size={20} color={theme.textSecondary} strokeWidth={1.5} />
                    </View>
                  )}
                  <ThemedText style={styles.bookTitle} numberOfLines={2}>
                    {cb.book.title}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            {selectedBook ? (
              <View style={[styles.selectedBookInfo, { backgroundColor: theme.backgroundSecondary }]}>
                <Book size={IconSize.sm} color={theme.accent} strokeWidth={1.5} />
                <ThemedText style={{ flex: 1, marginLeft: Spacing.sm }}>
                  Discussing: {selectedBook.book.title}
                </ThemedText>
              </View>
            ) : null}
          </>
        ) : null}

        <Button
          onPress={handleSave}
          disabled={isSaving || !canSave()}
          style={[styles.saveButton, { marginBottom: insets.bottom > 0 ? 0 : Spacing.md }]}
        >
          {isSaving ? "Creating..." : "Create Meetup"}
        </Button>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  inputContainer: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: "600",
  },
  descriptionInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
  },
  singleLineInput: {
    fontSize: 15,
  },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    marginBottom: Spacing.md,
    marginTop: -Spacing.xs,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateTimeCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  adjustButton: {
    padding: Spacing.xs,
  },
  dateTimeText: {
    fontSize: 12,
  },
  meetingTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  meetingTypeContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  meetingTypeLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  locationInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  locationInput: {
    flex: 1,
    fontSize: 15,
  },
  booksScroll: {
    marginBottom: Spacing.md,
  },
  booksContent: {
    paddingVertical: Spacing.sm,
  },
  bookOption: {
    width: 80,
    marginRight: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: "center",
  },
  bookCover: {
    width: BookCover.small.width,
    height: BookCover.small.height,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  bookTitle: {
    fontSize: 10,
    textAlign: "center",
  },
  selectedBookInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  saveButton: {
    marginTop: Spacing.md,
  },
});
