import { useCallback } from "react";
import { rand, uid } from "@/lib/game/gameUtils";
import type { Player } from "@/lib/game/types";

/**
 * useShop — extracts buyPotion and buyUpgrade functions.
 */
export function useShop({
  player,
  setPlayer,
  gold,
  setGold,
  logPush,
}: {
  player: Player;
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
  gold: number;
  setGold: React.Dispatch<React.SetStateAction<number>>;
  logPush: (msg: string) => void;
}) {
  const buyPotion = useCallback(() => {
    const cost = 25;
    if (gold < cost) {
      logPush(`Not enough gold. Need ${cost}₲ for a potion.`);
      return;
    }

    const quality = rand(40, 60);
    const levelBonus = Math.floor((player.level ?? 1) * 1.5);
    const healAmount = Math.floor((quality / 100) * 50 + 25 + levelBonus);

    setGold((g) => g - cost);
    setPlayer((p) => ({
      ...p,
      inv: [
        ...p.inv,
        {
          id: uid(),
          name: "Health Potion",
          type: "potion",
          rarity: "common" as const,
          quality,
          description: `Restores ${healAmount} HP`,
          stats: { HP: healAmount },
          sellValue: Math.floor(quality * 1.2),
        },
      ],
    }));
    logPush(`Purchased a Health Potion for ${cost}₲`);
  }, [gold, player.level, setGold, setPlayer, logPush]);

  const buyUpgrade = useCallback(
    (type: "weapon" | "armor" | "accessory") => {
      let cost = 0;
      let bonus = 0;
      let statType = "";

      switch (type) {
        case "weapon":
          cost = 100 + player.level * 25;
          bonus = 3 + Math.floor(player.level / 3);
          statType = "STR";
          break;
        case "armor":
          cost = 80 + player.level * 20;
          bonus = 2 + Math.floor(player.level / 4);
          statType = "VIT";
          break;
        case "accessory":
          cost = 120 + player.level * 30;
          bonus = 2 + Math.floor(player.level / 5);
          statType = "LUCK";
          break;
      }

      if (gold < cost) {
        logPush(`Not enough gold. Need ${cost}₲ for ${type} upgrade.`);
        return;
      }

      setGold((g) => g - cost);
      setPlayer((p) => ({
        ...p,
        stats: {
          ...p.stats,
          [statType]: p.stats[statType as keyof Player["stats"]] + bonus,
        },
      }));
      logPush(`Purchased ${type} upgrade! +${bonus} ${statType} for ${cost}₲`);
    },
    [gold, player.level, setGold, setPlayer, logPush],
  );

  return { buyPotion, buyUpgrade };
}
