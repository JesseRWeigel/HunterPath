import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createInitialPlayer } from "@/lib/game/gameLogic";
import type { Gate } from "@/lib/game/types";
import { useLevelUp } from "./useLevelUp";
import { useTraining } from "./useTraining";

function setup(exp: number, inRun = false) {
  const logPush = vi.fn();
  const noop = () => {};
  const hook = renderHook(() => {
    const [player, setPlayer] = useState(() => ({
      ...createInitialPlayer(), exp, expNext: 24, fatigue: 20, points: 0,
    }));
    const [gold, setGold] = useState(0);
    const [, setGates] = useState<Gate[]>([]);
    const { handleLevelGain } = useLevelUp({
      player, setPlayer, setGates, logPush, playSound: noop, hapticHeavy: noop,
      triggerParticles: noop, triggerVisualEffect: noop, runAchievementCheck: noop,
    });
    return { player, gold, ...useTraining({ setPlayer, setGold, logPush, handleLevelGain, inRun }) };
  });
  return { ...hook, logPush };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each([
  ["physical", 8, 25],
  ["mental", 6, 23],
  ["meditation", 4, 15],
] as const)("awards the displayed training XP once for %s", (type, gained, fatigue) => {
  const { result, logPush } = setup(0);

  act(() => result.current.doTraining(type));

  expect(result.current.player.exp).toBe(gained);
  expect(result.current.player.fatigue).toBe(fatigue);
  expect(logPush).toHaveBeenCalledWith(expect.stringContaining(`+${gained} EXP`));
});

it("awards work XP once and retains the gold and fatigue change", () => {
  const { result } = setup(0);

  act(() => result.current.doWork());

  expect(result.current.player.exp).toBe(3);
  expect(result.current.player.fatigue).toBe(28);
  expect(result.current.gold).toBe(15);
});

it("levels up at the exact threshold without surplus XP", () => {
  const { result } = setup(16);

  act(() => result.current.doTraining("physical"));

  expect(result.current.player.level).toBe(2);
  expect(result.current.player.exp).toBe(0);
  expect(result.current.player.points).toBe(5);
});

it("does not award training or work rewards during combat", () => {
  const { result } = setup(0, true);

  act(() => {
    result.current.doTraining("physical");
    result.current.doWork();
  });

  expect(result.current.player.exp).toBe(0);
  expect(result.current.player.fatigue).toBe(20);
  expect(result.current.gold).toBe(0);
});
