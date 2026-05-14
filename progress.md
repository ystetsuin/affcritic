## Progress

> Останнє оновлення: 2026-05-14 (session 10)

---

## Огляд проекту

AffCritic — платформа агрегації новин з Telegram-каналів для affiliate/iGaming індустрії. Python scraper → PostgreSQL → Next.js pipeline (embedding, grouping, GPT summary, quality check) → Feed UI + Admin panel.

**Стан: Homepage Redesign done, Theme system done, Tag filtering done, Channel analytics done, Channels catalog done, Admin bulk operations done, pgvector migration done, Visual Redesign v2 spec (draft).** Admin tags: bulk move/merge/delete, merge autocomplete. Admin channels: stats table, summary header, sorting, bulk ops (activate/deactivate/add category/delete), inline category popover, inline edit display name. pgvector: embedding BYTEA → vector(1536), cosine similarity в SQL. Visual Redesign v2 — Neon Emerald aesthetic, специфікація в `docs/superpowers/specs/2026-04-09-visual-redesign-v2-design.md`, ще не імплементовано. Залишилась `/about/` сторінка + імплементація v2 redesign.

---

## Структура файлів (актуальна)

### prisma/
| Файл | Призначення |
|------|-------------|
| `schema.prisma` | 14 моделей (incl. BlockedPost, ChannelStatsHistory), 2 enum (7 PipelineLogType values), RawPost +views/forwards/replies, embedding Unsupported("vector(1536)") |
| `migrations/` | 10 міграцій (init → blocked_posts_tag_aliases) |
| `seed.ts` | Seed: 8 каналів, 3 папки, 15 тегів, admin_settings |
| `prisma.config.ts` | Seed command config |

**Моделі БД (14):** Channel (avatar_url, description), ChannelCategory (sort_order), ChannelCategoryMap, ChannelStatsHistory, TagCategory, Tag, TagAlias, BlockedPost, RawPost (views, forwards, replies, views_at), Post, PostSource, PostTag, AdminSetting, PipelineLog

### scraper/
| Файл | Призначення |
|------|-------------|
| `main.py` | Telethon scraper: читає TG-канали → raw_posts. `--hours N` аргумент. Level 1 dedup, blocked_posts check, pipeline logging, error handling |
| `auth.py` | Авторизація telethon session |
| `requirements.txt` | telethon, psycopg2-binary, python-dotenv |
| `cron_runner.sh` | Bash wrapper для системного cron з self-throttle |
| `stats_collector.py` | Telethon: збір subscribers, avatar, bio для active каналів → channel_stats_history + channels |
| `stats_cron.sh` | Daily cron wrapper для stats_collector з lock file |

### lib/
| Файл | Призначення |
|------|-------------|
| `db.ts` | Prisma singleton (PrismaPg adapter + globalThis) |
| `openai.ts` | OpenAI SDK: embedding (text-embedding-3-small, pgvector write via $executeRaw), GPT summary (gpt-4o-mini), quality check (pgvector AVG + cosine in SQL) |
| `dedup.ts` | findSimilarPosts(rawPostId) — pgvector <=> operator in SQL, threshold 0.83, window 48h. cosineSimilarity() JS fallback |
| `grouping.ts` | groupNewPosts() — raw SQL fetch (embedding IS NOT NULL), join existing / create new group, protected groups |
| `pipeline.ts` | runPipeline() — orchestration: embedding → grouping → GPT → quality → mark processed. Raw SQL for embedding null checks |
| `prompts.ts` | buildPrompt() — system/user prompts для GPT, master-list тегів з aliases |
| `logger.ts` | logPipeline() — запис в pipeline_logs |
| `period.ts` | `periodToDate()`, `parsePeriod()` — shared period filter (server + API) |
| `theme.ts` | Theme constants (`THEME_KEY`), types (`Theme`), helpers (`getStoredTheme`, `setStoredTheme`, `getResolvedTheme`) |
| `utils.ts` | Tailwind utilities (clsx + tw-merge) |

### components/
| Файл | Призначення |
|------|-------------|
| `Feed.tsx` | Server component: fetch posts з Prisma, фільтри (folder/channel/tag), summary IS NOT NULL |
| `FeedClient.tsx` | Client component: "Показати ще", merge toolbar, split, delete, server-side tag filter reload, results count + ActiveFilters + TimeSwitcher |
| `PostCard.tsx` | Картка поста: summary, tags, sources. Admin: merge-cb, icon buttons (pencil/trash), always-on PostTagEditor |
| `PostInlineEdit.tsx` | Inline textarea для редагування summary (admin) |
| `PostTagEditor.tsx` | Autocomplete tag editor з inline створенням тегів (admin) |
| `PostSources.tsx` | Expandable джерела поста (+N), split кнопка (admin), render children pattern (toggle + panel) |
| `TagChip.tsx` | Badge-link тега → /tags/{slug}/ |
| `Sidebar.tsx` | Client: mode="tags" (пошук тегів, collapsible) або mode="channels" (категорії каналів) |
| `SidebarServer.tsx` | Server: fetch active tags (count: non-deleted + with summary) + channel categories |
| `FolderNav.tsx` | Client: статичне меню (Головна, Тематики, Канали, Теги) |
| `EntityHeader.tsx` | Header для tag entity feed: ← Feed, tag name, N згадок |
| `ChannelsPage.tsx` | Client: каталог каналів — card list з avatar, subscribers, sparkline, top tags, сортування |
| `Sparkline.tsx` | Server: inline SVG міні-графік (polyline), без Recharts |
| `ChannelHero.tsx` | Server: profile header каналу — avatar, name, bio, categories, TG link |
| `SubscriberStats.tsx` | Client: поточна кількість підписників + дельти (сьогодні/тиждень/місяць) + area chart |
| `SubscriberGrowthChart.tsx` | Client: delta bar chart (Recharts), period switcher, avg reference line |
| `TopicsPage.tsx` | Client: topics hub — плитки категорій + плитки тегів |
| `Topbar.tsx` | Desktop topbar: логотип, пошук, "Додати канал", ThemeToggle |
| `LeftNav.tsx` | Desktop вертикальна іконна навігація (Slack-стиль) |
| `MobileHeader.tsx` | Mobile header: логотип + пошук + ThemeToggle |
| `BottomNav.tsx` | Mobile bottom navigation bar (Стрічка, Теми, Канали, Про нас) |
| `Breadcrumbs.tsx` | Навігаційний шлях (breadcrumbs) |
| `TimeSwitcher.tsx` | Перемикач часового періоду (1h/1d/1w/1m) |
| `ThemeToggle.tsx` | Dark/light/system theme toggle (3-state cycle, hydration-safe mounted guard) |
| `ThemeProvider.tsx` | React Context: theme state, localStorage persistence, matchMedia sync, applyTheme |
| `Footer.tsx` | Футер: бренд, посилання, соцмережі |
| `TagFilterContext.tsx` | React Context: selectedSlugs, toggle, reset для sidebar ↔ feed фільтрації |
| `ActiveFilters.tsx` | Client: badge "N фільтри" + reset button |
| `AdminContext.tsx` | React context: admin mode через ?admin=1 (mounted guard) |
| `AdminWrapper.tsx` | Client wrapper для AdminContext (hydration-safe: mounted state) |
| `ChannelStatsCard.tsx` | Client: stats картка для сторінки каналу (fetch on mount, 4 metrics, heatmap, top tags) |
| `PostingHeatmap.tsx` | Client: 7×24 heatmap (Пн-Нд × 0-23h), 5 рівнів кольору, tooltip |
| `TopTagsBar.tsx` | Client: горизонтальний bar chart топ тегів каналу, клікабельні → /tags/{slug}/ |
| `ReachStats.tsx` | Client: охоплення — медіана views/пост, ER%, period switcher, горизонтальна гістограма |
| `TopPosts.tsx` | Client: топ 10 постів по views/forwards/replies, metric+period switcher, viral badge |
| `DashboardCharts.tsx` | Recharts: GPT cost + posts/summaries/unprocessed |
| `ui/` | shadcn/ui компоненти (Button, etc.) |

