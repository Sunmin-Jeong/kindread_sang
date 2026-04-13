import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { createClient } from "@supabase/supabase-js";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

// Create Supabase admin client with service role key for storage uploads
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface NaverBookItem {
  title: string;
  author: string;
  image: string;
  isbn: string;
  publisher: string;
  pubdate: string;
  description: string;
  link: string;
}

interface NaverSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverBookItem[];
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Google Books API proxy
  app.get("/api/search/google", async (req: Request, res: Response) => {
    const query = req.query.query as string;
    
    if (!query || query.trim().length < 1) {
      return res.json({ items: [] });
    }

    try {
      const searchQuery = `intitle:${query}`;
      const response = await fetch(
        `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(searchQuery)}&maxResults=20&printType=books`
      );

      if (!response.ok) {
        console.error("Google Books API error:", response.status, response.statusText);
        return res.json({ items: [] });
      }

      const data = await response.json();
      
      if (!data.items) {
        return res.json({ items: [] });
      }

      const books = data.items.map((item: any) => {
        const volumeInfo = item.volumeInfo || {};
        const imageLinks = volumeInfo.imageLinks || {};

        let coverUrl = imageLinks.thumbnail || imageLinks.smallThumbnail || null;
        if (coverUrl) {
          coverUrl = coverUrl.replace("http://", "https://");
          coverUrl = coverUrl.replace("&edge=curl", "");
        }

        const industryIdentifiers = volumeInfo.industryIdentifiers || [];
        const isbn =
          industryIdentifiers.find((id: any) => id.type === "ISBN_13")?.identifier ||
          industryIdentifiers.find((id: any) => id.type === "ISBN_10")?.identifier ||
          undefined;

        return {
          id: item.id,
          title: volumeInfo.title || "Unknown Title",
          author: volumeInfo.authors?.join(", ") || "Unknown Author",
          coverUrl,
          isbn,
          publisher: volumeInfo.publisher,
          publishedDate: volumeInfo.publishedDate,
          description: volumeInfo.description,
          pageCount: volumeInfo.pageCount || null,
          source: "google" as const,
        };
      });

      return res.json({ items: books });
    } catch (error) {
      console.error("Google search error:", error);
      return res.json({ items: [] });
    }
  });

  // Naver Book Search API proxy
  app.get("/api/search/naver", async (req: Request, res: Response) => {
    const query = req.query.query as string;
    
    if (!query || query.trim().length < 1) {
      return res.json({ items: [] });
    }

    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.warn("Naver API credentials not configured");
      return res.json({ items: [] });
    }

    try {
      const response = await fetch(
        `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=20`,
        {
          headers: {
            "X-Naver-Client-Id": clientId,
            "X-Naver-Client-Secret": clientSecret,
          },
        }
      );

      if (!response.ok) {
        console.error("Naver API error:", response.status, response.statusText);
        return res.json({ items: [] });
      }

      const data: NaverSearchResponse = await response.json();
      
      // Transform Naver response to match our BookSearchResult format
      const books = data.items.map((item) => {
        // Clean HTML tags from title and other fields
        const cleanTitle = item.title.replace(/<[^>]*>/g, "");
        const cleanAuthor = item.author.replace(/<[^>]*>/g, "");
        const cleanDescription = item.description.replace(/<[^>]*>/g, "");
        
        // Extract ISBN (Naver returns format like "1234567890 9781234567890")
        const isbnParts = item.isbn.split(" ");
        const isbn13 = isbnParts.find((isbn) => isbn.length === 13) || isbnParts[0];
        
        // Use ISBN as ID for Naver books (prefixed to distinguish from Google)
        const id = `naver_${isbn13 || item.link.split("/").pop()}`;

        return {
          id,
          title: cleanTitle,
          author: cleanAuthor,
          coverUrl: item.image || null,
          isbn: isbn13,
          publisher: item.publisher,
          publishedDate: item.pubdate,
          description: cleanDescription,
          source: "naver" as const,
        };
      });

      return res.json({ items: books });
    } catch (error) {
      console.error("Naver search error:", error);
      return res.json({ items: [] });
    }
  });

  // Get single book by Google Books ID
  app.get("/api/books/:id", async (req: Request, res: Response) => {
    const bookId = req.params.id as string;
    
    if (!bookId || bookId.startsWith("naver_")) {
      return res.status(404).json({ error: "Book not found" });
    }

    try {
      const response = await fetch(`${GOOGLE_BOOKS_API}/${bookId}`);

      if (!response.ok) {
        return res.status(404).json({ error: "Book not found" });
      }

      const item = await response.json();
      const volumeInfo = item.volumeInfo || {};
      const imageLinks = volumeInfo.imageLinks || {};

      let coverUrl = imageLinks.thumbnail || imageLinks.smallThumbnail || null;
      if (coverUrl) {
        coverUrl = coverUrl.replace("http://", "https://");
        coverUrl = coverUrl.replace("&edge=curl", "");
      }

      const industryIdentifiers = volumeInfo.industryIdentifiers || [];
      const isbn =
        industryIdentifiers.find((id: any) => id.type === "ISBN_13")?.identifier ||
        industryIdentifiers.find((id: any) => id.type === "ISBN_10")?.identifier ||
        undefined;

      return res.json({
        id: item.id,
        title: volumeInfo.title || "Unknown Title",
        author: volumeInfo.authors?.join(", ") || "Unknown Author",
        coverUrl,
        isbn,
        publisher: volumeInfo.publisher,
        publishedDate: volumeInfo.publishedDate,
        description: volumeInfo.description,
        pageCount: volumeInfo.pageCount || null,
      });
    } catch (error) {
      console.error("Error fetching book:", error);
      return res.status(500).json({ error: "Failed to fetch book" });
    }
  });

  // Image upload endpoint - bypasses RLS using service role key
  app.post("/api/upload", async (req: Request, res: Response) => {
    try {
      const { bucket, userId, imageBase64, contentType } = req.body;

      if (!bucket || !userId || !imageBase64) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!["club-covers", "reflections"].includes(bucket)) {
        return res.status(400).json({ error: "Invalid bucket" });
      }

      // Decode base64 image
      const buffer = Buffer.from(imageBase64, "base64");

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const fileName = `${userId}/${timestamp}_${randomId}.jpg`;

      // Upload using service role key (bypasses RLS)
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(fileName, buffer, {
          contentType: contentType || "image/jpeg",
          upsert: false,
        });

      if (error) {
        console.error("Storage upload error:", error);
        return res.status(500).json({ error: error.message });
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return res.json({ publicUrl: urlData.publicUrl });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // One-time migration: Add progress_type column to bookmarks table
  app.post("/api/migrate/add-progress-type", async (_req: Request, res: Response) => {
    try {
      // Check if column exists by querying a bookmark
      const { data: testData, error: testError } = await supabaseAdmin
        .from("bookmarks")
        .select("id, progress_type")
        .limit(1);

      if (testError && testError.message.includes("progress_type")) {
        // Column doesn't exist, we need to add it via raw SQL
        // Since Supabase doesn't support DDL via client, we'll handle this gracefully
        return res.json({ 
          success: false, 
          message: "Column doesn't exist. Please add progress_type column via Supabase dashboard.",
          sql: "ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS progress_type TEXT DEFAULT 'page';"
        });
      }

      return res.json({ success: true, message: "Column already exists or query succeeded", data: testData });
    } catch (error) {
      console.error("Migration error:", error);
      return res.status(500).json({ error: "Migration failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
