import type { BookSearchResult } from "@/types";
import { getApiUrl } from "@/lib/query-client";

interface NaverBookResult extends BookSearchResult {
  source: "naver";
}

interface GoogleBookResult extends BookSearchResult {
  source: "google";
}

type SourcedBookResult = NaverBookResult | GoogleBookResult;

function sanitizeQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF-]/g, "");
}

function hasKoreanCharacters(text: string): boolean {
  return /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text);
}

function getKeywordVariants(query: string): string[] {
  const sanitized = sanitizeQuery(query);
  if (!sanitized) return [];

  const variants: string[] = [sanitized];
  const words = sanitized.split(" ").filter((w) => w.length > 0);

  if (words.length >= 3) {
    variants.push(words.slice(0, -1).join(" "));
    variants.push(words.slice(0, 2).join(" "));
  }

  if (words.length >= 2) {
    const firstAndLast = `${words[0]} ${words[words.length - 1]}`;
    if (!variants.includes(firstAndLast)) {
      variants.push(firstAndLast);
    }
    variants.push(words[0]);
  }

  return [...new Set(variants)];
}

async function searchGoogleBooks(query: string): Promise<GoogleBookResult[]> {
  try {
    const apiUrl = getApiUrl();
    const url = new URL("/api/search/google", apiUrl);
    url.searchParams.set("query", query);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error("Failed to fetch from Google Books");
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error searching Google Books:", error);
    return [];
  }
}

async function searchNaverBooks(query: string): Promise<NaverBookResult[]> {
  try {
    const apiUrl = getApiUrl();
    const url = new URL("/api/search/naver", apiUrl);
    url.searchParams.set("query", query);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error("Failed to fetch from Naver Books");
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error searching Naver Books:", error);
    return [];
  }
}

function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeBookResults(
  googleBooks: GoogleBookResult[],
  naverBooks: NaverBookResult[],
  isKoreanQuery: boolean
): BookSearchResult[] {
  const merged: Map<string, SourcedBookResult> = new Map();
  const isbnMap: Map<string, SourcedBookResult> = new Map();

  for (const book of naverBooks) {
    if (book.isbn) {
      isbnMap.set(book.isbn, book);
    }
    merged.set(book.id, book);
  }

  for (const book of googleBooks) {
    if (book.isbn && isbnMap.has(book.isbn)) {
      const naverBook = isbnMap.get(book.isbn)!;
      
      if (!naverBook.coverUrl && book.coverUrl) {
        merged.set(naverBook.id, {
          ...naverBook,
          coverUrl: book.coverUrl,
        });
      }
      continue;
    }

    const normalizedTitle = normalizeForComparison(book.title);
    const normalizedAuthor = normalizeForComparison(book.author);
    
    let isDuplicate = false;
    for (const existing of merged.values()) {
      const existingTitle = normalizeForComparison(existing.title);
      const existingAuthor = normalizeForComparison(existing.author);
      
      if (existingTitle === normalizedTitle && existingAuthor === normalizedAuthor) {
        isDuplicate = true;
        if (!existing.coverUrl && book.coverUrl) {
          merged.set(existing.id, {
            ...existing,
            coverUrl: book.coverUrl,
          } as SourcedBookResult);
        }
        break;
      }
    }

    if (!isDuplicate) {
      merged.set(book.id, book);
    }
  }

  const results = Array.from(merged.values());
  
  if (isKoreanQuery) {
    results.sort((a, b) => {
      if (a.source === "naver" && b.source === "google") return -1;
      if (a.source === "google" && b.source === "naver") return 1;
      return 0;
    });
  }

  return results.map(({ source, ...book }) => book as BookSearchResult);
}

async function searchWithQuery(query: string, isKoreanQuery: boolean): Promise<BookSearchResult[]> {
  const [googleResults, naverResults] = await Promise.all([
    searchGoogleBooks(query),
    searchNaverBooks(query),
  ]);

  return mergeBookResults(googleResults, naverResults, isKoreanQuery);
}

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const sanitized = sanitizeQuery(query);
  if (!sanitized) {
    return [];
  }

  const isKoreanQuery = hasKoreanCharacters(sanitized);

  let results = await searchWithQuery(sanitized, isKoreanQuery);

  if (results.length === 0) {
    const variants = getKeywordVariants(query);
    
    for (let i = 1; i < variants.length && results.length === 0; i++) {
      results = await searchWithQuery(variants[i], isKoreanQuery);
    }
  }

  return results;
}

export async function getBookById(bookId: string): Promise<BookSearchResult | null> {
  if (bookId.startsWith("naver_")) {
    return null;
  }

  try {
    const apiUrl = getApiUrl();
    const url = new URL(`/api/books/${bookId}`, apiUrl);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error("Failed to fetch book");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching book:", error);
    return null;
  }
}
