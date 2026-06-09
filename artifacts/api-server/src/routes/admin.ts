import { Router } from "express";
import { db, usersTable, transactionsTable, disputesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
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

// ─── Stats ────────────────────────────────────────────────────────────────────

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
  const [{ openDisputes }] = await db
    .select({ openDisputes: sql<number>`count(*)` })
    .from(disputesTable)
    .where(eq(disputesTable.status, "open"));

  res.json({
    totalUsers: Number(totalUsers),
    totalTransactions: Number(totalTransactions),
    totalVolume: Number(totalVolume),
    suspendedUsers: Number(suspendedUsers),
    openDisputes: Number(openDisputes),
  });
});

// ─── Users ────────────────────────────────────────────────────────────────────

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

router.patch("/admin/users/:userId/balance", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(String(req.params.userId), 10);
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

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: updated.id, balance: parseFloat(updated.balance) });
});

router.post("/admin/users/:userId/suspend", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(String(req.params.userId), 10);
  const { suspend } = req.body;

  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ isSuspended: !!suspend })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: updated.id, isSuspended: updated.isSuspended });
});

router.delete("/admin/users/:userId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(String(req.params.userId), 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, userId)).returning();
  if (!deleted) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ message: "User deleted" });
});

// ─── Transactions ─────────────────────────────────────────────────────────────

// Admin: create a transaction on any account with a custom date
router.post("/admin/transactions/create", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { fromUserId, toUserId, amount, note, type, status, date, updateBalances } = req.body;

  if (!fromUserId || !toUserId || !amount || isNaN(parseFloat(amount))) {
    res.status(400).json({ error: "fromUserId, toUserId and amount are required" });
    return;
  }
  if (fromUserId === toUserId) {
    res.status(400).json({ error: "Sender and recipient must be different" });
    return;
  }

  const [fromUser] = await db.select().from(usersTable).where(eq(usersTable.id, fromUserId));
  const [toUser]   = await db.select().from(usersTable).where(eq(usersTable.id, toUserId));
  if (!fromUser || !toUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const txStatus = status || "completed";
  const txDate   = date ? new Date(date) : new Date();
  const { v4: uuidv4 } = await import("uuid");
  const transactionId  = `TXN-${uuidv4().toUpperCase().slice(0, 12)}`;
  const amtStr = parseFloat(amount).toFixed(2);

  const [tx] = await db
    .insert(transactionsTable)
    .values({
      transactionId,
      fromUserId,
      toUserId,
      amount: amtStr,
      status: txStatus,
      type: type || "send",
      note: note || null,
      createdAt: txDate,
    })
    .returning();

  // Optionally update balances
  if (updateBalances !== false) {
    if (txStatus === "completed") {
      await db.update(usersTable).set({ balance: sql`balance - ${amtStr}::numeric` }).where(eq(usersTable.id, fromUserId));
      await db.update(usersTable).set({ balance: sql`balance + ${amtStr}::numeric` }).where(eq(usersTable.id, toUserId));
    } else if (txStatus === "pending") {
      await db.update(usersTable).set({ balance: sql`balance - ${amtStr}::numeric` }).where(eq(usersTable.id, fromUserId));
    }
  }

  res.status(201).json({ ...tx, amount: parseFloat(tx.amount) });
});

router.get("/admin/transactions", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const txs = await db
    .select()
    .from(transactionsTable)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(300);

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

// Force-complete a pending transaction
router.post("/admin/transactions/:txId/complete", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const txId = parseInt(String(req.params.txId), 10);
  if (isNaN(txId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId));
  if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }
  if (tx.status !== "pending") { res.status(400).json({ error: "Transaction is not pending" }); return; }

  // Complete it — recipient gets balance
  await db
    .update(usersTable)
    .set({ balance: sql`balance + ${tx.amount}::numeric` })
    .where(eq(usersTable.id, tx.toUserId));

  const [updated] = await db
    .update(transactionsTable)
    .set({ status: "completed" })
    .where(eq(transactionsTable.id, txId))
    .returning();

  res.json({ ...updated, amount: parseFloat(updated.amount) });
});

