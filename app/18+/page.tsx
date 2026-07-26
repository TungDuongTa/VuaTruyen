import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { MangaCardApi } from "@/components/manga-card-api";
import { PaginationControls } from "@/components/pagination-controls";
import { getListByTag } from "@/lib/actions/manga-actions";
import {
  MAX_OFFSET_PAGE,
  getVisiblePages,
  toPositiveInt,
} from "@/lib/pagination";
import { buildCanonicalPath, withSiteSuffix } from "@/lib/seo";

interface PageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

const buildHref = (page: number) => {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/18+?${query}` : "/18+";
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { page } = await searchParams;
  const currentPage = toPositiveInt(page, 1);
  const canonicalPath = buildCanonicalPath("/18+", {
    page: currentPage > 1 ? currentPage : undefined,
  });
  const pageSuffix = currentPage > 1 ? ` - Page ${currentPage}` : "";
  const title = `Thư viện truyện tranh 18+ ${pageSuffix}`;
  const description =
    "Lạc vào tiên cảnh, giải trí sau những giờ đọc truyện căng thẳng";

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

export default async function Manga18Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedPage = toPositiveInt(params.page, 1);

  const data = await getListByTag("18+", requestedPage, 24);
  const comics = data?.items || [];
  const pagination = data?.pagination || {
    totalItems: 0,
    totalItemsPerPage: 24,
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
    Math.max(1, pagination.currentPage || requestedPage),
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
          getPageHref={buildHref}
        />
      </main>
    </div>
  );
}
