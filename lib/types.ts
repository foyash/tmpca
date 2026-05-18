// DB row shapes matching the schema in SPEC §4.
// Kept hand-written (vs. generated types) until step 5 needs more surface area.

export type DeliverableStatus = 'upcoming' | 'open' | 'finalized';

export type DeliverableRow = {
  id: number;
  number: number;
  name: string;
  deadline: string | null; // date in 'YYYY-MM-DD'
  status: DeliverableStatus;
  created_at: string;
};

export type TeamRow = {
  team_number: number;
  name: string;
  created_at: string;
};

export type StudentRow = {
  email: string;
  name: string;
  team_number: number;
  auth_user_id: string | null;
  created_at: string;
};

export type TeamGradeRow = {
  deliverable_id: number;
  team_number: number;
  grade: number | null;
  updated_at: string;
};

export type RatingRow = {
  id: number;
  deliverable_id: number;
  rater_email: string;
  ratee_email: string;
  contribution: number;
  professionalism: number;
  cont_comment: string | null;
  prof_comment: string | null;
  submitted: boolean;
  created_at: string;
  updated_at: string;
};
