import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, MapPin, Monitor, BookOpen, Users } from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { getAllClubs, getUserClubs } from "@/lib/club-storage";
import type { Club, ClubFormat } from "@/types";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const GREEN = "#2A7A52";
const GREEN_BG = "#E8F3ED";
const PURPLE = "#7C3AED";
const PURPLE_BG = "#F3F0FF";
const BORDER = "#EBEBEB";
const MUTED = "#777777";

type Tab = "mine" | "discover";

function daysUntil(dateStr?: string): string | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "Passed";
  if (diff === 0) return "Today";
  return `D-${diff}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatLabel(format?: ClubFormat) {
  switch (format) {
    case "offline": return { icon: "📍", label: "Offline" };
    case "read_along": return { icon: "📖", label: "Read-along" };
    default: return { icon: "🖥", label: "Online" };
  }
}

function AvatarStack({ count }: { count: number }) {
  const shown = Math.min(count, 3);
  return (
    <View style={styles.avatarStack}>
      {Array.from({ length: shown }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.avatarCircle,
            { backgroundColor: i % 2 === 0 ? "#D8E8F0" : "#E8D8F0", marginLeft: i > 0 ? -6 : 0, zIndex: shown - i },
          ]}
        />
      ))}
      <ThemedText style={styles.memberCountText}>{count}</ThemedText>
    </View>
  );
}

function SessionCard({ club, onPress }: { club: Club; onPress: () => void }) {
  const fmt = formatLabel(club.format);
  const dDay = daysUntil(club.meetDate);
  return (
    <Pressable style={[styles.card, { borderColor: BORDER }]} onPress={onPress}>
      <View style={styles.cardLeft}>
        {club.imageUrl ? (
          <Image source={{ uri: club.imageUrl }} style={styles.cardCover} contentFit="cover" />
        ) : (
          <View style={[styles.cardCoverPlaceholder, { backgroundColor: PURPLE_BG }]}>
            <ThemedText style={{ fontSize: 22 }}>📚</ThemedText>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <ThemedText style={styles.cardName} numberOfLines={1}>{club.name}</ThemedText>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: PURPLE_BG }]}>
            <ThemedText style={[styles.badgeText, { color: PURPLE }]}>Session</ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: "#F5F5F5" }]}>
            <ThemedText style={styles.badgeTextMuted}>{fmt.icon} {fmt.label}</ThemedText>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <AvatarStack count={club.memberCount} />
          {dDay ? (
            <View style={styles.dDayRight}>
              <ThemedText style={[styles.dDay, { color: PURPLE }]}>{dDay}</ThemedText>
              {club.meetDate ? (
                <ThemedText style={[styles.dDate, { color: MUTED }]}>{formatDate(club.meetDate)}</ThemedText>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function ClubCard({ club, onPress }: { club: Club; onPress: () => void }) {
  const fmt = formatLabel(club.format);
  const dDay = daysUntil(club.meetDate);
  return (
    <Pressable style={[styles.card, { borderColor: BORDER }]} onPress={onPress}>
      <View style={styles.cardLeft}>
        {club.imageUrl ? (
          <Image source={{ uri: club.imageUrl }} style={styles.cardCover} contentFit="cover" />
        ) : (
          <View style={[styles.cardCoverPlaceholder, { backgroundColor: GREEN_BG }]}>
            <ThemedText style={{ fontSize: 22 }}>🌿</ThemedText>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <ThemedText style={styles.cardName} numberOfLines={1}>{club.name}</ThemedText>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: GREEN_BG }]}>
            <ThemedText style={[styles.badgeText, { color: GREEN }]}>Club</ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: "#F5F5F5" }]}>
            <ThemedText style={styles.badgeTextMuted}>{fmt.icon} {fmt.label}</ThemedText>
          </View>
          {(club.sessionNumber || 1) > 1 ? (
            <View style={[styles.badge, { backgroundColor: "#F5F5F5" }]}>
              <ThemedText style={styles.badgeTextMuted}>Session {club.sessionNumber}</ThemedText>
            </View>
          ) : null}
        </View>
        <View style={styles.cardBottom}>
          <AvatarStack count={club.memberCount} />
          {dDay ? (
            <View style={styles.dDayRight}>
              <ThemedText style={[styles.dDay, { color: GREEN }]}>{dDay}</ThemedText>
              {club.meetDate ? (
                <ThemedText style={[styles.dDate, { color: MUTED }]}>{formatDate(club.meetDate)}</ThemedText>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function ClubsListScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [tab, setTab] = useState<Tab>("mine");
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [mine, all] = await Promise.all([
        user?.id ? getUserClubs(user.id) : Promise.resolve([]),
        getAllClubs(),
      ]);
      setMyClubs(mine);
      setAllClubs(all);
    } catch (e) {
      console.error("ClubsListScreen error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleClubPress = (club: Club) => {
    if (club.type === "session") {
      navigation.navigate("SessionDetail", { clubId: club.id });
    } else {
      navigation.navigate("ClubHome", { clubId: club.id });
    }
  };

  const displayData = tab === "mine" ? myClubs : allClubs;

  const renderItem = ({ item }: { item: Club }) => {
    if (item.type === "session") {
      return <SessionCard club={item} onPress={() => handleClubPress(item)} />;
    }
    return <ClubCard club={item} onPress={() => handleClubPress(item)} />;
  };

  return (
    <View style={[styles.root, { backgroundColor: "#FFFFFF" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: BORDER }]}>
        <ThemedText style={styles.headerTitle} serif>Clubs</ThemedText>
        <Pressable
          style={styles.createBtn}
          onPress={() => navigation.navigate("CreateClubFlow")}
        >
          <Plus size={18} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: BORDER }]}>
        {(["mine", "discover"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabItem, tab === t && { borderBottomColor: theme.text }]}
            onPress={() => setTab(t)}
          >
            <ThemedText
              style={[styles.tabLabel, { color: tab === t ? theme.text : MUTED }, tab === t && styles.tabLabelActive]}
            >
              {t === "mine" ? "Mine" : "Discover"}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={GREEN} />
        </View>
      ) : (
        <FlatList
          data={displayData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={GREEN} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <ThemedText style={[styles.emptyText, { color: MUTED }]}>
                {tab === "mine" ? "You haven't joined any clubs yet." : "No clubs found."}
              </ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "600",
    color: "#0A0A0A",
  },
  createBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  tabItem: {
    paddingVertical: 11,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "400",
  },
  tabLabelActive: {
    fontWeight: "600",
  },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, gap: 10 },
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  cardLeft: { flexShrink: 0 },
  cardCover: { width: 54, height: 54, borderRadius: 10 },
  cardCoverPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 5 },
  cardName: { fontSize: 15, fontWeight: "600", color: "#0A0A0A" },
  badgeRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  badgeTextMuted: { fontSize: 11, color: "#555555" },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  avatarStack: { flexDirection: "row", alignItems: "center", gap: 4 },
  avatarCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: "#FFFFFF" },
  memberCountText: { fontSize: 11, color: MUTED },
  dDayRight: { alignItems: "flex-end" },
  dDay: { fontSize: 13, fontWeight: "700" },
  dDate: { fontSize: 11 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
