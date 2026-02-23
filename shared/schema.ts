import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  jsonb,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const gameStates = pgTable("game_states", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  player: jsonb("player").notNull(),
  gates: jsonb("gates").notNull(),
  gold: integer("gold").default(50),
  gameTime: jsonb("game_time").notNull(),
  daily: jsonb("daily").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// New tables for Phase 1: Gate History & Statistics
export const gateRuns = pgTable("gate_runs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  gateId: varchar("gate_id").notNull(),
  gateName: text("gate_name").notNull(),
  gateRank: text("gate_rank").notNull(),
  gateRankIdx: integer("gate_rank_idx").notNull(),
  bossName: text("boss_name").notNull(),
  victory: boolean("victory").notNull(),
  duration: integer("duration").notNull(), // in ticks
  expGained: integer("exp_gained").notNull(),
  goldGained: integer("gold_gained").notNull(),
  damageDealt: integer("damage_dealt").notNull(),
  damageTaken: integer("damage_taken").notNull(),
  playerLevel: integer("player_level").notNull(),
  playerStats: jsonb("player_stats").notNull(),
  drops: jsonb("drops").notNull(), // array of items
  spiritBound: boolean("spirit_bound").default(false),
  spiritName: text("spirit_name"),
  combatLog: jsonb("combat_log").notNull(), // array of strings
  createdAt: timestamp("created_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  achievementId: text("achievement_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "combat", "progression", "collection", "daily"
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  progress: integer("progress").default(0),
  maxProgress: integer("max_progress").default(1),
  isUnlocked: boolean("is_unlocked").default(false),
});

export const playerStats = pgTable("player_stats", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  totalGatesCompleted: integer("total_gates_completed").default(0),
  totalGatesFailed: integer("total_gates_failed").default(0),
  totalExpGained: integer("total_exp_gained").default(0),
  totalGoldGained: integer("total_gold_gained").default(0),
  totalDamageDealt: integer("total_damage_dealt").default(0),
  totalDamageTaken: integer("total_damage_taken").default(0),
  totalSpiritsBound: integer("total_spirits_bound").default(0),
  highestGateRank: text("highest_gate_rank").default("E"),
  longestCombat: integer("longest_combat").default(0),
  fastestVictory: integer("fastest_victory"),
  totalPlayTime: integer("total_play_time").default(0), // in seconds
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGameStateSchema = createInsertSchema(gameStates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGateRunSchema = createInsertSchema(gateRuns).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  unlockedAt: true,
});

export const insertPlayerStatsSchema = createInsertSchema(playerStats).omit({
  id: true,
  lastUpdated: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type GameState = typeof gameStates.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;
export type GateRun = typeof gateRuns.$inferSelect;
export type InsertGateRun = z.infer<typeof insertGateRunSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type PlayerStats = typeof playerStats.$inferSelect;
export type InsertPlayerStats = z.infer<typeof insertPlayerStatsSchema>;
