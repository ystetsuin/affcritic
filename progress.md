## Progress

### Prisma Schema (todo.md)
**Статус:** Завершено

- [x] Створено `prisma/schema.prisma`
- [x] 11 моделей: Channel, Folder, FolderChannel, TagCategory, Tag, RawPost, Post, PostSource, PostTag, AdminSetting, PipelineLog
- [x] 2 enum: TagStatus (active/pending), PipelineLogType (scraper/embedding/grouping/gpt/quality/admin)
- [x] Всі зв'язки (relations) між моделями
- [x] 13 indexes відповідно до CLAUDE.md (12 звичайних + 1 unique)
- [x] UNIQUE constraints: channels.username, folders.slug, tags.slug, tag_categories.slug, raw_posts(channel_id + message_id)
- [x] Composite PK на FolderChannel (folder_id, channel_id)
- [x] UUID як default для всіх id
- [x] `npx prisma validate` — PASS

### PostgreSQL + Prisma Client (todo.md)
**Статус:** Завершено

- [x] PostgreSQL база на Neon (free tier) підключена
- [x] `DATABASE_URL` прописано в `.env`
- [x] `.env` в `.gitignore`
- [x] `.env.example` існує
- [x] Встановлено `@prisma/client`, `@prisma/adapter-pg`, `dotenv`
- [x] `npx prisma db push` — таблиці створені в БД
- [x] `npx prisma generate` — клієнт згенерований
- [x] `lib/db.ts` — singleton Prisma client з PrismaPg adapter + globalThis паттерн для Next.js dev
- [x] Тест-запит `SELECT 1` — Connection OK

### Перша міграція (todo.md)
**Статус:** Завершено

- [x] `npx prisma migrate dev --name init` — міграція `20260320211737_init` створена і застосована
- [x] 11 таблиць створені в БД
- [x] 17 indexes (13 звичайних + 4 unique) створені
- [x] 10 FK constraints з правильним onDelete (Cascade/SetNull)
- [x] Файл міграції в `prisma/migrations/20260320211737_init/migration.sql`
- [x] `npx prisma generate` — клієнт перегенерований
- [x] Тест-запит `SELECT 1` — Connection OK

### Seed (todo.md)
**Статус:** Завершено

- [x] `prisma/seed.ts` створений
- [x] 8 каналів (реальні affiliate/iGaming TG-канали)
- [x] 3 папки: SEO, Affiliate Programs, Media
- [x] 10 folder_channels зв'язків (partnerkin і affiliate_valley в 2+ папках)
- [x] 3 tag_categories: GEO, Компанія, Персона
- [x] 12 active тегів + 3 pending тега
- [x] admin_settings: cron_interval = 8
- [x] Seed ідемпотентний (upsert) — повторний запуск без дублікатів
- [x] Seed команда в `prisma.config.ts`
- [x] `npx prisma db seed` — PASS

### PipelineLog (todo.md)
**Статус:** Завершено

- [x] Модель `PipelineLog` вже була в schema.prisma з таски 1.1
- [x] Enum `PipelineLogType` (6 значень) вже існував
- [x] 3 indexes (type, post_id, created_at) вже існували
- [x] FK: postId → posts(id) onDelete: SetNull
- [x] Seed оновлений — 5 тестових pipeline_logs (scraper, embedding, grouping, gpt, quality) з різною структурою payload

### Telethon Setup (todo.md)
**Статус:** Завершено

- [x] `scraper/` директорія створена
- [x] `scraper/requirements.txt` — telethon, psycopg2-binary, python-dotenv
- [x] `pip install` — залежності встановлені
- [x] `scraper/auth.py` — скрипт авторизації створений
- [x] `TG_API_ID`, `TG_API_HASH`, `TG_SESSION_NAME` додані в `.env`
- [x] `.env.example` вже містить TG змінні
- [x] `*.session` додано в `.gitignore`
- [x] Авторизація пройдена, session file `affcritic.session` створений

