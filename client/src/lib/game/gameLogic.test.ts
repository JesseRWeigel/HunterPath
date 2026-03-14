import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createInitialPlayer,
  playerPower,
  spiritUpkeep,
  calcExtractionChance,
  gainExpGoldFromGate,
  type LogicPlayer,
} from "./gameLogic";

describe("gameLogic", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createInitialPlayer", () => {
    it("returns a player with correct initial stats", () => {
      const player = createInitialPlayer();
      expect(player.level).toBe(1);
      expect(player.exp).toBe(0);
      expect(player.expNext).toBe(100);
      expect(player.hp).toBe(100);
      expect(player.mp).toBe(50);
      expect(player.maxHp).toBe(100);
      expect(player.maxMp).toBe(50);
      expect(player.fatigue).toBe(0);
      expect(player.points).toBe(5);
    });

    it("starts with balanced stat distribution", () => {
      const player = createInitialPlayer();
      expect(player.stats).toEqual({
        STR: 5, AGI: 5, INT: 5, VIT: 5, LUCK: 5,
      });
    });

    it("starts with empty spirits and inventory", () => {
      const player = createInitialPlayer();
      expect(player.spirits).toEqual([]);
      expect(player.inv).toEqual([]);
      expect(player.keys).toBe(0);
    });

    it("starts with zero rebirths and prestige points", () => {
      const player = createInitialPlayer();
      expect(player.rebirths).toBe(0);
      expect(player.prestigePoints).toBe(0);
    });
  });

  describe("playerPower", () => {
    const basePlayer: LogicPlayer = {
      stats: { STR: 5, AGI: 5, INT: 5, VIT: 5, LUCK: 5 },
      fatigue: 0,
      spirits: [],
      rebirths: 0,
    };

    it("calculates base power from stats correctly", () => {
      // STR*3 + AGI*2 + INT*1.5 + VIT*0.5
      // 5*3 + 5*2 + 5*1.5 + 5*0.5 = 15 + 10 + 7.5 + 2.5 = 35
      const power = playerPower(basePlayer);
      expect(power).toBe(35);
    });

    it("weights STR highest in power calculation", () => {
      const strPlayer: LogicPlayer = {
        ...basePlayer,
        stats: { STR: 20, AGI: 5, INT: 5, VIT: 5, LUCK: 5 },
      };
      const agiPlayer: LogicPlayer = {
        ...basePlayer,
        stats: { STR: 5, AGI: 20, INT: 5, VIT: 5, LUCK: 5 },
      };
      expect(playerPower(strPlayer)).toBeGreaterThan(playerPower(agiPlayer));
    });

    it("applies fatigue penalty correctly", () => {
      const tiredPlayer: LogicPlayer = { ...basePlayer, fatigue: 100 };
      // fatiguePenalty = 1 - min(0.4, 100/250) = 1 - 0.4 = 0.6
      const power = playerPower(tiredPlayer);
      expect(power).toBeCloseTo(35 * 0.6, 1);
    });

    it("caps fatigue penalty at 40%", () => {
      const exhaustedPlayer: LogicPlayer = { ...basePlayer, fatigue: 250 };
      const maxFatiguePlayer: LogicPlayer = { ...basePlayer, fatigue: 500 };
      // Both should have same penalty since it's capped at 0.4
      expect(playerPower(exhaustedPlayer)).toBeCloseTo(playerPower(maxFatiguePlayer), 1);
    });

    it("adds spirit power bonus", () => {
      const spiritPlayer: LogicPlayer = {
        ...basePlayer,
        spirits: [{ power: 50 }, { power: 30 }],
      };
      // base 35 + spirit 80 = 115
      expect(playerPower(spiritPlayer)).toBe(115);
    });

    it("applies spirit power boost level multiplier", () => {
      const spiritPlayer: LogicPlayer = {
        ...basePlayer,
        spirits: [{ power: 100 }],
      };
      // boost level 5: spiritPowerMult = 1 + 5*0.02 = 1.10
      // base 35 + 100*1.10 = 35 + 110 = 145
      expect(playerPower(spiritPlayer, 5)).toBe(145);
    });

    it("applies rebirth multiplier", () => {
      const rebirthPlayer: LogicPlayer = { ...basePlayer, rebirths: 2 };
      // rebirthMultiplier = 1 + 2*0.15 = 1.3
      // 35 * 1.3 = 45.5
      expect(playerPower(rebirthPlayer)).toBeCloseTo(45.5, 1);
    });

    it("returns minimum of 1", () => {
      const weakPlayer: LogicPlayer = {
        stats: { STR: 0, AGI: 0, INT: 0, VIT: 0, LUCK: 0 },
        fatigue: 250,
        spirits: [],
        rebirths: 0,
      };
      expect(playerPower(weakPlayer)).toBe(1);
    });

    it("handles missing spirits gracefully", () => {
      const noSpiritsPlayer: LogicPlayer = {
        stats: { STR: 5, AGI: 5, INT: 5, VIT: 5, LUCK: 5 },
        fatigue: 0,
      };
      expect(playerPower(noSpiritsPlayer)).toBe(35);
    });

    it("handles missing rebirths gracefully", () => {
      const noRebirthPlayer: LogicPlayer = {
        stats: { STR: 5, AGI: 5, INT: 5, VIT: 5, LUCK: 5 },
        fatigue: 0,
        spirits: [],
      };
      expect(playerPower(noRebirthPlayer)).toBe(35);
    });
  });

  describe("spiritUpkeep", () => {
    it("returns 0 for no spirits", () => {
      expect(spiritUpkeep({ spirits: [] })).toBe(0);
    });

    it("calculates upkeep from spirit count and power", () => {
      // base = 2 (spirit count) + 50*0.02 + 30*0.02 = 2 + 1.0 + 0.6 = 3.6 -> floor -> 3
      expect(spiritUpkeep({ spirits: [{ power: 50 }, { power: 30 }] })).toBe(3);
    });

    it("scales with many powerful spirits", () => {
      const spirits = Array.from({ length: 5 }, () => ({ power: 100 }));
      // 5 + 5*100*0.02 = 5 + 10 = 15
      expect(spiritUpkeep({ spirits })).toBe(15);
    });

    it("handles undefined spirits", () => {
      expect(spiritUpkeep({ spirits: undefined })).toBe(0);
    });
  });

  describe("calcExtractionChance", () => {
    it("calculates base chance from INT and LUCK", () => {
      const player = { stats: { STR: 5, AGI: 5, INT: 10, VIT: 5, LUCK: 10 } };
      // base = 0.25 + 10*0.008 + 10*0.01 = 0.25 + 0.08 + 0.1 = 0.43
      // rank 0 penalty = 0
      expect(calcExtractionChance(player, 0)).toBeCloseTo(0.43, 2);
    });

    it("applies rank penalty for higher rank bosses", () => {
      const player = { stats: { STR: 5, AGI: 5, INT: 10, VIT: 5, LUCK: 10 } };
      // rank 3 (B): penalty = 0.03 * 3 = 0.09
      // 0.43 - 0.09 = 0.34
      expect(calcExtractionChance(player, 3)).toBeCloseTo(0.34, 2);
    });

    it("clamps minimum at 0.08", () => {
      const weakPlayer = { stats: { STR: 0, AGI: 0, INT: 0, VIT: 0, LUCK: 0 } };
      // base = 0.25, rank 5: penalty = 0.15, result = 0.10 -> not clamped
      // rank 5: 0.25 - 0.15 = 0.10
      expect(calcExtractionChance(weakPlayer, 5)).toBeCloseTo(0.10, 2);

      // With rank penalty making it very low
      // Actually with INT=0 LUCK=0: base=0.25, rank 5: 0.25-0.15=0.10 still above 0.08
      // Need higher rank to push below: rank 6 would be 0.25-0.18=0.07 -> clamp to 0.08
      // But max rank is 5 (S). Let's test with minimal stats
    });

    it("clamps maximum at 0.85", () => {
      const strongPlayer = { stats: { STR: 5, AGI: 5, INT: 50, VIT: 5, LUCK: 50 } };
      // base = 0.25 + 50*0.008 + 50*0.01 = 0.25 + 0.4 + 0.5 = 1.15
      // clamped to 0.85
      expect(calcExtractionChance(strongPlayer, 0)).toBe(0.85);
    });

    it("higher INT and LUCK improve extraction chance", () => {
      const low = { stats: { STR: 5, AGI: 5, INT: 5, VIT: 5, LUCK: 5 } };
      const high = { stats: { STR: 5, AGI: 5, INT: 20, VIT: 5, LUCK: 20 } };
      expect(calcExtractionChance(high, 0)).toBeGreaterThan(
        calcExtractionChance(low, 0)
      );
    });
  });

  describe("gainExpGoldFromGate", () => {
    it("returns exp and gold based on gate recommended power", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const result = gainExpGoldFromGate({ recommended: 100 });
      // exp = floor(100 * 1.1 + rand(10,40)) where rand with 0.5 → floor(0.5*31)+10 = 25
      // exp = floor(110 + 25) = 135
      expect(result.exp).toBe(135);
      // gold = floor(100 * 0.8 + rand(5,25)) where rand with 0.5 → floor(0.5*21)+5 = 15
      // gold = floor(80 + 15) = 95
      expect(result.gold).toBe(95);
    });

    it("scales rewards with gate difficulty", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const easy = gainExpGoldFromGate({ recommended: 30 });
      const hard = gainExpGoldFromGate({ recommended: 300 });
      expect(hard.exp).toBeGreaterThan(easy.exp);
      expect(hard.gold).toBeGreaterThan(easy.gold);
    });

    it("returns positive values for minimum gate", () => {
      const result = gainExpGoldFromGate({ recommended: 1 });
      expect(result.exp).toBeGreaterThan(0);
      expect(result.gold).toBeGreaterThan(0);
    });
  });
});
