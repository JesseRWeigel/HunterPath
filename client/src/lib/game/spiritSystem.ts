import { rand, uid } from "@/lib/game/gameUtils";

export type SpiritRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type SpiritType = "warrior" | "mage" | "rogue" | "tank" | "support";
export interface SpiritAbility { id: string; name: string; description: string; type: "passive" | "active"; effect: string; cooldown?: number; }
export interface Spirit { id: string; name: string; power: number; rarity: SpiritRarity; abilities: SpiritAbility[]; level: number; exp: number; expToNext: number; type: SpiritType; description: string; }

export const SPIRIT_TYPES: SpiritType[] = ["warrior", "mage", "rogue", "tank", "support"];
export const SPIRIT_ABILITIES: Record<SpiritType, SpiritAbility[]> = {
  warrior: [{ id: "berserker_rage", name: "Berserker Rage", description: "Increases damage by 25% when below 50% HP", type: "passive", effect: "damage_boost" }, { id: "cleave", name: "Cleave", description: "Attacks all enemies in range", type: "active", effect: "aoe_attack", cooldown: 3 }],
  mage: [{ id: "arcane_mastery", name: "Arcane Mastery", description: "Spells have 15% chance to cast twice", type: "passive", effect: "double_cast" }, { id: "mana_shield", name: "Mana Shield", description: "Absorbs damage using MP instead of HP", type: "active", effect: "damage_absorption", cooldown: 5 }],
  rogue: [{ id: "shadow_step", name: "Shadow Step", description: "Every 3rd attack is enhanced (+10% damage)", type: "passive", effect: "damage_boost" }, { id: "poison_blade", name: "Poison Blade", description: "Attacks poison enemies for 3 turns", type: "passive", effect: "poison_damage" }],
  tank: [{ id: "fortress", name: "Fortress", description: "Reduces all damage taken by 30%", type: "passive", effect: "damage_reduction" }, { id: "ethereal_shield", name: "Ethereal Shield", description: "15% chance to block boss attacks entirely", type: "passive", effect: "block_chance" }, { id: "taunt", name: "Taunt", description: "Forces enemies to attack this spirit", type: "active", effect: "force_aggro", cooldown: 2 }],
  support: [{ id: "healing_aura", name: "Healing Aura", description: "Heals all allies for 10% of max HP each turn", type: "passive", effect: "heal_aura" }, { id: "vitality_aura", name: "Vitality Aura", description: "Restores 2 HP per combat tick", type: "passive", effect: "hp_regen" }, { id: "blessing", name: "Blessing", description: "Increases all ally stats by 20% for 3 turns", type: "active", effect: "stat_boost", cooldown: 6 }],
};
export const SPIRIT_DESCRIPTIONS: Record<SpiritType, string> = {
  warrior: "A fierce combatant specializing in melee damage and aggressive tactics.",
  mage: "A master of arcane arts, wielding powerful spells and magical abilities.",
  rogue: "A stealthy assassin with high critical hit chance and poison attacks.",
  tank: "A stalwart defender who protects allies and absorbs enemy attacks.",
  support: "A benevolent ally who heals and enhances the capabilities of the team.",
};
const rarityMultipliers: Record<SpiritRarity, number> = { common: 1, uncommon: 1.2, rare: 1.5, epic: 2, legendary: 3 };
const spiritNames = ["Umbra", "Noctis", "Tenebris", "Kage", "Silens", "Vorago", "Ater", "Nox", "Moria", "Caecus"];

export function getRarityFromBossRank(bossRankIdx: number): SpiritRarity {
  const roll = Math.random();
  if (bossRankIdx >= 4) return roll < 0.05 ? "legendary" : roll < 0.15 ? "epic" : roll < 0.35 ? "rare" : roll < 0.65 ? "uncommon" : "common";
  if (bossRankIdx >= 2) return roll < 0.02 ? "epic" : roll < 0.08 ? "rare" : roll < 0.25 ? "uncommon" : "common";
  return roll < 0.01 ? "rare" : roll < 0.1 ? "uncommon" : "common";
}

export function createSpirit(gatePower: number, bossRankIdx: number): Spirit {
  const type = SPIRIT_TYPES[rand(0, SPIRIT_TYPES.length - 1)];
  const rarity = getRarityFromBossRank(bossRankIdx);
  const abilities = SPIRIT_ABILITIES[type].slice(0, Math.min(rarity === "common" ? 1 : rarity === "epic" ? 3 : rarity === "legendary" ? 4 : 2, SPIRIT_ABILITIES[type].length));
  return { id: uid(), name: `${spiritNames[rand(0, spiritNames.length - 1)]}-${rand(1, 999)}`, power: Math.floor(gatePower * 0.8 * rarityMultipliers[rarity]), rarity, abilities, level: 1, exp: 0, expToNext: 100, type, description: SPIRIT_DESCRIPTIONS[type] };
}

export function getRarityColor(rarity: SpiritRarity) { return ({ common: "text-gray-400", uncommon: "text-green-400", rare: "text-blue-400", epic: "text-purple-400", legendary: "text-yellow-400" })[rarity]; }
export function getRarityBorder(rarity: SpiritRarity) { return ({ common: "border-gray-500", uncommon: "border-green-500", rare: "border-blue-500", epic: "border-purple-500", legendary: "border-yellow-500" })[rarity]; }
