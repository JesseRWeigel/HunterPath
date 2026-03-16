import React from "react";

export function Card({
  children,
  className = "",
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: "purple" | "red" | "green" | "gold";
}) {
  const glowCls = glow
    ? {
        purple: "border-violet-500/40 shadow-violet-500/10",
        red: "border-red-500/40 shadow-red-500/10",
        green: "border-green-500/40 shadow-green-500/10",
        gold: "border-yellow-500/40 shadow-yellow-500/10",
      }[glow]
    : "";
  return (
    <div
      className={`game-card rounded-xl border p-6 ${glowCls} ${className}`}
    >
      {children}
    </div>
  );
}
