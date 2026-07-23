import { connectToDatabase } from "@/database/mongoose";
import { CategoryModel } from "@/database/models/category.model";
import { ChapterModel } from "@/database/models/chapter.model";
import { MangaModel } from "@/database/models/manga.model";
import { MAX_OFFSET_PAGE, normalizePageAndSize } from "@/lib/pagination";
import {
  buildKeysetFilter,
  decodeKeysetCursor,
  encodeKeysetCursor,
} from "@/lib/server/keyset";
import { buildMangaSearchFilter } from "@/lib/search-utils";
import type {
  Category,
  ChapterData,
  ChapterGroup,
  ChapterImage,
  ChapterItem,
  ComicDetailItem,
  MangaListResult,
  OTruyenComic,
  Pagination,
} from "@/types/manga-types";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;

const MANGA_CARD_FIELDS =
  "slug name originNames status thumbUrl categories updatedAt latestChapterName";

export type MangaListType =
  | "truyen-moi"
  | "dang-phat-hanh"
  | "hoan-thanh"
  | "sap-ra-mat";

export type MangaListQuery = {
  type?: MangaListType;
  page?: number;
  pageSize?: number;
  tag?: string;
  excludeTag?: string;
  cursor?: string | null;
  direction?: "next" | "prev";
};

const STATUS_BY_LIST_TYPE: Partial<Record<MangaListType, string>> = {
  "dang-phat-hanh": "ongoing",
  "hoan-thanh": "completed",
  "sap-ra-mat": "coming_soon",
};

const toPagination = (
  totalItems: number,
  page: number,
  pageSize: number,
  extras: Partial<Pagination> = {},
): Pagination => ({
  totalItems,
  totalItemsPerPage: pageSize,
  currentPage: page,
  ...extras,
});

const buildListFilter = (query: MangaListQuery) => {
  const filter: Record<string, unknown> = {};

  const status = query.type ? STATUS_BY_LIST_TYPE[query.type] : undefined;
  if (status) {
    filter.status = status;
  }

  if (query.tag) {
    filter.tags = query.tag;
  } else if (query.excludeTag) {
    filter.tags = { $ne: query.excludeTag };
  }

  return filter;
};

