import { useCallback } from "react";
import { clamp, rand } from "@/lib/game/gameUtils";
import { RANKS } from "@/lib/game/gateSystem";
import { makeGate } from "@/lib/game/gateSystem";
import type { Player, Item, Gate, Daily } from "@/lib/game/types";

type BossRank = (typeof RANKS)[number];

/**
 * useItemUsage — extracts usePotion, useRune, useKey functions.
 */
export function useItemUsage({
  player,
  setPlayer,
  playSound,
  triggerVisualEffect,
  triggerParticles,
  addDamageNumber,
  logPush,
  inRun,
  running,
  setCombatLog,
  daily,
  progressDaily,
  startGate,
}: {
  player: Player;
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
  playSound: (sound: string) => void;
  triggerVisualEffect: (effect: string) => void;
  triggerParticles: (preset: string, x: string, y: string) => void;
  addDamageNumber: (amount: number, type: "damage" | "heal" | "critical" | "block", side: "player" | "enemy") => void;
  logPush: (msg: string) => void;
  inRun: boolean;
  running: { gate: Gate; boss: any; hpEnemy: number; tick: number } | null;
  setCombatLog: React.Dispatch<React.SetStateAction<string[]>>;
  daily: Daily;
  progressDaily: (id: string) => void;
  startGate: (g: Gate) => void;
}) {
  const usePotion = useCallback(
    (itemId: string) => {
      const idx = player.inv.findIndex((i) => i.id === itemId);
      if (idx === -1) return;
      const item = player.inv[idx];
      if (item.type !== "potion") return;

      const hpHeal = item.stats?.HP ?? Math.floor(player.maxHp * 0.5);
      const mpHeal = Math.floor(player.maxMp * 0.3);

      setPlayer((p) => ({
        ...p,
        hp: clamp(p.hp + hpHeal, 0, p.maxHp),
        mp: clamp(p.mp + mpHeal, 0, p.maxMp),
        inv: p.inv.filter((i: Item) => i.id !== itemId),
      }));

      triggerVisualEffect("healFlash");
      playSound("heal");
      triggerParticles("heal", "25%", "40%");

      if (inRun && running) {
        setCombatLog((log) => [
          ...log.slice(-7),
          `Hunter uses a potion! +${hpHeal} HP, +${mpHeal} MP`,
        ]);
      }

      logPush(
        "You used a potion. 体力回復 (tairyoku kaifuku): vitality restored.",
      );

      if (daily.active && !daily.completed) {
        const resourceQuest = daily.availableQuests.find(
          (q) => q.type === "skill" && q.name.includes("Resource Manager"),
        );
        if (resourceQuest) {
          progressDaily(resourceQuest.id);
        }
      }
    },
    [player, setPlayer, playSound, triggerVisualEffect, triggerParticles, logPush, inRun, running, setCombatLog, daily, progressDaily],
  );

  const useRune = useCallback(
    (itemId: string) => {
      const idx = player.inv.findIndex((i) => i.id === itemId);
      if (idx === -1) return;
      const item = player.inv[idx];
      if (item.type !== "rune") return;

      const runeName = item.name;

      let statType: keyof Player["stats"] | null = null;
      if (runeName.includes("STR")) statType = "STR";
      else if (runeName.includes("AGI")) statType = "AGI";
      else if (runeName.includes("INT")) statType = "INT";
      else if (runeName.includes("VIT")) statType = "VIT";
      else if (runeName.includes("LUCK")) statType = "LUCK";
      else if (item.stats) {
        const statKey = Object.keys(item.stats).find((k) =>
          ["STR", "AGI", "INT", "VIT", "LUCK"].includes(k),
        );
        if (statKey) statType = statKey as keyof Player["stats"];
      }
      if (!statType) {
        const statKeys: (keyof Player["stats"])[] = [
          "STR",
          "AGI",
          "INT",
          "VIT",
          "LUCK",
        ];
        statType = statKeys[rand(0, statKeys.length - 1)];
      }

      let statBoost = 1;
      if (item.stats && item.stats[statType]) {
        statBoost = Math.max(1, item.stats[statType]!);
      } else {
        const rankMatch = runeName.match(/([A-Z])-grade/);
        const rankIdx = rankMatch
          ? Math.max(0, RANKS.indexOf(rankMatch[1] as BossRank))
          : 0;
        const baseBoost = rankIdx + 1;
        statBoost = Math.max(1, baseBoost + rand(-1, 1));
      }

      setPlayer((p) => ({
        ...p,
        stats: {
          ...p.stats,
          [statType!]: p.stats[statType!] + statBoost,
        },
        inv: p.inv.filter((i: Item) => i.id !== itemId),
      }));

      logPush(
        `Used ${item.name}! +${statBoost} ${statType} permanently. 魔力強化 (maryoku kyōka): magical enhancement.`,
      );
      playSound("rune_use");

      if (daily.active && !daily.completed) {
        const resourceQuest = daily.availableQuests.find(
          (q) => q.type === "skill" && q.name.includes("Resource Manager"),
        );
        if (resourceQuest) {
          progressDaily(resourceQuest.id);
        }
      }
    },
    [player, setPlayer, playSound, logPush, daily, progressDaily],
  );

  const useKey = useCallback(() => {
    if (player.keys <= 0 || inRun) return;
    const rankIdx = clamp(rand(1, 3), 0, RANKS.length - 1);
    const g = makeGate(rankIdx);
    setPlayer((p) => ({ ...p, keys: p.keys - 1 }));
    startGate({ ...g, name: `Instant Dungeon: ${g.name}` });
  }, [player.keys, inRun, setPlayer, startGate]);

  return { usePotion, useRune, useKey };
}
