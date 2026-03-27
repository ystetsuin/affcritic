import Link from "next/link";

interface TagChipProps {
  name: string;
  slug: string;
  categoryName?: string;
}

export function TagChip({ name, slug }: TagChipProps) {
  return (
    <Link href={`/tags/${slug}/`} className="tag-chip">
      {name}
    </Link>
  );
}
