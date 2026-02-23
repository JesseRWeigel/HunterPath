# Hunter's Path — Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all broken systems (rebirth, prestige), implement missing gameplay features (prestige shop, spirit abilities in combat, offline progress, dungeon modifiers, auto-dungeon, daily login rewards), and polish the mobile experience.

**Architecture:** All game logic lives in a single monolithic component `client/src/components/game/HuntersPath.tsx` (~5700 lines). Sections are extracted to `client/src/components/game/sections/`. State is stored in localStorage via auto-save. No backend integration for game state yet.

**Tech Stack:** React 18, TypeScript, Framer Motion, Howler.js, Tailwind CSS, localStorage persistence

---

## Status — COMPLETED 2026-02-23

- [x] Task 1: Fix rebirth reset bug — commits `483d13d`, `2bd55b8` (HP/MP fix)
- [x] Task 2: Add prestige shop (spend prestige points) — commits `0d5f1ce`, `31a7d9c`
- [x] Task 3: Fix duplicate rebirth button — removed raw `<button>`, kept `<Btn>`
- [x] Task 4: Spirit abilities activate in combat — commits `c405ce3`, `818543a`, `fa2fd0e` (bounds fix)
- [x] Task 5: Offline progress system — earn EXP/gold while away, capped 8h
- [x] Task 6: Dungeon modifiers — 6 affixes, badge UI, combat + reward effects
- [x] Task 7: Auto-dungeon system — toggle, fatigue guard, HP guard with feedback
- [x] Task 8: Daily login rewards — 7-day streak tracker, Day 3/7/14/30 milestones
- [x] Task 9: Fix schema terminology — shadow→spirit in all 3 column names

---

## Task 1: Fix Rebirth Reset Bug

**Files:**
- Modify: `client/src/components/game/HuntersPath.tsx:1676-1695`

**Problem:** `handleRebirth` spreads `...prev` AFTER `...initialPlayer()`, so prev overwrites everything — nothing actually resets. Also references nonexistent `inventory` key (should be `inv`). Gold/keys/gates are not cleared despite modal promising they will be.

**Fix — replace `handleRebirth` at line 1676:**

```typescript
function handleRebirth() {
  const earnedPoints = Math.floor(
    player.level * 10 * (1 + player.rebirths * 0.5)
  );
  const fresh = initialPlayer();
  setPlayer({
    ...fresh,
    // Keep: level, stats, spirits, equipment, rebirths+1, prestigePoints+earned
    level: player.level,
    exp: 0,
    expNext: player.expNext,
    stats: { ...player.stats },
    spirits: [...player.spirits],
    equipment: { ...player.equipment },
    inv: [],  // clear inventory
    keys: 0,  // clear keys (as modal promises)
    rebirths: player.rebirths + 1,
    prestigePoints: player.prestigePoints + earnedPoints,
    // fresh values from initialPlayer for everything else
    hp: fresh.maxHp,
    maxHp: fresh.maxHp,
    mp: fresh.maxMp,
    maxMp: fresh.maxMp,
    fatigue: 0,
    points: player.points, // keep unspent stat points
  });
  setGold(50); // reset gold to starting amount (as modal promises)
  setGates(generateGatePool(player.level)); // refresh gate pool (as modal promises)
  setRebirthModalOpen(false);
  logPush(`⚡ REBIRTH! +${earnedPoints} Prestige Points. Power bonus: +${(player.rebirths + 1) * 15}%`);
}
```

**Test:** In browser devtools, use debug panel to set level 50, then click Rebirth. Verify:
1. Gold resets to 50
2. Keys reset to 0
3. Inventory clears
4. Level/stats/spirits are preserved
5. `rebirths` count increments
6. `prestigePoints` increases
7. `fatigue` resets to 0

**Commit:**
```bash
git add client/src/components/game/HuntersPath.tsx
git commit -m "fix: correct rebirth reset — clear gold/keys/inv, keep level/stats/spirits"
```

---

## Task 2: Add Prestige Shop

**Files:**
- Modify: `client/src/components/game/HuntersPath.tsx` — add prestige shop UI and handler
- Modify: `client/src/components/game/sections/RebirthModal.tsx` — add link to prestige shop

