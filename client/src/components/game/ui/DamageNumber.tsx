import React from "react";
import { motion } from "framer-motion";

const fmt = (n: number) => new Intl.NumberFormat().format(Math.floor(n));

export function DamageNumber({
  amount,
  type,
  id,
}: {
  amount: number;
  type: "damage" | "heal" | "critical" | "block";
  id: string;
}) {
  const colorMap = {
    damage: "text-red-400",
    heal: "text-green-400",
    critical: "text-yellow-300 text-lg font-black",
    block: "text-zinc-400",
  };
  const prefix = type === "heal" ? "+" : type === "block" ? "" : "-";
  const label = type === "block" ? "BLOCKED" : `${prefix}${fmt(amount)}`;

  return (
    <motion.div
      key={id}
      className={`absolute font-bold pointer-events-none z-20 ${colorMap[type]}`}
      initial={{ opacity: 1, y: 0, scale: type === "critical" ? 1.4 : 1 }}
      animate={{ opacity: 0, y: -40, scale: type === "critical" ? 1.8 : 1.1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      {label}
    </motion.div>
  );
}
