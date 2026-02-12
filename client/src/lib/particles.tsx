import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

// ─── Lightweight Particle System ─────────────────────────────────
// Creates CSS-animated particles for combat impacts, level-ups,
// spirit binding, and item rarity effects. Uses Framer Motion for
// smooth animations and auto-cleanup after each burst's lifetime.

interface Particle {
  id: string;
  color: string;
  size: number;
  angle: number;
  speed: number;
  lifetime: number;
}

type ParticlePreset = "combat-hit" | "critical-hit" | "level-up" | "spirit-bind" | "heal" | "gold";

interface BurstData {
  id: string;
  preset: ParticlePreset;
  x: string;
  y: string;
}

const PRESET_CONFIGS: Record<ParticlePreset, {
  count: number;
  colors: string[];
  sizeRange: [number, number];
  speedRange: [number, number];
  lifetime: number;
}> = {
  "combat-hit": {
    count: 6,
    colors: ["#ef4444", "#f97316", "#fbbf24"],
    sizeRange: [3, 6],
    speedRange: [30, 60],
    lifetime: 600,
  },
  "critical-hit": {
    count: 12,
    colors: ["#fbbf24", "#f59e0b", "#ffffff", "#ef4444"],
    sizeRange: [4, 10],
    speedRange: [40, 80],
    lifetime: 800,
  },
  "level-up": {
    count: 20,
    colors: ["#a78bfa", "#c084fc", "#e879f9", "#fbbf24", "#ffffff"],
    sizeRange: [3, 8],
    speedRange: [50, 100],
    lifetime: 1200,
  },
  "spirit-bind": {
    count: 15,
    colors: ["#8b5cf6", "#a78bfa", "#c084fc", "#6366f1", "#818cf8"],
    sizeRange: [4, 10],
    speedRange: [30, 70],
    lifetime: 1000,
  },
  "heal": {
    count: 8,
    colors: ["#22c55e", "#4ade80", "#86efac", "#ffffff"],
    sizeRange: [3, 7],
    speedRange: [20, 50],
    lifetime: 800,
  },
  "gold": {
    count: 8,
    colors: ["#fbbf24", "#f59e0b", "#fcd34d"],
    sizeRange: [3, 6],
    speedRange: [25, 55],
    lifetime: 700,
  },
};

function createParticles(preset: ParticlePreset): Particle[] {
  const config = PRESET_CONFIGS[preset];
  return Array.from({ length: config.count }, (_, i) => ({
    id: `${preset}-${Date.now()}-${i}`,
    color: config.colors[Math.floor(Math.random() * config.colors.length)],
    size: config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]),
    angle: (Math.PI * 2 * i) / config.count + (Math.random() - 0.5) * 0.5,
    speed: config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0]),
    lifetime: config.lifetime + Math.random() * 200,
  }));
}

/**
 * Single burst of particles. Renders and auto-removes after its lifetime.
 */
function ParticleBurst({
  preset,
  x = "50%",
  y = "50%",
  onComplete,
}: {
  preset: ParticlePreset;
  x?: string;
  y?: string;
  onComplete?: () => void;
}) {
  const [particles] = useState(() => createParticles(preset));
  const config = PRESET_CONFIGS[preset];

  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), config.lifetime + 200);
    return () => clearTimeout(timer);
  }, [config.lifetime, onComplete]);

  return (
    <div
      className="absolute pointer-events-none z-30"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.speed,
            y: Math.sin(p.angle) * p.speed,
            opacity: 0,
            scale: 0.3,
          }}
          transition={{
            duration: p.lifetime / 1000,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Stable top-level component — render this in JSX, pass bursts from useParticles().
 */
export function ParticleLayer({ bursts, onBurstComplete }: {
  bursts: BurstData[];
  onBurstComplete: (id: string) => void;
}) {
  return (
    <>
      {bursts.map((b) => (
        <ParticleBurst
          key={b.id}
          preset={b.preset}
          x={b.x}
          y={b.y}
          onComplete={() => onBurstComplete(b.id)}
        />
      ))}
    </>
  );
}

/**
 * Hook to manage particle bursts. Returns a trigger function and
 * the bursts array + removal callback to pass to <ParticleLayer />.
 */
export function useParticles() {
  const [bursts, setBursts] = useState<BurstData[]>([]);

  const trigger = useCallback((preset: ParticlePreset, x = "50%", y = "50%") => {
    const id = `burst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setBursts((prev) => [...prev.slice(-3), { id, preset, x, y }]);
  }, []);

  const removeBurst = useCallback((id: string) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return { trigger, bursts, removeBurst };
}

export type { ParticlePreset };
