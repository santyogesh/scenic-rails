import type { Metadata } from "next";
import Link from "next/link";
import DocPage from "@/components/DocPage";
import AdSense from "@/components/AdSense";
import { routes } from "@/data/routes";

export const metadata: Metadata = {
  title: "Scenic train route guides | Scenic Rails",
  description: "Guides to the world's most scenic railway journeys: what you will see, when to go, which side to sit on and how to book.",
  alternates: { canonical: "/routes" },
};

export default function RoutesIndex() {
  return (
    <DocPage>
      <article className="doc-article">
        <h1>Scenic route guides</h1>
        <p className="doc-lede">
          Some train journeys are worth taking for the ride alone. These guides cover what you will see from the window,
          the best time of year to travel, which side of the carriage to sit on, and how to plan and book each trip.
        </p>
        <ul className="doc-cards">
          {routes.map((r) => (
            <li key={r.slug}>
              <Link href={`/routes/${r.slug}`}>
                <strong>{r.name}</strong>
                <small>{r.place} · {r.distance} · {r.duration}</small>
                <span>{r.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
        <section>
          <h2>Following a train live</h2>
          <p>
            Already on board, or planning a ride on another line? The <Link href="/">live train map</Link> takes a train number from
            India, Europe, North America, Japan and more, or a list of stations, draws the route on the real track, and shows the landmarks you are passing on
            each side of the train as you travel.
          </p>
        </section>
      </article>
      <AdSense />
    </DocPage>
  );
}
