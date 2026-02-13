# Hunter's Path - ComfyUI Asset Generation Guide

## Quick Start (Your 5090 Machine)

### 1. Install ComfyUI
```bash
# Clone ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# Install dependencies
pip install -r requirements.txt

# Run (requires GPU)
python main.py
```

### 2. Download Models
Place these in `ComfyUI/models/unet/`:
- **flux1-dev.safetensors** - Main model (best quality)
- **flux1-schnell.safetensors** - Fast alternative

Place in `ComfyUI/models/clip/`:
- **flux1-dev-clip.safetensors**

### 3. Load the Workflow
1. Open ComfyUI at http://localhost:8188
2. Click "Load" (top right) → select `comfyui_workflow.json`
3. Edit the prompt in the TextEncode nodes
4. Click "Queue Prompt"

---

## Prompt Library for Hunter's Path

### Monsters (by Rank)
```
E-Rank: small goblin warrior, ragged armor, crude weapons, dark cave, pixel art, 8-bit
D-Rank: orc brute, muscular, green skin, bone club, dungeon setting, pixel art
C-Rank: skeleton mage, dark robes, glowing blue flames, skeletal, pixel art
B-Rank: troll regenerative, large imposing, mountain cave, pixel art
A-Rank: demon lord, horns, wings, hellfire, epic pose, dark fantasy
S-Rank: ancient dragon, cosmic scales, interdimensional, godlike, epic fantasy
```

### Bosses (Unique per Type)
```
Goblin Warlord: goblin leader, war banner, multiple weapons, epic pose
Orc Chieftain: massive orc, tribal tattoos, legendary weapon, commanding pose
Lich King: skeletal monarch, crown of bones, necromantic aura, floating
Vampire Count: gothic noble, cape, red eyes, elegant yet terrifying
Dragon Tyrant: elder dragon, scorched earth, wings spread, devastating
Abyssal Horror: cosmic entity, tentacles, otherworldly, mind-bending
```

### Spirit Legion (Bound Spirits)
```
Wolf Spirit: ghostly wolf, blue ethereal, fierce pose, spirit form
Knight Spirit: armored spirit, sword raised, blue flame, noble
Archer Spirit: elf archer ghost, bow drawn, forest green, agile
Mage Spirit: robed wizard, arcane symbols, purple energy, wise
Dragon Spirit: mini dragon, cute yet fierce, playful, powerful aura
```

### Gate Backgrounds
```
E-Rank Gate: mossy cave, green bioluminescent, dripping water, rocky
D-Rank Gate: torch-lit dungeon, stone walls, chains, dark
C-Rank Gate: moonlit forest, purple mist, ancient trees, mystical
B-Rank Gate: mountain pass, snow, storm clouds, dramatic
A-Rank Gate: grand hall, golden light, pillars, majestic
S-Rank Gate: cosmic void, stars, nebula, interdimensional portal
```

### UI Elements
```
Health Bar: fantasy health bar, red, ornate frame, pixel art style
Mana Bar: fantasy mana bar, blue, magical glow, pixel art style
Button: dark fantasy button, golden border, hover glow, pixel art
Icon - Sword: pixel art sword, steel, detailed, RPG icon
Icon - Shield: pixel art shield, heraldic, detailed, RPG icon
Icon - Potion: pixel art potion, bubbling, colorful, RPG icon
```

---

## Output Files

After generation, place images in:
```
client/public/assets/
├── monsters/     # E_rank_goblin.png, D_rank_orc.png, etc.
├── bosses/       # goblin_warlord.png, dragon_tyrant.png
├── spirits/      # wolf_spirit.png, knight_spirit.png
├── backgrounds/  # e_rank_cave.png, s_rank_cosmic.png
├── ui/           # health_bar.png, button.png
└── effects/      # slash_effect.png, magic_impact.png
```

The game code is already set up to look for images in these folders!

---

## Automation (Future)

Once you have images in the folders, the game automatically uses them.
No code changes needed - just drop images with the right names.
