import { useCallback, useEffect, useRef, useState } from "react";
import { clamp, rand, pick, fmt } from "@/lib/game/gameUtils";
import { playerPower, spiritUpkeep, calcBindingChance, gainExpGoldFromGate } from "@/lib/game/gameLogic";
import { RANKS, DUNGEON_MODIFIERS, generateGatePool, rollDrop } from "@/lib/game/gateSystem";
import { processBossMechanics, getBossPhase } from "@/lib/game/bossMechanics";
import { updateStatsAfterCombat, type GameStats, type CombatOutcome } from "@/lib/game/statsTracker";
import { PLAYER_ATTACK_MSGS, BOSS_ATTACK_MSGS, BOSS_BLOCK_MSGS, CRIT_MSGS, SPIRIT_ABILITY_MSGS, BOSS_PHASE_MSGS, BOSS_DIALOGUE, FIRST_CLEAR_TEXT } from "@/lib/game/constants";
import {
  calcSpiritPassives,
  applyCombatModifiers,
  calcPlayerDamage,
  calcBossDamage,
  rollBlock,
  isCriticalHit,
  calcSpiritHealing,
  calcFatigueGain,
  detectPhaseTransitions,
  calcVictoryRewards,
  calcDefeatPenalty,
  calcVictoryHealing,
  gateRefreshCost,
  applyRewardModifiers,
} from "@/lib/game/combatSimulation";
import type { Player, Gate, RunningState, CombatResult, Boss } from "@/lib/game/types";
import type { ParticlePreset } from "@/lib/particles";

type BossRank = (typeof RANKS)[number];

/**
 * useCombatEngine — extracts the combat tick loop, gate entry, boss intro,
 * auto-dungeon, and all combat-result handling.
 */
