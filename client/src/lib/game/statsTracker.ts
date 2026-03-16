// Statistics tracking system for Hunter's Path

const STORAGE_KEY = "hunters-path-statistics";

export interface GameStats {
  totalGatesCompleted: number;
  totalGatesFailed: number;
  totalExpGained: number;
  totalGoldGained: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalSpiritsBound: number;
  highestGateRank: string;
  fastestVictory: number; // ticks
  longestCombat: number; // ticks
  gatesPerRank: Record<string, number>;
  totalPlayTime: number; // seconds
}

export interface CombatOutcome {
  victory: boolean;
  expGained: number;
  goldGained: number;
  damageDealt: number;
  damageTaken: number;
  ticks: number;
  gateRank: string;
  spiritBound: boolean;
}

const RANK_ORDER = ["E", "D", "C", "B", "A", "S"];

export function createInitialStats(): GameStats {
  return {
    totalGatesCompleted: 0,
    totalGatesFailed: 0,
    totalExpGained: 0,
    totalGoldGained: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    totalSpiritsBound: 0,
    highestGateRank: "E",
    fastestVictory: 0,
    longestCombat: 0,
    gatesPerRank: {},
    totalPlayTime: 0,
  };
}

export function updateStatsAfterCombat(
  stats: GameStats,
  outcome: CombatOutcome
): GameStats {
  const next = { ...stats, gatesPerRank: { ...stats.gatesPerRank } };

  if (outcome.victory) {
    next.totalGatesCompleted += 1;
  } else {
    next.totalGatesFailed += 1;
  }

  next.totalExpGained += outcome.expGained;
  next.totalGoldGained += outcome.goldGained;
  next.totalDamageDealt += outcome.damageDealt;
  next.totalDamageTaken += outcome.damageTaken;

  if (outcome.spiritBound) {
    next.totalSpiritsBound += 1;
  }

  // Update highest gate rank
  const currentIdx = RANK_ORDER.indexOf(stats.highestGateRank);
  const newIdx = RANK_ORDER.indexOf(outcome.gateRank);
  if (newIdx > currentIdx) {
    next.highestGateRank = outcome.gateRank;
  }

  // Update fastest victory (only victories count, 0 means unset)
  if (outcome.victory) {
    if (next.fastestVictory === 0 || outcome.ticks < next.fastestVictory) {
      next.fastestVictory = outcome.ticks;
    }
  }

  // Update longest combat
  if (outcome.ticks > next.longestCombat) {
    next.longestCombat = outcome.ticks;
  }

  // Track gates per rank
  const rank = outcome.gateRank;
  next.gatesPerRank[rank] = (next.gatesPerRank[rank] || 0) + 1;

  return next;
}

export function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function saveStats(stats: GameStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Silently fail if localStorage is full or unavailable
  }
}

export function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialStats();
    const parsed = JSON.parse(raw);
    // Merge with defaults so new fields are always present
    return { ...createInitialStats(), ...parsed };
  } catch {
    return createInitialStats();
  }
}