### docs/
| Файл | Призначення |
|------|-------------|
| `homepage-mockup.html` | HTML-макет homepage redesign: mobile (375px) + desktop (1280px), dark/light theme, всі нові компоненти |
| `superpowers/specs/2026-03-22-homepage-redesign-design.md` | Specs: homepage redesign |
| `superpowers/specs/2026-04-09-visual-redesign-v2-design.md` | Specs: Visual Redesign v2 (Neon Emerald) — color tokens, typography, layout, всі публічні сторінки |

### app/ (pages)
| Файл | Призначення |
|------|-------------|
| `layout.tsx` | Root layout: fonts, inline theme script (FOIT prevention), critical CSS, preconnect, ThemeProvider, Topbar, MobileHeader, BottomNav, AdminWrapper |
| `page.tsx` | Головна: Feed + Sidebar |
| `error.tsx` | Global error boundary (App Router) |
| `topics/page.tsx` | Topics hub: category tiles + tag tiles |
| `topics/[slug]/page.tsx` | Category feed (channel_categories lookup) |
| `channels/page.tsx` | Channels catalog: stats table + sidebar filter |
| `channels/[username]/page.tsx` | Channel page: ChannelHero + ChannelStatsCard (subscribers, growth chart, metrics, heatmap, top tags) + Feed |
| `tags/page.tsx` | Tags catalog: плитки тегів по tag_categories |
| `tags/[slug]/page.tsx` | Entity feed по тегу: EntityHeader + Feed |
| `admin/page.tsx` | Dashboard: metrics, charts, quick actions, recent logs |
| `admin/channels/page.tsx` | Channels admin: stats table (raw 24h/7d, feed, unique%, last post), summary header, sorting, bulk ops (checkboxes + toolbar), inline category popover, inline edit display name, visual indicators |
| `admin/topics/page.tsx` | CRUD channel_categories: DnD sort (@dnd-kit), create, edit, delete |
| `admin/tags/page.tsx` | Pending tags, tag categories (DnD sort), active tags (search, sort, alphabet filter, collapse), aliases, merge (autocomplete), bulk ops (checkboxes + toolbar: move/merge/delete) |
| `admin/posts/page.tsx` | Posts management: delete, edit, merge, split, exclude |
| `admin/logs/page.tsx` | Pipeline logs: фільтри, expandable payload, auto-refresh |
| `admin/settings/page.tsx` | Cron interval, scraper launch, pipeline launch |

### app/api/ (37 API routes)
| Endpoint | Methods | Призначення |
|----------|---------|-------------|
| `/api/posts` | GET | Feed з фільтрами та пагінацією |
| `/api/posts/[id]` | GET, PATCH | Single post, edit summary, soft delete |
| `/api/posts/[id]/tags` | POST, DELETE | Додати/видалити тег з поста |
| `/api/posts/[id]/split` | POST | Відокремити source в новий пост |
| `/api/posts/[id]/exclude` | POST | Видалити source (0 sources → delete post) |
| `/api/posts/merge` | POST | Об'єднати кілька постів |
| `/api/channels` | GET, POST | List/create каналів (GET: ?admin=1 для stats, POST: categoryIds, strip @) |
| `/api/channels/[id]` | GET, PATCH, DELETE | Single channel CRUD |
| `/api/channels/stats` | GET | Channel stats: today/week/month/allTime + share |
| `/api/channels/bulk-status` | POST | Bulk activate/deactivate channels |
| `/api/channels/bulk-delete` | POST | Bulk delete channels |
| `/api/channels/bulk-add-category` | POST | Bulk add category to channels |
| `/api/channel-stats/[username]` | GET | Per-channel stats: metrics, heatmap, topTags, subscribers, reach |
| `/api/channel-top-posts/[username]` | GET | Top 10 posts by views/forwards/replies, period filter |
| `/api/folders` | GET, POST | List/create channel_categories (sortOrder, auto max+1) |
| `/api/folders/[id]` | GET, PATCH, DELETE | Single category CRUD |
| `/api/folders/[id]/channels` | GET, POST, DELETE | M2M: канали в категорії |
| `/api/folders/reorder` | POST | Batch update channel_categories sortOrder |
| `/api/tags` | GET, POST | List/create тегів |
| `/api/tags/[id]` | PATCH, DELETE | Update/delete тег |
| `/api/tags/[id]/approve` | PATCH | pending → active |
| `/api/tags/[id]/reject` | PATCH | pending → delete |
| `/api/tags/[id]/aliases` | POST, DELETE | CRUD aliases |
| `/api/tags/merge` | POST | Merge дублікатів |
| `/api/tags/bulk-move` | POST | Bulk move tags to another category |
| `/api/tags/bulk-merge` | POST | Bulk merge tags into target |
| `/api/tags/bulk-delete` | POST | Bulk delete tags |
| `/api/tag-categories` | GET, POST | List/create tag categories |
| `/api/tag-categories/[id]` | PATCH, DELETE | Update/delete tag category |
| `/api/tag-categories/reorder` | POST | Batch update sortOrder |
| `/api/admin/settings` | GET, PATCH | Admin settings CRUD |
| `/api/admin/stats` | GET | Dashboard metrics |
| `/api/admin/charts` | GET | Cost + posts charts data |
| `/api/logs` | GET | Pipeline logs з фільтрами |
| `/api/pipeline/run` | POST | Manual pipeline trigger |
| `/api/scraper/run` | POST | Manual scraper trigger |
| `/api/stats/run` | POST | Manual stats collector trigger |

