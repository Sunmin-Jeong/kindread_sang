# Kindread design system

Single source for color tokens: `client/constants/colors.ts`. Typography scale: `client/constants/typography.ts` (uses `client/constants/fonts.ts`).

## Color tokens (`COLORS`)

| Token | Hex / value | Usage |
|--------|----------------|--------|
| `bg` | `#F9F9F9` | App / screen background |
| `card` | `#FFFFFF` | Cards, profile header, feed rows |
| `green` | `#16A06A` | Primary accent, avatars, active states |
| `greenDark` | `#0D7A4F` | Pressed / emphasis |
| `greenDim` | `#E6F6EF` | Tinted backgrounds (clubs, chips) |
| `amber` | `#F59E0B` | Ratings, highlights |
| `blue` | `#1D4ED8` | Secondary accent (e.g. sessions) |
| `blueDim` | `#EFF6FF` | Session-tinted surfaces |
| `text` | `#0F0F0F` | Primary text |
| `sub` | `#6E6E6E` | Secondary text |
| `muted` | `#B0B0B0` | Tertiary / placeholders |
| `line` | `rgba(0,0,0,0.06)` | Dividers, hairlines |
| `quoteBg` | `#F0FAF5` | Blockquote / quote blocks (background) |
| `quoteText` | `#1A2E22` | Quote body text (not green; no decorative ❝) |
| `reviewDim` / `reviewText` | `#FEF3C7` / `#B45309` | Review-specific callouts |

## Feed query

Public / friends / club feeds: `post_type IN ('log','quote','review')` — excludes `NULL` and system events (e.g. club join). Post detail quotes: left border `2.5px` `COLORS.green`, fill `COLORS.quoteBg`, text `COLORS.quoteText`, `FONTS.serif`, 14 / 26, **no italic**, no large quotation mark character.

## Typography

- **Sans:** Pretendard (`FONTS` in `fonts.ts`) — UI, names, metadata.
- **Serif:** Noto Serif KR — long-form quotes in feed.
- **Scale:** See `Typography.feed.*`, `Typography.profile.*`, `Typography.tab.*` in `typography.ts`.

## Feed card

- Surface: `COLORS.card` on `COLORS.bg` list background.
- Separator: bottom border `COLORS.line` (not heavy shadows).
- Header: avatar `COLORS.green`, initials white; name `Typography.feed.username`; handle `Typography.feed.handle`; time `Typography.feed.timestamp`.
- Quote: left border `COLORS.green`, background `COLORS.quoteBg`.
- Actions: icons default `COLORS.sub`; like active can use accent red or keep brand — app uses filled heart when liked.

## Profile (Notebook tab)

- Screen: background `COLORS.bg`; top bar + hero: `COLORS.card`, divider `COLORS.line`.
- Display name: `Typography.profile.displayName`; handle: `Typography.profile.handle`.
- Primary actions (Edit): outline `COLORS.line`, label `COLORS.text`.
- Stats row: values `COLORS.text`, labels `Typography.profile.statLabel`.
