// One-off: remove auth.users rows for any @northeastern.edu account that does NOT
// have a matching row in public.students (i.e. dangling from a failed register).
// Safe to re-run.

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

const { data: studentRows } = await sb.from('students').select('email');
const studentEmails = new Set((studentRows ?? []).map((s) => s.email));

let page = 1;
const dangling = [];
while (true) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  if (!data.users.length) break;
  for (const u of data.users) {
    if (u.email && !studentEmails.has(u.email)) dangling.push(u);
  }
  if (data.users.length < 100) break;
  page++;
}

console.log(`Found ${dangling.length} dangling auth user(s) to delete.`);
for (const u of dangling) {
  await sb.auth.admin.deleteUser(u.id);
  console.log(`Deleted ${u.email}`);
}
console.log('Done.');
