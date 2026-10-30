import type { LL } from "./geo";
import rows from "@/data/stations.json";

// datameet/railways station list (2016), so a few renamed stations are only known by their old code.
const RENAMED: Record<string, string> = { MMCT: "BCT", CSMT: "CSTM", PRYJ: "ALD", DDU: "MGS", VGLJ: "JHS" };

// New station names typed by users -> the names in the dataset.
const NAME_ALIASES: [RegExp, string][] = [
  [/\bcsmt\b|chhatrapati shivaji maharaj terminus/, "cst"],
  [/\bprayagraj\b/, "allahabad"],
  [/\b(pt\.? )?deen dayal upadhyaya\b|\bddu\b/, "mughal sarai"],
  [/\bvirangana lakshmibai\b|\bveerangana lakshmibai\b/, "jhansi"],
];

type Row = [string, string, number, number];
const all = rows as unknown as Row[];
const byCode = new Map(all.map((r) => [r[0], r]));
const norm = (s: string) => s.toLowerCase().replace(/\b(jn|junction|jct|rly|railway|station|terminus|cantt?)\b/g, "").replace(/[^a-z0-9]/g, "");

/** Station by code (current or old) or by name; exact name matches beat partial ones. */
export function findStation(q: string): { name: string; code: string; at: LL } | null {
  const code = q.trim().toUpperCase();
  const r = byCode.get(code) ?? byCode.get(RENAMED[code] ?? "");
  const n = norm(NAME_ALIASES.reduce((s, [re, to]) => s.replace(re, to), q.toLowerCase()));
  const hit = r ?? (n ? all.find((x) => norm(x[1]) === n) ?? all.find((x) => norm(x[1]).startsWith(n)) : undefined);
  if (!hit) return null;
  const name = hit[1] === hit[1].toUpperCase() ? hit[1].toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : hit[1];
  return { name, code: hit[0], at: [hit[2], hit[3]] };
}
