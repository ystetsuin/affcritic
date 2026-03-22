## Architecture

| Шар | Стек | Відповідальність |
| --- | --- | --- |
| **Scraper** | Python (telethon) | MTProto → читає публічні TG-канали → пише `raw_posts` в PostgreSQL |
| **Все інше** | TypeScript (Next.js 14+ App Router) | Dedup → grouping → GPT summary + tags → quality check → Feed UI → Admin → API |

Scraper: отримує список каналів з БД → читає нові пости → записує в `raw_posts` → Level 1 dedup по `channel_id + message_id` → запускається по cron (інтервал з `admin_settings`).

---

## Tech Stack

| Шар | Технологія |
| --- | --- |
| Frontend | Next.js 14+ (App Router), TypeScript 5+, Tailwind CSS 3+, shadcn/ui |
| Backend | Next.js API Routes, Prisma ORM |
| БД | PostgreSQL (Neon/Supabase) |
| AI | OpenAI text-embedding-3-small (embedding), GPT-4o-mini (summary + tags) |
| Scraper | Python (telethon) |
| Deploy | Railway або Render |

---

## Database Schema

### channels

```sql
channels (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
)
```

### channel_categories

```sql
channel_categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
)
```

Тематичні категорії каналів (SEO, Affiliate, Media). Адмін створює через адмінку. Slug задається вручну, зарезервований і унікальний.

### channel_category_map

```sql
channel_category_map (
  category_id UUID REFERENCES channel_categories(id),
  channel_id UUID REFERENCES channels(id),
  PRIMARY KEY (category_id, channel_id)
)
```

M2M: один канал може мати кілька тематик.

### tag_categories

```sql
tag_categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0
)
```

### tags

```sql
tags (
  id UUID PRIMARY KEY,
  category_id UUID REFERENCES tag_categories(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending')),
  created_at TIMESTAMP DEFAULT now()
)
```

### tag_aliases

```sql
tag_aliases (
  id UUID PRIMARY KEY,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
)
```

Альтернативні назви тегів. Використовуються в пошуку, автокомпліті та GPT prompt (master-list формат: `Tag Name (aliases: A, B)`).

### raw_posts

```sql
raw_posts (
  id UUID PRIMARY KEY,
  channel_id UUID REFERENCES channels(id),
  message_id INTEGER NOT NULL,
  text TEXT,
  media_url TEXT,
  posted_at TIMESTAMP,
  embedding BYTEA,
  post_id UUID REFERENCES posts(id),
  processed BOOLEAN DEFAULT false,
  UNIQUE (channel_id, message_id)
)
```

### posts

```sql
posts (
  id UUID PRIMARY KEY,
  summary TEXT,
  summary_score FLOAT,
  created_at TIMESTAMP DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  is_manually_edited BOOLEAN DEFAULT false,
  is_manually_grouped BOOLEAN DEFAULT false
)
```

`posts.id` = group_id. `is_deleted` — soft delete. `is_manually_edited` — pipeline не перезаписує summary (скидається при перегрупуванні). `is_manually_grouped` — pipeline не змінює групу.

### post_sources

```sql
post_sources (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  channel_id UUID REFERENCES channels(id),
  message_id INTEGER NOT NULL,
  original_text TEXT,
  tg_url TEXT
)
```

### post_tags

```sql
post_tags (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  tag_id UUID REFERENCES tags(id)
)
```

### blocked_posts

```sql
blocked_posts (
  id UUID PRIMARY KEY,
  channel_id UUID REFERENCES channels(id),
  message_id INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (channel_id, message_id)
)
```

При видаленні поста з Feed — його sources додаються в `blocked_posts`. Scraper перевіряє цю таблицю і не додає заблоковані повідомлення повторно.

### admin_settings

```sql
admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT
)
```

### pipeline_logs

```sql
pipeline_logs (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('scraper', 'embedding', 'grouping', 'gpt', 'quality', 'admin')),
  post_id UUID REFERENCES posts(id),
  payload JSONB,
  created_at TIMESTAMP DEFAULT now()
)
```

### Indexes

```sql
CREATE UNIQUE INDEX idx_raw_channel_msg ON raw_posts(channel_id, message_id);
CREATE INDEX idx_raw_processed ON raw_posts(processed);
CREATE INDEX idx_raw_posted_at ON raw_posts(posted_at);
CREATE INDEX idx_posts_created ON posts(created_at);
CREATE INDEX idx_posts_deleted ON posts(is_deleted);
CREATE INDEX idx_post_sources_post ON post_sources(post_id);
CREATE INDEX idx_post_tags_post ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag ON post_tags(tag_id);
CREATE INDEX idx_tags_status ON tags(status);
CREATE INDEX idx_tags_category ON tags(category_id);
CREATE INDEX idx_pipeline_logs_type ON pipeline_logs(type);
CREATE INDEX idx_pipeline_logs_post ON pipeline_logs(post_id);
CREATE INDEX idx_pipeline_logs_created ON pipeline_logs(created_at);
CREATE INDEX idx_tag_aliases_tag ON tag_aliases(tag_id);
CREATE UNIQUE INDEX idx_blocked_channel_msg ON blocked_posts(channel_id, message_id);
```

