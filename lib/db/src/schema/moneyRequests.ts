import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const moneyRequestsTable = pgTable("money_requests", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | declined
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMoneyRequestSchema = createInsertSchema(moneyRequestsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMoneyRequest = z.infer<typeof insertMoneyRequestSchema>;
export type MoneyRequest = typeof moneyRequestsTable.$inferSelect;
