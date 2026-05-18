# TMCPA

Team Member Contribution & Professionalism Assessment — a peer-rating web app
for Northeastern's EMGT 5220 Engineering Management course.

Students anonymously rate teammates on Contribution and Professionalism for
each course deliverable. The app adjusts each student's grade based on peer
ratings using a formula verified against the original instructor spreadsheet.

For full specification: [SPEC.md](../SPEC.md).
For the instructor's day-to-day guide: [HANDOFF.md](./HANDOFF.md).

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind v4 (utilities) + CSS variables (brand palette)
- **Database & student auth:** Supabase (Postgres + Auth + RLS)
- **Instructor auth:** custom — access code → signed JWT cookie (`jose`)
- **Hosting:** Vercel
- **Icons:** lucide-react
- **Fonts:** Google Fonts (Instrument Serif, Inter Tight, JetBrains Mono)

Free tier on every layer covers a 30-student class indefinitely.

## Local development

### Prerequisites
- Node 20+ (built on Node 24)
- A Supabase project with the schema from `supabase/schema.sql` applied.
- "Confirm email" disabled in Supabase → Authentication → Sign In / Providers
  → Email.

### Setup

```bash
git clone <repo-url>
cd tmcpa
npm install
cp .env.local.example .env.local    # if not present, see "env vars" below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required environment variables

See [SPEC §7](../SPEC.md):

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Legacy anon JWT key
SUPABASE_SERVICE_ROLE_KEY=       # Legacy service_role JWT — server-only
INSTRUCTOR_CODE=6775             # any 4-6 digit access code
JWT_SECRET=                      # 32+ bytes — generate: openssl rand -base64 32
RESEND_API_KEY=                  # optional, unused today
```

### Helpful npm scripts

```bash
npm run dev              # next dev
npm run build            # next build (production)
npm run start            # serve the production build
npm run lint             # eslint
npm run seed:dev         # insert 1 deliverable + 1 team + 2 students for poking
npm run cleanup:auth     # delete auth.users rows without a matching students row
```

## Deploy (one-time)

1. Push this repo to GitHub.
2. Vercel → Add New → Project → import the repo. Framework auto-detects as
   Next.js. Click Deploy.
3. After the first (likely failing) deploy, set the env vars under Project →
   Settings → Environment Variables. Copy the same values from `.env.local`.
4. Re-deploy. The login page should load.
5. Test the full flow: register a student → submit ratings → log in as
   instructor (code `6775`) → set team grade → student sees their score.
6. Update Supabase URL Configuration to your Vercel domain:
   Supabase Dashboard → Authentication → URL Configuration → "Site URL" and
   "Redirect URLs" both set to your `https://<your-app>.vercel.app`.
7. Replace the `<fill-in>` placeholders in [HANDOFF.md](./HANDOFF.md) with the
   real Vercel/Supabase/GitHub URLs and commit.

## Project layout

```
app/
  api/                       # route handlers
    auth/{admin,signin,register,logout}
    ratings                  # GET own, PUT draft, POST submit-all
    deliverables             # GET public, POST/PATCH/DELETE admin
    team-grades              # PUT admin
    teams                    # GET public (member counts for register preview)
    admin/reset              # POST admin (semester wipe)
  admin/                     # instructor pages (proxy-gated)
  dashboard/                 # student dashboard
  rate/[deliverableId]/      # rating flow
  results/[deliverableId]/   # anonymized student results
  login/                     # combined Student + Instructor tabs

components/
  ui/                        # Avatar, Slider, StatCard, Row, FeedbackList, DeliverableStatusPill
  admin/                     # admin-specific components
  rating/                    # the rating flow client component
  student/                   # ScoreSparkline
  AdminTopBar.tsx
  StudentTopBar.tsx
  LogoutButton.tsx

lib/
  supabase/{admin,server,queries}.ts
  auth.ts                    # JWT helpers + constant-time compare + cookie name
  scoring.ts                 # exact scoring formula (SPEC §6)
  types.ts                   # DB row types
  validation.ts              # shared zod schemas

proxy.ts                     # Next 16 middleware-equivalent
supabase/schema.sql          # the DDL to paste into Supabase SQL editor
scripts/                     # one-off dev tooling (seed, cleanup, e2e helpers)
```

## License

MIT.
