import { useCallback } from "react";
import { createInitialPlayer } from "@/lib/game/gameLogic";
import { generateGatePool } from "@/lib/game/gateSystem";
import { PRESTIGE_UPGRADES } from "@/lib/game/constants";
import type { Player, Gate } from "@/lib/game/types";

/**
 * useRebirth — extracts handleRebirth and buyPrestigeUpgrade functions.
 */
export function useRebirth({
  player,
  setPlayer,
  setGold,
  setGates,
  setRebirthModalOpen,
  prestigeUpgrades,
  setPrestigeUpgrades,
  logPush,
}: {
  player: Player;
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
  setGold: React.Dispatch<React.SetStateAction<number>>;
  setGates: React.Dispatch<React.SetStateAction<Gate[]>>;
  setRebirthModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  prestigeUpgrades: Record<string, number>;
  setPrestigeUpgrades: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  logPush: (msg: string) => void;
}) {
  const handleRebirth = useCallback(() => {
    const earnedPoints = Math.floor(
      player.level * 10 * (1 + player.rebirths * 0.5),
    );
    const fresh = createInitialPlayer();
    setPlayer({
      ...fresh,
      level: player.level,
      exp: 0,
      expNext: player.expNext,
      stats: { ...player.stats },
      spirits: [...player.spirits],
      equipment: { ...player.equipment },
      inv: [],
      keys: 0,
      fatigue: 0,
      hp: player.maxHp,
      maxHp: player.maxHp,
      mp: player.maxMp,
      maxMp: player.maxMp,
      points: player.points,
      rebirths: player.rebirths + 1,
      prestigePoints: player.prestigePoints + earnedPoints,
    });
    const startGold = 50 + (prestigeUpgrades["start_gold"] || 0) * 100;
    setGold(startGold);
    setGates(generateGatePool(player.level));
    setRebirthModalOpen(false);
    logPush(
      `⚡ REBIRTH ${player.rebirths + 1}! +${earnedPoints} Prestige Points. Power bonus: +${(player.rebirths + 1) * 15}%`,
    );
  }, [player, setPlayer, setGold, setGates, setRebirthModalOpen, prestigeUpgrades, logPush]);

  const buyPrestigeUpgrade = useCallback(
    (upgradeId: string) => {
      const upgrade = PRESTIGE_UPGRADES.find((u) => u.id === upgradeId);
      if (!upgrade) return;
      const currentLevel = prestigeUpgrades[upgradeId] || 0;
      if (currentLevel >= upgrade.maxLevel) {
        logPush(`${upgrade.name} is already at max level!`);
        return;
      }
      const cost = upgrade.costPer * (currentLevel + 1);
      if (player.prestigePoints < cost) {
        logPush(`Not enough Prestige Points. Need ${cost} PP.`);
        return;
      }
      setPlayer((p) => ({ ...p, prestigePoints: p.prestigePoints - cost }));
      setPrestigeUpgrades((prev) => {
        const next = { ...prev, [upgradeId]: (prev[upgradeId] || 0) + 1 };
        localStorage.setItem(
          "hunters-path-prestige-upgrades",
          JSON.stringify(next),
        );
        return next;
      });
      logPush(`Upgraded ${upgrade.name} to level ${currentLevel + 1}!`);
    },
    [player.prestigePoints, prestigeUpgrades, setPlayer, setPrestigeUpgrades, logPush],
  );

  return { handleRebirth, buyPrestigeUpgrade };
}
