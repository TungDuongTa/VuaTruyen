import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdultCatalogPage } from "@/components/adult-catalog-page";
import {
  ADULT_CATALOG_BASE,
  ADULT_CATALOG_DESCRIPTION,
  adultCatalogPageTitle,
  adultCatalogStaticPageParams,
  buildAdultCatalogCanonical,
  parseAdultCatalogPageParam,
} from "@/lib/adult-catalog-params";
import { MAX_OFFSET_PAGE } from "@/lib/pagination";
import { withSiteSuffix } from "@/lib/seo";

type PageProps = {
  params: Promise<{
    page: string;
  }>;
};

export function generateStaticParams() {
  return adultCatalogStaticPageParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { page } = await params;
  const currentPage = parseAdultCatalogPageParam(page);
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
  const { page } = await params;
  const requestedPage = parseAdultCatalogPageParam(page);

  if (requestedPage <= 1) {
    redirect(ADULT_CATALOG_BASE);
  }

  if (requestedPage > MAX_OFFSET_PAGE) {
    notFound();
  }

  return <AdultCatalogPage requestedPage={requestedPage} />;
}
