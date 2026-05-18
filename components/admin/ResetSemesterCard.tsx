'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RotateCcw } from 'lucide-react';

export function ResetSemesterCard() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [warning, setWarning] = useState('');

  const close = () => {
    setShowModal(false);
    setText('');
    setError('');
  };

  const handleConfirm = async () => {
    setError('');
    setWarning('');
    const res = await fetch('/api/admin/reset', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || 'Reset failed.');
      return;
    }
    if (data.warning) setWarning(data.warning);
    close();
    startTransition(() => router.refresh());
  };

  return (
    <>
      <div
        className="tmcpa-card"
        style={{
          border: '1px dashed var(--bad)',
          background: 'rgba(140,45,45,0.02)',
        }}
      >
        <h3
          className="serif"
          style={{ fontSize: 24, color: 'var(--bad)', marginBottom: 6 }}
        >
          End of Semester
        </h3>
        <p
          style={{
            fontSize: 13,
            color: 'var(--ink-2)',
            marginBottom: 16,
            maxWidth: 720,
          }}
        >
          Reset the system to start fresh next semester. This deletes{' '}
          <strong>
            all student accounts, all teams, all ratings, and all team grades
          </strong>
          . Deliverable definitions are kept (so the course structure stays). Your
          instructor account is preserved.
        </p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="tmcpa-btn tmcpa-btn-danger"
        >
          <RotateCcw size={14} /> Reset semester
        </button>
        {warning && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--warn)',
              marginTop: 12,
              maxWidth: 720,
            }}
          >
            <AlertCircle
              size={12}
              style={{
                display: 'inline',
                marginRight: 6,
                verticalAlign: -1,
              }}
            />
            {warning}
          </p>
        )}
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            className="tmcpa-card"
            style={{ maxWidth: 460, width: '90%', padding: 32 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: 'rgba(140,45,45,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle size={20} style={{ color: 'var(--bad)' }} />
              </div>
              <h3 className="serif" style={{ fontSize: 26 }}>
                Reset semester?
              </h3>
            </div>
            <p
              style={{
                fontSize: 14,
                color: 'var(--ink-2)',
                marginBottom: 14,
              }}
            >
              This will permanently delete all student accounts, teams, ratings,
              and team grades. Deliverable definitions and your instructor account
              will be kept. <strong>This cannot be undone.</strong>
            </p>
            <p
              style={{
                fontSize: 12,
                color: 'var(--ink-3)',
                marginBottom: 6,
              }}
            >
              Type{' '}
              <span className="mono" style={{ color: 'var(--bad)' }}>
                RESET
              </span>{' '}
              to confirm:
            </p>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && text === 'RESET' && !isPending) {
                  handleConfirm();
                }
              }}
              className="tmcpa-input"
              placeholder="RESET"
              autoFocus
              disabled={isPending}
            />
            {error && (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--bad)',
                  marginTop: 8,
                }}
              >
                {error}
              </p>
            )}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={close}
                disabled={isPending}
                className="tmcpa-btn tmcpa-btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={text !== 'RESET' || isPending}
                className="tmcpa-btn tmcpa-btn-danger"
                style={{
                  background:
                    text === 'RESET' ? 'var(--bad)' : 'transparent',
                  color: text === 'RESET' ? 'var(--paper)' : 'var(--bad)',
                }}
              >
                <RotateCcw size={14} />{' '}
                {isPending ? 'Resetting…' : 'Confirm reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
