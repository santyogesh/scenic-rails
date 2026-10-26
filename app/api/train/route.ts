function collectStops(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectStops);
  const item = value as Record<string, unknown>;
  const name = ["station_name", "stationName", "stationNameEn", "name", "stnName", "station"].find((key) => typeof item[key] === "string" && item[key]);
  if (name) return [String(item[name])];
  return Object.values(item).flatMap(collectStops);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const no = (new URL(req.url).searchParams.get("no") ?? "").replace(/\D/g, "");
  const configuredKey = process.env.RAPIDAPI_KEY;
  const curlHeaders = process.env.CURL_AUTH_HEADER_2 ?? process.env.CURL_AUTH_HEADER ?? "";
  const key = configuredKey || curlHeaders.match(/(?:-H|--header)\s+["']?x-rapidapi-key:\s*([^"'\\s]+)/i)?.[1];
  const host = curlHeaders.match(/(?:-H|--header)\s+["']?x-rapidapi-host:\s*([^"'\\s]+)/i)?.[1] ?? "irctc1.p.rapidapi.com";
  if (!no) return Response.json({ error: "Enter a train number." }, { status: 400 });
  if (!key) return Response.json({ error: "Train-number lookup is not configured. You can type the stations instead." }, { status: 501 });
  try {
    const r = await fetch(`https://${host}/api/v1/getTrainSchedule?trainNo=${no}`, { headers: { "x-rapidapi-key": key, "x-rapidapi-host": host }, signal: AbortSignal.timeout(15000), cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (!r.ok) return Response.json({ error: j?.message ?? "Train lookup failed. Check the RapidAPI key." }, { status: 502 });
    const stops = [...new Set(collectStops(j?.data ?? j))];
    if (stops.length < 2) return Response.json({ error: "No stations were returned for that train." }, { status: 404 });
    return Response.json({ stops });
  } catch {
    return Response.json({ error: "Train lookup timed out. Try again or enter the station names." }, { status: 504 });
  }
}
