import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const disputesTable = pgTable("disputes", {
  id: serial("id").primaryKey(),
  caseId: text("case_id").notNull().unique(),
  userId: integer("user_id").notNull(),
  transactionId: text("transaction_id").notNull(),
  category: text("category").notNull(), // unauthorised | item_not_received | item_not_as_described | billing | other
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // open | under_review | resolved | closed
  resolution: text("resolution"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDisputeSchema = createInsertSchema(disputesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputesTable.$inferSelect;
