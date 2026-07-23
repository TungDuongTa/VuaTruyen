import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChapterReaderPageClient } from "@/components/chapter-reader-page-client";
import { getComicDetail, getChapterData } from "@/lib/actions/manga-actions";
import { toAbsoluteUrl, withSiteSuffix } from "@/lib/seo";

// Public chapter pages: cache at the edge and refresh at most every 24 hours.
// Per-user bookmark/progress is loaded client-side so this stays ISR-eligible.
export const revalidate = 86400;
export const dynamic = "force-static";
export const dynamicParams = true;

// Empty = generate none at build time; unknown chapters are still ISR'd on first request.
export async function generateStaticParams() {
  return [] as Array<{ id: string; chapter: string }>;
}

type ChapterReaderPageProps = {
  params: Promise<{ id: string; chapter: string }>;
};

const getComicDetailCached = cache(async (slug: string) =>
  getComicDetail(slug),
);

export async function generateMetadata({
  params,
}: ChapterReaderPageProps): Promise<Metadata> {
  const { id, chapter } = await params;
  const comic = await getComicDetailCached(id);
  const comicSlug = comic?.slug || id;
  const canonicalPath = `/manga/${comicSlug}/chapter/${chapter}`;

  if (!comic) {
    return {
      title: `Không tìm thấy chapter ${chapter}`,
      description: "Không tìm thấy chapter bạn yêu cầu",
      alternates: {
        canonical: canonicalPath,
      },
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title = `${comic.name} Chapter ${chapter}`;
  const description = `Đọc truyện tranh ${comic.name} chapter ${chapter} mới nhất được cập nhật tại VuaTruyen`;
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
              alt: `${comic.name} Chapter ${chapter}`,
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

export default async function ChapterReaderPage({
  params,
}: ChapterReaderPageProps) {
  const { id, chapter } = await params;

  const comic = await getComicDetailCached(id);
  if (!comic) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="mb-4 text-2xl font-bold text-foreground">
          Không tìm thấy chapter
        </h1>
        <Link href={`/manga/${id}`}>
          <Button>Quay lại</Button>
        </Link>
      </div>
    );
  }

  const allChapters = comic.chapters?.[0]?.server_data || [];
  const currentChapterData = allChapters.find(
    (c) => c.chapter_name === chapter,
  );

  if (!currentChapterData?.chapter_api_data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="mb-4 text-2xl font-bold text-foreground">
          Không tìm thấy chapter
        </h1>
        <Link href={`/manga/${comic.slug || id}`}>
          <Button>Quay lại</Button>
        </Link>
      </div>
    );
  }

  const chapterContent = await getChapterData(comic.slug || id, chapter);
  const chapterImages = chapterContent?.chapter_image || [];

  if (chapterImages.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="mb-4 text-2xl font-bold text-foreground">
          Không tìm thấy chapter
        </h1>
        <Link href={`/manga/${comic.slug || id}`}>
          <Button>Quay lại</Button>
        </Link>
      </div>
    );
  }

  const mangaUrl = toAbsoluteUrl(`/manga/${comic.slug}`);
  const chapterUrl = toAbsoluteUrl(`/manga/${comic.slug}/chapter/${chapter}`);
  const chapterJsonLd = {
    "@context": "https://schema.org",
    "@type": "ComicIssue",
    name: `${comic.name} Chapter ${chapter}`,
    url: chapterUrl,
    isPartOf: {
      "@type": "ComicSeries",
      name: comic.name,
      url: mangaUrl,
    },
    image: comic.thumb_url?.trim() || undefined,
    author: (comic.author || []).filter(Boolean).map((name) => ({
      "@type": "Person",
      name,
    })),
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
      {
        "@type": "ListItem",
        position: 3,
        name: `Chapter ${chapter}`,
        item: chapterUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(chapterJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ChapterReaderPageClient
        id={id}
        chapter={chapter}
        comic={comic}
        chapterImages={chapterImages}
      />
    </>
  );
}
