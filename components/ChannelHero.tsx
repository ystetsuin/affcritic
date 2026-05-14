import Image from "next/image";
import Link from "next/link";

interface Props {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  description: string | null;
  categories: { name: string; slug: string }[];
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

export function ChannelHero({
  username,
  displayName,
  avatarUrl,
  description,
  categories,
}: Props) {
  const name = displayName || `@${username}`;
  const initial = (displayName || username).charAt(0).toUpperCase();

  return (
    <div className="ch-hero">
      {/* Top row: avatar + info */}
      <div className="ch-hero-top">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={80}
            height={80}
            className="ch-hero-avatar"
          />
        ) : (
          <div className="ch-hero-avatar ch-hero-avatar-placeholder">
            {initial}
          </div>
        )}

        <div className="ch-hero-info">
          <div className="ch-hero-name-row">
            <h1 className="ch-hero-name">{name}</h1>
            <a
              href={`https://t.me/${username}`}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="ch-hero-tg-btn"
            >
              Telegram ↗
            </a>
          </div>

          <p className="ch-hero-username">@{username}</p>

          {description && (
            <p className="ch-hero-bio">{description}</p>
          )}

          {categories.length > 0 && (
            <div className="ch-hero-cats">
              {categories.map((c) => (
                <Link key={c.slug} href={`/topics/${c.slug}/`} className="ch-hero-cat-badge">
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
