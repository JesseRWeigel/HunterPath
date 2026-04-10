/**
 * Pure level-up calculation functions extracted from useLevelUp hook.
 * No React state or side effects — just math.
 */

export interface LevelUpInput {
  exp: number;
  level: number;
  expNext: number;
  points: number;
  maxHp: number;
  maxMp: number;
  hp: number;
  mp: number;
}

export interface LevelUpResult {
  exp: number;
  level: number;
  expNext: number;
  points: number;
  maxHp: number;
  maxMp: number;
  hp: number;
  mp: number;
  levelsGained: number;
  leveledUp: boolean;
}

/** EXP scaling factor per level. */
export const EXP_SCALE = 1.35;
/** Stat points awarded per level. */
export const POINTS_PER_LEVEL = 5;
/** Max HP gained per level. */
export const HP_PER_LEVEL = 10;
/** Max MP gained per level. */
export const MP_PER_LEVEL = 5;
/** After leveling, HP is restored to at least this fraction of maxHp. */
export const HP_RESTORE_FRACTION = 0.6;
/** After leveling, MP is restored to at least this fraction of maxMp. */
export const MP_RESTORE_FRACTION = 0.5;

/**
 * Calculate EXP required for the next level given the current threshold.
 */
export function nextExpThreshold(currentExpNext: number): number {
  return Math.floor(currentExpNext * EXP_SCALE);
}

/**
 * Process gaining EXP, potentially leveling up multiple times.
 * Returns the new player values and how many levels were gained.
 */
export function processExpGain(input: LevelUpInput, addExp: number): LevelUpResult {
  let { exp, level, expNext, points, maxHp, maxMp, hp, mp } = input;
  exp += addExp;
  let levelsGained = 0;

  while (exp >= expNext) {
    exp -= expNext;
    level += 1;
    levelsGained += 1;
    expNext = nextExpThreshold(expNext);
    points += POINTS_PER_LEVEL;
    maxHp += HP_PER_LEVEL;
    maxMp += MP_PER_LEVEL;
  }

  // Restore HP/MP to minimum fraction after leveling
  if (levelsGained > 0) {
    hp = Math.max(hp, Math.floor(maxHp * HP_RESTORE_FRACTION));
    mp = Math.max(mp, Math.floor(maxMp * MP_RESTORE_FRACTION));
  }

  return {
    exp, level, expNext, points, maxHp, maxMp, hp, mp,
    levelsGained,
    leveledUp: levelsGained > 0,
  };
}

/**
 * Allocate a single stat point.
 * Returns null if no points available.
 */
export function allocateStat(
  stats: { STR: number; AGI: number; INT: number; VIT: number; LUCK: number },
  points: number,
  stat: keyof typeof stats,
): { stats: typeof stats; points: number } | null {
  if (points <= 0) return null;
  return {
    stats: { ...stats, [stat]: stats[stat] + 1 },
    points: points - 1,
  };
}

/**
 * Calculate the total stat points spent (current stats minus initial 5 each).
 */
export function totalStatPointsSpent(stats: { STR: number; AGI: number; INT: number; VIT: number; LUCK: number }): number {
  const initial = 5;
  return (stats.STR - initial) + (stats.AGI - initial) + (stats.INT - initial) + (stats.VIT - initial) + (stats.LUCK - initial);
}
