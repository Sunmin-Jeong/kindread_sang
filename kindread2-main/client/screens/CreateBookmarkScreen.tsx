import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  Platform,
  ScrollView,
  Switch,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, X, BookOpen, ImagePlus, Users, Globe, Star } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { TaggedBookItem } from "@/components/TaggedBookItem";
import { SearchBar } from "@/components/SearchBar";
import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/Button";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows, IconSize } from "@/constants/theme";
import { saveBookmark } from "@/lib/storage";
import { searchBooks } from "@/lib/books-api";
import { checkIsFirstClubPost, getClubWelcomeTemplate, getClub } from "@/lib/club-storage";
import type { Book, BookSearchResult, PostType, ProgressType, BookmarkVisibility } from "@/types";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type CreateBookmarkRouteProp = RouteProp<RootStackParamList, "CreateBookmark">;

interface TaggedBook {
  book: Book;
  progressValue: string;
  progressType: ProgressType;
  totalPages: string;
}

const MAX_IMAGES = 3;

export default function CreateBookmarkScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<CreateBookmarkRouteProp>();

  const [postType, setPostType] = useState<PostType>('log');
  const [textContent, setTextContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<BookmarkVisibility>(
    route.params?.clubId ? 'club_members' : 'public'
  );
  const isClubPost = !!route.params?.clubId;
  const [taggedBooks, setTaggedBooks] = useState<TaggedBook[]>(() => {
    if (route.params?.book) {
      return [{ 
        book: route.params.book, 
        progressValue: "", 
        progressType: 'page',
        totalPages: route.params.book.totalPages?.toString() || "",
      }];
    }
    return [];
  });
  const [rating, setRating] = useState(0);
  const [quoteText, setQuoteText] = useState("");
  const [showBookSearch, setShowBookSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeTemplate, setWelcomeTemplate] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);

  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const loadClubData = async () => {
      if (!isClubPost || !route.params?.clubId) return;

      // Fetch club name for header
      const clubData = await getClub(route.params.clubId);
      if (clubData) {
        setClubName(clubData.name);
      }

      // Check for first post welcome modal
      if (!user?.id) return;
      const [isFirst, template] = await Promise.all([
        checkIsFirstClubPost(route.params.clubId, user.id),
        getClubWelcomeTemplate(route.params.clubId),
      ]);

      if (isFirst && template) {
        setWelcomeTemplate(template);
        setShowWelcomeModal(true);
      }
    };

    loadClubData();
  }, [isClubPost, user?.id, route.params?.clubId]);

  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);

    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const books = await searchBooks(text);
      setSearchResults(books);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleAddBook = (book: BookSearchResult) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const exists = taggedBooks.some((tb) => tb.book.id === book.id);
    if (exists) {
      return;
    }

    const bookWithPages = book as Book & { pageCount?: number };
    setTaggedBooks((prev) => [
      ...prev,
      { 
        book: { ...bookWithPages, totalPages: bookWithPages.pageCount || bookWithPages.totalPages },
        progressValue: "", 
        progressType: 'page',
        totalPages: (bookWithPages.pageCount || bookWithPages.totalPages || "").toString(),
      },
    ]);
    setShowBookSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveBook = (bookId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTaggedBooks((prev) => prev.filter((tb) => tb.book.id !== bookId));
  };

  const handleUpdateProgress = (
    bookId: string,
    field: "progressValue" | "progressType" | "totalPages",
    value: string | ProgressType
  ) => {
    setTaggedBooks((prev) =>
      prev.map((tb) =>
        tb.book.id === bookId ? { ...tb, [field]: value } : tb
      )
    );
  };

  const handlePickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert("Limit Reached", `You can only add up to ${MAX_IMAGES} images.`);
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const remainingSlots = MAX_IMAGES - images.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.slice(0, remainingSlots).map(asset => asset.uri);
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const handleRemoveImage = (index: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const hasProgressEntered = taggedBooks.some(tb => tb.progressValue.trim() !== "");

  const canSave = () => {
    if (!user) return false;
    
    if (postType === 'review') {
      return textContent.trim().length > 0;
    } else {
      if (hasProgressEntered) {
        return true;
      }
      return textContent.trim().length > 0;
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert("Not Signed In", "Please sign in to create a bookmark.");
      return;
    }

    if (postType === 'review') {
      if (!textContent.trim()) {
        Alert.alert("Missing Content", "Reviews require your thoughts. Please write something.");
        return;
      }
    } else {
      if (!textContent.trim() && !hasProgressEntered) {
        Alert.alert("Missing Content", "Please write something or enter a page number/percentage.");
        return;
      }
    }

    console.log("[CreateBookmark] Saving bookmark...");
    setIsSaving(true);

    try {
      const taggedBook = taggedBooks[0];
      const book = taggedBook ? {
        ...taggedBook.book,
        totalPages: taggedBook.totalPages ? parseInt(taggedBook.totalPages, 10) : taggedBook.book.totalPages,
      } : null;
      const pageNumber = taggedBook?.progressValue ? parseInt(taggedBook.progressValue, 10) : null;
      const progressType = taggedBook?.progressType || 'page';

      console.log("[CreateBookmark] Calling saveBookmark with:", {
        postType,
        progressType,
        pageNumber,
        bookId: book?.id,
        clubId: route.params?.clubId,
      });

      const result = await saveBookmark(
        user.id,
        textContent.trim(),
        book,
        pageNumber,
        progressType,
        postType,
        images,
        route.params?.clubId,
        visibility,
        postType === 'review' ? rating : undefined,
        postType === 'review' ? quoteText.trim() : undefined
      );

      if (!result) {
        console.error("[CreateBookmark] saveBookmark returned null");
        throw new Error("Failed to save bookmark");
      }

      console.log("[CreateBookmark] Bookmark saved successfully:", result.id);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      navigation.goBack();
    } catch (error) {
      console.error("[CreateBookmark] Error saving bookmark:", error);
      Alert.alert("Error", "Failed to save your bookmark. Please try again.");
    } finally {
      console.log("[CreateBookmark] Saving complete");
      setIsSaving(false);
    }
  };

  const renderSearchResult = ({ item }: { item: BookSearchResult }) => (
    <View style={styles.searchResultItem}>
      <BookCard book={item} onPress={() => handleAddBook(item)} size="small" />
    </View>
  );

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
        {isClubPost && clubName ? (
          <View style={[styles.clubPostingHeader, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '30' }]}>
            <Users size={14} color={theme.accent} strokeWidth={2} />
            <ThemedText style={[styles.clubPostingText, { color: theme.accent }]}>
              Posting to {clubName}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.postTypeToggle}>
          <Pressable
            onPress={() => setPostType('log')}
            style={[
              styles.postTypeOption,
              postType === 'log' && { backgroundColor: theme.accent },
              postType !== 'log' && { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText
              style={[
                styles.postTypeText,
                { color: postType === 'log' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Progress
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setPostType('review')}
            style={[
              styles.postTypeOption,
              postType === 'review' && { backgroundColor: theme.accent },
              postType !== 'review' && { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText
              style={[
                styles.postTypeText,
                { color: postType === 'review' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Review
            </ThemedText>
          </Pressable>
        </View>

        {isClubPost ? (
          <View style={[styles.visibilitySection, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.visibilityContent}>
              <View style={styles.visibilityIcon}>
                {visibility === 'club_members' ? (
                  <Users size={IconSize.sm} color={theme.accent} strokeWidth={1.5} />
                ) : (
                  <Globe size={IconSize.sm} color={theme.textSecondary} strokeWidth={1.5} />
                )}
              </View>
              <View style={styles.visibilityText}>
                <ThemedText style={styles.visibilityLabel}>
                  {visibility === 'club_members' ? 'Club Members Only' : 'Public'}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {visibility === 'club_members' 
                    ? 'Only club members can see this post'
                    : 'Anyone can see this post in the global feed'
                  }
                </ThemedText>
              </View>
              <Switch
                value={visibility === 'club_members'}
                onValueChange={(value) => setVisibility(value ? 'club_members' : 'public')}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.textInputContainer,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              ...Shadows.card,
            },
          ]}
        >
          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              {
                color: theme.text,
                fontFamily: Platform.select({
                  ios: "NotoSerifKR_400Regular",
                  android: "NotoSerifKR_400Regular",
                  default: undefined,
                }),
                minHeight: postType === 'review' ? 180 : 100,
              },
            ]}
            value={textContent}
            onChangeText={setTextContent}
            placeholder={postType === 'log' 
              ? "A quick thought or note..." 
              : "Share your review and insights..."
            }
            placeholderTextColor={theme.textSecondary}
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </View>

        {postType === 'review' ? (
          <View style={styles.ratingSection}>
            <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              RATING
            </ThemedText>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Pressable key={i} onPress={() => setRating(rating === i ? 0 : i)} hitSlop={6}>
                  <Star
                    size={28}
                    color={i <= rating ? "#F59E0B" : theme.border}
                    fill={i <= rating ? "#F59E0B" : "transparent"}
                    strokeWidth={1.5}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {postType === 'review' ? (
          <View style={styles.quoteSection}>
            <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              QUOTE (OPTIONAL)
            </ThemedText>
            <View style={[styles.quoteInputContainer, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={[styles.quoteBar, { backgroundColor: theme.accent }]} />
              <TextInput
                style={[styles.quoteInput, { color: theme.text }]}
                value={quoteText}
                onChangeText={setQuoteText}
                placeholder="A passage that stood out..."
                placeholderTextColor={theme.textTertiary}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        ) : null}

        {postType === 'review' ? (
          <View style={styles.imageSection}>
            <View style={styles.imageSectionHeader}>
              <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                IMAGES ({images.length}/{MAX_IMAGES})
              </ThemedText>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagesRow}
            >
              {images.map((uri, index) => (
                <View key={index} style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                  <Pressable
                    onPress={() => handleRemoveImage(index)}
                    style={[styles.removeImageButton, { backgroundColor: theme.text }]}
                  >
                    <X size={12} color="#FFFFFF" strokeWidth={2} />
                  </Pressable>
                </View>
              ))}
              {images.length < MAX_IMAGES ? (
                <Pressable
                  onPress={handlePickImage}
                  style={[
                    styles.addImageButton,
                    { borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <ImagePlus size={IconSize.md} color={theme.textSecondary} strokeWidth={1.5} />
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.booksSection}>
          <View style={styles.sectionHeader}>
            <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              TAGGED BOOKS
            </ThemedText>
            <Pressable
              onPress={() => setShowBookSearch(true)}
              style={({ pressed }) => [
                styles.addBookButton,
                { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Plus size={14} color="#FFFFFF" strokeWidth={2} />
              <ThemedText style={styles.addBookButtonText}>
                Add Book
              </ThemedText>
            </Pressable>
          </View>

          {taggedBooks.map((tb) => (
            <TaggedBookItem
              key={tb.book.id}
              book={tb.book}
              progressValue={tb.progressValue}
              progressType={tb.progressType}
              totalPages={tb.totalPages}
              onProgressValueChange={(value) =>
                handleUpdateProgress(tb.book.id, "progressValue", value)
              }
              onProgressTypeChange={(type) =>
                handleUpdateProgress(tb.book.id, "progressType", type)
              }
              onTotalPagesChange={(value) =>
                handleUpdateProgress(tb.book.id, "totalPages", value)
              }
              onRemove={() => handleRemoveBook(tb.book.id)}
            />
          ))}

          {taggedBooks.length === 0 ? (
            <View style={[styles.emptyBooks, { borderColor: theme.border }]}>
              <BookOpen size={IconSize.lg} color={theme.textSecondary} strokeWidth={1.5} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
              >
                No books tagged yet
              </ThemedText>
            </View>
          ) : null}
        </View>

        {showBookSearch ? (
          <View
            style={[
              styles.searchSection,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <View style={styles.searchHeader}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                Search for a Book
              </ThemedText>
              <Pressable
                onPress={() => {
                  setShowBookSearch(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={IconSize.md} color={theme.text} strokeWidth={1.5} />
              </Pressable>
            </View>
            <SearchBar
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search by title or author..."
              autoFocus
            />

            {isSearching ? (
              <LoadingIndicator size="small" />
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults.slice(0, 10)}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.searchResults}
                contentContainerStyle={styles.searchResultsContent}
              />
            ) : null}
          </View>
        ) : null}

        <Button
          onPress={handleSave}
          disabled={isSaving || !canSave()}
          style={[styles.saveButton, { marginBottom: insets.bottom > 0 ? 0 : Spacing.md }]}
        >
          {isSaving ? "Saving..." : "Save Bookmark"}
        </Button>
      </KeyboardAwareScrollViewCompat>

      <Modal
        visible={showWelcomeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWelcomeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.welcomeModal, { backgroundColor: theme.surface }]}>
            <ThemedText style={[styles.welcomeTitle, { fontFamily: "Pretendard-Bold" }]}>
              Welcome to the Club!
            </ThemedText>
            <ThemedText style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
              Start your first post with a template
            </ThemedText>
            <View style={[styles.templatePreview, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <ThemedText style={styles.templateText} numberOfLines={4}>
                {welcomeTemplate}
              </ThemedText>
            </View>
            <View style={styles.welcomeButtons}>
              <Pressable
                style={[styles.welcomeButton, { borderColor: theme.border }]}
                onPress={() => setShowWelcomeModal(false)}
              >
                <ThemedText style={[styles.welcomeButtonText, { color: theme.textSecondary }]}>
                  Skip
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.welcomeButton, styles.welcomeButtonPrimary, { backgroundColor: theme.accent }]}
                onPress={() => {
                  setTextContent(welcomeTemplate || "");
                  setShowWelcomeModal(false);
                }}
              >
                <ThemedText style={[styles.welcomeButtonText, { color: "#FFFFFF" }]}>
                  Use Template
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  clubPostingHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  clubPostingText: {
    fontSize: 13,
    fontWeight: "600",
  },
  postTypeToggle: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  postTypeOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
  postTypeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  visibilitySection: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  visibilityContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  visibilityIcon: {
    marginRight: Spacing.sm,
  },
  visibilityText: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  textInputContainer: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  textInput: {
    fontSize: 15,
    lineHeight: 24,
  },
  imageSection: {
    marginBottom: Spacing.lg,
  },
  imageSectionHeader: {
    marginBottom: Spacing.sm,
  },
  imagesRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  imagePreview: {
    width: 80,
    height: 60,
    borderRadius: BorderRadius.sm,
  },
  removeImageButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addImageButton: {
    width: 80,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  booksSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  addBookButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  addBookButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  emptyBooks: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
  },
  searchSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  searchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  searchResults: {
    marginTop: Spacing.md,
  },
  searchResultsContent: {
    paddingVertical: Spacing.sm,
  },
  searchResultItem: {
    marginRight: Spacing.md,
  },
  saveButton: {
    marginTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  welcomeModal: {
    width: "100%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  templatePreview: {
    width: "100%",
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  templateText: {
    fontSize: 14,
    lineHeight: 20,
  },
  welcomeButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  welcomeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  welcomeButtonPrimary: {
    borderWidth: 0,
  },
  welcomeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  ratingSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: Spacing.sm,
  },
  quoteSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  quoteInputContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 6,
    marginTop: Spacing.sm,
    overflow: "hidden",
  },
  quoteBar: {
    width: 3,
  },
  quoteInput: {
    flex: 1,
    padding: Spacing.md,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 60,
    fontFamily: "NotoSerifKR_400Regular",
  },
});
