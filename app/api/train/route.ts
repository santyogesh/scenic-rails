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
  const configuredKey = process.env.RAPIDAPI_KEY;
  const configuredHeaders = [
    process.env.CURL_AUTH_HEADER_2,
    process.env.CURL_AUTH_HEADER,
    process.env.CURL_AUTH_HEADER_3,
  ];
  const credentials = configuredHeaders.flatMap((value) => {
    const text = value ?? "";
    const key = text.match(/x-rapidapi-key\s*:\s*["']?([^"'\\s]+)/i)?.[1];
    const host = text.match(/x-rapidapi-host\s*:\s*["']?([^"'\\s]+)/i)?.[1] ?? "irctc1.p.rapidapi.com";
    return key ? [{ key, host }] : [];
  });
  if (configuredKey) credentials.push({ key: configuredKey, host: "irctc1.p.rapidapi.com" });
  const uniqueCredentials = credentials.filter((credential, index, all) => all.findIndex((item) => item.key === credential.key) === index);
  if (!no) return Response.json({ error: "Enter a train number." }, { status: 400 });
  if (!uniqueCredentials.length) return Response.json({ error: "Train-number lookup is not configured. You can type the stations instead." }, { status: 501 });
  try {
    let r: Response | null = null;
    let j: any;
    for (const credential of uniqueCredentials) {
      r = await fetch(`https://${credential.host}/api/v1/getTrainSchedule?trainNo=${no}`, { headers: { "x-rapidapi-key": credential.key, "x-rapidapi-host": credential.host }, signal: AbortSignal.timeout(15000), cache: "no-store" });
      j = await r.json().catch(() => null);
      if (r.ok || (r.status !== 401 && r.status !== 403)) break;
    }
    if (!r) throw new Error("No RapidAPI credentials configured");
    if (!r.ok) {
      const message = String(j?.message ?? "");
      const unsubscribed = r.status === 401 || r.status === 403 || /not subscribed|subscription|plan/i.test(message);
      return Response.json({
        error: unsubscribed
          ? "This RapidAPI key is not subscribed to the selected train API. Subscribe to the API in RapidAPI, or enter stations manually as Mumbai, Surat, Vadodara."
          : message || "Train lookup failed. Check the RapidAPI key and host.",
        code: unsubscribed ? "RAPIDAPI_NOT_SUBSCRIBED" : "TRAIN_LOOKUP_FAILED",
      }, { status: unsubscribed ? 424 : 502 });
    }
    const stops = [...new Set(collectStops(j?.data ?? j))];
    if (stops.length < 2) return Response.json({ error: "No stations were returned for that train." }, { status: 404 });
    return Response.json({ stops });
  } catch {
    return Response.json({ error: "Train lookup timed out. Try again or enter the station names." }, { status: 504 });
  }
}
