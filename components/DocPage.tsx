import Link from "next/link";
import SiteFooter from "./SiteFooter";
import { SITE_NAME } from "@/lib/site";

/** A scrolling page for written content; the rest of the site is full-screen maps. */
export default function DocPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="doc">
      <header className="doc-top">
        <Link href="/" className="doc-brand">{SITE_NAME}</Link>
        <nav aria-label="Main">
          <Link href="/routes">Route guides</Link>
          <Link href="/about">About</Link>
        </nav>
      </header>
      <main className="doc-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
