import { Users } from "lucide-react";
import type { UserRankingItem } from "@/lib/server/user-rankings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getLevelBadgeTier,
  getLevelUsernameEffect,
} from "@/lib/level-badge-tiers";

interface UserRankingSidebarProps {
  users: UserRankingItem[];
}

const getMedalClassName = (index: number) => {
  if (index === 0) return "bg-chart-3 text-background";
  if (index === 1) return "bg-gray-400 text-background";
  if (index === 2) return "bg-amber-700 text-background";
  return "bg-secondary text-muted-foreground";
};

const getUserInitial = (name: string) => {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "U";
  return trimmed.charAt(0).toUpperCase();
};

export function UserRankingSidebar({ users }: UserRankingSidebarProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Top độc giả</h3>
      </div>

      {users.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Chưa có dữ liệu xếp hạng.
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user, index) => {
            const usernameEffect = getLevelUsernameEffect(user.level);
            const levelBadgeTier = getLevelBadgeTier(user.level);

            return (
              <div
                key={user.userId}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/70"
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    getMedalClassName(index),
                  )}
                >
                  {user.rank}
                </div>

                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={user.image} alt={user.name} />
                  <AvatarFallback className="text-xs">
                    {getUserInitial(user.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "truncate text-sm font-semibold tracking-wide",
                        usernameEffect.className,
                      )}
                      title={`${usernameEffect.name} username effect`}
                    >
                      {user.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 max-w-30 shrink-0 rounded-full px-2 text-[10px] font-semibold",
                        levelBadgeTier.className,
                      )}
                      title={levelBadgeTier.title}
                    >
                      <span className="truncate">{levelBadgeTier.title}</span>
                    </Badge>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Lv.{user.level}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
