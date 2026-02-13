# Hunter's Path - Asset Generation Guide

## Quick Start

### Option 1: ComfyUI (Recommended for your 5090)

1. **Install ComfyUI** on your 5090 machine:
   ```bash
   git clone https://github.com/comfyanonymous/ComfyUI
   cd ComfyUI
   pip install -r requirements.txt
   ```

2. **Download Models** to `ComfyUI/models/`:
   - `flux1-dev.safetensors` - Main model (from https://huggingface.co/black-forest-labs/FLUX.1-dev)
   - `flux1-schnell.safetensors` - Fast model (optional)

3. **Load the workflow**: Open `comfyui_workflow.json` in ComfyUI

4. **Generate assets** using the prompts below

---

### Option 2: HuggingFace Inference API (Free tier)

Set `HF_TOKEN` environment variable, then use the included `generate_image.py` script.

---

## Asset Prompts

### Monsters (E-Rank to S-Rank)

| Rank | Name | ComfyUI Prompt | HF Prompt |
|------|------|-----------------|-----------|
| E | Goblin Warrior | "goblin warrior pixel art sprite, 8-bit, dark fantasy, green skin, crude weapons, menacing, game asset, RPG" | Same |
| D | Orc Berserker | "orc berserker pixel art sprite, 8-bit, dark fantasy, muscular, red eyes, blood rage, game asset, RPG" | Same |
| C | Dark Elf Assassin | "dark elf assassin pixel art sprite, 8-bit, dark fantasy, shadowy, deadly precision, sleek armor, game asset, RPG" | Same |
| B | Troll Chieftain | "troll chieftain pixel art sprite, 8-bit, dark fantasy, massive, stone-like skin, bone club, game asset, RPG" | Same |
| A | Dragon Knight | "dragon knight pixel art sprite, 8-bit, dark fantasy, legendary warrior, dragon scale armor, flaming sword, game asset, RPG" | Same |
| S | Void Lord | "void lord pixel art sprite, 8-bit, dark fantasy, cosmic horror, darkness aura, ethereal, game asset, RPG" | Same |

### Bosses (Elite Versions)

| Rank | Name | Prompt |
|------|------|--------|
| E | Goblin King | "goblin king elite boss, pixel art, 8-bit, dark fantasy, crown, larger, more menacing, game asset" |
| D | Orc Warlord | "orc warlord elite boss, pixel art, 8-bit, dark fantasy, massive, war paint, dual axes, game asset" |
| C | Shadow Blade | "shadow blade elite boss, pixel art, 8-bit, dark fantasy, dual daggers, hooded, deadly aura, game asset" |
| B | Elder Troll | "elder troll elite boss, pixel art, 8-bit, dark fantasy, ancient, regrowing, massive club, game asset" |
| A | Dragon Emperor | "dragon emperor elite boss, pixel art, 8-bit, dark fantasy, full dragon form, wings, fire breath, game asset" |
| S | Void Overlord | "void overlord elite boss, pixel art, 8-bit, dark fantasy, cosmic entity, reality bending, game asset" |

### Spirit Legion (Bound Spirits)

| Spirit Type | Prompt |
|-------------|--------|
| Warrior Spirit | "warrior spirit, ghostly, ethereal, pixel art, 8-bit, dark fantasy, bound soul, loyal companion, game asset" |
| Mage Spirit | "mage spirit, ghostly, ethereal, pixel art, 8-bit, dark fantasy, magical aura, arcane, game asset" |
| Assassin Spirit | "assassin spirit, ghostly, ethereal, pixel art, 8-bit, dark fantasy, shadow, stealth, game asset" |
| Guardian Spirit | "guardian spirit, ghostly, ethereal, pixel art, 8-bit, dark fantasy, protective, shield, game asset" |

### Gate Backgrounds

| Rank | Environment | Prompt |
|------|-------------|--------|
| E | Mossy Cave | "dungeon background, mossy cave, pixel art, 8-bit, dark fantasy, green moss, wet rocks, game level" |
| D | Torch Dungeon | "dungeon background, torch lit, pixel art, 8-bit, dark fantasy, warm orange light, iron bars, game level" |
| C | Moonlit Forest | "dungeon background, moonlit forest, pixel art, 8-bit, dark fantasy, blue moonlight, twisted trees, game level" |
| B | Mountain Pass | "dungeon background, mountain pass, pixel art, 8-bit, dark fantasy, jagged peaks, winds, game level" |
| A | Grand Hall | "dungeon background, grand hall, pixel art, 8-bit, dark fantasy, golden, pillars, dragon banners, game level" |
| S | Cosmic Void | "dungeon background, cosmic void, pixel art, 8-bit, dark fantasy, stars, nebula, reality bending, game level" |

### UI Elements

| Element | Prompt |
|---------|--------|
| HP Bar Icon | "health icon, pixel art, 8-bit, dark fantasy, red heart, game UI, RPG" |
| MP Bar Icon | "mana icon, pixel art, 8-bit, dark fantasy, blue crystal, game UI, RPG" |
| EXP Bar Icon | "experience icon, pixel art, 8-bit, dark fantasy, golden star, game UI, RPG" |
| Attack Button | "sword icon, pixel art, 8-bit, dark fantasy, attack, game UI, RPG" |
| Defend Button | "shield icon, pixel art, 8-bit, dark fantasy, defense, game UI, RPG" |
| Skill Button | "magic spell icon, pixel art, 8-bit, dark fantasy, abilities, game UI, RPG" |

### Effects

| Effect | Prompt |
|--------|--------|
| Attack Slash | "sword slash effect, pixel art, 8-bit, dark fantasy, combat, slash, hit effect, game VFX" |
| Critical Hit | "critical hit effect, pixel art, 8-bit, dark fantasy, explosion, stars, damage number, game VFX" |
| Level Up | "level up celebration, pixel art, 8-bit, dark fantasy, sparkles, particles, game VFX" |
| Spirit Bind | "spirit binding effect, pixel art, 8-bit, dark fantasy, soul capture, ethereal, magic circle, game VFX" |
| Heal | "healing effect, pixel art, 8-bit, dark fantasy, green glow, recovery, game VFX" |
| Gold Drop | "gold coin drop, pixel art, 8-bit, dark fantasy, treasure, loot, game VFX" |

---

## Output Requirements

When generating, use these specifications:

- **Format**: PNG with transparency where needed
- **Size**: 512x512 or 1024x1024 (can be scaled down)
- **Style**: 8-bit pixel art, dark fantasy
- **Background**: Transparent for sprites, solid for backgrounds

## File Naming

Save generated assets to:
- `client/public/assets/monsters/[rank]-[name].png`
- `client/public/assets/bosses/[rank]-[name].png`
- `client/public/assets/spirits/[type]-[name].png`
- `client/public/assets/backgrounds/[rank]-[environment].png`
- `client/public/assets/ui/[element].png`
- `client/public/assets/effects/[effect-name].png`
