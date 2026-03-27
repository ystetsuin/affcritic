import { Breadcrumbs } from "./Breadcrumbs";

interface EntityHeaderProps {
  tagName: string;
  categoryName: string;
  mentionsCount: number;
}

export function EntityHeader({ tagName, categoryName, mentionsCount }: EntityHeaderProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Breadcrumbs items={[
        { label: "AffCritic", href: "/" },
        { label: "Теги", href: "/tags" },
        { label: tagName },
      ]} />
      <h1 className="feed-title">{tagName}</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="feed-results">
          <span>{mentionsCount}</span> згадок
        </span>
        <span className="tag-chip">{categoryName}</span>
      </div>
    </div>
  );
}
