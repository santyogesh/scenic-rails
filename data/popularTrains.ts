import type { Stop, LiveTrainStatus } from "@/lib/rail";
import type { LL } from "@/lib/geo";
import railLines from "./trainLines.json";

export type PopularTrain = {
  number: string;
  name: string;
  type: string;
  category: string;
  source: string;
  destination: string;
  distance: number;
  duration: number; // minutes
  halts: Stop[];
  line: LL[];
};

const trains: Record<string, Omit<PopularTrain, "line">> = {
  "12951": {
    number: "12951",
    name: "Mumbai Central - New Delhi Tejas Rajdhani Express",
    type: "Rajdhani Express",
    category: "Premium",
    source: "Mumbai Central (MMCT)",
    destination: "New Delhi (NDLS)",
    distance: 1388,
    duration: 932,
    halts: [
      { name: "Mumbai Central", code: "MMCT", at: [72.8194, 18.9708], departure: "17:00", distance: 0, sequence: 1 },
      { name: "Borivali", code: "BVI", at: [72.8567, 19.2289], arrival: "17:22", departure: "17:24", distance: 30, sequence: 2 },
      { name: "Surat", code: "ST", at: [72.8409, 21.2050], arrival: "19:43", departure: "19:48", distance: 263, sequence: 3 },
      { name: "Vadodara Jn", code: "BRC", at: [73.1804, 22.3110], arrival: "21:06", departure: "21:16", distance: 392, sequence: 4 },
      { name: "Ratlam Jn", code: "RTM", at: [75.0494, 23.3394], arrival: "00:32", departure: "00:35", distance: 653, sequence: 5 },
      { name: "Nagda Jn", code: "NAD", at: [75.4125, 23.4562], arrival: "01:13", departure: "01:15", distance: 695, sequence: 6 },
      { name: "Kota Jn", code: "KOTA", at: [75.8815, 25.2241], arrival: "03:15", departure: "03:20", distance: 920, sequence: 7 },
      { name: "New Delhi", code: "NDLS", at: [77.2203, 28.6418], arrival: "08:32", distance: 1388, sequence: 8 },
    ],
  },
  "12952": {
    number: "12952",
    name: "New Delhi - Mumbai Central Tejas Rajdhani Express",
    type: "Rajdhani Express",
    category: "Premium",
    source: "New Delhi (NDLS)",
    destination: "Mumbai Central (MMCT)",
    distance: 1388,
    duration: 932,
    halts: [
      { name: "New Delhi", code: "NDLS", at: [77.2203, 28.6418], departure: "16:55", distance: 0, sequence: 1 },
      { name: "Kota Jn", code: "KOTA", at: [75.8815, 25.2241], arrival: "21:30", departure: "21:40", distance: 465, sequence: 2 },
      { name: "Nagda Jn", code: "NAD", at: [75.4125, 23.4562], arrival: "23:57", departure: "23:59", distance: 690, sequence: 3 },
      { name: "Ratlam Jn", code: "RTM", at: [75.0494, 23.3394], arrival: "00:30", departure: "00:33", distance: 735, sequence: 4 },
      { name: "Vadodara Jn", code: "BRC", at: [73.1804, 22.3110], arrival: "03:40", departure: "03:50", distance: 996, sequence: 5 },
      { name: "Surat", code: "ST", at: [72.8409, 21.2050], arrival: "05:13", departure: "05:18", distance: 1125, sequence: 6 },
      { name: "Borivali", code: "BVI", at: [72.8567, 19.2289], arrival: "07:35", departure: "07:37", distance: 1358, sequence: 7 },
      { name: "Mumbai Central", code: "MMCT", at: [72.8194, 18.9708], arrival: "08:35", distance: 1388, sequence: 8 },
    ],
  },
  "12301": {
    number: "12301",
    name: "Howrah - New Delhi Rajdhani Express",
    type: "Rajdhani Express",
    category: "Premium",
    source: "Howrah Jn (HWH)",
    destination: "New Delhi (NDLS)",
    distance: 1451,
    duration: 1025,
    halts: [
      { name: "Howrah Jn", code: "HWH", at: [88.3426, 22.5838], departure: "16:50", distance: 0, sequence: 1 },
      { name: "Asansol Jn", code: "ASN", at: [86.9746, 23.6889], arrival: "18:57", departure: "19:00", distance: 200, sequence: 2 },
      { name: "Dhanbad Jn", code: "DHN", at: [86.4304, 23.7957], arrival: "19:55", departure: "20:00", distance: 259, sequence: 3 },
      { name: "Gaya Jn", code: "GAYA", at: [84.9994, 24.8033], arrival: "22:19", departure: "22:22", distance: 459, sequence: 4 },
      { name: "Pt Deen Dayal Upadhyaya Jn", code: "DDU", at: [83.1167, 25.2818], arrival: "00:45", departure: "00:55", distance: 664, sequence: 5 },
      { name: "Prayagraj Jn", code: "PRYJ", at: [81.8349, 25.4437], arrival: "02:33", departure: "02:35", distance: 817, sequence: 6 },
      { name: "Kanpur Central", code: "CNB", at: [80.3536, 26.4539], arrival: "04:40", departure: "04:45", distance: 1011, sequence: 7 },
      { name: "New Delhi", code: "NDLS", at: [77.2203, 28.6418], arrival: "10:05", distance: 1451, sequence: 8 },
    ],
  },
  "12002": {
    number: "12002",
    name: "New Delhi - Rani Kamalapati (Bhopal) Shatabdi Express",
    type: "Shatabdi Express",
    category: "Superfast",
    source: "New Delhi (NDLS)",
    destination: "Rani Kamalapati (RKMP)",
    distance: 708,
    duration: 510,
    halts: [
      { name: "New Delhi", code: "NDLS", at: [77.2203, 28.6418], departure: "06:00", distance: 0, sequence: 1 },
      { name: "Mathura Jn", code: "MTJ", at: [77.6737, 27.4924], arrival: "07:19", departure: "07:20", distance: 141, sequence: 2 },
      { name: "Agra Cantt", code: "AGC", at: [78.0081, 27.1591], arrival: "07:50", departure: "07:55", distance: 195, sequence: 3 },
      { name: "Dholpur Jn", code: "DHO", at: [77.8927, 26.7025], arrival: "08:39", departure: "08:40", distance: 248, sequence: 4 },
      { name: "Morena", code: "MRA", at: [77.9947, 26.4950], arrival: "08:57", departure: "08:58", distance: 275, sequence: 5 },
      { name: "Gwalior Jn", code: "GWL", at: [78.1828, 26.2183], arrival: "09:23", departure: "09:28", distance: 313, sequence: 6 },
      { name: "Virangana Lakshmibai Jhansi", code: "VGLJ", at: [78.5583, 25.4484], arrival: "10:45", departure: "10:50", distance: 411, sequence: 7 },
      { name: "Lalitpur Jn", code: "LAR", at: [78.4167, 24.6875], arrival: "11:42", departure: "11:43", distance: 501, sequence: 8 },
      { name: "Bhopal Jn", code: "BPL", at: [77.4126, 23.2599], arrival: "14:07", departure: "14:12", distance: 702, sequence: 9 },
      { name: "Rani Kamalapati", code: "RKMP", at: [77.4428, 23.2081], arrival: "14:40", distance: 708, sequence: 10 },
    ],
  },
  "20901": {
    number: "20901",
    name: "Mumbai Central - Gandhinagar Capital Vande Bharat Express",
    type: "Vande Bharat Express",
    category: "Vande Bharat",
    source: "Mumbai Central (MMCT)",
    destination: "Gandhinagar Capital (GNC)",
    distance: 522,
    duration: 375,
    halts: [
      { name: "Mumbai Central", code: "MMCT", at: [72.8194, 18.9708], departure: "06:00", distance: 0, sequence: 1 },
      { name: "Borivali", code: "BVI", at: [72.8567, 19.2289], arrival: "06:23", departure: "06:25", distance: 30, sequence: 2 },
      { name: "Vapi", code: "VAPI", at: [72.9126, 20.3709], arrival: "08:00", departure: "08:02", distance: 168, sequence: 3 },
      { name: "Surat", code: "ST", at: [72.8409, 21.2050], arrival: "08:58", departure: "09:03", distance: 263, sequence: 4 },
      { name: "Vadodara Jn", code: "BRC", at: [73.1804, 22.3110], arrival: "09:59", departure: "10:04", distance: 392, sequence: 5 },
      { name: "Ahmedabad Jn", code: "ADI", at: [72.6003, 23.0232], arrival: "11:25", departure: "11:30", distance: 492, sequence: 6 },
      { name: "Gandhinagar Capital", code: "GNC", at: [72.6369, 23.2230], arrival: "12:25", distance: 522, sequence: 7 },
    ],
  },
};

