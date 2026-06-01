import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Users,
} from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { Avatar } from '@/components/ui/Avatar';
import { computeScore, computeAverages } from '@/lib/scoring';
import { TeamGradeEditor } from '@/components/admin/TeamGradeEditor';
import type {
  DeliverableRow,
  RatingRow,
  StudentRow,
  TeamGradeRow,
  TeamRow,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ teamNumber: string }>;
  searchParams: Promise<{ deliverable?: string }>;
};

export default async function AdminTeamDetail({ params, searchParams }: Props) {
  const { teamNumber: rawNum } = await params;
  const { deliverable: deliverableParam } = await searchParams;
  const teamNumber = Number(rawNum);
  if (!Number.isInteger(teamNumber) || teamNumber < 1 || teamNumber > 99) {
    notFound();
  }

  const supabase = getSupabaseAdmin();
  const [
    { data: team },
    { data: deliverables },
    { data: members },
  ] = await Promise.all([
    supabase.from('teams').select('*').eq('team_number', teamNumber).maybeSingle(),
    supabase.from('deliverables').select('*').order('number'),
    supabase
      .from('students')
      .select('*')
      .eq('team_number', teamNumber)
      .order('name'),
  ]);

  if (!team) notFound();
  const teamRow = team as TeamRow;
  const dels = (deliverables ?? []) as DeliverableRow[];
  const memberList = (members ?? []) as StudentRow[];

  if (dels.length === 0) {
    return (
      <div style={{ maxWidth: 720, margin: '80px auto', padding: '40px 32px' }}>
        <Link
          href="/admin"
          className="tmcpa-btn tmcpa-btn-ghost"
          style={{ textDecoration: 'none' }}
        >
          <ArrowLeft size={14} /> All teams
        </Link>
        <p style={{ marginTop: 24, color: 'var(--ink-2)' }}>
          No deliverables defined yet. Add one in{' '}
          <Link href="/admin/settings" style={{ color: 'var(--accent)' }}>
            Course Settings
          </Link>
          .
        </p>
      </div>
    );
  }

  const requestedId = Number(deliverableParam);
  const currentDel =
    dels.find((d) => d.id === requestedId) ??
    dels.find((d) => d.status === 'open') ??
    dels[0];

  const [{ data: ratings }, { data: grades }] = await Promise.all([
    supabase
      .from('ratings')
      .select('*')
      .eq('deliverable_id', currentDel.id)
      .in(
        'rater_email',
        memberList.length > 0 ? memberList.map((m) => m.email) : [''],
      ),
    supabase
      .from('team_grades')
      .select('*')
      .eq('deliverable_id', currentDel.id)
      .eq('team_number', teamNumber)
      .maybeSingle(),
  ]);

  const ratingList = (ratings ?? []) as RatingRow[];
  const currentGrade = (grades as TeamGradeRow | null)?.grade ?? null;

  const submittedRaters = new Set(
    ratingList.filter((r) => r.submitted).map((r) => r.rater_email),
  );
  const progress = {
    submitted: submittedRaters.size,
    total: memberList.length,
  };
  const complete = progress.submitted === progress.total && progress.total > 0;

  const studentScore = (email: string) => {
    const received = ratingList.filter(
      (r) => r.ratee_email === email && r.submitted,
    );
    return computeScore(received, currentGrade);
  };
  const studentAverages = (email: string) => {
    const received = ratingList.filter(
      (r) => r.ratee_email === email && r.submitted,
    );
    return computeAverages(received);
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px' }}>
      <Link
        href={`/admin?deliverable=${currentDel.id}`}
        className="tmcpa-btn tmcpa-btn-ghost mb-6"
        style={{ textDecoration: 'none' }}
      >
        <ArrowLeft size={14} /> All teams
      </Link>

      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="label-tiny mb-1">
            Deliverable #{currentDel.number} · {currentDel.name}
          </div>
          <h1 className="serif" style={{ fontSize: 44, lineHeight: 1.1 }}>
            {teamRow.name}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
            <Users
              size={12}
              style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }}
            />
            {memberList.length} {memberList.length === 1 ? 'member' : 'members'} ·{' '}
            {progress.submitted} of {progress.total} submitted
          </p>
        </div>
      </div>

      <TeamGradeEditor
        deliverableId={currentDel.id}
        teamNumber={teamNumber}
        initialGrade={currentGrade}
      />

      {!complete && memberList.length > 0 && (
        <div
          style={{
            padding: 14,
            background: 'rgba(181,113,43,0.08)',
            border: '1px solid var(--warn)',
            borderRadius: 4,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <AlertCircle size={18} style={{ color: 'var(--warn)' }} />
          <div style={{ fontSize: 13 }}>
            <strong>Ratings not yet finalized.</strong> {progress.submitted} of{' '}
            {progress.total} have submitted. Scores below are partial.
          </div>
        </div>
      )}

      {memberList.length === 0 ? (
        <div className="tmcpa-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-3)' }}>
            No members yet — this team exists but no students have registered to it.
          </p>
        </div>
      ) : (
        <>
          {/* Rating matrix */}
          <div
            className="tmcpa-card"
            style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '14px 24px',
                background: 'var(--paper-2)',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <h3 className="serif" style={{ fontSize: 20 }}>
                Who has rated whom
              </h3>
              <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                Each row = a rater. Cell shows their ratings for each teammate.
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: '10px 16px',
                        textAlign: 'left',
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--ink-3)',
                        borderBottom: '1px solid var(--line)',
                      }}
                    >
                      Rater \ Ratee →
                    </th>
                    {memberList.map((m) => (
                      <th
                        key={m.email}
                        style={{
                          padding: '10px 6px',
                          fontSize: 11,
                          color: 'var(--ink-2)',
                          borderBottom: '1px solid var(--line)',
                          fontWeight: 600,
                        }}
                      >
                        {m.name.split(' ')[0]}
                      </th>
                    ))}
                    <th
                      style={{
                        padding: '10px 16px',
                        fontSize: 10,
                        color: 'var(--ink-3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        borderBottom: '1px solid var(--line)',
                      }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {memberList.map((rater) => {
                    const submitted = submittedRaters.has(rater.email);
                    return (
                      <tr key={rater.email}>
                        <td
                          style={{
                            padding: '10px 16px',
                            borderBottom: '1px solid var(--line)',
                            fontWeight: 500,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar name={rater.name} size={22} />
                            {rater.name.split(' ')[0]}
                          </div>
                        </td>
                        {memberList.map((ratee) => {
                          const r = ratingList.find(
                            (x) =>
                              x.rater_email === rater.email &&
                              x.ratee_email === ratee.email,
                          );
                          if (!r) {
                            return (
                              <td
                                key={ratee.email}
                                style={{
                                  padding: '8px 6px',
                                  textAlign: 'center',
                                  borderBottom: '1px solid var(--line)',
                                  color: 'var(--ink-3)',
                                }}
                              >
                                —
                              </td>
                            );
                          }
                          const combined = (r.contribution + r.professionalism) / 2;
                          const color =
                            combined >= 4.5
                              ? 'var(--good)'
                              : combined >= 4.0
                                ? 'var(--ink)'
                                : 'var(--bad)';
                          return (
                            <td
                              key={ratee.email}
                              style={{
                                padding: '8px 6px',
                                textAlign: 'center',
                                borderBottom: '1px solid var(--line)',
                              }}
                            >
                              <span
                                className="mono tnum"
                                style={{ fontSize: 12, fontWeight: 500, color }}
                              >
                                {r.contribution.toFixed(1)}/{r.professionalism.toFixed(1)}
                              </span>
                            </td>
                          );
                        })}
                        <td
                          style={{
                            padding: '8px 16px',
                            borderBottom: '1px solid var(--line)',
                          }}
                        >
                          {submitted ? (
                            <span
                              className="tmcpa-pill tmcpa-pill-good"
                              style={{ fontSize: 10, padding: '2px 8px' }}
                            >
                              <CheckCircle2 size={10} /> Done
                            </span>
                          ) : (
                            <span
                              className="tmcpa-pill tmcpa-pill-warn"
                              style={{ fontSize: 10, padding: '2px 8px' }}
                            >
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Computed scores */}
          <div className="tmcpa-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '14px 24px',
                background: 'var(--paper-2)',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <h3 className="serif" style={{ fontSize: 20 }}>
                Computed individual scores
              </h3>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 0.7fr 0.7fr 0.8fr 0.7fr 0.9fr 0.4fr',
                padding: '12px 24px',
                background: 'var(--paper-2)',
                borderBottom: '1px solid var(--line)',
                gap: 16,
                fontSize: 10,
                color: 'var(--ink-2)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
              }}
            >
              <div>Member</div>
              <div style={{ textAlign: 'right' }}>Cont.</div>
              <div style={{ textAlign: 'right' }}>Prof.</div>
              <div style={{ textAlign: 'right' }}>Combined</div>
              <div style={{ textAlign: 'right' }}>Variation</div>
              <div style={{ textAlign: 'right' }}>Final</div>
              <div></div>
            </div>
            {memberList.map((m) => {
              const score = studentScore(m.email);
              const avgs = studentAverages(m.email);
              const submitted = submittedRaters.has(m.email);
              return (
                <Link
                  key={m.email}
                  href={`/admin/students/${encodeURIComponent(m.email)}?deliverable=${currentDel.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1.4fr 0.7fr 0.7fr 0.8fr 0.7fr 0.9fr 0.4fr',
                    padding: '14px 24px',
                    borderBottom: '1px solid var(--line)',
                    gap: 16,
                    alignItems: 'center',
                    background: 'transparent',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background 0.15s',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} size={28} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                        {submitted ? 'submitted' : 'pending'}
                      </div>
                    </div>
                  </div>
                  {score && !('pending' in score) ? (
                    <>
                      <div
                        className="mono tnum"
                        style={{ textAlign: 'right' }}
                      >
                        {score.avgCont.toFixed(2)}
                      </div>
                      <div
                        className="mono tnum"
                        style={{ textAlign: 'right' }}
                      >
                        {score.avgProf.toFixed(2)}
                      </div>
                      <div
                        className="mono tnum"
                        style={{ textAlign: 'right', fontWeight: 600 }}
                      >
                        {score.combined.toFixed(2)}
                      </div>
                      <div
                        className="mono tnum"
                        style={{
                          textAlign: 'right',
                          color: score.variation >= 0 ? 'var(--good)' : 'var(--bad)',
                        }}
                      >
                        {score.variation >= 0 ? '+' : ''}
                        {score.variation.toFixed(2)}
                      </div>
                      <div
                        className="mono tnum"
                        style={{
                          textAlign: 'right',
                          fontSize: 17,
                          fontWeight: 600,
                          color: 'var(--accent)',
                        }}
                      >
                        {score.individualScore.toFixed(1)}
                      </div>
                    </>
                  ) : avgs ? (
                    <>
                      <div className="mono tnum" style={{ textAlign: 'right' }}>
                        {avgs.avgCont.toFixed(2)}
                      </div>
                      <div className="mono tnum" style={{ textAlign: 'right' }}>
                        {avgs.avgProf.toFixed(2)}
                      </div>
                      <div
                        className="mono tnum"
                        style={{ textAlign: 'right', fontWeight: 600 }}
                      >
                        {avgs.combined.toFixed(2)}
                      </div>
                      <div
                        style={{
                          textAlign: 'right',
                          fontSize: 11,
                          color: 'var(--warn)',
                        }}
                      >
                        Awaiting grade
                      </div>
                      <div
                        style={{
                          textAlign: 'right',
                          fontSize: 11,
                          color: 'var(--warn)',
                        }}
                      >
                        Awaiting grade
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ textAlign: 'right', color: 'var(--ink-3)' }}>—</div>
                      <div style={{ textAlign: 'right', color: 'var(--ink-3)' }}>—</div>
                      <div style={{ textAlign: 'right', color: 'var(--ink-3)' }}>—</div>
                      <div style={{ textAlign: 'right', color: 'var(--ink-3)' }}>—</div>
                      <div
                        style={{
                          textAlign: 'right',
                          color: 'var(--ink-3)',
                          fontSize: 11,
                        }}
                      >
                        No ratings yet
                      </div>
                    </>
                  )}
                  <div style={{ textAlign: 'right' }}>
                    <ChevronRight size={14} style={{ color: 'var(--ink-3)' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
