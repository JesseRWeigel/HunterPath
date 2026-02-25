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
