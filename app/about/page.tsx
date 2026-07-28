import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { CONTACT_EMAIL } from "@/lib/site-config";
import { withSiteSuffix } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description:
    "Giới thiệu về VuaTruyen - nền tảng đọc manga, manhwa và manhua online tại Việt Nam.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: withSiteSuffix("Giới thiệu"),
    description:
      "Giới thiệu về VuaTruyen - nền tảng đọc manga, manhwa và manhua online tại Việt Nam.",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <LegalPage
      title="Giới thiệu VuaTruyen"
      description="VuaTruyen là nền tảng đọc truyện tranh trực tuyến dành cho cộng đồng yêu thích manga, manhwa và manhua."
    >
      <LegalSection title="Chúng tôi là ai">
        <p>
          VuaTruyen (vuatruyen.cc) cung cấp trải nghiệm đọc truyện tranh trực
          tuyến với giao diện hiện đại, tốc độ tải nhanh và cập nhật nội dung
          thường xuyên. Người dùng có thể khám phá truyện, theo dõi tiến độ đọc,
          lưu danh sách yêu thích và tham gia bình luận cùng cộng đồng.
        </p>
      </LegalSection>

      <LegalSection title="Tính năng chính">
        <ul className="list-disc space-y-2 pl-5">
          <li>Khám phá manga, manhwa, manhua theo thể loại và bảng xếp hạng</li>
          <li>Theo dõi truyện yêu thích và lịch sử đọc cá nhân</li>
          <li>Hệ thống cấp độ và thành tích cho người dùng tích cực</li>
          <li>Bình luận và tương tác cộng đồng trên từng bộ truyện</li>
        </ul>
      </LegalSection>

      <LegalSection title="Liên hệ">
        <p>
          Mọi góp ý, hợp tác hoặc yêu cầu hỗ trợ, vui lòng liên hệ qua email:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-primary hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
