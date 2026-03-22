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

const SYSTEM_PROMPT = `Ты — редактор новостного дайджеста об affiliate-маркетинге, iGaming и digital-рекламе.

ВАЖНО — язык:
- Summary ОБЯЗАТЕЛЬНО на русском языке. НЕ используй украинский, английский или другие языки.
- Даже если источники на украинском или английском — summary всегда на русском.

Правила:
- Тон: нейтральный, news-style, без оценок и эмоций
- Длина summary: 3–5 предложений
- Формат ответа: строго JSON, без markdown, без комментариев

Тебе дадут один или несколько текстов-источников на одну тему. Твоя задача:
1. Написать краткое summary, объединяющее информацию из всех источников.
2. Подобрать теги из предоставленного master-list (is_new: false). Если в тексте встречается alias тега — возвращай ОСНОВНОЕ имя тега, не alias.
3. Если в тексте упоминается сущность (компания, GEO, персона), которой НЕТ в master-list и НЕТ среди aliases — предложи новый тег (is_new: true). Категория (category) должна соответствовать одной из существующих категорий.
4. Если подходящих тегов нет — верни пустой массив tags: [].

JSON schema ответа:
{
  "summary": "3–5 предложений, ТОЛЬКО русский язык, нейтральный тон",
  "tags": [
    {"category": "Название категории", "value": "Название тега", "is_new": false},
    {"category": "Название категории", "value": "Новый тег", "is_new": true}
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
