import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft } from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "BooksThisMonth">;

const GREEN = "#16A06A";
const MUTED = "#6E6E6E";
const BORDER = "rgba(0,0,0,0.06)";
const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface BookEntry {
  bookId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  totalPages?: number;
  latestPage?: number;
  latestProgressType?: string;
  latestDate: string;
  rating?: number;
}

interface UserBookCount {
  userId: string;
  username: string;
  count: number;
  isMe: boolean;
}

const META_PREFIX = "<!--meta:";
const META_SUFFIX = ":meta-->\n";

function decodeMeta(raw: string): { rating?: number } {
  if (!raw || !raw.startsWith(META_PREFIX)) return {};
  const endIdx = raw.indexOf(META_SUFFIX);
  if (endIdx === -1) return {};
  try {
    const metaStr = raw.substring(META_PREFIX.length, endIdx);
    return JSON.parse(metaStr) || {};
  } catch {
    return {};
  }
}

export default function BooksThisMonthScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProps>();
  const { booksThisMonth: initialCount } = route.params;

  const [loading, setLoading] = useState(true);
  const [booksCount, setBooksCount] = useState(initialCount);
  const [pagesRead, setPagesRead] = useState(0);
  const [daysRead, setDaysRead] = useState(0);
  const [dailyAvg, setDailyAvg] = useState(0);
  const [monthlyBooks, setMonthlyBooks] = useState<number[]>(new Array(12).fill(0));
  const [activeBooks, setActiveBooks] = useState<BookEntry[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<BookEntry[]>([]);
  const [userCounts, setUserCounts] = useState<UserBookCount[]>([]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString("en-US", { month: "long" });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select(`
          id,
          created_at,
          user_id,
          text_content,
          book_id,
          page_number,
          progress_type,
          books (
            id,
            title,
            author,
            cover_url,
            total_pages
          )
        `)
        .order("created_at", { ascending: false });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username");

      if (!bookmarks) return;

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));

      const myBookmarks = (bookmarks as any[]).filter((b) => b.user_id === user?.id);

      // --- Stats for this month ---
      const thisMonthMy = myBookmarks.filter((b) => {
        const d = new Date(b.created_at);
        return d.getFullYear() === year && d.getMonth() === month;
      });

      const uniqueBooksThisMonth = new Set(thisMonthMy.filter((b) => b.book_id).map((b) => b.book_id));
      setBooksCount(uniqueBooksThisMonth.size);

      const distinctDates = new Set(thisMonthMy.map((b) => formatDateKey(new Date(b.created_at))));
      const daysReadCount = distinctDates.size;
      setDaysRead(daysReadCount);

      // Compute pages read this month (using delta logic)
      const userBookProgress = new Map<string, number>();
      const allSorted = [...myBookmarks].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      let totalPages = 0;
      for (const bm of allSorted) {
        if (bm.book_id && bm.page_number && bm.progress_type !== "percent") {
          const key = bm.book_id;
          const prev = userBookProgress.get(key) || 0;
          const delta = bm.page_number - prev;
          const d = new Date(bm.created_at);
          if (delta > 0 && d.getFullYear() === year && d.getMonth() === month) {
            totalPages += delta;
          }
          userBookProgress.set(key, bm.page_number);
        }
      }
      setPagesRead(totalPages);
      setDailyAvg(daysReadCount > 0 ? Math.round(totalPages / daysReadCount) : 0);

      // --- Year at a glance ---
      const perMonth = new Array(12).fill(0);
      for (let m = 0; m < 12; m++) {
        const monthBms = myBookmarks.filter((b) => {
          const d = new Date(b.created_at);
          return d.getFullYear() === year && d.getMonth() === m && b.book_id;
        });
        perMonth[m] = new Set(monthBms.map((b) => b.book_id)).size;
      }
      setMonthlyBooks(perMonth);

      // --- Books active this month (shown in "Finished this month") ---
      const latestByBook = new Map<string, any>();
      for (const bm of myBookmarks as any[]) {
        if (!bm.book_id || !bm.books) continue;
        const d = new Date(bm.created_at);
        if (d.getFullYear() !== year || d.getMonth() !== month) continue;
        if (!latestByBook.has(bm.book_id)) {
          latestByBook.set(bm.book_id, bm);
        }
      }

      const bookEntries: BookEntry[] = [];
      const reading: BookEntry[] = [];

      latestByBook.forEach((bm, bookId) => {
        const meta = decodeMeta(bm.text_content || "");
        const entry: BookEntry = {
          bookId,
          title: bm.books.title,
          author: bm.books.author,
          coverUrl: bm.books.cover_url,
          totalPages: bm.books.total_pages,
          latestPage: bm.page_number,
          latestProgressType: bm.progress_type,
          latestDate: bm.created_at,
          rating: meta.rating,
        };

        const isFinished =
          (bm.progress_type === "percent" && bm.page_number >= 100) ||
          (bm.progress_type !== "percent" && bm.books.total_pages && bm.page_number >= bm.books.total_pages);

        if (isFinished) {
          bookEntries.push(entry);
        } else {
          reading.push(entry);
        }
      });

      setActiveBooks(bookEntries);
      setCurrentlyReading(reading);

      // --- Friends comparison ---
      const grouped = new Map<string, Set<string>>();
      for (const bm of bookmarks as any[]) {
        if (!bm.book_id) continue;
        const d = new Date(bm.created_at);
        if (d.getFullYear() !== year || d.getMonth() !== month) continue;
        if (!grouped.has(bm.user_id)) grouped.set(bm.user_id, new Set());
        grouped.get(bm.user_id)!.add(bm.book_id);
      }

      const counts: UserBookCount[] = [];
      grouped.forEach((books, uid) => {
        counts.push({
          userId: uid,
          username: profileMap.get(uid) || "User",
          count: books.size,
          isMe: uid === user?.id,
        });
      });
      counts.sort((a, b) => b.count - a.count);
      setUserCounts(counts);
    } catch (e) {
      console.error("BooksThisMonthScreen error:", e);
    } finally {
      setLoading(false);
    }
  }

  const maxMonthly = Math.max(...monthlyBooks, 1);
  const myCount = userCounts.find((u) => u.isMe)?.count || 0;

  function formatFinishedDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function getProgressPercent(entry: BookEntry): number {
    if (!entry.latestPage) return 0;
    if (entry.latestProgressType === "percent") return Math.min(entry.latestPage, 100);
    if (entry.totalPages) return Math.min(Math.round((entry.latestPage / entry.totalPages) * 100), 100);
    return 0;
  }

  return (
    <View style={[styles.root, { backgroundColor: "#FFFFFF" }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top, borderBottomColor: BORDER }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <ChevronLeft size={22} color={theme.text} strokeWidth={2} />
        </Pressable>
        <ThemedText style={[styles.topBarTitle, { color: theme.text }]}>{`${monthName} ${year}`}</ThemedText>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={GREEN} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={[styles.hero, { borderBottomColor: BORDER }]}>
            <ThemedText style={[styles.heroNumber, { color: theme.text }]} serif>{booksCount}</ThemedText>
            <ThemedText style={[styles.heroLabel, { color: MUTED }]}>books this month</ThemedText>
            <View style={[styles.heroStats, { borderTopColor: BORDER }]}>
              <View style={styles.heroStat}>
                <ThemedText style={[styles.heroStatNum, { color: theme.text }]} serif>{pagesRead}</ThemedText>
                <ThemedText style={[styles.heroStatLabel, { color: MUTED }]}>pages read</ThemedText>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: BORDER }]} />
              <View style={styles.heroStat}>
                <ThemedText style={[styles.heroStatNum, { color: theme.text }]} serif>{daysRead}</ThemedText>
                <ThemedText style={[styles.heroStatLabel, { color: MUTED }]}>days read</ThemedText>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: BORDER }]} />
              <View style={styles.heroStat}>
                <ThemedText style={[styles.heroStatNum, { color: theme.text }]} serif>{dailyAvg}</ThemedText>
                <ThemedText style={[styles.heroStatLabel, { color: MUTED }]}>daily avg pages</ThemedText>
              </View>
            </View>
          </View>

          {/* Year at a glance */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>{`${year} AT A GLANCE`}</ThemedText>
            <View style={styles.yearGrid}>
              {MONTH_LABELS.map((label, i) => {
                const count = monthlyBooks[i];
                const fillPct = count > 0 ? count / maxMonthly : 0;
                const isCurrent = i === month;
                return (
                  <View key={i} style={styles.yearCell}>
                    <View style={styles.yearBarContainer}>
                      <View
                        style={[
                          styles.yearBarBg,
                          isCurrent && { borderWidth: 1.5, borderColor: GREEN },
                        ]}
                      >
                        {fillPct > 0 ? (
                          <View
                            style={[
                              styles.yearBarFill,
                              { height: `${Math.round(fillPct * 100)}%` },
                            ]}
                          />
                        ) : null}
                      </View>
                    </View>
                    <ThemedText
                      style={[styles.yearCellLabel, { color: isCurrent ? GREEN : i > month ? "#CCCCCC" : MUTED }]}
                    >
                      {label}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Finished this month */}
          {activeBooks.length > 0 ? (
            <View style={[styles.section, { borderTopColor: BORDER, borderTopWidth: 1 }]}>
              <ThemedText style={styles.sectionLabel}>FINISHED THIS MONTH</ThemedText>
              {activeBooks.map((book, idx) => (
                <View key={book.bookId} style={styles.bookRow}>
                  <ThemedText style={[styles.bookIndex, { color: "#CCCCCC" }]} serif>
                    {String(idx + 1).padStart(2, "0")}
                  </ThemedText>
                  {book.coverUrl ? (
                    <Image source={{ uri: book.coverUrl }} style={styles.bookCover} contentFit="cover" />
                  ) : (
                    <View style={[styles.bookCoverPlaceholder, { backgroundColor: "#F0F0F0" }]} />
                  )}
                  <View style={styles.bookInfo}>
                    <ThemedText style={[styles.bookTitle, { color: theme.text }]} numberOfLines={2}>{book.title}</ThemedText>
                    <ThemedText style={[styles.bookAuthor, { color: MUTED }]} numberOfLines={1}>{book.author}</ThemedText>
                    {book.rating && book.rating > 0 ? (
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <ThemedText key={i} style={[styles.star, { color: i <= book.rating! ? "#F59E0B" : "#E5E5EA" }]}>★</ThemedText>
                        ))}
                      </View>
                    ) : null}
                    <ThemedText style={[styles.bookDate, { color: MUTED }]}>
                      Finished {formatFinishedDate(book.latestDate)}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Currently reading */}
          {currentlyReading.length > 0 ? (
            <View style={[styles.section, { borderTopColor: BORDER, borderTopWidth: 1 }]}>
              <ThemedText style={styles.sectionLabel}>READING NOW</ThemedText>
              {currentlyReading.map((book) => {
                const pct = getProgressPercent(book);
                const progressLabel = book.latestProgressType === "percent"
                  ? `${book.latestPage}%`
                  : book.latestPage && book.totalPages
                  ? `${pct}% · p.${book.latestPage} of ${book.totalPages}p`
                  : book.latestPage
                  ? `p.${book.latestPage}`
                  : null;
                return (
                  <View key={book.bookId} style={[styles.readingCard, { backgroundColor: "#F8F8F8" }]}>
                    {book.coverUrl ? (
                      <Image source={{ uri: book.coverUrl }} style={styles.readingCover} contentFit="cover" />
                    ) : (
                      <View style={[styles.readingCoverPlaceholder, { backgroundColor: "#E8E8E8" }]} />
                    )}
                    <View style={styles.readingInfo}>
                      <ThemedText style={[styles.bookTitle, { color: theme.text }]} numberOfLines={2}>{book.title}</ThemedText>
                      <ThemedText style={[styles.bookAuthor, { color: MUTED }]} numberOfLines={1}>{book.author}</ThemedText>
                      {pct > 0 ? (
                        <View style={styles.readingProgressWrapper}>
                          <View style={[styles.readingProgressBg, { backgroundColor: BORDER }]}>
                            <View style={[styles.readingProgressFill, { width: `${pct}%` }]} />
                          </View>
                          {progressLabel ? (
                            <ThemedText style={[styles.readingProgressLabel, { color: GREEN }]}>{progressLabel}</ThemedText>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Friends comparison */}
          {userCounts.length > 0 ? (
            <View style={[styles.section, { borderTopColor: BORDER, borderTopWidth: 1 }]}>
              <ThemedText style={styles.sectionLabel}>FRIENDS THIS MONTH</ThemedText>
              {userCounts.slice(0, 10).map((uc) => {
                const diff = uc.count - myCount;
                const isAhead = !uc.isMe && diff > 0;
                const isBehind = !uc.isMe && diff < 0;
                return (
                  <View key={uc.userId} style={styles.friendRow}>
                    <View style={[styles.friendAvatar, { backgroundColor: uc.isMe ? GREEN : "#F0F0F0" }]}>
                      <ThemedText style={[styles.friendAvatarText, { color: uc.isMe ? "#FFFFFF" : theme.text }]}>
                        {uc.username.slice(0, 2).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.friendNameWrap}>
                      <ThemedText style={[styles.friendName, { color: theme.text }]}>{uc.username}</ThemedText>
                      {uc.isMe ? (
                        <View style={styles.meBadge}>
                          <ThemedText style={styles.meBadgeText}>me</ThemedText>
                        </View>
                      ) : null}
                    </View>
                    <ThemedText style={[styles.friendBooks, { color: theme.text }]} serif>{uc.count}</ThemedText>
                    <ThemedText style={[styles.friendBookLabel, { color: MUTED }]}> books</ThemedText>
                    {isAhead ? (
                      <ThemedText style={[styles.compLabel, { color: GREEN }]}>{`+${diff} ahead`}</ThemedText>
                    ) : isBehind ? (
                      <ThemedText style={[styles.compLabel, { color: MUTED }]}>—</ThemedText>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={{ height: insets.bottom + 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  topBarTitle: { fontSize: 16, fontWeight: "600" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },

  hero: {
    alignItems: "center",
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  heroNumber: { fontSize: 64, fontWeight: "700", lineHeight: 72 },
  heroLabel: { fontSize: 13, marginTop: 4, marginBottom: 20 },
  heroStats: {
    flexDirection: "row",
    width: "100%",
    borderTopWidth: 1,
    paddingTop: 16,
  },
  heroStat: { flex: 1, alignItems: "center", gap: 3 },
  heroStatNum: { fontSize: 20, fontWeight: "700" },
  heroStatLabel: { fontSize: 11, textAlign: "center" },
  heroStatDivider: { width: 1, height: 36, alignSelf: "center" },

  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: "#999999",
    marginBottom: 14,
  },

  yearGrid: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 80,
  },
  yearCell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    height: "100%",
    justifyContent: "flex-end",
  },
  yearBarContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  yearBarBg: {
    flex: 1,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
    justifyContent: "flex-end",
  },
  yearBarFill: {
    width: "100%",
    backgroundColor: GREEN,
    borderRadius: 3,
  },
  yearCellLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },

  bookRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
  },
  bookIndex: {
    fontSize: 20,
    fontWeight: "700",
    width: 28,
    paddingTop: 4,
  },
  bookCover: {
    width: 44,
    height: 62,
    borderRadius: 4,
  },
  bookCoverPlaceholder: {
    width: 44,
    height: 62,
    borderRadius: 4,
  },
  bookInfo: { flex: 1, gap: 2 },
  bookTitle: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  bookAuthor: { fontSize: 12 },
  starsRow: { flexDirection: "row", gap: 1 },
  star: { fontSize: 13 },
  bookDate: { fontSize: 11, marginTop: 2 },

  readingCard: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 12,
    gap: 12,
    marginBottom: 10,
  },
  readingCover: {
    width: 44,
    height: 62,
    borderRadius: 4,
  },
  readingCoverPlaceholder: {
    width: 44,
    height: 62,
    borderRadius: 4,
  },
  readingInfo: { flex: 1, gap: 3 },
  readingProgressWrapper: { marginTop: 6, gap: 3 },
  readingProgressBg: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  readingProgressFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: GREEN,
  },
  readingProgressLabel: { fontSize: 11, fontWeight: "600" },

  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  friendAvatarText: { fontSize: 11, fontWeight: "600" },
  friendNameWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  friendName: { fontSize: 13, fontWeight: "500" },
  meBadge: {
    backgroundColor: "#E8F3ED",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  meBadgeText: { fontSize: 10, fontWeight: "600", color: GREEN },
  friendBooks: { fontSize: 16, fontWeight: "700" },
  friendBookLabel: { fontSize: 12 },
  compLabel: { fontSize: 12, fontWeight: "500", marginLeft: 2 },
});