### Level 1 Dedup (todo.md)
**Статус:** Завершено

- [x] `INSERT ... ON CONFLICT (channel_id, message_id) DO NOTHING` (був раніше)
- [x] Pre-fetch SELECT існуючих `message_id` — `get_existing_message_ids()` в `scraper/main.py`
- [x] Лічильник `read` + `skipped` (різниця між прочитаними і вставленими)
- [x] Логування статистики: `Channel @xxx: 50 read, 12 new, 38 skipped`
- [x] UNIQUE constraint `(channel_id, message_id)` працює на рівні БД (Prisma schema + `ON CONFLICT` fallback)

### Cron Setup (todo.md)
**Статус:** Завершено

- [x] `get_admin_setting()` / `set_admin_setting()` — читання/запис `admin_settings` в `scraper/main.py`
- [x] Читання `cron_interval` з БД при старті, логування: `Cron interval: 8 hours`
- [x] Fallback на default (8 годин) з WARNING якщо ключ відсутній
- [x] `last_scrape_at` записується в `admin_settings` після кожного успішного запуску (ISO 8601 UTC)
- [x] `scraper/cron_runner.sh` — wrapper для системного cron (self-throttle на основі `last_scrape_at` + `cron_interval`)
- [x] Для Railway/Render — запускати `python scraper/main.py` напряму через їх cron service

### Scraper Pipeline Logging (todo.md)
**Статус:** Завершено

- [x] `insert_pipeline_log()` — запис structured log в `pipeline_logs` (type=scraper, post_id=NULL)
- [x] Payload: `channels_total`, `channels_success`, `channels_failed`, `posts_new`, `posts_skipped`, `errors[]`, `duration_seconds`, `cron_interval`
- [x] `error_details` збирається per-channel з `scrape_channel()` і включається в payload
- [x] Лог записується навіть якщо 0 каналів (early return)
- [x] Crash handler: `try/except` на верхньому рівні → fatal error записується в `pipeline_logs`
- [x] `duration_seconds` через `time.monotonic()`

### Embedding (todo.md)
**Статус:** Завершено

- [x] `OPENAI_API_KEY` вже був в `.env.example`
- [x] `npm install openai` — SDK встановлено
- [x] `lib/openai.ts` — singleton OpenAI client (lazy init через `getOpenAI()`)
- [x] `generateEmbedding(text)` — виклик `text-embedding-3-small`, повертає `number[]` (1536 dimensions)
- [x] `processUnembeddedPosts()` — SELECT `raw_posts WHERE embedding IS NULL AND processed = false` → batch по 50 → генерує embedding → UPDATE
- [x] `embeddingToBuffer()` / `bufferToEmbedding()` — серіалізація float32 LE ↔ Buffer (round-trip тест OK)
- [x] Порожні тексти (NULL / empty) пропускаються без API виклику
- [x] Error handling: помилка OpenAI логується, пост пропускається, pipeline продовжує

### Dedup / Cosine Similarity (todo.md)
**Статус:** Завершено

- [x] `lib/dedup.ts` створено
- [x] `cosineSimilarity(a, b)` — чиста функція, 5/5 unit tests (identical=1.0, orthogonal=0.0, opposite=-1.0, zero=0.0, known angle=0.96)
- [x] `findSimilarPosts(embedding, excludeId?)` — SELECT raw_posts за 48h window з embedding → cosine similarity → фільтр >= 0.83 → sorted DESC
- [x] `SIMILARITY_THRESHOLD = 0.83` — іменована константа
- [x] `DEDUP_WINDOW_HOURS = 48` — іменована константа
- [x] Edge case: порожня БД → порожній масив; self-exclusion через `excludeId`
- [x] Embeddings завантажуються з БД одним запитом (batch, не per-post)

### Grouping (todo.md)
**Статус:** Завершено