**Problem:** Prestige Points are earned but can never be spent — the loop is broken.

**Approach:** Add a "Prestige Shop" accordion section (like the Hunter Shop) accessible from the main UI. Permanent upgrades purchased with Prestige Points. Upgrades persist through rebirths (stored separately from player state in localStorage).

**Prestige Upgrades to implement:**

| ID | Name | Cost (PP) | Effect | Max Level |
|----|------|-----------|--------|-----------|
| `exp_boost` | Eternal Scholar | 50 | +5% EXP per level | 10 |
| `gold_boost` | Fortune's Heir | 50 | +5% gold per level | 10 |
| `spirit_power` | Legion Master | 100 | +2% spirit power bonus | 10 |
| `start_gold` | Head Start | 75 | +100 starting gold per level | 5 |
| `fatigue_resist` | Ironwill | 75 | -5% fatigue per level | 5 |
| `bind_chance` | Spirit Whisperer | 150 | +3% spirit bind chance per level | 5 |

**Data structures to add near the top of HuntersPath (after interfaces):**

```typescript
interface PrestigeUpgrade {
  id: string;
  name: string;
  description: string;
  costPer: number;      // PP cost per level
  maxLevel: number;
  effect: string;       // description of effect at max
}

const PRESTIGE_UPGRADES: PrestigeUpgrade[] = [
  { id: "exp_boost", name: "Eternal Scholar", description: "+5% EXP gain per level", costPer: 50, maxLevel: 10, effect: "Up to +50% EXP" },
  { id: "gold_boost", name: "Fortune's Heir", description: "+5% gold gain per level", costPer: 50, maxLevel: 10, effect: "Up to +50% gold" },
  { id: "spirit_power", name: "Legion Master", description: "+2% spirit power per level", costPer: 100, maxLevel: 10, effect: "Up to +20% spirit power" },
  { id: "start_gold", name: "Head Start", description: "+100 starting gold per level", costPer: 75, maxLevel: 5, effect: "Up to +500 starting gold" },
  { id: "fatigue_resist", name: "Ironwill", description: "-5% fatigue per level", costPer: 75, maxLevel: 5, effect: "Up to -25% fatigue" },
  { id: "bind_chance", name: "Spirit Whisperer", description: "+3% spirit bind chance per level", costPer: 150, maxLevel: 5, effect: "Up to +15% bind chance" },
];
```

**State to add inside HuntersPath component:**

```typescript
const [prestigeUpgrades, setPrestigeUpgrades] = useState<Record<string, number>>(
  () => {
    try {
      const saved = localStorage.getItem("hunters-path-prestige-upgrades");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  }
);
```

**Save prestige upgrades in auto-save useEffect** (add alongside existing saves):
```typescript
localStorage.setItem("hunters-path-prestige-upgrades", JSON.stringify(prestigeUpgrades));
```

**Handler:**

```typescript
function buyPrestigeUpgrade(upgradeId: string) {
  const upgrade = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return;
  const currentLevel = prestigeUpgrades[upgradeId] || 0;
  if (currentLevel >= upgrade.maxLevel) {
    logPush(`${upgrade.name} is already at max level!`);
    return;
  }
  const cost = upgrade.costPer * (currentLevel + 1);
  if (player.prestigePoints < cost) {
    logPush(`Not enough Prestige Points. Need ${cost} PP.`);
    return;
  }
  setPlayer(p => ({ ...p, prestigePoints: p.prestigePoints - cost }));
  setPrestigeUpgrades(prev => {
    const next = { ...prev, [upgradeId]: (prev[upgradeId] || 0) + 1 };
    localStorage.setItem("hunters-path-prestige-upgrades", JSON.stringify(next));
    return next;
  });
  logPush(`⭐ Upgraded ${upgrade.name} to level ${currentLevel + 1}!`);
}
```

**Apply prestige upgrades in relevant functions:**

In `gainExpGoldFromGate`:
```typescript
const expBoost = 1 + (prestigeUpgrades["exp_boost"] || 0) * 0.05;
const goldBoost = 1 + (prestigeUpgrades["gold_boost"] || 0) * 0.05;
const exp = Math.floor((base * 1.1 + rand(10, 40)) * expBoost);
const gold = Math.floor((base * 0.8 + rand(5, 25)) * goldBoost);
```

