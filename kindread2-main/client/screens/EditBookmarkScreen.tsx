import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Check, Plus, X, BookOpen, ImagePlus, Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { TaggedBookItem } from "@/components/TaggedBookItem";
import { SearchBar } from "@/components/SearchBar";
import { BookCard } from "@/components/BookCard";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, BookCover, Shadows, IconSize } from "@/constants/theme";
import { updateBookmarkFull } from "@/lib/storage";
import { searchBooks } from "@/lib/books-api";
import type { Book, BookSearchResult, ProgressType, PostType } from "@/types";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type EditBookmarkRouteProp = RouteProp<RootStackParamList, "EditBookmark">;

interface TaggedBook {
  book: Book;
  progressValue: string;
  progressType: ProgressType;
  totalPages: string;
}

export default function EditBookmarkScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<EditBookmarkRouteProp>();

  const { bookmark } = route.params;
  const [textContent, setTextContent] = useState(bookmark.textContent);
  const [postType, setPostType] = useState<PostType>(bookmark.postType || 'log');
  const [images, setImages] = useState<string[]>(bookmark.images || []);
  const [taggedBooks, setTaggedBooks] = useState<TaggedBook[]>(() => {
    if (bookmark.book) {
      return [{
        book: bookmark.book,
        progressValue: bookmark.pageNumber?.toString() || "",
        progressType: bookmark.progressType || 'page',
        totalPages: bookmark.book.totalPages?.toString() || "",
      }];
    }
    return [];
  });
  const [rating, setRating] = useState(bookmark.rating || 0);
  const [quoteText, setQuoteText] = useState(bookmark.quoteText || "");
  const [showBookSearch, setShowBookSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isReflection = postType === 'review';

  const hasTextChanges = textContent.trim() !== bookmark.textContent.trim();
  const hasPostTypeChanges = postType !== (bookmark.postType || 'log');
  const hasImageChanges = JSON.stringify(images) !== JSON.stringify(bookmark.images || []);
  const hasBookChanges = (() => {
    const currentBook = taggedBooks[0];
    if (!currentBook && bookmark.book) return true;
    if (currentBook && !bookmark.book) return true;
    if (!currentBook && !bookmark.book) return false;
    if (currentBook?.book.id !== bookmark.book?.id) return true;
    if (currentBook?.progressValue !== (bookmark.pageNumber?.toString() || "")) return true;
    return false;
  })();
  const hasChanges = hasTextChanges || hasBookChanges || hasPostTypeChanges || hasImageChanges;
  const canSave = textContent.trim().length > 0 && taggedBooks.length > 0 && hasChanges;

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

    setTaggedBooks((prev) => [
      ...prev,
      { book: book as Book, progressValue: "", progressType: 'page', totalPages: (book as Book).totalPages?.toString() || "" },
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
    field: "progressValue" | "progressType",
    value: string | ProgressType
  ) => {
    setTaggedBooks((prev) =>
      prev.map((tb) =>
        tb.book.id === bookId ? { ...tb, [field]: value } : tb
      )
    );
  };

  const handleTogglePostType = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (postType === 'log') {
      setPostType('review');
    } else {
      setPostType('log');
      setImages([]);
    }
  };

  const handleAddImages = async () => {
    if (images.length >= 3) {
      Alert.alert("Limit Reached", "You can add up to 3 images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 3 - images.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages(prev => [...prev, ...newImages].slice(0, 3));
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);

    try {
      const taggedBook = taggedBooks[0];
      const book = taggedBook ? {
        id: taggedBook.book.id,
        title: taggedBook.book.title,
        author: taggedBook.book.author,
        coverUrl: taggedBook.book.coverUrl,
        isbn: taggedBook.book.isbn,
      } : null;
      const pageNumber = taggedBook?.progressValue ? parseInt(taggedBook.progressValue, 10) : null;

      const progressType = taggedBook?.progressType || 'page';
      const success = await updateBookmarkFull(
        bookmark.id,
        user!.id,
        textContent.trim(),
        postType,
        progressType,
        isReflection ? images : [],
        book,
        pageNumber,
        isReflection ? rating : undefined,
        isReflection ? quoteText.trim() : undefined
      );
      
      if (success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        navigation.goBack();
      } else {
        Alert.alert("Error", "Failed to save changes. Please try again.");
      }
    } catch (error) {
      console.error("Error saving bookmark:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Are you sure you want to discard them?",
        [
          { text: "Keep Editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
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
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.postTypeSection}>
          <ThemedText
            type="caption"
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            POST TYPE
          </ThemedText>
          <View style={styles.postTypeRow}>
            <Pressable
              onPress={() => { setPostType('log'); setImages([]); }}
              style={[
                styles.postTypeButton,
                { 
                  backgroundColor: postType === 'log' ? theme.accent : theme.backgroundSecondary,
                  borderColor: postType === 'log' ? theme.accent : theme.border,
                },
              ]}
            >
              <ThemedText style={[styles.postTypeButtonText, { color: postType === 'log' ? '#FFFFFF' : theme.text }]}>
                Progress
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setPostType('review')}
              style={[
                styles.postTypeButton,
                { 
                  backgroundColor: postType === 'review' ? theme.accent : theme.backgroundSecondary,
                  borderColor: postType === 'review' ? theme.accent : theme.border,
                },
              ]}
            >
              <ThemedText style={[styles.postTypeButtonText, { color: postType === 'review' ? '#FFFFFF' : theme.text }]}>
                Review
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText style={[styles.postTypeHint, { color: theme.textTertiary }]}>
            {postType === 'log' ? 'Quick, simple notes' : 'Long-form with images'}
          </ThemedText>
        </View>

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.surface, ...Shadows.card },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                color: theme.text,
                fontFamily: Platform.select({
                  ios: "NotoSerifKR_400Regular",
                  android: "NotoSerifKR_400Regular",
                  default: undefined,
                }),
              },
            ]}
            placeholder="Edit your bookmark..."
            placeholderTextColor={theme.textSecondary}
            multiline
            value={textContent}
            onChangeText={setTextContent}
          />
        </View>

        {isReflection ? (
          <View style={styles.imagesSection}>
            <View style={styles.sectionHeader}>
              <ThemedText
                type="caption"
                style={[styles.sectionTitle, { color: theme.textSecondary }]}
              >
                IMAGES ({images.length}/3)
              </ThemedText>
              {images.length < 3 ? (
                <Pressable
                  onPress={handleAddImages}
                  style={({ pressed }) => [
                    styles.addImageButton,
                    { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <ImagePlus size={14} color="#FFFFFF" strokeWidth={2} />
                  <ThemedText style={styles.addImageButtonText}>
                    Add
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
            
            {images.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imagesPreview}
                contentContainerStyle={styles.imagesPreviewContent}
              >
                {images.map((uri, index) => (
                  <View key={index} style={styles.imagePreviewItem}>
                    <Image
                      source={{ uri }}
                      style={[styles.imagePreview, { borderColor: theme.border }]}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={() => handleRemoveImage(index)}
                      style={[styles.removeImageButton, { backgroundColor: "#DC2626" }]}
                    >
                      <Trash2 size={12} color="#FFFFFF" strokeWidth={2} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Pressable
                onPress={handleAddImages}
                style={[styles.emptyImages, { borderColor: theme.border }]}
              >
                <ImagePlus size={IconSize.lg} color={theme.textSecondary} strokeWidth={1.5} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
                >
                  Tap to add images
                </ThemedText>
              </Pressable>
            )}
          </View>
        ) : null}

        <View style={styles.booksSection}>
          <View style={styles.sectionHeader}>
            <ThemedText
              type="caption"
              style={[styles.sectionTitle, { color: theme.textSecondary }]}
            >
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
              onProgressValueChange={(value) =>
                handleUpdateProgress(tb.book.id, "progressValue", value)
              }
              onProgressTypeChange={(type) =>
                handleUpdateProgress(tb.book.id, "progressType", type)
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
                At least one book is required
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

        <View style={styles.buttonRow}>
          <Pressable
            onPress={handleCancel}
            style={[
              styles.button,
              styles.cancelButton,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText style={styles.buttonText}>
              Cancel
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={!canSave || isSaving}
            style={[
              styles.button,
              styles.saveButton,
              {
                backgroundColor: canSave ? theme.accent : theme.backgroundSecondary,
                opacity: canSave ? 1 : 0.5,
              },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={IconSize.sm} color={canSave ? "#FFFFFF" : theme.textSecondary} strokeWidth={2} />
                <ThemedText
                  style={[
                    styles.buttonText,
                    {
                      color: canSave ? "#FFFFFF" : theme.textSecondary,
                      marginLeft: Spacing.xs,
                    },
                  ]}
                >
                  Save
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
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
  postTypeSection: {
    marginBottom: Spacing.xl,
  },
  postTypeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  postTypeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  postTypeButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  postTypeHint: {
    fontSize: 12,
    textAlign: "center",
  },
  inputContainer: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  textInput: {
    padding: Spacing.lg,
    fontSize: 15,
    lineHeight: 24,
    minHeight: 180,
    textAlignVertical: "top",
  },
  imagesSection: {
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
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  addImageButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  imagesPreview: {
    marginBottom: Spacing.sm,
  },
  imagesPreviewContent: {
    gap: Spacing.sm,
  },
  imagePreviewItem: {
    position: "relative",
  },
  imagePreview: {
    width: 100,
    height: 75,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  removeImageButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyImages: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
  },
  booksSection: {
    marginBottom: Spacing.xl,
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
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  cancelButton: {},
  saveButton: {},
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
