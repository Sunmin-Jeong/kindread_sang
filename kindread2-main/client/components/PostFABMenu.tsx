import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  FlatList,
  StyleSheet,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import {
  X,
  BookOpen,
  ChevronRight,
  Star,
  Plus,
  Minus,
  Check,
  Search,
  Pencil,
} from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { saveBookmark, getRecentBooks } from "@/lib/storage";
import { searchBooks } from "@/lib/books-api";
import type { Book, BookSearchResult } from "@/types";

const { height: SCREEN_H } = Dimensions.get("window");

const GREEN = "#2A7A52";
const GREEN_BG = "#E8F3ED";
const AMBER = "#F59E0B";
const BORDER = "#EBEBEB";
const SURFACE = "#F5F5F5";
const MUTED = "#888888";
const TEXT = "#0A0A0A";

type SheetType = "log" | "quote" | "review";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PostFABMenuProps {
  bottom: number;
  onSuccess: () => void;
}

// ─── Inline Book Selector ─────────────────────────────────────────────────────

interface BookSelectorProps {
  userId: string;
  selectedBook: Book | null;
  onSelect: (book: Book) => void;
}

function BookSelector({ userId, selectedBook, onSelect }: BookSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const books = await getRecentBooks(userId);
        setRecentBooks(books);
      } catch (e) {
        console.error("Error loading recent books:", e);
      }
    })();
  }, [userId]);

  const handleSearch = useCallback(
    async (text: string) => {
      setQuery(text);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (text.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      timeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const results = await searchBooks(text);
          setSearchResults(results);
        } catch (e) {
          console.error("Search error:", e);
        } finally {
          setIsSearching(false);
        }
      }, 350);
    },
    []
  );

  const handleSelectBook = (item: Book | BookSearchResult) => {
    const b: Book = {
      id: item.id,
      title: item.title,
      author: item.author,
      coverUrl: item.coverUrl,
      isbn: item.isbn,
      totalPages: (item as BookSearchResult).pageCount ?? (item as Book).totalPages,
    };
    onSelect(b);
    setExpanded(false);
    setQuery("");
    setSearchResults([]);
  };

  const displayBooks: (Book | BookSearchResult)[] =
    query.trim().length >= 2 ? searchResults : recentBooks;

  return (
    <View style={bs.wrap}>
      <Pressable
        style={bs.pill}
        onPress={() => setExpanded(!expanded)}
      >
        {selectedBook?.coverUrl ? (
          <Image source={{ uri: selectedBook.coverUrl }} style={bs.pillCover} contentFit="cover" />
        ) : (
          <View style={bs.pillCoverFallback}>
            <BookOpen size={11} color={MUTED} strokeWidth={1.5} />
          </View>
        )}
        <ThemedText style={bs.pillTitle} numberOfLines={1}>
          {selectedBook ? selectedBook.title : "Select a book"}
        </ThemedText>
        <ChevronRight size={14} color={MUTED} strokeWidth={2} />
      </Pressable>

      {expanded ? (
        <View style={bs.expanded}>
          <View style={bs.searchRow}>
            <Search size={14} color={MUTED} strokeWidth={1.5} />
            <TextInput
              style={bs.searchInput}
              value={query}
              onChangeText={handleSearch}
              placeholder="Search by title or author..."
              placeholderTextColor={MUTED}
              autoFocus
            />
            {query.length > 0 ? (
              <Pressable onPress={() => { setQuery(""); setSearchResults([]); }} hitSlop={8}>
                <X size={14} color={MUTED} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>
          <FlatList
            data={displayBooks}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable style={bs.bookRow} onPress={() => handleSelectBook(item)}>
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={bs.rowCover} contentFit="cover" />
                ) : (
                  <View style={bs.rowCoverFallback}>
                    <BookOpen size={14} color={MUTED} strokeWidth={1.5} />
                  </View>
                )}
                <View style={bs.rowInfo}>
                  <ThemedText style={bs.rowTitle} numberOfLines={1}>{item.title}</ThemedText>
                  <ThemedText style={bs.rowAuthor} numberOfLines={1}>{item.author}</ThemedText>
                </View>
                {selectedBook?.id === item.id ? (
                  <Check size={14} color={GREEN} strokeWidth={2.5} />
                ) : null}
              </Pressable>
            )}
            ListEmptyComponent={
              isSearching ? (
                <ThemedText style={bs.emptyText}>Searching...</ThemedText>
              ) : (
                <ThemedText style={bs.emptyText}>
                  {query.trim().length >= 2
                    ? "No results found"
                    : "Your recent books appear here"}
                </ThemedText>
              )
            }
          />
        </View>
      ) : null}
    </View>
  );
}

