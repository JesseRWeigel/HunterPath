import { useState } from "react";
import { calcBindingChance } from "@/lib/game/gameLogic";
import { createSpirit } from "@/lib/game/spiritSystem";
import { RANKS } from "@/lib/game/gateSystem";
import type { Player, RunningState, CombatResult } from "@/lib/game/types";
import type { ParticlePreset } from "@/lib/particles";
import { rand } from "@/lib/game/gameUtils";

type BossRank = (typeof RANKS)[number];

/**
 * useSpiritBinding — extracts spirit binding sequence UI and logic.
 */
export function useSpiritBinding({
  player,
  setPlayer,
  running,
  setCombatResult,
  playSound,
  hapticSuccess,
  hapticWarning,
  triggerParticles,
  logPush,
  recordSpiritBinding,
  runAchievementCheck,
}: {
  player: Player;
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
  running: RunningState | null;
  setCombatResult: React.Dispatch<React.SetStateAction<CombatResult | null>>;
  playSound: (sound: string) => void;
  hapticSuccess: () => void;
  hapticWarning: () => void;
  triggerParticles: (preset: ParticlePreset, x?: string, y?: string) => void;
  logPush: (msg: string) => void;
  recordSpiritBinding: () => void;
  runAchievementCheck: (noDamageClear?: boolean) => void;
}) {
  const [spiritBindingState, setSpiritBindingState] = useState<{
    isActive: boolean;
    phase: "preparing" | "extracting" | "success" | "failure" | null;
    progress: number;
    bossName: string;
    bossRank: string;
  }>({
    isActive: false,
    phase: null,
    progress: 0,
    bossName: "",
    bossRank: "",
  });

  function startSpiritBindingSequence(
    bossName: string,
    bossRank: string,
    gatePower: number
  ) {
    setSpiritBindingState({
      isActive: true,
      phase: "preparing",
      progress: 0,
      bossName,
      bossRank,
    });

    // Play binding start sound
    playSound("binding_start");

    // Phase 1: Preparing (2 seconds)
    setTimeout(() => {
      setSpiritBindingState((prev) => ({
        ...prev,
        phase: "extracting",
        progress: 0,
      }));

      // Play binding loop sound
      playSound("binding_loop");

      // Phase 2: Extracting (3 seconds with progress animation)
      const bindingInterval = setInterval(() => {
        setSpiritBindingState((prev) => {
          if (prev.progress >= 100) {
            clearInterval(bindingInterval);
            return prev;
          }
          return { ...prev, progress: prev.progress + 2 };
        });
      }, 60); // Update every 60ms for smooth animation

      // After 3 seconds, determine success/failure
      setTimeout(() => {
        const chance = calcBindingChance(player, RANKS.indexOf(bossRank as BossRank));
        const success = Math.random() < chance;

        setSpiritBindingState((prev) => ({
          ...prev,
          phase: success ? "success" : "failure",
          progress: 100,
        }));

        // Play success/failure sound + haptics + particles
        if (success) {
          playSound("binding_success");
          hapticSuccess();
          triggerParticles("spirit-bind", "50%", "50%");

          // Create the spirit and update player state
          const spiritBound = createSpirit(
            gatePower,
            RANKS.indexOf(bossRank as BossRank)
          );

          setPlayer((pp) => ({
            ...pp,
            spirits: [...pp.spirits, spiritBound],
          }));

          recordSpiritBinding();
          logPush(
            `${spiritBound.rarity.toUpperCase()} spirit bound: ${
              spiritBound.name
            }! (${spiritBound.type})`
          );

          // Update combat result with the bound spirit
          setCombatResult((prev) =>
            prev
              ? {
                  ...prev,
                  spiritBound,
                }
              : prev
          );
        } else {
          playSound("binding_failure");
          hapticWarning();
        }

        // End sequence after 2 seconds
        setTimeout(() => {
          setSpiritBindingState({
            isActive: false,
            phase: null,
            progress: 0,
            bossName: "",
            bossRank: "",
          });
        }, 2000);
      }, 3000);
    }, 2000);
  }

  function getBindingSequenceText() {
    const { phase, bossName, progress } = spiritBindingState;

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

  function tryBinding(bossRankIdx: number) {
    const chance = calcBindingChance(player, bossRankIdx);
    const cost = 10;
    if (player.mp < cost) {
      logPush("Not enough MP to attempt binding.");
      return;
    }

    // Get boss info for the sequence
    const bossRank = RANKS[bossRankIdx];
    const bossName = running?.boss.name || "Unknown Boss";

    // Start the visual binding sequence
    startSpiritBindingSequence(
      bossName,
      bossRank,
      running?.gate.power || 100
    );

    // Consume MP immediately
    setPlayer((p) => ({ ...p, mp: Math.max(0, p.mp - cost) }));

    // The actual binding logic will be handled in the sequence
    // We'll update the player and stats when the sequence completes
    setTimeout(() => {
      if (Math.random() < chance) {
        const pow = Math.floor(
          5 + player.stats.INT * 0.8 + bossRankIdx * 6 + rand(0, 8)
        );
        const s = createSpirit(pow, bossRankIdx);
        setPlayer((p) => ({ ...p, spirits: [...p.spirits, s] }));
        logPush(
          `${s.rarity.toUpperCase()} spirit bound: ${s.name}! (${
            s.type
          }) - +${s.power} power`
        );

        // Update statistics
        recordSpiritBinding();
        runAchievementCheck();
      } else {
        logPush("Binding failed. The shade crumbles to dust.");
      }
    }, 7000); // Wait for the full sequence to complete
  }

  return {
    spiritBindingState,
    setSpiritBindingState,
    startSpiritBindingSequence,
    getBindingSequenceText,
    tryBinding,
  };
}
