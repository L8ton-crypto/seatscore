import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { ensureDb, sql, makeSlug } from "@/lib/db";
import { detectColumns, parseRow } from "@/lib/parse";
import { classifySeat } from "@/lib/score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 5000;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json(
        { error: "Database is not configured. Set DATABASE_URL." },
        { status: 500 },
      );
    }
    const db = sql; // narrow to non-null for use inside closures
    await ensureDb();

    const form = await req.formData();
    const file = form.get("file");
    const costPenceRaw = form.get("license_cost_pence");
    const licenseCostPence =
      typeof costPenceRaw === "string" && /^\d+$/.test(costPenceRaw)
        ? parseInt(costPenceRaw, 10)
        : 2470;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max ${Math.round(MAX_BYTES / 1024 / 1024)}MB.` },
        { status: 413 },
      );
    }

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: "Could not parse CSV: " + parsed.errors[0].message },
        { status: 400 },
      );
    }

    const rows = parsed.data;
    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV has no rows" }, { status: 400 });
    }
    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Too many rows. Max ${MAX_ROWS} per upload.` },
        { status: 400 },
      );
    }

    const headers = parsed.meta.fields ?? Object.keys(rows[0] ?? {});
    const cols = detectColumns(headers);
    const now = new Date();

    const enriched = rows.map((r) => {
      const p = parseRow(r, cols, now);
      const v = classifySeat({
        jobTitle: p.jobTitle,
        daysSinceActive: p.daysSinceActive,
      });
      return { ...p, ...v };
    });

    const totalSeats = enriched.length;
    const dormantSeats = enriched.filter((e) => e.bucket === "dormant").length;
    const wrongRoleSeats = enriched.filter((e) => e.bucket === "wrong_role").length;
    const wastedPencePerMonth = (dormantSeats + wrongRoleSeats) * licenseCostPence;

    const slug = makeSlug();
    const filename = file.name || "upload.csv";

    const inserted = await db`
      INSERT INTO ss_uploads
        (slug, filename, license_cost_pence, currency, total_seats, dormant_seats, wasted_pence_per_month)
      VALUES
        (${slug}, ${filename}, ${licenseCostPence}, 'GBP', ${totalSeats}, ${dormantSeats}, ${wastedPencePerMonth})
      RETURNING id
    `;
    const uploadId = (inserted[0] as { id: number }).id;

    const chunkSize = 200;
    for (let i = 0; i < enriched.length; i += chunkSize) {
      const chunk = enriched.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((e) =>
          db`
            INSERT INTO ss_seats
              (upload_id, user_principal_name, display_name, department, job_title,
               license_sku, last_active_at, days_since_active, bucket, role_fit, score, recommendation)
            VALUES
              (${uploadId}, ${e.userPrincipalName}, ${e.displayName}, ${e.department}, ${e.jobTitle},
               ${e.licenseSku}, ${e.lastActiveAt}, ${e.daysSinceActive}, ${e.bucket},
               ${e.roleFit}, ${e.score}, ${e.recommendation})
          `,
        ),
      );
    }

    return NextResponse.json({ slug });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[seatscore upload]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
