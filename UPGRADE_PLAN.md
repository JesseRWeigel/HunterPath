# Hunter's Path - Upgrade Plan

## Vision
Transform Hunter's Path into a **polished, original-IP idle/roguelite RPG** ready for app store distribution and community growth. Rebrand away from any specific IP references while keeping all the beloved game mechanics. Target the incremental games community and anime/fantasy RPG fans.

## Current State
- React + TypeScript + Express.js idle/roguelite game
- PWA-enabled (installable on mobile)
- Deployed to GitHub Pages
- Features: dungeon clearing, stat progression, daily quests, spirit binding (ally recruitment), fatigue system
- All Solo Leveling references have been removed and replaced with original terminology

---

## Terminology Reference (Post-Rebrand)

| Old Term | New Term |
|----------|----------|
| Shadow Extraction | Spirit Binding |
| Shadow Army | Spirit Legion |
| Shadow ally/soldier | Bound Spirit |
| "Arise" command | (Removed — not used in code) |
| Solo Leveling references | Removed entirely |
| Hunter's Path | Hunter's Path (kept — original enough) |

---

## Phase 1: Visual & UX Polish (Week 1-2)

### 1.1 Art Direction
- [ ] Define a consistent visual identity (dark fantasy with glowing accents)
- [ ] Character art: create a protagonist silhouette/avatar
- [ ] Dungeon backgrounds: 5-6 unique environments per rank tier
- [ ] Boss art: unique visual for each boss type
- [ ] Spirit Legion art: visual representations of bound spirits
- [ ] UI icons: custom icons for stats, items, abilities

### 1.2 Animations & Effects
- [x] Combat animations (slash effects, magic effects, critical hits) — Framer Motion slide-in, shake on crit
- [x] Spirit Binding sequence — dramatic visual with particle effects
- [x] Level-up celebration animation — particle burst preset
- [ ] Rank promotion ceremony
- [x] Idle animations (character breathing, environment particles) — CSS environment particles per gate rank
- [x] Screen shake on boss hits — Framer Motion shake on critical

### 1.3 Sound Design
- [x] Background music per dungeon tier (ambient, escalating intensity) — Howler.js with crossfade
- [x] Combat sound effects (hits, dodges, critical strikes) — procedural Web Audio fallbacks
- [x] UI sounds (button clicks, menu transitions, notifications) — via AudioManager
- [x] Spirit Binding sequence audio — rune_use SFX
- [x] Boss encounter music (distinct, dramatic) — combat music track
- [x] Victory/defeat jingles — victory/defeat SFX + music

### 1.4 Mobile-First Redesign
- [x] Touch-optimized UI (larger buttons, swipe gestures) — 44px min touch targets, touch-manipulation
- [ ] Bottom navigation bar (mobile convention)
- [ ] Pull-to-refresh for daily quests
- [x] Haptic feedback on actions (via Vibration API) — haptics.ts utility
- [ ] Landscape + portrait support

---

## Phase 2: Gameplay Depth (Week 2-3)

### 2.1 Progression Systems
- [ ] **Skill tree** — unlock abilities as you level up (not just stat points)
- [ ] **Equipment system** — weapons, armor, accessories dropped from dungeons
- [ ] **Crafting** — combine materials from dungeons into gear
- [ ] **Prestige/Rebirth** — reset for permanent bonuses (classic incremental mechanic)
- [ ] **Titles/Achievements** — earned through milestones, provide small bonuses

### 2.2 Dungeon Variety
- [ ] **Dungeon types**: Combat, Puzzle, Survival, Timed
- [ ] **Dungeon modifiers**: random affixes that change difficulty ("Enemies have 2x HP", "No healing")
- [ ] **Boss mechanics**: unique attack patterns per boss, not just stat checks
- [ ] **Secret rooms**: rare bonus rooms with extra loot
- [ ] **Dungeon keys**: special keys for bonus dungeons (current mechanic, expand it)

### 2.3 Spirit Legion Expansion
- [ ] Spirit evolution — level up your bound spirits
- [ ] Spirit synergies — certain combinations grant bonuses
- [ ] Spirit abilities — spirits can use special moves in combat
- [ ] Spirit limit — must choose which spirits to bring (tactical decisions)
- [ ] Rare/legendary spirits with unique abilities

### 2.4 Social / Competitive Features
- [ ] **Global leaderboard** — rank, level, dungeon clears
- [ ] **Weekly challenges** — community-wide goals
- [ ] **Player profiles** — shareable stat cards
- [ ] **Guilds** — group up for guild raids and shared bonuses

