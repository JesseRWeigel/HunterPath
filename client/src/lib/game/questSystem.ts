import { uid } from "@/lib/game/gameUtils";

export interface DailyTask { id: string; name: string; description: string; type: "combat" | "exploration" | "collection" | "skill" | "challenge"; difficulty: "easy" | "medium" | "hard" | "epic"; need: number; have: number; expReward: number; goldReward: number; bonusRewards?: { items?: Array<{ id: string; name: string; type: string; rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"; quality: number; description?: string; sellValue?: number }>; statPoints?: number } }
export interface GameTime { day: number; currentDate: string; lastReset: string; }

export function getCurrentGameDate() { const now = new Date(); return `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`; }
export function initialGameTime(): GameTime { const currentDate = getCurrentGameDate(); return { day: 1, currentDate, lastReset: currentDate }; }
export function formatGameTime(gameTime: GameTime) { return `Day ${gameTime.day} - ${gameTime.currentDate}`; }
export function getDifficultyColor(difficulty: string) { return ({ easy: "text-green-400", medium: "text-yellow-400", hard: "text-orange-400", epic: "text-purple-400" } as Record<string, string>)[difficulty] ?? "text-gray-400"; }
export function getDifficultyBgColor(difficulty: string) { return ({ easy: "bg-green-600", medium: "bg-yellow-600", hard: "bg-orange-600", epic: "bg-purple-600" } as Record<string, string>)[difficulty] ?? "bg-gray-600"; }

export function generateDailyQuests(playerLevel: number, questReputation = 0): DailyTask[] {
  const quests: DailyTask[] = []; const difficulties: DailyTask["difficulty"][] = ["easy"]; if (playerLevel >= 5) difficulties.push("medium"); if (playerLevel >= 10) difficulties.push("hard"); if (playerLevel >= 15 && questReputation >= 50) difficulties.push("epic");
  const defs = [
    { type: "combat" as const, name: "Monster Hunter", description: "Defeat monsters in gates", scale: 3, epic: 5 },
    { type: "exploration" as const, name: "Gate Explorer", description: "Enter gates of different ranks", scale: 5, epic: 4 },
    { type: "collection" as const, name: "Item Collector", description: "Gather items from gates", scale: 4, epic: 4 },
    { type: "skill" as const, name: "Resource Manager", description: "Use potions and runes effectively", scale: 6, epic: 4 },
    { type: "challenge" as const, name: "Perfect Hunter", description: "Complete gates without taking damage", scale: 8, epic: 4 },
  ];
  const mult: Record<DailyTask["difficulty"], number> = { easy: 1, medium: 2, hard: 3, epic: 4 };
  const rewardMult: Record<DailyTask["difficulty"], number> = { easy: 0.8, medium: 1.2, hard: 1.8, epic: 2.5 };
  const used = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const available = defs.filter((d) => !used.has(d.type)); const quest = (available.length ? available : defs)[Math.floor(Math.random() * (available.length ? available.length : defs.length))]; used.add(quest.type);
    const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)]; const base = Math.max(1, Math.floor(playerLevel / quest.scale)); const need = difficulty === "epic" ? base * quest.epic : base * mult[difficulty];
    quests.push({ id: `${quest.type}_${difficulty}_${i}`, name: `${quest.name} (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})`, description: `${quest.description} - ${need} times`, type: quest.type, difficulty, need, have: 0, expReward: Math.floor(playerLevel * 10 * rewardMult[difficulty]), goldReward: Math.floor(playerLevel * 5 * rewardMult[difficulty]), bonusRewards: difficulty === "epic" ? { items: [{ id: uid(), name: "Epic Quest Reward", type: "potion", rarity: "rare", quality: 80, description: "Special reward for completing an epic quest", sellValue: 100 }], statPoints: 1 } : undefined });
  }
  return quests;
}
