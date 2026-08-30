import { Router, type IRouter, type Request } from "express";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq, and, gt, isNull, sql } from "drizzle-orm";
import {
  db,
  familiesTable,
  childrenTable,
  devicesTable,
  pairingCodesTable,
  recoveryAttemptsTable,
} from "@workspace/db";
import {
  CreateFamilyBody,
  CreatePairingCodeBody,
  RecoverParentBody,
  RedeemPairingBody,
} from "@workspace/api-zod";
import { newId, newToken, newPairingCode, todayKey } from "../lib/ids";
import { buildSnapshot } from "../lib/snapshot";
import { parseBody } from "../lib/validate";
import { requireAuth, requireParent } from "../middlewares/auth";

const router: IRouter = Router();

const PAIRING_TTL_MS = 30 * 60 * 1000;
const PAIRING_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_PAIRING_ATTEMPTS = 5;
const PIN_HASH_PREFIX = "scrypt";
const INVALID_RECOVERY_MESSAGE = "PIN inválido ou acesso indisponível";
const pairingAttempts = new Map<string, { count: number; resetAt: number }>();

function getPairingAttemptKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function consumePairingAttempt(req: Request): number | null {
  const now = Date.now();
  const key = getPairingAttemptKey(req);
  const current = pairingAttempts.get(key);

  if (!current || current.resetAt <= now) {
    pairingAttempts.set(key, { count: 1, resetAt: now + PAIRING_ATTEMPT_WINDOW_MS });
    return null;
  }

  if (current.count >= MAX_PAIRING_ATTEMPTS) {
    return Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  }

  current.count += 1;
  return null;
}

function hashParentPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${PIN_HASH_PREFIX}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyParentPin(pin: string, stored: string): boolean {
  if (!stored.startsWith(`${PIN_HASH_PREFIX}$`)) {
    return pin === stored;
  }
  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(pin, Buffer.from(saltHex, "hex"), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function getPinLookupSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for parent PIN recovery");
  return secret;
}

function parentPinLookup(pin: string): string {
  return createHmac("sha256", getPinLookupSecret())
    .update(`parent-pin-lookup:${pin}`)
    .digest("hex");
}

const DUMMY_PARENT_PIN_HASH = hashParentPin("000000");

function recoveryAttemptKeys(req: Request, parentPin: string): string[] {
  const ip = getPairingAttemptKey(req);
  const digest = (scope: string, value: string) =>
    createHmac("sha256", getPinLookupSecret()).update(`${scope}:${value}`).digest("hex");
  return [
    `recovery:ip:${digest("ip", ip)}`,
    `recovery:pin:${digest("pin", parentPin)}`,
  ];
}

async function consumeRecoveryAttempt(req: Request, parentPin: string): Promise<number | null> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + PAIRING_ATTEMPT_WINDOW_MS);
  let retryAfterSeconds: number | null = null;

  for (const key of recoveryAttemptKeys(req, parentPin)) {
    const rows = await db
      .insert(recoveryAttemptsTable)
      .values({ key, count: 1, resetAt })
      .onConflictDoUpdate({
        target: recoveryAttemptsTable.key,
        set: {
          count: sql`CASE WHEN ${recoveryAttemptsTable.resetAt} <= ${now} THEN 1 ELSE ${recoveryAttemptsTable.count} + 1 END`,
          resetAt: sql`CASE WHEN ${recoveryAttemptsTable.resetAt} <= ${now} THEN ${resetAt} ELSE ${recoveryAttemptsTable.resetAt} END`,
        },
      })
      .returning();
    const attempt = rows[0];
    if (attempt && attempt.count > MAX_PAIRING_ATTEMPTS) {
      retryAfterSeconds = Math.max(
        retryAfterSeconds ?? 0,
        Math.max(1, Math.ceil((attempt.resetAt.getTime() - now.getTime()) / 1000)),
      );
    }
  }

  return retryAfterSeconds;
}

