import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { createInitialPlayer } from "@/lib/game/gameLogic";
import { generateDailyQuests } from "@/lib/game/questSystem";
import type { Daily, Player } from "@/lib/game/types";
import { useDailyQuests } from "./useDailyQuests";

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

it("does not replace forfeited quests until the next local calendar day", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 22, 23, 57));
  const today = new Date().toDateString();
  const initial: Daily = {
    active: true,
    availableQuests: generateDailyQuests(1, 42),
    completedQuests: [],
    completed: false,
    penaltyArmed: false,
    questReputation: 42,
    lastResetDate: today,
  };
  const logPush = vi.fn();
  const runAchievementCheck = vi.fn();

  const { result, unmount } = renderHook(() => {
    const [daily, setDaily] = useState(initial);
    const [player, setPlayer] = useState<Player>(createInitialPlayer);
    const [gold, setGold] = useState(0);
    const actions = useDailyQuests({
      daily, setDaily, player, setPlayer, gold, setGold, logPush, runAchievementCheck,
    });
    return { daily, ...actions };
  });

  act(() => result.current.forfeitDaily());
  expect(result.current.daily).toMatchObject({ active: false, penaltyArmed: true });

  act(() => vi.advanceTimersByTime(60_000));
  expect(result.current.daily).toMatchObject({
    active: false,
    availableQuests: [],
    penaltyArmed: true,
    lastResetDate: today,
    questReputation: 42,
  });
  expect(logPush).toHaveBeenCalledTimes(1);

  act(() => vi.advanceTimersByTime(120_000));
  expect(result.current.daily).toMatchObject({
    active: true,
    penaltyArmed: false,
    lastResetDate: new Date().toDateString(),
    questReputation: 42,
  });
  expect(result.current.daily.availableQuests).toHaveLength(5);
  expect(logPush).toHaveBeenCalledTimes(2);
  unmount();
});
