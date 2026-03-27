## Progress

> Останнє оновлення: 2026-03-25 (session 5)

---

## Огляд проекту

AffCritic — платформа агрегації новин з Telegram-каналів для affiliate/iGaming індустрії. Python scraper → PostgreSQL → Next.js pipeline (embedding, grouping, GPT summary, quality check) → Feed UI + Admin panel.

**Стан: Homepage Redesign in progress.** Всі core features реалізовані. Homepage redesign розпочато за `docs/homepage-mockup.html` — новий layout, компоненти, CSS. Залишилась `/about/` сторінка.

---

## Структура файлів (актуальна)

### prisma/
| Файл | Призначення |
|------|-------------|
| `schema.prisma` | 13 моделей (incl. BlockedPost), 2 enum, 14+ indexes |
| `migrations/` | Початкова міграція `20260320211737_init` |
| `seed.ts` | Seed: 8 каналів, 3 папки, 15 тегів, admin_settings |
| `prisma.config.ts` | Seed command config |

**Моделі БД (13):** Channel, ChannelCategory (sort_order), ChannelCategoryMap, TagCategory, Tag, TagAlias, BlockedPost, RawPost, Post, PostSource, PostTag, AdminSetting, PipelineLog

### scraper/
| Файл | Призначення |
|------|-------------|
| `main.py` | Telethon scraper: читає TG-канали → raw_posts. `--hours N` аргумент. Level 1 dedup, blocked_posts check, pipeline logging, error handling |
| `auth.py` | Авторизація telethon session |
| `requirements.txt` | telethon, psycopg2-binary, python-dotenv |
| `cron_runner.sh` | Bash wrapper для системного cron з self-throttle |

### lib/
| Файл | Призначення |
|------|-------------|
| `db.ts` | Prisma singleton (PrismaPg adapter + globalThis) |
| `openai.ts` | OpenAI SDK: embedding (text-embedding-3-small), GPT summary (gpt-4o-mini), quality check |
| `dedup.ts` | cosineSimilarity(), findSimilarPosts() — threshold 0.83, window 48h |
| `grouping.ts` | groupNewPosts() — join existing / create new group, protected groups logic |
| `pipeline.ts` | runPipeline() — orchestration: embedding → grouping → GPT → quality → mark processed |
| `prompts.ts` | buildPrompt() — system/user prompts для GPT, master-list тегів з aliases |
| `logger.ts` | logPipeline() — запис в pipeline_logs |
| `period.ts` | `periodToDate()`, `parsePeriod()` — shared period filter (server + API) |
| `utils.ts` | Tailwind utilities (clsx + tw-merge) |

### components/
| Файл | Призначення |
|------|-------------|
| `Feed.tsx` | Server component: fetch posts з Prisma, фільтри (folder/channel/tag), summary IS NOT NULL |
| `FeedClient.tsx` | Client component: "Показати ще", merge toolbar, split, delete handling |
| `PostCard.tsx` | Картка поста: summary, tags, sources. Admin: merge-cb, icon buttons (pencil/trash), always-on PostTagEditor |
| `PostInlineEdit.tsx` | Inline textarea для редагування summary (admin) |
| `PostTagEditor.tsx` | Autocomplete tag editor з inline створенням тегів (admin) |
| `PostSources.tsx` | Expandable джерела поста (+N), split кнопка (admin) |
| `TagChip.tsx` | Badge-link тега → /tags/{slug}/ |
| `Sidebar.tsx` | Client: mode="tags" (пошук тегів, collapsible) або mode="channels" (категорії каналів) |
| `SidebarServer.tsx` | Server: fetch active tags + channel categories |
| `FolderNav.tsx` | Client: статичне меню (Головна, Тематики, Канали, Теги) |
| `EntityHeader.tsx` | Header для tag entity feed: ← Feed, tag name, N згадок |
| `ChannelsPage.tsx` | Client: каталог каналів з stats таблицею + sidebar фільтр |
| `TopicsPage.tsx` | Client: topics hub — плитки категорій + плитки тегів |
| `Topbar.tsx` | Desktop topbar: логотип, пошук, "Додати канал", ThemeToggle |
| `LeftNav.tsx` | Desktop вертикальна іконна навігація (Slack-стиль) |
| `MobileHeader.tsx` | Mobile header: логотип + пошук + ThemeToggle |
| `BottomNav.tsx` | Mobile bottom navigation bar (Стрічка, Теми, Канали, Про нас) |
| `Breadcrumbs.tsx` | Навігаційний шлях (breadcrumbs) |
| `TimeSwitcher.tsx` | Перемикач часового періоду (1h/1d/1w/1m) |
| `ThemeToggle.tsx` | Dark/light theme toggle button |
| `Footer.tsx` | Футер: бренд, посилання, соцмережі |
| `TagFilterContext.tsx` | React Context: selectedSlugs, toggle, reset для sidebar ↔ feed фільтрації |
| `ActiveFilters.tsx` | Client: badge "N фільтри" + reset button |
| `AdminContext.tsx` | React context: admin mode через ?admin=1 (mounted guard) |
| `AdminWrapper.tsx` | Client wrapper для AdminContext (hydration-safe: mounted state) |
| `DashboardCharts.tsx` | Recharts: GPT cost + posts/summaries/unprocessed |
| `ui/` | shadcn/ui компоненти (Button, etc.) |

