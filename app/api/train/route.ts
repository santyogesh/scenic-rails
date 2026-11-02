// Train number -> list of stop names. Needs a RapidAPI key (see README). The response shape is normalised defensively; adjust to your provider if needed.
export async function GET(req: Request) {
  const no = (new URL(req.url).searchParams.get("no") ?? "").replace(/\D/g, "");
  const key = process.env.RAPIDAPI_KEY;
  if (!no) return Response.json({ error: "Enter a train number." }, { status: 400 });
  if (!key) return Response.json({ error: "Train-number lookup needs RAPIDAPI_KEY. You can type the stations instead." }, { status: 501 });
  const r = await fetch(`https://irctc1.p.rapidapi.com/api/v1/getTrainSchedule?trainNo=${no}`, { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "irctc1.p.rapidapi.com" }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) return Response.json({ error: "Train lookup failed." }, { status: 502 });
  const j = await r.json();
  const rows: any[] = Array.isArray(j?.data?.route) ? j.data.route : Array.isArray(j?.data) ? j.data : [];
  const stops = rows.map((x) => x.station_name ?? x.stationName ?? x.name).filter(Boolean);
  if (stops.length < 2) return Response.json({ error: "No route found for that train." }, { status: 404 });
  return Response.json({ stops });
}
