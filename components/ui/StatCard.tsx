type StatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
};

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="tmcpa-card" style={{ padding: 20 }}>
      <div className="label-tiny mb-2">{label}</div>
      <div className="serif" style={{ fontSize: 32, lineHeight: 1 }}>
        <span className="tnum">{value}</span>
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
