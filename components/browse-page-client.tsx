"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MangaCardApi } from "@/components/manga-card-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Grid, List, X, Loader2 } from "lucide-react";
import { PaginationControls } from "@/components/pagination-controls";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getVisiblePages } from "@/lib/pagination";
import {
  buildBrowseHref,
  type BrowseFilters,
  type BrowseStatus,
} from "@/lib/browse-params";
import type { Category, OTruyenComic, Pagination } from "@/types/manga-types";

type BrowsePageClientProps = {
  comics: OTruyenComic[];
  categories: Category[];
  pagination: Pagination | null;
  filters: BrowseFilters;
};

export function BrowsePageClient({
  comics,
  categories,
  pagination,
  filters,
}: BrowsePageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState(filters.query);
  const [showFilters, setShowFilters] = useState(
    Boolean(filters.genre) || filters.status !== "all",
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    setSearchQuery(filters.query);
  }, [filters.query]);

  const navigate = (next: Partial<BrowseFilters>) => {
    const href = buildBrowseHref({
      query: next.query !== undefined ? next.query : searchQuery.trim(),
      genre: next.genre !== undefined ? next.genre : filters.genre,
      status: next.status !== undefined ? next.status : filters.status,
      page: next.page !== undefined ? next.page : filters.page,
      cursor: next.cursor !== undefined ? next.cursor : "",
      direction: next.direction !== undefined ? next.direction : "next",
    });

    startTransition(() => {
      router.push(href);
    });
  };

  useEffect(() => {
    const nextQuery = debouncedQuery.trim();
    if (nextQuery === filters.query) return;

    navigate({
      query: nextQuery,
      page: 1,
      cursor: "",
      direction: "next",
    });
    // Intentionally depend on debounced query only; navigate uses latest filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    navigate({
      query: searchQuery.trim(),
      page: 1,
      cursor: "",
      direction: "next",
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    navigate({
      query: "",
      genre: "",
      status: "all",
      page: 1,
      cursor: "",
      direction: "next",
    });
  };

  const handleGenreToggle = (slug: string) => {
    const nextGenre = filters.genre === slug ? "" : slug;
    navigate({ genre: nextGenre, page: 1, cursor: "", direction: "next" });
  };

  const handleStatusChange = (status: string) => {
    navigate({
      status: status as BrowseStatus,
      page: 1,
      cursor: "",
      direction: "next",
    });
  };

  const handlePageChange = (page: number) => {
    if (page === filters.page) return;

    if (page === filters.page + 1 && pagination?.nextCursor) {
      navigate({
        page,
        cursor: pagination.nextCursor,
        direction: "next",
      });
    } else if (page === filters.page - 1 && pagination?.prevCursor) {
      navigate({
        page,
        cursor: pagination.prevCursor,
        direction: "prev",
      });
    } else {
      // Jump within early offset window (no cursor).
      navigate({ page, cursor: "", direction: "next" });
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasActiveFilters =
    Boolean(filters.genre) ||
    filters.status !== "all" ||
    Boolean(filters.query);
  const currentPage = pagination?.currentPage || filters.page;
  const totalPages = pagination
    ? Math.ceil(pagination.totalItems / pagination.totalItemsPerPage)
    : 1;
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const canGoPrev = Boolean(pagination?.hasPrevPage ?? currentPage > 1);
  const canGoNext = Boolean(
    pagination?.hasNextPage ?? currentPage < totalPages,
  );
  const selectedGenreName =
    categories.find((category) => category.slug === filters.genre)?.name ||
    filters.genre;

  return (
    <>
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col md:flex-row gap-4 mb-6"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm theo tên truyện...."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full pl-10 bg-card border-border"
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit">Tìm kiếm</Button>

          <Button
            type="button"
            variant={showFilters ? "default" : "outline"}
            className="gap-2"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            <Filter className="h-4 w-4" />
            Bộ lọc
            {filters.genre ? (
              <span className="ml-1 bg-primary-foreground text-primary rounded-full text-xs w-5 h-5 flex items-center justify-center font-bold">
                1
              </span>
            ) : null}
          </Button>

          <div className="flex border border-border rounded-md overflow-hidden">
            <Button
              type="button"
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="rounded-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="rounded-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>

      {showFilters ? (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Bộ lọc</h3>
            {hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Xóa tất cả
              </Button>
            ) : null}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Trạng thái
              </label>
              <Select value={filters.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="bg-secondary border-none">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              Thể loại
              {filters.genre ? (
                <span className="ml-2 text-muted-foreground font-normal">
                  (đã chọn 1)
                </span>
              ) : null}
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category, index) => {
                const isActive = filters.genre === category.slug;
                return (
                  <Badge
                    key={category.id || index}
                    variant={isActive ? "default" : "outline"}
                    className={`cursor-pointer select-none transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground hover:bg-primary/80"
                        : "hover:bg-primary/20 hover:border-primary"
                    }`}
                    onClick={() => handleGenreToggle(category.slug)}
                  >
                    {category.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm text-muted-foreground">
            Bộ lọc đang áp dụng:
          </span>
          {filters.query ? (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/20"
              onClick={() => {
                setSearchQuery("");
                navigate({ query: "", page: 1, cursor: "", direction: "next" });
              }}
            >
              Tìm kiếm: {filters.query}
              <X className="h-3 w-3" />
            </Badge>
          ) : null}
          {filters.status !== "all" ? (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/20"
              onClick={() =>
                navigate({
                  status: "all",
                  page: 1,
                  cursor: "",
                  direction: "next",
                })
              }
            >
              {filters.status}
              <X className="h-3 w-3" />
            </Badge>
          ) : null}
          {filters.genre ? (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/20"
              onClick={() =>
                navigate({ genre: "", page: 1, cursor: "", direction: "next" })
              }
            >
              {selectedGenreName}
              <X className="h-3 w-3" />
            </Badge>
          ) : null}
        </div>
      ) : null}

      <div className="mb-6 flex items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {pagination ? (
            <>
              Hiển thị {comics.length} trên {pagination.totalItems} kết quả
            </>
          ) : (
            <>Hiển thị {comics.length} kết quả</>
          )}
        </p>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : null}
      </div>

      {comics.length > 0 ? (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 max-w-screen">
              {comics.map((comic, index) => (
                <MangaCardApi key={comic._id || index} comic={comic} />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 max-w-screen">
              {comics.map((comic) => (
                <MangaCardApi
                  key={comic._id}
                  comic={comic}
                  variant="horizontal"
                />
              ))}
            </div>
          )}

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            visiblePages={visiblePages}
            hasPrevPage={canGoPrev}
            hasNextPage={canGoNext}
            onPageChange={handlePageChange}
            disabled={isPending}
          />
        </>
      ) : (
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Không tìm thấy truyện
          </h3>
          <p className="text-muted-foreground mb-4">
            Hãy thử tìm kiếm lại theo cách khác
          </p>
          <Button onClick={clearFilters}>Xóa bộ lọc</Button>
        </div>
      )}
    </>
  );
}
