-- Kindread Database Setup for Supabase
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Create profiles table (stores user profile info)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  bio TEXT DEFAULT 'A lover of books and words',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create books table (stores book metadata)
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  cover_url TEXT,
  isbn TEXT,
  publisher TEXT,
  published_date TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create margins table (stores user reflections)
CREATE TABLE IF NOT EXISTS margins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create margin_books junction table (links margins to books)
CREATE TABLE IF NOT EXISTS margin_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  margin_id UUID NOT NULL REFERENCES margins(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_number TEXT,
  chapter TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_margins_user_id ON margins(user_id);
CREATE INDEX IF NOT EXISTS idx_margins_created_at ON margins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_margin_books_margin_id ON margin_books(margin_id);
CREATE INDEX IF NOT EXISTS idx_margin_books_book_id ON margin_books(book_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE margins ENABLE ROW LEVEL SECURITY;
ALTER TABLE margin_books ENABLE ROW LEVEL SECURITY;

-- 7. Profiles policies
-- Everyone can view all profiles
CREATE POLICY "Profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 8. Books policies (anyone can read, authenticated users can insert)
CREATE POLICY "Books are viewable by everyone" 
  ON books FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert books" 
  ON books FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- 9. Margins policies
-- Everyone can view all margins (public feed)
CREATE POLICY "Margins are viewable by everyone" 
  ON margins FOR SELECT 
  USING (true);

-- Users can only insert their own margins
CREATE POLICY "Users can insert own margins" 
  ON margins FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own margins
CREATE POLICY "Users can update own margins" 
  ON margins FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can only delete their own margins
CREATE POLICY "Users can delete own margins" 
  ON margins FOR DELETE 
  USING (auth.uid() = user_id);

-- 10. Margin_books policies
-- Everyone can view margin_books
CREATE POLICY "Margin books are viewable by everyone" 
  ON margin_books FOR SELECT 
  USING (true);

-- Users can insert margin_books for their own margins
CREATE POLICY "Users can insert margin_books for own margins" 
  ON margin_books FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM margins 
      WHERE margins.id = margin_id 
      AND margins.user_id = auth.uid()
    )
  );

-- Users can delete margin_books for their own margins
CREATE POLICY "Users can delete margin_books for own margins" 
  ON margin_books FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM margins 
      WHERE margins.id = margin_id 
      AND margins.user_id = auth.uid()
    )
  );

-- 11. Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Reader'),
    'A lover of books and words'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
