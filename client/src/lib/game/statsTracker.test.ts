import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createInitialStats,
  updateStatsAfterCombat,
  formatPlayTime,
  saveStats,
  loadStats,
  type GameStats,
  type CombatOutcome,
} from "./statsTracker";

describe("statsTracker", () => {
  describe("createInitialStats", () => {
    it("returns zeroed-out stats", () => {
      const stats = createInitialStats();
      expect(stats.totalGatesCompleted).toBe(0);
      expect(stats.totalGatesFailed).toBe(0);
      expect(stats.totalExpGained).toBe(0);
      expect(stats.totalGoldGained).toBe(0);
      expect(stats.totalDamageDealt).toBe(0);
      expect(stats.totalDamageTaken).toBe(0);
      expect(stats.totalSpiritsBound).toBe(0);
      expect(stats.highestGateRank).toBe("E");
      expect(stats.fastestVictory).toBe(0);
      expect(stats.longestCombat).toBe(0);
      expect(stats.gatesPerRank).toEqual({});
      expect(stats.totalPlayTime).toBe(0);
    });
  });

  describe("updateStatsAfterCombat", () => {
    let base: GameStats;
    const victoryOutcome: CombatOutcome = {
      victory: true,
      expGained: 100,
      goldGained: 50,
      damageDealt: 300,
      damageTaken: 120,
      ticks: 10,
      gateRank: "D",
      spiritBound: false,
    };

    beforeEach(() => {
      base = createInitialStats();
    });

    it("increments totalGatesCompleted on victory", () => {
      const updated = updateStatsAfterCombat(base, victoryOutcome);
      expect(updated.totalGatesCompleted).toBe(1);
      expect(updated.totalGatesFailed).toBe(0);
    });

    it("increments totalGatesFailed on defeat", () => {
      const defeatOutcome: CombatOutcome = { ...victoryOutcome, victory: false };
      const updated = updateStatsAfterCombat(base, defeatOutcome);
      expect(updated.totalGatesFailed).toBe(1);
      expect(updated.totalGatesCompleted).toBe(0);
    });

    it("accumulates exp and gold", () => {
      const updated = updateStatsAfterCombat(base, victoryOutcome);
      expect(updated.totalExpGained).toBe(100);
      expect(updated.totalGoldGained).toBe(50);
    });

    it("accumulates damage dealt and taken", () => {
      const updated = updateStatsAfterCombat(base, victoryOutcome);
      expect(updated.totalDamageDealt).toBe(300);
      expect(updated.totalDamageTaken).toBe(120);
    });

    it("tracks spirit bindings", () => {
      const outcome = { ...victoryOutcome, spiritBound: true };
      const updated = updateStatsAfterCombat(base, outcome);
      expect(updated.totalSpiritsBound).toBe(1);
    });

    it("does not increment spirits bound when false", () => {
      const updated = updateStatsAfterCombat(base, victoryOutcome);
      expect(updated.totalSpiritsBound).toBe(0);
    });

    it("updates highest gate rank", () => {
      const updated = updateStatsAfterCombat(base, victoryOutcome);
      expect(updated.highestGateRank).toBe("D");
    });

    it("does not downgrade highest gate rank", () => {
      base.highestGateRank = "A";
      const outcome = { ...victoryOutcome, gateRank: "D" };
      const updated = updateStatsAfterCombat(base, outcome);
      expect(updated.highestGateRank).toBe("A");
    });

    it("tracks fastest victory", () => {
      const updated = updateStatsAfterCombat(base, victoryOutcome);
      expect(updated.fastestVictory).toBe(10);
    });

    it("updates fastest victory only if faster", () => {
      base.fastestVictory = 5;
      const updated = updateStatsAfterCombat(base, victoryOutcome);
      expect(updated.fastestVictory).toBe(5);
    });

    it("does not set fastest victory on defeat", () => {
      const defeat = { ...victoryOutcome, victory: false, ticks: 3 };
      const updated = updateStatsAfterCombat(base, defeat);
      expect(updated.fastestVictory).toBe(0);
    });

    it("tracks longest combat", () => {
      base.longestCombat = 5;
      const outcome = { ...victoryOutcome, ticks: 20 };
      const updated = updateStatsAfterCombat(base, outcome);
      expect(updated.longestCombat).toBe(20);
    });

    it("does not update longest combat if shorter", () => {
      base.longestCombat = 50;
      const updated = updateStatsAfterCombat(base, victoryOutcome);
      expect(updated.longestCombat).toBe(50);
    });

    it("tracks gates per rank", () => {
      let stats = updateStatsAfterCombat(base, victoryOutcome);
      stats = updateStatsAfterCombat(stats, victoryOutcome);
      stats = updateStatsAfterCombat(stats, { ...victoryOutcome, gateRank: "C" });
      expect(stats.gatesPerRank).toEqual({ D: 2, C: 1 });
    });

    it("does not mutate the input stats object", () => {
      const original = createInitialStats();
      updateStatsAfterCombat(original, victoryOutcome);
      expect(original.totalGatesCompleted).toBe(0);
      expect(original.gatesPerRank).toEqual({});
    });
  });

  describe("formatPlayTime", () => {
    it("formats seconds only", () => {
      expect(formatPlayTime(45)).toBe("45s");
    });

    it("formats minutes only", () => {
      expect(formatPlayTime(300)).toBe("5m");
    });

    it("formats hours and minutes", () => {
      expect(formatPlayTime(8100)).toBe("2h 15m");
    });

    it("formats zero seconds", () => {
      expect(formatPlayTime(0)).toBe("0s");
    });

    it("formats exactly one hour", () => {
      expect(formatPlayTime(3600)).toBe("1h 0m");
    });

    it("floors fractional seconds", () => {
      expect(formatPlayTime(45.7)).toBe("45s");
    });
  });

  describe("saveStats / loadStats", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("round-trips stats through localStorage", () => {
      const stats = createInitialStats();
      stats.totalGatesCompleted = 42;
      stats.gatesPerRank = { E: 10, D: 20, C: 12 };
      saveStats(stats);
      const loaded = loadStats();
      expect(loaded).toEqual(stats);
    });

    it("returns initial stats when nothing is saved", () => {
      const loaded = loadStats();
      expect(loaded).toEqual(createInitialStats());
    });

    it("returns initial stats on corrupted data", () => {
      localStorage.setItem("hunters-path-statistics", "not-json");
      const loaded = loadStats();
      expect(loaded).toEqual(createInitialStats());
    });

    it("merges with defaults for missing fields", () => {
      localStorage.setItem(
        "hunters-path-statistics",
        JSON.stringify({ totalGatesCompleted: 5 })
      );
      const loaded = loadStats();
      expect(loaded.totalGatesCompleted).toBe(5);
      expect(loaded.totalDamageDealt).toBe(0);
      expect(loaded.gatesPerRank).toEqual({});
    });
  });
});
