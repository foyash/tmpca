# TMCPA — Instructor Handoff

**Course:** Northeastern University · ENM 6210 Engineering Management
**Application:** Team Member Contribution & Professionalism Assessment

This is the day-to-day guide for the instructor (Prof. Anderson). For
architecture and developer setup, see [README.md](./README.md) and the original
[SPEC.md](../SPEC.md).

---

## 1. Getting in

- **URL:** `https://<fill-in>.vercel.app` (replace with the production URL once
  the app is deployed to Vercel).
- **Instructor access code:** `6775`.
- Open the URL → click the **Instructor** tab on the login screen → type the
  code → "Enter Dashboard."

The code is set by the `INSTRUCTOR_CODE` env var in Vercel. To change it: Vercel
project → Settings → Environment Variables → edit `INSTRUCTOR_CODE` → redeploy.

## 2. Day-to-day operations

### Adding deliverables

1. From the top bar, click **Course Settings**.
2. Click **+ Add deliverable** in the top right.
3. A new row appears with auto-numbered name, deadline (2 weeks out), and
   status "Upcoming." Click the pencil icon to edit the name, deadline, and
   status (Upcoming / Open / Finalized).
4. **Status meaning:**
   - **Upcoming** — students see it on the timeline but can't rate.
   - **Open** — the active rating window. Students see the "Begin Ratings" CTA.
   - **Finalized** — ratings are closed; students still see their results.
5. Only one deliverable should be "Open" at a time. The dashboard highlights
   the first one it finds, but the system technically supports multiple.

### Setting team grades

Two ways — pick whichever is faster for you:

- **From a team's detail page:** Overview → click any team card → use the
  "Team grade for this deliverable" input near the top.
- **From settings, bulk per deliverable:** Course Settings → click the
  **Team grades ▾** button on a deliverable row → expand → set each team's
  grade inline. Values save automatically when you click away (or press Enter).

Grades are out of 100. The individual score formula is:

```
adjustment = (combined_average - 4.5) × {10 if combined ≥ 4.5 else 20}
individual_score = team_grade + adjustment
```

So a student rated at the 4.5 baseline gets the unchanged team grade. Above
baseline → bonus (×10). Below baseline → penalty (×20, twice as steep).

### Monitoring submissions

- **Overview** shows per-team submission progress for the selected deliverable
  via the dropdown in the top right.
- Click into a team → "Who has rated whom" matrix shows exactly who's done.
- Click a student row in the matrix → see every rating they received, with
  rater names visible (admin-only view).

### Viewing student results

- Students see their own anonymized results at `/results/<deliverable-id>` once
  (a) all teammates have submitted **and** (b) you've entered the team grade.
- You can see the full breakdown — including rater names alongside each comment
  — by navigating to **Overview → Team → Student** for any student.

## 3. End of semester

When the course wraps and you want to clear out student data for next term:

1. **Course Settings → scroll to "End of Semester."**
2. Click **Reset semester.**
3. In the confirmation modal, type **`RESET`** exactly, then **Confirm reset.**

This deletes **every** student account, team, rating, and team grade —
including the Supabase Auth accounts. **Deliverable definitions are kept** so
the course structure carries over. Your instructor access code is unaffected.

⚠️ **There is no undo.** If you want a backup before resetting, in Supabase →
**Database** → **Backups** you can create a manual snapshot. Or export each
table to CSV via the Table Editor.

## 4. Common situations

### "A student says they can't sign up"

Likely causes:
- **They used a non-Northeastern email.** Only `@northeastern.edu` addresses
  are accepted at registration. Have them re-enter with the right email.
- **An account already exists with that email.** Tell them to use **Sign In**,
  not Register. If they forgot their password, see the next item.

### "A student forgot their password"

Password reset isn't implemented in this build. Options:
- **Quickest:** delete their account and have them re-register. Supabase
  Dashboard → Authentication → Users → find them → delete. Also delete the
  matching row in `students` table (Table Editor). Then they can register
  fresh with the same email. They'll need to manually re-do any ratings.
- **Add it later:** wire up Supabase password-reset emails. See SPEC §2 for
  the Resend integration that's already env-var-wired but not built out.

### "A student joined the wrong team"

Edit their `students.team_number` directly in Supabase → Table Editor →
`students` table. Their dashboard will reflect the new team on next page load.
If they already submitted ratings under the old team, you may want to delete
those rows from the `ratings` table too.

### "I see a rating I want to edit/remove"

You can edit anything in Supabase → Table Editor → `ratings`. The `submitted`
column is what locks a row from the student side; you (as admin) bypass that.

## 5. Where things live

- **Source code:** GitHub repo `<fill-in>` (replace once pushed).
- **Hosting:** Vercel project `<fill-in>` (replace once deployed). Auto-deploys
  from `main` on push.
- **Database & auth:** Supabase project `<fill-in>`. Free tier; no action
  needed unless you exceed limits (very unlikely at ~30 students/semester).
- **Email (optional, unused today):** Resend account. The `RESEND_API_KEY` env
  var slot exists if you ever want submission reminders.

## 6. Getting help

If something breaks:
1. Check Vercel → Deployments → click the latest deploy → "Build Logs" or
   "Function Logs" for clues.
2. Check Supabase → Logs → look for recent errors.
3. If you need to roll back a deploy: Vercel → Deployments → find a known-good
   deploy → "Promote to Production."

For changes to the app itself, contact Ishan (the developer who built it) or
hand the repo to another developer — the codebase is documented in
[SPEC.md](../SPEC.md) and conventional Next.js / Supabase.
