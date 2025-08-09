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
  return {
    name: `${RANKS[rankIdx]}-Rank Boss`,
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
  // Inspired by the series: INT & LUCK raise success, higher ranks are harder
  const { INT, LUCK } = p.stats;
  const base = 0.12 + INT * 0.004 + LUCK * 0.005; // 12% base + stats influence
  const rankPenalty = 0.05 * bossRankIdx; // tougher bosses penalize
  return clamp(base - rankPenalty, 0.02, 0.65); // 2%–65%
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
  if (r < 0.28)
    return { id: uid(), name: `${gate.rank}-grade Rune`, type: "rune" };
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

  // Always have multiple E-rank gates available (3-5)
  const eGateCount = rand(3, 5);
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
    const cGateCount = rand(2, 3);
    for (let i = 0; i < cGateCount; i++) {
      gates.push(makeGate(2));
    }
  }

  // Add B-rank gates if player level >= 10
  if (playerLevel >= 10) {
    const bGateCount = rand(1, 3);
    for (let i = 0; i < bGateCount; i++) {
      gates.push(makeGate(3));
    }
  }

  // Add A-rank gates if player level >= 15
  if (playerLevel >= 15) {
    const aGateCount = rand(1, 2);
    for (let i = 0; i < aGateCount; i++) {
      gates.push(makeGate(4));
    }
  }

  // Add S-rank gates if player level >= 20
  if (playerLevel >= 20) {
    gates.push(makeGate(5));
  }

  return gates;
}