---

## Pipeline

Послідовність кроків НЕ змінювати.

```
CRON (2-3 рази/добу, інтервал з admin_settings)
  │
  ▼
1. Python scraper (telethon)
   → raw_posts (channel_id, message_id, text, media_url, posted_at)
   → SKIP якщо channel_id + message_id вже є
  │
  ▼
2. Next.js pipeline: SELECT raw_posts WHERE processed = false
  │
  ▼
3. Embedding: text-embedding-3-small → raw_posts.embedding
  │
  ▼
4. Grouping: cosine similarity vs raw_posts (два пули: згруповані без ліміту часу + незгруповані за 48 год)
   → > 0.83 → join existing group (raw_post.post_id = posts.id)
   → < 0.83 → create new group
   → SKIP if target group is_manually_grouped = true
  │
  ▼
5. GPT-4o-mini для кожної зміненої групи:
   → input: всі original_text групи + master-list active тегів
   → output: summary (рос., 3-5 речень, нейтральний) + tags [{category, value, is_new}]
   → is_new: false → match existing tag → post_tag
   → is_new: true → create tag status=pending → post_tag
   → SKIP if is_manually_edited = true (скидається при перегрупуванні)
  │
  ▼
6. Quality: cosine_similarity(embedding(summary), avg(embeddings джерел)) → summary_score
   → ≥ 0.75: ok | 0.60-0.74: suspicious | < 0.60: bad
  │
  ▼
7. Save + raw_posts.processed = true → пост у Feed
```

---

## GPT Prompt

Hardcode в `lib/prompts.ts`. Master-list active тегів з БД як контекст.

GPT output JSON:

```json
{
  "summary": "3-5 речень, російською, нейтральний тон",
  "tags": [
    {"category": "Компанія", "value": "Betsson", "is_new": false},
    {"category": "GEO", "value": "Nigeria", "is_new": true}
  ]
}
```

`category` — має відповідати tag_category з БД. Немає тегів → `[]`.

---

## URL Structure

| URL | Що |
| --- | --- |
| `/` | Feed — всі пости |
| `/topics/` | Навігаційний хаб: категорії каналів + теги |
| `/topics/{slug}/` | Feed постів з каналів категорії |
| `/channels/` | Каталог каналів зі статистикою |
| `/channels/{username}/` | Feed постів одного каналу |
| `/tag/{tag-slug}/` | Entity Feed по тегу |
| `/about/` | Статична |
| `/admin/` | Адмін-панель |

Routing: `/topics/{slug}` — lookup тільки в `channel_categories`. `/channels/{username}` — lookup тільки в `channels`. Колізій немає — різні namespace.

---

## UI

Mobile-first.

**Меню:** посилання на `/channels/`. Головна `/` = всі пости.

**Сайдбар:** пошук по тегах + collapsible категорії тегів + к-ть постів. Тільки active теги. Клік → `/tag/{slug}/`.

**Картка поста:**

- Summary повний (без обрізання)
- Теги — клікабельні → `/tag/{slug}/`
- Перше джерело: `@channel` → `<a href="{tg_url}" target="_blank" rel="nofollow noopener noreferrer">`
- Джерел > 1: кнопка `+N ▼` → inline expand
- Dedup score (test mode), summary_score (debug)

**Сторінка /channels/:**

- Список всіх каналів (username, display_name, категорії як badges)
- Фільтр по категоріях: клік на категорію → `/channels/{category-slug}/`
- Клік на канал → `/channels/{channel-username}/` → пости каналу

**Entity Feed:** та сама стрічка по тегу. Хедер: `← Feed  🏢 {tag}  N згадок`

---

## Admin Panel (`/admin`)

**Канали:** додати/видалити TG-канал, toggle active/inactive. При додаванні: strip @, multi-select категорій. Сортування newest first.

**Тематики каналів:** CRUD (назва + slug вручну), drag-and-drop сортування (@dnd-kit), sort_order визначає порядок на публічних сторінках.

**Теги:** CRUD категорій і тегів, approve/reject pending, merge дублів

**Пости:**

- Видалити: `is_deleted = true`
- Редагувати summary: `is_manually_edited = true`
- Об'єднати: merge post_sources → GPT regen → `is_manually_grouped = true`
- Розділити: відокремити post_source в новий пост → GPT regen обох → `is_manually_grouped = true` обох
- Виключити: видалити post_source (0 джерел → delete пост)

**Логи:** `/admin/logs` — pipeline_logs з фільтрами по type, date, post_id

**Settings:** cron інтервал, ручний запуск pipeline

---

## Project Structure

