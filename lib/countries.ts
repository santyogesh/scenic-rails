export type QuickTrain = { no: string; label: string };

export type Country = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
  flag: string;
  /** IANA timezone used for journey dates and timetable times. */
  tz: string;
  /** Search box placeholder. */
  example: string;
  /** What counts as a train number here; anything else is treated as a list of stations. */
  trainPattern: RegExp;
  /** Big stations that most long-distance trains pass, used to find a train by number on Transitous. */
  hubs: string[];
  /** [west, south, east, north], for limiting OpenStreetMap lookups. */
  bbox: [number, number, number, number];
  quick: QuickTrain[];
};

// Optional operator prefix (ICE, TGV, EC, GR…), a number, optionally "@ station" to say where to look for it.
const INTL_TRAIN = /^[A-Za-z\u00C0-\u024F]{0,12}\.?\s?\d{1,6}[A-Za-z]?(\s*@\s*[^,]+)?$/;

export const COUNTRIES: Country[] = [
  {
    code: "IN", name: "India", flag: "🇮🇳", tz: "Asia/Kolkata", example: "Train no. or stations, e.g. 12951", trainPattern: /^\d{4,6}$/,
    hubs: [], bbox: [68, 6, 97.5, 35.7],
    quick: [
      { no: "12951", label: "Mumbai → Delhi Rajdhani" },
      { no: "12952", label: "Delhi → Mumbai Rajdhani" },
      { no: "12301", label: "Howrah → Delhi Rajdhani" },
      { no: "12002", label: "Delhi → Bhopal Shatabdi" },
      { no: "20901", label: "Mumbai → Gandhinagar Vande Bharat" },
    ],
  },
  {
    code: "GB", name: "United Kingdom", flag: "🇬🇧", tz: "Europe/London", example: "Train no. or stations, e.g. GR5220", trainPattern: INTL_TRAIN,
    hubs: ["London Kings Cross", "Edinburgh", "London Euston", "Birmingham New Street"], bbox: [-8.7, 49.8, 1.8, 60.9],
    quick: [
      { no: "GR5220", label: "Edinburgh → London LNER" },
      { no: "GC8000", label: "London → Sunderland Grand Central" },
    ],
  },
  {
    code: "DE", name: "Germany", flag: "🇩🇪", tz: "Europe/Berlin", example: "Train no. or stations, e.g. ICE 371", trainPattern: INTL_TRAIN,
    hubs: ["Berlin Hbf", "Frankfurt (Main) Hbf", "Köln Hbf", "München Hbf"], bbox: [5.8, 47.2, 15.1, 55.1],
    quick: [
      { no: "ICE 371", label: "Berlin → Basel" },
      { no: "ICE 145", label: "Amsterdam → Berlin" },
    ],
  },
  {
    code: "FR", name: "France", flag: "🇫🇷", tz: "Europe/Paris", example: "Train no. or stations, e.g. TGV 6107", trainPattern: INTL_TRAIN,
    hubs: ["Paris Gare de Lyon", "Lyon Part-Dieu", "Paris Montparnasse", "Paris Gare du Nord"], bbox: [-5.2, 41.3, 9.6, 51.1],
    quick: [
      { no: "TGV 6107", label: "From Paris Gare de Lyon" },
      { no: "IC 4402", label: "Via Lyon Part-Dieu" },
    ],
  },
  {
    code: "CH", name: "Switzerland", flag: "🇨🇭", tz: "Europe/Zurich", example: "Train no. or stations, e.g. EC 15", trainPattern: INTL_TRAIN,
    hubs: ["Zürich HB", "Bern", "Basel SBB", "Genève"], bbox: [5.9, 45.8, 10.5, 47.9],
    quick: [
      { no: "EC 15", label: "Zürich → Milano" },
      { no: "ICE 108", label: "Zürich → Basel" },
    ],
  },
  {
    code: "AT", name: "Austria", flag: "🇦🇹", tz: "Europe/Vienna", example: "Train no. or stations, e.g. RJX 165", trainPattern: INTL_TRAIN,
    hubs: ["Wien Hauptbahnhof", "Salzburg Hbf", "Innsbruck Hbf", "Linz Hbf"], bbox: [9.5, 46.3, 17.2, 49.1],
    quick: [
      { no: "RJX 165", label: "Zürich → Feldkirch" },
      { no: "EC 101", label: "To Wien Westbahnhof" },
    ],
  },
  {
    code: "IT", name: "Italy", flag: "🇮🇹", tz: "Europe/Rome", example: "Train no. or stations, e.g. EC 31", trainPattern: INTL_TRAIN,
    hubs: ["Milano Centrale", "Roma Termini", "Firenze Santa Maria Novella", "Bologna Centrale"], bbox: [6.6, 36.6, 18.6, 47.1],
    quick: [
      { no: "EC 31", label: "Milano → Venezia" },
      { no: "EC 14", label: "Milano → Zürich" },
      { no: "IC 609", label: "Milano → Lecce" },
    ],
  },
  {
    code: "ES", name: "Spain", flag: "🇪🇸", tz: "Europe/Madrid", example: "Train no. or stations, e.g. TGV 6415", trainPattern: INTL_TRAIN,
    hubs: ["Madrid Puerta de Atocha", "Barcelona Sants", "Madrid Chamartín", "Sevilla Santa Justa"], bbox: [-9.4, 35.9, 3.4, 43.8],
    quick: [
      { no: "TGV 6415", label: "Madrid → Barcelona" },
      { no: "TGV 6508", label: "Madrid → Málaga" },
    ],
  },
  {
    code: "NL", name: "Netherlands", flag: "🇳🇱", tz: "Europe/Amsterdam", example: "Train no. or stations, e.g. 2731", trainPattern: INTL_TRAIN,
    hubs: ["Amsterdam Centraal", "Utrecht Centraal", "Rotterdam Centraal"], bbox: [3.3, 50.7, 7.3, 53.6],
    quick: [
      { no: "ICE 145", label: "Amsterdam → Berlin" },
      { no: "2731", label: "Amsterdam → Maastricht" },
    ],
  },
  {
    code: "BE", name: "Belgium", flag: "🇧🇪", tz: "Europe/Brussels", example: "Train no. or stations, e.g. IC 2109", trainPattern: INTL_TRAIN,
    hubs: ["Bruxelles-Midi", "Antwerpen-Centraal", "Gent-Sint-Pieters"], bbox: [2.5, 49.5, 6.4, 51.6],
    quick: [
      { no: "IC 2109", label: "Brussels → Luxembourg" },
      { no: "IC 1530", label: "Brussels → Blankenberge" },
    ],
  },
  {
    code: "JP", name: "Japan", flag: "🇯🇵", tz: "Asia/Tokyo", example: "Train no. or stations, e.g. 844", trainPattern: INTL_TRAIN,
    hubs: ["Tokyo", "Shin-Osaka", "Kyoto", "Nagoya"], bbox: [129.4, 30.9, 145.9, 45.6],
    quick: [{ no: "844", label: "Shin-Osaka → Tokyo Kodama" }],
  },
  {
    code: "US", name: "United States", flag: "🇺🇸", tz: "America/New_York", example: "Train no. or stations, e.g. 68", trainPattern: INTL_TRAIN,
    hubs: ["New York Penn Station", "Washington Union Station", "Chicago Union Station", "Los Angeles Union Station"], bbox: [-125, 24.4, -66.9, 49.4],
    quick: [
      { no: "68", label: "Montréal → New York Adirondack" },
      { no: "1150", label: "New York → Boston" },
    ],
  },
  {
    code: "CA", name: "Canada", flag: "🇨🇦", tz: "America/Toronto", example: "Train no. or stations, e.g. 68", trainPattern: INTL_TRAIN,
    hubs: ["Gare Centrale Montréal", "Union Station Toronto", "Vancouver Pacific Central"], bbox: [-141, 41.6, -52.6, 70],
    quick: [{ no: "68", label: "Montréal → New York" }],
  },
  {
    code: "AU", name: "Australia", flag: "🇦🇺", tz: "Australia/Sydney", example: "Stations, e.g. Sydney Central, Katoomba", trainPattern: INTL_TRAIN,
    hubs: ["Central Station Sydney", "Southern Cross Station", "Roma Street"], bbox: [112.9, -43.7, 153.7, -10.6],
    quick: [],
  },
  {
    code: "SE", name: "Sweden", flag: "🇸🇪", tz: "Europe/Stockholm", example: "Train no. or stations, e.g. 2027", trainPattern: INTL_TRAIN,
    hubs: ["Stockholm Central", "Göteborg Central", "Malmö Central"], bbox: [11, 55.3, 24.2, 69.1],
    quick: [
      { no: "2027", label: "Stockholm → Göteborg" },
      { no: "10", label: "Stockholm → Duved" },
    ],
  },
  {
    code: "NO", name: "Norway", flag: "🇳🇴", tz: "Europe/Oslo", example: "Stations, e.g. Oslo S, Bergen", trainPattern: INTL_TRAIN,
    hubs: ["Oslo S", "Bergen stasjon", "Trondheim S"], bbox: [4.6, 57.9, 31.1, 71.2],
    quick: [],
  },
  {
    code: "PL", name: "Poland", flag: "🇵🇱", tz: "Europe/Warsaw", example: "Train no. or stations, e.g. EIP 1304", trainPattern: INTL_TRAIN,
    hubs: ["Warszawa Centralna", "Kraków Główny", "Gdańsk Główny", "Wrocław Główny"], bbox: [14.1, 49, 24.2, 54.9],
    quick: [
      { no: "EIP 1304", label: "Warszawa → Kraków" },
      { no: "IC 131", label: "Warszawa → Budapest" },
    ],
  },
  {
    code: "CZ", name: "Czechia", flag: "🇨🇿", tz: "Europe/Prague", example: "Train no. or stations, e.g. IC 533", trainPattern: INTL_TRAIN,
    hubs: ["Praha hlavní nádraží", "Brno hlavní nádraží", "Ostrava hlavní nádraží"], bbox: [12.1, 48.5, 18.9, 51.1],
    quick: [
      { no: "IC 533", label: "Praha → Český Krumlov" },
      { no: "EC 125", label: "Praha → Slovakia" },
    ],
  },
];