---

## Завершені фічі

### Backend / Pipeline
- [x] Prisma schema: 12 моделей, міграція, seed (8 каналів, 3 папки, 15 тегів)
- [x] PostgreSQL на Neon підключена
- [x] Python scraper (telethon): `--hours N`, Level 1 dedup, pipeline logging, flood control
- [x] Embedding: text-embedding-3-small, batch по 50, pgvector vector(1536) storage via raw SQL
- [x] Dedup: pgvector cosine similarity (<=> operator) >= 0.83, 48h window, HNSW index
- [x] Grouping: join existing / create new, protected groups (is_manually_grouped), is_manually_edited reset
- [x] GPT Summary: gpt-4o-mini, JSON output (summary + tags), pending tag creation, master-list з aliases
- [x] Quality Check: summary embedding vs avg source embeddings → summary_score
- [x] Pipeline orchestration: embedding → grouping → GPT → quality → mark processed
- [x] Pipeline logging: всі 6 типів (scraper, embedding, grouping, gpt, quality, admin)
- [x] Admin action logging: 17 mutation endpoints логують в pipeline_logs (type: admin)
- [x] Tag aliases: модель, API, пошук, merge transfer, GPT prompt integration
- [x] Tag categories reorder: drag-and-drop з @dnd-kit

### Frontend / UI
- [x] Feed: server-side fetch + client "Показати ще", фільтри (folder, channel, tag), summary IS NOT NULL
- [x] PostCard: summary, tags, sources (expandable), score badge, relative time, admin delete (×)
- [x] Sidebar: mode="tags" (пошук/categories) + mode="channels" (channel categories filter)
- [x] FolderNav: статичне меню (Головна, Тематики, Канали, Теги)
- [x] Tags catalog (/tags/): плитки тегів по tag_categories
- [x] Entity Feed (/tags/[slug]): EntityHeader + Feed
- [x] Topics hub (/topics/): category tiles + tag tiles
- [x] Topics feed (/topics/[slug]/): category feed + sidebar
- [x] Channels catalog (/channels/): stats table + sidebar filter + count/share toggle
- [x] Channel feed (/channels/[username]/): channel feed + sidebar
- [x] Admin mode: ?admin=1 query param → AdminContext (hydration-safe)
- [x] Blocked posts: delete → blocked_posts → scraper skip

### Admin Panel
- [x] Dashboard: clickable metrics grid, GPT cost + posts/unprocessed charts (recharts), recent logs, compact quick actions with status
- [x] Channels: CRUD, toggle active/inactive, strip @, multi-select categories on create, newest first
- [x] Topics (ex-Categories): CRUD channel_categories, auto-translit slug, DnD sort (@dnd-kit)
- [x] Tags: pending approve/reject, CRUD categories (DnD sort), CRUD active tags, aliases, merge, search, sort (newest/alpha), alphabet filter, collapse/expand
- [x] Posts: delete (+ blocked_posts), edit summary (inline), merge (multi-select), split, exclude source
- [x] Logs: table з фільтрами (type, post_id, date range), expandable JSON, auto-refresh 30s
- [x] Settings: cron interval, manual scraper launch (12h/1d/2d), manual pipeline launch
- [x] Inline Feed Editing: edit summary, add/remove tags (autocomplete), create tag inline, merge/split/delete з feed

---

## Homepage Redesign (in progress)

Дизайн-специфікація: `docs/homepage-mockup.html`

### Нові компоненти (committed)
- [x] `Topbar.tsx` — desktop topbar з логотипом, пошуком, CTA, ThemeToggle
- [x] `LeftNav.tsx` — desktop вертикальна іконна навігація (Slack-стиль, active indicator)
- [x] `MobileHeader.tsx` — mobile header
- [x] `BottomNav.tsx` — mobile bottom nav bar
- [x] `Breadcrumbs.tsx` — навігаційний шлях
- [x] `TimeSwitcher.tsx` — перемикач часу (День/Тиждень/Місяць/Все), URL param `?period=`
- [x] `ThemeToggle.tsx` — dark/light toggle
- [x] `Footer.tsx` — футер (бренд, посилання, соцмережі)

### Оновлені файли (committed)
- `app/globals.css` — +1164 рядків CSS (повний redesign стилів з мокапу)
- `app/layout.tsx` — новий root layout з Topbar, LeftNav, MobileHeader, BottomNav, Footer
- `app/page.tsx` — homepage з Breadcrumbs, TimeSwitcher, active filters, redesigned feed
- `components/Sidebar.tsx` — checkbox-фільтри замість лінків, нові стилі
- `components/FeedClient.tsx` — клієнтська фільтрація по тегах
- `components/PostCard.tsx` — оновлений дизайн картки
- `components/PostSources.tsx` — оновлений дизайн джерел
- `components/TagChip.tsx` — оновлений дизайн тегів
- `components/EntityHeader.tsx` — оновлений header
- `components/ChannelsPage.tsx` — оновлений дизайн каталогу
- `components/TopicsPage.tsx` — оновлений дизайн topics hub
- `app/tags/page.tsx`, `app/tags/[slug]/page.tsx`, `app/topics/[slug]/page.tsx`, `app/channels/[username]/page.tsx` — адаптовані під новий layout

