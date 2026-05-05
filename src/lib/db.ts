import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

let dbReady: Promise<void> | null = null;

export const sql = connectionString ? neon(connectionString) : null;

export async function ensureDb(): Promise<void> {
  if (!sql) throw new Error("DATABASE_URL is not set");
  if (dbReady) return dbReady;
  dbReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS ss_uploads (
        id SERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        filename TEXT NOT NULL,
        license_cost_pence INTEGER NOT NULL DEFAULT 2470,
        currency TEXT NOT NULL DEFAULT 'GBP',
        total_seats INTEGER NOT NULL DEFAULT 0,
        dormant_seats INTEGER NOT NULL DEFAULT 0,
        wasted_pence_per_month INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS ss_seats (
        id SERIAL PRIMARY KEY,
        upload_id INTEGER NOT NULL REFERENCES ss_uploads(id) ON DELETE CASCADE,
        user_principal_name TEXT,
        display_name TEXT,
        department TEXT,
        job_title TEXT,
        license_sku TEXT,
        last_active_at TIMESTAMPTZ,
        days_since_active INTEGER,
        bucket TEXT NOT NULL,
        role_fit TEXT,
        score INTEGER NOT NULL,
        recommendation TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS ss_seats_upload_idx ON ss_seats(upload_id)`;
  })().catch((err) => {
    dbReady = null;
    throw err;
  });
  return dbReady;
}

export function makeSlug(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
