import { Router } from "express";
import { db, usersTable, moneyRequestsTable, transactionsTable } from "@workspace/db";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { RequestMoneyBody, ApproveRequestParams, DeclineRequestParams } from "@workspace/api-zod";
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

async function enrichRequest(mr: typeof moneyRequestsTable.$inferSelect) {
  const [fromUser] = await db.select().from(usersTable).where(eq(usersTable.id, mr.fromUserId));
  const [toUser] = await db.select().from(usersTable).where(eq(usersTable.id, mr.toUserId));
  return {
    ...mr,
    amount: parseFloat(mr.amount),
    fromUser: fromUser ? publicUser(fromUser) : undefined,
    toUser: toUser ? publicUser(toUser) : undefined,
  };
}

router.get("/money-requests", requireAuth, async (req, res): Promise<void> => {
  const me = getAuthUser(req);
  const { direction, status } = req.query as Record<string, string>;

  const conditions = [
    or(eq(moneyRequestsTable.fromUserId, me.id), eq(moneyRequestsTable.toUserId, me.id))!,
  ];

  if (direction === "sent") conditions.push(eq(moneyRequestsTable.fromUserId, me.id));
  if (direction === "received") conditions.push(eq(moneyRequestsTable.toUserId, me.id));
  if (status) conditions.push(eq(moneyRequestsTable.status, status));

  const requests = await db
    .select()
    .from(moneyRequestsTable)
    .where(and(...conditions))
    .orderBy(desc(moneyRequestsTable.createdAt));

  const enriched = await Promise.all(requests.map(enrichRequest));
  res.json(enriched);
});

router.post("/money-requests/create", requireAuth, async (req, res): Promise<void> => {
  const me = getAuthUser(req);
  const parsed = RequestMoneyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { fromEmail, amount, note } = parsed.data;

  const [fromUser] = await db.select().from(usersTable).where(eq(usersTable.email, fromEmail));
  if (!fromUser) {
    res.status(400).json({ error: "User not found" });
    return;
  }

  if (fromUser.id === me.id) {
    res.status(400).json({ error: "Cannot request money from yourself" });
    return;
  }

  const [mr] = await db
    .insert(moneyRequestsTable)
    .values({
      fromUserId: fromUser.id, // who will pay
      toUserId: me.id, // who receives (requester)
      amount: amount.toFixed(2),
      status: "pending",
      note: note ?? null,
    })
    .returning();

  const enriched = await enrichRequest(mr);
  res.status(201).json(enriched);
});

router.post("/money-requests/:requestId/approve", requireAuth, async (req, res): Promise<void> => {
  const me = getAuthUser(req);
  const rawId = Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId;
  const params = ApproveRequestParams.safeParse({ requestId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [mr] = await db
    .select()
    .from(moneyRequestsTable)
    .where(eq(moneyRequestsTable.id, params.data.requestId));

  if (!mr) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  // The person being asked to pay (fromUserId) is the one approving
  if (mr.fromUserId !== me.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (mr.status !== "pending") {
    res.status(400).json({ error: "Request is not pending" });
    return;
  }

  const amount = parseFloat(mr.amount);
  if (parseFloat(me.balance) < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  // Create a transaction for this
  const transactionId = `TXN-${uuidv4().toUpperCase().slice(0, 12)}`;
  await db.insert(transactionsTable).values({
    transactionId,
    fromUserId: me.id,
    toUserId: mr.toUserId,
    amount: mr.amount,
    status: "completed",
    type: "request",
    note: mr.note,
  });

  // Update balances
  await db
    .update(usersTable)
    .set({ balance: sql`balance - ${mr.amount}` })
    .where(eq(usersTable.id, me.id));

  await db
    .update(usersTable)
    .set({ balance: sql`balance + ${mr.amount}` })
    .where(eq(usersTable.id, mr.toUserId));

  const [updated] = await db
    .update(moneyRequestsTable)
    .set({ status: "approved" })
    .where(eq(moneyRequestsTable.id, mr.id))
    .returning();

  const enriched = await enrichRequest(updated);
  res.json(enriched);
});

router.post("/money-requests/:requestId/decline", requireAuth, async (req, res): Promise<void> => {
  const me = getAuthUser(req);
  const rawId = Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId;
  const params = DeclineRequestParams.safeParse({ requestId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [mr] = await db
    .select()
    .from(moneyRequestsTable)
    .where(eq(moneyRequestsTable.id, params.data.requestId));

  if (!mr) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  if (mr.fromUserId !== me.id && mr.toUserId !== me.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (mr.status !== "pending") {
    res.status(400).json({ error: "Request is not pending" });
    return;
  }

  const [updated] = await db
    .update(moneyRequestsTable)
    .set({ status: "declined" })
    .where(eq(moneyRequestsTable.id, mr.id))
    .returning();

  const enriched = await enrichRequest(updated);
  res.json(enriched);
});

export default router;
