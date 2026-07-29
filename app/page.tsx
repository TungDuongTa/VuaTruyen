import type { Metadata } from "next";
import { Suspense } from "react";
import { HeroSectionApi } from "@/components/hero-section-api";
import {
  HomeSidebar,
  HomeSidebarSkeleton,
} from "@/components/home-sidebar";
import { MangaCardApi } from "@/components/manga-card-api";
import { getHeroManga, getListByType } from "@/lib/actions/manga-actions";
import { buildBrowseHref } from "@/lib/browse-params";
import {
  SITE_ALTERNATE_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
  toAbsoluteUrl,
} from "@/lib/seo";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Manga lists + sidebar use "use cache" in manga-cache.ts.
// Sidebar streams separately so rankings/comments never block hero/grids.

export const metadata: Metadata = {
  title: {
    absolute: "VuaTruyen - Vua Truyện đọc manga, manhwa và manhua online",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const [heroComics, completedData, ongoingData] = await Promise.all([
    getHeroManga(),
    getListByType("hoan-thanh", 1),
    getListByType("dang-phat-hanh", 1),
  ]);

  const completedComics = completedData?.items || [];
  const ongoingComics = ongoingData?.items || [];
  const latestBrowseHref = buildBrowseHref({ page: 2 });

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: [
      "VuaTruyen",
      "vuatruyen",
      SITE_ALTERNATE_NAME,
      "Vua Truyen",
      "Vua truyện",
      "vua truyen",
      "Vua truyen",
      "Vua Truyện",
      "vua truyện",
    ],
    url: toAbsoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${toAbsoluteUrl("/browse")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <HeroSectionApi featuredComics={heroComics} />
        </section>

        {/* Main Content with Sidebar Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left Side - Manga List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Mới cập nhật</h2>
              <Link
                href={latestBrowseHref}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Xem tất cả <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
              {ongoingComics.slice(0, 24).map((comic) => (
                <MangaCardApi key={comic._id} comic={comic} />
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Link href={latestBrowseHref}>
                <Button variant="outline" className="gap-2">
                  Xem tất cả
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Side - Rankings & Comments (streamed) */}
          <Suspense fallback={<HomeSidebarSkeleton />}>
            <HomeSidebar />
          </Suspense>
        </section>

        {/* Completed Manga Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              Truyện đã hoàn thành
            </h2>
            <Link
              href={buildBrowseHref({ status: "completed" })}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Xem tất cả
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3">
            {completedComics.slice(0, 6).map((comic) => (
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
