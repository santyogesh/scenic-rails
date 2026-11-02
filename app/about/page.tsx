import type { Metadata } from "next";
import Link from "next/link";
import DocPage from "@/components/DocPage";

export const metadata: Metadata = {
  title: "About | Scenic Rails",
  description: "What Scenic Rails is, where its data comes from, and how it works.",
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <DocPage>
      <article className="doc-article">
        <h1>About Scenic Rails</h1>
        <p className="doc-lede">
          Scenic Rails is for people who like to look out of the window. It shows what is outside your train, on which side,
          and what is worth getting off for.
        </p>
        <section>
          <h2>What the site does</h2>
          <p>
            Enter an Indian Railways train number, or a list of stations anywhere in the world, and the <Link href="/">live train map</Link> draws
            the route on the actual rail track. It then finds landmarks, rivers, mountains, forts and towns within a few kilometres
            of the line and tells you whether each one will appear on your left or your right. If the train is running, the map
            follows its position so the list updates as you travel.
          </p>
          <p>
            The <Link href="/routes">scenic route guides</Link> are written guides to well-known railway journeys, covering their history,
            the views along the way, the best time of year to go, and practical advice on booking.
          </p>
        </section>
        <section>
          <h2>Where the data comes from</h2>
          <p>
            Rail track geometry and many landmarks come from OpenStreetMap contributors. Place descriptions and photos come
            from Wikipedia and Wikimedia Commons. Indian train timetables and running positions come from public railway
            information services; positions may be estimated from the timetable when live data is unavailable, and the map
            says so when that happens.
          </p>
          <p>
            Timings, positions and landmark details can be wrong or out of date. Always check official railway sources before
            you travel.
          </p>
        </section>
        <section>
          <h2>Get in touch</h2>
          <p>Spotted a mistake, or want a route covered? See the <Link href="/contact">contact page</Link>.</p>
        </section>
      </article>
    </DocPage>
  );
}