- [x] `lib/grouping.ts` створено
- [x] `groupNewPosts()` — SELECT `raw_posts WHERE processed=false AND embedding IS NOT NULL AND postId IS NULL` → ordered by postedAt ASC
- [x] similarity > 0.83 → join existing group (raw_post.postId = existing post.id) + create post_source
- [x] similarity < 0.83 → create new post + post_source + set raw_post.postId (в транзакції)
- [x] `is_manually_grouped = true` → skip з логом, fallback на наступний кандидат або нова група
- [x] `tg_url` формат: `https://t.me/{username}/{message_id}`
- [x] `post_sources.original_text` = raw_post.text
- [x] Повертає `Set<string>` changed group IDs для подальшого GPT summary
- [x] Edge case: raw_post без embedding — warning + skip
- [x] Транзакційність: post + post_source + raw_post update — в `$transaction`

### Protected Groups (todo.md)
**Статус:** Завершено

- [x] Ітерація по всіх similar results (sorted by similarity DESC), не тільки першому
- [x] `is_manually_grouped = true` → skip з логом `Post {id} skipped protected group {group_id}, similarity={score}`
- [x] Fallback: наступний кандидат > 0.83 і не protected → join туди
- [x] Якщо всі кандидати protected або similarity < 0.83 → створюється нова група (default `is_manually_grouped = false`)

### Pipeline Logging — Embedding & Grouping (todo.md)
**Статус:** Завершено

- [x] `lib/logger.ts` — `logPipeline(type, postId, payload)` обгортка для INSERT в pipeline_logs
- [x] **Embedding лог** (type: `embedding`): 1 запис на batch з `posts_processed`, `posts_skipped_empty_text`, `errors[]`, `tokens_used`, `duration_seconds`
- [x] `tokens_used` з `response.usage.total_tokens` (OpenAI API)
- [x] **Grouping лог** (type: `grouping`): 1 запис НА КОЖЕН raw_post з `post_id` (FK на posts)
- [x] Payload: `raw_post_id`, `decision` (`joined_existing` / `new_group`), `target_group_id`, `top_similarities` (top-3), `skipped_protected_groups[]`, `threshold`
- [x] Інтегровано в `lib/openai.ts` (processUnembeddedPosts) і `lib/grouping.ts` (groupNewPosts)

### GPT Prompt (todo.md)
**Статус:** Завершено

- [x] `lib/prompts.ts` створено
- [x] System prompt: мова=рос., тон=нейтральний news-style, 3-5 речень, JSON schema
- [x] `buildPrompt(sourceTexts, activeTags)` → `{system, user}`
- [x] User prompt: джерела пронумеровані + master-list тегів по категоріях
- [x] Інструкції: is_new=false для match, is_new=true для нових, category з існуючих, `[]` якщо тегів немає
- [x] Порожній master-list → fallback текст з інструкцією пропонувати нові теги

### Master-list тегів для GPT (todo.md)
**Статус:** Завершено

- [x] `getActiveTagsList()` — SELECT tags WHERE status=active JOIN tag_categories, grouped by category, sorted by sortOrder
- [x] `TagListEntry` інтерфейс: `{category, categorySlug, tags: {name, slug}[]}`
- [x] `toPromptTags(entries)` — конвертер TagListEntry[] → TagListItem[] для buildPrompt
- [x] Кешування: виклик 1 раз на batch, результат передається в buildPrompt per-group
- [x] Порожній master-list (0 active тегів) → prompt з fallback інструкцією

### GPT Summary + Tags (todo.md)
**Статус:** Завершено

- [x] `generateSummaryForGroup(groupId, tagList)` в `lib/openai.ts`
- [x] Збирає всі post_sources → об'єднує original_text → buildPrompt → GPT-4o-mini з `response_format: json_object`
- [x] Парсинг + валідація JSON response (summary string, tags array)
- [x] `is_new: false` → findFirst tag by name (case-insensitive, active) → create post_tag
- [x] `is_new: true` → create tag status=pending з auto-slugify + create post_tag (дублікати не створюються — перевірка existing)
- [x] `is_manually_edited = true` → SKIP summary generation
- [x] Невалідний GPT response → log error, return null, pipeline продовжує
- [x] Перед tag processing — deleteMany existing post_tags (regeneration)
- [x] Pipeline log (type: gpt) з summary_length, tags_count, tags_new, tags_existing

