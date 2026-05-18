import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { StatCard } from '@/components/ui/StatCard';
import { StudentActions } from '@/components/admin/StudentActions';
import { computeScore } from '@/lib/scoring';
import type {
  DeliverableRow,
  RatingRow,
  StudentRow,
  TeamGradeRow,
  TeamRow,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ email: string }>;
  searchParams: Promise<{ deliverable?: string }>;
};

export default async function AdminStudentDetail({ params, searchParams }: Props) {
  const { email: rawEmail } = await params;
  const email = decodeURIComponent(rawEmail);
  const { deliverable: deliverableParam } = await searchParams;

  const supabase = getSupabaseAdmin();
  const [
    { data: student },
    { data: deliverables },
    { data: allTeams },
  ] = await Promise.all([
    supabase.from('students').select('*').eq('email', email).maybeSingle(),
    supabase.from('deliverables').select('*').order('number'),
    supabase.from('teams').select('*').order('team_number'),
  ]);

  if (!student) notFound();
  const studentRow = student as StudentRow;
  const dels = (deliverables ?? []) as DeliverableRow[];

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('team_number', studentRow.team_number)
    .maybeSingle();
  const teamRow = team as TeamRow | null;

  if (dels.length === 0) {
    return (
      <div style={{ maxWidth: 720, margin: '80px auto', padding: '40px 32px' }}>
        <Link
          href={`/admin/teams/${studentRow.team_number}`}
          className="tmcpa-btn tmcpa-btn-ghost"
          style={{ textDecoration: 'none' }}
        >
          <ArrowLeft size={14} /> Back to {teamRow?.name ?? 'team'}
        </Link>
        <p style={{ marginTop: 24, color: 'var(--ink-2)' }}>
          No deliverables defined yet.
        </p>
      </div>
    );
  }

  const requestedId = Number(deliverableParam);
  const currentDel =
    dels.find((d) => d.id === requestedId) ??
    dels.find((d) => d.status === 'open') ??
    dels[0];

  const [{ data: ratings }, { data: grade }] = await Promise.all([
    supabase
      .from('ratings')
      .select('*')
      .eq('deliverable_id', currentDel.id)
      .eq('ratee_email', email)
      .eq('submitted', true),
    supabase
      .from('team_grades')
      .select('*')
      .eq('deliverable_id', currentDel.id)
      .eq('team_number', studentRow.team_number)
      .maybeSingle(),
  ]);

  const ratingList = (ratings ?? []) as RatingRow[];
  const currentGrade = (grade as TeamGradeRow | null)?.grade ?? null;
  const score = computeScore(ratingList, currentGrade);

  const backHref = `/admin/teams/${studentRow.team_number}?deliverable=${currentDel.id}`;

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px' }}>
      <Link
        href={backHref}
        className="tmcpa-btn tmcpa-btn-ghost mb-6"
        style={{ textDecoration: 'none' }}
      >
        <ArrowLeft size={14} /> Back to {teamRow?.name ?? 'team'}
      </Link>

      <StudentActions
        studentEmail={studentRow.email}
        studentName={studentRow.name}
        currentTeamNumber={studentRow.team_number}
        allTeams={(allTeams ?? []) as TeamRow[]}
      />

      <div className="flex items-baseline justify-between mb-6">
        <div>
          <div className="label-tiny mb-1">
            {teamRow?.name ?? `Team ${studentRow.team_number}`} · Deliverable #
            {currentDel.number}
          </div>
          <h1 className="serif" style={{ fontSize: 44, lineHeight: 1.1 }}>
            {studentRow.name}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
            {studentRow.email}
          </p>
        </div>
        {score && !('pending' in score) && (
          <div style={{ textAlign: 'right' }}>
            <div className="label-tiny">Individual Score</div>
            <div
              className="serif"
              style={{ fontSize: 56, lineHeight: 1, color: 'var(--accent)' }}
            >
              <span className="tnum">{score.individualScore.toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>

      {score && !('pending' in score) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <StatCard
            label="Avg Contribution"
            value={score.avgCont.toFixed(2)}
            sub={`from ${score.ratingsReceived} raters`}
          />
          <StatCard
            label="Avg Professionalism"
            value={score.avgProf.toFixed(2)}
            sub={`from ${score.ratingsReceived} raters`}
          />
          <StatCard
            label="Combined"
            value={score.combined.toFixed(2)}
            sub="(Cont + Prof) / 2"
          />
          <StatCard
            label="Adjustment"
            value={`${score.adjustment >= 0 ? '+' : ''}${score.adjustment.toFixed(2)}`}
            sub={`× ${score.multiplier} from baseline 4.5`}
          />
        </div>
      )}

      <div className="tmcpa-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 24px',
            background: 'var(--paper-2)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <h3 className="serif" style={{ fontSize: 20 }}>
            All ratings received
          </h3>
          <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
            Instructor view — rater names visible. Students see only anonymized feedback.
          </p>
        </div>
        {ratingList.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: 'var(--ink-3)',
            }}
          >
            No ratings submitted yet for this student.
          </div>
        )}
        {ratingList.map((r, i) => {
          const isSelf = r.rater_email === email;
          return (
            <div
              key={r.id}
              style={{
                padding: '18px 24px',
                borderBottom: i < ratingList.length - 1 ? '1px solid var(--line)' : 'none',
                display: 'grid',
                gridTemplateColumns: '180px 1fr 1fr',
                gap: 24,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {r.rater_email}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {isSelf ? 'Self-assessment' : 'Peer'}
                </div>
                <div className="flex gap-3 mt-2" style={{ marginTop: 8 }}>
                  <div>
                    <div className="label-tiny">Cont</div>
                    <div
                      className="mono tnum"
                      style={{ fontSize: 18, fontWeight: 600 }}
                    >
                      {r.contribution.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="label-tiny">Prof</div>
                    <div
                      className="mono tnum"
                      style={{ fontSize: 18, fontWeight: 600 }}
                    >
                      {r.professionalism.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="label-tiny mb-1">Contribution notes</div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                  {r.cont_comment || (
                    <em style={{ color: 'var(--ink-3)' }}>No comment</em>
                  )}
                </p>
              </div>
              <div>
                <div className="label-tiny mb-1">Professionalism notes</div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                  {r.prof_comment || (
                    <em style={{ color: 'var(--ink-3)' }}>No comment</em>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
