// One-off seed for verifying step-5 populated UI. Reads .env.local directly,
// tolerates leading whitespace in values, then inserts a deliverable, a team,
// and two students (auth_user_id = null until step 7 wires real auth).
// Run: node scripts/seed-dev.mjs

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const eq = l.indexOf('=');
      return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()];
    }),
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  // Idempotent-ish: use upserts where unique constraints exist.
  const { error: dErr } = await sb
    .from('deliverables')
    .upsert([
      { number: 1, name: 'Project Charter', deadline: '2026-05-22', status: 'open' },
    ], { onConflict: 'number' });
  if (dErr) throw new Error('deliverables: ' + dErr.message);

  const { error: tErr } = await sb
    .from('teams')
    .upsert([{ team_number: 1, name: 'Team 1' }], { onConflict: 'team_number' });
  if (tErr) throw new Error('teams: ' + tErr.message);

  const { error: sErr } = await sb
    .from('students')
    .upsert(
      [
        { email: 'maya.patel@northeastern.edu', name: 'Maya Patel', team_number: 1, auth_user_id: null },
        { email: 'jordan.kim@northeastern.edu', name: 'Jordan Kim', team_number: 1, auth_user_id: null },
      ],
      { onConflict: 'email' },
    );
  if (sErr) throw new Error('students: ' + sErr.message);

  console.log('Seeded: 1 deliverable, 1 team, 2 students.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
