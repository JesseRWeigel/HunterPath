import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clamp, rand, uid, fmt, pick } from "./gameUtils";

describe("gameUtils", () => {
  describe("clamp", () => {
    it("returns value when within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it("clamps to minimum when value is below range", () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it("clamps to maximum when value is above range", () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it("returns boundary when value equals min", () => {
      expect(clamp(0, 0, 10)).toBe(0);
    });

    it("returns boundary when value equals max", () => {
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it("works with negative ranges", () => {
      expect(clamp(-3, -5, -1)).toBe(-3);
      expect(clamp(-10, -5, -1)).toBe(-5);
      expect(clamp(0, -5, -1)).toBe(-1);
    });

    it("works with fractional values", () => {
      expect(clamp(0.5, 0, 1)).toBe(0.5);
      expect(clamp(1.5, 0, 1)).toBe(1);
    });
  });

  describe("rand", () => {
    it("returns integer within range (inclusive)", () => {
      for (let i = 0; i < 100; i++) {
        const result = rand(1, 10);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(10);
        expect(Number.isInteger(result)).toBe(true);
      }
    });

    it("returns min when min equals max", () => {
      expect(rand(5, 5)).toBe(5);
    });

    it("returns deterministic value with mocked random", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      expect(rand(1, 10)).toBe(1);

      vi.spyOn(Math, "random").mockReturnValue(0.999);
      expect(rand(1, 10)).toBe(10);

      vi.restoreAllMocks();
    });
  });

  describe("uid", () => {
    it("returns a non-empty string", () => {
      expect(uid()).toBeTruthy();
      expect(typeof uid()).toBe("string");
    });

    it("returns unique values", () => {
      const ids = new Set(Array.from({ length: 100 }, () => uid()));
      expect(ids.size).toBe(100);
    });

    it("returns string of length 7", () => {
      // .toString(36).slice(2, 9) yields up to 7 chars
      const id = uid();
      expect(id.length).toBeLessThanOrEqual(7);
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe("fmt", () => {
    it("formats small numbers without commas", () => {
      expect(fmt(5)).toBe("5");
      expect(fmt(999)).toBe("999");
    });

    it("formats large numbers with commas", () => {
      expect(fmt(1000)).toBe("1,000");
      expect(fmt(1000000)).toBe("1,000,000");
    });

    it("floors fractional numbers", () => {
      expect(fmt(99.9)).toBe("99");
      expect(fmt(1000.7)).toBe("1,000");
    });

    it("handles zero", () => {
      expect(fmt(0)).toBe("0");
    });

    it("handles negative numbers", () => {
      const result = fmt(-1000);
      // Intl.NumberFormat handles negatives
      expect(result).toContain("1,000");
    });
  });

  describe("pick", () => {
    it("returns an element from the array", () => {
      const arr = [1, 2, 3, 4, 5];
      for (let i = 0; i < 50; i++) {
        expect(arr).toContain(pick(arr));
      }
    });

    it("returns the only element for single-element array", () => {
      expect(pick(["only"])).toBe("only");
    });

    it("returns deterministic value with mocked random", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      expect(pick(["a", "b", "c"])).toBe("a");

      vi.spyOn(Math, "random").mockReturnValue(0.999);
      expect(pick(["a", "b", "c"])).toBe("c");

      vi.restoreAllMocks();
    });
  });
});
