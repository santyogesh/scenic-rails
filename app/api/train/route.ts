function collectStops(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectStops);
  const item = value as Record<string, unknown>;
  const stationName = item.station_name;
  if (typeof stationName === "string" && stationName.trim()) return [stationName.trim()];
  const station = item.station;
  if (typeof station === "string" && station.trim()) return [station.trim()];
  return Object.values(item).flatMap(collectStops);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const no = (new URL(req.url).searchParams.get("no") ?? "").replace(/\D/g, "");
  const apiKey = process.env.RAILRADAR_API_KEY;
  if (!no) return Response.json({ error: "Enter a train number." }, { status: 400 });
  if (!apiKey) return Response.json({ error: "Train-number lookup is not configured. You can type the stations instead." }, { status: 501 });

  try {
    const response = await fetch(`https://api.railradar.in/v1/trains/${encodeURIComponent(no)}/route?format=geojson&stops=true`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) {
      const message = String(payload?.error?.message ?? payload?.message ?? "");
      const code = String(payload?.error?.code ?? "TRAIN_LOOKUP_FAILED");
      return Response.json({
        error: response.status === 401 ? "RailRadar rejected the API key. Check that the RailRadar key is active." : response.status === 429 ? "RailRadar rate limit reached. Please try again shortly." : message || "Train lookup failed in RailRadar.",
        code,
      }, { status: response.status === 404 ? 404 : response.status === 429 ? 429 : response.status === 401 ? 502 : 502 });
    }

    const stops = Array.isArray(payload?.data?.stops)
      ? payload.data.stops
          .sort((a: any, b: any) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0))
          .map((stop: any) => String(stop.name ?? stop.station_name ?? stop.station ?? "").trim())
          .filter(Boolean)
      : [...new Set(collectStops(payload?.data ?? payload))];
    const uniqueStops = [...new Set(stops)];
    if (uniqueStops.length < 2) return Response.json({ error: "RailRadar returned no usable stations for that train.", code: "NO_STATIONS" }, { status: 404 });
    return Response.json({ stops: uniqueStops });
  } catch {
    return Response.json({ error: "RailRadar train lookup timed out. Try again or enter the station names.", code: "TRAIN_LOOKUP_TIMEOUT" }, { status: 504 });
  }
}
