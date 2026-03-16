# Hunter's Path — Release Plan

## Current State Assessment

**Status: Path A complete. Free web game with full feature set shipping on GitHub Pages.**

### What Works Well
- Core gameplay loop: combat math, spirit binding, daily quests, fatigue, prestige/rebirth
- localStorage save/load with autosave, offline gains, save migration, and corruption recovery
- Save export/import (JSON backup/restore)
- Tutorial system for new players
- Achievement system (25+ achievements across 4 categories)
- Statistics dashboard (combat tracking, play time)
- Settings panel (audio controls, save management)
- AI-generated music (MusicGen) and synthesized SFX
- PWA with offline play and audio
- Mobile-responsive layout with bottom tab navigation
- 215 passing tests across 13 files covering core game logic at 97-100% coverage
- GitHub Pages deployment via GitHub Actions with CI pipeline

### What's Missing

#### Tier 1: Hard Blockers
1. **5,292-line monolith** (`HuntersPath.tsx`) — unsustainable for future development
2. **No server-side persistence** — backend is scaffolding with zero working endpoints
3. **Shallow content** — ~2-4 hours to S-Rank, then prestige loop. Needs 50+ hours
4. ~~**Audio is 16-byte stubs** — procedural fallback generates chip-tune beeps~~ Done — AI-generated music + synthesized SFX
5. ~~**7 console.log statements** left in production code~~ Done — cleaned up

#### Tier 2: Expected for Public Release
- ~~Settings/options screen (volume, data export, save management)~~ Done
- ~~Onboarding/tutorial for new players~~ Done
- ~~Achievement system (schema exists, not implemented)~~ Done — 25+ achievements across 4 categories
- ~~Statistics dashboard (playerStats table exists, unused)~~ Done
- ~~Save import/export (critical for localStorage-only game)~~ Done
- Accessibility (keyboard nav, screen reader labels, colorblind mode)
- ~~Save corruption recovery~~ Done — rotating backups

#### Tier 3: Competitive Differentiation
- Deeper prestige layers (2-3 tiers instead of 1)
- Equipment system expansion
- Boss mechanics (phases, patterns, not just stat checks)
- Seasonal events / limited-time content
- Richer narrative progression

---

## Release Strategy

### Path A: Free Web Game — COMPLETE
Shipped on GitHub Pages as a free browser game.

1. ~~Clean up console.logs and debug artifacts~~ Done
2. ~~Add save export/import (JSON download/upload)~~ Done
3. ~~Add tutorial overlay for first-time players~~ Done
4. ~~Generate real audio with local AI models (MusicGen + synthesized SFX)~~ Done
5. ~~Add settings panel~~ Done
6. ~~Implement achievements (25+ across 4 categories)~~ Done
7. ~~Implement statistics dashboard~~ Done
8. ~~Add save corruption recovery with rotating backups~~ Done
9. ~~CI pipeline with 215 tests~~ Done
10. Submit to itch.io, r/incremental_games

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

### Audio (generated)
- 15 SFX: attack, block, critical, damage, defeat, binding_*, gate_enter, heal, level_up, rest, rune_use, victory — synthesized via `scripts/generate-sfx.py`
- 4 music tracks: ambient, combat, defeat, victory — generated via MusicGen (`scripts/generate-music-ai.py`)

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