// Reverse / refund a completed transaction
router.post("/admin/transactions/:txId/reverse", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const txId = parseInt(String(req.params.txId), 10);
  if (isNaN(txId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId));
  if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }
  if (tx.status !== "completed") { res.status(400).json({ error: "Only completed transactions can be reversed" }); return; }

  // Verify recipient still has enough balance
  const [toUser] = await db.select().from(usersTable).where(eq(usersTable.id, tx.toUserId));
  if (!toUser || parseFloat(toUser.balance) < parseFloat(tx.amount)) {
    res.status(400).json({ error: "Recipient has insufficient balance to reverse this transaction" });
    return;
  }

  await db
    .update(usersTable)
    .set({ balance: sql`balance - ${tx.amount}::numeric` })
    .where(eq(usersTable.id, tx.toUserId));

  await db
    .update(usersTable)
    .set({ balance: sql`balance + ${tx.amount}::numeric` })
    .where(eq(usersTable.id, tx.fromUserId));

  const [updated] = await db
    .update(transactionsTable)
    .set({ status: "declined" })
    .where(eq(transactionsTable.id, txId))
    .returning();

  res.json({ ...updated, amount: parseFloat(updated.amount) });
});

// Update transaction status directly
router.patch("/admin/transactions/:txId/status", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const txId = parseInt(String(req.params.txId), 10);
  const { status } = req.body;
  if (isNaN(txId) || !["pending", "completed", "declined"].includes(status)) {
    res.status(400).json({ error: "Invalid parameters" }); return;
  }
  const [updated] = await db
    .update(transactionsTable)
    .set({ status })
    .where(eq(transactionsTable.id, txId))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, amount: parseFloat(updated.amount) });
});

router.delete("/admin/transactions/:txId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const txId = parseInt(String(req.params.txId), 10);
  if (isNaN(txId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [deleted] = await db.delete(transactionsTable).where(eq(transactionsTable.id, txId)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ message: "Transaction deleted" });
});

// ─── Disputes / Resolution Centre ────────────────────────────────────────────

// Admin: initiate a dispute case for any user with a custom date
router.post("/admin/disputes/create", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { userId, transactionId, category, description, status, date } = req.body;

  if (!userId || !transactionId || !category || !description) {
    res.status(400).json({ error: "userId, transactionId, category, description are required" });
    return;
  }

  const caseDate = date ? new Date(date) : new Date();
  const { v4: uuidv4 } = await import("uuid");
  const caseId = `CASE-${uuidv4().toUpperCase().slice(0, 10)}`;

  const [dispute] = await db
    .insert(disputesTable)
    .values({
      caseId,
      userId,
      transactionId,
      category,
      description,
      status: status || "open",
      createdAt: caseDate,
      updatedAt: caseDate,
    })
    .returning();

  res.status(201).json(dispute);
});

router.get("/admin/disputes", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const disputes = await db
    .select()
    .from(disputesTable)
    .orderBy(desc(disputesTable.createdAt));

  const enriched = await Promise.all(
    disputes.map(async (d) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, d.userId));
      return { ...d, user: user ? publicUser(user) : undefined };
    })
  );

  res.json(enriched);
});

router.patch("/admin/disputes/:caseId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const rawId = String(req.params.caseId);
  const { status, resolution, adminNote } = req.body;

  const allowed = ["open", "under_review", "resolved", "closed"];
  if (status && !allowed.includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }

  const updates: Partial<{ status: string; resolution: string; adminNote: string; updatedAt: Date }> = {
    updatedAt: new Date(),
  };
  if (status) updates.status = status;
  if (resolution !== undefined) updates.resolution = resolution;
  if (adminNote !== undefined) updates.adminNote = adminNote;

  const [updated] = await db
    .update(disputesTable)
    .set(updates)
    .where(eq(disputesTable.caseId, rawId))
    .returning();

  if (!updated) { res.status(404).json({ error: "Case not found" }); return; }
  res.json(updated);
});

router.delete("/admin/disputes/:caseId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const rawId = String(req.params.caseId);
  const [deleted] = await db.delete(disputesTable).where(eq(disputesTable.caseId, rawId)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ message: "Case deleted" });
});

export default router;
