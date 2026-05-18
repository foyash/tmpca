'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, LogOut } from 'lucide-react';

type Props = {
  teamNumber: number;
};

export function LeaveTeamButton({ teamNumber }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const close = () => {
    setShowModal(false);
    setText('');
    setError('');
  };

  const handleConfirm = async () => {
    setError('');
    if (text !== 'LEAVE') {
      setError('Type LEAVE to confirm.');
      return;
    }
    const res = await fetch('/api/auth/leave-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'LEAVE' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error ?? 'Could not leave team.');
      return;
    }
    close();
    startTransition(() => {
      router.replace('/login?left=1');
      router.refresh();
    });
  };

  return (
    <>
      <div
        className="tmcpa-card"
        style={{
          marginTop: 32,
          border: '1px dashed var(--bad)',
          background: 'rgba(140,45,45,0.02)',
          padding: 20,
        }}
      >
        <h3
          className="serif"
          style={{ fontSize: 20, color: 'var(--bad)', marginBottom: 6 }}
        >
          Leave team
        </h3>
        <p
          style={{
            fontSize: 13,
            color: 'var(--ink-2)',
            marginBottom: 12,
            maxWidth: 640,
          }}
        >
          Leaving deletes your account, every rating you gave, and every rating
          you received. The team grade and other teammates&apos; data stay. To
          rejoin you would have to register again. If you joined the wrong team
          by mistake, you can also ask your instructor to transfer you instead.
        </p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="tmcpa-btn tmcpa-btn-danger"
        >
          <LogOut size={14} /> Leave Team {teamNumber}
        </button>
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
                Leave Team {teamNumber}?
              </h3>
            </div>
            <p
              style={{
                fontSize: 14,
                color: 'var(--ink-2)',
                marginBottom: 14,
              }}
            >
              Your account, all your ratings (given and received), and your score
              history will be deleted. <strong>This cannot be undone.</strong> If
              you want to rejoin, you&apos;ll have to register again.
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
                LEAVE
              </span>{' '}
              to confirm:
            </p>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && text === 'LEAVE' && !isPending) {
                  handleConfirm();
                }
              }}
              className="tmcpa-input"
              placeholder="LEAVE"
              autoFocus
              disabled={isPending}
            />
            {error && (
              <p style={{ fontSize: 12, color: 'var(--bad)', marginTop: 8 }}>
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
                disabled={text !== 'LEAVE' || isPending}
                className="tmcpa-btn tmcpa-btn-danger"
                style={{
                  background: text === 'LEAVE' ? 'var(--bad)' : 'transparent',
                  color: text === 'LEAVE' ? 'var(--paper)' : 'var(--bad)',
                }}
              >
                <LogOut size={14} />{' '}
                {isPending ? 'Leaving…' : 'Confirm leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
