import { Router } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, ne, desc, sql } from "drizzle-orm";
import { requireAuth, getAuthUser } from "../lib/auth";
import type { Request, Response, NextFunction } from "express";

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

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = getAuthUser(req);
  if (!user.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

// Stats
router.get("/admin/stats", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`count(*)` }).from(usersTable);
  const [{ totalTransactions }] = await db.select({ totalTransactions: sql<number>`count(*)` }).from(transactionsTable);
  const [{ totalVolume }] = await db
    .select({ totalVolume: sql<number>`coalesce(sum(amount::numeric), 0)` })
    .from(transactionsTable)
    .where(eq(transactionsTable.status, "completed"));
  const [{ suspendedUsers }] = await db
    .select({ suspendedUsers: sql<number>`count(*)` })
    .from(usersTable)
    .where(eq(usersTable.isSuspended, true));

  res.json({
    totalUsers: Number(totalUsers),
    totalTransactions: Number(totalTransactions),
    totalVolume: Number(totalVolume),
    suspendedUsers: Number(suspendedUsers),
  });
});

// All users
router.get("/admin/users", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(
    users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      balance: u.balance,
      isAdmin: u.isAdmin,
      isSuspended: u.isSuspended,
      createdAt: u.createdAt,
    }))
  );
});

// All transactions
router.get("/admin/transactions", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const txs = await db
    .select()
    .from(transactionsTable)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(200);

  const enriched = await Promise.all(
    txs.map(async (tx) => {
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

  res.json(enriched);
});

// Update user balance
router.patch("/admin/users/:userId/balance", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(rawId, 10);
  const { balance } = req.body;

  if (isNaN(userId) || typeof balance !== "number" || balance < 0) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ balance: balance.toFixed(2) })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ id: updated.id, balance: parseFloat(updated.balance) });
});

// Suspend / unsuspend user
router.post("/admin/users/:userId/suspend", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(rawId, 10);
  const { suspend } = req.body;

  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isSuspended: !!suspend })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ id: updated.id, isSuspended: updated.isSuspended });
});

// Delete user
router.delete("/admin/users/:userId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(rawId, 10);

  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [deleted] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ message: "User deleted" });
});

// Delete transaction
router.delete("/admin/transactions/:txId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.txId) ? req.params.txId[0] : req.params.txId;
  const txId = parseInt(rawId, 10);

  if (isNaN(txId)) {
    res.status(400).json({ error: "Invalid transaction ID" });
    return;
  }

  const [deleted] = await db
    .delete(transactionsTable)
    .where(eq(transactionsTable.id, txId))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json({ message: "Transaction deleted" });
});

export default router;
