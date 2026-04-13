import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import {
  Image as ImageIcon,
  Globe,
  MapPin,
  Users,
  Plus,
  X,
  BookOpen,
  Search,
  Camera,
} from "lucide-react-native";
import { uploadImageToStorage } from "@/lib/image-utils";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { createClub, addClubBook, getOrCreateBook } from "@/lib/club-storage";
import { searchBooks } from "@/lib/books-api";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { BookSearchResult, MeetingMode, JoinPolicy } from "@/types";

const LANGUAGES = [
  "English",
  "Korean",
  "Spanish",
  "French",
  "German",
  "Japanese",
  "Chinese",
  "Portuguese",
  "Italian",
  "Russian",
  "Arabic",
  "Hindi",
];

const MEETING_MODES: { value: MeetingMode; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "hybrid", label: "Hybrid" },
];

export default function CreateClubScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [meetingMode, setMeetingMode] = useState<MeetingMode>("online");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [joinQuestions, setJoinQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [welcomeTemplate, setWelcomeTemplate] = useState("");

  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [bookSearchResults, setBookSearchResults] = useState<BookSearchResult[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<BookSearchResult[]>([]);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const handleLanguageToggle = (language: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedLanguages((prev) =>
      prev.includes(language)
        ? prev.filter((l) => l !== language)
        : [...prev, language]
    );
  };

  const handleAddQuestion = () => {
    if (newQuestion.trim() && joinQuestions.length < 3) {
      setJoinQuestions([...joinQuestions, newQuestion.trim()]);
      setNewQuestion("");
    }
  };

  const handleRemoveQuestion = (index: number) => {
    setJoinQuestions(joinQuestions.filter((_, i) => i !== index));
  };

  const handlePickImage = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setLocalImageUri(asset.uri);
      
      setIsUploadingImage(true);
      try {
        const publicUrl = await uploadImageToStorage(
          asset.uri,
          "club-covers",
          user!.id
        );
        
        if (!publicUrl) {
          setErrors((prev) => ({ ...prev, image: "Failed to upload image" }));
          setIsUploadingImage(false);
          return;
        }
        
        setImageUrl(publicUrl);
      } catch (err) {
        console.error("Image upload error:", err);
        setErrors((prev) => ({ ...prev, image: "Failed to upload image" }));
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const handleBookSearch = useCallback(async (text: string) => {
    setBookSearchQuery(text);
    if (text.trim().length < 2) {
      setBookSearchResults([]);
      return;
    }

    setIsSearchingBooks(true);
    try {
      const results = await searchBooks(text.trim());
      setBookSearchResults(results.slice(0, 5));
    } catch (error) {
      console.error("Book search error:", error);
    } finally {
      setIsSearchingBooks(false);
    }
  }, []);

  const handleSelectBook = (book: BookSearchResult) => {
    if (!selectedBooks.find((b) => b.id === book.id)) {
      setSelectedBooks([...selectedBooks, book]);
    }
    setBookSearchQuery("");
    setBookSearchResults([]);
  };

  const handleRemoveBook = (bookId: string) => {
    setSelectedBooks(selectedBooks.filter((b) => b.id !== bookId));
  };

  const handleCreate = async () => {
    const newErrors: { name?: string; description?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = "Club name is required";
    }
    
    if (!description.trim()) {
      newErrors.description = "Description is required";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to create a club");
      return;
    }
    
    if (isUploadingImage) {
      Alert.alert("Please wait", "Image is still uploading");
      return;
    }

    setErrors({});
    console.log("[CreateClub] Creating club...");
    setIsCreating(true);

    try {
      console.log("[CreateClub] Calling createClub with:", {
        name: name.trim(),
        meetingMode,
        joinPolicy: requireApproval ? "approval" : "auto",
        joinQuestionsCount: requireApproval ? joinQuestions.length : 0,
      });
      const result = await createClub(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          meetingMode,
          joinPolicy: requireApproval ? "approval" : "auto",
          city: city.trim() || undefined,
          country: country.trim() || undefined,
          languages: selectedLanguages,
          joinQuestions: requireApproval ? joinQuestions : [],
          welcomeTemplate: welcomeTemplate.trim() || undefined,
        },
        user.id
      );

      if (!result.success || !result.clubId) {
        console.error("[CreateClub] createClub failed:", result.error);
        Alert.alert("Error", result.error || "Failed to create club");
        setIsCreating(false);
        return;
      }
      console.log("[CreateClub] Club created:", result.clubId);

      for (const book of selectedBooks) {
        const bookId = await getOrCreateBook({
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl || undefined,
          isbn: book.isbn,
          totalPages: book.pageCount,
        });

        if (bookId) {
          await addClubBook(result.clubId, bookId, "current");
        }
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      navigation.replace("ClubHome", { clubId: result.clubId });
    } catch (error) {
      console.error("[CreateClub] Error:", error);
      Alert.alert("Error", "An error occurred while creating the club");
    } finally {
      console.log("[CreateClub] Operation complete");
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundRoot }]} edges={["top"]}>
      <KeyboardAwareScrollView
        style={[styles.scrollView, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraKeyboardSpace={100}
      >
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { fontFamily: "Pretendard-Bold" }]}>
            Identity
          </ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Club Name *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: "#F9F7F2",
                  color: theme.text,
                  borderColor: errors.name ? "#DC2626" : theme.border,
                },
              ]}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (text.trim()) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              placeholder="Enter club name"
              placeholderTextColor={theme.textSecondary}
            />
            {errors.name ? (
              <ThemedText style={styles.errorText}>{errors.name}</ThemedText>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Description *
            </ThemedText>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: "#F9F7F2",
                  color: theme.text,
                  borderColor: errors.description ? "#DC2626" : theme.border,
                },
              ]}
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (text.trim()) {
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }
              }}
              placeholder="What is your club about?"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.description ? (
              <ThemedText style={styles.errorText}>{errors.description}</ThemedText>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <ImageIcon size={14} color={theme.textSecondary} strokeWidth={1.5} />
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                Cover Image (optional)
              </ThemedText>
            </View>
            
            {localImageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: localImageUri }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
                {isUploadingImage ? (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <ThemedText style={styles.uploadingText}>Uploading...</ThemedText>
                  </View>
                ) : null}
                <Pressable
                  style={styles.changeImageButton}
                  onPress={handlePickImage}
                >
                  <Camera size={16} color="#FFFFFF" strokeWidth={1.5} />
                  <ThemedText style={styles.changeImageText}>Change</ThemedText>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[
                  styles.selectCoverButton,
                  {
                    backgroundColor: "#F9F7F2",
                    borderColor: theme.border,
                  },
                ]}
                onPress={handlePickImage}
              >
                <Camera size={20} color={theme.textSecondary} strokeWidth={1.5} />
                <ThemedText style={[styles.selectCoverText, { color: theme.textSecondary }]}>
                  Select Cover Image
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { fontFamily: "Pretendard-Bold" }]}>
            Global Settings
          </ThemedText>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Globe size={14} color={theme.textSecondary} strokeWidth={1.5} />
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                Meeting Mode
              </ThemedText>
            </View>
            <View style={styles.modeContainer}>
              {MEETING_MODES.map((mode) => (
                <Pressable
                  key={mode.value}
                  style={[
                    styles.modeButton,
                    {
                      backgroundColor:
                        meetingMode === mode.value ? theme.accent : "#F9F7F2",
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setMeetingMode(mode.value);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.modeText,
                      {
                        color: meetingMode === mode.value ? "#FFFFFF" : theme.text,
                      },
                    ]}
                  >
                    {mode.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Globe size={14} color={theme.textSecondary} strokeWidth={1.5} />
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                Languages
              </ThemedText>
            </View>
            <Pressable
              style={[
                styles.input,
                styles.pickerButton,
                { backgroundColor: "#F9F7F2", borderColor: theme.border },
              ]}
              onPress={() => setShowLanguagePicker(!showLanguagePicker)}
            >
              <ThemedText
                style={{
                  color: selectedLanguages.length > 0 ? theme.text : theme.textSecondary,
                }}
              >
                {selectedLanguages.length > 0
                  ? selectedLanguages.join(", ")
                  : "Select languages"}
              </ThemedText>
            </Pressable>
            {showLanguagePicker ? (
              <View style={[styles.languageGrid, { borderColor: theme.border }]}>
                {LANGUAGES.map((lang) => (
                  <Pressable
                    key={lang}
                    style={[
                      styles.languageChip,
                      {
                        backgroundColor: selectedLanguages.includes(lang)
                          ? theme.accent
                          : "#F9F7F2",
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => handleLanguageToggle(lang)}
                  >
                    <ThemedText
                      style={[
                        styles.languageText,
                        {
                          color: selectedLanguages.includes(lang)
                            ? "#FFFFFF"
                            : theme.text,
                        },
                      ]}
                    >
                      {lang}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          {(meetingMode === "offline" || meetingMode === "hybrid") ? (
            <>
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <MapPin size={14} color={theme.textSecondary} strokeWidth={1.5} />
                  <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                    City
                  </ThemedText>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: "#F9F7F2",
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter city"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <MapPin size={14} color={theme.textSecondary} strokeWidth={1.5} />
                  <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                    Country
                  </ThemedText>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: "#F9F7F2",
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="Enter country"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { fontFamily: "Pretendard-Bold" }]}>
            Policy
          </ThemedText>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Users size={14} color={theme.textSecondary} strokeWidth={1.5} />
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                Require Approval
              </ThemedText>
            </View>
            <Switch
              value={requireApproval}
              onValueChange={setRequireApproval}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.inputGroup, { marginTop: Spacing.md }]}>
            <View style={styles.labelRow}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                Welcome Message Template
              </ThemedText>
            </View>
            <ThemedText style={[styles.sublabel, { color: theme.textSecondary, marginBottom: Spacing.xs }]}>
              This message will be suggested when new members write their first post
            </ThemedText>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: "#F9F7F2",
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={welcomeTemplate}
              onChangeText={setWelcomeTemplate}
              placeholder="e.g. Hi everyone! I'm excited to join this club..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          {requireApproval ? (
            <View style={styles.questionsContainer}>
              <ThemedText style={[styles.sublabel, { color: theme.textSecondary }]}>
                Join Questions (up to 3)
              </ThemedText>
              {joinQuestions.map((question, index) => (
                <View
                  key={index}
                  style={[
                    styles.questionRow,
                    { backgroundColor: "#F9F7F2", borderColor: theme.border },
                  ]}
                >
                  <ThemedText style={styles.questionText} numberOfLines={2}>
                    {question}
                  </ThemedText>
                  <Pressable onPress={() => handleRemoveQuestion(index)}>
                    <X size={18} color={theme.textSecondary} strokeWidth={1.5} />
                  </Pressable>
                </View>
              ))}
              {joinQuestions.length < 3 ? (
                <View style={styles.addQuestionRow}>
                  <TextInput
                    style={[
                      styles.questionInput,
                      {
                        backgroundColor: "#F9F7F2",
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    value={newQuestion}
                    onChangeText={setNewQuestion}
                    placeholder="Add a question..."
                    placeholderTextColor={theme.textSecondary}
                  />
                  <Pressable
                    style={[styles.addButton, { backgroundColor: theme.accent }]}
                    onPress={handleAddQuestion}
                  >
                    <Plus size={18} color="#FFFFFF" strokeWidth={2} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { fontFamily: "Pretendard-Bold" }]}>
            Bookshelf
          </ThemedText>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <BookOpen size={14} color={theme.textSecondary} strokeWidth={1.5} />
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                Add First Books
              </ThemedText>
            </View>
            <View
              style={[
                styles.searchInputContainer,
                { backgroundColor: "#F9F7F2", borderColor: theme.border },
              ]}
            >
              <Search size={16} color={theme.textSecondary} strokeWidth={1.5} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                value={bookSearchQuery}
                onChangeText={handleBookSearch}
                placeholder="Search for books..."
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            {bookSearchResults.length > 0 ? (
              <View style={[styles.searchResults, { borderColor: theme.border }]}>
                {bookSearchResults.map((book) => (
                  <Pressable
                    key={book.id}
                    style={[styles.searchResultItem, { borderBottomColor: theme.border }]}
                    onPress={() => handleSelectBook(book)}
                  >
                    <ThemedText style={styles.searchResultTitle} numberOfLines={1}>
                      {book.title}
                    </ThemedText>
                    <ThemedText
                      style={[styles.searchResultAuthor, { color: theme.textSecondary }]}
                      numberOfLines={1}
                    >
                      {book.author}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {selectedBooks.length > 0 ? (
              <View style={styles.selectedBooks}>
                {selectedBooks.map((book) => (
                  <View
                    key={book.id}
                    style={[
                      styles.selectedBookChip,
                      { backgroundColor: "#F9F7F2", borderColor: theme.border },
                    ]}
                  >
                    <ThemedText style={styles.selectedBookTitle} numberOfLines={1}>
                      {book.title}
                    </ThemedText>
                    <Pressable onPress={() => handleRemoveBook(book.id)}>
                      <X size={16} color={theme.textSecondary} strokeWidth={1.5} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAwareScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.md,
            backgroundColor: theme.backgroundRoot,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Button
          onPress={handleCreate}
          disabled={isCreating || !name.trim() || !description.trim()}
          style={styles.createButton}
        >
          {isCreating ? "Creating..." : "Create Club"}
        </Button>
      </View>
    </SafeAreaView>
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  sublabel: {
    fontSize: 12,
    marginBottom: Spacing.sm,
  },
  input: {
    height: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
  selectCoverButton: {
    height: 120,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  selectCoverText: {
    fontSize: 14,
    fontWeight: "500",
  },
  imagePreviewContainer: {
    height: 180,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  uploadingText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  changeImageButton: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  changeImageText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  pickerButton: {
    justifyContent: "center",
  },
  modeContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modeButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  languageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  languageChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  languageText: {
    fontSize: 13,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  switchLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  questionsContainer: {
    marginTop: Spacing.sm,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  addQuestionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  questionInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 14,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  searchResults: {
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  searchResultItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  searchResultAuthor: {
    fontSize: 12,
    marginTop: 2,
  },
  selectedBooks: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  selectedBookChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  selectedBookTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    marginRight: Spacing.sm,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    ...Shadows.card,
  },
  createButton: {
    width: "100%",
  },
});
