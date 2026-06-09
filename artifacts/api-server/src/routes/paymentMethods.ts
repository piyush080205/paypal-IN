import { Router } from "express";
import { db, paymentMethodsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { AddPaymentMethodBody, RemovePaymentMethodParams } from "@workspace/api-zod";
import { requireAuth, getAuthUser } from "../lib/auth";

const router = Router();

router.get("/payment-methods", requireAuth, async (req, res): Promise<void> => {
  const me = getAuthUser(req);
  const methods = await db
    .select()
    .from(paymentMethodsTable)
    .where(eq(paymentMethodsTable.userId, me.id));
  res.json(methods);
});

router.post("/payment-methods", requireAuth, async (req, res): Promise<void> => {
  const me = getAuthUser(req);
  const parsed = AddPaymentMethodBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, label, last4, isDefault } = parsed.data;

  const [method] = await db
    .insert(paymentMethodsTable)
    .values({
      userId: me.id,
      type,
      label,
      last4,
      isDefault: isDefault ?? false,
    })
    .returning();

  res.status(201).json(method);
});

router.delete("/payment-methods/:methodId", requireAuth, async (req, res): Promise<void> => {
  const me = getAuthUser(req);
  const rawId = Array.isArray(req.params.methodId) ? req.params.methodId[0] : req.params.methodId;
  const params = RemovePaymentMethodParams.safeParse({ methodId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(paymentMethodsTable)
    .where(
      and(
        eq(paymentMethodsTable.id, params.data.methodId),
        eq(paymentMethodsTable.userId, me.id)
      )
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Payment method not found" });
    return;
  }

  res.json({ message: "Payment method removed" });
});

export default router;
