import type { Response } from "express";
import type { ZodTypeAny, infer as zInfer } from "zod";

// Parse a request body with a zod schema. On failure, sends a 400 and
// returns null so the caller can `if (!data) return;`.
export function parseBody<S extends ZodTypeAny>(
  schema: S,
  body: unknown,
  res: Response,
): zInfer<S> | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return null;
  }
  return result.data;
}
