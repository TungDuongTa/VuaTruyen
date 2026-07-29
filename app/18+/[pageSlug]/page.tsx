import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdultCatalogPage } from "@/components/adult-catalog-page";
import {
  ADULT_CATALOG_BASE,
  ADULT_CATALOG_DESCRIPTION,
  adultCatalogPageTitle,
  adultCatalogStaticPageParams,
  buildAdultCatalogCanonical,
  parseAdultCatalogPageSlug,
} from "@/lib/adult-catalog-params";
import { MAX_OFFSET_PAGE } from "@/lib/pagination";
import { withSiteSuffix } from "@/lib/seo";

type PageProps = {
  params: Promise<{
    pageSlug: string;
  }>;
};

export function generateStaticParams() {
  return adultCatalogStaticPageParams();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { pageSlug } = await params;
  const currentPage = parseAdultCatalogPageSlug(pageSlug);
  if (currentPage === null) {
    return {
      title: "Thư viện truyện tranh 18+",
      description: ADULT_CATALOG_DESCRIPTION,
    };
  }

  const canonicalPath = buildAdultCatalogCanonical(currentPage);
  const title = adultCatalogPageTitle(currentPage);

  return {
    title,
    description: ADULT_CATALOG_DESCRIPTION,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: withSiteSuffix(title),
      description: ADULT_CATALOG_DESCRIPTION,
      url: canonicalPath,
    },
    twitter: {
      title: withSiteSuffix(title),
      description: ADULT_CATALOG_DESCRIPTION,
    },
  };
}

export default async function Manga18PagedPage({ params }: PageProps) {
  const { pageSlug } = await params;
  const requestedPage = parseAdultCatalogPageSlug(pageSlug);

  if (requestedPage === null) {
    notFound();
  }

  if (requestedPage <= 1) {
    redirect(ADULT_CATALOG_BASE);
  }

  if (requestedPage > MAX_OFFSET_PAGE) {
    notFound();
  }

  return <AdultCatalogPage requestedPage={requestedPage} />;
}
