"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/better-auth/auth-client";

export function HeaderAuthButton() {
  // Session is loaded client-side so the layout stays statically renderable.
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  if (isPending) {
    return (
      <div
        className="h-9 w-9 animate-pulse rounded-full bg-secondary"
        aria-hidden="true"
      />
    );
  }

  if (user) {
    const userInitial =
      user.name?.charAt(0).toUpperCase() ??
      user.email?.charAt(0).toUpperCase() ??
      "U";

    return (
      <Link href="/profile" aria-label="View profile">
        <Avatar className="h-9 w-9 border border-border">
          <AvatarImage src={user.image ?? ""} alt={user.name} />
          <AvatarFallback>{userInitial}</AvatarFallback>
        </Avatar>
      </Link>
    );
  }

  return (
    <Link href="/sign-in">
      <Button variant="secondary" size="sm" className="gap-2">
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">Đăng nhập</span>
      </Button>
    </Link>
  );
}
