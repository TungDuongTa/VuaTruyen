import type { Metadata } from "next";
import { BrowseCatalogPage } from "@/components/browse-catalog-page";
import {
  BROWSE_DESCRIPTION,
  browseTitleFromFilters,
  buildBrowseHref,
  parseBrowseFilters,
  type BrowseSearchParams,
} from "@/lib/browse-params";
import { withSiteSuffix } from "@/lib/seo";

type PageProps = {
  searchParams: Promise<BrowseSearchParams>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const filters = parseBrowseFilters(await searchParams);
  const title = browseTitleFromFilters(filters);
  const canonicalPath = buildBrowseHref(filters);

  return {
    title,
    description: BROWSE_DESCRIPTION,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: withSiteSuffix(title),
      description: BROWSE_DESCRIPTION,
      url: canonicalPath,
    },
    twitter: {
      title: withSiteSuffix(title),
      description: BROWSE_DESCRIPTION,
    },
  };
}

export default async function BrowseFilteredPage({
  searchParams,
}: PageProps) {
  const filters = parseBrowseFilters(await searchParams);
  return <BrowseCatalogPage filters={filters} />;
}
