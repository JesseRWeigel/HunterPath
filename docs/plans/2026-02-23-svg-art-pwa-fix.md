# SVG Art Pass + PWA Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the Android PWA "Loading Hunter's Path" hang, then replace all boss/player SVG art with flat anime-style inline React components.

**Architecture:** PWA fixes are three targeted edits (index.html, sw.js, new ErrorBoundary). Art pass creates 7 inline SVG React components in `client/src/components/game/bosses/` and replaces two `<img>` tag usage sites in `HuntersPath.tsx`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite (base `/HunterPath/` on GitHub Pages)

---

## Task 1: PWA Fixes

**Files:**
- Modify: `client/index.html`
- Modify: `client/public/sw.js`
- Create: `client/src/components/ErrorBoundary.tsx`
- Modify: `client/src/App.tsx`

### Step 1: Remove Replit dev banner script from `client/index.html`

Delete these lines (they appear at the bottom of `<body>`, after `<div id="root">`):

```html
    <!-- This is a replit script which adds a banner on the top of the page when opened in development mode outside the replit environment -->
    <script
      type="text/javascript"
      src="https://replit.com/public/js/replit-dev-banner.js"
    ></script>
```

This is a synchronous blocking script that hangs page load on mobile when `replit.com` is slow.

Also fix the loading CSS to actually center the text (move `display:flex` to `#root:empty`, not the `::after`):

```html
    <style>
      html, body, #root {
        background-color: #0f0f0f;
        margin: 0;
        padding: 0;
        min-height: 100vh;
        overflow-x: hidden;
      }
      #root:empty {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
      }
      #root:empty::after {
        content: "Loading Hunter's Path...";
        color: #a78bfa;
        font-family: system-ui, sans-serif;
        font-size: 1.25rem;
      }
    </style>
```

### Step 2: Bump SW cache name in `client/public/sw.js`

Change line 1:
```js
const CACHE_NAME = "hunters-path-v3";
```

(Was `"hunters-path-v2"`. Bumping forces all cached clients to download fresh assets on next visit.)

### Step 3: Create `client/src/components/ErrorBoundary.tsx`

```tsx
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Game crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "#0f0f0f",
            color: "#a78bfa",
            fontFamily: "system-ui, sans-serif",
            gap: "1rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "3rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#6b7280", margin: 0 }}>
            {this.state.error?.message ?? "Unknown error"}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.75rem 2rem",
              background: "#7c3aed",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Reload Game
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### Step 4: Wrap game in `client/src/App.tsx`

Replace the current contents:

```tsx
import HuntersPath from "./components/game/HuntersPath";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { ErrorBoundary } from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <HuntersPath />
          <PWAInstallPrompt />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
