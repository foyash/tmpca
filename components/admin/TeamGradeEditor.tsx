'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Save } from 'lucide-react';

type Props = {
  deliverableId: number;
  teamNumber: number;
  initialGrade: number | null;
};

export function TeamGradeEditor({
  deliverableId,
  teamNumber,
  initialGrade,
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState<string>(
    initialGrade != null ? String(initialGrade) : '',
  );
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const originalString = initialGrade != null ? String(initialGrade) : '';
  const dirty = value !== originalString;

  const handleSave = async () => {
    setError('');
    const parsedGrade = value === '' ? null : Number(value);
    if (
      parsedGrade != null &&
      (Number.isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > 100)
    ) {
      setError('Grade must be 0–100.');
      return;
    }
    const res = await fetch('/api/team-grades', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deliverable_id: deliverableId,
        team_number: teamNumber,
        grade: parsedGrade,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Failed to save.');
      return;
    }
    startTransition(() => router.refresh());
  };

  return (
    <div
      className="tmcpa-card"
      style={{ marginBottom: 24, padding: 20, background: 'var(--paper-2)' }}
    >
      <div className="flex items-center gap-4">
        <Edit2 size={16} style={{ color: 'var(--ink-3)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            Team grade for this deliverable
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            Individual scores are computed as Team Grade ± adjustment from peer ratings.
          </p>
          {error && (
            <p style={{ fontSize: 12, color: 'var(--bad)', marginTop: 4 }}>
              {error}
            </p>
          )}
        </div>
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="—"
          className="tmcpa-input"
          style={{ width: 100, fontWeight: 600 }}
        />
        <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>/ 100</span>
        <button
          type="button"
          onClick={handleSave}
          className="tmcpa-btn"
          disabled={!dirty || isPending}
        >
          <Save size={14} /> {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
