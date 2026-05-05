import { NextRequest, NextResponse } from "next/server";
import { ensureDb, sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    if (!sql) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }
    const db = sql;
    await ensureDb();

    const { slug } = await ctx.params;
    if (!/^[a-z0-9]{4,32}$/.test(slug)) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const uploadRows = (await db`
      SELECT id, slug, filename, license_cost_pence, currency, total_seats,
             dormant_seats, wasted_pence_per_month, created_at
      FROM ss_uploads WHERE slug = ${slug} LIMIT 1
    `) as Array<{
      id: number;
      slug: string;
      filename: string;
      license_cost_pence: number;
      currency: string;
      total_seats: number;
      dormant_seats: number;
      wasted_pence_per_month: number;
      created_at: string;
    }>;

    if (uploadRows.length === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    const upload = uploadRows[0];

    const seats = (await db`
      SELECT user_principal_name, display_name, department, job_title, license_sku,
             last_active_at, days_since_active, bucket, role_fit, score, recommendation
      FROM ss_seats WHERE upload_id = ${upload.id}
      ORDER BY score ASC, days_since_active DESC NULLS FIRST
    `) as Array<Record<string, unknown>>;

    return NextResponse.json({ upload, seats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[seatscore report]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
