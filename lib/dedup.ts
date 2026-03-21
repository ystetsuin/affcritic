import { prisma } from "./db";
import { bufferToEmbedding } from "./openai";

// ─── Constants ──────────────────────────────────────────

export const SIMILARITY_THRESHOLD = 0.83;
export const DEDUP_WINDOW_HOURS = 48;

// ─── Cosine Similarity ─────────────────────────────────

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

// ─── Find Similar Posts ─────────────────────────────────

export interface SimilarPost {
  rawPostId: string;
  postId: string | null;
  similarity: number;
}

/**
 * Find raw_posts within the dedup window whose embedding is similar to the given one.
 * Returns results sorted by similarity DESC.
 * Excludes the post with `excludeId` (to avoid self-comparison).
 */
export async function findSimilarPosts(
  embedding: number[],
  excludeId?: string,
): Promise<SimilarPost[]> {
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000);

  const candidates = await prisma.rawPost.findMany({
    where: {
      postedAt: { gte: cutoff },
      embedding: { not: null },
    },
    select: { id: true, postId: true, embedding: true },
  });

  const results: SimilarPost[] = [];

  for (const candidate of candidates) {
    if (candidate.id === excludeId) continue;
    if (!candidate.embedding) continue;

    const candidateVec = bufferToEmbedding(Buffer.from(candidate.embedding));
    const sim = cosineSimilarity(embedding, candidateVec);

    if (sim >= SIMILARITY_THRESHOLD) {
      results.push({
        rawPostId: candidate.id,
        postId: candidate.postId,
        similarity: sim,
      });
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results;
}
