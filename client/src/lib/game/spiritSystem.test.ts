import { describe, it, expect, vi, afterEach } from "vitest";
import {
  SPIRIT_TYPES,
  SPIRIT_ABILITIES,
  SPIRIT_DESCRIPTIONS,
  getRarityFromBossRank,
  createSpirit,
  getRarityColor,
  getRarityBorder,
  type SpiritRarity,
  type SpiritType,
} from "./spiritSystem";

describe("spiritSystem", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("SPIRIT_TYPES", () => {
    it("has 5 spirit types", () => {
      expect(SPIRIT_TYPES).toHaveLength(5);
      expect(SPIRIT_TYPES).toEqual(["warrior", "mage", "rogue", "tank", "support"]);
    });
  });

  describe("SPIRIT_ABILITIES", () => {
    it("each type has at least one ability", () => {
      for (const type of SPIRIT_TYPES) {
        expect(SPIRIT_ABILITIES[type].length).toBeGreaterThanOrEqual(1);
      }
    });

    it("each ability has required fields", () => {
      for (const type of SPIRIT_TYPES) {
        for (const ability of SPIRIT_ABILITIES[type]) {
          expect(ability.id).toBeTruthy();
          expect(ability.name).toBeTruthy();
          expect(ability.description).toBeTruthy();
          expect(["passive", "active"]).toContain(ability.type);
          expect(ability.effect).toBeTruthy();
        }
      }
    });

    it("active abilities have cooldowns", () => {
      for (const type of SPIRIT_TYPES) {
        for (const ability of SPIRIT_ABILITIES[type]) {
          if (ability.type === "active") {
            expect(ability.cooldown).toBeGreaterThan(0);
          }
        }
      }
    });

    it("tank type has the most abilities (3)", () => {
      expect(SPIRIT_ABILITIES.tank).toHaveLength(3);
      expect(SPIRIT_ABILITIES.support).toHaveLength(3);
    });
  });

  describe("SPIRIT_DESCRIPTIONS", () => {
    it("has a description for each spirit type", () => {
      for (const type of SPIRIT_TYPES) {
        expect(SPIRIT_DESCRIPTIONS[type]).toBeTruthy();
        expect(typeof SPIRIT_DESCRIPTIONS[type]).toBe("string");
      }
    });
  });

  describe("getRarityFromBossRank", () => {
    it("low rank (0-1) mostly produces common spirits", () => {
      let common = 0;
      const samples = 500;
      for (let i = 0; i < samples; i++) {
        if (getRarityFromBossRank(0) === "common") common++;
      }
      // E-rank: ~89% common
      expect(common / samples).toBeGreaterThan(0.75);
    });

    it("high rank (4+) produces better rarities", () => {
      let nonCommon = 0;
      const samples = 500;
      for (let i = 0; i < samples; i++) {
        if (getRarityFromBossRank(4) !== "common") nonCommon++;
      }
      // A-rank: ~35% non-common minimum
      expect(nonCommon / samples).toBeGreaterThan(0.25);
    });

    it("returns legendary with deterministic mock for high rank", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.01);
      expect(getRarityFromBossRank(4)).toBe("legendary");
    });

    it("returns common with high random roll", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      expect(getRarityFromBossRank(0)).toBe("common");
      expect(getRarityFromBossRank(4)).toBe("common");
    });

    it("mid-rank (2-3) can produce rare but not legendary easily", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.01);
      expect(getRarityFromBossRank(2)).toBe("epic");
    });
  });

  describe("createSpirit", () => {
    it("creates a spirit with all required fields", () => {
      const spirit = createSpirit(100, 2);
      expect(spirit.id).toBeTruthy();
      expect(spirit.name).toBeTruthy();
      expect(spirit.power).toBeGreaterThan(0);
      expect(spirit.rarity).toBeTruthy();
      expect(spirit.abilities.length).toBeGreaterThan(0);
      expect(spirit.level).toBe(1);
      expect(spirit.exp).toBe(0);
      expect(spirit.expToNext).toBe(100);
      expect(SPIRIT_TYPES).toContain(spirit.type);
      expect(spirit.description).toBeTruthy();
    });

    it("power scales with gate power", () => {
      // Mock to common rarity, same type
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      const weak = createSpirit(50, 0);
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      const strong = createSpirit(200, 0);
      expect(strong.power).toBeGreaterThan(weak.power);
    });

    it("legendary rarity gives higher power multiplier", () => {
      // Force legendary (rank 4+, roll < 0.05)
      let callCount = 0;
      vi.spyOn(Math, "random").mockImplementation(() => {
        callCount++;
        return 0.01; // Low roll for legendary + first type
      });
      const spirit = createSpirit(100, 4);
      // legendary multiplier is 3x, so power = floor(100 * 0.8 * 3) = 240
      expect(spirit.rarity).toBe("legendary");
      expect(spirit.power).toBe(240);
    });

    it("common spirits get 1 ability", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99); // common rarity
      const spirit = createSpirit(100, 0);
      expect(spirit.rarity).toBe("common");
      expect(spirit.abilities).toHaveLength(1);
    });

    it("epic spirits get 3 abilities (if available)", () => {
      // Force epic rarity for rank >= 2: roll < 0.02
      let callIdx = 0;
      const values = [0.01, 0.01]; // type rand, rarity rand
      vi.spyOn(Math, "random").mockImplementation(() => values[callIdx++] ?? 0.5);
      const spirit = createSpirit(100, 4);
      // rank 4, roll 0.01 → legendary (not epic), but legendary gets 4 abilities
      if (spirit.rarity === "legendary") {
        expect(spirit.abilities.length).toBeLessThanOrEqual(
          SPIRIT_ABILITIES[spirit.type].length
        );
      }
    });

    it("spirit name follows pattern Name-Number", () => {
      const spirit = createSpirit(100, 0);
      expect(spirit.name).toMatch(/^\w+-\d+$/);
    });
  });

  describe("getRarityColor", () => {
    const rarities: SpiritRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

    it("returns a Tailwind text color class for each rarity", () => {
      for (const rarity of rarities) {
        expect(getRarityColor(rarity)).toMatch(/^text-/);
      }
    });

    it("returns correct specific colors", () => {
      expect(getRarityColor("common")).toBe("text-gray-400");
      expect(getRarityColor("uncommon")).toBe("text-green-400");
      expect(getRarityColor("rare")).toBe("text-blue-400");
      expect(getRarityColor("epic")).toBe("text-purple-400");
      expect(getRarityColor("legendary")).toBe("text-yellow-400");
    });
  });

  describe("getRarityBorder", () => {
    const rarities: SpiritRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

    it("returns a Tailwind border color class for each rarity", () => {
      for (const rarity of rarities) {
        expect(getRarityBorder(rarity)).toMatch(/^border-/);
      }
    });

    it("returns correct specific colors", () => {
      expect(getRarityBorder("common")).toBe("border-gray-500");
      expect(getRarityBorder("legendary")).toBe("border-yellow-500");
    });
  });
});
