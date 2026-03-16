import React from "react";
import { motion } from "framer-motion";

const fmt = (n: number) => new Intl.NumberFormat().format(Math.floor(n));

export function CombatBar({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className={color}>{label}</span>
        <span className="text-zinc-300 tabular-nums">
          {fmt(value)}/{fmt(max)}
        </span>
      </div>
      <div className="w-full bg-zinc-700/80 rounded-full h-3 overflow-hidden border border-zinc-600/40">
        <motion.div
          className={`h-full rounded-full progress-shimmer ${
            label === "HP" && color.includes("green")
              ? "bg-gradient-to-r from-green-600 to-green-500 shadow-green-500/40"
              : label === "MP"
              ? "bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-500/40"
              : "bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/40"
          }`}
          style={{ boxShadow: "0 0 6px currentColor" }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
