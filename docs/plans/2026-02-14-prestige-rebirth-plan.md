# Prestige/Rebirth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add a prestige/rebirth system where players at Level 50+ can reset progress for permanent power bonuses and prestige points.

**Architecture:** Add rebirth fields to Player type, create rebirth modal component, integrate power multiplier into combat calculations, add prestige points display in header.

**Tech Stack:** React/TypeScript, existing game state management, modal component pattern

---

### Task 1: Add rebirth fields to Player type

**Files:**
- Modify: `client/src/components/game/HuntersPath.tsx:1-50`

**Step 1: Find the Player interface**

Search for: `interface Player {`

**Step 2: Add rebirth fields**

Add these fields after the existing player fields:
```typescript
rebirths: number;        // Number of times rebirthing
prestigePoints: number;   // Total prestige points earned
```

**Step 3: Initialize in initialPlayer**

Find `const initialPlayer: Player = {` and add:
```typescript
rebirths: 0,
prestigePoints: 0,
```

**Step 4: Commit**

```bash
git add client/src/components/game/HuntersPath.tsx
git commit -m "feat: add rebirth fields to Player type"
```

---

### Task 2: Add rebirth state and handler

**Files:**
- Modify: `client/src/components/game/HuntersPath.tsx:1012-1035`

**Step 1: Add state for rebirth modal**

Find `const [player, setPlayer] = useState<Player>(initialPlayer);` and add after:
```typescript
const [rebirthModalOpen, setRebirthModalOpen] = useState(false);
```

**Step 2: Add rebirth handler function**

Add this function before the return statement:
```typescript
const handleRebirth = useCallback(() => {
  const earnedPoints = Math.floor(
    player.level * 10 * (1 + player.rebirths * 0.5)
  );
  setPlayer((prev) => ({
    ...initialPlayer,
    ...prev,
    level: prev.level,
    stats: prev.stats,
    spirits: prev.spirits,
    inventory: prev.inventory,
    rebirths: prev.rebirths + 1,
    prestigePoints: prev.prestigePoints + earnedPoints,
  }));
  setRebirthModalOpen(false);
  setLog((prev) => [
    `⚡ REBIRTH! You are now stronger! (+${earnedPoints} Prestige Points)`,
    ...prev,
  ]);
}, [player.level, player.rebirths, player.stats, player.spirits, player.inventory]);
```

**Step 3: Commit**

```bash
git commit -m "feat: add rebirth handler function"
```

---

### Task 3: Create RebirthModal component

**Files:**
- Create: `client/src/components/game/sections/RebirthModal.tsx`

**Step 1: Create the modal**

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface RebirthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  playerLevel: number;
  rebirthCount: number;
}

