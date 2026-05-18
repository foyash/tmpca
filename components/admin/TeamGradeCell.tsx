'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  deliverableId: number;
  teamNumber: number;
  initialGrade: number | null;
};

// Compact team-grade input that saves on blur or Enter.
export function TeamGradeCell({ deliverableId, teamNumber, initialGrade }: Props) {
  const router = useRouter();
  const [value, setValue] = useState<string>(
    initialGrade != null ? String(initialGrade) : '',
  );
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();
  const lastSaved = useRef<string>(value);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Re-sync if server state changes (e.g. after router.refresh elsewhere)
    const next = initialGrade != null ? String(initialGrade) : '';
    setValue(next);
    lastSaved.current = next;
  }, [initialGrade]);

  const saveIfChanged = async (raw: string) => {
    if (raw === lastSaved.current) return;
    const grade = raw === '' ? null : Number(raw);
    if (grade != null && (Number.isNaN(grade) || grade < 0 || grade > 100)) {
      setStatus('error');
      setError('0–100');
      return;
    }

    setStatus('saving');
    setError('');
    const res = await fetch('/api/team-grades', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deliverable_id: deliverableId,
        team_number: teamNumber,
        grade,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus('error');
      setError(data?.error || 'Failed');
      return;
    }
    lastSaved.current = raw;
    setStatus('saved');
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setStatus('idle'), 1500);
    startTransition(() => router.refresh());
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        type="number"
        min="0"
        max="100"
        step="0.5"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (status !== 'saving') setStatus('idle');
        }}
        onBlur={(e) => saveIfChanged(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder="—"
        className="tmcpa-input"
        style={{ width: 80, fontWeight: 600 }}
      />
      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>/ 100</span>
      <span
        style={{
          fontSize: 10,
          width: 60,
          color:
            status === 'saved'
              ? 'var(--good)'
              : status === 'error'
                ? 'var(--bad)'
                : 'var(--ink-3)',
        }}
      >
        {status === 'saving'
          ? 'Saving…'
          : status === 'saved'
            ? 'Saved'
            : status === 'error'
              ? error
              : ''}
      </span>
    </div>
  );
}
