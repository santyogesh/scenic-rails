# Scenic Rails
Next.js + MapLibre (OpenStreetMap tiles, no API key). Run `npm i && npm run dev`. Deploy: push to GitHub, import in Vercel.
Add a route by appending to `data/routes.ts`. Coordinates are [lng, lat] and simplified; swap in Overpass geometry for exact tracks.
For heavy traffic, replace the OSM tile URL in `components/RouteMap.tsx` with a provider such as MapTiler or Stadia (tile.openstreetmap.org has a fair-use policy).

## Plan by train number or stations (`/plan`)
- Track geometry & stations: Powered by RailRadar API (`api.railradar.in/v1`) for train schedules, station search, and GIS railway route geometry.
- Sights: Wikipedia geosearch along the track.
- Timetables and stops come from erail.in (unofficial, no key); station searches use `data/stations.json` (datameet/railways).
- The train's position is estimated from the timetable. Tapping refresh asks RailRadar for the reported position (`RAILRADAR_API_KEY` in the Vercel project settings; 100 requests/month, cached 5 minutes).
