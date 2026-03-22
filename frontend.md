# Frontend Documentation

## Tech Stack

| Технологія | Версія | Призначення |
|-----------|--------|-------------|
| Next.js | 16.2.1 | App Router, SSR, API Routes |
| React | 19.2.4 | UI framework |
| TypeScript | 5.9.3 | Типізація |
| Tailwind CSS | 4.2.2 | Utility-first стилізація |
| shadcn/ui | 4.1.0 | UI компоненти (поки тільки Button) |
| Recharts | 3.8.0 | Графіки в admin dashboard |
| @dnd-kit | 6.3.1 | Drag-and-drop сортування |
| lucide-react | — | Іконки |
| clsx + tailwind-merge | — | Утиліти для className |

---

## Архітектура компонентів

### Server vs Client

**Server Components** (async, data fetching через Prisma):
- `Feed.tsx` — fetch постів з фільтрами
- `SidebarServer.tsx` — fetch тегів / категорій каналів
- `FolderNavServer.tsx` — fetch категорій для навігації
- `EntityHeader.tsx` — header для tag page
- `TagChip.tsx` — badge-link тега

**Client Components** (`"use client"`, інтерактивність):
- `FeedClient.tsx` — пагінація, merge/split
- `PostCard.tsx` — картка поста з admin controls
- `PostInlineEdit.tsx` — inline редагування summary
- `PostTagEditor.tsx` — autocomplete редактор тегів
- `PostSources.tsx` — expandable список джерел
- `Sidebar.tsx` — пошук/фільтр тегів або категорій каналів
- `FolderNav.tsx` — горизонтальне меню категорій
- `ChannelsPage.tsx` — каталог каналів зі stats
- `TopicsPage.tsx` — hub категорій + тегів
- `AdminContext.tsx` / `AdminWrapper.tsx` — admin mode context
- `DashboardCharts.tsx` — графіки Recharts

### Патерн: Server → Client

Server component fetch'ить дані через Prisma → серіалізує → передає як props до Client component. Приклад:

```
Feed.tsx (server: prisma.post.findMany)
  → FeedClient.tsx (client: state, pagination, merge/split)
    → PostCard.tsx (client: edit, delete, tag editor)
```

```
SidebarServer.tsx (server: prisma.tagCategory.findMany)
  → Sidebar.tsx (client: search, collapse/expand)
```

---

## State Management

- **Локальний state** (`useState`) — форми, selections, loading states
- **React Context** — тільки для admin mode (`AdminContext`)
- **URL query params** — `?admin=1` для admin mode
- **Без глобального store** (Redux/Zustand не використовуються)

---

## Компоненти: детальний опис

### Feed.tsx (Server)

```typescript
Props: { folder?: string, channel?: string, tag?: string }
```

- Fetch постів з Prisma: `isDeleted=false`, `summary IS NOT NULL`
- Фільтри: по folder (channel_categories slug), channel (username), tag (slug)
- PAGE_SIZE = 20
- Include: postSources → channel, postTags → tag → category
- Тільки active теги (`status: "active"`)
- Exports: `Feed`, `buildWhere`, `postInclude`, `serializePost`

### FeedClient.tsx (Client)

```typescript
Props: {
  initialPosts: PostData[]
  total: number
  pageSize: number
  folder?: string
  channel?: string
  tag?: string
}
```

State:
- `posts[]` — поточні видимі пости
- `page` — сторінка пагінації
- `selected: Set<string>` — для merge (checkbox selection)
- `merging, splitting` — стани операцій

Функціонал:
- **Load more** — кнопка "Показати ще", завантажує наступну сторінку
- **Merge** — sticky toolbar з кількістю вибраних, POST `/api/posts/merge`
- **Split** — POST `/api/posts/{id}/split` з sourceId
- **Delete callback** — видаляє пост зі списку

### PostCard.tsx (Client)

```typescript
interface PostData {
  id: string
  summary: string | null
  summaryScore: number | null
  createdAt: string
  postSources: PostSource[]
  postTags: PostTag[]
}

interface PostSource {
  id: string
  tgUrl: string | null
  originalText: string | null
  channel: { username: string, displayName: string | null }
}

interface PostTag {
  tag: { name: string, slug: string, category: { name: string, slug: string } | null }
}
```

