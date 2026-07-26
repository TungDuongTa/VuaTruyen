import { cacheLife, cacheTag } from "next/cache";
import {
  getHomeMangaData,
  getMangaByCategory,
  getMangaCardFields,
  getMangaCategories,
  getMangaDetail,
  getMangaList,
  searchManga,
  type MangaCardFields,
  type MangaListType,
} from "@/lib/services/manga.service";
import {
  fetchMangaRankings,
  type MangaRankings,
} from "@/lib/server/manga-rankings";
import {
  getRecentTopLevelComments,
  type HomeRecentCommentItem,
} from "@/lib/actions/comment.actions";
import { CACHE_TAGS, mangaTag } from "@/lib/server/cache-tags";
import type {
  Category,
  ComicDetailItem,
  MangaListResult,
  OTruyenComic,
} from "@/types/manga-types";

/**
 * (~15m). Use "use cache: remote" so Vercel Runtime Cache persists across
 * serverless instances (plain "use cache" is in-memory and misses every request).
 */
const MANGA_LISTS_LIFE = {
  stale: 900,
  revalidate: 900,
  expire: 3600,
} as const;

const CATALOG_WINDOW_MS = MANGA_LISTS_LIFE.revalidate * 1000;

const MANGA_CATEGORIES_LIFE = {
  stale: 3600,
  revalidate: 86_400,
  expire: 604_800,
} as const;

const HOME_SIDEBAR_LIFE = {
  stale: 60,
  revalidate: 300,
  expire: 3600,
} as const;

/** Shared catalog generation — sticky ~15m so list/detail/card keys align. */
async function getCatalogGeneration(): Promise<number> {
  "use cache: remote";
  cacheLife(MANGA_LISTS_LIFE);
  cacheTag(CACHE_TAGS.mangaLists);
  cacheTag("catalog-generation");
  return Math.floor(Date.now() / CATALOG_WINDOW_MS);
}

function applyCachedMangaCardFields<T extends OTruyenComic>(
  comic: T,
  cached: MangaCardFields | null,
): T {
  if (!cached) return comic;

  const latestChapterName = cached.latestChapterName.trim();
  return {
    ...comic,
    updatedAt: cached.updatedAt || comic.updatedAt,
    chaptersLatest: latestChapterName
      ? [
          {
            filename: "",
            chapter_name: latestChapterName,
            chapter_title: "",
            chapter_api_data: latestChapterName,
          },
        ]
      : [],
  };
}

async function getCachedMangaCardFieldsAt(
  slug: string,
  gen: number,
): Promise<MangaCardFields | null> {
  "use cache: remote";
  cacheLife(MANGA_LISTS_LIFE);
  cacheTag(CACHE_TAGS.mangaLists);
  cacheTag(mangaTag(slug));
  cacheTag(`catalog-gen:${gen}`);
  return getMangaCardFields(slug);
}

async function getCachedMangaDetailAt(
  slug: string,
  gen: number,
): Promise<ComicDetailItem | null> {
  "use cache: remote";
  cacheLife(MANGA_LISTS_LIFE);
  cacheTag(CACHE_TAGS.mangaLists);
  cacheTag(mangaTag(slug));
  cacheTag(`catalog-gen:${gen}`);
  return getMangaDetail(slug);
}

async function alignListItemsWithCardCache<T extends OTruyenComic>(
  items: T[],
  gen: number,
): Promise<T[]> {
  if (items.length === 0) return items;

  const cachedFields = await Promise.all(
    items.map((item) => getCachedMangaCardFieldsAt(item.slug, gen)),
  );

  return items.map((item, index) =>
    applyCachedMangaCardFields(item, cachedFields[index] || null),
  );
}

async function warmCatalogEntries(
  items: OTruyenComic[],
  gen: number,
): Promise<void> {
  const slugs = Array.from(
    new Set(
      items
        .map((item) => String(item.slug || "").trim())
        .filter(Boolean),
    ),
  );
  if (slugs.length === 0) return;

  await Promise.all(
    slugs.map((slug) =>
      Promise.all([
        getCachedMangaDetailAt(slug, gen),
        getCachedMangaCardFieldsAt(slug, gen),
      ]),
    ),
  );
}

