# Hunter's Path - Bug Report & Improvement Plan

## BUGS (Critical) — ALL FIXED

### 1. ~~Boss HP exceeds maxHp on spawn~~ FIXED
`makeBoss()` now calculates HP once and assigns to both `hp` and `maxHp`.

### 2. ~~S-Rank gates are easier than B-Rank and A-Rank~~ FIXED
All ranks now use consistent exponential scaling via `gatePowerForRank()`.

### 3. ~~No HP healing between combats~~ FIXED
Victory heals to full HP. Defeat recovers to 30% HP.

### 4. ~~Auto-dungeon death spiral~~ FIXED
Auto-dungeon rests when HP < 50% before entering next gate.

## BUGS (Display/Polish) — ALL FIXED

### 5. ~~Floating-point PWR display (Mobile)~~ FIXED
Mobile CombatTab uses `Math.round()` / `Math.floor()` for all power displays.

### 6. ~~Boss name shows as "Orc-Rank Boss"~~ FIXED
Boss names now come from MONSTER_DATA. Rank shown as separate subtitle.

### 7. ~~Runes can have +0 stat bonus~~ FIXED
Stat bonus formula uses `Math.max(1, ...)` to ensure minimum bonus of 1.

### 8. ~~Debug spirits in save data~~ FIXED
Save loading now strips spirits with IDs starting with "debug_" or names starting with "Debug ".

### 9. ~~Debug button visible in production~~ FIXED
Debug button and panel are gated by `process.env.NODE_ENV === "development"`.

### 10. ~~Stacked modals on desktop~~ FIXED
Daily Login modal only shows after offline gains modal is dismissed.

## IMPROVEMENTS (Game Feel) — ALL DONE

### 11. ~~Bulk stat allocation~~ DONE
+1, +5, +10 buttons added to stat allocation UI.

### 12. ~~Combat log variety~~ DONE
Crits, dodges, spirit ability triggers, boss phases, and rank-specific flavor text added.

### 13. ~~Thematic gate names~~ DONE
8 unique thematic names per rank. Dedup logic prevents repeated names in gate pool.

### 14. ~~Victory/loot screen~~ DONE
Victory/defeat screen shows EXP, gold, loot drops, spirit binding, and boss info.

## IMPROVEMENTS (Storyline) — DONE

### 15. ~~Story framework~~ DONE
Boss dialogue, rank-up milestones, unlockable lore entries, and thematic narrative added.

---

## Round 2 (found 2026-02-25)

### 16. ~~Inventory duplicated in mobile Log tab~~ FIXED
Inventory section appeared in both Log tab and Manage > Inventory accordion.

### 17. ~~Rune "Use" button missing on mobile~~ FIXED
Rune items had no interaction button on mobile Manage > Inventory.

### 18. ~~CRITICAL: maxHp/maxMp not recalculated on save load~~ FIXED
Level 57 player had maxHp 170 (should be 660). On load, now recalculates expected values
and corrects if too low.

### 19. Spirit type appended to name without separator — NOT A BUG
**File:** `SpiritsTab.tsx`
Accessibility tree shows "Ater-844mage" but visual rendering is correct — name and type
are in separate `<span>` elements with `ml-2` spacing. No fix needed.

### 21. ~~Auto-dungeon picks gates it can't win~~ FIXED
Auto now filters by actual gate power (`g.power`) instead of `g.recommended * 0.9`.

### 20. ~~Duplicate gate names in gate list~~ FIXED
`makeGate()` now tracks used names and avoids duplicates via shuffle-without-replacement.

---

## Round 3 (found 2026-02-25)

### 22. ~~Potion heal doesn't scale with gate rank~~ FIXED
**File:** `HuntersPath.tsx` `rollDrop()`
Heal formula was `(quality/100) * 50 + 25` — purely rarity-based. An S-grade Potion could
heal +42 HP while an E-grade healed +43 HP. Gate rank was only used for the name label.
**Fix:** Added `gate.rankIdx * 15` to heal formula. Now E-grade heals ~35-75, S-grade ~100-150.

### 23. ~~usePotion ignores potion's stats, always heals 50% maxHp~~ FIXED
**File:** `HuntersPath.tsx` `usePotion()`
All potions healed `Math.floor(maxHp * 0.5)` regardless of their displayed stats. The
`stats.HP` field was purely cosmetic.
**Fix:** `usePotion()` now reads `item.stats.HP` for the heal amount (falls back to 50% maxHp
for legacy potions without stats).

### 24. ~~Shop potions don't scale with player level~~ FIXED
**File:** `HuntersPath.tsx` `buyPotion()`
Shop potions used a fixed quality formula giving ~45-55 HP. At level 57 (660 maxHp) this
heals only 7-8%, making shop potions useless at higher levels.
**Fix:** Added `player.level * 1.5` bonus to shop potion heal amount.

### 25. ~~Player strip HP/MP bars have no numeric labels~~ FIXED
**File:** `CombatTab.tsx:58-65`
Added `text-[10px]` HP/MP labels under each bar in the player strip.
