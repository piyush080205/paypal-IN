import { Router } from "express";
import { db, disputesTable, transactionsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, getAuthUser } from "../lib/auth";
import { v4 as uuidv4 } from "uuid";

const router = Router();

function formatDispute(d: typeof disputesTable.$inferSelect) {
  return { ...d };
}

// Get current user's disputes
router.get("/resolution-centre", requireAuth, async (req, res): Promise<void> => {
  const me = getAuthUser(req);
  const disputes = await db
    .select()
    .from(disputesTable)
    .where(eq(disputesTable.userId, me.id))
    .orderBy(desc(disputesTable.createdAt));
  res.json(disputes.map(formatDispute));
});

// Open a new dispute
router.post("/resolution-centre", requireAuth, async (req, res): Promise<void> => {
  const me = getAuthUser(req);
  const { transactionId, category, description } = req.body;

  if (!transactionId || !category || !description) {
    res.status(400).json({ error: "transactionId, category and description are required" });
    return;
  }

  // Verify transaction belongs to user
  const [tx] = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.transactionId, transactionId));

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  if (tx.fromUserId !== me.id && tx.toUserId !== me.id) {
    res.status(403).json({ error: "You are not party to this transaction" });
    return;
  }

  // Check no existing open dispute for same transaction by same user
  const [existing] = await db
    .select()
    .from(disputesTable)
    .where(and(
      eq(disputesTable.userId, me.id),
      eq(disputesTable.transactionId, transactionId)
    ));

  if (existing && existing.status !== "closed") {
    res.status(409).json({ error: "You already have an open dispute for this transaction" });
    return;
  }

  const caseId = `CASE-${uuidv4().toUpperCase().slice(0, 10)}`;
  const [dispute] = await db
    .insert(disputesTable)
    .values({ caseId, userId: me.id, transactionId, category, description })
    .returning();

  res.status(201).json(formatDispute(dispute));
});

// Get a single dispute
router.get("/resolution-centre/:caseId", requireAuth, async (req, res): Promise<void> => {
  const me = getAuthUser(req);
  const rawId = Array.isArray(req.params.caseId) ? req.params.caseId[0] : req.params.caseId;

  const [dispute] = await db
    .select()
    .from(disputesTable)
    .where(eq(disputesTable.caseId, rawId));

  if (!dispute) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  if (dispute.userId !== me.id && !me.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(formatDispute(dispute));
});

export default router;
