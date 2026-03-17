import { useCallback, useEffect, useRef, useState } from "react";
import { playerPower } from "@/lib/game/gameLogic";
import { generateGatePool } from "@/lib/game/gateSystem";
import { RANK_MILESTONES } from "@/lib/game/constants";
import type { Player, Gate } from "@/lib/game/types";
import type { ParticlePreset } from "@/lib/particles";

/**
 * useLevelUp — extracts level-up celebration, story events, and stat history tracking.
 */
export function useLevelUp({
  player,
  setPlayer,
  setGates,
  logPush,
  playSound,
  hapticHeavy,
  triggerParticles,
  triggerVisualEffect,
  runAchievementCheck,
}: {
  player: Player;
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
  setGates: React.Dispatch<React.SetStateAction<Gate[]>>;
  logPush: (msg: string) => void;
  playSound: (sound: string) => void;
  hapticHeavy: () => void;
  triggerParticles: (preset: ParticlePreset, x?: string, y?: string) => void;
  triggerVisualEffect: (effect: string) => void;
  runAchievementCheck: (noDamageClear?: boolean) => void;
}) {
  const [levelUpState, setLevelUpState] = useState({
    isActive: false,
    newLevel: 0,
    statPointsGained: 0,
    showStatAllocation: false,
  });

  // Story event modal — shown for rank milestones & first clears
  const [storyEvent, setStoryEvent] = useState<{
    title: string;
    message: string;
    rankColor?: string;
  } | null>(null);
  const pendingStoryEvents = useRef<{ title: string; message: string; rankColor?: string }[]>([]);
  const [storyQueueTrigger, setStoryQueueTrigger] = useState(0);

  // Stat progression tracking
  const [statHistory, setStatHistory] = useState<
    {
      level: number;
      stats: Player["stats"];
      power: number;
      timestamp: string;
    }[]
  >([]);

  function queueStoryEvent(event: { title: string; message: string; rankColor?: string }) {
    pendingStoryEvents.current.push(event);
    setStoryQueueTrigger(n => n + 1);
  }

  // Auto-trigger stat allocation after level-up celebration
  useEffect(() => {
    if (levelUpState.isActive && !levelUpState.showStatAllocation) {
      const timer = setTimeout(() => {
        setLevelUpState((prev) => ({ ...prev, showStatAllocation: true }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [levelUpState.isActive, levelUpState.showStatAllocation]);

  function handleLevelGain(addExp: number) {
    setPlayer((p) => {
      let exp = p.exp + addExp;
      let level = p.level;
      let expNext = p.expNext;
      let points = p.points;
      let maxHp = p.maxHp;
      let maxMp = p.maxMp;
      let leveledUp = false;
      let levelsGained = 0;

      while (exp >= expNext) {
        exp -= expNext;
        level += 1;
        leveledUp = true;
        levelsGained += 1;
        expNext = Math.floor(expNext * 1.35);
        points += 5;
        maxHp += 10;
        maxMp += 5;

        logPush(`Level Up! Welcome to level ${level}. +5 stat points!`);
        playSound("level_up");
        hapticHeavy();
        triggerParticles("level-up", "50%", "50%");

        // Check for rank milestone story event — queue modal to show after level-up
        const milestone = RANK_MILESTONES.find(m => m.level === level);
        if (milestone) {
          logPush(`--- ${milestone.title} ---`);
          logPush(milestone.message);
          queueStoryEvent({ title: milestone.title, message: milestone.message, rankColor: milestone.color });
        }
      }

      // If player leveled up, refresh gates to unlock new tiers
      if (leveledUp) {
        // Record stat history before level up
        setStatHistory((prev) => [
          ...prev,
          {
            level: p.level,
            stats: p.stats,
            power: playerPower(p),
            timestamp: new Date().toISOString(),
          },
        ]);

        // Trigger level-up celebration
        setLevelUpState({
          isActive: true,
          newLevel: level,
          statPointsGained: levelsGained * 5,
          showStatAllocation: false,
        });

        // Trigger visual effects
        triggerVisualEffect("levelUp");

        // Check achievements after level up
        runAchievementCheck();

        setTimeout(() => {
          setGates(generateGatePool(level));
          logPush(
            `New gates appeared! Higher tier dungeons are now available.`
          );
        }, 1000);
      }

      return {
        ...p,
        exp,
        level,
        expNext,
        points,
        maxHp,
        maxMp,
        hp: Math.max(p.hp, Math.floor(maxHp * 0.6)),
        mp: Math.max(p.mp, Math.floor(maxMp * 0.5)),
      };
    });
  }

  function completeLevelUp() {
    setLevelUpState({
      isActive: false,
      newLevel: 0,
      statPointsGained: 0,
      showStatAllocation: false,
    });
  }

  function allocateStatWithFeedback(stat: keyof Player["stats"]) {
    if (player.points <= 0) return;

    // Trigger visual feedback
    triggerVisualEffect("statAllocation");

    setPlayer((p) => ({
      ...p,
      points: p.points - 1,
      stats: { ...p.stats, [stat]: p.stats[stat] + 1 },
    }));

    // Play stat allocation sound
    playSound("rune_use"); // Reuse rune sound for stat allocation

    // Record stat change
    setStatHistory((prev) => [
      ...prev,
      {
        level: player.level,
        stats: { ...player.stats, [stat]: player.stats[stat] + 1 },
        power: playerPower({
          ...player,
          stats: { ...player.stats, [stat]: player.stats[stat] + 1 },
        }),
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  return {
    levelUpState,
    setLevelUpState,
    completeLevelUp,
    handleLevelGain,
    storyEvent,
    setStoryEvent,
    queueStoryEvent,
    pendingStoryEvents,
    storyQueueTrigger,
    statHistory,
    setStatHistory,
    allocateStatWithFeedback,
  };
}
