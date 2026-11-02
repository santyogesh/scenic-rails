import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav aria-label="Site">
        <Link href="/">Live train map</Link>
        <Link href="/routes">Scenic route guides</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/privacy">Privacy policy</Link>
      </nav>
      <p>© {new Date().getFullYear()} {SITE_NAME}</p>
    </footer>
  );
}