```

### Step 5: Build and verify

```bash
cd /home/jesse/Projects/HunterPath && npm run build
```

Expected: build succeeds with no TypeScript errors.

### Step 6: Commit

```bash
git add client/index.html client/public/sw.js client/src/components/ErrorBoundary.tsx client/src/App.tsx
git commit -m "fix: remove Replit script, add ErrorBoundary, bump SW cache to v3"
```

---

## Task 2: Create Bosses Directory + PlayerAvatar

**Files:**
- Create: `client/src/components/game/bosses/PlayerAvatar.tsx`
- Create: `client/src/components/game/bosses/index.ts`

### Step 1: Create `client/src/components/game/bosses/PlayerAvatar.tsx`

This is the hunter protagonist — dark tactical armour, violet-indigo accents, cyan visor glow. Reads well at 64×64 as a `rounded-full` portrait.

```tsx
export function PlayerAvatar({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      className={className}
      aria-label="Hunter"
    >
      <defs>
        <radialGradient id="pa-cyan" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00ffcc" />
          <stop offset="100%" stopColor="#00ffcc" stopOpacity="0" />
        </radialGradient>
        <filter id="pa-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Cloak/Cape */}
      <path d="M32,55 L22,120 L106,120 L96,55 Z" fill="#0f0a2a" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Body armor */}
      <path d="M40,55 L34,108 L94,108 L88,55 Q64,46 40,55 Z" fill="#1a1240" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Chest plate */}
      <path d="M48,58 L44,90 L84,90 L80,58 Q64,53 48,58 Z" fill="#22185a" stroke="#000" strokeWidth="2" />

      {/* Armor accent lines */}
      <path d="M56,65 L72,65" stroke="#7c3aed" strokeWidth="1.5" opacity="0.9" />
      <path d="M54,72 L74,72" stroke="#7c3aed" strokeWidth="1.5" opacity="0.9" />
      <path d="M56,79 L72,79" stroke="#7c3aed" strokeWidth="1.5" opacity="0.9" />

      {/* Chest emblem */}
      <circle cx="64" cy="73" r="6" fill="#7c3aed" stroke="#000" strokeWidth="2" />
      <circle cx="64" cy="73" r="3" fill="#a855f7" filter="url(#pa-glow)" />

      {/* Belt */}
      <rect x="38" y="96" width="52" height="8" rx="2" fill="#3a2810" stroke="#000" strokeWidth="2.5" />
      <rect x="59" y="95" width="10" height="10" rx="1" fill="#c0a030" stroke="#000" strokeWidth="2" />

      {/* Left shoulder pauldron */}
      <ellipse cx="30" cy="65" rx="16" ry="11" fill="#1a1240" stroke="#000" strokeWidth="2.5" />
      <ellipse cx="30" cy="63" rx="11" ry="8" fill="#22185a" />
      <path d="M18,60 Q30,54 42,60" stroke="#7c3aed" strokeWidth="1.5" fill="none" />

      {/* Right shoulder pauldron */}
      <ellipse cx="98" cy="65" rx="16" ry="11" fill="#1a1240" stroke="#000" strokeWidth="2.5" />
      <ellipse cx="98" cy="63" rx="11" ry="8" fill="#22185a" />
      <path d="M86,60 Q98,54 110,60" stroke="#7c3aed" strokeWidth="1.5" fill="none" />

      {/* Neck guard */}
      <rect x="52" y="48" width="24" height="12" rx="3" fill="#1a1240" stroke="#000" strokeWidth="2" />

      {/* Helmet */}
      <ellipse cx="64" cy="34" rx="26" ry="24" fill="#1a1240" stroke="#000" strokeWidth="2.5" />

      {/* Helmet crest */}
      <path d="M56,10 Q64,4 72,10 L70,20 Q64,16 58,20 Z" fill="#7c3aed" stroke="#000" strokeWidth="2" />

      {/* Visor */}
      <rect x="42" y="30" width="44" height="10" rx="4" fill="#080614" stroke="#000" strokeWidth="2" />

      {/* Glowing cyan eyes through visor */}
      <ellipse cx="52" cy="35" rx="6" ry="4" fill="url(#pa-cyan)" filter="url(#pa-glow)" opacity="0.9" />
      <ellipse cx="76" cy="35" rx="6" ry="4" fill="url(#pa-cyan)" filter="url(#pa-glow)" opacity="0.9" />
      <ellipse cx="52" cy="35" rx="3" ry="2" fill="#00ffcc" />
      <ellipse cx="76" cy="35" rx="3" ry="2" fill="#00ffcc" />

      {/* Chin guard */}
      <path d="M44,44 Q64,52 84,44 L82,52 Q64,60 46,52 Z" fill="#1a1240" stroke="#000" strokeWidth="2" />
    </svg>
  );
}
```

### Step 2: Create `client/src/components/game/bosses/index.ts`

```ts
export { PlayerAvatar } from "./PlayerAvatar";
export { BossE } from "./BossE";
export { BossD } from "./BossD";
export { BossC } from "./BossC";
export { BossB } from "./BossB";
export { BossA } from "./BossA";
export { BossS } from "./BossS";
```

*(The boss files don't exist yet — that's fine, TypeScript won't complain until we try to build. Add boss exports as you create each file in subsequent tasks.)*

### Step 3: Build check

```bash
cd /home/jesse/Projects/HunterPath && npm run build 2>&1 | tail -20
```

Expected: may have "cannot find module" errors for BossE etc — that's expected at this stage. PlayerAvatar itself should compile.

### Step 4: Commit

```bash
git add client/src/components/game/bosses/
git commit -m "feat: add PlayerAvatar SVG component and bosses index"
```

---

## Task 3: BossE + BossD

**Files:**
- Create: `client/src/components/game/bosses/BossE.tsx`
- Create: `client/src/components/game/bosses/BossD.tsx`

### Step 1: Create `client/src/components/game/bosses/BossE.tsx`

Goblin Warrior — wide grin, pointy ears, sickly green skin, spiked club, glowing red eyes.

```tsx
export function BossE({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className={className} aria-label="Goblin Warrior">
      <defs>
        <filter id="be-red">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Club handle */}
      <rect x="91" y="52" width="10" height="68" rx="4" fill="#6b4226" stroke="#000" strokeWidth="2.5" />
      {/* Club head */}
      <ellipse cx="96" cy="46" rx="14" ry="11" fill="#8b5226" stroke="#000" strokeWidth="2.5" />
      {/* Club spikes */}
      <polygon points="82,40 90,33 90,47" fill="#a0a0a8" stroke="#000" strokeWidth="1.5" />
      <polygon points="110,40 102,33 102,47" fill="#a0a0a8" stroke="#000" strokeWidth="1.5" />
      <polygon points="96,33 90,42 102,42" fill="#a0a0a8" stroke="#000" strokeWidth="1.5" />

      {/* Body / leather armour */}
      <path d="M36,60 L28,118 L82,118 L88,60 Q62,50 36,60 Z" fill="#2a4a20" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Chest plate */}
      <path d="M42,62 L38,100 L78,100 L82,62 Q62,55 42,62 Z" fill="#3a5a28" stroke="#000" strokeWidth="2" />
      {/* Belt */}
      <rect x="34" y="98" width="46" height="7" rx="2" fill="#5a3a10" stroke="#000" strokeWidth="2" />
      <rect x="57" y="97" width="10" height="9" rx="1" fill="#c8a020" stroke="#000" strokeWidth="2" />

      {/* Left pointed ear */}
      <path d="M30,36 L10,18 L36,32" fill="#5a8c3f" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Right pointed ear */}
      <path d="M98,36 L118,18 L92,32" fill="#5a8c3f" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Head */}
      <ellipse cx="64" cy="42" rx="32" ry="28" fill="#5a8c3f" stroke="#000" strokeWidth="2.5" />

      {/* Angry brow */}
      <path d="M36,32 L52,38" stroke="#1a3a10" strokeWidth="4" strokeLinecap="round" />
      <path d="M92,32 L76,38" stroke="#1a3a10" strokeWidth="4" strokeLinecap="round" />

      {/* Eyes */}
      <ellipse cx="48" cy="42" rx="9" ry="7" fill="#cc1100" stroke="#000" strokeWidth="2" />
      <ellipse cx="80" cy="42" rx="9" ry="7" fill="#cc1100" stroke="#000" strokeWidth="2" />
      <circle cx="50" cy="40" r="4" fill="#ff3311" filter="url(#be-red)" />
      <circle cx="82" cy="40" r="4" fill="#ff3311" filter="url(#be-red)" />
      <circle cx="50" cy="40" r="2" fill="#fff" opacity="0.8" />
      <circle cx="82" cy="40" r="2" fill="#fff" opacity="0.8" />

      {/* Snout / nostrils */}
      <path d="M58,50 Q64,56 70,50" stroke="#3a6028" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="60" cy="52" r="2" fill="#3a6028" />
      <circle cx="68" cy="52" r="2" fill="#3a6028" />

      {/* Wide grinning mouth */}
      <path d="M40,60 Q64,72 88,60" fill="#1a2a10" stroke="#000" strokeWidth="2" />
      {/* Jagged teeth */}
      <path d="M45,60 L49,68 L54,60 L58,68 L64,60 L70,68 L74,60 L79,68 L83,60"
        fill="#f0e8c0" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Warts */}
      <circle cx="36" cy="28" r="3" fill="#4a7c35" stroke="#000" strokeWidth="1.5" />
      <circle cx="92" cy="26" r="2.5" fill="#4a7c35" stroke="#000" strokeWidth="1.5" />
    </svg>
  );
}
```

### Step 2: Create `client/src/components/game/bosses/BossD.tsx`

Orc Berserker — wide jaw with tusks, blue-grey muscular body, rage-yellow eyes, battle axe.

```tsx
export function BossD({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className={className} aria-label="Orc Berserker">
      <defs>
        <filter id="bd-rage">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Axe handle */}
      <rect x="96" y="28" width="8" height="92" rx="3" fill="#5c3820" stroke="#000" strokeWidth="2.5" />
      {/* Axe head - right blade */}
      <path d="M104,26 Q122,16 120,40 Q122,62 104,52 Z" fill="#9a9aa0" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Axe head - left bevel */}
      <path d="M104,26 Q88,16 90,40 Q88,62 104,52 Z" fill="#7a7a80" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Blade edge */}
      <path d="M120,16 Q128,40 120,64" stroke="#c8c8d8" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Body */}
      <path d="M18,62 L14,118 L82,118 L86,62 Q50,50 18,62 Z" fill="#3a4a5a" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Massive pecs */}
      <ellipse cx="38" cy="78" rx="18" ry="16" fill="#4a5a6a" stroke="#000" strokeWidth="2" />
      <ellipse cx="62" cy="78" rx="18" ry="16" fill="#4a5a6a" stroke="#000" strokeWidth="2" />
      {/* Belly armor */}
      <path d="M22,92 L26,114 L78,114 L80,92 Q50,84 22,92 Z" fill="#2a3a4a" stroke="#000" strokeWidth="2" />

      {/* Left spiked shoulder */}
      <ellipse cx="12" cy="68" rx="16" ry="12" fill="#2a3a4a" stroke="#000" strokeWidth="2.5" />
      <polygon points="2,60 12,50 10,64" fill="#8a8a90" stroke="#000" strokeWidth="1.5" />
      <polygon points="12,54 14,44 18,58" fill="#8a8a90" stroke="#000" strokeWidth="1.5" />
      <polygon points="24,60 20,50 26,64" fill="#8a8a90" stroke="#000" strokeWidth="1.5" />

      {/* Head — wide and brutish */}
      <ellipse cx="50" cy="40" rx="30" ry="26" fill="#4a5a6a" stroke="#000" strokeWidth="2.5" />

      {/* Heavy brow ridge */}
      <path d="M22,32 L42,38" stroke="#1a2a3a" strokeWidth="5" strokeLinecap="round" />
      <path d="M78,32 L58,38" stroke="#1a2a3a" strokeWidth="5" strokeLinecap="round" />

      {/* Rage eyes */}
      <ellipse cx="36" cy="40" rx="10" ry="8" fill="#aa8800" stroke="#000" strokeWidth="2" />
      <ellipse cx="64" cy="40" rx="10" ry="8" fill="#aa8800" stroke="#000" strokeWidth="2" />
      <circle cx="36" cy="38" r="4.5" fill="#ffcc00" filter="url(#bd-rage)" />
      <circle cx="64" cy="38" r="4.5" fill="#ffcc00" filter="url(#bd-rage)" />
      <circle cx="37" cy="38" r="2" fill="#000" />
      <circle cx="65" cy="38" r="2" fill="#000" />

      {/* Flat nose */}
      <path d="M44,48 Q50,54 56,48" stroke="#2a3a4a" strokeWidth="3" fill="none" />

      {/* Tusks */}
      <path d="M42,58 L36,76" stroke="#e8e0c0" strokeWidth="5" strokeLinecap="round" />
      <path d="M58,58 L64,76" stroke="#e8e0c0" strokeWidth="5" strokeLinecap="round" />

      {/* Mouth snarl */}
      <path d="M34,60 Q50,68 66,60" fill="#1a2a1a" stroke="#000" strokeWidth="2" />

      {/* Battle scar */}
      <path d="M24,34 L44,52" stroke="#2a3a2a" strokeWidth="3" opacity="0.6" strokeLinecap="round" />

      {/* War paint stripes */}
      <path d="M22,38 L34,34" stroke="#cc3322" strokeWidth="2.5" opacity="0.9" strokeLinecap="round" />
      <path d="M26,44 L36,42" stroke="#cc3322" strokeWidth="2" opacity="0.8" strokeLinecap="round" />
    </svg>
  );
}
```

### Step 3: Update index.ts to export both

Make sure these two lines are in `client/src/components/game/bosses/index.ts`:
```ts
export { BossE } from "./BossE";
export { BossD } from "./BossD";
```

### Step 4: Build check

```bash
cd /home/jesse/Projects/HunterPath && npm run build 2>&1 | grep -E "error|Error|warning" | head -20
```

Expected: TypeScript errors only for not-yet-created BossC/B/A/S files.

### Step 5: Commit

```bash
git add client/src/components/game/bosses/BossE.tsx client/src/components/game/bosses/BossD.tsx client/src/components/game/bosses/index.ts
git commit -m "feat: add BossE (Goblin Warrior) and BossD (Orc Berserker) SVG components"
```

---

## Task 4: BossC + BossB

**Files:**
- Create: `client/src/components/game/bosses/BossC.tsx`
- Create: `client/src/components/game/bosses/BossB.tsx`

### Step 1: Create `client/src/components/game/bosses/BossC.tsx`

Dark Elf Assassin — hooded cloak, glowing purple eyes under shadow, twin crossed daggers, pointed ears.

```tsx
export function BossC({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className={className} aria-label="Dark Elf Assassin">
      <defs>
        <radialGradient id="bc-purple" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dd44ff" />
          <stop offset="100%" stopColor="#dd44ff" stopOpacity="0" />
        </radialGradient>
        <filter id="bc-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Left dagger */}
      <path d="M26,28 L46,82" stroke="#c0c0cc" strokeWidth="4" strokeLinecap="round" />
      <path d="M22,24 L30,20 L50,78 L42,82 Z" fill="#9090a0" stroke="#000" strokeWidth="2" />
      <rect x="17" y="27" width="16" height="6" rx="2" fill="#5a3a80" stroke="#000" strokeWidth="2"
        transform="rotate(-42,25,30)" />

      {/* Right dagger */}
      <path d="M102,28 L82,82" stroke="#c0c0cc" strokeWidth="4" strokeLinecap="round" />
      <path d="M106,24 L98,20 L78,78 L86,82 Z" fill="#9090a0" stroke="#000" strokeWidth="2" />
      <rect x="95" y="27" width="16" height="6" rx="2" fill="#5a3a80" stroke="#000" strokeWidth="2"
        transform="rotate(42,103,30)" />

      {/* Cloak body */}
      <path d="M36,60 L24,120 L104,120 L92,60 Q64,48 36,60 Z" fill="#1a0a30" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Cloak folds */}
      <path d="M42,65 L30,112" stroke="#2a1040" strokeWidth="2" opacity="0.9" />
      <path d="M64,62 L60,117" stroke="#2a1040" strokeWidth="2" opacity="0.8" />
      <path d="M86,65 L98,112" stroke="#2a1040" strokeWidth="2" opacity="0.9" />

      {/* Belt with rune clasp */}
      <rect x="38" y="96" width="52" height="7" rx="2" fill="#3a1a50" stroke="#000" strokeWidth="2" />
      <polygon points="64,93 70,100 64,107 58,100" fill="#9932cc" stroke="#000" strokeWidth="2" />

      {/* Neck */}
      <rect x="56" y="50" width="16" height="12" fill="#301050" stroke="#000" strokeWidth="2" />

      {/* Hood back */}
      <path d="M32,40 Q64,22 96,40 Q92,20 64,14 Q36,20 32,40 Z" fill="#120820" stroke="#000" strokeWidth="2.5" />

      {/* Head */}
      <ellipse cx="64" cy="42" rx="24" ry="22" fill="#2a1050" stroke="#000" strokeWidth="2.5" />

      {/* Hood drape over forehead */}
      <path d="M38,38 Q64,28 90,38 L92,48 Q64,38 36,48 Z" fill="#120820" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Face shadow */}
      <ellipse cx="64" cy="48" rx="18" ry="14" fill="#1a0838" opacity="0.9" />

      {/* Glowing purple eyes — the visual focus */}
      <ellipse cx="53" cy="44" rx="8" ry="5" fill="url(#bc-purple)" filter="url(#bc-glow)" />
      <ellipse cx="75" cy="44" rx="8" ry="5" fill="url(#bc-purple)" filter="url(#bc-glow)" />
      <ellipse cx="53" cy="44" rx="4.5" ry="3" fill="#dd44ff" />
      <ellipse cx="75" cy="44" rx="4.5" ry="3" fill="#dd44ff" />
      <ellipse cx="53" cy="44" rx="2" ry="1.5" fill="#fff" opacity="0.9" />
      <ellipse cx="75" cy="44" rx="2" ry="1.5" fill="#fff" opacity="0.9" />

      {/* Pointed ears */}
      <path d="M40,38 L30,22 L44,34" fill="#2a1050" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
      <path d="M88,38 L98,22 L84,34" fill="#2a1050" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
