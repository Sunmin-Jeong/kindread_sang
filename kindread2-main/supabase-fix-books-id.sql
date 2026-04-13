-- Fix books table ID type (run in Supabase SQL Editor)
-- This changes books.id from UUID to TEXT to support Google Books IDs

-- Step 1: Drop the foreign key constraint from margin_books
ALTER TABLE margin_books DROP CONSTRAINT IF EXISTS margin_books_book_id_fkey;

-- Step 2: Change the books.id column type to TEXT
ALTER TABLE books ALTER COLUMN id TYPE TEXT;

-- Step 3: Change the margin_books.book_id column type to TEXT
ALTER TABLE margin_books ALTER COLUMN book_id TYPE TEXT;

-- Step 4: Re-add the foreign key constraint
ALTER TABLE margin_books 
  ADD CONSTRAINT margin_books_book_id_fkey 
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'books' AND column_name = 'id';
