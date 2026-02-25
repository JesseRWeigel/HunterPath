# Hunter's Path - Bug Report & Improvement Plan

## BUGS (Critical)

### 1. Boss HP exceeds maxHp on spawn
**File:** `HuntersPath.tsx:356-357`
`makeBoss()` generates `maxHp` and `hp` with independent random rolls, so bosses spawn with more HP than their max (e.g., 574/565, 1248/1265).
**Fix:** Calculate HP once and assign to both fields.

### 2. S-Rank gates are easier than B-Rank and A-Rank
**File:** `HuntersPath.tsx:307-313`
S-rank uses a special lower formula (`~158`) while B-rank (`~220`) and A-rank (`~375`) use the standard formula. Combined with S-rank boss `atkMultiplier = 0.4` vs `0.8`, S-rank is the easiest high-tier gate.
**Fix:** Use consistent exponential scaling across all ranks.

### 3. No HP healing between combats
Players carry remaining HP into the next fight. After losing at C-rank with 34/170 HP, entering a D-rank gate means near-certain death. Rest only heals 40%.
**Fix:** Auto-heal to full after winning. Partial heal after losing.

### 4. Auto-dungeon death spiral
Auto picks the highest rank clearable gate but ignores current HP. At 21% HP it charges into B-rank gates and dies repeatedly.
**Fix:** Auto-rest when HP < 50% before entering next gate.

## BUGS (Display/Polish)

### 5. Floating-point PWR display (Mobile)
**File:** `CombatTab.tsx:180`
Shows `PWR 233.96000000000004`. Desktop uses `fmt()` but mobile doesn't.
**Fix:** Round gate power display.

### 6. Boss name shows as "Orc-Rank Boss"
**File:** `CombatTab.tsx:233`
Template `{RANK_LABEL[rank]}-Rank Boss` produces "Dark Elf-Rank Boss".
**Fix:** Show actual boss name with rank as subtitle.

### 7. Runes can have +0 stat bonus
**File:** `HuntersPath.tsx:703`
Low-quality D-rank runes: `floor(0.2 * 2 * 2) = 0`.
**Fix:** Ensure minimum bonus of 1.

### 8. Debug spirits in save data
Spirits named "Debug Warrior" and "Debug Tank" in save.
**Fix:** Clean up or gate behind debug mode.

### 9. Debug button visible in production
**Fix:** Hide behind setting or environment check.

### 10. Stacked modals on desktop
Daily Login + Welcome Back modals appear simultaneously.
**Fix:** Queue modals so only one shows at a time.

## IMPROVEMENTS (Game Feel)

### 11. Bulk stat allocation
Clicking "+" 35 times is tedious. Add +5/+10 buttons.

### 12. Combat log variety
"Hunter attacks for 246 damage!" every tick is repetitive. Add spirit ability triggers, crits, boss phases.

### 13. Thematic gate names
Replace random IDs ("he65cws") with names like "Goblin Cavern", "Cursed Mines".

### 14. Victory/loot screen
Combat ends too fast. Show proper victory screen with rewards.

## IMPROVEMENTS (Storyline)

### 15. Story framework
Add a progression narrative with rank-up milestones, boss dialogue, and lore entries.
Keep it original - focus on "Hunters clearing dimensional gates" as a generic fantasy premise.
Avoid any specific Solo Leveling elements (shadow army, necromancer powers, system messages).

---

## Round 2 (found 2026-02-25)

### 16. ~~Inventory duplicated in mobile Log tab~~ FIXED
Inventory section appeared in both Log tab and Manage > Inventory accordion.

### 17. ~~Rune "Use" button missing on mobile~~ FIXED
Rune items had no interaction button on mobile Manage > Inventory.

### 18. CRITICAL: maxHp/maxMp not recalculated on save load
**File:** `HuntersPath.tsx` save loading code
Level 57 player has maxHp 170 (should be 660) and maxMp 85 (should be 330). Corrupted
by older leveling code that didn't track maxHp properly. Makes the game unwinnable at
higher levels since bosses one-shot the player.
**Fix:** On load, recalculate `maxHp = 100 + (level-1)*10` and `maxMp = 50 + (level-1)*5`
if current values are lower than expected.

### 19. Spirit type appended to name without separator
**File:** `SpiritsTab.tsx`
Spirit cards show "Ater-844mage" and "Umbra-419warrior" — the type string is concatenated
directly to the name with no space.
**Fix:** Add a space or display type separately.

### 20. Duplicate gate names in gate list
**File:** `HuntersPath.tsx` `makeGate()`
Only 8 names per rank, but up to 14 gates visible. Duplicates common ("Magma Cavern" x2,
"Oblivion Core" x2, "Twilight Gorge" x2).
**Fix:** Use shuffle-without-replacement, or append a numeral suffix to duplicates.
