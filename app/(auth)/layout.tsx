import type { Metadata } from "next";
import "@/app/globals.css";
import { getSessionUser } from "@/lib/server/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Tài khoản",
  description: "Hãy đăng nhập để lưu danh sách theo dõi và lịch sử đọc của bạn",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionUser = await getSessionUser();
  if (sessionUser) {
    redirect("/");
  }
  return (
    <main>
      <section className={` font-sans antialiased`}>{children}</section>
    </main>
  );
}
