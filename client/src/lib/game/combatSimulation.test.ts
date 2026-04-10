import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  calcSpiritPassives,
  applyCombatModifiers,
  calcPlayerDamage,
  calcBossDamage,
  rollBlock,
  isCriticalHit,
  calcSpiritHealing,
  calcFatigueGain,
  detectPhaseTransitions,
  applyRewardModifiers,
  calcVictoryRewards,
  calcDefeatPenalty,
  calcVictoryHealing,
  gateRefreshCost,
} from './combatSimulation';
import type { Spirit, DungeonModifier } from './types';

function makeSpirit(overrides: Partial<Spirit> = {}): Spirit {
  return {
    id: 'test-spirit',
    name: 'Test Spirit',
    power: 10,
    rarity: 'common',
    abilities: [],
    level: 1,
    exp: 0,
    expToNext: 100,
    type: 'warrior',
    description: 'A test spirit',
    ...overrides,
  };
}

describe('combatSimulation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── calcSpiritPassives ──────────────────────────────────────────

  describe('calcSpiritPassives', () => {
    it('returns zeros with no spirits', () => {
      const result = calcSpiritPassives([], 1.0, 0);
      expect(result).toEqual({ dmgBonus: 0, blockChance: 0, healPerTick: 0 });
    });

    it('returns zeros with spirits that have no passive abilities', () => {
      const spirit = makeSpirit({
        abilities: [{ id: 'active_skill', name: 'Slash', description: '', type: 'active', effect: '' }],
      });
      const result = calcSpiritPassives([spirit], 1.0, 0);
      expect(result).toEqual({ dmgBonus: 0, blockChance: 0, healPerTick: 0 });
    });

    it('activates berserker_rage when HP ratio < 0.5', () => {
      const spirit = makeSpirit({
        abilities: [{ id: 'berserker_rage', name: 'Berserker Rage', description: '', type: 'passive', effect: '' }],
      });
      const result = calcSpiritPassives([spirit], 0.3, 0);
      expect(result.dmgBonus).toBe(0.25);
    });

    it('does not activate berserker_rage when HP ratio >= 0.5', () => {
      const spirit = makeSpirit({
        abilities: [{ id: 'berserker_rage', name: 'Berserker Rage', description: '', type: 'passive', effect: '' }],
      });
      const result = calcSpiritPassives([spirit], 0.5, 0);
      expect(result.dmgBonus).toBe(0);
    });

    it('adds ethereal_shield block chance', () => {
      const spirit = makeSpirit({
        abilities: [{ id: 'ethereal_shield', name: 'Ethereal Shield', description: '', type: 'passive', effect: '' }],
      });
      const result = calcSpiritPassives([spirit], 1.0, 0);
      expect(result.blockChance).toBeCloseTo(0.15);
    });

    it('caps block chance at 0.75', () => {
      const spirits = Array.from({ length: 6 }, () =>
        makeSpirit({
          abilities: [{ id: 'ethereal_shield', name: 'Ethereal Shield', description: '', type: 'passive', effect: '' }],
        })
      );
      // 6 * 0.15 = 0.9, capped at 0.75
      const result = calcSpiritPassives(spirits, 1.0, 0);
      expect(result.blockChance).toBe(0.75);
    });

    it('activates shadow_step on tick divisible by 3', () => {
      const spirit = makeSpirit({
        abilities: [{ id: 'shadow_step', name: 'Shadow Step', description: '', type: 'passive', effect: '' }],
      });
      expect(calcSpiritPassives([spirit], 1.0, 0).dmgBonus).toBe(0.10);
      expect(calcSpiritPassives([spirit], 1.0, 3).dmgBonus).toBe(0.10);
      expect(calcSpiritPassives([spirit], 1.0, 1).dmgBonus).toBe(0);
    });

    it('adds vitality_aura heal per tick', () => {
      const spirit = makeSpirit({
        abilities: [{ id: 'vitality_aura', name: 'Vitality Aura', description: '', type: 'passive', effect: '' }],
      });
      const result = calcSpiritPassives([spirit], 1.0, 0);
      expect(result.healPerTick).toBe(2);
    });

    it('caps dmgBonus at 1.0', () => {
      // 5 berserker spirits at low HP = 5 * 0.25 = 1.25, capped at 1.0
      const spirits = Array.from({ length: 5 }, () =>
        makeSpirit({
          abilities: [{ id: 'berserker_rage', name: 'Berserker Rage', description: '', type: 'passive', effect: '' }],
        })
      );
      const result = calcSpiritPassives(spirits, 0.1, 0);
      expect(result.dmgBonus).toBe(1.0);
    });

    it('stacks multiple different passives', () => {
      const spirits = [
        makeSpirit({
          abilities: [
            { id: 'berserker_rage', name: 'Berserker Rage', description: '', type: 'passive', effect: '' },
            { id: 'ethereal_shield', name: 'Ethereal Shield', description: '', type: 'passive', effect: '' },
          ],
        }),
        makeSpirit({
          abilities: [{ id: 'vitality_aura', name: 'Vitality Aura', description: '', type: 'passive', effect: '' }],
        }),
      ];
      const result = calcSpiritPassives(spirits, 0.3, 0);
      expect(result.dmgBonus).toBe(0.25);
      expect(result.blockChance).toBeCloseTo(0.15);
      expect(result.healPerTick).toBe(2);
    });
  });

  // ── applyCombatModifiers ────────────────────────────────────────

  describe('applyCombatModifiers', () => {
    it('applies base spirit damage bonus with no modifiers', () => {
      const result = applyCombatModifiers([], 0.25);
      expect(result.playerDmgMult).toBeCloseTo(1.25);
      expect(result.bossDmgMult).toBe(1);
    });

    it('applies empowered_boss modifier', () => {
      const mod: DungeonModifier = {
        id: 'empowered_boss', name: '', description: '', icon: '', type: 'debuff',
        applyToRewards: (e, g) => ({ expMult: e, goldMult: g }),
        applyToCombat: (p, b) => ({ playerDmgMult: p, bossDmgMult: b * 1.4 }),
      };
      const result = applyCombatModifiers([mod], 0);
      expect(result.bossDmgMult).toBeCloseTo(1.4);
    });

    it('applies cursed_ground modifier', () => {
      const mod: DungeonModifier = {
        id: 'cursed_ground', name: '', description: '', icon: '', type: 'debuff',
        applyToRewards: (e, g) => ({ expMult: e, goldMult: g }),
        applyToCombat: (p, b) => ({ playerDmgMult: p * 0.75, bossDmgMult: b }),
      };
      const result = applyCombatModifiers([mod], 0);
      expect(result.playerDmgMult).toBeCloseTo(0.75);
    });
  });

  // ── calcPlayerDamage ────────────────────────────────────────────

  describe('calcPlayerDamage', () => {
    it('deals at least 1 damage regardless of defense', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const dmg = calcPlayerDamage(1, 1, 9999);
      expect(dmg).toBe(1);
    });

    it('calculates damage from power, multiplier, and defense', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      // pPower*1.2*mult - def*0.3 + rand(0,6) with rand=0
      // 100*1.2*1 - 10*0.3 + 0 = 120 - 3 = 117
      const dmg = calcPlayerDamage(100, 1, 10);
      expect(dmg).toBe(117);
    });

    it('includes random variance', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1 - Number.EPSILON);
      // rand(0,6) with random~1 => 6
      // 100*1.2*1 - 10*0.3 + 6 = 123
      const dmg = calcPlayerDamage(100, 1, 10);
      expect(dmg).toBe(123);
    });

    it('applies damage multiplier', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const base = calcPlayerDamage(100, 1, 10);
      const boosted = calcPlayerDamage(100, 1.5, 10);
      expect(boosted).toBeGreaterThan(base);
    });
  });

  // ── calcBossDamage ──────────────────────────────────────────────

  describe('calcBossDamage', () => {
    it('returns 0 when blocked', () => {
      const dmg = calcBossDamage(100, 1, 50, true);
      expect(dmg).toBe(0);
    });

    it('returns at least 0 when not blocked', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const dmg = calcBossDamage(1, 1, 9999, false);
      expect(dmg).toBe(0);
    });

    it('calculates damage from atk, multiplier, and VIT', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      // atk*0.8*mult - VIT*0.7 + rand(0,3) with rand=0
      // 50*0.8*1 - 10*0.7 + 0 = 40 - 7 = 33
      const dmg = calcBossDamage(50, 1, 10, false);
      expect(dmg).toBe(33);
    });
  });

  // ── rollBlock ───────────────────────────────────────────────────

  describe('rollBlock', () => {
    it('never blocks with 0 block chance', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      expect(rollBlock(0)).toBe(false);
    });

    it('blocks when random < blockChance', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      expect(rollBlock(0.5)).toBe(true);
    });

    it('does not block when random >= blockChance', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.6);
      expect(rollBlock(0.5)).toBe(false);
    });
  });

  // ── isCriticalHit ───────────────────────────────────────────────

  describe('isCriticalHit', () => {
    it('returns true when damage exceeds 1.5x power', () => {
      expect(isCriticalHit(160, 100)).toBe(true);
    });

    it('returns false when damage equals 1.5x power', () => {
      expect(isCriticalHit(150, 100)).toBe(false);
    });

    it('returns false when damage is below 1.5x power', () => {
      expect(isCriticalHit(100, 100)).toBe(false);
    });
  });

  // ── calcSpiritHealing ──────────────────────────────────────────

  describe('calcSpiritHealing', () => {
    it('returns 0 when heal per tick is 0', () => {
      expect(calcSpiritHealing(0, 50, 100)).toBe(0);
    });

    it('returns 0 when player HP is 0 (dead)', () => {
      expect(calcSpiritHealing(5, 0, 100)).toBe(0);
    });

    it('heals up to the spirit heal amount', () => {
      expect(calcSpiritHealing(5, 50, 100)).toBe(5);
    });

    it('caps healing at missing HP', () => {
      // Only 2 HP missing, but heal is 5
      expect(calcSpiritHealing(5, 98, 100)).toBe(2);
    });

    it('returns 0 when already at full HP', () => {
      expect(calcSpiritHealing(5, 100, 100)).toBe(0);
    });
  });

  // ── calcFatigueGain ─────────────────────────────────────────────

  describe('calcFatigueGain', () => {
    it('adds 0.5 fatigue with no resistance', () => {
      expect(calcFatigueGain(0, 0)).toBeCloseTo(0.5);
    });

    it('reduces fatigue gain with resistance upgrades', () => {
      // resist level 5: mult = 1 - 5*0.05 = 0.75, gain = 0.5*0.75 = 0.375
      expect(calcFatigueGain(0, 5)).toBeCloseTo(0.375);
    });

    it('clamps fatigue at 100', () => {
      expect(calcFatigueGain(99.8, 0)).toBe(100);
    });

    it('does not go below 0', () => {
      // With absurd resist this can't actually go negative due to clamp
      expect(calcFatigueGain(0, 0)).toBeGreaterThanOrEqual(0);
    });
  });

  // ── detectPhaseTransitions ──────────────────────────────────────

  describe('detectPhaseTransitions', () => {
    it('returns empty array when no thresholds crossed', () => {
      expect(detectPhaseTransitions(90, 80, 100)).toEqual([]);
    });

    it('detects 75% threshold', () => {
      expect(detectPhaseTransitions(80, 70, 100)).toEqual([75]);
    });

    it('detects 50% threshold', () => {
      expect(detectPhaseTransitions(55, 45, 100)).toEqual([50]);
    });

    it('detects 25% threshold', () => {
      expect(detectPhaseTransitions(30, 20, 100)).toEqual([25]);
    });

    it('detects multiple thresholds in one tick', () => {
      // From 80% to 20% — crosses 75, 50, and 25
      expect(detectPhaseTransitions(80, 20, 100)).toEqual([75, 50, 25]);
    });

    it('returns empty for zero maxHp', () => {
      expect(detectPhaseTransitions(50, 25, 0)).toEqual([]);
    });
  });

  // ── applyRewardModifiers ────────────────────────────────────────

  describe('applyRewardModifiers', () => {
    it('returns base multipliers with no modifiers', () => {
      const result = applyRewardModifiers([], 1.0, 1.0);
      expect(result.expMult).toBe(1.0);
      expect(result.goldMult).toBe(1.0);
    });

    it('applies double_exp modifier', () => {
      const mod: DungeonModifier = {
        id: 'double_exp', name: '', description: '', icon: '', type: 'buff',
        applyToRewards: (e, g) => ({ expMult: e * 2, goldMult: g }),
        applyToCombat: (p, b) => ({ playerDmgMult: p, bossDmgMult: b }),
      };
      const result = applyRewardModifiers([mod], 1.0, 1.0);
      expect(result.expMult).toBe(2.0);
      expect(result.goldMult).toBe(1.0);
    });
  });

  // ── calcVictoryRewards ──────────────────────────────────────────

  describe('calcVictoryRewards', () => {
    it('applies prestige exp boost', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const gate = { recommended: 100, modifiers: [] };
      const noBoost = calcVictoryRewards(gate, {});
      const boosted = calcVictoryRewards(gate, { exp_boost: 4 });
      // exp_boost 4: mult = 1 + 4*0.05 = 1.20
      expect(boosted.exp).toBeGreaterThan(noBoost.exp);
    });

    it('applies prestige gold boost', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const gate = { recommended: 100, modifiers: [] };
      const noBoost = calcVictoryRewards(gate, {});
      const boosted = calcVictoryRewards(gate, { gold_boost: 4 });
      expect(boosted.gold).toBeGreaterThan(noBoost.gold);
    });

    it('returns positive values', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const result = calcVictoryRewards({ recommended: 1, modifiers: [] }, {});
      expect(result.exp).toBeGreaterThan(0);
      expect(result.gold).toBeGreaterThan(0);
    });
  });

  // ── calcDefeatPenalty ───────────────────────────────────────────

  describe('calcDefeatPenalty', () => {
    it('loses 10 gold on defeat', () => {
      const result = calcDefeatPenalty(100, 100, 50, 50);
      expect(result.gold).toBe(90);
    });

    it('does not go below 0 gold', () => {
      const result = calcDefeatPenalty(5, 100, 50, 50);
      expect(result.gold).toBe(0);
    });

    it('recovers to 30% maxHp', () => {
      const result = calcDefeatPenalty(100, 200, 50, 50);
      expect(result.hp).toBe(60); // floor(200 * 0.3)
    });

    it('guarantees at least 5 HP', () => {
      const result = calcDefeatPenalty(100, 10, 50, 50);
      // floor(10 * 0.3) = 3, clamped to 5
      expect(result.hp).toBe(5);
    });

    it('restores 20% of maxMp', () => {
      const result = calcDefeatPenalty(100, 100, 30, 100);
      // 30 + floor(100 * 0.2) = 30 + 20 = 50
      expect(result.mp).toBe(50);
    });

    it('caps MP at maxMp', () => {
      const result = calcDefeatPenalty(100, 100, 45, 50);
      // 45 + floor(50 * 0.2) = 45 + 10 = 55, capped at 50
      expect(result.mp).toBe(50);
    });
  });

  // ── calcVictoryHealing ──────────────────────────────────────────

  describe('calcVictoryHealing', () => {
    it('heals HP to full', () => {
      const result = calcVictoryHealing(30, 100, 50);
      expect(result.hp).toBe(100);
    });

    it('restores 30% of maxMp', () => {
      const result = calcVictoryHealing(20, 100, 100);
      // 20 + floor(100 * 0.3) = 20 + 30 = 50
      expect(result.mp).toBe(50);
    });

    it('caps MP at maxMp', () => {
      const result = calcVictoryHealing(45, 100, 50);
      // 45 + floor(50 * 0.3) = 45 + 15 = 60, capped at 50
      expect(result.mp).toBe(50);
    });
  });

  // ── gateRefreshCost ─────────────────────────────────────────────

  describe('gateRefreshCost', () => {
    it('returns minimum of 10 for low level', () => {
      expect(gateRefreshCost(1)).toBe(10);
    });

    it('scales with player level', () => {
      expect(gateRefreshCost(10)).toBe(50);
    });

    it('never goes below 10', () => {
      expect(gateRefreshCost(0)).toBe(10);
    });
  });
});
