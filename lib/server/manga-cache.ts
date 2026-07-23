import { unstable_cache } from "next/cache";
import {
  getHomeMangaData,
  getMangaCategories,
  getMangaChapter,
  getMangaDetail,
  getMangaList,
  type MangaListType,
} from "@/lib/services/manga.service";
import { CACHE_TAGS, mangaTag } from "@/lib/server/cache-tags";
import type {
  Category,
  ChapterItem,
  ComicDetailItem,
  MangaListResult,
  OTruyenComic,
} from "@/types/manga-types";

const CATEGORIES_REVALIDATE_SECONDS = 86_400; // 24h
const LIST_REVALIDATE_SECONDS = 3_600; // 1h
const DETAIL_REVALIDATE_SECONDS = 3_600; // 1h

/** Genre list rarely changes — share across all browse requests. */
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
    revalidate: LIST_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.home, CACHE_TAGS.browseLists],
  },
);

/** Default / filtered browse first page without cursor. */
export const getCachedBrowseListPage1 = (
  type: MangaListType,
): Promise<MangaListResult> =>
  unstable_cache(
    async () => getMangaList({ type, page: 1 }),
    ["browse-list-page1", type],
    {
      revalidate: LIST_REVALIDATE_SECONDS,
      tags: [CACHE_TAGS.browseLists],
    },
  )();

/** Default /18+ first page without cursor. */
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
    revalidate: LIST_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.adultLists, CACHE_TAGS.browseLists],
  },
);

/** Manga detail + chapter list for a slug. */
export const getCachedMangaDetail = (
  slug: string,
): Promise<ComicDetailItem | null> =>
  unstable_cache(
    async () => getMangaDetail(slug),
    ["manga-detail", slug],
    {
      revalidate: DETAIL_REVALIDATE_SECONDS,
      tags: [mangaTag(slug), CACHE_TAGS.browseLists],
    },
  )();

/** Single chapter reader payload. */
export const getCachedMangaChapter = (
  mangaSlug: string,
  chapterName: string,
): Promise<ChapterItem | null> =>
  unstable_cache(
    async () => getMangaChapter(mangaSlug, chapterName),
    ["manga-chapter", mangaSlug, chapterName],
    {
      revalidate: DETAIL_REVALIDATE_SECONDS,
      tags: [mangaTag(mangaSlug)],
    },
  )();
