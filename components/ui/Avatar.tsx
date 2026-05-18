type AvatarProps = {
  name: string;
  size?: number;
  active?: boolean;
};

export function Avatar({ name, size = 32, active = false }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: active ? 'var(--accent)' : 'var(--paper-3)',
        color: active ? 'var(--paper)' : 'var(--ink-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