State:
- `editingSummary, editingTags, deleting` — boolean toggles
- `currentPost` — локальна копія для оптимістичних оновлень

UI:
- Summary повний текст (без обрізання)
- Теги як TagChip → `/tag/{slug}/`
- Перше джерело: `@channel` → TG URL (`rel="nofollow noopener noreferrer"` + `target="_blank"`)
- Додаткові джерела: кнопка `+N ▼` → PostSources (expand/collapse)
- Score badge: >= 0.75 green, 0.60-0.74 amber, < 0.60 red
- Relative time: "только что", "Xм", "Xч", "Xд", потім ru-RU дата

Admin controls (при `useAdmin()` = true):
- Checkbox для merge selection
- Кнопка edit summary → PostInlineEdit
- Кнопка edit tags → PostTagEditor
- Кнопка × delete (soft delete через PATCH)

### PostInlineEdit.tsx (Client)

```typescript
Props: { postId: string, currentSummary: string, onSave(text: string): void, onCancel(): void }
```

- Textarea (4 rows) + Save/Cancel
- PATCH `/api/posts/{id}` з `{ summary }`
- Loading state на кнопці Save

### PostTagEditor.tsx (Client)

```typescript
Props: { postId: string, currentTags: PostTag[], onUpdate(tags: PostTag[]): void, onClose(): void }
```

Функціонал:
- Autocomplete пошук тегів (по name + aliases)
- Dropdown з макс 8 результатів
- Створення нового тега inline (name → auto slug через translit)
- Вибір категорії для нового тега
- Видалення тега з поста

API:
- GET `/api/tags?status=active` — список тегів
- GET `/api/tag-categories` — категорії
- POST `/api/tags` — створити тег
- POST `/api/posts/{id}/tags` — додати тег
- DELETE `/api/posts/{id}/tags?tagId=X` — видалити тег

Translit: маппінг кириличних символів → латиниця для slug (а→a, б→b, в→v, ..., я→ya)

### PostSources.tsx (Client)

```typescript
Props: { sources: PostSource[], postId?: string, onSplit?(postId: string, sourceId: string): void }
```

- Приховані якщо `sources.length <= 1`
- Кнопка `+N ▼` для розкриття
- Кожне джерело: `@channel` link + truncated text (100 символів)
- Split кнопка per source (admin only)

### TagChip.tsx (Server)

```typescript
Props: { name: string, slug: string, categoryName?: string }
```

- Link → `/tag/{slug}/`
- Badge з border, category name як prefix
- Hover ефекти

### Sidebar.tsx (Client)

```typescript
Props: {
  groups: TagGroup[]                        // mode="tags"
  mode?: "tags" | "channels"
  channelCategories?: ChannelCategoryItem[] // mode="channels"
  activeCategorySlug?: string | null
  onCategorySelect?: (slug: string | null) => void
}

interface TagGroup {
  category: string
  categorySlug: string
  tags: { name: string, slug: string, count: number, aliases: string[] }[]
}
```

**Tags mode** (default):
- Пошук по name/aliases з clear button
- Collapsible категорії (expand/collapse state)
- Теги відсортовані по count DESC
- Click → `/tag/{slug}/`
- К-ть постів біля кожного тега

**Channels mode:**
- Категорії каналів як кнопки
- "Всі" option зверху
- К-ть каналів per category
- Selection state (activeCategorySlug)

Exports: `Sidebar`, `SidebarDrawer` (mobile overlay з Escape close)

### SidebarServer.tsx (Server)

- `SidebarServer()` — fetch tag categories з active tags (тільки ті, що мають postTags)
- `ChannelCategoriesSidebarServer()` — fetch channel categories з counts
- `DesktopSidebar()` — обгортка `w-64 hidden lg:block`
- `MobileSidebarButton()` — trigger для мобільного drawer

### FolderNav.tsx (Client)

```typescript
Props: { folders: { name: string, slug: string }[] }
```

- Горизонтальна навігація: "Всі" (→ `/`) + категорії (→ `/topics/{slug}/`)
- Active state: `bg-foreground text-background font-medium`
- Визначає active route через `usePathname()`
- `overflow-x-auto` для скролу

