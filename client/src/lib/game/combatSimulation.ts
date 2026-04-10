import { clamp, rand } from '@/lib/game/gameUtils';
import { DUNGEON_MODIFIERS } from '@/lib/game/gateSystem';
import { gainExpGoldFromGate } from '@/lib/game/gameLogic';
import type { Boss, DungeonModifier, Spirit } from '@/lib/game/types';

// ── Spirit passive ability aggregation ──────────────────────────────

export interface SpiritPassives {
  dmgBonus: number;
  blockChance: number;
  healPerTick: number;
}

/**
 * Aggregate passive spirit abilities into combat bonuses.
 * Pure function — takes spirit list, player HP ratio, and current tick.
 */
export function calcSpiritPassives(
  spirits: Spirit[],
  playerHpRatio: number,
  tick: number,
): SpiritPassives {
  let dmgBonus = 0;
  let blockChance = 0;
  let healPerTick = 0;

  for (const spirit of spirits) {
    for (const ability of spirit.abilities || []) {
      if (ability.type !== 'passive') continue;
      switch (ability.id) {
        case 'berserker_rage':
          if (playerHpRatio < 0.5) dmgBonus += 0.25;
          break;
        case 'ethereal_shield':
          blockChance += 0.15;
          break;
        case 'shadow_step':
          if (tick % 3 === 0) dmgBonus += 0.10;
          break;
        case 'vitality_aura':
          healPerTick += 2;
          break;
        // mana_shield handled implicitly by MP upkeep
      }
    }
  }

  // Cap combined block chance at 75% max
  blockChance = Math.min(blockChance, 0.75);
  // Cap spirit damage bonus at 100% max
  dmgBonus = Math.min(dmgBonus, 1.0);

  return { dmgBonus, blockChance, healPerTick };
}

// ── Dungeon modifier application ────────────────────────────────────

export interface CombatMultipliers {
  playerDmgMult: number;
  bossDmgMult: number;
}

/**
 * Apply dungeon modifiers to combat damage multipliers.
 * Re-looks up live modifier by ID to restore functions lost during serialization.
 */
export function applyCombatModifiers(
  modifiers: DungeonModifier[],
  baseSpiritDmgBonus: number,
): CombatMultipliers {
  let playerDmgMult = 1 + baseSpiritDmgBonus;
  let bossDmgMult = 1;

  for (const mod of modifiers) {
    const liveMod = DUNGEON_MODIFIERS.find(m => m.id === mod.id) ?? mod;
    if (typeof liveMod.applyToCombat !== 'function') continue;
    const result = liveMod.applyToCombat(playerDmgMult, bossDmgMult);
    playerDmgMult = result.playerDmgMult;
    bossDmgMult = result.bossDmgMult;
  }

  return { playerDmgMult, bossDmgMult };
}

// ── Damage calculations ─────────────────────────────────────────────

/**
 * Calculate player's damage dealt to boss this tick.
 */
export function calcPlayerDamage(
  pPower: number,
  playerDmgMult: number,
  bossDef: number,
): number {
  return Math.max(1, Math.floor(pPower * 1.2 * playerDmgMult - bossDef * 0.3 + rand(0, 6)));
}

/**
 * Calculate boss's damage dealt to player this tick.
 * Returns 0 if blocked.
 */
export function calcBossDamage(
  bossAtk: number,
  bossDmgMult: number,
  playerVIT: number,
  blocked: boolean,
): number {
  if (blocked) return 0;
  return Math.max(0, Math.floor(bossAtk * 0.8 * bossDmgMult - playerVIT * 0.7 + rand(0, 3)));
}

/**
 * Determine whether a boss attack is blocked based on block chance.
 */
export function rollBlock(blockChance: number): boolean {
  return blockChance > 0 && Math.random() < blockChance;
}

/**
 * Determine whether player damage is a critical hit.
 */
export function isCriticalHit(dmgPlayer: number, pPower: number): boolean {
  return dmgPlayer > pPower * 1.5;
}

// ── Healing ─────────────────────────────────────────────────────────

/**
 * Calculate spirit healing applied this tick.
 * Returns the actual amount healed (may be less than spiritHealPerTick if near max HP).
 */
