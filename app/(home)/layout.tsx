import JsonLd from "@/components/JsonLd";
import { homeMeta, websiteJsonLd } from "@/lib/seo";

export const metadata = homeMeta();

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      {children}
    </>
  );
}
