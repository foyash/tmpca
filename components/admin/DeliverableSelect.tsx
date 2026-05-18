'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { DeliverableRow } from '@/lib/types';

type Props = {
  deliverables: DeliverableRow[];
  selectedId: number;
};

export function DeliverableSelect({ deliverables, selectedId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('deliverable', e.target.value);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <label className="label-tiny">Viewing</label>
      <select
        value={selectedId}
        onChange={handleChange}
        className="tmcpa-select"
        style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
      >
        {deliverables.map((d) => (
          <option key={d.id} value={d.id}>
            #{d.number} · {d.name} {d.status === 'open' ? '(active)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
