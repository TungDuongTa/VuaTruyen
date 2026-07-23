import mongoose, { Schema, type InferSchemaType } from "mongoose";

const mangaCategorySchema = new Schema(
  {
    id: { type: String, default: "" },
    name: { type: String, required: true },
    slug: { type: String, required: true },
  },
  { _id: false },
);

const mangaSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    originNames: { type: [String], default: [] },
    content: { type: String, default: "" },
    status: {
      type: String,
      enum: ["ongoing", "completed", "coming_soon"],
      default: "ongoing",
      index: true,
    },
    thumbUrl: { type: String, default: "" },
    authors: { type: [String], default: [] },
    categories: { type: [mangaCategorySchema], default: [] },
    tags: { type: [String], default: [], index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    latestChapterName: { type: String, default: "" },
    chapterCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

mangaSchema.index({ updatedAt: -1 });
mangaSchema.index({ updatedAt: -1, _id: -1 });
mangaSchema.index({ status: 1, updatedAt: -1 });
mangaSchema.index({ tags: 1, updatedAt: -1 });
mangaSchema.index({ "categories.slug": 1, updatedAt: -1 });

export type MangaDoc = InferSchemaType<typeof mangaSchema>;

export const MangaModel =
  mongoose.models.Manga || mongoose.model("Manga", mangaSchema, "mangas");
