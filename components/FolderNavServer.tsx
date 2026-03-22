import { prisma } from "@/lib/db";
import { FolderNav } from "./FolderNav";

export async function FolderNavServer() {
  const categories = await prisma.channelCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true },
  });

  return <FolderNav folders={categories} />;
}
