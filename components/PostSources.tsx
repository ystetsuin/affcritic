"use client";

import { useState } from "react";

interface Source {
  id: string;
  tgUrl: string | null;
  originalText: string | null;
  channel: {
    username: string;
    displayName: string | null;
  };
}

interface PostSourcesProps {
  sources: Source[];
  postId?: string;
  onSplit?: (postId: string, sourceId: string) => void;
}

export function PostSources({ sources, postId, onSplit }: PostSourcesProps) {
  const [expanded, setExpanded] = useState(false);

  if (sources.length <= 1) return null;

  const extra = sources.slice(1);

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>+{extra.length} {expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="mt-1.5 flex flex-col gap-2 border-l-2 border-border pl-3">
          {extra.map((source) => (
            <div key={source.id} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <a
                  href={source.tgUrl ?? "#"}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="text-xs font-medium text-foreground/70 transition-colors hover:text-foreground"
                >
                  @{source.channel.username}
                </a>
                {onSplit && postId && (
                  <button
                    onClick={() => onSplit(postId, source.id)}
                    className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Відокремити
                  </button>
                )}
              </div>
              {source.originalText && (
                <p className="text-xs leading-snug text-muted-foreground">
                  {source.originalText.length > 100
                    ? source.originalText.slice(0, 100) + "…"
                    : source.originalText}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
