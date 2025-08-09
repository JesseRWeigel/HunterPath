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
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (n: number) => new Intl.NumberFormat().format(Math.floor(n));

const RANKS = ["E", "D", "C", "B", "A", "S"];

const RANK_COLORS = {
  E: "bg-green-600",
  D: "bg-blue-600", 
  C: "bg-purple-600",
  B: "bg-red-600",
  A: "bg-orange-600",
  S: "bg-yellow-600"
};

const STAT_ICONS = {
  STR: "fas fa-fist-raised",
  AGI: "fas fa-running", 
  INT: "fas fa-brain",
  VIT: "fas fa-heart",
  LUCK: "fas fa-dice"
};

const STAT_COLORS = {
  STR: "bg-red-600",
  AGI: "bg-green-600",
  INT: "bg-blue-600", 
  VIT: "bg-orange-600",
  LUCK: "bg-yellow-600"
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
}

interface RunningState {
  gate: Gate;
  boss: Boss;
  hpEnemy: number;
  tick: number;
}

function gatePowerForRank(rankIdx: number) {
  // Rough scaling
  return Math.pow(2, rankIdx) * 50 + rankIdx * 25;
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
  const { STR, AGI, INT } = p.stats;
  const base = STR * 2 + AGI * 1.2 + INT * 0.6;
  const shadowBonus = p.shadows.reduce((a, s) => a + s.power, 0);
  const fatiguePenalty = 1 - Math.min(0.6, p.fatigue / 200); // up to -60%
  return Math.max(1, (base + shadowBonus) * fatiguePenalty);
}

function shadowUpkeep(p: Player) {
  // MP upkeep per tick when in dungeon
  return Math.floor(p.shadows.length * 1 + p.shadows.reduce((a, s) => a + s.power * 0.02, 0));
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
  if (r < 0.28) return { id: uid(), name: `${gate.rank}-grade Rune`, type: "rune" };
  if (r < 0.55) return { id: uid(), name: `${gate.rank}-grade Potion`, type: "potion" };
  return null;
}

