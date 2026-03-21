import { prisma } from "./db";
import { processUnembeddedPosts, generateSummaryForGroup, checkSummaryQuality } from "./openai";
import { groupNewPosts } from "./grouping";
import { getActiveTagsList } from "./prompts";

export interface PipelineResult {
  embeddingsGenerated: number;
  groupsCreated: number;
  groupsUpdated: number;
  summariesGenerated: number;
  pendingTagsCreated: number;
  errors: string[];
  durationSeconds: number;
}

/**
 * Run the full pipeline: embedding → grouping → GPT summary → quality check → mark processed.
 * Sequence MUST NOT be changed (per CLAUDE.md).
 */
export async function runPipeline(): Promise<PipelineResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  // 1. Embedding
  let embeddingsGenerated = 0;
  try {
    const embResult = await processUnembeddedPosts();
    embeddingsGenerated = embResult.processed;
    if (embResult.errors > 0) {
      errors.push(`Embedding: ${embResult.errors} error(s)`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Embedding fatal: ${msg}`);
    console.error(`[pipeline] Embedding fatal: ${msg}`);
  }

  // 2. Grouping
  let changedGroupIds = new Set<string>();
  try {
    changedGroupIds = await groupNewPosts();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Grouping fatal: ${msg}`);
    console.error(`[pipeline] Grouping fatal: ${msg}`);
  }

  // Count new vs updated groups
  let groupsCreated = 0;
  let groupsUpdated = 0;
  for (const gid of changedGroupIds) {
    const sourceCount = await prisma.postSource.count({ where: { postId: gid } });
    if (sourceCount === 1) groupsCreated++;
    else groupsUpdated++;
  }

  // 3. Load master-list once
  let tagList = await getActiveTagsList();

  // 4. GPT summary for each changed group
  let summariesGenerated = 0;
  for (const groupId of changedGroupIds) {
    try {
      const result = await generateSummaryForGroup(groupId, tagList);
      if (result) summariesGenerated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`GPT group ${groupId}: ${msg}`);
      console.error(`[pipeline] GPT group ${groupId}: ${msg}`);
    }
  }

  // 5. Quality check for each changed group
  for (const groupId of changedGroupIds) {
    try {
      await checkSummaryQuality(groupId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Quality group ${groupId}: ${msg}`);
      console.error(`[pipeline] Quality group ${groupId}: ${msg}`);
    }
  }

  // 6. Mark processed
  await prisma.rawPost.updateMany({
    where: {
      processed: false,
      embedding: { not: null },
      postId: { not: null },
    },
    data: { processed: true },
  });

  // Count pending tags created in this run (approximate: created in last few minutes)
  const recentCutoff = new Date(startTime);
  const pendingTagsCreated = await prisma.tag.count({
    where: {
      status: "pending",
      createdAt: { gte: recentCutoff },
    },
  });

  const durationSeconds = Math.round((Date.now() - startTime) / 1000);

  const result: PipelineResult = {
    embeddingsGenerated,
    groupsCreated,
    groupsUpdated,
    summariesGenerated,
    pendingTagsCreated,
    errors,
    durationSeconds,
  };

  console.log(`[pipeline] Done in ${durationSeconds}s:`, JSON.stringify(result));
  return result;
}
