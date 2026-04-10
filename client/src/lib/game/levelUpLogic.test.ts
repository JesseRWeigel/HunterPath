import { describe, it, expect } from "vitest";
import {
  nextExpThreshold,
  processExpGain,
  allocateStat,
  totalStatPointsSpent,
  EXP_SCALE,
  POINTS_PER_LEVEL,
  HP_PER_LEVEL,
  MP_PER_LEVEL,
  HP_RESTORE_FRACTION,
  MP_RESTORE_FRACTION,
  type LevelUpInput,
} from "./levelUpLogic";

describe("levelUpLogic", () => {
  const baseInput: LevelUpInput = {
    exp: 0,
    level: 1,
    expNext: 100,
    points: 5,
    maxHp: 100,
    maxMp: 50,
    hp: 100,
    mp: 50,
  };

  describe("nextExpThreshold", () => {
    it("scales EXP requirement by 1.35x", () => {
      expect(nextExpThreshold(100)).toBe(Math.floor(100 * EXP_SCALE));
      expect(nextExpThreshold(100)).toBe(135);
    });

    it("floors the result to an integer", () => {
      // 135 * 1.35 = 182.25 -> 182
      expect(nextExpThreshold(135)).toBe(182);
    });

    it("handles large thresholds", () => {
      expect(nextExpThreshold(10000)).toBe(13500);
    });
  });

  describe("processExpGain", () => {
    it("adds exp without leveling when below threshold", () => {
      const result = processExpGain(baseInput, 50);
      expect(result.exp).toBe(50);
      expect(result.level).toBe(1);
      expect(result.leveledUp).toBe(false);
      expect(result.levelsGained).toBe(0);
    });

    it("levels up when exp meets threshold exactly", () => {
      const result = processExpGain(baseInput, 100);
      expect(result.level).toBe(2);
      expect(result.exp).toBe(0);
      expect(result.leveledUp).toBe(true);
      expect(result.levelsGained).toBe(1);
    });

    it("levels up when exp exceeds threshold with remainder", () => {
      const result = processExpGain(baseInput, 120);
      expect(result.level).toBe(2);
      expect(result.exp).toBe(20);
      expect(result.levelsGained).toBe(1);
    });

    it("handles multiple level-ups from large exp gain", () => {
      // Need 100 for level 2, then 135 for level 3 = 235 total
      const result = processExpGain(baseInput, 250);
      expect(result.level).toBe(3);
      expect(result.exp).toBe(15); // 250 - 100 - 135 = 15
      expect(result.levelsGained).toBe(2);
    });

    it("awards 5 stat points per level", () => {
      const result = processExpGain(baseInput, 100);
      expect(result.points).toBe(baseInput.points + POINTS_PER_LEVEL);
    });

    it("awards correct points for multiple levels", () => {
      const result = processExpGain(baseInput, 250);
      expect(result.points).toBe(baseInput.points + POINTS_PER_LEVEL * 2);
    });

    it("increases maxHp by 10 and maxMp by 5 per level", () => {
      const result = processExpGain(baseInput, 100);
      expect(result.maxHp).toBe(baseInput.maxHp + HP_PER_LEVEL);
      expect(result.maxMp).toBe(baseInput.maxMp + MP_PER_LEVEL);
    });

    it("restores HP to at least 60% of new maxHp after leveling", () => {
      const lowHpInput: LevelUpInput = { ...baseInput, hp: 10 };
      const result = processExpGain(lowHpInput, 100);
      // maxHp = 110, 60% = 66
      expect(result.hp).toBe(Math.floor(result.maxHp * HP_RESTORE_FRACTION));
    });

    it("restores MP to at least 50% of new maxMp after leveling", () => {
      const lowMpInput: LevelUpInput = { ...baseInput, mp: 5 };
      const result = processExpGain(lowMpInput, 100);
      // maxMp = 55, 50% = 27
      expect(result.mp).toBe(Math.floor(result.maxMp * MP_RESTORE_FRACTION));
    });

    it("does not reduce HP if already above restore fraction", () => {
      const fullHpInput: LevelUpInput = { ...baseInput, hp: 100 };
      const result = processExpGain(fullHpInput, 100);
      // hp 100 > floor(110 * 0.6) = 66, so keep 100
      expect(result.hp).toBe(100);
    });

    it("scales exp thresholds correctly across multiple levels", () => {
      const result = processExpGain(baseInput, 250);
      // After level 2: expNext = 135, after level 3: expNext = floor(135*1.35) = 182
      expect(result.expNext).toBe(182);
    });

    it("does not restore HP/MP when no level is gained", () => {
      const lowInput: LevelUpInput = { ...baseInput, hp: 10, mp: 5 };
      const result = processExpGain(lowInput, 50);
      expect(result.hp).toBe(10);
      expect(result.mp).toBe(5);
    });
  });

  describe("allocateStat", () => {
    const stats = { STR: 5, AGI: 5, INT: 5, VIT: 5, LUCK: 5 };

    it("increments the chosen stat by 1", () => {
      const result = allocateStat(stats, 3, "STR");
      expect(result).not.toBeNull();
      expect(result!.stats.STR).toBe(6);
    });

    it("decrements available points by 1", () => {
      const result = allocateStat(stats, 3, "AGI");
      expect(result!.points).toBe(2);
    });

    it("returns null when no points available", () => {
      expect(allocateStat(stats, 0, "STR")).toBeNull();
    });

    it("does not mutate the original stats object", () => {
      const original = { ...stats };
      allocateStat(stats, 3, "INT");
      expect(stats).toEqual(original);
    });

    it("works for each stat type", () => {
      const statKeys: (keyof typeof stats)[] = ["STR", "AGI", "INT", "VIT", "LUCK"];
      for (const key of statKeys) {
        const result = allocateStat(stats, 1, key);
        expect(result!.stats[key]).toBe(stats[key] + 1);
      }
    });
  });

  describe("totalStatPointsSpent", () => {
    it("returns 0 for initial stats (all 5s)", () => {
      expect(totalStatPointsSpent({ STR: 5, AGI: 5, INT: 5, VIT: 5, LUCK: 5 })).toBe(0);
    });

    it("counts points allocated above initial values", () => {
      expect(totalStatPointsSpent({ STR: 10, AGI: 5, INT: 5, VIT: 5, LUCK: 5 })).toBe(5);
    });

    it("sums across all stats", () => {
      expect(totalStatPointsSpent({ STR: 8, AGI: 7, INT: 6, VIT: 9, LUCK: 10 })).toBe(15);
    });
  });
});
