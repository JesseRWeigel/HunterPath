import { Chapter } from '../types/rpg';

export const STORY_CHAPTERS: Chapter[] = [
  {
    id: 1,
    name: "Awakening",
    nameJapanese: "覚醒",
    nameRomanji: "Kakusei",
    description: "The beginning of your journey as a Hunter. Learn the basics of combat and discover your hidden potential.",
    levelRequirement: 1,
    dungeons: [
      {
        id: "chap1_dungeon1",
        name: "Training Grounds",
        description: "A safe environment to practice your combat skills.",
        chapterId: 1,
        levelRequirement: 1,
        difficulty: "easy",
        enemies: [
          {
            id: "training_dummy",
            name: "Training Dummy",
            type: "normal",
            level: 1,
            hp: 50,
            maxHp: 50,
            attack: 5,
            defense: 2,
            skills: [],
            drops: {
              items: [
                { itemId: "basic_sword", chance: 0.3 },
                { itemId: "health_potion", chance: 0.5 }
              ],
              gold: { min: 10, max: 20 },
              exp: 15
            }
          }
        ],
        rewards: [
          { type: "exp", value: 25, guaranteed: true },
          { type: "item", value: "basic_equipment", guaranteed: true }
        ],
        completed: false
      }
    ],
    npcs: [
      {
        id: "master_trainer",
        name: "Master Trainer",
        role: "trainer",
        chapterId: 1,
        dialogue: [
          {
            id: "welcome",
            text: "Welcome, young Hunter. I will teach you the basics of combat.",
            conditions: [],
            responses: [
              { text: "I'm ready to learn", action: "story", value: "training_start" }
            ]
          }
        ],
        quests: [
          {
            id: "basic_training",
            name: "Basic Training",
            description: "Complete your first combat training session.",
            type: "story",
            requirements: [],
            objectives: [
              {
                id: "defeat_dummy",
                description: "Defeat the training dummy",
                type: "kill",
                target: "training_dummy",
                current: 0,
                required: 1,
                completed: false
              }
            ],
            rewards: [
              { type: "exp", value: 50 },
              { type: "skill", value: "basic_attack" }
            ],
            completed: false
          }
        ]
      }
    ],
    rewards: [
      { type: "skill", value: "shadow_extraction", description: "Learn to extract shadows from defeated enemies" }
    ],
    completed: false
  }
];

export const getChapterById = (id: number): Chapter | undefined => {
  return STORY_CHAPTERS.find(chapter => chapter.id === id);
};

export const getCurrentChapter = (playerLevel: number): Chapter => {
  return STORY_CHAPTERS.find(chapter => chapter.levelRequirement <= playerLevel) || STORY_CHAPTERS[0];
};

export const getNextChapter = (currentChapterId: number): Chapter | undefined => {
  const currentIndex = STORY_CHAPTERS.findIndex(chapter => chapter.id === currentChapterId);
  return STORY_CHAPTERS[currentIndex + 1];
};
