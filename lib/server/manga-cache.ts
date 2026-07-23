import { unstable_cache } from "next/cache";
import {
  getHomeMangaData,
  getMangaCategories,
  getMangaDetail,
  getMangaList,
  type MangaListType,
} from "@/lib/services/manga.service";
import { CACHE_TAGS, mangaTag } from "@/lib/server/cache-tags";
import type {
  Category,
  ComicDetailItem,
  MangaListResult,
  OTruyenComic,
} from "@/types/manga-types";

const CATEGORIES_REVALIDATE_SECONDS = 86_400; // 24h
/** Lists + public detail share this window so cards and /manga/[id] stay aligned. */
const MANGA_LIST_REVALIDATE_SECONDS = 900; // 15m

/** Genre list rarely changes. */
export const getCachedCategories = unstable_cache(
  async (): Promise<Category[]> => getMangaCategories(),
  ["manga-categories"],
  {
    revalidate: CATEGORIES_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.categories],
  },
);

/** Homepage featured / fallback carousel. */
export const getCachedHomeData = unstable_cache(
  async (): Promise<OTruyenComic[]> => getHomeMangaData(),
  ["home-manga"],
  {
    revalidate: MANGA_LIST_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.mangaLists],
  },
);

/** Browse / home list first page (no cursor). */
export const getCachedBrowseListPage1 = (
  type: MangaListType,
): Promise<MangaListResult> =>
  unstable_cache(
    async () => getMangaList({ type, page: 1 }),
    ["browse-list-page1", type],
    {
      revalidate: MANGA_LIST_REVALIDATE_SECONDS,
      tags: [CACHE_TAGS.mangaLists],
    },
  )();

/** Default /18+ first page. */
export const getCachedAdultListPage1 = unstable_cache(
  async (): Promise<MangaListResult> =>
    getMangaList({
      type: "truyen-moi",
      tag: "18+",
      page: 1,
      pageSize: 24,
    }),
  ["adult-list-page1"],
  {
    revalidate: MANGA_LIST_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.mangaLists],
  },
);

/**
 * Public manga detail + chapter list.
 * Same list tag as cards so TTL stays in the same ballpark.
 * Personal state (bookmark / read) is never cached here.
 */
export const getCachedMangaDetail = (
  slug: string,
): Promise<ComicDetailItem | null> =>
  unstable_cache(
    async () => getMangaDetail(slug),
    ["manga-detail", slug],
    {
      revalidate: MANGA_LIST_REVALIDATE_SECONDS,
      tags: [CACHE_TAGS.mangaLists, mangaTag(slug)],
    },
  )();
