import { Router } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, or, desc, and, ilike, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { SendMoneyBody } from "@workspace/api-zod";
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

async function enrichTransaction(tx: typeof transactionsTable.$inferSelect) {
  const [fromUser] = await db.select().from(usersTable).where(eq(usersTable.id, tx.fromUserId));
  const [toUser] = await db.select().from(usersTable).where(eq(usersTable.id, tx.toUserId));
  return {
    ...tx,
    amount: parseFloat(tx.amount),
    fromUser: fromUser ? publicUser(fromUser) : undefined,
    toUser: toUser ? publicUser(toUser) : undefined,
  };
}

router.get("/transactions", requireAuth, async (req, res): Promise<void> => {
  const me = getAuthUser(req);
  const { type, status, search, page = "1", limit = "20" } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  let baseCondition = or(
    eq(transactionsTable.fromUserId, me.id),
    eq(transactionsTable.toUserId, me.id)
  )!;

  const conditions = [baseCondition];

  if (type === "sent") conditions.push(eq(transactionsTable.fromUserId, me.id));
  if (type === "received") conditions.push(eq(transactionsTable.toUserId, me.id));
  if (status) conditions.push(eq(transactionsTable.status, status));

  const txList = await db
    .select()
    .from(transactionsTable)
    .where(and(...conditions))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactionsTable)
    .where(and(...conditions));

  const enriched = await Promise.all(txList.map(enrichTransaction));

  // Filter by search after enrichment (search on user names/emails)
  const filtered = search
    ? enriched.filter((tx) => {
        const s = search.toLowerCase();
        return (
          tx.fromUser?.email?.toLowerCase().includes(s) ||
          tx.toUser?.email?.toLowerCase().includes(s) ||
          tx.fromUser?.firstName?.toLowerCase().includes(s) ||
          tx.toUser?.firstName?.toLowerCase().includes(s) ||
          tx.transactionId?.toLowerCase().includes(s) ||
          tx.note?.toLowerCase().includes(s)
        );
      })
    : enriched;

  res.json({
    transactions: filtered,
    total: Number(count),
    page: pageNum,
    limit: limitNum,
  });
});

router.post("/transactions/send", requireAuth, async (req, res): Promise<void> => {
  const me = getAuthUser(req);
  const parsed = SendMoneyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { toEmail, amount, note, paymentType } = parsed.data;

  if (parseFloat(me.balance) < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const [toUser] = await db.select().from(usersTable).where(eq(usersTable.email, toEmail));
  if (!toUser) {
    res.status(400).json({ error: "Recipient not found" });
    return;
  }

  if (toUser.id === me.id) {
    res.status(400).json({ error: "Cannot send money to yourself" });
    return;
  }

  // Determine status: bank transfers are pending (eCheck simulation)
  const status = paymentType === "bank_transfer" ? "pending" : "completed";
  const transactionId = `TXN-${uuidv4().toUpperCase().slice(0, 12)}`;

  const [tx] = await db
    .insert(transactionsTable)
    .values({
      transactionId,
      fromUserId: me.id,
      toUserId: toUser.id,
      amount: amount.toFixed(2),
      status,
      type: "send",
      note: note ?? null,
    })
    .returning();

  // Update balances only for completed transactions
  if (status === "completed") {
    await db
      .update(usersTable)
      .set({ balance: sql`balance - ${amount.toFixed(2)}` })
      .where(eq(usersTable.id, me.id));

    await db
      .update(usersTable)
      .set({ balance: sql`balance + ${amount.toFixed(2)}` })
      .where(eq(usersTable.id, toUser.id));
  } else {
    // Deduct from sender even for pending (reserve)
    await db
      .update(usersTable)
      .set({ balance: sql`balance - ${amount.toFixed(2)}` })
      .where(eq(usersTable.id, me.id));
  }

  const enriched = await enrichTransaction(tx);
  res.status(201).json(enriched);
});

router.get("/transactions/:transactionId", requireAuth, async (req, res): Promise<void> => {
  const me = getAuthUser(req);
  const rawId = Array.isArray(req.params.transactionId)
    ? req.params.transactionId[0]
    : req.params.transactionId;

  const [tx] = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.transactionId, rawId));

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  if (tx.fromUserId !== me.id && tx.toUserId !== me.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const enriched = await enrichTransaction(tx);
  res.json(enriched);
});

export default router;