### Summary Quality Check (todo.md)
**Статус:** Завершено

- [x] `checkSummaryQuality(groupId)` в `lib/openai.ts`
- [x] Генерує embedding для summary (text-embedding-3-small)
- [x] Обчислює avg embedding джерел (поелементне середнє raw_posts.embedding)
- [x] cosine_similarity(summary_embedding, avg_source_embedding) → posts.summary_score
- [x] Threshold статуси: >= 0.75 ok, 0.60-0.74 suspicious, < 0.60 bad
- [x] Skip якщо summary=NULL або 0 source embeddings (з warning)
- [x] Pipeline log (type: quality) з score, status, source_count

### is_manually_edited Protection (todo.md)
**Статус:** Завершено

- [x] `generateSummaryForGroup`: check `is_manually_edited = true` → SKIP з логом (було раніше)
- [x] `grouping.ts`: при join existing group → reset `is_manually_edited = false` в тій самій транзакції
- [x] Логування: `Group {id}: is_manually_edited reset (new source added)`
- [x] `is_manually_grouped` і `is_manually_edited` працюють незалежно

### Pipeline Orchestration (todo.md)
**Статус:** Завершено

- [x] `lib/pipeline.ts` — `runPipeline()` orchestrates повний цикл
- [x] Послідовність: embedding → grouping → getActiveTagsList → GPT summary → quality check → mark processed
- [x] `PipelineResult`: embeddingsGenerated, groupsCreated, groupsUpdated, summariesGenerated, pendingTagsCreated, errors[], durationSeconds
- [x] Error handling: помилка в одному кроці/групі не зупиняє pipeline (try/catch per-step + per-group)
- [x] Mark processed: `UPDATE raw_posts SET processed=true WHERE embedding IS NOT NULL AND postId IS NOT NULL`
- [x] API endpoint: `POST /api/pipeline/run` → повертає PipelineResult як JSON
- [x] `getActiveTagsList()` викликається 1 раз на batch

### Pipeline Logging — GPT & Quality (todo.md)
**Статус:** Завершено

- [x] **GPT лог** (type: gpt, per-group): group_id, sources_count, input_tokens, output_tokens, cost_usd, matched_tags[], new_pending_tags[], summary_length_chars, duration_ms
- [x] GPT error лог: group_id, error message, tokens, duration_ms
- [x] Cost calculation: GPT-4o-mini pricing ($0.15/1M input, $0.60/1M output)
- [x] **Quality лог** (type: quality, per-group): group_id, summary_score, status (ok/suspicious/bad), threshold (0.75), source_count
- [x] Всі логи мають post_id (FK на posts)

### Posts API (todo.md)
**Статус:** Завершено

- [x] `app/api/posts/route.ts` — GET endpoint
- [x] Query params: `folder` (slug), `channel` (username), `tag` (slug), `page` (default 1), `limit` (default 20, max 100)
- [x] Base: `WHERE isDeleted=false ORDER BY createdAt DESC` з пагінацією
- [x] Фільтр folder: через `postSources → channel → categoryMap → category.slug`
- [x] Фільтр channel: через `postSources → channel.username`
- [x] Фільтр tag: через `postTags → tag.slug WHERE status=active`
- [x] Фільтри комбінуються через AND
- [x] Include: postSources (channel username/displayName, tgUrl), postTags (tag name/slug/category — тільки active)
- [x] Response: `{posts, pagination: {page, limit, total, totalPages}}`
- [x] Next.js ще не встановлений — компіляція після `npm install next`

### Channels CRUD API (todo.md)
**Статус:** Завершено