export function RebirthModal({ open, onOpenChange, onConfirm, playerLevel, rebirthCount }: RebirthModalProps) {
  const earnedPoints = Math.floor(playerLevel * 10 * (1 + rebirthCount * 0.5));
  const newBonus = (rebirthCount + 1) * 15;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>⚡ Rebirth</DialogTitle>
          <DialogDescription>
            Reset your progress to gain permanent bonuses!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg">
            <p className="text-red-400 font-bold">⚠️ This will reset:</p>
            <ul className="text-red-300 text-sm mt-2 space-y-1">
              <li>• All gold (₲)</li>
              <li>• All keys</li>
              <li>• All gates cleared</li>
              <li>• Fatigue</li>
            </ul>
          </div>

          <div className="bg-green-900/20 border border-green-500/30 p-3 rounded-lg">
            <p className="text-green-400 font-bold">✅ You will keep:</p>
            <ul className="text-green-300 text-sm mt-2 space-y-1">
              <li>• Your level ({playerLevel})</li>
              <li>• All allocated stats</li>
              <li>• Your Spirit Legion</li>
            </ul>
          </div>

          <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg text-center">
            <p className="text-purple-400 font-bold">🎁 You will gain:</p>
            <p className="text-2xl font-bold text-purple-300">+{earnedPoints} Prestige Points</p>
            <p className="text-purple-400">+{newBonus}% Power Bonus</p>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-500 font-bold"
          >
            Confirm Rebirth
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Export from index**

Add to `client/src/components/game/sections/index.ts`:
```tsx
export { RebirthModal } from "./RebirthModal";
```

**Step 3: Commit**

```bash
git add client/src/components/game/sections/RebirthModal.tsx client/src/components/game/sections/index.ts
git commit -m "feat: add RebirthModal component"
```

---

### Task 4: Add Rebirth button to header

**Files:**
- Modify: `client/src/components/game/HuntersPath.tsx:700-750`

**Step 1: Find the header section**

Search for the header buttons area (gold, keys display)

**Step 2: Add Rebirth button**

Add after the keys button:
```tsx
{player.level >= 50 && (
  <button
    onClick={() => setRebirthModalOpen(true)}
    className="flex items-center space-x-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-white text-sm font-bold"
    title="Rebirth (Level 50+)"
  >
    <i className="fas fa-bolt"></i>
    <span>Rebirth</span>
    {player.rebirths > 0 && (
      <span className="bg-purple-800 px-2 py-0.5 rounded text-xs">
        +{player.rebirths * 15}%
      </span>
    )}
  </button>
)}
```

**Step 3: Add prestige points to header**

Find where gold is displayed and add prestige points after keys:
```tsx
{player.prestigePoints > 0 && (
  <div className="flex items-center space-x-1 text-purple-400">
    <i className="fas fa-star"></i>
    <span>{player.prestigePoints.toLocaleString()}</span>
  </div>
)}
```

**Step 4: Add RebirthModal to render**

Find where other modals are rendered and add:
```tsx
<RebirthModal
  open={rebirthModalOpen}
  onOpenChange={setRebirthModalOpen}
  onConfirm={handleRebirth}
  playerLevel={player.level}
  rebirthCount={player.rebirths}
/>
```

**Step 5: Import RebirthModal**

Add to imports from "./sections":
```tsx
import { RebirthModal } from "./sections";
```

**Step 6: Commit**

```bash
git commit -m "feat: add rebirth button and prestige points display"
```

---

### Task 5: Apply power multiplier to combat

**Files:**
- Modify: `client/src/components/game/HuntersPath.tsx:150-200`

**Step 1: Find power calculation**

Search for: `const pPower =`

**Step 2: Apply multiplier**

Wrap the power calculation:
```typescript
const powerMultiplier = 1 + player.rebirths * 0.15;
const pPower = Math.floor(
  (player.stats.strength * 2 +
    player.stats.endurance * 1.5 +
    player.level * 3 +
    player.spirits.reduce((sum, s) => sum + s.power, 0)) *
    powerMultiplier
);
```

**Step 3: Show bonus in UI**

Find where power is displayed and update:
```tsx
<span>Power: {fmt(pPower)}</span>
{player.rebirths > 0 && (
  <span className="text-purple-400 text-xs">
    (+{player.rebirths * 15}%)
  </span>
)}
```

**Step 4: Commit**

```bash
git commit -m "feat: apply power multiplier to combat calculations"
```

---

### Task 6: Test and verify

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Verify rebirth button appears at Level 50+**

- Check that button is hidden before Level 50
- Reach Level 50 (use debug or save edit)
- Verify button appears

**Step 3: Test rebirth flow**

- Click Rebirth button
- Verify modal shows correct calculations
- Confirm rebirth
- Verify gold/keys reset
- Verify level/stats/spirits kept
- Verify prestige points awarded
- Verify power bonus applied

**Step 4: Test save/load**

- Save game
- Reload page
- Verify rebirth count and prestige points persist

**Step 5: Commit**

```bash
git commit -m "test: verify rebirth system works correctly"
```

---

### Task 7: Final commit and push

**Step 1: Push to GitHub**

```bash
git push origin main
```

**Step 2: Verify CI passes**

Check GitHub Actions status
