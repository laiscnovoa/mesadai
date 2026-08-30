import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, devicesTable } from "@workspace/db";

export interface AuthInfo {
  deviceId: string;
  familyId: string;
  role: "parent" | "child";
  childId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthInfo;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Autenticação necessária" });
    return;
  }
  const rows = await db.select().from(devicesTable).where(eq(devicesTable.token, token));
  const device = rows[0];
  if (!device) {
    res.status(401).json({ error: "Dispositivo não autorizado" });
    return;
  }
  req.auth = {
    deviceId: device.id,
    familyId: device.familyId,
    role: device.role as "parent" | "child",
    childId: device.childId ?? null,
  };
  void db
    .update(devicesTable)
    .set({ lastSeenAt: new Date() })
    .where(eq(devicesTable.id, device.id))
    .catch(() => {});
  next();
}

export function requireParent(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.auth?.role !== "parent") {
    res.status(401).json({ error: "Ação permitida apenas para responsáveis" });
    return;
  }
  next();
}

export function requireChild(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.auth?.role !== "child" || !req.auth.childId) {
    res.status(401).json({ error: "Ação permitida apenas para a criança" });
    return;
  }
  next();
}
