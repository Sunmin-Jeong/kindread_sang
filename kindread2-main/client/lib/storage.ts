import { supabase } from "@/lib/supabase";
import { uploadMultipleImages } from "@/lib/image-utils";
import type { Bookmark, Book, PostType, ProgressType, BookmarkVisibility } from "@/types";

/** Main feed: DESIGN_SPEC — `WHERE post_type IN ('log','quote','review')`; excludes null/empty and system rows (e.g. club join). */
const FEED_POST_TYPES = ["log", "quote", "review"] as const;

function isFeedPostRow(bm: { post_type?: string | null }): boolean {
  const t = bm.post_type;
  if (t == null || String(t).trim() === "") return false;
  return (FEED_POST_TYPES as readonly string[]).includes(String(t).trim());
}

/** Already-hosted images (Supabase/CDN). `blob:`, `data:`, `file:`, `content:` need upload (Expo web uses blob). */
function isRemoteHttpImageUrl(uri: string): boolean {
  const u = uri.trim();
  return /^https?:\/\//i.test(u);
}

async function collectBookmarkImageUrls(
  images: string[],
  userId: string
): Promise<string[]> {
  if (images.length === 0) return [];
  const remoteImages = images.filter(isRemoteHttpImageUrl);
  const localImages = images.filter((uri) => !isRemoteHttpImageUrl(uri));
  let uploaded: string[] = [];
  if (localImages.length > 0) {
    uploaded = await uploadMultipleImages(localImages, "reflections", userId);
  }
  return [...remoteImages, ...uploaded];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface PreviousProgress {
  pageNumber: number | null;
  progressType: ProgressType | null;
}

async function getPreviousProgress(userId: string, bookId: string): Promise<PreviousProgress> {
  try {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("page_number, progress_type")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .not("page_number", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error) return { pageNumber: null, progressType: null };
    return { pageNumber: data?.page_number || null, progressType: data?.progress_type || null };
  } catch {
    return { pageNumber: null, progressType: null };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getBookmarks
// ─────────────────────────────────────────────────────────────────────────────

export async function getBookmarks(currentUserId?: string): Promise<Bookmark[]> {
  try {
    const { data: bookmarks, error } = await (supabase
      .from("bookmarks")
      .select(
        "id,user_id,text_content,post_type,progress_type,images,club_id,visibility,book_id,page_number,rating,quote_text,created_at,books(id,title,author,cover_url,isbn,total_pages)"
      ) as any)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Storage] Error fetching bookmarks:", error);
      return [];
    }

    const { data: profiles } = await supabase.from("profiles").select("id, username");
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));

    const clubIds = [...new Set((bookmarks || []).filter((b: any) => b.club_id).map((b: any) => b.club_id))];
    let clubsMap = new Map<string, string>();
    let userMemberships = new Set<string>();

    if (clubIds.length > 0) {
      const { data: clubs } = await supabase.from("clubs").select("id, name").in("id", clubIds);
      clubsMap = new Map((clubs || []).map((c: any) => [c.id, c.name]));

      if (currentUserId) {
        const { data: memberships } = await supabase
          .from("club_members")
          .select("club_id")
          .eq("user_id", currentUserId);
        userMemberships = new Set((memberships || []).map((m: any) => m.club_id));
      }
    }

    const userBookProgress = new Map<string, number>();
    const sortedForDelta = [...(bookmarks || [])].sort(
      (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const pagesReadMap = new Map<string, number>();
    for (const bm of sortedForDelta) {
      if (bm.book_id && bm.page_number && bm.progress_type !== "percent") {
        const key = `${bm.user_id}-${bm.book_id}`;
        const prev = userBookProgress.get(key) || 0;
        const delta = bm.page_number - prev;
        pagesReadMap.set(bm.id, delta > 0 ? delta : 0);
        userBookProgress.set(key, bm.page_number);
      }
    }

    return (bookmarks || [])
      .filter((bm: any) => {
        if (bm.visibility === "club_members" && bm.club_id) {
          if (!currentUserId) return false;
          if (bm.user_id === currentUserId) return true;
          return userMemberships.has(bm.club_id);
        }
        return true;
      })
      .map((bm: any) => {
        const rawPostType: string = bm.post_type || "log";
        const postType: PostType =
          rawPostType === "reflection" ? "review" : (rawPostType as PostType);
        const bookData = bm.books as any;

        return {
          id: bm.id,
          userId: bm.user_id,
          username: profileMap.get(bm.user_id) || "Anonymous",
          textContent: bm.text_content || "",
          postType,
          progressType: (bm.progress_type as ProgressType) || "page",
          images: Array.isArray(bm.images) ? bm.images : [],
          book: bookData
            ? {
                id: bookData.id,
                title: bookData.title,
                author: bookData.author,
                coverUrl: bookData.cover_url,
                isbn: bookData.isbn,
                totalPages: bookData.total_pages || undefined,
              }
            : undefined,
          pageNumber: bm.page_number || undefined,
          pagesRead: pagesReadMap.get(bm.id) || undefined,
          rating: bm.rating != null ? Number(bm.rating) : undefined,
          quoteText: bm.quote_text || undefined,
          clubId: bm.club_id || undefined,
          clubName: bm.club_id ? clubsMap.get(bm.club_id) : undefined,
          visibility: (bm.visibility as BookmarkVisibility) || "public",
          createdAt: bm.created_at,
        };
      });
  } catch (error) {
    console.error("Error getting bookmarks:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getBookmarksByUserIds — for Friends feed
// ─────────────────────────────────────────────────────────────────────────────

export async function getPublicBookmarks(): Promise<Bookmark[]> {
  try {
    const { data: bookmarks, error } = await (supabase
      .from("bookmarks")
      .select(
        "id,user_id,text_content,post_type,progress_type,images,club_id,visibility,book_id,page_number,rating,quote_text,created_at,books(id,title,author,cover_url,isbn,total_pages),profiles(username)"
      ) as any)
      .eq("visibility", "public")
      .in("post_type", [...FEED_POST_TYPES])
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Storage] Error fetching public bookmarks:", error);
      return [];
    }

    return mapBookmarkRows((bookmarks || []).filter(isFeedPostRow));
  } catch (error) {
    console.error("Error getting public bookmarks:", error);
    return [];
  }
}

function mapBookmarkRows(bookmarks: any[]): Bookmark[] {
  return bookmarks.map((bm) => {
    const rawPostType: string = bm.post_type || "log";
    const postType: PostType = rawPostType === "reflection" ? "review" : (rawPostType as PostType);
    const bookData = bm.books as any;
    const username = bm.profiles?.username || "Anonymous";
    return {
      id: bm.id,
      userId: bm.user_id,
      username,
      textContent: bm.text_content || "",
      postType,
      progressType: (bm.progress_type as ProgressType) || "page",
      images: Array.isArray(bm.images) ? bm.images : [],
      book: bookData
        ? { id: bookData.id, title: bookData.title, author: bookData.author, coverUrl: bookData.cover_url, isbn: bookData.isbn, totalPages: bookData.total_pages || undefined }
        : undefined,
      pageNumber: bm.page_number || undefined,
      rating: bm.rating != null ? Number(bm.rating) : undefined,
      quoteText: bm.quote_text || undefined,
      clubId: bm.club_id || undefined,
      visibility: (bm.visibility as BookmarkVisibility) || "public",
      createdAt: bm.created_at,
    };
  });
}

export async function getBookmarksByUserIds(userIds: string[]): Promise<Bookmark[]> {
  if (userIds.length === 0) return [];
  try {
    const { data: bookmarks, error } = await (supabase
      .from("bookmarks")
      .select(
        "id,user_id,text_content,post_type,progress_type,images,club_id,visibility,book_id,page_number,rating,quote_text,created_at,books(id,title,author,cover_url,isbn,total_pages),profiles(username)"
      ) as any)
      .in("user_id", userIds)
      .eq("visibility", "public")
      .in("post_type", [...FEED_POST_TYPES])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Storage] Error fetching friends bookmarks:", error);
      return [];
    }

    return mapBookmarkRows((bookmarks || []).filter(isFeedPostRow));
  } catch (error) {
    console.error("Error getting friends bookmarks:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// saveBookmark
// ─────────────────────────────────────────────────────────────────────────────

export async function saveBookmark(
  userId: string,
  textContent: string,
  book: Book | null,
  pageNumber: number | null,
  progressType: ProgressType = "page",
  postType: PostType = "log",
  images: string[] = [],
  clubId?: string,
  visibility: BookmarkVisibility = "public",
  rating?: number,
  quoteText?: string
): Promise<Bookmark | null> {
  try {
    const imageUrls = await collectBookmarkImageUrls(images, userId);

    let pagesRead: number | undefined;
    let percentageDelta: number | undefined;

    if (book) {
      const { data: existingBook } = await supabase
        .from("books")
        .select("id, total_pages")
        .eq("id", book.id)
        .single();

      if (!existingBook) {
        await supabase.from("books").insert({
          id: book.id,
          title: book.title,
          author: book.author,
          cover_url: book.coverUrl || null,
          isbn: book.isbn || null,
          total_pages: book.totalPages || null,
        });
      } else if (!existingBook.total_pages && book.totalPages) {
        await supabase.from("books").update({ total_pages: book.totalPages }).eq("id", book.id);
      }

      if (pageNumber) {
        const prev = await getPreviousProgress(userId, book.id);
        if (progressType === "page") {
          pagesRead =
            prev.progressType === "page" && prev.pageNumber !== null
              ? Math.max(0, pageNumber - prev.pageNumber)
              : pageNumber;
        } else if (progressType === "percent") {
          if (prev.progressType === "percent" && prev.pageNumber !== null) {
            percentageDelta = Math.max(0, pageNumber - prev.pageNumber);
          }
        }
      }
    }

    const { data: bookmark, error: bookmarkError } = await supabase
      .from("bookmarks")
      .insert({
        user_id: userId,
        text_content: textContent,
        post_type: postType,
        progress_type: progressType,
        images: imageUrls,
        club_id: clubId || null,
        visibility,
        book_id: book?.id || null,
        page_number: pageNumber || null,
        rating: rating ?? null,
        quote_text: quoteText || null,
      })
      .select()
      .single();

    if (bookmarkError || !bookmark) {
      console.error("[Storage] Error creating bookmark:", bookmarkError);
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    return {
      id: bookmark.id,
      userId: bookmark.user_id,
      username: profile?.username || "Anonymous",
      textContent,
      postType,
      progressType,
      images: imageUrls,
      book: book || undefined,
      pageNumber: pageNumber || undefined,
      pagesRead,
      percentageDelta,
      rating,
      quoteText,
      clubId: clubId || undefined,
      visibility,
      createdAt: bookmark.created_at,
    };
  } catch (error) {
    console.error("Error saving bookmark:", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteBookmark
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteBookmark(bookmarkId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("bookmarks").delete().eq("id", bookmarkId);
    if (error) { console.error("Error deleting bookmark:", error); return false; }
    return true;
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getUserBookmarks
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserBookmarks(userId: string, currentUserId?: string): Promise<Bookmark[]> {
  try {
    const all = await getBookmarks(currentUserId || userId);
    return all.filter((b) => b.userId === userId);
  } catch (error) {
    console.error("Error getting user bookmarks:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getRecentBooks
// ─────────────────────────────────────────────────────────────────────────────

export async function getRecentBooks(userId: string): Promise<Book[]> {
  try {
    const { data, error } = await supabase
      .from("bookmarks")
      .select(`book_id, books(id, title, author, cover_url, isbn)`)
      .eq("user_id", userId)
      .not("book_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) { console.error("Error fetching recent books:", error); return []; }

    const bookMap = new Map<string, Book>();
    for (const bm of data || []) {
      const book = bm.books as any;
      if (book && !bookMap.has(book.id)) {
        bookMap.set(book.id, {
          id: book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.cover_url,
          isbn: book.isbn,
        });
      }
    }
    return Array.from(bookMap.values()).slice(0, 10);
  } catch (error) {
    console.error("Error getting recent books:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getBookBookmarks
// ─────────────────────────────────────────────────────────────────────────────

export async function getBookBookmarks(bookId: string, currentUserId?: string): Promise<Bookmark[]> {
  try {
    const all = await getBookmarks(currentUserId);
    return all.filter((b) => b.book?.id === bookId);
  } catch (error) {
    console.error("Error getting book bookmarks:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateBookmark
// ─────────────────────────────────────────────────────────────────────────────

export async function updateBookmark(bookmarkId: string, textContent: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("bookmarks")
      .update({ text_content: textContent })
      .eq("id", bookmarkId);
    if (error) { console.error("Error updating bookmark:", error); return false; }
    return true;
  } catch (error) {
    console.error("Error updating bookmark:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateBookmarkWithBook
// ─────────────────────────────────────────────────────────────────────────────

export async function updateBookmarkWithBook(
  bookmarkId: string,
  textContent: string,
  book: { id: string; title: string; author: string; coverUrl?: string | null; isbn?: string | null } | null,
  pageNumber: number | null
): Promise<boolean> {
  try {
    if (book) {
      await supabase.from("books").upsert(
        { id: book.id, title: book.title, author: book.author, cover_url: book.coverUrl, isbn: book.isbn },
        { onConflict: "id" }
      );
    }
    const { error } = await supabase
      .from("bookmarks")
      .update({ text_content: textContent, book_id: book?.id || null, page_number: pageNumber || null })
      .eq("id", bookmarkId);
    if (error) { console.error("Error updating bookmark:", error); return false; }
    return true;
  } catch (error) {
    console.error("Error updating bookmark:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateBookmarkFull
// ─────────────────────────────────────────────────────────────────────────────

export async function updateBookmarkFull(
  bookmarkId: string,
  userId: string,
  textContent: string,
  postType: PostType,
  progressType: ProgressType,
  images: string[],
  book: { id: string; title: string; author: string; coverUrl?: string | null; isbn?: string | null } | null,
  pageNumber: number | null,
  rating?: number,
  quoteText?: string
): Promise<boolean> {
  try {
    const imageUrls = await collectBookmarkImageUrls(images, userId);

    if (book) {
      await supabase.from("books").upsert(
        { id: book.id, title: book.title, author: book.author, cover_url: book.coverUrl, isbn: book.isbn },
        { onConflict: "id" }
      );
    }

    const { error } = await supabase
      .from("bookmarks")
      .update({
        text_content: textContent,
        post_type: postType,
        progress_type: progressType,
        images: imageUrls,
        book_id: book?.id || null,
        page_number: pageNumber || null,
        rating: rating ?? null,
        quote_text: quoteText || null,
      })
      .eq("id", bookmarkId);
    if (error) { console.error("Error updating bookmark:", error); return false; }
    return true;
  } catch (error) {
    console.error("Error updating bookmark:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Engagement (likes / comments)
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleLike(
  bookmarkId: string,
  userId: string
): Promise<{ liked: boolean; count: number }> {
  try {
    const { data: existing } = await supabase
      .from("bookmark_likes")
      .select("id")
      .eq("bookmark_id", bookmarkId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      await supabase.from("bookmark_likes").delete().eq("id", existing.id);
    } else {
      await supabase.from("bookmark_likes").insert({ bookmark_id: bookmarkId, user_id: userId });
    }

    const { count } = await supabase
      .from("bookmark_likes")
      .select("*", { count: "exact", head: true })
      .eq("bookmark_id", bookmarkId);

    return { liked: !existing, count: count || 0 };
  } catch (error) {
    console.error("Error toggling like:", error);
    return { liked: false, count: 0 };
  }
}

export async function getBookmarkEngagement(
  bookmarkId: string,
  userId?: string
): Promise<{ likesCount: number; commentsCount: number; isLikedByUser: boolean }> {
  try {
    const [{ count: likesCount }, { count: commentsCount }] = await Promise.all([
      supabase.from("bookmark_likes").select("*", { count: "exact", head: true }).eq("bookmark_id", bookmarkId),
      supabase.from("bookmark_comments").select("*", { count: "exact", head: true }).eq("bookmark_id", bookmarkId),
    ]);

    let isLikedByUser = false;
    if (userId) {
      const { data } = await supabase
        .from("bookmark_likes")
        .select("id")
        .eq("bookmark_id", bookmarkId)
        .eq("user_id", userId)
        .single();
      isLikedByUser = !!data;
    }

    return { likesCount: likesCount || 0, commentsCount: commentsCount || 0, isLikedByUser };
  } catch (error) {
    console.error("Error getting engagement:", error);
    return { likesCount: 0, commentsCount: 0, isLikedByUser: false };
  }
}

export async function addComment(
  bookmarkId: string,
  userId: string,
  textContent: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("bookmark_comments")
      .insert({ bookmark_id: bookmarkId, user_id: userId, content: textContent });
    if (error) { console.error("Error adding comment:", error); return false; }
    return true;
  } catch (error) {
    console.error("Error adding comment:", error);
    return false;
  }
}

export async function getBookmarkComments(
  bookmarkId: string
): Promise<{ id: string; userId: string; username: string; textContent: string; createdAt: string }[]> {
  try {
    const { data: comments, error } = await supabase
      .from("bookmark_comments")
      .select("id, user_id, content, created_at")
      .eq("bookmark_id", bookmarkId)
      .order("created_at", { ascending: true });

    if (error) { console.error("Error fetching comments:", error); return []; }

    const { data: profiles } = await supabase.from("profiles").select("id, username");
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));

    return (comments || []).map((c: any) => ({
      id: c.id,
      userId: c.user_id,
      username: profileMap.get(c.user_id) || "Anonymous",
      textContent: c.content,
      createdAt: c.created_at,
    }));
  } catch (error) {
    console.error("Error getting comments:", error);
    return [];
  }
}

export async function updateComment(commentId: string, textContent: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("bookmark_comments")
      .update({ content: textContent })
      .eq("id", commentId);
    if (error) { console.error("Error updating comment:", error); return false; }
    return true;
  } catch (error) {
    console.error("Error updating comment:", error);
    return false;
  }
}

export async function deleteComment(commentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("bookmark_comments")
      .delete()
      .eq("id", commentId);
    if (error) { console.error("Error deleting comment:", error); return false; }
    return true;
  } catch (error) {
    console.error("Error deleting comment:", error);
    return false;
  }
}
