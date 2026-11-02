import Link from "next/link";
import { notFound } from "next/navigation";
import Journey from "@/components/Journey";
import { routes } from "@/data/routes";
export function generateStaticParams() { return routes.map((r) => ({ slug: r.slug })); }
export default async function RoutePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const route = routes.find((r) => r.slug === slug);
  if (!route) notFound();
  return (
    <main className="page">
      <header><Link href="/">All routes</Link><h1>{route.name}</h1><p>{route.place}, {route.distance}, {route.duration}</p></header>
      <Journey route={route} />
    </main>
  );
}
