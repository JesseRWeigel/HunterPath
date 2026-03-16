import { describe, it, expect, vi, afterEach } from "vitest";
import {
  ACHIEVEMENTS,
  checkAchievements,
  getAchievementProgress,
  type AchievementGameState,
  type AchievementState,
} from "./achievementSystem";

function makeState(overrides: Partial<AchievementGameState> = {}): AchievementGameState {
  return {
    player: {
      level: 1,
      hp: 100,
      maxHp: 100,
      rebirths: 0,
      spirits: [],
      inv: [],
      equipment: {},
      clearedRanks: [],
    },
    playerStats: {
      totalGatesCompleted: 0,
      totalSpiritsBound: 0,
      highestGateRank: "E",
    },
    daily: {
      completedQuests: [],
      questReputation: 0,
    },
    loginStreak: 0,
    noDamageClear: false,
    ...overrides,
  };
}

const EMPTY_ACHIEVEMENTS: AchievementState[] = [];

describe("achievementSystem", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("ACHIEVEMENTS constant", () => {
    it("has at least 15 achievements", () => {
      expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
    });

    it("has unique IDs", () => {
      const ids = ACHIEVEMENTS.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("covers all four categories", () => {
      const categories = new Set(ACHIEVEMENTS.map((a) => a.category));
      expect(categories).toContain("combat");
      expect(categories).toContain("progression");
      expect(categories).toContain("collection");
      expect(categories).toContain("daily");
    });
  });

  describe("getAchievementProgress", () => {
    it("returns totalGatesCompleted for gate-clear achievements", () => {
      const state = makeState({ playerStats: { totalGatesCompleted: 7, totalSpiritsBound: 0, highestGateRank: "E" } });
      expect(getAchievementProgress("first_gate_clear", state)).toBe(7);
      expect(getAchievementProgress("gates_10", state)).toBe(7);
      expect(getAchievementProgress("gates_50", state)).toBe(7);
      expect(getAchievementProgress("gates_100", state)).toBe(7);
    });

    it("returns 1 when a boss rank is cleared", () => {
      const state = makeState({ player: { ...makeState().player, clearedRanks: ["E", "D"] } });
      expect(getAchievementProgress("boss_e", state)).toBe(1);
      expect(getAchievementProgress("boss_d", state)).toBe(1);
      expect(getAchievementProgress("boss_c", state)).toBe(0);
    });

    it("tracks no-damage clear flag", () => {
      expect(getAchievementProgress("no_damage_clear", makeState({ noDamageClear: false }))).toBe(0);
      expect(getAchievementProgress("no_damage_clear", makeState({ noDamageClear: true }))).toBe(1);
    });

    it("returns player level for level achievements", () => {
      const state = makeState({ player: { ...makeState().player, level: 12 } });
      expect(getAchievementProgress("level_5", state)).toBe(12);
      expect(getAchievementProgress("level_10", state)).toBe(12);
      expect(getAchievementProgress("level_20", state)).toBe(12);
    });

    it("returns 1 when player has rebirthed", () => {
      expect(getAchievementProgress("first_rebirth", makeState())).toBe(0);
      const state = makeState({ player: { ...makeState().player, rebirths: 2 } });
      expect(getAchievementProgress("first_rebirth", state)).toBe(1);
    });

    it("returns totalSpiritsBound for spirit achievements", () => {
      const state = makeState({ playerStats: { totalGatesCompleted: 0, totalSpiritsBound: 6, highestGateRank: "E" } });
      expect(getAchievementProgress("spirit_1", state)).toBe(6);
      expect(getAchievementProgress("spirit_5", state)).toBe(6);
      expect(getAchievementProgress("spirit_10", state)).toBe(6);
    });

    it("detects legendary item in inventory", () => {
      expect(getAchievementProgress("legendary_item", makeState())).toBe(0);
      const state = makeState({ player: { ...makeState().player, inv: [{ rarity: "legendary" }] } });
      expect(getAchievementProgress("legendary_item", state)).toBe(1);
    });

    it("counts equipped slots for full_equip", () => {
      expect(getAchievementProgress("full_equip", makeState())).toBe(0);
      const state = makeState({
        player: {
          ...makeState().player,
          equipment: { weapon: { id: "w" }, armor: { id: "a" }, accessory: { id: "x" } },
        },
      });
      expect(getAchievementProgress("full_equip", state)).toBe(3);
    });

    it("counts completed daily quests", () => {
      const state = makeState({ daily: { completedQuests: ["q1", "q2", "q3"], questReputation: 0 } });
      expect(getAchievementProgress("daily_all_5", state)).toBe(3);
    });

    it("tracks login streak", () => {
      const state = makeState({ loginStreak: 5 });
      expect(getAchievementProgress("login_streak_7", state)).toBe(5);
    });

    it("tracks quest reputation", () => {
      const state = makeState({ daily: { completedQuests: [], questReputation: 42 } });
      expect(getAchievementProgress("reputation_50", state)).toBe(42);
    });

    it("returns 0 for unknown achievement id", () => {
      expect(getAchievementProgress("nonexistent", makeState())).toBe(0);
    });
  });

  describe("checkAchievements", () => {
    it("returns all achievements with initial progress when starting fresh", () => {
      const { updated, newlyUnlocked } = checkAchievements(makeState(), EMPTY_ACHIEVEMENTS);
      expect(updated.length).toBe(ACHIEVEMENTS.length);
      expect(newlyUnlocked.length).toBe(0);
      expect(updated.every((a) => !a.unlocked)).toBe(true);
    });

    it("unlocks first_gate_clear when totalGatesCompleted >= 1", () => {
      const state = makeState({ playerStats: { totalGatesCompleted: 1, totalSpiritsBound: 0, highestGateRank: "E" } });
      const { updated, newlyUnlocked } = checkAchievements(state, EMPTY_ACHIEVEMENTS);
      const achievement = updated.find((a) => a.id === "first_gate_clear");
      expect(achievement?.unlocked).toBe(true);
      expect(achievement?.unlockedAt).toBeTruthy();
      expect(newlyUnlocked.some((a) => a.id === "first_gate_clear")).toBe(true);
    });

    it("does not re-report already unlocked achievements", () => {
      const state = makeState({ playerStats: { totalGatesCompleted: 5, totalSpiritsBound: 0, highestGateRank: "E" } });
      const existing: AchievementState[] = [
        { id: "first_gate_clear", progress: 1, unlocked: true, unlockedAt: "2026-01-01T00:00:00Z" },
      ];
      const { newlyUnlocked } = checkAchievements(state, existing);
      expect(newlyUnlocked.some((a) => a.id === "first_gate_clear")).toBe(false);
    });

    it("preserves unlockedAt timestamp for already-unlocked achievements", () => {
      const state = makeState({ playerStats: { totalGatesCompleted: 5, totalSpiritsBound: 0, highestGateRank: "E" } });
      const existing: AchievementState[] = [
        { id: "first_gate_clear", progress: 1, unlocked: true, unlockedAt: "2025-06-01T00:00:00Z" },
      ];
      const { updated } = checkAchievements(state, existing);
      const achievement = updated.find((a) => a.id === "first_gate_clear");
      expect(achievement?.unlockedAt).toBe("2025-06-01T00:00:00Z");
    });

    it("clamps progress to maxProgress", () => {
      const state = makeState({ playerStats: { totalGatesCompleted: 999, totalSpiritsBound: 0, highestGateRank: "E" } });
      const { updated } = checkAchievements(state, EMPTY_ACHIEVEMENTS);
      const a10 = updated.find((a) => a.id === "gates_10");
      expect(a10?.progress).toBe(10);
    });

    it("unlocks multiple achievements at once", () => {
      const state = makeState({
        player: { ...makeState().player, level: 10, clearedRanks: ["E"] },
        playerStats: { totalGatesCompleted: 10, totalSpiritsBound: 1, highestGateRank: "D" },
      });
      const { newlyUnlocked } = checkAchievements(state, EMPTY_ACHIEVEMENTS);
      const ids = newlyUnlocked.map((a) => a.id);
      expect(ids).toContain("first_gate_clear");
      expect(ids).toContain("gates_10");
      expect(ids).toContain("boss_e");
      expect(ids).toContain("spirit_1");
      expect(ids).toContain("level_5");
      expect(ids).toContain("level_10");
    });

    it("tracks partial progress for locked achievements", () => {
      const state = makeState({ playerStats: { totalGatesCompleted: 7, totalSpiritsBound: 0, highestGateRank: "E" } });
      const { updated } = checkAchievements(state, EMPTY_ACHIEVEMENTS);
      const a10 = updated.find((a) => a.id === "gates_10");
      expect(a10?.progress).toBe(7);
      expect(a10?.unlocked).toBe(false);
    });

    it("handles full_equip unlocking at 3 slots", () => {
      const state = makeState({
        player: {
          ...makeState().player,
          equipment: { weapon: { id: "w" }, armor: { id: "a" }, accessory: { id: "x" } },
        },
      });
      const { updated, newlyUnlocked } = checkAchievements(state, EMPTY_ACHIEVEMENTS);
      const fe = updated.find((a) => a.id === "full_equip");
      expect(fe?.unlocked).toBe(true);
      expect(newlyUnlocked.some((a) => a.id === "full_equip")).toBe(true);
    });

    it("handles daily_all_5 unlocking at 5 completed quests", () => {
      const state = makeState({
        daily: { completedQuests: ["a", "b", "c", "d", "e"], questReputation: 0 },
      });
      const { updated } = checkAchievements(state, EMPTY_ACHIEVEMENTS);
      const da = updated.find((a) => a.id === "daily_all_5");
      expect(da?.unlocked).toBe(true);
    });
  });
});
