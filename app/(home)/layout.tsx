import JsonLd from "@/components/JsonLd";
import { sceneryFaqs } from "@/data/faqs";
import { faqJsonLd, homeMeta, websiteJsonLd } from "@/lib/seo";

export const metadata = homeMeta();

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={faqJsonLd(sceneryFaqs)} />
      {children}
    </>
  );
}
