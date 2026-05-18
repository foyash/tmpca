// Copied verbatim from SPEC §6. DO NOT modify — verified against the original
// Team 1 CSV from the professor. Reproduces every individual score to 2 decimals.

export type Rating = {
  contribution: number; // 0..5
  professionalism: number; // 0..5
};

export type Score = {
  avgCont: number;
  avgProf: number;
  combined: number;
  variation: number; // combined - 4.5
  multiplier: 10 | 20; // asymmetric
  adjustment: number; // variation * multiplier
  teamGrade: number;
  individualScore: number; // teamGrade + adjustment
  ratingsReceived: number;
};

export function computeScore(
  received: Rating[],
  teamGrade: number | null,
):
  | Score
  | { pending: 'team-grade'; ratingsReceived: number }
  | null {
  if (received.length === 0) return null;
  if (teamGrade == null) {
    return { pending: 'team-grade', ratingsReceived: received.length };
  }
  const avgCont = received.reduce((s, r) => s + r.contribution, 0) / received.length;
  const avgProf =
    received.reduce((s, r) => s + r.professionalism, 0) / received.length;
  const combined = (avgCont + avgProf) / 2;
  const variation = combined - 4.5;
  const multiplier: 10 | 20 = combined >= 4.5 ? 10 : 20;
  const adjustment = variation * multiplier;
  return {
    avgCont,
    avgProf,
    combined,
    variation,
    multiplier,
    adjustment,
    teamGrade,
    individualScore: teamGrade + adjustment,
    ratingsReceived: received.length,
  };
}