export default function HuntersPath() {
  const [player, setPlayer] = useState<Player>(initialPlayer);
  const [log, setLog] = useState<string[]>([
    "Welcome, Hunter. Complete your Daily Quest, then clear a Gate.",
  ]);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [gates, setGates] = useState<Gate[]>(() => generateGatePool(1));
  const [running, setRunning] = useState<RunningState | null>(null); // { gate, boss, tick, inBoss, hpEnemy }
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
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
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const timeRef = useRef<NodeJS.Timeout | null>(null);

  const pPower = useMemo(() => playerPower(player), [player]);

  const inRun = Boolean(running);

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
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [player, gates, gold, gameTime, daily]);

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
          const { exp, gold: goldGain } = gainExpGoldFromGate(prev.gate);
          const drop = rollDrop(prev.gate);
          const drops = drop ? [drop] : [];

          // Show combat result screen
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

      while (exp >= expNext) {
        exp -= expNext;
        level += 1;
        leveledUp = true;
        expNext = Math.floor(expNext * 1.35);
        points += 5;
        maxHp += 10;
        maxMp += 5;

        logPush(`Level Up! Welcome to level ${level}. +5 stat points!`);
      }

      // If player leveled up, refresh gates to unlock new tiers
      if (leveledUp) {
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

  function startGate(g: Gate) {
    if (inRun) return;
    if (daily.active && !daily.completed) {
      // entering while daily in progress arms penalty
      setDaily((d) => ({ ...d, penaltyArmed: true }));
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
    setPlayer((p) => ({ ...p, mp: Math.max(0, p.mp - cost) }));
    if (Math.random() < chance) {
      const pow = Math.floor(
        5 + player.stats.INT * 0.8 + bossRankIdx * 6 + rand(0, 8)
      );
      const s = { id: uid(), name: shadowName(), power: pow };
      setPlayer((p) => ({ ...p, shadows: [...p.shadows, s] }));
      logPush(
        `Shadow Extraction succeeded! ${s.name} joins you (+${pow} power).`
      );
    } else {
      logPush("Extraction failed. The shade crumbles to dust.");
    }
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

    // Add combat log entry if in combat
    if (inRun && running) {
      const hpGain = Math.floor(player.maxHp * 0.5);
      const mpGain = Math.floor(player.maxMp * 0.3);
      setCombatLog((log) => [
        ...log.slice(-7),
        `Hunter uses a potion! +${hpGain} HP, +${mpGain} MP 💚`,
      ]);
    }

    logPush(
      "You used a potion. 体力回復 (tairyoku kaifuku): vitality restored."
    );
  }

  function useKey() {
    if (player.keys <= 0 || inRun) return;
    const rankIdx = clamp(rand(1, 3), 0, RANKS.length - 1);
    const g = makeGate(rankIdx);
    setPlayer((p) => ({ ...p, keys: p.keys - 1 }));
    startGate({ ...g, name: `Instant Dungeon: ${g.name}` });
  }

  function dismissCombatResult() {
    if (combatResult?.victory) {
      // Try shadow extraction on victory
      tryExtraction(combatResult.gate.rankIdx);
    }
    setCombatResult(null);
    setRunning(null); // Clear the combat state
    setCombatLog([]); // Clear the combat log
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
                  <Btn onClick={resetGame} theme="danger" sm>
                    <i className="fas fa-trash mr-1"></i>
                    Reset
                  </Btn>
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
                        onClick={() => allocate(k as keyof Player["stats"])}
                        disabled={player.points <= 0}
                      >
                        <i className="fas fa-plus text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

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
                      <span className="text-zinc-300">{it.name}</span>
                    </div>
                    {it.type === "potion" && (
                      <Btn sm onClick={() => usePotion(it.id)}>
                        Use
                      </Btn>
                    )}
                  </div>
                ))}
              </div>
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
                <div className="bg-gradient-to-r from-red-900/30 to-purple-900/30 border border-red-500/30 rounded-lg p-6 mb-6">
                  {/* Gate Header */}
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-bold text-red-300 mb-2">
                      {running?.gate.name || combatResult?.gate.name}
                    </h4>
                    <div className="flex items-center justify-center space-x-4 text-sm text-zinc-400">
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-skull text-red-400"></i>
                        <span>
                          Rank {running?.gate.rank || combatResult?.gate.rank}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-clock text-blue-400"></i>
                        <span>Tick {running?.tick || "Complete"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Combat Arena */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Hunter Side */}
                    <div className="bg-zinc-800/50 border border-purple-500/30 rounded-lg p-4">
                      <div className="text-center mb-4">
                        <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                          <i className="fas fa-user-shield text-white text-xl"></i>
                        </div>
                        <h5 className="font-bold text-purple-300">Hunter</h5>
                        <p className="text-xs text-zinc-400">
                          Level {player.level}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-green-400">HP</span>
                            <span className="text-zinc-300">
                              {fmt(player.hp)}/{fmt(player.maxHp)}
                            </span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-green-600 to-green-500 h-3 rounded-full transition-all duration-500"
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
                          <div className="w-full bg-zinc-700 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-blue-600 to-blue-500 h-3 rounded-full transition-all duration-500"
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

                    {/* Enemy Side */}
                    <div className="bg-zinc-800/50 border border-red-500/30 rounded-lg p-4">
                      <div className="text-center mb-4">
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                          <i className="fas fa-dragon text-white text-xl"></i>
                        </div>
                        <h5 className="font-bold text-red-300">
                          {running?.boss.name || combatResult?.boss.name}
                        </h5>
                        <p className="text-xs text-zinc-400">
                          {running?.gate.rank || combatResult?.gate.rank}-Rank
                          Boss
                        </p>
                      </div>

                      <div>
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
                        <div className="w-full bg-zinc-700 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-red-600 to-red-500 h-3 rounded-full transition-all duration-500 animate-pulse"
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

                  {/* Turn Indicator */}
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center space-x-2 bg-zinc-800/50 border border-yellow-500/30 rounded-full px-4 py-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="text-yellow-300 font-medium">
                        {running ? "Combat in Progress..." : "Combat Complete"}
                      </span>
                    </div>
                  </div>

                  {/* Combat Log */}
                  <div className="bg-zinc-900/50 rounded-lg p-4 mb-4 max-h-32 overflow-y-auto">
                    <div className="text-sm text-zinc-300 space-y-1">
                      {(running ? combatLog : combatResult?.combatLog || [])
                        .length > 0 ? (
                        (running
                          ? combatLog
                          : combatResult?.combatLog || []
                        ).map((entry, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-2"
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

                  {/* Quick Actions */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-zinc-400">
                      <div>
                        Shadow Upkeep: {fmt(shadowUpkeep(player))} MP/tick
                      </div>
                      <div>Fatigue: {player.fatigue}%</div>
                    </div>

                    {/* Integrated Potion Button */}
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
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-2"
                          >
                            <i className="fas fa-flask text-sm"></i>
                            <span className="text-sm font-medium">
                              Use Potion
                            </span>
                          </button>
                        </div>
                      )}

                    {/* Dismiss Button for Combat Result */}
                    {combatResult && (
                      <div className="flex items-center space-x-2">
                        <Btn onClick={dismissCombatResult}>
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
                  Shadow Extraction after boss defeat may recruit a Shadow ally.
                </li>
                <li>Fatigue reduces your total power; Rest lowers it.</li>
                <li>
                  Instant Dungeon Keys open bonus runs with better rewards.
                </li>
              </ul>
            </Card>
          </section>
        </div>

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
    </div>
  );
}