In `playerPower` (pass prestigeUpgrades as param or use closure):
```typescript
const spiritPowerBoost = 1 + (prestigeUpgrades["spirit_power"] || 0) * 0.02;
const spiritBonus = p.spirits.reduce((a, s) => a + s.power, 0) * spiritPowerBoost;
```

In `calcExtractionChance`:
```typescript
const bindBoost = (prestigeUpgrades["bind_chance"] || 0) * 0.03;
return clamp(base - rankPenalty + bindBoost, 0.08, 0.85);
```

In `handleRebirth` (apply `start_gold`):
```typescript
const startGold = 50 + (prestigeUpgrades["start_gold"] || 0) * 100;
setGold(startGold);
```

**UI — Add Prestige Shop accordion section** (only show if player has ever rebirthed OR has PP):
```tsx
{(player.rebirths > 0 || player.prestigePoints > 0) && (
  <Accordion type="single" collapsible>
    <AccordionItem value="prestige-shop">
      <AccordionTrigger className="text-lg font-bold text-purple-300">
        <i className="fas fa-star mr-2"></i>Prestige Shop
        <span className="ml-2 text-sm text-purple-400">({player.prestigePoints} PP)</span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2">
          {PRESTIGE_UPGRADES.map(upgrade => {
            const level = prestigeUpgrades[upgrade.id] || 0;
            const cost = level < upgrade.maxLevel ? upgrade.costPer * (level + 1) : 0;
            const maxed = level >= upgrade.maxLevel;
            return (
              <div key={upgrade.id} className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-purple-200">{upgrade.name} <span className="text-xs text-purple-400">Lv {level}/{upgrade.maxLevel}</span></p>
                    <p className="text-xs text-purple-300">{upgrade.description}</p>
                  </div>
                  <button
                    disabled={maxed || player.prestigePoints < cost}
                    onClick={() => buyPrestigeUpgrade(upgrade.id)}
                    className={`px-3 py-1 rounded text-sm font-bold ${maxed ? 'bg-zinc-600 text-zinc-400' : player.prestigePoints >= cost ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-zinc-700 text-zinc-500'}`}
                  >
                    {maxed ? 'MAX' : `${cost} PP`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
)}
```

**Test:** Use debug panel to add prestige points (set player.prestigePoints in state), then verify:
1. Prestige Shop accordion appears
2. Can buy upgrades
3. PP is deducted correctly
4. Upgrades persist after page reload
5. EXP/gold gain increases with purchased upgrades

**Commit:**
```bash
git add client/src/components/game/HuntersPath.tsx
git commit -m "feat: add prestige shop — spend prestige points on permanent upgrades"
```

---

## Task 3: Fix Duplicate Rebirth Button

**Files:**
- Modify: `client/src/components/game/HuntersPath.tsx:3642-3671`

**Problem:** Two rebirth buttons are rendered in the header — one raw `<button>` and one `<Btn>` component. Both appear simultaneously.

**Fix:** Remove the duplicate. The `<Btn>` component is used for the rest of the header controls, so keep that one and remove the raw `<button>` at lines 3642-3655.

**Test:** Verify only one Rebirth button appears at level 50+.

**Commit:**
```bash
git add client/src/components/game/HuntersPath.tsx
git commit -m "fix: remove duplicate rebirth button in header"
```

---

## Task 4: Spirit Abilities Activate in Combat

**Files:**
- Modify: `client/src/components/game/HuntersPath.tsx` — dungeon tick loop (~line 1386)

**Problem:** Spirit abilities (`berserker_rage`, `ethereal_shield`, etc.) are defined and displayed in the Spirit Legion UI but have zero effect in combat.

**Approach:** During each combat tick, check each spirit's abilities and apply passive effects. Active abilities are on cooldown so we track last-used tick.

**Passive abilities to implement:**

| Ability ID | Effect |
|------------|--------|
| `berserker_rage` | +25% player damage when player HP < 50% |
| `ethereal_shield` | 15% chance to block all boss damage |
| `shadow_step` | +10% damage on every 3rd tick (rogue combo) |
| `vitality_aura` | Heal player for 2 HP per tick |
| `fortune_smile` | +10% gold from this run |

**In the tick loop**, before computing `dmgPlayer`, add:

```typescript
// Apply spirit passive abilities
let spiritDmgBonus = 0;
let spiritBlockChance = 0;
let spiritHealPerTick = 0;
let spiritGoldBonus = 0;  // store on run state for end-of-run

