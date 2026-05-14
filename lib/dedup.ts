import { prisma } from "./db";

// ─── Constants ──────────────────────────────────────────

export const SIMILARITY_THRESHOLD = 0.83;
export const DEDUP_WINDOW_HOURS = 48;

// ─── Cosine Similarity (JS fallback for quality check) ──

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

// ─── Find Similar Posts (pgvector) ──────────────────────

export interface SimilarPost {
  rawPostId: string;
  postId: string | null;
  similarity: number;
}

/**
 * Find raw_posts whose embedding is similar to the given raw_post's embedding.
 * Uses pgvector's <=> (cosine distance) operator — all computation in PostgreSQL.
 * Two pools of candidates:
 *   1. Grouped raw_posts (post_id IS NOT NULL) — no time limit
 *   2. Ungrouped raw_posts (post_id IS NULL) — within DEDUP_WINDOW_HOURS
 * Returns results sorted by similarity DESC, above SIMILARITY_THRESHOLD.
 */
export async function findSimilarPosts(
  rawPostId: string,
): Promise<SimilarPost[]> {
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000);

  const results = await prisma.$queryRaw<
    { raw_post_id: string; post_id: string | null; similarity: number }[]
  >`
    SELECT
      rp2.id AS raw_post_id,
      rp2.post_id,
      1 - (rp2.embedding <=> rp1.embedding) AS similarity
    FROM raw_posts rp1, raw_posts rp2
    WHERE rp1.id = ${rawPostId}::uuid
      AND rp2.id != ${rawPostId}::uuid
      AND rp2.embedding IS NOT NULL
      AND rp1.embedding IS NOT NULL
      AND (rp2.post_id IS NOT NULL OR rp2.posted_at >= ${cutoff})
      AND 1 - (rp2.embedding <=> rp1.embedding) >= ${SIMILARITY_THRESHOLD}
    ORDER BY rp2.embedding <=> rp1.embedding ASC
    LIMIT 20
  `;

  return results.map((r) => ({
    rawPostId: r.raw_post_id,
    postId: r.post_id,
    similarity: Number(r.similarity),
  }));
}

/**
 * Find posts similar to a given embedding vector (passed as number[]).
 * Used by quality check where we generate a new embedding in Node.js.
 */
export async function findSimilarByVector(
  embedding: number[],
  excludeId?: string,
): Promise<SimilarPost[]> {
  const vectorStr = `[${embedding.join(",")}]`;
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000);

  const results = await prisma.$queryRaw<
    { raw_post_id: string; post_id: string | null; similarity: number }[]
  >`
    SELECT
      id AS raw_post_id,
      post_id,
      1 - (embedding <=> ${vectorStr}::vector) AS similarity
    FROM raw_posts
    WHERE embedding IS NOT NULL
      AND (${excludeId}::uuid IS NULL OR id != ${excludeId}::uuid)
      AND (post_id IS NOT NULL OR posted_at >= ${cutoff})
      AND 1 - (embedding <=> ${vectorStr}::vector) >= ${SIMILARITY_THRESHOLD}
    ORDER BY embedding <=> ${vectorStr}::vector ASC
    LIMIT 20
  `;

  return results.map((r) => ({
    rawPostId: r.raw_post_id,
    postId: r.post_id,
    similarity: Number(r.similarity),
  }));
}
