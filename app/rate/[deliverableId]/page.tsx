import { notFound, redirect } from 'next/navigation';
import { StudentTopBar } from '@/components/StudentTopBar';
import { RatingFlow } from '@/components/rating/RatingFlow';
import { getCurrentStudent } from '@/lib/supabase/queries';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type {
  DeliverableRow,
  RatingRow,
  StudentRow,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ deliverableId: string }>;
};

export default async function RatePage({ params }: Props) {
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
      .eq('team_number', student.team_number)
      .order('name'),
  ]);

  if (!deliverable) notFound();
  const del = deliverable as DeliverableRow;
  const teamMembers = (members ?? []) as StudentRow[];

  if (del.status !== 'open') {
    redirect('/dashboard');
  }

  const { data: existing } = await admin
    .from('ratings')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .eq('rater_email', student.email);
  const ratings = (existing ?? []) as RatingRow[];

  // If everything is already submitted, send them back to the dashboard.
  if (ratings.length > 0 && ratings.every((r) => r.submitted)) {
    redirect('/dashboard');
  }

  return (
    <>
      <StudentTopBar student={student} />
      <RatingFlow
        deliverable={del}
        teamMembers={teamMembers}
        currentEmail={student.email}
        initialRatings={ratings}
      />
    </>
  );
}
