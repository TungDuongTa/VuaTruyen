import type { Metadata } from "next";
import { BrowsePageClient } from "@/components/browse-page-client";
import {
  getByCategory,
  getCategories,
  getListByType,
  searchComics,
} from "@/lib/actions/manga-actions";
import {
  buildBrowseHref,
  getBrowseListType,
  parseBrowseFilters,
  type BrowseSearchParams,
} from "@/lib/browse-params";
import { withSiteSuffix } from "@/lib/seo";

// Data Cache covers default lists/categories; this also marks the route for ISR
// where Next can apply it (filtered searchParams stay on-demand).
export const revalidate = 3600;

type BrowsePageProps = {
  searchParams: Promise<BrowseSearchParams>;
};

export async function generateMetadata({
  searchParams,
}: BrowsePageProps): Promise<Metadata> {
  const filters = parseBrowseFilters(await searchParams);
  const canonicalPath = buildBrowseHref({
    ...filters,
    // Keep canonicals stable (no cursor noise) for SEO.
    cursor: "",
    direction: "next",
  });

  const titleParts = ["Khám phá"];
  if (filters.query) titleParts.push(`"${filters.query}"`);
  if (filters.genre) titleParts.push(filters.genre);
  if (filters.status !== "all") titleParts.push(filters.status);
  if (filters.page > 1) titleParts.push(`Trang ${filters.page}`);

  const title = titleParts.join(" - ");
  const description =
    "Tìm kiếm những bộ truyện tranh manga, manhwa và manhua mới nhất tại VuaTruyen";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: withSiteSuffix(title),
      description,
      url: canonicalPath,
    },
    twitter: {
      title: withSiteSuffix(title),
      description,
    },
  };
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const filters = parseBrowseFilters(await searchParams);
  const nav = {
    cursor: filters.cursor || null,
    direction: filters.direction,
  };

  const [categories, listResult] = await Promise.all([
    getCategories(),
    filters.query
      ? searchComics(filters.query, filters.page, nav)
      : filters.genre
        ? getByCategory(filters.genre, filters.page, nav)
        : getListByType(getBrowseListType(filters.status), filters.page, nav),
  ]);

  const comics = listResult?.items || [];
  const pagination = listResult?.pagination || null;

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Khám phá thư viện truyện tranh
          </h1>
          <p className="text-muted-foreground">
            Khám phá hàng ngàn bộ truyện tranh hot nhất được cập nhật hàng ngày
            tại VuaTruyen
          </p>
        </div>

        <BrowsePageClient
          comics={comics}
          categories={categories}
          pagination={pagination}
          filters={filters}
        />
      </main>
    </div>
  );
}
