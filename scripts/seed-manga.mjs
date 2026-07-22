import "dotenv/config";
import mongoose from "mongoose";

const CATEGORIES = [
  { slug: "action", name: "Action" },
  { slug: "romance", name: "Romance" },
  { slug: "comedy", name: "Comedy" },
  { slug: "fantasy", name: "Fantasy" },
  { slug: "drama", name: "Drama" },
  { slug: "horror", name: "Horror" },
  { slug: "slice-of-life", name: "Slice of Life" },
  { slug: "isekai", name: "Isekai" },
];

const MANGA_SEED = [
  {
    slug: "solo-leveling",
    name: "Solo Leveling",
    originNames: ["Na Honjaman Level Up", "Only I Level Up"],
    content:
      "<p>Sung Jin-Woo là thợ săn yếu nhất thế giới. Sau một sự kiện bí ẩn, anh trở thành người duy nhất có thể lên cấp vô hạn.</p>",
    status: "completed",
    authors: ["Chugong"],
    categories: ["action", "fantasy"],
    tags: [],
    isFeatured: true,
    chapterCount: 5,
  },
  {
    slug: "one-piece-vua-hai-tac",
    name: "One Piece",
    originNames: ["Vua Hải Tặc"],
    content:
      "<p>Luffy và băng Mũ Rơm lên đường tìm kho báu One Piece để trở thành Vua Hải Tặc.</p>",
    status: "ongoing",
    authors: ["Eiichiro Oda"],
    categories: ["action", "comedy", "fantasy"],
    tags: [],
    isFeatured: true,
    chapterCount: 5,
  },
  {
    slug: "tower-of-god",
    name: "Tower of God",
    originNames: ["Sin-ui Tap"],
    content:
      "<p>Bam leo Tháp để tìm Rachel và khám phá bí mật ở đỉnh tháp.</p>",
    status: "ongoing",
    authors: ["SIU"],
    categories: ["action", "fantasy", "drama"],
    tags: [],
    isFeatured: true,
    chapterCount: 4,
  },
  {
    slug: "love-revolution",
    name: "Love Revolution",
    originNames: ["Revolution Tình Yêu"],
    content:
      "<p>Câu chuyện tình yêu tuổi học trò đầy ngọt ngào và hài hước.</p>",
    status: "completed",
    authors: ["232"],
    categories: ["romance", "comedy", "slice-of-life"],
    tags: [],
    isFeatured: false,
    chapterCount: 3,
  },
  {
    slug: "omniscient-reader",
    name: "Omniscient Reader's Viewpoint",
    originNames: ["ORV", "Docja Omniscient"],
    content:
      "<p>Kim Dokja là độc giả duy nhất của tiểu thuyết 'Three Ways to Survive the Apocalypse'.</p>",
    status: "ongoing",
    authors: ["sing N song"],
    categories: ["action", "fantasy", "drama"],
    tags: [],
    isFeatured: true,
    chapterCount: 4,
  },
  {
    slug: "horror-nights",
    name: "Horror Nights",
    originNames: ["Đêm Kinh Hoàng"],
    content: "<p>Những câu chuyện kinh dị xảy ra vào ban đêm.</p>",
    status: "ongoing",
    authors: ["Unknown"],
    categories: ["horror", "drama"],
    tags: [],
    isFeatured: false,
    chapterCount: 3,
  },
  {
    slug: "reincarnated-swordmaster",
    name: "Reincarnated Swordmaster",
    originNames: ["Kiếm Thánh Chuyển Sinh"],
    content:
      "<p>Một kiếm sĩ huyền thoại chuyển sinh sang thế giới fantasy.</p>",
    status: "ongoing",
    authors: ["Lee MC"],
    categories: ["isekai", "action", "fantasy"],
    tags: [],
    isFeatured: false,
    chapterCount: 4,
  },
  {
    slug: "midnight-secret",
    name: "Midnight Secret",
    originNames: ["Bí Mật Nửa Đêm"],
    content: "<p>Một câu chuyện dành cho người trưởng thành.</p>",
    status: "ongoing",
    authors: ["Anonymous"],
    categories: ["romance", "drama"],
    tags: ["18+"],
    isFeatured: false,
    chapterCount: 3,
  },
  {
    slug: "after-hours",
    name: "After Hours",
    originNames: ["Sau Giờ Làm"],
    content: "<p>Những câu chuyện xảy ra sau giờ làm việc.</p>",
    status: "ongoing",
    authors: ["Night Owl"],
    categories: ["romance", "comedy"],
    tags: ["18+"],
    isFeatured: false,
    chapterCount: 3,
  },
  {
    slug: "velvet-dreams",
    name: "Velvet Dreams",
    originNames: ["Giấc Mơ Nhung"],
    content: "<p>Truyện người lớn với nội dung dành cho 18+.</p>",
    status: "completed",
    authors: ["Velvet Studio"],
    categories: ["romance", "drama"],
    tags: ["18+"],
    isFeatured: false,
    chapterCount: 3,
  },
  {
    slug: "school-days-memories",
    name: "School Days Memories",
    originNames: ["Kỷ Niệm Tuổi Học Trò"],
    content: "<p>Những kỷ niệm đẹp thời học sinh.</p>",
    status: "completed",
    authors: ["Memory Lane"],
    categories: ["slice-of-life", "romance", "comedy"],
    tags: [],
    isFeatured: false,
    chapterCount: 3,
  },
  {
    slug: "demon-slayer-rebirth",
    name: "Demon Slayer: Rebirth",
    originNames: ["Kimetsu Fan Comic"],
    content: "<p>Phiên bản fan-made về hành trình diệt quỷ.</p>",
    status: "coming_soon",
    authors: ["Fan Studio"],
    categories: ["action", "fantasy"],
    tags: [],
    isFeatured: false,
    chapterCount: 0,
  },
];