### Sidebar Tag Filtering (session 5)
- [x] `TagFilterContext.tsx` — React Context: `selectedSlugs`, `toggle()`, `reset()`
- [x] `ActiveFilters.tsx` — badge "N фільтри" + reset кнопка
- [x] Sidebar: `<Link>` → `<label>` + checkbox, checked state з контексту
- [x] SidebarDrawer (mobile): chip-toggles, reset, badge на іконці фільтрів
- [x] FeedClient: server-side reload по `selectedSlugs` (OR логіка, API `tags=slug1,slug2`)
- [x] Всі feed-сторінки обгорнуті `<TagFilterProvider>`

### TimeSwitcher — Period Filtering (session 5)
- [x] `lib/period.ts` — `periodToDate()`, `parsePeriod()` (shared server + API)
- [x] TimeSwitcher: `useSearchParams` + `useRouter`, пише `?period=` в URL
- [x] Feed.tsx: `createdAt >= periodToDate(period)` в `buildWhere()`
- [x] FeedClient: reset пагінації при зміні period
- [x] API `/api/posts`: підтримка `period` query param
- [x] Кнопки: День / Тиждень / Місяць / Все (default: all)

### Score Badge Relocation (session 5)
- [x] Score badge прибраний з PostCard header
- [x] Score badge додано як перша колонка в кожному source-row
- [x] Source row grid: `44px 104px 1fr` (score + username + excerpt)

### Admin Feed Controls Redesign (session 5)
- [x] PostCard header: `.merge-cb` 16x16 + icon buttons (pencil `.admin-btn`, trash `.admin-btn.danger`)
- [x] Tags always-on в admin mode: `.tag-admin` з `.tag-remove` ✕ + `.add-tag-input` з dropdown
- [x] PostTagEditor restyled: CSS-класи замість Tailwind, `.add-tag-dropdown`, `.create-tag-row`
- [x] Bulk toolbar sticky bottom: `.bulk-toolbar` з merge + batch delete
- [x] Admin badge в Topbar: `.admin-badge` (red pill)
- [x] Hydration fix: `useAdmin()` returns false until mounted

### Theme System (session 6)
- [x] `lib/theme.ts` — constants, types, helpers (getStoredTheme, setStoredTheme, getResolvedTheme)
- [x] `ThemeProvider.tsx` — React Context, localStorage persistence, matchMedia listener for system mode
- [x] `ThemeToggle.tsx` — 3-state cycle (dark → light → system), hydration-safe mounted guard
- [x] `layout.tsx` — inline `<script>` in `<head>` (FOIT prevention), `suppressHydrationWarning`
- [x] `globals.css` — `@custom-variant light (.light &)` for Tailwind v4

### Admin Dark Mode QA (session 6)
- [x] Custom `light:` Tailwind variant (dark-first: default = dark, `light:` = light overrides)
- [x] `admin/page.tsx` — LOG_TYPE_COLORS, MetricCard subColor, scraper/pipeline status
- [x] `admin/logs/page.tsx` — TYPE_COLORS
- [x] `admin/posts/page.tsx` — scoreColor, deleted post border, edited/grouped/deleted badges
- [x] `admin/channels/page.tsx` — Active/Inactive toggle
- [x] `admin/tags/page.tsx` — Pending section border/bg/text
- [x] `admin/settings/page.tsx` — save success text
- [x] `DashboardCharts.tsx` — Tooltip contentStyle (background + color via CSS vars)

### Server-side Tag Filtering Fix (session 6)
- [x] API `/api/posts` — multi-tag support: `tags=slug1,slug2` with OR logic (`slug IN [...]`)
- [x] FeedClient — reload from server on tag selection instead of client-side filtering
- [x] "Знайдено постів: N" + ActiveFilters moved into FeedClient (reactive updates)
- [x] TimeSwitcher moved into FeedClient results row (same line as count)
- [x] SidebarServer — tag counts filter by `isDeleted: false, summary: not null`
- [x] Hydration fix — `suppressHydrationWarning` on card-time span for relative time

### Original Post Date (session 7)
- [x] Feed.tsx — include `rawPosts` (select postedAt, take 1, orderBy asc) в postInclude, serializePost витягує `publishedAt`
- [x] PostCard.tsx — `publishedAt: string | null` в PostData, відображає `publishedAt ?? createdAt`
- [x] API `/api/posts` — include rawPosts, маппінг `publishedAt` у відповіді

### QA Fixes (session 7)
- [x] BUG-01+04: Critical inline CSS в `<head>` — `.hidden`, `.lg:hidden`, `.lg:block`, `.lg:grid` з `!important` (FOUC prevention)
- [x] BUG-03: `<link rel="preconnect">` для `fonts.googleapis.com` та `fonts.gstatic.com`
- [x] BUG-02: Рефакторинг 4 feed-сторінок — один `<main>` з CSS-класом `.page-layout` (grid на desktop, collapsed на mobile), видалено дублювання DOM

### PostCard Layout Refactor (session 7)
- [x] Теги + Source toggle в одному рядку (`.card-bottom` flex row)
- [x] PostSources.tsx — render children pattern: `{ toggle, panel }` рендеряться на різних рівнях DOM
- [x] Видалено `.card-footer` border-top, `.sources-panel` повна ширина під card-bottom
- [x] Bugfix: duplicate key warning — `${slug}-${index}` в PostCard.tsx та PostTagEditor.tsx

### Channel Stats Page (session 7)
- [x] API `GET /api/channel-stats/[username]` — totalRawPosts, totalInFeed, dedupRatio, avgSummaryScore, topTags (10), heatmap (day×hour), activityByWeek (52w)
- [x] `ChannelStatsCard.tsx` — fetch on mount, 4 metric tiles (grid 4×1 / 2×2 mobile), skeleton loading
- [x] `PostingHeatmap.tsx` — 7×24 grid (Пн-Нд × 0-23h), 5 рівнів emerald, tooltip при hover, responsive scroll
- [x] `TopTagsBar.tsx` — horizontal bar chart, клікабельні → `/tags/{slug}/`
- [x] Інтеграція: `channels/[username]/page.tsx` — stats секція перед Feed
- [x] CSS: dark/light theme compatible, responsive (mobile 2×2 grid, heatmap scroll)

