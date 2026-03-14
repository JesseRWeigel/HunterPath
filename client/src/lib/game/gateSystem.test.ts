import { describe, it, expect, vi, afterEach } from "vitest";
import {
  RANKS,
  RANK_COLORS,
  DUNGEON_MODIFIERS,
  gatePowerForRank,
  makeBoss,
  makeGate,
  generateGatePool,
  rollDrop,
  type Gate,
} from "./gateSystem";

describe("gateSystem", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("RANKS constant", () => {
    it("has 6 ranks in order E through S", () => {
      expect(RANKS).toEqual(["E", "D", "C", "B", "A", "S"]);
    });
  });

  describe("RANK_COLORS", () => {
    it("has a color for each rank", () => {
      for (const rank of RANKS) {
        expect(RANK_COLORS[rank]).toBeDefined();
        expect(RANK_COLORS[rank]).toMatch(/^bg-/);
      }
    });
  });

  describe("DUNGEON_MODIFIERS", () => {
    it("has 6 modifiers", () => {
      expect(DUNGEON_MODIFIERS).toHaveLength(6);
    });

    it("each modifier has required fields", () => {
      for (const mod of DUNGEON_MODIFIERS) {
        expect(mod.id).toBeTruthy();
        expect(mod.name).toBeTruthy();
        expect(mod.description).toBeTruthy();
        expect(["buff", "debuff", "neutral"]).toContain(mod.type);
        expect(typeof mod.applyToRewards).toBe("function");
        expect(typeof mod.applyToCombat).toBe("function");
      }
    });

    it("double_exp modifier doubles exp", () => {
      const mod = DUNGEON_MODIFIERS.find((m) => m.id === "double_exp")!;
      const result = mod.applyToRewards(1, 1);
      expect(result.expMult).toBe(2);
      expect(result.goldMult).toBe(1);
    });

    it("treasure_vault modifier doubles gold", () => {
      const mod = DUNGEON_MODIFIERS.find((m) => m.id === "treasure_vault")!;
      const result = mod.applyToRewards(1, 1);
      expect(result.expMult).toBe(1);
      expect(result.goldMult).toBe(2);
    });

    it("empowered_boss modifier increases boss damage by 40%", () => {
      const mod = DUNGEON_MODIFIERS.find((m) => m.id === "empowered_boss")!;
      const result = mod.applyToCombat(1, 1);
      expect(result.playerDmgMult).toBe(1);
      expect(result.bossDmgMult).toBeCloseTo(1.4);
    });

    it("cursed_ground reduces player damage by 25%", () => {
      const mod = DUNGEON_MODIFIERS.find((m) => m.id === "cursed_ground")!;
      const result = mod.applyToCombat(1, 1);
      expect(result.playerDmgMult).toBeCloseTo(0.75);
      expect(result.bossDmgMult).toBe(1);
    });

    it("heroic modifier doubles rewards and increases boss damage", () => {
      const mod = DUNGEON_MODIFIERS.find((m) => m.id === "heroic")!;
      const rewards = mod.applyToRewards(1, 1);
      expect(rewards.expMult).toBe(2);
      expect(rewards.goldMult).toBe(2);
      const combat = mod.applyToCombat(1, 1);
      expect(combat.bossDmgMult).toBeCloseTo(1.5);
    });

    it("weakened_boss reduces boss damage by 30%", () => {
      const mod = DUNGEON_MODIFIERS.find((m) => m.id === "weakened_boss")!;
      const result = mod.applyToCombat(1, 1);
      expect(result.bossDmgMult).toBeCloseTo(0.7);
    });
  });

  describe("gatePowerForRank", () => {
    it("returns positive power for all ranks", () => {
      for (let i = 0; i < RANKS.length; i++) {
        expect(gatePowerForRank(i)).toBeGreaterThan(0);
      }
    });

    it("scales exponentially with rank", () => {
      for (let i = 1; i < RANKS.length; i++) {
        expect(gatePowerForRank(i)).toBeGreaterThan(gatePowerForRank(i - 1));
      }
    });

    it("E-rank (0) has correct base power", () => {
      // round(1.7^0 * 30 + 0*20) = round(30) = 30
      expect(gatePowerForRank(0)).toBe(30);
    });

    it("D-rank (1) power is calculated correctly", () => {
      // round(1.7^1 * 30 + 1*20) = round(51 + 20) = 71
      expect(gatePowerForRank(1)).toBe(71);
    });

    it("S-rank (5) is significantly stronger than E-rank", () => {
      expect(gatePowerForRank(5) / gatePowerForRank(0)).toBeGreaterThan(10);
    });
  });

  describe("makeBoss", () => {
    it("creates a boss with correct name for each rank", () => {
      const bossNames = [
        "Goblin Warrior",
        "Orc Berserker",
        "Dark Elf Assassin",
        "Troll Chieftain",
        "Dragon Knight",
        "Void Lord",
      ];
      for (let i = 0; i < RANKS.length; i++) {
        expect(makeBoss(i).name).toBe(bossNames[i]);
      }
    });

    it("creates a boss with positive HP, ATK, and DEF", () => {
      for (let i = 0; i < RANKS.length; i++) {
        const boss = makeBoss(i);
        expect(boss.maxHp).toBeGreaterThan(0);
        expect(boss.hp).toBe(boss.maxHp);
        expect(boss.atk).toBeGreaterThan(0);
        expect(boss.def).toBeGreaterThanOrEqual(0);
      }
    });

    it("higher rank bosses have more HP", () => {
      // On average, higher ranks should have more HP
      // Testing with multiple samples to reduce randomness
      const samples = 20;
      const avgHp = (rankIdx: number) => {
        let total = 0;
        for (let i = 0; i < samples; i++) total += makeBoss(rankIdx).maxHp;
        return total / samples;
      };
      expect(avgHp(5)).toBeGreaterThan(avgHp(0));
      expect(avgHp(3)).toBeGreaterThan(avgHp(0));
    });
  });

  describe("makeGate", () => {
    it("creates a gate with all required fields", () => {
      const gate = makeGate(0);
      expect(gate.id).toBeTruthy();
      expect(gate.name).toBeTruthy();
      expect(gate.rank).toBe("E");
      expect(gate.rankIdx).toBe(0);
      expect(gate.recommended).toBe(gatePowerForRank(0));
      expect(gate.power).toBeGreaterThan(0);
      expect(gate.boss).toBeDefined();
      expect(gate.boss.name).toBeTruthy();
      expect(Array.isArray(gate.modifiers)).toBe(true);
    });

    it("avoids duplicate names from usedNames set", () => {
      const used = new Set(["Goblin Burrow", "Mushroom Grotto", "Rat Warren",
        "Slime Pit", "Mossy Tunnel", "Abandoned Mine", "Shallow Cave"]);
      // Only "Dusty Cellar" should remain
      const gate = makeGate(0, used);
      expect(gate.name).toBe("Dusty Cellar");
    });

    it("falls back when all names are used", () => {
      const used = new Set([
        "Goblin Burrow", "Mushroom Grotto", "Rat Warren", "Slime Pit",
        "Mossy Tunnel", "Abandoned Mine", "Shallow Cave", "Dusty Cellar",
      ]);
      // Should still return a gate (picks from full pool)
      const gate = makeGate(0, used);
      expect(gate.name).toBeTruthy();
    });

    it("gate power varies within range of recommended", () => {
      const recommended = gatePowerForRank(0);
      const powers = Array.from({ length: 50 }, () => makeGate(0).power);
      const minPower = Math.min(...powers);
      const maxPower = Math.max(...powers);
      // power = max(10, recommended + rand(-20, 20))
      expect(minPower).toBeGreaterThanOrEqual(10);
      expect(maxPower).toBeLessThanOrEqual(recommended + 20);
    });

    it("higher rank gates can have modifiers", () => {
      // With many samples, S-rank gates should sometimes have modifiers
      const gates = Array.from({ length: 50 }, () => makeGate(5));
      const withMods = gates.filter((g) => g.modifiers.length > 0);
      expect(withMods.length).toBeGreaterThan(0);
    });
  });

  describe("generateGatePool", () => {
    it("generates only E-rank gates at level 1", () => {
      const gates = generateGatePool(1);
      expect(gates.length).toBeGreaterThanOrEqual(2);
      expect(gates.every((g) => g.rank === "E")).toBe(true);
    });

    it("includes D-rank gates at level 3+", () => {
      const gates = generateGatePool(3);
      const ranks = new Set(gates.map((g) => g.rank));
      expect(ranks.has("E")).toBe(true);
      expect(ranks.has("D")).toBe(true);
    });

    it("includes C-rank gates at level 6+", () => {
      const gates = generateGatePool(6);
      const ranks = new Set(gates.map((g) => g.rank));
      expect(ranks.has("C")).toBe(true);
    });

    it("includes B-rank gates at level 10+", () => {
      const gates = generateGatePool(10);
      const ranks = new Set(gates.map((g) => g.rank));
      expect(ranks.has("B")).toBe(true);
    });

    it("includes A-rank gates at level 15+", () => {
      const gates = generateGatePool(15);
      const ranks = new Set(gates.map((g) => g.rank));
      expect(ranks.has("A")).toBe(true);
    });

    it("includes S-rank gates at level 18+", () => {
      const gates = generateGatePool(18);
      const ranks = new Set(gates.map((g) => g.rank));
      expect(ranks.has("S")).toBe(true);
    });

    it("generates more gates at higher levels", () => {
      // Sampling multiple times to account for randomness
      const avgCount = (level: number) => {
        let total = 0;
        for (let i = 0; i < 20; i++) total += generateGatePool(level).length;
        return total / 20;
      };
      expect(avgCount(25)).toBeGreaterThan(avgCount(1));
    });
  });

  describe("rollDrop", () => {
    const testGate: Gate = {
      id: "test",
      name: "Test Gate",
      rank: "E",
      rankIdx: 0,
      recommended: 30,
      power: 30,
      boss: { name: "Test Boss", maxHp: 100, hp: 100, atk: 10, def: 5 },
      modifiers: [],
    };

    it("returns null when no drop (35% of the time)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      expect(rollDrop(testGate)).toBeNull();
    });

    it("returns a dungeon key when roll < 0.08", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.04);
      const drop = rollDrop(testGate);
      expect(drop).not.toBeNull();
      expect(drop!.type).toBe("key");
      expect(drop!.name).toBe("Instant Dungeon Key");
    });

    it("returns a rune when roll between 0.08 and 0.28", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.15);
      const drop = rollDrop(testGate);
      expect(drop).not.toBeNull();
      expect(drop!.type).toBe("rune");
      expect(drop!.name).toContain("Rune");
    });

    it("returns a potion when roll between 0.28 and 0.55", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.4);
      const drop = rollDrop(testGate);
      expect(drop).not.toBeNull();
      expect(drop!.type).toBe("potion");
      expect(drop!.name).toContain("Potion");
    });

    it("returns equipment when roll between 0.55 and 0.65", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.6);
      const drop = rollDrop(testGate);
      expect(drop).not.toBeNull();
      expect(drop!.type).toBe("equipment");
    });

    it("all drops have required fields", () => {
      // Test multiple drops
      for (let i = 0; i < 100; i++) {
        const drop = rollDrop(testGate);
        if (drop) {
          expect(drop.id).toBeTruthy();
          expect(drop.name).toBeTruthy();
          expect(drop.type).toBeTruthy();
          expect(drop.rarity).toBeTruthy();
          expect(drop.quality).toBeGreaterThan(0);
          expect(drop.quality).toBeLessThanOrEqual(100);
          expect(drop.sellValue).toBeGreaterThan(0);
        }
      }
    });

    it("higher rank gates can produce legendary drops", () => {
      const sGate: Gate = {
        ...testGate,
        rank: "S",
        rankIdx: 5,
        recommended: 500,
        power: 500,
      };
      // Mock random to hit legendary rarity: rank >= 4 && roll < 0.05
      // First call: drop type (key < 0.08), second call: rarity roll
      const calls = [0.04, 0.01]; // first for drop type, second for rarity
      let callIdx = 0;
      vi.spyOn(Math, "random").mockImplementation(() => calls[callIdx++] ?? 0.5);

      const drop = rollDrop(sGate);
      expect(drop).not.toBeNull();
      expect(drop!.rarity).toBe("legendary");
    });
  });
});
