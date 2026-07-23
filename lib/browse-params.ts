import { MAX_OFFSET_PAGE, toPositiveInt } from "@/lib/pagination";
import { buildCanonicalPath } from "@/lib/seo";

export type BrowseStatus = "all" | "ongoing" | "completed";

export type BrowseFilters = {
  query: string;
  genre: string;
  status: BrowseStatus;
  page: number;
  cursor: string;
  direction: "next" | "prev";
};

export type BrowseSearchParams = {
  q?: string | string[];
  genres?: string | string[];
  genre?: string | string[];
  status?: string | string[];
  page?: string | string[];
  cursor?: string | string[];
  dir?: string | string[];
};

const firstParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
};

const normalizeBrowseStatus = (value: string): BrowseStatus => {
  if (value === "ongoing" || value === "completed") return value;
  return "all";
};

export const parseBrowseFilters = (
  searchParams: BrowseSearchParams,
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
  const page = toPositiveInt(firstParam(searchParams.page), 1);
  const cursor = firstParam(searchParams.cursor);
  const direction = firstParam(searchParams.dir) === "prev" ? "prev" : "next";

  return { query, genre, status, page, cursor, direction };
};

export const buildBrowseHref = (
  filters: Partial<BrowseFilters> & {
    query?: string;
    genre?: string;
    status?: BrowseStatus | string;
    page?: number;
    cursor?: string;
    direction?: "next" | "prev";
  },
): string => {
  const query = (filters.query || "").trim();
  const genre = (filters.genre || "").trim();
  const status = normalizeBrowseStatus(String(filters.status || "all"));
  const page = toPositiveInt(filters.page, 1);
  const cursor = (filters.cursor || "").trim();
  const direction = filters.direction === "prev" ? "prev" : "next";

  return buildCanonicalPath("/browse", {
    q: query || undefined,
    genres: genre || undefined,
    status: status !== "all" ? status : undefined,
    page: page > 1 ? page : undefined,
    cursor: cursor || undefined,
    dir: cursor && direction === "prev" ? "prev" : undefined,
  });
};

export const getBrowseListType = (
  status: BrowseStatus,
): "truyen-moi" | "dang-phat-hanh" | "hoan-thanh" => {
  if (status === "completed") return "hoan-thanh";
  if (status === "ongoing") return "dang-phat-hanh";
  return "truyen-moi";
};

export { MAX_OFFSET_PAGE };
