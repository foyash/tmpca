import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, Lock } from 'lucide-react';
import { StudentTopBar } from '@/components/StudentTopBar';
import { Row } from '@/components/ui/Row';
import { FeedbackList } from '@/components/ui/FeedbackList';
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

type Props = {
  params: Promise<{ deliverableId: string }>;
};

// Fisher–Yates shuffle, fresh per render. Spec §9 calls for randomized comment
// order so students can't link comments to specific raters by position alone.
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function ResultsPage({ params }: Props) {
  const { deliverableId: raw } = await params;
  const deliverableId = Number(raw);
  if (!Number.isInteger(deliverableId) || deliverableId < 1) notFound();

  const student = await getCurrentStudent();
  const admin = getSupabaseAdmin();

  const [{ data: deliverable }, { data: members }] = await Promise.all([
    admin.from('deliverables').select('*').eq('id', deliverableId).maybeSingle(),
    admin
      .from('students')
      .select('*')
      .eq('team_number', student.team_number),
  ]);
  if (!deliverable) notFound();
  const del = deliverable as DeliverableRow;
  const memberList = (members ?? []) as StudentRow[];
  const memberEmails = memberList.map((m) => m.email);

  // Fetch ratings written by my team for this deliverable, plus my team grade.
  const [{ data: teamRatings }, { data: grade }] = await Promise.all([
    memberEmails.length > 0
      ? admin
          .from('ratings')
          .select('*')
          .eq('deliverable_id', del.id)
          .in('rater_email', memberEmails)
      : Promise.resolve({ data: [] as RatingRow[] }),
    admin
      .from('team_grades')
      .select('*')
      .eq('deliverable_id', del.id)
      .eq('team_number', student.team_number)
      .maybeSingle(),
  ]);
  const ratingList = (teamRatings ?? []) as RatingRow[];
  const teamGrade = (grade as TeamGradeRow | null)?.grade ?? null;

  // Submission progress for THIS team.
  const submittedRaters = new Set(
    ratingList.filter((r) => r.submitted).map((r) => r.rater_email),
  );
  const progress = {
    submitted: submittedRaters.size,
    total: memberList.length,
  };
  const allSubmitted = progress.submitted === progress.total && progress.total > 0;

  // My received ratings (all members including me) for score computation.
  const myReceived = ratingList.filter(
    (r) => r.ratee_email === student.email && r.submitted,
  );
  const score = computeScore(myReceived, teamGrade);

  // Locked: not all submitted OR no team grade yet OR no ratings at all.
  if (!allSubmitted || score === null || (score && 'pending' in score)) {
    return (
      <>
        <StudentTopBar student={student} />
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: '80px 32px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Link
            href="/dashboard"
            className="tmcpa-btn tmcpa-btn-ghost mb-6"
            style={{ textDecoration: 'none' }}
          >
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
          <Clock
            size={32}
            style={{ color: 'var(--ink-3)', margin: '24px auto 16px' }}
          />
          <h2 className="serif" style={{ fontSize: 36, lineHeight: 1.1 }}>
            Results unlock soon.
          </h2>
          <p style={{ color: 'var(--ink-2)', marginTop: 12 }}>
            {!allSubmitted
              ? 'Your individual score will appear once all team members have submitted their ratings.'
              : 'Your instructor is still grading the team’s deliverable. Check back soon.'}
          </p>
          <div
            style={{
              marginTop: 24,
              display: 'inline-block',
              padding: '8px 16px',
              background: 'var(--paper-2)',
              borderRadius: 4,
            }}
          >
            <span
              className="mono tnum"
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              {progress.submitted} / {progress.total}
            </span>
            <span
              style={{ fontSize: 12, color: 'var(--ink-3)', marginLeft: 8 }}
            >
              teammates submitted
            </span>
          </div>
        </div>
      </>
    );
  }

  // Unlocked. Comments shown to the student exclude self-rating and are
  // displayed in randomized order without rater identity. Spec §9.
  const peerReceived = myReceived.filter((r) => r.rater_email !== student.email);
  const contComments = shuffled(
    peerReceived.map((r) => r.cont_comment).filter((c): c is string => !!c?.trim()),
  );
  const profComments = shuffled(
    peerReceived.map((r) => r.prof_comment).filter((c): c is string => !!c?.trim()),
  );

  const isPositive = score.adjustment >= 0;

  return (
    <>
      <StudentTopBar student={student} />
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '40px 32px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Link
          href="/dashboard"
          className="tmcpa-btn tmcpa-btn-ghost mb-6"
          style={{ textDecoration: 'none' }}
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="flex items-baseline justify-between mb-2">
          <div>
            <div className="label-tiny">
              Deliverable #{del.number} · Your Results
            </div>
            <h1
              className="serif"
              style={{ fontSize: 44, lineHeight: 1.1, marginTop: 4 }}
            >
              {del.name}
            </h1>
          </div>
          <span className="tmcpa-pill tmcpa-pill-good">
            <CheckCircle2 size={12} /> Finalized
          </span>
        </div>

        <div
          className="tmcpa-card tmcpa-card-accent"
          style={{ padding: 40, marginTop: 24 }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: 32,
              alignItems: 'center',
            }}
          >
            <div>
              <div className="label-tiny mb-2">Your Individual Score</div>
              <div
                className="serif"
                style={{ fontSize: 96, lineHeight: 1, color: 'var(--accent)' }}
              >
                <span className="tnum">{score.individualScore.toFixed(1)}</span>
              </div>
              <div
                style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}
              >
                out of 100 · based on {score.ratingsReceived} peer ratings
              </div>
            </div>
            <div className="tmcpa-divider-vertical" />
            <div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <Row label="Avg Contribution" value={score.avgCont.toFixed(2)} />
                <Row
                  label="Avg Professionalism"
                  value={score.avgProf.toFixed(2)}
                />
                <Row
                  label="Combined Average"
                  value={score.combined.toFixed(2)}
                  bold
                />
                <Row
                  label="Variation from baseline (4.50)"
                  value={`${score.variation >= 0 ? '+' : ''}${score.variation.toFixed(2)}`}
                  color={isPositive ? 'var(--good)' : 'var(--bad)'}
                />
                <Row
                  label={`Adjustment (×${score.multiplier})`}
                  value={`${isPositive ? '+' : ''}${score.adjustment.toFixed(2)}`}
                  color={isPositive ? 'var(--good)' : 'var(--bad)'}
                />
                <div
                  style={{
                    height: 1,
                    background: 'var(--line)',
                    margin: '2px 0',
                  }}
                />
                <Row label="Team Grade" value={`${score.teamGrade}`} />
                <Row
                  label="Individual Score"
                  value={score.individualScore.toFixed(2)}
                  bold
                  accent
                />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
            marginTop: 24,
          }}
        >
          <FeedbackList title="Contribution feedback" comments={contComments} />
          <FeedbackList
            title="Professionalism feedback"
            comments={profComments}
          />
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 14,
            background: 'var(--paper-2)',
            borderRadius: 4,
            fontSize: 12,
            color: 'var(--ink-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Lock size={12} /> Feedback is anonymized. Order randomized. Source raters
          are not displayed alongside comments.
        </div>
      </div>
    </>
  );
}
