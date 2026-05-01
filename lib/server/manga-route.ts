import { connectToDatabase } from "@/database/mongoose";

export type MangaRouteBase = "/manga" | "/18+";

export const DEFAULT_MANGA_ROUTE_BASE: MangaRouteBase = "/manga";

const normalizeString = (value: unknown): string => String(value || "").trim();

export const normalizeMangaRouteBase = (value: unknown): MangaRouteBase | null => {
  const normalized = normalizeString(value);
  if (normalized === "/manga" || normalized === "/18+") {
    return normalized;
  }
  return null;
};

export const resolveMangaRouteBases = async (
  slugs: string[],
): Promise<Map<string, MangaRouteBase>> => {
  const normalizedSlugs = Array.from(
    new Set(slugs.map((slug) => normalizeString(slug)).filter(Boolean)),
  );
  const routeMap = new Map<string, MangaRouteBase>(
    normalizedSlugs.map((slug) => [slug, DEFAULT_MANGA_ROUTE_BASE]),
  );

  if (!normalizedSlugs.length) {
    return routeMap;
  }

  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) {
    return routeMap;
  }

  const mangas18Collection = db.collection<{ slug?: unknown }>("mangas18");
  const manga18Rows = await mangas18Collection
    .find({
      slug: { $in: normalizedSlugs },
    })
    .project({ slug: 1 })
    .toArray();

  for (const row of manga18Rows) {
    const slug = normalizeString(row.slug);
    if (slug) {
      routeMap.set(slug, "/18+");
    }
  }

  return routeMap;
};
