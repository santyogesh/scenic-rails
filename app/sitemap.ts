import type { MetadataRoute } from "next";
import { guides } from "@/data/guides";
import { routes } from "@/data/routes";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/routes", "/guides", "/look", "/about", "/contact", "/privacy"].map((p) => ({ url: SITE_URL + p }));
  return [
    ...pages,
    ...routes.map((r) => ({ url: `${SITE_URL}/routes/${r.slug}` })),
    ...guides.map((g) => ({ url: `${SITE_URL}/guides/${g.slug}` })),
  ];
}
