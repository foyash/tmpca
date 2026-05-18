type Props = {
  // One value per deliverable, in order. null for "not computed yet".
  scores: (number | null)[];
};

export function ScoreSparkline({ scores }: Props) {
  const valid = scores.filter((s): s is number => s != null);
  if (valid.length < 2) return null;

  const W = 140;
  const H = 40;
  const P = 4;
  const min = Math.min(...valid) - 2;
  const max = Math.max(...valid) + 2;
  const range = max - min || 1;
  const stepX = (W - P * 2) / (scores.length - 1);

  const points = scores
    .map((s, i) => {
      if (s == null) return null;
      const x = P + i * stepX;
      const y = H - P - ((s - min) / range) * (H - P * 2);
      return { x, y };
    })
    .filter((p): p is { x: number; y: number } => p != null);

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div style={{ textAlign: 'right' }}>
      <div className="label-tiny" style={{ marginBottom: 4 }}>
        Your trend
      </div>
      <svg width={W} height={H} style={{ display: 'block' }}>
        <polyline
          points={linePoints}
          stroke="var(--accent)"
          strokeWidth="1.5"
          fill="none"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--accent)" />
        ))}
      </svg>
    </div>
  );
}
