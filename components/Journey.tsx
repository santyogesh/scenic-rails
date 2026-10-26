"use client";
import { useState } from "react";
import RouteMap from "./RouteMap";
import type { Route } from "@/data/routes";

export default function Journey({ route }: { route: Route }) {
  const [active, setActive] = useState(-1);
  return (
    <div className="journey">
      <RouteMap line={route.line} sights={route.sights} onPick={(s) => setActive(route.sights.indexOf(s))} />
      <ol className="sights">
        {route.sights.map((s, i) => (
          <li key={s.name}>
            <button className={i === active ? "sight on" : "sight"} onClick={() => setActive(i)}>
              <h3>{s.name}</h3>
              <p>{s.text}</p>
              {i === active && <p className="tip">{s.tip}</p>}
              {i === active && s.img && <img src={s.img} alt="" width={300} />}
              {i === active && s.url && <a href={s.url} target="_blank" rel="noreferrer">Read more</a>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
