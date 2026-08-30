import { randomBytes, randomInt, randomUUID } from "node:crypto";

export function newId(): string {
  return randomUUID();
}

export function newToken(): string {
  return randomBytes(32).toString("hex");
}

// Pairing code: six digits so it is easy to type on a phone as a QR fallback.
export function newPairingCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += randomInt(0, 10).toString();
  }
  return out;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
