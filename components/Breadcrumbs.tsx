import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="breadcrumbs">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {i > 0 && (
              <span className="bc-sep">
                <svg viewBox="0 0 12 12" fill="none">
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
            {isLast || !item.href ? (
              <span className={isLast ? "bc-current" : "bc-item"}>{item.label}</span>
            ) : (
              <Link href={item.href} className="bc-item">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
