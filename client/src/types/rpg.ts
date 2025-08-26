// RPG Core Types

export interface RPGPlayer {
  id: string;
  name: string;
  level: number;
  exp: number;
  expNext: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  
  // RPG Stats
  stats: {
    strength: number;
    agility: number;
    intelligence: number;
    vitality: number;
    luck: number;
  };
  
  // RPG Systems
  skills: Skill[];
  equipment: RPGEquipment;
  inventory: RPGItem[];
  
  // Story Progress
  currentChapter: number;
  chapterProgress: ChapterProgress;
  
  // RPG Currency
  gold: number;
  skillPoints: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'combat' | 'utility' | 'passive';
  level: number;
  maxLevel: number;
  cost: number;
  requirements: SkillRequirement[];
  effects: SkillEffect[];
}

export interface SkillRequirement {
  type: 'level' | 'skill' | 'stat';
  value: number;
  skillId?: string;
  statName?: string;
}

export interface SkillEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff';
  value: number;
  target: 'self' | 'enemy' | 'all';
  duration?: number;
}

export interface RPGEquipment {
  weapon?: RPGItem;
  armor?: RPGItem;
  accessory?: RPGItem;
  helmet?: RPGItem;
  boots?: RPGItem;
}

export interface RPGItem {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  quality: number; // 1-100
  
  // RPG Stats
  stats?: {
    strength?: number;
    agility?: number;
    intelligence?: number;
    vitality?: number;
    luck?: number;
  };
  
  // Equipment Properties
  equipmentSlot?: keyof RPGEquipment;
  setBonus?: string;
  setId?: string;
  
  // Combat Properties
  damage?: number;
  defense?: number;
  special?: string;
}

export interface Chapter {
  id: number;
  name: string;
  nameJapanese: string;
  nameRomanji: string;
  description: string;
  levelRequirement: number;
  dungeons: Dungeon[];
  npcs: NPC[];
  rewards: ChapterReward[];
  completed: boolean;
}

export interface ChapterProgress {
  currentChapter: number;
  completedChapters: number[];
  chapterData: { [chapterId: number]: ChapterData };
}

export interface ChapterData {
  completed: boolean;
  dungeonsCompleted: string[];
  npcsMet: string[];
  rewardsClaimed: string[];
}

export interface Dungeon {
  id: string;
  name: string;
  description: string;
  chapterId: number;
  levelRequirement: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'boss';
  enemies: Enemy[];
  rewards: DungeonReward[];
  completed: boolean;
}

export interface Enemy {
  id: string;
  name: string;
  type: 'normal' | 'elite' | 'boss';
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  skills: string[];
  drops: DropTable;
}

export interface DropTable {
  items: { itemId: string; chance: number }[];
  gold: { min: number; max: number };
  exp: number;
}

export interface DungeonReward {
  type: 'item' | 'gold' | 'exp' | 'skill';
  value: number | string;
  guaranteed: boolean;
}

export interface ChapterReward {
  type: 'item' | 'gold' | 'exp' | 'skill' | 'equipment';
  value: number | string;
  description: string;
}

export interface NPC {
  id: string;
  name: string;
  role: 'quest_giver' | 'merchant' | 'trainer' | 'story';
  chapterId: number;
  dialogue: NPCDialogue[];
  quests: Quest[];
}

export interface NPCDialogue {
  id: string;
  text: string;
  conditions: DialogueCondition[];
  responses: DialogueResponse[];
}

export interface DialogueCondition {
  type: 'chapter' | 'quest' | 'item' | 'skill';
  value: number | string;
  operator: 'equals' | 'greater' | 'less' | 'has';
}

export interface DialogueResponse {
  text: string;
  action: 'quest' | 'trade' | 'train' | 'story';
  value?: string;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'story' | 'side' | 'daily';
  requirements: QuestRequirement[];
  objectives: QuestObjective[];
  rewards: QuestReward[];
  completed: boolean;
}

export interface QuestRequirement {
  type: 'level' | 'chapter' | 'item' | 'skill';
  value: number | string;
}

export interface QuestObjective {
  id: string;
  description: string;
  type: 'kill' | 'collect' | 'talk' | 'explore';
  target: string;
  current: number;
  required: number;
  completed: boolean;
}

export interface QuestReward {
  type: 'exp' | 'gold' | 'item' | 'skill';
  value: number | string;
}

// RPG Game State
export interface RPGGameState {
  player: RPGPlayer;
  currentDungeon?: Dungeon;
  currentEnemy?: Enemy;
  inCombat: boolean;
  combatState?: CombatState;
  storyState: StoryState;
  uiState: UIState;
}

export interface CombatState {
  turn: number;
  playerHp: number;
  enemyHp: number;
  effects: CombatEffect[];
  log: CombatLogEntry[];
}

export interface CombatEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  target: 'player' | 'enemy';
  duration: number;
  stats: Partial<RPGPlayer['stats']>;
}

export interface CombatLogEntry {
  turn: number;
  message: string;
  type: 'attack' | 'skill' | 'effect' | 'system';
}

export interface StoryState {
  currentChapter: number;
  chapterProgress: ChapterProgress;
  activeQuests: Quest[];
  completedQuests: string[];
}

export interface UIState {
  currentScreen: 'main' | 'character' | 'inventory' | 'skills' | 'quests' | 'combat';
  modalOpen?: string;
  selectedItem?: string;
  selectedSkill?: string;
}