const bs = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 10,
    padding: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  pillCover: { width: 28, height: 40, borderRadius: 3 },
  pillCoverFallback: {
    width: 28,
    height: 40,
    borderRadius: 3,
    backgroundColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  pillTitle: { flex: 1, fontSize: 14, fontWeight: "600" },
  expanded: { marginTop: 8 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0, color: TEXT },
  bookRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  rowCover: { width: 36, height: 50, borderRadius: 3 },
  rowCoverFallback: {
    width: 36,
    height: 50,
    borderRadius: 3,
    backgroundColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "600" },
  rowAuthor: { fontSize: 12, color: MUTED },
  emptyText: { fontSize: 13, color: MUTED, textAlign: "center", paddingVertical: 12 },
});

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return <ThemedText style={sl.label}>{text}</ThemedText>;
}

const sl = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 6,
  },
});

// ─── Sheet Wrapper ────────────────────────────────────────────────────────────

interface SheetWrapperProps {
  title: string;
  onClose: () => void;
  shareDisabled: boolean;
  onShare: () => void;
  isSharing: boolean;
  children: React.ReactNode;
  insets: { bottom: number };
}

function SheetWrapper({
  title,
  onClose,
  shareDisabled,
  onShare,
  isSharing,
  children,
  insets,
}: SheetWrapperProps) {
  const slideY = useSharedValue(SCREEN_H);

  useEffect(() => {
    slideY.value = withTiming(0, {
      duration: 280,
      easing: Easing.bezier(0.2, 0.8, 0.3, 1),
    });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const handleClose = () => {
    slideY.value = withTiming(SCREEN_H, { duration: 240 });
    setTimeout(onClose, 230);
  };

  return (
    <Animated.View style={[sw.sheet, animStyle]}>
      <View style={sw.handleWrap}>
        <View style={sw.handle} />
      </View>
      <View style={sw.header}>
        <Pressable style={sw.headerSide} onPress={handleClose} hitSlop={10}>
          <X size={20} color={TEXT} strokeWidth={2} />
        </Pressable>
        <ThemedText style={sw.headerTitle}>{title}</ThemedText>
        <Pressable
          style={[sw.shareBtn, !shareDisabled && sw.shareBtnActive]}
          disabled={shareDisabled || isSharing}
          onPress={onShare}
        >
          <ThemedText style={[sw.shareBtnText, !shareDisabled && sw.shareBtnTextActive]}>
            {isSharing ? "Sharing..." : "Share"}
          </ThemedText>
        </Pressable>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[sw.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const sw = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_H * 0.92,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  handleWrap: { alignItems: "center", paddingTop: 14 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.75,
    borderBottomColor: BORDER,
  },
  headerSide: { width: 44 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "600" },
  shareBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  shareBtnActive: { backgroundColor: TEXT },
  shareBtnText: { fontSize: 14, fontWeight: "600", color: MUTED },
  shareBtnTextActive: { color: "#FFFFFF" },
  content: { padding: 20, gap: Spacing.xl },
});

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast() {
  return (
    <View style={ts.toast}>
      <ThemedText style={ts.text}>Shared</ThemedText>
      <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
    </View>
  );
}

const ts = StyleSheet.create({
  toast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TEXT,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    alignSelf: "center",
  },
  text: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});

// ─── Log Reading Sheet ────────────────────────────────────────────────────────

function LogReadingSheet({
  onClose,
  onSuccess,
  userId,
  insets,
}: {
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  insets: { bottom: number };
}) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [pages, setPages] = useState(0);
  const [thoughtText, setThoughtText] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [thoughtExpanded, setThoughtExpanded] = useState(false);
  const [quoteExpanded, setQuoteExpanded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const canShare = pages > 0;

  const handleShare = async () => {
    if (!canShare || !userId) return;
    setIsSharing(true);
    try {
      const pageNumber = pages > 0 ? pages : null;
      await saveBookmark(
        userId,
        thoughtText.trim(),
        selectedBook,
        pageNumber,
        "page",
        "log",
        [],
        undefined,
        "public",
        undefined,
        quoteText.trim() || undefined
      );
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setShowToast(true);
      setTimeout(() => { onSuccess(); onClose(); }, 900);
    } catch (e) {
      console.error("Error sharing log:", e);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <SheetWrapper
      title="Log reading"
      onClose={onClose}
      shareDisabled={!canShare}
      onShare={handleShare}
      isSharing={isSharing}
      insets={insets}
    >
      <BookSelector userId={userId} selectedBook={selectedBook} onSelect={setSelectedBook} />

      <View>
        <SectionLabel text="Pages read today" />
        <View style={lg.stepper}>
          <Pressable
            style={lg.stepBtn}
            onPress={() => setPages((p) => Math.max(0, p - 1))}
            hitSlop={8}
          >
            <Minus size={20} color={TEXT} strokeWidth={2} />
          </Pressable>
          <ThemedText style={lg.count}>{pages}</ThemedText>
          <Pressable style={lg.stepBtn} onPress={() => setPages((p) => p + 1)} hitSlop={8}>
            <Plus size={20} color={TEXT} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={lg.quickRow}>
          {[10, 20, 30, 50].map((n) => (
            <Pressable key={n} style={lg.quickBtn} onPress={() => setPages((p) => p + n)}>
              <ThemedText style={lg.quickBtnText}>+{n}p</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Pressable
          style={lg.expandHeader}
          onPress={() => setThoughtExpanded(!thoughtExpanded)}
        >
          <ThemedText style={lg.expandLabel}>Add a thought</ThemedText>
          <ChevronRight
            size={16}
            color={MUTED}
            strokeWidth={2}
            style={{ transform: [{ rotate: thoughtExpanded ? "90deg" : "0deg" }] }}
          />
        </Pressable>
        {thoughtExpanded ? (
          <View>
            <TextInput
              style={lg.textarea}
              value={thoughtText}
              onChangeText={(t) => setThoughtText(t.slice(0, 280))}
              placeholder="How you felt, what you noticed..."
              placeholderTextColor={MUTED}
              multiline
              textAlignVertical="top"
            />
            <ThemedText style={lg.charCount}>{thoughtText.length}/280</ThemedText>
          </View>
        ) : null}
      </View>

      <View>
        <Pressable
          style={lg.expandHeader}
          onPress={() => setQuoteExpanded(!quoteExpanded)}
        >
          <ThemedText style={lg.expandLabel}>Add a quote</ThemedText>
          <ChevronRight
            size={16}
            color={MUTED}
            strokeWidth={2}
            style={{ transform: [{ rotate: quoteExpanded ? "90deg" : "0deg" }] }}
          />
        </Pressable>
        {quoteExpanded ? (
          <TextInput
            style={[lg.textarea, lg.quoteFont]}
            value={quoteText}
            onChangeText={setQuoteText}
            placeholder="A passage that stood out..."
            placeholderTextColor={MUTED}
            multiline
            textAlignVertical="top"
          />
        ) : null}
      </View>

      {showToast ? <Toast /> : null}
    </SheetWrapper>
  );
}

const lg = StyleSheet.create({
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
    marginVertical: Spacing.md,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    fontSize: 48,
    fontWeight: "700",
    fontFamily: Platform.select({
      ios: "Pretendard-Bold",
      android: "Pretendard-Bold",
      default: "Pretendard-Bold",
    }),
    color: TEXT,
    minWidth: 80,
    textAlign: "center",
  },
  quickRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  quickBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickBtnText: { fontSize: 13, fontWeight: "600" },
  expandHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  expandLabel: { fontSize: 15, fontWeight: "500" },
  textarea: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 90,
    color: TEXT,
    marginTop: 4,
  },
  quoteFont: {
    fontFamily: Platform.select({
      ios: "Pretendard-Regular",
      android: "Pretendard-Regular",
      default: "Pretendard-Regular",
    }),
    color: GREEN,
  },
  charCount: { fontSize: 11, color: MUTED, textAlign: "right", marginTop: 4 },
});

// ─── Save Quote Sheet ─────────────────────────────────────────────────────────

function SaveQuoteSheet({
  onClose,
  onSuccess,
  userId,
  insets,
}: {
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  insets: { bottom: number };
}) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [quoteText, setQuoteText] = useState("");
  const [pageNumber, setPageNumber] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const canShare = quoteText.trim().length > 0;

  const handleShare = async () => {
    if (!canShare || !userId) return;
    setIsSharing(true);
    try {
      const page = pageNumber.trim() ? parseInt(pageNumber.trim(), 10) : null;
      await saveBookmark(
        userId,
        "",
        selectedBook,
        page,
        "page",
        "quote",
        [],
        undefined,
        "public",
        undefined,
        quoteText.trim()
      );
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setShowToast(true);
      setTimeout(() => { onSuccess(); onClose(); }, 900);
    } catch (e) {
      console.error("Error sharing quote:", e);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <SheetWrapper
      title="Save a quote"
      onClose={onClose}
      shareDisabled={!canShare}
      onShare={handleShare}
      isSharing={isSharing}
      insets={insets}
    >
      <BookSelector userId={userId} selectedBook={selectedBook} onSelect={setSelectedBook} />

      <View style={qq.quoteWrap}>
        <ThemedText style={qq.decorMark}>{"\u201C"}</ThemedText>
        <TextInput
          style={[qq.quoteInput, isFocused && qq.quoteInputFocused]}
          value={quoteText}
          onChangeText={setQuoteText}
          placeholder="Type or pick a quote..."
          placeholderTextColor={MUTED}
          multiline
          textAlignVertical="top"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>

      <View style={qq.pageRow}>
        <ThemedText style={qq.pageLabel}>Page number (optional)</ThemedText>
        <View style={qq.pageInputWrap}>
          <ThemedText style={qq.pDot}>p.</ThemedText>
          <TextInput
            style={qq.pageInput}
            value={pageNumber}
            onChangeText={setPageNumber}
            keyboardType="number-pad"
            placeholder="—"
            placeholderTextColor={MUTED}
          />
        </View>
      </View>

      {showToast ? <Toast /> : null}
    </SheetWrapper>
  );
}

const qq = StyleSheet.create({
  quoteWrap: { position: "relative", minHeight: 140, paddingTop: 8 },
  decorMark: {
    position: "absolute",
    top: -8,
    left: 0,
    fontSize: 44,
    color: GREEN,
    opacity: 0.3,
    fontFamily: Platform.select({
      ios: "Pretendard-Bold",
      android: "Pretendard-Bold",
      default: "Pretendard-Bold",
    }),
  },
  quoteInput: {
    paddingLeft: 44,
    paddingRight: 4,
    paddingTop: 4,
    paddingBottom: 8,
    fontSize: 17,
    minHeight: 120,
    color: TEXT,
    borderBottomWidth: 2,
    borderBottomColor: BORDER,
    fontFamily: Platform.select({
      ios: "Pretendard-Regular",
      android: "Pretendard-Regular",
      default: "Pretendard-Regular",
    }),
    textAlignVertical: "top",
  },
  quoteInputFocused: { borderBottomColor: GREEN },
  pageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageLabel: { fontSize: 14, color: MUTED },
  pageInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 80,
  },
  pDot: { fontSize: 14, fontWeight: "600", color: TEXT },
  pageInput: { flex: 1, fontSize: 18, textAlign: "center", color: TEXT, padding: 0 },
});

// ─── Write Review Sheet ───────────────────────────────────────────────────────

const RATING_LABELS: Record<number, string> = {
  1: "Not for me",
  2: "It was okay",
  3: "Liked it",
  4: "Loved it",
  5: "Obsessed",
};

function WriteReviewSheet({
  onClose,
  onSuccess,
  userId,
  insets,
}: {
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  insets: { bottom: number };
}) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [rating, setRating] = useState(0);
  const [favoriteQuote, setFavoriteQuote] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const canShare = rating > 0;

  const handlePickImage = async () => {
    if (images.length >= 3) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 3 - images.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 3));
    }
  };

  const handleShare = async () => {
    if (!canShare || !userId) return;
    setIsSharing(true);
    try {
      await saveBookmark(
        userId,
        reviewText.trim(),
        selectedBook,
        null,
        "page",
        "review",
        images,
        undefined,
        "public",
        rating,
        favoriteQuote.trim() || undefined
      );
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setShowToast(true);
      setTimeout(() => { onSuccess(); onClose(); }, 900);
    } catch (e) {
      console.error("Error sharing review:", e);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <SheetWrapper
      title="Write a review"
      onClose={onClose}
      shareDisabled={!canShare}
      onShare={handleShare}
      isSharing={isSharing}
      insets={insets}
    >
      <BookSelector userId={userId} selectedBook={selectedBook} onSelect={setSelectedBook} />

      <View style={rv.starsSection}>
        <View style={rv.starsRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable key={i} onPress={() => setRating(rating === i ? 0 : i)} hitSlop={6}>
              <Star
                size={40}
                color={i <= rating ? AMBER : "#E5E5EA"}
                fill={i <= rating ? AMBER : "transparent"}
                strokeWidth={1.5}
              />
            </Pressable>
          ))}
        </View>
        {rating > 0 ? (
          <ThemedText style={rv.ratingLabel}>{RATING_LABELS[rating]}</ThemedText>
        ) : null}
      </View>

      <View>
        <SectionLabel text="Favorite quote (optional)" />
        <TextInput
          style={rv.quoteInput}
          value={favoriteQuote}
          onChangeText={setFavoriteQuote}
          placeholder="A passage that stayed with you..."
          placeholderTextColor={MUTED}
          multiline
          textAlignVertical="top"
          numberOfLines={2}
        />
      </View>

      <View>
        <SectionLabel text="Your review (optional)" />
        <TextInput
          style={rv.reviewInput}
          value={reviewText}
          onChangeText={(t) => setReviewText(t.slice(0, 500))}
          placeholder="What did you think? What stayed with you?"
          placeholderTextColor={MUTED}
          multiline
          textAlignVertical="top"
          numberOfLines={4}
        />
        <ThemedText style={rv.charCount}>{reviewText.length}/500</ThemedText>
      </View>

      <View>
        <SectionLabel text="Photos (optional)" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={rv.photosRow}
        >
          {images.map((uri, i) => (
            <View key={i} style={rv.photoThumb}>
              <Image source={{ uri }} style={rv.photo} contentFit="cover" />
              <Pressable
                style={rv.removePhoto}
                onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                hitSlop={4}
              >
                <X size={10} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            </View>
          ))}
          {images.length < 3 ? (
            <Pressable style={rv.addPhoto} onPress={handlePickImage}>
              <Plus size={20} color={MUTED} strokeWidth={2} />
            </Pressable>
          ) : null}
        </ScrollView>
      </View>

      {showToast ? <Toast /> : null}
    </SheetWrapper>
  );
}