### Subscriber Stats (session 7)
- [x] `ChannelStatsHistory` — Prisma model, міграція, таблиця `channel_stats_history`
- [x] `SubscriberStats.tsx` — поточне число підписників + 3 дельти (сьогодні/тиждень/місяць) + Recharts AreaChart
- [x] API `/api/channel-stats/[username]` — subscribers: current, deltas, history (90d), deltas[], avgDeltaPerDay
- [x] `SubscriberGrowthChart.tsx` — delta bar chart (зелений/червоний), period switcher (Тиждень/Місяць/Весь час), avg ReferenceLine
- [x] Інтеграція: SubscriberStats → SubscriberGrowthChart → ChannelStatsCard

### Stats Collector (session 7)
- [x] `scraper/stats_collector.py` — окремий скрипт: GetFullChannelRequest → subscribers, avatar, bio → channel_stats_history + channels
- [x] `scraper/stats_cron.sh` — daily cron wrapper з lock file
- [x] `PipelineLogType.stats` — новий enum value, міграція
- [x] `POST /api/stats/run` — API trigger для stats collector
- [x] Admin dashboard: кнопка "Статистика" в Quick Actions
- [x] Logs: `stats` тип в LOG_TYPE_COLORS (admin/page.tsx, admin/logs/page.tsx)
- [x] main.py — відкатив збір підписників (тепер тільки в stats_collector)

### Channel Hero (session 7)
- [x] Prisma: `avatar_url`, `description` поля в Channel, міграція
- [x] `ChannelHero.tsx` — server component: avatar (80px, fallback placeholder), name + TG link, @username, bio (2 lines), category badges
- [x] `channels/[username]/page.tsx` — замінено простий h1 header на ChannelHero, select розширено
- [x] `.gitignore` — `public/avatars/` додано

### Reach Stats (session 7)
- [x] Prisma: `views`, `views_at` поля в RawPost, міграція
- [x] `stats_collector.py` — збір views через `get_messages(limit=100)`, batch UPDATE в raw_posts
- [x] API `/api/channel-stats/[username]` — reach: median, mean, ER, periods (7d/30d/all), histogram (6 бакетів)
- [x] `ReachStats.tsx` — головне число (~median), ER badge (колір по порогах), mean, period switcher, горизонтальна гістограма, skewed/coverage notes
- [x] Інтеграція: між SubscriberGrowthChart і TopPosts

### Top Posts (session 7)
- [x] Prisma: `forwards`, `replies` поля в RawPost, міграція
- [x] `stats_collector.py` — збір msg.forwards та msg.replies.replies разом з views
- [x] API `GET /api/channel-top-posts/[username]` — metric (views/forwards/replies), period (7d/30d/all), top 10, median, viral badge
- [x] `TopPosts.tsx` — metric switcher (Перегляди/Пересилки/Коментарі) + period switcher, list з rank/metric/text/date, 🔥 viral, #1 accent, skeleton, click → TG
- [x] Інтеграція: між ReachStats і ChannelStatsCard

### Channels Catalog Redesign (session 7)
- [x] `Sparkline.tsx` — простий SVG polyline, без Recharts
- [x] `ChannelsPage.tsx` — card list замість таблиці: avatar + name/bio + subscribers (дельта) + posts + uniq% + sparkline + top tags
- [x] `channels/page.tsx` — збагачений server-side fetch: subscribers, delta7d, feedPosts, dedupRatio, sparkline (30d), topTags (3)
- [x] Сортування: Підписники / Активність / Унікальність (pill switcher)
- [x] Responsive: mobile ховає posts/uniq/sparkline
- [x] Inactive channels: opacity + badge

### Admin Tags Bulk Operations (session 8)
- [x] `POST /api/tags/bulk-move` — переміщення N тегів в іншу категорію (updateMany + лог)
- [x] `POST /api/tags/bulk-merge` — bulk merge: transfer post_tags (dedupe), aliases, source names → target, delete sources
- [x] `POST /api/tags/bulk-delete` — bulk delete: post_tags + aliases + tags в транзакції
- [x] Чекбокси per-tag + group-level checkbox (select all в категорії)
- [x] Sticky bulk toolbar: Перемістити (select категорії) | Об'єднати (modal з вибором target) | Видалити (destructive)
- [x] Selection reset при зміні search/sort/letter фільтрів, Escape clears
- [x] Merge target dialog: список вибраних тегів з name, category, postsCount

### Admin Tags Merge Autocomplete (session 8)
- [x] `TagMergeAutocomplete` компонент: input з пошуком по name + aliases, dropdown макс 8 результатів
- [x] Заміна `<select>` merge на autocomplete в PendingSection та ActiveTagsSection
- [x] Confirm dialog перед merge, Escape/click outside закриває, auto-focus

### Admin Channels Stats Table (session 8)
- [x] `GET /api/channels?admin=1` — per-channel stats: rawPostsTotal, rawPosts24h, rawPosts7d, feedPosts, uniquePercent, lastPostAt
- [x] 2 SQL запити з GROUP BY (raw_posts + post_sources), не N+1
- [x] Таблиця з sortable колонками (username, 24h, feed, unique%, last) з ▲/▼ індикатором
- [x] Summary header: 5 metric tiles (Активних, Posts 24h, Avg Unique, Dead >7д, Всього)
- [x] Фільтр Всі/Активні/Неактивні (toggle pills)
- [x] Visual indicators: dead >30д (red "dead"), 7-30д (amber "slow"), unique% кольори (≥60% green, <20% red)
- [x] Responsive: 24h/7d hidden on mobile, overflow-x-auto

### Admin Channels Bulk Operations (session 8)
- [x] `POST /api/channels/bulk-status` — batch activate/deactivate
- [x] `POST /api/channels/bulk-delete` — batch delete (transaction: category_map + channels)
- [x] `POST /api/channels/bulk-add-category` — batch add category (skip dupes)
- [x] Чекбокси per-row + select all header checkbox
- [x] Sticky bulk toolbar: Активувати | Деактивувати | Додати категорію (select) | Видалити
- [x] Виділені рядки bg-accent/50, selection reset при search/filter change

### Admin Channels Inline Edit (session 8)
- [x] Inline category popover: клік на badges → popover з чекбоксами всіх категорій, instant toggle
- [x] Inline edit display name: клік → input, Enter save, Escape/blur cancel, hover pencil icon
- [x] Замінено `<select>` для категорій на popover з чекбоксами

