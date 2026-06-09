import { Router } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { requireAuth, getAuthUser } from "../lib/auth";

const router = Router();

function publicUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
  };
}

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const me = getAuthUser(req);

  // Fetch recent transactions
  const recentTxs = await db
    .select()
    .from(transactionsTable)
    .where(
      or(
        eq(transactionsTable.fromUserId, me.id),
        eq(transactionsTable.toUserId, me.id)
      )
    )
    .orderBy(desc(transactionsTable.createdAt))
    .limit(5);

  // Enrich with user data
  const enriched = await Promise.all(
    recentTxs.map(async (tx) => {
      const [fromUser] = await db.select().from(usersTable).where(eq(usersTable.id, tx.fromUserId));
      const [toUser] = await db.select().from(usersTable).where(eq(usersTable.id, tx.toUserId));
      return {
        ...tx,
        amount: parseFloat(tx.amount),
        fromUser: fromUser ? publicUser(fromUser) : undefined,
        toUser: toUser ? publicUser(toUser) : undefined,
      };
    })
  );

  // Total sent (completed)
  const [sentResult] = await db
    .select({ total: sql<number>`coalesce(sum(amount::numeric), 0)` })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.fromUserId, me.id),
        eq(transactionsTable.status, "completed")
      )
    );

  // Total received (completed)
  const [receivedResult] = await db
    .select({ total: sql<number>`coalesce(sum(amount::numeric), 0)` })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.toUserId, me.id),
        eq(transactionsTable.status, "completed")
      )
    );

  // Pending count
  const [pendingResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactionsTable)
    .where(
      and(
        or(
          eq(transactionsTable.fromUserId, me.id),
          eq(transactionsTable.toUserId, me.id)
        )!,
        eq(transactionsTable.status, "pending")
      )
    );

  res.json({
    balance: parseFloat(me.balance),
    totalSent: Number(sentResult.total),
    totalReceived: Number(receivedResult.total),
    pendingCount: Number(pendingResult.count),
    recentTransactions: enriched,
  });
});

export default router;
