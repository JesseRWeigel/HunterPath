import type { PrestigeUpgrade } from "@/lib/game/types";

export const PRESTIGE_UPGRADES: PrestigeUpgrade[] = [
  { id: "exp_boost", name: "Eternal Scholar", description: "+5% EXP gain per level", costPer: 50, maxLevel: 10 },
  { id: "gold_boost", name: "Fortune's Heir", description: "+5% gold gain per level", costPer: 50, maxLevel: 10 },
  { id: "spirit_power", name: "Legion Master", description: "+2% spirit power bonus per level", costPer: 100, maxLevel: 10 },
  { id: "start_gold", name: "Head Start", description: "+100 starting gold per rebirth level", costPer: 75, maxLevel: 5 },
  { id: "fatigue_resist", name: "Ironwill", description: "-5% fatigue accumulation per level", costPer: 75, maxLevel: 5 },
  { id: "bind_chance", name: "Spirit Whisperer", description: "+3% spirit bind chance per level", costPer: 150, maxLevel: 5 },
];
