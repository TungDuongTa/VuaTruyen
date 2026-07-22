import { connectToDatabase } from "@/database/mongoose";
import { CategoryModel } from "@/database/models/category.model";
import { ChapterModel } from "@/database/models/chapter.model";
import { MangaModel } from "@/database/models/manga.model";
import { normalizePageAndSize } from "@/lib/pagination";
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
): Pagination => ({
  totalItems,
  totalItemsPerPage: pageSize,
  currentPage: page,
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
  const slug = String(doc.slug || "");
  const latestChapterName = String(doc.latestChapterName || "");
  const categories = Array.isArray(doc.categories)
    ? (doc.categories as Category[])
    : [];

  return {
    _id: String(doc._id || slug),
    name: String(doc.name || slug),
    slug,
    origin_name: Array.isArray(doc.originNames)
      ? (doc.originNames as string[])
      : [],
    status: String(doc.status || "ongoing"),
    thumb_url: String(doc.thumbUrl || ""),
    category: categories,
    updatedAt: new Date(
      (doc.updatedAt as Date | string | undefined) || Date.now(),
    ).toISOString(),
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
  chapter_name: String(doc.chapterName || ""),
  chapter_title: String(doc.chapterTitle || ""),
  chapter_api_data: String(doc.chapterName || ""),
});

const toComicDetail = (
  manga: Record<string, unknown>,
  chapters: Record<string, unknown>[],
): ComicDetailItem => ({
  _id: String(manga._id || manga.slug || ""),
  name: String(manga.name || manga.slug || ""),
  slug: String(manga.slug || ""),
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
  updatedAt: new Date(
    (manga.updatedAt as Date | string | undefined) || Date.now(),
  ).toISOString(),
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
  const totalItems = await MangaModel.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalItems / normalized.pageSize));
  const safePage = Math.min(normalized.page, totalPages);
  const skip = (safePage - 1) * normalized.pageSize;

  const docs = await MangaModel.find(filter)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(normalized.pageSize)
    .lean();

  return {
    items: docs.map((doc) => toMangaCard(doc as Record<string, unknown>)),
    pagination: toPagination(totalItems, safePage, normalized.pageSize),
  };
};

export const getHomeMangaData = async (): Promise<OTruyenComic[]> => {
  await connectToDatabase();

  const featured = await MangaModel.find({ isFeatured: true })
    .sort({ updatedAt: -1 })
    .limit(12)
    .lean();

  const fallback =
    featured.length > 0
      ? featured
      : await MangaModel.find({})
          .sort({ updatedAt: -1 })
          .limit(12)
          .lean();

  return fallback.map((doc) => toMangaCard(doc as Record<string, unknown>));
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

  const chapters = await ChapterModel.find({ mangaSlug: slug })
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
    ChapterModel.findOne({ mangaSlug: slug, chapterName }).lean(),
  ]);

  if (!manga || !chapter) return null;

  const chapterImages: ChapterImage[] = (chapter.pages || [])
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

  const docs = await MangaModel.find({ slug: { $in: normalized } }).lean();
  const cards = new Map<string, OTruyenComic>();

  for (const doc of docs) {
    const card = toMangaCard(doc as Record<string, unknown>);
    cards.set(card.slug, card);
  }

  return cards;
};

export const getAllMangaSlugs = async (): Promise<string[]> => {
  await connectToDatabase();
  const docs = await MangaModel.find({}).select("slug updatedAt").lean();
  return docs.map((doc) => String(doc.slug)).filter(Boolean);
};

export const getAdultMangaCount = async (): Promise<number> => {
  await connectToDatabase();
  return MangaModel.countDocuments({ tags: "18+" });
};

export const mangaHasAdultTag = async (slug: string): Promise<boolean> => {
  await connectToDatabase();
  const manga = await MangaModel.findOne({ slug }).select("tags").lean();
  const tags = Array.isArray(manga?.tags) ? manga.tags : [];
  return tags.includes("18+");
};
