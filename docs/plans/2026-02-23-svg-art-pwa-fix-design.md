# SVG Art Pass + PWA Fix Design

## Overview

Two parallel improvements: (1) fix the PWA so it loads correctly on Android, and (2) replace the existing SVG boss/player art with flat anime-style inline React SVG components.

---

## Part A: PWA Fixes

### Root Causes

1. **Replit dev banner script** — `index.html` includes a synchronous blocking script from `https://replit.com/public/js/replit-dev-banner.js`. This external script blocks all JS execution until it loads. On mobile/standalone PWA mode it can hang indefinitely.

2. **React 18 silent unmount on error** — In React 18 production builds, any uncaught error during rendering unmounts the entire component tree, leaving `#root` empty. The `#root:empty::after` CSS loading text then reappears permanently with no indication of what went wrong.

3. **Service worker cache never invalidates** — `CACHE_NAME = "hunters-path-v2"` is hardcoded. Old cached assets linger across deployments.

### Fixes

- Remove the Replit script tag from `client/index.html`
- Add an `ErrorBoundary` component wrapping `<HuntersPath />` in `App.tsx` — shows a "Something went wrong — tap to reload" screen instead of empty `#root`
- Bump `CACHE_NAME` to `"hunters-path-v3"` in `client/public/sw.js`

---

## Part B: SVG Art Pass

### Approach

Inline SVG React components — zero external file loading, animatable, no path/MIME issues.

### File Structure

```
client/src/components/game/bosses/
  BossE.tsx        — Goblin Warrior
  BossD.tsx        — Orc Berserker
  BossC.tsx        — Dark Elf Assassin
  BossB.tsx        — Troll Chieftain
  BossA.tsx        — Dragon Knight
  BossS.tsx        — Void Lord
  PlayerAvatar.tsx — Hunter protagonist
  index.ts         — re-exports
```

### Style Guide (AFK Arena flat anime)

- **128×128 viewBox**, designed to look sharp at 64×64 rendered size
- **Bold black outlines** — 2.5–3px stroke on all major shapes
- **3–5 flat fills** — no complex gradients; simple 2-stop linear gradient for shading only
- **One glowing accent per rank** — radial gradient + feGaussianBlur filter for eyes/energy
- **Transparent background** — game card colour shows through

### Rank Palette

| Rank | Monster | Body Colours | Accent |
|------|---------|-------------|--------|
| E | Goblin Warrior | Sickly greens `#4a7c3f / #2d4a27` | Red glowing eyes `#ff2200` |
| D | Orc Berserker | Blue-grey `#5a6a7a / #3a4a5a` | Rage-yellow eyes `#ffcc00` |
| C | Dark Elf Assassin | Deep indigo `#3a2060 / #1a0a40` | Purple glow `#9b59b6`, silver blades |
| B | Troll Chieftain | Stone `#7a6a5a / #5a4a3a` | Molten orange cracks `#ff6600` |
| A | Dragon Knight | Gold armour `#c0a030 / #8a7020` | Blue dragonfire `#4488ff` |
| S | Void Lord | Absolute black `#0a0010 / #150020` | Cosmic white/purple `#cc88ff / #ffffff` |

### Player Avatar

Dark tactical armour, violet-indigo accents (`#7c3aed`), half-visor with glowing cyan eyes (`#00ffcc`). Reads well as a 64×64 rounded-full portrait.

### Integration

In `HuntersPath.tsx`, replace:
```tsx
<img src={monsterData.image} alt="Boss" className="w-16 h-16 object-contain" />
```
with a rank-keyed component map:
```tsx
const BOSS_COMPONENTS = { E: BossE, D: BossD, C: BossC, B: BossB, A: BossA, S: BossS };
const BossComp = BOSS_COMPONENTS[running.gate.rank];
<BossComp className="w-16 h-16" />
```

Replace the player `<img src="./assets/ui/player.svg">` with `<PlayerAvatar className="w-16 h-16 rounded-full" />`.
