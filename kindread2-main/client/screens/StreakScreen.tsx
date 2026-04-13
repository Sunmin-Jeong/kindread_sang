import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft } from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "StreakStats">;

const GREEN = "#16A06A";
const MUTED = "#6E6E6E";
const BORDER = "rgba(0,0,0,0.06)";
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function computeCurrentStreak(createdAts: string[]): number {
  const daySet = new Set(createdAts.map((d) => formatDateKey(new Date(d))));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (daySet.has(formatDateKey(d))) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function computeBestStreak(createdAts: string[]): number {
  if (!createdAts.length) return 0;
  const daySet = new Set(createdAts.map((d) => formatDateKey(new Date(d))));
  const sorted = Array.from(daySet).sort();
  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

function buildCalendar(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const startPad = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function toWeeks(days: (number | null)[]): (number | null)[][] {
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (const d of days) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

interface UserStreak {
  userId: string;
  username: string;
  streak: number;
  isMe: boolean;
}

const MILESTONES = [
  { emoji: "🌱", label: "First week", days: 7 },
  { emoji: "🌿", label: "Two weeks", days: 14 },
  { emoji: "🌳", label: "One month", days: 30 },
  { emoji: "🏔", label: "One hundred days", days: 100 },
];

export default function StreakScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProps>();
  const { streakDays: initialStreak } = route.params;

  const [loading, setLoading] = useState(true);
  const [myCreatedAts, setMyCreatedAts] = useState<string[]>([]);
  const [streak, setStreak] = useState(initialStreak);
  const [bestStreak, setBestStreak] = useState(initialStreak);
  const [daysRead, setDaysRead] = useState(0);
  const [readingSince, setReadingSince] = useState<string | null>(null);
  const [userStreaks, setUserStreaks] = useState<UserStreak[]>([]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select("id, created_at, user_id")
        .order("created_at", { ascending: false });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username");

      if (!bookmarks) return;

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));

      const myDates = bookmarks.filter((b: any) => b.user_id === user?.id).map((b: any) => b.created_at as string);

      const currentStreak = computeCurrentStreak(myDates);
      const best = computeBestStreak(myDates);

      const thisMonthDays = new Set(
        myDates.filter((d) => {
          const date = new Date(d);
          return date.getFullYear() === year && date.getMonth() === month;
        }).map((d) => new Date(d).getDate())
      );

      const earliestDate = myDates.length
        ? new Date(myDates[myDates.length - 1]).toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : null;

      setMyCreatedAts(myDates);
      setStreak(currentStreak);
      setBestStreak(best);
      setDaysRead(thisMonthDays.size);
      setReadingSince(earliestDate);

      // Compute per-user streaks
      const grouped = new Map<string, string[]>();
      for (const b of bookmarks as any[]) {
        if (!grouped.has(b.user_id)) grouped.set(b.user_id, []);
        grouped.get(b.user_id)!.push(b.created_at);
      }

      const allStreaks: UserStreak[] = [];
      grouped.forEach((dates, uid) => {
        const s = computeCurrentStreak(dates);
        if (s > 0) {
          allStreaks.push({
            userId: uid,
            username: profileMap.get(uid) || "User",
            streak: s,
            isMe: uid === user?.id,
          });
        }
      });
      allStreaks.sort((a, b) => b.streak - a.streak);
      setUserStreaks(allStreaks);
    } catch (e) {
      console.error("StreakScreen error:", e);
    } finally {
      setLoading(false);
    }
  }

  const calendarDays = buildCalendar(year, month);
  const weeks = toWeeks(calendarDays);

  const loggedDaySet = new Set(
    myCreatedAts
      .filter((d) => {
        const date = new Date(d);
        return date.getFullYear() === year && date.getMonth() === month;
      })
      .map((d) => new Date(d).getDate())
  );

  const maxStreak = userStreaks.length > 0 ? userStreaks[0].streak : 1;

  const monthName = now.toLocaleString("en-US", { month: "long" });

  return (
    <View style={[styles.root, { backgroundColor: "#FFFFFF" }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top, borderBottomColor: BORDER }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <ChevronLeft size={22} color={theme.text} strokeWidth={2} />
        </Pressable>
        <ThemedText style={[styles.topBarTitle, { color: theme.text }]}>Reading Streak</ThemedText>
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
            <ThemedText style={styles.heroEmoji}>🔥</ThemedText>
            <ThemedText style={[styles.heroNumber, { color: theme.text }]} serif>{streak}</ThemedText>
            <ThemedText style={[styles.heroLabel, { color: MUTED }]}>day streak</ThemedText>
            <View style={[styles.heroStats, { borderTopColor: BORDER }]}>
              <View style={styles.heroStat}>
                <ThemedText style={[styles.heroStatNum, { color: theme.text }]} serif>{bestStreak}</ThemedText>
                <ThemedText style={[styles.heroStatLabel, { color: MUTED }]}>best streak</ThemedText>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: BORDER }]} />
              <View style={styles.heroStat}>
                <ThemedText style={[styles.heroStatNum, { color: theme.text }]} serif>{daysRead}</ThemedText>
                <ThemedText style={[styles.heroStatLabel, { color: MUTED }]}>days read</ThemedText>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: BORDER }]} />
              <View style={styles.heroStat}>
                <ThemedText style={[styles.heroStatNum, { color: theme.text }]} serif numberOfLines={1}>
                  {readingSince || "—"}
                </ThemedText>
                <ThemedText style={[styles.heroStatLabel, { color: MUTED }]}>reading since</ThemedText>
              </View>
            </View>
          </View>

          {/* Calendar */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>{monthName.toUpperCase()}</ThemedText>
            <View style={styles.calendarHeader}>
              {DAY_LABELS.map((d, i) => (
                <View key={i} style={styles.calDayHeader}>
                  <ThemedText style={[styles.calDayHeaderText, { color: MUTED }]}>{d}</ThemedText>
                </View>
              ))}
            </View>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.calWeekRow}>
                {week.map((day, di) => {
                  const isNull = day === null;
                  const hasLog = day !== null && loggedDaySet.has(day);
                  const isToday = day === today;
                  const isFuture = day !== null && day > today;
                  return (
                    <View key={di} style={styles.calDayCell}>
                      {isNull ? null : (
                        <View
                          style={[
                            styles.calCircle,
                            hasLog && { backgroundColor: GREEN },
                            isToday && !hasLog && { borderWidth: 1.5, borderColor: GREEN },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.calDayNum,
                              hasLog && { color: "#FFFFFF" },
                              isToday && !hasLog && { color: GREEN },
                              isFuture && { color: "#DDDDDD" },
                              !hasLog && !isToday && !isFuture && { color: theme.text },
                            ]}
                          >
                            {day}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Friends streaks */}
          {userStreaks.length > 0 ? (
            <View style={[styles.section, { borderTopColor: BORDER, borderTopWidth: 1 }]}>
              <ThemedText style={styles.sectionLabel}>FRIENDS' STREAKS</ThemedText>
              {userStreaks.slice(0, 10).map((us) => (
                <View key={us.userId} style={styles.friendRow}>
                  <View style={[styles.friendAvatar, { backgroundColor: us.isMe ? GREEN : theme.backgroundSecondary }]}>
                    <ThemedText style={[styles.friendAvatarText, { color: us.isMe ? "#FFFFFF" : theme.text }]}>
                      {us.username.slice(0, 2).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={styles.friendInfo}>
                    <View style={styles.friendNameRow}>
                      <ThemedText style={[styles.friendName, { color: theme.text }]}>{us.username}</ThemedText>
                      {us.isMe ? (
                        <View style={styles.meBadge}>
                          <ThemedText style={styles.meBadgeText}>me</ThemedText>
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.friendBarBg, { backgroundColor: BORDER }]}>
                      <View
                        style={[
                          styles.friendBarFill,
                          {
                            width: `${Math.round((us.streak / maxStreak) * 100)}%`,
                            backgroundColor: us.isMe ? GREEN : "#AAAAAA",
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <ThemedText style={[styles.friendStreakNum, { color: us.isMe ? GREEN : theme.text }]} serif>
                    {us.streak}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {/* Milestones */}
          <View style={[styles.section, { borderTopColor: BORDER, borderTopWidth: 1 }]}>
            <ThemedText style={styles.sectionLabel}>MILESTONES</ThemedText>
            {MILESTONES.map((m) => {
              const unlocked = bestStreak >= m.days;
              return (
                <View key={m.days} style={[styles.milestoneRow, { opacity: unlocked ? 1 : 0.45 }]}>
                  <ThemedText style={styles.milestoneEmoji}>{m.emoji}</ThemedText>
                  <View style={styles.milestoneInfo}>
                    <ThemedText style={[styles.milestoneName, { color: theme.text }]}>{m.label}</ThemedText>
                    <ThemedText style={[styles.milestoneDesc, { color: MUTED }]}>
                      {unlocked
                        ? `${m.days} days`
                        : `${m.days - bestStreak} more days to go`}
                    </ThemedText>
                  </View>
                  {unlocked ? (
                    <ThemedText style={styles.milestoneCheck}>✓</ThemedText>
                  ) : (
                    <ThemedText style={[styles.milestoneLock, { color: MUTED }]}>{m.days}d</ThemedText>
                  )}
                </View>
              );
            })}
          </View>

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
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  heroEmoji: { fontSize: 48, marginBottom: 6 },
  heroNumber: { fontSize: 56, fontWeight: "700", lineHeight: 64 },
  heroLabel: { fontSize: 13, marginTop: 2, marginBottom: 20 },
  heroStats: {
    flexDirection: "row",
    width: "100%",
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 4,
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

  calendarHeader: {
    flexDirection: "row",
    marginBottom: 6,
  },
  calDayHeader: {
    flex: 1,
    alignItems: "center",
  },
  calDayHeaderText: {
    fontSize: 11,
    fontWeight: "500",
  },
  calWeekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  calDayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 2,
  },
  calCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  calDayNum: {
    fontSize: 12,
    fontWeight: "500",
  },

  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  friendAvatarText: {
    fontSize: 11,
    fontWeight: "600",
  },
  friendInfo: { flex: 1, gap: 4 },
  friendNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  friendName: { fontSize: 13, fontWeight: "500" },
  meBadge: {
    backgroundColor: "#E8F3ED",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  meBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: GREEN,
  },
  friendBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  friendBarFill: {
    height: 4,
    borderRadius: 2,
  },
  friendStreakNum: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 28,
    textAlign: "right",
  },

  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  milestoneEmoji: { fontSize: 28, width: 36, textAlign: "center" },
  milestoneInfo: { flex: 1 },
  milestoneName: { fontSize: 14, fontWeight: "600" },
  milestoneDesc: { fontSize: 12, marginTop: 1 },
  milestoneCheck: { fontSize: 16, color: GREEN, fontWeight: "700" },
  milestoneLock: { fontSize: 12 },
});