export async function getCachedCategories(): Promise<Category[]> {
  "use cache: remote";
  cacheLife(MANGA_CATEGORIES_LIFE);
  cacheTag(CACHE_TAGS.categories);
  return getMangaCategories();
}

async function getCachedHomeDataAt(gen: number): Promise<OTruyenComic[]> {
  "use cache: remote";
  cacheLife(MANGA_LISTS_LIFE);
  cacheTag(CACHE_TAGS.mangaLists);
  cacheTag(`catalog-gen:${gen}`);
  const items = await getHomeMangaData();
  await warmCatalogEntries(items, gen);
  return alignListItemsWithCardCache(items, gen);
}

export async function getCachedHomeData(): Promise<OTruyenComic[]> {
  return getCachedHomeDataAt(await getCatalogGeneration());
}

async function getCachedMangaListAt(
  type: MangaListType,
  page: number,
  pageSize: number,
  tag: string,
  gen: number,
): Promise<MangaListResult> {
  "use cache: remote";
  cacheLife(MANGA_LISTS_LIFE);
  cacheTag(CACHE_TAGS.mangaLists);
  cacheTag(`catalog-gen:${gen}`);
  const result = await getMangaList({
    type,
    page,
    pageSize,
    tag: tag || undefined,
  });
  await warmCatalogEntries(result.items, gen);
  return {
    ...result,
    items: await alignListItemsWithCardCache(result.items, gen),
  };
}

export async function getCachedMangaList(
  type: MangaListType,
  page: number,
  pageSize: number,
  tag: string,
): Promise<MangaListResult> {
  return getCachedMangaListAt(
    type,
    page,
    pageSize,
    tag,
    await getCatalogGeneration(),
  );
}

async function getCachedMangaByCategoryAt(
  slug: string,
  page: number,
  pageSize: number,
  gen: number,
): Promise<MangaListResult | null> {
  "use cache: remote";
  cacheLife(MANGA_LISTS_LIFE);
  cacheTag(CACHE_TAGS.mangaLists);
  cacheTag(`catalog-gen:${gen}`);
  const result = await getMangaByCategory(slug, page, pageSize);
  if (result?.items?.length) {
    await warmCatalogEntries(result.items, gen);
    return {
      ...result,
      items: await alignListItemsWithCardCache(result.items, gen),
    };
  }
  return result;
}

export async function getCachedMangaByCategory(
  slug: string,
  page: number,
  pageSize: number,
): Promise<MangaListResult | null> {
  return getCachedMangaByCategoryAt(
    slug,
    page,
    pageSize,
    await getCatalogGeneration(),
  );
}

async function getCachedSearchMangaAt(
  keyword: string,
  page: number,
  pageSize: number,
  gen: number,
): Promise<MangaListResult> {
  "use cache: remote";
  cacheLife(MANGA_LISTS_LIFE);
  cacheTag(CACHE_TAGS.mangaLists);
  cacheTag(`catalog-gen:${gen}`);
  const result = await searchManga(keyword, page, pageSize);
  await warmCatalogEntries(result.items, gen);
  return {
    ...result,
    items: await alignListItemsWithCardCache(result.items, gen),
  };
}

export async function getCachedSearchManga(
  keyword: string,
  page: number,
  pageSize: number,
): Promise<MangaListResult> {
  return getCachedSearchMangaAt(
    keyword,
    page,
    pageSize,
    await getCatalogGeneration(),
  );
}

export async function getCachedMangaDetail(
  slug: string,
): Promise<ComicDetailItem | null> {
  return getCachedMangaDetailAt(slug, await getCatalogGeneration());
}

export async function withCachedMangaCardFields<T extends OTruyenComic>(
  items: T[],
): Promise<T[]> {
  return alignListItemsWithCardCache(items, await getCatalogGeneration());
}

export async function getCachedMangaRankings(
  limit = 10,
): Promise<MangaRankings> {
  "use cache: remote";
  cacheLife(HOME_SIDEBAR_LIFE);
  cacheTag(CACHE_TAGS.mangaRankings);
  return fetchMangaRankings(limit);
}

export async function getCachedRecentHomeComments(
  limit = 10,
): Promise<HomeRecentCommentItem[]> {
  "use cache: remote";
  cacheLife(HOME_SIDEBAR_LIFE);
  cacheTag(CACHE_TAGS.homeComments);
  return getRecentTopLevelComments(limit);
}
