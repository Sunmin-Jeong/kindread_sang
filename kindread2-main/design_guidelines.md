# Kindread - Design Guidelines

## Brand Identity
**Purpose**: A minimal, humanistic platform for sharing literary reflections ("Bookmarks") tagged to specific books. Feels like a digital extension of a physical library.

**Aesthetic Direction**: Paper & Ink - tactile, light, editorial. The app evokes the experience of writing in the margins of a physical book with an emphasis on typography and negative space.

**Memorable Element**: The visual relationship between book cover thumbnails and text reflections. Every Bookmark displays the book cover as a visual anchor.

## Navigation Architecture
**Root Navigation**: Tab Bar (bottom, icons only, no labels)
- Feed (Home icon) - Bookmark feed from community
- Search (Search icon) - Book discovery
- Notebook (Book icon) - User profile/library

## Dual-Mode Posting

### Log (Quick Update)
Ultra-compact single-line format using LogTicker component:
- Layout: `[32px Avatar] [User] read [X pages/%] of [Title] by [Author] · [Club] · [Time] [30x45px Thumbnail]`
- Book thumbnail aligned to the right edge
- All content on a single line with ellipsis truncation
- 1px bottom border separator
- Minimal vertical padding (12px)

### Reflection (Long-form)
Full BookmarkCard component:
- 1px border (no shadows)
- Header: 32px avatar, username (bold), timestamp, more options
- Book info row: 50x75px cover, serif title, author
- Body: 15px serif text with 1.6 line height
- Images: Horizontal scroll gallery, full-width
- Footer: Like, Comment, Share icons with counts

## Screen-by-Screen Specifications

### 1. Feed Screen
**Purpose**: Browse community Bookmarks
**Layout**:
- Header: Transparent, title "Kindread" centered, serif font
- Filter tabs: Minimalist underlined text ("All", "Logs", "Reflections")
- Content: Mixed LogTicker (for logs) and BookmarkCard (for reflections)
- Safe area: top = headerHeight + 24px, bottom = tabBarHeight + 24px

**Filter Tab Style**:
- Horizontal row with 1px bottom border
- Active tab: 2px bottom border in text color, bold text
- Inactive tab: No border, regular weight, tertiary color

### 2. Search Screen
**Purpose**: Discover books via Google Books API and Naver API
**Layout**:
- Header: Search bar (sticky at top)
- Tabs: "Books" and "Clubs" toggle
- Content: Search results grid (3 columns)
- Safe area: top = headerHeight + 24px, bottom = tabBarHeight + 24px

**Book Card**:
- Cover image (calculated width based on screen)
- 1px border around cover
- Title (serif, 2 lines max)
- Author (sans-serif, 1 line)
- Tap → Book Detail screen

### 3. Notebook Screen (Profile)
**Purpose**: User's personal library and Bookmarks
**Layout**:
- Header: Transparent, username (serif), settings/notifications buttons
- Profile section: 64px avatar, username, bio, location, languages
- My Clubs section: Horizontal scroll of club cards
- Filter tabs: Same minimalist underlined style as Feed
- Content: User's Bookmarks (same components as Feed)
- Safe area: top = headerHeight + 24px, bottom = tabBarHeight + 24px

### 4. Bookmark Detail Screen
**Purpose**: Full view of a single Bookmark
**Layout**:
- Header: Back button (left)
- Book info: 60x90px cover, serif title, author, progress
- Content: Full text with optional image gallery
- Interaction bar: Like (with count), Share
- Comments section: List of comments with input at bottom

### 5. Create Bookmark Screen (Modal)
**Purpose**: Write and tag Bookmark to a book
**Layout**:
- Header: Cancel (left), "Post" (right, accent color)
- Mode toggle: Log / Reflection pills
- Text area: Placeholder changes based on mode
- Book tagging: Search and select single book
- Progress input: Page # or % toggle
- Image picker: Up to 3 images for Reflections only

## Color Palette
- **Background**: #F9F9F7 (Cool Book Paper)
- **Text Primary**: #1A1A1A (Ink)
- **Accent**: #2D5A27 (Forest Green) - buttons, active states
- **Surface**: #FFFFFF (Card backgrounds)
- **Text Secondary**: #666666
- **Text Tertiary**: #888888
- **Border**: #E5E5E5 (consistent 1px borders)
- **Divider**: #F0F0F0 (subtle separators)

## Typography
- **Serif Font**: Merriweather (via Google Fonts) for book titles, Bookmark text
- **Sans-Serif Font**: System font (SF Pro/Roboto) for navigation, usernames, metadata
- **Scale**:
  - App Title: 18px, Bold, Serif
  - Book Title: 14-15px, Bold, Serif
  - Bookmark Text: 15px, Regular, Serif, 1.6 line height
  - Username: 14px, Bold, Sans-serif
  - Metadata: 12px, Regular, Sans-serif
  - Caption: 11px, Regular, Sans-serif

## Visual Design Principles

### No Shadows - Use Borders
- Replace all drop shadows with 1px #E5E5E5 borders
- Cards: `borderWidth: 1, borderColor: '#E5E5E5'`
- Dividers: 1px horizontal lines between list items

### Compact Density
- LogTicker: Single line, minimal padding (12px vertical)
- BookmarkCard: Tight spacing, clear hierarchy
- Lists: Minimal gaps between items

### Serif for Literary Content
- Book titles always use Merriweather
- Bookmark text uses Merriweather
- All other UI text uses system font

### Minimalist Filter Tabs
- No pill backgrounds
- Just text with underline for active state
- Border-bottom on container for visual grounding

## Icon System
- Library: Lucide-React-Native
- Size: 20px for navigation, 18px for actions
- Stroke width: 1.5
- Color: Adapts to light/dark mode

## Assets
1. **icon.png** - App icon with book motif
2. **splash-icon.png** - Same as app icon for launch screen
3. **adaptive-icon.png** - Android adaptive icon

All visual elements maintain the paper/ink aesthetic with emphasis on typography and negative space over decorative elements.
