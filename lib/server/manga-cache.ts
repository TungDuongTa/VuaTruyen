import { cacheLife, cacheTag } from "next/cache";
import {
  getHomeMangaData,
  getMangaCategories,
  getMangaDetail,
  getMangaList,
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

/** (~15m revalidate). */
const MANGA_LISTS_LIFE = {
  stale: 300,
  revalidate: 900,
  expire: 3600,
} as const;

/**  (~24h revalidate). */
const MANGA_CATEGORIES_LIFE = {
  stale: 3600,
  revalidate: 86_400,
  expire: 604_800,
} as const;

/** Short TTL: ranking windows use Date at fill time; views change often. */
const HOME_SIDEBAR_LIFE = {
  stale: 60,
  revalidate: 300,
  expire: 3600,
} as const;

/** Genre list rarely changes. */
export async function getCachedCategories(): Promise<Category[]> {
  "use cache";
  cacheLife(MANGA_CATEGORIES_LIFE);
  cacheTag(CACHE_TAGS.categories);
  return getMangaCategories();
}

/** Homepage featured / fallback carousel. */
export async function getCachedHomeData(): Promise<OTruyenComic[]> {
  "use cache";
  cacheLife(MANGA_LISTS_LIFE);
  cacheTag(CACHE_TAGS.mangaLists);
  return getHomeMangaData();
}

/** Browse / home list first page (no cursor). */
export async function getCachedBrowseListPage1(
  type: MangaListType,
): Promise<MangaListResult> {
  "use cache";
  cacheLife(MANGA_LISTS_LIFE);
  cacheTag(CACHE_TAGS.mangaLists);
  return getMangaList({ type, page: 1 });
}

/** Default /18+ first page. */
export async function getCachedAdultListPage1(): Promise<MangaListResult> {
  "use cache";
  cacheLife(MANGA_LISTS_LIFE);
  cacheTag(CACHE_TAGS.mangaLists);
  return getMangaList({
    type: "truyen-moi",
    tag: "18+",
    page: 1,
    pageSize: 24,
  });
}

/**
 * Public manga detail + chapter list.
 * Same list profile/tag as cards so TTL stays aligned.
 * Personal state (bookmark / read) is never cached here.
 */
export async function getCachedMangaDetail(
  slug: string,
): Promise<ComicDetailItem | null> {
  "use cache";
  cacheLife(MANGA_LISTS_LIFE);
  cacheTag(CACHE_TAGS.mangaLists);
  cacheTag(mangaTag(slug));
  return getMangaDetail(slug);
}

/** Home sidebar rankings (daily/weekly/monthly/all-time). */
export async function getCachedMangaRankings(
  limit = 10,
): Promise<MangaRankings> {
  "use cache";
  cacheLife(HOME_SIDEBAR_LIFE);
  cacheTag(CACHE_TAGS.mangaRankings);
  return fetchMangaRankings(limit);
}

/** Home sidebar recent top-level comments. */
export async function getCachedRecentHomeComments(
  limit = 10,
): Promise<HomeRecentCommentItem[]> {
  "use cache";
  cacheLife(HOME_SIDEBAR_LIFE);
  cacheTag(CACHE_TAGS.homeComments);
  return getRecentTopLevelComments(limit);
}
