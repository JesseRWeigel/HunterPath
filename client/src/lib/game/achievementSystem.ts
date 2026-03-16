// Achievement system — client-side only, persisted via localStorage

export type AchievementCategory = "combat" | "progression" | "collection" | "daily";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  maxProgress: number;
}

export interface AchievementState {
  id: string;
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

/** All achievement definitions. */
export const ACHIEVEMENTS: AchievementDef[] = [
  // --- Combat ---
  { id: "first_gate_clear", name: "First Blood", description: "Clear your first gate", category: "combat", maxProgress: 1 },
  { id: "gates_10", name: "Gate Runner", description: "Clear 10 gates", category: "combat", maxProgress: 10 },
  { id: "gates_50", name: "Gate Breaker", description: "Clear 50 gates", category: "combat", maxProgress: 50 },
  { id: "gates_100", name: "Gate Overlord", description: "Clear 100 gates", category: "combat", maxProgress: 100 },
  { id: "boss_e", name: "E-Rank Vanquisher", description: "Defeat an E-Rank boss", category: "combat", maxProgress: 1 },
  { id: "boss_d", name: "D-Rank Vanquisher", description: "Defeat a D-Rank boss", category: "combat", maxProgress: 1 },
  { id: "boss_c", name: "C-Rank Vanquisher", description: "Defeat a C-Rank boss", category: "combat", maxProgress: 1 },
  { id: "boss_b", name: "B-Rank Vanquisher", description: "Defeat a B-Rank boss", category: "combat", maxProgress: 1 },
  { id: "boss_a", name: "A-Rank Vanquisher", description: "Defeat an A-Rank boss", category: "combat", maxProgress: 1 },
  { id: "boss_s", name: "S-Rank Vanquisher", description: "Defeat an S-Rank boss", category: "combat", maxProgress: 1 },
  { id: "no_damage_clear", name: "Untouchable", description: "Clear a gate without taking damage", category: "combat", maxProgress: 1 },

  // --- Progression ---
  { id: "level_5", name: "Rookie Hunter", description: "Reach level 5", category: "progression", maxProgress: 5 },
  { id: "level_10", name: "Seasoned Hunter", description: "Reach level 10", category: "progression", maxProgress: 10 },
  { id: "level_20", name: "Veteran Hunter", description: "Reach level 20", category: "progression", maxProgress: 20 },
  { id: "level_35", name: "Elite Hunter", description: "Reach level 35", category: "progression", maxProgress: 35 },
  { id: "level_50", name: "Legendary Hunter", description: "Reach level 50", category: "progression", maxProgress: 50 },
  { id: "first_rebirth", name: "Reborn", description: "Complete your first rebirth", category: "progression", maxProgress: 1 },

  // --- Collection ---
  { id: "spirit_1", name: "Spirit Caller", description: "Bind your first spirit", category: "collection", maxProgress: 1 },
  { id: "spirit_5", name: "Spirit Tamer", description: "Bind 5 spirits", category: "collection", maxProgress: 5 },
  { id: "spirit_10", name: "Spirit Legion", description: "Bind 10 spirits", category: "collection", maxProgress: 10 },
  { id: "legendary_item", name: "Jackpot", description: "Obtain a legendary item", category: "collection", maxProgress: 1 },
  { id: "full_equip", name: "Fully Loaded", description: "Equip weapon, armor, and accessory", category: "collection", maxProgress: 3 },

  // --- Daily ---
  { id: "daily_all_5", name: "Diligent Hunter", description: "Complete all 5 daily quests in one day", category: "daily", maxProgress: 5 },
  { id: "login_streak_7", name: "Devoted Hunter", description: "Log in 7 days in a row", category: "daily", maxProgress: 7 },
  { id: "reputation_50", name: "Renowned Hunter", description: "Reach 50 quest reputation", category: "daily", maxProgress: 50 },
];

/**
 * Minimal game state shape consumed by achievement checks.
 * Kept intentionally loose so HuntersPath can pass its own state object.
 */
export interface AchievementGameState {
  player: {
    level: number;
    hp: number;
    maxHp: number;
    rebirths: number;
    spirits: Array<{ power: number }>;
    inv: Array<{ rarity: string; type?: string }>;
    equipment: { weapon?: unknown; armor?: unknown; accessory?: unknown };
    clearedRanks?: string[];
  };
  playerStats: {
    totalGatesCompleted: number;
    totalSpiritsBound: number;
    highestGateRank: string;
  };
  daily: {
    completedQuests: string[];
    questReputation: number;
  };
  loginStreak: number;
  /** Set to true when the most recent gate was cleared without taking damage */
  noDamageClear?: boolean;
}

/** Compute the current progress value for a single achievement. */
export function getAchievementProgress(
  achievementId: string,
  gameState: AchievementGameState,
): number {
  const { player, playerStats, daily, loginStreak } = gameState;

  switch (achievementId) {
    // Combat
    case "first_gate_clear":
    case "gates_10":
    case "gates_50":
    case "gates_100":
      return playerStats.totalGatesCompleted;
    case "boss_e":
      return (player.clearedRanks ?? []).includes("E") ? 1 : 0;
    case "boss_d":
      return (player.clearedRanks ?? []).includes("D") ? 1 : 0;
    case "boss_c":
      return (player.clearedRanks ?? []).includes("C") ? 1 : 0;
    case "boss_b":
      return (player.clearedRanks ?? []).includes("B") ? 1 : 0;
    case "boss_a":
      return (player.clearedRanks ?? []).includes("A") ? 1 : 0;
    case "boss_s":
      return (player.clearedRanks ?? []).includes("S") ? 1 : 0;
    case "no_damage_clear":
      return gameState.noDamageClear ? 1 : 0;

    // Progression
    case "level_5":
    case "level_10":
    case "level_20":
    case "level_35":
    case "level_50":
      return player.level;
    case "first_rebirth":
      return player.rebirths > 0 ? 1 : 0;

    // Collection
    case "spirit_1":
    case "spirit_5":
    case "spirit_10":
      return playerStats.totalSpiritsBound;
    case "legendary_item":
      return player.inv.some((i) => i.rarity === "legendary") ? 1 : 0;
    case "full_equip": {
      let count = 0;
      if (player.equipment.weapon) count++;
      if (player.equipment.armor) count++;
      if (player.equipment.accessory) count++;
      return count;
    }

    // Daily
    case "daily_all_5":
      return daily.completedQuests.length;
    case "login_streak_7":
      return loginStreak;
    case "reputation_50":
      return daily.questReputation;

    default:
      return 0;
  }
}

export interface CheckResult {
  updated: AchievementState[];
  newlyUnlocked: AchievementDef[];
}

/**
 * Evaluate all achievements against current game state.
 * Returns the full updated array plus a list of newly-unlocked definitions.
 */
export function checkAchievements(
  gameState: AchievementGameState,
  currentAchievements: AchievementState[],
): CheckResult {
  const now = new Date().toISOString();
  const newlyUnlocked: AchievementDef[] = [];

  // Build a map for fast lookup
  const stateMap = new Map<string, AchievementState>();
  for (const a of currentAchievements) {
    stateMap.set(a.id, a);
  }

  const updated: AchievementState[] = ACHIEVEMENTS.map((def) => {
    const existing = stateMap.get(def.id);
    const progress = Math.min(getAchievementProgress(def.id, gameState), def.maxProgress);

    if (existing?.unlocked) {
      // Already unlocked — keep as-is but update progress (for display)
      return { ...existing, progress };
    }

    const unlocked = progress >= def.maxProgress;
    if (unlocked && !existing?.unlocked) {
      newlyUnlocked.push(def);
    }

    return {
      id: def.id,
      progress,
      unlocked,
      unlockedAt: unlocked ? (existing?.unlockedAt ?? now) : null,
    };
  });

  return { updated, newlyUnlocked };
}
