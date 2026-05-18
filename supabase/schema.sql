-- TMCPA schema. Paste this into the Supabase SQL Editor and run once.
-- Source: SPEC.md §4. Do not edit unless the spec changes.

-- One-row config table
create table course_config (
  id int primary key default 1,
  semester_label text not null default 'Spring 2026',
  course_code text not null default 'EMGT 5220',
  created_at timestamptz default now(),
  constraint single_row check (id = 1)
);
insert into course_config (id) values (1);

-- Teams (created on first student registration to that team number)
create table teams (
  team_number int primary key check (team_number between 1 and 99),
  name text not null,
  created_at timestamptz default now()
);

-- Students. Mirrors auth.users (Supabase Auth handles password).
create table students (
  email text primary key,
  name text not null,
  team_number int not null references teams(team_number) on delete restrict,
  auth_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
create index on students (team_number);

create table deliverables (
  id serial primary key,
  number int not null unique,
  name text not null,
  deadline date,
  status text not null default 'upcoming' check (status in ('upcoming','open','finalized')),
  created_at timestamptz default now()
);

create table team_grades (
  deliverable_id int references deliverables(id) on delete cascade,
  team_number int references teams(team_number) on delete cascade,
  grade numeric(5,2) check (grade >= 0 and grade <= 100),
  updated_at timestamptz default now(),
  primary key (deliverable_id, team_number)
);

create table ratings (
  id bigserial primary key,
  deliverable_id int not null references deliverables(id) on delete cascade,
  rater_email text not null references students(email) on delete cascade,
  ratee_email text not null references students(email) on delete cascade,
  contribution numeric(3,1) not null check (contribution >= 0 and contribution <= 5),
  professionalism numeric(3,1) not null check (professionalism >= 0 and professionalism <= 5),
  cont_comment text,
  prof_comment text,
  submitted boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (deliverable_id, rater_email, ratee_email)
);
create index on ratings (deliverable_id, ratee_email);
create index on ratings (deliverable_id, rater_email);

-- Row Level Security
alter table students enable row level security;
alter table ratings enable row level security;
alter table teams enable row level security;
alter table team_grades enable row level security;
alter table deliverables enable row level security;

-- Students can read their own row + their teammates' names
create policy "students read own team" on students for select
  using (team_number = (select team_number from students where auth_user_id = auth.uid()));

-- Students can read deliverables (all)
create policy "students read deliverables" on deliverables for select using (true);

-- Students can read team grades (only for their team)
create policy "students read own team grades" on team_grades for select
  using (team_number = (select team_number from students where auth_user_id = auth.uid()));

-- Teams: everyone can read (needed for registration "joining team N" preview)
create policy "anyone read teams" on teams for select using (true);

-- Ratings: students can insert/update their own; read ratings ABOUT them only after entire team has submitted
create policy "students insert own ratings" on ratings for insert
  with check (rater_email = (select email from students where auth_user_id = auth.uid()));
create policy "students update own ratings" on ratings for update
  using (rater_email = (select email from students where auth_user_id = auth.uid()));
create policy "students read ratings about them" on ratings for select
  using (
    ratee_email = (select email from students where auth_user_id = auth.uid())
    AND deliverable_id IN (
      -- only when entire team has submitted
      select d.id from deliverables d where (
        select count(distinct r.rater_email) from ratings r
        where r.deliverable_id = d.id and r.submitted = true
        and r.rater_email in (
          select email from students where team_number = (
            select team_number from students where auth_user_id = auth.uid()
          )
        )
      ) = (
        select count(*) from students where team_number = (
          select team_number from students where auth_user_id = auth.uid()
        )
      )
    )
  );

-- Admin (service role key) bypasses RLS, so admin API routes have full access.
