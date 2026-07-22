import { Schema, model, models } from "mongoose";

const bookmarkSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    slug: { type: String, required: true },
    comicId: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

bookmarkSchema.index({ userId: 1, slug: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, createdAt: -1 });

export const BookmarkModel =
  models.Bookmark || model("Bookmark", bookmarkSchema);
