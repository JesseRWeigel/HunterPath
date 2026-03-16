import { rand, uid } from "@/lib/game/gameUtils";

export const RANKS = ["E", "D", "C", "B", "A", "S"] as const;
export const RANK_COLORS = { E: "bg-green-600", D: "bg-blue-600", C: "bg-purple-600", B: "bg-red-600", A: "bg-orange-600", S: "bg-yellow-600" };
export interface Boss { name: string; maxHp: number; hp: number; atk: number; def: number; }
export interface DungeonModifier { id: string; name: string; description: string; icon: string; type: "buff" | "debuff" | "neutral"; applyToRewards: (expMult: number, goldMult: number) => { expMult: number; goldMult: number }; applyToCombat: (playerDmgMult: number, bossDmgMult: number) => { playerDmgMult: number; bossDmgMult: number }; }
export interface Gate { id: string; name: string; rank: string; rankIdx: number; recommended: number; power: number; boss: Boss; modifiers: DungeonModifier[]; }
export interface Item { id: string; name: string; type: string; rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"; quality: number; description?: string; stats?: Record<string, number>; equipmentSlot?: "weapon" | "armor" | "accessory" | null; sellValue?: number; }

export const DUNGEON_MODIFIERS: DungeonModifier[] = [
  { id: "double_exp", name: "Double EXP", description: "2× EXP reward from this gate", icon: "📚", type: "buff", applyToRewards: (e, g) => ({ expMult: e * 2, goldMult: g }), applyToCombat: (p, b) => ({ playerDmgMult: p, bossDmgMult: b }) },
  { id: "treasure_vault", name: "Treasure Vault", description: "2× gold reward", icon: "💰", type: "buff", applyToRewards: (e, g) => ({ expMult: e, goldMult: g * 2 }), applyToCombat: (p, b) => ({ playerDmgMult: p, bossDmgMult: b }) },
  { id: "empowered_boss", name: "Empowered Boss", description: "Boss deals 40% more damage", icon: "💀", type: "debuff", applyToRewards: (e, g) => ({ expMult: e, goldMult: g }), applyToCombat: (p, b) => ({ playerDmgMult: p, bossDmgMult: b * 1.4 }) },
  { id: "cursed_ground", name: "Cursed Ground", description: "You deal 25% less damage", icon: "☠️", type: "debuff", applyToRewards: (e, g) => ({ expMult: e, goldMult: g }), applyToCombat: (p, b) => ({ playerDmgMult: p * 0.75, bossDmgMult: b }) },
  { id: "heroic", name: "Heroic", description: "Boss is stronger, but rewards are doubled", icon: "⚔️", type: "neutral", applyToRewards: (e, g) => ({ expMult: e * 2, goldMult: g * 2 }), applyToCombat: (p, b) => ({ playerDmgMult: p, bossDmgMult: b * 1.5 }) },
  { id: "weakened_boss", name: "Weakened Boss", description: "Boss deals 30% less damage", icon: "🤕", type: "buff", applyToRewards: (e, g) => ({ expMult: e, goldMult: g }), applyToCombat: (p, b) => ({ playerDmgMult: p, bossDmgMult: b * 0.7 }) },
];
const MONSTER_DATA = {
  E: { name: "Goblin Warrior" }, D: { name: "Orc Berserker" }, C: { name: "Dark Elf Assassin" },
  B: { name: "Troll Chieftain" }, A: { name: "Dragon Knight" }, S: { name: "Void Lord" },
} as const;
const GATE_NAMES: Record<string, string[]> = {
  E: ["Goblin Burrow", "Mushroom Grotto", "Rat Warren", "Slime Pit", "Mossy Tunnel", "Abandoned Mine", "Shallow Cave", "Dusty Cellar"],
  D: ["Orc Stronghold", "Cursed Mines", "Swamp Depths", "Iron Crypt", "Bandit Hideout", "Troll Bridge", "Dark Hollow", "Bone Quarry"],
  C: ["Shadow Forest", "Moonlit Ruins", "Phantom Keep", "Crimson Marsh", "Spider Nest", "Haunted Chapel", "Witch's Glade", "Twilight Gorge"],
  B: ["Troll Citadel", "Thunder Peak", "Frozen Fortress", "Magma Cavern", "War Bastion", "Storm Spire", "Obsidian Vault", "Siege Grounds"],
  A: ["Dragon's Lair", "Inferno Sanctum", "Sky Fortress", "Ashen Throne", "Blazing Halls", "Wyrm's Den", "Phoenix Roost", "Flame Citadel"],
  S: ["Void Nexus", "Abyssal Gate", "Reality Fracture", "Chaos Rift", "World's Edge", "Dimensional Tear", "Oblivion Core", "Shattered Plane"],
};

export function gatePowerForRank(rankIdx: number) { return Math.round(Math.pow(1.7, rankIdx) * 30 + rankIdx * 20); }
export function makeBoss(rankIdx: number): Boss {
  const base = gatePowerForRank(rankIdx); const rank = RANKS[rankIdx]; const hp = Math.floor(base * 8 + rand(-25, 25));
  return { name: MONSTER_DATA[rank].name, maxHp: hp, hp, atk: Math.floor(base * 0.8 + rand(-5, 5)), def: Math.floor(base * 0.3 + rand(-3, 3)) };
}
export function makeGate(rankIdx: number, usedNames?: Set<string>): Gate {
  const rank = RANKS[rankIdx]; const namePool = GATE_NAMES[rank] ?? GATE_NAMES.E; const unused = namePool.filter((n) => !usedNames?.has(n)); const source = unused.length ? unused : namePool;
  const modifierCount = Math.random() < 0.25 + rankIdx * 0.08 ? (Math.random() < 0.35 ? 2 : 1) : 0;
  return { id: uid(), name: source[Math.floor(Math.random() * source.length)], rank, rankIdx, recommended: gatePowerForRank(rankIdx), power: Math.round(Math.max(10, gatePowerForRank(rankIdx) + rand(-20, 20))), boss: makeBoss(rankIdx), modifiers: [...DUNGEON_MODIFIERS].sort(() => Math.random() - 0.5).slice(0, modifierCount) };
}
export function generateGatePool(playerLevel: number): Gate[] {
  const gates: Gate[] = []; const used = new Set<string>(); const add = (rankIdx: number) => { const gate = makeGate(rankIdx, used); used.add(gate.name); gates.push(gate); };
  for (let i = 0; i < rand(2, 4); i++) add(0); if (playerLevel >= 3) for (let i = 0; i < rand(2, 4); i++) add(1); if (playerLevel >= 6) for (let i = 0; i < rand(2, 4); i++) add(2); if (playerLevel >= 10) for (let i = 0; i < rand(2, 4); i++) add(3); if (playerLevel >= 15) for (let i = 0; i < rand(2, 4); i++) add(4); if (playerLevel >= 18) for (let i = 0; i < rand(1, 2); i++) add(5); if (playerLevel >= 25) { for (let i = 0; i < rand(1, 2); i++) add(4); for (let i = 0; i < rand(1, 2); i++) add(5); }
  return gates;
}
export function rollDrop(gate: Gate): Item | null {
  const rarityRoll = (rankIdx: number) => { const r = Math.random(); return rankIdx >= 4 && r < 0.05 ? "legendary" : rankIdx >= 3 && r < 0.15 ? "epic" : rankIdx >= 2 && r < 0.35 ? "rare" : rankIdx >= 1 && r < 0.65 ? "uncommon" : "common"; };
  const qualityFor = (rarity: string) => Math.max(1, Math.min(100, ({ common: 30, uncommon: 50, rare: 70, epic: 85, legendary: 95 } as Record<string, number>)[rarity] + rand(-10, 10)));
  const r = Math.random();
  if (r < 0.08) { const rarity = rarityRoll(gate.rankIdx); const quality = qualityFor(rarity); return { id: uid(), name: "Instant Dungeon Key", type: "key", rarity, quality, description: "Opens a special dungeon with enhanced rewards", sellValue: Math.floor(quality * 2) }; }
  if (r < 0.28) { const statType = ["STR", "AGI", "INT", "VIT", "LUCK"][rand(0, 4)]; const rarity = rarityRoll(gate.rankIdx); const quality = qualityFor(rarity); const statBonus = Math.max(1, Math.floor((quality / 100) * (gate.rankIdx + 1) * 2)); return { id: uid(), name: `${gate.rank}-grade ${statType} Rune`, type: "rune", rarity, quality, description: `Temporarily boosts ${statType} by ${statBonus}`, stats: { [statType]: statBonus }, sellValue: Math.floor(quality * 1.5) }; }
  if (r < 0.55) { const rarity = rarityRoll(gate.rankIdx); const quality = qualityFor(rarity); const healAmount = Math.floor((quality / 100) * 50 + 25 + gate.rankIdx * 15); return { id: uid(), name: `${gate.rank}-grade Potion`, type: "potion", rarity, quality, description: `Restores ${healAmount} HP`, stats: { HP: healAmount }, sellValue: Math.floor(quality * 1.2) }; }
  if (r < 0.65) { const rarity = rarityRoll(gate.rankIdx); const quality = qualityFor(rarity); const slot = ["weapon", "armor", "accessory"][rand(0, 2)] as "weapon" | "armor" | "accessory"; const statMap = { weapon: "STR", armor: "VIT", accessory: "LUCK" } as const; const itemName = { weapon: `${gate.rank}-Rank Blade`, armor: `${gate.rank}-Rank Armor`, accessory: `${gate.rank}-Rank Charm` }[slot]; const statBonus = Math.max(1, Math.floor((quality / 100) * (gate.rankIdx + 1) * 3)); return { id: uid(), name: itemName, type: "equipment", rarity, quality, description: `Provides ${statBonus} ${statMap[slot]}`, stats: { [statMap[slot]]: statBonus }, equipmentSlot: slot, sellValue: Math.floor(quality * 3) }; }
  return null;
}
