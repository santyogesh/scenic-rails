import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Journey from "@/components/Journey";
import DocPage from "@/components/DocPage";
import AdSense from "@/components/AdSense";
import JsonLd from "@/components/JsonLd";
import { routes } from "@/data/routes";
import { articleJsonLd, breadcrumbJsonLd, pageMeta } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return routes.map((r) => ({ slug: r.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const route = routes.find((r) => r.slug === slug);
  if (!route) return {};
  return pageMeta({
    title: `${route.name}: scenery from the train`,
    description: `${route.blurb} What you see from the window on the ${route.name}, and which side of the train to sit.`,
    path: `/routes/${route.slug}`,
    keywords: [
      `${route.name} scenery`,
      `${route.name} train window`,
      `${route.name} which side to sit`,
      `${route.name} route`,
      "scenery from the train window",
    ],
  });
}

export default async function RoutePage({ params }: Props) {
  const { slug } = await params;
  const route = routes.find((r) => r.slug === slug);
  if (!route) notFound();
  const others = routes.filter((r) => r.slug !== slug);
  const path = `/routes/${route.slug}`;
  return (
    <DocPage>
      <JsonLd data={[
        breadcrumbJsonLd([
          { name: "Scenic Rails", path: "/" },
          { name: "Scenic route guides", path: "/routes" },
          { name: route.name, path },
        ]),
        articleJsonLd({ headline: `${route.name}: scenery from the train`, description: route.blurb, path }),
      ]} />
      <article className="doc-article">
        <p className="doc-crumbs"><Link href="/routes">Scenic route guides</Link></p>
        <h1>{route.name}</h1>
        <p className="doc-facts">{route.place} · {route.distance} · {route.duration}</p>
        <p className="doc-lede">{route.blurb}</p>
        <div className="doc-map"><Journey route={route} /></div>
        {route.article?.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </section>
        ))}
        <section>
          <h2>Places worth getting off for</h2>
          <dl className="doc-sights">
            {route.sights.map((s) => (
              <div key={s.name}>
                <dt>{s.name}</dt>
                <dd>{s.text}{s.tip ? ` ${s.tip}` : ""}</dd>
              </div>
            ))}
          </dl>
        </section>
        {others.length > 0 && (
          <section>
            <h2>More scenic routes</h2>
            <ul className="doc-cards">
              {others.map((r) => (
                <li key={r.slug}><Link href={`/routes/${r.slug}`}><strong>{r.name}</strong><span>{r.blurb}</span></Link></li>
              ))}
            </ul>
          </section>
        )}
      </article>
      <AdSense />
    </DocPage>
  );
}
