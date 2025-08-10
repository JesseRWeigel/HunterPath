import React, { useEffect, useMemo, useRef, useState } from "react";

// Hunter's Path — A Solo Leveling–inspired idle/roguelite built for Canvas preview
// Notes:
// - Uses the *logic* of Solo Leveling: Gates/Dungeons, Daily Quests with penalties,
//   stat allocation on level-up, fatigue, shadow extraction (post-boss), instant dungeons.
// - Avoids copyrighted characters/story specifics; it's an homage to the mechanics.
//
// Play tips:
// 1) Complete Daily Quest before running a dungeon to avoid penalties.
// 2) Allocate stat points after leveling up (top-right panel).
// 3) Beat a dungeon boss to attempt Shadow Extraction — your INT and LUCK matter.
// 4) Fatigue rises with runs; high fatigue reduces damage and raises failure risk.
// 5) Instant Dungeon Keys drop sometimes; use them for a bonus run.

// ---------- Utility ----------
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (n: number) => new Intl.NumberFormat().format(Math.floor(n));

const RANKS = ["E", "D", "C", "B", "A", "S"];

const RANK_COLORS = {
  E: "bg-green-600",
  D: "bg-blue-600",
  C: "bg-purple-600",
  B: "bg-red-600",
  A: "bg-orange-600",
  S: "bg-yellow-600",
};

const STAT_ICONS = {
  STR: "fas fa-fist-raised",
  AGI: "fas fa-running",
  INT: "fas fa-brain",
  VIT: "fas fa-heart",
  LUCK: "fas fa-dice",
};

const STAT_COLORS = {
  STR: "bg-red-600",
  AGI: "bg-green-600",
  INT: "bg-blue-600",
  VIT: "bg-orange-600",
  LUCK: "bg-yellow-600",
};

interface Boss {
  name: string;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
}

interface Gate {
  id: string;
  name: string;
  rank: string;
  rankIdx: number;
  recommended: number;
  power: number;
  boss: Boss;
}

interface Shadow {
  id: string;
  name: string;
  power: number;
}

interface Item {
  id: string;
  name: string;
  type: string;
}

interface Player {
  level: number;
  exp: number;
  expNext: number;
  hp: number;
  mp: number;
  maxHp: number;
  maxMp: number;
  fatigue: number;
  points: number;
  stats: {
    STR: number;
    AGI: number;
    INT: number;
    VIT: number;
    LUCK: number;
  };
  shadows: Shadow[];
  inv: Item[];
  keys: number;
}

interface DailyTask {
  id: string;
  name: string;
  need: number;
  have: number;
}

interface Daily {
  active: boolean;
  tasks: DailyTask[];
  completed: boolean;
  penaltyArmed: boolean;
  completedDate?: string; // Track when it was completed to allow reset
}

interface GameTime {
  day: number;
  currentDate: string;
  lastReset: string;
}

interface RunningState {
  gate: Gate;
  boss: Boss;
  hpEnemy: number;
  tick: number;
}

interface CombatResult {
  victory: boolean;
  gate: Gate;
  boss: Boss;
  expGained: number;
  goldGained: number;
  drops: Item[];
  shadowExtracted?: Shadow;
  combatLog: string[];
}

// Simple statistics interfaces for Phase 1
interface PlayerStatistics {
  totalGatesCompleted: number;
  totalGatesFailed: number;
  totalExpGained: number;
  totalGoldGained: number;
  totalShadowsExtracted: number;
  highestGateRank: string;
  lastUpdated: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: string;
}

function gatePowerForRank(rankIdx: number) {
  // More balanced scaling - lower initial difficulty
  return Math.pow(1.8, rankIdx) * 30 + rankIdx * 15;
}

function makeGate(rankIdx: number): Gate {
  const id = uid();
  const rank = RANKS[rankIdx];
  const rec = gatePowerForRank(rankIdx);
  const variance = rand(-20, 20);
  const power = Math.max(10, rec + variance);
  return {
    id,
    name: `${rank}-Rank Gate ${id.slice(0, 3).toUpperCase()}`,
    rank,
    rankIdx,
    recommended: rec,
    power,
    boss: makeBoss(rankIdx),
  };
}

function makeBoss(rankIdx: number): Boss {
  const base = gatePowerForRank(rankIdx);
  const rank = RANKS[rankIdx];
  const monsterData = MONSTER_DATA[rank as keyof typeof MONSTER_DATA];

  return {
    name: monsterData.name,
    maxHp: Math.floor(base * 8 + rand(-25, 25)),
    hp: Math.floor(base * 8 + rand(-25, 25)),
    atk: Math.floor(base * 0.8 + rand(-5, 5)),
    def: Math.floor(base * 0.3 + rand(-3, 3)),
  };
}

function shadowName() {
  const names = [
    "Umbra",
    "Noctis",
    "Tenebris",
    "Kage",
    "Silens",
    "Vorago",
    "Ater",
    "Nox",
    "Moria",
    "Caecus",
  ];
  return names[rand(0, names.length - 1)] + "-" + rand(1, 999);
}

function initialPlayer(): Player {
  return {
    level: 1,
    exp: 0,
    expNext: 100,
    hp: 100,
    mp: 50,
    maxHp: 100,
    maxMp: 50,
    fatigue: 0, // 0–100
    points: 5,
    stats: {
      STR: 5,
      AGI: 5,
      INT: 5,
      VIT: 5,
      LUCK: 5,
    },
    shadows: [], // {id, name, power, upkeep}
    inv: [], // {id, name, type}
    keys: 0, // Instant Dungeon Keys
  };
}

function playerPower(p: Player) {
  const { STR, AGI, INT, VIT } = p.stats;
  // More balanced power calculation - each stat matters more
  const base = STR * 3 + AGI * 2 + INT * 1.5 + VIT * 0.5;
  const shadowBonus = p.shadows.reduce((a, s) => a + s.power, 0);
  const fatiguePenalty = 1 - Math.min(0.4, p.fatigue / 250); // reduced penalty, up to -40%
  return Math.max(1, (base + shadowBonus) * fatiguePenalty);
}

function shadowUpkeep(p: Player) {
  // MP upkeep per tick when in dungeon
  return Math.floor(
    p.shadows.length * 1 + p.shadows.reduce((a, s) => a + s.power * 0.02, 0)
  );
}

function calcExtractionChance(p: Player, bossRankIdx: number) {
  // Improved extraction chance - more accessible and fun
  const { INT, LUCK } = p.stats;

  // Higher base chance for better gameplay
  const base = 0.25 + INT * 0.008 + LUCK * 0.01; // 25% base + better stat scaling

  // Reduced rank penalty - higher ranks are still harder but not impossible
  const rankPenalty = 0.03 * bossRankIdx; // 3% per rank instead of 5%

  // Higher minimum chance for better player experience
  return clamp(base - rankPenalty, 0.08, 0.85); // 8%–85% instead of 2%–65%
}

function gainExpGoldFromGate(gate: Gate) {
  const base = gate.recommended;
  const exp = Math.floor(base * 1.1 + rand(10, 40));
  const gold = Math.floor(base * 0.8 + rand(5, 25));
  return { exp, gold };
}

function rollDrop(gate: Gate) {
  const r = Math.random();
  if (r < 0.08) return { id: uid(), name: "Instant Dungeon Key", type: "key" };
  if (r < 0.28) {
    // Generate specific stat runes
    const statTypes = ["STR", "AGI", "INT", "VIT", "LUCK"];
    const statType = statTypes[rand(0, statTypes.length - 1)];
    return {
      id: uid(),
      name: `${gate.rank}-grade ${statType} Rune`,
      type: "rune",
    };
  }
  if (r < 0.55)
    return { id: uid(), name: `${gate.rank}-grade Potion`, type: "potion" };
  return null;
}

function formatGameTime(gameTime: GameTime): string {
  return `Day ${gameTime.day} - ${gameTime.currentDate}`;
}

