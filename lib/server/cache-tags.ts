/** Shared Next.js cache tags — keep in sync with /api/revalidate. */

export const CACHE_TAGS = {
  categories: "manga-categories",
  browseLists: "browse-lists",
  adultLists: "adult-lists",
  home: "home",
} as const;

export const mangaTag = (slug: string) => `manga:${slug}`;
