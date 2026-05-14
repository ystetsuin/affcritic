import { prisma } from "./db";

export interface TagListItem {
  category: string;
  values: string[];
}

export interface TagWithAliases {
  name: string;
  slug: string;
  aliases: string[];
}

export interface TagListEntry {
  category: string;
  categorySlug: string;
  tags: TagWithAliases[];
}

/**
 * Fetch all active tags grouped by category, including aliases.
 * Call once per batch, not per-group.
 */
export async function getActiveTagsList(): Promise<TagListEntry[]> {
  const categories = await prisma.tagCategory.findMany({
    where: {
      tags: { some: { status: "active" } },
    },
    include: {
      tags: {
        where: { status: "active" },
        select: {
          name: true,
          slug: true,
          aliases: { select: { alias: true }, orderBy: { alias: "asc" } },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return categories.map((cat) => ({
    category: cat.name,
    categorySlug: cat.slug,
    tags: cat.tags.map((t) => ({
      name: t.name,
      slug: t.slug,
      aliases: t.aliases.map((a) => a.alias),
    })),
  }));
}

/**
 * Convert TagListEntry[] to TagListItem[] for buildPrompt.
 * Includes aliases in the format: "Tag Name (aliases: A, B)"
 */
export function toPromptTags(entries: TagListEntry[]): TagListItem[] {
  return entries.map((e) => ({
    category: e.category,
    values: e.tags.map((t) => {
      if (t.aliases.length === 0) return t.name;
      return `${t.name} (aliases: ${t.aliases.join(", ")})`;
    }),
  }));
}

const SYSTEM_PROMPT = `Ти редактор новинного дайджесту про affiliate-маркетинг, iGaming, SEO та digital-рекламу.

ВАЖЛИВО — мова:
- Summary ОБОВ'ЯЗКОВО українською мовою. НЕ використовуй російську, англійську чи інші мови.
- Навіть якщо джерела російською або англійською — summary завжди українською.

Правила:
- Тон: нейтральний, news-style, без оцінок та емоцій
- Довжина summary: 3–5 речень
- Формат відповіді: строго JSON, без markdown, без коментарів

Тобі дадуть один або кілька текстів-джерел на одну тему. Твоє завдання:
1. Написати коротке summary, що об'єднує інформацію з усіх джерел.
2. Підібрати теги з наданого master-list (is_new: false). Якщо в тексті зустрічається alias тега — повертай ОСНОВНЕ ім'я тега, а не alias.
3. Якщо в тексті згадується сутність (компанія, GEO, персона), якої НЕМАЄ в master-list і НЕМАЄ серед aliases — запропонуй новий тег (is_new: true). Категорія (category) повинна відповідати одній з існуючих категорій.
4. Якщо відповідних тегів немає — поверни порожній масив tags: [].

JSON schema відповіді:
{
  "summary": "3–5 речень, ТІЛЬКИ українська мова, нейтральний тон",
  "tags": [
    {"category": "Назва категорії", "value": "Назва тега", "is_new": false},
    {"category": "Назва категорії", "value": "Новий тег", "is_new": true}
  ]
}`;

export function buildPrompt(
  sourceTexts: string[],
  activeTags: TagListItem[],
): { system: string; user: string } {
  const sourcesBlock = sourceTexts
    .map((text, i) => `--- Источник ${i + 1} ---\n${text}`)
    .join("\n\n");

  let tagsBlock: string;
  if (activeTags.length === 0) {
    tagsBlock =
      "Master-list тегов пуст. Если найдёшь подходящие сущности — предложи новые теги (is_new: true).";
  } else {
    const lines = activeTags.map(
      (cat) => `  ${cat.category}: ${cat.values.join(", ")}`,
    );
    tagsBlock = `Существующие теги (используй is_new: false при совпадении, включая aliases):\n${lines.join("\n")}`;
  }

  const user = `${sourcesBlock}\n\n${tagsBlock}`;

  return { system: SYSTEM_PROMPT, user };
}
