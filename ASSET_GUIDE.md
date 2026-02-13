# Hunter's Path - Asset Generation Guide

## Monster Assets Needed

Generate these in ComfyUI (or download from free sources):

### Bosses (one per rank)
| Rank | Name | Prompt for Generation | File Name |
|------|------|----------------------|-----------|
| E | Goblin Warrior | "pixel art goblin warrior, 8-bit, RPG monster, dark cave, glowing red eyes, game sprite, frontal view" | boss_e.png |
| D | Orc Berserker | "pixel art orc berserker, 8-bit, muscular, red eyes, RPG monster, dungeon, game sprite, frontal view" | boss_d.png |
| C | Dark Elf Assassin | "pixel art dark elf assassin, 8-bit, hooded, glowing purple eyes, RPG monster, forest, game sprite, frontal view" | boss_c.png |
| B | Troll Chieftain | "pixel art troll chieftain, 8-bit, massive, stone skin, club weapon, mountain, RPG monster, game sprite, frontal view" | boss_b.png |
| A | Dragon Knight | "pixel art dragon knight, 8-bit, armored, dragon scale armor, flaming sword, castle hall, RPG boss, game sprite, frontal view" | boss_a.png |
| S | Void Lord | "pixel art void lord, 8-bit, cosmic horror, darkness energy, glowing white eyes, eldritch, RPG boss, game sprite, frontal view" | boss_s.png |

### Monsters (3 per rank - regular enemies)
| Rank | Name | Prompt | File Name |
|------|------|--------|-----------|
| E | Goblin Scout | "pixel art goblin scout, 8-bit, small, dagger, dark cave, game sprite" | monster_e1.png |
| E | Giant Spider | "pixel art giant spider, 8-bit, cave spider, glowing eyes, dark cave, game sprite" | monster_e2.png |
| E | Cave Bat | "pixel art bat, 8-bit, dark cave, upside down, game sprite" | monster_e3.png |
| D | Orc Grunt | "pixel art orc grunt, 8-bit, weapon, dungeon, game sprite" | monster_d1.png |
| D | Skeleton Warrior | "pixel art skeleton warrior, 8-bit, bones, sword, dungeon, game sprite" | monster_d2.png |
| D | Dark Slime | "pixel art slime monster, 8-bit, gelatinous, glowing core, dungeon, game sprite" | monster_d3.png |
| C | Dark Elf Archer | "pixel art dark elf archer, 8-bit, bow, hooded, forest, game sprite" | monster_c1.png |
| C | Werewolf | "pixel art werewolf, 8-bit, beast, feral, forest, game sprite" | monster_c2.png |
| C | Shadow Wraith | "pixel art shadow wraith, 8-bit, ghostly, glowing eyes, forest spirit, game sprite" | monster_c3.png |
| B | Troll | "pixel art troll, 8-bit, large, club, mountain, game sprite" | monster_b1.png |
| B | Stone Golem | "pixel art stone golem, 8-bit, rocky, glowing runes, mountain, game sprite" | monster_b2.png |
| B | Frost Giant | "pixel art frost giant, 8-bit, ice, frozen, mountain, game sprite" | monster_b3.png |
| A | Armored Knight | "pixel art armored knight, 8-bit, full plate, sword, shield, castle, game sprite" | monster_a1.png |
| A | Fire Elemental | "pixel art fire elemental, 8-bit, flames, blaze, castle hall, game sprite" | monster_a2.png |
| A | Necromancer | "pixel art necromancer, 8-bit, robe, skull staff, dark magic, castle, game sprite" | monster_a3.png |
| S | Abyssal Demon | "pixel art abyssal demon, 8-bit, horns, dark energy, cosmic void, game sprite" | monster_s1.png |
| S | Soul Eater | "pixel art soul eater, 8-bit, void creature, darkness, eldritch, game sprite" | monster_s2.png |
| S | Chaos Dragon | "pixel art chaos dragon, 8-bit, dark scales, void energy, cosmic, game sprite" | monster_s3.png |

## Spirit Assets Needed

