# Mobile UI Design

## Overview

Hunter's Path needs a dedicated mobile layout. The desktop 3-column layout is unusable on phone: too much scrolling, tap targets too small, accidental navigation loses progress. The fix is a combat-first bottom-tab layout — the standard pattern for mobile idle RPGs.

---

## Architecture

One codebase, two layouts. `HuntersPath.tsx` keeps all game state and logic unchanged. At render time it checks screen width and renders either the existing desktop layout or a new `MobileLayout.tsx`.

```
HuntersPath.tsx  (state + logic, no changes)
  ├── renders DesktopLayout  when width >= 1024px
  └── renders MobileLayout   when width < 1024px
```

Breakpoint: `< 1024px` (Tailwind `lg`). The existing JSX in `HuntersPath.tsx` becomes `DesktopLayout.tsx`. `MobileLayout.tsx` is built fresh, receiving all the same props/handlers.

**Autosave**: add a `useEffect` in `HuntersPath.tsx` that saves to localStorage every 60 seconds. Show a brief "Saved ✓" toast so the player knows it happened. This prevents progress loss from accidentally closing the PWA.

---

## Bottom Tab Bar

Four tabs pinned to the bottom. Tab bar height: ~56px. Active tab highlighted with `#7c3aed` violet. Each tab ~80px wide — large enough to tap without missing.

```
[ ⚔ Combat ] [ 📊 Manage ] [ 👻 Spirits ] [ 📜 Log ]
```

Badges:
- **Manage** tab: red dot when unspent stat points are available
- **Combat** tab: gold dot when daily quest is fully complete

---

## Tab 1: Combat (default)

Layout top-to-bottom:

### Slim Header
Single line: `Hunter's Path` (left) · Gold ₲ · Keys 🔑 · Prestige Points (right). No buttons — those live in tabs.

### Player Strip
Always visible. Compact single card:
- Avatar (32×32) + name + level + power
- HP bar + value
- MP bar + value
- Fatigue warning (amber, only when > 0)

### Main Area (flex-1, scrollable)
**When idle (no active gate):**
- Vertical list of available gate cards
- Each card: rank badge, gate name, power requirement (green/red), modifiers, EXP reward
- Cards are full-width, ~72px tall — large tap target

**When in combat:**
- Combat arena card (player side vs boss side)
- Player avatar + HP/MP bars
- Boss avatar + HP bar + name + description
- Scrollable combat log (fixed ~160px height, auto-scrolls to latest)
- Damage numbers animated above avatars
- Turn indicator

**When combat ends:**
- Result card: Victory/Defeat
- Rewards: EXP, gold, spirit binding chance
- Continue / Accept Defeat button (full-width, 52px tall)

### Action Strip (above tab bar)
Row of large icon+label buttons:
- **Auto** toggle (purple when on, grey when off)
- **Rest** (restore HP/MP)
- **Key** (use dungeon key — greyed when 0)
- **Refresh** (90₲ — greyed when broke)
- **Potion** (greyed when 0)

---

## Tab 2: Manage

Scrollable page, sections separated by subtle dividers.

### Stat Allocation
- Sticky banner at top when unspent points > 0: `● N stat points available`
- 2-column grid: STR, AGI, INT, VIT, LUCK
- Each cell: stat name, current value, large `[+]` button (48×48px)

### Stat Chart
- Compact radar/bar chart showing stat growth history

### Training Activities
- Four large tappable rows (Physical, Mental, Meditation, Work Job)
- Each shows name, EXP/gold reward, cooldown if applicable

### Hunter Shop
- Item cards: Health Potion, Weapon Upgrade, Armor Upgrade, Lucky Charm
- Price, effect, Buy button per card

### Prestige Shop
- Shown only after first rebirth
- Upgrade cards with current level, cost, Buy button

### Settings Row
- Audio (sound/music/volume slider)
- Save Game
- Load Game
- Rebirth button (shown only at level 50+, opens existing RebirthModal)
- Reset (danger red, requires confirmation dialog)

---

## Tab 3: Spirits

### Header Row
`Spirit Legion` (left) · `Army PWR: N` · `MP Upkeep: N/tick` (right)

### Spirit List
Scrollable list of spirit cards, one per row:
- Rarity colour border (common/rare/epic/legendary)
- Spirit name + type icon
- Level badge + EXP bar (N / N to next)
- Power contribution value
- Abilities listed as small tags

### Empty State
`No spirits yet. Defeat bosses to bind their spirits.`

---

## Tab 4: Log

### Daily Quest Section
- Header: `Daily Quest` + status badge (Active / Complete) + `Forfeit` button
- Progress bar: `N/5 completed`
- Quest cards (when active): difficulty badge, icon, name, progress bar, rewards
- Completion message when all done

### Inventory
Collapsible section with item count badge. Shows potions and loot items.

### Activity Log
Scrollable event feed with colour-coded entries (same as desktop):
- Green: gate clears, level-ups, spirit bindings
- Red: gate failures
- Gold: rewards

### Lore & Mechanics
Collapsible reference section. Same content as desktop.

---

## Modals (all tabs)

These overlay everything, unchanged from desktop:
- **Spirit Binding sequence** — auto-triggered after boss defeat
- **Level-Up celebration** — auto-triggered on level-up (includes stat allocation inline)
- **Rebirth Modal** — triggered from Manage tab
- **Stats/Achievements overlay** — triggered from Manage tab (stats section header tap)

---

## Autosave

```ts
useEffect(() => {
  const id = setInterval(() => {
    saveGame();          // existing save logic
    showToast("Saved ✓"); // brief 1.5s toast
  }, 60_000);
  return () => clearInterval(id);
}, [player, gates, ...]);
```

Also save on tab visibility change (`visibilitychange` event) — catches the user switching apps.

---

## Feature Mapping (nothing omitted)

| Desktop feature | Mobile location |
|---|---|
| Player card + HP/MP/EXP bars | Combat tab — player strip |
| Gate selector | Combat tab — main area (idle) |
| Active combat arena | Combat tab — main area (in run) |
| Combat log | Combat tab — scrollable in arena card |
| Auto-dungeon toggle | Combat tab — action strip |
| Rest / Use Key / Refresh / Potion | Combat tab — action strip |
| Stat allocation | Manage tab — top section + badge |
| Stat progression chart | Manage tab |
| Training activities | Manage tab |
| Hunter Shop | Manage tab |
| Prestige Shop | Manage tab (post-rebirth) |
| Audio controls | Manage tab — settings row |
| Save / Load | Manage tab — settings row |
| Rebirth | Manage tab — settings row |
| Reset | Manage tab — settings row (danger) |
| Spirit Legion | Spirits tab |
| Daily Quest | Log tab |
| Inventory | Log tab |
| Activity Log | Log tab |
| Lore & Mechanics | Log tab |
| Gold / Keys / PP display | Header strip (all tabs) |
| Spirit Binding modal | Auto-overlay (all tabs) |
| Level-Up modal | Auto-overlay (all tabs) |
| Stats/Achievements panel | Manage tab (tap to open overlay) |
| Autosave | Every 60s + on app background |
