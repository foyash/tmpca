'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export function AddDeliverableButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const handleClick = async () => {
    setError('');
    const res = await fetch('/api/deliverables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Failed to add deliverable.');
      return;
    }
    startTransition(() => router.refresh());
  };

  return (
    <div style={{ textAlign: 'right' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="tmcpa-btn"
      >
        <Plus size={14} /> {isPending ? 'Adding…' : 'Add deliverable'}
      </button>
      {error && (
        <p
          style={{
            fontSize: 11,
            color: 'var(--bad)',
            marginTop: 6,
            maxWidth: 240,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
