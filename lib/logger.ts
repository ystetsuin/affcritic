import { prisma } from "./db";
import type { PipelineLogType } from "../generated/prisma/client";

export async function logPipeline(
  type: PipelineLogType,
  postId: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  await prisma.pipelineLog.create({
    data: {
      type,
      postId,
      payload,
    },
  });
}
