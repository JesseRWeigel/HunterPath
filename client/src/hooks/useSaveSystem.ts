import { useCallback, useEffect, useRef } from "react";
import type { Player, Gate, Daily, GameTime } from "@/lib/game/types";
import { generateDailyQuests, initialGameTime } from "@/lib/game/questSystem";
import { generateGatePool } from "@/lib/game/gateSystem";
import { createInitialPlayer } from "@/lib/game/gameLogic";
import { SPIRIT_TYPES, SPIRIT_ABILITIES, SPIRIT_DESCRIPTIONS } from "@/lib/game/spiritSystem";

// Save format version — bump when the shape of saved data changes
const SAVE_VERSION = 1;

/** Safely read and parse a JSON value from localStorage. Returns `null` on any failure. */
export function safeParse<T = unknown>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[save-recovery] Failed to parse "${key}":`, err);
    return null;
  }
}

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Thematic gate names by rank (needed for migration during load)
const GATE_NAMES: Record<string, string[]> = {
  E: [
    "Goblin Burrow", "Mushroom Grotto", "Rat Warren", "Slime Pit",
    "Mossy Tunnel", "Abandoned Mine", "Shallow Cave", "Dusty Cellar",
  ],
  D: [
    "Orc Stronghold", "Cursed Mines", "Swamp Depths", "Iron Crypt",
    "Bandit Hideout", "Troll Bridge", "Dark Hollow", "Bone Quarry",
  ],
  C: [
    "Shadow Forest", "Moonlit Ruins", "Phantom Keep", "Crimson Marsh",
    "Spider Nest", "Haunted Chapel", "Witch's Glade", "Twilight Gorge",
  ],
  B: [
    "Troll Citadel", "Thunder Peak", "Frozen Fortress", "Magma Cavern",
    "War Bastion", "Storm Spire", "Obsidian Vault", "Siege Grounds",
  ],
  A: [
    "Dragon's Lair", "Inferno Sanctum", "Sky Fortress", "Ashen Throne",
    "Blazing Halls", "Wyrm's Den", "Phoenix Roost", "Flame Citadel",
  ],
  S: [
    "Void Nexus", "Abyssal Gate", "Reality Fracture", "Chaos Rift",
    "World's Edge", "Dimensional Tear", "Oblivion Core", "Shattered Plane",
  ],
};

/** Migrate old-format spirits during save load */
function migrateSpirits(spirits: any[]): any[] {
  return (spirits || [])
    .map((spirit: any) => {
      if (spirit.rarity && spirit.abilities && spirit.type) {
        return spirit;
      }
      const type = SPIRIT_TYPES[rand(0, SPIRIT_TYPES.length - 1)];
      const rarity = "common";
      const availableAbilities = SPIRIT_ABILITIES[type];
      const abilities = availableAbilities.slice(0, 1);
      return {
        id: spirit.id,
        name: spirit.name,
        power: spirit.power,
        rarity,
        abilities,
        level: 1,
        exp: 0,
        expToNext: 100,
        type,
        description: SPIRIT_DESCRIPTIONS[type],
      };
    })
    .filter(
      (s: any) => !s.id?.startsWith("debug_") && !s.name?.startsWith("Debug ")
    );
}

/** Fix maxHp/maxMp if they're lower than expected for the player's level */
function fixPlayerStats(player: any): void {
  const expectedMaxHp = 100 + ((player.level || 1) - 1) * 10;
  const expectedMaxMp = 50 + ((player.level || 1) - 1) * 5;
  if ((player.maxHp || 0) < expectedMaxHp) {
    player.maxHp = expectedMaxHp;
    player.hp = Math.min(player.hp ?? expectedMaxHp, expectedMaxHp);
  }
  if ((player.maxMp || 0) < expectedMaxMp) {
    player.maxMp = expectedMaxMp;
    player.mp = Math.min(player.mp ?? expectedMaxMp, expectedMaxMp);
  }
}

/** Migrate old gate names to thematic names */
function migrateGateNames(gates: any[]): void {
  for (const g of gates) {
    if (/^[A-Z]-Rank Gate/.test(g.name)) {
      const pool = GATE_NAMES[g.rank] ?? GATE_NAMES["E"];
      g.name = pool[Math.floor(Math.random() * pool.length)];
    }
  }
}

interface SaveSystemSetters {
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
  setGates: React.Dispatch<React.SetStateAction<Gate[]>>;
  setGold: React.Dispatch<React.SetStateAction<number>>;
  setDaily: React.Dispatch<React.SetStateAction<Daily>>;
  setGameTime: React.Dispatch<React.SetStateAction<GameTime>>;
  setLog: React.Dispatch<React.SetStateAction<string[]>>;
  setShowRecovery: React.Dispatch<React.SetStateAction<boolean>>;
  setOfflineGains: React.Dispatch<React.SetStateAction<{
    show: boolean;
    exp: number;
    gold: number;
    hours: number;
  } | null>>;
}

interface SaveSystemState {
  player: Player;
  gates: Gate[];
  gold: number;
  daily: Daily;
  gameTime: GameTime;
}

interface UseSaveSystemOptions {
  state: SaveSystemState;
  setters: SaveSystemSetters;
  logPush: (msg: string) => void;
}

/**
 * useSaveSystem — manages autosave, visibility-change save, and all
 * save/load/export/import/reset/recovery functions.
 */
export function useSaveSystem({ state, setters, logPush }: UseSaveSystemOptions) {
  const { player, gates, gold, daily, gameTime } = state;
  const { setPlayer, setGates, setGold, setDaily, setGameTime, setLog, setShowRecovery, setOfflineGains } = setters;

  // Keep refs to current state for the visibility-change handler
  const stateRef = useRef(state);
  stateRef.current = state;

  const silentSave = useCallback(() => {
    const gameState = {
      player: stateRef.current.player,
      gates: stateRef.current.gates,
      gold: stateRef.current.gold,
      gameTime: stateRef.current.gameTime,
      daily: stateRef.current.daily,
      lastSaved: new Date().toISOString(),
      saveVersion: SAVE_VERSION,
    };
    // Rotating backup: copy current autosave -> backup before overwriting
    try {
      const prev = localStorage.getItem("hunters-path-autosave");
      if (prev) {
        localStorage.setItem("hunters-path-backup", prev);
      }
    } catch (e) {
      console.warn("[save-recovery] Failed to write backup:", e);
    }
    localStorage.setItem("hunters-path-autosave", JSON.stringify(gameState));
    localStorage.setItem("hunters-path-save", JSON.stringify(gameState));
  }, []);

  const saveGame = useCallback(() => {
    silentSave();
    logPush("Game saved successfully!");
  }, [silentSave, logPush]);

  const exportSave = useCallback(() => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("hunters-path-")) {
        data[key] = localStorage.getItem(key)!;
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `hunters-path-save-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logPush("Save exported!");
  }, [logPush]);

  const importSave = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (!data["hunters-path-autosave"]) {
            alert("Invalid save file: missing autosave data.");
            return;
          }
          if (
            !window.confirm(
              "This will overwrite your current save. Are you sure?"
            )
          )
            return;
          for (const [key, value] of Object.entries(data)) {
            if (key.startsWith("hunters-path-")) {
              localStorage.setItem(key, value as string);
            }
          }
          window.location.reload();
        } catch {
          alert("Failed to read save file. Is it valid JSON?");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const loadGame = useCallback(() => {
    try {
      const saved = localStorage.getItem("hunters-path-save");
      if (!saved) {
        logPush("No save file found.");
        return;
      }

      const gameState = JSON.parse(saved);

      // Ensure equipment property exists for old save data
      if (!gameState.player.equipment) {
        gameState.player.equipment = {};
      }

      // Handle old daily quest structure
      if (gameState.daily) {
        if (!gameState.daily.questReputation) {
          gameState.daily.questReputation = 0;
        }
        if (
          !gameState.daily.availableQuests ||
          gameState.daily.availableQuests.length === 0
        ) {
          gameState.daily.availableQuests = generateDailyQuests(
            gameState.player.level,
            gameState.daily.questReputation
          );
          gameState.daily.active = true;
        }
      }

      // Migrate spirits
      gameState.player.spirits = migrateSpirits(gameState.player.spirits);

      setPlayer(gameState.player);
      setGates(gameState.gates);
      setGold(gameState.gold);
      setGameTime(gameState.gameTime);
      setDaily(gameState.daily);
      logPush("Game loaded successfully!");
    } catch {
      logPush("Failed to load game. Save file may be corrupted.");
    }
  }, [logPush, setPlayer, setGates, setGold, setGameTime, setDaily]);

  const handleRecoveryFresh = useCallback(() => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("hunters-path-")) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    setShowRecovery(false);
    window.location.reload();
  }, [setShowRecovery]);

  const handleRecoveryBackup = useCallback(() => {
    const backup = safeParse<any>("hunters-path-backup");
    if (!backup || !backup.player) {
      alert("Backup is also corrupt. Please start fresh.");
      return;
    }
    const raw = localStorage.getItem("hunters-path-backup")!;
    localStorage.setItem("hunters-path-autosave", raw);
    localStorage.setItem("hunters-path-save", raw);
    setShowRecovery(false);
    window.location.reload();
  }, [setShowRecovery]);

  const resetGame = useCallback(() => {
    if (
      confirm(
        "Are you sure you want to reset your progress? This cannot be undone."
      )
    ) {
      setPlayer(createInitialPlayer());
      setGates(generateGatePool(1));
      setGold(50);
      setGameTime(initialGameTime());

      const newQuests = generateDailyQuests(1, 0);
      setDaily({
        active: true,
        availableQuests: newQuests,
        completedQuests: [],
        completed: false,
        penaltyArmed: false,
        questReputation: 0,
      });

      setLog(["Game reset. Welcome back, Hunter!"]);
      localStorage.removeItem("hunters-path-save");
    }
  }, [setPlayer, setGates, setGold, setGameTime, setDaily, setLog]);

  const deleteAllSaveData = useCallback(() => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("hunters-path-")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  }, []);

  // Load game on startup
  useEffect(() => {
    const raw = localStorage.getItem("hunters-path-autosave");
    if (raw) {
      let gameState: any;
      try {
        gameState = JSON.parse(raw);
      } catch (err) {
        console.error("[save-recovery] Corrupt autosave detected:", err);
        setShowRecovery(true);
        return;
      }
      if (!gameState || !gameState.player) {
        console.error("[save-recovery] Autosave missing player data");
        setShowRecovery(true);
        return;
      }
      try {
        // Migrate spirits
        gameState.player.spirits = migrateSpirits(gameState.player.spirits);

        // Fix maxHp/maxMp
        fixPlayerStats(gameState.player);

        setPlayer(gameState.player);

        // Migrate old gate names
        const loadedGates = gameState.gates || generateGatePool(gameState.player?.level || 1);
        migrateGateNames(loadedGates);
        setGates(loadedGates);

        setGold(gameState.gold || 50);
        setGameTime(gameState.gameTime || initialGameTime());
        setDaily(
          gameState.daily || {
            active: true,
            availableQuests: generateDailyQuests(
              gameState.player?.level || 1,
              0
            ),
            completedQuests: [],
            completed: false,
            penaltyArmed: false,
            questReputation: 0,
          }
        );

        // Calculate offline progress
        if (gameState.lastSaved) {
          const msElapsed = Date.now() - new Date(gameState.lastSaved).getTime();
          const hoursElapsed = Math.min(8, msElapsed / (1000 * 60 * 60));

          if (hoursElapsed >= 0.1) {
            const level = gameState.player?.level || 1;
            const offlineExpPerHour = 20 + level * 5;
            const offlineGoldPerHour = 10 + level * 3;
            const offlineExp = Math.floor(offlineExpPerHour * hoursElapsed);
            const offlineGold = Math.floor(offlineGoldPerHour * hoursElapsed);

            setGold(g => g + offlineGold);

            setPlayer(p => {
              let exp = p.exp + offlineExp;
              let level = p.level;
              let expNext = p.expNext;
              let points = p.points;
              let maxHp = p.maxHp;
              let maxMp = p.maxMp;

              while (exp >= expNext) {
                exp -= expNext;
                level += 1;
                expNext = Math.floor(expNext * 1.35);
                points += 5;
                maxHp += 10;
                maxMp += 5;
              }

              return { ...p, exp, level, expNext, points, maxHp, maxMp };
            });

            setOfflineGains({
              show: true,
              exp: offlineExp,
              gold: offlineGold,
              hours: hoursElapsed,
            });
          }
        }

        setLog(["Game loaded from auto-save. Welcome back, Hunter!"]);
      } catch (error) {
        console.error("[save-recovery] Failed to apply auto-save:", error);
        setShowRecovery(true);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save: persists within 1s of any state change.
  useEffect(() => {
    const timer = setTimeout(() => {
      const gameState = {
        player, gates, gold, gameTime, daily,
        lastSaved: new Date().toISOString(),
        saveVersion: SAVE_VERSION,
      };
      // Rotating backup
      try {
        const prev = localStorage.getItem("hunters-path-autosave");
        if (prev) localStorage.setItem("hunters-path-backup", prev);
      } catch { /* best-effort */ }
      localStorage.setItem("hunters-path-autosave", JSON.stringify(gameState));
      localStorage.setItem("hunters-path-save", JSON.stringify(gameState));
    }, 1000);
    return () => clearTimeout(timer);
  }, [player, gates, gold, daily, gameTime]);

  // Save immediately when user switches away or closes the PWA
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") saveGame();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [saveGame]);

  return {
    saveGame,
    exportSave,
    importSave,
    loadGame,
    resetGame,
    deleteAllSaveData,
    handleRecoveryFresh,
    handleRecoveryBackup,
    silentSave,
    safeParse,
  };
}
