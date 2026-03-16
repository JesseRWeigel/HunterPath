# Hunter's Path — Release Plan

## Current State Assessment

**Status: Playable prototype with solid game mechanics, missing production infrastructure.**

### What Works Well
- Core gameplay loop: combat math, spirit binding, daily quests, fatigue, prestige/rebirth
- localStorage save/load with autosave, offline gains, and save migration
- PWA with offline play (minus audio)
- Mobile-responsive layout with bottom tab navigation
- 165 passing tests covering core game logic at 97-100% coverage
- GitHub Pages deployment via GitHub Actions

### What's Missing

#### Tier 1: Hard Blockers
1. **5,292-line monolith** (`HuntersPath.tsx`) — unsustainable for future development
2. **No server-side persistence** — backend is scaffolding with zero working endpoints
3. **Shallow content** — ~2-4 hours to S-Rank, then prestige loop. Needs 50+ hours
4. **Audio is 16-byte stubs** — procedural fallback generates chip-tune beeps
5. **7 console.log statements** left in production code

#### Tier 2: Expected for Public Release
- Settings/options screen (volume, data export, save management)
- Onboarding/tutorial for new players
- Achievement system (schema exists, not implemented)
- Statistics dashboard (playerStats table exists, unused)
- Save import/export (critical for localStorage-only game)
- Accessibility (keyboard nav, screen reader labels, colorblind mode)
- Save corruption recovery

#### Tier 3: Competitive Differentiation
- Deeper prestige layers (2-3 tiers instead of 1)
- Equipment system expansion
- Boss mechanics (phases, patterns, not just stat checks)
- Seasonal events / limited-time content
- Richer narrative progression

---

## Release Strategy

### Path A: Free Web Game (Target: 2-3 weeks)
Ship on GitHub Pages + itch.io as a free browser game.

1. Clean up console.logs and debug artifacts
2. Add save export/import (JSON download/upload)
3. Add tutorial overlay for first-time players
4. Generate real audio with local AI models (ComfyUI LTX audio VAE)
5. Add settings panel
6. Implement achievements
7. Document that saves are local-only
8. Submit to itch.io, r/incremental_games

### Path B: Full Release with Backend (6-8 weeks after Path A)
1. Implement auth (Passport is in package.json)
2. Wire Neon database — save sync, user accounts
3. Build save sync API
4. Server-side validation (anti-cheat basics)
5. Leaderboards
6. Refactor monolith
7. Add post-S-Rank content + more prestige layers

### Path C: Mobile App (12+ weeks after Path B)
- Capacitor/Tauri wrapper
- App store assets
- Push notifications
- IAP monetization
- Crash reporting + analytics

---

## Available Local Resources

### AI Models (for asset generation)
- **ComfyUI** with:
  - Flux 1 Dev/Schnell, Flux 2 Klein (image generation)
  - Illustrious-XL, PonyDiffusion v6, NoobAI-XL (stylized art)
  - LTX 2.3 with audio VAE (audio generation)
  - ControlNet depth (consistent character poses)
- **Ollama** with Qwen 3.5 27B, Qwen 3 32B (text generation for lore/quests)
- **ffmpeg** (audio processing)

### Current Art Assets
- 6 boss SVGs (boss_e through boss_s)
- Player avatar SVG
- UI elements as SVGs
- All are simple/stylized — consistent art direction

### Current Audio (all 16-byte stubs)
- 15 SFX: attack, block, critical, damage, defeat, extraction_*, gate_enter, heal, level_up, rest, rune_use, victory
- 4 music tracks: ambient, combat, defeat, victory

---

## Game Mechanics Reference

### Power Formula
```
basePower = STR*3 + AGI*2 + INT*1.5 + VIT*0.5
spiritBonus = sum(spirit.power) * (1 + spiritBoostLevel * 0.02)
fatiguePenalty = 1 - min(0.4, fatigue/250)
rebirthMult = 1 + rebirths * 0.15
totalPower = max(1, (basePower + spiritBonus) * fatiguePenalty * rebirthMult)
```

### Gate Scaling
```
gatePower(rank) = round(1.7^rankIdx * 30 + rankIdx * 20)
E=30  D=71  C=127  B=200  A=304  S=454
```

### Rank Unlock Levels
E=1, D=3, C=6, B=10, A=15, S=18