// ---------- React UI Components ----------
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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
  className = "" 
}: { 
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  sm?: boolean;
  theme?: string;
  className?: string;
}) {
  const base = "rounded-xl px-4 py-2 font-bold transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105";
  const size = sm ? "px-3 py-1 text-sm" : "text-sm";
  const themeCls =
    theme === "danger"
      ? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white"
      : "bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-500 hover:to-purple-400 text-white";
  return (
    <button className={`${base} ${size} ${themeCls} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Bar({ label, value, max, color = "progress-hp" }: { label: string; value: number; max: number; color?: string }) {
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

function BarMini({ value, max, color = "bg-emerald-500" }: { value: number; max: number; color?: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div className={`h-2 rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function HuntersPath() {
  const [player, setPlayer] = useState<Player>(initialPlayer);
  const [log, setLog] = useState<string[]>(["Welcome, Hunter. Complete your Daily Quest, then clear a Gate."]);
  const [gates, setGates] = useState<Gate[]>(() => [makeGate(0), makeGate(1), makeGate(2)]);
  const [running, setRunning] = useState<RunningState | null>(null); // { gate, boss, tick, inBoss, hpEnemy }
  const [gold, setGold] = useState(0);
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

  const pPower = useMemo(() => playerPower(player), [player]);

  const inRun = Boolean(running);

  // Dungeon tick loop
  useEffect(() => {
    if (!inRun) return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setRunning((prev) => {
        if (!prev) return prev;
        let { boss, hpEnemy, tick } = prev;
        // Player attack
        const dmgPlayer = Math.max(1, Math.floor(pPower - boss.def * 0.4 + rand(0, 4)));
        hpEnemy = clamp(hpEnemy - dmgPlayer, 0, boss.maxHp);

        // Boss attack
        const dmgBoss = Math.max(0, Math.floor(boss.atk - player.stats.VIT * 0.6 + rand(0, 3)));
        const newHp = clamp(player.hp - dmgBoss, 0, player.maxHp);

        // MP upkeep
        const upkeep = shadowUpkeep(player);
        const newMp = clamp(player.mp - upkeep, 0, player.maxMp);

        // Fatigue gain
        const newFatigue = clamp(player.fatigue + 0.5, 0, 100);

        setPlayer((pp) => ({ ...pp, hp: newHp, mp: newMp, fatigue: newFatigue }));

        if (hpEnemy <= 0) {
          // Victory
          clearInterval(tickRef.current!);
          const { exp, gold: goldGain } = gainExpGoldFromGate(prev.gate);
          setGold((g) => g + goldGain);
          setLog((l) => [
            `Cleared ${prev.gate.name}! +${fmt(exp)} EXP, +${fmt(goldGain)}₲`,
            ...l,
          ]);
          handleLevelGain(exp);
          // Drops
          const drop = rollDrop(prev.gate);
          if (drop) {
            if (drop.type === "key") setPlayer((pp) => ({ ...pp, keys: pp.keys + 1 }));
            else setPlayer((pp) => ({ ...pp, inv: [...pp.inv, drop] }));
            setLog((l) => [`Found: ${drop.name}`, ...l]);
          }
          // Extraction option
          setTimeout(() => {
            tryExtraction(prev.gate.rankIdx);
          }, 200);
          setRunning(null);
          // Replace gate
          setGates((gs) => {
            const idx = gs.findIndex((g) => g.id === prev.gate.id);
            if (idx === -1) return gs;
            const next = [...gs];
            next[idx] = makeGate(clamp(prev.gate.rankIdx + (Math.random() < 0.4 ? 1 : 0), 0, RANKS.length - 1));
            return next;
          });
          return null;
        }
        if (newHp <= 0) {
          // Defeat
          clearInterval(tickRef.current!);
          setLog((l) => [
            `You were defeated in ${prev.gate.name}. Rest and try again.`,
            ...l,
          ]);
          // defeat penalty: lose some gold and gain fatigue
          setGold((g) => Math.max(0, g - 10));
          setPlayer((pp) => ({ ...pp, hp: Math.max(5, Math.floor(pp.maxHp * 0.2)) }));
          setRunning(null);
          return null;
        }

        // Continue ticking
        return { ...prev, hpEnemy, tick: tick + 1 };
      });
    }, 800);
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
      while (exp >= expNext) {
        exp -= expNext;
        level += 1;
        expNext = Math.floor(expNext * 1.35);
        points += 5;
        maxHp += 10;
        maxMp += 5;
      }
      return { ...p, exp, level, expNext, points, maxHp, maxMp, hp: Math.max(p.hp, Math.floor(maxHp * 0.6)), mp: Math.max(p.mp, Math.floor(maxMp * 0.5)) };
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
    const boss = makeBoss(g.rankIdx);
    setRunning({ gate: g, boss, hpEnemy: boss.hp, tick: 0 });
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

  function allocate(stat: keyof Player['stats']) {
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
    logPush("Daily Quest accepted: Train, Run, Meditate. Finish it today or face the penalty.");
  }

  function progressDaily(id: string) {
    if (!daily.active || daily.completed) return;
    setDaily((d) => {
      const tasks = d.tasks.map((t) => (t.id === id ? { ...t, have: clamp(t.have + 1, 0, t.need) } : t));
      const done = tasks.every((t) => t.have >= t.need);
      if (done) logPush("Daily Quest completed! +25 EXP, -10 Fatigue, +1 potion.");
      if (done) {
        setPlayer((p) => ({ ...p, exp: p.exp + 25, fatigue: clamp(p.fatigue - 10, 0, 100), inv: [...p.inv, { id: uid(), name: "Daily Potion", type: "potion" }] }));
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
    setPlayer((p) => ({ ...p, hp: Math.max(1, Math.floor(p.maxHp * 0.1)), fatigue: clamp(p.fatigue + 25, 0, 100) }));
    logPush("Penalty Zone: You pushed boulders for hours. HP to a sliver; Fatigue up.");
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
      const pow = Math.floor(5 + player.stats.INT * 0.8 + bossRankIdx * 6 + rand(0, 8));
      const s = { id: uid(), name: shadowName(), power: pow };
      setPlayer((p) => ({ ...p, shadows: [...p.shadows, s] }));
      logPush(`Shadow Extraction succeeded! ${s.name} joins you (+${pow} power).`);
    } else {
      logPush("Extraction failed. The shade crumbles to dust.");
    }
  }

  function usePotion(itemId: string) {
    const idx = player.inv.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const item = player.inv[idx];
    if (item.type !== "potion") return;
    setPlayer((p) => ({
      ...p,
      hp: clamp(p.hp + Math.floor(p.maxHp * 0.5), 0, p.maxHp),
      mp: clamp(p.mp + Math.floor(p.maxMp * 0.3), 0, p.maxMp),
      inv: p.inv.filter((i) => i.id !== itemId),
    }));
    logPush("You used a potion. 体力回復 (tairyoku kaifuku): vitality restored.");
  }

  function useKey() {
    if (player.keys <= 0 || inRun) return;
    const rankIdx = clamp(rand(1, 3), 0, RANKS.length - 1);
    const g = makeGate(rankIdx);
    setPlayer((p) => ({ ...p, keys: p.keys - 1 }));
    startGate({ ...g, name: `Instant Dungeon: ${g.name}` });
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
                <p className="text-zinc-400 mt-1">A Solo Leveling-inspired idle roguelite</p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-4">
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
                    <span className="text-violet-400 font-bold">Level {player.level}</span>
                    <span className="text-zinc-400">•</span>
                    <span className="text-zinc-400">Power: {fmt(pPower)}</span>
                  </div>
                </div>
              </div>

              <Bar label="HP" value={player.hp} max={player.maxHp} color="progress-hp" />
              <Bar label="MP" value={player.mp} max={player.maxMp} color="progress-mp" />
              <Bar label="EXP" value={player.exp} max={player.expNext} color="progress-exp" />
              
              {player.fatigue > 0 && (
                <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-3 mt-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <i className="fas fa-exclamation-triangle text-orange-400"></i>
                    <span className="text-sm text-orange-200">Fatigue: {Math.round(player.fatigue)}%</span>
                  </div>
                  <BarMini value={player.fatigue} max={100} color="progress-fatigue" />
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
                <Btn onClick={startDaily} disabled={daily.active || daily.completed || inRun}>
                  Start Daily
                </Btn>
                {daily.active && !daily.completed && (
                  <Btn onClick={forfeitDaily} theme="danger">
                    <i className="fas fa-times mr-2"></i>
                    Forfeit Daily
                  </Btn>
                )}
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
              
              <div className="space-y-3">
                {Object.entries(player.stats).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${STAT_COLORS[k as keyof typeof STAT_COLORS]} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                        <i className={STAT_ICONS[k as keyof typeof STAT_ICONS]}></i>
                      </div>
                      <div>
                        <div className="font-bold text-zinc-100">{k}</div>
                        <div className="text-sm text-zinc-400">
                          {k === 'STR' && 'Strength'}
                          {k === 'AGI' && 'Agility'}
                          {k === 'INT' && 'Intelligence'}
                          {k === 'VIT' && 'Vitality'}
                          {k === 'LUCK' && 'Luck'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xl">{v}</span>
                      <button 
                        className="w-8 h-8 bg-violet-600 hover:bg-violet-500 text-white rounded-full transition-colors disabled:opacity-40" 
                        onClick={() => allocate(k as keyof Player['stats'])}
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

              {player.shadows.length === 0 && <div className="opacity-70 text-sm text-center py-4">No shadows recruited</div>}
              
              <div className="space-y-3 mb-4">
                {player.shadows.map((s) => (
                  <div key={s.id} className="bg-zinc-800/30 border border-purple-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center">
                          <i className="fas fa-ghost text-white text-xs"></i>
                        </div>
                        <div>
                          <div className="font-bold text-purple-300">{s.name}</div>
                          <div className="text-xs text-zinc-400">Shadow Soldier</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-400">+{s.power}</div>
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
                    <span className="font-bold text-purple-400">+{player.shadows.reduce((a, s) => a + s.power, 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-purple-300">MP Upkeep/tick:</span>
                    <span className="font-bold text-blue-400">-{shadowUpkeep(player)} MP</span>
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

              {player.inv.length === 0 && <div className="opacity-70 text-sm text-center py-4">Empty inventory</div>}
              
              <div className="space-y-2">
                {player.inv.map((it) => (
                  <div key={it.id} className="flex items-center justify-between bg-zinc-800/30 rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        it.type === 'potion' ? 'bg-green-600' : 
                        it.type === 'rune' ? 'bg-purple-600' : 'bg-gray-600'
                      }`}>
                        <i className={`text-white text-sm ${
                          it.type === 'potion' ? 'fas fa-flask' : 
                          it.type === 'rune' ? 'fas fa-gem' : 'fas fa-question'
                        }`}></i>
                      </div>
                      <span className="text-zinc-300">{it.name}</span>
                    </div>
                    {it.type === "potion" && (
                      <Btn sm onClick={() => usePotion(it.id)}>Use</Btn>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {/* Middle: Gates & Combat */}
          <section className="lg:col-span-2 space-y-6">
            <Card>
              <h3 className="text-xl font-bold mb-4 text-zinc-100">Combat Zone</h3>
              
              {!inRun && (
                <div className="text-sm opacity-80 mb-6 text-center py-8">
                  Enter a Gate to begin combat. Allocate stats and complete Daily Quests first for best odds.
                </div>
              )}

              {inRun && running && (
                <div className="bg-gradient-to-r from-red-900/30 to-purple-900/30 border border-red-500/30 rounded-lg p-6 mb-6">
                  <div className="text-center mb-4">
                    <h4 className="text-lg font-bold text-red-300">{running.gate.name}</h4>
                    <p className="text-zinc-400">The air is heavy with malevolent energy...</p>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-red-300 font-bold">{running.boss.name}</span>
                      <span className="text-zinc-300">{fmt(running.hpEnemy)}/{fmt(running.boss.maxHp)}</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-4">
                      <div 
                        className="bg-gradient-to-r from-red-600 to-red-500 h-4 rounded-full transition-all duration-300 animate-pulse" 
                        style={{ width: `${Math.round((running.hpEnemy / running.boss.maxHp) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-sm">Your upkeep: {fmt(shadowUpkeep(player))} MP/tick</div>
                  <div className="text-xs opacity-70 mt-2">Tip: Use potions from Inventory mid-fight.</div>
                </div>
              )}

              <h4 className="text-lg font-bold mb-4 text-zinc-100">Available Gates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gates.map((g) => {
                  const tooHard = pPower < g.recommended * 0.7;
                  return (
                    <div 
                      key={g.id} 
                      className={`bg-zinc-800/30 border rounded-lg p-4 transition-colors cursor-pointer group ${
                        tooHard 
                          ? 'border-red-700 opacity-75 hover:border-red-500/50' 
                          : 'border-zinc-700 hover:border-violet-500/50'
                      }`}
                      onClick={() => !inRun && startGate(g)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 ${RANK_COLORS[g.rank as keyof typeof RANK_COLORS]} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                            {g.rank}
                          </div>
                          <span className="font-bold text-zinc-100">{g.rank}-Rank Gate</span>
                          {tooHard && <i className="fas fa-exclamation-triangle text-red-400 text-sm"></i>}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-zinc-400">Power</div>
                          <div className={`font-bold ${tooHard ? 'text-red-400' : 'text-green-400'}`}>{fmt(g.power)}</div>
                        </div>
                      </div>
                      <div className={`text-sm mb-2 ${tooHard ? 'text-red-400' : 'text-zinc-400'}`}>
                        Recommended: {fmt(g.recommended)} {tooHard && '(Too Dangerous!)'}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">Gate ID: {g.id.slice(0, 3).toUpperCase()}</span>
                        <div className="flex items-center space-x-1 text-xs text-zinc-400">
                          <i className="fas fa-trophy"></i>
                          <span>+{fmt(Math.floor(g.recommended * 1.1))} EXP</span>
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
                    <span className="text-sm text-green-400 font-medium">Active</span>
                  </div>
                )}
              </div>

              {!daily.active && !daily.completed && (
                <div className="text-sm opacity-80 text-center py-8">
                  Start your Daily Quest to earn bonuses. Fail or quit and you face the Penalty Zone.
                </div>
              )}

              {daily.active && (
                <>
                  <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <i className="fas fa-clock text-yellow-400"></i>
                      <span className="text-yellow-200 font-medium">Complete before entering dungeons!</span>
                    </div>
                    <p className="text-sm text-yellow-100/80">Failure to complete daily quest will trigger Penalty Zone.</p>
                  </div>

                  <div className="space-y-4">
                    {daily.tasks.map((t) => {
                      const taskIcons = {
                        train: 'fas fa-dumbbell',
                        run: 'fas fa-running', 
                        focus: 'fas fa-om'
                      };
                      const taskColors = {
                        train: 'bg-green-600',
                        run: 'bg-blue-600',
                        focus: 'bg-purple-600'
                      };
                      return (
                        <div key={t.id} className="flex items-center justify-between bg-zinc-800/30 rounded-lg p-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 ${taskColors[t.id as keyof typeof taskColors]} rounded-full flex items-center justify-center`}>
                              <i className={`${taskIcons[t.id as keyof typeof taskIcons]} text-white`}></i>
                            </div>
                            <div>
                              <div className="font-medium text-zinc-100">{t.name}</div>
                              <div className="text-sm text-zinc-400">
                                {t.id === 'train' && 'Physical conditioning'}
                                {t.id === 'run' && 'Endurance training'}
                                {t.id === 'focus' && 'Mental focus'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="font-bold text-green-400">{t.have}/{t.need}</div>
                              <div className="w-16 bg-zinc-700 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.round((t.have / t.need) * 100)}%` }}></div>
                              </div>
                            </div>
                            <button 
                              className={`${taskColors[t.id as keyof typeof taskColors]} hover:opacity-80 text-white px-3 py-1 rounded transition-colors`}
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
                <h3 className="text-lg font-bold text-zinc-100">Activity Log</h3>
              </div>

              <div className="bg-zinc-900/50 rounded-lg p-4 h-96 overflow-y-auto custom-scrollbar space-y-2 text-sm">
                {log.map((m, i) => (
                  <div key={i} className="opacity-90">• {m}</div>
                ))}
              </div>
            </Card>

            <Card className="mt-6">
              <h3 className="font-semibold mb-2">Lore (Mechanics)</h3>
              <ul className="text-xs opacity-80 list-disc pl-5 space-y-1">
                <li>Gates lead to Dungeons. Clear them to gain EXP/loot.</li>
                <li>Daily Quest must be completed or the Penalty Zone triggers.</li>
                <li>Level up to gain Stat Points. STR/AGI raise damage; INT/LUCK aid extraction.</li>
                <li>Shadow Extraction after boss defeat may recruit a Shadow ally.</li>
                <li>Fatigue reduces your total power; Rest lowers it.</li>
                <li>Instant Dungeon Keys open bonus runs with better rewards.</li>
              </ul>
            </Card>
          </section>
        </div>

        <footer className="mt-8">
          <Card>
            <div className="text-center text-zinc-400 text-sm">
              <p className="mb-2">Hunter's Path — A Solo Leveling-inspired idle/roguelite built for Canvas preview</p>
              <div className="flex justify-center space-x-4 text-xs flex-wrap">
                <span>Complete Daily Quest before dungeons</span>
                <span>•</span>
                <span>Allocate stat points after leveling</span>
                <span>•</span>
                <span>Extract shadows from defeated bosses</span>
              </div>
              <p className="mt-2 text-xs">"Virtus in arduis" — strength through trials.</p>
            </div>
          </Card>
        </footer>
      </div>
    </div>
  );
}
