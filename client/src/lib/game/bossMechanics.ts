import type { Boss, BossMechanic } from "./types";

/**
 * Boss mechanics definitions per rank.
 * Each mechanic modifies combat via damage/defense multipliers and messages.
 */

export interface MechanicResult {
  bossDmgMult: number;
  playerDmgMult: number;
  bossDefMult: number;
  bossHeal: number;
  messages: string[];
}

// Rank-specific boss mechanics
const RANK_MECHANICS: Record<string, BossMechanic[]> = {
  E: [
    { id: "frenzy", name: "Frenzied Strikes", description: "Attacks faster when wounded", trigger: "hp_threshold", triggerValue: 40 },
  ],
  D: [
    { id: "bloodlust", name: "Bloodlust", description: "Gains strength as the fight continues", trigger: "every_n_ticks", triggerValue: 4 },
    { id: "berserk", name: "Berserk", description: "Doubles attack power when near death", trigger: "hp_threshold", triggerValue: 25 },
  ],
  C: [
    { id: "shadow_cloak", name: "Shadow Cloak", description: "Chance to dodge incoming attacks", trigger: "random_chance", triggerValue: 30 },
    { id: "backstab", name: "Backstab", description: "Strikes twice every few turns", trigger: "every_n_ticks", triggerValue: 4 },
  ],
  B: [
    { id: "stone_skin", name: "Stone Skin", description: "Reduces all incoming damage", trigger: "every_n_ticks", triggerValue: 1 },
    { id: "rock_throw", name: "Rock Throw", description: "Hurls a boulder for massive damage", trigger: "every_n_ticks", triggerValue: 5 },
    { id: "regeneration", name: "Regeneration", description: "Heals when critically wounded", trigger: "hp_threshold", triggerValue: 25 },
  ],
  A: [
    { id: "dragonfire", name: "Dragonfire Breath", description: "Unleashes fire at each phase", trigger: "phase", triggerValue: 1 },
    { id: "dragon_scales", name: "Dragon Scales", description: "Defense increases each phase", trigger: "phase", triggerValue: 1 },
    { id: "sword_dance", name: "Sword Dance", description: "Attacks twice periodically", trigger: "every_n_ticks", triggerValue: 5 },
  ],
  S: [
    { id: "void_rift", name: "Void Rift", description: "Weakens the hunter's attacks", trigger: "random_chance", triggerValue: 25 },
    { id: "reality_tear", name: "Reality Tear", description: "Devastating phase transition attack", trigger: "phase", triggerValue: 1 },
    { id: "corruption", name: "Corruption", description: "Stacking debuff that weakens the hunter", trigger: "every_n_ticks", triggerValue: 3 },
    { id: "desperation", name: "Desperation", description: "Becomes invulnerable briefly before a final strike", trigger: "hp_threshold", triggerValue: 10 },
  ],
};

// Flavor messages for mechanic activations
const MECHANIC_MESSAGES: Record<string, string[]> = {
  frenzy: ["The Goblin's eyes glow red — frenzied strikes!", "Wounded and desperate, it attacks wildly!"],
  bloodlust: ["The Orc roars with bloodlust — growing stronger!", "Blood fury courses through its veins!"],
  berserk: ["The Orc enters a berserker rage! Attack power doubled!", "BERSERK MODE — the Orc's muscles bulge with fury!"],
  shadow_cloak: ["The Dark Elf vanishes into shadows — attack missed!", "Your blade cuts through an afterimage!"],
  backstab: ["The Dark Elf strikes from the shadows — double hit!", "A flash of blades — two strikes in rapid succession!"],
  stone_skin: ["The Troll's rocky hide absorbs some damage.", "Your weapon scrapes against stone skin."],
  rock_throw: ["The Troll hurls a massive boulder!", "A thrown rock slams into you with tremendous force!"],
  regeneration: ["The Troll's wounds begin to close — regenerating!", "Green energy pulses as the Troll heals!"],
  dragonfire: ["The Dragon Knight unleashes dragonfire breath!", "Flames engulf the battlefield!"],
  dragon_scales: ["Dragon scales harden — defense increased!", "Shimmering scales deflect your attacks!"],
  sword_dance: ["The Dragon Knight executes a devastating sword dance!", "A flurry of strikes — two attacks in one!"],
  void_rift: ["Reality warps — your attacks weaken!", "The Void distorts space around you!"],
  reality_tear: ["The Void Lord tears reality apart — devastating!", "Space itself shatters around you!"],
  corruption: ["Dark energy seeps into you — corruption spreading!", "The Void's corruption weakens your resolve!"],
  desperation: ["The Void Lord becomes intangible — invulnerable!", "You cannot touch what exists beyond reality!"],
};

/**
 * Initialize boss with rank-appropriate mechanics.
 */
export function initBossMechanics(boss: Boss, rank: string): Boss {
  const mechanics = (RANK_MECHANICS[rank] || []).map(m => ({ ...m, activated: false }));
  return {
    ...boss,
    mechanics,
    phase: 0,
    mechanicState: { corruptionStacks: 0, berserkTicks: 0, desperationTicks: 0, regenTicks: 0 },
  };
}

