import mongoose, { Schema, type InferSchemaType } from "mongoose";

const chapterPageSchema = new Schema(
  {
    index: { type: Number, required: true },
    imageUrl: { type: String, required: true },
  },
  { _id: false },
);

const chapterSchema = new Schema(
  {
    mangaSlug: { type: String, required: true, index: true },
    chapterName: { type: String, required: true },
    chapterTitle: { type: String, default: "" },
    chapterNumber: { type: Number, required: true, index: true },
    pages: { type: [chapterPageSchema], default: [] },
    // Written by the crawler; optional for legacy rows without the field.
    crawlStatus: {
      type: String,
      enum: ["pending", "crawling", "done", "error"],
      index: true,
    },
  },
  { timestamps: true },
);

chapterSchema.index({ mangaSlug: 1, chapterName: 1 }, { unique: true });
chapterSchema.index({ mangaSlug: 1, chapterNumber: 1 });

export type ChapterDoc = InferSchemaType<typeof chapterSchema>;

export const ChapterModel =
  mongoose.models.Chapter ||
  mongoose.model("Chapter", chapterSchema, "chapters");
