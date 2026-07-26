"use server";

import {
  getMangaChapter,
  type MangaListType,
} from "@/lib/services/manga.service";
import {
  getCachedCategories,
  getCachedHomeData,
  getCachedMangaByCategory,
  getCachedMangaDetail,
  getCachedMangaList,
  getCachedSearchManga,
} from "@/lib/server/manga-cache";
import type {
  Category,
  ChapterItem,
  ComicDetailItem,
  MangaListResult,
  OTruyenComic,
} from "@/types/manga-types";

const VALID_LIST_TYPES = new Set<MangaListType>([
  "truyen-moi",
  "dang-phat-hanh",
  "hoan-thanh",
  "sap-ra-mat",
]);

const DEFAULT_PAGE_SIZE = 24;

const toListType = (type: string): MangaListType =>
  VALID_LIST_TYPES.has(type as MangaListType)
    ? (type as MangaListType)
    : "truyen-moi";

type ListNavOptions = {
  cursor?: string | null;
  direction?: "next" | "prev";
};

async function safeQuery<T>(
  label: string,
  query: () => Promise<T | null>,
): Promise<T | null> {
  try {
    return await query();
  } catch (error) {
    console.error(`Failed to load ${label}:`, error);
    return null;
  }
}

export async function getHomeData(): Promise<OTruyenComic[]> {
  const items = await safeQuery("home data", () => getCachedHomeData());
  return items || [];
}

export async function getListByType(
  type: string,
  page: number = 1,
  options: ListNavOptions = {},
): Promise<MangaListResult | null> {
  const listType = toListType(type);
  const cursor = options.cursor || "";
  const direction = options.direction === "prev" ? "prev" : "next";

  return safeQuery(`cached list ${listType}`, () =>
    getCachedMangaList(
      listType,
      page,
      DEFAULT_PAGE_SIZE,
      "",
      cursor,
      direction,
    ),
  );
}

export async function getListByTag(
  tag: string,
  page: number = 1,
  pageSize: number = 24,
  options: ListNavOptions = {},
): Promise<MangaListResult | null> {
  const cursor = options.cursor || "";
  const direction = options.direction === "prev" ? "prev" : "next";

  return safeQuery(`cached list tag ${tag}`, () =>
    getCachedMangaList(
      "truyen-moi",
      page,
      pageSize,
      tag,
      cursor,
      direction,
    ),
  );
}

export async function getCategories(): Promise<Category[]> {
  const items = await safeQuery("categories", () => getCachedCategories());
  return items || [];
}

export async function getByCategory(
  slug: string,
  page: number = 1,
  options: ListNavOptions = {},
): Promise<MangaListResult | null> {
  const cursor = options.cursor || "";
  const direction = options.direction === "prev" ? "prev" : "next";

  return safeQuery(`cached category ${slug}`, () =>
    getCachedMangaByCategory(
      slug,
      page,
      DEFAULT_PAGE_SIZE,
      cursor,
      direction,
    ),
  );
}

export async function getComicDetail(
  slug: string,
): Promise<ComicDetailItem | null> {
  return safeQuery(`manga ${slug}`, () => getCachedMangaDetail(slug));
}

export async function getChapterData(
  mangaSlug: string,
  chapterName: string,
): Promise<ChapterItem | null> {
  // Chapter images stay live so newly crawled pages are readable immediately.
  return safeQuery(`chapter ${mangaSlug}/${chapterName}`, () =>
    getMangaChapter(mangaSlug, chapterName),
  );
}

export async function searchComics(
  keyword: string,
  page: number = 1,
  options: ListNavOptions = {},
): Promise<MangaListResult | null> {
  const cursor = options.cursor || "";
  const direction = options.direction === "prev" ? "prev" : "next";

  return safeQuery(`cached search ${keyword}`, () =>
    getCachedSearchManga(
      keyword,
      page,
      DEFAULT_PAGE_SIZE,
      cursor,
      direction,
    ),
  );
}

export async function searchComicsQuick(
  keyword: string,
): Promise<OTruyenComic[]> {
  if (!keyword || keyword.trim().length < 2) return [];

  const data = await safeQuery(`cached quick search ${keyword}`, () =>
    getCachedSearchManga(keyword.trim(), 1, 8, "", "next"),
  );

  return (data?.items || []).slice(0, 8);
}
