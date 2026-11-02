import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run `vercel env pull .env.local` first.");
  process.exit(1);
}

const sql = neon(url);
const file = new URL("../db/schema.sql", import.meta.url);
const statements = (await readFile(file, "utf8"))
  .replace(/--.*$/gm, "")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

// Neon's HTTP driver runs one statement per request.
for (const s of statements) await sql.query(s);
console.log(`Applied ${statements.length} statements.`);
