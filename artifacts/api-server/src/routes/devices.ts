import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, devicesTable } from "@workspace/db";
import { RegisterPushTokenBody } from "@workspace/api-zod";
import { parseBody } from "../lib/validate";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/devices/push-token", requireAuth, async (req, res) => {
  const data = parseBody(RegisterPushTokenBody, req.body, res);
  if (!data) return;

  await db
    .update(devicesTable)
    .set({ pushToken: data.pushToken, lastSeenAt: new Date() })
    .where(eq(devicesTable.id, req.auth!.deviceId));

  res.json({ ok: true });
});

export default router;
