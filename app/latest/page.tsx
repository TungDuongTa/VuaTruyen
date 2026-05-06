import type { Metadata } from "next";
import { MangaCardApi } from "@/components/manga-card-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getListByType } from "@/lib/actions/otruyen-actions";
import { getVisiblePages } from "@/lib/pagination";
import { buildCanonicalPath, withSiteSuffix } from "@/lib/seo";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

const toSafePageNumber = (value: string | undefined): number => {
  const parsed = Number.parseInt(value || "1", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return parsed;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { page } = await searchParams;
  const currentPage = toSafePageNumber(page);
  const canonicalPath = buildCanonicalPath("/latest", {
    page: currentPage > 1 ? currentPage : undefined,
  });
  const pageSuffix = currentPage > 1 ? ` - Page ${currentPage}` : "";
  const title = `Truyện tranh được cập nhật mới nhất${pageSuffix}`;
  const description =
    "Theo dõi những bộ truyện tranh được cập nhật mới nhất tại VuaTruyen.";

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

export default async function LatestPage({ searchParams }: PageProps) {
  const { page } = await searchParams;
  const currentPage = toSafePageNumber(page);

  const [data, firstPageData] = await Promise.all([
    getListByType("truyen-moi", currentPage),
    currentPage === 1 ? Promise.resolve(null) : getListByType("truyen-moi", 1),
  ]);
  const comics = data?.items || [];
  const firstPageComics =
    currentPage === 1 ? comics : firstPageData?.items || comics;
  const recentActivityComics = firstPageComics.slice(0, 10);
  const pagination = data?.params.pagination;
  const totalPages = pagination
    ? Math.ceil(pagination.totalItems / pagination.totalItemsPerPage)
    : 1;
  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Mới cập nhật</h1>
          </div>
          <p className="text-muted-foreground">
            Các bộ truyện tranh mới nhất, được cập nhật hàng ngày
          </p>
        </div>

        {/* Results Count */}
        {pagination && (
          <div className="flex items-center gap-3 mb-6">
            <Badge className="bg-accent text-accent-foreground">
              Tổng {pagination.totalItems} truyện
            </Badge>
            <p className="text-sm text-muted-foreground">
              Trang {currentPage} trên {totalPages}
            </p>
          </div>
        )}

        {/* Manga Grid */}
        {comics.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {comics.map((comic) => (
              <MangaCardApi key={comic._id} comic={comic} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Không tìm thấy truyện
            </h3>
            <p className="text-muted-foreground">
              Hãy quay lại sau để xem những cập nhật mới nhất
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {currentPage > 1 ? (
              <Link href={`/latest?page=${currentPage - 1}`}>
                <Button variant="outline" size="icon">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="icon" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            <div className="flex items-center gap-1">
              {visiblePages.map((pageNum) => (
                <Link key={pageNum} href={`/latest?page=${pageNum}`}>
                  <Button
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="icon"
                  >
                    {pageNum}
                  </Button>
                </Link>
              ))}
            </div>

            {currentPage < totalPages ? (
              <Link href={`/latest?page=${currentPage + 1}`}>
                <Button variant="outline" size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="icon" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Horizontal List View */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-foreground mb-6">
            Được cập nhật gần đây
          </h2>
          <div className="space-y-3">
            {recentActivityComics.map((comic) => (
              <MangaCardApi
                key={comic._id}
                comic={comic}
                variant="horizontal"
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
