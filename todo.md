## Контекст

Активних задач немає. Останній блок робіт — Visual Redesign v2 / Neon Emerald (див. `progress.md` №103-108).

---

## Backlog / Ідеї

- [ ]  `/about/` сторінка — поки що 404. У BottomNav (mobile) і footer є посилання, треба статичну.
- [ ]  Adminка: log type badges переробити з `bg-blue-500/20` etc. на `.log-badge` outline-only (стилі вже в `globals.css`).
- [ ]  Channels page: можливо додати фільтр-чіпи top-level (Активні/Неактивні/Всі) над списком, щоб не залежати лише від sidebar.
- [ ]  Toast notifications замість inline "Success/Error" повідомлень в адмінці.
- [ ]  Додати lock-write на старті `scraper/stats_collector.py` (як в `stats_cron.sh`), щоб CLI/cron/admin запуски всі координувалися через один `/tmp/affcritic-stats-collector.lock`. Зараз endpoint-coordination є, але CLI запуски її обходять.