```

### Step 2: Create `client/src/components/game/bosses/BossB.tsx`

Troll Chieftain — massive rocky body with glowing lava cracks, tiny orange eyes, enormous spiked club.

```tsx
export function BossB({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className={className} aria-label="Troll Chieftain">
      <defs>
        <filter id="bb-lava">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Massive club handle */}
      <rect x="88" y="42" width="12" height="80" rx="4" fill="#5c3820" stroke="#000" strokeWidth="2.5" />
      {/* Club head — boulder */}
      <ellipse cx="94" cy="34" rx="22" ry="18" fill="#6a6060" stroke="#000" strokeWidth="2.5" />
      {/* Boulder cracks */}
      <path d="M80,26 L88,36 L82,44" stroke="#000" strokeWidth="2" fill="none" opacity="0.5" />
      <path d="M100,22 L108,34 L104,40" stroke="#000" strokeWidth="2" fill="none" opacity="0.5" />
      {/* Studs */}
      <polygon points="78,24 84,16 86,26" fill="#8a8080" stroke="#000" strokeWidth="1.5" />
      <polygon points="94,18 100,10 102,20" fill="#8a8080" stroke="#000" strokeWidth="1.5" />
      <polygon points="110,26 116,18 114,30" fill="#8a8080" stroke="#000" strokeWidth="1.5" />

      {/* Massive hunched body */}
      <path d="M10,70 L8,120 L80,120 L82,70 Q44,54 10,70 Z" fill="#5a5050" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Lava cracks on body */}
      <path d="M22,78 L30,90 L24,102 L32,116" stroke="#ff6600" strokeWidth="2.5" fill="none" strokeLinecap="round" filter="url(#bb-lava)" />
      <path d="M46,74 L42,88 L50,100" stroke="#ff6600" strokeWidth="2" fill="none" strokeLinecap="round" filter="url(#bb-lava)" />
      <path d="M62,80 L70,96 L64,112" stroke="#ff4400" strokeWidth="2" fill="none" strokeLinecap="round" filter="url(#bb-lava)" />

      {/* Rocky bumps on body */}
      <polygon points="16,72 24,62 30,72" fill="#6a6060" stroke="#000" strokeWidth="1.5" />
      <polygon points="34,66 42,56 50,68" fill="#6a6060" stroke="#000" strokeWidth="1.5" />
      <polygon points="52,70 60,60 68,72" fill="#6a6060" stroke="#000" strokeWidth="1.5" />

      {/* Head — massive boulder-like */}
      <ellipse cx="44" cy="46" rx="32" ry="28" fill="#5a5050" stroke="#000" strokeWidth="2.5" />

      {/* Rocky head bumps */}
      <polygon points="20,34 30,24 36,36" fill="#6a6060" stroke="#000" strokeWidth="1.5" />
      <polygon points="46,26 54,16 60,28" fill="#6a6060" stroke="#000" strokeWidth="1.5" />

      {/* Lava crack on head */}
      <path d="M28,32 L38,48 L32,60" stroke="#ff6600" strokeWidth="2" fill="none" strokeLinecap="round" filter="url(#bb-lava)" />

      {/* Heavy brow overhang */}
      <path d="M14,42 Q44,34 74,42 L72,48 Q44,40 16,48 Z" fill="#3a3030" stroke="#000" strokeWidth="2" />

      {/* Beady deep-set eyes */}
      <ellipse cx="30" cy="48" rx="8" ry="6" fill="#1a1010" stroke="#000" strokeWidth="2" />
      <ellipse cx="58" cy="48" rx="8" ry="6" fill="#1a1010" stroke="#000" strokeWidth="2" />
      <circle cx="30" cy="47" r="4" fill="#ff6600" filter="url(#bb-lava)" />
      <circle cx="58" cy="47" r="4" fill="#ff6600" filter="url(#bb-lava)" />
      <circle cx="30" cy="47" r="2" fill="#ff9900" />
      <circle cx="58" cy="47" r="2" fill="#ff9900" />

      {/* Flat nostrils */}
      <circle cx="40" cy="58" r="3" fill="#3a3030" stroke="#000" strokeWidth="1.5" />
      <circle cx="48" cy="58" r="3" fill="#3a3030" stroke="#000" strokeWidth="1.5" />

      {/* Mouth with lower teeth */}
      <path d="M18,64 Q44,72 70,64 L68,70 Q44,78 20,70 Z" fill="#1a1010" stroke="#000" strokeWidth="2" />
      <path d="M24,66 L28,74 L33,66 L38,74 L44,66 L50,74 L56,66 L62,74 L66,66"
        fill="#e8e0c0" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Tiny horns */}
      <path d="M18,30 L12,14 L24,26" fill="#3a3030" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
      <path d="M70,30 L76,14 L64,26" fill="#3a3030" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
