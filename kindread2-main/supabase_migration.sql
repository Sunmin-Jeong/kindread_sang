-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Add new columns to clubs table
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS type text DEFAULT 'club';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS format text DEFAULT 'online';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS book_id uuid REFERENCES books(id) ON DELETE SET NULL;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS meet_date timestamptz;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS link text;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS deadline timestamptz;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS session_number int DEFAULT 1;

-- 2. Create club_sessions table (for tracking sessions in ongoing clubs)
CREATE TABLE IF NOT EXISTS club_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id uuid REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
    session_number int NOT NULL DEFAULT 1,
    book_id uuid REFERENCES books(id) ON DELETE SET NULL,
    format text NOT NULL DEFAULT 'online',
    meet_date timestamptz,
    location text,
    link text,
    deadline timestamptz,
    status text NOT NULL DEFAULT 'upcoming',
    created_at timestamptz DEFAULT now()
);

-- 3. Create club_votes table (book candidates for next session)
CREATE TABLE IF NOT EXISTS club_votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id uuid REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
    book_id uuid REFERENCES books(id) ON DELETE CASCADE NOT NULL,
    proposed_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 4. Create club_vote_responses table (one row per user per candidate)
CREATE TABLE IF NOT EXISTS club_vote_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vote_id uuid REFERENCES club_votes(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(vote_id, user_id)
);

-- 5. Enable RLS on new tables
ALTER TABLE club_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_vote_responses ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies — allow authenticated users to read all, write own
CREATE POLICY "club_sessions_read" ON club_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "club_sessions_insert" ON club_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "club_votes_read" ON club_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "club_votes_insert" ON club_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = proposed_by);
CREATE POLICY "club_votes_delete" ON club_votes FOR DELETE TO authenticated USING (auth.uid() = proposed_by);
CREATE POLICY "club_vote_responses_read" ON club_vote_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "club_vote_responses_insert" ON club_vote_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "club_vote_responses_delete" ON club_vote_responses FOR DELETE TO authenticated USING (auth.uid() = user_id);
