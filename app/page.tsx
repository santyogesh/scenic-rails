import Link from "next/link";
import { routes } from "@/data/routes";
export default function Home() {
  return (
    <main className="home">
      <h1>Look out the window.</h1>
      <p className="lead">Pick a train journey and see the coastlines, viaducts and mountain passes you will pass, in order.</p>
      <p><Link href="/plan"><strong>Plan by train number or stations</strong></Link></p>
      <ul className="list">
        {routes.map((r) => (
          <li key={r.slug}>
            <Link href={`/routes/${r.slug}`}>
              <span className="name">{r.name}</span>
              <span className="meta">{r.place}, {r.distance}, {r.duration}</span>
              <span className="blurb">{r.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
