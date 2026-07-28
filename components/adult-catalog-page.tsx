import { ShieldAlert } from "lucide-react";
import { MangaCardApi } from "@/components/manga-card-api";
import { PaginationControls } from "@/components/pagination-controls";
import { getListByTag } from "@/lib/actions/manga-actions";
import {
  ADULT_ITEMS_PER_PAGE,
  buildAdultCatalogHref,
} from "@/lib/adult-catalog-params";
import {
  MAX_OFFSET_PAGE,
  getVisiblePages,
  toPositiveInt,
} from "@/lib/pagination";

type AdultCatalogPageProps = {
  requestedPage: number;
};

export async function AdultCatalogPage({ requestedPage }: AdultCatalogPageProps) {
  const safeRequestedPage = toPositiveInt(requestedPage, 1);

  const data = await getListByTag(
    "18+",
    safeRequestedPage,
    ADULT_ITEMS_PER_PAGE,
  );
  const comics = data?.items || [];
  const pagination = data?.pagination || {
    totalItems: 0,
    totalItemsPerPage: ADULT_ITEMS_PER_PAGE,
    currentPage: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };
  const totalPages = Math.max(
    1,
    Math.ceil(pagination.totalItems / pagination.totalItemsPerPage),
  );
  const cappedTotalPages = Math.min(totalPages, MAX_OFFSET_PAGE);
  const safeCurrentPage = Math.min(
    Math.max(1, pagination.currentPage || safeRequestedPage),
    cappedTotalPages,
  );
  const visiblePages = getVisiblePages(safeCurrentPage, cappedTotalPages);
  const canGoPrev = Boolean(pagination.hasPrevPage);
  const canGoNext = Boolean(pagination.hasNextPage);

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Thư viện truyện tranh 18+
            </h1>
          </div>
          <p className="text-muted-foreground">
            Giải trí sau những giờ đọc truyện căng thẳng
          </p>
        </div>

        {comics.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
            {comics.map((comic) => (
              <MangaCardApi key={comic._id} comic={comic} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <h3 className="mb-2 text-xl font-semibold text-foreground">
              Không tìm thấy truyện nào
            </h3>
            <p className="text-muted-foreground">
              Chưa có truyện nào được gắn tag 18+.
            </p>
          </div>
        )}

        <PaginationControls
          currentPage={safeCurrentPage}
          totalPages={cappedTotalPages}
          visiblePages={visiblePages}
          hasPrevPage={canGoPrev}
          hasNextPage={canGoNext}
          getPageHref={buildAdultCatalogHref}
        />
      </main>
    </div>
  );
}
