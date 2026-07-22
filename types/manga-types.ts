// Manga domain types (UI-compatible shapes)

export interface Pagination {
  totalItems: number;
  totalItemsPerPage: number;
  currentPage: number;
}

export interface MangaListResult {
  items: OTruyenComic[];
  pagination: Pagination;
}

export interface OTruyenComic {
  _id: string;
  name: string;
  slug: string;
  origin_name: string[];
  status: string;
  thumb_url: string;
  category: Category[];
  updatedAt: string;
  chaptersLatest?: ChapterData[];
  totalViews?: number;
  periodViews?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface ComicDetailItem {
  _id: string;
  name: string;
  slug: string;
  origin_name: string[];
  content: string;
  status: string;
  thumb_url: string;
  author: string[];
  category: Category[];
  chapters: ChapterGroup[];
  updatedAt: string;
}

export interface ChapterGroup {
  server_name: string;
  server_data: ChapterData[];
}

export interface ChapterData {
  filename: string;
  chapter_name: string;
  chapter_title: string;
  chapter_api_data: string;
}

export interface ChapterItem {
  _id: string;
  comic_name: string;
  chapter_name: string;
  chapter_title: string;
  chapter_image: ChapterImage[];
}

export interface ChapterImage {
  image_page: number;
  image_file: string;
}

export function formatStatus(status: string): string {
  switch (status) {
    case "ongoing":
      return "Đang cập nhật";
    case "completed":
      return "Hoàn thành";
    case "coming_soon":
      return "Sắp ra mắt";
    default:
      return status;
  }
}
