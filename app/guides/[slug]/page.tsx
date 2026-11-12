import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DocPage from "@/components/DocPage";
import AdSense from "@/components/AdSense";
import { guides } from "@/data/guides";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return guides.map((g) => ({ slug: g.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = guides.find((g) => g.slug === slug);
  if (!guide) return {};
  const title = `${guide.title} | Scenic Rails`;
  return { title, description: guide.description, alternates: { canonical: `/guides/${guide.slug}` }, openGraph: { title, description: guide.description } };
}

function Paragraph({ text }: { text: string }) {
  const link = /\[([^\]]+)\]\((\/[^)\s]+)\)/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = link.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<Link key={key++} href={match[2]}>{match[1]}</Link>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <p>{parts}</p>;
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = guides.find((g) => g.slug === slug);
  if (!guide) notFound();
  const others = guides.filter((g) => g.slug !== slug);
  return (
    <DocPage>
      <article className="doc-article">
        <p className="doc-crumbs"><Link href="/guides">Practical guides</Link></p>
        <h1>{guide.title}</h1>
        <p className="doc-lede">{guide.lede}</p>
        {guide.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs.map((p) => <Paragraph key={p.slice(0, 48)} text={p} />)}
          </section>
        ))}
        {others.length > 0 && (
          <section>
            <h2>Also read</h2>
            <ul className="doc-cards">
              {others.map((g) => (
                <li key={g.slug}><Link href={`/guides/${g.slug}`}><strong>{g.title}</strong><span>{g.description}</span></Link></li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h2>Scenic routes</h2>
          <p>The line-by-line versions of this advice are the <Link href="/routes">scenic route guides</Link>.</p>
        </section>
      </article>
      <AdSense />
    </DocPage>
  );
}
