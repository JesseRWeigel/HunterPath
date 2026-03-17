import { useEffect, useRef } from "react";
import { getCurrentGameDate } from "@/lib/game/questSystem";
import type { GameTime, Player } from "@/lib/game/types";

/**
 * useGameTime — manages the game-time advance effect (every 30s = 1 game hour)
 * and passive EXP gain when a new day begins.
 */
export function useGameTime({
  setGameTime,
  setLog,
  setPlayer,
}: {
  setGameTime: React.Dispatch<React.SetStateAction<GameTime>>;
  setLog: React.Dispatch<React.SetStateAction<string[]>>;
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
}) {
  const timeRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeRef.current) clearInterval(timeRef.current);
    timeRef.current = setInterval(() => {
      setGameTime((prevTime) => {
        const currentRealDate = getCurrentGameDate();
        const shouldAdvanceDay =
          currentRealDate !== prevTime.currentDate || Math.random() < 0.1;

        if (shouldAdvanceDay) {
          const newDay = prevTime.day + 1;
          setLog((l) => [`Day ${newDay} begins.`, ...l]);

          const passiveExp = Math.floor(10 + newDay * 2);
          setPlayer((p) => ({ ...p, exp: p.exp + passiveExp }));
          setLog((l) => [`+${passiveExp} EXP for surviving another day`, ...l]);

          return {
            day: newDay,
            currentDate: currentRealDate,
            lastReset: currentRealDate,
          };
        }
        return prevTime;
      });
    }, 30000);

    return () => {
      if (timeRef.current) clearInterval(timeRef.current);
    };
  }, [setGameTime, setLog, setPlayer]);
}
