import Link from "next/link";

interface TagChipProps {
  name: string;
  slug: string;
  categoryName?: string;
}

export function TagChip({ name, slug, categoryName }: TagChipProps) {
  return (
    <Link
      href={`/tags/${slug}/`}
      className="inline-flex items-center gap-1 rounded-sm border border-border/60 bg-muted/50 px-2 py-0.5 text-xs leading-tight text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted hover:text-foreground"
    >
      {categoryName && (
        <span className="font-medium text-foreground/40">{categoryName}:</span>
      )}
      <span>{name}</span>
    </Link>
  );
}
