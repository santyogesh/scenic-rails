import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "./site";

export const HOME_TITLE = "Scenic Rails: live train map and scenic routes";
export const HOME_DESCRIPTION =
  "See the scenery from your train window: landmarks on your left and right, plus guides to scenic railways in India, Switzerland, Scotland and Norway.";

type PageArgs = { title: string; description: string; path: string };

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
export function pageMeta({ title, description, path }: PageArgs): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    ...social(`${title} | ${SITE_NAME}`, description, path),
  };
}

export function homeMeta(): Metadata {
  return {
    title: { absolute: HOME_TITLE },
    description: HOME_DESCRIPTION,
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
