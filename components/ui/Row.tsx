type RowProps = {
  label: string;
  value: string | number;
  bold?: boolean;
  accent?: boolean;
  color?: string;
};

export function Row({ label, value, bold, accent, color }: RowProps) {
  return (
    <div className="flex items-baseline justify-between">
      <span
        style={{
          fontSize: 12,
          color: 'var(--ink-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <span
        className="mono tnum"
        style={{
          fontSize: bold ? 18 : 14,
          fontWeight: bold ? 600 : 500,
          color: color || (accent ? 'var(--accent)' : 'var(--ink)'),
        }}
      >
        {value}
      </span>
    </div>
  );
}