- [x] `app/api/channels/route.ts` — GET (list з categories), POST (create з валідацією)
- [x] `app/api/channels/[id]/route.ts` — GET (single), PATCH (displayName, isActive), DELETE
- [x] Username валідація: lowercase, 4-32 chars, regex `/^[a-z][a-z0-9_]{3,31}$/`, strip `@`
- [x] Дублікат username → 409 Conflict
- [x] GET response: channel + `categories[]` (через categoryMap)
- [x] DELETE cascade: `ChannelCategoryMap` onDelete: Cascade в Prisma schema

### Folders (Categories) CRUD API (todo.md)
**Статус:** Завершено

- [x] `app/api/folders/route.ts` — GET (list з channelsCount), POST (create з slug валідацією)
- [x] `app/api/folders/[id]/route.ts` — GET (single з channels), PATCH (name, slug), DELETE
- [x] `app/api/folders/[id]/channels/route.ts` — GET (channels in folder), POST (add channel), DELETE (remove channel)
- [x] Slug валідація: lowercase+hyphens, regex, reserved slugs (about, admin, tag, api) → 400
- [x] Дублікат slug → 409 Conflict (включно з PATCH)
- [x] M2M: channelCategoryMap з composite PK, дублікат зв'язку → 409
- [x] DELETE cascade через Prisma schema

### Tags CRUD API (todo.md)
**Статус:** Завершено

- [x] `app/api/tag-categories/route.ts` — GET (list з tagsCount, sorted by sortOrder), POST
- [x] `app/api/tag-categories/[id]/route.ts` — PATCH (name, slug, sortOrder), DELETE (cascade tags)
- [x] `app/api/tags/route.ts` — GET (filters: status, category; includes postsCount, category), POST (create з categoryId валідацією)
- [x] `app/api/tags/[id]/route.ts` — PATCH (name, slug, categoryId, status), DELETE (cascade postTags)
- [x] `app/api/tags/[id]/approve/route.ts` — POST (pending → active, 400 якщо вже active)
- [x] `app/api/tags/[id]/reject/route.ts` — POST (pending → delete + cascade postTags, 400 якщо не pending)
- [x] `app/api/tags/merge/route.ts` — POST ({sourceId, targetId}): transfer postTags → delete source (в транзакції, без дублікатів)
- [x] Slug валідація + UNIQUE check на всіх endpoints

### Posts Admin API (todo.md)
**Статус:** Завершено

- [x] `app/api/posts/[id]/route.ts` — GET (single з sources+tags), PATCH (edit summary → isManuallyEdited=true, soft delete)
- [x] `app/api/posts/merge/route.ts` — POST ({postIds}): move sources+rawPosts+tags → target, soft-delete rest, isManuallyGrouped=true, GPT regen
- [x] `app/api/posts/[id]/split/route.ts` — POST ({sourceId}): new post, move source+rawPost, isManuallyGrouped=true обох, GPT regen обох
- [x] `app/api/posts/[id]/exclude/route.ts` — POST ({sourceId}): delete source, unlink rawPost; 0 sources → isDeleted=true; >0 → GPT regen
- [x] Валідація: deleted posts → 400; split з 1 source → 400
- [x] Всі мутації в `$transaction`; GPT regen після транзакції

### Admin Settings API (todo.md)
**Статус:** Завершено

- [x] `app/api/admin/settings/route.ts` — GET (all settings as object), PATCH ({key, value})
- [x] Whitelist: `cron_interval`, `last_scrape_at`
- [x] Валідація `cron_interval`: число 1-24
- [x] Невалідний key → 400; upsert для створення/оновлення

### Pipeline Logs API (todo.md)
**Статус:** Завершено

- [x] `app/api/logs/route.ts` — GET з фільтрами та пагінацією
- [x] Query params: `type`, `post_id`, `from`, `to`, `page` (default 1), `limit` (default 50, max 100)
- [x] Sorted by `createdAt DESC`; payload як JSON object (Prisma Json type)
- [x] Response: `{logs, pagination: {page, limit, total, totalPages}}`
