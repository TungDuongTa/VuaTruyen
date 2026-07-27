import "server-only";
import { connectToDatabase } from "@/database/mongoose";
import { UserReadingStatsModel } from "@/database/models/user-reading-stats.model";
import { getAuthUserProfileMap } from "@/lib/server/auth-user-profiles";
import { toReadingExpStats } from "@/lib/user-level";

export type UserRankingItem = {
  userId: string;
  name: string;
  image: string;
  chaptersRead: number;
  level: number;
  totalExp: number;
  rank: number;
};

export const fetchUserRankings = async (
  limit = 10,
): Promise<UserRankingItem[]> => {
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit) || 10));

  try {
    await connectToDatabase();

    const statsRows = await UserReadingStatsModel.find({
      chaptersRead: { $gt: 0 },
    })
      .sort({ chaptersRead: -1, updatedAt: 1 })
      .limit(safeLimit)
      .select("userId chaptersRead")
      .lean();

    const userIds = statsRows
      .map((row) => String(row.userId || "").trim())
      .filter(Boolean);

    const profileMap = await getAuthUserProfileMap(userIds);

    return statsRows
      .map((row, index) => {
        const userId = String(row.userId || "").trim();
        if (!userId) return null;

        const chaptersRead = Math.max(0, Math.floor(Number(row.chaptersRead) || 0));
        const exp = toReadingExpStats(chaptersRead);
        const profile = profileMap.get(userId);

        return {
          userId,
          name: profile?.name || "User",
          image: profile?.image || "",
          chaptersRead,
          level: exp.level,
          totalExp: exp.totalExp,
          rank: index + 1,
        } satisfies UserRankingItem;
      })
      .filter((item): item is UserRankingItem => item !== null);
  } catch (error) {
    console.error("Failed to load user rankings:", error);
    return [];
  }
};
