import { BrowsePageClient } from "@/components/browse-page-client";
import {
  getByCategory,
  getCategories,
  getListByType,
  searchComics,
} from "@/lib/actions/manga-actions";
import {
  type BrowseFilters,
  getBrowseListType,
} from "@/lib/browse-params";

type BrowseCatalogPageProps = {
  filters: BrowseFilters;
};

export async function BrowseCatalogPage({ filters }: BrowseCatalogPageProps) {
  const [categories, listResult] = await Promise.all([
    getCategories(),
    filters.query
      ? searchComics(filters.query, filters.page)
      : filters.genre
        ? getByCategory(filters.genre, filters.page)
        : getListByType(getBrowseListType(filters.status), filters.page),
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