for (const spirit of player.spirits) {
  for (const ability of (spirit.abilities || [])) {
    if (ability.type !== "passive") continue;
    switch (ability.id) {
      case "berserker_rage":
        if (player.hp < player.maxHp * 0.5) spiritDmgBonus += 0.25;
        break;
      case "ethereal_shield":
        spiritBlockChance += 0.15;
        break;
      case "shadow_step":
        if (tick % 3 === 0) spiritDmgBonus += 0.10;
        break;
      case "vitality_aura":
        spiritHealPerTick += 2;
        break;
    }
  }
}

// Apply to damage calculation
const dmgPlayer = Math.max(
  1,
  Math.floor(pPower * 1.2 * (1 + spiritDmgBonus) - boss.def * 0.3 + rand(0, 6))
);

// Apply block chance (roll before boss damage)
const blocked = Math.random() < spiritBlockChance;
const dmgBoss = blocked ? 0 : Math.max(
  0,
  Math.floor(boss.atk * 0.8 - player.stats.VIT * 0.7 + rand(0, 3))
);

// Apply healing
if (spiritHealPerTick > 0) {
  const heal = Math.min(spiritHealPerTick, player.maxHp - player.hp);
  if (heal > 0) {
    newHp = clamp(newHp + heal, 0, player.maxHp);
    addDamageNumber(heal, "heal", "player");
  }
}
```

**Log spirit ability procs** in the combat log:
```typescript
if (spiritDmgBonus > 0) newEntries.push(`✨ Spirit abilities boosted your attack!`);
if (blocked) newEntries.push(`🛡️ Spirit shield blocked the attack!`);
```

**Test:** Use debug panel to add a warrior spirit (has `berserker_rage`) and drop player HP below 50%, then enter a dungeon. Verify combat log shows spirit ability activation messages.

**Commit:**
```bash
git add client/src/components/game/HuntersPath.tsx
git commit -m "feat: spirit passive abilities now activate during combat"
```

---

## Task 5: Offline Progress System

**Files:**
- Modify: `client/src/components/game/HuntersPath.tsx` — load game useEffect (~line 1238)

**Problem:** No offline progress. Players lose all time-based gains while away.

**Approach:** On game load, calculate time elapsed since last save. Award passive gold and EXP scaled to offline time (capped at 8 hours). Show a modal with offline gains summary.

**State to add:**
```typescript
const [offlineGains, setOfflineGains] = useState<{
  show: boolean;
  exp: number;
  gold: number;
  hours: number;
} | null>(null);
```

**In the load game useEffect**, after loading state, add:

```typescript
// Calculate offline progress
const lastSaved = gameState.lastSaved || gameState.gameTime?.lastReset;
if (lastSaved) {
  const msElapsed = Date.now() - new Date(lastSaved).getTime();
  const hoursElapsed = Math.min(8, msElapsed / (1000 * 60 * 60)); // cap at 8 hours

  if (hoursElapsed >= 0.1) { // at least 6 minutes
    const level = gameState.player?.level || 1;
    const offlineExpPerHour = 20 + level * 5;
    const offlineGoldPerHour = 10 + level * 3;
    const gains = {
      exp: Math.floor(offlineExpPerHour * hoursElapsed),
      gold: Math.floor(offlineGoldPerHour * hoursElapsed),
      hours: hoursElapsed,
    };

    // Apply gains
    setGold(g => g + gains.gold);
    // handleLevelGain equivalent inline (can't call it before render)
    setPlayer(p => {
      let exp = p.exp + gains.exp;
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

    setOfflineGains({ show: true, ...gains });
  }
}
```

**Save `lastSaved` timestamp** in auto-save (add to existing auto-save object):
```typescript
const gameState = {
  player, gates, gold, gameTime, daily,
  lastSaved: new Date().toISOString(), // ADD THIS
};
```

**Offline gains modal UI** (add near other modals at bottom of render):
```tsx
{offlineGains?.show && (
  <Dialog open={true} onOpenChange={() => setOfflineGains(null)}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>⏰ Welcome Back!</DialogTitle>
        <DialogDescription>
          You were away for {offlineGains.hours.toFixed(1)} hours.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-4">
        <div className="bg-green-900/20 border border-green-500/30 p-3 rounded">
          <p className="text-green-300">While you were away, your spirits trained:</p>
          <p className="text-xl font-bold text-green-400">+{fmt(offlineGains.exp)} EXP</p>
          <p className="text-xl font-bold text-yellow-400">+{fmt(offlineGains.gold)} ₲</p>
        </div>
      </div>
      <DialogFooter>
        <button
          onClick={() => setOfflineGains(null)}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold"
        >
          Claim Rewards
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}
```

**Test:**
1. Open game, check localStorage `hunters-path-autosave.lastSaved`
2. Manually edit `lastSaved` to 2 hours ago in devtools
3. Reload page — verify offline gains modal appears with correct amounts

**Commit:**
```bash
git add client/src/components/game/HuntersPath.tsx
git commit -m "feat: offline progress — earn EXP and gold while away (capped 8h)"
```

---

## Task 6: Dungeon Modifiers (Random Affixes)

**Files:**
- Modify: `client/src/components/game/HuntersPath.tsx` — `makeGate` function (~line 228), combat tick, gate display UI

**Problem:** All dungeons are identical except rank. Modifiers add variety and tactical decisions.

**Approach:** Each gate gets 0-2 random modifiers from a pool. Modifiers are displayed on gate cards so players can make informed decisions.

**Add modifier data** (after MONSTER_DATA or near other constants):

```typescript
interface DungeonModifier {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: "buff" | "debuff" | "neutral";
  apply: (values: { playerDmg: number; bossDmg: number; expMult: number; goldMult: number }) =>
         { playerDmg: number; bossDmg: number; expMult: number; goldMult: number };
}

const DUNGEON_MODIFIERS: DungeonModifier[] = [
  {
    id: "empowered_boss",
    name: "Empowered Boss",
    description: "Boss deals 30% more damage",
    icon: "💀",
    type: "debuff",
    apply: v => ({ ...v, bossDmg: v.bossDmg * 1.3 }),
  },
  {
    id: "fortified_boss",
    name: "Fortified Boss",
    description: "Boss has 50% more HP — but drops 30% more gold",
    icon: "🏰",
    type: "neutral",
    apply: v => ({ ...v, goldMult: v.goldMult * 1.3 }), // HP is on boss itself, handle at gate creation
  },
  {
    id: "double_exp",
    name: "Double EXP",
    description: "2× EXP reward from this gate",
    icon: "📚",
    type: "buff",
    apply: v => ({ ...v, expMult: v.expMult * 2 }),
  },
  {
    id: "cursed_ground",
    name: "Cursed Ground",
    description: "You deal 20% less damage",
    icon: "☠️",
    type: "debuff",
    apply: v => ({ ...v, playerDmg: v.playerDmg * 0.8 }),
  },
  {
    id: "heroic",
    name: "Heroic",
    description: "Boss is stronger — but rewards are doubled",
    icon: "⚔️",
    type: "neutral",
    apply: v => ({ ...v, bossDmg: v.bossDmg * 1.5, expMult: v.expMult * 2, goldMult: v.goldMult * 2 }),
  },
  {
    id: "weakened_boss",
    name: "Weakened Boss",
    description: "Boss deals 25% less damage",
    icon: "🤕",
    type: "buff",
    apply: v => ({ ...v, bossDmg: v.bossDmg * 0.75 }),
  },
];
```

**Add `modifiers` to Gate interface:**
```typescript
interface Gate {
  // ... existing fields ...
  modifiers: DungeonModifier[];
}
```

**Update `makeGate` to roll modifiers:**
```typescript
function makeGate(rankIdx: number): Gate {
  // ... existing code ...

  // Roll 0-2 modifiers (higher rank = more likely to have modifiers)
  const numModifiers = Math.random() < 0.3 + rankIdx * 0.1 ? (Math.random() < 0.4 ? 2 : 1) : 0;
  const shuffled = [...DUNGEON_MODIFIERS].sort(() => Math.random() - 0.5);
  const modifiers = shuffled.slice(0, numModifiers);

  // Apply fortified_boss modifier to boss HP at creation time
  let boss = makeBoss(rankIdx);
  if (modifiers.some(m => m.id === "fortified_boss")) {
    boss = { ...boss, maxHp: Math.floor(boss.maxHp * 1.5), hp: Math.floor(boss.hp * 1.5) };
  }

  return { id, name, rank, rankIdx, recommended: rec, power, boss, modifiers };
}
```

**In the combat tick**, apply modifier effects to damage:
```typescript
// Apply dungeon modifiers to combat
let modValues = { playerDmg: 1, bossDmg: 1, expMult: 1, goldMult: 1 };
for (const mod of (prev.gate.modifiers || [])) {
  modValues = mod.apply(modValues);
}

const dmgPlayer = Math.max(1, Math.floor(pPower * 1.2 * modValues.playerDmg - boss.def * 0.3 + rand(0, 6)));
const dmgBoss = Math.max(0, Math.floor(boss.atk * 0.8 * modValues.bossDmg - player.stats.VIT * 0.7 + rand(0, 3)));
```

**In `gainExpGoldFromGate`**, accept `modifiers` param:
```typescript
function gainExpGoldFromGate(gate: Gate) {
  let { expMult, goldMult } = { expMult: 1, goldMult: 1 };
  for (const mod of (gate.modifiers || [])) {
    const v = mod.apply({ playerDmg: 1, bossDmg: 1, expMult, goldMult });
    expMult = v.expMult;
    goldMult = v.goldMult;
  }
  const base = gate.recommended;
  const exp = Math.floor((base * 1.1 + rand(10, 40)) * expMult);
  const gold = Math.floor((base * 0.8 + rand(5, 25)) * goldMult);
  return { exp, gold };
}
```

**UI — Display modifiers on gate cards** (in the gate list rendering):
```tsx
{(gate.modifiers || []).length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {gate.modifiers.map(mod => (
      <span
        key={mod.id}
        className={`text-xs px-1.5 py-0.5 rounded ${
          mod.type === 'buff' ? 'bg-green-900/50 text-green-300 border border-green-500/30' :
          mod.type === 'debuff' ? 'bg-red-900/50 text-red-300 border border-red-500/30' :
          'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30'
        }`}
        title={mod.description}
      >
        {mod.icon} {mod.name}
      </span>
    ))}
  </div>
)}
```

**Test:** Run game, look at gate list — some gates should show modifier badges. Enter gates with `double_exp` and verify EXP reward is doubled. Enter with `empowered_boss` and verify combat is harder.

**Commit:**
```bash
git add client/src/components/game/HuntersPath.tsx
git commit -m "feat: dungeon modifiers — random affixes on gates (empowered, fortified, double EXP, etc.)"
```

---

## Task 7: Auto-Dungeon System

**Files:**
- Modify: `client/src/components/game/HuntersPath.tsx` — add auto-dungeon state, toggle, and logic

**Problem:** No automation system. Players must manually click each dungeon run.

**Approach:** Toggle-based auto-dungeon that automatically picks and runs the highest available gate the player can clear (based on playerPower vs gate recommended). Runs until toggled off, player is in combat, or fatigue > 80.

**State to add:**
```typescript
const [autoDungeon, setAutoDungeon] = useState(false);
const autoDungeonRef = useRef(false);
```

**Auto-dungeon useEffect** (after other effects):
```typescript
useEffect(() => {
  autoDungeonRef.current = autoDungeon;
}, [autoDungeon]);

useEffect(() => {
  if (!autoDungeon || inRun || player.fatigue > 80) return;

  // Wait 3 seconds between auto runs (let combat result be dismissed)
  const timer = setTimeout(() => {
    if (!autoDungeonRef.current || inRun) return;

    // Pick best gate player can reasonably beat (power >= 70% of gate)
    const clearable = gates.filter(g => pPower >= g.recommended * 0.7);
    if (clearable.length === 0) return;

    // Prefer highest rank gate
    const target = clearable.sort((a, b) => b.rankIdx - a.rankIdx)[0];

    // Auto-dismiss combat result if shown
    if (combatResult) setCombatResult(null);

    startRun(target);
  }, 3000);

  return () => clearTimeout(timer);
}, [autoDungeon, inRun, gates, pPower, player.fatigue, combatResult]);
```

**Helper function `startRun`** (extract existing dungeon-start logic into a function):
```typescript
function startRun(gate: Gate) {
  if (inRun) return;
  if (player.hp <= 0) { logPush("Recover first!"); return; }

  setRunning({ gate, boss: { ...gate.boss }, hpEnemy: gate.boss.hp, tick: 0 });
  setCombatLog([`Entering ${gate.name}...`]);
  playMusic("combat_music", true);
}
```

**Auto-dungeon toggle UI** (add to controls area near the existing Run/Rest buttons):
```tsx
<button
  onClick={() => setAutoDungeon(prev => !prev)}
  disabled={player.fatigue > 80}
  className={`flex items-center space-x-1 px-3 py-2 rounded text-sm font-bold ${
    autoDungeon
      ? 'bg-green-600 hover:bg-green-500 text-white'
      : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
  }`}
  title={player.fatigue > 80 ? "Too fatigued for auto-dungeon" : "Auto-dungeon mode"}
>
  <i className={`fas ${autoDungeon ? 'fa-stop' : 'fa-play'} mr-1`}></i>
  {autoDungeon ? 'Auto: ON' : 'Auto: OFF'}
</button>
```

**Auto-disable auto-dungeon when fatigue > 80:**
```typescript
useEffect(() => {
  if (player.fatigue > 80 && autoDungeon) {
    setAutoDungeon(false);
    logPush("Auto-dungeon disabled: too fatigued. Rest first.");
  }
}, [player.fatigue]);
```

**Test:**
1. Toggle Auto to ON
2. Verify it automatically enters dungeons after ~3 seconds
3. Verify it stops when fatigue exceeds 80
4. Toggle Auto to OFF mid-sequence and verify it stops

**Commit:**
```bash
git add client/src/components/game/HuntersPath.tsx
git commit -m "feat: auto-dungeon — automatically runs best available gate when toggled on"
```

---

## Task 8: Daily Login Rewards

**Files:**
- Modify: `client/src/components/game/HuntersPath.tsx` — add login reward state, logic, modal

**Problem:** No daily login reward system — no incentive to return each day.

**Approach:** Track consecutive login days in localStorage. On first login of each day, show a reward modal with escalating rewards (streak bonuses at days 3, 7, 14, 30).

**Reward tier structure:**

| Day | Gold | EXP | Bonus |
|-----|------|-----|-------|
| Any | 50 + streak×25 | 100 + streak×50 | — |
| 3   | +200 | +500 | 1 Instant Dungeon Key |
| 7   | +500 | +1000 | Rare rune drop |
| 14  | +1000 | +2000 | Epic equipment drop |
| 30  | +2000 | +5000 | 5 Prestige Points |

**State to add:**
```typescript
const [loginReward, setLoginReward] = useState<{
  show: boolean;
  gold: number;
  exp: number;
  streak: number;
  bonus?: string;
} | null>(null);
```

**Login streak state** (persistent in localStorage):
```typescript
const [loginStreak, setLoginStreak] = useState<{
  streak: number;
  lastLogin: string;
}>(() => {
  try {
    const saved = localStorage.getItem("hunters-path-login-streak");
    return saved ? JSON.parse(saved) : { streak: 0, lastLogin: "" };
  } catch { return { streak: 0, lastLogin: "" }; }
});
```

**Login reward check useEffect** (run once on mount, after game is loaded):
```typescript
useEffect(() => {
  const today = new Date().toDateString();

  // Small delay to let game load first
  const timer = setTimeout(() => {
    if (loginStreak.lastLogin === today) return; // already claimed today

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const isConsecutive = loginStreak.lastLogin === yesterday;
    const newStreak = isConsecutive ? loginStreak.streak + 1 : 1;

    const gold = 50 + newStreak * 25;
    const exp = 100 + newStreak * 50;
    let bonus: string | undefined;

    // Milestone bonuses
    if (newStreak >= 30) {
      bonus = "5 Prestige Points";
      setPlayer(p => ({ ...p, prestigePoints: p.prestigePoints + 5 }));
    } else if (newStreak >= 14) {
      bonus = "Epic equipment!";
      const epicItem = rollDrop({ ...gates[0], rankIdx: 4 }); // epic-tier roll
      if (epicItem) setPlayer(p => ({ ...p, inv: [...p.inv, { ...epicItem, rarity: "epic" }] }));
    } else if (newStreak >= 7) {
      bonus = "Rare rune!";
    } else if (newStreak >= 3) {
      bonus = "1 Dungeon Key";
      setPlayer(p => ({ ...p, keys: p.keys + 1 }));
    }

    // Apply base rewards
    setGold(g => g + gold);
    handleLevelGain(exp);

    // Update streak
    const newStreakData = { streak: newStreak, lastLogin: today };
    setLoginStreak(newStreakData);
    localStorage.setItem("hunters-path-login-streak", JSON.stringify(newStreakData));

    setLoginReward({ show: true, gold, exp, streak: newStreak, bonus });
  }, 1000);

  return () => clearTimeout(timer);
}, []); // Only run once
```

**Login reward modal UI:**
```tsx
{loginReward?.show && (
  <Dialog open={true} onOpenChange={() => setLoginReward(null)}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>🎁 Daily Login Reward</DialogTitle>
        <DialogDescription>
          Day {loginReward.streak} streak! Keep coming back for bigger rewards.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-4 text-center">
        <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-lg">
          <p className="text-2xl font-bold text-yellow-400">+{loginReward.gold} ₲</p>
          <p className="text-xl font-bold text-blue-400">+{loginReward.exp} EXP</p>
          {loginReward.bonus && (
            <p className="text-lg font-bold text-green-400 mt-2">🎁 {loginReward.bonus}</p>
          )}
        </div>
        <div className="flex justify-center gap-1">
          {[1,2,3,4,5,6,7].map(day => (
            <div
              key={day}
              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                day <= loginReward.streak ? 'bg-yellow-600 text-white' : 'bg-zinc-700 text-zinc-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-400">Next milestone: {loginReward.streak < 3 ? 'Day 3 (Key)' : loginReward.streak < 7 ? 'Day 7 (Rare Rune)' : loginReward.streak < 14 ? 'Day 14 (Epic Gear)' : 'Day 30 (Prestige Points)'}</p>
      </div>
      <DialogFooter>
        <button
          onClick={() => setLoginReward(null)}
          className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold"
        >
          Claim!
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}
```

**Test:**
1. Open game — verify login reward modal appears (first-ever visit)
2. Reload page — verify modal does NOT appear again same day
3. In devtools, set `hunters-path-login-streak.lastLogin` to yesterday's date, reload — verify modal appears with streak incremented

**Commit:**
```bash
git add client/src/components/game/HuntersPath.tsx
git commit -m "feat: daily login rewards with streak bonuses (Day 3/7/14/30 milestones)"
```

---

## Task 9: Fix Schema Terminology

**Files:**
- Modify: `shared/schema.ts:88` — rename `totalShadowsExtracted` → `totalSpiritsBound`

**Problem:** Old "shadow extraction" terminology survives in the DB schema (should be "spirit binding" per the rebranding).

**Fix:** Update the column name in the `playerStats` table:
```typescript
// Change:
totalShadowsExtracted: integer("total_shadows_extracted").default(0),
// To:
totalSpiritsBound: integer("total_spirits_bound").default(0),
```

Also update the TypeScript type alias usages throughout `server/storage.ts` and `server/routes.ts` if referenced.

**Commit:**
```bash
git add shared/schema.ts
git commit -m "fix: rename totalShadowsExtracted to totalSpiritsBound in schema (rebranding cleanup)"
```

---

## Testing Checklist (run before each commit)

1. `npm run check` — TypeScript passes
2. Open browser at localhost:5000
3. Manually verify the specific feature per task

## How to Start the Dev Server

```bash
cd /home/jesse/Projects/HunterPath
npm run dev
```

Server runs at `http://localhost:5000` — the Express server serves the Vite-built frontend.
Use `http://localhost:5000` in the Playwright browser.
