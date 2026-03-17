// Types and interfaces extracted from HuntersPath.tsx

export interface BossMechanic {
  id: string;
  name: string;
  description: string;
  trigger: "phase" | "hp_threshold" | "every_n_ticks" | "random_chance";
  triggerValue: number;
  activated?: boolean;
}

export interface Boss {
  name: string;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  mechanics?: BossMechanic[];
  phase?: number;
  mechanicState?: Record<string, number>;
}

export interface DungeonModifier {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: "buff" | "debuff" | "neutral";
  applyToRewards: (expMult: number, goldMult: number) => { expMult: number; goldMult: number };
  applyToCombat: (playerDmgMult: number, bossDmgMult: number) => { playerDmgMult: number; bossDmgMult: number };
}

export interface Gate {
  id: string;
  name: string;
  rank: string;
  rankIdx: number;
  recommended: number;
  power: number;
  boss: Boss;
  modifiers: DungeonModifier[];
}

export interface SpiritAbility {
  id: string;
  name: string;
  description: string;
  type: "passive" | "active";
  effect: string;
  cooldown?: number;
}

export interface Spirit {
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

export interface Item {
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

export interface Equipment {
  weapon?: Item;
  armor?: Item;
  accessory?: Item;
}

export interface Player {
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
  rebirths: number;        // Number of times rebirthing
  prestigePoints: number;  // Total prestige points earned
  clearedRanks?: string[]; // Ranks cleared for first time (E, D, C, B, A, S)
}

export interface DailyTask {
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

export interface Daily {
  active: boolean;
  availableQuests: DailyTask[];
  completedQuests: string[]; // IDs of completed quests
  completed: boolean;
  penaltyArmed: boolean;
  completedDate?: string; // Track when it was completed to allow reset
  questReputation: number; // New: tracks quest completion reputation
  lastResetDate?: string; // Track when daily quests were last reset
}

export interface GameTime {
  day: number;
  currentDate: string;
  lastReset: string;
}

export interface RunningState {
  gate: Gate;
  boss: Boss;
  hpEnemy: number;
  tick: number;
}

export interface CombatResult {
  victory: boolean;
  gate: Gate;
  boss: Boss;
  expGained: number;
  goldGained: number;
  drops: Item[];
  spiritBound?: Spirit;
  combatLog: string[];
}

// PlayerStatistics kept for backward compat with old saves; replaced by GameStats at runtime
export interface PlayerStatistics {
  totalGatesCompleted: number;
  totalGatesFailed: number;
  totalExpGained: number;
  totalGoldGained: number;
  totalSpiritsBound: number;
  highestGateRank: string;
  lastUpdated: string;
}

export interface PrestigeUpgrade {
  id: string;
  name: string;
  description: string;
  costPer: number;
  maxLevel: number;
}
