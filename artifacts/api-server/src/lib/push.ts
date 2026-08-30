import { eq, and } from "drizzle-orm";
import { db, devicesTable } from "@workspace/db";
import { logger } from "./logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Expo only accepts tokens shaped like ExponentPushToken[...] (or ExpoPushToken[...]).
function isExpoToken(token: string | null): token is string {
  return (
    !!token &&
    (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["))
  );
}

// Fire-and-forget push send to the Expo Push API. Never throws — push delivery
// must not block or fail the originating request (submission/review).
export async function sendExpoPush(
  tokens: (string | null)[],
  message: PushMessage,
): Promise<void> {
  const valid = Array.from(new Set(tokens.filter(isExpoToken)));
  if (valid.length === 0) return;

  const messages = valid.map((to) => ({
    to,
    sound: "default" as const,
    title: message.title,
    body: message.body,
    data: message.data ?? {},
  }));

  // Expo recommends <=100 messages per request.
  const chunks: (typeof messages)[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        logger.warn({ status: res.status }, "Expo push request failed");
      }
    } catch (err) {
      logger.warn({ err }, "Expo push request threw");
    }
  }
}

// Push tokens for every device of a family with a given role.
export async function pushTokensForRole(
  familyId: string,
  role: "parent" | "child",
): Promise<(string | null)[]> {
  const rows = await db
    .select({ pushToken: devicesTable.pushToken })
    .from(devicesTable)
    .where(and(eq(devicesTable.familyId, familyId), eq(devicesTable.role, role)));
  return rows.map((r) => r.pushToken);
}

// Push tokens for every child device paired to a specific child.
export async function pushTokensForChild(
  familyId: string,
  childId: string,
): Promise<(string | null)[]> {
  const rows = await db
    .select({ pushToken: devicesTable.pushToken })
    .from(devicesTable)
    .where(
      and(
        eq(devicesTable.familyId, familyId),
        eq(devicesTable.childId, childId),
        eq(devicesTable.role, "child"),
      ),
    );
  return rows.map((r) => r.pushToken);
}

// Fire-and-forget push: resolves the token lookup, then sends. Swallows every
// failure (DB lookup or network) so the originating request can never be
// affected by push delivery. Safe to call without awaiting.
export function queuePush(
  resolveTokens: () => Promise<(string | null)[]>,
  message: PushMessage,
): void {
  void (async () => {
    try {
      const tokens = await resolveTokens();
      await sendExpoPush(tokens, message);
    } catch (err) {
      logger.warn({ err }, "queuePush failed");
    }
  })();
}
