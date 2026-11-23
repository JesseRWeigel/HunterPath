import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createInitialPlayer } from "@/lib/game/gameLogic";
import type { Item, Player } from "@/lib/game/types";
import { useEquipment } from "./useEquipment";

const sword: Item = {
  id: "sword", name: "Sword", type: "equipment", rarity: "common",
  quality: 50, equipmentSlot: "weapon",
};
const dagger: Item = { ...sword, id: "dagger", name: "Dagger" };

function setup() {
  return renderHook(() => {
    const [player, setPlayer] = useState<Player>(() => ({
      ...createInitialPlayer(),
      inv: [dagger],
      equipment: { weapon: sword },
    }));
    return { player, ...useEquipment({ player, setPlayer, logPush: vi.fn() }) };
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("swaps equipment with the item in inventory", () => {
  const { result } = setup();

  act(() => result.current.equipItem(dagger.id));

  expect(result.current.player.equipment.weapon).toEqual(dagger);
  expect(result.current.player.inv).toEqual([sword]);
});

it("does not duplicate an item when its equip action is queued twice", () => {
  const { result } = setup();

  act(() => {
    result.current.equipItem(dagger.id);
    result.current.equipItem(dagger.id);
  });

  expect(result.current.player.equipment.weapon).toEqual(dagger);
  expect(result.current.player.inv).toEqual([sword]);
});

it("does not duplicate an item when its unequip action is queued twice", () => {
  const { result } = setup();

  act(() => {
    result.current.unequipItem("weapon");
    result.current.unequipItem("weapon");
  });

  expect(result.current.player.equipment.weapon).toBeUndefined();
  expect(result.current.player.inv).toEqual([dagger, sword]);
});

it("does not remove a replacement when an old unequip action is still queued", () => {
  const { result } = setup();

  act(() => {
    result.current.equipItem(dagger.id);
    result.current.unequipItem("weapon");
  });

  expect(result.current.player.equipment.weapon).toEqual(dagger);
  expect(result.current.player.inv).toEqual([sword]);
});
