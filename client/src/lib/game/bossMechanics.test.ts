import { describe, it, expect, vi, afterEach } from "vitest";
import {
  initBossMechanics,
  getBossPhase,
  processBossMechanics,
  getBossMechanicsSummary,
} from "./bossMechanics";
import type { Boss } from "./types";

function makeBoss(hp: number, maxHp: number, overrides?: Partial<Boss>): Boss {
  return { name: "Test Boss", hp, maxHp, hp, atk: 50, def: 20, ...overrides };
}

describe("bossMechanics", () => {
  afterEach(() => vi.restoreAllMocks());

  describe("initBossMechanics", () => {
    it("adds mechanics for each rank", () => {
      for (const rank of ["E", "D", "C", "B", "A", "S"]) {
        const boss = initBossMechanics(makeBoss(100, 100), rank);
        expect(boss.mechanics).toBeDefined();
        expect(boss.mechanics!.length).toBeGreaterThan(0);
        expect(boss.phase).toBe(0);
        expect(boss.mechanicState).toBeDefined();
      }
    });

    it("E-rank has 1 mechanic (frenzy)", () => {
      const boss = initBossMechanics(makeBoss(100, 100), "E");
      expect(boss.mechanics).toHaveLength(1);
      expect(boss.mechanics![0].id).toBe("frenzy");
    });

    it("S-rank has 4 mechanics", () => {
      const boss = initBossMechanics(makeBoss(100, 100), "S");
      expect(boss.mechanics).toHaveLength(4);
    });

    it("marks all mechanics as not activated", () => {
      const boss = initBossMechanics(makeBoss(100, 100), "D");
      boss.mechanics!.forEach(m => expect(m.activated).toBe(false));
    });
  });

  describe("getBossPhase", () => {
    it("returns phase 0 above 75% HP", () => {
      expect(getBossPhase(makeBoss(80, 100))).toBe(0);
      expect(getBossPhase(makeBoss(100, 100))).toBe(0);
    });

    it("returns phase 1 between 50-75% HP", () => {
      expect(getBossPhase(makeBoss(75, 100))).toBe(1);
      expect(getBossPhase(makeBoss(60, 100))).toBe(1);
    });

    it("returns phase 2 between 25-50% HP", () => {
      expect(getBossPhase(makeBoss(50, 100))).toBe(2);
      expect(getBossPhase(makeBoss(30, 100))).toBe(2);
    });

    it("returns phase 3 below 25% HP", () => {
      expect(getBossPhase(makeBoss(25, 100))).toBe(3);
      expect(getBossPhase(makeBoss(1, 100))).toBe(3);
    });
  });

  describe("processBossMechanics", () => {
    it("returns neutral result for boss with no mechanics", () => {
      const boss = makeBoss(100, 100);
      const result = processBossMechanics(boss, 1, 0);
      expect(result.bossDmgMult).toBe(1.0);
      expect(result.playerDmgMult).toBe(1.0);
      expect(result.bossDefMult).toBe(1.0);
      expect(result.bossHeal).toBe(0);
      expect(result.messages).toEqual([]);
    });

    it("E-rank frenzy triggers below 40% HP", () => {
      const boss = initBossMechanics(makeBoss(30, 100), "E");
      const result = processBossMechanics(boss, 1, 0);
      expect(result.bossDmgMult).toBeGreaterThan(1.0);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it("E-rank frenzy does not trigger above 40% HP", () => {
      const boss = initBossMechanics(makeBoss(50, 100), "E");
      const result = processBossMechanics(boss, 1, 0);
      expect(result.bossDmgMult).toBe(1.0);
    });

    it("D-rank bloodlust triggers on tick intervals", () => {
      const boss = initBossMechanics(makeBoss(100, 100), "D");
      const result = processBossMechanics(boss, 4, 0);
      expect(result.bossDmgMult).toBeGreaterThan(1.0);
    });

    it("D-rank berserk triggers below 25% HP", () => {
      const boss = initBossMechanics(makeBoss(20, 100), "D");
      const result = processBossMechanics(boss, 1, 0);
      expect(result.bossDmgMult).toBe(2.0);
    });

    it("C-rank shadow cloak can cause player miss", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.1); // 10% < 30% threshold
      const boss = initBossMechanics(makeBoss(100, 100), "C");
      const result = processBossMechanics(boss, 1, 0);
      expect(result.playerDmgMult).toBe(0);
    });

    it("B-rank stone skin increases defense", () => {
      const boss = initBossMechanics(makeBoss(100, 100), "B");
      const result = processBossMechanics(boss, 1, 0);
      expect(result.bossDefMult).toBeGreaterThan(1.0);
    });

    it("B-rank regeneration heals below 25% HP", () => {
      const boss = initBossMechanics(makeBoss(20, 100), "B");
      const result = processBossMechanics(boss, 1, 0);
      expect(result.bossHeal).toBeGreaterThan(0);
    });

    it("B-rank regeneration only heals 3 times", () => {
      const boss = initBossMechanics(makeBoss(20, 100), "B");
      for (let i = 0; i < 3; i++) {
        processBossMechanics(boss, i + 1, 3);
      }
      const result4 = processBossMechanics(boss, 4, 3);
      expect(result4.bossHeal).toBe(0);
    });

    it("A-rank dragonfire triggers on phase change", () => {
      const boss = initBossMechanics(makeBoss(74, 100), "A");
      const result = processBossMechanics(boss, 1, 0); // phase changed 0→1
      expect(result.bossDmgMult).toBeGreaterThan(1.0);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it("S-rank corruption stacks up to 5", () => {
      const boss = initBossMechanics(makeBoss(100, 100), "S");
      // Corruption triggers every 3 ticks
      for (let i = 1; i <= 18; i++) {
        if (i % 3 === 0) {
          processBossMechanics(boss, i, 0);
        }
      }
      expect(boss.mechanicState!.corruptionStacks).toBeLessThanOrEqual(5);
    });
  });

  describe("getBossMechanicsSummary", () => {
    it("returns mechanic descriptions", () => {
      const boss = initBossMechanics(makeBoss(100, 100), "A");
      const summary = getBossMechanicsSummary(boss);
      expect(summary.length).toBe(3);
      expect(summary[0]).toContain("Dragonfire");
    });

    it("returns empty for boss without mechanics", () => {
      expect(getBossMechanicsSummary(makeBoss(100, 100))).toEqual([]);
    });
  });
});
