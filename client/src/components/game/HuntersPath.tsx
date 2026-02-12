import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion, AnimatePresence } from "framer-motion";
import { audioManager } from "@/lib/audioManager";
import type { SoundName, MusicName } from "@/lib/audioManager";
import { hapticLight, hapticMedium, hapticHeavy, hapticSuccess, hapticWarning, hapticRumble } from "@/lib/haptics";
import { useParticles, ParticleLayer } from "@/lib/particles";
import type { ParticlePreset } from "@/lib/particles";

// Hunter's Path — An idle/roguelite RPG built for Canvas preview
// Notes:
// - Mechanics: Gates/Dungeons, Daily Quests with penalties,
//   stat allocation on level-up, fatigue, spirit binding (post-boss), instant dungeons.
// - An original IP idle/roguelite RPG.
//
// Play tips:
// 1) Complete Daily Quest before running a dungeon to avoid penalties.
// 2) Allocate stat points after leveling up (top-right panel).
// 3) Beat a dungeon boss to attempt Spirit Binding — your INT and LUCK matter.
// 4) Fatigue rises with runs; high fatigue reduces damage and raises failure risk.
// 5) Instant Dungeon Keys drop sometimes; use them for a bonus run.

// ---------- Utility ----------
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (n: number) => new Intl.NumberFormat().format(Math.floor(n));

const RANKS = ["E", "D", "C", "B", "A", "S"];

const RANK_COLORS = {
  E: "bg-green-600",
  D: "bg-blue-600",
  C: "bg-purple-600",
  B: "bg-red-600",
  A: "bg-orange-600",
  S: "bg-yellow-600",
};

const STAT_ICONS = {
  STR: "fas fa-fist-raised",
  AGI: "fas fa-running",
  INT: "fas fa-brain",
  VIT: "fas fa-heart",
  LUCK: "fas fa-dice",
};

const STAT_COLORS = {
  STR: "bg-red-600",
  AGI: "bg-green-600",
  INT: "bg-blue-600",
  VIT: "bg-orange-600",
  LUCK: "bg-yellow-600",
};

interface Boss {
  name: string;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
}

interface Gate {
  id: string;
  name: string;
  rank: string;
  rankIdx: number;
  recommended: number;
  power: number;
  boss: Boss;
}

interface Spirit {
  id: string;
  name: string;
  power: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  abilities: SpiritAbility[];
  level: number;
  exp: number;
  expToNext: number;
  type: "warrior" | "mage" | "rogue" | "tank" | "support";
  description: string;
}

interface SpiritAbility {
  id: string;
  name: string;
  description: string;
  type: "passive" | "active";
  effect: string;
  cooldown?: number;
}

interface Item {
  id: string;
  name: string;
  type: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  quality: number; // 1-100, affects effectiveness
  description?: string;
  stats?: {
    STR?: number;
    AGI?: number;
    INT?: number;
    VIT?: number;
    LUCK?: number;
    HP?: number;
    MP?: number;
  };
  equipmentSlot?: "weapon" | "armor" | "accessory" | null;
  sellValue?: number;
}

interface Equipment {
  weapon?: Item;
  armor?: Item;
  accessory?: Item;
}

interface Player {
  level: number;
  exp: number;
  expNext: number;
  hp: number;
  mp: number;
  maxHp: number;
  maxMp: number;
  fatigue: number;
  points: number;
  stats: {
    STR: number;
    AGI: number;
    INT: number;
    VIT: number;
    LUCK: number;
  };
  spirits: Spirit[];
  inv: Item[];
  keys: number;
  equipment: Equipment;
}

interface DailyTask {
  id: string;
  name: string;
  description: string;
  type: "combat" | "exploration" | "collection" | "skill" | "challenge";
  difficulty: "easy" | "medium" | "hard" | "epic";
  need: number;
  have: number;
  expReward: number;
  goldReward: number;
  bonusRewards?: {
    items?: Item[];
    statPoints?: number;
  };
}

interface Daily {
  active: boolean;
  availableQuests: DailyTask[];
  completedQuests: string[]; // IDs of completed quests
  completed: boolean;
  penaltyArmed: boolean;
  completedDate?: string; // Track when it was completed to allow reset
  questReputation: number; // New: tracks quest completion reputation
  lastResetDate?: string; // Track when daily quests were last reset
}

interface GameTime {
  day: number;
  currentDate: string;
  lastReset: string;
}

interface RunningState {
  gate: Gate;
  boss: Boss;
  hpEnemy: number;
  tick: number;
}

interface CombatResult {
  victory: boolean;
  gate: Gate;
  boss: Boss;
  expGained: number;
  goldGained: number;
  drops: Item[];
  spiritBound?: Spirit;
  combatLog: string[];
}

// Simple statistics interfaces for Phase 1
interface PlayerStatistics {
  totalGatesCompleted: number;
  totalGatesFailed: number;
  totalExpGained: number;
  totalGoldGained: number;
  totalSpiritsBound: number;
  highestGateRank: string;
  lastUpdated: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: string;
}

function gatePowerForRank(rankIdx: number) {
  // More balanced scaling - significantly reduced S-rank difficulty spike
  if (rankIdx === 5) {
    // S-rank - much more manageable
    return Math.pow(1.4, rankIdx) * 20 + rankIdx * 10; // Significantly reduced scaling for S-rank
  }
  return Math.pow(1.8, rankIdx) * 30 + rankIdx * 15;
}

function makeGate(rankIdx: number): Gate {
  const id = uid();
  const rank = RANKS[rankIdx];
  const rec = gatePowerForRank(rankIdx);
  const variance = rand(-20, 20);
  const power = Math.max(10, rec + variance);
  return {
    id,
    name: `${rank}-Rank Gate ${id.slice(0, 3).toUpperCase()}`,
    rank,
    rankIdx,
    recommended: rec,
    power,
    boss: makeBoss(rankIdx),
  };
}

function makeBoss(rankIdx: number): Boss {
  const base = gatePowerForRank(rankIdx);
  const rank = RANKS[rankIdx];
  const monsterData = MONSTER_DATA[rank as keyof typeof MONSTER_DATA];

  // Reduce S-rank boss damage significantly
  let atkMultiplier = 0.8;
  if (rankIdx === 5) {
    // S-rank
    atkMultiplier = 0.4; // Much lower attack for S-rank
  }

  return {
    name: monsterData.name,
    maxHp: Math.floor(base * 8 + rand(-25, 25)),
    hp: Math.floor(base * 8 + rand(-25, 25)),
    atk: Math.floor(base * atkMultiplier + rand(-5, 5)),
    def: Math.floor(base * 0.3 + rand(-3, 3)),
  };
}

function spiritName() {
  const names = [
    "Umbra",
    "Noctis",
    "Tenebris",
    "Kage",
    "Silens",
    "Vorago",
    "Ater",
    "Nox",
    "Moria",
    "Caecus",
  ];
  return names[rand(0, names.length - 1)] + "-" + rand(1, 999);
}

// Spirit system data
const SPIRIT_TYPES = ["warrior", "mage", "rogue", "tank", "support"] as const;
const SPIRIT_RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
] as const;

const SPIRIT_ABILITIES: Record<string, SpiritAbility[]> = {
  warrior: [
    {
      id: "berserker_rage",
      name: "Berserker Rage",
      description: "Increases damage by 25% when below 50% HP",
      type: "passive",
      effect: "damage_boost",
    },
    {
      id: "cleave",
      name: "Cleave",
      description: "Attacks all enemies in range",
      type: "active",
      effect: "aoe_attack",
      cooldown: 3,
    },
  ],
  mage: [
    {
      id: "arcane_mastery",
      name: "Arcane Mastery",
      description: "Spells have 15% chance to cast twice",
      type: "passive",
      effect: "double_cast",
    },
    {
      id: "mana_shield",
      name: "Mana Shield",
      description: "Absorbs damage using MP instead of HP",
      type: "active",
      effect: "damage_absorption",
      cooldown: 5,
    },
  ],
  rogue: [
    {
      id: "shadow_step",
      name: "Shadow Step",
      description: "Next attack has 100% critical chance",
      type: "active",
      effect: "guaranteed_crit",
      cooldown: 4,
    },
    {
      id: "poison_blade",
      name: "Poison Blade",
      description: "Attacks poison enemies for 3 turns",
      type: "passive",
      effect: "poison_damage",
    },
  ],
  tank: [
    {
      id: "fortress",
      name: "Fortress",
      description: "Reduces all damage taken by 30%",
      type: "passive",
      effect: "damage_reduction",
    },
    {
      id: "taunt",
      name: "Taunt",
      description: "Forces enemies to attack this spirit",
      type: "active",
      effect: "force_aggro",
      cooldown: 2,
    },
  ],
  support: [
    {
      id: "healing_aura",
      name: "Healing Aura",
      description: "Heals all allies for 10% of max HP each turn",
      type: "passive",
      effect: "heal_aura",
    },
    {
      id: "blessing",
      name: "Blessing",
      description: "Increases all ally stats by 20% for 3 turns",
      type: "active",
      effect: "stat_boost",
      cooldown: 6,
    },
  ],
};

const SPIRIT_DESCRIPTIONS: Record<string, string> = {
  warrior:
    "A fierce combatant specializing in melee damage and aggressive tactics.",
  mage: "A master of arcane arts, wielding powerful spells and magical abilities.",
  rogue:
    "A stealthy assassin with high critical hit chance and poison attacks.",
  tank: "A stalwart defender who protects allies and absorbs enemy attacks.",
  support:
    "A benevolent ally who heals and enhances the capabilities of the team.",
};

function getRarityFromBossRank(bossRankIdx: number): Spirit["rarity"] {
  // Higher rank bosses have better rarity chances
  const rarityRoll = Math.random();

  if (bossRankIdx >= 4) {
    // S-rank and above
    if (rarityRoll < 0.05) return "legendary";
    if (rarityRoll < 0.15) return "epic";
    if (rarityRoll < 0.35) return "rare";
    if (rarityRoll < 0.65) return "uncommon";
    return "common";
  } else if (bossRankIdx >= 2) {
    // C-rank and above
    if (rarityRoll < 0.02) return "epic";
    if (rarityRoll < 0.08) return "rare";
    if (rarityRoll < 0.25) return "uncommon";
    return "common";
  } else {
    // D-rank and below
    if (rarityRoll < 0.01) return "rare";
    if (rarityRoll < 0.1) return "uncommon";
    return "common";
  }
}

function createSpirit(gatePower: number, bossRankIdx: number): Spirit {
  const type = SPIRIT_TYPES[rand(0, SPIRIT_TYPES.length - 1)];
  const rarity = getRarityFromBossRank(bossRankIdx);

  // Base power calculation with rarity multiplier
  const rarityMultipliers = {
    common: 1,
    uncommon: 1.2,
    rare: 1.5,
    epic: 2,
    legendary: 3,
  };
  const basePower = Math.floor(gatePower * 0.8 * rarityMultipliers[rarity]);

  // Get abilities based on type and rarity
  const availableAbilities = SPIRIT_ABILITIES[type];
  const abilityCount =
    rarity === "common"
      ? 1
      : rarity === "uncommon"
      ? 2
      : rarity === "rare"
      ? 2
      : rarity === "epic"
      ? 3
      : 4;
  const abilities = availableAbilities.slice(
    0,
    Math.min(abilityCount, availableAbilities.length)
  );

  return {
    id: uid(),
    name: spiritName(),
    power: basePower,
    rarity,
    abilities,
    level: 1,
    exp: 0,
    expToNext: 100,
    type,
    description: SPIRIT_DESCRIPTIONS[type],
  };
}

function getRarityColor(rarity: Spirit["rarity"]): string {
  const colors = {
    common: "text-gray-400",
    uncommon: "text-green-400",
    rare: "text-blue-400",
    epic: "text-purple-400",
    legendary: "text-yellow-400",
  };
  return colors[rarity];
}

function getRarityBorder(rarity: Spirit["rarity"]): string {
  const borders = {
    common: "border-gray-500",
    uncommon: "border-green-500",
    rare: "border-blue-500",
    epic: "border-purple-500",
    legendary: "border-yellow-500",
  };
  return borders[rarity];
}

function initialPlayer(): Player {
  return {
    level: 1,
    exp: 0,
    expNext: 100,
    hp: 100,
    mp: 50,
    maxHp: 100,
    maxMp: 50,
    fatigue: 0, // 0–100
    points: 5,
    stats: {
      STR: 5,
      AGI: 5,
      INT: 5,
      VIT: 5,
      LUCK: 5,
    },
    spirits: [], // {id, name, power, upkeep}
    inv: [], // {id, name, type}
    keys: 0, // Instant Dungeon Keys
    equipment: {},
  };
}

function playerPower(p: Player) {
  const { STR, AGI, INT, VIT } = p.stats;
  // More balanced power calculation - each stat matters more
  const base = STR * 3 + AGI * 2 + INT * 1.5 + VIT * 0.5;
  const spiritBonus = p.spirits.reduce((a, s) => a + s.power, 0);
  const fatiguePenalty = 1 - Math.min(0.4, p.fatigue / 250); // reduced penalty, up to -40%
  return Math.max(1, (base + spiritBonus) * fatiguePenalty);
}

function spiritUpkeep(p: Player) {
  // MP upkeep per tick when in dungeon
  return Math.floor(
    p.spirits.length * 1 + p.spirits.reduce((a, s) => a + s.power * 0.02, 0)
  );
}

function calcExtractionChance(p: Player, bossRankIdx: number) {
  // Improved extraction chance - more accessible and fun
  const { INT, LUCK } = p.stats;

  // Higher base chance for better gameplay
  const base = 0.25 + INT * 0.008 + LUCK * 0.01; // 25% base + better stat scaling

  // Reduced rank penalty - higher ranks are still harder but not impossible
  const rankPenalty = 0.03 * bossRankIdx; // 3% per rank instead of 5%

  // Higher minimum chance for better player experience
  return clamp(base - rankPenalty, 0.08, 0.85); // 8%–85% instead of 2%–65%
}

function gainExpGoldFromGate(gate: Gate) {
  const base = gate.recommended;
  const exp = Math.floor(base * 1.1 + rand(10, 40));
  const gold = Math.floor(base * 0.8 + rand(5, 25));
  return { exp, gold };
}

function rollDrop(gate: Gate) {
  const getRarity = (
    rankIdx: number
  ): "common" | "uncommon" | "rare" | "epic" | "legendary" => {
    const r = Math.random();
    if (rankIdx >= 4 && r < 0.05) return "legendary";
    if (rankIdx >= 3 && r < 0.15) return "epic";
    if (rankIdx >= 2 && r < 0.35) return "rare";
    if (rankIdx >= 1 && r < 0.65) return "uncommon";
    return "common";
  };

  const getQuality = (rarity: string): number => {
    const baseQuality = {
      common: 30,
      uncommon: 50,
      rare: 70,
      epic: 85,
      legendary: 95,
    };
    const base = baseQuality[rarity as keyof typeof baseQuality] || 50;
    return Math.max(1, Math.min(100, base + rand(-10, 10)));
  };

  const r = Math.random();
  if (r < 0.08) {
    const rarity = getRarity(gate.rankIdx);
    const quality = getQuality(rarity);
    return {
      id: uid(),
      name: "Instant Dungeon Key",
      type: "key",
      rarity,
      quality,
      description: "Opens a special dungeon with enhanced rewards",
      sellValue: Math.floor(quality * 2),
    };
  }
  if (r < 0.28) {
    // Generate specific stat runes
    const statTypes = ["STR", "AGI", "INT", "VIT", "LUCK"];
    const statType = statTypes[rand(0, statTypes.length - 1)];
    const rarity = getRarity(gate.rankIdx);
    const quality = getQuality(rarity);
    const statBonus = Math.floor((quality / 100) * (gate.rankIdx + 1) * 2);

    return {
      id: uid(),
      name: `${gate.rank}-grade ${statType} Rune`,
      type: "rune",
      rarity,
      quality,
      description: `Temporarily boosts ${statType} by ${statBonus}`,
      stats: { [statType]: statBonus },
      sellValue: Math.floor(quality * 1.5),
    };
  }
  if (r < 0.55) {
    const rarity = getRarity(gate.rankIdx);
    const quality = getQuality(rarity);
    const healAmount = Math.floor((quality / 100) * 50 + 25);

    return {
      id: uid(),
      name: `${gate.rank}-grade Potion`,
      type: "potion",
      rarity,
      quality,
      description: `Restores ${healAmount} HP`,
      stats: { HP: healAmount },
      sellValue: Math.floor(quality * 1.2),
    };
  }

  // Equipment drops (rare)
  if (r < 0.65) {
    const rarity = getRarity(gate.rankIdx);
    const quality = getQuality(rarity);
    const equipmentTypes = ["weapon", "armor", "accessory"];
    const equipmentType = equipmentTypes[rand(0, equipmentTypes.length - 1)];
    const statBonus = Math.floor((quality / 100) * (gate.rankIdx + 1) * 3);

    const equipmentNames = {
      weapon: `${gate.rank}-Rank Blade`,
      armor: `${gate.rank}-Rank Armor`,
      accessory: `${gate.rank}-Rank Charm`,
    };

    const statTypes = {
      weapon: "STR",
      armor: "VIT",
      accessory: "LUCK",
    };

    return {
      id: uid(),
      name: equipmentNames[equipmentType as keyof typeof equipmentNames],
      type: "equipment",
      rarity,
      quality,
      description: `Provides ${statBonus} ${
        statTypes[equipmentType as keyof typeof statTypes]
      }`,
      stats: {
        [statTypes[equipmentType as keyof typeof statTypes]]: statBonus,
      },
      equipmentSlot: equipmentType as "weapon" | "armor" | "accessory",
      sellValue: Math.floor(quality * 3),
    };
  }

  return null;
}

