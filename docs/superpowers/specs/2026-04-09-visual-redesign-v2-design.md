# AffCritic Visual Redesign v2

> Date: 2026-04-09
> Status: Draft

## Overview

Complete visual redesign of AffCritic public-facing pages. The component structure, logic, and all API/backend code remain unchanged. Only the visual layer changes: CSS, fonts, color palette, and minor template adjustments for navigation restructuring.

## Design Decisions

### Aesthetic Direction
Modern dark dashboard — technical, professional, "insider tool" feel. Inspired by Bloomberg Terminal, Linear, Raycast.

### Color Scheme: Neon Emerald

**Dark theme (default, `:root`):**

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0A0F0D` | Page background |
| `--surface` | `#0D1410` | Cards, panels, topbar |
| `--surface-2` | `#162016` | Hover states, inputs, secondary surfaces |
| `--border` | `rgba(255,255,255,0.06)` or `#162016` | Borders |
| `--border-hover` | `rgba(255,255,255,0.12)` | Hover borders |
| `--text` | `#E4E4E7` | Primary text |
| `--text-secondary` | `#A1A1AA` | Secondary text |
| `--text-muted` | `#52525B` | Muted text, timestamps |
| `--accent` | `#10B981` | Emerald — primary accent |
| `--accent-muted` | `rgba(16,185,129,0.12)` | Accent backgrounds |
| `--accent-text` | `#34D399` | Lighter accent for text on dark |
| `--tag-bg` | `rgba(16,185,129,0.10)` | Tag chip background |
| `--tag-text` | `#10B981` | Tag chip text |
| `--green` | `#22C55E` | Score good |
| `--amber` | `#F59E0B` | Score warning |
| `--red` | `#EF4444` | Score bad, destructive |
| `--red-bg` | `rgba(239,68,68,0.10)` | Destructive backgrounds |
| `--green-bg` | `rgba(34,197,94,0.12)` | Score good background |
| `--amber-bg` | `rgba(245,158,11,0.12)` | Score warning background |
| `--tag-hover-bg` | `rgba(16,185,129,0.20)` | Tag hover background |
| `--tag-hover-text` | `#34D399` | Tag hover text |
| `--source-bg` | `rgba(255,255,255,0.025)` | Source panel background |

**Light theme (`.light`):**

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#F8FAF9` | Page background (slight green tint) |
| `--surface` | `#FFFFFF` | Cards, panels |
| `--surface-2` | `#EFF3F0` | Secondary surfaces |
| `--border` | `rgba(0,0,0,0.08)` | Borders |
| `--text` | `#1A1A1A` | Primary text |
| `--text-secondary` | `#555555` | Secondary text |
| `--text-muted` | `#999999` | Muted text |
| `--border-hover` | `rgba(0,0,0,0.18)` | Hover borders |
| `--accent` | `#059669` | Darker emerald for light bg |
| `--accent-muted` | `rgba(5,150,105,0.10)` | Accent backgrounds |
| `--accent-text` | `#047857` | Accent text on light |
| `--tag-bg` | `rgba(5,150,105,0.08)` | Tag chip background |
| `--tag-text` | `#059669` | Tag text on light |
| `--tag-hover-bg` | `rgba(5,150,105,0.14)` | Tag hover background |
| `--green` | `#16A34A` | Score good |
| `--amber` | `#D97706` | Score warning |
| `--red` | `#DC2626` | Score bad |
| `--tag-hover-text` | `#047857` | Tag hover text |
| `--red-bg` | `rgba(220,38,38,0.08)` | Destructive backgrounds |
| `--green-bg` | `rgba(22,163,74,0.08)` | Score good background |
| `--amber-bg` | `rgba(217,119,6,0.08)` | Score warning background |
| `--source-bg` | `rgba(0,0,0,0.02)` | Source panel background |

### Typography

**Fonts (Google Fonts):**
- **Display/headings/logo:** JetBrains Mono (monospace) — terminal/hacker aesthetic
- **Body/UI:** Inter — clean, universal readability

**Application:**
- `h1`, `.feed-title`, `.logo`: `'JetBrains Mono', monospace`
- `.card-time`, timestamps, counts: `'JetBrains Mono', monospace` — small, uppercase, letter-spaced
- Everything else: `'Inter', system-ui, sans-serif`

### Navigation: Topbar + Horizontal Links

**Current structure:** Topbar (logo + search) + LeftNav (72px fixed icon rail) + Sidebar (tags filter)

**New structure:** Topbar (logo + nav links + search + theme toggle) + Sidebar (tags filter, unchanged)

