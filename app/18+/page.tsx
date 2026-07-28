import type { Metadata } from "next";
import { AdultCatalogPage } from "@/components/adult-catalog-page";
import {
  ADULT_CATALOG_BASE,
  ADULT_CATALOG_DESCRIPTION,
  adultCatalogPageTitle,
  buildAdultCatalogCanonical,
} from "@/lib/adult-catalog-params";
import { withSiteSuffix } from "@/lib/seo";

const title = adultCatalogPageTitle(1);
const canonicalPath = buildAdultCatalogCanonical(1);

export const metadata: Metadata = {
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

export default function Manga18IndexPage() {
  return <AdultCatalogPage requestedPage={1} />;
}
