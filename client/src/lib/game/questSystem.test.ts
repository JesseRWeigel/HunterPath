import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getCurrentGameDate,
  initialGameTime,
  formatGameTime,
  getDifficultyColor,
  getDifficultyBgColor,
  generateDailyQuests,
} from "./questSystem";

describe("questSystem", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getCurrentGameDate", () => {
    it("returns date in MM/DD format", () => {
      const date = getCurrentGameDate();
      expect(date).toMatch(/^\d{2}\/\d{2}$/);
    });

    it("uses current date", () => {
      const now = new Date();
      const expected = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
      expect(getCurrentGameDate()).toBe(expected);
    });
  });

  describe("initialGameTime", () => {
    it("starts on day 1", () => {
      const time = initialGameTime();
      expect(time.day).toBe(1);
    });

    it("sets currentDate and lastReset to current date", () => {
      const time = initialGameTime();
      const now = getCurrentGameDate();
      expect(time.currentDate).toBe(now);
      expect(time.lastReset).toBe(now);
    });
  });

  describe("formatGameTime", () => {
    it("formats game time as Day N - MM/DD", () => {
      const result = formatGameTime({ day: 5, currentDate: "03/14", lastReset: "03/14" });
      expect(result).toBe("Day 5 - 03/14");
    });

    it("handles day 1", () => {
      const result = formatGameTime({ day: 1, currentDate: "01/01", lastReset: "01/01" });
      expect(result).toBe("Day 1 - 01/01");
    });
  });

  describe("getDifficultyColor", () => {
    it("returns correct text color for each difficulty", () => {
      expect(getDifficultyColor("easy")).toBe("text-green-400");
      expect(getDifficultyColor("medium")).toBe("text-yellow-400");
      expect(getDifficultyColor("hard")).toBe("text-orange-400");
      expect(getDifficultyColor("epic")).toBe("text-purple-400");
    });

    it("returns gray for unknown difficulty", () => {
      expect(getDifficultyColor("unknown")).toBe("text-gray-400");
    });
  });

  describe("getDifficultyBgColor", () => {
    it("returns correct bg color for each difficulty", () => {
      expect(getDifficultyBgColor("easy")).toBe("bg-green-600");
      expect(getDifficultyBgColor("medium")).toBe("bg-yellow-600");
      expect(getDifficultyBgColor("hard")).toBe("bg-orange-600");
      expect(getDifficultyBgColor("epic")).toBe("bg-purple-600");
    });

    it("returns gray for unknown difficulty", () => {
      expect(getDifficultyBgColor("unknown")).toBe("bg-gray-600");
    });
  });

  describe("generateDailyQuests", () => {
    it("generates exactly 5 quests", () => {
      const quests = generateDailyQuests(1);
      expect(quests).toHaveLength(5);
    });

    it("each quest has required fields", () => {
      const quests = generateDailyQuests(5);
      for (const q of quests) {
        expect(q.id).toBeTruthy();
        expect(q.name).toBeTruthy();
        expect(q.description).toBeTruthy();
        expect(["combat", "exploration", "collection", "skill", "challenge"]).toContain(q.type);
        expect(["easy", "medium", "hard", "epic"]).toContain(q.difficulty);
        expect(q.need).toBeGreaterThan(0);
        expect(q.have).toBe(0);
        expect(q.expReward).toBeGreaterThan(0);
        expect(q.goldReward).toBeGreaterThan(0);
      }
    });

    it("low level players only get easy quests", () => {
      const quests = generateDailyQuests(1);
      expect(quests.every((q) => q.difficulty === "easy")).toBe(true);
    });

    it("level 5+ can get medium quests", () => {
      // Sample many times to check medium appears
      let hasMedium = false;
      for (let i = 0; i < 50; i++) {
        const quests = generateDailyQuests(5);
        if (quests.some((q) => q.difficulty === "medium")) {
          hasMedium = true;
          break;
        }
      }
      expect(hasMedium).toBe(true);
    });

    it("level 10+ can get hard quests", () => {
      let hasHard = false;
      for (let i = 0; i < 50; i++) {
        const quests = generateDailyQuests(10);
        if (quests.some((q) => q.difficulty === "hard")) {
          hasHard = true;
          break;
        }
      }
      expect(hasHard).toBe(true);
    });

    it("epic quests require level 15+ AND reputation 50+", () => {
      // Without enough reputation, no epic quests
      const noRepQuests = generateDailyQuests(20, 0);
      expect(noRepQuests.every((q) => q.difficulty !== "epic")).toBe(true);

      // With reputation, epic quests can appear
      let hasEpic = false;
      for (let i = 0; i < 100; i++) {
        const quests = generateDailyQuests(20, 100);
        if (quests.some((q) => q.difficulty === "epic")) {
          hasEpic = true;
          break;
        }
      }
      expect(hasEpic).toBe(true);
    });

    it("epic quests have bonus stat point rewards", () => {
      // Force epic quests to appear
      let epicQuest = null;
      for (let i = 0; i < 200; i++) {
        const quests = generateDailyQuests(20, 100);
        epicQuest = quests.find((q) => q.difficulty === "epic");
        if (epicQuest) break;
      }
      if (epicQuest) {
        expect(epicQuest.bonusRewards).toBeDefined();
        expect(epicQuest.bonusRewards!.statPoints).toBe(1);
        expect(epicQuest.bonusRewards!.items).toBeDefined();
        expect(epicQuest.bonusRewards!.items!.length).toBe(1);
      }
    });

    it("reward scales with player level", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.01); // force easy difficulty
      const lowLevel = generateDailyQuests(1);
      vi.spyOn(Math, "random").mockReturnValue(0.01);
      const highLevel = generateDailyQuests(20);
      // Compare first quest's rewards (both easy difficulty)
      expect(highLevel[0].expReward).toBeGreaterThan(lowLevel[0].expReward);
      expect(highLevel[0].goldReward).toBeGreaterThan(lowLevel[0].goldReward);
    });

    it("tries to use unique quest types", () => {
      // With 5 quests and 5 types, most of the time all types are unique
      const quests = generateDailyQuests(10);
      const types = quests.map((q) => q.type);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(5);
    });
  });
});
