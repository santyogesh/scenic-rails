import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "./site";

export const HOME_TITLE = "Scenery from the train window — Scenic Rails";
export const HOME_DESCRIPTION =
  "See the scenery from your train window: landmarks on your left and right, which side to sit, and guides to scenic railways in India, Switzerland, Scotland and Norway.";

/** Phrases the homepage and route guides actually discuss. */
export const HOME_KEYWORDS = [
  "scenery from the train window",
  "train window view",
  "what to see from the train",
  "which side of the train to sit on",
  "landmarks along a train route",
  "scenic train routes",
  "scenic railway",
  "train journey scenery",
  "Konkan Railway scenery",
  "Kalka Shimla train window",
  "Darjeeling toy train route",
  "Nilgiri Mountain Railway",
  "Kangra Valley Railway",
  "Visakhapatnam to Araku train",
  "Glacier Express scenery",
  "Bernina Express window",
  "West Highland Line scenery",
  "Bergen Line scenery",
  "Flåm Railway route",
];

type PageArgs = { title: string; description: string; path: string; keywords?: string[] };

const shareImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Scenic Rails — live train map and scenic railway guides",
};

function social(title: string, description: string, path: string): Pick<Metadata, "openGraph" | "twitter"> {
  const url = path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
  return {
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      images: [shareImage],
    },
    twitter: { card: "summary_large_image", title, description, images: [shareImage.url] },
  };
}

/** Title is the page name. The root layout appends " | Scenic Rails". */
export function pageMeta({ title, description, path, keywords }: PageArgs): Metadata {
  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: path },
    ...social(`${title} | ${SITE_NAME}`, description, path),
  };
}

export function homeMeta(): Metadata {
  return {
    title: { absolute: HOME_TITLE },
    description: HOME_DESCRIPTION,
    keywords: HOME_KEYWORDS,
    alternates: { canonical: "/" },
    ...social(HOME_TITLE, HOME_DESCRIPTION, "/"),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: HOME_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
      },
    ],
  };
}

export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${crumb.path}`,
    })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function articleJsonLd({ headline, description, path }: { headline: string; description: string; path: string }) {
  const url = `${SITE_URL}${path}`;
  const publisher = { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/` };
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    mainEntityOfPage: url,
    author: publisher,
    publisher,
  };
}
