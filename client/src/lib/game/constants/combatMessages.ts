// Combat log flavor text
export const PLAYER_ATTACK_MSGS = [
  (dmg: number) => `Hunter strikes for ${dmg} damage!`,
  (dmg: number) => `Hunter lands a solid blow — ${dmg} damage!`,
  (dmg: number) => `Hunter slashes through for ${dmg} damage!`,
  (dmg: number) => `Hunter charges in — ${dmg} damage dealt!`,
  (dmg: number) => `A swift strike connects — ${dmg} damage!`,
  (dmg: number) => `Hunter finds an opening — ${dmg} damage!`,
];
export const BOSS_ATTACK_MSGS: Record<string, ((name: string, dmg: number) => string)[]> = {
  E: [
    (n, d) => `${n} swings wildly — ${d} damage!`,
    (n, d) => `${n} lunges with a crude blade — ${d} damage!`,
  ],
  D: [
    (n, d) => `${n} roars and smashes down — ${d} damage!`,
    (n, d) => `${n} charges with brute force — ${d} damage!`,
  ],
  C: [
    (n, d) => `${n} strikes from the shadows — ${d} damage!`,
    (n, d) => `${n} vanishes and reappears — ${d} damage!`,
  ],
  B: [
    (n, d) => `${n} slams their weapon down — ${d} damage!`,
    (n, d) => `${n} hurls a massive blow — ${d} damage!`,
  ],
  A: [
    (n, d) => `${n} unleashes dragonfire — ${d} damage!`,
    (n, d) => `${n} swings a blazing sword — ${d} damage!`,
  ],
  S: [
    (n, d) => `${n} tears through reality — ${d} damage!`,
    (n, d) => `${n} channels the void — ${d} damage!`,
  ],
};
export const BOSS_BLOCK_MSGS = [
  (name: string) => `${name}'s attack is deflected!`,
  (name: string) => `Hunter dodges ${name}'s strike!`,
  (name: string) => `${name}'s blow glances off!`,
];
export const CRIT_MSGS = [
  (dmg: number) => `💥 Critical hit! ${dmg} damage!`,
  (dmg: number) => `💥 Devastating blow — ${dmg} damage!`,
  (dmg: number) => `💥 Hunter finds a weak spot — ${dmg} critical damage!`,
];
export const SPIRIT_ABILITY_MSGS: Record<string, string[]> = {
  berserker_rage: [
    "⚔️ Berserker Rage surges — damage increased!",
    "⚔️ Rage takes hold — striking harder!",
  ],
  shadow_step: [
    "🌑 Shadow Step — enhanced strike!",
    "🌑 Slipping through shadows for a precise hit!",
  ],
  ethereal_shield: [
    "🛡️ Ethereal Shield shimmers into place!",
  ],
  vitality_aura: [
    "💚 Vitality Aura pulses with healing energy",
  ],
  mana_shield: [
    "🔮 Mana Shield absorbs incoming damage",
  ],
};
export const BOSS_PHASE_MSGS: Record<string, string[]> = {
  "75": [
    "The boss staggers but fights on!",
    "Blood drips — the boss grows desperate!",
  ],
  "50": [
    "The boss is wounded — halfway down!",
    "⚠️ The boss enters a frenzy!",
  ],
  "25": [
    "The boss is near death — finish it!",
    "💀 The boss makes a last stand!",
  ],
};
