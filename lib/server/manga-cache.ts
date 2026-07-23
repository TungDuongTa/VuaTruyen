import { unstable_cache } from "next/cache";
import {
  getMangaCategories,
  getMangaList,
  type MangaListType,
} from "@/lib/services/manga.service";
import type { Category, MangaListResult } from "@/types/manga-types";

const CATEGORIES_REVALIDATE_SECONDS = 86_400; // 24h
const BROWSE_LIST_REVALIDATE_SECONDS = 3_600; // 1h

/** Genre list rarely changes — share across all browse requests. */
export const getCachedCategories = unstable_cache(
  async (): Promise<Category[]> => getMangaCategories(),
  ["manga-categories"],
  {
    revalidate: CATEGORIES_REVALIDATE_SECONDS,
    tags: ["manga-categories"],
  },
);

/** Default / filtered browse first page without cursor. */
export const getCachedBrowseListPage1 = (
  type: MangaListType,
): Promise<MangaListResult> =>
  unstable_cache(
    async () => getMangaList({ type, page: 1 }),
    ["browse-list-page1", type],
    {
      revalidate: BROWSE_LIST_REVALIDATE_SECONDS,
      tags: ["browse-lists"],
    },
  )();

/** Default /18+ first page without cursor. */
export const getCachedAdultListPage1 = unstable_cache(
  async (): Promise<MangaListResult> =>
    getMangaList({
      type: "truyen-moi",
      tag: "18+",
      page: 1,
      pageSize: 24,
    }),
  ["adult-list-page1"],
  {
    revalidate: BROWSE_LIST_REVALIDATE_SECONDS,
    tags: ["adult-lists"],
  },
);