```

### Step 3: Update index.ts

Add to `client/src/components/game/bosses/index.ts`:
```ts
export { BossC } from "./BossC";
export { BossB } from "./BossB";
```

### Step 4: Build check

```bash
cd /home/jesse/Projects/HunterPath && npm run build 2>&1 | grep -E "error TS" | head -20
```

Expected: only errors for BossA and BossS (not yet created).

### Step 5: Commit

```bash
git add client/src/components/game/bosses/BossC.tsx client/src/components/game/bosses/BossB.tsx client/src/components/game/bosses/index.ts
git commit -m "feat: add BossC (Dark Elf Assassin) and BossB (Troll Chieftain) SVG components"
```

---

## Task 5: BossA + BossS

**Files:**
- Create: `client/src/components/game/bosses/BossA.tsx`
- Create: `client/src/components/game/bosses/BossS.tsx`

### Step 1: Create `client/src/components/game/bosses/BossA.tsx`

Dragon Knight — full gold plate armour, dragon-wing shoulder guard, blue-flame sword, visor glow.

```tsx
export function BossA({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className={className} aria-label="Dragon Knight">
      <defs>
        <linearGradient id="ba-flame" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#0044ff" />
          <stop offset="50%" stopColor="#4488ff" />
          <stop offset="100%" stopColor="#aaccff" stopOpacity="0.3" />
        </linearGradient>
        <filter id="ba-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Blue flames on sword */}
      <path d="M96,6 Q88,18 90,34 Q86,26 80,30 Q86,18 84,8 Q90,2 96,6"
        fill="url(#ba-flame)" filter="url(#ba-glow)" opacity="0.9" />
      <path d="M92,12 Q86,22 88,34 Q84,26 80,30 Q84,20 82,12 Q86,6 92,12"
        fill="#88aaff" filter="url(#ba-glow)" opacity="0.7" />

      {/* Sword blade */}
      <path d="M86,30 L80,120 L88,120 L94,30 Z" fill="#c8c8d8" stroke="#000" strokeWidth="2.5" />
      <path d="M88,30 L88,120 L91,30 Z" fill="#e8e8f0" />
      {/* Crossguard */}
      <rect x="76" y="28" width="28" height="8" rx="3" fill="#c0a030" stroke="#000" strokeWidth="2.5" />
      {/* Grip */}
      <rect x="82" y="36" width="8" height="22" rx="3" fill="#3a2810" stroke="#000" strokeWidth="2" />

      {/* Body armour */}
      <path d="M26,60 L20,120 L82,120 L80,60 Q52,50 26,60 Z" fill="#2a2510" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Chest plate — gold */}
      <path d="M32,60 L28,100 L76,100 L74,60 Q52,53 32,60 Z" fill="#8a7020" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Chest plate highlight */}
      <path d="M38,62 L36,90 L68,90 L66,62 Q52,57 38,62 Z" fill="#c0a030" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Dragon emblem */}
      <path d="M52,68 Q64,62 76,68 Q70,75 64,72 Q58,75 52,68" fill="#ff6600" stroke="#000" strokeWidth="1.5" />
      <circle cx="64" cy="70" r="4" fill="#ff4400" stroke="#000" strokeWidth="1.5" />

      {/* Belt */}
      <rect x="30" y="98" width="48" height="7" rx="2" fill="#5a4010" stroke="#000" strokeWidth="2" />

      {/* Dragon wing shoulder guard */}
      <path d="M14,50 Q8,34 20,28 Q28,24 36,34 L32,40 Q26,32 20,36 Q14,42 22,52 Z"
        fill="#6a5010" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18,50 Q12,36 22,30 Q26,28 32,36 L30,40 Q24,34 22,38 Q18,44 24,52 Z"
        fill="#8a7020" />
      <path d="M20,36 L28,48" stroke="#c0a030" strokeWidth="1.5" opacity="0.9" />
      <path d="M22,32 L30,44" stroke="#c0a030" strokeWidth="1.5" opacity="0.9" />

      {/* Neck armour */}
      <rect x="44" y="48" width="20" height="14" rx="3" fill="#2a2510" stroke="#000" strokeWidth="2" />
      <rect x="46" y="50" width="16" height="10" rx="2" fill="#8a7020" />

      {/* Helmet */}
      <ellipse cx="54" cy="32" rx="24" ry="22" fill="#2a2510" stroke="#000" strokeWidth="2.5" />
      {/* Gold trim */}
      <path d="M30,32 Q54,20 78,32" stroke="#c0a030" strokeWidth="3" fill="none" />

      {/* Dragon horns */}
      <path d="M38,22 L28,6 L42,18" fill="#8a7020" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
      <path d="M70,22 L80,6 L66,18" fill="#8a7020" stroke="#000" strokeWidth="2" strokeLinejoin="round" />

      {/* Visor */}
      <rect x="34" y="30" width="40" height="9" rx="3" fill="#0a0806" stroke="#000" strokeWidth="2" />

      {/* Blue fire eyes through visor */}
      <ellipse cx="46" cy="35" rx="6" ry="3.5" fill="#4488ff" filter="url(#ba-glow)" opacity="0.9" />
      <ellipse cx="62" cy="35" rx="6" ry="3.5" fill="#4488ff" filter="url(#ba-glow)" opacity="0.9" />

      {/* Chin armour */}
      <path d="M36,44 Q54,52 74,44 L72,50 Q54,58 38,50 Z" fill="#2a2510" stroke="#000" strokeWidth="2" />
    </svg>
  );
}
```

### Step 2: Create `client/src/components/game/bosses/BossS.tsx`

Void Lord — absolute-black robes, floating void tendrils, cosmic white/purple eyes, staff with void orb.

```tsx
export function BossS({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className={className} aria-label="Void Lord">
      <defs>
        <radialGradient id="bs-eye" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#cc88ff" />
          <stop offset="100%" stopColor="#4400aa" stopOpacity="0" />
        </radialGradient>
        <filter id="bs-void">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="bs-aura" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#1a0030" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Void aura */}
      <ellipse cx="64" cy="72" rx="58" ry="56" fill="url(#bs-aura)" />

      {/* Stars */}
      <circle cx="18" cy="18" r="1.5" fill="#fff" opacity="0.9" />
      <circle cx="110" cy="14" r="1" fill="#cc88ff" opacity="0.8" />
      <circle cx="12" cy="58" r="1" fill="#fff" opacity="0.7" />
      <circle cx="118" cy="48" r="1.5" fill="#fff" opacity="0.6" />
      <circle cx="20" cy="102" r="1" fill="#cc88ff" opacity="0.9" />
      <circle cx="108" cy="98" r="1.5" fill="#fff" opacity="0.8" />
      <circle cx="54" cy="8" r="1" fill="#fff" opacity="0.7" />
      <circle cx="82" cy="12" r="1" fill="#cc88ff" opacity="0.8" />

      {/* Void tendrils */}
      <path d="M64,82 Q28,92 8,80 Q18,100 8,116" stroke="#6600aa" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M64,82 Q100,92 120,80 Q110,100 120,116" stroke="#6600aa" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M50,96 Q34,106 18,120" stroke="#4400aa" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M78,96 Q94,106 110,120" stroke="#4400aa" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />

      {/* Floating void orbs */}
      <circle cx="18" cy="36" r="5" fill="#6600aa" filter="url(#bs-void)" opacity="0.9" />
      <circle cx="110" cy="36" r="5" fill="#6600aa" filter="url(#bs-void)" opacity="0.9" />
      <circle cx="14" cy="72" r="4" fill="#4400aa" filter="url(#bs-void)" opacity="0.7" />
      <circle cx="114" cy="72" r="4" fill="#4400aa" filter="url(#bs-void)" opacity="0.7" />

      {/* Staff */}
      <rect x="4" y="42" width="6" height="80" rx="3" fill="#1a0028" stroke="#000" strokeWidth="2" />
      <circle cx="7" cy="36" r="10" fill="#2a0044" stroke="#6600aa" strokeWidth="2" />
      <circle cx="7" cy="36" r="6" fill="#4400aa" filter="url(#bs-void)" />
      <circle cx="7" cy="36" r="3" fill="#cc88ff" />
      <circle cx="7" cy="36" r="1" fill="#fff" />

      {/* Robe body */}
      <path d="M32,58 L18,122 L110,122 L96,58 Q64,44 32,58 Z" fill="#080010" stroke="#1a0030" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Robe folds */}
      <path d="M38,65 L26,116" stroke="#150025" strokeWidth="2.5" opacity="0.9" />
      <path d="M54,60 L48,120" stroke="#150025" strokeWidth="2" opacity="0.8" />
      <path d="M74,60 L80,120" stroke="#150025" strokeWidth="2" opacity="0.8" />
      <path d="M90,65 L102,116" stroke="#150025" strokeWidth="2.5" opacity="0.9" />

      {/* Belt void clasp */}
      <rect x="36" y="96" width="56" height="7" rx="2" fill="#0a0018" stroke="#4400aa" strokeWidth="1.5" />
      <circle cx="64" cy="100" r="6" fill="#2a0044" stroke="#6600aa" strokeWidth="1.5" />
      <circle cx="64" cy="100" r="3" fill="#cc88ff" filter="url(#bs-void)" />

      {/* Hood back */}
      <path d="M30,42 Q64,26 98,42 Q94,22 64,16 Q34,22 30,42 Z" fill="#060008" stroke="#1a0030" strokeWidth="2.5" />

      {/* Head */}
      <ellipse cx="64" cy="44" rx="26" ry="24" fill="#080010" stroke="#1a0030" strokeWidth="2.5" />

      {/* Hood drape */}
      <path d="M36,40 Q64,30 92,40 L94,50 Q64,40 34,50 Z" fill="#060008" stroke="#1a0030" strokeWidth="2.5" />

      {/* Face void */}
      <ellipse cx="64" cy="48" rx="20" ry="14" fill="#030006" opacity="0.9" />

      {/* COSMIC EYES — the visual centrepiece */}
      <ellipse cx="50" cy="46" rx="12" ry="8" fill="url(#bs-eye)" filter="url(#bs-void)" />
      <ellipse cx="78" cy="46" rx="12" ry="8" fill="url(#bs-eye)" filter="url(#bs-void)" />
      <ellipse cx="50" cy="46" rx="7" ry="5" fill="#cc88ff" />
      <ellipse cx="78" cy="46" rx="7" ry="5" fill="#cc88ff" />
      <ellipse cx="50" cy="46" rx="3.5" ry="2.5" fill="#fff" />
      <ellipse cx="78" cy="46" rx="3.5" ry="2.5" fill="#fff" />
    </svg>
  );
}
```

### Step 3: Update index.ts — all 7 exports

Full contents of `client/src/components/game/bosses/index.ts`:
```ts
export { PlayerAvatar } from "./PlayerAvatar";
export { BossE } from "./BossE";
export { BossD } from "./BossD";
export { BossC } from "./BossC";
export { BossB } from "./BossB";
export { BossA } from "./BossA";
export { BossS } from "./BossS";
```

### Step 4: Build — should be clean now

```bash
cd /home/jesse/Projects/HunterPath && npm run build 2>&1 | tail -5
```

Expected: `✓ built in Xs` with no TypeScript errors.

### Step 5: Commit

```bash
git add client/src/components/game/bosses/BossA.tsx client/src/components/game/bosses/BossS.tsx client/src/components/game/bosses/index.ts
git commit -m "feat: add BossA (Dragon Knight) and BossS (Void Lord) SVG components"
```

---

## Task 6: Wire Up HuntersPath.tsx

**Files:**
- Modify: `client/src/components/game/HuntersPath.tsx`

### Step 1: Add import at top of `HuntersPath.tsx`

Find the existing imports block (first ~30 lines). Add:

```tsx
import { PlayerAvatar, BossE, BossD, BossC, BossB, BossA, BossS } from "./bosses";
```

### Step 2: Add boss component map (near MONSTER_DATA, around line 1122)

After the closing `};` of `MONSTER_DATA`, add:

```tsx
const BOSS_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  E: BossE,
  D: BossD,
  C: BossC,
  B: BossB,
  A: BossA,
  S: BossS,
};
```

### Step 3: Replace player avatar in player card (line ~4227)

Find:
```tsx
                <img
                  src="./assets/ui/player.svg"
                  alt="Hunter"
                  className="w-16 h-16 rounded-full object-cover"
                />