/**
 * Get the current boss phase based on HP percentage.
 * Phase 0: 100-75%, Phase 1: 75-50%, Phase 2: 50-25%, Phase 3: <25%
 */
export function getBossPhase(boss: Boss): number {
  const pct = (boss.hp / boss.maxHp) * 100;
  if (pct > 75) return 0;
  if (pct > 50) return 1;
  if (pct > 25) return 2;
  return 3;
}

function pickMsg(id: string): string {
  const msgs = MECHANIC_MESSAGES[id];
  if (!msgs || msgs.length === 0) return "";
  return msgs[Math.floor(Math.random() * msgs.length)];
}

/**
 * Process boss mechanics for a single combat tick.
 * Returns multiplier adjustments and combat log messages.
 */
export function processBossMechanics(
  boss: Boss,
  tick: number,
  previousPhase: number,
): MechanicResult {
  const result: MechanicResult = {
    bossDmgMult: 1.0,
    playerDmgMult: 1.0,
    bossDefMult: 1.0,
    bossHeal: 0,
    messages: [],
  };

  if (!boss.mechanics || boss.mechanics.length === 0) return result;

  const hpPct = (boss.hp / boss.maxHp) * 100;
  const currentPhase = getBossPhase(boss);
  const phaseChanged = currentPhase > previousPhase;
  const state = boss.mechanicState || {};

  for (const mechanic of boss.mechanics) {
    let triggered = false;

    switch (mechanic.trigger) {
      case "hp_threshold":
        triggered = hpPct <= mechanic.triggerValue;
        break;
      case "every_n_ticks":
        triggered = tick > 0 && tick % mechanic.triggerValue === 0;
        break;
      case "random_chance":
        triggered = Math.random() * 100 < mechanic.triggerValue;
        break;
      case "phase":
        triggered = phaseChanged;
        break;
    }

    if (!triggered) continue;

    // Apply mechanic effects
    switch (mechanic.id) {
      // E-Rank: Goblin Warrior
      case "frenzy":
        result.bossDmgMult *= 1.3;
        if (!mechanic.activated) {
          result.messages.push(pickMsg("frenzy"));
          mechanic.activated = true;
        }
        break;

      // D-Rank: Orc Berserker
      case "bloodlust":
        result.bossDmgMult *= 1.1;
        result.messages.push(pickMsg("bloodlust"));
        break;
      case "berserk":
        result.bossDmgMult *= 2.0;
        if (!mechanic.activated) {
          result.messages.push(pickMsg("berserk"));
          mechanic.activated = true;
        }
        break;

      // C-Rank: Dark Elf Assassin
      case "shadow_cloak":
        result.playerDmgMult *= 0; // dodge — player's attack misses
        result.messages.push(pickMsg("shadow_cloak"));
        break;
      case "backstab":
        result.bossDmgMult *= 2.0;
        result.messages.push(pickMsg("backstab"));
        break;

      // B-Rank: Troll Chieftain
      case "stone_skin":
        result.bossDefMult *= 1.15;
        // Only message occasionally
        if (tick % 5 === 0) result.messages.push(pickMsg("stone_skin"));
        break;
      case "rock_throw":
        result.bossDmgMult *= 1.8;
        result.messages.push(pickMsg("rock_throw"));
        break;
      case "regeneration": {
        const regenTicks = (state.regenTicks || 0);
        if (regenTicks < 3) {
          result.bossHeal = Math.floor(boss.maxHp * 0.05);
          state.regenTicks = regenTicks + 1;
          result.messages.push(pickMsg("regeneration"));
        }
        break;
      }

      // A-Rank: Dragon Knight
      case "dragonfire":
        result.bossDmgMult *= 1.5;
        result.messages.push(pickMsg("dragonfire"));
        break;
      case "dragon_scales":
        result.bossDefMult *= 1.2;
        result.messages.push(pickMsg("dragon_scales"));
        break;
      case "sword_dance":
        result.bossDmgMult *= 2.0;
        result.messages.push(pickMsg("sword_dance"));
        break;

      // S-Rank: Void Lord
      case "void_rift":
        result.playerDmgMult *= 0.6;
        result.messages.push(pickMsg("void_rift"));
        break;
      case "reality_tear":
        result.bossDmgMult *= 2.5;
        result.messages.push(pickMsg("reality_tear"));
        break;
      case "corruption": {
        const stacks = Math.min((state.corruptionStacks || 0) + 1, 5);
        state.corruptionStacks = stacks;
        result.playerDmgMult *= (1 - stacks * 0.08);
        result.messages.push(pickMsg("corruption"));
        break;
      }
      case "desperation": {
        const despTicks = state.desperationTicks || 0;
        if (despTicks < 2) {
          result.playerDmgMult *= 0; // invulnerable
          state.desperationTicks = despTicks + 1;
          result.messages.push(pickMsg("desperation"));
        } else if (despTicks === 2) {
          result.bossDmgMult *= 3.0; // massive strike after invuln
          state.desperationTicks = despTicks + 1;
        }
        break;
      }
    }
  }

  return result;
}

/**
 * Get a summary of boss mechanics for UI display.
 */
export function getBossMechanicsSummary(boss: Boss): string[] {
  return (boss.mechanics || []).map(m => `${m.name}: ${m.description}`);
}
