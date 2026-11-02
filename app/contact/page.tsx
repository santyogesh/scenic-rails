import type { Metadata } from "next";
import DocPage from "@/components/DocPage";
import { CONTACT_EMAIL, ISSUES_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact | Scenic Rails",
  description: "How to report a problem, suggest a route or get in touch with Scenic Rails.",
  alternates: { canonical: "/contact" },
};

export default function Contact() {
  return (
    <DocPage>
      <article className="doc-article">
        <h1>Contact</h1>
        <p className="doc-lede">Corrections, route suggestions and feedback are all welcome.</p>
        {CONTACT_EMAIL && (
          <section>
            <h2>Email</h2>
            <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
          </section>
        )}
        <section>
          <h2>Report a problem or suggest a route</h2>
          <p>
            Open an issue on <a href={ISSUES_URL} target="_blank" rel="noreferrer">GitHub</a>. For a wrong route or landmark,
            include the train number or stations you searched for and what looked wrong.
          </p>
        </section>
      </article>
    </DocPage>
  );
}