```

Replace with:
```tsx
                <PlayerAvatar className="w-16 h-16 rounded-full" />
```

### Step 4: Replace player avatar in combat zone (line ~4855)

Find:
```tsx
                        <img
                          src="./assets/ui/player.svg"
                          alt="Hunter"
                          className="w-16 h-16 rounded-full object-cover mx-auto mb-2 shadow-lg shadow-purple-500/30"
                        />
```

Replace with:
```tsx
                        <PlayerAvatar className="w-16 h-16 rounded-full mx-auto mb-2 shadow-lg shadow-purple-500/30" />
```

### Step 5: Replace boss image block in combat zone (line ~4900)

Find this block:
```tsx
                          {running && MONSTER_DATA[running.gate.rank as keyof typeof MONSTER_DATA]?.image ? (
                            <img
                              src={MONSTER_DATA[running.gate.rank as keyof typeof MONSTER_DATA]?.image}
                              alt="Boss"
                              className="w-16 h-16 object-contain"
                            />
                          ) : (
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
                          )}
```

Replace with:
```tsx
                          {(() => {
                            const BossComp = running
                              ? BOSS_COMPONENTS[running.gate.rank]
                              : null;
                            return BossComp ? (
                              <BossComp className="w-16 h-16" />
                            ) : (
                              <i className="fas fa-dragon text-white text-xl" />
                            );
                          })()}
