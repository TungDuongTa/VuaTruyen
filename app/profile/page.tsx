import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { UserRound } from "lucide-react";
import { auth } from "@/lib/better-auth/auth";
import { getCurrentUserReadingExpStats } from "@/lib/actions/reading-progress.actions";
import { Button } from "@/components/ui/button";
import { ProfilePageClient } from "@/components/profile/profile-page-client";
import { withSiteSuffix } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Hồ sơ",
  description: "Quản lí hồ sơ, ảnh đại diện và cấp độ của đọc giả.",
  alternates: {
    canonical: "/profile",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: withSiteSuffix("Hồ sơ"),
    description: "Quản lí hồ sơ, ảnh đại diện và cấp độ của đọc giả.",
    url: "/profile",
  },
};

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-sm">
            <UserRound className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
            <h1 className="mb-2 text-2xl font-semibold text-foreground">
              Vui lòng đăng nhập
            </h1>
            <p className="mb-6 text-muted-foreground">
              Vui lòng đăng nhập để quản lí hồ sơ, avatar và cấp độ của bạn
            </p>
            <Link href="/sign-in">
              <Button>Đăng nhập</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const readingExp = await getCurrentUserReadingExpStats();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,oklch(0.24_0.08_250/.45),transparent_55%),radial-gradient(circle_at_bottom_right,oklch(0.22_0.08_180/.3),transparent_55%)]">
      <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <ProfilePageClient
          initialProfile={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image ?? "",
          }}
          readingExp={readingExp}
        />
      </main>
    </div>
  );
}
