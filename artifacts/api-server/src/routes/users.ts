import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, or, ne } from "drizzle-orm";
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

router.get("/users/search", requireAuth, async (req, res): Promise<void> => {
  const q = req.query.q as string;
  if (!q) {
    res.status(400).json({ error: "Query parameter q is required" });
    return;
  }

  const me = getAuthUser(req);
  const results = await db
    .select()
    .from(usersTable)
    .where(
      or(
        ilike(usersTable.email, `%${q}%`),
        ilike(usersTable.firstName, `%${q}%`),
        ilike(usersTable.lastName, `%${q}%`)
      )
    )
    .limit(10);

  res.json(results.filter((u) => u.id !== me.id).map(publicUser));
});

router.get("/users/:userId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(rawId, 10);

  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(publicUser(user));
});

export default router;