### 2.5 Idle Mechanics Enhancement
- [ ] **Offline progress** — gain resources while away
- [ ] **Auto-dungeon** — configure automated runs with rules
- [ ] **Research queue** — long-term upgrades that complete over time
- [ ] **Daily login rewards** — escalating rewards for consecutive days

---

## Phase 3: Technical Infrastructure (Week 3-4)

### 3.1 Backend & Persistence
- [ ] User accounts (email + OAuth via Google/GitHub)
- [ ] Cloud save (so progress isn't lost)
- [ ] Server-side validation for leaderboards (prevent cheating)
- [ ] API rate limiting and security

### 3.2 Performance
- [ ] Optimize React rendering (memo, virtualization for long lists)
- [ ] Lazy loading for dungeon assets
- [ ] Service worker caching strategy for offline play
- [ ] Bundle size optimization (current build may be large)

### 3.3 Analytics
- [ ] Player retention metrics (D1, D7, D30)
- [ ] Funnel analysis (where do players drop off?)
- [ ] Feature usage tracking (which content is most engaging?)
- [ ] A/B testing framework for UI changes

---

## Phase 4: Distribution (Week 4-5)

### 4.1 App Store Publishing
- [ ] **Google Play Store** via TWA (Trusted Web Activity) — PWA in a native wrapper
- [ ] **Apple App Store** via Capacitor or PWABuilder
- [ ] App store listing: screenshots, description, keywords
- [ ] App store icon and feature graphic

### 4.2 Community Building
- [ ] Post to **r/incremental_games** (120k+ members, very receptive to new games)
- [ ] Post to **r/WebGames**, **r/IndieGaming**
- [ ] Create a Discord server for the game
- [ ] Itch.io page (secondary distribution)
- [ ] Game jams: enter incremental game jams for visibility

### 4.3 Monetization (Ethical, Cosmetic-Only)
- [ ] **Remove ads as primary revenue** — use cosmetic microtransactions instead
- [ ] **Cosmetic skins** — character appearance, spirit appearances, dungeon themes
- [ ] **Battle pass** — seasonal content with free and premium tracks
- [ ] **Quality-of-life purchases** — extra save slots, UI themes
- [ ] **Never sell power** — no pay-to-win stat boosts or exclusive gear
- [ ] **Ad-free premium** — one-time purchase to remove optional reward ads

### 4.4 Social Sharing
- [ ] "I reached S-Rank!" shareable image cards
- [ ] "My Spirit Legion" showcase cards
- [ ] Achievement share buttons
- [ ] Referral system (invite friends for bonus rewards)

---

## Phase 5: Content Pipeline (Ongoing)

### 5.1 Seasonal Content
- [ ] Monthly new dungeons
- [ ] Seasonal events (themed challenges, limited-time spirits)
- [ ] Balance patches based on analytics
- [ ] Community-suggested features pipeline

### 5.2 Lore & Story
- [ ] Develop original world lore (not tied to any existing IP)
- [ ] Main story questline that unfolds as you progress
- [ ] NPC characters with dialogue
- [ ] Codex/lore entries unlocked through exploration

### 5.3 README Update
- [ ] Compelling description focused on gameplay
- [ ] Screenshots and gameplay GIFs
- [ ] "Play Now" link prominent at top
- [ ] Contributing guide for open-source contributors
- [ ] Tech stack showcase (React, TypeScript, PWA)

---

## Technical Stack

| Component | Current | Target |
|-----------|---------|--------|
| Frontend | React + TypeScript | Same (Framer Motion added ✓) |
| Backend | Express.js | Express.js + PostgreSQL (for accounts/leaderboards) |
| Hosting | GitHub Pages | Vercel or Cloudflare Pages (frontend) + Railway (backend) |
| Mobile | PWA only | PWA + TWA (Play Store) + Capacitor (App Store) |
| Analytics | None | Plausible or PostHog (privacy-respecting) |
| Auth | None | Clerk or Auth.js |
| Database | None (client-side only) | PostgreSQL via Drizzle ORM |

---

## Success Metrics

| Metric | Target (3 months) |
|--------|-------------------|
| Daily Active Players | 500+ |
| App Store Rating | 4.0+ |
| r/incremental_games post | 100+ upvotes |
| Discord members | 200+ |
| Monthly revenue | $500+ (cosmetics) |
| GitHub stars | 100+ |
