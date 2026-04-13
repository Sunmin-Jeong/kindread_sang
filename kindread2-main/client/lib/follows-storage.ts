import { supabase } from "@/lib/supabase";
import type { FollowCounts, FollowProfile } from "@/types";

export async function followUser(followerId: string, followingId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: followerId, following_id: followingId });
    if (error) {
      console.error("Error following user:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("followUser error:", e);
    return false;
  }
}

export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    if (error) {
      console.error("Error unfollowing user:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("unfollowUser error:", e);
    return false;
  }
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .single();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  try {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId),
    ]);
    return { followers: followers || 0, following: following || 0 };
  } catch {
    return { followers: 0, following: 0 };
  }
}

export async function getFollowers(userId: string): Promise<FollowProfile[]> {
  try {
    const { data, error } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", userId);
    if (error || !data) return [];

    const ids = data.map((r: any) => r.follower_id);
    if (ids.length === 0) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", ids);

    return (profiles || []).map((p: any) => ({ id: p.id, username: p.username }));
  } catch {
    return [];
  }
}

export async function getFollowing(userId: string): Promise<FollowProfile[]> {
  try {
    const { data, error } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);
    if (error || !data) return [];

    const ids = data.map((r: any) => r.following_id);
    if (ids.length === 0) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", ids);

    return (profiles || []).map((p: any) => ({ id: p.id, username: p.username }));
  } catch {
    return [];
  }
}

export async function getFollowedUserIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);
    if (error || !data) return [];
    return data.map((r: any) => r.following_id);
  } catch {
    return [];
  }
}

export async function getUserProfile(userId: string): Promise<{
  id: string;
  username: string;
  bio?: string;
  city?: string;
  country?: string;
  languages?: string[];
} | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, bio, city, country, languages")
      .eq("id", userId)
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      username: data.username,
      bio: data.bio || undefined,
      city: data.city || undefined,
      country: data.country || undefined,
      languages: data.languages || undefined,
    };
  } catch {
    return null;
  }
}
