# Scenic Rails
Next.js + MapLibre (OpenStreetMap tiles, no API key). Run `npm i && npm run dev`. Deploy: push to GitHub, import in Vercel.
Add a route by appending to `data/routes.ts`. Coordinates are [lng, lat] and simplified; swap in Overpass geometry for exact tracks.
For heavy traffic, replace the OSM tile URL in `components/RouteMap.tsx` with a provider such as MapTiler or Stadia (tile.openstreetmap.org has a fair-use policy).

## Plan by train number or stations (`/plan`)
- Track geometry: real OSM rail ways are fetched via Overpass and routed along (shortest path between stops), not straight lines.
- Sights: Wikipedia geosearch along the track, any country.
- Train number lookup needs `RAPIDAPI_KEY` (IRCTC1 on RapidAPI, India). Without it, type the stations instead; that works worldwide.
