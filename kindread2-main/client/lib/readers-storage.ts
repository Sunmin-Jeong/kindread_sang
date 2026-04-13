import { supabase } from "@/lib/supabase";

export interface DiscoverReader {
  id: string;
  username: string;
  bio?: string;
  city?: string;
  currentBookCover?: string;
  currentBookTitle?: string;
  followerCount: number;
  sharedBooks?: number;
  mutualCount?: number;
}

async function getUserBookIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("bookmarks")
    .select("book_id")
    .eq("user_id", userId)
    .not("book_id", "is", null);
  return [...new Set((data || []).map((b: any) => b.book_id).filter(Boolean))];
}

async function getFollowedSet(userId: string): Promise<Set<string>> {
  try {
    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);
    return new Set((data || []).map((f: any) => f.following_id));
  } catch {
    return new Set();
  }
}

async function getFollowerCounts(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  try {
    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .in("following_id", userIds);
    const map = new Map<string, number>();
    for (const f of data || []) {
      map.set(f.following_id, (map.get(f.following_id) || 0) + 1);
    }
    return map;
  } catch {
    return new Map();
  }
}

async function getLatestBookCovers(
  userIds: string[]
): Promise<Map<string, { cover?: string; title?: string }>> {
  if (userIds.length === 0) return new Map();
  const { data } = await supabase
    .from("bookmarks")
    .select("user_id, books(cover_url, title)")
    .in("user_id", userIds)
    .not("book_id", "is", null)
    .order("created_at", { ascending: false });

  const map = new Map<string, { cover?: string; title?: string }>();
  for (const b of data || []) {
    if (!map.has(b.user_id) && (b as any).books) {
      map.set(b.user_id, {
        cover: (b as any).books.cover_url,
        title: (b as any).books.title,
      });
    }
  }
  return map;
}

function buildReaders(
  rows: Array<{ id: string; username: string; bio?: string; city?: string }>,
  bookCovers: Map<string, { cover?: string; title?: string }>,
  followerCounts: Map<string, number>,
  extras?: Map<string, number>,
  extrasKey?: "sharedBooks" | "mutualCount"
): DiscoverReader[] {
  return rows.map((p) => ({
    id: p.id,
    username: p.username,
    bio: p.bio,
    city: p.city,
    currentBookCover: bookCovers.get(p.id)?.cover,
    currentBookTitle: bookCovers.get(p.id)?.title,
    followerCount: followerCounts.get(p.id) || 0,
    ...(extrasKey && extras ? { [extrasKey]: extras.get(p.id) || 0 } : {}),
  }));
}

