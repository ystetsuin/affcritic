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
  score?: number | null;
  onSplit?: (postId: string, sourceId: string) => void;
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 0.75 ? "score-green" : score >= 0.60 ? "score-amber" : "score-red";
  return (
    <span className={`score-badge ${cls}`} title={`Quality: ${score.toFixed(4)}`}>
      {score.toFixed(2)}
    </span>
  );
}

export function PostSources({ sources, postId, score, onSplit }: PostSourcesProps) {
  const [expanded, setExpanded] = useState(false);

  if (sources.length === 0) return null;

  const extraCount = sources.length > 1 ? sources.length - 1 : 0;
  const toggleLabel = extraCount > 0 ? `Source +${extraCount}` : "Source";

  const hasScore = score != null;
  const hasAdmin = !!onSplit;

  // Grid columns: [score] username excerpt [admin]
  let gridCols = "104px 1fr";
  if (hasScore && hasAdmin) gridCols = "44px 104px 1fr auto";
  else if (hasScore) gridCols = "44px 104px 1fr";
  else if (hasAdmin) gridCols = "104px 1fr auto";

  return (
    <>
      {/* Card footer: sources toggle RIGHT-aligned */}
      <div className="card-footer">
        <button
          className={`sources-toggle ${expanded ? "open" : ""}`}
          onClick={() => setExpanded(!expanded)}
        >
          {toggleLabel}{" "}
          <svg
            viewBox="0 0 14 14"
            fill="none"
            style={{ width: 13, height: 13, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : undefined }}
          >
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Expanded sources panel */}
      {expanded && (
        <div className="sources-panel">
          {sources.map((source) => (
            <div
              key={source.id}
              className="source-row"
              style={{ gridTemplateColumns: gridCols }}
            >
              {hasScore && <ScoreBadge score={score} />}
              <a
                href={source.tgUrl ?? "#"}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="source-username"
              >
                @{source.channel.username}
              </a>
              <span className="source-excerpt">
                {source.originalText
                  ? source.originalText.length > 120
                    ? source.originalText.slice(0, 120) + "..."
                    : source.originalText
                  : "—"}
              </span>
              {onSplit && postId && (
                <button
                  onClick={() => onSplit(postId, source.id)}
                  style={{ fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", marginLeft: 8, whiteSpace: "nowrap" }}
                >
                  Відокремити
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
