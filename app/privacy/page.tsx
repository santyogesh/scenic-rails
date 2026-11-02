import type { Metadata } from "next";
import Link from "next/link";
import DocPage from "@/components/DocPage";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy | Scenic Rails",
  description: "How Scenic Rails handles data, cookies and advertising.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <DocPage>
      <article className="doc-article">
        <h1>Privacy policy</h1>
        <p className="doc-facts">Last updated 2 November 2026</p>
        <p className="doc-lede">
          This policy explains what information {SITE_URL.replace("https://", "")} collects when you use it, and how it is used.
        </p>
        <section>
          <h2>No accounts</h2>
          <p>
            You do not need to sign up, and we do not ask for your name, email address or other personal details to use the site.
          </p>
        </section>
        <section>
          <h2>What stays on your device</h2>
          <p>
            Your most recent journey is saved in your browser&apos;s local storage so it can be restored if the page reloads or your
            connection drops. It is removed after 12 hours or when you start a new search, and it is never sent to us.
          </p>
        </section>
        <section>
          <h2>Searches and third-party services</h2>
          <p>
            To draw a route, the train number or station names you enter are sent to our server and to public data services,
            including railway timetable providers, OpenStreetMap services and Wikipedia. These services receive your request and,
            like any website, your IP address. We do not use your location; positions on the map come from the train, not your device.
          </p>
        </section>
        <section>
          <h2>Analytics</h2>
          <p>
            We use Vercel Web Analytics and Speed Insights to count page views and measure performance. They do not use cookies
            and do not identify individual visitors. We also record anonymous events such as whether a search was for a train
            number or for stations.
          </p>
        </section>
        <section>
          <h2>Advertising and cookies</h2>
          <p>
            Some pages show ads served by Google AdSense. Google and its partners use cookies to serve ads based on your previous
            visits to this and other websites. Google&apos;s use of advertising cookies enables it and its partners to serve ads
            based on your visits to this site and other sites on the internet.
          </p>
          <p>
            You can opt out of personalised advertising in <a href="https://adssettings.google.com" target="_blank" rel="noreferrer">Google Ad Settings</a>,
            or opt out of some third-party vendors&apos; use of cookies at <a href="https://www.aboutads.info/choices" target="_blank" rel="noreferrer">aboutads.info</a>.
            Read more about <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">how Google uses information from sites that use its services</a>.
          </p>
          <p>
            Visitors in the European Economic Area, the United Kingdom and Switzerland are asked for consent before personalised
            ads are shown.
          </p>
        </section>
        <section>
          <h2>Server logs and rate limiting</h2>
          <p>
            Our hosting provider, Vercel, processes request logs, including IP addresses, to run and protect the site. We keep a
            short-lived, in-memory count of requests per IP address to limit abuse; it is cleared within minutes.
          </p>
        </section>
        <section>
          <h2>Children</h2>
          <p>The site is not directed at children under 13, and we do not knowingly collect information from them.</p>
        </section>
        <section>
          <h2>Changes and contact</h2>
          <p>
            If this policy changes, the date at the top will be updated. Questions can be sent through the <Link href="/contact">contact page</Link>
            {CONTACT_EMAIL ? <> or to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></> : null}.
          </p>
        </section>
      </article>
    </DocPage>
  );
}
