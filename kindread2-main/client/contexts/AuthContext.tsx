import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string;
  bio: string;
  birthYear?: number;
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
  city?: string;
  country?: string;
  languages?: string[];
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          if (retryCount < 5) {
            await new Promise(resolve => setTimeout(resolve, 300 * (retryCount + 1)));
            return fetchProfile(userId, retryCount + 1);
          }
          
          const defaultProfile: Profile = {
            id: userId,
            username: user?.user_metadata?.username || "Reader",
            bio: "A lover of books and words",
          };
          setProfile(defaultProfile);
        } else {
          console.error("Error fetching profile:", error);
        }
      } else {
        const profile: Profile = {
          id: data.id,
          username: data.username,
          bio: data.bio,
          birthYear: data.birth_year,
          gender: data.gender,
          city: data.city,
          country: data.country,
          languages: Array.isArray(data.languages) ? data.languages : [],
        };
        setProfile(profile);
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    try {
      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.username !== undefined) dbUpdates.username = updates.username;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.birthYear !== undefined) dbUpdates.birth_year = updates.birthYear;
      if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
      if (updates.city !== undefined) dbUpdates.city = updates.city;
      if (updates.country !== undefined) dbUpdates.country = updates.country;
      if (updates.languages !== undefined) {
        dbUpdates.languages = Array.isArray(updates.languages) ? updates.languages : [];
      }

      const { error } = await supabase
        .from("profiles")
        .update(dbUpdates)
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isAuthenticated: !!session,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
