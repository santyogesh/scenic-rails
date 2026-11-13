import Link from "next/link";
import DocPage from "@/components/DocPage";
import AdSense from "@/components/AdSense";
import { guides } from "@/data/guides";
import { routesByRegion } from "@/data/routes";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Scenic train route guides",
  description: "Guides to scenic railway journeys in India, Switzerland, Scotland and Norway: what you will see, when to go, which side to sit on and how to book.",
  path: "/routes",
});

export default function RoutesIndex() {
  const groups = routesByRegion();
  return (
    <DocPage>
      <article className="doc-article">
        <h1>Scenic route guides</h1>
        <p className="doc-lede">
          Some train journeys are worth taking for the ride alone. These guides cover what you will see from the window,
          the best time of year to travel, which side of the carriage to sit on, and how to plan and book each trip.
        </p>
        {groups.map((group) => (
          <section key={group.region}>
            <h2>{group.region}</h2>
            <ul className="doc-cards">
              {group.routes.map((r) => (
                <li key={r.slug}>
                  <Link href={`/routes/${r.slug}`}>
                    <strong>{r.name}</strong>
                    <small>{r.place} · {r.distance} · {r.duration}</small>
                    <span>{r.blurb}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section>
          <h2>Practical guides</h2>
          <p>
            Two shorter pieces sit alongside the routes: how to choose a seat, and how to read the live map once you are on the train.
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
        </section>
        <section>
          <h2>Following a train live</h2>
          <p>
            Already on board, or planning a ride on another line? The <Link href="/">live train map</Link> takes a train number from
            India, Europe, North America, Japan and more, or a list of stations, draws the route on the real track, and shows the landmarks you are passing on
            each side of the train as you travel. <Link href="/guides/how-the-map-works">How the map decides</Link> explains what is measured and what is only estimated.
          </p>
        </section>
      </article>
      <AdSense />
    </DocPage>
  );
}
