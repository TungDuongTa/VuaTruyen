import { Schema, model, models } from "mongoose";

const userReadingStatsSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    chaptersRead: { type: Number, required: true, default: 0, min: 0 },
  },
  {
    timestamps: true,
  },
);

userReadingStatsSchema.index({ chaptersRead: -1, updatedAt: 1 });

export const UserReadingStatsModel =
  models.UserReadingStats || model("UserReadingStats", userReadingStatsSchema);