**Nav link labels:** Стрічка, Теми, Канали — same as current LeftNav. "Про нас" removed from desktop nav per user request. `/about/` page not yet implemented (see progress.md TODO), so no broken link.

**Changes required:**
1. **Remove LeftNav component** from `layout.tsx` render (keep file for potential future use)
2. **Update Topbar** to include horizontal nav links: Стрічка `/`, Теми `/topics`, Канали `/channels` — with active state detection (same logic as current LeftNav `isActive`)
3. **Remove "Додати канал" CTA button** from Topbar — not functional, placeholder `href="#"`
4. **Remove `--nav-w: 72px`** CSS variable and `.d-nav` / `.d-nav-*` classes — dead code after LeftNav removal
5. **Update `.d-body` layout** — without LeftNav, `.d-body` is just a centered container. Keep `max-width: 1280px`. Content areas (sidebar + feed grid) are set per-page, so width is already handled.
6. **BottomNav (mobile)** — keep all 4 items as-is (Стрічка, Теми, Канали, Про нас)
7. **Sidebar** — width and position unchanged, just recolored
8. **`FolderNav.tsx`** — already unused in current layout (replaced by LeftNav in session 64). No changes needed, kept as-is.

**Topbar layout:**
```
[Logo: AffCritic] [Стрічка] [Теми] [Канали]     [Search] [ThemeToggle]
```

### Post Card Design

**No structural changes.** Keep current component hierarchy:
- `card-header` (time + admin controls)
- `card-summary` (full text)
- `card-tags` (TagChip components)
- `card-footer` + `PostSources` (expandable)

Restyle with new palette only.

### Components Summary

| Component | Change Type |
|-----------|------------|
| `globals.css` | **Major restyle** — new palette, typography, all class styles. Preserves class names and CSS architecture. |
| `layout.tsx` | **Edit** — new font URL, remove LeftNav from render |
| `Topbar.tsx` | **Edit** — add horizontal nav links (Стрічка, Теми, Канали) |
| `LeftNav.tsx` | **No render** — removed from layout, file kept |
| `MobileHeader.tsx` | **CSS only** — new palette via CSS vars |
| `BottomNav.tsx` | **CSS only** — new palette via CSS vars |
| `PostCard.tsx` | **CSS only** |
| `Sidebar.tsx` | **CSS only** |
| `Footer.tsx` | **CSS only** |
| `TagChip.tsx` | **CSS only** |
| `PostSources.tsx` | **CSS only** |
| `TimeSwitcher.tsx` | **CSS only** |
| `Breadcrumbs.tsx` | **CSS only** |
| `ActiveFilters.tsx` | **CSS only** |
| `ThemeToggle.tsx` | **CSS only** |
| `FeedClient.tsx` | **CSS only** |
| `EntityHeader.tsx` | **CSS only** |
| All admin pages | **CSS only** — via design token inheritance |
| All API routes | **No change** |
| All lib/ files | **No change** |

### What Does NOT Change

- Component logic and props
- API routes and data fetching
- Database schema and pipeline
- Admin panel functionality
- Mobile component structure (MobileHeader, BottomNav)
- Sidebar tag filtering logic
- Theme switching logic (dark/light/system)
- URL structure
- Footer, breadcrumbs, TimeSwitcher — structure preserved

### CSS Architecture

Preserved from current:
- Dark-first: `:root` = dark, `.light` = light overrides
- `@custom-variant light (.light &)` for Tailwind v4
- `@theme inline` block for shadcn/ui compatibility
- All existing CSS class names that are referenced by components

**Preserved layout variables:**
- `--nav-h` (topbar height, used by topbar and sidebar sticky positioning)
- `--sidebar-w` (sidebar width, used by page grids)

**Removed (dead code after LeftNav removal):**
- All `.d-nav`, `.d-nav-inner`, `.d-nav-item`, `.d-nav-icon`, `.d-nav-icon-active`, `.d-nav-icon-inactive`, `.d-nav-label` classes
- `--nav-w` CSS variable

**Removed (no longer used):**
- `--glass-bg`, `--glass-blur`, `--glass-border` — frosted glass tokens (no component uses backdrop-filter in new design)

**Added:**
- `.topbar-nav`, `.topbar-link`, `.topbar-link.active` — horizontal nav links in Topbar

### Pre-existing Uncommitted Changes

`git status` shows uncommitted changes to `PostCard.tsx` and `todo.md`. These are unrelated to this redesign and should be committed or stashed before implementation.

### Files Changed (exhaustive)

1. `app/globals.css` — full rewrite
2. `app/layout.tsx` — font URL, remove LeftNav from JSX
3. `components/Topbar.tsx` — add nav links