### FolderNavServer.tsx (Server)

- Fetch `channelCategory.findMany({ orderBy: { sortOrder: "asc" } })`
- Повертає `FolderNav` з categories

### EntityHeader.tsx (Server)

```typescript
Props: { tagName: string, categoryName: string | null, mentionsCount: number }
```

- Назад link → "/"
- Tag name як h1
- Badge з кількістю згадок
- Category name як subtitle

### ChannelsPage.tsx (Client)

```typescript
Props: {
  channels: ChannelData[]      // username, displayName, isActive, categories[], stats
  categories: Category[]
  totals: { today, week, month, allTime }
}
```

- Таблиця каналів зі stats колонками (today/week/month/allTime)
- Share % розрахунок
- Фільтр по категоріях через Sidebar (mode="channels")
- Badges для inactive каналів
- Desktop + mobile sidebar

### TopicsPage.tsx (Client)

```typescript
Props: {
  categories: CategoryTile[]    // name, slug, channelCount
  tagGroups: TagGroupData[]     // categoryName, categorySlug, tags[]
}
```

- Grid категорій (3 cols lg) → `/topics/{slug}/`
- Групи тегів по категоріях → `/tag/{slug}/`
- Post count на кожному тезі
- Хелпер для ukrainian plural declension

### AdminContext.tsx + AdminWrapper.tsx (Client)

- `AdminProvider` — React Context з boolean `isAdmin`
- `useAdmin()` hook
- `AdminWrapper` — детектує `?admin=1` через `useSearchParams()`
- Hydration-safe: `useState` + `useEffect` (не SSR)

### DashboardCharts.tsx (Client)

- Period selector: Day / Week / Month / All
- Chart 1: GPT Cost (BarChart, emerald)
- Chart 2: Posts (LineChart, 3 лінії: processed/summaries/unprocessed)
- API: GET `/api/admin/charts?period={period}`
- Recharts з custom Tooltip/Legend

---

## Сторінки

### Публічні

| Route | Файл | Тип | Опис |
|-------|------|-----|------|
| `/` | `app/page.tsx` | Server | Feed + Sidebar + HomeStats (raw post counts) |
| `/topics/` | `app/topics/page.tsx` | Server | TopicsPage: category tiles + tag tiles |
| `/topics/[slug]/` | `app/topics/[slug]/page.tsx` | Server | Category feed + Sidebar |
| `/channels/` | `app/channels/page.tsx` | Server | ChannelsPage: stats table + sidebar filter |
| `/channels/[username]/` | `app/channels/[username]/page.tsx` | Server | Channel feed + header |
| `/tag/[slug]/` | `app/tag/[slug]/page.tsx` | Server | EntityHeader + Feed (тільки active теги, 404 для pending) |

### Layout

**`app/layout.tsx`** (Server):
- Fonts: Geist (sans), Inter (cyrillic)
- `<html lang="ru">` з geist font variable
- Border-top bar з `FolderNavServer`
- `AdminWrapper` для context
- Suspense boundaries

### Структура публічної сторінки

```
layout.tsx
├── FolderNavServer → FolderNav (горизонтальне меню категорій)
├── AdminWrapper (context provider)
└── page.tsx
    ├── Header (title + stats)
    ├── Main content
    │   ├── Feed → FeedClient → PostCard[]
    │   └── DesktopSidebar (hidden mobile)
    └── MobileSidebarButton (lg:hidden)
```

### Admin

| Route | Файл | Опис |
|-------|------|------|
| `/admin/` | `app/admin/page.tsx` | Dashboard: metrics grid (8 cards), charts, quick actions (scraper/pipeline), recent logs, nav grid |
| `/admin/channels/` | `app/admin/channels/page.tsx` | CRUD каналів: add (strip @, multi-select categories), toggle active, delete |
| `/admin/topics/` | `app/admin/topics/page.tsx` | CRUD channel_categories: create (name + slug translit), DnD sort (@dnd-kit), edit, delete |
| `/admin/tags/` | `app/admin/tags/page.tsx` | 3 секції: Pending (approve/reject/merge), Categories (DnD sort), Active tags (CRUD, aliases, merge) |
| `/admin/posts/` | `app/admin/posts/page.tsx` | Posts table: search, score filter, multi-select merge, inline edit, expand sources, split/exclude/delete |
| `/admin/logs/` | `app/admin/logs/page.tsx` | Pipeline logs: type/postId/date filters, expandable JSON payload, auto-refresh 30s, pagination 50/page |
| `/admin/settings/` | `app/admin/settings/page.tsx` | Cron interval (1-24h), manual scraper (12/24/48h), manual pipeline, last scrape timestamp |

