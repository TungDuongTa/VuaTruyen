import { MAX_OFFSET_PAGE, toPositiveInt } from "@/lib/pagination";

export const ADULT_CATALOG_BASE = "/18+";
export const ADULT_ITEMS_PER_PAGE = 24;

export const buildAdultCatalogHref = (page: number): string => {
  const safePage = toPositiveInt(page, 1);
  if (safePage <= 1) return ADULT_CATALOG_BASE;
  return `${ADULT_CATALOG_BASE}/page/${safePage}`;
};

export const buildAdultCatalogCanonical = (page: number): string =>
  buildAdultCatalogHref(page);

export const parseAdultCatalogPageParam = (value: string | undefined): number =>
  toPositiveInt(value, 1);

export const adultCatalogPageTitle = (page: number): string => {
  const safePage = toPositiveInt(page, 1);
  const pageSuffix = safePage > 1 ? ` - Page ${safePage}` : "";
  return `Thư viện truyện tranh 18+ ${pageSuffix}`;
};

export const ADULT_CATALOG_DESCRIPTION =
  "Lạc vào tiên cảnh, giải trí sau những giờ đọc truyện căng thẳng";

export const adultCatalogStaticPageParams = (): Array<{ page: string }> =>
  Array.from({ length: Math.max(0, MAX_OFFSET_PAGE - 1) }, (_, index) => ({
    page: String(index + 2),
  }));
