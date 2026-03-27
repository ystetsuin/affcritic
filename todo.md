## Контекст

В коді є hardcoded Tailwind кольори які не адаптуються під dark mode. Потрібен аудит і фікс.

Референс: `frontend.md → Кольори в компонентах (hardcoded Tailwind)`

## Action Items

- [ ]  **PostCard.tsx** — score badges: `text-emerald-700` / `text-amber-600` / `text-red-600`. Додати `dark:` варіанти (напр. `dark:text-emerald-400`, `dark:text-amber-400`, `dark:text-red-400`).
- [ ]  **DashboardCharts.tsx** — Recharts використовує hardcoded HEX (`#10b981`, `#6366f1`, `#f59e0b`, `#ef4444`). Ці кольори OK для dark mode (яскраві на темному фоні). Перевірити: Tooltip фон, grid лінії, axis labels — можуть потребувати `dark:` стилів або CSS variable-based кольорів для Recharts props.
- [ ]  **Admin pages** — type badges (`bg-blue-100`, `bg-purple-100`, etc.). Додати `dark:bg-blue-900/30 dark:text-blue-300` і аналогічно для всіх кольорів.
- [ ]  **TagChip.tsx** — `bg-secondary`, `border-border`. Ці вже на CSS variables — перевірити що dark значення виглядають OK.
- [ ]  **Sidebar.tsx** — перевірити hover states, active states, mobile drawer background.
- [ ]  **FolderNav.tsx** — active state `bg-foreground text-background` — повинно працювати автоматично через CSS vars, перевірити.
- [ ]  **Всі admin сторінки** — пройти кожну в dark mode, зафіксити нечитабельні елементи (inputs, tables, modals).

## Definition of Done

- Всі публічні сторінки читабельні в dark mode.
- Admin панель читабельна в dark mode.
- Charts, badges, tags визуально коректні.
- Немає білих фонів / невидимого тексту в dark mode.

## QA Checklist

- [ ]  `/` в dark mode — Feed, PostCard, TagChip, Sidebar, FolderNav.
- [ ]  `/tag/{slug}/` в dark mode — EntityHeader, Feed.
- [ ]  `/channels/` в dark mode — stats table, sidebar.
- [ ]  `/topics/` в dark mode — category tiles, tag tiles.
- [ ]  `/admin/` в dark mode — dashboard metrics, charts, logs.
- [ ]  `/admin/tags/` в dark mode — pending badges, DnD sort.
- [ ]  `/admin/posts/` в dark mode — inline edit, merge toolbar.
- [ ]  Mobile 375px dark mode — drawer sidebar, cards.