Всі admin сторінки — Client components. Fetch дані через API endpoints, не через Prisma напряму.

---

## API Endpoints (Frontend використовує)

### Posts
| Method | Endpoint | Де використовується |
|--------|----------|-------------------|
| GET | `/api/posts?page=&limit=&folder=&channel=&tag=&search=&scoreFilter=` | FeedClient, admin/posts |
| PATCH | `/api/posts/{id}` | PostCard (delete), PostInlineEdit (summary), admin/posts |
| POST | `/api/posts/merge` | FeedClient, admin/posts |
| POST | `/api/posts/{id}/split` | FeedClient, admin/posts |
| POST | `/api/posts/{id}/exclude` | admin/posts |
| POST | `/api/posts/{id}/tags` | PostTagEditor |
| DELETE | `/api/posts/{id}/tags?tagId=` | PostTagEditor |

### Channels
| Method | Endpoint | Де використовується |
|--------|----------|-------------------|
| GET | `/api/channels` | admin/channels |
| POST | `/api/channels` | admin/channels (create з categoryIds) |
| PATCH | `/api/channels/{id}` | admin/channels (toggle active) |
| DELETE | `/api/channels/{id}` | admin/channels |
| GET | `/api/channels/stats` | channels page |

### Channel Categories (folders)
| Method | Endpoint | Де використовується |
|--------|----------|-------------------|
| GET | `/api/folders` | admin/channels, admin/topics |
| POST | `/api/folders` | admin/topics (create) |
| PATCH | `/api/folders/{id}` | admin/topics (edit) |
| DELETE | `/api/folders/{id}` | admin/topics |
| POST | `/api/folders/reorder` | admin/topics (DnD) |
| POST | `/api/folders/{id}/channels` | admin/channels (add channel to category) |
| DELETE | `/api/folders/{id}/channels?channelId=` | admin/channels (remove) |

### Tags
| Method | Endpoint | Де використовується |
|--------|----------|-------------------|
| GET | `/api/tags?status=` | PostTagEditor, admin/tags |
| POST | `/api/tags` | PostTagEditor, admin/tags |
| PATCH | `/api/tags/{id}` | admin/tags |
| DELETE | `/api/tags/{id}` | admin/tags |
| PATCH | `/api/tags/{id}/approve` | admin/tags |
| PATCH | `/api/tags/{id}/reject` | admin/tags |
| POST | `/api/tags/merge` | admin/tags |
| POST | `/api/tags/{id}/aliases` | admin/tags |
| DELETE | `/api/tags/{id}/aliases?aliasId=` | admin/tags |

### Tag Categories
| Method | Endpoint | Де використовується |
|--------|----------|-------------------|
| GET | `/api/tag-categories` | PostTagEditor, admin/tags |
| POST | `/api/tag-categories` | admin/tags |
| PATCH | `/api/tag-categories/{id}` | admin/tags |
| DELETE | `/api/tag-categories/{id}` | admin/tags |
| POST | `/api/tag-categories/reorder` | admin/tags (DnD) |

### Admin
| Method | Endpoint | Де використовується |
|--------|----------|-------------------|
| GET | `/api/admin/stats` | admin dashboard |
| GET | `/api/admin/charts?period=` | DashboardCharts |
| GET/PATCH | `/api/admin/settings` | admin/settings |
| GET | `/api/logs?page=&limit=&type=&postId=&from=&to=` | admin/logs, admin dashboard |
| POST | `/api/scraper/run` | admin dashboard, admin/settings |
| POST | `/api/pipeline/run` | admin dashboard, admin/settings |

---

## Стилізація

### Підхід

