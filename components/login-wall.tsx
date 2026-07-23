import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type LoginWallProps = {
  icon: LucideIcon;
  description: string;
  /** Route to return to after signing in. */
  callbackUrl?: string;
};

export function LoginWall({
  icon: Icon,
  description,
  callbackUrl,
}: LoginWallProps) {
  const href = callbackUrl
    ? `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/sign-in";

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Icon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Vui lòng đăng nhập
          </h1>
          <p className="text-muted-foreground mb-6">{description}</p>
          <Link href={href}>
            <Button>Đăng nhập</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