function formatGameTime(gameTime: GameTime): string {
  return `Day ${gameTime.day} - ${gameTime.currentDate}`;
}

function getCurrentGameDate(): string {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}/${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function initialGameTime(): GameTime {
  const currentDate = getCurrentGameDate();
  return {
    day: 1,
    currentDate,
    lastReset: currentDate,
  };
}

// ---------- React UI Components ----------
function Card({
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

function Btn({
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

function Bar({
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

function BarMini({
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

// ─── Framer Motion combat components ──────────────────────────

// Animated health bar with spring physics
function CombatBar({
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

// Floating damage/heal numbers
function DamageNumber({
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

function generateGatePool(playerLevel: number): Gate[] {
  const gates: Gate[] = [];

  // Always have multiple E-rank gates available (2-4)
  const eGateCount = rand(2, 4);
  for (let i = 0; i < eGateCount; i++) {
    gates.push(makeGate(0));
  }

  // Add D-rank gates if player level >= 3
  if (playerLevel >= 3) {
    const dGateCount = rand(2, 4);
    for (let i = 0; i < dGateCount; i++) {
      gates.push(makeGate(1));
    }
  }

  // Add C-rank gates if player level >= 6
  if (playerLevel >= 6) {
    const cGateCount = rand(2, 4);
    for (let i = 0; i < cGateCount; i++) {
      gates.push(makeGate(2));
    }
  }

  // Add B-rank gates if player level >= 10
  if (playerLevel >= 10) {
    const bGateCount = rand(2, 4);
    for (let i = 0; i < bGateCount; i++) {
      gates.push(makeGate(3));
    }
  }

  // Add A-rank gates if player level >= 15 (increased count)
  if (playerLevel >= 15) {
    const aGateCount = rand(2, 4); // Increased from 1-2 to 2-4
    for (let i = 0; i < aGateCount; i++) {
      gates.push(makeGate(4));
    }
  }

  // Add S-rank gates if player level >= 18 (lowered from 20)
  if (playerLevel >= 18) {
    const sGateCount = rand(1, 2); // Allow 1-2 S-rank gates
    for (let i = 0; i < sGateCount; i++) {
      gates.push(makeGate(5));
    }
  }

  // For very high levels, add even more high-rank gates
  if (playerLevel >= 25) {
    // Add extra A-rank gates
    const extraAGateCount = rand(1, 2);
    for (let i = 0; i < extraAGateCount; i++) {
      gates.push(makeGate(4));
    }

    // Add extra S-rank gates
    const extraSGateCount = rand(1, 2);
    for (let i = 0; i < extraSGateCount; i++) {
      gates.push(makeGate(5));
    }
  }

  return gates;
}

// Monster data for immersive experience
const MONSTER_DATA = {
  E: {
    name: "Goblin Warrior",
    description:
      "A small but fierce goblin with crude weapons. Though weak individually, they fight with surprising ferocity.",
    icon: "fas fa-user-ninja",
    color: "text-green-400",
    bgColor: "bg-green-900/30",
    borderColor: "border-green-500/30",
    environment:
      "A dimly lit cave with moss-covered walls and scattered bones.",
    sound: "High-pitched screeches echo through the cavern...",
  },
  D: {
    name: "Orc Berserker",
    description:
      "A muscular orc warrior with blood-red eyes. Their rage makes them unpredictable and dangerous.",
    icon: "fas fa-user-shield",
    color: "text-blue-400",
    bgColor: "bg-blue-900/30",
    borderColor: "border-blue-500/30",
    environment: "A torch-lit dungeon with iron bars and the stench of battle.",
    sound: "Deep roars shake the dungeon walls...",
  },
  C: {
    name: "Dark Elf Assassin",
    description:
      "A shadowy figure with deadly precision. Their movements are like liquid darkness.",
    icon: "fas fa-user-secret",
    color: "text-purple-400",
    bgColor: "bg-purple-900/30",
    borderColor: "border-purple-500/30",
    environment:
      "A moonlit forest clearing with twisted trees and mysterious shadows.",
    sound: "Whispers of ancient magic fill the air...",
  },
  B: {
    name: "Troll Chieftain",
    description:
      "A massive troll with stone-like skin. Their club can crush bones with a single swing.",
    icon: "fas fa-user-graduate",
    color: "text-red-400",
    bgColor: "bg-red-900/30",
    borderColor: "border-red-500/30",
    environment: "A rocky mountain pass with jagged peaks and howling winds.",
    sound: "Thunderous footsteps echo across the mountains...",
  },
  A: {
    name: "Dragon Knight",
    description:
      "A legendary warrior clad in dragon-scale armor. Their sword burns with ancient fire.",
    icon: "fas fa-user-crown",
    color: "text-orange-400",
    bgColor: "bg-orange-900/30",
    borderColor: "border-orange-500/30",
    environment: "A grand hall with towering pillars and dragon banners.",
    sound: "The clash of steel and roar of dragons fills the hall...",
  },
  S: {
    name: "Void Lord",
    description:
      "A being of pure darkness and malice. Their very presence corrupts the air around them.",
    icon: "fas fa-user-tie",
    color: "text-yellow-400",
    bgColor: "bg-yellow-900/30",
    borderColor: "border-yellow-500/30",
    environment:
      "A void of absolute darkness where reality itself seems to bend.",
    sound: "The fabric of space itself seems to tear...",
  },
};

export default function HuntersPath() {
  // Particle effects system
  const { trigger: triggerParticles, bursts, removeBurst } = useParticles();

  const [player, setPlayer] = useState<Player>(initialPlayer);
  const [log, setLog] = useState<string[]>([
    "Welcome, Hunter. Complete your Daily Quest, then clear a Gate.",
  ]);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [gates, setGates] = useState<Gate[]>(() => generateGatePool(1));
  const [running, setRunning] = useState<RunningState | null>(null); // { gate, boss, tick, inBoss, hpEnemy }
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
  const [visualEffects, setVisualEffects] = useState<{
    damageFlash: boolean;
    healFlash: boolean;
    criticalHit: boolean;
    screenShake: boolean;
    levelUp: boolean;
    statAllocation: boolean;
  }>({
    damageFlash: false,
    healFlash: false,
    criticalHit: false,
    screenShake: false,
    levelUp: false,
    statAllocation: false,
  });
  // Floating damage numbers for combat
  const [damageNumbers, setDamageNumbers] = useState<
    { id: string; amount: number; type: "damage" | "heal" | "critical" | "block"; side: "player" | "enemy" }[]
  >([]);

  const addDamageNumber = (amount: number, type: "damage" | "heal" | "critical" | "block", side: "player" | "enemy") => {
    const id = uid();
    setDamageNumbers((prev) => [...prev.slice(-5), { id, amount, type, side }]);
    setTimeout(() => setDamageNumbers((prev) => prev.filter((d) => d.id !== id)), 1100);
  };

  const [gold, setGold] = useState(50); // Start with some gold for gate refreshes
  const [gameTime, setGameTime] = useState<GameTime>(initialGameTime);
  const [daily, setDaily] = useState<Daily>(() => {
    // Check if we need to reset daily quests based on real date
    const today = new Date().toDateString();
    const savedDaily = localStorage.getItem("hunters-path-daily");

    if (savedDaily) {
      const parsedDaily = JSON.parse(savedDaily);
      if (parsedDaily.lastResetDate === today) {
        // Same day, restore saved state
        return parsedDaily;
      }
    }

    // New day or no saved data, generate fresh daily quests
    const initialQuests = generateDailyQuests(1, 0);
    const newDaily = {
      active: true, // Auto-start daily quests
      availableQuests: initialQuests,
      completedQuests: [],
      completed: false,
      penaltyArmed: false,
      questReputation: 0,
      lastResetDate: today,
    };

    // Save the new daily state
    localStorage.setItem("hunters-path-daily", JSON.stringify(newDaily));
    return newDaily;
  });

  // Sound management state — delegates to audioManager singleton
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [volume, setVolume] = useState(0.7);

  // Simple statistics state for Phase 1
  const [playerStats, setPlayerStats] = useState<PlayerStatistics>({
    totalGatesCompleted: 0,
    totalGatesFailed: 0,
    totalExpGained: 0,
    totalGoldGained: 0,
    totalSpiritsBound: 0,
    highestGateRank: "E",
    lastUpdated: new Date().toISOString(),
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showStats, setShowStats] = useState(false);

  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const timeRef = useRef<NodeJS.Timeout | null>(null);

  const pPower = useMemo(() => playerPower(player), [player]);

  const inRun = Boolean(running);

  // Spirit binding sequence state
  const [spiritBindingState, setSpiritBindingState] = useState<{
    isActive: boolean;
    phase: "preparing" | "extracting" | "success" | "failure" | null;
    progress: number;
    bossName: string;
    bossRank: string;
  }>({
    isActive: false,
    phase: null,
    progress: 0,
    bossName: "",
    bossRank: "",
  });

  // Level-up celebration state
  const [levelUpState, setLevelUpState] = useState({
    isActive: false,
    newLevel: 0,
    statPointsGained: 0,
    showStatAllocation: false,
  });

  // Stat progression tracking
  const [statHistory, setStatHistory] = useState<
    {
      level: number;
      stats: Player["stats"];
      power: number;
      timestamp: string;
    }[]
  >([]);

  // Global error handler for mobile PWA compatibility
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("Global error caught:", error);
      // Prevent the app from crashing completely
      error.preventDefault();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      // Prevent the app from crashing completely
      event.preventDefault();
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      const gameState = {
        player,
        gates,
        gold,
        gameTime,
        daily,
      };
      localStorage.setItem("hunters-path-autosave", JSON.stringify(gameState));

      // Also save daily state separately for persistence across days
      localStorage.setItem("hunters-path-daily", JSON.stringify(daily));

      // Also save statistics
      const statsData = {
        playerStats,
        achievements,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem("hunters-path-stats", JSON.stringify(statsData));
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [player, gates, gold, gameTime, daily, playerStats, achievements]);

  // Auto-trigger stat allocation after level-up celebration
  useEffect(() => {
    if (levelUpState.isActive && !levelUpState.showStatAllocation) {
      const timer = setTimeout(() => {
        setLevelUpState((prev) => ({ ...prev, showStatAllocation: true }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [levelUpState.isActive, levelUpState.showStatAllocation]);

  // Load statistics on component mount
  useEffect(() => {
    try {
      const savedStats = localStorage.getItem("hunters-path-stats");
      if (savedStats) {
        const stats = JSON.parse(savedStats);
        if (stats.playerStats) {
          setPlayerStats(stats.playerStats);
        }
        if (stats.achievements) {
          setAchievements(stats.achievements);
        }
      }
    } catch (error) {
      console.error("Failed to load statistics:", error);
    }
  }, []);

  // Sync audioManager with React state
  useEffect(() => {
    audioManager.soundEnabled = soundEnabled;
  }, [soundEnabled]);
  useEffect(() => {
    audioManager.musicEnabled = musicEnabled;
  }, [musicEnabled]);
  useEffect(() => {
    audioManager.volume = volume;
  }, [volume]);

  // Load game on startup
  useEffect(() => {
    const saved = localStorage.getItem("hunters-path-autosave");
    if (saved) {
      try {
        const gameState = JSON.parse(saved);

        // Migrate old spirits to new format
        if (gameState.player.spirits) {
          gameState.player.spirits = gameState.player.spirits.map(
            (spirit: any) => {
              // If spirit already has new format, return as is
              if (spirit.rarity && spirit.abilities && spirit.type) {
                return spirit;
              }

              // Migrate old spirit format to new format
              const type = SPIRIT_TYPES[rand(0, SPIRIT_TYPES.length - 1)];
              const rarity = "common"; // Default to common for old spirits
              const availableAbilities = SPIRIT_ABILITIES[type];
              const abilities = availableAbilities.slice(0, 1); // Give 1 ability to old spirits

              return {
                id: spirit.id,
                name: spirit.name,
                power: spirit.power,
                rarity,
                abilities,
                level: 1,
                exp: 0,
                expToNext: 100,
                type,
                description: SPIRIT_DESCRIPTIONS[type],
              };
            }
          );
        }

        setPlayer(gameState.player);
        setGates(
          gameState.gates || generateGatePool(gameState.player?.level || 1)
        );
        setGold(gameState.gold || 50);
        setGameTime(gameState.gameTime || initialGameTime());
        // Load daily state - the daily state initialization will handle the real-time reset logic
        setDaily(
          gameState.daily || {
            active: true,
            availableQuests: generateDailyQuests(
              gameState.player?.level || 1,
              0
            ),
            completedQuests: [],
            completed: false,
            penaltyArmed: false,
            questReputation: 0,
          }
        );
        setLog(["Game loaded from auto-save. Welcome back, Hunter!"]);
      } catch (error) {
        console.error("Failed to load auto-save:", error);
      }
    }
  }, []);

  // Real-time daily quest reset system - check every minute
  useEffect(() => {
    const checkDailyReset = () => {
      const today = new Date().toDateString();

      setDaily((prevDaily) => {
        // If it's a new day and we haven't reset yet
        if (prevDaily.lastResetDate !== today) {
          setLog((l) => [
            `New day begins! Daily quests have been refreshed.`,
            ...l,
          ]);

          const newQuests = generateDailyQuests(
            player.level,
            prevDaily.questReputation
          );

          const newDaily = {
            active: true, // Auto-start daily quests
            availableQuests: newQuests,
            completedQuests: [],
            completed: false,
            penaltyArmed: false,
            questReputation: prevDaily.questReputation, // Preserve reputation
            lastResetDate: today,
          };

          // Save the new daily state
          localStorage.setItem("hunters-path-daily", JSON.stringify(newDaily));
          return newDaily;
        }
        return prevDaily;
      });
    };

    // Check immediately on mount
    checkDailyReset();

    // Then check every minute
    const interval = setInterval(checkDailyReset, 60000); // 1 minute

    return () => {
      clearInterval(interval);
    };
  }, [player.level]);

  // Game time system - advance time every 30 seconds (1 game hour) - simplified without daily reset
  useEffect(() => {
    if (timeRef.current) clearInterval(timeRef.current);
    timeRef.current = setInterval(() => {
      setGameTime((prevTime) => {
        const currentRealDate = getCurrentGameDate();
        const shouldAdvanceDay =
          currentRealDate !== prevTime.currentDate || Math.random() < 0.1; // 10% chance per hour or real day change

        if (shouldAdvanceDay) {
          const newDay = prevTime.day + 1;
          setLog((l) => [`Day ${newDay} begins.`, ...l]);

          // Passive experience gain for surviving another day
          const passiveExp = Math.floor(10 + newDay * 2);
          setPlayer((p) => ({ ...p, exp: p.exp + passiveExp }));
          setLog((l) => [`+${passiveExp} EXP for surviving another day`, ...l]);

          return {
            day: newDay,
            currentDate: currentRealDate,
            lastReset: currentRealDate,
          };
        }
        return prevTime;
      });
    }, 30000); // 30 seconds = 1 game hour

    return () => {
      if (timeRef.current) clearInterval(timeRef.current);
    };
  }, []);

  // Dungeon tick loop
  useEffect(() => {
    if (!inRun) return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setRunning((prev) => {
        if (!prev) return prev;
        let { boss, hpEnemy, tick } = prev;

        // Player attack - increased base damage
        const dmgPlayer = Math.max(
          1,
          Math.floor(pPower * 1.2 - boss.def * 0.3 + rand(0, 6))
        );
        const oldHpEnemy = hpEnemy;
        hpEnemy = clamp(hpEnemy - dmgPlayer, 0, boss.maxHp);

        // Boss attack - slightly reduced boss damage
        const dmgBoss = Math.max(
          0,
          Math.floor(boss.atk * 0.8 - player.stats.VIT * 0.7 + rand(0, 3))
        );
        const oldHp = player.hp;
        const newHp = clamp(player.hp - dmgBoss, 0, player.maxHp);

        // Trigger visual effects, sounds, haptics, particles, and floating damage numbers
        if (dmgPlayer > 0) {
          triggerVisualEffect("screenShake");
          playSound("attack");
          const isCrit = dmgPlayer > pPower * 1.5;
          if (isCrit) {
            triggerVisualEffect("criticalHit");
            playSound("critical");
            hapticHeavy();
            triggerParticles("critical-hit", "75%", "40%");
            addDamageNumber(dmgPlayer, "critical", "enemy");
          } else {
            hapticMedium();
            triggerParticles("combat-hit", "75%", "40%");
            addDamageNumber(dmgPlayer, "damage", "enemy");
          }
        }
        if (dmgBoss > 0) {
          triggerVisualEffect("damageFlash");
          playSound("damage");
          hapticWarning();
          triggerParticles("combat-hit", "25%", "40%");
          addDamageNumber(dmgBoss, "damage", "player");
        } else {
          playSound("block");
          addDamageNumber(0, "block", "player");
        }

        // MP upkeep
        const upkeep = spiritUpkeep(player);
        const newMp = clamp(player.mp - upkeep, 0, player.maxMp);

        // Fatigue gain
        const newFatigue = clamp(player.fatigue + 0.5, 0, 100);

        // Add combat log entries
        setCombatLog((log) => {
          const newEntries = [];

          // Player attack
          if (dmgPlayer > 0) {
            newEntries.push(`Hunter attacks for ${dmgPlayer} damage!`);
          }

          // Boss attack
          if (dmgBoss > 0) {
            newEntries.push(`${boss.name} attacks for ${dmgBoss} damage!`);
          } else {
            newEntries.push(`${boss.name}'s attack is blocked!`);
          }

          // Critical hits
          if (dmgPlayer > pPower * 1.5) {
            newEntries.push("Critical hit! 💥");
          }

          // Keep only last 8 entries
          return [...log, ...newEntries].slice(-8);
        });

        setPlayer((pp) => ({
          ...pp,
          hp: newHp,
          mp: newMp,
          fatigue: newFatigue,
        }));

        if (hpEnemy <= 0) {
          // Victory
          clearInterval(tickRef.current!);
          playSound("victory");
          playMusic("victory_music", false);
          hapticSuccess();

          const { exp, gold: goldGain } = gainExpGoldFromGate(prev.gate);
          const drop = rollDrop(prev.gate);
          const drops = drop ? [drop] : [];

          // Track quest progress
          trackQuestProgress("monster_defeated");
          if (drop) {
            trackQuestProgress("item_gained");
          }
          // Check if player took no damage for challenge quests
          if (player.hp === player.maxHp) {
            trackQuestProgress("gate_completed_no_damage");
          }

          // Show combat result screen first
          setCombatResult({
            victory: true,
            gate: prev.gate,
            boss: boss,
            expGained: exp,
            goldGained: goldGain,
            drops,
            combatLog: [...combatLog, `Victory! ${boss.name} is defeated! 🎉`],
          });

          // Apply rewards
          setGold((g) => g + goldGain);
          setLog((l) => [
            `Cleared ${prev.gate.name}! +${fmt(exp)} EXP, +${fmt(goldGain)}₲`,
            ...l,
          ]);
          handleLevelGain(exp);

          // Apply drops
          if (drop) {
            if (drop.type === "key")
              setPlayer((pp) => ({ ...pp, keys: pp.keys + 1 }));
            else setPlayer((pp) => ({ ...pp, inv: [...pp.inv, drop] }));
            setLog((l) => [`Found: ${drop.name}`, ...l]);
          }

          // Update statistics
          updateStats(true, exp, goldGain, prev.gate.rank);
          checkAchievements();

          // Automatically attempt spirit binding with visual sequence
          const extractionChance = calcExtractionChance(
            player,
            prev.gate.rankIdx
          );
          if (Math.random() < extractionChance) {
            // Start the visual extraction sequence
            startSpiritBindingSequence(
              boss.name,
              prev.gate.rank,
              prev.gate.power
            );
          }

          // Keep the combat UI visible - don't set running to null yet
          // Remove cleared gate and potentially refresh pool
          setGates((gs) => {
            const filtered = gs.filter((g) => g.id !== prev.gate.id);

            // If we have fewer than 3 gates total, generate a new pool
            if (filtered.length < 3) {
              return generateGatePool(player.level);
            }

            return filtered;
          });
          return null;
        }
        if (newHp <= 0) {
          // Defeat
          clearInterval(tickRef.current!);
          playSound("defeat");
          playMusic("defeat_music", false);
          hapticWarning();

          // Show combat result screen
          setCombatResult({
            victory: false,
            gate: prev.gate,
            boss: boss,
            expGained: 0,
            goldGained: -10,
            drops: [],
            combatLog: [...combatLog, `Defeat! Hunter falls in battle... 💀`],
          });

          setLog((l) => [
            `You were defeated in ${prev.gate.name}. Rest and try again.`,
            ...l,
          ]);
          // defeat penalty: lose some gold and gain fatigue
          setGold((g) => Math.max(0, g - 10));
          setPlayer((pp) => ({
            ...pp,
            hp: Math.max(5, Math.floor(pp.maxHp * 0.2)),
          }));

          // Update statistics
          updateStats(false, 0, -10, prev.gate.rank);

          // Keep the combat UI visible - don't set running to null yet
          return null;
        }

        // Continue ticking
        return { ...prev, hpEnemy, tick: tick + 1 };
      });
    }, 2500); // Slowed down from 1500ms to 2500ms for much better visibility
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [inRun, pPower, player.stats.VIT, player.maxHp, player.mp, player.hp]);

  function handleLevelGain(addExp: number) {
    setPlayer((p) => {
      let exp = p.exp + addExp;
      let level = p.level;
      let expNext = p.expNext;
      let points = p.points;
      let maxHp = p.maxHp;
      let maxMp = p.maxMp;
      let leveledUp = false;
      let levelsGained = 0;

      while (exp >= expNext) {
        exp -= expNext;
        level += 1;
        leveledUp = true;
        levelsGained += 1;
        expNext = Math.floor(expNext * 1.35);
        points += 5;
        maxHp += 10;
        maxMp += 5;

        logPush(`Level Up! Welcome to level ${level}. +5 stat points!`);
        playSound("level_up");
        hapticHeavy();
        triggerParticles("level-up", "50%", "50%");
      }

      // If player leveled up, refresh gates to unlock new tiers
      if (leveledUp) {
        // Record stat history before level up
        setStatHistory((prev) => [
          ...prev,
          {
            level: p.level,
            stats: p.stats,
            power: playerPower(p),
            timestamp: new Date().toISOString(),
          },
        ]);

        // Trigger level-up celebration
        setLevelUpState({
          isActive: true,
          newLevel: level,
          statPointsGained: levelsGained * 5,
          showStatAllocation: false,
        });

        // Trigger visual effects
        triggerVisualEffect("levelUp");

        setTimeout(() => {
          setGates(generateGatePool(level));
          logPush(
            `New gates appeared! Higher tier dungeons are now available.`
          );
        }, 1000);
      }

      return {
        ...p,
        exp,
        level,
        expNext,
        points,
        maxHp,
        maxMp,
        hp: Math.max(p.hp, Math.floor(maxHp * 0.6)),
        mp: Math.max(p.mp, Math.floor(maxMp * 0.5)),
      };
    });
  }

  function logPush(msg: string) {
    setLog((l) => [msg, ...l].slice(0, 120));
  }

  // Simple statistics tracking functions
  function updateStats(
    victory: boolean,
    expGained: number,
    goldGained: number,
    gateRank: string
  ) {
    setPlayerStats((stats) => {
      const newStats = { ...stats };

      if (victory) {
        newStats.totalGatesCompleted += 1;
      } else {
        newStats.totalGatesFailed += 1;
      }

      newStats.totalExpGained += expGained;
      newStats.totalGoldGained += goldGained;

      // Update highest gate rank
      const rankOrder = ["E", "D", "C", "B", "A", "S"];
      const currentRankIdx = rankOrder.indexOf(stats.highestGateRank);
      const newRankIdx = rankOrder.indexOf(gateRank);
      if (newRankIdx > currentRankIdx) {
        newStats.highestGateRank = gateRank;
      }

      newStats.lastUpdated = new Date().toISOString();
      return newStats;
    });
  }

  function recordSpiritBinding() {
    setPlayerStats((stats) => ({
      ...stats,
      totalSpiritsBound: stats.totalSpiritsBound + 1,
      lastUpdated: new Date().toISOString(),
    }));
  }

  function checkAchievements() {
    const newAchievements: Achievement[] = [];

    // First victory achievement
    if (
      playerStats.totalGatesCompleted === 1 &&
      achievements &&
      !achievements.some((a) => a.name === "First Blood")
    ) {
      newAchievements.push({
        id: uid(),
        name: "First Blood",
        description: "Win your first gate battle",
        unlockedAt: new Date().toISOString(),
      });
    }

    // Gate master achievement
    if (
      playerStats.totalGatesCompleted === 10 &&
      achievements &&
      !achievements.some((a) => a.name === "Gate Master")
    ) {
      newAchievements.push({
        id: uid(),
        name: "Gate Master",
        description: "Complete 10 gates",
        unlockedAt: new Date().toISOString(),
      });
    }

    // Spirit caller achievement
    if (
      playerStats.totalSpiritsBound === 1 &&
      achievements &&
      !achievements.some((a) => a.name === "Spirit Caller")
    ) {
      newAchievements.push({
        id: uid(),
        name: "Spirit Caller",
        description: "Bind your first spirit",
        unlockedAt: new Date().toISOString(),
      });
    }

    // Add new achievements
    if (newAchievements.length > 0) {
      setAchievements((current) => [...current, ...newAchievements]);

      // Show achievement notifications
      newAchievements.forEach((achievement) => {
        logPush(`🏆 Achievement Unlocked: ${achievement.name}!`);
      });
    }
  }

  // Spirit binding sequence functions
  function startSpiritBindingSequence(
    bossName: string,
    bossRank: string,
    gatePower: number
  ) {
    setSpiritBindingState({
      isActive: true,
      phase: "preparing",
      progress: 0,
      bossName,
      bossRank,
    });

    // Play extraction start sound
    playSound("extraction_start");

    // Phase 1: Preparing (2 seconds)
    setTimeout(() => {
      setSpiritBindingState((prev) => ({
        ...prev,
        phase: "extracting",
        progress: 0,
      }));

      // Play extraction loop sound
      playSound("extraction_loop");

      // Phase 2: Extracting (3 seconds with progress animation)
      const extractionInterval = setInterval(() => {
        setSpiritBindingState((prev) => {
          if (prev.progress >= 100) {
            clearInterval(extractionInterval);
            return prev;
          }
          return { ...prev, progress: prev.progress + 2 };
        });
      }, 60); // Update every 60ms for smooth animation

      // After 3 seconds, determine success/failure
      setTimeout(() => {
        const chance = calcExtractionChance(player, RANKS.indexOf(bossRank));
        const success = Math.random() < chance;

        setSpiritBindingState((prev) => ({
          ...prev,
          phase: success ? "success" : "failure",
          progress: 100,
        }));

        // Play success/failure sound + haptics + particles
        if (success) {
          playSound("extraction_success");
          hapticSuccess();
          triggerParticles("spirit-bind", "50%", "50%");

          // Create the spirit and update player state
          const spiritBound = createSpirit(
            gatePower,
            RANKS.indexOf(bossRank)
          );

          setPlayer((pp) => ({
            ...pp,
            spirits: [...pp.spirits, spiritBound],
          }));

          recordSpiritBinding();
          setLog((l) => [
            `${spiritBound.rarity.toUpperCase()} spirit bound: ${
              spiritBound.name
            }! (${spiritBound.type})`,
            ...l,
          ]);

          // Update combat result with the bound spirit
          setCombatResult((prev) =>
            prev
              ? {
                  ...prev,
                  spiritBound,
                }
              : prev
          );
        } else {
          playSound("extraction_failure");
          hapticWarning();
        }

        // End sequence after 2 seconds
        setTimeout(() => {
          setSpiritBindingState({
            isActive: false,
            phase: null,
            progress: 0,
            bossName: "",
            bossRank: "",
          });
        }, 2000);
      }, 3000);
    }, 2000);
  }

  function getExtractionSequenceText() {
    const { phase, bossName, progress } = spiritBindingState;

    switch (phase) {
      case "preparing":
        return {
          title: "Spirit Binding Initiated",
          subtitle: `Preparing to bind spirit from ${bossName}...`,
          description: "Gathering magical energy and focusing your will...",
        };
      case "extracting":
        return {
          title: "Binding Spirit",
          subtitle: `${progress}% Complete`,
          description: "The spirit essence is being drawn forth...",
        };
      case "success":
        return {
          title: "Extraction Successful!",
          subtitle: `${bossName}'s spirit joins you!`,
          description: "A new spirit ally has been bound to your will.",
        };
      case "failure":
        return {
          title: "Extraction Failed",
          subtitle: "The spirit crumbles to dust...",
          description: "The essence was too weak or your focus wavered.",
        };
      default:
        return { title: "", subtitle: "", description: "" };
    }
  }

  // Quest Progress Tracking Functions
  function trackQuestProgress(action: string, count: number = 1) {
    if (!daily.active || daily.completed) return;

    daily.availableQuests.forEach((quest) => {
      if (daily.completedQuests.includes(quest.id)) return; // Skip already completed quests

      let shouldProgress = false;

      switch (quest.type) {
        case "combat":
          if (action === "monster_defeated") shouldProgress = true;
          break;
        case "exploration":
          if (action === "gate_entered") shouldProgress = true;
          break;
        case "collection":
          if (action === "item_gained") shouldProgress = true;
          break;
        case "skill":
          if (action === "potion_used" || action === "rune_used")
            shouldProgress = true;
          break;
        case "challenge":
          if (action === "gate_completed_no_damage") shouldProgress = true;
          break;
      }

      if (shouldProgress) {
        progressDaily(quest.id);
      }
    });
  }

  function startGate(g: Gate) {
    if (inRun) return;

    // Track gate entry for exploration quests
    trackQuestProgress("gate_entered");

    setRunning({
      gate: g,
      boss: g.boss,
      hpEnemy: g.boss.hp,
      tick: 0,
    });
    setCombatLog([]);
    setCombatResult(null);

    // Clear any existing spirit binding state
    setSpiritBindingState({
      isActive: false,
      phase: null,
      progress: 0,
      bossName: "",
      bossRank: "",
    });

    // Play gate entry sound + haptic rumble
    playSound("gate_enter");
    hapticRumble();

    logPush(`Entered ${g.name} (${g.rank}-Rank)`);
  }

  function rest() {
    if (inRun) return;
    const heal = Math.floor(player.maxHp * 0.4);
    const mp = Math.floor(player.maxMp * 0.5);
    setPlayer((p) => ({
      ...p,
      hp: clamp(p.hp + heal, 0, p.maxHp),
      mp: clamp(p.mp + mp, 0, p.maxMp),
      fatigue: clamp(p.fatigue - 20, 0, 100),
    }));
    logPush("You took a rest. Deus reficit — you feel renewed.");
    playSound("rest");
    playMusic("ambient_music");
  }

  function allocate(stat: keyof Player["stats"]) {
    if (player.points <= 0) return;
    setPlayer((p) => ({
      ...p,
      points: p.points - 1,
      stats: { ...p.stats, [stat]: p.stats[stat] + 1 },
    }));
  }

  function progressDaily(id: string) {
    if (!daily.active || daily.completed) return;

    setDaily((d) => {
      const updatedQuests = d.availableQuests.map((t) =>
        t.id === id ? { ...t, have: clamp(t.have + 1, 0, t.need) } : t
      );

      // Check if any quests are completed
      const completedQuests = updatedQuests.filter(
        (q) => !d.completedQuests.includes(q.id) && q.have >= q.need
      );

      const newCompletedQuests = [...d.completedQuests];
      let totalExpGained = 0;
      let totalGoldGained = 0;
      let bonusItems: Item[] = [];
      let bonusStatPoints = 0;

      completedQuests.forEach((quest) => {
        newCompletedQuests.push(quest.id);
        totalExpGained += quest.expReward;
        totalGoldGained += quest.goldReward;

        if (quest.bonusRewards) {
          if (quest.bonusRewards.items) {
            bonusItems.push(...quest.bonusRewards.items);
          }
          if (quest.bonusRewards.statPoints) {
            bonusStatPoints += quest.bonusRewards.statPoints;
          }
        }

        // Log individual quest completion
        logPush(
          `Quest completed: ${quest.name}! +${quest.expReward} EXP, +${quest.goldReward} Gold`
        );
        if (quest.bonusRewards) {
          if (quest.bonusRewards.statPoints) {
            logPush(
              `+${quest.bonusRewards.statPoints} Stat Points from epic quest!`
            );
          }
          if (quest.bonusRewards.items) {
            logPush(`Received ${quest.bonusRewards.items.length} bonus items!`);
          }
        }
      });

      // Check if all quests are completed
      const allCompleted = updatedQuests.every((quest) =>
        newCompletedQuests.includes(quest.id)
      );

      if (allCompleted && !d.completed) {
        // Award reputation points
        const reputationGain = Math.floor(totalExpGained / 10);

        // Update player stats
        setPlayer((p) => ({
          ...p,
          exp: p.exp + totalExpGained,
          points: p.points + bonusStatPoints,
          inv: [...p.inv, ...bonusItems],
        }));

        setGold((g) => g + totalGoldGained);

        logPush(`All daily quests completed! +${reputationGain} Reputation`);

        return {
          ...d,
          availableQuests: updatedQuests,
          completedQuests: newCompletedQuests,
          completed: true,
          completedDate: getCurrentGameDate(),
          questReputation: d.questReputation + reputationGain,
        };
      }

      // Apply rewards for individual quest completions
      if (completedQuests.length > 0) {
        setPlayer((p) => ({
          ...p,
          exp: p.exp + totalExpGained,
          points: p.points + bonusStatPoints,
          inv: [...p.inv, ...bonusItems],
        }));

        setGold((g) => g + totalGoldGained);
      }

      return {
        ...d,
        availableQuests: updatedQuests,
        completedQuests: newCompletedQuests,
      };
    });
  }

  function forfeitDaily() {
    if (!daily.active) return;

    setDaily({
      active: false,
      availableQuests: [],
      completedQuests: [],
      completed: false,
      penaltyArmed: true,
      questReputation: daily.questReputation,
    });

    logPush("Daily quests forfeited.");
  }

  function applyPenaltyZone() {
    // In the source logic, failure triggers a Penalty Zone. We'll simulate a harsh debuff.
    setPlayer((p) => ({
      ...p,
      hp: Math.max(1, Math.floor(p.maxHp * 0.1)),
      fatigue: clamp(p.fatigue + 25, 0, 100),
    }));
    logPush(
      "Penalty Zone: You pushed boulders for hours. HP to a sliver; Fatigue up."
    );
  }

  function tryExtraction(bossRankIdx: number) {
    const chance = calcExtractionChance(player, bossRankIdx);
    const cost = 10;
    if (player.mp < cost) {
      logPush("Not enough MP to attempt extraction.");
      return;
    }

    // Get boss info for the sequence
    const bossRank = RANKS[bossRankIdx];
    const bossName = running?.boss.name || "Unknown Boss";

    // Start the visual extraction sequence
    startSpiritBindingSequence(
      bossName,
      bossRank,
      running?.gate.power || 100
    );

    // Consume MP immediately
    setPlayer((p) => ({ ...p, mp: Math.max(0, p.mp - cost) }));

    // The actual extraction logic will be handled in the sequence
    // We'll update the player and stats when the sequence completes
    setTimeout(() => {
      if (Math.random() < chance) {
        const pow = Math.floor(
          5 + player.stats.INT * 0.8 + bossRankIdx * 6 + rand(0, 8)
        );
        const s = createSpirit(pow, bossRankIdx);
        setPlayer((p) => ({ ...p, spirits: [...p.spirits, s] }));
        logPush(
          `${s.rarity.toUpperCase()} spirit bound: ${s.name}! (${
            s.type
          }) - +${s.power} power`
        );

        // Update statistics
        recordSpiritBinding();
        checkAchievements();
      } else {
        logPush("Extraction failed. The shade crumbles to dust.");
      }
    }, 7000); // Wait for the full sequence to complete
  }

  // Test function for spirit binding (for easier testing)
  function testSpiritBinding() {
    // Function removed for production
  }

  function usePotion(itemId: string) {
    const idx = player.inv.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const item = player.inv[idx];
    if (item.type !== "potion") return;

    const oldHp = player.hp;
    const oldMp = player.mp;

    setPlayer((p) => ({
      ...p,
      hp: clamp(p.hp + Math.floor(p.maxHp * 0.5), 0, p.maxHp),
      mp: clamp(p.mp + Math.floor(p.maxMp * 0.3), 0, p.maxMp),
      inv: p.inv.filter((i: Item) => i.id !== itemId),
    }));

    // Trigger heal visual effect + particles
    triggerVisualEffect("healFlash");
    playSound("heal");
    triggerParticles("heal", "25%", "40%");

    // Add combat log entry if in combat
    if (inRun && running) {
      const hpGain = Math.floor(player.maxHp * 0.5);
      const mpGain = Math.floor(player.maxMp * 0.3);
      setCombatLog((log) => [
        ...log.slice(-7),
        `Hunter uses a potion! +${hpGain} HP, +${mpGain} MP`,
      ]);
    }

    logPush(
      "You used a potion. 体力回復 (tairyoku kaifuku): vitality restored."
    );

    // Progress Resource Manager quest
    if (daily.active && !daily.completed) {
      const resourceQuest = daily.availableQuests.find(
        (q) => q.type === "skill" && q.name.includes("Resource Manager")
      );
      if (resourceQuest) {
        progressDaily(resourceQuest.id);
      }
    }
  }

  function useRune(itemId: string) {
    const idx = player.inv.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const item = player.inv[idx];
    if (item.type !== "rune") return;

    // Parse rune name to get rank and type
    const runeName = item.name;
    const rankMatch = runeName.match(/([A-Z])-grade/);
    const typeMatch = runeName.match(/([A-Z]+)-grade/);

    if (!rankMatch || !typeMatch) {
      logPush("Invalid rune format. Cannot use this rune.");
      return;
    }

    const rank = rankMatch[1];
    const rankIdx = RANKS.indexOf(rank);
    if (rankIdx === -1) {
      logPush("Unknown rune rank. Cannot use this rune.");
      return;
    }

    // Determine stat type from rune name
    let statType: keyof Player["stats"] | null = null;
    if (runeName.includes("STR")) statType = "STR";
    else if (runeName.includes("AGI")) statType = "AGI";
    else if (runeName.includes("INT")) statType = "INT";
    else if (runeName.includes("VIT")) statType = "VIT";
    else if (runeName.includes("LUCK")) statType = "LUCK";
    else {
      // Random stat if not specified
      const statKeys: (keyof Player["stats"])[] = [
        "STR",
        "AGI",
        "INT",
        "VIT",
        "LUCK",
      ];
      statType = statKeys[rand(0, statKeys.length - 1)];
    }

    // Calculate stat boost based on rank
    const baseBoost = rankIdx + 1; // E=1, D=2, C=3, B=4, A=5, S=6
    const variance = rand(-1, 1); // Small variance
    const statBoost = Math.max(1, baseBoost + variance);

    // Apply stat boost
    setPlayer((p) => ({
      ...p,
      stats: {
        ...p.stats,
        [statType!]: p.stats[statType!] + statBoost,
      },
      inv: p.inv.filter((i: Item) => i.id !== itemId),
    }));

    logPush(
      `Used ${item.name}! +${statBoost} ${statType} permanently. 魔力強化 (maryoku kyōka): magical enhancement.`
    );
    playSound("rune_use");

    // Progress Resource Manager quest
    if (daily.active && !daily.completed) {
      const resourceQuest = daily.availableQuests.find(
        (q) => q.type === "skill" && q.name.includes("Resource Manager")
      );
      if (resourceQuest) {
        progressDaily(resourceQuest.id);
      }
    }
  }

  function useKey() {
    if (player.keys <= 0 || inRun) return;
    const rankIdx = clamp(rand(1, 3), 0, RANKS.length - 1);
    const g = makeGate(rankIdx);
    setPlayer((p) => ({ ...p, keys: p.keys - 1 }));
    startGate({ ...g, name: `Instant Dungeon: ${g.name}` });
  }

  function dismissCombatResult() {
    setCombatResult(null);
    setRunning(null); // Clear the combat state
    setCombatLog([]); // Clear the combat log
  }

  function triggerVisualEffect(effect: keyof typeof visualEffects) {
    setVisualEffects((prev) => ({ ...prev, [effect]: true }));
    setTimeout(() => {
      setVisualEffects((prev) => ({ ...prev, [effect]: false }));
    }, 300);
  }

  // Additional training activities for more EXP
  function doTraining(type: "physical" | "mental" | "meditation") {
    if (inRun) return;

    let expGain = 0;
    let fatigueGain = 0;
    let message = "";

    switch (type) {
      case "physical":
        expGain = rand(8, 15);
        fatigueGain = rand(5, 10);
        message = "Physical training complete. Your body grows stronger.";
        break;
      case "mental":
        expGain = rand(6, 12);
        fatigueGain = rand(3, 7);
        message = "Mental training sharpens your focus.";
        break;
      case "meditation":
        expGain = rand(4, 8);
        fatigueGain = -rand(5, 12); // Meditation reduces fatigue
        message = "Meditation brings clarity and peace.";
        break;
    }

    setPlayer((p) => ({
      ...p,
      exp: p.exp + expGain,
      fatigue: clamp(p.fatigue + fatigueGain, 0, 100),
    }));

    handleLevelGain(expGain);
    logPush(`${message} +${expGain} EXP`);
  }

  // Work for gold and small EXP
  function doWork() {
    if (inRun) return;

    const goldGain = rand(15, 35);
    const expGain = rand(3, 8);
    const fatigueGain = rand(8, 15);

    setGold((g) => g + goldGain);
    setPlayer((p) => ({
      ...p,
      exp: p.exp + expGain,
      fatigue: clamp(p.fatigue + fatigueGain, 0, 100),
    }));

    handleLevelGain(expGain);
    logPush(`Work complete. +${goldGain}₲, +${expGain} EXP (but more fatigue)`);
  }

  // Shop functions
  function buyPotion() {
    const cost = 25;
    if (gold < cost) {
      logPush(`Not enough gold. Need ${cost}₲ for a potion.`);
      return;
    }

    const quality = rand(40, 60);
    const healAmount = Math.floor((quality / 100) * 50 + 25);

    setGold((g) => g - cost);
    setPlayer((p) => ({
      ...p,
      inv: [
        ...p.inv,
        {
          id: uid(),
          name: "Health Potion",
          type: "potion",
          rarity: "common",
          quality,
          description: `Restores ${healAmount} HP`,
          stats: { HP: healAmount },
          sellValue: Math.floor(quality * 1.2),
        },
      ],
    }));
    logPush(`Purchased a Health Potion for ${cost}₲`);
  }

  function buyUpgrade(type: "weapon" | "armor" | "accessory") {
    let cost = 0;
    let bonus = 0;
    let statType = "";

    switch (type) {
      case "weapon":
        cost = 100 + player.level * 25;
        bonus = 3 + Math.floor(player.level / 3);
        statType = "STR";
        break;
      case "armor":
        cost = 80 + player.level * 20;
        bonus = 2 + Math.floor(player.level / 4);
        statType = "VIT";
        break;
      case "accessory":
        cost = 120 + player.level * 30;
        bonus = 2 + Math.floor(player.level / 5);
        statType = "LUCK";
        break;
    }

    if (gold < cost) {
      logPush(`Not enough gold. Need ${cost}₲ for ${type} upgrade.`);
      return;
    }

    setGold((g) => g - cost);
    setPlayer((p) => ({
      ...p,
      stats: {
        ...p.stats,
        [statType]: p.stats[statType as keyof Player["stats"]] + bonus,
      },
    }));
    logPush(`Purchased ${type} upgrade! +${bonus} ${statType} for ${cost}₲`);
  }

  // Refresh gate pool
  function refreshGates() {
    if (inRun) return;
    const cost = Math.max(10, player.level * 5);
    if (gold < cost) {
      logPush(`Not enough gold. Need ${cost}₲ to refresh gates.`);
      return;
    }

    setGold((g) => g - cost);
    setGates(generateGatePool(player.level));
    logPush(`Gates refreshed! (-${cost}₲)`);
  }

  // Save/Load functions
  function saveGame() {
    const gameState = {
      player,
      gates,
      gold,
      gameTime,
      daily,
    };
    localStorage.setItem("hunters-path-save", JSON.stringify(gameState));
    logPush("Game saved successfully!");
  }

  function loadGame() {
    try {
      const saved = localStorage.getItem("hunters-path-save");
      if (!saved) {
        logPush("No save file found.");
        return;
      }

      const gameState = JSON.parse(saved);

      // Ensure equipment property exists for old save data
      if (!gameState.player.equipment) {
        gameState.player.equipment = {};
      }

      // Handle old daily quest structure
      if (gameState.daily) {
        // If old structure, generate new quests
        if (!gameState.daily.questReputation) {
          gameState.daily.questReputation = 0;
        }
        if (
          !gameState.daily.availableQuests ||
          gameState.daily.availableQuests.length === 0
        ) {
          gameState.daily.availableQuests = generateDailyQuests(
            gameState.player.level,
            gameState.daily.questReputation
          );
          gameState.daily.active = true;
        }
      }

      // Migrate old spirits to new format
      if (gameState.player.spirits) {
        gameState.player.spirits = gameState.player.spirits.map(
          (spirit: any) => {
            // If spirit already has new format, return as is
            if (spirit.rarity && spirit.abilities && spirit.type) {
              return spirit;
            }

            // Migrate old spirit format to new format
            const type = SPIRIT_TYPES[rand(0, SPIRIT_TYPES.length - 1)];
            const rarity = "common"; // Default to common for old spirits
            const availableAbilities = SPIRIT_ABILITIES[type];
            const abilities = availableAbilities.slice(0, 1); // Give 1 ability to old spirits

            return {
              id: spirit.id,
              name: spirit.name,
              power: spirit.power,
              rarity,
              abilities,
              level: 1,
              exp: 0,
              expToNext: 100,
              type,
              description: SPIRIT_DESCRIPTIONS[type],
            };
          }
        );
      }

      setPlayer(gameState.player);
      setGates(gameState.gates);
      setGold(gameState.gold);
      setGameTime(gameState.gameTime);
      setDaily(gameState.daily);
      logPush("Game loaded successfully!");
    } catch (error) {
      logPush("Failed to load game. Save file may be corrupted.");
    }
  }

  function resetGame() {
    if (
      confirm(
        "Are you sure you want to reset your progress? This cannot be undone."
      )
    ) {
      setPlayer(initialPlayer());
      setGates(generateGatePool(1));
      setGold(50);
      setGameTime(initialGameTime());

      // Generate new daily quests for level 1
      const newQuests = generateDailyQuests(1, 0);
      setDaily({
        active: true,
        availableQuests: newQuests,
        completedQuests: [],
        completed: false,
        penaltyArmed: false,
        questReputation: 0,
      });

      setLog(["Game reset. Welcome back, Hunter!"]);
      localStorage.removeItem("hunters-path-save");
    }
  }

  // Arm penalty if player enters dungeon mid-daily and then completes after — simulate auto-trigger at end of fight
  useEffect(() => {
    if (!inRun && daily.penaltyArmed) {
      setDaily((d) => ({ ...d, penaltyArmed: false }));
      applyPenaltyZone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRun]);

  // Sound management — thin wrappers around audioManager singleton
  function playSound(soundName: string, volumeOverride?: number) {
    audioManager.playSound(soundName as SoundName, volumeOverride);
  }

  function playMusic(musicName: string, loop: boolean = true) {
    // Map legacy names to new MusicName type
    const nameMap: Record<string, MusicName> = {
      ambient_music: "ambient",
      combat_music: "combat",
      victory_music: "victory_music",
      defeat_music: "defeat_music",
    };
    audioManager.playMusic(nameMap[musicName] ?? (musicName as MusicName), loop);
  }

  function stopMusic() {
    audioManager.stopMusic(true);
  }

  function updateVolume(newVolume: number) {
    setVolume(newVolume);
  }

  function toggleSound() {
    setSoundEnabled((prev) => !prev);
  }

  function toggleMusic() {
    setMusicEnabled((prev) => !prev);
  }

  // Stat progression visualization component
  function StatProgressionChart() {
    if (statHistory.length < 2) return null;

    const maxStats = {
      STR: Math.max(...statHistory.map((h) => h.stats.STR)),
      AGI: Math.max(...statHistory.map((h) => h.stats.AGI)),
      INT: Math.max(...statHistory.map((h) => h.stats.INT)),
      VIT: Math.max(...statHistory.map((h) => h.stats.VIT)),
      LUCK: Math.max(...statHistory.map((h) => h.stats.LUCK)),
    };

    const totalMax = Math.max(...Object.values(maxStats));

    return (
      <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-600/30">
        <h4 className="text-lg font-bold text-zinc-100 mb-4">
          <i className="fas fa-chart-line mr-2 text-blue-400"></i>
          Stat Progression
        </h4>

        <div className="space-y-3">
          {Object.entries(maxStats).map(([stat, maxValue]) => {
            const currentValue = player.stats[stat as keyof Player["stats"]];
            const percentage =
              totalMax > 0 ? (currentValue / totalMax) * 100 : 0;

            return (
              <div key={stat} className="flex items-center space-x-3">
                <div className="w-12 text-sm text-zinc-400 font-bold">
                  {stat}
                </div>
                <div className="flex-1 bg-zinc-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="w-12 text-sm text-zinc-300 font-bold text-right">
                  {currentValue}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-xs text-zinc-500 text-center">
          Showing progression over {statHistory.length} recorded points
        </div>
      </div>
    );
  }

  function completeLevelUp() {
    setLevelUpState({
      isActive: false,
      newLevel: 0,
      statPointsGained: 0,
      showStatAllocation: false,
    });
  }

  function allocateStatWithFeedback(stat: keyof Player["stats"]) {
    if (player.points <= 0) return;

    // Trigger visual feedback
    triggerVisualEffect("statAllocation");

    setPlayer((p) => ({
      ...p,
      points: p.points - 1,
      stats: { ...p.stats, [stat]: p.stats[stat] + 1 },
    }));

    // Play stat allocation sound
    playSound("rune_use"); // Reuse rune sound for stat allocation

    // Record stat change
    setStatHistory((prev) => [
      ...prev,
      {
        level: player.level,
        stats: { ...player.stats, [stat]: player.stats[stat] + 1 },
        power: playerPower({
          ...player,
          stats: { ...player.stats, [stat]: player.stats[stat] + 1 },
        }),
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  // Enhanced Inventory System State
  const [inventoryFilter, setInventoryFilter] = useState<
    "all" | "potion" | "rune" | "key" | "equipment"
  >("all");
  const [inventorySort, setInventorySort] = useState<
    "name" | "rarity" | "quality" | "type"
  >("type");
  const [showItemDetails, setShowItemDetails] = useState<string | null>(null);

  // Collapsible Sections State for Mobile
  const [collapsedSections, setCollapsedSections] = useState<{
    player: boolean;
    inventory: boolean;
    training: boolean;
    shop: boolean;
    spirits: boolean;
  }>({
    player: false,
    inventory: false,
    training: false,
    shop: false,
    spirits: false,
  });

  // Mobile menu state
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Enhanced Inventory Utility Functions
  function equipItem(itemId: string) {
    try {
      console.log("Equipping item:", itemId);

      const item = player.inv.find((i) => i.id === itemId);
      if (!item || item.type !== "equipment" || !item.equipmentSlot) {
        console.log("Cannot equip item:", { item, itemId });
        return;
      }

      // Validate item structure
      if (!item.id || !item.name || !item.equipmentSlot) {
        console.error("Invalid item structure:", item);
        logPush("Invalid item. Cannot equip.");
        return;
      }

      setPlayer((p) => {
        try {
          // Create defensive copies to prevent mutation issues
          const newInv = [...p.inv].filter((i) => i.id !== itemId);
          const oldItem = item.equipmentSlot
            ? p.equipment[item.equipmentSlot]
            : undefined;

          // Add old item back to inventory if it exists
          if (oldItem) {
            newInv.push({ ...oldItem }); // Create copy to prevent reference issues
          }

          // Create new equipment object with explicit copying
          const newEquipment = {
            weapon: p.equipment.weapon ? { ...p.equipment.weapon } : undefined,
            armor: p.equipment.armor ? { ...p.equipment.armor } : undefined,
            accessory: p.equipment.accessory
              ? { ...p.equipment.accessory }
              : undefined,
          };

          // Set the new item
          if (item.equipmentSlot === "weapon") {
            newEquipment.weapon = { ...item };
          } else if (item.equipmentSlot === "armor") {
            newEquipment.armor = { ...item };
          } else if (item.equipmentSlot === "accessory") {
            newEquipment.accessory = { ...item };
          }

          const newPlayer = {
            ...p,
            inv: newInv,
            equipment: newEquipment,
          };

          console.log("New player state:", newPlayer);
          return newPlayer;
        } catch (setPlayerError) {
          console.error("Error in setPlayer callback:", setPlayerError);
          // Return unchanged state if there's an error
          return p;
        }
      });

      logPush(`Equipped ${item.name}!`);

      // Force a small delay and re-render for mobile PWA compatibility
      setTimeout(() => {
        // Trigger a small state update to ensure re-render
        setPlayer((p) => ({ ...p }));
      }, 100);
    } catch (error) {
      console.error("Error equipping item:", error);
      logPush("Error equipping item. Please try again.");
    }
  }

  function unequipItem(slot: keyof Equipment) {
    try {
      console.log("Unequipping item from slot:", slot);

      const item = player.equipment[slot];
      if (!item) {
        console.log("No item to unequip in slot:", slot);
        return;
      }

      // Validate item structure
      if (!item.id || !item.name) {
        console.error("Invalid item structure:", item);
        logPush("Invalid item. Cannot unequip.");
        return;
      }

      setPlayer((p) => {
        try {
          // Create defensive copies
          const newInv = [...p.inv, { ...item }]; // Create copy to prevent reference issues
          const newEquipment = { ...p.equipment };
          newEquipment[slot] = undefined;

          const newPlayer = {
            ...p,
            inv: newInv,
            equipment: newEquipment,
          };

          console.log("New player state after unequip:", newPlayer);
          return newPlayer;
        } catch (setPlayerError) {
          console.error(
            "Error in setPlayer callback (unequip):",
            setPlayerError
          );
          // Return unchanged state if there's an error
          return p;
        }
      });

      logPush(`Unequipped ${item.name}!`);

      // Force a small delay and re-render for mobile PWA compatibility
      setTimeout(() => {
        // Trigger a small state update to ensure re-render
        setPlayer((p) => ({ ...p }));
      }, 100);
    } catch (error) {
      console.error("Error unequipping item:", error);
      logPush("Error unequipping item. Please try again.");
    }
  }

  function getRarityColor(rarity: string): string {
    switch (rarity) {
      case "common":
        return "text-gray-400";
      case "uncommon":
        return "text-green-400";
      case "rare":
        return "text-blue-400";
      case "epic":
        return "text-purple-400";
      case "legendary":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  }

  function getRarityBgColor(rarity: string): string {
    switch (rarity) {
      case "common":
        return "bg-gray-600";
      case "uncommon":
        return "bg-green-600";
      case "rare":
        return "bg-blue-600";
      case "epic":
        return "bg-purple-600";
      case "legendary":
        return "bg-yellow-600";
      default:
        return "bg-gray-600";
    }
  }

  function getFilteredAndSortedItems() {
    let filtered = player.inv;

    // Apply filter
    if (inventoryFilter !== "all") {
      filtered = filtered.filter((item) => {
        if (inventoryFilter === "equipment") {
          return item.type === "equipment";
        }
        return item.type === inventoryFilter;
      });
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (inventorySort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "rarity":
          const rarityOrder = {
            common: 0,
            uncommon: 1,
            rare: 2,
            epic: 3,
            legendary: 4,
          };
          return (
            (rarityOrder[a.rarity || "common"] || 0) -
            (rarityOrder[b.rarity || "common"] || 0)
          );
        case "quality":
          return (b.quality || 50) - (a.quality || 50);
        case "type":
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return filtered;
  }

  // Enhanced Inventory Component
  function EnhancedInventory() {
    const filteredItems = getFilteredAndSortedItems();
    const equipmentSlots = [
      { key: "weapon" as const, name: "Weapon", icon: "fas fa-sword" },
      { key: "armor" as const, name: "Armor", icon: "fas fa-shield-alt" },
      { key: "accessory" as const, name: "Accessory", icon: "fas fa-ring" },
    ];

    // Safety check for equipment
    const equipment = player.equipment || {};

    return (
      <div>
        {/* Filter and Sort Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
          <select
            value={inventoryFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setInventoryFilter(e.target.value as any)
            }
            className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded border border-zinc-600 flex-1"
          >
            <option value="all">All Items</option>
            <option value="potion">Potions</option>
            <option value="rune">Runes</option>
            <option value="key">Keys</option>
            <option value="equipment">Equipment</option>
          </select>

          <select
            value={inventorySort}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setInventorySort(e.target.value as any)
            }
            className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded border border-zinc-600 flex-1"
          >
            <option value="type">Sort by Type</option>
            <option value="rarity">Sort by Rarity</option>
            <option value="quality">Sort by Quality</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        {/* Equipment Slots */}
        <div className="mb-4 p-2 bg-zinc-800/30 rounded border border-zinc-600/30">
          <h4 className="text-sm font-bold text-zinc-300 mb-2 flex items-center">
            <i className="fas fa-user-shield mr-2"></i>
            Equipment
          </h4>
          <div className="grid grid-cols-3 gap-1">
            {equipmentSlots.map((slot) => {
              const equippedItem = equipment[slot.key];
              return (
                <div key={slot.key} className="text-center">
                  <div className="text-xs text-zinc-400 mb-1">{slot.name}</div>
                  <div className="w-8 h-8 mx-auto border-2 border-dashed border-zinc-600 rounded flex items-center justify-center">
                    {equippedItem ? (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-purple-600">
                        <i className="fas fa-check text-white text-xs"></i>
                      </div>
                    ) : (
                      <i className={`${slot.icon} text-zinc-500 text-xs`}></i>
                    )}
                  </div>
                  {equippedItem && (
                    <button
                      onClick={() => {
                        try {
                          unequipItem(slot.key);
                        } catch (error) {
                          console.error(
                            "Unequip error caught in button:",
                            error
                          );
                          logPush("Unequip failed. Please try again.");
                        }
                      }}
                      className="text-xs text-red-400 hover:text-red-300 mt-1"
                    >
                      Unequip
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Inventory Items */}
        {player.inv.length === 0 ? (
          <div className="opacity-70 text-sm text-center py-6">
            <i className="fas fa-box-open text-2xl text-zinc-600 mb-2"></i>
            <div>Empty inventory</div>
          </div>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`relative bg-zinc-800/30 rounded p-2 border transition-all hover:bg-zinc-700/40 ${
                  showItemDetails === item.id
                    ? "border-zinc-500"
                    : "border-zinc-600/30"
                }`}
                onClick={(e) => {
                  // Don't toggle details if clicking on a button
                  if ((e.target as HTMLElement).closest("button")) {
                    return;
                  }
                  setShowItemDetails(
                    showItemDetails === item.id ? null : item.id
                  );
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${getRarityBgColor(
                        item.rarity || "common"
                      )}`}
                    >
                      <i
                        className={`text-white text-xs ${
                          item.type === "potion"
                            ? "fas fa-flask"
                            : item.type === "rune"
                            ? "fas fa-gem"
                            : item.type === "key"
                            ? "fas fa-key"
                            : item.type === "equipment"
                            ? "fas fa-sword"
                            : "fas fa-question"
                        }`}
                      ></i>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center space-x-1">
                        <span
                          className={`text-zinc-300 font-medium text-sm truncate ${getRarityColor(
                            item.rarity || "common"
                          )}`}
                        >
                          {item.name}
                        </span>
                        <span className="text-xs text-zinc-500 flex-shrink-0">
                          Q{item.quality || 50}
                        </span>
                      </div>
                      {item.description && (
                        <span className="text-xs text-zinc-500 truncate">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {item.type === "potion" && (
                      <Btn sm onClick={() => usePotion(item.id)}>
                        Use
                      </Btn>
                    )}
                    {item.type === "rune" && (
                      <Btn sm onClick={() => useRune(item.id)}>
                        Use
                      </Btn>
                    )}
                    {item.type === "equipment" && (
                      <Btn
                        sm
                        onClick={() => {
                          try {
                            equipItem(item.id);
                          } catch (error) {
                            console.error(
                              "Equipment error caught in button:",
                              error
                            );
                            logPush("Equipment failed. Please try again.");
                          }
                        }}
                      >
                        Equip
                      </Btn>
                    )}
                    <button
                      onClick={() => {}}
                      className="text-zinc-400 hover:text-zinc-300 text-xs"
                    >
                      <i className="fas fa-info-circle"></i>
                    </button>
                  </div>
                </div>

                {/* Expanded Item Details */}
                {showItemDetails === item.id && (
                  <div className="mt-2 pt-2 border-t border-zinc-600/30">
                    <div className="text-xs text-zinc-400 space-y-1">
                      {item.description && (
                        <div>
                          <strong>Description:</strong> {item.description}
                        </div>
                      )}
                      {item.stats && Object.keys(item.stats).length > 0 && (
                        <div>
                          <strong>Stats:</strong>
                          {Object.entries(item.stats).map(([stat, value]) => (
                            <span key={stat} className="ml-2 text-blue-400">
                              +{value} {stat}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.sellValue && (
                        <div>
                          <strong>Sell Value:</strong> {item.sellValue}₲
                        </div>
                      )}
                      <div>
                        <strong>Rarity:</strong>{" "}
                        <span
                          className={getRarityColor(item.rarity || "common")}
                        >
                          {item.rarity || "common"}
                        </span>
                      </div>
                      <div>
                        <strong>Quality:</strong> {item.quality || 50}/100
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Debug mode state
  const [debugMode, setDebugMode] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Debug Functions
  function addDebugItem(
    type: "potion" | "rune" | "key" | "equipment",
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" = "common"
  ) {
    const quality =
      rarity === "common"
        ? 50
        : rarity === "uncommon"
        ? 60
        : rarity === "rare"
        ? 75
        : rarity === "epic"
        ? 85
        : 95;

    let item: Item;

    switch (type) {
      case "potion":
        item = {
          id: uid(),
          name: `${
            rarity.charAt(0).toUpperCase() + rarity.slice(1)
          } Health Potion`,
          type: "potion",
          rarity,
          quality,
          description: `Restores ${Math.floor((quality / 100) * 50 + 25)} HP`,
          stats: { HP: Math.floor((quality / 100) * 50 + 25) },
          sellValue: Math.floor(quality * 1.2),
        };
        break;
      case "rune":
        const statTypes = ["STR", "AGI", "INT", "VIT", "LUCK"];
        const runeStatType =
          statTypes[Math.floor(Math.random() * statTypes.length)];
        const runeStatBonus = Math.floor((quality / 100) * 5);
        item = {
          id: uid(),
          name: `${
            rarity.charAt(0).toUpperCase() + rarity.slice(1)
          } ${runeStatType} Rune`,
          type: "rune",
          rarity,
          quality,
          description: `Boosts ${runeStatType} by ${runeStatBonus}`,
          stats: { [runeStatType]: runeStatBonus },
          sellValue: Math.floor(quality * 1.5),
        };
        break;
      case "key":
        item = {
          id: uid(),
          name: `${
            rarity.charAt(0).toUpperCase() + rarity.slice(1)
          } Dungeon Key`,
          type: "key",
          rarity,
          quality,
          description: "Opens a special dungeon with enhanced rewards",
          sellValue: Math.floor(quality * 2),
        };
        break;
      case "equipment":
        const equipmentTypes = ["weapon", "armor", "accessory"];
        const equipmentType =
          equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)];
        const equipStatBonus = Math.floor((quality / 100) * 10);
        const equipStatType =
          equipmentType === "weapon"
            ? "STR"
            : equipmentType === "armor"
            ? "VIT"
            : "LUCK";
        const equipmentNames = {
          weapon: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Blade`,
          armor: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Armor`,
          accessory: `${
            rarity.charAt(0).toUpperCase() + rarity.slice(1)
          } Charm`,
        };
        item = {
          id: uid(),
          name: equipmentNames[equipmentType as keyof typeof equipmentNames],
          type: "equipment",
          rarity,
          quality,
          description: `Provides ${equipStatBonus} ${equipStatType}`,
          stats: { [equipStatType]: equipStatBonus },
          equipmentSlot: equipmentType as "weapon" | "armor" | "accessory",
          sellValue: Math.floor(quality * 3),
        };
        break;
    }

    setPlayer((p) => ({
      ...p,
      inv: [...p.inv, item],
    }));

    logPush(`Added ${item.name} to inventory!`);
  }

  function setDebugPlayerLevel(level: number) {
    const expNeeded = level * 100; // Simple formula for testing
    setPlayer((p) => ({
      ...p,
      level,
      exp: expNeeded - 1, // Just below the level threshold
      expNext: expNeeded,
    }));
    logPush(`Set player level to ${level}!`);
  }

  function addDebugGold(amount: number) {
    setGold((g) => g + amount);
    logPush(`Added ${amount} gold!`);
  }

  function generateDebugGates() {
    const debugGates = [
      makeGate(0), // E-rank
      makeGate(1), // D-rank
      makeGate(2), // C-rank
      makeGate(3), // B-rank
      makeGate(4), // A-rank
      makeGate(5), // S-rank
    ];
    setGates(debugGates);
    logPush("Generated debug gates (E through S rank)!");
  }

  function clearDebugData() {
    setPlayer((p) => ({
      ...p,
      inv: [],
      equipment: {},
    }));
    setGold(0);
    logPush("Cleared all items and gold!");
  }

  // Enhanced Daily Quest System
  function generateDailyQuests(
    playerLevel: number,
    questReputation: number = 0
  ): DailyTask[] {
    const quests: DailyTask[] = [];

    // Determine available difficulties based on level and reputation
    const availableDifficulties: ("easy" | "medium" | "hard" | "epic")[] = [
      "easy",
    ];
    if (playerLevel >= 5) availableDifficulties.push("medium");
    if (playerLevel >= 10) availableDifficulties.push("hard");
    if (playerLevel >= 15 && questReputation >= 50)
      availableDifficulties.push("epic");

    // Quest type definitions
    const questTypes = [
      {
        type: "combat" as const,
        name: "Monster Hunter",
        description: "Defeat monsters in gates",
        getObjective: (level: number, difficulty: string) => {
          const base = Math.max(1, Math.floor(level / 3));
          switch (difficulty) {
            case "easy":
              return base;
            case "medium":
              return base * 2;
            case "hard":
              return base * 3;
            case "epic":
              return base * 5;
            default:
              return base;
          }
        },
      },
      {
        type: "exploration" as const,
        name: "Gate Explorer",
        description: "Enter gates of different ranks",
        getObjective: (level: number, difficulty: string) => {
          const base = Math.max(1, Math.floor(level / 5));
          switch (difficulty) {
            case "easy":
              return base;
            case "medium":
              return base * 2;
            case "hard":
              return base * 3;
            case "epic":
              return base * 4;
            default:
              return base;
          }
        },
      },
      {
        type: "collection" as const,
        name: "Item Collector",
        description: "Gather items from gates",
        getObjective: (level: number, difficulty: string) => {
          const base = Math.max(1, Math.floor(level / 4));
          switch (difficulty) {
            case "easy":
              return base;
            case "medium":
              return base * 2;
            case "hard":
              return base * 3;
            case "epic":
              return base * 4;
            default:
              return base;
          }
        },
      },
      {
        type: "skill" as const,
        name: "Resource Manager",
        description: "Use potions and runes effectively",
        getObjective: (level: number, difficulty: string) => {
          const base = Math.max(1, Math.floor(level / 6));
          switch (difficulty) {
            case "easy":
              return base;
            case "medium":
              return base * 2;
            case "hard":
              return base * 3;
            case "epic":
              return base * 4;
            default:
              return base;
          }
        },
      },
      {
        type: "challenge" as const,
        name: "Perfect Hunter",
        description: "Complete gates without taking damage",
        getObjective: (level: number, difficulty: string) => {
          const base = Math.max(1, Math.floor(level / 8));
          switch (difficulty) {
            case "easy":
              return base;
            case "medium":
              return base * 2;
            case "hard":
              return base * 3;
            case "epic":
              return base * 4;
            default:
              return base;
          }
        },
      },
    ];

    // Generate 5 random quests
    const usedTypes = new Set<string>();
    const usedDifficulties = new Set<string>();

    for (let i = 0; i < 5; i++) {
      // Select random quest type (avoid duplicates)
      let availableTypes = questTypes.filter((qt) => !usedTypes.has(qt.type));
      if (availableTypes.length === 0) {
        availableTypes = questTypes;
        usedTypes.clear();
      }

      const questType =
        availableTypes[Math.floor(Math.random() * availableTypes.length)];
      usedTypes.add(questType.type);

      // Select random difficulty
      const difficulty =
        availableDifficulties[
          Math.floor(Math.random() * availableDifficulties.length)
        ];

      // Calculate rewards based on level and difficulty
      const baseExp = playerLevel * 10;
      const baseGold = playerLevel * 5;

      let expReward: number;
      let goldReward: number;

      switch (difficulty) {
        case "easy":
          expReward = Math.floor(baseExp * 0.8);
          goldReward = Math.floor(baseGold * 0.8);
          break;
        case "medium":
          expReward = Math.floor(baseExp * 1.2);
          goldReward = Math.floor(baseGold * 1.2);
          break;
        case "hard":
          expReward = Math.floor(baseExp * 1.8);
          goldReward = Math.floor(baseGold * 1.8);
          break;
        case "epic":
          expReward = Math.floor(baseExp * 2.5);
          goldReward = Math.floor(baseGold * 2.5);
          break;
        default:
          expReward = baseExp;
          goldReward = baseGold;
      }

      const objective = questType.getObjective(playerLevel, difficulty);

      quests.push({
        id: `${questType.type}_${difficulty}_${i}`,
        name: `${questType.name} (${
          difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
        })`,
        description: `${questType.description} - ${objective} times`,
        type: questType.type,
        difficulty,
        need: objective,
        have: 0,
        expReward,
        goldReward,
        bonusRewards:
          difficulty === "epic"
            ? {
                items: [
                  {
                    id: uid(),
                    name: `${
                      difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
                    } Quest Reward`,
                    type: "potion",
                    rarity: "rare",
                    quality: 80,
                    description: "Special reward for completing an epic quest",
                    sellValue: 100,
                  },
                ],
                statPoints: 1,
              }
            : undefined,
      });
    }

    return quests;
  }

  function getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case "easy":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "hard":
        return "text-orange-400";
      case "epic":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  }

  function getDifficultyBgColor(difficulty: string): string {
    switch (difficulty) {
      case "easy":
        return "bg-green-600";
      case "medium":
        return "bg-yellow-600";
      case "hard":
        return "bg-orange-600";
      case "epic":
        return "bg-purple-600";
      default:
        return "bg-gray-600";
    }
  }

  return (
    <div className="min-h-screen game-gradient font-game text-zinc-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <Card>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Game Title and Time */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-wide bg-gradient-to-r from-violet-400 via-purple-300 to-violet-400 bg-clip-text text-transparent drop-shadow-sm">
                    Hunter's Path
                  </h1>
                  <p className="text-zinc-500 text-xs font-medium tracking-widest uppercase">
                    {formatGameTime(gameTime)}
                  </p>
                </div>

                {/* Resources - Stack on small screens */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center space-x-2 bg-zinc-800 px-3 py-2 rounded-lg">
                    <i className="fas fa-coins text-yellow-400"></i>
                    <span className="font-bold">{fmt(gold)}</span>
                    <span className="text-zinc-400 text-sm">₲</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-zinc-800 px-3 py-2 rounded-lg">
                    <i className="fas fa-key text-violet-400"></i>
                    <span className="font-bold">{player.keys}</span>
                    <span className="text-zinc-400 text-sm">Keys</span>
                  </div>
                </div>
              </div>

              {/* Controls - Responsive Layout */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                {/* Primary Actions */}
                <div className="flex items-center space-x-2">
                  <Btn
                    onClick={() => setShowStats(!showStats)}
                    theme="default"
                    sm
                  >
                    <i className="fas fa-chart-bar mr-1"></i>
                    Stats
                  </Btn>
                  <Btn onClick={resetGame} theme="danger" sm>
                    <i className="fas fa-trash mr-1"></i>
                    Reset
                  </Btn>
                  {process.env.NODE_ENV === "development" && (
                    <Btn
                      onClick={() => setShowDebugPanel(!showDebugPanel)}
                      theme="default"
                      sm
                    >
                      <i className="fas fa-bug mr-1"></i>
                      Debug
                    </Btn>
                  )}
                </div>

                {/* Audio Controls */}
                <div className="flex items-center space-x-2 bg-zinc-800 px-3 py-1 rounded-lg">
                  <button
                    onClick={toggleSound}
                    className={`text-sm ${
                      soundEnabled ? "text-green-400" : "text-red-400"
                    }`}
                    title={soundEnabled ? "Sound On" : "Sound Off"}
                  >
                    <i
                      className={`fas ${
                        soundEnabled ? "fa-volume-up" : "fa-volume-mute"
                      }`}
                    ></i>
                  </button>
                  <button
                    onClick={toggleMusic}
                    className={`text-sm ${
                      musicEnabled ? "text-blue-400" : "text-red-400"
                    }`}
                    title={musicEnabled ? "Music On" : "Music Off"}
                  >
                    <i
                      className={`fas ${
                        musicEnabled ? "fa-music" : "fa-music-slash"
                      }`}
                    ></i>
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => updateVolume(parseFloat(e.target.value))}
                    className="w-12 sm:w-16 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
                    title={`Volume: ${Math.round(volume * 100)}%`}
                  />
                </div>

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="lg:hidden bg-zinc-800 p-2 rounded-lg text-zinc-400 hover:text-zinc-300"
                  title="Toggle Mobile Menu"
                >
                  <i
                    className={`fas ${showMobileMenu ? "fa-times" : "fa-bars"}`}
                  ></i>
                </button>
              </div>
            </div>
          </Card>
        </header>

        {/* Mobile Menu Overlay */}
        {showMobileMenu && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowMobileMenu(false)}
          >
            <div
              className="absolute right-4 top-20 bg-zinc-900 border border-zinc-700 rounded-lg p-4 w-80 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-zinc-100">
                  Quick Actions
                </h3>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="text-zinc-400 hover:text-zinc-300"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="space-y-3">
                <Btn
                  onClick={rest}
                  disabled={inRun}
                  className="w-full justify-start"
                >
                  <i className="fas fa-bed mr-2"></i>
                  Rest & Recover
                </Btn>
                <Btn
                  onClick={useKey}
                  disabled={player.keys <= 0 || inRun}
                  className="w-full justify-start"
                >
                  <i className="fas fa-key mr-2"></i>
                  Use Key ({player.keys})
                </Btn>
                <Btn
                  onClick={saveGame}
                  disabled={inRun}
                  className="w-full justify-start"
                >
                  <i className="fas fa-save mr-2"></i>
                  Save Game
                </Btn>
                <Btn
                  onClick={loadGame}
                  disabled={inRun}
                  className="w-full justify-start"
                >
                  <i className="fas fa-upload mr-2"></i>
                  Load Game
                </Btn>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Player & Actions */}
          <section className="lg:col-span-1 space-y-6">
            <Card>
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                  <i className="fas fa-user-ninja text-2xl text-white"></i>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100">Hunter</h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-violet-400 font-bold">
                      Level {player.level}
                    </span>
                    <span className="text-zinc-400">•</span>
                    <span className="text-zinc-400">Power: {fmt(pPower)}</span>
                  </div>
                </div>
              </div>

              <Bar
                label="HP"
                value={player.hp}
                max={player.maxHp}
                color="progress-hp"
              />
              <Bar
                label="MP"
                value={player.mp}
                max={player.maxMp}
                color="progress-mp"
              />
              <Bar
                label="EXP"
                value={player.exp}
                max={player.expNext}
                color="progress-exp"
              />

              {player.fatigue > 0 && (
                <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-3 mt-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <i className="fas fa-exclamation-triangle text-orange-400"></i>
                    <span className="text-sm text-orange-200">
                      Fatigue: {Math.round(player.fatigue)}%
                    </span>
                  </div>
                  <BarMini
                    value={player.fatigue}
                    max={100}
                    color="progress-fatigue"
                  />
                </div>
              )}

              <div className="flex gap-2 mt-6 flex-wrap">
                <Btn onClick={rest} disabled={inRun}>
                  <i className="fas fa-bed mr-2"></i>
                  Rest & Recover
                </Btn>
                <Btn onClick={useKey} disabled={player.keys <= 0 || inRun}>
                  <i className="fas fa-key mr-2"></i>
                  Use Key ({player.keys})
                </Btn>
                <Btn onClick={refreshGates} disabled={gold < 90 || inRun}>
                  <i className="fas fa-sync-alt mr-2"></i>
                  Refresh Gates (90¢)
                </Btn>
                <Btn onClick={saveGame} disabled={inRun}>
                  <i className="fas fa-save mr-2"></i>
                  Save Game
                </Btn>
                <Btn onClick={loadGame} disabled={inRun}>
                  <i className="fas fa-upload mr-2"></i>
                  Load Game
                </Btn>
                {daily.active && !daily.completed && (
                  <Btn onClick={forfeitDaily} theme="danger">
                    <i className="fas fa-times mr-2"></i>
                    Forfeit Daily
                  </Btn>
                )}
              </div>
            </Card>

            {/* Training Activities */}
            <Card>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="training">
                  <AccordionTrigger className="text-lg font-bold text-violet-300 hover:no-underline">
                    <i className="fas fa-dumbbell mr-2"></i>
                    Training Activities
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      <div className="grid grid-cols-1 gap-2">
                        <Btn
                          onClick={() => doTraining("physical")}
                          disabled={inRun}
                          className="justify-start text-left"
                        >
                          <i className="fas fa-fist-raised mr-2 text-red-400"></i>
                          Physical Training
                          <span className="ml-auto text-xs text-zinc-400">
                            8-15 EXP
                          </span>
                        </Btn>
                        <Btn
                          onClick={() => doTraining("mental")}
                          disabled={inRun}
                          className="justify-start text-left"
                        >
                          <i className="fas fa-brain mr-2 text-blue-400"></i>
                          Mental Training
                          <span className="ml-auto text-xs text-zinc-400">
                            6-12 EXP
                          </span>
                        </Btn>
                        <Btn
                          onClick={() => doTraining("meditation")}
                          disabled={inRun}
                          className="justify-start text-left"
                        >
                          <i className="fas fa-leaf mr-2 text-green-400"></i>
                          Meditation
                          <span className="ml-auto text-xs text-zinc-400">
                            4-8 EXP, -Fatigue
                          </span>
                        </Btn>
                        <Btn
                          onClick={doWork}
                          disabled={inRun}
                          className="justify-start text-left"
                        >
                          <i className="fas fa-hammer mr-2 text-yellow-400"></i>
                          Work Job
                          <span className="ml-auto text-xs text-zinc-400">
                            15-35₲, 3-8 EXP
                          </span>
                        </Btn>
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">
                        Train to gain experience when stuck, or work for extra
                        gold. Most activities increase fatigue.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>

            {/* Shop */}
            <Card>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="shop">
                  <AccordionTrigger className="text-lg font-bold text-yellow-300 hover:no-underline">
                    <i className="fas fa-shopping-cart mr-2"></i>
                    Hunter Shop
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      <div className="grid grid-cols-1 gap-2">
                        <Btn
                          onClick={buyPotion}
                          disabled={gold < 25}
                          className="justify-between text-left"
                        >
                          <div className="flex items-center">
                            <i className="fas fa-flask mr-2 text-green-400"></i>
                            Health Potion
                          </div>
                          <span className="text-yellow-400">25₲</span>
                        </Btn>
                        <Btn
                          onClick={() => buyUpgrade("weapon")}
                          disabled={gold < 100 + player.level * 25}
                          className="justify-between text-left"
                        >
                          <div className="flex items-center">
                            <i className="fas fa-sword mr-2 text-red-400"></i>
                            Weapon Upgrade (+STR)
                          </div>
                          <span className="text-yellow-400">
                            {100 + player.level * 25}₲
                          </span>
                        </Btn>
                        <Btn
                          onClick={() => buyUpgrade("armor")}
                          disabled={gold < 80 + player.level * 20}
                          className="justify-between text-left"
                        >
                          <div className="flex items-center">
                            <i className="fas fa-shield-alt mr-2 text-orange-400"></i>
                            Armor Upgrade (+VIT)
                          </div>
                          <span className="text-yellow-400">
                            {80 + player.level * 20}₲
                          </span>
                        </Btn>
                        <Btn
                          onClick={() => buyUpgrade("accessory")}
                          disabled={gold < 120 + player.level * 30}
                          className="justify-between text-left"
                        >
                          <div className="flex items-center">
                            <i className="fas fa-ring mr-2 text-purple-400"></i>
                            Lucky Charm (+LUCK)
                          </div>
                          <span className="text-yellow-400">
                            {120 + player.level * 30}₲
                          </span>
                        </Btn>
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">
                        Equipment prices scale with your level. Upgrades
                        permanently increase stats.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>

            <Card>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="stats">
                  <AccordionTrigger className="text-lg font-bold text-zinc-100 hover:no-underline">
                    <div className="flex items-center justify-between w-full mr-4">
                      <span>Stats</span>
                      {player.points > 0 && (
                        <div className="bg-violet-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {player.points} Points
                        </div>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="max-h-96 overflow-y-auto">
                      <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <h4 className="text-sm font-bold text-blue-300 mb-2">
                          <i className="fas fa-info-circle mr-1"></i>
                          Stat Effects
                        </h4>
                        <div className="text-xs text-blue-200 space-y-1">
                          <div>
                            <span className="text-red-400 font-bold">STR:</span>{" "}
                            Primary damage (+3 power each)
                          </div>
                          <div>
                            <span className="text-green-400 font-bold">
                              AGI:
                            </span>{" "}
                            Speed & damage (+2 power each)
                          </div>
                          <div>
                            <span className="text-blue-400 font-bold">
                              INT:
                            </span>{" "}
                            Magic damage & spirit binding (+1.5 power each)
                          </div>
                          <div>
                            <span className="text-orange-400 font-bold">
                              VIT:
                            </span>{" "}
                            Health & defense (+0.5 power each)
                          </div>
                          <div>
                            <span className="text-yellow-400 font-bold">
                              LUCK:
                            </span>{" "}
                            Critical hits & item drops
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {Object.entries(player.stats).map(([k, v]) => (
                          <div
                            key={k}
                            className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3"
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-8 h-8 ${
                                  STAT_COLORS[k as keyof typeof STAT_COLORS]
                                } rounded-full flex items-center justify-center text-white text-sm font-bold`}
                              >
                                <i
                                  className={
                                    STAT_ICONS[k as keyof typeof STAT_ICONS]
                                  }
                                ></i>
                              </div>
                              <div>
                                <div className="font-bold text-zinc-100">
                                  {k}
                                </div>
                                <div className="text-sm text-zinc-400">
                                  {k === "STR" && "Strength"}
                                  {k === "AGI" && "Agility"}
                                  {k === "INT" && "Intelligence"}
                                  {k === "VIT" && "Vitality"}
                                  {k === "LUCK" && "Luck"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-xl">{v}</span>
                              <button
                                className="w-8 h-8 bg-violet-600 hover:bg-violet-500 text-white rounded-full transition-colors disabled:opacity-40"
                                onClick={() =>
                                  allocateStatWithFeedback(
                                    k as keyof Player["stats"]
                                  )
                                }
                                disabled={player.points <= 0}
                              >
                                <i className="fas fa-plus text-xs"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>

            {/* Stat Progression Chart */}
            <StatProgressionChart />

            <Card>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="spirit-legion">
                  <AccordionTrigger className="text-lg font-bold text-zinc-100 hover:no-underline">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-users text-purple-400"></i>
                      <span>Spirit Legion</span>
                      {player.spirits.length > 0 && (
                        <span className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                          {player.spirits.length}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="max-h-96 overflow-y-auto">
                      {player.spirits.length === 0 && (
                        <div className="opacity-70 text-sm text-center py-4">
                          No spirits recruited
                        </div>
                      )}

                      <div className="space-y-3 mb-4">
                        {player.spirits.map((s) => (
                          <div
                            key={s.id}
                            className={`bg-zinc-800/30 border ${getRarityBorder(
                              s.rarity
                            )} rounded-lg p-3`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`w-8 h-8 bg-gradient-to-br ${getRarityColor(
                                    s.rarity
                                  )
                                    .replace("text-", "from-")
                                    .replace(
                                      "-400",
                                      "-600"
                                    )} to-purple-800 rounded-full flex items-center justify-center`}
                                >
                                  <i className="fas fa-ghost text-white text-xs"></i>
                                </div>
                                <div>
                                  <div
                                    className={`font-bold ${getRarityColor(
                                      s.rarity
                                    )}`}
                                  >
                                    {s.name}
                                  </div>
                                  <div className="text-xs text-zinc-400 capitalize">
                                    {s.rarity} {s.type} • Level {s.level}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-purple-400">
                                  +{s.power}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  Power
                                </div>
                              </div>
                            </div>

                            <div className="text-xs text-zinc-400 mb-2">
                              {s.description}
                            </div>

                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-zinc-300 mb-1">
                                Abilities:
                              </div>
                              {(s.abilities || []).map((ability) => (
                                <div
                                  key={ability.id}
                                  className="flex items-center space-x-2"
                                >
                                  <span
                                    className={`text-xs px-2 py-1 rounded ${
                                      ability.type === "passive"
                                        ? "bg-blue-600/20 text-blue-400"
                                        : "bg-green-600/20 text-green-400"
                                    }`}
                                  >
                                    {ability.type}
                                  </span>
                                  <span className="text-xs text-zinc-300 font-medium">
                                    {ability.name}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="mt-2 pt-2 border-t border-zinc-700">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400">
                                  EXP: {s.exp}/{s.expToNext}
                                </span>
                                <div className="w-20 bg-zinc-700 rounded-full h-1.5">
                                  <div
                                    className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${(s.exp / s.expToNext) * 100}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {player.spirits.length > 0 && (
                        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-purple-300">
                              Total Army Power:
                            </span>
                            <span className="font-bold text-purple-400">
                              +{player.spirits.reduce((a, s) => a + s.power, 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-purple-300">
                              MP Upkeep/tick:
                            </span>
                            <span className="font-bold text-blue-400">
                              -{spiritUpkeep(player)} MP
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </section>

          {/* Middle: Gates & Combat */}
          <section className="lg:col-span-2 space-y-6">
            <Card>
              <h3 className="text-xl font-bold mb-4 text-zinc-100">
                Combat Zone
              </h3>

              {!inRun && (
                <div className="text-sm opacity-80 mb-6 text-center py-8">
                  Enter a Gate to begin combat. Allocate stats and complete
                  Daily Quests first for best odds.
                </div>
              )}

              {(inRun && running) || combatResult ? (
                <div
                  className={`border rounded-lg p-6 mb-6 relative overflow-hidden transition-all duration-500 ${
                    visualEffects.screenShake ? "animate-screen-shake" : ""
                  } ${
                    visualEffects.damageFlash ? "animate-damage-flash" : ""
                  } ${visualEffects.healFlash ? "animate-heal-flash" : ""} ${
                    running
                      ? `gate-environment-${running.gate.rank}`
                      : "bg-gradient-to-r from-red-900/30 to-purple-900/30 border-red-500/30"
                  }`}
                >
                  {/* Animated Background Particles */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="combat-particle absolute top-4 left-4 w-2 h-2 bg-purple-400 rounded-full animate-floating-particle opacity-60"></div>
                    <div className="combat-particle absolute top-8 right-8 w-1 h-1 bg-red-400 rounded-full animate-floating-particle opacity-40"></div>
                    <div className="combat-particle absolute bottom-6 left-12 w-1.5 h-1.5 bg-blue-400 rounded-full animate-floating-particle opacity-50"></div>
                    <div className="combat-particle absolute bottom-12 right-4 w-1 h-1 bg-green-400 rounded-full animate-floating-particle opacity-30"></div>

                    {/* Environment-specific particles — 6 per rank for depth */}
                    {running && (
                      <>
                        <div className={`environment-particle environment-particle-${running.gate.rank} absolute top-[10%] left-[15%] w-10 h-10 rounded-full`} style={{ animationDelay: "0s" }}></div>
                        <div className={`environment-particle environment-particle-${running.gate.rank} absolute top-[60%] right-[10%] w-7 h-7 rounded-full`} style={{ animationDelay: "1s" }}></div>
                        <div className={`environment-particle environment-particle-${running.gate.rank} absolute bottom-[15%] left-[40%] w-5 h-5 rounded-full`} style={{ animationDelay: "2s" }}></div>
                        <div className={`environment-particle environment-particle-${running.gate.rank} absolute top-[40%] right-[30%] w-8 h-8 rounded-full`} style={{ animationDelay: "0.5s" }}></div>
                        <div className={`environment-particle environment-particle-${running.gate.rank} absolute bottom-[30%] left-[10%] w-6 h-6 rounded-full`} style={{ animationDelay: "1.5s" }}></div>
                        <div className={`environment-particle environment-particle-${running.gate.rank} absolute top-[75%] right-[50%] w-4 h-4 rounded-full`} style={{ animationDelay: "3s" }}></div>
                      </>
                    )}
                  </div>

                  {/* Gate Header with Enhanced Styling */}
                  <div className="text-center mb-6 relative z-10">
                    <h4 className="text-xl font-bold text-red-300 mb-2 animate-pulse">
                      {running?.gate.name || combatResult?.gate.name}
                    </h4>

                    {/* Environment Description */}
                    {running && (
                      <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-600/30">
                        <p className="text-sm text-zinc-300 italic">
                          {
                            MONSTER_DATA[
                              running.gate.rank as keyof typeof MONSTER_DATA
                            ]?.environment
                          }
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {
                            MONSTER_DATA[
                              running.gate.rank as keyof typeof MONSTER_DATA
                            ]?.sound
                          }
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-center space-x-4 text-sm text-zinc-400">
                      <div className="flex items-center space-x-2 bg-red-900/50 px-3 py-1 rounded-full border border-red-500/30">
                        <i className="fas fa-skull text-red-400 animate-pulse"></i>
                        <span>
                          Rank {running?.gate.rank || combatResult?.gate.rank}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 bg-blue-900/50 px-3 py-1 rounded-full border border-blue-500/30">
                        <i className="fas fa-clock text-blue-400"></i>
                        <span>{running?.tick || "Complete"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Particle Effects Layer */}
                  <ParticleLayer bursts={bursts} onBurstComplete={removeBurst} />

                  {/* Combat Arena with Enhanced Visuals */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 relative z-10">
                    {/* Hunter Side with Glow Effects */}
                    <motion.div
                      className="bg-zinc-800/50 border border-purple-500/30 rounded-lg p-4 relative group hover:border-purple-400/50 transition-colors duration-300"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      {/* Floating damage numbers on player side */}
                      <AnimatePresence>
                        {damageNumbers.filter(d => d.side === "player").map((d) => (
                          <DamageNumber key={d.id} id={d.id} amount={d.amount} type={d.type} />
                        ))}
                      </AnimatePresence>

                      <div className="text-center mb-4 relative z-10">
                        <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-purple-500/30 animate-pulse">
                          <i className="fas fa-user-shield text-white text-xl"></i>
                        </div>
                        <h5 className="font-bold text-purple-300 font-display">Hunter</h5>
                        <p className="text-xs text-zinc-400">
                          Level {player.level}
                        </p>
                      </div>

                      <div className="space-y-3 relative z-10">
                        <CombatBar value={player.hp} max={player.maxHp} color="text-green-400" label="HP" />
                        <CombatBar value={player.mp} max={player.maxMp} color="text-blue-400" label="MP" />
                      </div>
                    </motion.div>

                    {/* Enemy Side with Threatening Effects */}
                    <motion.div
                      className="bg-zinc-800/50 border border-red-500/30 rounded-lg p-4 relative group hover:border-red-400/50 transition-colors duration-300"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      {/* Floating damage numbers on enemy side */}
                      <AnimatePresence>
                        {damageNumbers.filter(d => d.side === "enemy").map((d) => (
                          <DamageNumber key={d.id} id={d.id} amount={d.amount} type={d.type} />
                        ))}
                      </AnimatePresence>

                      <div className="text-center mb-4 relative z-10">
                        <motion.div
                          className={`w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-red-500/30 ${
                            running ? "monster-idle" : ""
                          }`}
                          animate={
                            visualEffects.criticalHit
                              ? { scale: [1, 0.85, 1], rotate: [0, -5, 5, 0] }
                              : {}
                          }
                          transition={{ duration: 0.3 }}
                        >
                          <i
                            className={`fas ${
                              running
                                ? MONSTER_DATA[
                                    running.gate
                                      .rank as keyof typeof MONSTER_DATA
                                  ]?.icon
                                : "fa-dragon"
                            } text-white text-xl`}
                          ></i>
                        </motion.div>
                        <h5 className="font-bold text-red-300 font-display">
                          {running?.boss.name || combatResult?.boss.name}
                        </h5>
                        <p className="text-xs text-zinc-400 mb-2">
                          {running?.gate.rank || combatResult?.gate.rank}-Rank
                          Boss
                        </p>

                        {/* Monster Description */}
                        {running && (
                          <div className="text-xs text-zinc-400 bg-red-900/20 p-2 rounded border border-red-500/20">
                            <p className="italic">
                              {
                                MONSTER_DATA[
                                  running.gate.rank as keyof typeof MONSTER_DATA
                                ]?.description
                              }
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="relative z-10">
                        <CombatBar
                          value={running ? running.hpEnemy : 0}
                          max={running ? running.boss.maxHp : 1}
                          color="text-red-400"
                          label="HP"
                        />
                      </div>
                    </motion.div>
                  </div>

                  {/* Enhanced Turn Indicator */}
                  <div className="text-center mb-4 relative z-10">
                    <div className="inline-flex items-center space-x-2 bg-zinc-800/50 border border-yellow-500/30 rounded-full px-4 py-2 shadow-lg">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="text-yellow-300 font-medium">
                        {running ? "Combat in Progress..." : "Combat Complete"}
                      </span>
                    </div>
                  </div>

                  {/* Enhanced Combat Log */}
                  <div className="bg-zinc-900/50 rounded-lg p-4 mb-4 max-h-32 overflow-y-auto relative z-10 border border-zinc-700/50">
                    <div className="text-sm text-zinc-300 space-y-1">
                      {(running ? combatLog : combatResult?.combatLog || [])
                        .length > 0 ? (
                        (running
                          ? combatLog
                          : combatResult?.combatLog || []
                        ).map((entry, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-2 animate-fade-in"
                          >
                            <span className="text-zinc-500 text-xs">•</span>
                            <span
                              className={`
                              ${
                                entry.includes("Hunter attacks")
                                  ? "text-green-400"
                                  : ""
                              }
                              ${
                                entry.includes("attacks for") &&
                                !entry.includes("Hunter")
                                  ? "text-red-400"
                                  : ""
                              }
                              ${
                                entry.includes("Critical hit")
                                  ? "text-yellow-400 font-bold"
                                  : ""
                              }
                              ${
                                entry.includes("Victory")
                                  ? "text-green-400 font-bold"
                                  : ""
                              }
                              ${
                                entry.includes("Defeat")
                                  ? "text-red-400 font-bold"
                                  : ""
                              }
                              ${
                                entry.includes("blocked") ? "text-blue-400" : ""
                              }
                              ${
                                !entry.includes("Hunter") &&
                                !entry.includes("attacks") &&
                                !entry.includes("Critical") &&
                                !entry.includes("Victory") &&
                                !entry.includes("Defeat") &&
                                !entry.includes("blocked")
                                  ? "text-zinc-300"
                                  : ""
                              }
                            `}
                            >
                              {entry}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-zinc-500">
                          Combat log will appear here...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Combat Results Display */}
                  {combatResult && (
                    <div className="bg-zinc-800/50 rounded-lg p-4 mb-4 border border-zinc-600/50">
                      <div className="text-center mb-3">
                        <h3
                          className={`text-lg font-bold ${
                            combatResult.victory
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {combatResult.victory ? "🎉 Victory!" : "💀 Defeat"}
                        </h3>
                      </div>

                      {combatResult.victory && (
                        <div className="space-y-3">
                          {/* Rewards */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-green-900/30 rounded-lg p-3 border border-green-500/30">
                              <div className="text-green-400 font-bold">
                                +{fmt(combatResult.expGained)} EXP
                              </div>
                              <div className="text-green-300 text-xs">
                                Experience Gained
                              </div>
                            </div>
                            <div className="bg-yellow-900/30 rounded-lg p-3 border border-yellow-500/30">
                              <div className="text-yellow-400 font-bold">
                                +{fmt(combatResult.goldGained)}₲
                              </div>
                              <div className="text-yellow-300 text-xs">
                                Gold Earned
                              </div>
                            </div>
                          </div>

                          {/* Spirit Binding Result */}
                          {combatResult.spiritBound ? (
                            <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/30">
                              <div className="flex items-center space-x-2">
                                <i className="fas fa-ghost text-purple-400"></i>
                                <div>
                                  <div className="text-purple-400 font-bold">
                                    Spirit Bound:{" "}
                                    {combatResult.spiritBound.name}
                                  </div>
                                  <div className="text-purple-300 text-xs">
                                    Power:{" "}
                                    {fmt(combatResult.spiritBound.power)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-zinc-700/30 rounded-lg p-3 border border-zinc-600/30">
                              <div className="text-zinc-400 text-sm text-center">
                                <i className="fas fa-times mr-2"></i>
                                No spirit bound
                              </div>
                            </div>
                          )}

                          {/* Drops */}
                          {combatResult.drops.length > 0 && (
                            <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-500/30">
                              <div className="text-blue-400 font-bold mb-2">
                                Loot Found:
                              </div>
                              <div className="space-y-1">
                                {combatResult.drops.map((drop, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center space-x-2 text-sm"
                                  >
                                    <i className="fas fa-gem text-blue-300"></i>
                                    <span className="text-blue-300">
                                      {drop.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!combatResult.victory && (
                        <div className="text-center">
                          <div className="text-red-400 font-bold mb-2">
                            -10₲ Penalty
                          </div>
                          <div className="text-zinc-400 text-sm">
                            Rest and recover to try again
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Enhanced Quick Actions */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="text-xs text-zinc-400 bg-zinc-800/30 px-3 py-2 rounded-lg">
                      <div>
                        Spirit Upkeep: {fmt(spiritUpkeep(player))} MP/tick
                      </div>
                      <div>Fatigue: {player.fatigue}%</div>
                    </div>

                    {/* Integrated Potion Button with Enhanced Styling */}
                    {player.inv.some((item) => item.type === "potion") &&
                      running && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-zinc-400">
                            Quick Heal:
                          </span>
                          <button
                            onClick={() => {
                              const potion = player.inv.find(
                                (item) => item.type === "potion"
                              );
                              if (potion) usePotion(potion.id);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-green-500/30 hover:scale-105"
                          >
                            <i className="fas fa-flask text-sm"></i>
                            <span className="text-sm font-medium">
                              Use Potion
                            </span>
                          </button>
                        </div>
                      )}

                    {/* Enhanced Dismiss Button for Combat Result */}
                    {combatResult && (
                      <div className="flex items-center space-x-2">
                        <Btn
                          onClick={dismissCombatResult}
                          className="shadow-lg hover:shadow-purple-500/30 hover:scale-105 transition-all duration-200"
                        >
                          {combatResult.victory ? "Continue" : "Accept Defeat"}
                        </Btn>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-zinc-100">
                  Available Gates ({gates.length})
                </h4>
                <div className="text-sm text-zinc-400">
                  Your Power: {fmt(pPower)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gates
                  .sort((a, b) => a.rankIdx - b.rankIdx)
                  .map((g) => {
                    const tooHard = pPower < g.recommended * 0.8; // Made slightly easier
                    return (
                      <div
                        key={g.id}
                        className={`bg-zinc-800/30 border rounded-lg p-4 transition-colors cursor-pointer group ${
                          tooHard
                            ? "border-red-700 opacity-75 hover:border-red-500/50"
                            : "border-zinc-700 hover:border-violet-500/50"
                        }`}
                        onClick={() => !inRun && startGate(g)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-8 h-8 ${
                                RANK_COLORS[g.rank as keyof typeof RANK_COLORS]
                              } rounded-full flex items-center justify-center text-white font-bold text-sm`}
                            >
                              {g.rank}
                            </div>
                            <span className="font-bold text-zinc-100">
                              {g.rank}-Rank Gate
                            </span>
                            {tooHard && (
                              <i className="fas fa-exclamation-triangle text-red-400 text-sm"></i>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-zinc-400">Power</div>
                            <div
                              className={`font-bold ${
                                tooHard ? "text-red-400" : "text-green-400"
                              }`}
                            >
                              {fmt(g.power)}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-sm mb-2 ${
                            tooHard ? "text-red-400" : "text-zinc-400"
                          }`}
                        >
                          Recommended: {fmt(g.recommended)}{" "}
                          {tooHard && "(Too Dangerous!)"}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-500">
                            Gate ID: {g.id.slice(0, 3).toUpperCase()}
                          </span>
                          <div className="flex items-center space-x-1 text-xs text-zinc-400">
                            <i className="fas fa-trophy"></i>
                            <span>
                              +{fmt(Math.floor(g.recommended * 1.1))} EXP
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>

            <Card>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="daily-quest">
                  <AccordionTrigger className="text-lg font-bold text-zinc-100 hover:no-underline">
                    <div className="flex items-center justify-between w-full mr-4">
                      <span>Daily Quest</span>
                      <div className="flex items-center space-x-2">
                        {daily.active && (
                          <>
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-sm text-green-400 font-medium">
                              Active
                            </span>
                          </>
                        )}
                        {/* Next reset timer */}
                        <div className="text-xs text-zinc-400">
                          <i className="fas fa-clock mr-1"></i>
                          Resets at midnight
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="max-h-96 overflow-y-auto">
                      {/* Quest Reputation Display */}
                      {daily.questReputation > 0 && (
                        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <i className="fas fa-star text-purple-400"></i>
                              <span className="text-purple-200 font-medium">
                                Quest Reputation
                              </span>
                            </div>
                            <span className="text-purple-300 font-bold">
                              {daily.questReputation}
                            </span>
                          </div>
                          <div className="text-xs text-purple-200/80 mt-1">
                            Higher reputation unlocks epic quests and better
                            rewards
                          </div>
                        </div>
                      )}

                      {!daily.active && !daily.completed && (
                        <div className="text-sm opacity-80 text-center py-8">
                          Start your Daily Quest to earn bonuses. Select 3
                          quests from 5 available options. Fail or quit and you
                          face the Penalty Zone.
                        </div>
                      )}

                      {daily.active && !daily.completed && (
                        <>
                          <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-lg p-4 mb-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <i className="fas fa-clock text-yellow-400"></i>
                              <span className="text-yellow-200 font-medium">
                                Complete quests to earn rewards!
                              </span>
                            </div>
                            <p className="text-sm text-yellow-100/80">
                              Progress: {daily.completedQuests.length}/
                              {daily.availableQuests.length} completed
                            </p>
                          </div>

                          <div className="space-y-3">
                            {daily.availableQuests.map((quest) => {
                              const isCompleted =
                                daily.completedQuests.includes(quest.id);

                              const questIcons = {
                                combat: "fas fa-sword",
                                exploration: "fas fa-door-open",
                                collection: "fas fa-backpack",
                                skill: "fas fa-magic",
                                challenge: "fas fa-trophy",
                              };

                              return (
                                <div
                                  key={quest.id}
                                  className={`relative border-2 rounded-lg p-4 transition-all ${
                                    isCompleted
                                      ? "border-green-500 bg-green-900/20"
                                      : "border-zinc-600 bg-zinc-800/30"
                                  }`}
                                >
                                  {/* Difficulty Badge */}
                                  <div
                                    className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${getDifficultyBgColor(
                                      quest.difficulty
                                    )}`}
                                  >
                                    {quest.difficulty.toUpperCase()}
                                  </div>

                                  <div className="flex items-center space-x-3">
                                    <div
                                      className={`w-10 h-10 ${getDifficultyBgColor(
                                        quest.difficulty
                                      )} rounded-full flex items-center justify-center`}
                                    >
                                      <i
                                        className={`${
                                          questIcons[quest.type]
                                        } text-white`}
                                      ></i>
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2">
                                        <div
                                          className={`font-medium ${getDifficultyColor(
                                            quest.difficulty
                                          )}`}
                                        >
                                          {quest.name}
                                        </div>
                                        {isCompleted && (
                                          <i className="fas fa-check-circle text-green-400"></i>
                                        )}
                                      </div>
                                      <div className="text-sm text-zinc-400 mt-1">
                                        {quest.description}
                                      </div>
                                      <div className="flex items-center space-x-4 mt-2 text-xs">
                                        <span className="text-green-400">
                                          +{quest.expReward} EXP
                                        </span>
                                        <span className="text-yellow-400">
                                          +{quest.goldReward} Gold
                                        </span>
                                        {quest.bonusRewards && (
                                          <span className="text-purple-400">
                                            +Bonus Rewards
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Progress Bar for All Quests */}
                                  <div className="mt-3">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span className="text-zinc-400">
                                        Progress
                                      </span>
                                      <span className="text-green-400">
                                        {quest.have}/{quest.need}
                                      </span>
                                    </div>
                                    <div className="w-full bg-zinc-700 rounded-full h-2">
                                      <div
                                        className="bg-green-500 h-2 rounded-full transition-all"
                                        style={{
                                          width: `${Math.round(
                                            (quest.have / quest.need) * 100
                                          )}%`,
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-zinc-400 text-center">
                              Complete quests to earn rewards and reputation!
                            </div>
                            <div className="text-xs text-violet-400 text-center mt-2">
                              <i className="fas fa-crown mr-1"></i>
                              Complete all 5 quests for Daily Master bonus
                              rewards!
                            </div>
                          </div>
                        </>
                      )}

                      {daily.completed && (
                        <div className="text-emerald-400 text-sm text-center py-8">
                          <i className="fas fa-trophy text-2xl mb-2"></i>
                          <div>Daily quests completed!</div>
                          <div className="text-xs text-emerald-300 mt-1">
                            よくやった (yoku yatta): well done!
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>

            {/* Inventory moved to middle column for better visibility on large screens */}
            <Card>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="inventory">
                  <AccordionTrigger className="text-xl font-bold text-zinc-100 hover:no-underline">
                    <div className="flex items-center justify-between w-full mr-4">
                      <span>Inventory</span>
                      {player.inv.length > 0 && (
                        <span className="bg-amber-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                          {player.inv.length}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="max-h-96 overflow-y-auto">
                      <EnhancedInventory />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </section>

          {/* Right: Log */}
          <section className="lg:col-span-1">
            <Card>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="activity-log">
                  <AccordionTrigger className="text-lg font-bold text-zinc-100 hover:no-underline">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-scroll text-zinc-400"></i>
                      <span>Activity Log</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-zinc-900/50 rounded-lg p-4 h-96 overflow-y-auto custom-scrollbar space-y-2 text-sm">
                      {log.map((m, i) => (
                        <div key={i} className="opacity-90">
                          • {m}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>

            <Card className="mt-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="lore">
                  <AccordionTrigger className="font-semibold hover:no-underline">
                    Lore (Mechanics)
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="text-xs opacity-80 list-disc pl-5 space-y-1">
                      <li>
                        Gates lead to Dungeons. Clear them to gain EXP/loot.
                      </li>
                      <li>
                        Daily Quest must be completed or the Penalty Zone
                        triggers.
                      </li>
                      <li>
                        Level up to gain Stat Points. STR/AGI raise damage;
                        INT/LUCK aid extraction.
                      </li>
                      <li>
                        Spirit Binding after boss defeat may recruit a Spirit
                        ally (25% base chance).
                      </li>
                      <li>Fatigue reduces your total power; Rest lowers it.</li>
                      <li>
                        Instant Dungeon Keys open bonus runs with better
                        rewards.
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </section>
        </div>

        {/* Spirit Binding Sequence Modal */}
        {spiritBindingState.isActive && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Background Effects */}
              <div className="absolute inset-0">
                {/* Animated particles */}
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-pulse opacity-60"></div>
                <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-pulse opacity-40"></div>
                <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse opacity-50"></div>
                <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-yellow-400 rounded-full animate-pulse opacity-30"></div>
                <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-red-400 rounded-full animate-pulse opacity-70"></div>

                {/* Ripple effects */}
                <div
                  className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-purple-500/30 rounded-full animate-shadow-ripple ${
                    spiritBindingState.phase === "extracting"
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                ></div>
                <div
                  className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-purple-400/20 rounded-full animate-pulse ${
                    spiritBindingState.phase === "extracting"
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                ></div>
              </div>

              {/* Main Content */}
              <div className="relative z-10 text-center max-w-2xl mx-4">
                {/* Phase-specific background */}
                <div
                  className={`mb-8 p-8 rounded-lg border-2 transition-all duration-500 ${
                    spiritBindingState.phase === "preparing"
                      ? "bg-blue-900/30 border-blue-500/50"
                      : spiritBindingState.phase === "extracting"
                      ? "bg-purple-900/30 border-purple-500/50"
                      : spiritBindingState.phase === "success"
                      ? "bg-green-900/30 border-green-500/50"
                      : spiritBindingState.phase === "failure"
                      ? "bg-red-900/30 border-red-500/50"
                      : "bg-zinc-900/30 border-zinc-500/50"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                      spiritBindingState.phase === "preparing"
                        ? "bg-blue-600 animate-shadow-pulse"
                        : spiritBindingState.phase === "extracting"
                        ? "bg-purple-600 animate-shadow-spin animate-shadow-glow"
                        : spiritBindingState.phase === "success"
                        ? "bg-green-600 animate-shadow-bounce"
                        : spiritBindingState.phase === "failure"
                        ? "bg-red-600 animate-shadow-pulse"
                        : "bg-zinc-600"
                    }`}
                  >
                    <i
                      className={`text-3xl text-white ${
                        spiritBindingState.phase === "preparing"
                          ? "fas fa-magic"
                          : spiritBindingState.phase === "extracting"
                          ? "fas fa-ghost"
                          : spiritBindingState.phase === "success"
                          ? "fas fa-check"
                          : spiritBindingState.phase === "failure"
                          ? "fas fa-times"
                          : "fas fa-question"
                      }`}
                    ></i>
                  </div>

                  {/* Text Content */}
                  {(() => {
                    const text = getExtractionSequenceText();
                    return (
                      <>
                        <h2
                          className={`text-3xl font-bold mb-4 transition-all duration-500 ${
                            spiritBindingState.phase === "preparing"
                              ? "text-blue-300"
                              : spiritBindingState.phase === "extracting"
                              ? "text-purple-300"
                              : spiritBindingState.phase === "success"
                              ? "text-green-300"
                              : spiritBindingState.phase === "failure"
                              ? "text-red-300"
                              : "text-zinc-300"
                          }`}
                        >
                          {text.title}
                        </h2>

                        <p className="text-xl text-zinc-200 mb-3">
                          {text.subtitle}
                        </p>

                        <p className="text-zinc-400 mb-6">{text.description}</p>

                        {/* Progress Bar for extracting phase */}
                        {spiritBindingState.phase === "extracting" && (
                          <div className="w-full bg-zinc-700 rounded-full h-4 mb-4 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-purple-400 h-4 rounded-full transition-all duration-300 ease-out"
                              style={{
                                width: `${spiritBindingState.progress}%`,
                              }}
                            ></div>
                          </div>
                        )}

                        {/* Boss Info */}
                        <div className="text-sm text-zinc-500">
                          Target: {spiritBindingState.bossName} (
                          {spiritBindingState.bossRank}-Rank)
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Additional Effects */}
                {spiritBindingState.phase === "extracting" && (
                  <div className="text-center">
                    <div className="text-purple-400 text-sm animate-pulse">
                      <i className="fas fa-magic mr-2"></i>
                      Channeling magical energy...
                    </div>
                  </div>
                )}

                {spiritBindingState.phase === "success" && (
                  <div className="text-center">
                    <div className="text-green-400 text-lg font-bold animate-bounce">
                      🎉 Spirit Binding Complete! 🎉
                    </div>
                  </div>
                )}

                {spiritBindingState.phase === "failure" && (
                  <div className="text-center">
                    <div className="text-red-400 text-lg font-bold animate-pulse">
                      💀 Extraction Failed 💀
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Statistics Modal */}
        {showStats && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-zinc-100">
                  <i className="fas fa-chart-bar mr-2 text-purple-400"></i>
                  Hunter Statistics
                </h2>
                <button
                  onClick={() => setShowStats(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Combat Statistics */}
                <Card>
                  <h3 className="text-lg font-bold text-zinc-100 mb-4">
                    <i className="fas fa-sword mr-2 text-red-400"></i>
                    Combat Stats
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Gates Completed:</span>
                      <span className="text-green-400 font-bold">
                        {playerStats.totalGatesCompleted}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Gates Failed:</span>
                      <span className="text-red-400 font-bold">
                        {playerStats.totalGatesFailed}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Success Rate:</span>
                      <span className="text-blue-400 font-bold">
                        {playerStats.totalGatesCompleted +
                          playerStats.totalGatesFailed >
                        0
                          ? Math.round(
                              (playerStats.totalGatesCompleted /
                                (playerStats.totalGatesCompleted +
                                  playerStats.totalGatesFailed)) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Highest Rank:</span>
                      <span className="text-yellow-400 font-bold">
                        {playerStats.highestGateRank}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Progress Statistics */}
                <Card>
                  <h3 className="text-lg font-bold text-zinc-100 mb-4">
                    <i className="fas fa-trophy mr-2 text-yellow-400"></i>
                    Progress Stats
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Total EXP Gained:</span>
                      <span className="text-green-400 font-bold">
                        {fmt(playerStats.totalExpGained)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Total Gold Gained:</span>
                      <span className="text-yellow-400 font-bold">
                        {fmt(playerStats.totalGoldGained)}₲
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Spirits Bound:</span>
                      <span className="text-purple-400 font-bold">
                        {playerStats.totalSpiritsBound}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Current Level:</span>
                      <span className="text-blue-400 font-bold">
                        {player.level}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Achievements */}
              {achievements && achievements.length > 0 && (
                <Card className="mt-6">
                  <h3 className="text-lg font-bold text-zinc-100 mb-4">
                    <i className="fas fa-medal mr-2 text-yellow-400"></i>
                    Achievements ({achievements?.length || 0})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {achievements &&
                      achievements.map((achievement) => (
                        <div
                          key={achievement.id}
                          className="bg-zinc-800/50 border border-yellow-500/30 rounded-lg p-3"
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <i className="fas fa-trophy text-yellow-400"></i>
                            <span className="font-bold text-yellow-300">
                              {achievement.name}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400">
                            {achievement.description}
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            Unlocked:{" "}
                            {new Date(
                              achievement.unlockedAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                  </div>
                </Card>
              )}

              <div className="mt-6 text-center">
                <p className="text-xs text-zinc-500">
                  Last updated:{" "}
                  {new Date(playerStats.lastUpdated).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Level-Up Celebration Modal */}
        {levelUpState.isActive && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Background Effects */}
              <div className="absolute inset-0">
                {/* Animated particles */}
                <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-yellow-400 rounded-full animate-bounce opacity-80"></div>
                <div
                  className="absolute top-1/3 right-1/3 w-2 h-2 bg-orange-400 rounded-full animate-bounce opacity-60"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="absolute bottom-1/4 left-1/3 w-2.5 h-2.5 bg-red-400 rounded-full animate-bounce opacity-70"
                  style={{ animationDelay: "0.4s" }}
                ></div>
                <div
                  className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-pink-400 rounded-full animate-bounce opacity-50"
                  style={{ animationDelay: "0.6s" }}
                ></div>
                <div
                  className="absolute top-1/2 left-1/2 w-4 h-4 bg-purple-400 rounded-full animate-bounce opacity-90"
                  style={{ animationDelay: "0.8s" }}
                ></div>

                {/* Ripple effects */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 border-4 border-yellow-500/40 rounded-full animate-pulse"></div>
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border-2 border-orange-400/30 rounded-full animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                ></div>
              </div>

              {/* Main Content */}
              <div className="relative z-10 text-center max-w-2xl mx-4">
                {/* Celebration Background */}
                <div className="mb-8 p-8 rounded-lg border-2 bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border-yellow-500/60">
                  {/* Level Icon */}
                  <div className="w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse shadow-2xl">
                    <i className="fas fa-star text-6xl text-white animate-spin"></i>
                  </div>

                  {/* Level Up Text */}
                  <h2 className="text-5xl font-bold mb-4 text-yellow-300 animate-celebration-bounce">
                    LEVEL UP!
                  </h2>

                  <div className="text-3xl font-bold text-orange-300 mb-4">
                    Level {levelUpState.newLevel}
                  </div>

                  <div className="text-xl text-yellow-200 mb-6">
                    +{levelUpState.statPointsGained} Stat Points Available!
                  </div>

                  {/* Stat Allocation Section */}
                  {levelUpState.showStatAllocation && (
                    <div className="mt-8 p-6 bg-zinc-800/50 rounded-lg border border-yellow-500/30">
                      <h3 className="text-xl font-bold text-yellow-300 mb-4">
                        Allocate Your Stat Points
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                        {Object.entries(player.stats).map(([stat, value]) => (
                          <div key={stat} className="text-center">
                            <div className="text-sm text-zinc-400 mb-1">
                              {stat}
                            </div>
                            <div className="text-lg font-bold text-white mb-2">
                              {value}
                            </div>
                            <button
                              onClick={() =>
                                allocateStatWithFeedback(
                                  stat as keyof Player["stats"]
                                )
                              }
                              disabled={player.points <= 0}
                              className="w-8 h-8 bg-yellow-600 hover:bg-yellow-500 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded-full transition-colors font-bold"
                            >
                              +
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="text-center">
                        <div className="text-sm text-zinc-400 mb-2">
                          Points Remaining:{" "}
                          <span className="text-yellow-400 font-bold">
                            {player.points}
                          </span>
                        </div>

                        <button
                          onClick={completeLevelUp}
                          className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                        >
                          Continue Adventure
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Auto-progress to stat allocation */}
                  {!levelUpState.showStatAllocation && (
                    <div className="text-center">
                      <div className="text-yellow-200 text-lg animate-pulse">
                        Preparing stat allocation...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8">
          <Card>
            <div className="text-center text-zinc-400 text-sm">
              <p className="mb-2">
                Hunter's Path — An idle/roguelite RPG built for Canvas
                preview
              </p>
              <div className="flex justify-center space-x-4 text-xs flex-wrap">
                <span>Complete Daily Quest before dungeons</span>
                <span>•</span>
                <span>Allocate stat points after leveling</span>
                <span>•</span>
                <span>Bind spirits from defeated bosses</span>
              </div>
              <p className="mt-2 text-xs">
                "Virtus in arduis" — strength through trials.
              </p>
            </div>
          </Card>
        </footer>
      </div>

      {/* Audio managed by audioManager singleton — no DOM elements needed */}

      {/* Debug Panel */}
      {process.env.NODE_ENV === "development" && showDebugPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-600 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-zinc-100">
                <i className="fas fa-bug mr-2 text-red-400"></i>
                Debug Panel
              </h2>
              <button
                onClick={() => setShowDebugPanel(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              {/* Player Stats */}
              <div className="bg-zinc-800 p-4 rounded border border-zinc-600">
                <h3 className="text-lg font-bold text-zinc-100 mb-2">
                  Player Stats
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Level: {player.level}</div>
                  <div>Gold: {gold}</div>
                  <div>
                    HP: {player.hp}/{player.maxHp}
                  </div>
                  <div>
                    MP: {player.mp}/{player.maxMp}
                  </div>
                  <div>Fatigue: {player.fatigue}</div>
                  <div>Stat Points: {player.points}</div>
                </div>
              </div>

              {/* Add Items */}
              <div className="bg-zinc-800 p-4 rounded border border-zinc-600">
                <h3 className="text-lg font-bold text-zinc-100 mb-2">
                  Add Items
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(["potion", "rune", "key", "equipment"] as const).map(
                    (type) => (
                      <div key={type} className="space-y-1">
                        <div className="text-sm font-medium text-zinc-300 capitalize">
                          {type}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(
                            [
                              "common",
                              "uncommon",
                              "rare",
                              "epic",
                              "legendary",
                            ] as const
                          ).map((rarity) => (
                            <button
                              key={rarity}
                              onClick={() => addDebugItem(type, rarity)}
                              className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded"
                            >
                              {rarity}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Player Level */}
              <div className="bg-zinc-800 p-4 rounded border border-zinc-600">
                <h3 className="text-lg font-bold text-zinc-100 mb-2">
                  Set Player Level
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[1, 5, 10, 15, 20, 25].map((level) => (
                    <button
                      key={level}
                      onClick={() => setDebugPlayerLevel(level)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                    >
                      Level {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Gold */}
              <div className="bg-zinc-800 p-4 rounded border border-zinc-600">
                <h3 className="text-lg font-bold text-zinc-100 mb-2">
                  Add Gold
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[100, 500, 1000, 5000, 10000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => addDebugGold(amount)}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-sm"
                    >
                      +{amount}₲
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Gates */}
              <div className="bg-zinc-800 p-4 rounded border border-zinc-600">
                <h3 className="text-lg font-bold text-zinc-100 mb-2">
                  Generate Gates
                </h3>
                <button
                  onClick={generateDebugGates}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded"
                >
                  Generate All Ranks (E-S)
                </button>
              </div>

              {/* Clear Data */}
              <div className="bg-zinc-800 p-4 rounded border border-zinc-600">
                <h3 className="text-lg font-bold text-zinc-100 mb-2">
                  Clear Data
                </h3>
                <button
                  onClick={clearDebugData}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded"
                >
                  Clear All Items & Gold
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
