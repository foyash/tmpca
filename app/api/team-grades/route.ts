import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getAdminClaimsFromCookies } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const PutSchema = z.object({
  deliverable_id: z.number().int().positive(),
  team_number: z.number().int().min(1).max(99),
  grade: z.number().min(0).max(100).nullable(),
});

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const admin = await getAdminClaimsFromCookies(cookieStore);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input.', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { deliverable_id, team_number, grade } = parsed.data;

  // If grade is null, delete the row; otherwise upsert.
  if (grade === null) {
    const { error } = await supabase
      .from('team_grades')
      .delete()
      .eq('deliverable_id', deliverable_id)
      .eq('team_number', team_number);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from('team_grades')
      .upsert(
        { deliverable_id, team_number, grade, updated_at: new Date().toISOString() },
        { onConflict: 'deliverable_id,team_number' },
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
