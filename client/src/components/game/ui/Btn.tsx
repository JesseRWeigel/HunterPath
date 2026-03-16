import React from "react";
import { hapticLight } from "@/lib/haptics";

export function Btn({
  children,
  onClick,
  disabled,
  sm,
  theme = "default",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  sm?: boolean;
  theme?: string;
  className?: string;
}) {
  const base =
    "rounded-xl px-4 py-2 font-bold font-display tracking-wide transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 select-none touch-manipulation";
  const size = sm ? "px-3 py-1 text-sm" : "text-sm";
  const themeCls =
    theme === "danger"
      ? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/20"
      : "bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-500 hover:to-purple-400 text-white shadow-lg shadow-violet-500/20";
  return (
    <button
      className={`${base} ${size} ${themeCls} ${className}`}
      onClick={() => {
        hapticLight();
        onClick?.();
      }}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