export type TrainQuery = { prefix: string; num: string; suffix: string; station?: string };

/** "ICE 371", "GR5220 @ Edinburgh", "1061M" -> parts; null when it doesn't look like a train number. */
export function parseTrainQuery(q: string): TrainQuery | null {
  const [train, station] = q.split("@").map((s) => s.trim());
  const m = /^([A-Za-z\u00C0-\u024F]{0,12})\.?\s?(\d{1,6})([A-Za-z]?)$/.exec(train ?? "");
  if (!m) return null;
  return { prefix: m[1].toUpperCase(), num: m[2].replace(/^0+(?=\d)/, ""), suffix: m[3].toUpperCase(), station: station || undefined };
}

export const DEFAULT_COUNTRY = "IN";
const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export const getCountry = (code?: string | null): Country => byCode.get((code ?? "").toUpperCase()) ?? byCode.get(DEFAULT_COUNTRY)!;
export const isCountry = (code?: string | null) => byCode.has((code ?? "").toUpperCase());

/** Country from a browser locale such as "de-DE" or "en-GB"; India when it can't be told. */
export function countryFromLocale(langs: readonly string[]): string {
  for (const l of langs) {
    const region = /-([A-Za-z]{2})\b/.exec(l)?.[1]?.toUpperCase();
    if (region && byCode.has(region)) return region;
  }
  return DEFAULT_COUNTRY;
}

/** Minutes `tz` is ahead of UTC at `at`. */
export function tzOffsetMin(tz: string, at = Date.now()): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(at))
      .map((x) => [x.type, x.value])
  );
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return Math.round((local - Math.floor(at / 60000) * 60000) / 60000);
}

/** Today's date (YYYY-MM-DD) in `tz`. */
export const todayIn = (tz: string, at = Date.now()) => new Date(at + tzOffsetMin(tz, at) * 60000).toISOString().slice(0, 10);

/** The UTC instant of 00:00 on `date` (YYYY-MM-DD) in `tz`. */
export function startOfDay(date: string, tz: string): number {
  const utcMidnight = Date.parse(`${date}T00:00:00Z`);
  return utcMidnight - tzOffsetMin(tz, utcMidnight - tzOffsetMin(tz, utcMidnight) * 60000) * 60000;
}

/** An instant as HH:MM in `tz`. */
export const hhmmIn = (ms: number, tz: string) => new Date(ms + tzOffsetMin(tz, ms) * 60000).toISOString().slice(11, 16);
