/**
 * Kindread – editorial seed data for grant application demo
 *
 * Run:  tsx server/seed.ts
 *
 * Maps 5 existing Supabase auth users to editorial personas, then inserts
 * books, clubs, bookmarks, likes, and comments.  Safe to re-run (upserts
 * where possible; bookmarks/clubs will create duplicates).
 *
 * Verified column names:
 *   clubs            → host_id, language_code, require_approval (NOT languages/join_policy)
 *   bookmark_comments → content  (NOT text_content)
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

// ─── existing auth user IDs ───────────────────────────────────────────────────
const USERS = {
  minjun: "165613af-8c84-4181-ab9e-05374f3297a3", // wtf@naver.com
  sarah:  "689adb52-6dc2-4f27-8d87-23e877aff58d",
  kenji:  "ac66a100-4271-4134-ab75-80052faac5f9",
  elena:  "73b91c6f-a0e7-4641-9443-36b77698e435",
  jiho:   "4a88eb14-bf65-44f3-a570-c7b125d0adf8",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

async function upsertProfile(id: string, username: string, bio: string, country: string, languages: string[]) {
  const { error } = await admin
    .from("profiles")
    .upsert({ id, username, bio, country, languages }, { onConflict: "id" });
  if (error) throw new Error(`upsertProfile ${username}: ${error.message}`);
  console.log(`  ✓  profile: ${username}`);
}

async function upsertBook(title: string, author: string, coverUrl: string | null, totalPages: number | null) {
  const { data: existing } = await admin.from("books").select("id").eq("title", title).eq("author", author).maybeSingle();
  if (existing) { console.log(`  ↩  book exists: ${title}`); return existing.id as string; }
  const { data, error } = await admin.from("books").insert({ title, author, cover_url: coverUrl, total_pages: totalPages }).select("id").single();
  if (error) throw new Error(`upsertBook ${title}: ${error.message}`);
  console.log(`  ✓  book: ${title}`);
  return data.id as string;
}

const META_PREFIX = "<!--meta:";
const META_SUFFIX = ":meta-->\n";
function encodeMeta(text: string, meta: { rating?: number; quoteText?: string }) {
  if (!meta.rating && !meta.quoteText) return text;
  return `${META_PREFIX}${JSON.stringify(meta)}${META_SUFFIX}${text}`;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱  Kindread seed data – starting…\n");

  // 1. Profiles
  console.log("── 1. Profiles…");
  await upsertProfile(USERS.minjun, "Minjun", "평범한 일상 속에서 철학 한 조각을 찾습니다.", "KR", ["ko", "en"]);
  await upsertProfile(USERS.sarah,  "Sarah",  "Seeking truth through global literature.",    "US", ["en"]);
  await upsertProfile(USERS.kenji,  "Kenji",  "Different perspectives, one human heart.",    "JP", ["ja", "en"]);
  await upsertProfile(USERS.elena,  "Elena",  "Building a safer world, one book at a time.", "ES", ["es", "en"]);
  await upsertProfile(USERS.jiho,   "Jiho",   "성장보다는 성숙을 꿈꾸는 독서가.",              "KR", ["ko"]);

  // 2. Books
  console.log("\n── 2. Books…");
  const demianId     = await upsertBook("Demian", "Hermann Hesse", "https://books.google.com/books/content?id=TvXuAAAAMAAJ&printsec=frontcover&img=1&zoom=1", 208);
  const alchemistId  = await upsertBook("The Alchemist", "Paulo Coelho", "https://books.google.com/books/content?id=FzVjBgAAQBAJ&printsec=frontcover&img=1&zoom=1", 197);
  const humanActsId  = await upsertBook("Human Acts", "Han Kang", "https://books.google.com/books/content?id=j4FWDQAAQBAJ&printsec=frontcover&img=1&zoom=1", 218);
  const justiceId    = await upsertBook("Justice: What's the Right Thing to Do?", "Michael Sandel", "https://books.google.com/books/content?id=4QwVOZdXMWkC&printsec=frontcover&img=1&zoom=1", 308);
  const mansSearchId = await upsertBook("Man's Search for Meaning", "Viktor E. Frankl", "https://books.google.com/books/content?id=F-Q_xGjh9EoC&printsec=frontcover&img=1&zoom=1", 165);

  // 3. Clubs (column names: host_id, language_code, require_approval)
  console.log("\n── 3. Clubs…");

  const { data: pc, error: pcErr } = await admin.from("clubs").insert({
    name: "The Midnight Philosophers",
    description: "A global circle exploring life's deep questions through literature and candid conversation.",
    host_id: USERS.minjun,
    meeting_mode: "online",
    join_policy: "auto",
    require_approval: false,
    language_code: "en",
    type: "club",
    format: "online",
    created_at: new Date("2026-03-01").toISOString(),
  }).select("id").single();
  if (pcErr) console.error("  ✗  philosophers club:", pcErr.message);
  else {
    console.log(`  ✓  The Midnight Philosophers (${pc.id})`);
    await admin.from("club_members").insert([
      { club_id: pc.id, user_id: USERS.minjun, role: "host" },
      { club_id: pc.id, user_id: USERS.sarah,  role: "member" },
      { club_id: pc.id, user_id: USERS.kenji,  role: "member" },
      { club_id: pc.id, user_id: USERS.elena,  role: "member" },
      { club_id: pc.id, user_id: USERS.jiho,   role: "member" },
    ]);
  }

  const { data: dc, error: dcErr } = await admin.from("clubs").insert({
    name: "Demian: The Struggle of Youth",
    description: "An offline gathering for readers wrestling with identity, growth, and self-discovery through Hesse's Demian.",
    host_id: USERS.minjun,
    meeting_mode: "offline",
    join_policy: "auto",
    require_approval: false,
    language_code: "ko",
    type: "session",
    format: "offline",
    book_id: demianId,
    location: "Gangnam Book Cafe",
    meet_date: new Date("2026-04-05T14:00:00+09:00").toISOString(),
    created_at: new Date("2026-03-05").toISOString(),
  }).select("id").single();
  if (dcErr) console.error("  ✗  demian session:", dcErr.message);
  else {
    console.log(`  ✓  Demian session (${dc.id})`);
    await admin.from("club_members").insert([
      { club_id: dc.id, user_id: USERS.minjun, role: "host" },
      { club_id: dc.id, user_id: USERS.jiho,   role: "member" },
    ]);
  }

  const { data: ra, error: raErr } = await admin.from("clubs").insert({
    name: "14-Day Challenge: Man's Search for Meaning",
    description: "Read Viktor Frankl's masterpiece together in 14 days. Daily check-ins and reflections welcome.",
    host_id: USERS.sarah,
    meeting_mode: "online",
    join_policy: "auto",
    require_approval: false,
    language_code: "en",
    type: "session",
    format: "read_along",
    book_id: mansSearchId,
    deadline: new Date("2026-04-10").toISOString(),
    created_at: new Date("2026-03-10").toISOString(),
  }).select("id").single();
  if (raErr) console.error("  ✗  read-along:", raErr.message);
  else {
    console.log(`  ✓  14-Day Read-Along (${ra.id})`);
    await admin.from("club_members").insert([
      { club_id: ra.id, user_id: USERS.sarah, role: "host" },
      { club_id: ra.id, user_id: USERS.elena, role: "member" },
      { club_id: ra.id, user_id: USERS.kenji, role: "member" },
    ]);
  }

  // 4. Bookmarks
  console.log("\n── 4. Bookmarks…");

  const { data: b1, error: b1e } = await admin.from("bookmarks").insert({
    user_id: USERS.minjun, book_id: demianId,
    text_content: "새가 알을 깨고 나오듯, 저도 저만의 세계를 깨는 중입니다.",
    post_type: "log", progress_type: "percent", page_number: 45,
    images: [], visibility: "public",
    created_at: new Date("2026-03-18T09:15:00Z").toISOString(),
  }).select("id").single();
  if (b1e) console.error("  ✗  minjun log:", b1e.message);
  else console.log(`  ✓  Minjun's Demian log (${b1!.id})`);

  const { data: b2, error: b2e } = await admin.from("bookmarks").insert({
    user_id: USERS.sarah, book_id: alchemistId,
    text_content: encodeMeta("이 문장이 오늘 저를 다시 움직이게 하네요. 여러분의 꿈은 무엇인가요?", {
      quoteText: "It's the possibility of having a dream come true that makes life interesting.",
    }),
    post_type: "log", images: [], visibility: "public",
    created_at: new Date("2026-03-19T11:30:00Z").toISOString(),
  }).select("id").single();
  if (b2e) console.error("  ✗  sarah quote:", b2e.message);
  else console.log(`  ✓  Sarah's Alchemist quote (${b2!.id})`);

  const { data: b3, error: b3e } = await admin.from("bookmarks").insert({
    user_id: USERS.kenji, book_id: humanActsId,
    text_content: encodeMeta("역지사지의 마음으로 읽어 내려갔습니다.", {
      rating: 5,
      quoteText: "Heartbreaking but necessary. A powerful reminder of human dignity.",
    }),
    post_type: "reflection", images: [], visibility: "public",
    created_at: new Date("2026-03-20T14:00:00Z").toISOString(),
  }).select("id").single();
  if (b3e) console.error("  ✗  kenji review:", b3e.message);
  else console.log(`  ✓  Kenji's Human Acts review (${b3!.id})`);

  const { data: b4, error: b4e } = await admin.from("bookmarks").insert({
    user_id: USERS.elena, book_id: justiceId,
    text_content: "Different opinions welcomed here. Let's discuss what is right.",
    post_type: "log", progress_type: "page", page_number: 112,
    images: [], visibility: "public",
    created_at: new Date("2026-03-21T08:45:00Z").toISOString(),
  }).select("id").single();
  if (b4e) console.error("  ✗  elena log:", b4e.message);
  else console.log(`  ✓  Elena's Justice log (${b4!.id})`);

  // 5. Likes
  console.log("\n── 5. Likes…");
  const likes: { bookmark_id: string; user_id: string }[] = [];
  if (b1) likes.push({ bookmark_id: b1.id, user_id: USERS.sarah }, { bookmark_id: b1.id, user_id: USERS.elena }, { bookmark_id: b1.id, user_id: USERS.jiho }, { bookmark_id: b1.id, user_id: USERS.kenji });
  if (b2) likes.push({ bookmark_id: b2.id, user_id: USERS.minjun }, { bookmark_id: b2.id, user_id: USERS.kenji }, { bookmark_id: b2.id, user_id: USERS.elena });
  if (b3) likes.push({ bookmark_id: b3.id, user_id: USERS.minjun }, { bookmark_id: b3.id, user_id: USERS.sarah }, { bookmark_id: b3.id, user_id: USERS.elena }, { bookmark_id: b3.id, user_id: USERS.jiho });
  if (b4) likes.push({ bookmark_id: b4.id, user_id: USERS.minjun }, { bookmark_id: b4.id, user_id: USERS.sarah }, { bookmark_id: b4.id, user_id: USERS.kenji });
  let likeOk = 0;
  for (const l of likes) {
    const { error } = await admin.from("bookmark_likes").insert(l);
    if (!error || error.message.includes("duplicate") || error.message.includes("unique")) likeOk++;
    else console.error(`  ✗  like: ${error.message}`);
  }
  console.log(`  ✓  ${likeOk} likes`);

  // 6. Comments  (column: content, not text_content)
  console.log("\n── 6. Comments…");
  const comments: { bookmark_id: string; user_id: string; content: string; created_at: string }[] = [];
  if (b1) {
    comments.push(
      { bookmark_id: b1.id, user_id: USERS.elena, content: "Cheering for your journey, Minjun! 응원합니다!", created_at: new Date("2026-03-18T10:00:00Z").toISOString() },
      { bookmark_id: b1.id, user_id: USERS.sarah, content: "That quote is so vivid. Breaking your own shell — beautiful metaphor.", created_at: new Date("2026-03-18T10:30:00Z").toISOString() }
    );
  }
  if (b2) {
    comments.push(
      { bookmark_id: b2.id, user_id: USERS.minjun, content: "제 꿈은 아직 조용히 자라나고 있어요. 이 문장 덕분에 다시 떠올렸습니다.", created_at: new Date("2026-03-19T12:00:00Z").toISOString() },
      { bookmark_id: b2.id, user_id: USERS.kenji,  content: "This line has been with me for years. Thank you for sharing it.", created_at: new Date("2026-03-19T13:15:00Z").toISOString() }
    );
  }
  if (b3) {
    comments.push(
      { bookmark_id: b3.id, user_id: USERS.sarah, content: "Han Kang's words leave no room to look away. This review captures exactly why.", created_at: new Date("2026-03-20T15:00:00Z").toISOString() },
      { bookmark_id: b3.id, user_id: USERS.jiho,  content: "역지사지라는 말이 이 책만큼 잘 어울리는 곳이 없는 것 같아요.", created_at: new Date("2026-03-20T16:20:00Z").toISOString() }
    );
  }
  if (b4) {
    comments.push({ bookmark_id: b4.id, user_id: USERS.sarah, content: "Sandel always makes me reconsider what I thought I knew about justice. Are you in the distributive justice chapter yet?", created_at: new Date("2026-03-21T09:10:00Z").toISOString() });
  }
  let commentOk = 0;
  for (const c of comments) {
    const { error } = await admin.from("bookmark_comments").insert(c);
    if (error) console.error(`  ✗  comment: ${error.message}`);
    else commentOk++;
  }
  console.log(`  ✓  ${commentOk}/${comments.length} comments`);

  console.log("\n🎉  Seed complete!\n");
  console.log("Personas:");
  console.log("  Minjun (KR) →", USERS.minjun, "  (wtf@naver.com)");
  console.log("  Sarah  (US) →", USERS.sarah);
  console.log("  Kenji  (JP) →", USERS.kenji);
  console.log("  Elena  (ES) →", USERS.elena);
  console.log("  Jiho   (KR) →", USERS.jiho);
}

main().catch((err) => {
  console.error("\n💥  Seed failed:", err.message);
  process.exit(1);
});
