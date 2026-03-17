import { useCallback } from "react";
import { clamp, rand } from "@/lib/game/gameUtils";
import type { Player } from "@/lib/game/types";

/**
 * useTraining — extracts doTraining and doWork functions.
 */
export function useTraining({
  setPlayer,
  setGold,
  logPush,
  handleLevelGain,
  inRun,
}: {
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
  setGold: React.Dispatch<React.SetStateAction<number>>;
  logPush: (msg: string) => void;
  handleLevelGain: (addExp: number) => void;
  inRun: boolean;
}) {
  const doTraining = useCallback(
    (type: "physical" | "mental" | "meditation") => {
      if (inRun) return;

      let expGain = 0;
      let fatigueGain = 0;
      let message = "";

      switch (type) {
        case "physical":
          expGain = rand(8, 15);
          fatigueGain = rand(5, 10);
          message = "Physical training complete. Your body grows stronger.";
          break;
        case "mental":
          expGain = rand(6, 12);
          fatigueGain = rand(3, 7);
          message = "Mental training sharpens your focus.";
          break;
        case "meditation":
          expGain = rand(4, 8);
          fatigueGain = -rand(5, 12);
          message = "Meditation brings clarity and peace.";
          break;
      }

      setPlayer((p) => ({
        ...p,
        exp: p.exp + expGain,
        fatigue: clamp(p.fatigue + fatigueGain, 0, 100),
      }));

      handleLevelGain(expGain);
      logPush(`${message} +${expGain} EXP`);
    },
    [inRun, setPlayer, handleLevelGain, logPush],
  );

  const doWork = useCallback(() => {
    if (inRun) return;

    const goldGain = rand(15, 35);
    const expGain = rand(3, 8);
    const fatigueGain = rand(8, 15);

    setGold((g) => g + goldGain);
    setPlayer((p) => ({
      ...p,
      exp: p.exp + expGain,
      fatigue: clamp(p.fatigue + fatigueGain, 0, 100),
    }));

    handleLevelGain(expGain);
    logPush(`Work complete. +${goldGain}₲, +${expGain} EXP (but more fatigue)`);
  }, [inRun, setGold, setPlayer, handleLevelGain, logPush]);

  return { doTraining, doWork };
}
