import { connectToDatabase } from "@/database/mongoose";
import { CategoryModel } from "@/database/models/category.model";
import { ChapterModel } from "@/database/models/chapter.model";
import { MangaModel } from "@/database/models/manga.model";
import { MangaViewStatModel } from "@/database/models/manga-view-stat.model";
import { MAX_OFFSET_PAGE, normalizePageAndSize } from "@/lib/pagination";
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

const toChapterData = (doc: Record<string, unknown>): ChapterData => ({
  filename: "",
  chapter_name: String(doc.chapterName),
  chapter_title: String(doc.chapterTitle || ""),
  chapter_api_data: String(doc.chapterName),
});

const toComicDetail = (
  manga: Record<string, unknown>,
  chapters: Record<string, unknown>[],
  totalViews = 0,
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
  totalViews,
});

const queryMangaList = async (
  filter: Record<string, unknown>,
  page: unknown,
  pageSize: unknown,
): Promise<MangaListResult> => {
  const normalized = normalizePageAndSize(
    page,
    pageSize,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  );

  // Clamp deep pages so skip stays cheap with a simple offset pager UI.
  const requestedPage = Math.min(normalized.page, MAX_OFFSET_PAGE);
  const totalItems = await MangaModel.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalItems / normalized.pageSize));
  const maxPage = Math.min(totalPages, MAX_OFFSET_PAGE);
  const safePage = Math.min(requestedPage, maxPage);

  const docs = await MangaModel.find(filter)
    .select(MANGA_CARD_FIELDS)
    .sort({ updatedAt: -1, _id: -1 })
    .skip((safePage - 1) * normalized.pageSize)
    .limit(normalized.pageSize + 1)
    .lean();

  const hasExtra = docs.length > normalized.pageSize;
  const pageDocs = hasExtra ? docs.slice(0, normalized.pageSize) : docs;

  return {
    items: pageDocs.map((doc) => toMangaCard(doc as Record<string, unknown>)),
    pagination: toPagination(totalItems, safePage, normalized.pageSize, {
      hasNextPage: hasExtra || safePage < maxPage,
      hasPrevPage: safePage > 1,
    }),
  };
};

export const getMangaBySlugs = async (
  slugs: string[],
): Promise<OTruyenComic[]> => {
  await connectToDatabase();

  const normalized = slugs.map((slug) => slug.trim()).filter(Boolean);
  if (normalized.length === 0) return [];

  const docs = await MangaModel.find({ slug: { $in: normalized } })
    .select(MANGA_CARD_FIELDS)
    .lean();

  const bySlug = new Map(
    docs.map((doc) => [String(doc.slug), doc as Record<string, unknown>]),
  );

  return normalized
    .map((slug) => bySlug.get(slug))
    .filter((doc): doc is Record<string, unknown> => Boolean(doc))
    .map((doc) => toMangaCard(doc));
};

export const getMangaList = async (
  query: MangaListQuery = {},
): Promise<MangaListResult> => {
  await connectToDatabase();
  return queryMangaList(buildListFilter(query), query.page, query.pageSize);
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
): Promise<MangaListResult | null> => {
  await connectToDatabase();

  const category = await CategoryModel.findOne({ slug }).lean();
  if (!category) return null;

  return queryMangaList({ "categories.slug": slug }, page, pageSize);
};

export const getMangaDetail = async (
  slug: string,
): Promise<ComicDetailItem | null> => {
  await connectToDatabase();

  const manga = await MangaModel.findOne({ slug }).lean();
  if (!manga) return null;

  const [chapters, viewStat] = await Promise.all([
    ChapterModel.find({ mangaSlug: slug })
      .select("chapterName chapterTitle chapterNumber")
      .sort({ chapterNumber: 1 })
      .lean(),
    MangaViewStatModel.findOne({ comicSlug: slug })
      .select("totalViews")
      .lean(),
  ]);

  return toComicDetail(
    manga as Record<string, unknown>,
    chapters as Record<string, unknown>[],
    Number(viewStat?.totalViews || 0),
  );
};

/** Lightweight card fields for personal lists (bookmarks / history). */
export type MangaCardFields = {
  latestChapterName: string;
  updatedAt: string;
};

export const getMangaCardFields = async (
  slug: string,
): Promise<MangaCardFields | null> => {
  const normalizedSlug = String(slug || "").trim();
  if (!normalizedSlug) return null;

  await connectToDatabase();
  const doc = await MangaModel.findOne({ slug: normalizedSlug })
    .select("latestChapterName updatedAt")
    .lean();

  if (!doc) return null;

  return {
    latestChapterName: String(doc.latestChapterName || "").trim(),
    updatedAt: new Date(doc.updatedAt as Date | string).toISOString(),
  };
};

export const getMangaChapter = async (
  slug: string,
  chapterName: string,
): Promise<ChapterItem | null> => {
  await connectToDatabase();

  const [manga, chapter] = await Promise.all([
    MangaModel.findOne({ slug }).lean(),
    ChapterModel.findOne({ mangaSlug: slug, chapterName }).lean(),
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
): Promise<MangaListResult> => {
  await connectToDatabase();
  return queryMangaList(buildMangaSearchFilter(keyword.trim()), page, pageSize);
};

export const getAdultMangaCount = async (): Promise<number> => {
  await connectToDatabase();
  return MangaModel.countDocuments({ tags: "18+" });
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
      const slug = String(doc.slug || "").trim();
      if (!slug) return null;
      return {
        slug,
        latestChapterName: String(doc.latestChapterName || ""),
        updatedAt: new Date(doc.updatedAt as Date | string),
      };
    })
    .filter((entry): entry is MangaSitemapEntry => entry !== null);
};
