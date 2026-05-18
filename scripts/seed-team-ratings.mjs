// Seed submitted ratings from Maya and Jordan (who don't have auth users) so we
// can verify the unlocked /results page. Inserts 3 rows per rater (rates self
// + the other two). Idempotent via upsert on the unique constraint.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const e = l.indexOf('=');
      return [l.slice(0, e).trim(), l.slice(e + 1).trim()];
    }),
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const deliverableId = 1;
const me = 'test.student@northeastern.edu';
const maya = 'maya.patel@northeastern.edu';
const jordan = 'jordan.kim@northeastern.edu';

const rows = [
  // Maya rates all 3
  { rater: maya, ratee: me, c: 4.8, p: 4.6, cComment: 'Strong, consistent contributor across all team tasks.', pComment: 'Always prepared, respectful in discussions.' },
  { rater: maya, ratee: maya, c: 4.5, p: 4.5, cComment: 'Contributed actively to all team tasks.', pComment: 'Came prepared and respected team input.' },
  { rater: maya, ratee: jordan, c: 4.2, p: 4.4, cComment: 'Reliable — met all deadlines.', pComment: 'Open to alternative approaches.' },
  // Jordan rates all 3
  { rater: jordan, ratee: me, c: 4.6, p: 4.7, cComment: 'Took initiative on the most technical portions.', pComment: 'Brought a calming, constructive energy to meetings.' },
  { rater: jordan, ratee: maya, c: 4.4, p: 4.5, cComment: 'Solid work, communicated well throughout.', pComment: 'Professional and easy to work with.' },
  { rater: jordan, ratee: jordan, c: 4.5, p: 4.5, cComment: 'Contributed actively to all team tasks.', pComment: 'Came prepared and respected team input.' },
];

const payload = rows.map((r) => ({
  deliverable_id: deliverableId,
  rater_email: r.rater,
  ratee_email: r.ratee,
  contribution: r.c,
  professionalism: r.p,
  cont_comment: r.cComment,
  prof_comment: r.pComment,
  submitted: true,
  updated_at: new Date().toISOString(),
}));

const { error } = await sb.from('ratings').upsert(payload, {
  onConflict: 'deliverable_id,rater_email,ratee_email',
});
if (error) {
  console.error(error);
  process.exit(1);
}
console.log(`Upserted ${rows.length} rating rows.`);