export function calcSpiritHealing(
  spiritHealPerTick: number,
  currentHp: number,
  maxHp: number,
): number {
  if (spiritHealPerTick <= 0 || currentHp <= 0) return 0;
  return Math.min(spiritHealPerTick, maxHp - currentHp);
}

// ── Resource updates ────────────────────────────────────────────────

/**
 * Calculate new fatigue after a combat tick.
 */
export function calcFatigueGain(
  currentFatigue: number,
  fatigueResistLevel: number,
): number {
  const fatigueGainMult = 1 - fatigueResistLevel * 0.05;
  return clamp(currentFatigue + 0.5 * fatigueGainMult, 0, 100);
}

// ── Boss HP phase thresholds ────────────────────────────────────────

/**
 * Return which HP thresholds (75, 50, 25) were crossed this tick.
 */
export function detectPhaseTransitions(
  oldHpEnemy: number,
  newHpEnemy: number,
  bossMaxHp: number,
): number[] {
  if (bossMaxHp <= 0) return [];
  const oldPct = (oldHpEnemy / bossMaxHp) * 100;
  const newPct = (newHpEnemy / bossMaxHp) * 100;
  const crossed: number[] = [];
  for (const threshold of [75, 50, 25]) {
    if (oldPct > threshold && newPct <= threshold) {
      crossed.push(threshold);
    }
  }
  return crossed;
}

// ── Victory reward calculation ──────────────────────────────────────

export interface RewardMultipliers {
  expMult: number;
  goldMult: number;
}

/**
 * Apply dungeon modifiers to reward multipliers.
 */
export function applyRewardModifiers(
  modifiers: DungeonModifier[],
  baseExpMult: number,
  baseGoldMult: number,
): RewardMultipliers {
  let expMult = baseExpMult;
  let goldMult = baseGoldMult;

  for (const mod of modifiers) {
    const liveMod = DUNGEON_MODIFIERS.find(m => m.id === mod.id) ?? mod;
    if (typeof liveMod.applyToRewards !== 'function') continue;
    const result = liveMod.applyToRewards(expMult, goldMult);
    expMult = result.expMult;
    goldMult = result.goldMult;
  }

  return { expMult, goldMult };
}

/**
 * Calculate final victory rewards (exp + gold) from gate, prestige upgrades,
 * and dungeon modifiers.
 */
export function calcVictoryRewards(
  gate: { recommended: number; modifiers: DungeonModifier[] },
  prestigeUpgrades: Record<string, number>,
): { exp: number; gold: number } {
  const { exp: rawExp, gold: rawGold } = gainExpGoldFromGate(gate);
  const expBoost = 1 + (prestigeUpgrades['exp_boost'] || 0) * 0.05;
  const goldBoostMult = 1 + (prestigeUpgrades['gold_boost'] || 0) * 0.05;

  const { expMult, goldMult } = applyRewardModifiers(
    gate.modifiers,
    expBoost,
    goldBoostMult,
  );

  return {
    exp: Math.floor(rawExp * expMult),
    gold: Math.floor(rawGold * goldMult),
  };
}

// ── Defeat penalty ──────────────────────────────────────────────────

/**
 * Calculate player state after defeat.
 */
export function calcDefeatPenalty(
  currentGold: number,
  maxHp: number,
  currentMp: number,
  maxMp: number,
): { gold: number; hp: number; mp: number } {
  return {
    gold: Math.max(0, currentGold - 10),
    hp: Math.max(5, Math.floor(maxHp * 0.3)),
    mp: Math.min(currentMp + Math.floor(maxMp * 0.2), maxMp),
  };
}

/**
 * Calculate player state after victory.
 */
export function calcVictoryHealing(
  currentMp: number,
  maxHp: number,
  maxMp: number,
): { hp: number; mp: number } {
  return {
    hp: maxHp,
    mp: Math.min(currentMp + Math.floor(maxMp * 0.3), maxMp),
  };
}

// ── Gate refresh cost ───────────────────────────────────────────────

/**
 * Calculate the gold cost to refresh the gate pool.
 */
export function gateRefreshCost(playerLevel: number): number {
  return Math.max(10, playerLevel * 5);
}
