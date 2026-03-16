import { clamp, rand } from "@/lib/game/gameUtils";

export interface LogicPlayer {
  stats: { STR: number; AGI: number; INT: number; VIT: number; LUCK: number };
  spirits?: Array<{ power: number }>;
  fatigue: number;
  rebirths?: number;
}

export interface LogicGate { recommended: number; }

export function createInitialPlayer() {
  return {
    level: 1, exp: 0, expNext: 100, hp: 100, mp: 50, maxHp: 100, maxMp: 50,
    fatigue: 0, points: 5,
    stats: { STR: 5, AGI: 5, INT: 5, VIT: 5, LUCK: 5 },
    spirits: [], inv: [], keys: 0, equipment: {}, rebirths: 0, prestigePoints: 0,
  };
}

export function playerPower(player: LogicPlayer, spiritPowerBoostLevel = 0) {
  const { STR, AGI, INT, VIT } = player.stats;
  const base = STR * 3 + AGI * 2 + INT * 1.5 + VIT * 0.5;
  const spiritPowerMult = 1 + spiritPowerBoostLevel * 0.02;
  const spiritBonus = (player.spirits ?? []).reduce((a, s) => a + s.power, 0) * spiritPowerMult;
  const fatiguePenalty = 1 - Math.min(0.4, player.fatigue / 250);
  const rebirthMultiplier = 1 + (player.rebirths ?? 0) * 0.15;
  return Math.max(1, (base + spiritBonus) * fatiguePenalty * rebirthMultiplier);
}

export function spiritUpkeep(player: Pick<LogicPlayer, "spirits">) {
  const spirits = player.spirits ?? [];
  return Math.floor(spirits.length + spirits.reduce((a, s) => a + s.power * 0.02, 0));
}

export function calcBindingChance(player: Pick<LogicPlayer, "stats">, bossRankIdx: number) {
  const { INT, LUCK } = player.stats;
  const base = 0.25 + INT * 0.008 + LUCK * 0.01;
  const rankPenalty = 0.03 * bossRankIdx;
  return clamp(base - rankPenalty, 0.08, 0.85);
}

export function gainExpGoldFromGate(gate: LogicGate) {
  const base = gate.recommended;
  return { exp: Math.floor(base * 1.1 + rand(10, 40)), gold: Math.floor(base * 0.8 + rand(5, 25)) };
}
