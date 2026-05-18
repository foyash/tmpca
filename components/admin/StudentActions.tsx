'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRightLeft, Trash2 } from 'lucide-react';
import type { TeamRow } from '@/lib/types';

type Props = {
  studentEmail: string;
  studentName: string;
  currentTeamNumber: number;
  allTeams: TeamRow[];
};

type Mode = 'idle' | 'transfer' | 'remove';

export function StudentActions({
  studentEmail,
  studentName,
  currentTeamNumber,
  allTeams,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('idle');
  const [targetTeam, setTargetTeam] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const otherTeams = allTeams.filter((t) => t.team_number !== currentTeamNumber);

  const close = () => {
    setMode('idle');
    setTargetTeam('');
    setConfirmText('');
    setError('');
  };

  const handleTransfer = async () => {
    setError('');
    const teamNum = Number(targetTeam);
    if (!Number.isInteger(teamNum) || teamNum < 1 || teamNum > 99) {
      setError('Enter a team number from 1 to 99.');
      return;
    }
    if (teamNum === currentTeamNumber) {
      setError('That is their current team.');
      return;
    }
    const res = await fetch(
      `/api/admin/students?email=${encodeURIComponent(studentEmail)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_number: teamNum }),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error ?? 'Transfer failed.');
      return;
    }
    close();
    startTransition(() => {
      router.replace(
        `/admin/students/${encodeURIComponent(studentEmail)}`,
      );
      router.refresh();
    });
  };

  const handleRemove = async () => {
    setError('');
    if (confirmText !== 'REMOVE') {
      setError('Type REMOVE to confirm.');
      return;
    }
    const res = await fetch(
      `/api/admin/students?email=${encodeURIComponent(studentEmail)}`,
      { method: 'DELETE' },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error ?? 'Remove failed.');
      return;
    }
    close();
    startTransition(() => {
      router.replace(`/admin/teams/${currentTeamNumber}`);
      router.refresh();
    });
  };

  return (
    <>
      <div
        className="tmcpa-card"
        style={{
          padding: 20,
          marginBottom: 24,
          background: 'var(--paper-2)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Roster actions</div>
          <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            Move {studentName.split(' ')[0]} to a different team, or remove them
            from the class entirely.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode('transfer')}
          className="tmcpa-btn tmcpa-btn-outline"
        >
          <ArrowRightLeft size={13} /> Transfer
        </button>
        <button
          type="button"
          onClick={() => setMode('remove')}
          className="tmcpa-btn tmcpa-btn-danger"
        >
          <Trash2 size={13} /> Remove
        </button>
      </div>

      {mode !== 'idle' && (
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
            style={{ maxWidth: 480, width: '90%', padding: 32 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background:
                    mode === 'remove'
                      ? 'rgba(140,45,45,0.12)'
                      : 'rgba(181,113,43,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {mode === 'remove' ? (
                  <AlertCircle size={20} style={{ color: 'var(--bad)' }} />
                ) : (
                  <ArrowRightLeft size={18} style={{ color: 'var(--warn)' }} />
                )}
              </div>
              <h3 className="serif" style={{ fontSize: 24 }}>
                {mode === 'remove'
                  ? `Remove ${studentName}?`
                  : `Transfer ${studentName}?`}
              </h3>
            </div>

            {mode === 'transfer' && (
              <>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--ink-2)',
                    marginBottom: 14,
                  }}
                >
                  Move {studentName} from Team {currentTeamNumber} to another
                  team. <strong>All of their ratings (given and received)</strong>{' '}
                  will be deleted, so they start fresh on the new team. They keep
                  their account.
                </p>
                <label
                  className="label-tiny"
                  style={{ display: 'block', marginBottom: 6 }}
                >
                  New team number (1–99)
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={targetTeam}
                  onChange={(e) => setTargetTeam(e.target.value)}
                  placeholder="e.g. 2"
                  className="tmcpa-input"
                  autoFocus
                />
                {otherTeams.length > 0 && (
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-3)',
                      marginTop: 6,
                    }}
                  >
                    Existing teams:{' '}
                    {otherTeams
                      .map((t) => t.team_number)
                      .sort((a, b) => a - b)
                      .join(', ')}
                    . Enter a new number to create a new team.
                  </p>
                )}
              </>
            )}

            {mode === 'remove' && (
              <>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--ink-2)',
                    marginBottom: 14,
                  }}
                >
                  This permanently deletes {studentName}&apos;s account, all
                  ratings they gave, and all ratings they received. To rejoin
                  later they would have to register again with the same email.{' '}
                  <strong>This cannot be undone.</strong>
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
                    REMOVE
                  </span>{' '}
                  to confirm:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="REMOVE"
                  className="tmcpa-input"
                  autoFocus
                />
              </>
            )}

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
                onClick={mode === 'remove' ? handleRemove : handleTransfer}
                disabled={
                  isPending ||
                  (mode === 'remove' && confirmText !== 'REMOVE') ||
                  (mode === 'transfer' && !targetTeam)
                }
                className={
                  mode === 'remove'
                    ? 'tmcpa-btn tmcpa-btn-danger'
                    : 'tmcpa-btn'
                }
                style={
                  mode === 'remove' && confirmText === 'REMOVE'
                    ? { background: 'var(--bad)', color: 'var(--paper)' }
                    : undefined
                }
              >
                {mode === 'remove'
                  ? isPending
                    ? 'Removing…'
                    : 'Confirm remove'
                  : isPending
                    ? 'Transferring…'
                    : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