### Bound Spirits (from spirit binding)
| Spirit Type | Prompt | File Name |
|-------------|--------|-----------|
| Goblin Spirit | "pixel art friendly goblin ghost, 8-bit, translucent, cute, game spirit, blue glow" | spirit_goblin.png |
| Wolf Spirit | "pixel art wolf ghost, 8-bit, ethereal, loyal, game spirit, blue glow" | spirit_wolf.png |
| Skeleton Spirit | "pixel art skeleton ally, 8-bit, friendly, glowing blue eyes, game spirit" | spirit_skeleton.png |
| Troll Spirit | "pixel art troll ghost, 8-bit, large, friendly, game spirit, blue glow" | spirit_troll.png |
| Dragon Spirit | "pixel art dragon ghost, 8-bit, majestic, winged, game spirit, purple glow" | spirit_dragon.png |
| Void Spirit | "pixel art void entity, 8-bit, cosmic, eldritch, powerful, game spirit, purple glow" | spirit_void.png |

## UI Assets Needed

| Asset | Prompt | File Name |
|-------|--------|-----------|
| HP Bar Icon | "pixel art heart icon, 8-bit, red, health, RPG UI, game icon" | ui_hp.png |
| MP Bar Icon | "pixel art mana crystal, 8-bit, blue, magic, RPG UI, game icon" | ui_mp.png |
| EXP Bar Icon | "pixel art star icon, 8-bit, purple, experience, RPG UI, game icon" | ui_exp.png |
| Coin Icon | "pixel art gold coin, 8-bit, currency, shiny, RPG UI, game icon" | ui_coin.png |
| Key Icon | "pixel art golden key, 8-bit, dungeon key, RPG UI, game icon" | ui_key.png |
| Attack Icon | "pixel art sword icon, 8-bit, weapon, RPG UI, game icon" | ui_attack.png |
| Defense Icon | "pixel art shield icon, 8-bit, defense, RPG UI, game icon" | ui_defense.png |
| Power Icon | "pixel art lightning bolt, 8-bit, power, strength, RPG UI, game icon" | ui_power.png |

## Background Assets Needed

| Rank | Prompt | File Name |
|------|--------|-----------|
| E-Rank Cave | "pixel art dark cave background, 8-bit, mossy walls, stalactites, dungeon, game background" | bg_e.png |
| D-Rank Dungeon | "pixel art torch lit dungeon, 8-bit, stone walls, iron bars, warm lighting, game background" | bg_d.png |
| C-Rank Forest | "pixel art moonlit forest, 8-bit, twisted trees, blue moon, mist, game background" | bg_c.png |
| B-Rank Mountain | "pixel art mountain pass, 8-bit, rocky, snow peaks, cliff, game background" | bg_b.png |
| A-Rank Castle | "pixel art grand castle hall, 8-bit, pillars, banners, torchlight, golden, game background" | bg_a.png |
| S-Rank Void | "pixel art cosmic void, 8-bit, stars, nebula, eldritch, purple cosmic, game background" | bg_s.png |

## ComfyUI Quick Start (Your 5090)

1. Install ComfyUI: https://github.com/comfyanonymous/ComfyUI
2. Download Flux Dev model (放到 models/checkpoints/)
3. Drop `comfyui_workflow.json` into ComfyUI's workflow folder
4. Click "Load" to load the workflow
5. Edit the text prompt for each asset
6. Generate and save to `client/public/assets/`

## File Placement

```
client/public/assets/
├── monsters/      # Regular enemy sprites
├── bosses/        # Boss sprites
├── spirits/       # Bound spirit sprites
├── backgrounds/   # Gate background images
├── ui/           # UI icons
└── effects/      # Spell effects, particles (future)
```

## Current Code Status

The game currently uses FontAwesome icons and CSS for all visuals.
When images are added to these folders, update MONSTER_DATA in HuntersPath.tsx to use:
```tsx
image: "/assets/bosses/boss_e.png"
```
instead of:
```tsx
icon: "fas fa-user-ninja"
```
