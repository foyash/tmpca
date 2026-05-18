import { CheckCircle2 } from 'lucide-react';

export type DeliverableStatus = 'upcoming' | 'open' | 'finalized';

type DeliverableStatusPillProps = {
  status: DeliverableStatus;
  hasScore?: boolean;
  pendingGrade?: boolean;
};

export function DeliverableStatusPill({
  status,
  hasScore,
  pendingGrade,
}: DeliverableStatusPillProps) {
  if (hasScore) {
    return (
      <span className="tmcpa-pill tmcpa-pill-good">
        <CheckCircle2 size={11} /> Finalized
      </span>
    );
  }
  if (pendingGrade) {
    return <span className="tmcpa-pill tmcpa-pill-warn">Awaiting grade</span>;
  }
  if (status === 'open') {
    return <span className="tmcpa-pill tmcpa-pill-accent">Active</span>;
  }
  if (status === 'upcoming') {
    return <span className="tmcpa-pill">Upcoming</span>;
  }
  if (status === 'finalized') {
    return (
      <span className="tmcpa-pill tmcpa-pill-good">
        <CheckCircle2 size={11} /> Finalized
      </span>
    );
  }
  return <span className="tmcpa-pill">{status}</span>;
}
