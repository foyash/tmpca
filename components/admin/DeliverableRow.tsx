'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  ChevronDown,
  Edit2,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { DeliverableStatusPill } from '@/components/ui/DeliverableStatusPill';
import { TeamGradeCell } from '@/components/admin/TeamGradeCell';
import type { DeliverableRow as DeliverableRowType, TeamRow } from '@/lib/types';

type Props = {
  deliverable: DeliverableRowType;
  teams: TeamRow[];
  grades: Map<number, number | null>; // team_number → grade
  memberCounts: Map<number, number>; // team_number → member count
  canDelete: boolean;
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DeliverableRow({
  deliverable,
  teams,
  grades,
  memberCounts,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(deliverable.name);
  const [deadline, setDeadline] = useState(deliverable.deadline ?? '');
  const [status, setStatus] = useState(deliverable.status);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSave = async () => {
    setError('');
    const res = await fetch(`/api/deliverables?id=${deliverable.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        deadline: deadline || null,
        status,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Failed to save.');
      return;
    }
    setIsEditing(false);
    startTransition(() => router.refresh());
  };

  const handleCancel = () => {
    setName(deliverable.name);
    setDeadline(deliverable.deadline ?? '');
    setStatus(deliverable.status);
    setIsEditing(false);
    setError('');
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Delete "${deliverable.name}"? Any ratings or team grades tied to it will be deleted too.`,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/deliverables?id=${deliverable.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Failed to delete.');
      return;
    }
    startTransition(() => router.refresh());
  };

  return (
    <div className="tmcpa-card" style={{ padding: 0 }}>
      <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          className="serif tnum"
          style={{ fontSize: 28, color: 'var(--ink-3)', minWidth: 40 }}
        >
          {String(deliverable.number).padStart(2, '0')}
        </div>
        {isEditing ? (
          <>
            <div style={{ flex: 1 }}>
              <label className="label-tiny" style={{ display: 'block', marginBottom: 4 }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="tmcpa-input"
              />
            </div>
            <div style={{ width: 160 }}>
              <label className="label-tiny" style={{ display: 'block', marginBottom: 4 }}>
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="tmcpa-input"
              />
            </div>
            <div style={{ width: 130 }}>
              <label className="label-tiny" style={{ display: 'block', marginBottom: 4 }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as DeliverableRowType['status'])
                }
                className="tmcpa-select"
              >
                <option value="upcoming">Upcoming</option>
                <option value="open">Open</option>
                <option value="finalized">Finalized</option>
              </select>
            </div>
            <div className="flex items-end gap-2" style={{ alignSelf: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCancel}
                className="tmcpa-btn tmcpa-btn-ghost"
                disabled={isPending}
              >
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="tmcpa-btn"
                disabled={isPending}
              >
                <Save size={14} /> {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{deliverable.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                <Calendar
                  size={11}
                  style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }}
                />
                Due {formatDate(deliverable.deadline)}
              </div>
            </div>
            <DeliverableStatusPill status={deliverable.status} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="tmcpa-btn tmcpa-btn-outline"
                disabled={teams.length === 0}
                title={teams.length === 0 ? 'No teams to grade yet' : ''}
              >
                <Edit2 size={13} /> Team grades
                <ChevronDown
                  size={13}
                  style={{
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s',
                  }}
                />
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="tmcpa-btn tmcpa-btn-outline"
                title="Edit deliverable"
              >
                <Edit2 size={13} />
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="tmcpa-btn tmcpa-btn-danger"
                  title="Delete deliverable"
                  disabled={isPending}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {error && (
        <div style={{ padding: '0 20px 12px 80px' }}>
          <p style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</p>
        </div>
      )}

      {expanded && !isEditing && teams.length > 0 && (
        <div
          style={{
            padding: '0 20px 20px 80px',
            borderTop: '1px solid var(--line)',
          }}
        >
          <div className="label-tiny" style={{ paddingTop: 16, marginBottom: 12 }}>
            Team grades for this deliverable
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
            }}
          >
            {teams.map((team) => {
              const count = memberCounts.get(team.team_number) ?? 0;
              return (
                <div
                  key={team.team_number}
                  className="flex items-center gap-3"
                  style={{
                    padding: 12,
                    background: 'var(--paper-2)',
                    borderRadius: 4,
                  }}
                >
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                    {team.name}
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 400 }}>
                      {count} {count === 1 ? 'member' : 'members'}
                    </div>
                  </div>
                  <TeamGradeCell
                    deliverableId={deliverable.id}
                    teamNumber={team.team_number}
                    initialGrade={grades.get(team.team_number) ?? null}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
