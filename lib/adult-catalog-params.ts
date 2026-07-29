import { MAX_OFFSET_PAGE, toPositiveInt } from "@/lib/pagination";
import { pageSlugStaticParams, parsePageSlug, toPageSlug } from "@/lib/page-slug";

export const ADULT_CATALOG_BASE = "/18+";
export const ADULT_ITEMS_PER_PAGE = 24;

export const buildAdultCatalogHref = (page: number): string => {
  const safePage = toPositiveInt(page, 1);
  if (safePage <= 1) return ADULT_CATALOG_BASE;
  return `${ADULT_CATALOG_BASE}/${toPageSlug(safePage)}`;
};

export const buildAdultCatalogCanonical = (page: number): string =>
  buildAdultCatalogHref(page);

export const parseAdultCatalogPageSlug = parsePageSlug;

export const adultCatalogPageTitle = (page: number): string => {
  const safePage = toPositiveInt(page, 1);
  const pageSuffix = safePage > 1 ? ` - Page ${safePage}` : "";
  return `Thư viện truyện tranh 18+ ${pageSuffix}`;
};

export const ADULT_CATALOG_DESCRIPTION =
  "Lạc vào tiên cảnh, giải trí sau những giờ đọc truyện căng thẳng";

export const adultCatalogStaticPageParams = (): Array<{ pageSlug: string }> =>
  pageSlugStaticParams(2, MAX_OFFSET_PAGE);