### docs/
| Файл | Призначення |
|------|-------------|
| `homepage-mockup.html` | HTML-макет homepage redesign: mobile (375px) + desktop (1280px), dark/light theme, всі нові компоненти |

### app/ (pages)
| Файл | Призначення |
|------|-------------|
| `layout.tsx` | Root layout: fonts, Topbar, LeftNav, MobileHeader, BottomNav, Footer, AdminWrapper |
| `page.tsx` | Головна: Feed + Sidebar |
| `topics/page.tsx` | Topics hub: category tiles + tag tiles |
| `topics/[slug]/page.tsx` | Category feed (channel_categories lookup) |
| `channels/page.tsx` | Channels catalog: stats table + sidebar filter |
| `channels/[username]/page.tsx` | Channel feed (channels lookup) |
| `tags/page.tsx` | Tags catalog: плитки тегів по tag_categories |
| `tags/[slug]/page.tsx` | Entity feed по тегу: EntityHeader + Feed |
| `admin/page.tsx` | Dashboard: metrics, charts, quick actions, recent logs |
| `admin/channels/page.tsx` | CRUD каналів: strip @, multi-select categories, newest first |
| `admin/topics/page.tsx` | CRUD channel_categories: DnD sort (@dnd-kit), create, edit, delete |
| `admin/tags/page.tsx` | Pending tags, tag categories (DnD sort), active tags (search, sort, alphabet filter, collapse), aliases, merge |
| `admin/posts/page.tsx` | Posts management: delete, edit, merge, split, exclude |
| `admin/logs/page.tsx` | Pipeline logs: фільтри, expandable payload, auto-refresh |
| `admin/settings/page.tsx` | Cron interval, scraper launch, pipeline launch |

### app/api/ (28 API routes)
| Endpoint | Methods | Призначення |
|----------|---------|-------------|
| `/api/posts` | GET | Feed з фільтрами та пагінацією |
| `/api/posts/[id]` | GET, PATCH | Single post, edit summary, soft delete |
| `/api/posts/[id]/tags` | POST, DELETE | Додати/видалити тег з поста |
| `/api/posts/[id]/split` | POST | Відокремити source в новий пост |
| `/api/posts/[id]/exclude` | POST | Видалити source (0 sources → delete post) |
| `/api/posts/merge` | POST | Об'єднати кілька постів |
| `/api/channels` | GET, POST | List/create каналів (POST: categoryIds, strip @) |
| `/api/channels/[id]` | GET, PATCH, DELETE | Single channel CRUD |
| `/api/channels/stats` | GET | Channel stats: today/week/month/allTime + share |
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
| `/api/tag-categories` | GET, POST | List/create tag categories |
| `/api/tag-categories/[id]` | PATCH, DELETE | Update/delete tag category |
| `/api/tag-categories/reorder` | POST | Batch update sortOrder |
| `/api/admin/settings` | GET, PATCH | Admin settings CRUD |
| `/api/admin/stats` | GET | Dashboard metrics |
| `/api/admin/charts` | GET | Cost + posts charts data |
| `/api/logs` | GET | Pipeline logs з фільтрами |
| `/api/pipeline/run` | POST | Manual pipeline trigger |
| `/api/scraper/run` | POST | Manual scraper trigger |

---

## Завершені фічі

### Backend / Pipeline
- [x] Prisma schema: 12 моделей, міграція, seed (8 каналів, 3 папки, 15 тегів)
- [x] PostgreSQL на Neon підключена
- [x] Python scraper (telethon): `--hours N`, Level 1 dedup, pipeline logging, flood control
- [x] Embedding: text-embedding-3-small, batch по 50, float32 LE серіалізація
- [x] Dedup: cosine similarity >= 0.83, 48h window
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

### Нові компоненти (створені, uncommitted)
- [x] `Topbar.tsx` — desktop topbar з логотипом, пошуком, CTA, ThemeToggle
- [x] `LeftNav.tsx` — desktop вертикальна іконна навігація (Slack-стиль, active indicator)
- [x] `MobileHeader.tsx` — mobile header
- [x] `BottomNav.tsx` — mobile bottom nav bar
- [x] `Breadcrumbs.tsx` — навігаційний шлях
- [x] `TimeSwitcher.tsx` — перемикач часу (День/Тиждень/Місяць/Все), URL param `?period=`
- [x] `ThemeToggle.tsx` — dark/light toggle
- [x] `Footer.tsx` — футер (бренд, посилання, соцмережі)

### Оновлені файли (uncommitted)
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
- [x] FeedClient: `useMemo` фільтрація по `selectedSlugs` (OR логіка)
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

### TODO
- [ ] Light/dark theme QA для всіх нових компонентів

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
