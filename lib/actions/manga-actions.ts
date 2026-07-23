"use server";

import {
  getHomeMangaData,
  getMangaByCategory,
  getMangaCategories,
  getMangaChapter,
  getMangaDetail,
  getMangaList,
  searchManga,
  type MangaListType,
} from "@/lib/services/manga.service";
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

const toListType = (type: string): MangaListType =>
  VALID_LIST_TYPES.has(type as MangaListType)
    ? (type as MangaListType)
    : "truyen-moi";

type ListNavOptions = {
  cursor?: string | null;
  direction?: "next" | "prev";
};

// These actions are also invoked from client components, so never let a DB
// error propagate to the browser - degrade to null instead.
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
  const items = await safeQuery("home data", () => getHomeMangaData());
  return items || [];
}

export async function getListByType(
  type: string,
  page: number = 1,
  options: ListNavOptions = {},
): Promise<MangaListResult | null> {
  return safeQuery(`list ${type}`, () =>
    getMangaList({
      type: toListType(type),
      page,
      cursor: options.cursor,
      direction: options.direction,
    }),
  );
}

export async function getListByTag(
  tag: string,
  page: number = 1,
  pageSize: number = 24,
  options: ListNavOptions = {},
): Promise<MangaListResult | null> {
  return safeQuery(`list tag ${tag}`, () =>
    getMangaList({
      type: "truyen-moi",
      tag,
      page,
      pageSize,
      cursor: options.cursor,
      direction: options.direction,
    }),
  );
}

export async function getCategories(): Promise<Category[]> {
  const items = await safeQuery("categories", () => getMangaCategories());
  return items || [];
}

export async function getByCategory(
  slug: string,
  page: number = 1,
  options: ListNavOptions = {},
): Promise<MangaListResult | null> {
  return safeQuery(`category ${slug}`, () =>
    getMangaByCategory(slug, page, 24, options.cursor, options.direction),
  );
}

export async function getComicDetail(
  slug: string,
): Promise<ComicDetailItem | null> {
  return safeQuery(`manga ${slug}`, () => getMangaDetail(slug));
}

export async function getChapterData(
  mangaSlug: string,
  chapterName: string,
): Promise<ChapterItem | null> {
  return safeQuery(`chapter ${mangaSlug}/${chapterName}`, () =>
    getMangaChapter(mangaSlug, chapterName),
  );
}

export async function searchComics(
  keyword: string,
  page: number = 1,
  options: ListNavOptions = {},
): Promise<MangaListResult | null> {
  return safeQuery(`search ${keyword}`, () =>
    searchManga(keyword, page, 24, options.cursor, options.direction),
  );
}

export async function searchComicsQuick(
  keyword: string,
): Promise<OTruyenComic[]> {
  if (!keyword || keyword.trim().length < 2) return [];

  const data = await safeQuery(`quick search ${keyword}`, () =>
    searchManga(keyword, 1, 8),
  );

  return (data?.items || []).slice(0, 8);
}
