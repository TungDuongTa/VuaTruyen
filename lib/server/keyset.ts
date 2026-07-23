// Server-only helpers: depends on mongoose, must never be imported from client components.
import { Types } from "mongoose";

export type KeysetCursor = {
  updatedAt: string;
  id: string;
};

export const encodeKeysetCursor = (
  updatedAt: Date | string,
  id: string,
): string => {
  const payload: KeysetCursor = {
    updatedAt: new Date(updatedAt).toISOString(),
    id: String(id),
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
};

export const decodeKeysetCursor = (value: unknown): KeysetCursor | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as Partial<KeysetCursor>;
    const updatedAt = String(parsed.updatedAt || "").trim();
    const id = String(parsed.id || "").trim();
    if (!updatedAt || !id || Number.isNaN(Date.parse(updatedAt))) return null;
    return { updatedAt, id };
  } catch {
    return null;
  }
};

export const buildKeysetFilter = (
  cursor: KeysetCursor,
  direction: "next" | "prev",
): Record<string, unknown> => {
  const cursorDate = new Date(cursor.updatedAt);
  const comparison = direction === "next" ? "$lt" : "$gt";
  const idComparison = direction === "next" ? "$lt" : "$gt";
  const cursorId = Types.ObjectId.isValid(cursor.id)
    ? new Types.ObjectId(cursor.id)
    : cursor.id;

  return {
    $or: [
      { updatedAt: { [comparison]: cursorDate } },
      {
        updatedAt: cursorDate,
        _id: { [idComparison]: cursorId },
      },
    ],
  };
};
