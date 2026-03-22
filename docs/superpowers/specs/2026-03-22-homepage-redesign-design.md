# Homepage Redesign — Design Spec

## Overview

Redesign the AffCritic homepage from a default-looking feed with bottom nav to a modern, polished interface with glassmorphism/SaaS aesthetic. The redesign covers layout, navigation, typography, color scheme, post presentation, and mobile experience.

## Design Decisions (validated via mockups)

| Decision | Choice |
|----------|--------|
| Visual style | Glassmorphism / SaaS |
| Color theme (light) | Cool White + Slate (#f8fafc bg, #0f172a accents) |
| Dark mode | Planned (not designed yet) |
| Font — body | Manrope (Google Fonts, cyrillic) |
| Font — logo | Outfit (Google Fonts, bold 800) |
| Post view | Timeline only (no Cards/List switcher) |
| Time filter | Година / День / Тиждень (pills in header) |
| Tag display | Pill tiles in right sidebar + /tags/ page |
| Logo | Satellite icon (dark square) + "AffCritic" text (Outfit 800) |

## Layout Architecture

### Desktop (>768px)

```
+---------------------------------------------------------------+
|  [icon] AffCritic          [search]   [Година|День|Тиждень]    |  <- dark header (#0f172a), full width, h=52px, fixed
+------+-----------------------------------------+--------------+
| [H]  |  Сьогодні, 14:30                       | КОМПАНІЇ  5 ▾ |
| [T]  |  ● ─────────────────────────────        | [Betsson 12]  |
| [C]  |  │ Summary text...                      | [1xBet 8]     |
| [T]  |  │ [tag1] [tag2]    @source · +2 ▾     | [Parimatch 6] |
|      |  │                                      |               |
| [☀]  |  ● Сьогодні, 09:15                     | GEO        4 ▾|
|      |  │ Summary text...                      | [Brazil 9]    |
|      |  │ [tag1] [tag2]    @source             | [Nigeria 7]   |
|      |                                         |               |
+------+-----------------------------------------+--------------+
|  [footer: logo, links, copyright — dark, rounded top corners] |
+---------------------------------------------------------------+
```

- **Header**: fixed, full width, dark (#0f172a), z-index 15
  - Left: burger (mobile only) + logo icon (32x32, bg rgba(255,255,255,0.1)) centered in 56px + "AffCritic" (Outfit 800, white)
  - Right: search box (220px, semi-transparent) + time filter pills (Година/День/Тиждень)
- **Left sidebar**: fixed, 56px wide, starts below header (top: 53px), bg #f1f5f9, border-right #e2e8f0
  - Icon-only nav: Home, Topics, Channels, Tags (SVG icons from lucide)
  - Theme toggle (sun/moon) at bottom (margin-top: auto)
- **Main content**: margin-left 56px, margin-right 200px, padding-top 77px
  - Timeline view with vertical line, dots, time labels, glass cards
- **Right sidebar**: fixed, 200px wide, starts below header (top: 53px), bg #f1f5f9, border-left #e2e8f0
  - Tag tiles grouped by category, collapsible with chevron, count per category
  - Each tag: pill with post count
- **Footer**: full width (margin-left: 56px, margin-right: 200px), dark (#0f172a), rounded top corners (12px)
  - Logo (Outfit), description, nav links, copyright

### Mobile (<768px)

- **Header**: full width, dark, h=52px
  - Left: burger menu + logo icon + "AffCritic"
  - Right: search icon button + time filter pills
  - Search: icon button, on click expands input overlay covering logo/title, close with ✕
- **Left sidebar**: hidden, replaced by burger drawer (slide from left, 260px, with nav items as text + icons)
- **Right sidebar**: hidden, replaced by FAB button (bottom-right, 48px circle, dark) opening tags drawer (slide from right, 280px)
- **Main content**: full width, no margins
- **Footer**: full width, no rounded corners
- **Overlay**: semi-transparent backdrop for both drawers

## Timeline Component

### Structure per post

```html
<div class="tl-item">
  <div class="tl-time">Сьогодні, 14:30</div>  <!-- dot generated via ::before pseudo-element, aligned with text -->
  <div class="tl-card">
    <div class="tl-summary">Summary text (13px, line-height 1.7, #334155)</div>
    <div class="tl-footer">  <!-- border-top separator -->
      <div class="tl-tags">[tag pills left]</div>
      <div class="tl-sources">@channel · +N ▾ [right]</div>
    </div>
    <div class="tl-sources-expanded">  <!-- hidden, toggle on +N click -->
      <div class="tl-src-item">@channel  truncated text...  ↗</div>
    </div>
  </div>
</div>
```

### Timeline vertical line

- `::before` pseudo on `.timeline` container, 1px, #e2e8f0
- Dots: `::before` on `.tl-time`, 9px circle, #0f172a, border 2px solid #f8fafc, z-index 1
- Dots aligned vertically with time text center

### Post card

- Background: #fff, border: 1px solid #e2e8f0, border-radius: 12px, padding: 16px
- Shadow: 0 1px 3px rgba(0,0,0,0.04)
- Hover: border-color #cbd5e1, shadow 0 2px 6px rgba(0,0,0,0.06)

### Footer row (tags + sources)

- Flex row, justify-content: space-between
- Tags (left): pill badges, #f1f5f9 bg, #e2e8f0 border, #334155 text, 10px, rounded 10px
- Sources (right): @channel as muted link (#94a3b8), "+N ▾" clickable to expand
- Expanded sources: bg #f8fafc, border #e2e8f0, rounded 8px, each row: @channel + truncated text + ↗ link

### Mobile timeline

- Footer switches to column layout (tags above, sources below aligned right)
- Summary font-size: 14px

## Color Tokens (CSS Custom Properties)

### Light theme (Cool White + Slate)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-page` | `#f8fafc` | Page background |
| `--bg-card` | `#ffffff` | Card backgrounds |
| `--bg-sidebar` | `#f1f5f9` | Left/right sidebar bg |
| `--bg-dark` | `#0f172a` | Header, footer |
| `--text-primary` | `#0f172a` | Headings |
| `--text-body` | `#334155` | Body text |
| `--text-muted` | `#94a3b8` | Secondary text, sources |
| `--text-faint` | `#cbd5e1` | Tertiary text |
| `--border` | `#e2e8f0` | Borders |
| `--border-hover` | `#cbd5e1` | Hover borders |
| `--bg-tag` | `#f1f5f9` | Tag pill background |
| `--bg-input` | `#f1f5f9` | Search input bg |
| `--timeline-line` | `#e2e8f0` | Timeline vertical line |
| `--timeline-dot` | `#0f172a` | Timeline dots |

### Dark header/footer elements

| Token | Value | Usage |
|-------|-------|-------|
| `--dark-bg` | `#0f172a` | Header/footer bg |
| `--dark-text` | `#ffffff` | Logo, active pill |
| `--dark-muted` | `rgba(255,255,255,0.4)` | Inactive pills, search text |
| `--dark-input-bg` | `rgba(255,255,255,0.08)` | Search bg, pill bg |
| `--dark-input-border` | `rgba(255,255,255,0.1)` | Search border |
| `--dark-active-bg` | `rgba(255,255,255,0.15)` | Active pill bg |
| `--dark-logo-icon-bg` | `rgba(255,255,255,0.1)` | Logo icon bg |

## Typography

| Element | Font | Weight | Size | Color |
|---------|------|--------|------|-------|
| Logo text | Outfit | 800 | 18px | white (header) / #0f172a (footer) |
| Page title | Manrope | 700 | 16px | #0f172a |
| Summary | Manrope | 400 | 13px (desktop) / 14px (mobile) | #334155 |
| Time label | Manrope | 500 | 10px | #94a3b8 |
| Tag pill | Manrope | 500 | 10px | #334155 |
| Source link | Manrope | 500 | 10px | #94a3b8 |
| Sidebar category | Manrope | 600 | 10px uppercase | #94a3b8 |
| Sidebar tag tile | Manrope | 500 | 10px | #334155 |
| Tag count | Manrope | 500 | 9px | #94a3b8 |
| Search placeholder | Manrope | 400 | 12px | #94a3b8 / rgba(255,255,255,0.4) |
| Footer links | Manrope | 500 | 12px | #94a3b8, hover #fff |
| Footer copy | Manrope | 400 | 11px | #475569 |

## Components Affected

### New components

| Component | Type | Description |
|-----------|------|-------------|
| `AppSidebar.tsx` | Client | Left icon sidebar with nav icons + theme toggle |
| `AppHeader.tsx` | Client | Dark header: logo, search, time filter, mobile burger |
| `TimelineView.tsx` | Client | Timeline layout wrapping PostCards |
| `TagPanel.tsx` | Client | Right sidebar: collapsible tag categories with pill tiles |
| `AppFooter.tsx` | Server | Dark footer: logo, links, copyright |
| `MobileNavDrawer.tsx` | Client | Slide-in nav drawer (left) for mobile |
| `MobileTagsDrawer.tsx` | Client | Slide-in tags drawer (right) for mobile |

### Modified components

| Component | Changes |
|-----------|---------|
| `PostCard.tsx` | Restructure footer: tags left, sources right on same row. Remove header source link (move to footer). Timeline card styling. |
| `PostSources.tsx` | Update expanded sources styling (bg #f8fafc, each row: @channel + text + ↗) |
| `TagChip.tsx` | Update to pill style (rounded 10px, #f1f5f9 bg, #e2e8f0 border) |
| `Feed.tsx` | Wrap in Timeline container |
| `FeedClient.tsx` | Remove merge toolbar styling updates, timeline wrapper |
| `Sidebar.tsx` | Refactor to TagPanel (pill tiles, collapsible with count) |
| `layout.tsx` | Replace FolderNav with AppHeader + AppSidebar, add AppFooter |
| `globals.css` | New color tokens, Manrope/Outfit fonts, remove oklch system |
| `app/page.tsx` | Remove HomeStats header, use new layout |

### Removed components

| Component | Reason |
|-----------|--------|
| `FolderNav.tsx` | Replaced by AppSidebar (desktop) + MobileNavDrawer (mobile) |
| `SidebarServer.tsx` → `DesktopSidebar` | Replaced by TagPanel |
| `SidebarServer.tsx` → `MobileSidebarButton` | Replaced by FAB + MobileTagsDrawer |

## Time Filter (Година / День / Тиждень)

New feature in header. Filters feed posts by time range:
- **Година**: posts from last 1 hour
- **День**: posts from last 24 hours (default)
- **Тиждень**: posts from last 7 days

Implementation:
- State in FeedClient or lifted to page level via URL query param (`?period=hour|day|week`)
- Passed to Feed.tsx / API as date filter on `posts.createdAt`
- Pills in header: active state = dark bg (#0f172a on light / rgba(255,255,255,0.15) on dark header)

## Fonts Setup

Replace current Geist + Inter with:
- **Manrope**: `next/font/google` with `subsets: ['latin', 'cyrillic']`, weights [400, 500, 600, 700, 800]
- **Outfit**: `next/font/google` with `subsets: ['latin']`, weights [700, 800] — logo only

Both loaded via `next/font/google` for optimal performance (no external requests).

## Admin Mode

No visual changes to admin controls. They continue to work within the new card layout:
- Checkbox for merge selection
- Edit summary / tags buttons
- Delete (×) button
- Admin controls appear when `?admin=1` is in URL

## Pages NOT in scope

- `/topics/`, `/topics/[slug]/` — keep current layout, apply new color tokens
- `/channels/`, `/channels/[username]/` — keep current layout, apply new color tokens
- `/tags/`, `/tags/[slug]/` — keep current layout, apply new color tokens
- `/admin/*` — no changes
- `/about/` — not implemented yet
- Dark mode — planned separately

## Mockup Reference

Final approved mockup: `.superpowers/brainstorm/67704-1774205980/sources-expand.html`
