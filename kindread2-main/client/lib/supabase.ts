import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          bio: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          bio?: string;
        };
        Update: {
          username?: string;
          bio?: string;
          updated_at?: string;
        };
      };
      books: {
        Row: {
          id: string;
          title: string;
          author: string;
          cover_url: string | null;
          isbn: string | null;
          publisher: string | null;
          published_date: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          title: string;
          author: string;
          cover_url?: string | null;
          isbn?: string | null;
          publisher?: string | null;
          published_date?: string | null;
          description?: string | null;
        };
        Update: {
          title?: string;
          author?: string;
          cover_url?: string | null;
        };
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          text_content: string;
          post_type: string;
          images: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          text_content: string;
          post_type?: string;
          images?: string[];
        };
        Update: {
          text_content?: string;
          post_type?: string;
          images?: string[];
        };
      };
    };
  };
};