### pgvector Migration (session 9)
- [x] Міграція `20260415_pgvector_embeddings` — CREATE EXTENSION vector, BYTEA→vector(1536) конвертація (IEEE 754 PL/pgSQL), HNSW індекс
- [x] Prisma schema: `embedding Bytes?` → `embedding Unsupported("vector(1536)")?`
- [x] `lib/dedup.ts` — `findSimilarPosts(rawPostId)` через pgvector `<=>` оператор в SQL (замість завантаження всіх embeddings в Node.js)
- [x] `lib/openai.ts` — `embeddingToBuffer`/`bufferToEmbedding` → `embeddingToVectorString()`, запис через `$executeRaw`, quality check через SQL AVG + cosine
- [x] `lib/grouping.ts` — raw SQL fetch (embedding IS NOT NULL), embeddings не передаються в Node.js
- [x] `lib/pipeline.ts` — raw SQL для mark processed (embedding IS NOT NULL checks)
- [x] Admin pages — додано `res.ok` перевірку перед `.json()` (channels, tags, topics, logs, dashboard)
- [x] Data transfer скорочено: ~300 MB → ~кілька KB per grouping run

### Visual Redesign v2 — Spec (session 10)
- [x] `docs/superpowers/specs/2026-04-09-visual-redesign-v2-design.md` — Neon Emerald дизайн-специфікація (committed `ecb939e`)
- [x] Color tokens (dark+light), typography (Inter+JetBrains Mono), layout система, всі публічні сторінки
- [x] Концепція: технічна "insider tool" естетика (Bloomberg/Linear/Raycast), CSS-only зміни (без зачіпання логіки/API)
- [ ] Імплементація v2 — ще не розпочата

### Operational (session 10)
- [x] `app/error.tsx` — global error boundary для App Router
- [x] Спроба переключення на нову Neon БД (`ep-nameless-mud-...`) — заблокована data transfer quota
- [x] Rollback `.env` на стару Neon (`ep-sparkling-pine-...`), стара БД жива, всі 10 міграцій + pgvector + HNSW підтверджено
- [x] Bugfix: локальні `package.json` + `package-lock.json` мали знижені версії (`next@9.3.3`, `prisma@6.19.3`) — відкочено до HEAD (`next@16.2.1`, `prisma@7.5.0`), `node_modules` перевстановлено

### TODO
- [ ] Закомітити роботу sessions 7–9 (8 міграцій, 9 components, 9 API routes, stats_collector — все untracked)
- [ ] Імплементація Visual Redesign v2 (Neon Emerald)
- [ ] `/about/` сторінка
- [ ] Переключення на нову Neon після вирішення quota

---

## Відсутні фічі / Невідповідності з CLAUDE.md

### Відсутні сторінки
- [ ] `/about/` — статична сторінка (згадана в CLAUDE.md URL Structure, не реалізована)

### ~~`/channels/` сторінка~~ DONE
~~Список всіх каналів з фільтром по категоріях~~ → Реалізовано: `/channels/` каталог зі stats + sidebar.

### Термінологія: "Folder" vs "Category" (API naming)
В БД: `ChannelCategory`. В API: `/api/folders/`. В URL: `/topics/{slug}` (публічна), `/channels/` (каталог). API naming "folders" зберігається для зворотної сумісності.

---

## Відомі баги / Issues

### ~~PostCard.tsx: мова relative time~~ FIXED
~~Рядки 49-52 використовують англійські строки ("just now", "m ago", "h ago"), але дати форматуються як "ru-RU".~~ Виправлено: всі строки українською ("щойно", "хв тому", "год тому", "дн тому", uk-UA date).

### ~~PostTagEditor.tsx: відсутній aliases в новому тегу~~ FIXED
~~При створенні нового тега inline, об'єкт не включає `aliases: []`.~~ Виправлено: додано `aliases: []` при створенні тега inline.

### FeedClient.tsx: дороге перезавантаження
При merge/split feed перезавантажується з `limit * page` (наприклад, 100+ постів на 5-й сторінці). Можна оптимізувати.

### pipeline.ts: приблизний підрахунок pending тегів
Рядок ~99: рахує ВСІ pending теги створені після startTime, а не тільки ті, що створені в цьому batch. Не критично, але метрика може бути завищена.

### Sidebar відсутній на підсторінках
`[folder]/page.tsx` і `[folder]/[channel]/page.tsx` не включають Sidebar (тільки placeholder або відсутній).

### ~~Grouping пропускає згруповані raw_posts за межами 48h вікна~~ FIXED
~~`findSimilarPosts()` шукав кандидатів тільки серед raw_posts за 48 годин. Згруповані raw_posts (ongoing stories) з `postedAt` поза вікном не знаходились, навіть якщо similarity > 0.83.~~ Виправлено: два пули кандидатів — згруповані (без ліміту часу) + незгруповані (48h вікно).

### ~~Pipeline infinite loop на media-only постах~~ FIXED
~~`processUnembeddedPosts()` зациклювався на raw_posts без тексту (media-only).~~ Виправлено: text-less пости маркуються `processed=true` одразу.

### ~~Порожні картки у Feed (posts без summary)~~ FIXED
~~Пости створювались у grouping, але GPT падав — summary залишався null.~~ Виправлено: фільтр `summary IS NOT NULL` у Feed + pipeline не маркує failed GPT групи як processed.

### ~~Charts: summaries > processed~~ FIXED
~~summaries_created рахувались по кількості GPT-логів (merge/split regen завищував).~~ Виправлено: рахуємо з таблиці posts.

---

## Виконані таски (хронологія)