```jsx
affcritic/
├── app/
│   ├── layout.tsx                         # Root layout: fonts, FolderNav, AdminWrapper
│   ├── page.tsx                           # Feed + Sidebar
│   ├── topics/
│   │   ├── page.tsx                       # Topics hub: category tiles + tag tiles
│   │   └── [slug]/page.tsx               # Category feed (channel_categories lookup)
│   ├── channels/
│   │   ├── page.tsx                       # Channels catalog with stats + sidebar
│   │   └── [username]/page.tsx           # Channel feed (channels lookup)
│   ├── tag/[slug]/page.tsx                # Entity Feed по тегу
│   ├── admin/
│   │   ├── page.tsx                       # Dashboard: metrics, charts, logs, actions
│   │   ├── channels/page.tsx
│   │   ├── topics/page.tsx                # Manage channel categories (DnD sort)
│   │   ├── tags/page.tsx
│   │   ├── posts/page.tsx
│   │   ├── logs/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── posts/                         # GET list, [id] CRUD, merge, split, exclude, tags
│       ├── channels/                      # CRUD, stats
│       ├── folders/                       # Channel categories CRUD + M2M channels + reorder
│       ├── tags/                          # CRUD, approve, reject, merge, aliases
│       ├── tag-categories/                # CRUD, reorder
│       ├── admin/                         # settings, stats, charts
│       ├── logs/                          # Pipeline logs
│       ├── pipeline/run/                  # Manual pipeline trigger
│       └── scraper/run/                   # Manual scraper trigger
├── components/
│   ├── Feed.tsx                           # Server: fetch posts
│   ├── FeedClient.tsx                     # Client: load more, merge/split, delete
│   ├── PostCard.tsx                       # Post card з admin controls (edit, tags, delete)
│   ├── PostInlineEdit.tsx                 # Inline summary editor (admin)
│   ├── PostTagEditor.tsx                  # Tag autocomplete editor (admin)
│   ├── PostSources.tsx                    # Expandable sources list
│   ├── TagChip.tsx                        # Tag badge link
│   ├── Sidebar.tsx                        # Client: mode="tags" | "channels"
│   ├── SidebarServer.tsx                  # Server: fetch tags + channel categories
│   ├── FolderNav.tsx                      # Client: topic/category menu → /topics/{slug}
│   ├── FolderNavServer.tsx                # Server: fetch categories (sortOrder)
│   ├── EntityHeader.tsx                   # Tag page header
│   ├── ChannelsPage.tsx                   # Client: channels catalog with stats table
│   ├── TopicsPage.tsx                     # Client: topics hub (category + tag tiles)
│   ├── AdminContext.tsx                   # Admin mode context (?admin=1)
│   ├── AdminWrapper.tsx                   # Admin context provider (hydration-safe)
│   └── DashboardCharts.tsx                # Recharts: cost + posts + unprocessed
├── lib/
│   ├── db.ts                              # Prisma client singleton
│   ├── openai.ts                          # Embedding + GPT + quality
│   ├── dedup.ts                           # Cosine similarity
│   ├── grouping.ts                        # Group logic
│   ├── pipeline.ts                        # Pipeline orchestration
│   ├── prompts.ts                         # GPT prompts
│   ├── logger.ts                          # Pipeline logging
│   └── utils.ts                           # Tailwind utilities
├── prisma/
│   ├── schema.prisma                      # 13 models (incl. BlockedPost), 2 enums
│   ├── seed.ts
│   └── prisma.config.ts
└── scraper/
    ├── main.py                            # Telethon scraper + blocked_posts check
    ├── auth.py
    ├── cron_runner.sh
    └── requirements.txt
```

---

## Rules

1. Послідовність pipeline НЕ змінювати — dedup ПЕРЕД summary
2. GPT отримує текст ВСІЄЇ групи, не окремих постів
3. Теги: `{category, value, is_new}` — не flat strings
4. Дедуплікація ГЛОБАЛЬНА — категорії каналів не впливають
5. `summary_score` записується для кожного поста
6. Embedding в `raw_posts`, не в `posts`
7. `posts.id` = group_id (окремого поля немає)
8. `is_manually_grouped = true` → pipeline не чіпає групу
9. `is_manually_edited = true` → pipeline не перезаписує summary (скидається при перегрупуванні)
10. `pending` теги не показуються на сайті
11. GPT prompt hardcode в `lib/prompts.ts`, master-list тегів з БД
12. Python scraper — тільки запис raw_posts, вся обробка — TypeScript
13. `/topics/{slug}` = category feed, `/channels/{username}` = channel feed, `/tag/{slug}` = тег. Різні namespace, без cascade lookup.
14. TG посилання: `rel="nofollow noopener noreferrer"` + `target="_blank"`
15. Summary: російська, 3-5 речень, нейтральний тон
16. Кожен крок pipeline пише лог в `pipeline_logs`
17. Логування всіх адмін-дій в `pipeline_logs` (type: admin)
18. Видалення поста → `is_deleted = true` + sources додаються в `blocked_posts` → scraper не re-додає
19. Pipeline: media-only raw_posts (text=null) маркуються `processed=true` одразу в embedding кроці
20. Pipeline: якщо GPT падає для групи → raw_posts не маркуються processed, quality skip
21. Feed фільтрує `summary IS NOT NULL` — пости без summary не показуються