import Link from "next/link";

interface EntityHeaderProps {
  tagName: string;
  categoryName: string;
  mentionsCount: number;
}

export function EntityHeader({ tagName, categoryName, mentionsCount }: EntityHeaderProps) {
  return (
    <div className="mb-6 border-b border-border pb-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          ← Feed
        </Link>
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <h1 className="text-xl font-bold tracking-tight">{tagName}</h1>
        <span className="text-sm text-muted-foreground">
          {mentionsCount} згадок
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{categoryName}</p>
    </div>
  );
}
