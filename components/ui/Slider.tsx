'use client';

import type { MouseEvent } from 'react';

type SliderProps = {
  value: number;
  onChange: (v: number) => void;
  label: string;
};

export function Slider({ value, onChange, label }: SliderProps) {
  const pct = (value / 5) * 100;
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    onChange(Math.round(ratio * 50) / 10);
  };
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="label-tiny">{label}</span>
        <span
          className="mono tnum"
          style={{ fontSize: 22, fontWeight: 600, color: 'var(--accent)' }}
        >
          {value.toFixed(1)}
        </span>
      </div>
      <div className="slider-track" onClick={handleClick}>
        <div className="slider-track-fill" style={{ width: `${pct}%` }} />
        <div className="slider-thumb" style={{ left: `${pct}%` }} />
      </div>
      <div
        className="flex justify-between mt-1.5"
        style={{ fontSize: 10, color: 'var(--ink-3)' }}
      >
        <span>0</span>
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
      </div>
    </div>
  );
}
