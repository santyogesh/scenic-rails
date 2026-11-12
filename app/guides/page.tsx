import type { Metadata } from "next";
import Link from "next/link";
import DocPage from "@/components/DocPage";
import AdSense from "@/components/AdSense";
import { guides } from "@/data/guides";

export const metadata: Metadata = {
  title: "Practical guides | Scenic Rails",
  description: "How to choose a side of the train, and how the Scenic Rails live map decides what you are passing.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndex() {
  return (
    <DocPage>
      <article className="doc-article">
        <h1>Practical guides</h1>
        <p className="doc-lede">
          Shorter than a route guide, and about the ride rather than one line: where to sit, and what the live map is actually telling you.
        </p>
        <ul className="doc-cards">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`}>
                <strong>{g.title}</strong>
                <span>{g.description}</span>
              </Link>
            </li>
          ))}
        </ul>
        <section>
          <h2>Route by route</h2>
          <p>
            The seat advice for a particular journey lives on that route. The <Link href="/routes">scenic route guides</Link> name the side, when there is one, and say so when the loops make it pointless.
          </p>
        </section>
      </article>
      <AdSense />
    </DocPage>
  );
}
