import { MAX_OFFSET_PAGE, toPositiveInt } from "@/lib/pagination";
import { pageSlugStaticParams, parsePageSlug, toPageSlug } from "@/lib/page-slug";
import { buildCanonicalPath } from "@/lib/seo";

export const BROWSE_BASE = "/browse";
export const BROWSE_FILTERED_BASE = "/browse/filtered";
export const BROWSE_DESCRIPTION =
  "Tìm kiếm những bộ truyện tranh manga, manhwa và manhua mới nhất tại VuaTruyen";

export type BrowseStatus = "all" | "ongoing" | "completed";

export type BrowseFilters = {
  query: string;
  genre: string;
  status: BrowseStatus;
  page: number;
};

export type BrowseSearchParams = {
  q?: string | string[];
  genres?: string | string[];
  genre?: string | string[];
  status?: string | string[];
  page?: string | string[];
};

const firstParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
};

const normalizeBrowseStatus = (value: string): BrowseStatus => {
  if (value === "ongoing" || value === "completed") return value;
  return "all";
};

export const hasBrowseFilterQuery = (
  searchParams: BrowseSearchParams | URLSearchParams,
): boolean => {
  const get = (key: string) => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key)?.trim() || "";
    }
    const raw =
      searchParams[key as keyof BrowseSearchParams] ??
      (key === "genres" ? searchParams.genre : undefined);
    return firstParam(raw as string | string[] | undefined);
  };

  const query = get("q");
  const genre = get("genres") || get("genre");
  const status = normalizeBrowseStatus(get("status"));
  return Boolean(query) || Boolean(genre) || status !== "all";
};

export const hasActiveBrowseFilters = (filters: BrowseFilters): boolean =>
  Boolean(filters.query.trim()) ||
  Boolean(filters.genre.trim()) ||
  filters.status !== "all";

export const parseBrowseFilters = (
  searchParams: BrowseSearchParams,
  pageOverride?: number,
): BrowseFilters => {
  const query = firstParam(searchParams.q);
  const genresRaw =
    firstParam(searchParams.genres) || firstParam(searchParams.genre);
  const genre =
    genresRaw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)[0] || "";
  const status = normalizeBrowseStatus(firstParam(searchParams.status));
  const page =
    pageOverride !== undefined
      ? toPositiveInt(pageOverride, 1)
      : toPositiveInt(firstParam(searchParams.page), 1);

  return { query, genre, status, page };
};

export const buildBrowseHref = (
  filters: Partial<BrowseFilters> & {
    query?: string;
    genre?: string;
    status?: BrowseStatus | string;
    page?: number;
  },
): string => {
  const query = (filters.query || "").trim();
  const genre = (filters.genre || "").trim();
  const status = normalizeBrowseStatus(String(filters.status || "all"));
  const page = toPositiveInt(filters.page, 1);
  const hasFilters =
    Boolean(query) || Boolean(genre) || status !== "all";

  const catalogBase = hasFilters ? BROWSE_FILTERED_BASE : BROWSE_BASE;
  const pathname =
    page > 1 ? `${catalogBase}/${toPageSlug(page)}` : catalogBase;

  if (!hasFilters) {
    return pathname;
  }

  return buildCanonicalPath(pathname, {
    q: query || undefined,
    genres: genre || undefined,
    status: status !== "all" ? status : undefined,
  });
};

export const browseTitleFromFilters = (filters: BrowseFilters): string => {
  const titleParts = ["Khám phá"];
  if (filters.query) titleParts.push(`"${filters.query}"`);
  if (filters.genre) titleParts.push(filters.genre);
  if (filters.status !== "all") titleParts.push(filters.status);
  if (filters.page > 1) titleParts.push(`Trang ${filters.page}`);
  return titleParts.join(" - ");
};

export const browseStaticPageParams = (): Array<{ pageSlug: string }> =>
  pageSlugStaticParams(2, MAX_OFFSET_PAGE);

export const getBrowseListType = (
  status: BrowseStatus,
): "truyen-moi" | "dang-phat-hanh" | "hoan-thanh" => {
  if (status === "completed") return "hoan-thanh";
  if (status === "ongoing") return "dang-phat-hanh";
  return "truyen-moi";
};

export { MAX_OFFSET_PAGE };
