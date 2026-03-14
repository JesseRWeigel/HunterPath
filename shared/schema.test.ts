import { describe, it, expect } from "vitest";
import {
  insertUserSchema,
  insertGameStateSchema,
  insertGateRunSchema,
  insertAchievementSchema,
  insertPlayerStatsSchema,
} from "./schema";

describe("schema validation", () => {
  describe("insertUserSchema", () => {
    it("validates correct user input", () => {
      const result = insertUserSchema.safeParse({
        username: "hunter1",
        password: "secret123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing username", () => {
      const result = insertUserSchema.safeParse({ password: "secret" });
      expect(result.success).toBe(false);
    });

    it("rejects missing password", () => {
      const result = insertUserSchema.safeParse({ username: "hunter" });
      expect(result.success).toBe(false);
    });

    it("rejects empty object", () => {
      const result = insertUserSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("insertGameStateSchema", () => {
    it("validates correct game state input", () => {
      const result = insertGameStateSchema.safeParse({
        userId: "user-123",
        player: { level: 1, stats: {} },
        gates: [],
        gold: 50,
        gameTime: { day: 1 },
        daily: { quests: [] },
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing required fields", () => {
      const result = insertGameStateSchema.safeParse({
        userId: "user-123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("insertGateRunSchema", () => {
    it("validates correct gate run input", () => {
      const result = insertGateRunSchema.safeParse({
        userId: "user-123",
        gateId: "gate-1",
        gateName: "Goblin Burrow",
        gateRank: "E",
        gateRankIdx: 0,
        bossName: "Goblin Warrior",
        victory: true,
        duration: 10,
        expGained: 50,
        goldGained: 30,
        damageDealt: 200,
        damageTaken: 50,
        playerLevel: 1,
        playerStats: { STR: 5 },
        drops: [],
        combatLog: ["Attacked for 20 damage"],
      });
      expect(result.success).toBe(true);
    });

    it("requires victory field", () => {
      const result = insertGateRunSchema.safeParse({
        userId: "user-123",
        gateId: "gate-1",
        gateName: "Test",
        gateRank: "E",
        gateRankIdx: 0,
        bossName: "Boss",
        duration: 10,
        expGained: 0,
        goldGained: 0,
        damageDealt: 0,
        damageTaken: 0,
        playerLevel: 1,
        playerStats: {},
        drops: [],
        combatLog: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("insertAchievementSchema", () => {
    it("validates correct achievement input", () => {
      const result = insertAchievementSchema.safeParse({
        userId: "user-123",
        achievementId: "first_gate",
        name: "First Gate",
        description: "Clear your first gate",
        category: "progression",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("insertPlayerStatsSchema", () => {
    it("validates correct player stats input", () => {
      const result = insertPlayerStatsSchema.safeParse({
        userId: "user-123",
        totalGatesCompleted: 10,
        totalExpGained: 5000,
      });
      expect(result.success).toBe(true);
    });

    it("accepts minimal input with just userId", () => {
      const result = insertPlayerStatsSchema.safeParse({
        userId: "user-123",
      });
      expect(result.success).toBe(true);
    });
  });
});
