# Deploy на Hostinger Cloud Startup

> Конфігурація: web-частина (Next.js 16) на Hostinger Cloud Startup, scraper + stats collector — локально, БД — Neon Postgres (cloud).

---

## Архітектура production

```
┌────────────────────────────┐         ┌──────────────────────────┐
│  Hostinger Cloud Startup   │ ──────▶ │  Neon Postgres + pgvector │
│  (Next.js standalone)      │         │  (DATABASE_URL)           │
│  yourdomain.com            │         └──────────────────────────┘
└────────────────────────────┘                       ▲
                                                     │ writes raw_posts
                                                     │
                                       ┌─────────────────────────────┐
                                       │  Локальний Mac (cron):      │
                                       │  python3 scraper/main.py    │
                                       │  python3 scraper/stats_     │
                                       │           collector.py      │
                                       └─────────────────────────────┘
```

---

## Передумови

- Hostinger тариф **Cloud Startup** (або вищий) з підтримкою Node.js apps
- Доступ до **hPanel** і **SSH** (Cloud Startup надає обидва)
- GitHub-репозиторій з проектом (`origin/main`)
- Існуюча Neon DB (DATABASE_URL уже працює локально)
- OpenAI API key з підтвердженим білінгом

---

## Крок 1 — Запушити готовий код в GitHub

Перед першим deploy переконатися що всі зміни закомічені:

```bash
git status                       # має бути clean
git push origin main
```

⚠ **Перевірити що в `.gitignore`:**
- `.env`
- `node_modules/`
- `.next/`
- `scraper/__pycache__/`
- `scraper/*.session*` (Telethon session з auth-token)
- `public/avatars/` (завантажуються stats collector локально)

---

## Крок 2 — Hostinger: створити Node.js app

1. **hPanel** → **Hosting** → ваш план → **Advanced** → **Node.js**
2. Натиснути **Create Application**:
   - **Node.js version:** 22.x (LTS) — Next.js 16 потребує ≥18.18, 22 рекомендовано
   - **Application root:** `domains/yourdomain.com/public_html` (або куди буде клонуватися repo)
   - **Application URL:** ваш домен або subdomain
   - **Application startup file:** `.next/standalone/server.js`
3. Зберегти. hPanel створить `~/.nvm/...` симлінки і вкаже команду активації.

---

## Крок 3 — SSH: склонувати репозиторій

Через hPanel або термінал:

```bash
ssh u123456@your-host.hstgr.io   # дані з hPanel → SSH Access
cd domains/yourdomain.com/public_html

# Видалити дефолтний index.html якщо є
rm -f index.html

# Клонувати (replace URL)
git clone https://github.com/yourusername/affcritic.git .

# Або якщо приватний repo — використати deploy key або personal access token:
# git clone https://<TOKEN>@github.com/yourusername/affcritic.git .
```

---

## Крок 4 — Встановити залежності + згенерувати Prisma client

```bash
# Активувати Node.js env (команда видасть hPanel у Node.js app сторінці)
source /home/u123456/nodevenv/domains/yourdomain.com/public_html/22/bin/activate

# Install dependencies
npm ci --omit=dev || npm ci   # dev deps іноді потрібні для build, fallback
npx prisma generate
```

---

## Крок 5 — Налаштувати ENV vars

В hPanel → Node.js app → **Environment variables** додати:

| Key | Value | Призначення |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://...neon.tech/...` | Neon з `.env` локально |
| `OPENAI_API_KEY` | `sk-...` | для GPT і embedding |
| `ADMIN_USER` | `your-username` | Basic Auth login |
| `ADMIN_PASS` | сильний пароль | Basic Auth password (≥16 символів) |
| `NODE_ENV` | `production` | оптимізації |
| `PORT` | `3000` (або що задає Hostinger) | порт додатку |

**TG_API_ID, TG_API_HASH** і **TG_SESSION_NAME** на production **не потрібні** — scraper працює локально.

⚠ **ADMIN_USER/ADMIN_PASS обов'язкові** — якщо не задано, middleware повертає 503 для всіх admin шляхів.

---

## Крок 6 — Build

```bash
npm run build    # next build з output: "standalone"
```

