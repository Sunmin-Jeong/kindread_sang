# Kindread

## Overview
Kindread is a mobile-first application designed for sharing "Bookmarks"—personal notes and reflections tagged to specific books. It aims to replicate the experience of writing in physical book margins with a minimal, humanistic aesthetic inspired by paper and ink. The platform supports community interaction through a Feed, book discovery via Search, and personal library management in the Notebook. Key capabilities include dual-mode posting (quick Logs or detailed Reflections with images), robust book club functionalities, and social engagement features like likes and comments. The project envisions fostering a vibrant community of readers and expanding internationally by integrating diverse book search APIs.

## User Preferences
Preferred communication style: Simple, everyday language.

## Seed Data (Grant Application Demo)
Five editorial personas are seeded in Supabase using existing auth users:
- **Minjun** (KR) → `165613af-...` (wtf@naver.com)
- **Sarah** (US)  → `689adb52-...`
- **Kenji** (JP)  → `ac66a100-...`
- **Elena** (ES)  → `73b91c6f-...`
- **Jiho** (KR)   → `4a88eb14-...`

Seed includes: 5 books (Demian, The Alchemist, Human Acts, Justice, Man's Search for Meaning), 3 clubs (Midnight Philosophers ongoing club + 2 sessions), 4 bookmarks mixing Korean/English, 14 likes, 7 comments.
Seed script: `tsx server/seed.ts` (column names verified: clubs use `language_code`/`require_approval`/`host_id`, comments use `content` not `text_content`).

## System Architecture

### Frontend Architecture
- **Framework**: Expo SDK 54 with React Native 0.81 for cross-platform mobile and web.
- **Navigation**: React Navigation v7 with native stack and bottom tabs.
- **State Management**: TanStack React Query for server state, React Context for authentication.
- **Styling**: StyleSheet API with a custom theme system supporting light/dark modes.
- **Animations**: React Native Reanimated for micro-interactions and transitions.
- **Typography**: Pretendard (local OTF, 4 weights: Regular/Medium/SemiBold/Bold) for all UI text; Noto Serif KR (Google Fonts, 400/500) for quote content. Font constants in `client/constants/fonts.ts`.

### Backend Architecture
- **Framework**: Express.js 5 with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
- **Schema Location**: `shared/schema.ts` defines tables using Drizzle.
- **Storage Pattern**: Interface-based storage abstraction (`IStorage`).

### Core Features
- **Dual-Mode Posting**: Users can create quick "Logs" or detailed "Reflections" with multiple images.
- **Progress Tracking**: Tracks reading progress by page number or percentage with visual progress bars.
- **Book Search**: Integrates Google Books API and Naver Book API for comprehensive title discovery.
- **Book Clubs**: Supports two types of clubs (Session for one-time meetups and Club for ongoing groups) with features for creation, joining, member management, voting for books, and session scheduling.
- **Social Engagement**: Users can like, comment on, and share bookmarks. Includes real-time like counts and a dedicated comment section.
- **Notifications**: System for join requests, approvals, and general updates, with an unread badge indicator.
- **User Profiles**: Expanded profiles with personal details and language preferences.
- **Image Handling**: Multi-image uploads, full-screen image viewer, and carousel display for images in bookmarks.

### Database Schema (Supabase)
- **profiles**: User profiles linked to authentication.
- **books**: Stores book metadata including title, author, cover, and total pages.
- **bookmarks**: Core content, storing user notes, post type (`log`/`quote`/`review`), images, book reference, page progress, `rating` (NUMERIC 3,1), `quote_text` (TEXT), and club association.
- **bookmark_likes**: Records user likes on bookmarks.
- **bookmark_comments**: Stores comments on bookmarks.
- **clubs**: Stores club details, including type, format, and meeting information.
- **club_sessions**: Manages sessions within clubs.
- **club_votes**: Facilitates voting for books within clubs.
- **club_vote_responses**: Stores individual user responses to club book votes.
- **notifications**: Stores user notifications and their read status.
- **Flat Schema**: `book_id`, `page_number`, `progress_type`, `rating`, and `quote_text` are directly on the `bookmarks` table.
- **Migration**: `migration.sql` contains the DDL to add `rating`/`quote_text` columns and migrate old meta-encoded data. Run it once in the Supabase SQL editor. Until applied, the app uses legacy meta-decoding fallback automatically.

### Design System
- **Aesthetic**: "Paper & Ink" visual identity with a warm background (#F9F7F2) and dark text (#1A1A1A).
- **Typography**: Merriweather for titles and bookmark text, system font for navigation.
- **Icons**: Lucide-React-Native (20px, 1.5 stroke width).
- **Spacing**: Consistent 16px padding.
- **Components**: Redesigned BookmarkCard with 32px avatars, 50px book thumbnails; bottom navigation with icon-only tabs.

## External Dependencies

### Third-Party APIs
- **Google Books API**: Primary source for international book search and metadata.
- **Naver Book API**: Specialized for Korean book search, proxied via the backend to combine results with Google Books.

### Database
- **PostgreSQL**: Production database, configured via `DATABASE_URL`.
- **Drizzle Kit**: Used for database schema migrations.

### Backend Services
- **Supabase**: Provides authentication services and hosts the PostgreSQL database.
  - Requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

### Key NPM Dependencies
- `expo`: Mobile/web runtime.
- `@react-navigation/*`: Navigation framework.
- `@tanstack/react-query`: Data fetching and caching.
- `drizzle-orm` + `pg`: Database ORM and PostgreSQL driver.
- `@supabase/supabase-js`: Supabase client library.
- `react-native-reanimated`: Animation library.
- `expo-image`: Optimized image component.
- `expo-image-picker`: Multi-image selection.
- `@expo-google-fonts/merriweather`: Custom font.
- `@react-native-async-storage/async-storage`: Local storage.
- `lucide-react-native`: Icon library.