1. Prisma Schema (12 моделей, 2 enums, indexes)
2. PostgreSQL + Prisma Client (Neon, singleton)
3. Перша міграція (20260320211737_init)
4. Seed (8 каналів, 3 папки, 15 тегів, admin_settings, test logs)
5. PipelineLog модель + seed
6. Telethon Setup (авторизація, session)
7. Level 1 Dedup (ON CONFLICT, pre-fetch existing)
8. Cron Setup (admin_settings interval, last_scrape_at, cron_runner.sh)
9. Scraper Pipeline Logging
10. Embedding (text-embedding-3-small, batch, float32 serialization)
11. Dedup / Cosine Similarity (threshold 0.83, window 48h)
12. Grouping (join/create groups, protected groups, transactions)
13. Pipeline Logging — Embedding & Grouping
14. GPT Prompt (lib/prompts.ts, master-list тегів)
15. GPT Summary + Tags (gpt-4o-mini, JSON output, pending tags)
16. Summary Quality Check (summary vs sources embedding)
17. is_manually_edited Protection
18. Pipeline Orchestration (lib/pipeline.ts, runPipeline())
19. Pipeline Logging — GPT & Quality
20. Posts API (GET з фільтрами, пагінація)
21. Channels CRUD API
22. Folders (Categories) CRUD API
23. Tags CRUD API (approve, reject, merge)
24. Posts Admin API (edit, merge, split, exclude)
25. Admin Settings API
26. Pipeline Logs API
27. Next.js Init (16.2.1, Tailwind 4, shadcn/ui)
28. PostCard + TagChip + PostSources
29. Feed Page (server + client components)
30. Folder Page + Channel in Folder Page
31. Entity Feed / Tag Page
32. Sidebar (search, collapsible categories, mobile drawer)
33. FolderNav (horizontal menu, active state)
34. Admin: Channels (table, toggle, category badges)
35. Admin: Folders/Categories
36. Admin: Tags (pending, categories DnD sort, active tags, merge)
37. Admin: Posts (delete, edit, merge, split, exclude)
38. Admin: Settings (cron, manual pipeline/scraper)
39. Admin: Logs (filters, expandable JSON, auto-refresh)
40. Admin Action Logging (17 endpoints)
41. Admin Tags: Edit Categories & Tags (inline edit)
42. Tag Aliases (model, API, GPT prompt, admin UI)
43. Admin Dashboard (stats, charts, recent logs, quick actions)
44. Inline Feed Editing (?admin=1, PostInlineEdit, PostTagEditor)
45. Tag Categories Drag-and-Drop Sort (@dnd-kit)
46. Feed Merge & Split (admin toolbar)
47. Scraper Web Launch (--hours, API, admin UI)
48. Admin Dashboard: Recent Logs
49. Admin Dashboard Charts (recharts, GPT cost)
50. Admin: Channel Categories Binding + CRUD
51. Bugfix: pipeline infinite loop on media-only raw_posts (processUnembeddedPosts)
52. Bugfix: empty post cards in Feed — filter summary IS NOT NULL, pipeline GPT fail tracking
53. Bugfix: charts overcounting summaries — count from posts table instead of gpt logs
54. UX: Admin Channels — strip @ from username, newest-first sort, categories multi-select on create
55. Dashboard Charts: unprocessed raw_posts third line
56. Blocked Posts: model, delete → block sources, scraper check, PostCard delete button (×)
57. Hydration fix: AdminWrapper useEffect for ?admin=1
58. Routing refactor: /topics/{slug} (categories), /channels/{username} (channels), unified routes
59. Channels catalog (/channels/): stats API, ChannelsPage, sidebar mode="channels"
60. Topics hub (/topics/): category tiles + tag tiles, TopicsPage
61. Channel categories: sort_order field, DnD in admin/topics, reorder API, sortOrder in all public queries
62. Docs sync: CLAUDE.md + progress.md updated to match actual code state
63. Bugfix: grouping missed grouped raw_posts outside 48h window — two candidate pools (grouped: no time limit, ungrouped: 48h)
64. FolderNav refactor: dynamic categories → static nav (Головна, Тематики, Канали, Теги), removed FolderNavServer
65. URL refactor: `/tag/{slug}` → `/tags/{slug}`, created `/tags/` index page with tag tiles by category
66. Channels page: count/share toggle for stats columns
67. Admin dashboard: clickable metric tiles, removed "Розділи" section, Settings icon, compact Quick Actions with grid layout + status indicators
68. Admin dashboard: Raw Posts tile conditional color (emerald/red), Pipeline row unprocessed count
69. Admin tags: search, sort (newest/alpha), alphabet letter filter (name + aliases), collapse/expand categories
70. Bugfix: PostTagEditor missing aliases in new tag, DashboardCharts type errors, db.ts/seed.ts import paths, logger.ts payload type, openai.ts Buffer type
71. Docs: frontend.md created, .gitignore updated for Next.js
72. Homepage Redesign: design spec (docs/homepage-mockup.html), 8 нових компонентів (Topbar, LeftNav, MobileHeader, BottomNav, Breadcrumbs, TimeSwitcher, ThemeToggle, Footer)
73. Homepage Redesign: globals.css повний redesign (dark/light theme, frosted glass, CSS variables), layout.tsx restructured
74. Homepage Redesign: оновлені всі public pages та feed компоненти під новий layout
75. Sidebar Tag Filtering: TagFilterContext, checkbox-фільтри в sidebar, chip-toggles в mobile overlay, ActiveFilters badge, client-side OR-фільтрація в FeedClient
76. TimeSwitcher: функціональний period filter (День/Тиждень/Місяць/Все), URL param `?period=`, server-side + API filtering по createdAt, default: all
77. Score Badge: переміщено з PostCard header в source-row (перша колонка), grid 44px+104px+1fr
78. Admin Feed Controls: icon buttons (pencil/trash), always-on tag editing (.tag-admin + .tag-remove), .add-tag-input + dropdown, PostTagEditor restyled (CSS замість Tailwind)
79. Bulk Toolbar: sticky bottom (.bulk-toolbar), merge + batch delete, shows at >= 1 selected
80. Admin Badge: .admin-badge в Topbar (red pill, visible only with ?admin=1)
81. Hydration Fix: AdminContext mounted guard — useAdmin() returns false until client mount
82. Theme System: ThemeProvider + ThemeToggle (dark/light/system), FOIT-safe inline script, localStorage persistence, OS theme sync
83. Admin Dark Mode QA: custom Tailwind `light:` variant, fixed 23 hardcoded color instances across 7 admin files, theme-aware chart tooltips
84. Server-side Tag Filtering: API multi-tag support (`tags=slug1,slug2`), FeedClient reload on tag selection, sidebar counts filter non-deleted
85. Unified Feed Controls: "Знайдено постів" + ActiveFilters + TimeSwitcher in one row inside FeedClient
86. Hydration Fix: suppressHydrationWarning on card-time span for relative time rendering
87. Original Post Date: показ дати оригінальної публікації (RawPost.postedAt) замість дати додавання (Post.createdAt) — Feed.tsx, PostCard.tsx, API /api/posts
88. QA: Critical inline CSS (FOUC prevention), preconnect для Google Fonts, DOM dedup — page-layout CSS клас замість desktop/mobile дублювання
89. PostCard layout: tags + Source toggle в одному рядку, PostSources render children pattern
90. Bugfix: duplicate key warning (rocks-partners) — PostCard.tsx + PostTagEditor.tsx
91. Channel Stats: API /api/channel-stats/[username], ChannelStatsCard, PostingHeatmap (7×24), TopTagsBar, інтеграція в /channels/[username]/
92. Subscriber Stats: ChannelStatsHistory model, SubscriberStats component (дельти + area chart), SubscriberGrowthChart (delta bar chart, period switcher)
93. Stats Collector: scraper/stats_collector.py (subscribers, avatar, bio), stats_cron.sh, PipelineLogType.stats, API /api/stats/run, admin кнопка
94. Channel Hero: avatar_url + description в Channel, ChannelHero component (avatar, name, bio, categories, TG link), channel page redesign
95. Channels Catalog Redesign: card list з Sparkline SVG, subscribers + delta, posts, uniq%, top tags, сортування (3 режими), responsive
96. Reach Stats: views/views_at в RawPost, stats_collector views collection, ReachStats component (median, ER, histogram, periods), API reach data
97. Top Posts: forwards/replies в RawPost, stats_collector engagement collection, TopPosts component (metric+period switcher, viral badge), API /api/channel-top-posts/[username]
98. Admin Tags Bulk Operations: bulk-move/bulk-merge/bulk-delete API endpoints, checkboxes + sticky toolbar (move/merge/delete), merge target dialog
99. Admin Tags Merge Autocomplete: TagMergeAutocomplete component (search by name+aliases, dropdown 8 results), replaced select in Pending + Active sections
100. Admin Channels Stats Table: GET /api/channels?admin=1 (GROUP BY stats), sortable table, summary header (5 tiles), active/inactive filter, visual indicators (dead/slow/unique colors)
101. Admin Channels Bulk Operations: bulk-status/bulk-delete/bulk-add-category API endpoints, checkboxes + select all + sticky toolbar (4 actions)
102. Admin Channels Inline Edit: category popover (checkbox toggles), inline display name edit (click→input, Enter/Escape), replaced category select
103. Visual Redesign v2 spec: `docs/superpowers/specs/2026-04-09-visual-redesign-v2-design.md` (Neon Emerald — color tokens dark/light, typography Inter+JetBrains Mono, layout, всі публічні сторінки), CSS-only зміни без зачіпання логіки/API, committed `ecb939e`
104. Operational (session 10): app/error.tsx (global error boundary), DB switch attempt → rollback (.env back to old Neon через data transfer quota на новому проекті), package.json/lock rollback (next 9.3.3→16.2.1, prisma 6.19.3→7.5.0)
105. Design Refactor: Motion & micro-interactions додано до globals.css — staggered card-rise reveal (post-card + ch-card), cursor blink на логотипі, accent scanline при hover на PostCard, animated underline для topbar-links, hover lift для tag chips, focus-visible emerald rings, subtle dot-grid body texture з radial mask, terminal spinner, shimmer skeleton, prefers-reduced-motion fallback
106. Design Refactor: Sparkline апгрейд — auto-color по тренду (accent для зростання, red для падіння), gradient area-fill під лінією, end-point dot маркер
107. Design Refactor: Admin shell layer — .admin-section-h (terminal-style heading з ▸ маркером), .log-badge (outline-only бейджі), .admin-table .num (tabular-nums monospace) — токени готові, адмінка успадковує Neon Emerald через @theme inline
108. Design Refactor: TopicsPage редизайн — dedicated класи `.topic-tile` (great categories: accent border-left, hover-only `›` arrow, accent-text count на hover), `.tag-tile` (small chips з accent-muted hover), `.topics-section-h` (`// HEADER` маркер з gradient divider), `.topics-empty` (terminal-style). Видалені inline-стилі, додані responsive grid breakpoints (3 cols lg для категорій, 4 cols lg для тегів, 2 cols ≤480px). QA з todo.md повністю виконано
109. Bugfix: відсутній transitive deps `d3-path@^3.1.0` (peer of d3-shape ← recharts ← DashboardCharts) ламав compile всіх route'ів з 500 — `npm i d3-path@3.1.0`, файли node_modules відновлені
110. Bugfix: системно зіпсоване node_modules після package rollback (#104) — багато пакетів мали package.json але порожні dist/src директорії (clsx, d3-time-format та ін.). Виправлено через `rm -rf node_modules && npm ci`. Додано `d3-time-format@^4.1.0` в package.json як explicit dep. Дев-сервер перезапущено
111. Bugfix: повторна корупція npm extraction — d3-array і d3-interpolate мали dist/+src/ але без package.json. Re-install з `--force` для кожного. Усі route'и (включно з /channels/[username] що тягне recharts→d3-scale→d3-array→d3-interpolate) повертають 200
112. Feature: `/api/stats/run` lock-file захист — `/tmp/affcritic-stats-collector.lock` з PID + ISO timestamp (та сама конвенція що в `scraper/stats_cron.sh`). POST повертає 409 з {pid, startedAt} якщо процес уже живий. GET endpoint для query статусу без побічних ефектів. Stale lock (мертвий PID) auto-clear. Admin dashboard handler розрізняє 409 і показує "Уже запущено (PID X, з HH:MM)". CLI-запуски обходять lock — це задокументовано, для catch-all захисту в майбутньому додати lock-write в самому stats_collector.py
113. Feature: Basic Auth middleware (`middleware.ts`) — захист `/admin/*` сторінок, `/api/admin/*`, `/api/logs`, `/api/scraper/*`, `/api/pipeline/*`, `/api/stats/*`, та усіх mutating /api/* (POST/PATCH/PUT/DELETE). Credentials через ADMIN_USER+ADMIN_PASS env vars. Якщо vars не задані — 503. Public GET endpoints і сторінки відкриті без auth. Constant-time compare для захисту від timing attacks
114. Feature: standalone build — `next.config.ts` з `output: "standalone"` для deploy на shared/cloud-startup хостингу без копіювання node_modules
115. Deploy: `DEPLOY.md` повна інструкція для Hostinger Cloud Startup — Node.js app setup в hPanel, SSH+git deploy, ENV vars (включно з ADMIN_USER/PASS), build steps, restart, локальний scraper що пише в ту саму Neon DB через cron, troubleshooting (503/500/static files/memory), security checklist
