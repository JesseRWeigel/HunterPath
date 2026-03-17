import React from "react";

const fmt = (n: number) => new Intl.NumberFormat().format(Math.floor(n));

export function Bar({
  label,
  value,
  max,
  color = "progress-hp",
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="mt-3">
      <div className="flex justify-between text-sm opacity-90 mb-1">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">
          {fmt(value)} / {fmt(max)} ({pct}%)
        </span>
      </div>
      <div className="w-full h-3 bg-zinc-800/80 rounded-full overflow-hidden border border-zinc-700/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out progress-shimmer ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