router.post("/families", async (req, res) => {
  const data = parseBody(CreateFamilyBody, req.body, res);
  if (!data) return;

  const parentPin = data.parentPin.trim();
  const lookup = parentPinLookup(parentPin);
  const registeredFamilies = await db
    .select({ id: familiesTable.id })
    .from(familiesTable)
    .where(eq(familiesTable.parentPinLookup, lookup));
  if (registeredFamilies.length > 0) {
    res.status(409).json({ error: "Este PIN já está em uso. Escolha outro PIN de 6 dígitos." });
    return;
  }

  const familyId = newId();
  try {
    await db.insert(familiesTable).values({
      id: familyId,
      name: data.familyName.trim(),
      parentName: data.parentName.trim(),
      pin: null,
      parentPin: hashParentPin(parentPin),
      parentPinLookup: lookup,
      cycleEndDate: data.cycleEndDate,
      cycleStartDate: todayKey(),
    });
  } catch (error) {
    const dbError = error as { code?: string; constraint?: string };
    if (
      dbError.code === "23505" &&
      dbError.constraint === "families_parent_pin_lookup_unique"
    ) {
      res.status(409).json({ error: "Este PIN já está em uso. Escolha outro PIN de 6 dígitos." });
      return;
    }
    throw error;
  }

  await db.insert(childrenTable).values({
    id: newId(),
    familyId,
    name: data.childName.trim(),
    nickname: data.childNickname.toLowerCase().trim(),
  });

  const token = newToken();
  await db.insert(devicesTable).values({
    id: newId(),
    token,
    familyId,
    role: "parent",
    childId: null,
  });

  const snapshot = await buildSnapshot(familyId);
  res.status(201).json({
    deviceToken: token,
    role: "parent",
    familyId,
    childId: null,
    snapshot,
  });
});

router.post("/pairing-codes", requireAuth, requireParent, async (req, res) => {
  const data = parseBody(CreatePairingCodeBody, req.body, res);
  if (!data) return;
  const familyId = req.auth!.familyId;

  const childRows = await db
    .select()
    .from(childrenTable)
    .where(and(eq(childrenTable.id, data.childId), eq(childrenTable.familyId, familyId)));
  if (!childRows[0]) {
    res.status(400).json({ error: "Criança não encontrada" });
    return;
  }

  const code = newPairingCode();
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MS);
  await db.insert(pairingCodesTable).values({
    code,
    familyId,
    childId: data.childId,
    expiresAt,
  });

  res.status(201).json({ code, childId: data.childId, expiresAt: expiresAt.toISOString() });
});

router.post("/pairing/redeem", async (req, res) => {
  const retryAfterSeconds = consumePairingAttempt(req);
  if (retryAfterSeconds !== null) {
    res.set("Retry-After", String(retryAfterSeconds));
    res.status(429).json({ error: "Muitas tentativas. Tente novamente mais tarde." });
    return;
  }

  const data = parseBody(RedeemPairingBody, req.body, res);
  if (!data) return;

  const code = data.code.trim().toUpperCase();
  const now = new Date();
  const claimedRows = await db
    .update(pairingCodesTable)
    .set({ usedAt: now })
    .where(and(
      eq(pairingCodesTable.code, code),
      isNull(pairingCodesTable.usedAt),
      gt(pairingCodesTable.expiresAt, now),
    ))
    .returning();
  const pairing = claimedRows[0];
  if (!pairing) {
    res.status(404).json({ error: "Código inválido ou expirado" });
    return;
  }

  const token = newToken();
  await db.insert(devicesTable).values({
    id: newId(),
    token,
    familyId: pairing.familyId,
    role: "child",
    childId: pairing.childId,
  });

  const snapshot = await buildSnapshot(pairing.familyId);
  res.json({
    deviceToken: token,
    role: "child",
    familyId: pairing.familyId,
    childId: pairing.childId,
    snapshot,
  });
});

router.post("/parent/recover", async (req, res) => {
  const data = parseBody(RecoverParentBody, req.body, res);
  if (!data) return;

  const parentPin = data.parentPin.trim();
  const retryAfterSeconds = await consumeRecoveryAttempt(req, parentPin);
  if (retryAfterSeconds !== null) {
    res.set("Retry-After", String(retryAfterSeconds));
    res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
    return;
  }

  const lookup = parentPinLookup(parentPin);
  const familyRows = await db
    .select()
    .from(familiesTable)
    .where(eq(familiesTable.parentPinLookup, lookup));
  const family = familyRows.length === 1 ? familyRows[0] : null;
  const verified = family
    ? verifyParentPin(parentPin, family.parentPin)
    : verifyParentPin(parentPin, DUMMY_PARENT_PIN_HASH);
  if (!family || !verified) {
    res.status(404).json({ error: INVALID_RECOVERY_MESSAGE });
    return;
  }

  const token = newToken();
  await db.insert(devicesTable).values({
    id: newId(),
    token,
    familyId: family.id,
    role: "parent",
    childId: null,
  });
  await db
    .delete(recoveryAttemptsTable)
    .where(sql`${recoveryAttemptsTable.key} IN (${sql.join(
      recoveryAttemptKeys(req, parentPin).map((key) => sql`${key}`),
      sql`, `,
    )})`);

  const snapshot = await buildSnapshot(family.id);
  res.json({
    deviceToken: token,
    role: "parent",
    familyId: family.id,
    childId: null,
    snapshot,
  });
});

export default router;
