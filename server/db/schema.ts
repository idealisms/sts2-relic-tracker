import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  seed: text("seed").notNull(),
  channel: text("channel").notNull(),
  game: text("game").notNull(),
  character: text("character").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const gameStates = pgTable("game_states", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull().references(() => runs.runId),
  gameStateIndex: integer("game_state_index").notNull(),
  relics: text("relics").array().notNull(),
  relicTipMap: jsonb("relic_tip_map"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Run = typeof runs.$inferSelect;
export type GameState = typeof gameStates.$inferSelect;
