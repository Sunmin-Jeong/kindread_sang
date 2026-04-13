/**
 * Schema migration: add first-class `rating` + `quote_text` columns to bookmarks,
 * migrate meta-encoded data, and normalise post_type values.
 *
 * Run:  tsx server/migrate-schema.ts
 *
 * This script uses the Supabase Management API to execute raw SQL.
 * It requires EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function execSQL(sql: string, description: string) {
  const { error } = await admin.rpc("exec_migration_sql", { sql_query: sql });
  if (error) {
    throw new Error(`${description} failed: ${error.message}`);
  }
  console.log(`  ✓ ${description}`);
}

async function run() {
  console.log("Starting schema migration…");
  console.log("Note: This requires an exec_migration_sql function in your Supabase DB.");
  console.log("If it fails, run the SQL in migration.sql manually in the Supabase SQL editor.\n");

  try {
    await execSQL(
      `ALTER TABLE bookmarks
         ADD COLUMN IF NOT EXISTS rating     NUMERIC(3,1),
         ADD COLUMN IF NOT EXISTS quote_text TEXT;`,
      "Add rating + quote_text columns"
    );

    await execSQL(
      `UPDATE bookmarks
       SET
         rating = CASE
           WHEN text_content ~ '^<!--meta:.*:meta-->\\n'
           THEN ((regexp_match(text_content, '^<!--meta:(.*):meta-->\\n'))[1]::jsonb ->> 'rating')::NUMERIC(3,1)
           ELSE rating
         END,
         quote_text = CASE
           WHEN text_content ~ '^<!--meta:.*:meta-->\\n'
           THEN (regexp_match(text_content, '^<!--meta:(.*):meta-->\\n'))[1]::jsonb ->> 'quoteText'
           ELSE quote_text
         END,
         text_content = CASE
           WHEN text_content ~ '^<!--meta:.*:meta-->\\n'
           THEN regexp_replace(text_content, '^<!--meta:.*:meta-->\\n', '')
           ELSE text_content
         END
       WHERE text_content LIKE '<!--meta:%';`,
      "Migrate meta-encoded content to columns"
    );

    await execSQL(
      `UPDATE bookmarks SET post_type = 'review' WHERE post_type = 'reflection';`,
      "Rename 'reflection' → 'review'"
    );

    await execSQL(
      `UPDATE bookmarks SET post_type = 'quote'
       WHERE post_type = 'log' AND quote_text IS NOT NULL AND quote_text != '';`,
      "Rename quote logs → 'quote'"
    );

    console.log("\nMigration complete.");
  } catch (err: any) {
    console.error("\nMigration failed via RPC.");
    console.error(err.message);
    console.error("\nPlease run migration.sql manually in your Supabase SQL editor.");
    process.exit(1);
  }
}

run();