```

### Step 6: Build

```bash
cd /home/jesse/Projects/HunterPath && npm run build 2>&1 | tail -10
```

Expected: clean build.

### Step 7: Visual verification in browser

```bash
# dev server should already be running at localhost:5000
# if not: cd /home/jesse/Projects/HunterPath && npm run dev
```

Open `http://localhost:5000` and verify:
1. Player card (top-left) shows the armoured hunter with cyan visor glow
2. Combat zone player side shows same avatar
3. Enter an E-Rank Gate — boss area shows the Goblin Warrior
4. Repeat for D, C, B, A, S ranks

### Step 8: Commit

```bash
git add client/src/components/game/HuntersPath.tsx
git commit -m "feat: wire up inline SVG boss components, replace all img tags"
```

---

## Task 7: Deploy + Verify

### Step 1: Push all commits

```bash
git push origin main
```

GitHub Actions will build and deploy automatically. Watch the Actions tab.

### Step 2: Verify the deployed build (after ~2 minutes)

Navigate to `https://jesserweigel.github.io/HunterPath/` in a desktop browser. Verify:
- No "Loading Hunter's Path..." hang
- All boss SVGs visible in combat
- Player avatar visible

### Step 3: On Android phone

1. Open the installed PWA
2. If it still shows the old cached version, close and reopen — the new service worker (`hunters-path-v3`) will trigger an update
3. If the update confirm dialog shows, tap OK
4. Game should load correctly

If still stuck: in Chrome on Android, go to Settings → Apps → Hunter's Path → Clear Cache, then reopen.