Mobile-first responsive design. Tailwind CSS 4.2 з OKLch кольоровою схемою. Без кастомних CSS файлів крім `globals.css`.

### Кольорова система

Визначена в `globals.css` через CSS custom properties (OKLch):

| Token | Light | Призначення |
|-------|-------|-------------|
| `--background` | `oklch(1 0 0)` | Фон сторінки (білий) |
| `--foreground` | `oklch(0.145 0 0)` | Основний текст (майже чорний) |
| `--muted` | `oklch(0.97 0 0)` | Фон secondary елементів |
| `--muted-foreground` | `oklch(0.556 0 0)` | Secondary текст |
| `--border` | `oklch(0.922 0 0)` | Бордери |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Червоний (delete, error) |
| `--primary` | `oklch(0.205 0 0)` | Primary buttons |
| `--radius` | `0.625rem` | Base border-radius |

Dark mode підтримується (`.dark` клас), але не активований в UI.

### Кольори в компонентах (hardcoded Tailwind)

- Score badges: `text-emerald-700`/`text-amber-600`/`text-red-600`
- Charts: `#10b981` (emerald), `#6366f1` (indigo), `#f59e0b` (amber), `#ef4444` (red)
- Admin type badges: `bg-blue-100`, `bg-purple-100`, `bg-orange-100`, `bg-green-100`, `bg-cyan-100`, `bg-yellow-100`
- Tag chips: `bg-secondary`, `border-border`

### Responsive breakpoints

- Mobile first (default)
- `sm:` — малі планшети
- `md:` — планшети
- `lg:` — десктоп (sidebar visible, table layout)

Ключові responsive зміни:
- Sidebar: `hidden lg:block` (desktop), drawer overlay (mobile)
- FolderNav: `overflow-x-auto` (скрол на мобільних)
- Tables в admin: горизонтальний скрол `overflow-x-auto`
- Stats columns: приховані на mobile

### shadcn/ui

Використовується тільки `Button` (`components/ui/button.tsx`). Інші елементи (inputs, selects, tables) — стилізовані вручну через Tailwind.

---

## UX Патерни

### Пагінація

- **Feed:** "Показати ще" кнопка (infinite scroll pattern). Load more перезавантажує `limit * page` постів.
- **Admin tables:** Traditional prev/next з номером сторінки (50 items/page для logs, 20 для posts).

### Inline Editing

- Summary: click edit → textarea appears → save/cancel
- Tags: click edit → autocomplete dropdown → add/remove
- Admin tables: click row → expanded details

### Drag-and-Drop

- `@dnd-kit/core` + `@dnd-kit/sortable`
- Використовується для: channel categories sort, tag categories sort
- Drag handle icon: `⠿`
- При drop: POST `/api/.../reorder` з новим порядком IDs

### Admin Mode

- Активується через `?admin=1` в URL
- Зберігається в React Context через `AdminWrapper`
- Hydration-safe: `useEffect` on mount
- Додає controls до PostCard: checkbox, edit, tags, delete

### Loading States

- `Suspense` boundaries з `FeedSkeleton` (pulse animation)
- Disabled buttons з loading text
- Spinner SVG в FeedClient
- `animate-pulse` для skeleton loaders

### Форми

- Input з `focus:ring-2 focus:ring-ring`
- Select dropdowns стилізовані як inputs
- Checkboxes для multi-select
- Error messages під формами
- Auto-translit для slug generation (Cyrillic → Latin)

### Notifications / Feedback

- Success/error messages inline (не toast)
- Results display після operations (scraper stats, pipeline results)
- Color-coded badges для статусів

---

## Відомі проблеми

1. **PostCard.tsx: мова relative time** — англійські рядки ("just now", "m ago") при `ru-RU` форматуванні дат
2. **PostTagEditor.tsx: aliases в новому тезі** — при inline створенні тега об'єкт не включає `aliases: []`
3. **FeedClient.tsx: дороге перезавантаження** — при merge/split feed перезавантажується з `limit * page` (100+ постів на пізніх сторінках)
4. **Sidebar відсутній на підсторінках** — `topics/[slug]` і `channels/[username]` мають sidebar, але деякі підсторінки — ні
