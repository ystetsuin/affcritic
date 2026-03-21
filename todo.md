Ініціалізація Next.js проекту з TypeScript, Tailwind CSS і shadcn/ui. Це фундамент фронтенду — після цього кроку можна розробляти компоненти і сторінки.

**Залежність:** немає (можна паралельно з backend)

**Референс:** [CLAUDE.md](http://CLAUDE.md) → секція Tech Stack, Project Structure

---

## Action Items

- [ ]  Ініціалізувати проект: `npx create-next-app@latest affcritic --typescript --tailwind --app`
- [ ]  Ініціалізувати shadcn/ui: `npx shadcn@latest init`
- [ ]  Налаштувати `tailwind.config.ts` — mobile-first breakpoints
- [ ]  Створити базову структуру директорій відповідно до [CLAUDE.md](http://CLAUDE.md): `app/`, `components/`, `lib/`
- [ ]  Налаштувати base layout (`app/layout.tsx`) — metadata, fonts, global styles
- [ ]  Підключити Prisma client з `lib/db.ts` (створений в 1.2)
- [ ]  Перевірити dev server: `npm run dev` → сторінка відкривається на [localhost:3000](http://localhost:3000)
- [ ]  Додати `.env.local` для frontend-specific env vars (якщо потрібні)

---

## Definition of Done (DoD)

- Next.js 14+ проект з App Router, TypeScript, Tailwind, shadcn/ui запускається
- `npm run dev` → [localhost:3000](http://localhost:3000) без помилок
- Структура директорій відповідає [CLAUDE.md](http://CLAUDE.md)
- Prisma client підключений

---

## QA Checklist

- [ ]  `npm run dev` → 200 на [localhost:3000](http://localhost:3000)
- [ ]  TypeScript — жодних TS помилок в console
- [ ]  Tailwind — test class (`className="text-red-500"`) застосовується
- [ ]  shadcn/ui — test component (Button) рендериться
- [ ]  App Router — `app/page.tsx` відображається як головна сторінка
- [ ]  `lib/db.ts` імпортується без помилок
- [ ]  Mobile viewport (375px) — сторінка адаптивна