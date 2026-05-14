"use client";

import { useMemo, useState } from "react";

interface HeatmapCell {
  day: number;
  hour: number;
  count: number;
}

const DAY_LABELS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
// Reorder: Mon first (1,2,3,4,5,6,0)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const HOUR_LABELS = [0, 3, 6, 9, 12, 15, 18, 21];

export function PostingHeatmap({ data }: { data: HeatmapCell[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const { grid, maxCount } = useMemo(() => {
    const g = new Map<string, number>();
    let max = 0;
    for (const cell of data) {
      const key = `${cell.day}-${cell.hour}`;
      g.set(key, cell.count);
      if (cell.count > max) max = cell.count;
    }
    return { grid: g, maxCount: max };
  }, [data]);

  const getLevel = (count: number): number => {
    if (count === 0 || maxCount === 0) return 0;
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-container">
        {/* Hour labels */}
        <div className="heatmap-hours">
          <div className="heatmap-corner" />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="heatmap-hour-label">
              {HOUR_LABELS.includes(h) ? h : ""}
            </div>
          ))}
        </div>

        {/* Rows */}
        {DAY_ORDER.map((dayIdx) => (
          <div key={dayIdx} className="heatmap-row">
            <div className="heatmap-day-label">{DAY_LABELS[dayIdx]}</div>
            {Array.from({ length: 24 }, (_, h) => {
              const count = grid.get(`${dayIdx}-${h}`) ?? 0;
              const level = getLevel(count);
              return (
                <div
                  key={h}
                  className={`heatmap-cell level-${level}`}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 8,
                      text: `${DAY_LABELS[dayIdx]}, ${h}:00 — ${count} постів`,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="heatmap-tooltip"
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
