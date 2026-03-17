import { useEffect } from "react";
import { clamp } from "@/lib/game/gameUtils";
import { generateDailyQuests, getCurrentGameDate } from "@/lib/game/questSystem";
import type { Player, Item, Daily } from "@/lib/game/types";

/**
 * useDailyQuests — extracts daily quest tracking, progress, forfeit, and penalty logic.
 */
export function useDailyQuests({
  daily,
  setDaily,
  player,
  setPlayer,
  gold,
  setGold,
  logPush,
  runAchievementCheck,
}: {
  daily: Daily;
  setDaily: React.Dispatch<React.SetStateAction<Daily>>;
  player: Player;
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
  gold: number;
  setGold: React.Dispatch<React.SetStateAction<number>>;
  logPush: (msg: string) => void;
  runAchievementCheck: (noDamageClear?: boolean) => void;
}) {
  // Real-time daily quest reset system - check every minute
  useEffect(() => {
    const checkDailyReset = () => {
      const today = new Date().toDateString();

      setDaily((prevDaily) => {
        // If it's a new day and we haven't reset yet
        if (prevDaily.lastResetDate !== today) {
          logPush(`New day begins! Daily quests have been refreshed.`);

          const newQuests = generateDailyQuests(
            player.level,
            prevDaily.questReputation
          );

          const newDaily = {
            active: true, // Auto-start daily quests
            availableQuests: newQuests,
            completedQuests: [],
            completed: false,
            penaltyArmed: false,
            questReputation: prevDaily.questReputation, // Preserve reputation
            lastResetDate: today,
          };

          // Save the new daily state
          localStorage.setItem("hunters-path-daily", JSON.stringify(newDaily));
          return newDaily;
        }
        return prevDaily;
      });
    };

    // Check immediately on mount
    checkDailyReset();

    // Then check every minute
    const interval = setInterval(checkDailyReset, 60000); // 1 minute

    return () => {
      clearInterval(interval);
    };
  }, [player.level]);

  function trackQuestProgress(action: string, count: number = 1) {
    if (!daily.active || daily.completed) return;

    daily.availableQuests.forEach((quest) => {
      if (daily.completedQuests.includes(quest.id)) return; // Skip already completed quests

      let shouldProgress = false;

      switch (quest.type) {
        case "combat":
          if (action === "monster_defeated") shouldProgress = true;
          break;
        case "exploration":
          if (action === "gate_entered") shouldProgress = true;
          break;
        case "collection":
          if (action === "item_gained") shouldProgress = true;
          break;
        case "skill":
          if (action === "potion_used" || action === "rune_used")
            shouldProgress = true;
          break;
        case "challenge":
          if (action === "gate_completed_no_damage") shouldProgress = true;
          break;
      }

      if (shouldProgress) {
        progressDaily(quest.id);
      }
    });
  }

  function progressDaily(id: string) {
    if (!daily.active || daily.completed) return;

    setDaily((d) => {
      const updatedQuests = d.availableQuests.map((t) =>
        t.id === id ? { ...t, have: clamp(t.have + 1, 0, t.need) } : t
      );

      // Check if any quests are completed
      const completedQuests = updatedQuests.filter(
        (q) => !d.completedQuests.includes(q.id) && q.have >= q.need
      );

      const newCompletedQuests = [...d.completedQuests];
      let totalExpGained = 0;
      let totalGoldGained = 0;
      let bonusItems: Item[] = [];
      let bonusStatPoints = 0;

      completedQuests.forEach((quest) => {
        newCompletedQuests.push(quest.id);
        totalExpGained += quest.expReward;
        totalGoldGained += quest.goldReward;

        if (quest.bonusRewards) {
          if (quest.bonusRewards.items) {
            bonusItems.push(...quest.bonusRewards.items);
          }
          if (quest.bonusRewards.statPoints) {
            bonusStatPoints += quest.bonusRewards.statPoints;
          }
        }

        // Log individual quest completion
        logPush(
          `Quest completed: ${quest.name}! +${quest.expReward} EXP, +${quest.goldReward} Gold`
        );
        if (quest.bonusRewards) {
          if (quest.bonusRewards.statPoints) {
            logPush(
              `+${quest.bonusRewards.statPoints} Stat Points from epic quest!`
            );
          }
          if (quest.bonusRewards.items) {
            logPush(`Received ${quest.bonusRewards.items.length} bonus items!`);
          }
        }
      });

      // Check if all quests are completed
      const allCompleted = updatedQuests.every((quest) =>
        newCompletedQuests.includes(quest.id)
      );

      if (allCompleted && !d.completed) {
        // Award reputation points
        const reputationGain = Math.floor(totalExpGained / 10);

        // Update player stats
        setPlayer((p) => ({
          ...p,
          exp: p.exp + totalExpGained,
          points: p.points + bonusStatPoints,
          inv: [...p.inv, ...bonusItems],
        }));

        setGold((g) => g + totalGoldGained);

        logPush(`All daily quests completed! +${reputationGain} Reputation`);

        // Check achievements after quest completion
        runAchievementCheck();

        return {
          ...d,
          availableQuests: updatedQuests,
          completedQuests: newCompletedQuests,
          completed: true,
          completedDate: getCurrentGameDate(),
          questReputation: d.questReputation + reputationGain,
        };
      }

      // Apply rewards for individual quest completions
      if (completedQuests.length > 0) {
        setPlayer((p) => ({
          ...p,
          exp: p.exp + totalExpGained,
          points: p.points + bonusStatPoints,
          inv: [...p.inv, ...bonusItems],
        }));

        setGold((g) => g + totalGoldGained);
      }

      return {
        ...d,
        availableQuests: updatedQuests,
        completedQuests: newCompletedQuests,
      };
    });
  }

  function forfeitDaily() {
    if (!daily.active) return;

    setDaily({
      active: false,
      availableQuests: [],
      completedQuests: [],
      completed: false,
      penaltyArmed: true,
      questReputation: daily.questReputation,
    });

    logPush("Daily quests forfeited.");
  }

  function applyPenaltyZone() {
    // In the source logic, failure triggers a Penalty Zone. We'll simulate a harsh debuff.
    setPlayer((p) => ({
      ...p,
      hp: Math.max(1, Math.floor(p.maxHp * 0.1)),
      fatigue: clamp(p.fatigue + 25, 0, 100),
    }));
    logPush(
      "Penalty Zone: You pushed boulders for hours. HP to a sliver; Fatigue up."
    );
  }

  return {
    trackQuestProgress,
    progressDaily,
    forfeitDaily,
    applyPenaltyZone,
  };
}
