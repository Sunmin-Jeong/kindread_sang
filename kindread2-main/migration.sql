-- Kindread schema migration
-- Run this in your Supabase SQL editor: https://supabase.com/dashboard/project/mtrgtvrksnfvzqqbwwhp/sql
--
-- Step 1: Add first-class columns to bookmarks
ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS rating     NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS quote_text TEXT;

-- Step 2: Migrate existing meta-encoded content to the new columns
UPDATE bookmarks
SET
  rating = CASE
    WHEN text_content ~ '^<!--meta:.*:meta-->\n'
    THEN ((regexp_match(text_content, '^<!--meta:(.*):meta-->\n'))[1]::jsonb ->> 'rating')::NUMERIC(3,1)
    ELSE rating
  END,
  quote_text = CASE
    WHEN text_content ~ '^<!--meta:.*:meta-->\n'
    THEN (regexp_match(text_content, '^<!--meta:(.*):meta-->\n'))[1]::jsonb ->> 'quoteText'
    ELSE quote_text
  END,
  text_content = CASE
    WHEN text_content ~ '^<!--meta:.*:meta-->\n'
    THEN regexp_replace(text_content, '^<!--meta:.*:meta-->\n', '')
    ELSE text_content
  END
WHERE text_content LIKE '<!--meta:%';

-- Step 3: Rename post_type values to new canonical names
UPDATE bookmarks SET post_type = 'review' WHERE post_type = 'reflection';
UPDATE bookmarks SET post_type = 'quote'
  WHERE post_type = 'log' AND quote_text IS NOT NULL AND quote_text != '';

-- Step 4: Create follows table (for the follow system)
CREATE TABLE IF NOT EXISTS follows (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Step 5: Add actor/bookmark fields to notifications (for richer notification payloads)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS actor_id    uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS bookmark_id uuid REFERENCES bookmarks(id);