const toMangaCard = (doc: Record<string, unknown>): OTruyenComic => {
  const slug = String(doc.slug);
  const latestChapterName = String(doc.latestChapterName || "");
  const categories = Array.isArray(doc.categories)
    ? (doc.categories as Category[])
    : [];

  return {
    _id: String(doc._id),
    name: String(doc.name),
    slug,
    origin_name: Array.isArray(doc.originNames)
      ? (doc.originNames as string[])
      : [],
    status: String(doc.status || "ongoing"),
    thumb_url: String(doc.thumbUrl || ""),
    category: categories,
    updatedAt: new Date(doc.updatedAt as Date | string).toISOString(),
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
};

const cursorFromDoc = (doc: Record<string, unknown>): string =>
  encodeKeysetCursor(
    doc.updatedAt as Date | string,
    String(doc._id),
  );

const toChapterData = (doc: Record<string, unknown>): ChapterData => ({
  filename: "",
  chapter_name: String(doc.chapterName),
  chapter_title: String(doc.chapterTitle || ""),
  chapter_api_data: String(doc.chapterName),
});

const toComicDetail = (
  manga: Record<string, unknown>,
  chapters: Record<string, unknown>[],
): ComicDetailItem => ({
  _id: String(manga._id),
  name: String(manga.name),
  slug: String(manga.slug),
  origin_name: Array.isArray(manga.originNames)
    ? (manga.originNames as string[])
    : [],
  content: String(manga.content || ""),
  status: String(manga.status || "ongoing"),
  thumb_url: String(manga.thumbUrl || ""),
  author: Array.isArray(manga.authors) ? (manga.authors as string[]) : [],
  category: Array.isArray(manga.categories)
    ? (manga.categories as Category[])
    : [],
  chapters: [
    {
      server_name: "Default",
      server_data: chapters.map(toChapterData),
    } satisfies ChapterGroup,
  ],
  updatedAt: new Date(manga.updatedAt as Date | string).toISOString(),
});

const queryMangaList = async (
  filter: Record<string, unknown>,
  page: unknown,
  pageSize: unknown,
  cursorRaw?: string | null,
  direction: "next" | "prev" = "next",
): Promise<MangaListResult> => {
  const normalized = normalizePageAndSize(
    page,
    pageSize,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  );
  const decodedCursor = decodeKeysetCursor(cursorRaw);

  const totalItemsPromise = MangaModel.countDocuments(filter);

  if (decodedCursor) {
    const keysetFilter = {
      $and: [filter, buildKeysetFilter(decodedCursor, direction)],
    };

    const sort =
      direction === "next"
        ? ({ updatedAt: -1, _id: -1 } as const)
        : ({ updatedAt: 1, _id: 1 } as const);

    const [totalItems, rawDocs] = await Promise.all([
      totalItemsPromise,
      MangaModel.find(keysetFilter)
        .select(MANGA_CARD_FIELDS)
        .sort(sort)
        .limit(normalized.pageSize + 1)
        .lean(),
    ]);

    const hasExtra = rawDocs.length > normalized.pageSize;
    const pageDocs = hasExtra ? rawDocs.slice(0, normalized.pageSize) : rawDocs;
    const orderedDocs =
      direction === "prev" ? [...pageDocs].reverse() : pageDocs;

    const totalPages = Math.max(1, Math.ceil(totalItems / normalized.pageSize));
    const safePage = Math.min(Math.max(1, normalized.page), totalPages);
    const first = orderedDocs[0] as Record<string, unknown> | undefined;
    const last = orderedDocs[orderedDocs.length - 1] as
      | Record<string, unknown>
      | undefined;

    const hasNextPage = direction === "next" ? hasExtra : safePage < totalPages;
    const hasPrevPage =
      direction === "prev" ? hasExtra || safePage > 1 : safePage > 1;

    return {
      items: orderedDocs.map((doc) =>
        toMangaCard(doc as Record<string, unknown>),
      ),
      pagination: toPagination(totalItems, safePage, normalized.pageSize, {
        nextCursor:
          last && (direction === "next" ? hasExtra : safePage < totalPages)
            ? cursorFromDoc(last)
            : null,
        prevCursor: first && hasPrevPage ? cursorFromDoc(first) : null,
        hasNextPage,
        hasPrevPage,
      }),
    };
  }

  // Offset path for early pages. Clamp deep pages without a cursor to keep skip cheap.
  const requestedPage = Math.min(normalized.page, MAX_OFFSET_PAGE);
  const [totalItems, docs] = await Promise.all([
    totalItemsPromise,
    MangaModel.find(filter)
      .select(MANGA_CARD_FIELDS)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((requestedPage - 1) * normalized.pageSize)
      .limit(normalized.pageSize + 1)
      .lean(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / normalized.pageSize));
  const safePage = Math.min(requestedPage, totalPages);
  const hasExtra = docs.length > normalized.pageSize;
  const pageDocs = hasExtra ? docs.slice(0, normalized.pageSize) : docs;
  const first = pageDocs[0] as Record<string, unknown> | undefined;
  const last = pageDocs[pageDocs.length - 1] as
    | Record<string, unknown>
    | undefined;
  const hasNextPage = hasExtra || safePage < totalPages;

  return {
    items: pageDocs.map((doc) => toMangaCard(doc as Record<string, unknown>)),
    pagination: toPagination(totalItems, safePage, normalized.pageSize, {
      nextCursor: last && hasNextPage ? cursorFromDoc(last) : null,
      prevCursor: first && safePage > 1 ? cursorFromDoc(first) : null,
      hasNextPage,
      hasPrevPage: safePage > 1,
    }),
  };
};

export const getHomeMangaData = async (): Promise<OTruyenComic[]> => {
  await connectToDatabase();

  const featured = await MangaModel.find({ isFeatured: true })
    .select(MANGA_CARD_FIELDS)
    .sort({ updatedAt: -1, _id: -1 })
    .limit(12)
    .lean();

  const fallback =
    featured.length > 0
      ? featured
      : await MangaModel.find({})
          .select(MANGA_CARD_FIELDS)
          .sort({ updatedAt: -1, _id: -1 })
          .limit(12)
          .lean();

  return fallback.map((doc) => toMangaCard(doc as Record<string, unknown>));
};

export const getMangaList = async (
  query: MangaListQuery = {},
): Promise<MangaListResult> => {
  await connectToDatabase();
  return queryMangaList(
    buildListFilter(query),
    query.page,
    query.pageSize,
    query.cursor,
    query.direction || "next",
  );
};

export const getMangaCategories = async (): Promise<Category[]> => {
  await connectToDatabase();
  const docs = await CategoryModel.find({}).sort({ name: 1 }).lean();
  return docs.map((doc) => ({
    id: String(doc.slug),
    name: String(doc.name),
    slug: String(doc.slug),
  }));
};

export const getMangaByCategory = async (
  slug: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  cursor?: string | null,
  direction: "next" | "prev" = "next",
): Promise<MangaListResult | null> => {
  await connectToDatabase();

  const category = await CategoryModel.findOne({ slug }).lean();
  if (!category) return null;

  return queryMangaList(
    { "categories.slug": slug },
    page,
    pageSize,
    cursor,
    direction,
  );
};

/** Match crawler sync: only publish done chapters; keep legacy rows without status. */
const readableChapterFilter = (mangaSlug: string, chapterName?: string) => {
  const filter: Record<string, unknown> = {
    mangaSlug,
    $or: [{ crawlStatus: "done" }, { crawlStatus: { $exists: false } }],
  };
  if (chapterName !== undefined) {
    filter.chapterName = chapterName;
  }
  return filter;
};

export const getMangaDetail = async (
  slug: string,
): Promise<ComicDetailItem | null> => {
  await connectToDatabase();

  const manga = await MangaModel.findOne({ slug }).lean();
  if (!manga) return null;

  const chapters = await ChapterModel.find(readableChapterFilter(slug))
    .select("chapterName chapterTitle chapterNumber")
    .sort({ chapterNumber: 1 })
    .lean();

  return toComicDetail(
    manga as Record<string, unknown>,
    chapters as Record<string, unknown>[],
  );
};

export const getMangaChapter = async (
  slug: string,
  chapterName: string,
): Promise<ChapterItem | null> => {
  await connectToDatabase();

  const [manga, chapter] = await Promise.all([
    MangaModel.findOne({ slug }).lean(),
    ChapterModel.findOne(readableChapterFilter(slug, chapterName)).lean(),
  ]);

  if (!manga || !chapter) return null;

  const chapterImages: ChapterImage[] = (chapter.pages ?? [])
    .map((page: Record<string, unknown>) => ({
      image_page: Number(page.index),
      image_file: String(page.imageUrl),
    }))
    .sort((a: ChapterImage, b: ChapterImage) => a.image_page - b.image_page);

  return {
    _id: String(chapter._id),
    comic_name: String(manga.name),
    chapter_name: String(chapter.chapterName),
    chapter_title: String(chapter.chapterTitle || ""),
    chapter_image: chapterImages,
  };
};

export const searchManga = async (
  keyword: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  cursor?: string | null,
  direction: "next" | "prev" = "next",
): Promise<MangaListResult> => {
  await connectToDatabase();
  return queryMangaList(
    buildMangaSearchFilter(keyword.trim()),
    page,
    pageSize,
    cursor,
    direction,
  );
};

export const getMangaCardsBySlugs = async (
  slugs: string[],
): Promise<Map<string, OTruyenComic>> => {
  await connectToDatabase();

  const normalized = Array.from(
    new Set(slugs.map((slug) => String(slug || "").trim()).filter(Boolean)),
  );
  if (!normalized.length) {
    return new Map();
  }

  const docs = await MangaModel.find({ slug: { $in: normalized } })
    .select(MANGA_CARD_FIELDS)
    .lean();
  const cards = new Map<string, OTruyenComic>();

  for (const doc of docs) {
    const card = toMangaCard(doc as Record<string, unknown>);
    cards.set(card.slug, card);
  }

  return cards;
};

export type MangaSitemapEntry = {
  slug: string;
  latestChapterName: string;
  updatedAt: Date;
};

export const getMangaSitemapEntries = async (): Promise<
  MangaSitemapEntry[]
> => {
  await connectToDatabase();
  const docs = await MangaModel.find({})
    .select("slug latestChapterName updatedAt")
    .lean();

  return docs
    .map((doc) => {
      const slug = String(doc.slug);
      if (!slug) return null;

      return {
        slug,
        latestChapterName: String(doc.latestChapterName || ""),
        updatedAt: new Date(doc.updatedAt as Date | string),
      };
    })
    .filter((entry): entry is MangaSitemapEntry => entry !== null);
};

export const getAdultMangaCount = async (): Promise<number> => {
  await connectToDatabase();
  return MangaModel.countDocuments({ tags: "18+" });
};
