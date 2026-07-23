"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { searchComicsQuick } from "@/lib/actions/manga-actions";
import { formatRelativeTime } from "@/lib/date-time";
import { OTruyenComic } from "@/types/manga-types";

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<OTruyenComic[]>([]);
  const [isPending, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    startTransition(async () => {
      const data = await searchComicsQuick(debouncedQuery);
      setResults(data);
    });
  }, [debouncedQuery]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setHasSearched(false);
    }
  }, [open]);

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = useCallback(() => {
    onOpenChange(false);
    setQuery("");
  }, [onOpenChange]);

  const navigateToBrowse = useCallback(() => {
    const trimmedQuery = query.trim();
    const href = trimmedQuery
      ? `/browse?q=${encodeURIComponent(trimmedQuery)}`
      : "/browse";

    onOpenChange(false);
    setQuery("");
    router.push(href);
  }, [onOpenChange, query, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 overflow-hidden bg-card border-border"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Tìm kiếm truyện </DialogTitle>
        <DialogDescription className="sr-only">
          Tìm kiếm theo tên truyện
        </DialogDescription>

        {/* Search Input */}
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                navigateToBrowse();
              }
            }}
            placeholder="Search manga, manhwa, manhua..."
            className="flex-1 bg-transparent px-4 py-4 text-base text-foreground placeholder:text-muted-foreground outline-none"
            autoFocus
          />
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
          )}
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-md hover:bg-secondary text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {!hasSearched && query.length < 2 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nhập ít nhất 2 ký tự để bắt đầu tìm kiếm.....
            </div>
          ) : results.length === 0 && hasSearched && !isPending ? (
            <div className="py-12 text-center text-muted-foreground">
              Không tìm thấy kết quả cho &quot;{query}&quot;
            </div>
          ) : (
            <div className="p-2">
              {results.map((comic, index) => (
                <Link
                  key={comic._id || index}
                  href={`/manga/${comic.slug}`}
                  onClick={handleSelect}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-secondary transition-colors group"
                >
                  {/* Cover Image */}
                  <div className="relative w-14 h-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image
                      src={comic.thumb_url}
                      alt={comic.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {comic.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {comic.chaptersLatest?.[0]?.chapter_name
                        ? `Chapter ${comic.chaptersLatest[0].chapter_name}`
                        : formatRelativeTime(comic.updatedAt)}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {comic.category.slice(0, 3).map((cat, index) => (
                        <Badge
                          key={`${comic._id}-${cat.id}-${index}`}
                          variant="secondary"
                          className="text-xs px-2 py-0.5 bg-secondary/80"
                        >
                          {cat.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* View All Results Button */}
        <div className="border-t border-border p-3">
          <Button
            className="w-full gap-2"
            variant="default"
            onClick={navigateToBrowse}
          >
            Xem tất cả kết quả tìm kiếm
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Search trigger button component
export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card/70 px-4 py-2.5 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-secondary/60"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="text-sm flex-1 text-left">Tìm truyện....</span>
      <kbd className="hidden h-6 items-center rounded-md border border-border/80 bg-secondary/80 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:inline-flex">
        Ctrl K
      </kbd>
    </button>
  );
}