export function useCombatEngine({
  player,
  setPlayer,
  gates,
  setGates,
  gold,
  setGold,
  pPower,
  prestigeUpgrades,
  playSound,
  playMusic,
  logPush,
  hapticMedium,
  hapticHeavy,
  hapticSuccess,
  hapticWarning,
  hapticRumble,
  triggerParticles,
  triggerVisualEffect,
  addDamageNumber,
  trackQuestProgress,
  handleLevelGain,
  queueStoryEvent,
  startSpiritBindingSequence,
  clearSpiritBindingState,
  updateStats,
  setGameStats,
  runAchievementCheck,
  running,
  setRunning,
  combatResult,
  setCombatResult,
  rest,
}: {
  player: Player;
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
  gates: Gate[];
  setGates: React.Dispatch<React.SetStateAction<Gate[]>>;
  gold: number;
  setGold: React.Dispatch<React.SetStateAction<number>>;
  pPower: number;
  prestigeUpgrades: Record<string, number>;
  playSound: (sound: string) => void;
  playMusic: (track: string, loop?: boolean) => void;
  logPush: (msg: string) => void;
  hapticMedium: () => void;
  hapticHeavy: () => void;
  hapticSuccess: () => void;
  hapticWarning: () => void;
  hapticRumble: () => void;
  triggerParticles: (preset: ParticlePreset, x?: string, y?: string) => void;
  triggerVisualEffect: (effect: string) => void;
  addDamageNumber: (amount: number, type: "damage" | "heal" | "critical" | "block", side: "player" | "enemy") => void;
  trackQuestProgress: (action: string, count?: number) => void;
  handleLevelGain: (addExp: number) => void;
  queueStoryEvent: (event: { title: string; message: string; rankColor?: string }) => void;
  startSpiritBindingSequence: (bossName: string, bossRank: string, gatePower: number) => void;
  clearSpiritBindingState: () => void;
  updateStats: (victory: boolean, expGained: number, goldGained: number, gateRank: string) => void;
  setGameStats: React.Dispatch<React.SetStateAction<GameStats>>;
  runAchievementCheck: (noDamageClear?: boolean) => void;
  running: RunningState | null;
  setRunning: React.Dispatch<React.SetStateAction<RunningState | null>>;
  combatResult: CombatResult | null;
  setCombatResult: React.Dispatch<React.SetStateAction<CombatResult | null>>;
  rest: () => void;
}) {
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [bossIntro, setBossIntro] = useState<{
    gate: Gate;
    boss: Boss;
    dialogue: string;
  } | null>(null);
  const [autoDungeon, setAutoDungeon] = useState(false);

  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const beginCombatRef = useRef(false);
  const combatDamageDealtRef = useRef(0);
  const combatDamageTakenRef = useRef(0);
  const autoDungeonRef = useRef<boolean>(false);

  const inRun = Boolean(running);

  // Dungeon tick loop
  useEffect(() => {
    if (!inRun) return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setRunning((prev) => {
        if (!prev) return prev;
        let { boss, hpEnemy, tick } = prev;

        // Apply spirit passive abilities
        const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
        const { dmgBonus: spiritDmgBonus, blockChance: spiritBlockChance, healPerTick: spiritHealPerTick } =
          calcSpiritPassives(player.spirits, hpRatio, tick);

        // Apply dungeon modifiers to combat
        const { playerDmgMult, bossDmgMult } = applyCombatModifiers(
          prev.gate.modifiers || [], spiritDmgBonus
        );

        // Apply boss mechanics
        const previousPhase = boss.phase ?? 0;
        const tempBoss = { ...boss, hp: hpEnemy };
        const mechResult = processBossMechanics(tempBoss, tick, previousPhase);
        playerDmgMult *= mechResult.playerDmgMult;
        bossDmgMult *= mechResult.bossDmgMult;
        const effectiveBossDef = boss.def * mechResult.bossDefMult;

        // Apply boss healing from mechanics (e.g., Troll regeneration)
        if (mechResult.bossHeal > 0) {
          hpEnemy = clamp(hpEnemy + mechResult.bossHeal, 0, boss.maxHp);
        }

        // Update boss phase and mechanic state
        const newPhase = getBossPhase({ ...boss, hp: hpEnemy });
        if (newPhase !== previousPhase || tempBoss.mechanicState !== boss.mechanicState) {
          boss = { ...boss, phase: newPhase, mechanicState: tempBoss.mechanicState };
        }

        // Add mechanic messages to combat log
        if (mechResult.messages.length > 0) {
          setCombatLog((log) => [...log, ...mechResult.messages].slice(-12));
        }

        // Player attack - with spirit bonuses, dungeon modifiers, and boss mechanics
        const dmgPlayer = calcPlayerDamage(pPower, playerDmgMult, effectiveBossDef);
        const oldHpEnemy = hpEnemy;
        hpEnemy = clamp(hpEnemy - dmgPlayer, 0, boss.maxHp);

        // Boss attack - with spirit block chance, dungeon modifiers, and boss mechanics
        const blocked = rollBlock(spiritBlockChance);
        const dmgBoss = calcBossDamage(boss.atk, bossDmgMult, player.stats.VIT, blocked);
        const oldHp = player.hp;
        let newHp = clamp(player.hp - dmgBoss, 0, player.maxHp);

        // Spirit healing
        const healAmount = calcSpiritHealing(spiritHealPerTick, newHp, player.maxHp);
        if (healAmount > 0) {
          newHp = Math.min(newHp + healAmount, player.maxHp);
          addDamageNumber(healAmount, "heal", "player");
        }

        // Accumulate damage for statistics
        combatDamageDealtRef.current += dmgPlayer;
        combatDamageTakenRef.current += dmgBoss;

        // Trigger visual effects, sounds, haptics, particles, and floating damage numbers
        if (dmgPlayer > 0) {
          triggerVisualEffect("screenShake");
          playSound("attack");
          const isCrit = isCriticalHit(dmgPlayer, pPower);
          if (isCrit) {
            triggerVisualEffect("criticalHit");
            playSound("critical");
            hapticHeavy();
            triggerParticles("critical-hit", "75%", "40%");
            addDamageNumber(dmgPlayer, "critical", "enemy");
          } else {
            hapticMedium();
            triggerParticles("combat-hit", "75%", "40%");
            addDamageNumber(dmgPlayer, "damage", "enemy");
          }
        }
        if (dmgBoss > 0) {
          triggerVisualEffect("damageFlash");
          playSound("damage");
          hapticWarning();
          triggerParticles("combat-hit", "25%", "40%");
          addDamageNumber(dmgBoss, "damage", "player");
        } else {
          playSound("block");
          addDamageNumber(0, "block", "player");
        }

        // MP upkeep
        const upkeep = spiritUpkeep(player);
        const newMp = clamp(player.mp - upkeep, 0, player.maxMp);

        // Fatigue gain
        const newFatigue = calcFatigueGain(
          player.fatigue, prestigeUpgrades["fatigue_resist"] || 0
        );

        // Add combat log entries
        const rank = prev.gate?.rank ?? "E";
        setCombatLog((log) => {
          const newEntries: string[] = [];
          const isCrit = isCriticalHit(dmgPlayer, pPower);

          // Player attack
          if (dmgPlayer > 0) {
            if (isCrit) {
              newEntries.push(pick(CRIT_MSGS)(dmgPlayer));
            } else {
              newEntries.push(pick(PLAYER_ATTACK_MSGS)(dmgPlayer));
            }
          }

          // Boss attack
          if (dmgBoss > 0) {
            const rankMsgs = BOSS_ATTACK_MSGS[rank] ?? BOSS_ATTACK_MSGS["E"];
            newEntries.push(pick(rankMsgs)(boss.name, dmgBoss));
          } else {
            newEntries.push(pick(BOSS_BLOCK_MSGS)(boss.name));
          }

          // Boss HP phase transitions
          for (const threshold of detectPhaseTransitions(oldHpEnemy, hpEnemy, boss.maxHp)) {
            newEntries.push(pick(BOSS_PHASE_MSGS[String(threshold)]));
          }

          // Spirit ability procs (throttled to avoid spam)
          if (spiritDmgBonus > 0 && tick % 3 === 0) {
            // Find which spirit abilities are active for flavor
            for (const spirit of player.spirits) {
              for (const ab of (spirit.abilities || [])) {
                if (ab.type !== "passive") continue;
                if (ab.id === "berserker_rage" && player.hp < player.maxHp * 0.5) {
                  newEntries.push(pick(SPIRIT_ABILITY_MSGS["berserker_rage"]));
                  break;
                }
                if (ab.id === "shadow_step" && tick % 3 === 0) {
                  newEntries.push(pick(SPIRIT_ABILITY_MSGS["shadow_step"]));
                  break;
                }
              }
            }
          }
          if (blocked) {
            newEntries.push(pick(SPIRIT_ABILITY_MSGS["ethereal_shield"]));
          }
          if (spiritHealPerTick > 0 && tick % 3 === 0) {
            newEntries.push(pick(SPIRIT_ABILITY_MSGS["vitality_aura"]));
          }

          // Keep only last 8 entries
          return [...log, ...newEntries].slice(-8);
        });

        setPlayer((pp) => ({
          ...pp,
          hp: newHp,
          mp: newMp,
          fatigue: newFatigue,
        }));

        if (hpEnemy <= 0) {
          // Victory
          clearInterval(tickRef.current!);
          playSound("victory");
          playMusic("victory_music", false);
          hapticSuccess();

          const { exp, gold: goldGain } = calcVictoryRewards(
            prev.gate, prestigeUpgrades
          );
          const drop = rollDrop(prev.gate);
          const drops = drop ? [drop] : [];

          // Track quest progress
          trackQuestProgress("monster_defeated");
          if (drop) {
            trackQuestProgress("item_gained");
          }
          // Check if player took no damage for challenge quests
          if (player.hp === player.maxHp) {
            trackQuestProgress("gate_completed_no_damage");
          }

          // Show combat result screen first
          setCombatResult({
            victory: true,
            gate: prev.gate,
            boss: boss,
            expGained: exp,
            goldGained: goldGain,
            drops,
            combatLog: [...combatLog, `Victory! ${boss.name} is defeated! 🎉`],
          });

          // Apply rewards
          setGold((g) => g + goldGain);
          logPush(
            `Cleared ${prev.gate.name}! +${fmt(exp)} EXP, +${fmt(goldGain)}₲`
          );
          handleLevelGain(exp);

          // Apply drops
          if (drop) {
            if (drop.type === "key")
              setPlayer((pp) => ({ ...pp, keys: pp.keys + 1 }));
            else setPlayer((pp) => ({ ...pp, inv: [...pp.inv, drop] }));
            logPush(`Found: ${drop.name}`);
          }

          // Heal to full on victory
          setPlayer((pp) => {
            const healing = calcVictoryHealing(pp.mp, pp.maxHp, pp.maxMp);
            return { ...pp, hp: healing.hp, mp: healing.mp };
          });

          // First-clear celebration — queue story modal for new rank clears
          const victoryRank = prev.gate.rank;
          const alreadyCleared = player.clearedRanks ?? [];
          if (!alreadyCleared.includes(victoryRank)) {
            setPlayer((pp) => ({
              ...pp,
              clearedRanks: [...(pp.clearedRanks ?? []), victoryRank],
            }));
            const firstClear = FIRST_CLEAR_TEXT[victoryRank];
            if (firstClear) {
              queueStoryEvent({ title: firstClear.title, message: firstClear.message });
            }
          }

          // Update statistics
          updateStats(true, exp, goldGain, prev.gate.rank);
          setGameStats((gs) =>
            updateStatsAfterCombat(gs, {
              victory: true,
              expGained: exp,
              goldGained: goldGain,
              damageDealt: combatDamageDealtRef.current,
              damageTaken: combatDamageTakenRef.current,
              ticks: tick + 1,
              gateRank: prev.gate.rank,
              spiritBound: false, // updated later if binding succeeds
            })
          );
          runAchievementCheck(player.hp === player.maxHp);

          // Automatically attempt spirit binding with visual sequence
          const bindBoost = (prestigeUpgrades["bind_chance"] || 0) * 0.03;
          const bindingChance = calcBindingChance(
            player,
            prev.gate.rankIdx
          ) + bindBoost;
          if (Math.random() < bindingChance) {
            // Start the visual binding sequence
            startSpiritBindingSequence(
              boss.name,
              prev.gate.rank,
              prev.gate.power
            );
          }

          // Keep the combat UI visible - don't set running to null yet
          // Remove cleared gate and potentially refresh pool
          setGates((gs) => {
            const filtered = gs.filter((g) => g.id !== prev.gate.id);

            // If we have fewer than 3 gates total, generate a new pool
            if (filtered.length < 3) {
              return generateGatePool(player.level);
            }

            return filtered;
          });
          return null;
        }
        if (newHp <= 0) {
          // Defeat
          clearInterval(tickRef.current!);
          playSound("defeat");
          playMusic("defeat_music", false);
          hapticWarning();

          // Show combat result screen
          setCombatResult({
            victory: false,
            gate: prev.gate,
            boss: boss,
            expGained: 0,
            goldGained: -10,
            drops: [],
            combatLog: [...combatLog, `Defeat! Hunter falls in battle... 💀`],
          });

          logPush(
            `You were defeated in ${prev.gate.name}. Rest and try again.`
          );
          // defeat penalty: lose some gold; recover to 30% HP
          setGold((g) => calcDefeatPenalty(g, 0, 0, 0).gold);
          setPlayer((pp) => {
            const penalty = calcDefeatPenalty(0, pp.maxHp, pp.mp, pp.maxMp);
            return { ...pp, hp: penalty.hp, mp: penalty.mp };
          });

          // Update statistics
          updateStats(false, 0, -10, prev.gate.rank);
          setGameStats((gs) =>
            updateStatsAfterCombat(gs, {
              victory: false,
              expGained: 0,
              goldGained: 0,
              damageDealt: combatDamageDealtRef.current,
              damageTaken: combatDamageTakenRef.current,
              ticks: tick + 1,
              gateRank: prev.gate.rank,
              spiritBound: false,
            })
          );

          // Keep the combat UI visible - don't set running to null yet
          return null;
        }

        // Continue ticking
        return { ...prev, hpEnemy, tick: tick + 1 };
      });
    }, 2500); // Slowed down from 1500ms to 2500ms for much better visibility
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [inRun, pPower, player.stats.VIT, player.maxHp, player.mp, player.hp, player.spirits]);

  function startGate(g: Gate) {
    if (inRun || bossIntro) return;

    // Track gate entry for exploration quests
    trackQuestProgress("gate_entered");

    const dialogue = BOSS_DIALOGUE[g.rank];
    const line = dialogue ? pick(dialogue) : "";

    // Play gate entry sound + haptic rumble
    playSound("gate_enter");
    hapticRumble();
    logPush(`Entered ${g.name} (${g.rank}-Rank)`);

    // Skip boss intro during auto-dungeon — go straight to combat
    if (autoDungeonRef.current) {
      beginCombat(g, line);
      return;
    }

    // Show boss intro sequence first
    setBossIntro({ gate: g, boss: g.boss, dialogue: line });

    // Auto-proceed to combat after 2.5s
    setTimeout(() => {
      beginCombat(g, line);
    }, 2500);
  }

  function beginCombat(g: Gate, dialogueLine: string) {
    // Guard against double-call (timeout + tap)
    if (beginCombatRef.current) return;
    beginCombatRef.current = true;
    setBossIntro(null);

    setRunning({
      gate: g,
      boss: g.boss,
      hpEnemy: g.boss.hp,
      tick: 0,
    });
    const initLog = dialogueLine ? [dialogueLine] : [];
    setCombatLog(initLog);
    setCombatResult(null);
    playMusic("combat_music");
    combatDamageDealtRef.current = 0;
    combatDamageTakenRef.current = 0;

    // Clear any existing spirit binding state
    clearSpiritBindingState();

    // Reset guard after a tick
    setTimeout(() => { beginCombatRef.current = false; }, 100);
  }

  function skipBossIntro() {
    if (!bossIntro) return;
    beginCombat(bossIntro.gate, bossIntro.dialogue);
  }

  function dismissCombatResult() {
    setCombatResult(null);
    setRunning(null); // Clear the combat state
    setCombatLog([]); // Clear the combat log
    playMusic("ambient_music"); // Resume ambient music after combat
  }

  // Refresh gate pool
  function refreshGates() {
    if (inRun) return;
    const cost = gateRefreshCost(player.level);
    if (gold < cost) {
      logPush(`Not enough gold. Need ${cost}₲ to refresh gates.`);
      return;
    }

    setGold((g) => g - cost);
    setGates(generateGatePool(player.level));
    logPush(`Gates refreshed! (-${cost}₲)`);
  }

  // Keep autoDungeonRef in sync with autoDungeon state (for stale closure safety)
  useEffect(() => {
    autoDungeonRef.current = autoDungeon;
  }, [autoDungeon]);

  // Auto-dungeon logic: after each run ends (or combatResult appears), queue next run
  useEffect(() => {
    if (!autoDungeon || inRun || player.fatigue > 80) return;

    // Auto-rest if HP is low before entering next gate
    if (player.hp < player.maxHp * 0.5) {
      const timer = setTimeout(() => {
        if (!autoDungeonRef.current) return;
        if (combatResult) setCombatResult(null);
        rest();
        logPush("Auto-dungeon: Resting before next gate...");
      }, 1500);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      if (!autoDungeonRef.current) return; // user turned it off during delay

      // Auto-dismiss combat result if one is showing
      if (combatResult) setCombatResult(null);

      // Pick gates the player can comfortably clear (power >= actual gate power)
      const clearable = gates.filter(g => pPower >= g.power);
      if (clearable.length === 0) {
        logPush("Auto-dungeon: No suitable gates found. Disabling.");
        setAutoDungeon(false);
        return;
      }

      // Pick highest rank available
      const target = clearable.sort((a, b) => b.rankIdx - a.rankIdx)[0];
      startGate(target);
    }, 3000); // 3 second pause between runs

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDungeon, inRun, gates, pPower, player.fatigue, player.hp, player.maxHp, combatResult]);

  // Auto-disable when fatigue > 80
  useEffect(() => {
    if (player.fatigue > 80 && autoDungeon) {
      setAutoDungeon(false);
      logPush("Auto-dungeon disabled: too fatigued. Rest first!");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.fatigue, autoDungeon]);

  return {
    combatLog,
    setCombatLog,
    bossIntro,
    setBossIntro,
    autoDungeon,
    setAutoDungeon,
    inRun,
    startGate,
    skipBossIntro,
    dismissCombatResult,
    refreshGates,
    beginCombat,
    combatDamageDealtRef,
    combatDamageTakenRef,
  };
}