// Lines traced on OSM rail track (BRouter rail profile) through each train's halts.
export const popularTrains: Record<string, PopularTrain> = Object.fromEntries(
  Object.entries(trains).map(([no, t]) => [no, { ...t, line: (railLines as unknown as Record<string, LL[]>)[no] ?? t.halts.map((h) => h.at) }])
);

/** Minutes since 00:00 IST on `date` (YYYY-MM-DD). */
function minutesSince(date: string): number {
  return (Date.now() - Date.parse(`${date}T00:00:00+05:30`)) / 60000;
}

export function computeLiveStatusFromSchedule(train: PopularTrain, startDate?: string): LiveTrainStatus {
  const parseTime = (tStr?: string): number | null => {
    if (!tStr) return null;
    const parts = tStr.split(":").map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    return parts[0] * 60 + parts[1];
  };

  const halts = train.halts;

  // Arrival/departure in minutes from 00:00 of the start day, rolling past midnight.
  let last = -1, wrap = 0;
  const roll = (t: number | null) => {
    if (t === null) return null;
    if (t + wrap < last) wrap += 1440;
    last = t + wrap;
    return last;
  };
  const times = halts.map((h) => {
    const arr = roll(parseTime(h.arrival));
    const dep = roll(parseTime(h.departure));
    return { arr: arr ?? dep ?? 0, dep: dep ?? arr ?? 0 };
  });
  const firstDep = times[0].dep;
  const lastArr = times[times.length - 1].arr;

  const today = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
  let elapsed = minutesSince(startDate ?? today);
  // Without an explicit date, prefer yesterday's run if it is still on the move.
  if (!startDate && elapsed < firstDep && elapsed + 1440 <= lastArr) elapsed += 1440;

  let prevIdx = 0;
  let nextIdx = 1;
  let isRunning = false;
  let progress = 0;
  let delayMinutes = 14; // Default realistic Indian Railways active delay
  const notStarted = elapsed < firstDep;
  const completed = elapsed > lastArr;

  if (notStarted) {
    delayMinutes = 0;
  } else if (completed) {
    prevIdx = halts.length - 2;
    nextIdx = halts.length - 1;
    progress = 1;
  } else {
    for (let i = 0; i < halts.length - 1; i++) {
      if (elapsed < times[i].dep) {
        prevIdx = i;
        nextIdx = i + 1;
        break;
      }
      if (elapsed <= times[i + 1].arr) {
        prevIdx = i;
        nextIdx = i + 1;
        isRunning = true;
        progress = Math.min(1, Math.max(0, (elapsed - times[i].dep) / Math.max(1, times[i + 1].arr - times[i].dep)));
        break;
      }
    }
  }

  const prevHalt = halts[prevIdx];
  const nextHalt = halts[nextIdx];

  // Interpolate coordinates along the segment
  const p0 = prevHalt.at;
  const p1 = nextHalt.at;
  const trainLng = p0[0] + (p1[0] - p0[0]) * progress;
  const trainLat = p0[1] + (p1[1] - p0[1]) * progress;

  const currentDist = (prevHalt.distance ?? 0) + ((nextHalt.distance ?? train.distance) - (prevHalt.distance ?? 0)) * progress;

  return {
    trainNumber: train.number,
    trainName: train.name,
    status: notStarted ? "not-started" : completed ? "completed" : "running",
    isLive: true,
    delayMinutes,
    lastUpdatedAt: new Date().toISOString(),
    currentLocation: {
      stationName: progress < 0.1 ? prevHalt.name : progress > 0.9 ? nextHalt.name : `Between ${prevHalt.name} & ${nextHalt.name}`,
      stationCode: progress < 0.1 ? prevHalt.code : progress > 0.9 ? nextHalt.code : undefined,
      status: isRunning ? (progress < 0.05 ? "at-station" : "running") : "at-station",
      coordinates: { lat: trainLat, lng: trainLng },
      at: [trainLng, trainLat] as LL,
      distanceFromOriginKm: Math.round(currentDist),
      delayMinutes,
      speedKmh: isRunning ? 92 : 0,
      segmentProgress: Math.round(progress * 100) / 100,
    },
    previousHalt: {
      stationName: prevHalt.name,
      stationCode: prevHalt.code,
      distance: prevHalt.distance,
      sequence: prevHalt.sequence,
      departure: prevHalt.departure,
    },
    nextHalt: {
      stationName: nextHalt.name,
      stationCode: nextHalt.code,
      distance: nextHalt.distance,
      sequence: nextHalt.sequence,
      scheduledArrival: nextHalt.arrival,
      platform: "1",
      delayArrival: delayMinutes,
    },
    totalDistance: train.distance,
  };
}
