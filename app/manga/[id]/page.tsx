import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MangaDetailPageClient } from "@/components/manga-detail-page-client";
import { getMangaViewStats } from "@/lib/actions/manga-view.actions";
import { getComicDetail } from "@/lib/actions/manga-actions";
import { getMangaPersonalState } from "@/lib/actions/reading-progress.actions";
import {
  stripHtml,
  toAbsoluteUrl,
  truncateText,
  withSiteSuffix,
} from "@/lib/seo";

type MangaDetailPageProps = {
  params: Promise<{ id: string }>;
};

const getComicDetailCached = cache(async (slug: string) =>
  getComicDetail(slug),
);

export async function generateMetadata({
  params,
}: MangaDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const comic = await getComicDetailCached(id);
  const canonicalPath = `/manga/${comic?.slug || id}`;

  if (!comic) {
    return {
      title: "Không tìm thấy truyện",
      description: "Không tìm thấy truyện",
      alternates: {
        canonical: canonicalPath,
      },
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const fallbackDescription = `Đọc truyện ${comic.name} mới nhất được cập nhật tại VuaTruyen`;
  const description = truncateText(
    stripHtml(comic.content || "") || fallbackDescription,
    160,
  );
  const title = `Truyện tranh ${comic.name}`;
  const coverImage = comic.thumb_url?.trim() ? comic.thumb_url : "";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: withSiteSuffix(title),
      description,
      type: "article",
      url: canonicalPath,
      images: coverImage
        ? [
            {
              url: coverImage,
              alt: comic.name,
            },
          ]
        : undefined,
    },
    twitter: {
      title: withSiteSuffix(title),
      description,
      images: coverImage ? [coverImage] : undefined,
    },
  };
}

export default async function MangaDetailPage({
  params,
}: MangaDetailPageProps) {
  const { id } = await params;

  const [detailResult, viewResult, personalResult] = await Promise.allSettled([
    getComicDetailCached(id),
    getMangaViewStats(id),
    getMangaPersonalState(id),
  ]);

  const comic = detailResult.status === "fulfilled" ? detailResult.value : null;

  if (!comic) {
    return (
      <div className="min-h-screen">
        <main className="flex min-h-[60vh] flex-col items-center justify-center">
          <h1 className="mb-4 text-2xl font-bold text-foreground">
            Không tìm thấy truyện
          </h1>
          <Link href="/">
            <Button>Quay về trang chủ</Button>
          </Link>
        </main>
      </div>
    );
  }

  const initialTotalViews =
    viewResult.status === "fulfilled" ? viewResult.value.totalViews : 0;
  const personalState =
    personalResult.status === "fulfilled"
      ? personalResult.value
      : { bookmarked: false, readChapterNames: [] };

  const mangaUrl = toAbsoluteUrl(`/manga/${comic.slug}`);
  const description = truncateText(
    stripHtml(comic.content || "") ||
      `Đọc truyện ${comic.name} mới nhất được cập nhật tại VuaTruyen`,
    300,
  );
  const chapterCount = comic.chapters?.[0]?.server_data?.length || 0;
  const comicJsonLd = {
    "@context": "https://schema.org",
    "@type": "ComicSeries",
    name: comic.name,
    alternateName: (comic.origin_name || []).filter(Boolean),
    url: mangaUrl,
    description,
    image: comic.thumb_url?.trim() || undefined,
    inLanguage: "vi",
    genre: (comic.category || []).map((item) => item.name).filter(Boolean),
    author: (comic.author || []).filter(Boolean).map((name) => ({
      "@type": "Person",
      name,
    })),
    numberOfIssues: chapterCount || undefined,
    creativeWorkStatus: comic.status || undefined,
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: toAbsoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: comic.name,
        item: mangaUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(comicJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <MangaDetailPageClient
        id={id}
        comic={comic}
        initialTotalViews={initialTotalViews}
        initialBookmarked={personalState.bookmarked}
        initialReadChapterNames={personalState.readChapterNames}
      />
    </>
  );
}