export async function getReadersOnSameBooks(userId: string): Promise<DiscoverReader[]> {
  try {
    const [bookIds, followedIds] = await Promise.all([
      getUserBookIds(userId),
      getFollowedSet(userId),
    ]);
    if (bookIds.length === 0) return [];

    const { data } = await supabase
      .from("bookmarks")
      .select("user_id, book_id, profiles(id, username, bio, city)")
      .in("book_id", bookIds)
      .neq("user_id", userId)
      .eq("visibility", "public");

    const sharedMap = new Map<string, { count: number; profile: any }>();
    for (const b of data || []) {
      if (followedIds.has(b.user_id)) continue;
      const p = (b as any).profiles;
      if (!p) continue;
      if (sharedMap.has(b.user_id)) {
        sharedMap.get(b.user_id)!.count++;
      } else {
        sharedMap.set(b.user_id, { count: 1, profile: p });
      }
    }

    const sorted = [...sharedMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    const userIds = sorted.map(([id]) => id);
    const [bookCovers, followerCounts] = await Promise.all([
      getLatestBookCovers(userIds),
      getFollowerCounts(userIds),
    ]);

    const sharedExtras = new Map(sorted.map(([id, { count }]) => [id, count]));
    const rows = sorted.map(([id, { profile }]) => ({
      id,
      username: profile.username,
      bio: profile.bio,
      city: profile.city,
    }));
    return buildReaders(rows, bookCovers, followerCounts, sharedExtras, "sharedBooks");
  } catch (e) {
    console.error("getReadersOnSameBooks error:", e);
    return [];
  }
}

export async function getFriendsOfFriends(userId: string): Promise<DiscoverReader[]> {
  try {
    const followedIds = await getFollowedSet(userId);
    if (followedIds.size === 0) return [];

    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .in("follower_id", [...followedIds])
      .neq("following_id", userId);

    const mutualMap = new Map<string, number>();
    for (const f of data || []) {
      if (followedIds.has(f.following_id)) continue;
      mutualMap.set(f.following_id, (mutualMap.get(f.following_id) || 0) + 1);
    }
    if (mutualMap.size === 0) return [];

    const sorted = [...mutualMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const userIds = sorted.map(([id]) => id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, bio, city")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const [bookCovers, followerCounts] = await Promise.all([
      getLatestBookCovers(userIds),
      getFollowerCounts(userIds),
    ]);

    const mutualExtras = new Map(sorted.map(([id, count]) => [id, count]));
    const rows = sorted
      .filter(([id]) => profileMap.has(id))
      .map(([id]) => {
        const p = profileMap.get(id);
        return { id, username: p.username, bio: p.bio, city: p.city };
      });
    return buildReaders(rows, bookCovers, followerCounts, mutualExtras, "mutualCount");
  } catch (e) {
    console.error("getFriendsOfFriends error:", e);
    return [];
  }
}

export async function getActiveThisWeek(userId: string): Promise<DiscoverReader[]> {
  try {
    const followedIds = await getFollowedSet(userId);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from("bookmarks")
      .select("user_id, created_at, profiles(id, username, bio, city)")
      .gt("created_at", since)
      .neq("user_id", userId)
      .eq("visibility", "public")
      .order("created_at", { ascending: false });

    const seen = new Set<string>();
    const activeRows: Array<{ id: string; username: string; bio?: string; city?: string }> = [];
    for (const b of data || []) {
      if (seen.has(b.user_id) || followedIds.has(b.user_id)) continue;
      const p = (b as any).profiles;
      if (!p) continue;
      seen.add(b.user_id);
      activeRows.push({ id: b.user_id, username: p.username, bio: p.bio, city: p.city });
    }

    const rows = activeRows.slice(0, 10);
    const userIds = rows.map((r) => r.id);
    const [bookCovers, followerCounts] = await Promise.all([
      getLatestBookCovers(userIds),
      getFollowerCounts(userIds),
    ]);
    return buildReaders(rows, bookCovers, followerCounts);
  } catch (e) {
    console.error("getActiveThisWeek error:", e);
    return [];
  }
}

export async function getGlobalReaders(userId: string): Promise<DiscoverReader[]> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, bio, city")
      .neq("id", userId)
      .limit(20);

    if (!data || data.length === 0) return [];

    const userIds = data.map((p: any) => p.id);
    const [bookCovers, followerCounts] = await Promise.all([
      getLatestBookCovers(userIds),
      getFollowerCounts(userIds),
    ]);

    const rows = data.map((p: any) => ({
      id: p.id,
      username: p.username,
      bio: p.bio,
      city: p.city,
    }));
    return buildReaders(rows, bookCovers, followerCounts).sort(
      (a, b) => b.followerCount - a.followerCount
    );
  } catch (e) {
    console.error("getGlobalReaders error:", e);
    return [];
  }
}

export async function getNearYouReaders(userId: string, city: string): Promise<DiscoverReader[]> {
  try {
    const followedIds = await getFollowedSet(userId);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, bio, city")
      .ilike("city", `%${city}%`)
      .neq("id", userId)
      .limit(10);

    if (!data) return [];
    const rows = data
      .filter((p: any) => !followedIds.has(p.id))
      .map((p: any) => ({ id: p.id, username: p.username, bio: p.bio, city: p.city }));

    const userIds = rows.map((r) => r.id);
    const [bookCovers, followerCounts] = await Promise.all([
      getLatestBookCovers(userIds),
      getFollowerCounts(userIds),
    ]);
    return buildReaders(rows, bookCovers, followerCounts);
  } catch (e) {
    console.error("getNearYouReaders error:", e);
    return [];
  }
}

export async function getTopBookedBooks(limit = 3): Promise<string[]> {
  const { data } = await supabase
    .from("bookmarks")
    .select("book_id")
    .not("book_id", "is", null);

  const counts = new Map<string, number>();
  for (const b of data || []) {
    if (b.book_id) counts.set(b.book_id, (counts.get(b.book_id) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

export async function getReadersByBookId(
  bookId: string,
  excludeUserId: string
): Promise<DiscoverReader[]> {
  try {
    const { data } = await supabase
      .from("bookmarks")
      .select("user_id, profiles(id, username, bio, city)")
      .eq("book_id", bookId)
      .neq("user_id", excludeUserId)
      .eq("visibility", "public")
      .limit(8);

    const seen = new Set<string>();
    const rows: Array<{ id: string; username: string; bio?: string; city?: string }> = [];
    for (const b of data || []) {
      if (seen.has(b.user_id)) continue;
      const p = (b as any).profiles;
      if (!p) continue;
      seen.add(b.user_id);
      rows.push({ id: b.user_id, username: p.username, bio: p.bio, city: p.city });
    }

    const userIds = rows.map((r) => r.id);
    const [bookCovers, followerCounts] = await Promise.all([
      getLatestBookCovers(userIds),
      getFollowerCounts(userIds),
    ]);
    return buildReaders(rows, bookCovers, followerCounts);
  } catch (e) {
    return [];
  }
}
