interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 120, height = 32, color }: Props) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const polyline = points.map(([x, y]) => `${x},${y}`).join(" ");
  const lastX = points[points.length - 1][0];
  const lastY = points[points.length - 1][1];
  const trend = data[data.length - 1] - data[0];
  const stroke = color ?? (trend >= 0 ? "var(--accent)" : "var(--red)");
  const gradId = `spark-grad-${Math.random().toString(36).slice(2, 9)}`;
  const areaPath = `M ${points[0][0]},${height} L ${polyline.replace(/ /g, " L ")} L ${lastX},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="sparkline-svg">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2.2} fill={stroke} />
    </svg>
  );
}
