import OpenAI from "openai";
import { prisma } from "./db";
import { logPipeline } from "./logger";
import { cosineSimilarity } from "./dedup";
import { buildPrompt, toPromptTags } from "./prompts";
import type { TagListEntry } from "./prompts";

// ─── Singleton (lazy init) ──────────────────────────────

const globalForOpenAI = globalThis as unknown as {
  openai: OpenAI | undefined;
};

export function getOpenAI(): OpenAI {
  if (!globalForOpenAI.openai) {
    globalForOpenAI.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return globalForOpenAI.openai;
}

// ─── Embedding ──────────────────────────────────────────

const EMBEDDING_MODEL = "text-embedding-3-small";
const BATCH_SIZE = 50;

/**
 * Generate an embedding vector for a text string.
 * Returns a float32 array (1536 dimensions for text-embedding-3-small).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Convert a number[] to a Buffer (float32 little-endian).
 */
export function embeddingToBuffer(embedding: number[]): Buffer {
  const buf = Buffer.alloc(embedding.length * 4);
  for (let i = 0; i < embedding.length; i++) {
    buf.writeFloatLE(embedding[i], i * 4);
  }
  return buf;
}

/**
 * Convert a Buffer (float32 little-endian) back to number[].
 */
export function bufferToEmbedding(buf: Buffer): number[] {
  const result: number[] = [];
  for (let i = 0; i < buf.length; i += 4) {
    result.push(buf.readFloatLE(i));
  }
  return result;
}

/**
 * Process all raw_posts that have text but no embedding yet.
 * Fetches in batches, generates embeddings, and saves them.
 */
export async function processUnembeddedPosts(): Promise<{
  processed: number;
  skipped: number;
  errors: number;
}> {
  const startTime = Date.now();
  const stats = { processed: 0, skipped: 0, errors: 0 };
  const errorDetails: { rawPostId: string; error: string }[] = [];
  let tokensUsed = 0;

  while (true) {
    const posts = await prisma.rawPost.findMany({
      where: {
        embedding: null,
        processed: false,
      },
      select: { id: true, text: true },
      take: BATCH_SIZE,
    });

    if (posts.length === 0) break;

    for (const post of posts) {
      if (!post.text || post.text.trim().length === 0) {
        stats.skipped++;
        continue;
      }

      try {
        const response = await getOpenAI().embeddings.create({
          model: EMBEDDING_MODEL,
          input: post.text,
        });
        const embedding = response.data[0].embedding;
        tokensUsed += response.usage?.total_tokens ?? 0;

        const buf = embeddingToBuffer(embedding);

        await prisma.rawPost.update({
          where: { id: post.id },
          data: { embedding: buf },
        });

        stats.processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[embedding] Failed for raw_post ${post.id}: ${msg}`);
        errorDetails.push({ rawPostId: post.id, error: msg });
        stats.errors++;
      }
    }
  }

  const durationSeconds = Math.round((Date.now() - startTime) / 1000);

  await logPipeline("embedding", null, {
    posts_processed: stats.processed,
    posts_skipped_empty_text: stats.skipped,
    errors: errorDetails,
    tokens_used: tokensUsed,
    duration_seconds: durationSeconds,
  });

  return stats;
}

// ─── GPT Summary ────────────────────────────────────────

const GPT_MODEL = "gpt-4o-mini";

interface GPTTagResult {
  category: string;
  value: string;
  is_new: boolean;
}

interface GPTResult {
  summary: string;
  tags: GPTTagResult[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/**
 * Generate summary and tags for a group via GPT-4o-mini.
 * Skips groups with is_manually_edited = true.
 * Saves summary to posts.summary and creates post_tags.
 */
export async function generateSummaryForGroup(
  groupId: string,
  tagList: TagListEntry[],
): Promise<GPTResult | null> {
  // Check if manually edited — skip
  const post = await prisma.post.findUnique({
    where: { id: groupId },
    select: { isManuallyEdited: true },
  });

  if (post?.isManuallyEdited) {
    console.log(`[gpt] Group ${groupId} is manually edited — skipping`);
    return null;
  }

  // Gather all source texts
  const sources = await prisma.postSource.findMany({
    where: { postId: groupId },
    select: { originalText: true },
    orderBy: { id: "asc" },
  });

  const sourceTexts = sources
    .map((s) => s.originalText)
    .filter((t): t is string => !!t && t.trim().length > 0);

  if (sourceTexts.length === 0) {
    console.warn(`[gpt] Group ${groupId} has no source texts — skipping`);
    return null;
  }

  const promptTags = toPromptTags(tagList);
  const { system, user } = buildPrompt(sourceTexts, promptTags);

  let gptResult: GPTResult;
  let inputTokens = 0;
  let outputTokens = 0;
  const gptStartTime = Date.now();

  try {
    const response = await getOpenAI().chat.completions.create({
      model: GPT_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    inputTokens = response.usage?.prompt_tokens ?? 0;
    outputTokens = response.usage?.completion_tokens ?? 0;

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty GPT response");

    const parsed = JSON.parse(content);

    if (!parsed.summary || typeof parsed.summary !== "string") {
      throw new Error("Invalid GPT response: missing or invalid summary");
    }
    if (!Array.isArray(parsed.tags)) {
      throw new Error("Invalid GPT response: tags is not an array");
    }

    gptResult = { summary: parsed.summary, tags: parsed.tags };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[gpt] Failed for group ${groupId}: ${msg}`);
    await logPipeline("gpt", groupId, {
      group_id: groupId,
      error: msg,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      duration_ms: Date.now() - gptStartTime,
    });
    return null;
  }

  // Save summary
  await prisma.post.update({
    where: { id: groupId },
    data: { summary: gptResult.summary },
  });

  // Clear existing post_tags for this group (regeneration)
  await prisma.postTag.deleteMany({ where: { postId: groupId } });

  // Process tags — track matched and new for logging
  const matchedTags: string[] = [];
  const newPendingTags: string[] = [];

  for (const tag of gptResult.tags) {
    try {
      let tagId: string;

      if (!tag.is_new) {
        // Find existing active tag by name (case-insensitive)
        const existing = await prisma.tag.findFirst({
          where: {
            name: { equals: tag.value, mode: "insensitive" },
            status: "active",
          },
          select: { id: true },
        });

        if (!existing) {
          console.warn(`[gpt] Tag "${tag.value}" not found in active tags — skipping`);
          continue;
        }
        tagId = existing.id;
        matchedTags.push(tag.value);
      } else {
        // Check if tag already exists (active or pending)
        const existing = await prisma.tag.findFirst({
          where: {
            name: { equals: tag.value, mode: "insensitive" },
          },
          select: { id: true },
        });

        if (existing) {
          tagId = existing.id;
          matchedTags.push(tag.value);
        } else {
          // Find category by name
          const category = await prisma.tagCategory.findFirst({
            where: { name: { equals: tag.category, mode: "insensitive" } },
            select: { id: true },
          });

          if (!category) {
            console.warn(`[gpt] Category "${tag.category}" not found — skipping tag "${tag.value}"`);
            continue;
          }

          const newTag = await prisma.tag.create({
            data: {
              name: tag.value,
              slug: slugify(tag.value),
              status: "pending",
              categoryId: category.id,
            },
          });
          tagId = newTag.id;
          newPendingTags.push(tag.value);
        }
      }

      // Create post_tag
      await prisma.postTag.create({
        data: { postId: groupId, tagId },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[gpt] Failed to process tag "${tag.value}" for group ${groupId}: ${msg}`);
    }
  }

  // GPT-4o-mini pricing: $0.15/1M input, $0.60/1M output
  const costUsd = (inputTokens * 0.15 + outputTokens * 0.60) / 1_000_000;

  // Log GPT result
  await logPipeline("gpt", groupId, {
    group_id: groupId,
    sources_count: sourceTexts.length,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: parseFloat(costUsd.toFixed(6)),
    matched_tags: matchedTags,
    new_pending_tags: newPendingTags,
    summary_length_chars: gptResult.summary.length,
    duration_ms: Date.now() - gptStartTime,
  });

  return gptResult;
}

// ─── Summary Quality Check ──────────────────────────────

/**
 * Check summary quality by comparing embedding of summary
 * against average embedding of source raw_posts.
 * Saves result to posts.summary_score.
 * Returns the score or null if check was skipped.
 */
export async function checkSummaryQuality(groupId: string): Promise<number | null> {
  const post = await prisma.post.findUnique({
    where: { id: groupId },
    select: { summary: true },
  });

  if (!post?.summary) {
    console.warn(`[quality] Group ${groupId} has no summary — skipping`);
    return null;
  }

  // Get source raw_posts embeddings
  const rawPosts = await prisma.rawPost.findMany({
    where: { postId: groupId, embedding: { not: null } },
    select: { embedding: true },
  });

  if (rawPosts.length === 0) {
    console.warn(`[quality] Group ${groupId} has no source embeddings — skipping`);
    return null;
  }

  // Compute average source embedding
  const sourceEmbeddings = rawPosts.map((rp) =>
    bufferToEmbedding(Buffer.from(rp.embedding!)),
  );
  const dim = sourceEmbeddings[0].length;
  const avgEmbedding = new Array<number>(dim).fill(0);
  for (const emb of sourceEmbeddings) {
    for (let i = 0; i < dim; i++) {
      avgEmbedding[i] += emb[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    avgEmbedding[i] /= sourceEmbeddings.length;
  }

  // Generate embedding for summary
  const summaryEmbedding = await generateEmbedding(post.summary);

  // Compute score
  const score = cosineSimilarity(summaryEmbedding, avgEmbedding);

  // Determine status
  let status: string;
  if (score >= 0.75) status = "ok";
  else if (score >= 0.60) status = "suspicious";
  else status = "bad";

  console.log(`[quality] Group ${groupId}: score=${score.toFixed(4)} (${status})`);

  // Save to DB
  await prisma.post.update({
    where: { id: groupId },
    data: { summaryScore: score },
  });

  // Log
  await logPipeline("quality", groupId, {
    group_id: groupId,
    summary_score: parseFloat(score.toFixed(4)),
    status,
    threshold: 0.75,
    source_count: sourceEmbeddings.length,
  });

  return score;
}
