## Progress

> Останнє оновлення: 2026-03-22 (session 3)

---

## Огляд проекту

AffCritic — платформа агрегації новин з Telegram-каналів для affiliate/iGaming індустрії. Python scraper → PostgreSQL → Next.js pipeline (embedding, grouping, GPT summary, quality check) → Feed UI + Admin panel.

**Стан: ~95% завершено.** Всі core features реалізовані. URL refactor (topics/channels) виконано. Залишилась `/about/` сторінка.

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
| `utils.ts` | Tailwind utilities (clsx + tw-merge) |

### components/
| Файл | Призначення |
|------|-------------|
| `Feed.tsx` | Server component: fetch posts з Prisma, фільтри (folder/channel/tag), summary IS NOT NULL |
| `FeedClient.tsx` | Client component: "Показати ще", merge toolbar, split, delete handling |
| `PostCard.tsx` | Картка поста: summary, tags, sources, score badge, admin controls (edit, tags, delete ×) |
| `PostInlineEdit.tsx` | Inline textarea для редагування summary (admin) |
| `PostTagEditor.tsx` | Autocomplete tag editor з inline створенням тегів (admin) |
| `PostSources.tsx` | Expandable джерела поста (+N), split кнопка (admin) |
| `TagChip.tsx` | Badge-link тега → /tag/{slug}/ |
| `Sidebar.tsx` | Client: mode="tags" (пошук тегів, collapsible) або mode="channels" (категорії каналів) |
| `SidebarServer.tsx` | Server: fetch active tags + channel categories |
| `FolderNav.tsx` | Client: горизонтальне меню → /topics/{slug}/ |
| `FolderNavServer.tsx` | Server: fetch categories (sortOrder) для FolderNav |
| `EntityHeader.tsx` | Header для tag entity feed: ← Feed, tag name, N згадок |
| `ChannelsPage.tsx` | Client: каталог каналів з stats таблицею + sidebar фільтр |
| `TopicsPage.tsx` | Client: topics hub — плитки категорій + плитки тегів |
| `AdminContext.tsx` | React context: admin mode через ?admin=1 |
| `AdminWrapper.tsx` | Client wrapper для AdminContext (hydration-safe via useEffect) |
| `DashboardCharts.tsx` | Recharts: GPT cost + posts/summaries/unprocessed |
| `ui/` | shadcn/ui компоненти (Button, etc.) |

### app/ (pages)
| Файл | Призначення |
|------|-------------|
| `layout.tsx` | Root layout: fonts, FolderNav, AdminWrapper |
| `page.tsx` | Головна: Feed + Sidebar |
| `topics/page.tsx` | Topics hub: category tiles + tag tiles |
| `topics/[slug]/page.tsx` | Category feed (channel_categories lookup) |
| `channels/page.tsx` | Channels catalog: stats table + sidebar filter |
| `channels/[username]/page.tsx` | Channel feed (channels lookup) |
| `tag/[slug]/page.tsx` | Entity feed по тегу: EntityHeader + Feed |
| `admin/page.tsx` | Dashboard: metrics, charts, quick actions, recent logs |
| `admin/channels/page.tsx` | CRUD каналів: strip @, multi-select categories, newest first |
| `admin/topics/page.tsx` | CRUD channel_categories: DnD sort (@dnd-kit), create, edit, delete |
| `admin/tags/page.tsx` | Pending tags, tag categories (drag-and-drop sort), active tags, aliases, merge |
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
- [x] FolderNav: горизонтальне меню → /topics/{slug}/, sortOrder
- [x] Entity Feed (/tag/[slug]): EntityHeader + Feed
- [x] Topics hub (/topics/): category tiles + tag tiles
- [x] Topics feed (/topics/[slug]/): category feed + sidebar
- [x] Channels catalog (/channels/): stats table + sidebar filter
- [x] Channel feed (/channels/[username]/): channel feed + sidebar
- [x] Admin mode: ?admin=1 query param → AdminContext (hydration-safe)
- [x] Blocked posts: delete → blocked_posts → scraper skip

### Admin Panel
- [x] Dashboard: metrics grid, GPT cost + posts/unprocessed charts (recharts), recent logs, quick actions
- [x] Channels: CRUD, toggle active/inactive, strip @, multi-select categories on create, newest first
- [x] Topics (ex-Categories): CRUD channel_categories, auto-translit slug, DnD sort (@dnd-kit)
- [x] Tags: pending approve/reject, CRUD categories (drag-and-drop sort), CRUD active tags, aliases, merge
- [x] Posts: delete (+ blocked_posts), edit summary (inline), merge (multi-select), split, exclude source
- [x] Logs: table з фільтрами (type, post_id, date range), expandable JSON, auto-refresh 30s
- [x] Settings: cron interval, manual scraper launch (12h/1d/2d), manual pipeline launch
- [x] Inline Feed Editing: edit summary, add/remove tags (autocomplete), create tag inline, merge/split/delete з feed

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

### PostCard.tsx: мова relative time
Рядки 49-52 використовують англійські строки ("just now", "m ago", "h ago"), але дати форматуються як "ru-RU". Має бути або все українське/російське, або все англійське.

### PostTagEditor.tsx: відсутній aliases в новому тегу
При створенні нового тега inline, об'єкт не включає `aliases: []` — може показувати undefined при наступному пошуку.

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
