# Prestige/Rebirth System Design

## Overview
Implement a prestige system where players can reset their progress at Level 50+ to earn permanent bonuses.

## Core Mechanics

### Unlock Requirement
- Level 50+ required to access rebirth

### What Resets
- Gold (₲)
- Keys
- Gates cleared (daily quests reset)
- Fatigue

### What Kept
- Player level
- Allocated stats
- Bound spirits (Spirit Legion)
- Inventory items

### Bonuses Earned

#### 1. Power Multiplier
- +15% to all future power calculations per rebirth
- Compound: Power = Base × (1 + Rebirths × 0.15)

#### 2. Prestige Points
- New persistent currency
- Formula: `Points = floor(Level × 10 × (1 + Rebirths × 0.5))`
- Example: Rebirth at Lv50 = 50 × 10 × 1.5 = 750 points

## UI/UX

### Rebirth Button
- Located in header, appears when Level 50+
- Shows current rebirth count and bonus preview

### Confirmation Modal
- Warning: "This will reset your gold, keys, gates, and fatigue"
- Shows what you'll keep (level, stats, spirits)
- Shows what you'll gain (prestige points, power bonus)

### Display
- Prestige Points shown in header alongside gold/keys
- Power formula shows bonus: "Power: 100 (+15%)"

## Data Structure

```typescript
interface Player {
  // Existing fields...
  rebirths: number;           // Number of times rebirthing
  prestigePoints: number;      // Total prestige points earned
}
```

## Acceptance Criteria

1. [x] Rebirth button appears at Level 50+
2. [x] Clicking shows confirmation modal
3. [x] Confirming resets gold/keys/gates/fatigue
4. [x] Confirming keeps level/stats/spirits
5. [x] Prestige points calculated and awarded
6. [x] Power multiplier applied to combat
7. [x] Prestige points displayed in UI
8. [x] Persists across save/load

## Timeline
- Implementation: ~2-3 hours
- Testing: 30 minutes