Результат: `.next/standalone/server.js` + `.next/static/` + `public/`.

**Standalone не копіює `public/` і `.next/static/` автоматично** — треба синхронізувати:

```bash
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

---

## Крок 7 — Запустити додаток

В hPanel → Node.js app → **Restart Application**.

Якщо все ОК, у логах побачите:
```
▲ Next.js 16.2.1
- Local: http://localhost:3000
✓ Ready
```

Відкрити `https://yourdomain.com` — має з'явитися публічна частина.
Відкрити `https://yourdomain.com/admin` — браузер запросить логін/пароль (Basic Auth prompt).

---

## Крок 8 — Налаштувати локальний scraper писати в production DB

На вашому Mac в `.env` уже є той самий `DATABASE_URL` (Neon). Scraper писатиме в ту саму БД що читає web на Hostinger.

**Cron на Mac:**

```bash
crontab -e
```

Додати:
```cron
# Scraper — кожну годину (інтервал береться з admin_settings)
0 * * * * cd /Users/yar/Documents/work/affcritic && bash scraper/cron_runner.sh >> /tmp/affcritic-scraper.log 2>&1

# Stats collector — раз на добу о 06:00
0 6 * * * /Users/yar/Documents/work/affcritic/scraper/stats_cron.sh >> /tmp/affcritic-stats.log 2>&1
```

Mac повинен бути увімкнений у час виконання (або поставити power schedule).

---

## Оновлення коду на проді

```bash
ssh u123456@your-host.hstgr.io
cd domains/yourdomain.com/public_html
git pull origin main
source /home/u123456/nodevenv/.../bin/activate
npm ci
npx prisma generate
npm run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
# В hPanel → Restart Application
```

Можна обернути в shell-скрипт `deploy.sh`.

---

## Troubleshooting

### 503 на `/admin/*`
ADMIN_USER або ADMIN_PASS не задані в ENV. Додати в hPanel і restart.

### 500 на сторінках
Перевірити логи: hPanel → Node.js app → **Logs**. Часті причини:
- `DATABASE_URL` неправильний → Prisma error
- `OPENAI_API_KEY` відсутній → fail при першому /api/posts request з admin
- `next build` не завершився → запустити вручну через SSH

### Static files не вантажаться
Забули `cp -r .next/static .next/standalone/.next/` після `next build`.

### "Module not found: d3-path" (або інший d3-* пакет)
Це специфіка вашої локальної машини (npm extraction bug). На Hostinger має бути ОК. Якщо все-таки виникає:
```bash
rm -rf node_modules && npm ci
```

### Memory limit на Cloud Startup
Build потребує ~1.5–2 GB RAM. Якщо OOM під час `next build`:
- Запустити з `NODE_OPTIONS="--max-old-space-size=1024" npm run build`
- Або build локально, заархівувати `.next/` і scp на сервер

---

## Безпека на проді

✅ **Що захищено через middleware:**
- `/admin/*` — UI сторінки
- `/api/admin/*`, `/api/logs`, `/api/scraper/*`, `/api/pipeline/*`, `/api/stats/*`
- POST/PATCH/PUT/DELETE на будь-який `/api/*`

✅ **Що публічно (read-only):**
- `/`, `/topics`, `/channels`, `/tags` і всі їхні підсторінки
- GET `/api/posts`, `/api/channels`, `/api/tags`, `/api/folders`, `/api/tag-categories`
- GET `/api/channel-stats/*`, `/api/channel-top-posts/*`

⚠ **Що варто додати з часом:**
- HTTPS-only cookies (зараз Basic Auth, потім можна перейти на NextAuth з session)
- Rate-limit на public API (Cloudflare або middleware)
- IP allowlist для admin якщо є фіксована IP
- Secret rotation процес для ADMIN_PASS

---

## Локальний test prod-build перед deploy

```bash
npm run build
node .next/standalone/server.js
# → http://localhost:3000
```

Перевірити:
- [ ] Public сторінки відкриваються
- [ ] /admin без auth → 401
- [ ] /admin з ADMIN_USER/PASS → 200
- [ ] POST /api/posts/merge без auth → 401
- [ ] GET /api/posts без auth → 200
