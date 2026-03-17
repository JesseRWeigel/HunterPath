import React from "react";

export function BarMini({
  value,
  max,
  color = "bg-emerald-500",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
