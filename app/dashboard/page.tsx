import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Users,
} from 'lucide-react';
import { StudentTopBar } from '@/components/StudentTopBar';
import { DeliverableStatusPill } from '@/components/ui/DeliverableStatusPill';
import { Avatar } from '@/components/ui/Avatar';
import { ScoreSparkline } from '@/components/student/ScoreSparkline';
import { LeaveTeamButton } from '@/components/student/LeaveTeamButton';
import { getCurrentStudent } from '@/lib/supabase/queries';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { computeScore } from '@/lib/scoring';
import type {
  DeliverableRow,
  RatingRow,
  StudentRow,
  TeamGradeRow,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function StudentDashboard() {
  const student = await getCurrentStudent();

  const admin = getSupabaseAdmin();
  const [
    { data: teammates },
    { data: deliverables },
    { data: teamGrades },
  ] = await Promise.all([
    admin
      .from('students')
      .select('*')
      .eq('team_number', student.team_number)
      .order('name'),
    admin.from('deliverables').select('*').order('number'),
    admin
      .from('team_grades')
      .select('*')
      .eq('team_number', student.team_number),
  ]);

  const memberList = (teammates ?? []) as StudentRow[];
  const dels = (deliverables ?? []) as DeliverableRow[];
  const grades = (teamGrades ?? []) as TeamGradeRow[];

  // Pull ratings written by anyone on my team (covers both my submissions and ratings about me)
  const teammateEmails = memberList.map((m) => m.email);
  const { data: ratings } =
    teammateEmails.length > 0
      ? await admin
          .from('ratings')
          .select('*')
          .in('rater_email', teammateEmails)
      : { data: [] as RatingRow[] };
  const ratingList = (ratings ?? []) as RatingRow[];

  const gradeFor = (deliverableId: number) =>
    grades.find((g) => g.deliverable_id === deliverableId)?.grade ?? null;

  const activeDel = dels.find((d) => d.status === 'open') ?? null;
  const aloneInTeam = memberList.length <= 1;

  // Submission progress for active deliverable
  const activeRaters = activeDel
    ? new Set(
        ratingList
          .filter((r) => r.deliverable_id === activeDel.id && r.submitted)
          .map((r) => r.rater_email),
      )
    : new Set<string>();
  const myActiveSubmissions = activeDel
    ? ratingList.filter(
        (r) =>
          r.rater_email === student.email &&
          r.deliverable_id === activeDel.id &&
          r.submitted,
      ).length
    : 0;
  const teamSize = memberList.length;
  const haveSubmittedActive =
    activeDel && teamSize > 0 ? myActiveSubmissions === teamSize : false;
  const activeTeamSubmitted = activeRaters.size;

  // Per-deliverable score for me
  const scorePerDeliverable = dels.map((d) => {
    const received = ratingList.filter(
      (r) => r.ratee_email === student.email && r.deliverable_id === d.id && r.submitted,
    );
    return computeScore(received, gradeFor(d.id));
  });

  const firstName = student.name.split(' ')[0] || student.name;

  return (
    <>
      <StudentTopBar student={student} />

      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '48px 32px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="flex items-baseline justify-between mb-2">
          <h1 className="serif" style={{ fontSize: 44, lineHeight: 1.1 }}>
            Welcome back, <em>{firstName}</em>.
          </h1>
          <span className="label-tiny">
            Spring 2026 · Team {student.team_number}
          </span>
        </div>
        <p style={{ color: 'var(--ink-2)', marginBottom: 32, fontSize: 15 }}>
          {aloneInTeam ? (
            <>
              You&apos;re the first member of{' '}
              <strong>Team {student.team_number}</strong>. You&apos;ll be able to rate
              teammates once they register and join.
            </>
          ) : activeDel && !haveSubmittedActive ? (
            <>
              You have{' '}
              <strong style={{ color: 'var(--accent)' }}>
                one active assessment
              </strong>{' '}
              awaiting your ratings.
            </>
          ) : (
            <>No pending assessments. Check back when the next deliverable opens.</>
          )}
        </p>

        {activeDel && !aloneInTeam && (
          <div
            className="tmcpa-card tmcpa-card-accent"
            style={{ padding: 32, marginBottom: 32 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="label-tiny mb-1">Active Deliverable</div>
                <h2 className="serif" style={{ fontSize: 28, lineHeight: 1.2 }}>
                  #{activeDel.number} — {activeDel.name}
                </h2>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6 }}>
                  <Clock
                    size={12}
                    style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }}
                  />
                  Ratings close <strong>{formatDate(activeDel.deadline)}</strong>
                </div>
              </div>
              {haveSubmittedActive ? (
                <span className="tmcpa-pill tmcpa-pill-good">
                  <CheckCircle2 size={12} /> Submitted
                </span>
              ) : (
                <span className="tmcpa-pill tmcpa-pill-accent">
                  Action Required
                </span>
              )}
            </div>
            <div
              className="flex items-center"
              style={{
                marginTop: 24,
                paddingTop: 24,
                borderTop: '1px solid var(--line)',
                gap: 24,
              }}
            >
              <div style={{ flex: 1 }}>
                <div className="label-tiny mb-1">Your Progress</div>
                <div
                  style={{ fontSize: 18, fontWeight: 600 }}
                  className="mono tnum"
                >
                  {myActiveSubmissions} / {teamSize}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  teammates rated
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="label-tiny mb-1">Team Submission</div>
                <div
                  style={{ fontSize: 18, fontWeight: 600 }}
                  className="mono tnum"
                >
                  {activeTeamSubmitted} / {teamSize}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  members have submitted
                </div>
              </div>
              <div>
                {haveSubmittedActive ? (
                  <button className="tmcpa-btn" disabled>
                    Ratings Submitted
                  </button>
                ) : (
                  <Link
                    href={`/rate/${activeDel.id}`}
                    className="tmcpa-btn"
                    style={{ textDecoration: 'none' }}
                  >
                    {myActiveSubmissions > 0 ? 'Continue Rating' : 'Begin Ratings'}{' '}
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: 24,
          }}
        >
          {/* Timeline */}
          <div className="tmcpa-card" style={{ padding: 0 }}>
            <div
              style={{
                padding: '20px 28px',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="serif" style={{ fontSize: 24 }}>
                    Semester Timeline
                  </h3>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-3)',
                      marginTop: 2,
                    }}
                  >
                    Your individual scores accumulate across all {dels.length}{' '}
                    deliverable{dels.length === 1 ? '' : 's'}.
                  </p>
                </div>
                <ScoreSparkline
                  scores={scorePerDeliverable.map((s) =>
                    s && !('pending' in s) ? s.individualScore : null,
                  )}
                />
              </div>
            </div>
            {dels.length === 0 ? (
              <div
                style={{
                  padding: '32px 28px',
                  fontSize: 13,
                  color: 'var(--ink-3)',
                  textAlign: 'center',
                }}
              >
                No deliverables yet. Check back once your instructor adds them.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {dels.map((d, i) => {
                  const score = scorePerDeliverable[i];
                  const finalScore =
                    score && !('pending' in score) ? score.individualScore : null;
                  return (
                    <div
                      key={d.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '48px 1fr 120px 100px 32px',
                        padding: '18px 28px',
                        alignItems: 'center',
                        gap: 16,
                        borderBottom:
                          i < dels.length - 1 ? '1px solid var(--line)' : 'none',
                        background:
                          d.status === 'open'
                            ? 'rgba(140,45,45,0.03)'
                            : 'transparent',
                      }}
                    >
                      <div
                        className="serif tnum"
                        style={{ fontSize: 22, color: 'var(--ink-3)' }}
                      >
                        {String(d.number).padStart(2, '0')}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>
                          {d.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                          <Calendar
                            size={10}
                            style={{
                              display: 'inline',
                              verticalAlign: -1,
                              marginRight: 4,
                            }}
                          />
                          {formatDate(d.deadline)}
                        </div>
                      </div>
                      <div>
                        <DeliverableStatusPill
                          status={d.status}
                          hasScore={!!finalScore}
                          pendingGrade={
                            score != null && 'pending' in score
                          }
                        />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {finalScore != null ? (
                          <>
                            <div
                              className="mono tnum"
                              style={{
                                fontSize: 20,
                                fontWeight: 600,
                                color: 'var(--accent)',
                              }}
                            >
                              {finalScore.toFixed(1)}
                            </div>
                            <div className="label-tiny">Final</div>
                          </>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                            —
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {finalScore != null && (
                          <Link
                            href={`/results/${d.id}`}
                            className="tmcpa-btn tmcpa-btn-ghost"
                            style={{
                              padding: '6px 8px',
                              textDecoration: 'none',
                            }}
                            title="View results"
                          >
                            <Eye size={14} />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team panel */}
          <div className="tmcpa-card">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} style={{ color: 'var(--ink-3)' }} />
              <h3 className="serif" style={{ fontSize: 22 }}>
                Team {student.team_number}
              </h3>
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--ink-3)',
                marginBottom: 16,
              }}
            >
              {memberList.length}{' '}
              {memberList.length === 1 ? 'member' : 'members'}
              {activeDel &&
                !aloneInTeam &&
                ` · Deliverable ${activeDel.number} submission status`}
            </p>
            {memberList.length === 0 ? (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--ink-3)',
                  fontStyle: 'italic',
                }}
              >
                No teammates yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {memberList.map((m) => {
                  const isMe = m.email === student.email;
                  const submitted = activeDel
                    ? activeRaters.has(m.email)
                    : false;
                  return (
                    <div
                      key={m.email}
                      className="flex items-center justify-between"
                      style={{
                        padding: '8px 0',
                        borderBottom: '1px dashed var(--line)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={m.name} size={28} active={isMe} />
                        <div style={{ fontSize: 13 }}>
                          {m.name}{' '}
                          {isMe && (
                            <span
                              style={{ color: 'var(--ink-3)', fontSize: 11 }}
                            >
                              (you)
                            </span>
                          )}
                        </div>
                      </div>
                      {activeDel &&
                        !aloneInTeam &&
                        (submitted ? (
                          <CheckCircle2
                            size={14}
                            style={{ color: 'var(--good)' }}
                          />
                        ) : (
                          <Circle size={14} style={{ color: 'var(--ink-3)' }} />
                        ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <LeaveTeamButton teamNumber={student.team_number} />
      </div>
    </>
  );
}
