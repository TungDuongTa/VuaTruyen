import type { Metadata } from "next";
import { BrowseCatalogPage } from "@/components/browse-catalog-page";
import {
  BROWSE_BASE,
  BROWSE_DESCRIPTION,
  browseTitleFromFilters,
  buildBrowseHref,
} from "@/lib/browse-params";
import { withSiteSuffix } from "@/lib/seo";

const filters = { query: "", genre: "", status: "all" as const, page: 1 };
const title = browseTitleFromFilters(filters);
const canonicalPath = buildBrowseHref(filters);

export const metadata: Metadata = {
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

export default function BrowseIndexPage() {
  return <BrowseCatalogPage filters={filters} />;
}
