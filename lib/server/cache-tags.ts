/** Shared Next.js Data Cache tags for manga list + detail payloads. */

export const CACHE_TAGS = {
  categories: "manga-categories",
  /** Shared by home, browse, 18+, and manga detail so they age together. */
  mangaLists: "manga-lists",
  /** Home / ranking sidebar period + all-time views. */
  mangaRankings: "manga-rankings",
  /** Home “recent comments” sidebar. */
  homeComments: "home-comments",
} as const;

export const mangaTag = (slug: string) => `manga:${slug}`;
