import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { ChevronLeft, ChevronRight, MoreHorizontal, Heart, MessageCircle, Share2, Send, Pencil, Trash2 } from "lucide-react-native";
import { Share } from "react-native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ImageViewer } from "@/components/ImageViewer";
import { BottomActionSheet } from "@/components/BottomActionSheet";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { COLORS } from "@/constants/colors";
import { FONTS } from "@/constants/fonts";
import {
  deleteBookmark,
  addComment,
  getBookmarkComments,
  updateComment,
  deleteComment,
  toggleLike,
  getBookmarkEngagement,
} from "@/lib/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type BookmarkDetailRouteProp = RouteProp<RootStackParamList, "BookmarkDetail">;

interface Comment {
  id: string;
  userId: string;
  username: string;
  textContent: string;
  createdAt: string;
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const INPUT_BAR_HEIGHT = 62;

export default function BookmarkDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<BookmarkDetailRouteProp>();
  const commentInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const { bookmark, focusComment } = route.params;
  const isOwnBookmark = user?.id === bookmark.userId;
  const isReview = bookmark.postType === "review";
  const hasImages = Array.isArray(bookmark.images) && bookmark.images.length > 0;
  const hasQuote = bookmark.quoteText && bookmark.quoteText.trim().length > 0;
  const hasTextContent = bookmark.textContent && bookmark.textContent.trim().length > 0;

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [showCommentSheet, setShowCommentSheet] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadComments();
      loadEngagement();
    }, [bookmark.id])
  );

  useEffect(() => {
    if (focusComment) {
      setTimeout(() => commentInputRef.current?.focus(), 500);
    }
  }, [focusComment]);

  const loadEngagement = async () => {
    if (!user?.id) return;
    const e = await getBookmarkEngagement(bookmark.id, user.id);
    setIsLiked(e.isLikedByUser);
    setLikesCount(e.likesCount);
  };

  const loadComments = async () => {
    const data = await getBookmarkComments(bookmark.id);
    setComments(data);
  };

  const handleLike = async () => {
    if (!user?.id) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await toggleLike(bookmark.id, user.id);
    setIsLiked(result.liked);
    setLikesCount(result.count);
  };

  const handleShare = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const bookTitle = bookmark.book?.title || "a book";
    const msg = `"${bookmark.textContent.slice(0, 200)}${bookmark.textContent.length > 200 ? "..." : ""}" - from ${bookTitle}`;
    try { await Share.share({ message: msg }); } catch (e) {}
  };

  const handleEdit = () => {
    setShowMoreSheet(false);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("EditBookmark", { bookmark });
  };

  const handleDelete = () => {
    setShowMoreSheet(false);
    Alert.alert("Delete Bookmark", "Are you sure you want to delete this bookmark?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const ok = await deleteBookmark(bookmark.id);
            if (!ok) throw new Error();
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
          } catch {
            Alert.alert("Error", "Failed to delete bookmark.");
          }
        },
      },
    ]);
  };

  const handleSubmitComment = async () => {
    if (!user?.id || !newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = await addComment(bookmark.id, user.id, newComment.trim());
    if (ok) { setNewComment(""); loadComments(); }
    setIsSubmitting(false);
  };

  const handleCommentOptions = (comment: Comment) => {
    if (comment.userId !== user?.id) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedComment(comment);
    setShowCommentSheet(true);
  };

  const handleEditComment = () => {
    if (!selectedComment) return;
    setEditingComment(selectedComment);
    setEditCommentText(selectedComment.textContent);
    setShowCommentSheet(false);
    setSelectedComment(null);
  };

  const handleSaveEditComment = async () => {
    if (!editingComment || !editCommentText.trim()) return;
    const ok = await updateComment(editingComment.id, editCommentText.trim());
    if (ok) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadComments();
    }
    setEditingComment(null);
    setEditCommentText("");
  };

  const handleDeleteComment = () => {
    if (!selectedComment) return;
    setShowCommentSheet(false);
    Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const ok = await deleteComment(selectedComment.id);
          if (ok) {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadComments();
          }
          setSelectedComment(null);
        },
      },
    ]);
  };

  const progressPercent = (() => {
    if (bookmark.progressType === "percent" && bookmark.pageNumber) return bookmark.pageNumber;
    if (bookmark.pageNumber && bookmark.book?.totalPages) {
      return Math.min(100, Math.round((bookmark.pageNumber / bookmark.book.totalPages) * 100));
    }
    return null;
  })();

  const pageRangeStart = bookmark.pagesRead && bookmark.pageNumber
    ? Math.max(1, bookmark.pageNumber - bookmark.pagesRead)
    : null;

  const progressPillLabel = (() => {
    if (bookmark.progressType === "percent" && bookmark.pageNumber) return `${bookmark.pageNumber}%`;
    if (bookmark.pagesRead && bookmark.pagesRead > 0 && bookmark.pageNumber) return `p.${pageRangeStart} → p.${bookmark.pageNumber}`;
    if (bookmark.pageNumber) return `p.${bookmark.pageNumber}`;
    return null;
  })();

  const heroProgressLabel = (() => {
    const parts: string[] = [];
    if (bookmark.pageNumber && bookmark.book?.totalPages) parts.push(`p.${bookmark.pageNumber} of ${bookmark.book.totalPages}p`);
    else if (bookmark.pageNumber) parts.push(`p.${bookmark.pageNumber}`);
    if (progressPercent !== null) parts.push(`${progressPercent}%`);
    return parts.length > 0 ? parts.join(" · ") : null;
  })();

  const displayHandle = bookmark.username ? `@${bookmark.username.toLowerCase().replace(/\s+/g, "_")}` : "";

  const bookYear = bookmark.book?.publishedDate
    ? new Date(bookmark.book.publishedDate).getFullYear().toString()
    : null;
  const bookMeta = [bookmark.book?.publisher, bookYear].filter(Boolean).join(" · ") || null;

  const moreActions = isOwnBookmark
    ? [
        { label: "Edit", onPress: handleEdit, icon: <Pencil size={20} color={theme.text} strokeWidth={1.5} /> },
        { label: "Delete", onPress: handleDelete, destructive: true, icon: <Trash2 size={20} color="#DC2626" strokeWidth={1.5} /> },
      ]
    : [{ label: "Share", onPress: handleShare }];

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: INPUT_BAR_HEIGHT + insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. TOP BAR */}
          <View style={[styles.topBar, { paddingTop: insets.top, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Pressable onPress={() => navigation.goBack()} style={styles.topBarBtn} hitSlop={8}>
              <ChevronLeft size={22} color={theme.text} strokeWidth={2} />
            </Pressable>
            <Pressable onPress={() => setShowMoreSheet(true)} style={styles.topBarBtn} hitSlop={8}>
              <MoreHorizontal size={22} color={theme.text} strokeWidth={1.75} />
            </Pressable>
          </View>

          {/* 2. BOOK HERO */}
          {bookmark.book ? (
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("BookDetail", { book: bookmark.book! });
              }}
              style={[styles.bookHero, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}
            >
              <View style={styles.bookHeroInner}>
                {bookmark.book.coverUrl ? (
                  <Image
                    source={{ uri: bookmark.book.coverUrl }}
                    style={[styles.heroCover, { borderColor: theme.border }]}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={[styles.heroCoverPlaceholder, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]} />
                )}
                <View style={styles.heroInfo}>
                  <ThemedText style={[styles.heroTitle, { color: theme.text }]} numberOfLines={2}>
                    {bookmark.book.title}
                  </ThemedText>
                  <ThemedText style={[styles.heroAuthor, { color: theme.textTertiary }]} numberOfLines={1}>
                    {bookmark.book.author}
                  </ThemedText>
                  {bookMeta ? (
                    <ThemedText style={[styles.heroMeta, { color: theme.textTertiary }]} numberOfLines={1}>
                      {bookMeta}
                    </ThemedText>
                  ) : null}
                  {!isReview && progressPercent !== null ? (
                    <View style={styles.heroProgressWrapper}>
                      <View style={[styles.heroProgressBg, { backgroundColor: theme.border }]}>
                        <View style={[styles.heroProgressFill, { width: `${Math.min(100, progressPercent)}%`, backgroundColor: "#2A7A52" }]} />
                      </View>
                      {heroProgressLabel ? (
                        <ThemedText style={styles.heroProgressLabel}>{heroProgressLabel}</ThemedText>
                      ) : null}
                    </View>
                  ) : null}
                </View>
                <ChevronRight size={16} color="#CCCCCC" strokeWidth={1.75} />
              </View>
            </Pressable>
          ) : null}

          {/* 3. USER ROW */}
          <View style={[styles.userRow, { backgroundColor: theme.surface }]}>
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
                <ThemedText style={styles.avatarText}>
                  {(bookmark.username || "?").slice(0, 2).toUpperCase()}
                </ThemedText>
              </View>
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <ThemedText style={[styles.userName, { color: theme.text }]}>{bookmark.username}</ThemedText>
                <ThemedText style={[styles.userHandle, { color: theme.textTertiary }]}>{displayHandle}</ThemedText>
                <ThemedText style={[styles.userTime, { color: theme.textTertiary }]}>{formatTimeAgo(bookmark.createdAt)}</ThemedText>
                {!isReview && progressPillLabel ? (
                  <ThemedText style={[styles.userProgress, { color: theme.textTertiary }]}>{progressPillLabel}</ThemedText>
                ) : null}
              </View>
            </View>
          </View>

          {/* 4. RATING (Review only) */}
          {isReview && bookmark.rating && bookmark.rating > 0 ? (
            <View style={[styles.ratingRow, { backgroundColor: theme.surface }]}>
              {[1, 2, 3, 4, 5].map((i) => (
                <ThemedText key={i} style={[styles.ratingStar, { color: i <= bookmark.rating! ? "#F59E0B" : "#E5E5EA" }]}>
                  {"\u2605"}
                </ThemedText>
              ))}
            </View>
          ) : null}

          {/* 5. QUOTE — no decorative quote glyph; left border + block per DESIGN_SPEC */}
          {hasQuote ? (
            <View style={[styles.quoteSection, { backgroundColor: COLORS.quoteBg, borderLeftColor: COLORS.green }]}>
              <ThemedText
                serif
                style={[
                  styles.quoteText,
                  {
                    color: COLORS.quoteText,
                    fontFamily: FONTS.serif,
                    fontSize: 14,
                    lineHeight: 26,
                  },
                ]}
              >
                {bookmark.quoteText}
              </ThemedText>
            </View>
          ) : null}

          {/* 6. NOTE */}
          {hasTextContent ? (
            <View style={[styles.noteSection, { backgroundColor: theme.surface }]}>
              <ThemedText style={[styles.noteText, { color: "#0A0A0A" }]}>
                {bookmark.textContent}
              </ThemedText>
            </View>
          ) : null}

          {/* 7. PHOTO SCROLL */}
          {hasImages ? (
            <View style={[styles.photoSection, { backgroundColor: theme.surface }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoScrollContent}
              >
                {bookmark.images!.map((uri, idx) => (
                  <Pressable key={idx} onPress={() => setSelectedImageIndex(idx)}>
                    <Image
                      source={{ uri }}
                      style={[styles.photo, idx > 0 && { marginLeft: 8 }]}
                      contentFit="cover"
                      transition={200}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* 8. ACTIONS */}
          <View style={[styles.actionsBar, { borderTopColor: theme.border, borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={styles.actionsLeft}>
              <Pressable onPress={handleLike} style={styles.actionBtn} hitSlop={8}>
                <Heart size={18} color={isLiked ? "#EF4444" : theme.textTertiary} fill={isLiked ? "#EF4444" : "none"} strokeWidth={1.5} />
                {likesCount > 0 ? (
                  <ThemedText style={[styles.actionCount, { color: isLiked ? "#EF4444" : theme.textTertiary }]}>{likesCount}</ThemedText>
                ) : null}
              </Pressable>
              <Pressable onPress={() => commentInputRef.current?.focus()} style={styles.actionBtn} hitSlop={8}>
                <MessageCircle size={18} color={theme.textTertiary} strokeWidth={1.5} />
                {comments.length > 0 ? (
                  <ThemedText style={[styles.actionCount, { color: theme.textTertiary }]}>{comments.length}</ThemedText>
                ) : null}
              </Pressable>
            </View>
            <Pressable onPress={handleShare} style={styles.actionBtn} hitSlop={8}>
              <Share2 size={18} color={theme.textTertiary} strokeWidth={1.5} />
            </Pressable>
          </View>

          {/* 9. COMMENTS */}
          <View style={[styles.commentsSection, { backgroundColor: theme.surface }]}>
            <ThemedText style={styles.commentsLabel}>
              {`COMMENTS · ${comments.length}`}
            </ThemedText>
            {comments.map((comment) => {
              const isOwn = comment.userId === user?.id;
              return (
                <Pressable
                  key={comment.id}
                  onLongPress={() => isOwn && handleCommentOptions(comment)}
                  style={styles.commentItem}
                >
                  <View style={[styles.commentAvatar, { backgroundColor: theme.accent }]}>
                    <ThemedText style={styles.commentAvatarText}>
                      {(comment.username || "?").slice(0, 2).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentMeta}>
                      <ThemedText style={[styles.commentName, { color: theme.text }]}>{comment.username}</ThemedText>
                      <ThemedText style={[styles.commentTime, { color: "#999999" }]}>{formatTimeAgo(comment.createdAt)}</ThemedText>
                      {isOwn ? (
                        <Pressable onPress={() => handleCommentOptions(comment)} hitSlop={8}>
                          <MoreHorizontal size={14} color={theme.textTertiary} strokeWidth={1.5} />
                        </Pressable>
                      ) : null}
                    </View>
                    <ThemedText style={[styles.commentText, { color: theme.textSecondary }]}>
                      {comment.textContent}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
            {comments.length === 0 ? (
              <ThemedText style={[styles.noComments, { color: theme.textTertiary }]}>Be the first to comment.</ThemedText>
            ) : null}
          </View>
        </ScrollView>

        {/* 10. FIXED INPUT BAR */}
        {user ? (
          <View style={[styles.inputBar, { borderTopColor: theme.border, backgroundColor: "#FFFFFF", paddingBottom: insets.bottom + 8 }]}>
            <TextInput
              ref={commentInputRef}
              style={[styles.inputField, { color: theme.text, borderColor: theme.border }]}
              placeholder="Add a comment…"
              placeholderTextColor={theme.textTertiary}
              value={newComment}
              onChangeText={setNewComment}
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSubmitComment}
            />
            <Pressable
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              style={[styles.sendBtn, { opacity: newComment.trim() && !isSubmitting ? 1 : 0.4 }]}
            >
              <Send size={16} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <ImageViewer
        visible={selectedImageIndex !== null}
        images={bookmark.images || []}
        initialIndex={selectedImageIndex ?? 0}
        onClose={() => setSelectedImageIndex(null)}
      />

      <BottomActionSheet
        visible={showMoreSheet}
        onClose={() => setShowMoreSheet(false)}
        actions={moreActions}
      />

      <BottomActionSheet
        visible={showCommentSheet}
        onClose={() => { setShowCommentSheet(false); setSelectedComment(null); }}
        actions={[
          { label: "Edit", onPress: handleEditComment },
          { label: "Delete", onPress: handleDeleteComment, destructive: true },
        ]}
      />

      <Modal visible={editingComment !== null} transparent animationType="fade" onRequestClose={() => setEditingComment(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.editModal, { backgroundColor: theme.surface }]}>
            <ThemedText style={[styles.editModalTitle, { color: theme.text }]}>Edit Comment</ThemedText>
            <TextInput
              style={[styles.editModalInput, { color: theme.text, borderColor: theme.border }]}
              value={editCommentText}
              onChangeText={setEditCommentText}
              multiline
              autoFocus
              maxLength={500}
            />
            <View style={styles.editModalBtns}>
              <Pressable onPress={() => setEditingComment(null)} style={[styles.editModalBtn, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText style={{ color: theme.text }}>Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={handleSaveEditComment} style={[styles.editModalBtn, { backgroundColor: "#2A7A52" }]}>
                <ThemedText style={{ color: "#FFFFFF" }}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  /* TOP BAR */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  topBarBtn: {
    padding: 4,
  },

  /* BOOK HERO */
  bookHero: {
    borderBottomWidth: 1,
  },
  bookHeroInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  heroCover: {
    width: 60,
    height: 86,
    borderRadius: 5,
    borderWidth: 0.75,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heroCoverPlaceholder: {
    width: 60,
    height: 86,
    borderRadius: 5,
    borderWidth: 0.75,
  },
  heroInfo: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  heroAuthor: {
    fontSize: 12,
    marginBottom: 4,
  },
  heroMeta: {
    fontSize: 11,
  },
  heroProgressWrapper: {
    marginTop: 8,
    gap: 3,
  },
  heroProgressBg: {
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  heroProgressFill: {
    height: 2,
    borderRadius: 1,
  },
  heroProgressLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2A7A52",
  },

  /* USER ROW */
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
  },
  userHandle: {
    fontSize: 13,
  },
  userTime: {
    fontSize: 12,
  },
  userProgress: {
    fontSize: 12,
  },

  /* RATING */
  ratingRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 2,
    gap: 2,
  },
  ratingStar: {
    fontSize: 18,
    letterSpacing: 2,
  },

  /* QUOTE */
  quoteSection: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 2.5,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  quoteText: {
    fontStyle: "normal",
  },

  /* NOTE */
  noteSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 14 * 1.7,
  },

  /* PHOTOS */
  photoSection: {
    paddingBottom: 16,
  },
  photoScrollContent: {
    paddingHorizontal: 20,
  },
  photo: {
    width: 200,
    height: 160,
    borderRadius: 8,
  },

  /* ACTIONS */
  actionsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  actionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: "500",
  },

  /* COMMENTS */
  commentsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  commentsLabel: {
    fontSize: 10,
    letterSpacing: 0.1 * 10,
    color: "#999999",
    textTransform: "uppercase",
    marginBottom: 14,
    fontWeight: "600",
  },
  noComments: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 10,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  commentAvatarText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  commentBody: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  commentName: {
    fontSize: 12,
    fontWeight: "600",
  },
  commentTime: {
    fontSize: 11,
    flex: 1,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
  },

  /* INPUT BAR */
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  inputField: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2A7A52",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  /* EDIT COMMENT MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  editModal: {
    width: "100%",
    borderRadius: 14,
    padding: 20,
    gap: 12,
  },
  editModalTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  editModalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 80,
  },
  editModalBtns: {
    flexDirection: "row",
    gap: 10,
  },
  editModalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});