const categoryMap = Object.fromEntries(
  CATEGORIES.map((category) => [category.slug, category]),
);

const coverUrl = (seed, index) =>
  `https://picsum.photos/seed/${seed.slug}-${index}/400/600`;

const pageUrl = (mangaSlug, chapter, page) =>
  `https://picsum.photos/seed/${mangaSlug}-ch${chapter}-p${page}/800/1200`;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("ERROR: MONGODB_URI must be set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri, { bufferCommands: false });
  const db = mongoose.connection.db;

  console.log("Clearing existing manga data...");
  await db.collection("categories").deleteMany({});
  await db.collection("mangas").deleteMany({});
  await db.collection("chapters").deleteMany({});

  console.log("Seeding categories...");
  await db.collection("categories").insertMany(CATEGORIES);

  console.log("Seeding manga and chapters...");
  const now = new Date();

  for (const [index, seed] of MANGA_SEED.entries()) {
    const categories = seed.categories.map((slug) => ({
      id: slug,
      name: categoryMap[slug]?.name || slug,
      slug,
    }));

    const tags = [...seed.tags];
    if (seed.status === "coming_soon" && !tags.includes("coming-soon")) {
      tags.push("coming-soon");
    }

    const latestChapterName =
      seed.chapterCount > 0 ? String(seed.chapterCount) : "";
    const updatedAt = new Date(now.getTime() - index * 3600_000);

    await db.collection("mangas").insertOne({
      slug: seed.slug,
      name: seed.name,
      originNames: seed.originNames,
      content: seed.content,
      status: seed.status,
      thumbUrl: coverUrl(seed, index),
      authors: seed.authors,
      categories,
      tags,
      isFeatured: seed.isFeatured,
      latestChapterName,
      chapterCount: seed.chapterCount,
      createdAt: updatedAt,
      updatedAt,
    });

    for (let chapterNum = 1; chapterNum <= seed.chapterCount; chapterNum++) {
      const pages = Array.from({ length: 4 }, (_, pageIndex) => ({
        index: pageIndex + 1,
        imageUrl: pageUrl(seed.slug, chapterNum, pageIndex + 1),
      }));

      await db.collection("chapters").insertOne({
        mangaSlug: seed.slug,
        chapterName: String(chapterNum),
        chapterTitle: `Chapter ${chapterNum}`,
        chapterNumber: chapterNum,
        pages,
        createdAt: updatedAt,
        updatedAt,
      });
    }
  }

  const mangaCount = await db.collection("mangas").countDocuments({});
  const chapterCount = await db.collection("chapters").countDocuments({});
  const adultCount = await db
    .collection("mangas")
    .countDocuments({ tags: "18+" });

  console.log(`Done! Seeded ${mangaCount} manga, ${chapterCount} chapters.`);
  console.log(`Adult (18+) manga: ${adultCount}`);

  await mongoose.connection.close();
  process.exit(0);
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
