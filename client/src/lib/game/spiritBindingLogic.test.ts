import { describe, it, expect, vi, afterEach } from "vitest";
import {
  canAttemptBinding,
  calcSpiritPower,
  mpAfterBinding,
  getBindingSequenceText,
  isBindingSuccessful,
  BINDING_MP_COST,
  type BindingPhase,
} from "./spiritBindingLogic";

describe("spiritBindingLogic", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("canAttemptBinding", () => {
    it("returns true when MP equals cost", () => {
      expect(canAttemptBinding(BINDING_MP_COST)).toBe(true);
    });

    it("returns true when MP exceeds cost", () => {
      expect(canAttemptBinding(50)).toBe(true);
    });

    it("returns false when MP is below cost", () => {
      expect(canAttemptBinding(9)).toBe(false);
    });

    it("returns false when MP is zero", () => {
      expect(canAttemptBinding(0)).toBe(false);
    });
  });

  describe("calcSpiritPower", () => {
    it("calculates power from INT and boss rank", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      // floor(5 + 10*0.8 + 2*6 + rand(0,8)) where rand with 0.5 → floor(0.5*9)+0 = 4
      // floor(5 + 8 + 12 + 4) = 29
      expect(calcSpiritPower(10, 2)).toBe(29);
    });

    it("scales with INT stat", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const lowInt = calcSpiritPower(5, 0);
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const highInt = calcSpiritPower(30, 0);
      expect(highInt).toBeGreaterThan(lowInt);
    });

    it("scales with boss rank index", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const lowRank = calcSpiritPower(10, 0);
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const highRank = calcSpiritPower(10, 5);
      expect(highRank).toBeGreaterThan(lowRank);
    });

    it("has minimum power of 5 with zero stats and low roll", () => {
      vi.spyOn(Math, "random").mockReturnValue(0); // rand(0,8) → 0
      expect(calcSpiritPower(0, 0)).toBe(5);
    });
  });

  describe("mpAfterBinding", () => {
    it("subtracts binding cost from current MP", () => {
      expect(mpAfterBinding(50)).toBe(50 - BINDING_MP_COST);
    });

    it("floors at zero when MP equals cost", () => {
      expect(mpAfterBinding(BINDING_MP_COST)).toBe(0);
    });

    it("floors at zero when MP is below cost", () => {
      expect(mpAfterBinding(5)).toBe(0);
    });
  });

  describe("getBindingSequenceText", () => {
    it("returns preparing text", () => {
      const text = getBindingSequenceText("preparing", "Shadow King", 0);
      expect(text.title).toBe("Spirit Binding Initiated");
      expect(text.subtitle).toContain("Shadow King");
    });

    it("returns extracting text with progress", () => {
      const text = getBindingSequenceText("extracting", "Shadow King", 75);
      expect(text.subtitle).toBe("75% Complete");
    });

    it("returns success text with boss name", () => {
      const text = getBindingSequenceText("success", "Shadow King", 100);
      expect(text.title).toBe("Binding Successful!");
      expect(text.subtitle).toContain("Shadow King");
    });

    it("returns failure text", () => {
      const text = getBindingSequenceText("failure", "Shadow King", 100);
      expect(text.title).toBe("Binding Failed");
    });

    it("returns empty strings for null phase", () => {
      const text = getBindingSequenceText(null, "", 0);
      expect(text.title).toBe("");
      expect(text.subtitle).toBe("");
      expect(text.description).toBe("");
    });
  });

  describe("isBindingSuccessful", () => {
    it("returns true when roll is below chance", () => {
      expect(isBindingSuccessful(0.2, 0.5)).toBe(true);
    });

    it("returns false when roll equals chance", () => {
      expect(isBindingSuccessful(0.5, 0.5)).toBe(false);
    });

    it("returns false when roll exceeds chance", () => {
      expect(isBindingSuccessful(0.8, 0.5)).toBe(false);
    });

    it("always succeeds with chance of 1", () => {
      expect(isBindingSuccessful(0.99, 1.0)).toBe(true);
    });

    it("never succeeds with chance of 0", () => {
      expect(isBindingSuccessful(0.0, 0.0)).toBe(false);
    });
  });
});