function getCurrentGameDate(): string {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}/${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function initialGameTime(): GameTime {
  const currentDate = getCurrentGameDate();
  return {
    day: 1,
    currentDate,
    lastReset: currentDate,
  };
}

// ---------- React UI Components ----------
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`game-card rounded-xl border p-6 shadow-2xl ${className}`}>
      {children}
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  sm,
  theme = "default",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  sm?: boolean;
  theme?: string;
  className?: string;
}) {
  const base =
    "rounded-xl px-4 py-2 font-bold transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105";
  const size = sm ? "px-3 py-1 text-sm" : "text-sm";
  const themeCls =
    theme === "danger"
      ? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white"
      : "bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-500 hover:to-purple-400 text-white";
  return (
    <button
      className={`${base} ${size} ${themeCls} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Bar({
  label,
  value,
  max,
  color = "progress-hp",
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="mt-3">
      <div className="flex justify-between text-sm opacity-90 mb-1">
        <span>{label}</span>
        <span>
          {fmt(value)} / {fmt(max)} ({pct}%)
        </span>
      </div>
      <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BarMini({
  value,
  max,
  color = "bg-emerald-500",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function generateGatePool(playerLevel: number): Gate[] {
  const gates: Gate[] = [];

  // Always have multiple E-rank gates available (2-4)
  const eGateCount = rand(2, 4);
  for (let i = 0; i < eGateCount; i++) {
    gates.push(makeGate(0));
  }

  // Add D-rank gates if player level >= 3
  if (playerLevel >= 3) {
    const dGateCount = rand(2, 4);
    for (let i = 0; i < dGateCount; i++) {
      gates.push(makeGate(1));
    }
  }

  // Add C-rank gates if player level >= 6
  if (playerLevel >= 6) {
    const cGateCount = rand(2, 4);
    for (let i = 0; i < cGateCount; i++) {
      gates.push(makeGate(2));
    }
  }

  // Add B-rank gates if player level >= 10
  if (playerLevel >= 10) {
    const bGateCount = rand(2, 4);
    for (let i = 0; i < bGateCount; i++) {
      gates.push(makeGate(3));
    }
  }

  // Add A-rank gates if player level >= 15 (increased count)
  if (playerLevel >= 15) {
    const aGateCount = rand(2, 4); // Increased from 1-2 to 2-4
    for (let i = 0; i < aGateCount; i++) {
      gates.push(makeGate(4));
    }
  }

  // Add S-rank gates if player level >= 18 (lowered from 20)
  if (playerLevel >= 18) {
    const sGateCount = rand(1, 2); // Allow 1-2 S-rank gates
    for (let i = 0; i < sGateCount; i++) {
      gates.push(makeGate(5));
    }
  }

  // For very high levels, add even more high-rank gates
  if (playerLevel >= 25) {
    // Add extra A-rank gates
    const extraAGateCount = rand(1, 2);
    for (let i = 0; i < extraAGateCount; i++) {
      gates.push(makeGate(4));
    }

    // Add extra S-rank gates
    const extraSGateCount = rand(1, 2);
    for (let i = 0; i < extraSGateCount; i++) {
      gates.push(makeGate(5));
    }
  }

  return gates;
}

// Monster data for immersive experience
const MONSTER_DATA = {
  E: {
    name: "Goblin Warrior",
    description:
      "A small but fierce goblin with crude weapons. Though weak individually, they fight with surprising ferocity.",
    icon: "fas fa-user-ninja",
    color: "text-green-400",
    bgColor: "bg-green-900/30",
    borderColor: "border-green-500/30",
    environment:
      "A dimly lit cave with moss-covered walls and scattered bones.",
    sound: "High-pitched screeches echo through the cavern...",
  },
  D: {
    name: "Orc Berserker",
    description:
      "A muscular orc warrior with blood-red eyes. Their rage makes them unpredictable and dangerous.",
    icon: "fas fa-user-shield",
    color: "text-blue-400",
    bgColor: "bg-blue-900/30",
    borderColor: "border-blue-500/30",
    environment: "A torch-lit dungeon with iron bars and the stench of battle.",
    sound: "Deep roars shake the dungeon walls...",
  },
  C: {
    name: "Dark Elf Assassin",
    description:
      "A shadowy figure with deadly precision. Their movements are like liquid darkness.",
    icon: "fas fa-user-secret",
    color: "text-purple-400",
    bgColor: "bg-purple-900/30",
    borderColor: "border-purple-500/30",
    environment:
      "A moonlit forest clearing with twisted trees and mysterious shadows.",
    sound: "Whispers of ancient magic fill the air...",
  },
  B: {
    name: "Troll Chieftain",
    description:
      "A massive troll with stone-like skin. Their club can crush bones with a single swing.",
    icon: "fas fa-user-graduate",
    color: "text-red-400",
    bgColor: "bg-red-900/30",
    borderColor: "border-red-500/30",
    environment: "A rocky mountain pass with jagged peaks and howling winds.",
    sound: "Thunderous footsteps echo across the mountains...",
  },
  A: {
    name: "Dragon Knight",
    description:
      "A legendary warrior clad in dragon-scale armor. Their sword burns with ancient fire.",
    icon: "fas fa-user-crown",
    color: "text-orange-400",
    bgColor: "bg-orange-900/30",
    borderColor: "border-orange-500/30",
    environment: "A grand hall with towering pillars and dragon banners.",
    sound: "The clash of steel and roar of dragons fills the hall...",
  },
  S: {
    name: "Shadow Lord",
    description:
      "A being of pure darkness and malice. Their very presence corrupts the air around them.",
    icon: "fas fa-user-tie",
    color: "text-yellow-400",
    bgColor: "bg-yellow-900/30",
    borderColor: "border-yellow-500/30",
    environment:
      "A void of absolute darkness where reality itself seems to bend.",
    sound: "The fabric of space itself seems to tear...",
  },
};

export default function HuntersPath() {
  const [player, setPlayer] = useState<Player>(initialPlayer);
  const [log, setLog] = useState<string[]>([
    "Welcome, Hunter. Complete your Daily Quest, then clear a Gate.",
  ]);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [gates, setGates] = useState<Gate[]>(() => generateGatePool(1));
  const [running, setRunning] = useState<RunningState | null>(null); // { gate, boss, tick, inBoss, hpEnemy }
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
  const [visualEffects, setVisualEffects] = useState<{
    damageFlash: boolean;
    healFlash: boolean;
    criticalHit: boolean;
    screenShake: boolean;
    levelUp: boolean;
    statAllocation: boolean;
  }>({
    damageFlash: false,
    healFlash: false,
    criticalHit: false,
    screenShake: false,
    levelUp: false,
    statAllocation: false,
  });
  const [gold, setGold] = useState(50); // Start with some gold for gate refreshes
  const [gameTime, setGameTime] = useState<GameTime>(initialGameTime);
  const [daily, setDaily] = useState<Daily>({
    active: false,
    tasks: [
      { id: "train", name: "Training Reps", need: 30, have: 0 },
      { id: "run", name: "Cardio Minutes", need: 5, have: 0 },
      { id: "focus", name: "Meditation Cycles", need: 3, have: 0 },
    ],
    completed: false,
    penaltyArmed: false,
  });

  // Sound management state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [currentMusic, setCurrentMusic] = useState<string | null>(null);

  // Audio refs for sound management
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const musicRef = useRef<HTMLAudioElement | null>(null);

  // Web Audio API for fallback sounds
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioInitializedRef = useRef(false);

  // Simple statistics state for Phase 1
  const [playerStats, setPlayerStats] = useState<PlayerStatistics>({
    totalGatesCompleted: 0,
    totalGatesFailed: 0,
    totalExpGained: 0,
    totalGoldGained: 0,
    totalShadowsExtracted: 0,
    highestGateRank: "E",
    lastUpdated: new Date().toISOString(),
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showStats, setShowStats] = useState(false);

  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const timeRef = useRef<NodeJS.Timeout | null>(null);

  const pPower = useMemo(() => playerPower(player), [player]);

  const inRun = Boolean(running);

  // Shadow extraction sequence state
  const [shadowExtractionState, setShadowExtractionState] = useState<{
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

  // Level-up celebration state
  const [levelUpState, setLevelUpState] = useState({
    isActive: false,
    newLevel: 0,
    statPointsGained: 0,
    showStatAllocation: false,
  });

  // Stat progression tracking
  const [statHistory, setStatHistory] = useState<
    {
      level: number;
      stats: Player["stats"];
      power: number;
      timestamp: string;
    }[]
  >([]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      const gameState = {
        player,
        gates,
        gold,
        gameTime,
        daily,
      };
      localStorage.setItem("hunters-path-autosave", JSON.stringify(gameState));

      // Also save statistics
      const statsData = {
        playerStats,
        achievements,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem("hunters-path-stats", JSON.stringify(statsData));
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [player, gates, gold, gameTime, daily, playerStats, achievements]);

  // Auto-trigger stat allocation after level-up celebration
  useEffect(() => {
    if (levelUpState.isActive && !levelUpState.showStatAllocation) {
      const timer = setTimeout(() => {
        setLevelUpState((prev) => ({ ...prev, showStatAllocation: true }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [levelUpState.isActive, levelUpState.showStatAllocation]);

  // Load statistics on component mount
  useEffect(() => {
    try {
      const savedStats = localStorage.getItem("hunters-path-stats");
      if (savedStats) {
        const stats = JSON.parse(savedStats);
        if (stats.playerStats) {
          setPlayerStats(stats.playerStats);
        }
        if (stats.achievements) {
          setAchievements(stats.achievements);
        }
      }
    } catch (error) {
      console.error("Failed to load statistics:", error);
    }
  }, []);

  // Start ambient music on mount
  useEffect(() => {
    // Don't auto-start music due to autoplay policies
    // Music will start on first user interaction
  }, [musicEnabled]);

  // Load game on startup
  useEffect(() => {
    const saved = localStorage.getItem("hunters-path-autosave");
    if (saved) {
      try {
        const gameState = JSON.parse(saved);
        setPlayer(gameState.player);
        setGates(
          gameState.gates || generateGatePool(gameState.player?.level || 1)
        );
        setGold(gameState.gold || 50);
        setGameTime(gameState.gameTime || initialGameTime());
        setDaily(
          gameState.daily || {
            active: false,
            tasks: [
              { id: "train", name: "Training Reps", need: 30, have: 0 },
              { id: "run", name: "Cardio Minutes", need: 5, have: 0 },
              { id: "focus", name: "Meditation Cycles", need: 3, have: 0 },
            ],
            completed: false,
            penaltyArmed: false,
          }
        );
        setLog(["Game loaded from auto-save. Welcome back, Hunter!"]);
      } catch (error) {
        console.error("Failed to load auto-save:", error);
      }
    }
  }, []);

  // Game time system - advance time every 30 seconds (1 game hour)
  useEffect(() => {
    if (timeRef.current) clearInterval(timeRef.current);
    timeRef.current = setInterval(() => {
      setGameTime((prevTime) => {
        const currentRealDate = getCurrentGameDate();
        const shouldAdvanceDay =
          currentRealDate !== prevTime.currentDate || Math.random() < 0.1; // 10% chance per hour or real day change

        if (shouldAdvanceDay) {
          const newDay = prevTime.day + 1;
          setLog((l) => [
            `Day ${newDay} begins. Daily Quest is available again.`,
            ...l,
          ]);

          // Reset daily quest for new day
          setDaily({
            active: false,
            tasks: [
              { id: "train", name: "Training Reps", need: 30, have: 0 },
              { id: "run", name: "Cardio Minutes", need: 5, have: 0 },
              { id: "focus", name: "Meditation Cycles", need: 3, have: 0 },
            ],
            completed: false,
            penaltyArmed: false,
          });

          // Passive experience gain for surviving another day
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
    }, 30000); // 30 seconds = 1 game hour

    return () => {
      if (timeRef.current) clearInterval(timeRef.current);
    };
  }, []);

  // Dungeon tick loop
  useEffect(() => {
    if (!inRun) return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setRunning((prev) => {
        if (!prev) return prev;
        let { boss, hpEnemy, tick } = prev;

        // Player attack - increased base damage
        const dmgPlayer = Math.max(
          1,
          Math.floor(pPower * 1.2 - boss.def * 0.3 + rand(0, 6))
        );
        const oldHpEnemy = hpEnemy;
        hpEnemy = clamp(hpEnemy - dmgPlayer, 0, boss.maxHp);

        // Boss attack - slightly reduced boss damage
        const dmgBoss = Math.max(
          0,
          Math.floor(boss.atk * 0.8 - player.stats.VIT * 0.7 + rand(0, 3))
        );
        const oldHp = player.hp;
        const newHp = clamp(player.hp - dmgBoss, 0, player.maxHp);

        // Trigger visual effects and sounds
        if (dmgPlayer > 0) {
          triggerVisualEffect("screenShake");
          playSound("attack");
          if (dmgPlayer > pPower * 1.5) {
            triggerVisualEffect("criticalHit");
            playSound("critical");
          }
        }
        if (dmgBoss > 0) {
          triggerVisualEffect("damageFlash");
          playSound("damage");
        } else {
          playSound("block");
        }

        // MP upkeep
        const upkeep = shadowUpkeep(player);
        const newMp = clamp(player.mp - upkeep, 0, player.maxMp);

        // Fatigue gain
        const newFatigue = clamp(player.fatigue + 0.5, 0, 100);

        // Add combat log entries
        setCombatLog((log) => {
          const newEntries = [];

          // Player attack
          if (dmgPlayer > 0) {
            newEntries.push(`Hunter attacks for ${dmgPlayer} damage!`);
          }

          // Boss attack
          if (dmgBoss > 0) {
            newEntries.push(`${boss.name} attacks for ${dmgBoss} damage!`);
          } else {
            newEntries.push(`${boss.name}'s attack is blocked!`);
          }

          // Critical hits
          if (dmgPlayer > pPower * 1.5) {
            newEntries.push("Critical hit! 💥");
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

          const { exp, gold: goldGain } = gainExpGoldFromGate(prev.gate);
          const drop = rollDrop(prev.gate);
          const drops = drop ? [drop] : [];

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
          setLog((l) => [
            `Cleared ${prev.gate.name}! +${fmt(exp)} EXP, +${fmt(goldGain)}₲`,
            ...l,
          ]);
          handleLevelGain(exp);

          // Apply drops
          if (drop) {
            if (drop.type === "key")
              setPlayer((pp) => ({ ...pp, keys: pp.keys + 1 }));
            else setPlayer((pp) => ({ ...pp, inv: [...pp.inv, drop] }));
            setLog((l) => [`Found: ${drop.name}`, ...l]);
          }

          // Update statistics
          updateStats(true, exp, goldGain, prev.gate.rank);
          checkAchievements();

          // Automatically attempt shadow extraction with visual sequence
          const extractionChance = calcExtractionChance(
            player,
            prev.gate.rankIdx
          );
          if (Math.random() < extractionChance) {
            // Start the visual extraction sequence
            startShadowExtractionSequence(
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

          setLog((l) => [
            `You were defeated in ${prev.gate.name}. Rest and try again.`,
            ...l,
          ]);
          // defeat penalty: lose some gold and gain fatigue
          setGold((g) => Math.max(0, g - 10));
          setPlayer((pp) => ({
            ...pp,
            hp: Math.max(5, Math.floor(pp.maxHp * 0.2)),
          }));

          // Update statistics
          updateStats(false, 0, -10, prev.gate.rank);

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
  }, [inRun, pPower, player.stats.VIT, player.maxHp, player.mp, player.hp]);

  function handleLevelGain(addExp: number) {
    setPlayer((p) => {
      let exp = p.exp + addExp;
      let level = p.level;
      let expNext = p.expNext;
      let points = p.points;
      let maxHp = p.maxHp;
      let maxMp = p.maxMp;
      let leveledUp = false;
      let levelsGained = 0;

      while (exp >= expNext) {
        exp -= expNext;
        level += 1;
        leveledUp = true;
        levelsGained += 1;
        expNext = Math.floor(expNext * 1.35);
        points += 5;
        maxHp += 10;
        maxMp += 5;

        logPush(`Level Up! Welcome to level ${level}. +5 stat points!`);
        playSound("level_up");
      }

      // If player leveled up, refresh gates to unlock new tiers
      if (leveledUp) {
        // Record stat history before level up
        setStatHistory((prev) => [
          ...prev,
          {
            level: p.level,
            stats: p.stats,
            power: playerPower(p),
            timestamp: new Date().toISOString(),
          },
        ]);

        // Trigger level-up celebration
        setLevelUpState({
          isActive: true,
          newLevel: level,
          statPointsGained: levelsGained * 5,
          showStatAllocation: false,
        });

        // Trigger visual effects
        triggerVisualEffect("levelUp");

        setTimeout(() => {
          setGates(generateGatePool(level));
          logPush(
            `New gates appeared! Higher tier dungeons are now available.`
          );
        }, 1000);
      }

      return {
        ...p,
        exp,
        level,
        expNext,
        points,
        maxHp,
        maxMp,
        hp: Math.max(p.hp, Math.floor(maxHp * 0.6)),
        mp: Math.max(p.mp, Math.floor(maxMp * 0.5)),
      };
    });
  }

  function logPush(msg: string) {
    setLog((l) => [msg, ...l].slice(0, 120));
  }

  // Simple statistics tracking functions
  function updateStats(
    victory: boolean,
    expGained: number,
    goldGained: number,
    gateRank: string
  ) {
    setPlayerStats((stats) => {
      const newStats = { ...stats };

      if (victory) {
        newStats.totalGatesCompleted += 1;
      } else {
        newStats.totalGatesFailed += 1;
      }

      newStats.totalExpGained += expGained;
      newStats.totalGoldGained += goldGained;

      // Update highest gate rank
      const rankOrder = ["E", "D", "C", "B", "A", "S"];
      const currentRankIdx = rankOrder.indexOf(stats.highestGateRank);
      const newRankIdx = rankOrder.indexOf(gateRank);
      if (newRankIdx > currentRankIdx) {
        newStats.highestGateRank = gateRank;
      }

      newStats.lastUpdated = new Date().toISOString();
      return newStats;
    });
  }

  function recordShadowExtraction() {
    setPlayerStats((stats) => ({
      ...stats,
      totalShadowsExtracted: stats.totalShadowsExtracted + 1,
      lastUpdated: new Date().toISOString(),
    }));
  }

  function checkAchievements() {
    const newAchievements: Achievement[] = [];

    // First victory achievement
    if (
      playerStats.totalGatesCompleted === 1 &&
      !achievements.some((a) => a.name === "First Blood")
    ) {
      newAchievements.push({
        id: uid(),
        name: "First Blood",
        description: "Win your first gate battle",
        unlockedAt: new Date().toISOString(),
      });
    }

    // Gate master achievement
    if (
      playerStats.totalGatesCompleted === 10 &&
      !achievements.some((a) => a.name === "Gate Master")
    ) {
      newAchievements.push({
        id: uid(),
        name: "Gate Master",
        description: "Complete 10 gates",
        unlockedAt: new Date().toISOString(),
      });
    }

    // Shadow caller achievement
    if (
      playerStats.totalShadowsExtracted === 1 &&
      !achievements.some((a) => a.name === "Shadow Caller")
    ) {
      newAchievements.push({
        id: uid(),
        name: "Shadow Caller",
        description: "Extract your first shadow",
        unlockedAt: new Date().toISOString(),
      });
    }

    // Add new achievements
    if (newAchievements.length > 0) {
      setAchievements((current) => [...current, ...newAchievements]);

      // Show achievement notifications
      newAchievements.forEach((achievement) => {
        logPush(`🏆 Achievement Unlocked: ${achievement.name}!`);
      });
    }
  }

  // Shadow extraction sequence functions
  function startShadowExtractionSequence(
    bossName: string,
    bossRank: string,
    gatePower: number
  ) {
    setShadowExtractionState({
      isActive: true,
      phase: "preparing",
      progress: 0,
      bossName,
      bossRank,
    });

    // Play extraction start sound
    playSound("extraction_start");

    // Phase 1: Preparing (2 seconds)
    setTimeout(() => {
      setShadowExtractionState((prev) => ({
        ...prev,
        phase: "extracting",
        progress: 0,
      }));

      // Play extraction loop sound
      playSound("extraction_loop");

      // Phase 2: Extracting (3 seconds with progress animation)
      const extractionInterval = setInterval(() => {
        setShadowExtractionState((prev) => {
          if (prev.progress >= 100) {
            clearInterval(extractionInterval);
            return prev;
          }
          return { ...prev, progress: prev.progress + 2 };
        });
      }, 60); // Update every 60ms for smooth animation

      // After 3 seconds, determine success/failure
      setTimeout(() => {
        const chance = calcExtractionChance(player, RANKS.indexOf(bossRank));
        const success = Math.random() < chance;

        setShadowExtractionState((prev) => ({
          ...prev,
          phase: success ? "success" : "failure",
          progress: 100,
        }));

        // Play success/failure sound
        if (success) {
          playSound("extraction_success");

          // Create the shadow and update player state
          const shadowExtracted = {
            id: uid(),
            name: shadowName(),
            power: Math.floor(gatePower * 0.8),
          };

          setPlayer((pp) => ({
            ...pp,
            shadows: [...pp.shadows, shadowExtracted],
          }));

          recordShadowExtraction();
          setLog((l) => [`Shadow extracted: ${shadowExtracted.name}!`, ...l]);

          // Update combat result with the extracted shadow
          setCombatResult((prev) =>
            prev
              ? {
                  ...prev,
                  shadowExtracted,
                }
              : prev
          );
        } else {
          playSound("extraction_failure");
        }

        // End sequence after 2 seconds
        setTimeout(() => {
          setShadowExtractionState({
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

  function getExtractionSequenceText() {
    const { phase, bossName, progress } = shadowExtractionState;

    switch (phase) {
      case "preparing":
        return {
          title: "Shadow Extraction Initiated",
          subtitle: `Preparing to extract shadow from ${bossName}...`,
          description: "Gathering magical energy and focusing your will...",
        };
      case "extracting":
        return {
          title: "Extracting Shadow",
          subtitle: `${progress}% Complete`,
          description: "The shadow essence is being drawn forth...",
        };
      case "success":
        return {
          title: "Extraction Successful!",
          subtitle: `${bossName}'s shadow joins you!`,
          description: "A new shadow ally has been bound to your will.",
        };
      case "failure":
        return {
          title: "Extraction Failed",
          subtitle: "The shadow crumbles to dust...",
          description: "The essence was too weak or your focus wavered.",
        };
      default:
        return { title: "", subtitle: "", description: "" };
    }
  }

  function startGate(g: Gate) {
    if (inRun) return;
    if (daily.active && !daily.completed) {
      // entering while daily in progress arms penalty
      setDaily((d) => ({ ...d, penaltyArmed: true }));
    }

    // Initialize audio on first gate entry
    if (!audioInitializedRef.current) {
      initializeAudio();
    }

    // Clear any existing combat result
    setCombatResult(null);

    const boss = makeBoss(g.rankIdx);
    setRunning({ gate: g, boss, hpEnemy: boss.hp, tick: 0 });

    // Initialize combat log
    setCombatLog([
      `Hunter enters ${g.name}...`,
      `The air is heavy with malevolent energy...`,
      `A ${g.rank}-rank boss appears: ${boss.name}!`,
      `Combat begins!`,
    ]);

    logPush(`Entered ${g.name}. The air is heavy...`);
    playSound("gate_enter");
    playMusic("combat_music");
  }

  function rest() {
    if (inRun) return;
    const heal = Math.floor(player.maxHp * 0.4);
    const mp = Math.floor(player.maxMp * 0.5);
    setPlayer((p) => ({
      ...p,
      hp: clamp(p.hp + heal, 0, p.maxHp),
      mp: clamp(p.mp + mp, 0, p.maxMp),
      fatigue: clamp(p.fatigue - 20, 0, 100),
    }));
    logPush("You took a rest. Deus reficit — you feel renewed.");
    playSound("rest");
    playMusic("ambient_music");
  }

  function allocate(stat: keyof Player["stats"]) {
    if (player.points <= 0) return;
    setPlayer((p) => ({
      ...p,
      points: p.points - 1,
      stats: { ...p.stats, [stat]: p.stats[stat] + 1 },
    }));
  }

  function startDaily() {
    if (daily.active || daily.completed) return;
    setDaily((d) => ({ ...d, active: true }));
    logPush(
      "Daily Quest accepted: Train, Run, Meditate. Finish it today or face the penalty."
    );
  }

  function progressDaily(id: string) {
    if (!daily.active || daily.completed) return;
    setDaily((d) => {
      const tasks = d.tasks.map((t) =>
        t.id === id ? { ...t, have: clamp(t.have + 1, 0, t.need) } : t
      );
      const done = tasks.every((t) => t.have >= t.need);
      if (done)
        logPush("Daily Quest completed! +25 EXP, -10 Fatigue, +1 potion.");
      if (done) {
        setPlayer((p) => ({
          ...p,
          exp: p.exp + 25,
          fatigue: clamp(p.fatigue - 10, 0, 100),
          inv: [...p.inv, { id: uid(), name: "Daily Potion", type: "potion" }],
        }));
      }
      return { ...d, tasks, completed: done };
    });
  }

  function forfeitDaily() {
    if (!daily.active || daily.completed) return;
    setDaily((d) => ({ ...d, active: false }));
    applyPenaltyZone();
  }

  function applyPenaltyZone() {
    // In the source logic, failure triggers a Penalty Zone. We'll simulate a harsh debuff.
    setPlayer((p) => ({
      ...p,
      hp: Math.max(1, Math.floor(p.maxHp * 0.1)),
      fatigue: clamp(p.fatigue + 25, 0, 100),
    }));
    logPush(
      "Penalty Zone: You pushed boulders for hours. HP to a sliver; Fatigue up."
    );
  }

  function tryExtraction(bossRankIdx: number) {
    const chance = calcExtractionChance(player, bossRankIdx);
    const cost = 10;
    if (player.mp < cost) {
      logPush("Not enough MP to attempt extraction.");
      return;
    }

    // Get boss info for the sequence
    const bossRank = RANKS[bossRankIdx];
    const bossName = running?.boss.name || "Unknown Boss";

    // Start the visual extraction sequence
    startShadowExtractionSequence(
      bossName,
      bossRank,
      running?.gate.power || 100
    );

    // Consume MP immediately
    setPlayer((p) => ({ ...p, mp: Math.max(0, p.mp - cost) }));

    // The actual extraction logic will be handled in the sequence
    // We'll update the player and stats when the sequence completes
    setTimeout(() => {
      if (Math.random() < chance) {
        const pow = Math.floor(
          5 + player.stats.INT * 0.8 + bossRankIdx * 6 + rand(0, 8)
        );
        const s = { id: uid(), name: shadowName(), power: pow };
        setPlayer((p) => ({ ...p, shadows: [...p.shadows, s] }));
        logPush(
          `Shadow Extraction succeeded! ${s.name} joins you (+${pow} power).`
        );

        // Update statistics
        recordShadowExtraction();
        checkAchievements();
      } else {
        logPush("Extraction failed. The shade crumbles to dust.");
      }
    }, 7000); // Wait for the full sequence to complete
  }

  // Test function for shadow extraction (for easier testing)
  function testShadowExtraction() {
    // Function removed for production
  }

  function usePotion(itemId: string) {
    const idx = player.inv.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const item = player.inv[idx];
    if (item.type !== "potion") return;

    const oldHp = player.hp;
    const oldMp = player.mp;

    setPlayer((p) => ({
      ...p,
      hp: clamp(p.hp + Math.floor(p.maxHp * 0.5), 0, p.maxHp),
      mp: clamp(p.mp + Math.floor(p.maxMp * 0.3), 0, p.maxMp),
      inv: p.inv.filter((i) => i.id !== itemId),
    }));

    // Trigger heal visual effect
    triggerVisualEffect("healFlash");
    playSound("heal");

    // Add combat log entry if in combat
    if (inRun && running) {
      const hpGain = Math.floor(player.maxHp * 0.5);
      const mpGain = Math.floor(player.maxMp * 0.3);
      setCombatLog((log) => [
        ...log.slice(-7),
        `Hunter uses a potion! +${hpGain} HP, +${mpGain} MP`,
      ]);
    }

    logPush(
      "You used a potion. 体力回復 (tairyoku kaifuku): vitality restored."
    );
  }

  function useRune(itemId: string) {
    const idx = player.inv.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const item = player.inv[idx];
    if (item.type !== "rune") return;

    // Parse rune name to get rank and type
    const runeName = item.name;
    const rankMatch = runeName.match(/([A-Z])-grade/);
    const typeMatch = runeName.match(/([A-Z]+)-grade/);

    if (!rankMatch || !typeMatch) {
      logPush("Invalid rune format. Cannot use this rune.");
      return;
    }

    const rank = rankMatch[1];
    const rankIdx = RANKS.indexOf(rank);
    if (rankIdx === -1) {
      logPush("Unknown rune rank. Cannot use this rune.");
      return;
    }

    // Determine stat type from rune name
    let statType: keyof Player["stats"] | null = null;
    if (runeName.includes("STR")) statType = "STR";
    else if (runeName.includes("AGI")) statType = "AGI";
    else if (runeName.includes("INT")) statType = "INT";
    else if (runeName.includes("VIT")) statType = "VIT";
    else if (runeName.includes("LUCK")) statType = "LUCK";
    else {
      // Random stat if not specified
      const statKeys: (keyof Player["stats"])[] = [
        "STR",
        "AGI",
        "INT",
        "VIT",
        "LUCK",
      ];
      statType = statKeys[rand(0, statKeys.length - 1)];
    }

    // Calculate stat boost based on rank
    const baseBoost = rankIdx + 1; // E=1, D=2, C=3, B=4, A=5, S=6
    const variance = rand(-1, 1); // Small variance
    const statBoost = Math.max(1, baseBoost + variance);

    // Apply stat boost
    setPlayer((p) => ({
      ...p,
      stats: {
        ...p.stats,
        [statType!]: p.stats[statType!] + statBoost,
      },
      inv: p.inv.filter((i) => i.id !== itemId),
    }));

    logPush(
      `Used ${item.name}! +${statBoost} ${statType} permanently. 魔力強化 (maryoku kyōka): magical enhancement.`
    );
    playSound("rune_use");
  }

  function useKey() {
    if (player.keys <= 0 || inRun) return;
    const rankIdx = clamp(rand(1, 3), 0, RANKS.length - 1);
    const g = makeGate(rankIdx);
    setPlayer((p) => ({ ...p, keys: p.keys - 1 }));
    startGate({ ...g, name: `Instant Dungeon: ${g.name}` });
  }

  function dismissCombatResult() {
    setCombatResult(null);
    setRunning(null); // Clear the combat state
    setCombatLog([]); // Clear the combat log
  }

  function triggerVisualEffect(effect: keyof typeof visualEffects) {
    setVisualEffects((prev) => ({ ...prev, [effect]: true }));
    setTimeout(() => {
      setVisualEffects((prev) => ({ ...prev, [effect]: false }));
    }, 300);
  }

  // Additional training activities for more EXP
  function doTraining(type: "physical" | "mental" | "meditation") {
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
        fatigueGain = -rand(5, 12); // Meditation reduces fatigue
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
  }

  // Work for gold and small EXP
  function doWork() {
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
  }

  // Shop functions
  function buyPotion() {
    const cost = 25;
    if (gold < cost) {
      logPush(`Not enough gold. Need ${cost}₲ for a potion.`);
      return;
    }

    setGold((g) => g - cost);
    setPlayer((p) => ({
      ...p,
      inv: [...p.inv, { id: uid(), name: "Health Potion", type: "potion" }],
    }));
    logPush(`Purchased a Health Potion for ${cost}₲`);
  }

  function buyUpgrade(type: "weapon" | "armor" | "accessory") {
    let cost = 0;
    let bonus = 0;
    let statType = "";

    switch (type) {
      case "weapon":
        cost = 100 + player.level * 25;
        bonus = 3 + Math.floor(player.level / 3);
        statType = "STR";
        break;
      case "armor":
        cost = 80 + player.level * 20;
        bonus = 2 + Math.floor(player.level / 4);
        statType = "VIT";
        break;
      case "accessory":
        cost = 120 + player.level * 30;
        bonus = 2 + Math.floor(player.level / 5);
        statType = "LUCK";
        break;
    }

    if (gold < cost) {
      logPush(`Not enough gold. Need ${cost}₲ for ${type} upgrade.`);
      return;
    }

    setGold((g) => g - cost);
    setPlayer((p) => ({
      ...p,
      stats: {
        ...p.stats,
        [statType]: p.stats[statType as keyof Player["stats"]] + bonus,
      },
    }));
    logPush(`Purchased ${type} upgrade! +${bonus} ${statType} for ${cost}₲`);
  }

  // Refresh gate pool
  function refreshGates() {
    if (inRun) return;
    const cost = Math.max(10, player.level * 5);
    if (gold < cost) {
      logPush(`Not enough gold. Need ${cost}₲ to refresh gates.`);
      return;
    }

    setGold((g) => g - cost);
    setGates(generateGatePool(player.level));
    logPush(`Gates refreshed! (-${cost}₲)`);
  }

  // Save/Load functions
  function saveGame() {
    const gameState = {
      player,
      gates,
      gold,
      gameTime,
      daily,
    };
    localStorage.setItem("hunters-path-save", JSON.stringify(gameState));
    logPush("Game saved successfully!");
  }

  function loadGame() {
    try {
      const saved = localStorage.getItem("hunters-path-save");
      if (!saved) {
        logPush("No save file found.");
        return;
      }

      const gameState = JSON.parse(saved);
      setPlayer(gameState.player);
      setGates(gameState.gates);
      setGold(gameState.gold);
      setGameTime(gameState.gameTime);
      setDaily(gameState.daily);
      logPush("Game loaded successfully!");
    } catch (error) {
      logPush("Failed to load save file.");
    }
  }

  function resetGame() {
    if (
      confirm(
        "Are you sure you want to reset your progress? This cannot be undone."
      )
    ) {
      setPlayer(initialPlayer());
      setGates(generateGatePool(1));
      setGold(50);
      setGameTime(initialGameTime());
      setDaily({
        active: false,
        tasks: [
          { id: "train", name: "Training Reps", need: 30, have: 0 },
          { id: "run", name: "Cardio Minutes", need: 5, have: 0 },
          { id: "focus", name: "Meditation Cycles", need: 3, have: 0 },
        ],
        completed: false,
        penaltyArmed: false,
      });
      setLog(["Game reset. Welcome back, Hunter!"]);
      localStorage.removeItem("hunters-path-save");
    }
  }

  // Arm penalty if player enters dungeon mid-daily and then completes after — simulate auto-trigger at end of fight
  useEffect(() => {
    if (!inRun && daily.penaltyArmed) {
      setDaily((d) => ({ ...d, penaltyArmed: false }));
      applyPenaltyZone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRun]);

  // Sound management functions
  function playSound(soundName: string, volumeOverride?: number) {
    if (!soundEnabled) return;

    try {
      const audio = audioRefs.current[soundName];
      if (audio) {
        audio.volume = volumeOverride !== undefined ? volumeOverride : volume;
        audio.currentTime = 0;

        // Check if the audio file is valid by testing its duration
        if (audio.duration && audio.duration > 0) {
          audio.play().catch(() => {
            // Fallback to generated sounds if audio file fails
            playFallbackSound(soundName);
          });
        } else {
          // Audio file is invalid (like our placeholder), use fallback
          playFallbackSound(soundName);
        }
      } else {
        // No audio file available, use fallback
        playFallbackSound(soundName);
      }
    } catch (error) {
      // Fallback to generated sounds on any error
      playFallbackSound(soundName);
    }
  }

  function playMusic(musicName: string, loop: boolean = true) {
    if (!musicEnabled || currentMusic === musicName) return;

    try {
      // Stop current music
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.currentTime = 0;
      }

      // Start new music
      const audio = audioRefs.current[musicName];
      if (audio) {
        audio.volume = volume * 0.5; // Music at half volume
        audio.loop = loop;
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Fallback to generated music if audio file fails
          if (musicName === "ambient_music") {
            startAmbientMusic();
          }
        });
        musicRef.current = audio;
        setCurrentMusic(musicName);
      } else {
        // No music file available, use fallback
        if (musicName === "ambient_music") {
          startAmbientMusic();
          setCurrentMusic(musicName);
        }
      }
    } catch (error) {
      // Fallback to generated music on any error
      if (musicName === "ambient_music") {
        startAmbientMusic();
        setCurrentMusic(musicName);
      }
    }
  }

  function stopMusic() {
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current.currentTime = 0;
      musicRef.current = null;
      setCurrentMusic(null);
    }
  }

  function updateVolume(newVolume: number) {
    setVolume(newVolume);

    // Update all audio elements
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio === musicRef.current) {
        audio.volume = newVolume * 0.5; // Music at half volume
      } else {
        audio.volume = newVolume;
      }
    });
  }

  function toggleSound() {
    setSoundEnabled(!soundEnabled);
    // Initialize audio on first sound toggle
    if (!audioInitializedRef.current) {
      initializeAudio();
    }
  }

  function toggleMusic() {
    setMusicEnabled((prevMusicEnabled) => {
      const newMusicEnabled = !prevMusicEnabled;

      // Initialize audio on first music toggle
      if (!audioInitializedRef.current) {
        initializeAudio();
      }

      if (newMusicEnabled) {
        // Music is being enabled
        if (currentMusic) {
          playMusic(currentMusic);
        } else {
          // Start ambient music if no current music
          playMusic("ambient_music");
        }
      } else {
        // Music is being disabled
        stopMusic();
      }

      return newMusicEnabled;
    });
  }

  // Web Audio API sound generation functions
  function createAudioContext() {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    // Resume audio context if it's suspended (required for autoplay policy)
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }

  function initializeAudio() {
    if (audioInitializedRef.current) return;

    try {
      const audioContext = createAudioContext();
      // Resume the context to enable audio
      if (audioContext.state === "suspended") {
        audioContext.resume().then(() => {
          audioInitializedRef.current = true;
          console.log("Audio context initialized successfully");
        });
      } else {
        audioInitializedRef.current = true;
      }
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
    }
  }

  function generateSound(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume: number = 0.3
  ) {
    if (!soundEnabled) return;

    // Initialize audio context on first sound
    if (!audioInitializedRef.current) {
      initializeAudio();
    }

    try {
      const audioContext = createAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        volume,
        audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      // Silently handle audio errors
    }
  }

  function playFallbackSound(soundName: string) {
    if (!soundEnabled) return;

    switch (soundName) {
      case "attack":
        generateSound(800, 0.1, "square", 0.2);
        break;
      case "damage":
        generateSound(200, 0.3, "sawtooth", 0.3);
        break;
      case "critical":
        generateSound(1200, 0.2, "square", 0.4);
        setTimeout(() => generateSound(800, 0.2, "square", 0.3), 100);
        break;
      case "block":
        generateSound(400, 0.15, "sine", 0.2);
        break;
      case "victory":
        generateSound(523, 0.2, "sine", 0.3); // C
        setTimeout(() => generateSound(659, 0.2, "sine", 0.3), 200); // E
        setTimeout(() => generateSound(784, 0.3, "sine", 0.3), 400); // G
        break;
      case "defeat":
        generateSound(200, 0.5, "sawtooth", 0.4);
        setTimeout(() => generateSound(150, 0.5, "sawtooth", 0.4), 500);
        break;
      case "heal":
        generateSound(600, 0.2, "sine", 0.2);
        setTimeout(() => generateSound(800, 0.2, "sine", 0.2), 200);
        break;
      case "rune_use":
        generateSound(1000, 0.3, "sine", 0.3);
        setTimeout(() => generateSound(1200, 0.2, "sine", 0.2), 300);
        break;
      case "level_up":
        generateSound(523, 0.15, "sine", 0.3); // C
        setTimeout(() => generateSound(659, 0.15, "sine", 0.3), 150); // E
        setTimeout(() => generateSound(784, 0.15, "sine", 0.3), 300); // G
        setTimeout(() => generateSound(1047, 0.3, "sine", 0.3), 450); // C high
        break;
      case "rest":
        generateSound(300, 0.4, "sine", 0.2);
        setTimeout(() => generateSound(400, 0.3, "sine", 0.2), 400);
        break;
      case "gate_enter":
        generateSound(150, 0.3, "sawtooth", 0.3);
        setTimeout(() => generateSound(200, 0.3, "sawtooth", 0.3), 300);
        break;
      case "extraction_start":
        generateSound(400, 0.2, "sine", 0.2);
        setTimeout(() => generateSound(600, 0.2, "sine", 0.2), 200);
        break;
      case "extraction_loop":
        generateSound(800, 0.1, "sine", 0.1);
        break;
      case "extraction_success":
        generateSound(523, 0.2, "sine", 0.3); // C
        setTimeout(() => generateSound(659, 0.2, "sine", 0.3), 200); // E
        setTimeout(() => generateSound(784, 0.2, "sine", 0.3), 400); // G
        setTimeout(() => generateSound(1047, 0.4, "sine", 0.3), 600); // C high
        break;
      case "extraction_failure":
        generateSound(200, 0.4, "sawtooth", 0.3);
        setTimeout(() => generateSound(150, 0.4, "sawtooth", 0.3), 400);
        break;
      default:
        generateSound(500, 0.1, "sine", 0.2);
    }
  }

  // Simple ambient music generator
  function startAmbientMusic() {
    if (!musicEnabled) return;

    // Initialize audio context on first music
    if (!audioInitializedRef.current) {
      initializeAudio();
    }

    const audioContext = createAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Create a gentle ambient drone
    oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A3
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      volume * 0.1,
      audioContext.currentTime + 2
    ); // Very quiet

    oscillator.start(audioContext.currentTime);

    // Store reference to stop later
    musicRef.current = {
      pause: () => {
        oscillator.stop();
        gainNode.disconnect();
      },
      currentTime: 0,
    } as any;
  }

  // Stat progression visualization component
  function StatProgressionChart() {
    if (statHistory.length < 2) return null;

    const maxStats = {
      STR: Math.max(...statHistory.map((h) => h.stats.STR)),
      AGI: Math.max(...statHistory.map((h) => h.stats.AGI)),
      INT: Math.max(...statHistory.map((h) => h.stats.INT)),
      VIT: Math.max(...statHistory.map((h) => h.stats.VIT)),
      LUCK: Math.max(...statHistory.map((h) => h.stats.LUCK)),
    };

    const totalMax = Math.max(...Object.values(maxStats));

    return (
      <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-600/30">
        <h4 className="text-lg font-bold text-zinc-100 mb-4">
          <i className="fas fa-chart-line mr-2 text-blue-400"></i>
          Stat Progression
        </h4>

        <div className="space-y-3">
          {Object.entries(maxStats).map(([stat, maxValue]) => {
            const currentValue = player.stats[stat as keyof Player["stats"]];
            const percentage =
              totalMax > 0 ? (currentValue / totalMax) * 100 : 0;

            return (
              <div key={stat} className="flex items-center space-x-3">
                <div className="w-12 text-sm text-zinc-400 font-bold">
                  {stat}
                </div>
                <div className="flex-1 bg-zinc-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="w-12 text-sm text-zinc-300 font-bold text-right">
                  {currentValue}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-xs text-zinc-500 text-center">
          Showing progression over {statHistory.length} recorded points
        </div>
      </div>
    );
  }

  function completeLevelUp() {
    setLevelUpState({
      isActive: false,
      newLevel: 0,
      statPointsGained: 0,
      showStatAllocation: false,
    });
  }

  function allocateStatWithFeedback(stat: keyof Player["stats"]) {
    if (player.points <= 0) return;

    // Trigger visual feedback
    triggerVisualEffect("statAllocation");

    setPlayer((p) => ({
      ...p,
      points: p.points - 1,
      stats: { ...p.stats, [stat]: p.stats[stat] + 1 },
    }));

    // Play stat allocation sound
    playSound("rune_use"); // Reuse rune sound for stat allocation

    // Record stat change
    setStatHistory((prev) => [
      ...prev,
      {
        level: player.level,
        stats: { ...player.stats, [stat]: player.stats[stat] + 1 },
        power: playerPower({
          ...player,
          stats: { ...player.stats, [stat]: player.stats[stat] + 1 },
        }),
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  return (
    <div className="min-h-screen game-gradient font-game text-zinc-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
                  Hunter's Path
                </h1>
                <p className="text-zinc-400 mt-1">
                  A Solo Leveling-inspired idle roguelite
                </p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-zinc-800 px-4 py-2 rounded-lg">
                    <i className="fas fa-calendar text-purple-400"></i>
                    <span className="font-bold">
                      {formatGameTime(gameTime)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 bg-zinc-800 px-4 py-2 rounded-lg">
                    <i className="fas fa-coins text-yellow-400"></i>
                    <span className="font-bold">{fmt(gold)}</span>
                    <span className="text-zinc-400 text-sm">₲</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-zinc-800 px-4 py-2 rounded-lg">
                    <i className="fas fa-key text-violet-400"></i>
                    <span className="font-bold">{player.keys}</span>
                    <span className="text-zinc-400 text-sm">Keys</span>
                  </div>
                  <Btn
                    onClick={() => setShowStats(!showStats)}
                    theme="default"
                    sm
                  >
                    <i className="fas fa-chart-bar mr-1"></i>
                    Stats
                  </Btn>
                  <Btn onClick={resetGame} theme="danger" sm>
                    <i className="fas fa-trash mr-1"></i>
                    Reset
                  </Btn>
                  <div className="flex items-center space-x-2 bg-zinc-800 px-3 py-1 rounded-lg">
                    <button
                      onClick={toggleSound}
                      className={`text-sm ${
                        soundEnabled ? "text-green-400" : "text-red-400"
                      }`}
                      title={soundEnabled ? "Sound On" : "Sound Off"}
                    >
                      <i
                        className={`fas ${
                          soundEnabled ? "fa-volume-up" : "fa-volume-mute"
                        }`}
                      ></i>
                    </button>
                    <button
                      onClick={toggleMusic}
                      className={`text-sm ${
                        musicEnabled ? "text-blue-400" : "text-red-400"
                      }`}
                      title={musicEnabled ? "Music On" : "Music Off"}
                    >
                      <i
                        className={`fas ${
                          musicEnabled ? "fa-music" : "fa-music-slash"
                        }`}
                      ></i>
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => updateVolume(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
                      title={`Volume: ${Math.round(volume * 100)}%`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Player & Actions */}
          <section className="lg:col-span-1 space-y-6">
            <Card>
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                  <i className="fas fa-user-ninja text-2xl text-white"></i>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100">Hunter</h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-violet-400 font-bold">
                      Level {player.level}
                    </span>
                    <span className="text-zinc-400">•</span>
                    <span className="text-zinc-400">Power: {fmt(pPower)}</span>
                  </div>
                </div>
              </div>

              <Bar
                label="HP"
                value={player.hp}
                max={player.maxHp}
                color="progress-hp"
              />
              <Bar
                label="MP"
                value={player.mp}
                max={player.maxMp}
                color="progress-mp"
              />
              <Bar
                label="EXP"
                value={player.exp}
                max={player.expNext}
                color="progress-exp"
              />

              {player.fatigue > 0 && (
                <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-3 mt-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <i className="fas fa-exclamation-triangle text-orange-400"></i>
                    <span className="text-sm text-orange-200">
                      Fatigue: {Math.round(player.fatigue)}%
                    </span>
                  </div>
                  <BarMini
                    value={player.fatigue}
                    max={100}
                    color="progress-fatigue"
                  />
                </div>
              )}

              <div className="flex gap-2 mt-6 flex-wrap">
                <Btn onClick={rest} disabled={inRun}>
                  <i className="fas fa-bed mr-2"></i>
                  Rest & Recover
                </Btn>
                <Btn onClick={useKey} disabled={player.keys <= 0 || inRun}>
                  <i className="fas fa-key mr-2"></i>
                  Use Key ({player.keys})
                </Btn>
                <Btn
                  onClick={startDaily}
                  disabled={daily.active || daily.completed || inRun}
                >
                  Start Daily
                </Btn>
                <Btn
                  onClick={refreshGates}
                  disabled={inRun || gold < Math.max(10, player.level * 5)}
                >
                  <i className="fas fa-sync mr-2"></i>
                  Refresh Gates ({Math.max(10, player.level * 5)}₲)
                </Btn>
                <Btn onClick={saveGame} disabled={inRun}>
                  <i className="fas fa-save mr-2"></i>
                  Save Game
                </Btn>
                <Btn onClick={loadGame} disabled={inRun}>
                  <i className="fas fa-upload mr-2"></i>
                  Load Game
                </Btn>
                {daily.active && !daily.completed && (
                  <Btn onClick={forfeitDaily} theme="danger">
                    <i className="fas fa-times mr-2"></i>
                    Forfeit Daily
                  </Btn>
                )}
              </div>
            </Card>

            {/* Training Activities */}
            <Card>
              <h3 className="text-lg font-bold mb-4 text-violet-300">
                <i className="fas fa-dumbbell mr-2"></i>
                Training Activities
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  <Btn
                    onClick={() => doTraining("physical")}
                    disabled={inRun}
                    className="justify-start text-left"
                  >
                    <i className="fas fa-fist-raised mr-2 text-red-400"></i>
                    Physical Training
                    <span className="ml-auto text-xs text-zinc-400">
                      8-15 EXP
                    </span>
                  </Btn>
                  <Btn
                    onClick={() => doTraining("mental")}
                    disabled={inRun}
                    className="justify-start text-left"
                  >
                    <i className="fas fa-brain mr-2 text-blue-400"></i>
                    Mental Training
                    <span className="ml-auto text-xs text-zinc-400">
                      6-12 EXP
                    </span>
                  </Btn>
                  <Btn
                    onClick={() => doTraining("meditation")}
                    disabled={inRun}
                    className="justify-start text-left"
                  >
                    <i className="fas fa-leaf mr-2 text-green-400"></i>
                    Meditation
                    <span className="ml-auto text-xs text-zinc-400">
                      4-8 EXP, -Fatigue
                    </span>
                  </Btn>
                  <Btn
                    onClick={doWork}
                    disabled={inRun}
                    className="justify-start text-left"
                  >
                    <i className="fas fa-hammer mr-2 text-yellow-400"></i>
                    Work Job
                    <span className="ml-auto text-xs text-zinc-400">
                      15-35₲, 3-8 EXP
                    </span>
                  </Btn>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Train to gain experience when stuck, or work for extra gold.
                  Most activities increase fatigue.
                </p>
              </div>
            </Card>

            {/* Shop */}
            <Card>
              <h3 className="text-lg font-bold mb-4 text-yellow-300">
                <i className="fas fa-shopping-cart mr-2"></i>
                Hunter Shop
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  <Btn
                    onClick={buyPotion}
                    disabled={gold < 25}
                    className="justify-between text-left"
                  >
                    <div className="flex items-center">
                      <i className="fas fa-flask mr-2 text-green-400"></i>
                      Health Potion
                    </div>
                    <span className="text-yellow-400">25₲</span>
                  </Btn>
                  <Btn
                    onClick={() => buyUpgrade("weapon")}
                    disabled={gold < 100 + player.level * 25}
                    className="justify-between text-left"
                  >
                    <div className="flex items-center">
                      <i className="fas fa-sword mr-2 text-red-400"></i>
                      Weapon Upgrade (+STR)
                    </div>
                    <span className="text-yellow-400">
                      {100 + player.level * 25}₲
                    </span>
                  </Btn>
                  <Btn
                    onClick={() => buyUpgrade("armor")}
                    disabled={gold < 80 + player.level * 20}
                    className="justify-between text-left"
                  >
                    <div className="flex items-center">
                      <i className="fas fa-shield-alt mr-2 text-orange-400"></i>
                      Armor Upgrade (+VIT)
                    </div>
                    <span className="text-yellow-400">
                      {80 + player.level * 20}₲
                    </span>
                  </Btn>
                  <Btn
                    onClick={() => buyUpgrade("accessory")}
                    disabled={gold < 120 + player.level * 30}
                    className="justify-between text-left"
                  >
                    <div className="flex items-center">
                      <i className="fas fa-ring mr-2 text-purple-400"></i>
                      Lucky Charm (+LUCK)
                    </div>
                    <span className="text-yellow-400">
                      {120 + player.level * 30}₲
                    </span>
                  </Btn>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Equipment prices scale with your level. Upgrades permanently
                  increase stats.
                </p>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-zinc-100">Stats</h3>
                {player.points > 0 && (
                  <div className="bg-violet-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                    {player.points} Points
                  </div>
                )}
              </div>

              <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <h4 className="text-sm font-bold text-blue-300 mb-2">
                  <i className="fas fa-info-circle mr-1"></i>
                  Stat Effects
                </h4>
                <div className="text-xs text-blue-200 space-y-1">
                  <div>
                    <span className="text-red-400 font-bold">STR:</span> Primary
                    damage (+3 power each)
                  </div>
                  <div>
                    <span className="text-green-400 font-bold">AGI:</span> Speed
                    & damage (+2 power each)
                  </div>
                  <div>
                    <span className="text-blue-400 font-bold">INT:</span> Magic
                    damage & shadow extraction (+1.5 power each)
                  </div>
                  <div>
                    <span className="text-orange-400 font-bold">VIT:</span>{" "}
                    Health & defense (+0.5 power each)
                  </div>
                  <div>
                    <span className="text-yellow-400 font-bold">LUCK:</span>{" "}
                    Critical hits & item drops
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(player.stats).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 ${
                          STAT_COLORS[k as keyof typeof STAT_COLORS]
                        } rounded-full flex items-center justify-center text-white text-sm font-bold`}
                      >
                        <i
                          className={STAT_ICONS[k as keyof typeof STAT_ICONS]}
                        ></i>
                      </div>
                      <div>
                        <div className="font-bold text-zinc-100">{k}</div>
                        <div className="text-sm text-zinc-400">
                          {k === "STR" && "Strength"}
                          {k === "AGI" && "Agility"}
                          {k === "INT" && "Intelligence"}
                          {k === "VIT" && "Vitality"}
                          {k === "LUCK" && "Luck"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xl">{v}</span>
                      <button
                        className="w-8 h-8 bg-violet-600 hover:bg-violet-500 text-white rounded-full transition-colors disabled:opacity-40"
                        onClick={() =>
                          allocateStatWithFeedback(k as keyof Player["stats"])
                        }
                        disabled={player.points <= 0}
                      >
                        <i className="fas fa-plus text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Stat Progression Chart */}
            <StatProgressionChart />

            <Card>
              <div className="flex items-center space-x-2 mb-4">
                <i className="fas fa-users text-purple-400"></i>
                <h3 className="text-lg font-bold text-zinc-100">Shadow Army</h3>
                {player.shadows.length > 0 && (
                  <span className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                    {player.shadows.length}
                  </span>
                )}
              </div>

              {player.shadows.length === 0 && (
                <div className="opacity-70 text-sm text-center py-4">
                  No shadows recruited
                </div>
              )}

              <div className="space-y-3 mb-4">
                {player.shadows.map((s) => (
                  <div
                    key={s.id}
                    className="bg-zinc-800/30 border border-purple-500/30 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center">
                          <i className="fas fa-ghost text-white text-xs"></i>
                        </div>
                        <div>
                          <div className="font-bold text-purple-300">
                            {s.name}
                          </div>
                          <div className="text-xs text-zinc-400">
                            Shadow Soldier
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-400">
                          +{s.power}
                        </div>
                        <div className="text-xs text-zinc-500">Power</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {player.shadows.length > 0 && (
                <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-300">Total Army Power:</span>
                    <span className="font-bold text-purple-400">
                      +{player.shadows.reduce((a, s) => a + s.power, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-purple-300">MP Upkeep/tick:</span>
                    <span className="font-bold text-blue-400">
                      -{shadowUpkeep(player)} MP
                    </span>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center space-x-2 mb-4">
                <i className="fas fa-backpack text-amber-400"></i>
                <h3 className="text-lg font-bold text-zinc-100">Inventory</h3>
                {player.inv.length > 0 && (
                  <span className="bg-amber-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                    {player.inv.length}
                  </span>
                )}
              </div>

              {player.inv.length === 0 && (
                <div className="opacity-70 text-sm text-center py-4">
                  Empty inventory
                </div>
              )}

              <div className="space-y-2">
                {player.inv.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between bg-zinc-800/30 rounded-lg p-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          it.type === "potion"
                            ? "bg-green-600"
                            : it.type === "rune"
                            ? "bg-purple-600"
                            : "bg-gray-600"
                        }`}
                      >
                        <i
                          className={`text-white text-sm ${
                            it.type === "potion"
                              ? "fas fa-flask"
                              : it.type === "rune"
                              ? "fas fa-gem"
                              : "fas fa-question"
                          }`}
                        ></i>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-300">{it.name}</span>
                        {it.type === "rune" && (
                          <span className="text-xs text-zinc-500">
                            {it.name.includes("STR") && "Boosts Strength"}
                            {it.name.includes("AGI") && "Boosts Agility"}
                            {it.name.includes("INT") && "Boosts Intelligence"}
                            {it.name.includes("VIT") && "Boosts Vitality"}
                            {it.name.includes("LUCK") && "Boosts Luck"}
                            {!it.name.includes("STR") &&
                              !it.name.includes("AGI") &&
                              !it.name.includes("INT") &&
                              !it.name.includes("VIT") &&
                              !it.name.includes("LUCK") &&
                              "Random Stat Boost"}
                          </span>
                        )}
                      </div>
                    </div>
                    {it.type === "potion" && (
                      <Btn sm onClick={() => usePotion(it.id)}>
                        Use
                      </Btn>
                    )}
                    {it.type === "rune" && (
                      <Btn sm onClick={() => useRune(it.id)}>
                        Use
                      </Btn>
                    )}
                  </div>
                ))}
              </div>

              {player.inv.some((item) => item.type === "rune") && (
                <div className="mt-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                  <h4 className="text-sm font-bold text-purple-300 mb-2">
                    <i className="fas fa-info-circle mr-1"></i>
                    Rune Information
                  </h4>
                  <div className="text-xs text-purple-200 space-y-1">
                    <div>• Runes provide permanent stat boosts when used</div>
                    <div>• Higher rank runes (A, S) provide larger bonuses</div>
                    <div>• Runes are consumed when used</div>
                    <div>
                      • STR/AGI boost damage, INT helps shadow extraction
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </section>

          {/* Middle: Gates & Combat */}
          <section className="lg:col-span-2 space-y-6">
            <Card>
              <h3 className="text-xl font-bold mb-4 text-zinc-100">
                Combat Zone
              </h3>

              {!inRun && (
                <div className="text-sm opacity-80 mb-6 text-center py-8">
                  Enter a Gate to begin combat. Allocate stats and complete
                  Daily Quests first for best odds.
                </div>
              )}

              {(inRun && running) || combatResult ? (
                <div
                  className={`bg-gradient-to-r from-red-900/30 to-purple-900/30 border border-red-500/30 rounded-lg p-6 mb-6 relative overflow-hidden transition-all duration-300 ${
                    visualEffects.screenShake ? "animate-screen-shake" : ""
                  } ${
                    visualEffects.damageFlash ? "animate-damage-flash" : ""
                  } ${visualEffects.healFlash ? "animate-heal-flash" : ""} ${
                    running ? `gate-environment-${running.gate.rank}` : ""
                  }`}
                >
                  {/* Animated Background Particles */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="combat-particle absolute top-4 left-4 w-2 h-2 bg-purple-400 rounded-full animate-floating-particle opacity-60"></div>
                    <div className="combat-particle absolute top-8 right-8 w-1 h-1 bg-red-400 rounded-full animate-floating-particle opacity-40"></div>
                    <div className="combat-particle absolute bottom-6 left-12 w-1.5 h-1.5 bg-blue-400 rounded-full animate-floating-particle opacity-50"></div>
                    <div className="combat-particle absolute bottom-12 right-4 w-1 h-1 bg-green-400 rounded-full animate-floating-particle opacity-30"></div>
                    <div className="combat-particle absolute top-1/2 left-1/4 w-1 h-1 bg-yellow-400 rounded-full animate-floating-particle opacity-40"></div>
                    <div className="combat-particle absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-purple-400 rounded-full animate-floating-particle opacity-50"></div>

                    {/* Environment-specific particles */}
                    {running && (
                      <>
                        <div
                          className={`environment-particle environment-particle-${running.gate.rank} absolute top-1/4 left-1/4 w-8 h-8 rounded-full animate-floating-particle`}
                        ></div>
                        <div
                          className={`environment-particle environment-particle-${running.gate.rank} absolute bottom-1/4 right-1/4 w-6 h-6 rounded-full animate-floating-particle`}
                        ></div>
                        <div
                          className={`environment-particle environment-particle-${running.gate.rank} absolute top-3/4 right-1/3 w-4 h-4 rounded-full animate-floating-particle`}
                        ></div>
                      </>
                    )}
                  </div>

                  {/* Gate Header with Enhanced Styling */}
                  <div className="text-center mb-6 relative z-10">
                    <h4 className="text-xl font-bold text-red-300 mb-2 animate-pulse">
                      {running?.gate.name || combatResult?.gate.name}
                    </h4>

                    {/* Environment Description */}
                    {running && (
                      <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-600/30">
                        <p className="text-sm text-zinc-300 italic">
                          {
                            MONSTER_DATA[
                              running.gate.rank as keyof typeof MONSTER_DATA
                            ]?.environment
                          }
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {
                            MONSTER_DATA[
                              running.gate.rank as keyof typeof MONSTER_DATA
                            ]?.sound
                          }
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-center space-x-4 text-sm text-zinc-400">
                      <div className="flex items-center space-x-2 bg-red-900/50 px-3 py-1 rounded-full border border-red-500/30">
                        <i className="fas fa-skull text-red-400 animate-pulse"></i>
                        <span>
                          Rank {running?.gate.rank || combatResult?.gate.rank}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 bg-blue-900/50 px-3 py-1 rounded-full border border-blue-500/30">
                        <i className="fas fa-clock text-blue-400"></i>
                        <span>{running?.tick || "Complete"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Combat Arena with Enhanced Visuals */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 relative z-10">
                    {/* Hunter Side with Glow Effects */}
                    <div className="bg-zinc-800/50 border border-purple-500/30 rounded-lg p-4 relative group hover:border-purple-400/50 transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="text-center mb-4 relative z-10">
                        <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-purple-500/30 animate-pulse">
                          <i className="fas fa-user-shield text-white text-xl"></i>
                        </div>
                        <h5 className="font-bold text-purple-300">Hunter</h5>
                        <p className="text-xs text-zinc-400">
                          Level {player.level}
                        </p>
                      </div>

                      <div className="space-y-3 relative z-10">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-green-400">HP</span>
                            <span className="text-zinc-300">
                              {fmt(player.hp)}/{fmt(player.maxHp)}
                            </span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-green-600 to-green-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                              style={{
                                width: `${Math.round(
                                  (player.hp / player.maxHp) * 100
                                )}%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-blue-400">MP</span>
                            <span className="text-zinc-300">
                              {fmt(player.mp)}/{fmt(player.maxMp)}
                            </span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-600 to-blue-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                              style={{
                                width: `${Math.round(
                                  (player.mp / player.maxMp) * 100
                                )}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enemy Side with Threatening Effects */}
                    <div className="bg-zinc-800/50 border border-red-500/30 rounded-lg p-4 relative group hover:border-red-400/50 transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="text-center mb-4 relative z-10">
                        <div
                          className={`w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-red-500/30 ${
                            running ? "monster-idle" : ""
                          } ${
                            visualEffects.criticalHit ? "monster-damage" : ""
                          }`}
                        >
                          <i
                            className={`fas ${
                              running
                                ? MONSTER_DATA[
                                    running.gate
                                      .rank as keyof typeof MONSTER_DATA
                                  ]?.icon
                                : "fa-dragon"
                            } text-white text-xl`}
                          ></i>
                        </div>
                        <h5 className="font-bold text-red-300">
                          {running?.boss.name || combatResult?.boss.name}
                        </h5>
                        <p className="text-xs text-zinc-400 mb-2">
                          {running?.gate.rank || combatResult?.gate.rank}-Rank
                          Boss
                        </p>

                        {/* Monster Description */}
                        {running && (
                          <div className="text-xs text-zinc-400 bg-red-900/20 p-2 rounded border border-red-500/20">
                            <p className="italic">
                              {
                                MONSTER_DATA[
                                  running.gate.rank as keyof typeof MONSTER_DATA
                                ]?.description
                              }
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="relative z-10">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-red-400">HP</span>
                          <span className="text-zinc-300">
                            {running
                              ? `${fmt(running.hpEnemy)}/${fmt(
                                  running.boss.maxHp
                                )}`
                              : "0/0"}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-700 rounded-full h-3 overflow-hidden">
                          <div
                            className={`bg-gradient-to-r from-red-600 to-red-500 h-3 rounded-full transition-all duration-500 animate-pulse shadow-sm ${
                              visualEffects.criticalHit
                                ? "animate-critical-hit"
                                : ""
                            }`}
                            style={{
                              width: running
                                ? `${Math.round(
                                    (running.hpEnemy / running.boss.maxHp) * 100
                                  )}%`
                                : "0%",
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Turn Indicator */}
                  <div className="text-center mb-4 relative z-10">
                    <div className="inline-flex items-center space-x-2 bg-zinc-800/50 border border-yellow-500/30 rounded-full px-4 py-2 shadow-lg">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="text-yellow-300 font-medium">
                        {running ? "Combat in Progress..." : "Combat Complete"}
                      </span>
                    </div>
                  </div>

                  {/* Enhanced Combat Log */}
                  <div className="bg-zinc-900/50 rounded-lg p-4 mb-4 max-h-32 overflow-y-auto relative z-10 border border-zinc-700/50">
                    <div className="text-sm text-zinc-300 space-y-1">
                      {(running ? combatLog : combatResult?.combatLog || [])
                        .length > 0 ? (
                        (running
                          ? combatLog
                          : combatResult?.combatLog || []
                        ).map((entry, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-2 animate-fade-in"
                          >
                            <span className="text-zinc-500 text-xs">•</span>
                            <span
                              className={`
                              ${
                                entry.includes("Hunter attacks")
                                  ? "text-green-400"
                                  : ""
                              }
                              ${
                                entry.includes("attacks for") &&
                                !entry.includes("Hunter")
                                  ? "text-red-400"
                                  : ""
                              }
                              ${
                                entry.includes("Critical hit")
                                  ? "text-yellow-400 font-bold"
                                  : ""
                              }
                              ${
                                entry.includes("Victory")
                                  ? "text-green-400 font-bold"
                                  : ""
                              }
                              ${
                                entry.includes("Defeat")
                                  ? "text-red-400 font-bold"
                                  : ""
                              }
                              ${
                                entry.includes("blocked") ? "text-blue-400" : ""
                              }
                              ${
                                !entry.includes("Hunter") &&
                                !entry.includes("attacks") &&
                                !entry.includes("Critical") &&
                                !entry.includes("Victory") &&
                                !entry.includes("Defeat") &&
                                !entry.includes("blocked")
                                  ? "text-zinc-300"
                                  : ""
                              }
                            `}
                            >
                              {entry}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-zinc-500">
                          Combat log will appear here...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Combat Results Display */}
                  {combatResult && (
                    <div className="bg-zinc-800/50 rounded-lg p-4 mb-4 border border-zinc-600/50">
                      <div className="text-center mb-3">
                        <h3
                          className={`text-lg font-bold ${
                            combatResult.victory
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {combatResult.victory ? "🎉 Victory!" : "💀 Defeat"}
                        </h3>
                      </div>

                      {combatResult.victory && (
                        <div className="space-y-3">
                          {/* Rewards */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-green-900/30 rounded-lg p-3 border border-green-500/30">
                              <div className="text-green-400 font-bold">
                                +{fmt(combatResult.expGained)} EXP
                              </div>
                              <div className="text-green-300 text-xs">
                                Experience Gained
                              </div>
                            </div>
                            <div className="bg-yellow-900/30 rounded-lg p-3 border border-yellow-500/30">
                              <div className="text-yellow-400 font-bold">
                                +{fmt(combatResult.goldGained)}₲
                              </div>
                              <div className="text-yellow-300 text-xs">
                                Gold Earned
                              </div>
                            </div>
                          </div>

                          {/* Shadow Extraction */}
                          {combatResult.shadowExtracted ? (
                            <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/30">
                              <div className="flex items-center space-x-2">
                                <i className="fas fa-ghost text-purple-400"></i>
                                <div>
                                  <div className="text-purple-400 font-bold">
                                    Shadow Extracted:{" "}
                                    {combatResult.shadowExtracted.name}
                                  </div>
                                  <div className="text-purple-300 text-xs">
                                    Power:{" "}
                                    {fmt(combatResult.shadowExtracted.power)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-zinc-700/30 rounded-lg p-3 border border-zinc-600/30">
                              <div className="text-zinc-400 text-sm text-center">
                                <i className="fas fa-times mr-2"></i>
                                No shadow extracted
                              </div>
                            </div>
                          )}

                          {/* Drops */}
                          {combatResult.drops.length > 0 && (
                            <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-500/30">
                              <div className="text-blue-400 font-bold mb-2">
                                Loot Found:
                              </div>
                              <div className="space-y-1">
                                {combatResult.drops.map((drop, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center space-x-2 text-sm"
                                  >
                                    <i className="fas fa-gem text-blue-300"></i>
                                    <span className="text-blue-300">
                                      {drop.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!combatResult.victory && (
                        <div className="text-center">
                          <div className="text-red-400 font-bold mb-2">
                            -10₲ Penalty
                          </div>
                          <div className="text-zinc-400 text-sm">
                            Rest and recover to try again
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Enhanced Quick Actions */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="text-xs text-zinc-400 bg-zinc-800/30 px-3 py-2 rounded-lg">
                      <div>
                        Shadow Upkeep: {fmt(shadowUpkeep(player))} MP/tick
                      </div>
                      <div>Fatigue: {player.fatigue}%</div>
                    </div>

                    {/* Integrated Potion Button with Enhanced Styling */}
                    {player.inv.some((item) => item.type === "potion") &&
                      running && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-zinc-400">
                            Quick Heal:
                          </span>
                          <button
                            onClick={() => {
                              const potion = player.inv.find(
                                (item) => item.type === "potion"
                              );
                              if (potion) usePotion(potion.id);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-green-500/30 hover:scale-105"
                          >
                            <i className="fas fa-flask text-sm"></i>
                            <span className="text-sm font-medium">
                              Use Potion
                            </span>
                          </button>
                        </div>
                      )}

                    {/* Enhanced Dismiss Button for Combat Result */}
                    {combatResult && (
                      <div className="flex items-center space-x-2">
                        <Btn
                          onClick={dismissCombatResult}
                          className="shadow-lg hover:shadow-purple-500/30 hover:scale-105 transition-all duration-200"
                        >
                          {combatResult.victory ? "Continue" : "Accept Defeat"}
                        </Btn>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-zinc-100">
                  Available Gates ({gates.length})
                </h4>
                <div className="text-sm text-zinc-400">
                  Your Power: {fmt(pPower)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gates
                  .sort((a, b) => a.rankIdx - b.rankIdx)
                  .map((g) => {
                    const tooHard = pPower < g.recommended * 0.8; // Made slightly easier
                    return (
                      <div
                        key={g.id}
                        className={`bg-zinc-800/30 border rounded-lg p-4 transition-colors cursor-pointer group ${
                          tooHard
                            ? "border-red-700 opacity-75 hover:border-red-500/50"
                            : "border-zinc-700 hover:border-violet-500/50"
                        }`}
                        onClick={() => !inRun && startGate(g)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-8 h-8 ${
                                RANK_COLORS[g.rank as keyof typeof RANK_COLORS]
                              } rounded-full flex items-center justify-center text-white font-bold text-sm`}
                            >
                              {g.rank}
                            </div>
                            <span className="font-bold text-zinc-100">
                              {g.rank}-Rank Gate
                            </span>
                            {tooHard && (
                              <i className="fas fa-exclamation-triangle text-red-400 text-sm"></i>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-zinc-400">Power</div>
                            <div
                              className={`font-bold ${
                                tooHard ? "text-red-400" : "text-green-400"
                              }`}
                            >
                              {fmt(g.power)}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-sm mb-2 ${
                            tooHard ? "text-red-400" : "text-zinc-400"
                          }`}
                        >
                          Recommended: {fmt(g.recommended)}{" "}
                          {tooHard && "(Too Dangerous!)"}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-500">
                            Gate ID: {g.id.slice(0, 3).toUpperCase()}
                          </span>
                          <div className="flex items-center space-x-1 text-xs text-zinc-400">
                            <i className="fas fa-trophy"></i>
                            <span>
                              +{fmt(Math.floor(g.recommended * 1.1))} EXP
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-zinc-100">Daily Quest</h3>
                {daily.active && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-400 font-medium">
                      Active
                    </span>
                  </div>
                )}
              </div>

              {!daily.active && !daily.completed && (
                <div className="text-sm opacity-80 text-center py-8">
                  Start your Daily Quest to earn bonuses. Fail or quit and you
                  face the Penalty Zone.
                </div>
              )}

              {daily.active && (
                <>
                  <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <i className="fas fa-clock text-yellow-400"></i>
                      <span className="text-yellow-200 font-medium">
                        Complete before entering dungeons!
                      </span>
                    </div>
                    <p className="text-sm text-yellow-100/80">
                      Failure to complete daily quest will trigger Penalty Zone.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {daily.tasks.map((t) => {
                      const taskIcons = {
                        train: "fas fa-dumbbell",
                        run: "fas fa-running",
                        focus: "fas fa-om",
                      };
                      const taskColors = {
                        train: "bg-green-600",
                        run: "bg-blue-600",
                        focus: "bg-purple-600",
                      };
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between bg-zinc-800/30 rounded-lg p-4"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-10 h-10 ${
                                taskColors[t.id as keyof typeof taskColors]
                              } rounded-full flex items-center justify-center`}
                            >
                              <i
                                className={`${
                                  taskIcons[t.id as keyof typeof taskIcons]
                                } text-white`}
                              ></i>
                            </div>
                            <div>
                              <div className="font-medium text-zinc-100">
                                {t.name}
                              </div>
                              <div className="text-sm text-zinc-400">
                                {t.id === "train" && "Physical conditioning"}
                                {t.id === "run" && "Endurance training"}
                                {t.id === "focus" && "Mental focus"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="font-bold text-green-400">
                                {t.have}/{t.need}
                              </div>
                              <div className="w-16 bg-zinc-700 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{
                                    width: `${Math.round(
                                      (t.have / t.need) * 100
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                            <button
                              className={`${
                                taskColors[t.id as keyof typeof taskColors]
                              } hover:opacity-80 text-white px-3 py-1 rounded transition-colors`}
                              onClick={() => progressDaily(t.id)}
                            >
                              <i className="fas fa-plus"></i>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {daily.completed && (
                <div className="text-emerald-400 text-sm text-center py-8">
                  Daily complete. よくやった (yoku yatta): well done!
                </div>
              )}
            </Card>
          </section>

          {/* Right: Log */}
          <section className="lg:col-span-1">
            <Card>
              <div className="flex items-center space-x-2 mb-4">
                <i className="fas fa-scroll text-zinc-400"></i>
                <h3 className="text-lg font-bold text-zinc-100">
                  Activity Log
                </h3>
              </div>

              <div className="bg-zinc-900/50 rounded-lg p-4 h-96 overflow-y-auto custom-scrollbar space-y-2 text-sm">
                {log.map((m, i) => (
                  <div key={i} className="opacity-90">
                    • {m}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="mt-6">
              <h3 className="font-semibold mb-2">Lore (Mechanics)</h3>
              <ul className="text-xs opacity-80 list-disc pl-5 space-y-1">
                <li>Gates lead to Dungeons. Clear them to gain EXP/loot.</li>
                <li>
                  Daily Quest must be completed or the Penalty Zone triggers.
                </li>
                <li>
                  Level up to gain Stat Points. STR/AGI raise damage; INT/LUCK
                  aid extraction.
                </li>
                <li>
                  Shadow Extraction after boss defeat may recruit a Shadow ally
                  (25% base chance).
                </li>
                <li>Fatigue reduces your total power; Rest lowers it.</li>
                <li>
                  Instant Dungeon Keys open bonus runs with better rewards.
                </li>
              </ul>
            </Card>
          </section>
        </div>

        {/* Shadow Extraction Sequence Modal */}
        {shadowExtractionState.isActive && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Background Effects */}
              <div className="absolute inset-0">
                {/* Animated particles */}
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-pulse opacity-60"></div>
                <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-pulse opacity-40"></div>
                <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse opacity-50"></div>
                <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-yellow-400 rounded-full animate-pulse opacity-30"></div>
                <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-red-400 rounded-full animate-pulse opacity-70"></div>

                {/* Ripple effects */}
                <div
                  className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-purple-500/30 rounded-full animate-shadow-ripple ${
                    shadowExtractionState.phase === "extracting"
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                ></div>
                <div
                  className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-purple-400/20 rounded-full animate-pulse ${
                    shadowExtractionState.phase === "extracting"
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                ></div>
              </div>

              {/* Main Content */}
              <div className="relative z-10 text-center max-w-2xl mx-4">
                {/* Phase-specific background */}
                <div
                  className={`mb-8 p-8 rounded-lg border-2 transition-all duration-500 ${
                    shadowExtractionState.phase === "preparing"
                      ? "bg-blue-900/30 border-blue-500/50"
                      : shadowExtractionState.phase === "extracting"
                      ? "bg-purple-900/30 border-purple-500/50"
                      : shadowExtractionState.phase === "success"
                      ? "bg-green-900/30 border-green-500/50"
                      : shadowExtractionState.phase === "failure"
                      ? "bg-red-900/30 border-red-500/50"
                      : "bg-zinc-900/30 border-zinc-500/50"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                      shadowExtractionState.phase === "preparing"
                        ? "bg-blue-600 animate-shadow-pulse"
                        : shadowExtractionState.phase === "extracting"
                        ? "bg-purple-600 animate-shadow-spin animate-shadow-glow"
                        : shadowExtractionState.phase === "success"
                        ? "bg-green-600 animate-shadow-bounce"
                        : shadowExtractionState.phase === "failure"
                        ? "bg-red-600 animate-shadow-pulse"
                        : "bg-zinc-600"
                    }`}
                  >
                    <i
                      className={`text-3xl text-white ${
                        shadowExtractionState.phase === "preparing"
                          ? "fas fa-magic"
                          : shadowExtractionState.phase === "extracting"
                          ? "fas fa-ghost"
                          : shadowExtractionState.phase === "success"
                          ? "fas fa-check"
                          : shadowExtractionState.phase === "failure"
                          ? "fas fa-times"
                          : "fas fa-question"
                      }`}
                    ></i>
                  </div>

                  {/* Text Content */}
                  {(() => {
                    const text = getExtractionSequenceText();
                    return (
                      <>
                        <h2
                          className={`text-3xl font-bold mb-4 transition-all duration-500 ${
                            shadowExtractionState.phase === "preparing"
                              ? "text-blue-300"
                              : shadowExtractionState.phase === "extracting"
                              ? "text-purple-300"
                              : shadowExtractionState.phase === "success"
                              ? "text-green-300"
                              : shadowExtractionState.phase === "failure"
                              ? "text-red-300"
                              : "text-zinc-300"
                          }`}
                        >
                          {text.title}
                        </h2>

                        <p className="text-xl text-zinc-200 mb-3">
                          {text.subtitle}
                        </p>

                        <p className="text-zinc-400 mb-6">{text.description}</p>

                        {/* Progress Bar for extracting phase */}
                        {shadowExtractionState.phase === "extracting" && (
                          <div className="w-full bg-zinc-700 rounded-full h-4 mb-4 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-purple-400 h-4 rounded-full transition-all duration-300 ease-out"
                              style={{
                                width: `${shadowExtractionState.progress}%`,
                              }}
                            ></div>
                          </div>
                        )}

                        {/* Boss Info */}
                        <div className="text-sm text-zinc-500">
                          Target: {shadowExtractionState.bossName} (
                          {shadowExtractionState.bossRank}-Rank)
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Additional Effects */}
                {shadowExtractionState.phase === "extracting" && (
                  <div className="text-center">
                    <div className="text-purple-400 text-sm animate-pulse">
                      <i className="fas fa-magic mr-2"></i>
                      Channeling magical energy...
                    </div>
                  </div>
                )}

                {shadowExtractionState.phase === "success" && (
                  <div className="text-center">
                    <div className="text-green-400 text-lg font-bold animate-bounce">
                      🎉 Shadow Extraction Complete! 🎉
                    </div>
                  </div>
                )}

                {shadowExtractionState.phase === "failure" && (
                  <div className="text-center">
                    <div className="text-red-400 text-lg font-bold animate-pulse">
                      💀 Extraction Failed 💀
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Statistics Modal */}
        {showStats && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-zinc-100">
                  <i className="fas fa-chart-bar mr-2 text-purple-400"></i>
                  Hunter Statistics
                </h2>
                <button
                  onClick={() => setShowStats(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Combat Statistics */}
                <Card>
                  <h3 className="text-lg font-bold text-zinc-100 mb-4">
                    <i className="fas fa-sword mr-2 text-red-400"></i>
                    Combat Stats
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Gates Completed:</span>
                      <span className="text-green-400 font-bold">
                        {playerStats.totalGatesCompleted}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Gates Failed:</span>
                      <span className="text-red-400 font-bold">
                        {playerStats.totalGatesFailed}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Success Rate:</span>
                      <span className="text-blue-400 font-bold">
                        {playerStats.totalGatesCompleted +
                          playerStats.totalGatesFailed >
                        0
                          ? Math.round(
                              (playerStats.totalGatesCompleted /
                                (playerStats.totalGatesCompleted +
                                  playerStats.totalGatesFailed)) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Highest Rank:</span>
                      <span className="text-yellow-400 font-bold">
                        {playerStats.highestGateRank}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Progress Statistics */}
                <Card>
                  <h3 className="text-lg font-bold text-zinc-100 mb-4">
                    <i className="fas fa-trophy mr-2 text-yellow-400"></i>
                    Progress Stats
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Total EXP Gained:</span>
                      <span className="text-green-400 font-bold">
                        {fmt(playerStats.totalExpGained)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Total Gold Gained:</span>
                      <span className="text-yellow-400 font-bold">
                        {fmt(playerStats.totalGoldGained)}₲
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Shadows Extracted:</span>
                      <span className="text-purple-400 font-bold">
                        {playerStats.totalShadowsExtracted}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Current Level:</span>
                      <span className="text-blue-400 font-bold">
                        {player.level}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Achievements */}
              {achievements.length > 0 && (
                <Card className="mt-6">
                  <h3 className="text-lg font-bold text-zinc-100 mb-4">
                    <i className="fas fa-medal mr-2 text-yellow-400"></i>
                    Achievements ({achievements.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="bg-zinc-800/50 border border-yellow-500/30 rounded-lg p-3"
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <i className="fas fa-trophy text-yellow-400"></i>
                          <span className="font-bold text-yellow-300">
                            {achievement.name}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400">
                          {achievement.description}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Unlocked:{" "}
                          {new Date(
                            achievement.unlockedAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <div className="mt-6 text-center">
                <p className="text-xs text-zinc-500">
                  Last updated:{" "}
                  {new Date(playerStats.lastUpdated).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Level-Up Celebration Modal */}
        {levelUpState.isActive && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Background Effects */}
              <div className="absolute inset-0">
                {/* Animated particles */}
                <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-yellow-400 rounded-full animate-bounce opacity-80"></div>
                <div
                  className="absolute top-1/3 right-1/3 w-2 h-2 bg-orange-400 rounded-full animate-bounce opacity-60"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="absolute bottom-1/4 left-1/3 w-2.5 h-2.5 bg-red-400 rounded-full animate-bounce opacity-70"
                  style={{ animationDelay: "0.4s" }}
                ></div>
                <div
                  className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-pink-400 rounded-full animate-bounce opacity-50"
                  style={{ animationDelay: "0.6s" }}
                ></div>
                <div
                  className="absolute top-1/2 left-1/2 w-4 h-4 bg-purple-400 rounded-full animate-bounce opacity-90"
                  style={{ animationDelay: "0.8s" }}
                ></div>

                {/* Ripple effects */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 border-4 border-yellow-500/40 rounded-full animate-pulse"></div>
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border-2 border-orange-400/30 rounded-full animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                ></div>
              </div>

              {/* Main Content */}
              <div className="relative z-10 text-center max-w-2xl mx-4">
                {/* Celebration Background */}
                <div className="mb-8 p-8 rounded-lg border-2 bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border-yellow-500/60">
                  {/* Level Icon */}
                  <div className="w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse shadow-2xl">
                    <i className="fas fa-star text-6xl text-white animate-spin"></i>
                  </div>

                  {/* Level Up Text */}
                  <h2 className="text-5xl font-bold mb-4 text-yellow-300 animate-celebration-bounce">
                    LEVEL UP!
                  </h2>

                  <div className="text-3xl font-bold text-orange-300 mb-4">
                    Level {levelUpState.newLevel}
                  </div>

                  <div className="text-xl text-yellow-200 mb-6">
                    +{levelUpState.statPointsGained} Stat Points Available!
                  </div>

                  {/* Stat Allocation Section */}
                  {levelUpState.showStatAllocation && (
                    <div className="mt-8 p-6 bg-zinc-800/50 rounded-lg border border-yellow-500/30">
                      <h3 className="text-xl font-bold text-yellow-300 mb-4">
                        Allocate Your Stat Points
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                        {Object.entries(player.stats).map(([stat, value]) => (
                          <div key={stat} className="text-center">
                            <div className="text-sm text-zinc-400 mb-1">
                              {stat}
                            </div>
                            <div className="text-lg font-bold text-white mb-2">
                              {value}
                            </div>
                            <button
                              onClick={() =>
                                allocateStatWithFeedback(
                                  stat as keyof Player["stats"]
                                )
                              }
                              disabled={player.points <= 0}
                              className="w-8 h-8 bg-yellow-600 hover:bg-yellow-500 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded-full transition-colors font-bold"
                            >
                              +
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="text-center">
                        <div className="text-sm text-zinc-400 mb-2">
                          Points Remaining:{" "}
                          <span className="text-yellow-400 font-bold">
                            {player.points}
                          </span>
                        </div>

                        <button
                          onClick={completeLevelUp}
                          className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                        >
                          Continue Adventure
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Auto-progress to stat allocation */}
                  {!levelUpState.showStatAllocation && (
                    <div className="text-center">
                      <div className="text-yellow-200 text-lg animate-pulse">
                        Preparing stat allocation...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8">
          <Card>
            <div className="text-center text-zinc-400 text-sm">
              <p className="mb-2">
                Hunter's Path — A Solo Leveling-inspired idle/roguelite built
                for Canvas preview
              </p>
              <div className="flex justify-center space-x-4 text-xs flex-wrap">
                <span>Complete Daily Quest before dungeons</span>
                <span>•</span>
                <span>Allocate stat points after leveling</span>
                <span>•</span>
                <span>Extract shadows from defeated bosses</span>
              </div>
              <p className="mt-2 text-xs">
                "Virtus in arduis" — strength through trials.
              </p>
            </div>
          </Card>
        </footer>
      </div>

      {/* Audio Elements */}
      <div style={{ display: "none" }}>
        {/* Combat Sounds */}
        <audio
          ref={(el) => {
            if (el) audioRefs.current.attack = el;
          }}
          preload="auto"
        >
          <source src="/sounds/attack.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.damage = el;
          }}
          preload="auto"
        >
          <source src="/sounds/damage.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.critical = el;
          }}
          preload="auto"
        >
          <source src="/sounds/critical.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.block = el;
          }}
          preload="auto"
        >
          <source src="/sounds/block.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.victory = el;
          }}
          preload="auto"
        >
          <source src="/sounds/victory.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.defeat = el;
          }}
          preload="auto"
        >
          <source src="/sounds/defeat.mp3" type="audio/mpeg" />
        </audio>

        {/* UI Sounds */}
        <audio
          ref={(el) => {
            if (el) audioRefs.current.heal = el;
          }}
          preload="auto"
        >
          <source src="/sounds/heal.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.rune_use = el;
          }}
          preload="auto"
        >
          <source src="/sounds/rune_use.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.level_up = el;
          }}
          preload="auto"
        >
          <source src="/sounds/level_up.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.rest = el;
          }}
          preload="auto"
        >
          <source src="/sounds/rest.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.gate_enter = el;
          }}
          preload="auto"
        >
          <source src="/sounds/gate_enter.mp3" type="audio/mpeg" />
        </audio>

        {/* Shadow Extraction Sounds */}
        <audio
          ref={(el) => {
            if (el) audioRefs.current.extraction_start = el;
          }}
          preload="auto"
        >
          <source src="/sounds/extraction_start.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.extraction_loop = el;
          }}
          preload="auto"
        >
          <source src="/sounds/extraction_loop.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.extraction_success = el;
          }}
          preload="auto"
        >
          <source src="/sounds/extraction_success.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.extraction_failure = el;
          }}
          preload="auto"
        >
          <source src="/sounds/extraction_failure.mp3" type="audio/mpeg" />
        </audio>

        {/* Music Tracks */}
        <audio
          ref={(el) => {
            if (el) audioRefs.current.ambient_music = el;
          }}
          preload="auto"
        >
          <source src="/music/ambient.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.combat_music = el;
          }}
          preload="auto"
        >
          <source src="/music/combat.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.victory_music = el;
          }}
          preload="auto"
        >
          <source src="/music/victory.mp3" type="audio/mpeg" />
        </audio>
        <audio
          ref={(el) => {
            if (el) audioRefs.current.defeat_music = el;
          }}
          preload="auto"
        >
          <source src="/music/defeat.mp3" type="audio/mpeg" />
        </audio>
      </div>
    </div>
  );
}
