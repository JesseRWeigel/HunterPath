/**
 * Pure spirit binding calculation functions extracted from useSpiritBinding hook.
 * Complements spiritSystem.ts (spirit creation) and gameLogic.ts (calcBindingChance).
 * No React state or side effects — just math.
 */

import { rand } from "@/lib/game/gameUtils";

/** MP cost to attempt a spirit binding. */
export const BINDING_MP_COST = 10;

/**
 * Check whether the player can attempt a binding (has enough MP).
 */
export function canAttemptBinding(mp: number): boolean {
  return mp >= BINDING_MP_COST;
}

/**
 * Calculate the spirit power when binding via the tryBinding path.
 * Formula: floor(5 + INT * 0.8 + bossRankIdx * 6 + rand(0, 8))
 */
export function calcSpiritPower(intStat: number, bossRankIdx: number): number {
  return Math.floor(5 + intStat * 0.8 + bossRankIdx * 6 + rand(0, 8));
}

/**
 * Determine the MP remaining after a binding attempt.
 */
export function mpAfterBinding(currentMp: number): number {
  return Math.max(0, currentMp - BINDING_MP_COST);
}

export type BindingPhase = "preparing" | "extracting" | "success" | "failure" | null;

export interface BindingSequenceText {
  title: string;
  subtitle: string;
  description: string;
}

/**
 * Get the display text for a binding sequence phase.
 * Pure function — no React state needed.
 */
export function getBindingSequenceText(
  phase: BindingPhase,
  bossName: string,
  progress: number,
): BindingSequenceText {
  switch (phase) {
    case "preparing":
      return {
        title: "Spirit Binding Initiated",
        subtitle: `Preparing to bind spirit from ${bossName}...`,
        description: "Gathering magical energy and focusing your will...",
      };
    case "extracting":
      return {
        title: "Binding Spirit",
        subtitle: `${progress}% Complete`,
        description: "The spirit essence is being drawn forth...",
      };
    case "success":
      return {
        title: "Binding Successful!",
        subtitle: `${bossName}'s spirit joins you!`,
        description: "A new spirit ally has been bound to your will.",
      };
    case "failure":
      return {
        title: "Binding Failed",
        subtitle: "The spirit crumbles to dust...",
        description: "The essence was too weak or your focus wavered.",
      };
    default:
      return { title: "", subtitle: "", description: "" };
  }
}

/**
 * Determine binding outcome given a roll and chance.
 */
export function isBindingSuccessful(roll: number, chance: number): boolean {
  return roll < chance;
}