const rv = StyleSheet.create({
  starsSection: { alignItems: "center", gap: 8 },
  starsRow: { flexDirection: "row", gap: 8 },
  ratingLabel: { fontSize: 13, fontWeight: "600", color: GREEN },
  quoteInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 66,
    color: TEXT,
    fontFamily: Platform.select({
      ios: "Pretendard-Regular",
      android: "Pretendard-Regular",
      default: "Pretendard-Regular",
    }),
    textAlignVertical: "top",
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    color: TEXT,
    textAlignVertical: "top",
  },
  charCount: { fontSize: 11, color: MUTED, textAlign: "right", marginTop: 4 },
  photosRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    position: "relative",
  },
  photo: { width: 72, height: 72, borderRadius: 8 },
  removePhoto: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhoto: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Main PostFABMenu ─────────────────────────────────────────────────────────

export function PostFABMenu({ bottom, onSuccess }: PostFABMenuProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<SheetType | null>(null);

  const opt1Y = useSharedValue(16);
  const opt2Y = useSharedValue(16);
  const opt3Y = useSharedValue(16);
  const optsOpacity = useSharedValue(0);

  const opt1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: opt1Y.value }],
    opacity: optsOpacity.value,
  }));
  const opt2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: opt2Y.value }],
    opacity: optsOpacity.value,
  }));
  const opt3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: opt3Y.value }],
    opacity: optsOpacity.value,
  }));

  const openMenu = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    opt1Y.value = 16;
    opt2Y.value = 16;
    opt3Y.value = 16;
    optsOpacity.value = 0;
    setMenuOpen(true);
    optsOpacity.value = withDelay(40, withTiming(1, { duration: 180 }));
    opt1Y.value = withDelay(0, withSpring(0, { damping: 18, stiffness: 260 }));
    opt2Y.value = withDelay(50, withSpring(0, { damping: 18, stiffness: 260 }));
    opt3Y.value = withDelay(100, withSpring(0, { damping: 18, stiffness: 260 }));
  };

  const closeMenu = () => {
    optsOpacity.value = withTiming(0, { duration: 140 });
    setTimeout(() => setMenuOpen(false), 140);
  };

  const handleOptionPress = (sheet: SheetType) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    closeMenu();
    setTimeout(() => setActiveSheet(sheet), 160);
  };

  const handleCloseSheet = () => setActiveSheet(null);

  const OPTIONS = [
    {
      key: "review" as SheetType,
      label: "Write a review",
      bg: AMBER,
      border: null,
      style: opt1Style,
      icon: <Star size={22} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.5} />,
    },
    {
      key: "quote" as SheetType,
      label: "Save a quote",
      bg: "#FFFFFF",
      border: GREEN_BG,
      style: opt2Style,
      icon: (
        <ThemedText
          style={{
            fontSize: 24,
            color: GREEN,
            lineHeight: 28,
            fontFamily: Platform.select({
              ios: "Pretendard-Bold",
              android: "Pretendard-Bold",
              default: "Pretendard-Bold",
            }),
          }}
        >
          {"\u201C"}
        </ThemedText>
      ),
    },
    {
      key: "log" as SheetType,
      label: "Log reading",
      bg: GREEN,
      border: null,
      style: opt3Style,
      icon: <Check size={22} color="#FFFFFF" strokeWidth={2.5} />,
    },
  ];

  const fabBottom = bottom + Spacing.lg;

  return (
    <>
      {menuOpen ? (
        <Modal
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={closeMenu}
        >
          <View style={fab.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />

            <View style={[fab.optionsCol, { bottom: fabBottom + 64 }]}>
              {OPTIONS.map((opt) => (
                <Animated.View key={opt.key} style={[fab.optRow, opt.style]}>
                  <View style={fab.label}>
                    <ThemedText style={fab.labelText}>{opt.label}</ThemedText>
                  </View>
                  <Pressable
                    style={[
                      fab.optBtn,
                      { backgroundColor: opt.bg },
                      opt.border ? { borderWidth: 1.5, borderColor: opt.border } : null,
                    ]}
                    onPress={() => handleOptionPress(opt.key)}
                  >
                    {opt.icon}
                  </Pressable>
                </Animated.View>
              ))}
            </View>

            <Pressable
              style={[fab.closeFab, { bottom: fabBottom }]}
              onPress={closeMenu}
            >
              <X size={22} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
          </View>
        </Modal>
      ) : (
        <Pressable style={[fab.fabBtn, { bottom: fabBottom }]} onPress={openMenu}>
          <Pencil size={22} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      )}

      {activeSheet ? (
        <Modal
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={handleCloseSheet}
        >
          <View style={fab.sheetOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseSheet} />
            {activeSheet === "log" ? (
              <LogReadingSheet
                onClose={handleCloseSheet}
                onSuccess={onSuccess}
                userId={user?.id || ""}
                insets={insets}
              />
            ) : activeSheet === "quote" ? (
              <SaveQuoteSheet
                onClose={handleCloseSheet}
                onSuccess={onSuccess}
                userId={user?.id || ""}
                insets={insets}
              />
            ) : (
              <WriteReviewSheet
                onClose={handleCloseSheet}
                onSuccess={onSuccess}
                userId={user?.id || ""}
                insets={insets}
              />
            )}
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const fab = StyleSheet.create({
  fabBtn: {
    position: "absolute",
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: TEXT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  optionsCol: {
    position: "absolute",
    right: Spacing.lg,
    gap: 12,
  },
  optRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  label: {
    backgroundColor: TEXT,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  labelText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  optBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  closeFab: {
    position: "absolute",
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: TEXT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
