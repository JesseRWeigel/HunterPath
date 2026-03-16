// Story progression — rank-up milestones (triggered on level-up)
export const RANK_MILESTONES: { level: number; title: string; message: string; color: string }[] = [
  { level: 1,  title: "The Awakening",           message: "You awaken to find a shimmering gate before you. A strange instinct compels you forward. Your journey as a Hunter begins.", color: "violet" },
  { level: 3,  title: "D-Rank Certified",         message: "The Hunter's Guild acknowledges your skill. D-Rank gates now open to you. The creatures within are fiercer — prepare yourself.", color: "green" },
  { level: 6,  title: "C-Rank Hunter",            message: "Your reputation grows. Shadows in C-Rank gates whisper of a Hunter who fights without fear. Darker dungeons beckon.", color: "blue" },
  { level: 10, title: "B-Rank Breakthrough",       message: "Few Hunters reach B-Rank. The Guild Commander nods with respect. \"The gates are getting worse,\" she warns. \"Something stirs beyond them.\"", color: "orange" },
  { level: 20, title: "A-Rank — Elite Hunter",     message: "A-Rank. The world watches. Dragons and ancient knights guard these gates. You stand among the strongest Hunters alive.", color: "red" },
  { level: 35, title: "S-Rank — Legend",           message: "S-Rank gates tear at the fabric of reality itself. You are one of the few who dares enter. The void beyond these gates holds secrets older than the world.", color: "purple" },
  { level: 50, title: "Transcendence",            message: "You have reached the pinnacle. The gates themselves seem to respond to your power. Perhaps it is time to be reborn — stronger than before.", color: "amber" },
];

// First-clear celebration text per rank
export const FIRST_CLEAR_TEXT: Record<string, { title: string; message: string }> = {
  E: { title: "First Gate Cleared", message: "You emerge from your first gate, shaking but alive. The Hunter's Guild takes notice — a new Hunter has begun their journey." },
  D: { title: "D-Rank Conquered", message: "The shadows of D-Rank gates no longer frighten you. You've proven you can handle what lurks in the dark. The Guild marks your file: 'Promising.'" },
  C: { title: "C-Rank Vanquished", message: "C-Rank bosses fall before you. Other Hunters whisper your name in the guild halls. The path ahead grows darker — but so does your resolve." },
  B: { title: "B-Rank Breakthrough!", message: "You've done what most Hunters never will — cleared a B-Rank gate. The Guild Commander summons you personally. \"We need Hunters like you. The worst is yet to come.\"" },
  A: { title: "A-Rank Conquered!", message: "Dragons and ancient knights — the guardians of A-Rank gates — have fallen to your blade. The world trembles. You stand among the elite, the chosen few who dare face the abyss." },
  S: { title: "S-Rank — The Impossible", message: "Reality itself bends around you as you emerge from an S-Rank gate. No one believed it possible. The fabric of dimensions whispers your name. You are legend." },
};

// Boss dialogue shown at combat start
export const BOSS_DIALOGUE: Record<string, string[]> = {
  E: [
    "\"You dare enter my burrow? You'll regret this!\"",
    "\"Another Hunter? They never learn...\"",
  ],
  D: [
    "\"I've crushed a dozen Hunters. You're next!\"",
    "\"This dungeon is MY territory!\"",
  ],
  C: [
    "\"You can feel it, can't you? The darkness here is alive.\"",
    "\"Most Hunters flee at this point. Will you?\"",
  ],
  B: [
    "\"I've been waiting for a real challenge. Step forward.\"",
    "\"The mountain itself trembles at my rage.\"",
  ],
  A: [
    "\"Few mortals have stood before me and lived.\"",
    "\"The dragon's flame burns eternal. Can you endure it?\"",
  ],
  S: [
    "\"You stand at the edge of oblivion. Turn back.\"",
    "\"Reality bends. Time fractures. And still you come.\"",
  ],
};

// Unlockable lore entries keyed by player level
export const LORE_ENTRIES: { level: number; title: string; text: string }[] = [
  { level: 1,  title: "What Are Gates?",            text: "Dimensional rifts that appeared across the world without warning. Inside lie monsters, treasure, and mysteries. Hunters are those brave enough to enter." },
  { level: 5,  title: "The Hunter's Guild",          text: "Formed to organize Hunters and manage gate clearance. They rank both Hunters and gates from E (weakest) to S (catastrophic). Guild support keeps cities safe." },
  { level: 10, title: "Spirit Binding",              text: "Some Hunters develop the ability to bind the essence of defeated bosses, creating spirit allies that fight alongside them. The mechanism is poorly understood." },
  { level: 15, title: "The Fatigue Problem",         text: "Prolonged exposure to gate energy causes fatigue — a dulling of the senses that weakens even the strongest Hunters. Rest is not optional; it is survival." },
  { level: 20, title: "Gate Ranks Explained",        text: "E-Rank gates are manageable. D through C require real skill. B-Rank gates have leveled entire city blocks when left unchecked. A and S-Rank gates are existential threats." },
  { level: 30, title: "The Origin of Gates",         text: "No one knows why gates appeared. Some theories suggest a weakening barrier between dimensions. Others point to an ancient experiment gone wrong. The truth remains buried." },
  { level: 40, title: "Rebirth",                    text: "A handful of Hunters have discovered a way to shed their accumulated power and start anew — emerging stronger each time. They call it Rebirth. The cost is everything you've built." },
  { level: 50, title: "Beyond S-Rank",               text: "Rumors persist of gates beyond S-Rank — tears in reality so vast they could swallow nations. If they exist, only a reborn Hunter could hope to survive them." },
];
